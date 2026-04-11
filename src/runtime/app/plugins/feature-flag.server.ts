import { defineNuxtPlugin, useState } from '#imports'
import { resolveFeatureFlags } from '#feature-flags/server/utils'

export default defineNuxtPlugin(async (nuxtApp) => {
  const flags = await resolveFeatureFlags(nuxtApp.ssrContext.event)
  const state = useState('feature-flags', () => flags)
  nuxtApp.provide('featureFlags', state.value)
})
