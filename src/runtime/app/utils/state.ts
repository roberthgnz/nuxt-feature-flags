import type { ResolvedFlags } from '../../types'
import { DEFAULTS } from '../../utils/defaults'
import { useState } from '#imports'
import type { useNuxtApp } from '#imports'

type NuxtApp = Pick<ReturnType<typeof useNuxtApp>, 'runWithContext'>

/**
 * The resolved flags for this visitor. Serialized into the SSR payload, so the
 * client starts from exactly what the server rendered with.
 */
export function useFeatureFlagsState() {
  return useState<ResolvedFlags>(DEFAULTS.STATE_KEY, () => ({}))
}

/**
 * Re-fetches the flags from the server and updates the shared state **in place**,
 * so every `flags` object already handed out stays reactive. Concurrent calls share
 * a single request.
 */
export function refreshFeatureFlags(nuxtApp: NuxtApp): Promise<void> {
  const app = nuxtApp as NuxtApp & { _featureFlagsRefresh?: Promise<void> }

  app._featureFlagsRefresh ??= nuxtApp.runWithContext(() => {
    const state = useFeatureFlagsState()
    return $fetch<ResolvedFlags>(DEFAULTS.API_ROUTE).then(flags => replaceFlags(state.value, flags))
  }).finally(() => {
    app._featureFlagsRefresh = undefined
  })

  return app._featureFlagsRefresh
}

export function replaceFlags(target: ResolvedFlags, next: ResolvedFlags): void {
  for (const name of Object.keys(target)) {
    if (!(name in next)) {
      Reflect.deleteProperty(target, name)
    }
  }
  Object.assign(target, next)
}
