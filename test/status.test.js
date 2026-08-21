import test from 'node:test'
import assert from 'node:assert/strict'
import { serializeBrowserPilotStatus } from '../src/status.js'

test('status output omits undefined optional fields', () => {
  const value = serializeBrowserPilotStatus({ state: 'connected', lastError: undefined }, 40)
  assert.deepEqual(value, { state: 'connected', toolCount: 40 })
  assert.doesNotThrow(() => JSON.stringify(value))
})

test('status output includes a concrete error message', () => {
  assert.deepEqual(
    serializeBrowserPilotStatus({ state: 'error', lastError: 'daemon unavailable' }, 0),
    { state: 'error', toolCount: 0, lastError: 'daemon unavailable' },
  )
})

test('status output identifies the concrete MCP command and server version', () => {
  assert.deepEqual(
    serializeBrowserPilotStatus({
      state: 'connected',
      runtime: {
        command: 'D:/Software/nodejs/node.exe',
        args: ['G:/github/BrowserPilot/orchestrator/bin/cli.js', 'mcp'],
        cwd: 'G:/github/BrowserPilot',
      },
      serverInfo: { name: 'browser-pilot', version: '1.1.5' },
    }, 40),
    {
      state: 'connected',
      toolCount: 40,
      runtime: {
        command: 'D:/Software/nodejs/node.exe',
        args: ['G:/github/BrowserPilot/orchestrator/bin/cli.js', 'mcp'],
        cwd: 'G:/github/BrowserPilot',
      },
      serverInfo: { name: 'browser-pilot', version: '1.1.5' },
    },
  )
})
