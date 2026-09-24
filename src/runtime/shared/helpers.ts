import type { FeatureFlagsHelpers, FlagValue, ResolvedFlags } from '../types'

/**
 * Builds the `isEnabled` / `getValue` / `getVariant` helpers shared by the client
 * composable and the server util. `flags` is read on every call, so passing a
 * reactive object keeps the helpers reactive inside templates and computeds.
 */
export function createFlagsHelpers<Name extends string = string>(flags: ResolvedFlags): FeatureFlagsHelpers<Name> {
  return {
    flags,
    isEnabled: flag => isFlagEnabled(flags, flag),
    getValue: flag => flags[flag]?.value as FlagValue,
    getVariant: flag => flags[flag]?.variant,
  }
}

/**
 * `flag` → the flag is enabled.
 * `flag:variant` → the visitor was bucketed into `variant` of `flag`.
 */
export function isFlagEnabled(flags: ResolvedFlags, flag: string): boolean {
  if (!flag) {
    return false
  }

  const separator = flag.indexOf(':')
  if (separator === -1) {
    return flags[flag]?.enabled ?? false
  }

  const variant = flag.slice(separator + 1)
  return !!variant && flags[flag.slice(0, separator)]?.variant === variant
}
