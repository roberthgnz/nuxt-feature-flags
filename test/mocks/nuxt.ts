import { vi } from 'vitest'

export const useNuxtApp = vi.fn().mockReturnValue({
  $featureFlags: {},
})

export const useRuntimeConfig = vi.fn().mockReturnValue({
  public: {
    featureFlags: {
      flags: {},
      config: {},
    },
  },
})

export const useState = vi.fn((_, init) => {
  let value = init()
  return {
    get value() {
      return value
    },
    set value(v) {
      value = v
    },
  }
})

export const useFetch = vi.fn().mockReturnValue({
  data: { value: {} },
  pending: { value: false },
  error: { value: null },
  refresh: vi.fn().mockResolvedValue(undefined),
})

export const useFeatureFlags = vi.fn().mockReturnValue({
  flags: {},
  isEnabled: () => false,
  getValue: () => undefined,
  getVariant: () => undefined,
})

export const defineNuxtPlugin = vi.fn(fn => fn)
