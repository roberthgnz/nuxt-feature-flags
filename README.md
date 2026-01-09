![nuxt-feature-flags](https://github.com/user-attachments/assets/c57c1175-a660-46d9-ab67-e9842f8d86a6)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

# Nuxt Feature Flags 🚩

A powerful, type-safe feature flag module for Nuxt 3 with A/B testing and variant support.

## ✨ Features

- 🎯 **Context-aware evaluation** - Evaluate flags based on user, device, environment
- 🛠 **TypeScript Ready** - Full type safety with autocomplete
- 🧩 **Nuxt 3 Integration** - Seamless integration with auto-imports
- 🔀 **A/B/n Testing** - Built-in variant support with persistent assignment
-  validating** - Built-in validation for flag configuration
- 🔒 **Type Safety** - Catch errors early with full type inference

## 📦 Installation

```bash
npx nuxi module add nuxt-feature-flags
```

## 🚀 Quick Start

### 1. Add to your Nuxt config

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags']
})
```

### 2. Configure your flags

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags(async () => {
  // Fetch flags from a remote source
  const remoteFlags = await $fetch('https://api.example.com/flags')

  return {
    newDashboard: true,
    darkMode: false,
    ...remoteFlags,
  }
})
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    config: './feature-flags.config.ts'
  }
})
```

### 3. Use in your app

**In components:**

```vue
<script setup>
const { flags, isEnabled, getValue } = useFeatureFlags()
const { flags: asyncFlags, pending, error } = useAsyncFeatureFlags()
</script>

<template>
  <div>
    <!-- From composable -->
    <NewDashboard v-if="flags.newDashboard?.enabled" />

    <!-- From async composable -->
    <div v-if="pending">Loading...</div>
    <div v-else-if="error">Error loading flags</div>
    <div v-else>
      <DarkModeToggle v-if="asyncFlags.darkMode?.enabled" />
    </div>
  </div>
</template>
```

**In server routes:**

```ts
// server/api/data.ts
import { getFeatureFlags } from '#feature-flags/server/utils'

export default defineEventHandler(async (event) => {
  const { isEnabled } = await getFeatureFlags(event)
  
  if (!isEnabled('newDashboard')) {
    throw createError({ statusCode: 404 })
  }
  
  return { data: 'Dashboard data' }
})
```

## 🎯 Context-Aware Flags

Create dynamic flags based on user, device, or environment:

```ts
// feature-flags.config.ts
export default defineFeatureFlags((context) => ({
  // Role-based
  adminPanel: context?.user?.role === 'admin',
  
  // Environment-based
  devTools: process.env.NODE_ENV === 'development',
  
  // Device-based
  mobileUI: context?.device?.isMobile ?? false,
  
  // Gradual rollout (20% of users)
  newFeature: {
    enabled: true,
    variants: [
      { name: 'old', weight: 80, value: false },
      { name: 'new', weight: 20, value: true }
    ]
  }
}))
```

Populate context in server middleware:

```ts
// server/middleware/user-context.ts
export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  
  if (user) {
    event.context.user = {
      id: user.id,
      role: user.role
    }
  }
})
```

## 📖 API Reference

### Client-Side

**`useFeatureFlags`**

```ts
const { 
  flags,              // Ref<ResolvedFlags>
  isEnabled,          // (flag: string) => boolean
  getValue,           // (flag: string) => any
} = useFeatureFlags()
```

**`useAsyncFeatureFlags`**

```ts
const {
  flags,              // Ref<ResolvedFlags>
  pending,            // Ref<boolean>
  error,              // Ref<Error | null>
  refresh,            // () => Promise<void>
} = useAsyncFeatureFlags()
```

### Server-Side

```ts
const { 
  flags,              // ResolvedFlags
  isEnabled,          // (flag: string) => boolean
  getValue,           // (flag: string) => any
} = await getFeatureFlags(event)
```

