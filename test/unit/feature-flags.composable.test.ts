import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFeatureFlags } from '../../src/runtime/app/composables/feature-flags'
import { useAsyncFeatureFlags } from '../../src/runtime/app/composables/use-async-feature-flags'
import { refreshFeatureFlags, replaceFlags, useFeatureFlagsState } from '../../src/runtime/app/utils/state'
import type { ResolvedFlags } from '../../src/runtime/types'
import { useNuxtApp } from '../mocks/nuxt'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  useFeatureFlagsState().value = {
    simpleFlag: { enabled: true, value: true },
    disabledFlag: { enabled: false, value: false },
    exp: { enabled: true, value: 'B', variant: 'b' },
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useFeatureFlags', () => {
  it('reads the flags resolved on the server', () => {
    const { isEnabled, getValue, getVariant } = useFeatureFlags()
    expect(isEnabled('simpleFlag')).toBe(true)
    expect(isEnabled('disabledFlag')).toBe(false)
    expect(isEnabled('nonExistentFlag')).toBe(false)
    expect(isEnabled('exp:b')).toBe(true)
    expect(getValue('exp')).toBe('B')
    expect(getVariant('exp')).toBe('b')
  })

  it('sees refreshed flags without calling it again', async () => {
    const { isEnabled, flags } = useFeatureFlags()
    fetchMock.mockResolvedValue({ simpleFlag: { enabled: false }, brandNew: { enabled: true } })

    await refreshFeatureFlags(useNuxtApp())

    expect(fetchMock).toHaveBeenCalledWith('/api/_feature-flags/feature-flags')
    expect(isEnabled('simpleFlag')).toBe(false)
    expect(isEnabled('brandNew')).toBe(true)
    expect('disabledFlag' in flags).toBe(false)
  })
})

describe('refreshFeatureFlags', () => {
  it('shares one request between concurrent callers', async () => {
    fetchMock.mockResolvedValue({})
    const nuxtApp = useNuxtApp()
    await Promise.all([refreshFeatureFlags(nuxtApp), refreshFeatureFlags(nuxtApp)])
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await refreshFeatureFlags(nuxtApp)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('replaceFlags', () => {
  it('updates the object in place', () => {
    const target: ResolvedFlags = { a: { enabled: true }, b: { enabled: true } }
    replaceFlags(target, { b: { enabled: false }, c: { enabled: true } })
    expect(target).toEqual({ b: { enabled: false }, c: { enabled: true } })
  })
})

describe('useAsyncFeatureFlags', () => {
  it('exposes the shared flags and helpers', () => {
    const { flags, isEnabled, pending, error } = useAsyncFeatureFlags({ immediate: false })
    expect(flags.value.simpleFlag?.enabled).toBe(true)
    expect(isEnabled('exp:b')).toBe(true)
    expect(pending.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('refresh() updates the flags and tracks pending state', async () => {
    let resolveFetch!: (flags: ResolvedFlags) => void
    fetchMock.mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve
    }))
    const { flags, isEnabled, pending, refresh } = useAsyncFeatureFlags({ immediate: false })

    const refreshing = refresh()
    expect(pending.value).toBe(true)
    resolveFetch({ simpleFlag: { enabled: false } })
    await refreshing

    expect(pending.value).toBe(false)
    expect(isEnabled('simpleFlag')).toBe(false)
    expect(flags.value).toEqual({ simpleFlag: { enabled: false } })
    // Other consumers see the update too.
    expect(useFeatureFlags().isEnabled('simpleFlag')).toBe(false)
  })

  it('refresh() reports errors and keeps the previous flags', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const { error, isEnabled, refresh } = useAsyncFeatureFlags({ immediate: false })

    await refresh()

    expect(error.value).toBeInstanceOf(Error)
    expect(isEnabled('simpleFlag')).toBe(true)
  })
})
