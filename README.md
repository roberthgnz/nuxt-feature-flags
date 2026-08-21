![nuxt-feature-flags](https://github.com/user-attachments/assets/c57c1175-a660-46d9-ab67-e9842f8d86a6)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

# Nuxt Feature Flags

Type-safe feature flags for Nuxt 3 and Nuxt 4, with server-side runtime evaluation and built-in A/B testing.

## Highlights

- Works with Nuxt 3.1+ and Nuxt 4 (same module, no separate build).
- Flags defined inline in `nuxt.config.ts`, or in a separate config file — sync or async, plain object or a function evaluated per-request.
- Deterministic, sticky A/B/n variant assignment (hashed by user id, session cookie, or IP — no external service needed).
- SSR-safe: flags are resolved once per request on the server, then reused on the client without a second computation.
- Server response cache with a configurable TTL to avoid recomputing flags on every request.
- Auto-imported composables, a `v-feature` directive, and a server-side helper.

## Installation

```bash
npx nuxi module add nuxt-feature-flags
```

## Quick Start

### 1. Enable the module

Either point it at a config file:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    config: './feature-flags.config.ts',
  },
})
```

...or declare flags inline, with no config file at all:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    flags: {
      newDashboard: true,
      checkoutExperiment: {
        enabled: true,
        value: 'control',
        variants: [
          { name: 'control', weight: 50, value: 'control' },
          { name: 'treatment', weight: 50, value: 'treatment' },
        ],
      },
    },
  },
})
```

### 2. Define flags in a config file (optional)

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags((context) => {
  return {
    // `context` is the request's H3Event context — whatever your server
    // middleware attaches to it (auth user, tenant, headers, KV bindings...).
    isAdmin: context?.user?.role === 'admin',
    newDashboard: true,

    checkoutExperiment: {
      enabled: true,
      value: 'control',
      variants: [
        { name: 'control', weight: 50, value: 'control' },
        { name: 'treatment', weight: 50, value: 'treatment' },
      ],
    },
  }
})
```

A function-shaped config is **evaluated on the server for every request** (subject to `cacheTTL`), with the real `H3Event` context — it is never invoked at build time. This makes it safe to read cookies, headers, auth state, or bindings only available at request time (e.g. Cloudflare KV). Async functions are also supported — `await` a remote source and return the flags.

### 3. Use flags on the client

```vue
<script setup lang="ts">
const { flags, isEnabled, getValue, getVariant } = useFeatureFlags()
const { flags: asyncFlags, pending, error, refresh } = useAsyncFeatureFlags()
</script>

<template>
  <NewDashboard v-if="isEnabled('newDashboard')" />
  <div v-feature="'newDashboard'">
    Also hidden/removed from the DOM when the flag is off.
  </div>

  <div v-if="pending">Loading flags...</div>
  <div v-else-if="error">Could not refresh flags</div>
  <CheckoutV2 v-else-if="asyncFlags.checkoutExperiment?.enabled" />
</template>
```

- `useFeatureFlags()` reads the flags already resolved during SSR (no extra request).
- `useAsyncFeatureFlags()` additionally re-fetches from the server on demand via `refresh()`.

### 4. Use flags on the server

```ts
// server/api/data.ts
// `getFeatureFlags` is auto-imported in server/ code — no import needed.
export default defineEventHandler(async (event) => {
  const { isEnabled, getVariant } = await getFeatureFlags(event)

  if (!isEnabled('newDashboard')) {
    throw createError({ statusCode: 404, statusMessage: 'Feature disabled' })
  }

  return {
    variant: getVariant('checkoutExperiment'),
  }
})
```

Outside of `server/` auto-imports (e.g. a Nuxt plugin), import it explicitly:

```ts
import { getFeatureFlags } from '#feature-flags/server/utils'
```

## How variants are assigned

For a flag with `variants`, each request is bucketed deterministically: the module hashes `flagName + identifier` (SHA-256), where `identifier` is the first available of `event.context.user.id`, a session cookie (`session_id` / `session-id` / `nuxt-session`), or the request IP. The same visitor always gets the same variant for a given flag, without any external experimentation service.

## Configuration reference

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  featureFlags: {
    config: './feature-flags.config.ts', // path to a config file (optional)
    flags: { /* inline flag definitions, merged with the config file */ },
    cacheTTL: 5000, // ms the server caches resolved flags for (default: 1000)
  },
})
```

## API

### Client

- `useFeatureFlags()` — `{ flags, isEnabled(flag), getValue(flag), getVariant(flag) }`
- `useAsyncFeatureFlags()` — `{ flags, pending, error, refresh() }`

### Server

- `await getFeatureFlags(event)` — `{ flags, isEnabled(flag), getValue(flag), getVariant(flag) }`

### Directive

```vue
<template>
  <div v-feature="'myFlag'">Only when enabled</div>
</template>
```

`v-feature` removes the element from the DOM on mount if the flag is disabled. Because the removal happens client-side, the element is present in the initial server-rendered HTML and disappears right after hydration — prefer `isEnabled()` with `v-if` when that flash matters (e.g. above the fold).

## Migration Notes (v1 -> v2)

- Server resolution is async: `await getFeatureFlags(event)`.
- Async config functions are supported.
- `useAsyncFeatureFlags` is available for client refresh states.
- `useFeatureFlags` reads already-resolved flags from Nuxt app context.

## Testing

Current branch status:

- `npm run lint` passes.
- `npm run test` passes (`213` tests).
- `npx nuxt-module-build build` passes, and a full `nuxi build` against the built package succeeds (non-blocking builder warnings may appear).

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
