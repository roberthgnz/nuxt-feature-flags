![nuxt-feature-flags](https://github.com/user-attachments/assets/c57c1175-a660-46d9-ab67-e9842f8d86a6)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

# Nuxt Feature Flags

Type-safe feature flags for Nuxt 3 and Nuxt 4, evaluated on the server per request, with built-in A/B/n testing.

## Highlights

- Flags declared inline in `nuxt.config.ts` or in a config file — a plain object, or a (sync or async) function of the request context.
- **Typed flag names**: `isEnabled('newDashbaord')` is a type error. Names are inferred from your config file and inline flags.
- Sticky A/B/n variants (hashed by user id, session cookie or IP — no external service), checked with `isEnabled('experiment:variant')`.
- Resolved once per request on the server and hydrated on the client: no extra request, no flash.
- Only each visitor's *resolved* flags reach the browser — never the definitions (weights, disabled flags...).
- `useFeatureFlags()`, `useAsyncFeatureFlags()`, a `v-feature` directive and a `getFeatureFlags(event)` server util, all auto-imported.

## Installation

```bash
npx nuxi module add nuxt-feature-flags
```

## Quick Start

### 1. Declare your flags

Inline in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    flags: {
      newDashboard: true,
      checkoutExperiment: {
        enabled: true,
        variants: [
          { name: 'control', weight: 50, value: 'control' },
          { name: 'treatment', weight: 50, value: 'treatment' },
        ],
      },
    },
  },
})
```

...or in a config file, which can also compute flags from the request:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    config: './feature-flags.config.ts',
  },
})
```

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags(async context => ({
  // `context` is the request's `event.context`: whatever your server middleware
  // attached to it (auth user, tenant, Cloudflare bindings...).
  isAdmin: context.user?.role === 'admin',
  newDashboard: true,
  remoteFlag: await $fetch<boolean>('https://flags.example.com/remote-flag'),
}))
```

A function config is **evaluated on the server for every request** (see [`cacheTTL`](#caching) to share results), inside Nitro, so it can use anything available there (`useStorage`, `useRuntimeConfig`, bindings...). It never runs at build time. If it throws, the page still renders: flags fall back to the cached result (when `cacheTTL` is set) or to the inline flags, and the error is logged.

If a flag is declared both inline and in the config file, the config file wins.

### 2. Use them in components

```vue
<script setup lang="ts">
const { isEnabled, getValue, getVariant } = useFeatureFlags()
</script>

<template>
  <NewDashboard v-if="isEnabled('newDashboard')" />

  <CheckoutV2 v-if="isEnabled('checkoutExperiment:treatment')" />
  <CheckoutV1 v-else />

  <p>Variant: {{ getVariant('checkoutExperiment') }} ({{ getValue('checkoutExperiment') }})</p>
</template>
```

### 3. Use them on the server

```ts
// server/api/dashboard.ts — `getFeatureFlags` is auto-imported in server/
export default defineEventHandler(async (event) => {
  const { isEnabled, getVariant } = await getFeatureFlags(event)

  if (!isEnabled('newDashboard')) {
    throw createError({ statusCode: 404 })
  }

  return { variant: getVariant('checkoutExperiment') }
})
```

Flags are evaluated once per request: the page render, your API routes and middleware share the same result. Set `event.context.user` in a server middleware *before* reading flags so the config function and variant assignment can use it.

## Flag definitions

| Definition | Resolves to |
|---|---|
| `true` / `'blue'` / `42` | enabled when truthy, with that value |
| `{ enabled: false, value }` | disabled, never assigned a variant |
| `{ enabled: true, value }` | enabled, with `value` |
| `{ value }` (no `enabled`) | enabled when `value` is truthy |
| `{ enabled: true, variants }` | enabled, value of the visitor's variant (or the flag's `value` if the variant has none). A variant with `value: false` turns the flag off for its visitors — handy for gradual rollouts |

## Variants (A/B/n testing)

Each visitor is bucketed by hashing `flagName + identifier`, where the identifier is the first available of `event.context.user.id` (or `event.context.userId`), a session cookie (`session_id`, `session-id`, `nuxt-session`), or the client IP. The same visitor always gets the same variant of a flag, and buckets of different flags are independent. Weights are normalized, so they don't need to add up to 100.

```ts
const { isEnabled, getVariant } = useFeatureFlags()

