import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent } from 'h3'
import type { H3Event } from 'h3'
import { vi } from 'vitest'
import type { FeatureFlagsConfigInput, FlagsSchema } from '../src/runtime/types'
import { setRuntimeConfig } from './mocks/nuxt'

export interface FakeRequest {
  context?: Record<string, unknown>
  headers?: Record<string, string>
  cookies?: Record<string, string>
  ip?: string
}

/** A real h3 event over a fake Node request. */
export function createTestEvent({ context = {}, headers = {}, cookies = {}, ip = '127.0.0.1' }: FakeRequest = {}): H3Event {
  const socket = new Socket()
  Object.defineProperty(socket, 'remoteAddress', { value: ip })

  const req = new IncomingMessage(socket)
  req.method = 'GET'
  req.url = '/'
  req.headers = { ...headers }
  const cookieHeader = Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; ')
  if (cookieHeader) {
    req.headers.cookie = cookieHeader
  }

  const event = createEvent(req, new ServerResponse(req))
  Object.assign(event.context, context)
  return event
}

/**
 * Fresh copy of the server utils (so module-level caches start empty), wired to the
 * given config file export and inline flags.
 */
export async function loadServerUtils(config: FeatureFlagsConfigInput, runtime: { flags?: FlagsSchema, cacheTTL?: number } = {}) {
  vi.resetModules()
  vi.doMock('#feature-flags/config', () => ({ default: config }))
  setRuntimeConfig({ featureFlags: { flags: {}, cacheTTL: 0, ...runtime } })
  return import('../src/runtime/server/utils/feature-flags')
}
