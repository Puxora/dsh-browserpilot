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
