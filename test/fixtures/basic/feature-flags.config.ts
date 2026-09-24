import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags(async context => ({
  isAdmin: context.user?.role === 'admin',
  newDashboard: true,
  hiddenFeature: false,
  overridden: true,
  checkout: {
    enabled: true,
    value: 'fallback',
    variants: [
      { name: 'control', weight: 50, value: 'original' },
      { name: 'treatment', weight: 50, value: 'new-design' },
    ],
  },
}))
