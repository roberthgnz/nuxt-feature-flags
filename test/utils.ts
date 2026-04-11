import { vi } from 'vitest'

export function setupMocks() {
  vi.mock('#imports', () => ({
    useNuxtApp: vi.fn().mockReturnValue({
      $featureFlags: {},
    }),
    useRuntimeConfig: vi.fn().mockReturnValue({
      public: {
        featureFlags: {
          flags: {},
          config: {},
        },
      },
    }),
    useState: vi.fn((_, init) => {
      let value = init()
      return {
        get value() {
          return value
        },
        set value(v) {
          value = v
        },
      }
    }),
    useFetch: vi.fn().mockResolvedValue({
      data: { value: {} },
      pending: { value: false },
      error: { value: null },
    }),
    defineNuxtPlugin: vi.fn(fn => fn),
  }))
}
