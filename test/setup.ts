import { beforeEach, vi } from 'vitest'
import { resetNuxtMocks } from './mocks/nuxt'

vi.mock('#imports', () => import('./mocks/nuxt'))

beforeEach(() => {
  resetNuxtMocks()
})
