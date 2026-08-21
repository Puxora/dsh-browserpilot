import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const APPROVAL_MODES = new Set(['always', 'none'])
const TRANSFER_MODES = new Set(['always', 'ask', 'none'])

export class BrowserPilotGlobalPolicyClient {
  #endpoint
  #token
  #tokenPath
  #timeoutMs
  #fetch

  constructor(runtimeConfig, dependencies = {}) {
    const env = { ...process.env, ...runtimeConfig.env }
    this.#endpoint = `${normalizeDaemonApi(env.CA_DAEMON_API)}/settings`
    this.#token = env.CA_API_TOKEN || null
    this.#tokenPath = env.CA_API_TOKEN_PATH || join(homedir(), '.browserpilot', 'api-token')
    this.#timeoutMs = runtimeConfig.connectTimeoutMs
    this.#fetch = dependencies.fetch || globalThis.fetch
  }

  async get() {
    return normalizeGlobalPolicy(await this.#request('GET'))
  }

  async update(policy) {
    return normalizeGlobalPolicy(await this.#request('PATCH', normalizeGlobalPolicy(policy)))
  }

  async #request(method, body) {
    const token = await this.#resolveToken()
    if (!token) throw new Error('未找到 BrowserPilot API Token')
    if (typeof this.#fetch !== 'function') throw new Error('当前 Node.js 运行时不支持 fetch')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs)
    timer.unref?.()
    try {
      const response = await this.#fetch(this.#endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.code !== 0) {
        throw new Error(payload?.message || `BrowserPilot 设置请求失败（HTTP ${response.status}）`)
      }
      return payload.data
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`连接 BrowserPilot 全局设置超时（${this.#timeoutMs}ms）`)
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  async #resolveToken() {
    if (this.#token) return this.#token
    try {
      this.#token = (await readFile(this.#tokenPath, 'utf8')).trim()
    } catch {
      return null
    }
    return this.#token
  }
}

export function normalizeGlobalPolicy(value) {
  if (!isPlainObject(value)) throw new Error('BrowserPilot 返回了无效的全局设置')
  const approval = APPROVAL_MODES.has(value.approval) ? value.approval : null
  const download = TRANSFER_MODES.has(value.download) ? value.download : null
  const upload = TRANSFER_MODES.has(value.upload) ? value.upload : null
  if (!approval || !download || !upload || typeof value.cdpEnabled !== 'boolean') {
    throw new Error('BrowserPilot 全局权限字段无效')
  }
  return { approval, cdpEnabled: value.cdpEnabled, download, upload }
}

export function globalPolicyFromSettings(settings) {
  return normalizeGlobalPolicy({
    approval: settings.globalApproval,
    cdpEnabled: settings.globalCdpEnabled,
    download: settings.globalDownload,
    upload: settings.globalUpload,
  })
}

export function globalPolicySettingsPatch(policy, available = true) {
  const normalized = normalizeGlobalPolicy(policy)
  return {
    globalSettingsAvailable: available,
    globalApproval: normalized.approval,
    globalCdpEnabled: normalized.cdpEnabled,
    globalDownload: normalized.download,
    globalUpload: normalized.upload,
  }
}

export function sameGlobalPolicy(left, right) {
  return left?.approval === right?.approval
    && left?.cdpEnabled === right?.cdpEnabled
    && left?.download === right?.download
    && left?.upload === right?.upload
}

function normalizeDaemonApi(value) {
  return String(value || 'http://127.0.0.1:9876/api').replace(/\/+$/, '')
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
