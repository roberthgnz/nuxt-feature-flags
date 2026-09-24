import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive } from 'vue'
import type { DirectiveBinding } from 'vue'
import serverPlugin from '../../src/runtime/app/plugins/feature-flag.server'
import clientPlugin from '../../src/runtime/app/plugins/feature-flag.client'
import { createFeatureDirective } from '../../src/runtime/app/directives/feature'
import { useFeatureFlagsState } from '../../src/runtime/app/utils/state'
import type { ResolvedFlags } from '../../src/runtime/types'

type Plugin = { setup: (nuxtApp: unknown) => Promise<{ provide: { featureFlags: ResolvedFlags } }> }

function createNuxtApp(overrides: Record<string, unknown> = {}) {
  return {
    vueApp: { directive: vi.fn() },
    payload: { serverRendered: true },
    runWithContext: <T>(fn: () => T) => fn(),
    ...overrides,
  }
}

const binding = (value: string) => ({ value }) as DirectiveBinding<string>

describe('server plugin', () => {
  it('resolves the flags for the request into the shared state', async () => {
    const resolved = { a: { enabled: true } }
    const nuxtApp = createNuxtApp({
      ssrContext: { event: { context: { $resolveFeatureFlags: vi.fn().mockResolvedValue(resolved) } } },
    })

    const { provide } = await (serverPlugin as unknown as Plugin).setup(nuxtApp)

    expect(useFeatureFlagsState().value).toEqual(resolved)
    expect(provide.featureFlags).toBe(useFeatureFlagsState().value)
    expect(nuxtApp.vueApp.directive).toHaveBeenCalledWith('feature', expect.any(Object))
  })
})

describe('client plugin', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ fetched: { enabled: true } })
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reuses the flags from the SSR payload without fetching', async () => {
    useFeatureFlagsState().value = { fromServer: { enabled: true } }

    const { provide } = await (clientPlugin as unknown as Plugin).setup(createNuxtApp())

    expect(fetchMock).not.toHaveBeenCalled()
    expect(provide.featureFlags).toEqual({ fromServer: { enabled: true } })
  })

  it('fetches the flags on client-rendered pages', async () => {
    const { provide } = await (clientPlugin as unknown as Plugin).setup(createNuxtApp({ payload: { serverRendered: false } }))

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(provide.featureFlags).toEqual({ fetched: { enabled: true } })
  })

  it('does not break the app when the fetch fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockRejectedValue(new Error('offline'))

    await expect((clientPlugin as unknown as Plugin).setup(createNuxtApp({ payload: { serverRendered: false } }))).resolves.toBeDefined()
  })
})

describe('v-feature directive', () => {
  const flags = reactive<ResolvedFlags>({
    on: { enabled: true },
    off: { enabled: false },
    exp: { enabled: true, variant: 'b' },
  })
  const directive = createFeatureDirective(flags)
  const createElement = (display = '') => ({ style: { display } }) as HTMLElement

  it('hides elements of disabled flags on the server', () => {
    expect(directive.getSSRProps!(binding('on'), null!)).toEqual({})
    expect(directive.getSSRProps!(binding('off'), null!)).toEqual({ style: { display: 'none' } })
    expect(directive.getSSRProps!(binding('exp:a'), null!)).toEqual({ style: { display: 'none' } })
    expect(directive.getSSRProps!(binding('exp:b'), null!)).toEqual({})
  })

  it('hides elements of disabled flags on the client, keeping their own display', () => {
    const visible = createElement('flex')
    const hidden = createElement('flex')
    directive.beforeMount!(visible, binding('on'), null!, null)
    directive.beforeMount!(hidden, binding('off'), null!, null)

    expect(visible.style.display).toBe('flex')
    expect(hidden.style.display).toBe('none')
  })

  it('follows flag changes and binding updates', () => {
    const el = createElement()
    directive.beforeMount!(el, binding('off'), null!, null)
    expect(el.style.display).toBe('none')

    flags.off = { enabled: true }
    expect(el.style.display).toBe('')

    directive.updated!(el, binding('exp:a'), null!, null!)
    expect(el.style.display).toBe('none')

    directive.unmounted!(el, binding('exp:a'), null!, null)
    flags.exp = { enabled: true, variant: 'a' }
    expect(el.style.display).toBe('none')
  })
})
