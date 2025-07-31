![getimg_ai_img-l610JcOrfVMwDc6q6PSCr](https://github.com/user-attachments/assets/c57c1175-a660-46d9-ab67-e9842f8d86a6)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

# Nuxt Feature Flags 🚩

A powerful, type-safe feature flag module for Nuxt 3 that enables both static and dynamic feature flag evaluation with server-side support. Perfect for A/B testing, gradual rollouts, and feature management with built-in variant support.

## ✨ Features

- 🎯 **Context-aware evaluation**: Evaluate flags based on request context (user roles, geo-location, device type, etc.)
- 🛠 **TypeScript Ready**: Full TypeScript support with type-safe flag definitions and autocomplete
- 🧩 **Nuxt 3 Integration**: Seamless integration with auto-imports and runtime config
- 🎯 **Static & Dynamic Flags**: Support for both simple boolean flags and dynamic evaluation
- 🔀 **A/B/n Testing**: Built-in support for feature variants with configurable distribution
- 🎲 **Persistent Assignment**: Users consistently get the same variant across sessions
- 📊 **Validation & Linting**: Built-in validation for flag configuration and usage
- 🔒 **Type Safety**: Catch errors early with full type inference and validation

## 📦 Installation

```bash
# Using npx
npx nuxi module add nuxt-feature-flags

# Using npm
npm install nuxt-feature-flags

# Using yarn
yarn add nuxt-feature-flags

# Using pnpm
pnpm add nuxt-feature-flags
```

## 🚀 Quick Setup

1. Add the module to your `nuxt.config.ts`:

```ts
// Basic usage with plain configuration
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    flags: {
      newDashboard: false,
      experimentalFeature: true
    }
  }
})

// Advanced usage with context-based flag rules
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags((context) => {
  return {
    isAdmin: context?.user?.role === 'admin',
    newDashboard: true,
    experimentalFeature: process.env.NODE_ENV === 'development',
    betaFeature: context?.user?.isBetaTester ?? false,
    
    // A/B test with variants
    buttonDesign: {
      enabled: true,
      value: 'default',
      variants: [
        { name: 'control', weight: 50, value: 'original' },
        { name: 'treatment', weight: 50, value: 'new-design' }
      ]
    },
    
    // Gradual rollout (30% get new feature)
    newCheckout: {
      enabled: true,
      variants: [
        { name: 'old', weight: 70, value: false },
        { name: 'new', weight: 30, value: true }
      ]
    }
  }
})

// nuxt.config.ts
export default defineNuxtConfig({
  featureFlags: {
    config: './feature-flags.config.ts',
  }
})
```

2. Use in your Vue components:

```vue
<script setup>
const { isEnabled, getVariant, getValue } = useFeatureFlags()
</script>

<template>
  <div>
    <!-- Simple feature flag -->
    <NewDashboard v-if="isEnabled('newDashboard')" />
    
    <!-- A/B test with variants -->
    <div v-feature="'buttonDesign:control'">
      <button class="original-style">Click me</button>
    </div>
    <div v-feature="'buttonDesign:treatment'">
      <button class="new-style">Click me</button>
    </div>
    
    <!-- Check specific variant programmatically -->
    <div v-if="getVariant('buttonDesign') === 'treatment'">
      You're seeing the new design! Value: {{ getValue('buttonDesign') }}
    </div>
  </div>
</template>
```

3. Use in your server routes:

```ts
// server/api/dashboard.ts
export default defineEventHandler(async (event) => {
  const { isEnabled, getVariant, getValue } = getFeatureFlags(event)

  if (!isEnabled('newDashboard')) {
    throw createError({
      statusCode: 404,
      message: 'Dashboard not available'
    })
  }

  // Check if user is in new checkout variant
  const checkoutVersion = getVariant('newCheckout')
  
  return {
    stats: {
      users: 100,
      revenue: 50000
    },
    checkoutVersion,
    useNewFeatures: getValue('newCheckout')
  }
})
```

## 📖 Documentation

### Client-Side Usage

```ts
const { 
  flags,       // Reactive flags object
  isEnabled,   // (flagName: string, variant?: string) => boolean
  getVariant,  // (flagName: string) => string | undefined
  getValue,    // (flagName: string) => any
  getFlag,     // (flagName: string) => ResolvedFlag
} = useFeatureFlags()

// Check if a flag is enabled
if (isEnabled('newFeature')) {
  // Feature is enabled
}

// Check specific variant
if (isEnabled('myFlag:variantA')) {
  // User is in variant A
}

// Get assigned variant
const variant = getVariant('myFlag') // 'control' | 'treatment' | undefined

// Get flag value
const value = getValue('myFlag') // The resolved value for the user's variant
```

### Server-Side Usage

```ts
const { 
  flags,       // Flags object
  isEnabled,   // (flagName: string, variant?: string) => boolean
  getVariant,  // (flagName: string) => string | undefined  
  getValue,    // (flagName: string) => any
} = getFeatureFlags(event)

// Same API as client-side
if (isEnabled('newFeature')) {
  // Feature is enabled
}
```

### Template Usage with Directives

```vue
<template>
  <!-- Show for all enabled users -->
  <div v-feature="'myFlag'">
    This shows if myFlag is enabled
  </div>
  
  <!-- Show for specific variant -->
  <div v-feature="'myFlag:control'">
    Control version
  </div>
  
  <div v-feature="'myFlag:treatment'">
    Treatment version  
  </div>
</template>
```

## 🎲 Feature Variants & A/B Testing

Feature variants allow you to create A/B/n tests and gradual rollouts with consistent user assignment.

### Basic Variant Configuration

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags(() => {
  return {
    // Simple A/B test
    buttonColor: {
      enabled: true,
      value: 'blue', // default value
      variants: [
        { name: 'blue', weight: 50 },
        { name: 'red', weight: 50, value: 'red' }
      ]
    },
    
    // A/B/C/D test
    homepage: {
      enabled: true,
      variants: [
        { name: 'original', weight: 40, value: 'v1' },
        { name: 'redesign', weight: 30, value: 'v2' },
        { name: 'minimal', weight: 20, value: 'v3' },
        { name: 'experimental', weight: 10, value: 'v4' }
      ]
    },
    
    // Gradual rollout (20% get new feature)
    newFeature: {
      enabled: true,
      variants: [
        { name: 'disabled', weight: 80, value: false },
        { name: 'enabled', weight: 20, value: true }
      ]
    }
  }
})
```

### Variant Assignment Logic

- **Persistent**: Users get the same variant across sessions (based on user ID, session ID, or IP)
- **Weighted Distribution**: Variants are assigned based on configured weights (0-100)
- **Automatic Normalization**: Weights are automatically normalized if they don't sum to 100

### Using Variants in Templates

```vue
<template>
  <!-- Different button colors based on variant -->
  <button 
    v-feature="'buttonColor:blue'"
    class="bg-blue-500 text-white px-4 py-2"
  >
    Blue Button (50% of users)
  </button>
  
  <button 
    v-feature="'buttonColor:red'" 
    class="bg-red-500 text-white px-4 py-2"
  >
    Red Button (50% of users)
  </button>
  
  <!-- Conditional content based on variant -->
  <div v-if="getVariant('homepage') === 'redesign'">
    <h1>Welcome to our new design!</h1>
  </div>
</template>
```

### Programmatic Variant Checking

```ts
const { isEnabled, getVariant, getValue } = useFeatureFlags()

// Check if user is in specific variant
if (isEnabled('buttonColor:red')) {
  // User sees red button
}

// Get the assigned variant name
const variant = getVariant('buttonColor') // 'blue' | 'red'

// Get the variant value
const color = getValue('buttonColor') // 'blue' | 'red'

// Use in computed properties
const buttonClass = computed(() => {
  const color = getValue('buttonColor')
  return `bg-${color}-500 text-white px-4 py-2`
})
```

## ⚙️ Configuration Methods

### 1. Inline Configuration

```ts
export default defineNuxtConfig({
  featureFlags: {
    flags: {
      promoBanner: true,
      betaFeature: false,
      newDashboard: false
    }
  }
})
```

### 2. Configuration File

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  featureFlags: {
    config: './feature-flags.config.ts',
  }
})

// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags(() => ({
  isAdmin: false,
  newDashboard: true,
  experimentalFeature: true,
  promoBanner: false,
  betaFeature: false,
}))
```

### 3. Context-Aware Configuration

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags((context) => {
  return {
    // User role-based flag
    isAdmin: context?.user?.role === 'admin',
    
    // Environment-based flag
    devTools: process.env.NODE_ENV === 'development',
    
    // User status-based flag
    betaFeature: context?.user?.isBetaTester ?? false,
    
    // Device-based flag
    mobileFeature: context?.device?.isMobile ?? false,
  }
})
```

## ✅ Validation & Build Checks

The module includes built-in validation to catch configuration errors and undeclared flag usage.

### Configuration Validation

The module automatically validates:
- Flag naming conventions (alphanumeric, hyphens, underscores)
- Variant weight distribution (0-100, total ≤ 100)
- Duplicate variant names
- Required configuration properties

### Build-time Flag Usage Validation

```ts
// build/validate-flags.ts
import { validateFeatureFlags } from 'nuxt-feature-flags/build'

// Validate during build
await validateFeatureFlags({
  configPath: './feature-flags.config.ts',
  srcPatterns: ['**/*.vue', '**/*.ts'],
  failOnErrors: true
})
```

This checks for:
- Undeclared flags used in code (via `isEnabled('flag')` or `v-feature="'flag'"`)
- Invalid flag configurations
- Unreferenced flags (declared but never used)

### Common Validation Errors

```ts
// ❌ Invalid variant weights (total > 100)
badFlag: {
  enabled: true,
  variants: [
    { name: 'a', weight: 60 },
    { name: 'b', weight: 50 } // Total: 110%
  ]
}

// ❌ Invalid flag name
'invalid-flag!': true // Contains invalid character

// ❌ Duplicate variant names
duplicateVariants: {
  enabled: true,
  variants: [
    { name: 'test', weight: 50 },
    { name: 'test', weight: 50 } // Duplicate name
  ]
}

// ✅ Valid configuration
goodFlag: {
  enabled: true,
  variants: [
    { name: 'control', weight: 60 },
    { name: 'treatment', weight: 40 } // Total: 100%
  ]
}
```

## 🤝 Contributing

1. Clone this repository
2. Install dependencies using `npm install`
3. Start development server using `npm run dev`
4. Make your changes
5. Submit a pull request

## ✨ Contributors 

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://x.com/rxb3rth"><img src="https://avatars.githubusercontent.com/u/63687573?v=4?s=100" width="100px;" alt="Eugen Istoc"/><br /><sub><b>Roberth González</b></sub></a><br /><a href="https://github.com/rxb3rth/nuxt-feature-flags/commits?author=rxb3rth" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.eugenistoc.com"><img src="https://avatars.githubusercontent.com/u/928780?v=4?s=100" width="100px;" alt="Eugen Istoc"/><br /><sub><b>Eugen Istoc</b></sub></a><br /><a href="https://github.com/rxb3rth/nuxt-feature-flags/commits?author=genu" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://roe.dev"><img src="https://avatars.githubusercontent.com/u/28706372?v=4?s=100" width="100px;" alt="Daniel Roe"/><br /><sub><b>Daniel Roe</b></sub></a><br /><a href="https://github.com/rxb3rth/nuxt-feature-flags/commits?author=danielroe" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## 📄 License

[MIT License](./LICENSE) © 2025 Roberth González

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-feature-flags/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-feature-flags

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-feature-flags.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-feature-flags

[license-src]: https://img.shields.io/npm/l/nuxt-feature-flags.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-feature-flags

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
