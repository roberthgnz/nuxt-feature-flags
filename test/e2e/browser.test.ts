import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'

const FLAGS_API = '/api/_feature-flags/feature-flags'

describe('nuxt-feature-flags in the browser', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
    browser: true,
  })

  async function open(path: string) {
    const page = await createPage()
    const flagRequests: string[] = []
    const errors: string[] = []
    page.on('request', (request) => {
      if (request.url().includes(FLAGS_API)) flagRequests.push(request.url())
    })
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text())
    })
    await page.goto(url(path), { waitUntil: 'networkidle' })
    await page.waitForFunction(() => (window as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)
    return { page, flagRequests, errors }
  }

  it('hydrates server-rendered flags without fetching them again', async () => {
    const { page, flagRequests, errors } = await open('/')

    expect(await page.textContent('#dashboard')).toContain('dashboard:true')
    expect(await page.isVisible('#directive-on')).toBe(true)
    expect(await page.isVisible('#directive-off')).toBe(false)
    expect(flagRequests).toEqual([])
    expect(errors).toEqual([])
    await page.close()
  })

  it('fetches flags on client-rendered routes', async () => {
    const { page, flagRequests, errors } = await open('/spa')

    expect(await page.textContent('#spa')).toContain('spa-dashboard:true')
    expect(flagRequests).toHaveLength(1)
    expect(errors).toEqual([])
    await page.close()
  })
})
