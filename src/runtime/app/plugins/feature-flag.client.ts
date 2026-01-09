import { defineNuxtPlugin, useState, useFetch } from '#imports'
import { vFeature } from '../directives/feature'

export default defineNuxtPlugin(async (nuxtApp) => {
  const flags = useState('feature-flags', () => ({}))

  // Fetch flags from the server endpoint
  // This ensures the client has the latest flags
  const { data } = await useFetch('/api/_feature-flags/feature-flags', {
    key: 'feature-flags',
    server: false, // We already have the flags on the server
    default: () => flags.value,
  })

  // Update the state with the fetched flags
  if (data.value) {
    flags.value = data.value
  }

  nuxtApp.provide('featureFlags', flags.value)
  nuxtApp.vueApp.directive('feature', vFeature)
})
