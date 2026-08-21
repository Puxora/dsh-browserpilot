import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export class BrowserPilotMcpBridge {
  #runtimeConfig
  #dependencies
  #client
  #transport
  #tools = []
  #state = 'idle'
  #lastError
  #serverInfo
  #connectTask

  constructor(runtimeConfig, dependencies = { Client, StdioClientTransport }) {
    this.#runtimeConfig = runtimeConfig
    this.#dependencies = dependencies
  }

  get snapshot() {
    return {
      state: this.#state,
      toolCount: this.#tools.length,
      lastError: this.#lastError,
      runtime: publicRuntimeConfig(this.#runtimeConfig),
      serverInfo: this.#serverInfo,
    }
  }

  async connect() {
    if (this.#state === 'connected') return this.#tools
    if (this.#connectTask !== undefined) return this.#connectTask

    const task = this.#connectOnce()
    this.#connectTask = task
    try {
      return await task
    } finally {
      if (this.#connectTask === task) this.#connectTask = undefined
    }
  }

  async #connectOnce() {
    this.#state = 'connecting'
    this.#lastError = undefined
    this.#serverInfo = undefined
    let client
    try {
      const transport = new this.#dependencies.StdioClientTransport({
        command: this.#runtimeConfig.command,
        args: this.#runtimeConfig.args,
        env: { ...process.env, ...this.#runtimeConfig.env },
        cwd: this.#runtimeConfig.cwd || undefined,
      })
      client = new this.#dependencies.Client(
        { name: '@puxora/dsh-browserpilot', version: '0.1.6' },
        { capabilities: {} },
      )
      this.#client = client
      this.#transport = transport
      await withTimeout(client.connect(transport), this.#runtimeConfig.connectTimeoutMs, '连接 BrowserPilot MCP')
      const result = await withTimeout(client.listTools(), this.#runtimeConfig.connectTimeoutMs, '读取 BrowserPilot 工具列表')
      this.#tools = Array.isArray(result.tools) ? result.tools : []
      this.#serverInfo = normalizeServerInfo(client.getServerVersion?.())
      this.#state = 'connected'
      return this.#tools
    } catch (error) {
      this.#state = 'error'
      this.#lastError = error instanceof Error ? error.message : String(error)
      await this.dispose()
      throw error
    }
  }

  async call(rawName, args, signal) {
    if (this.#client === undefined || this.#state !== 'connected') {
      throw new Error('BrowserPilot MCP 尚未连接。请确认 BrowserPilot 已安装并启动。')
    }
    return this.#client.callTool(
      { name: rawName, arguments: args },
      undefined,
      { signal, timeout: this.#runtimeConfig.toolCallTimeoutMs },
    )
  }

  async dispose() {
    const client = this.#client
    this.#client = undefined
    this.#transport = undefined
    this.#tools = []
    this.#serverInfo = undefined
    if (this.#state !== 'error') this.#state = 'idle'
    if (client !== undefined) await client.close().catch(() => undefined)
  }
}

function publicRuntimeConfig(config) {
  return {
    command: config.command,
    args: [...config.args],
    cwd: config.cwd || '',
  }
}

function normalizeServerInfo(value) {
  if (typeof value !== 'object' || value === null) return undefined
  const name = typeof value.name === 'string' ? value.name : undefined
  const version = typeof value.version === 'string' ? value.version : undefined
  if (name === undefined && version === undefined) return undefined
  return { ...(name === undefined ? {} : { name }), ...(version === undefined ? {} : { version }) }
}

function withTimeout(promise, timeoutMs, action) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${action}超时（${timeoutMs}ms）。`)), timeoutMs)
    timer.unref?.()
  })
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer))
}
