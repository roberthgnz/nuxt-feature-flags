![nuxt-feature-flags](https://github.com/user-attachments/assets/c57c1175-a660-46d9-ab67-e9842f8d86a6)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

# Nuxt Feature Flags

Type-safe feature flags for Nuxt 3 with runtime evaluation and built-in A/B testing.

## Highlights

- Runtime flag resolution on server requests.
- Async config support (`defineFeatureFlags(async () => ...)`).
- Built-in variant assignment for experiments.
- Nuxt auto-imports for client and server helpers.
- Validation and test tooling for safer rollouts.

## Installation

```bash
npx nuxi module add nuxt-feature-flags
```

## Quick Start

### 1. Enable the module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    config: './feature-flags.config.ts',
  },
})
```

### 2. Define flags

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags(async () => {
  const remoteFlags = await $fetch('https://api.example.com/flags')

  return {
    newDashboard: true,
    checkoutExperiment: {
      enabled: true,
      value: 'control',
      variants: [
        { name: 'control', weight: 50, value: 'control' },
        { name: 'treatment', weight: 50, value: 'treatment' },
      ],
    },
    ...remoteFlags,
  }
})
```

### 3. Use flags in client and server

```vue
<script setup lang="ts">
const { flags, isEnabled } = useFeatureFlags()
const { flags: asyncFlags, pending, error } = useAsyncFeatureFlags()
</script>

<template>
  <NewDashboard v-if="isEnabled('newDashboard')" />

  <div v-if="pending">Loading flags...</div>
  <div v-else-if="error">Could not refresh flags</div>
  <CheckoutV2 v-else-if="asyncFlags.checkoutExperiment?.enabled" />
</template>
```

```ts
// server/api/data.ts
import { getFeatureFlags } from '#feature-flags/server/utils'

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

## API

### Client

- `useFeatureFlags()`
  - `flags`
  - `isEnabled(flag)`
  - `getValue(flag)`
  - `getVariant(flag)`

- `useAsyncFeatureFlags()`
  - `flags`
  - `pending`
  - `error`
  - `refresh()`

### Server

- `await getFeatureFlags(event)`
  - `flags`
  - `isEnabled(flag)`
  - `getValue(flag)`
  - `getVariant(flag)`

### Directive

```vue
<template>
  <div v-feature="'myFlag'">Only when enabled</div>
</template>
```

## Migration Notes (v1 -> v2)

- Server resolution is async: `await getFeatureFlags(event)`.
- Async config functions are supported.
- `useAsyncFeatureFlags` is available for client refresh states.
- `useFeatureFlags` reads already-resolved flags from Nuxt app context.

## Testing

Current branch status:

- `npm run lint` passes.
- `npm run test` passes (`208` tests).
- `npx nuxt-module-build build` passes (non-blocking builder warnings may appear).

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
