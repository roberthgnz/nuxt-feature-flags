import { ref } from 'vue'
import type { Ref } from 'vue'
import { vi } from 'vitest'

// Minimal stand-ins for Nuxt's auto-imports. State lives on globalThis so it survives
// `vi.resetModules()`; `useState` is keyed like the real one.
interface MockStore {
  states: Map<string, Ref<unknown>>
  runtimeConfig: Record<string, unknown>
}

const store: MockStore = ((globalThis as { __nuxtMocks?: MockStore }).__nuxtMocks ??= {
  states: new Map(),
  runtimeConfig: {},
})

export function resetNuxtMocks() {
  store.states.clear()
  setRuntimeConfig({ featureFlags: { flags: {}, cacheTTL: 0 } })
}

export function setRuntimeConfig(config: Record<string, unknown>) {
  store.runtimeConfig = config
}

export const useState = vi.fn(<T>(key: string, init?: () => T): Ref<T> => {
  if (!store.states.has(key)) {
    store.states.set(key, ref(init?.()))
  }
  return store.states.get(key) as Ref<T>
})

export const useNuxtApp = vi.fn(() => ({
  runWithContext: <T>(fn: () => T) => fn(),
}))

export const useRuntimeConfig = vi.fn(() => store.runtimeConfig)

export const defineNuxtPlugin = vi.fn(plugin => plugin)
