import FeatureFlags from '../../../src/module'

export default defineNuxtConfig({
  modules: [FeatureFlags],
  routeRules: {
    '/spa': { ssr: false },
  },
  compatibilityDate: '2025-02-21',
  featureFlags: {
    config: './feature-flags.config.ts',
    flags: {
      inlineOnly: 'inline',
      overridden: false,
    },
  },
})
