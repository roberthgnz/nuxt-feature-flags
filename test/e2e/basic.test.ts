import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { describe, it, expect } from 'vitest'
import { $fetch, fetch, setup, url, useTestContext } from '@nuxt/test-utils/e2e'

describe('nuxt-feature-flags in a real Nuxt app', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
  })

  const text = (html: string, id: string) => html.match(new RegExp(`id="${id}"[^>]*>\\s*([^<]*?)\\s*<`))?.[1]
  const asUser = (id: string, role = 'user') => ({ headers: { 'x-user-id': id, 'x-user-role': role } })

  it('renders flags on the server', async () => {
    const html = await $fetch<string>('/')
    expect(text(html, 'dashboard')).toBe('dashboard:true')
    expect(text(html, 'inline')).toBe('inline:inline')
    // The config file wins over inline flags of the same name.
    expect(text(html, 'overridden')).toBe('overridden:true')
  })

  it('evaluates the config per request, without leaking between visitors', async () => {
    const admin = await $fetch<string>('/', asUser('1', 'admin'))
    const visitor = await $fetch<string>('/', asUser('2'))
    expect(text(admin, 'admin')).toBe('admin:true')
    expect(text(visitor, 'admin')).toBe('admin:false')
  })

  it('assigns sticky variants usable as `flag:variant`', async () => {
    const variants = new Set<string>()
    for (let id = 0; id < 20; id++) {
      const first = await $fetch<string>('/', asUser(`user-${id}`))
      const again = await $fetch<string>('/', asUser(`user-${id}`))
      const variant = text(first, 'variant')!.replace('variant:', '')

      expect(text(again, 'variant')).toBe(`variant:${variant}`)
      expect(text(first, 'value')).toBe(variant === 'control' ? 'value:original' : 'value:new-design')
      expect(first).toContain(`id="${variant}"`)
      expect(first).not.toContain(`id="${variant === 'control' ? 'treatment' : 'control'}"`)
      variants.add(variant)
    }
    expect(variants).toEqual(new Set(['control', 'treatment']))
  })

  it('hides v-feature elements of disabled flags in the server HTML', async () => {
    const html = await $fetch<string>('/')
    expect(html).toMatch(/<p id="directive-on"(?![^>]*display:\s*none)[^>]*>/)
    expect(html).toMatch(/<p id="directive-off"[^>]*style="display:\s*none;?"/)
  })

  it('ships resolved flags, not flag definitions, to the browser', async () => {
    const html = await $fetch<string>('/')
    // Variant weights (definitions) stay on the server; only this visitor's result is sent.
    expect(html).not.toContain('weight')
  })

  it('serves the resolved flags from the API, uncacheable', async () => {
    const response = await fetch(url('/api/_feature-flags/feature-flags'), asUser('1', 'admin'))
    expect(response.headers.get('cache-control')).toBe('private, no-store')

    const flags = await response.json()
    expect(flags.isAdmin).toEqual({ enabled: true, value: true })
    expect(flags.hiddenFeature).toEqual({ enabled: false, value: false })
    expect(['control', 'treatment']).toContain(flags.checkout.variant)
  })

  it('auto-imports getFeatureFlags in server routes', async () => {
    const page = await $fetch<string>('/', asUser('42'))
    const check = await $fetch<{ isAdmin: boolean, variant: string }>('/api/check', asUser('42'))
    expect(check.isAdmin).toBe(false)
    expect(`variant:${check.variant}`).toBe(text(page, 'variant'))
  })

  it('generates flag name types from the config file and inline flags', async () => {
    const { nuxt } = useTestContext()
    const types = await readFile(`${nuxt!.options.buildDir}/types/nuxt-feature-flags.d.ts`, 'utf-8')
    expect(types).toMatch(/typeof import\("[./]+\/feature-flags\.config"\)\['default'\]/)
    expect(types).toContain('"inlineOnly" | "overridden"')
  })
})
