import { DEFAULT_SETTINGS, SETTINGS_NAMESPACE, normalizeSettings, resolveRuntimeConfig } from './src/config.js'
import { BrowserPilotMcpBridge } from './src/mcp-bridge.js'
import { serializeBrowserPilotStatus } from './src/status.js'
import { BrowserPilotToolRegistry } from './src/tool-registry.js'
import Schema from 'schemastery'

export const name = 'browserpilot'
export const inject = ['settings', 'tools']

export function apply(ctx, config = {}) {
  const settingsScope = registerSettings(ctx, config)
  const bridge = new BrowserPilotMcpBridge(resolveRuntimeConfig(config))
  const registry = new BrowserPilotToolRegistry(ctx, bridge, settingsScope)
  const disposeStatus = ctx.tools.register(createStatusTool(bridge, registry, () => connect(bridge, registry, ctx)))

  const cancelBackgroundConnect = scheduleBackgroundConnect(() => connect(bridge, registry, ctx))
  ctx.effect(() => () => {
    cancelBackgroundConnect()
    disposeStatus()
    registry.dispose()
    void bridge.dispose()
  }, 'browserpilot.connection')
}

function registerSettings(ctx, config) {
  const base = {
    ...DEFAULT_SETTINGS,
    ...normalizeSettings(config.settings),
  }
  try {
    return ctx.settings.register(SETTINGS_NAMESPACE, Schema.object({
      enabled: Schema.boolean().default(base.enabled),
      readAccess: Schema.union(['allow', 'ask', 'deny'].map(value => Schema.const(value))).default(base.readAccess),
      interactionAccess: Schema.union(['allow', 'ask', 'deny'].map(value => Schema.const(value))).default(base.interactionAccess),
      sensitiveAccess: Schema.union(['allow', 'ask', 'deny'].map(value => Schema.const(value))).default(base.sensitiveAccess),
    }), { base })
  } catch (error) {
    report(ctx, 'settings 注册失败', error)
    return undefined
  }
}

async function connect(bridge, registry, ctx) {
  if (bridge.snapshot.state === 'connected') return bridge.snapshot
  try {
    const tools = await bridge.connect()
    await yieldToEventLoop()
    await registry.sync(tools)
  } catch (error) {
    report(ctx, 'BrowserPilot MCP 连接失败', error)
  }
  return bridge.snapshot
}

export function scheduleBackgroundConnect(task) {
  const timer = setTimeout(() => { void task() }, 0)
  timer.unref?.()
  return () => clearTimeout(timer)
}

function yieldToEventLoop() {
  return new Promise(resolve => setImmediate(resolve))
}

function createStatusTool(bridge, registry, reconnect) {
  return {
    name: 'browserpilot_status',
    description: '检查 DeepSeek Harness 与 BrowserPilot MCP 的连接状态，并在断开时尝试重新连接。',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: { type: 'object', properties: { state: { type: 'string' }, toolCount: { type: 'number' }, lastError: { type: 'string' } }, required: ['state', 'toolCount'], additionalProperties: false },
      render(_args, value) {
        const error = value.lastError ? `；最近错误：${value.lastError}` : ''
        return [{ type: 'text', text: `BrowserPilot 状态：${value.state}；已注册工具：${value.toolCount}${error}` }]
      },
    },
    async execute() {
      const snapshot = await reconnect()
      return serializeBrowserPilotStatus(snapshot, registry.toolCount)
    },
  }
}

function report(ctx, scope, error) {
  const detail = error instanceof Error ? error.message : String(error)
  const message = `[browserpilot] ${scope}: ${detail}`
  const logger = ctx.root?.logger?.('browserpilot')
  if (logger?.warn) logger.warn('%s', message)
  else console.warn(message)
}
