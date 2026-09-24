import { defineEventHandler, setResponseHeader } from 'h3'
import { resolveFeatureFlags } from '../utils/feature-flags'

export default defineEventHandler((event) => {
  // Flags (and A/B variants) are resolved per visitor: never let a shared cache store them.
  setResponseHeader(event, 'cache-control', 'private, no-store')
  return resolveFeatureFlags(event)
})
