import { getCurrentInstance, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import type { FeatureFlagsHelpers, ResolvedFlags } from '../../types'
import { createFlagsHelpers } from '../../shared/helpers'
import { refreshFeatureFlags, useFeatureFlagsState } from '../utils/state'
import { useNuxtApp } from '#imports'
import type { FlagName } from '#feature-flags/types'

export interface UseAsyncFeatureFlagsOptions {
  /** Re-fetch the flags as soon as the component mounts. Defaults to `true`. */
  immediate?: boolean
}

export interface UseAsyncFeatureFlagsResult extends Omit<FeatureFlagsHelpers<FlagName>, 'flags'> {
  flags: Ref<ResolvedFlags>
  pending: Ref<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
}

/**
 * Same flags as `useFeatureFlags()`, plus a `refresh()` that re-evaluates them on the
 * server. Refreshing updates the shared state, so every other consumer updates too.
 */
export function useAsyncFeatureFlags(options: UseAsyncFeatureFlagsOptions = {}): UseAsyncFeatureFlagsResult {
  const nuxtApp = useNuxtApp()
  const flags = useFeatureFlagsState()
  const pending = ref(false)
  const error = ref<unknown>(null)

  const refresh = async () => {
    pending.value = true
    error.value = null
    try {
      await refreshFeatureFlags(nuxtApp)
    }
    catch (err) {
      error.value = err
    }
    finally {
      pending.value = false
    }
  }

  if (import.meta.client && options.immediate !== false) {
    if (getCurrentInstance()) {
      onMounted(refresh)
    }
    else {
      refresh()
    }
  }

  const { flags: _flags, ...helpers } = createFlagsHelpers<FlagName>(flags.value)
  return { flags, pending, error, refresh, ...helpers }
}
