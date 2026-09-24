import { createFeatureDirective } from '../directives/feature'
import { refreshFeatureFlags, useFeatureFlagsState } from '../utils/state'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin({
  name: 'nuxt-feature-flags:client',
  async setup(nuxtApp) {
    const state = useFeatureFlagsState()

    // Server-rendered (and prerendered) pages already carry the flags in the payload.
    // Only client-rendered pages (`ssr: false`) need to ask the server for them.
    if (!nuxtApp.payload.serverRendered) {
      try {
        await refreshFeatureFlags(nuxtApp)
      }
      catch (error) {
        console.error('[nuxt-feature-flags] Could not load feature flags:', error)
      }
    }

    nuxtApp.vueApp.directive('feature', createFeatureDirective(state.value))

    return {
      provide: { featureFlags: state.value },
    }
  },
})
