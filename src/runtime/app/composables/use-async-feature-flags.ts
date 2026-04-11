import { useNuxtApp, useFetch, useState } from '#imports'
import type { ResolvedFlags } from '#feature-flags/types'

export const useAsyncFeatureFlags = () => {
  const { $featureFlags } = useNuxtApp()
  const flags = useState<ResolvedFlags>('feature-flags', () => $featureFlags)

  const { data, pending, error, refresh } = useFetch<ResolvedFlags>('/api/_feature-flags/feature-flags', {
    server: false, // We already have them on ssr
    default: () => flags.value,
  })

  // Update the state when new data is fetched
  if (data.value) {
    flags.value = data.value
  }

  return {
    flags,
    pending,
    error,
    refresh,
  }
}
