# Changelog

## v2.0.2 (2026-04-25)

### Security

- Switched server-side IP extraction to `h3`'s `getRequestIP` with `xForwardedFor` handling for safer variant context resolution.

### Performance

- Parallelized source-file scanning during build flag discovery.
- Optimized undeclared flag validation by avoiding repeated string splitting.

### Quality

- Added unit coverage for `defineFeatureFlags`.
- Simplified the feature flags API handler.
- Refactored variant context resolution to reduce cookie lookup duplication.

## v2.0.1 (2026-04-11)

### Fixes

- Stabilized runtime flag resolution with safer fallback behavior when config import is unavailable.
- Added resilient event/cookie handling for server-side variant resolution.
- Restored backward-compatible `isFeatureEnabled` helper for legacy consumers/tests.
- Improved async composable typing to avoid declaration-generation issues.

### Quality

- Updated and aligned mocks/tests with v2 runtime behavior.
- Lint, tests, and module build are passing on branch `v2`.

## v2.0.0 (2024-07-26)

### Features

- Runtime flag evaluation on the server, allowing dynamic sources (for example, KV/remote services).
- Asynchronous configuration support in `defineFeatureFlags`.
- New `useAsyncFeatureFlags` composable with `pending` and `error` states.

### Breaking Changes

- `getFeatureFlags` became asynchronous and must be awaited.
- `useFeatureFlags` now exposes sync access to server-resolved flags.
- Config function now receives runtime `H3EventContext`.

## v1.1.7 (2024-07-25)

- Initial release.
