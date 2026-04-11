import { vi } from 'vitest'

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
  useFetch: vi.fn().mockReturnValue({
    data: { value: {} },
    pending: { value: false },
    error: { value: null },
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
  useFeatureFlags: vi.fn().mockReturnValue({
    flags: {},
    isEnabled: () => false,
    getValue: () => undefined,
    getVariant: () => undefined,
  }),
  defineNuxtPlugin: vi.fn(fn => fn),
}))
