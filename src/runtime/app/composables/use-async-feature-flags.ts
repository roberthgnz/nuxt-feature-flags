import type { Ref } from 'vue'
import { useNuxtApp, useFetch, useState } from '#imports'
import type { ResolvedFlags } from '#feature-flags/types'

export interface UseAsyncFeatureFlagsResult {
  flags: Ref<ResolvedFlags>
  pending: Ref<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
}

export const useAsyncFeatureFlags = (): UseAsyncFeatureFlagsResult => {
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
    pending: pending as Ref<boolean>,
    error: error as Ref<unknown>,
    refresh: refresh as () => Promise<void>,
  }
}