isEnabled('checkoutExperiment')           // is the flag on for this visitor?
isEnabled('checkoutExperiment:treatment') // is this visitor in the "treatment" variant?
getVariant('checkoutExperiment')          // 'control' | 'treatment' | undefined
```

## API

### `useFeatureFlags()`

`{ flags, isEnabled(flag), getValue(flag), getVariant(flag) }` over the flags resolved on the server. Reactive: it updates when the flags are refreshed.

### `useAsyncFeatureFlags(options?)`

Same helpers plus `{ flags, pending, error, refresh() }`. `refresh()` re-evaluates the flags on the server (e.g. after login) and updates every component using flags. By default it refreshes when the component mounts; pass `{ immediate: false }` to only refresh on demand.

### `v-feature`

```vue
<div v-feature="'newDashboard'">Only when enabled</div>
<div v-feature="'checkoutExperiment:treatment'">Only in the treatment variant</div>
```

Works like `v-show`: the element is rendered with `display: none` when the flag is off — already in the server HTML, so there's no flash — and toggles when flags are refreshed. Use `v-if="isEnabled(...)"` to keep the markup out of the page entirely.

### `getFeatureFlags(event)` (server)

`Promise<{ flags, isEnabled, getValue, getVariant }>`. Auto-imported in `server/`; elsewhere, `import { getFeatureFlags } from '#feature-flags/server/utils'`.

### `GET /api/_feature-flags/feature-flags`

The current visitor's resolved flags as JSON (sent with `cache-control: private, no-store`). Used by client-rendered pages and `refresh()`.

## Configuration

```ts
export default defineNuxtConfig({
  featureFlags: {
    config: './feature-flags.config.ts', // flags config file, relative to the project root (optional)
    flags: {}, // inline flags (optional)
    cacheTTL: 0, // ms a function config's result may be shared across requests (default 0)
  },
})
```

A `config` path that doesn't exist fails the build with a clear error instead of silently running without flags.

Inline flags live in the server-only runtime config, so they can be overridden per environment without rebuilding, e.g. `NUXT_FEATURE_FLAGS_FLAGS_NEW_DASHBOARD=false`.

### Caching

By default a function config runs on every request, so it can safely depend on the visitor. If it doesn't (e.g. it only fetches flags from a remote service), set `cacheTTL` to reuse its result for that many milliseconds — **the cached result is shared by every visitor**, so don't combine `cacheTTL` with per-visitor logic. Concurrent requests during a cache miss share a single evaluation. Variant assignment is always computed per visitor, cache or not.

## Type safety

Flag names are generated into `.nuxt/types/nuxt-feature-flags.d.ts` from your inline flags and from the return type of your config file, so `isEnabled`, `getValue`, `getVariant` and `getFeatureFlags` only accept declared flags (plus `flag:variant` forms). If names can't be inferred (e.g. the config is typed as a generic record), any string is accepted.

## Build-time validation

`nuxt-feature-flags/build` checks the config (names, variant weights...) and that every flag used in your code (`isEnabled('x')`, `v-feature="'x'"`...) is declared. Handy in CI:

```ts
// scripts/validate-flags.ts
import { validateFeatureFlags } from 'nuxt-feature-flags/build'

await validateFeatureFlags({
  configPath: 'feature-flags.config.ts',
  srcPatterns: ['app/**/*.{vue,ts}', 'server/**/*.ts'],
  failOnErrors: true,
})
```

In development, invalid definitions are also reported in the server console.

## Rendering modes

| Mode | Support |
|---|---|
| **SSR** (default) | ✅ Flags resolved per request with the real request context, then hydrated. |
| **SPA** (`ssr: false` or `routeRules: { ssr: false }`, with a server) | ✅ The client fetches the flags from the API route before rendering. |
| **Hybrid** (`isr` / `swr` / `prerender` route rules) | ✅ Server-rendered routes behave like SSR. Remember that cached/prerendered HTML is shared, so its flags and variants are too. |
| **Static generation** (`nuxi generate`) | ⚠️ Flags are computed once at build time and baked into the HTML: fine for static flags, but every visitor of a page gets the same variant. |
| **Fully static hosting of an SPA** (no server at all) | ❌ The flags API route needs a server. |

## Migrating from 2.0

- `isEnabled('flag:variant')` now works everywhere (it always returned `false` before).
- A function config is no longer cached for 1s by default — that cache shared one visitor's flags with others. Set `cacheTTL` explicitly if your config doesn't depend on the visitor.
- Inline flags moved from `runtimeConfig.public.featureFlags` to the server-only `runtimeConfig.featureFlags` (env overrides: `NUXT_FEATURE_FLAGS_FLAGS_*` instead of `NUXT_PUBLIC_FEATURE_FLAGS_FLAGS_*`).
- `v-feature` hides elements (like `v-show`) instead of removing them after hydration.
- A missing `config` file now fails the build.
- The undocumented `isFeatureEnabled` server helper was removed; use `await getFeatureFlags(event)`.
- Server-rendered pages no longer fetch the flags again from the browser after hydration.

## Documentation

- [Getting Started](https://nuxt-feature-flags-docs.vercel.app/guide/)
- [Features](https://nuxt-feature-flags-docs.vercel.app/guide/features)
- [Context](https://nuxt-feature-flags-docs.vercel.app/guide/context)
- [Variants](https://nuxt-feature-flags-docs.vercel.app/guide/variants)
- [API](https://nuxt-feature-flags-docs.vercel.app/guide/api)
- [Validation](https://nuxt-feature-flags-docs.vercel.app/guide/validation)

## License

[MIT License](LICENSE) (c) 2024

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-feature-flags/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/nuxt-feature-flags

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-feature-flags.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/nuxt-feature-flags

[license-src]: https://img.shields.io/npm/l/nuxt-feature-flags.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/nuxt-feature-flags

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
