import { useNuxtApp } from '#imports'
import type { ResolvedFlags, FlagValue } from '#feature-flags/types'

export const useFeatureFlags = () => {
  const { $featureFlags } = useNuxtApp()

  const flags = $featureFlags as ResolvedFlags

  const isEnabled = (flag: string): boolean => {
    return flags[flag]?.enabled ?? false
  }

  const getValue = (flag: string): FlagValue => {
    return flags[flag]?.value
  }

  const getVariant = (flag: string): string | undefined => {
    return flags[flag]?.variant
  }

  return {
    flags,
    isEnabled,
    getValue,
    getVariant,
  }
}
