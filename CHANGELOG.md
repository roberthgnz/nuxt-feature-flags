# Changelog

## v2.0.0 (2024-07-26)

### ✨ Features

-   **Runtime Flag Evaluation:** Feature flags are now evaluated at runtime on the server, allowing for dynamic flag sourcing from remote sources like Cloudflare KV.
-   **Asynchronous Configuration:** The `defineFeatureFlags` function can now be asynchronous, enabling the use of `await` for fetching flags.
-   **`useAsyncFeatureFlags` Composable:** A new `useAsyncFeatureFlags` composable has been introduced for client-side flag resolution, with support for `pending` and `error` states.

### 💥 Breaking Changes

-   **Asynchronous by Default:** The entire module is now asynchronous. This means `getFeatureFlags` on the server is now an `async` function, and the `useAsyncFeatureFlags` composable should be used on the client for asynchronous flag resolution.
-   **`useFeatureFlags` Composable:** The `useFeatureFlags` composable now provides synchronous access to the flags that were resolved on the server. For client-side fetching, use `useAsyncFeatureFlags`.
-   **Configuration Function:** The configuration function now receives the `H3EventContext` at runtime, not build time.

## v1.1.7 (2024-07-25)

-   Initial release