### Template Directive

```vue
<template>
  <!-- Show if flag is enabled -->
  <div v-feature="'myFlag'">Content</div>
  
  <!-- Show for specific variant -->
  <div v-feature="'myFlag:variantA'">Variant A content</div>
</template>
```

## Migration Guide (from v1 to v2)

Version 2 introduces a major shift to runtime, asynchronous feature flag evaluation. This allows for more powerful, dynamic flag sourcing, but it also introduces some breaking changes.

### 1. Asynchronous Flag Configuration

The `defineFeatureFlags` function can now be asynchronous. If you're fetching flags from a remote source, you'll need to update your configuration accordingly.

**Before:**

```ts
// feature-flags.config.ts
export default defineFeatureFlags(() => ({
  newDashboard: true,
}))
```

**After:**

```ts
// feature-flags.config.ts
export default defineFeatureFlags(async () => {
  const remoteFlags = await $fetch('https://api.example.com/flags')
  return {
    newDashboard: true,
    ...remoteFlags,
  }
})
```

### 2. `useAsyncFeatureFlags` Composable

A new `useAsyncFeatureFlags` composable has been introduced to handle the asynchronous nature of flag resolution on the client-side. This composable provides `pending` and `error` states to give you more control over the UI during flag resolution.

**Before:**

```vue
<script setup>
const { isEnabled } = useFeatureFlags()
</script>
```

**After:**

```vue
<script setup>
const { flags, pending, error } = useAsyncFeatureFlags()
</script>
```

### 3. Server-Side Flag Resolution

The `getFeatureFlags` function on the server is now asynchronous. You'll need to `await` its result.

**Before:**

```ts
// server/api/data.ts
export default defineEventHandler((event) => {
  const { isEnabled } = getFeatureFlags(event)
  // ...
})
```

**After:**

```ts
// server/api/data.ts
export default defineEventHandler(async (event) => {
  const { isEnabled } = await getFeatureFlags(event)
  // ...
})
```

## ✅ Validation

Validate flags at build time:

```ts
// scripts/validate-flags.ts
import { validateFeatureFlags } from 'nuxt-feature-flags/build'

const errors = await validateFeatureFlags({
  configPath: './feature-flags.config.ts',
  srcPatterns: ['**/*.vue', '**/*.ts'],
  failOnErrors: true
})
```

## 🧪 Testing

The test suite for this module is currently experiencing issues with mocking the Nuxt environment. While the core functionality has been manually tested and verified, the automated tests are not passing. Contributions to fix the test suite are welcome.

## 📚 Documentation

For detailed documentation, visit [nuxt-feature-flags-docs.vercel.app](https://nuxt-feature-flags-docs.vercel.app)

- [Getting Started](https://nuxt-feature-flags-docs.vercel.app/guide/)
- [Features](https://nuxt-feature-flags-docs.vercel.app/guide/features)
- [Context-Aware Flags](https://nuxt-feature-flags-docs.vercel.app/guide/context)
- [Variants & A/B Testing](https://nuxt-feature-flags-docs.vercel.app/guide/variants)
- [API Reference](https://nuxt-feature-flags-docs.vercel.app/guide/api)
- [Module Options](https://nuxt-feature-flags-docs.vercel.app/config/)
- [Validation & Build Checks](https://nuxt-feature-flags-docs.vercel.app/guide/validation)
- [Best Practices](https://nuxt-feature-flags-docs.vercel.app/guide/best-practices)
- [Troubleshooting](https://nuxt-feature-flags-docs.vercel.app/guide/troubleshooting)

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guide](CONTRIBUTING.md).

## 📄 License

[MIT License](LICENSE) © 2024

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-feature-flags/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/nuxt-feature-flags

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-feature-flags.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/nuxt-feature-flags

[license-src]: https://img.shields.io/npm/l/nuxt-feature-flags.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/nuxt-feature-flags

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
