import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyTool, decideToolAccess } from '../src/policy.js'

test('tool names are classified conservatively', () => {
  assert.equal(classifyTool('browser_list_tabs'), 'read')
  assert.equal(classifyTool('browser_click'), 'interaction')
  assert.equal(classifyTool('browser_upload_file'), 'sensitive')
  assert.equal(classifyTool('browser_unknown_action'), 'interaction')
})

test('disabled or denied access stops tool calls before MCP', () => {
  assert.equal(decideToolAccess('browser_click', {
    enabled: false, readAccess: 'allow', interactionAccess: 'allow', sensitiveAccess: 'deny',
  }).allow, false)
  assert.equal(decideToolAccess('browser_upload_file', {
    enabled: true, readAccess: 'allow', interactionAccess: 'allow', sensitiveAccess: 'deny',
  }).allow, false)
})

test('allowed DSH categories defer final authorization to BrowserPilot', () => {
  assert.deepEqual(decideToolAccess('browser_click', {
    enabled: true, readAccess: 'allow', interactionAccess: 'allow', sensitiveAccess: 'deny',
  }), { allow: true, category: 'interaction', mode: 'allow' })
})
