import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_RUNTIME_CONFIG, normalizeSettings, resolveRuntimeConfig } from '../src/config.js'

test('resolveRuntimeConfig keeps safe defaults', () => {
  assert.deepEqual(resolveRuntimeConfig({}), DEFAULT_RUNTIME_CONFIG)
  assert.equal(resolveRuntimeConfig({ command: '  ' }).command, 'npx')
  assert.equal(resolveRuntimeConfig({ toolCallTimeoutMs: 0 }).toolCallTimeoutMs, 60_000)
})

test('normalizeSettings rejects unknown access modes', () => {
  assert.deepEqual(normalizeSettings({
    enabled: false,
    readAccess: 'deny',
    interactionAccess: 'unexpected',
    sensitiveAccess: 'ask',
  }), {
    enabled: false,
    readAccess: 'deny',
    interactionAccess: 'allow',
    sensitiveAccess: 'allow',
    globalSettingsAvailable: false,
    globalApproval: 'always',
    globalCdpEnabled: false,
    globalDownload: 'ask',
    globalUpload: 'ask',
  })
})
