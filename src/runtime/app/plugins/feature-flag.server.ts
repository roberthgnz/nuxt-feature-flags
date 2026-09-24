import type { ResolvedFlags } from '../../types'
import { createFeatureDirective } from '../directives/feature'
import { useFeatureFlagsState } from '../utils/state'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin({
  name: 'nuxt-feature-flags:server',
  async setup(nuxtApp) {
    const state = useFeatureFlagsState()
    const resolve = nuxtApp.ssrContext?.event.context.$resolveFeatureFlags as (() => Promise<ResolvedFlags>) | undefined
    if (resolve) {
      state.value = await resolve()
    }

    nuxtApp.vueApp.directive('feature', createFeatureDirective(state.value))

    return {
      provide: { featureFlags: state.value },
    }
  },
})
