import type { H3Event } from 'h3'
import type { NitroApp } from 'nitropack'
import { resolveFeatureFlags } from '../utils/feature-flags'

// Lets the Vue SSR plugin resolve flags through Nitro, so the flags config (and whatever
// it imports, e.g. `useStorage`) only ever lives in the Nitro bundle.
export default (nitroApp: NitroApp) => {
  nitroApp.hooks.hook('request', (event: H3Event) => {
    event.context.$resolveFeatureFlags = () => resolveFeatureFlags(event)
  })
}
