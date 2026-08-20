import { createHash } from 'node:crypto'
import { normalizeSettings } from './config.js'
import { decideToolAccess } from './policy.js'

const MAX_NAME_LENGTH = 64
const INVALID_NAME = /[^A-Za-z0-9_-]/g

export class BrowserPilotToolRegistry {
  #ctx
  #bridge
  #settingsScope
  #disposers = new Map()

  constructor(ctx, bridge, settingsScope) {
    this.#ctx = ctx
    this.#bridge = bridge
    this.#settingsScope = settingsScope
  }

  get toolCount() {
    return this.#disposers.size
  }

  async sync(tools) {
    const definitions = new Map()
    for (const tool of tools) {
      const rawName = String(tool.name)
      const publicName = publicToolName(rawName)
      if (definitions.has(publicName)) {
        throw new Error(`BrowserPilot MCP 返回了重复工具名：${rawName}`)
      }
      definitions.set(publicName, createDefinition(this.#bridge, this.#settingsScope, rawName, publicName, tool))
    }

    this.dispose()
    const next = new Map()
    try {
      for (const [name, definition] of definitions) {
        next.set(name, this.#ctx.tools.register(definition))
      }
    } catch (error) {
      for (const dispose of next.values()) dispose()
      throw error
    }
    this.#disposers = next
  }

  dispose() {
    for (const dispose of this.#disposers.values()) dispose()
    this.#disposers.clear()
  }
}

export function publicToolName(rawName) {
  const base = `mcp__browserpilot__${rawName}`
  const normalized = base.replace(INVALID_NAME, '_')
  if (normalized.length <= MAX_NAME_LENGTH) return normalized
  const hash = createHash('sha256').update(rawName).digest('hex').slice(0, 12)
  return `${normalized.slice(0, MAX_NAME_LENGTH - hash.length - 1)}_${hash}`
}

function createDefinition(bridge, settingsScope, rawName, publicName, tool) {
  return {
    name: publicName,
    description: tool.description || `通过 BrowserPilot 执行 ${rawName}。`,
    parameters: objectSchema(tool.inputSchema),
    output: outputDefinition(rawName),
    async execute(args, exec) {
      const settings = normalizeSettings(settingsScope?.get?.())
      const decision = decideToolAccess(rawName, settings)
      if (!decision.allow) throw new Error(decision.reason)

      const input = args !== null && typeof args === 'object' && !Array.isArray(args) ? args : {}
      const result = await bridge.call(rawName, input, exec.signal)
      const normalized = normalizeResult(result, rawName)
      if (normalized.isError) throw new Error(extractText(normalized.content, rawName))
      return normalized.value
    },
  }
}

function outputDefinition(rawName) {
  return {
    schema: {
      type: 'object',
      properties: {
        content: { type: 'array', items: {} },
        structuredContent: {},
      },
      required: ['content'],
      additionalProperties: false,
    },
    render(_args, value) {
      return [{ type: 'text', text: extractText(value?.content, rawName) }]
    },
  }
}

function objectSchema(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value
    : { type: 'object', properties: {} }
}

function normalizeResult(result, rawName) {
  if (!Array.isArray(result?.content)) {
    const text = result?.structuredContent === undefined
      ? `(${rawName} 未返回可读内容)`
      : JSON.stringify(result.structuredContent)
    return {
      isError: result?.isError === true,
      content: [{ type: 'text', text }],
      value: {
        content: [{ type: 'text', text }],
        ...(result?.structuredContent === undefined ? {} : { structuredContent: result.structuredContent }),
      },
    }
  }
  return {
    isError: result.isError === true,
    content: result.content,
    value: {
      content: result.content,
      ...(result.structuredContent === undefined ? {} : { structuredContent: result.structuredContent }),
    },
  }
}

function extractText(content, rawName) {
  if (!Array.isArray(content)) return `(${rawName} 未返回可读内容)`
  const text = content.map(block => {
    if (block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') return block.text
    if (block && typeof block === 'object' && block.type === 'image') return '[BrowserPilot 返回了一张图片]'
    return '[BrowserPilot 返回了不受支持的内容块]'
  }).join('\n')
  return text || `(${rawName} 未返回可读内容)`
}
