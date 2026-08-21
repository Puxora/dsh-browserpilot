export const SETTINGS_NAMESPACE = 'browserpilot'
export const DEFAULT_TOOL_TIMEOUT_MS = 60_000
export const DEFAULT_CONNECT_TIMEOUT_MS = 12_000
export const DEFAULT_POLICY_SYNC_INTERVAL_MS = 3_000

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  readAccess: 'allow',
  interactionAccess: 'allow',
  sensitiveAccess: 'deny',
  globalSettingsAvailable: false,
  globalApproval: 'always',
  globalCdpEnabled: false,
  globalDownload: 'ask',
  globalUpload: 'ask',
})

export const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  command: 'npx',
  args: ['-y', '@puxora/browserpilot', 'mcp'],
  cwd: '',
  env: {},
  connectTimeoutMs: DEFAULT_CONNECT_TIMEOUT_MS,
  toolCallTimeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
  policySyncIntervalMs: DEFAULT_POLICY_SYNC_INTERVAL_MS,
})

export function resolveRuntimeConfig(config = {}) {
  const args = Array.isArray(config.args)
    ? config.args.map(value => String(value))
    : DEFAULT_RUNTIME_CONFIG.args
  const env = isPlainObject(config.env)
    ? Object.fromEntries(Object.entries(config.env).map(([key, value]) => [key, String(value)]))
    : {}
  const timeout = Number(config.toolCallTimeoutMs)
  const connectTimeout = Number(config.connectTimeoutMs)
  const policySyncInterval = Number(config.policySyncIntervalMs)

  return {
    command: nonEmptyString(config.command, DEFAULT_RUNTIME_CONFIG.command),
    args,
    cwd: typeof config.cwd === 'string' ? config.cwd : DEFAULT_RUNTIME_CONFIG.cwd,
    env,
    connectTimeoutMs: Number.isFinite(connectTimeout) && connectTimeout >= 1
      ? connectTimeout
      : DEFAULT_CONNECT_TIMEOUT_MS,
    toolCallTimeoutMs: Number.isFinite(timeout) && timeout >= 1 ? timeout : DEFAULT_TOOL_TIMEOUT_MS,
    policySyncIntervalMs: Number.isFinite(policySyncInterval) && policySyncInterval >= 250
      ? policySyncInterval
      : DEFAULT_POLICY_SYNC_INTERVAL_MS,
  }
}

export function normalizeSettings(value) {
  const source = isPlainObject(value) ? value : {}
  return {
    enabled: source.enabled !== false,
    readAccess: normalizeLocalMode(source.readAccess, DEFAULT_SETTINGS.readAccess),
    interactionAccess: normalizeLocalMode(source.interactionAccess, DEFAULT_SETTINGS.interactionAccess),
    sensitiveAccess: normalizeLocalMode(source.sensitiveAccess, DEFAULT_SETTINGS.sensitiveAccess),
    globalSettingsAvailable: source.globalSettingsAvailable === true,
    globalApproval: normalizeMode(source.globalApproval, ['always', 'none'], DEFAULT_SETTINGS.globalApproval),
    globalCdpEnabled: source.globalCdpEnabled === true,
    globalDownload: normalizeMode(source.globalDownload, ['always', 'ask', 'none'], DEFAULT_SETTINGS.globalDownload),
    globalUpload: normalizeMode(source.globalUpload, ['always', 'ask', 'none'], DEFAULT_SETTINGS.globalUpload),
  }
}

function normalizeLocalMode(value, fallback) {
  if (value === 'deny') return 'deny'
  if (value === 'allow' || value === 'ask') return 'allow'
  return fallback
}

function normalizeMode(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function nonEmptyString(value, fallback) {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
