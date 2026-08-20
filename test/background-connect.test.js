import test from 'node:test'
import assert from 'node:assert/strict'
import { scheduleBackgroundConnect } from '../index.js'

test('background connection is deferred past plugin registration', async () => {
  let calls = 0
  const cancel = scheduleBackgroundConnect(async () => { calls += 1 })
  assert.equal(calls, 0)

  await wait(10)
  assert.equal(calls, 1)
  cancel()
})

test('a disposed plugin cancels an unstarted background connection', async () => {
  let calls = 0
  const cancel = scheduleBackgroundConnect(async () => { calls += 1 })
  cancel()

  await wait(10)
  assert.equal(calls, 0)
})

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
