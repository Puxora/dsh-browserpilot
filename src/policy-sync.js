import {
  globalPolicyFromSettings,
  globalPolicySettingsPatch,
  sameGlobalPolicy,
} from './global-policy.js'
import { normalizeSettings } from './config.js'

export class BrowserPilotPolicySynchronizer {
  #scope
  #client
  #intervalMs
  #onError
  #setInterval
  #clearInterval
  #timer
  #unwatch
  #tail = Promise.resolve()
  #lastGlobalPolicy
  #lastErrorMessage
  #stopped = false

  constructor(scope, client, options = {}) {
    this.#scope = scope
    this.#client = client
    this.#intervalMs = options.intervalMs || 3_000
    this.#onError = options.onError || (() => undefined)
    this.#setInterval = options.setInterval || setInterval
    this.#clearInterval = options.clearInterval || clearInterval
  }

  start() {
    if (this.#unwatch) return
    this.#unwatch = this.#scope.watch(next => {
      void this.#enqueue(() => this.#pushLocal(next))
    })
    void this.refresh()
    this.#timer = this.#setInterval(() => { void this.refresh() }, this.#intervalMs)
    this.#timer?.unref?.()
  }

  refresh() {
    return this.#enqueue(() => this.#pullGlobal())
  }

  stop() {
    this.#stopped = true
    this.#unwatch?.()
    this.#unwatch = undefined
    if (this.#timer !== undefined) this.#clearInterval(this.#timer)
    this.#timer = undefined
  }

  #enqueue(task) {
    const queued = this.#tail.then(() => this.#stopped ? undefined : task())
    this.#tail = queued.catch(() => undefined)
    return queued
  }

  async #pullGlobal() {
    try {
      const policy = await this.#client.get()
      this.#lastErrorMessage = undefined
      this.#lastGlobalPolicy = policy
      const current = normalizeSettings(this.#scope.get())
      if (!current.globalSettingsAvailable
          || !sameGlobalPolicy(globalPolicyFromSettings(current), policy)) {
        await this.#scope.update(globalPolicySettingsPatch(policy))
      }
    } catch (error) {
      this.#lastGlobalPolicy = undefined
      this.#reportError(error)
      if (normalizeSettings(this.#scope.get()).globalSettingsAvailable) {
        await this.#scope.update({ globalSettingsAvailable: false })
      }
    }
  }

  async #pushLocal(value) {
    const settings = normalizeSettings(value)
    if (!settings.globalSettingsAvailable || !this.#lastGlobalPolicy) return
    const requested = globalPolicyFromSettings(settings)
    if (sameGlobalPolicy(requested, this.#lastGlobalPolicy)) return

    try {
      const saved = await this.#client.update(requested)
      this.#lastGlobalPolicy = saved
      if (!sameGlobalPolicy(saved, requested)) {
        await this.#scope.update(globalPolicySettingsPatch(saved))
      }
    } catch (error) {
      this.#reportError(error)
      await this.#pullGlobal()
    }
  }

  #reportError(error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === this.#lastErrorMessage) return
    this.#lastErrorMessage = message
    this.#onError(error)
  }
}
