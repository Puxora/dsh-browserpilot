import test from 'node:test'
import assert from 'node:assert/strict'
import { BrowserPilotMcpBridge } from '../src/mcp-bridge.js'

test('concurrent connection requests share one MCP handshake', async () => {
  const gate = deferred()
  const fake = createFakeDependencies({ connect: () => gate.promise })
  const bridge = new BrowserPilotMcpBridge(runtimeConfig(), fake.dependencies)

  const first = bridge.connect()
  const second = bridge.connect()
  assert.equal(fake.connectCalls(), 1)

  gate.resolve()
  const [firstTools, secondTools] = await Promise.all([first, second])
  assert.equal(fake.connectCalls(), 1)
  assert.deepEqual(firstTools, fake.tools)
  assert.deepEqual(secondTools, fake.tools)
  assert.deepEqual(bridge.snapshot, {
    state: 'connected',
    toolCount: 1,
    lastError: undefined,
    runtime: { command: 'browserpilot', args: ['mcp'], cwd: '' },
    serverInfo: { name: 'browser-pilot', version: '1.1.5' },
  })
})

test('a stalled MCP handshake times out and closes the child client', async () => {
  const fake = createFakeDependencies({ connect: () => new Promise(() => {}) })
  const bridge = new BrowserPilotMcpBridge(runtimeConfig({ connectTimeoutMs: 15 }), fake.dependencies)

  const keepAlive = setTimeout(() => {}, 100)
  try {
    await assert.rejects(bridge.connect(), /连接 BrowserPilot MCP超时/)
    assert.equal(fake.closeCalls(), 1)
    assert.equal(bridge.snapshot.state, 'error')
    assert.match(bridge.snapshot.lastError, /15ms/)
  } finally {
    clearTimeout(keepAlive)
  }
})

function runtimeConfig(overrides = {}) {
  return {
    command: 'browserpilot',
    args: ['mcp'],
    cwd: '',
    env: {},
    connectTimeoutMs: 100,
    toolCallTimeoutMs: 100,
    ...overrides,
  }
}

function createFakeDependencies({ connect }) {
  let connections = 0
  let closes = 0
  const tools = [{ name: 'tabs_list', inputSchema: { type: 'object' } }]

  class FakeTransport {
    constructor(options) {
      this.options = options
    }
  }

  class FakeClient {
    async connect(transport) {
      connections += 1
      this.transport = transport
      return connect()
    }

    async listTools() {
      return { tools }
    }

    getServerVersion() {
      return { name: 'browser-pilot', version: '1.1.5' }
    }

    async close() {
      closes += 1
    }
  }

  return {
    dependencies: { Client: FakeClient, StdioClientTransport: FakeTransport },
    tools,
    connectCalls: () => connections,
    closeCalls: () => closes,
  }
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
