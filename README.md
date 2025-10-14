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

**Requirements**: Nuxt 3.1.0 or higher

**Verify Installation**:

After installation, confirm the module is properly configured in your `nuxt.config.ts`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags']
})
```

You can verify the module is loaded by checking your terminal output when running `npm run dev` - you should see `nuxt-feature-flags` listed among the registered modules.

## 🚀 Quick Setup

Choose the configuration method that best fits your needs:

### Method 1: Inline Configuration (Simplest)

Best for simple projects with a small number of static flags. Define flags directly in your `nuxt.config.ts`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    flags: {
      newDashboard: false,
      experimentalFeature: true,
      darkMode: true
    }
  }
})
```

**When to use**: Quick prototypes, simple feature toggles, or when you have fewer than 10 flags.

### Method 2: Configuration File (Recommended)

Best for most projects. Keep your flags organized in a dedicated configuration file:

```ts
// feature-flags.config.ts (or .js)
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags(() => ({
  newDashboard: true,
  experimentalFeature: process.env.NODE_ENV === 'development',
  betaFeature: false,
  
  // A/B test with variants
  buttonDesign: {
    enabled: true,
    value: 'default',
    variants: [
      { name: 'control', weight: 50, value: 'original' },
      { name: 'treatment', weight: 50, value: 'new-design' }
    ]
  }
}))

// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    config: './feature-flags.config.ts'  // Relative to project root
  }
})
```

**When to use**: Production applications, when you need environment-based flags, or when managing multiple flags.

**Configuration file location**: You can place your config file anywhere in your project. Common locations:
- `./feature-flags.config.ts` (project root)
- `./config/feature-flags.ts`
- `./flags.config.ts`

Just update the `config` path in `nuxt.config.ts` to match your chosen location.

### Method 3: Context-Aware Configuration (Advanced)

Best for dynamic flags that depend on user attributes, request context, or runtime conditions:

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
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    config: './feature-flags.config.ts'
  }
})
```

**When to use**: Personalized features, role-based access, A/B testing, or when flags need to evaluate differently per user/request.

**Context parameter**: The `context` object contains request-specific information like user data, session info, device details, and IP address. See the Context-Aware Configuration section for full details.

### TypeScript Support

The module automatically generates TypeScript types from your flag configuration, providing autocomplete and type safety:

```ts
// Types are auto-generated when you run `npm run dev` or `nuxi prepare`
const { isEnabled } = useFeatureFlags()

isEnabled('newDashboard')     // ✅ Type-safe - flag exists
isEnabled('unknownFlag')      // ❌ TypeScript error - flag not declared
```

No additional setup required! Types are regenerated whenever your flag configuration changes.

---

## 🎯 Core Concepts

Understanding these core concepts will help you make the most of nuxt-feature-flags.

### Flag Types

The module supports two types of flag definitions, each suited for different use cases:

#### Simple Flags

Simple flags are the most straightforward way to enable or disable features. They can be boolean values or any primitive type (string, number, null):

```ts
// feature-flags.config.ts
export default defineFeatureFlags(() => ({
  // Boolean flags - most common
  newDashboard: true,
  experimentalFeature: false,
  
  // Value flags - useful for configuration
  maxItems: 10,
  theme: 'dark',
  apiVersion: 'v2',
  
  // Null flag - feature disabled with no value
  deprecatedFeature: null
}))
```

**When to use simple flags:**
- Binary feature toggles (on/off)
- Configuration values that don't change per user
- Environment-based features
- Quick prototyping

**Usage:**
```ts
const { isEnabled, getValue } = useFeatureFlags()

// Check boolean flags
if (isEnabled('newDashboard')) {
  // Show new dashboard
}

// Get value flags
const maxItems = getValue('maxItems') // 10
const theme = getValue('theme') // 'dark'
```

#### Flag Config Objects

Flag config objects provide advanced functionality like A/B testing, gradual rollouts, and variant-based features. They consist of an `enabled` state and optional `variants`:

```ts
// feature-flags.config.ts
export default defineFeatureFlags(() => ({
  // A/B test with two variants
  buttonDesign: {
    enabled: true,
    value: 'default', // Default value when no variant matches
    variants: [
      { name: 'control', weight: 50, value: 'original' },
      { name: 'treatment', weight: 50, value: 'new-design' }
    ]
  },
  
  // Gradual rollout (20% of users get the new feature)
  newCheckout: {
    enabled: true,
    variants: [
      { name: 'old', weight: 80, value: false },
      { name: 'new', weight: 20, value: true }
    ]
  },
  
  // A/B/C/D test with multiple variants
  homepage: {
    enabled: true,
    variants: [
      { name: 'original', weight: 40, value: 'v1' },
      { name: 'redesign', weight: 30, value: 'v2' },
      { name: 'minimal', weight: 20, value: 'v3' },
      { name: 'experimental', weight: 10, value: 'v4' }
    ]
  },
  
  // Feature flag that can be disabled entirely
  betaFeature: {
    enabled: false, // No users will see this, regardless of variants
    variants: [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 }
    ]
  }
}))
```

**When to use flag config objects:**
- A/B or multivariate testing
- Gradual feature rollouts
- Canary releases
- Features that need different values for different user segments

**Usage:**
```ts
const { isEnabled, getVariant, getValue } = useFeatureFlags()

// Check if flag is enabled
if (isEnabled('buttonDesign')) {
  // Get which variant the user is assigned to
  const variant = getVariant('buttonDesign') // 'control' | 'treatment'
  
  // Get the value for the user's variant
  const design = getValue('buttonDesign') // 'original' | 'new-design'
}

// Check specific variant
if (isEnabled('buttonDesign:treatment')) {
  // User is in the treatment group
}
```

#### Key Differences

| Feature | Simple Flags | Flag Config Objects |
|---------|-------------|---------------------|
| **Syntax** | `flagName: value` | `flagName: { enabled, variants }` |
| **Use Case** | Static toggles | A/B tests, rollouts |
| **User Assignment** | Same for all users | Varies by user |
| **Variants** | No | Yes |
| **Complexity** | Low | Medium |
| **Example** | `darkMode: true` | `{ enabled: true, variants: [...] }` |

### Flag Resolution

Understanding how flags are evaluated at runtime helps you predict behavior and debug issues effectively.

#### Evaluation Process

When you call `isEnabled()`, `getVariant()`, or `getValue()`, the module follows this process:

1. **Load Configuration**: Reads your flag configuration (from inline config or config file)
2. **Execute Context Function**: If using context-aware config, calls your function with the current request context
3. **Resolve Flag Value**: Determines the flag's enabled state and value
4. **Assign Variant** (if applicable): For flags with variants, determines which variant the user receives
5. **Cache Result**: Stores the resolved flag for the duration of the request
6. **Return Value**: Returns the appropriate value to your code

```ts
// Example: How a flag is resolved
export default defineFeatureFlags((context) => {
  // 1. Context is provided (user info, device, etc.)
  // 2. Function executes to determine flag values
  return {
    // 3. Simple flag - directly resolved
    darkMode: true,
    
    // 4. Context-aware flag - evaluated based on context
    adminPanel: context?.user?.role === 'admin',
    
    // 5. Variant flag - user assigned to a variant
    newFeature: {
      enabled: true,
      variants: [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 }
      ]
    }
  }
})
```

#### Context Identifier Priority

For flags with variants, the module needs a stable identifier to ensure users consistently receive the same variant. The identifier is selected using this priority order:

1. **User ID** (`context.user.id` or `context.userId`) - Highest priority
2. **Session ID** (from cookies: `session-id` or `nuxt-session`)
3. **IP Address** (from request headers)
4. **Fallback**: `'anonymous'` (if none of the above are available)

```ts
// Example: How identifiers are used
const identifier = 
  context?.user?.id ||           // 1. Try user ID first
  context?.userId ||             // 2. Try alternate user ID
  getSessionId(event) ||         // 3. Try session ID from cookies
  getClientIpAddress(event) ||   // 4. Try IP address
  'anonymous'                    // 5. Fallback

// This identifier is then used to consistently assign variants
const variant = assignVariant(flagName, identifier, variants)
```

**Why priority matters:**

- **User ID**: Most stable - survives across devices and sessions
- **Session ID**: Stable within a session - changes when session expires
- **IP Address**: Less stable - can change with network switches
- **Anonymous**: Least stable - all anonymous users treated the same

**Best practice**: Populate `context.user.id` in your middleware for the most consistent variant assignment:

```ts
// server/middleware/user-context.ts
export default defineEventHandler((event) => {
  // Get user from your auth system
  const user = await getUserFromSession(event)
  
  if (user) {
    event.context.user = {
      id: user.id,  // This will be used for variant assignment
      role: user.role,
      // ... other user properties
    }
  }
})
```

#### Caching Behavior

To optimize performance, resolved flags are cached **per request**:

**Server-Side:**
- Flags are resolved once per HTTP request
- Cached for the duration of that request
- Different requests get fresh evaluations
- Context can differ between requests

```ts
// server/api/example.ts
export default defineEventHandler((event) => {
  const flags1 = getFeatureFlags(event)
  const flags2 = getFeatureFlags(event)
  
  // flags1 and flags2 reference the same cached instance
  // No re-evaluation happens within the same request
})
```

**Client-Side:**
- Flags are resolved once when the page loads
- Cached in a reactive ref for the component lifecycle
- Automatically updated when you call `fetch()` method
- Shared across all components on the page

```ts
// In any component
const { flags, fetch } = useFeatureFlags()

// First call - flags are resolved and cached
console.log(flags.value)

// Subsequent calls use cached values
const { flags: flags2 } = useFeatureFlags()
console.log(flags2.value) // Same cached instance

// Manually refresh flags if needed
await fetch() // Re-evaluates all flags
```

**Performance implications:**

- ✅ Multiple flag checks in the same request are fast (cached)
- ✅ No need to worry about calling `useFeatureFlags()` multiple times
- ⚠️ Flags won't update mid-request (by design)
- ⚠️ Client-side flags won't auto-update (call `fetch()` if needed)

### Type Generation

One of the most powerful features of nuxt-feature-flags is automatic TypeScript type generation. This provides autocomplete, type safety, and catches errors at compile time.

#### How It Works

When you define your feature flags, the module automatically generates TypeScript types that match your configuration:

```ts
// feature-flags.config.ts
export default defineFeatureFlags(() => ({
  newDashboard: true,
  maxItems: 10,
  theme: 'dark',
  buttonDesign: {
    enabled: true,
    variants: [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 }
    ]
  }
}))
```

This configuration automatically generates:

```ts
// Auto-generated in .nuxt/types/feature-flags.d.ts
interface FlagsSchema {
  newDashboard: boolean
  maxItems: number
  theme: string
  buttonDesign: {
    enabled: boolean
    value?: any
    variants?: Array<{ name: string; weight: number; value?: any }>
  }
}
```

#### Type-Safe Flag Usage

With generated types, you get full autocomplete and type checking:

```ts
const { isEnabled, getValue, getVariant } = useFeatureFlags()

// ✅ Autocomplete suggests: 'newDashboard', 'maxItems', 'theme', 'buttonDesign'
isEnabled('newDashboard')

// ✅ Type-safe - flag exists in config
getValue('theme') // Type: string

// ✅ Type-safe - flag exists in config
getValue('maxItems') // Type: number

// ❌ TypeScript error - flag not declared in config
isEnabled('unknownFlag')
// Error: Argument of type '"unknownFlag"' is not assignable to parameter of type 'keyof FlagsSchema'

// ❌ TypeScript error - typo in flag name
getValue('themee')
// Error: Argument of type '"themee"' is not assignable to parameter of type 'keyof FlagsSchema'
```

#### Type Errors for Undeclared Flags

The type system catches common mistakes before runtime:

```vue
<script setup lang="ts">
const { isEnabled, getValue } = useFeatureFlags()

// ❌ Error: Property 'nonExistentFlag' does not exist
if (isEnabled('nonExistentFlag')) {
  // This will show a TypeScript error in your IDE
}

// ❌ Error: Typo in flag name
const theme = getValue('darMode') // Did you mean 'darkMode'?

// ✅ Correct usage
const theme = getValue('theme')
</script>
```

#### Regenerating Types

Types are automatically regenerated when:

- You run `npm run dev` or `yarn dev`
- You run `nuxi prepare`
- Your flag configuration file changes (in dev mode)

**Manual regeneration:**

```bash
# Regenerate types manually
npx nuxi prepare

# Or restart your dev server
npm run dev
```

#### Type Safety in Templates

Types also work with the `v-feature` directive:

```vue
<template>
  <!-- ✅ Valid - flag exists -->
  <div v-feature="'newDashboard'">
    New Dashboard
  </div>
  
  <!-- ✅ Valid - flag and variant exist -->
  <div v-feature="'buttonDesign:treatment'">
    Treatment Button
  </div>
  
  <!-- ⚠️ No compile-time error, but runtime warning if flag doesn't exist -->
  <div v-feature="'unknownFlag'">
    This will show a warning in the console
  </div>
</template>
```

**Note**: Template directives don't get compile-time type checking, but the module will log warnings in development mode when you use undeclared flags.

#### Benefits of Type Generation

1. **Autocomplete**: Your IDE suggests available flag names as you type
2. **Refactoring**: Renaming a flag updates all usages (with IDE support)
3. **Error Prevention**: Catch typos and missing flags before runtime
4. **Documentation**: Types serve as inline documentation of available flags
5. **Confidence**: Make changes knowing TypeScript will catch issues

#### Working Without TypeScript

If you're using JavaScript instead of TypeScript, the module still works perfectly - you just won't get the compile-time type checking. All runtime functionality remains the same:

```js
// Works in JavaScript too, just without type checking
const { isEnabled, getValue } = useFeatureFlags()

if (isEnabled('newDashboard')) {
  // Works fine, but no autocomplete or type errors
}
```

### Usage Examples

Once configured, use flags in your Vue components:

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

## 📖 API Reference

### Client-Side API

The `useFeatureFlags()` composable is your primary interface for working with feature flags in Vue components. It provides a reactive, type-safe way to check flags, get variants, and access flag values.

#### `useFeatureFlags()`

Returns an object with the following properties and methods:

##### `flags`

- **Type**: `Ref<ResolvedFlags>`
- **Description**: A reactive reference containing all resolved feature flags for the current user/request. Each flag includes its enabled state, value, and assigned variant (if applicable).
- **Usage**: Access the raw flags object when you need to inspect all flags at once or pass flags to other functions.

**Example:**

```ts
const { flags } = useFeatureFlags()

// Access all flags
console.log(flags.value)
// {
//   newDashboard: { enabled: true, value: true },
//   buttonDesign: { enabled: true, value: 'new-design', variant: 'treatment' },
//   maxItems: { enabled: true, value: 10 }
// }

// Watch for flag changes
watch(flags, (newFlags) => {
  console.log('Flags updated:', newFlags)
})

// Use in computed properties
const hasNewFeatures = computed(() => {
  return flags.value.newDashboard?.enabled && flags.value.betaFeature?.enabled
})
```

##### `isEnabled(flagName, variant?)`

- **Type**: `(flagName: keyof FlagsSchema | string, variant?: string) => boolean`
- **Parameters**:
  - `flagName` (required): The name of the flag to check. Can include variant suffix using colon notation (e.g., `'myFlag:variantA'`)
  - `variant` (optional): Specific variant name to check. Alternative to colon notation.
- **Returns**: `boolean` - `true` if the flag is enabled (and matches the variant if specified), `false` otherwise
- **Description**: Checks whether a feature flag is enabled. For flags with variants, you can check if the user is assigned to a specific variant.

**Examples:**

```ts
const { isEnabled } = useFeatureFlags()

// Simple flag check
if (isEnabled('newDashboard')) {
  // Show new dashboard UI
}

// Check specific variant using colon notation
if (isEnabled('buttonDesign:treatment')) {
  // User is in the treatment group
}

// Check specific variant using parameter
if (isEnabled('buttonDesign', 'treatment')) {
  // Same as above - user is in treatment group
}

// Use in computed properties
const showNewFeature = computed(() => isEnabled('newFeature'))

// Use in template conditions
const canAccessBeta = isEnabled('betaAccess')
```

**Common Patterns:**

```ts
// Conditional rendering
if (isEnabled('darkMode')) {
  applyDarkTheme()
} else {
  applyLightTheme()
}

// Feature gating
if (!isEnabled('premiumFeature')) {
  throw new Error('Premium feature not available')
}

// A/B test branching
if (isEnabled('checkout:newFlow')) {
  return <NewCheckoutFlow />
} else {
  return <OldCheckoutFlow />
}
```

##### `getVariant(flagName)`

- **Type**: `(flagName: keyof FlagsSchema | string) => string | undefined`
- **Parameters**:
  - `flagName` (required): The name of the flag to get the variant for
- **Returns**: `string | undefined` - The name of the assigned variant, or `undefined` if the flag has no variants or is not enabled
- **Description**: Returns which variant the user is assigned to for a given flag. Useful when you need to know the specific variant name rather than just checking if a variant is active.

**Examples:**

```ts
const { getVariant } = useFeatureFlags()

// Get assigned variant
const variant = getVariant('buttonDesign')
console.log(variant) // 'control' | 'treatment' | undefined

// Use in switch statements
const variant = getVariant('homepage')
switch (variant) {
  case 'original':
    return <OriginalHomepage />
  case 'redesign':
    return <RedesignHomepage />
  case 'minimal':
    return <MinimalHomepage />
  default:
    return <DefaultHomepage />
}

// Use in computed properties
const currentExperiment = computed(() => {
  return getVariant('experimentalFeature') || 'control'
})

// Conditional logic based on variant
const buttonColor = getVariant('buttonColor')
if (buttonColor === 'red') {
  trackEvent('red_button_shown')
} else if (buttonColor === 'blue') {
  trackEvent('blue_button_shown')
}
```

**Common Patterns:**

```ts
// Dynamic component selection
const componentVariant = getVariant('landingPage')
const Component = componentMap[componentVariant] || DefaultComponent

// Analytics tracking
const variant = getVariant('pricingExperiment')
if (variant) {
  analytics.track('experiment_viewed', { variant })
}

// Variant-specific configuration
const variant = getVariant('checkoutFlow')
const config = variantConfigs[variant] || defaultConfig
```

##### `getValue(flagName)`

- **Type**: `(flagName: keyof FlagsSchema | string) => any`
- **Parameters**:
  - `flagName` (required): The name of the flag to get the value for
- **Returns**: `any` - The resolved value for the flag. For simple flags, returns the flag value directly. For flags with variants, returns the value of the assigned variant.
- **Description**: Retrieves the actual value of a feature flag. This is the most direct way to get configuration values, variant values, or boolean states.

**Examples:**

```ts
const { getValue } = useFeatureFlags()

// Get simple flag values
const isDarkMode = getValue('darkMode') // true | false
const maxItems = getValue('maxItems') // 10
const theme = getValue('theme') // 'dark' | 'light'

// Get variant values
const buttonStyle = getValue('buttonDesign') // 'original' | 'new-design'
const checkoutVersion = getValue('checkoutFlow') // 'v1' | 'v2' | 'v3'

// Use in configuration
const config = {
  itemsPerPage: getValue('itemsPerPage') || 20,
  enableAnimations: getValue('animations') ?? true,
  apiVersion: getValue('apiVersion') || 'v1'
}

// Use in computed properties
const displayLimit = computed(() => {
  return getValue('maxDisplayItems') || 50
})

// Type-specific usage
const featureEnabled: boolean = getValue('newFeature')
const maxCount: number = getValue('maxCount')
const themeName: string = getValue('themeName')
```

**Common Patterns:**

```ts
// Configuration with fallbacks
const timeout = getValue('requestTimeout') || 5000
const retries = getValue('maxRetries') ?? 3

// Dynamic styling
const buttonClass = computed(() => {
  const variant = getValue('buttonStyle')
  return `btn-${variant}`
})

// Feature configuration
const features = {
  search: getValue('enableSearch'),
  filters: getValue('enableFilters'),
  sorting: getValue('enableSorting')
}

// Conditional feature loading
if (getValue('enableAdvancedFeatures')) {
  await loadAdvancedModule()
}
```

##### `getFlag(flagName)`

- **Type**: `(flagName: keyof FlagsSchema | string) => ResolvedFlag | undefined`
- **Parameters**:
  - `flagName` (required): The name of the flag to retrieve
- **Returns**: `ResolvedFlag | undefined` - An object containing the complete flag information including `enabled`, `value`, and `variant` properties, or `undefined` if the flag doesn't exist
- **Description**: Returns the complete flag object with all its properties. Useful when you need access to multiple properties of a flag at once or want to inspect the full flag state.

**ResolvedFlag Interface:**

```ts
interface ResolvedFlag {
  enabled: boolean      // Whether the flag is enabled
  value?: any          // The resolved value
  variant?: string     // The assigned variant name (if applicable)
}
```

**Examples:**

```ts
const { getFlag } = useFeatureFlags()

// Get complete flag information
const flag = getFlag('buttonDesign')
console.log(flag)
// {
//   enabled: true,
//   value: 'new-design',
//   variant: 'treatment'
// }

// Destructure flag properties
const { enabled, value, variant } = getFlag('experimentalFeature') || {}
if (enabled && variant === 'treatment') {
  console.log(`Feature enabled with value: ${value}`)
}

// Check multiple properties
const dashboardFlag = getFlag('newDashboard')
if (dashboardFlag?.enabled && dashboardFlag?.value === true) {
  loadNewDashboard()
}

// Use in debugging
const debugInfo = computed(() => {
  const flags = ['feature1', 'feature2', 'feature3']
  return flags.map(name => ({
    name,
    ...getFlag(name)
  }))
})
```

**Common Patterns:**

```ts
// Comprehensive flag inspection
const flag = getFlag('myFeature')
if (flag) {
  console.log(`Flag: ${flag.enabled ? 'enabled' : 'disabled'}`)
  console.log(`Value: ${flag.value}`)
  console.log(`Variant: ${flag.variant || 'none'}`)
}

// Conditional logic with multiple properties
const checkoutFlag = getFlag('checkoutFlow')
if (checkoutFlag?.enabled && checkoutFlag?.variant === 'optimized') {
  useOptimizedCheckout(checkoutFlag.value)
}

// Passing complete flag data
function trackFeatureUsage(flagName: string) {
  const flag = getFlag(flagName)
  if (flag?.enabled) {
    analytics.track('feature_used', {
      flag: flagName,
      variant: flag.variant,
      value: flag.value
    })
  }
}
```

##### `fetch()`

- **Type**: `() => Promise<void>`
- **Parameters**: None
- **Returns**: `Promise<void>` - A promise that resolves when flags have been refreshed
- **Description**: Manually refreshes all feature flags by re-fetching them from the server. This is useful when you need to update flags based on user actions or context changes without reloading the page.

**Examples:**

```ts
const { fetch, flags } = useFeatureFlags()

// Refresh flags after user login
async function handleLogin(user) {
  await loginUser(user)
  
  // Refresh flags to get user-specific flags
  await fetch()
  
  // Flags are now updated with user context
  console.log('Updated flags:', flags.value)
}

// Refresh flags on user action
async function upgradeAccount() {
  await api.upgradeUserAccount()
  
  // Fetch new flags that may be available after upgrade
  await fetch()
  
  if (isEnabled('premiumFeature')) {
    showPremiumFeatures()
  }
}

// Periodic flag refresh
onMounted(() => {
  // Refresh flags every 5 minutes
  const interval = setInterval(async () => {
    await fetch()
  }, 5 * 60 * 1000)
  
  onUnmounted(() => clearInterval(interval))
})

// Refresh on visibility change
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    await fetch()
  }
})
```

**Common Patterns:**

```ts
// Refresh with loading state
const isRefreshing = ref(false)

async function refreshFlags() {
  isRefreshing.value = true
  try {
    await fetch()
    console.log('Flags refreshed successfully')
  } catch (error) {
    console.error('Failed to refresh flags:', error)
  } finally {
    isRefreshing.value = false
  }
}

// Refresh on context change
watch(() => user.value?.role, async (newRole) => {
  if (newRole) {
    await fetch() // Get role-specific flags
  }
})

// Manual refresh button
async function handleRefreshClick() {
  await fetch()
  showNotification('Feature flags updated')
}
```

**When to use `fetch()`:**

- After user authentication/login
- When user role or permissions change
- After account upgrades or downgrades
- When you need to sync flags with server state
- For periodic flag updates in long-running sessions

**Note**: Flags are automatically fetched when the page loads. You only need to call `fetch()` when you want to refresh flags during the session.

### Server-Side API

The `getFeatureFlags()` function provides feature flag access in server routes, API handlers, and middleware. It evaluates flags based on the request context and provides the same convenient methods as the client-side API.

#### `getFeatureFlags(event)`

Evaluates and returns feature flags for a server-side request.

- **Type**: `(event: H3Event) => FeatureFlagsAPI`
- **Parameters**:
  - `event` (required): The H3Event object from your server handler. This provides request context for flag evaluation.
- **Returns**: `FeatureFlagsAPI` - An object containing the flags and methods to interact with them
- **Description**: Resolves all feature flags for the current request, taking into account the request context (user info, session, IP address, etc.). Flags are cached for the duration of the request.

**Returned Object Properties:**

##### `flags`

- **Type**: `ResolvedFlags`
- **Description**: An object containing all resolved feature flags for the current request. Each flag includes its enabled state, value, and assigned variant (if applicable).

**Example:**

```ts
export default defineEventHandler((event) => {
  const { flags } = getFeatureFlags(event)
  
  console.log(flags)
  // {
  //   newDashboard: { enabled: true, value: true },
  //   buttonDesign: { enabled: true, value: 'new-design', variant: 'treatment' },
  //   apiVersion: { enabled: true, value: 'v2' }
  // }
  
  return { flags }
})
```

##### `isEnabled(flagName, variant?)`

- **Type**: `(flagName: string, variant?: string) => boolean`
- **Parameters**:
  - `flagName` (required): The name of the flag to check
  - `variant` (optional): Specific variant name to check
- **Returns**: `boolean` - `true` if the flag is enabled (and matches the variant if specified), `false` otherwise
- **Description**: Checks whether a feature flag is enabled for the current request. Identical to the client-side method.

**Examples:**

```ts
export default defineEventHandler((event) => {
  const { isEnabled } = getFeatureFlags(event)
  
  // Simple flag check
  if (!isEnabled('apiV2')) {
    throw createError({
      statusCode: 404,
      message: 'API v2 not available'
    })
  }
  
  // Check specific variant
  if (isEnabled('rateLimit:strict')) {
    return applyStrictRateLimit(event)
  }
  
  // Conditional API response
  const includeMetadata = isEnabled('includeMetadata')
  return {
    data: fetchData(),
    ...(includeMetadata && { metadata: getMetadata() })
  }
})
```

##### `getVariant(flagName)`

- **Type**: `(flagName: string) => string | undefined`
- **Parameters**:
  - `flagName` (required): The name of the flag to get the variant for
- **Returns**: `string | undefined` - The name of the assigned variant, or `undefined` if no variant is assigned
- **Description**: Returns which variant the user is assigned to for a given flag. Useful for server-side A/B test logic.

**Examples:**

```ts
export default defineEventHandler((event) => {
  const { getVariant } = getFeatureFlags(event)
  
  // Get assigned variant
  const algorithm = getVariant('searchAlgorithm')
  
  // Use variant in server logic
  switch (algorithm) {
    case 'neural':
      return await neuralSearch(query)
    case 'fuzzy':
      return await fuzzySearch(query)
    default:
      return await standardSearch(query)
  }
})
```

##### `getValue(flagName)`

- **Type**: `(flagName: string) => any`
- **Parameters**:
  - `flagName` (required): The name of the flag to get the value for
- **Returns**: `any` - The resolved value for the flag
- **Description**: Retrieves the actual value of a feature flag. For flags with variants, returns the value of the assigned variant.

**Examples:**

```ts
export default defineEventHandler((event) => {
  const { getValue } = getFeatureFlags(event)
  
  // Get configuration values
  const maxResults = getValue('maxSearchResults') || 10
  const timeout = getValue('apiTimeout') || 5000
  const cacheEnabled = getValue('enableCache') ?? true
  
  // Use in API logic
  const results = await search(query, { 
    limit: maxResults,
    timeout 
  })
  
  if (cacheEnabled) {
    await cacheResults(results)
  }
  
  return results
})
```

#### Complete Server Route Example

Here's a comprehensive example showing how to use `getFeatureFlags()` in a real server route:

```ts
// server/api/dashboard.ts
export default defineEventHandler(async (event) => {
  const { isEnabled, getVariant, getValue, flags } = getFeatureFlags(event)
  
  // Feature gating - block access if feature is disabled
  if (!isEnabled('newDashboard')) {
    throw createError({
      statusCode: 404,
      message: 'Dashboard not available'
    })
  }
  
  // Get user-specific data
  const userId = event.context.user?.id
  const stats = await fetchUserStats(userId)
  
  // Conditional data based on flags
  const includeAnalytics = isEnabled('dashboardAnalytics')
  const analytics = includeAnalytics 
    ? await fetchAnalytics(userId) 
    : null
  
  // Variant-based logic
  const layoutVariant = getVariant('dashboardLayout')
  const layout = layoutVariant === 'compact' 
    ? 'compact-layout' 
    : 'standard-layout'
  
  // Configuration from flags
  const refreshInterval = getValue('dashboardRefreshInterval') || 30000
  const maxWidgets = getValue('maxDashboardWidgets') || 6
  
  // Return response with flag-based data
  return {
    stats,
    analytics,
    layout,
    config: {
      refreshInterval,
      maxWidgets
    },
    // Include flag states for client-side reference
    features: {
      analytics: includeAnalytics,
      variant: layoutVariant
    }
  }
})
```

**More Server-Side Examples:**

```ts
// server/api/search.ts - A/B test different search algorithms
export default defineEventHandler(async (event) => {
  const { getVariant, getValue } = getFeatureFlags(event)
  
  const query = getQuery(event).q as string
  const algorithm = getVariant('searchAlgorithm')
  
  // Track which algorithm is used
  console.log(`Using search algorithm: ${algorithm}`)
  
  // Use different search based on variant
  const results = algorithm === 'ml' 
    ? await mlSearch(query)
    : await standardSearch(query)
  
  const maxResults = getValue('maxSearchResults') || 20
  
  return {
    results: results.slice(0, maxResults),
    algorithm,
    total: results.length
  }
})

// server/api/pricing.ts - Dynamic pricing based on flags
export default defineEventHandler((event) => {
  const { isEnabled, getValue } = getFeatureFlags(event)
  
  const basePricing = {
    basic: 9.99,
    pro: 29.99,
    enterprise: 99.99
  }
  
  // Apply promotional pricing if flag is enabled
  if (isEnabled('summerPromo')) {
    const discount = getValue('promoDiscount') || 0.2
    return Object.entries(basePricing).reduce((acc, [tier, price]) => {
      acc[tier] = price * (1 - discount)
      return acc
    }, {} as Record<string, number>)
  }
  
  return basePricing
})

// server/middleware/feature-gate.ts - Middleware for feature gating
export default defineEventHandler((event) => {
  const { isEnabled } = getFeatureFlags(event)
  
  // Block access to beta routes if user doesn't have beta access
  if (event.path.startsWith('/api/beta') && !isEnabled('betaAccess')) {
    throw createError({
      statusCode: 403,
      message: 'Beta access required'
    })
  }
})

// server/api/config.ts - Expose feature flags to client
export default defineEventHandler((event) => {
  const { flags } = getFeatureFlags(event)
  
  // Return sanitized flags for client-side use
  return {
    features: Object.entries(flags).reduce((acc, [key, flag]) => {
      acc[key] = {
        enabled: flag.enabled,
        variant: flag.variant
        // Don't expose internal values if sensitive
      }
      return acc
    }, {} as Record<string, any>)
  }
})
```

**Key Differences from Client-Side:**

1. **Event Parameter**: Server-side requires the H3Event parameter to access request context
2. **No Reactivity**: Server-side flags are plain objects, not reactive refs
3. **No `fetch()` Method**: Flags are evaluated per request; no manual refresh needed
4. **Request Context**: Automatically extracts user info, session, and IP from the event
5. **Synchronous**: All methods return values synchronously (no promises)

**Best Practices:**

- Always pass the `event` parameter to `getFeatureFlags()`
- Use flags for conditional API logic and feature gating
- Cache expensive operations behind feature flags
- Return flag states in API responses when clients need them
- Use middleware to populate `event.context.user` for better variant assignment

### Template Directives

The `v-feature` directive provides a declarative way to conditionally render elements based on feature flags directly in your Vue templates.

#### `v-feature`

A custom Vue directive that shows or hides elements based on feature flag state.

- **Type**: `v-feature="flagName"` or `v-feature="flagName:variant"`
- **Value**: String containing the flag name, optionally with a variant suffix using colon notation
- **Behavior**: The element is rendered only if the flag is enabled (and matches the variant if specified)
- **Description**: Provides a clean, declarative syntax for feature-flagged content in templates. The directive is evaluated once when the component mounts and updates reactively if flags change.

**Important**: The `v-feature` directive is **client-side only**. It will not work in server-rendered content or during SSR. For server-side conditional rendering, use `v-if` with `isEnabled()` in your script setup.

#### Simple Flag Checking

Use the directive with just a flag name to show content when the flag is enabled:

```vue
<template>
  <!-- Show element if flag is enabled -->
  <div v-feature="'newDashboard'">
    <h1>Welcome to the New Dashboard!</h1>
    <p>You're seeing our latest design.</p>
  </div>
  
  <!-- Multiple elements with the same flag -->
  <nav v-feature="'newNavigation'">
    <a href="/home">Home</a>
    <a href="/profile">Profile</a>
  </nav>
  
  <footer v-feature="'newNavigation'">
    <p>New navigation enabled</p>
  </footer>
  
  <!-- Works with any HTML element -->
  <button v-feature="'betaFeature'" @click="handleClick">
    Try Beta Feature
  </button>
  
  <span v-feature="'showBadge'" class="badge">New!</span>
</template>
```

#### Variant-Specific Rendering

Use colon notation to show content only for specific variants:

```vue
<template>
  <!-- A/B test: Show different buttons based on variant -->
  <button 
    v-feature="'buttonDesign:control'"
    class="bg-blue-500 text-white px-4 py-2 rounded"
  >
    Original Button (Control)
  </button>
  
  <button 
    v-feature="'buttonDesign:treatment'"
    class="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg shadow-lg"
  >
    New Fancy Button (Treatment)
  </button>
  
  <!-- A/B/C test: Different homepage layouts -->
  <div v-feature="'homepage:original'" class="layout-v1">
    <h1>Original Homepage</h1>
    <!-- Original layout content -->
  </div>
  
  <div v-feature="'homepage:redesign'" class="layout-v2">
    <h1>Redesigned Homepage</h1>
    <!-- Redesigned layout content -->
  </div>
  
  <div v-feature="'homepage:minimal'" class="layout-v3">
    <h1>Minimal Homepage</h1>
    <!-- Minimal layout content -->
  </div>
</template>
```

#### Multiple Examples in Template Usage

Here are comprehensive examples showing various use cases:

```vue
<template>
  <div class="app">
    <!-- Feature gating: Premium features -->
    <section v-feature="'premiumFeatures'" class="premium-section">
      <h2>Premium Content</h2>
      <PremiumDashboard />
    </section>
    
    <!-- Gradual rollout: New checkout flow -->
    <div v-feature="'newCheckout:enabled'">
      <NewCheckoutFlow />
    </div>
    <div v-feature="'newCheckout:disabled'">
      <OldCheckoutFlow />
    </div>
    
    <!-- Promotional banner -->
    <div v-feature="'summerPromo'" class="promo-banner">
      <p>🎉 Summer Sale: 50% off all plans!</p>
    </div>
    
    <!-- Beta features badge -->
    <span v-feature="'betaTester'" class="badge badge-beta">
      Beta Tester
    </span>
    
    <!-- Conditional navigation items -->
    <nav>
      <a href="/">Home</a>
      <a href="/products">Products</a>
      <a v-feature="'adminPanel'" href="/admin">Admin</a>
      <a v-feature="'analytics'" href="/analytics">Analytics</a>
    </nav>
    
    <!-- A/B test: Different CTAs -->
    <div class="cta-section">
      <button v-feature="'ctaTest:short'" class="cta-button">
        Buy Now
      </button>
      <button v-feature="'ctaTest:long'" class="cta-button">
        Get Started with Your Free Trial Today
      </button>
      <button v-feature="'ctaTest:urgent'" class="cta-button urgent">
        Limited Time Offer - Buy Now!
      </button>
    </div>
    
    <!-- Conditional help text -->
    <div v-feature="'showHelpText'" class="help-section">
      <p>Need help? Check out our <a href="/docs">documentation</a>.</p>
    </div>
    
    <!-- Feature announcement -->
    <div v-feature="'newFeatureAnnouncement'" class="announcement">
      <h3>🎊 New Feature Available!</h3>
      <p>Try our new collaboration tools.</p>
      <button @click="dismissAnnouncement">Got it</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const dismissAnnouncement = () => {
  // Handle dismissal
}
</script>
```

#### Combining with Other Directives

The `v-feature` directive works seamlessly with other Vue directives:

```vue
<template>
  <!-- Combine with v-if for additional conditions -->
  <div v-feature="'premiumFeatures'" v-if="user.isPremium">
    Premium content for premium users
  </div>
  
  <!-- Combine with v-for -->
  <div v-feature="'showRecommendations'">
    <div v-for="item in recommendations" :key="item.id">
      {{ item.name }}
    </div>
  </div>
  
  <!-- Combine with v-show (though v-feature already handles visibility) -->
  <div v-feature="'darkMode'" v-show="isVisible">
    Dark mode content
  </div>
  
  <!-- Combine with event handlers -->
  <button 
    v-feature="'betaFeature'" 
    @click="handleBetaClick"
    :disabled="isLoading"
  >
    Try Beta
  </button>
  
  <!-- Combine with dynamic classes -->
  <div 
    v-feature="'newTheme'" 
    :class="{ active: isActive, 'theme-dark': isDark }"
  >
    Themed content
  </div>
</template>
```

#### Client-Side Only Limitation

**Important**: The `v-feature` directive only works on the client side. It will not conditionally render content during server-side rendering (SSR).

**Why this matters:**

- Content inside `v-feature` will not be included in the initial HTML sent from the server
- The directive evaluates after the page hydrates on the client
- This can cause layout shifts or flashes of content

**For server-side conditional rendering**, use `v-if` with the composable instead:

```vue
<script setup lang="ts">
const { isEnabled } = useFeatureFlags()
</script>

<template>
  <!-- ❌ Won't work during SSR -->
  <div v-feature="'newDashboard'">
    Server-rendered content
  </div>
  
  <!-- ✅ Works during SSR -->
  <div v-if="isEnabled('newDashboard')">
    Server-rendered content
  </div>
</template>
```

**When to use `v-feature` vs `v-if`:**

| Use Case | Recommended Approach | Reason |
|----------|---------------------|---------|
| Client-only components | `v-feature` | Cleaner syntax, no script needed |
| Server-rendered content | `v-if` with `isEnabled()` | Works during SSR |
| Complex conditions | `v-if` with composable | More flexibility |
| Simple flag checks | `v-feature` | Most concise |
| Multiple flag checks | `v-if` with composable | Better readability |

**Example - Choosing the right approach:**

```vue
<script setup lang="ts">
const { isEnabled, getVariant } = useFeatureFlags()

// Complex condition - use computed with v-if
const showAdvancedFeatures = computed(() => {
  return isEnabled('advancedMode') && user.value.role === 'admin'
})
</script>

<template>
  <!-- Simple flag - use v-feature (client-only is fine) -->
  <div v-feature="'promoBanner'" class="promo">
    Special offer!
  </div>
  
  <!-- Server-rendered content - use v-if -->
  <article v-if="isEnabled('newArticleLayout')">
    <h1>{{ article.title }}</h1>
    <p>{{ article.content }}</p>
  </article>
  
  <!-- Complex condition - use v-if with computed -->
  <div v-if="showAdvancedFeatures">
    <AdminPanel />
  </div>
  
  <!-- Simple variant check - v-feature is fine for client-only -->
  <button v-feature="'buttonStyle:modern'">
    Modern Button
  </button>
</template>
```

**Best Practices:**

- Use `v-feature` for client-only UI elements (badges, banners, optional features)
- Use `v-if` with `isEnabled()` for server-rendered content
- Use `v-if` when combining flags with other conditions
- Keep flag names in quotes: `v-feature="'flagName'"` not `v-feature="flagName"`
- Use colon notation for variants: `v-feature="'flag:variant'"`
- Consider SEO implications - important content should use SSR-compatible `v-if`

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

### How Variant Assignment Works

Understanding how users are assigned to variants helps you design effective experiments and predict user experiences.

#### Persistent Assignment

Users receive the same variant consistently across sessions and devices. This persistence is crucial for accurate A/B testing because it ensures:

- **Consistent Experience**: Users don't see different variants on each visit
- **Reliable Analytics**: User behavior can be accurately tracked to a specific variant
- **Fair Testing**: Each user contributes to only one variant's metrics

The assignment is deterministic - given the same flag name and user identifier, the algorithm always returns the same variant.

#### Identifier Priority

To ensure persistent assignment, the module needs a stable identifier for each user. Identifiers are selected using this priority order:

1. **User ID** (`context.user.id` or `context.userId`)
   - **Best for**: Logged-in users
   - **Stability**: Highest - persists across devices and sessions
   - **Example**: `'user-12345'`
   - **Use when**: You have authenticated users

2. **Session ID** (from cookies: `session-id` or `nuxt-session`)
   - **Best for**: Anonymous users during a session
   - **Stability**: Medium - persists within a session
   - **Example**: `'sess-abc123xyz'`
   - **Use when**: Users aren't logged in but you have session tracking

3. **IP Address** (from request headers)
   - **Best for**: Fallback identification
   - **Stability**: Low - can change with network switches
   - **Example**: `'192.168.1.1'`
   - **Use when**: No user ID or session available

4. **Fallback**: `'anonymous'`
   - **Best for**: Last resort
   - **Stability**: None - all anonymous users get the same variant
   - **Use when**: No other identifier is available

**Example of identifier resolution:**

```ts
// In your feature flags config
export default defineFeatureFlags((context) => {
  // The module automatically selects the best available identifier:
  const identifier = 
    context?.user?.id ||           // 1. Try user ID first (best)
    context?.userId ||             // 2. Try alternate user ID field
    getSessionId(event) ||         // 3. Try session ID from cookies
    getClientIpAddress(event) ||   // 4. Try IP address
    'anonymous'                    // 5. Fallback (all anonymous users same)
  
  // This identifier is used for variant assignment
  return {
    experiment: {
      enabled: true,
      variants: [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 }
      ]
    }
  }
})
```

**Best Practice**: Populate `context.user.id` in server middleware for the most stable variant assignment:

```ts
// server/middleware/user-context.ts
export default defineEventHandler(async (event) => {
  const user = await getUserFromAuth(event)
  
  if (user) {
    event.context.user = {
      id: user.id,  // Used for variant assignment
      role: user.role,
      // ... other properties
    }
  }
})
```

#### Hash-Based Assignment Algorithm

The module uses a deterministic hash-based algorithm to assign variants:

1. **Create Unique Key**: Combines flag name + identifier
   ```
   key = "experimentName:user-12345"
   ```

2. **Generate Hash**: Creates MD5 hash of the key
   ```
   hash = md5("experimentName:user-12345")
   // Result: "a1b2c3d4e5f6..."
   ```

3. **Convert to Range**: Converts hash to a number between 0-100
   ```
   hashValue = parseInt(hash.substring(0, 8), 16) % 100
   // Result: 73 (for example)
   ```

4. **Assign Variant**: Matches the hash value to variant weight ranges
   ```
   Variant A: 0-50   (weight: 50)
   Variant B: 51-100 (weight: 50)
   
   hashValue = 73 → Variant B
   ```

**Why MD5?**
- Fast computation
- Uniform distribution across the 0-100 range
- Deterministic (same input always produces same output)
- Not used for security, so cryptographic strength isn't required

#### Cumulative Weight Distribution

Variants are assigned based on cumulative weight ranges. The module automatically calculates these ranges from your configured weights:

**Example 1: Equal Distribution (50/50 split)**

```ts
{
  variants: [
    { name: 'control', weight: 50 },
    { name: 'treatment', weight: 50 }
  ]
}

// Cumulative ranges:
// control:   0-49  (50% of users)
// treatment: 50-99 (50% of users)
```

**Example 2: Unequal Distribution (Gradual Rollout)**

```ts
{
  variants: [
    { name: 'old', weight: 80 },
    { name: 'new', weight: 20 }
  ]
}

// Cumulative ranges:
// old: 0-79  (80% of users)
// new: 80-99 (20% of users)
```

**Example 3: Multi-Variant Test (A/B/C/D)**

```ts
{
  variants: [
    { name: 'original', weight: 40 },
    { name: 'redesign', weight: 30 },
    { name: 'minimal', weight: 20 },
    { name: 'experimental', weight: 10 }
  ]
}

// Cumulative ranges:
// original:     0-39  (40% of users)
// redesign:     40-69 (30% of users)
// minimal:      70-89 (20% of users)
// experimental: 90-99 (10% of users)
```

**Automatic Weight Normalization**

If your weights don't sum to exactly 100, the module automatically normalizes them:

```ts
{
  variants: [
    { name: 'a', weight: 1 },
    { name: 'b', weight: 1 },
    { name: 'c', weight: 1 }
  ]
}

// Normalized to:
// a: 33.33% (0-33)
// b: 33.33% (34-66)
// c: 33.33% (67-99)
```

This means you can use simple ratios like `1:1:1` or `2:1` without calculating exact percentages.

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

### Common Patterns

Here are proven patterns for implementing feature variants in real-world scenarios.

#### Gradual Rollout

Gradually increase the percentage of users who see a new feature to minimize risk and gather feedback incrementally.

**Use Case**: Rolling out a redesigned checkout flow to minimize impact if issues arise.

```ts
// feature-flags.config.ts
export default defineFeatureFlags(() => ({
  // Week 1: 10% of users
  newCheckout: {
    enabled: true,
    variants: [
      { name: 'old', weight: 90, value: false },
      { name: 'new', weight: 10, value: true }
    ]
  }
  
  // Week 2: Increase to 25% (if metrics look good)
  // { name: 'old', weight: 75, value: false },
  // { name: 'new', weight: 25, value: true }
  
  // Week 3: Increase to 50%
  // { name: 'old', weight: 50, value: false },
  // { name: 'new', weight: 50, value: true }
  
  // Week 4: Full rollout to 100%
  // { name: 'old', weight: 0, value: false },
  // { name: 'new', weight: 100, value: true }
  
  // Week 5: Remove flag entirely, make new checkout the default
}))
```

**Usage:**

```vue
<script setup>
const { getValue } = useFeatureFlags()
const useNewCheckout = getValue('newCheckout')
</script>

<template>
  <NewCheckoutFlow v-if="useNewCheckout" />
  <OldCheckoutFlow v-else />
</template>
```

**Best Practices:**
- Start with a small percentage (5-10%)
- Monitor key metrics (conversion rate, error rate, performance)
- Increase gradually if metrics are stable or improving
- Have a rollback plan (decrease weight back to 0)
- Remove the flag once fully rolled out to avoid technical debt

#### A/B Test

Compare two versions to determine which performs better on a specific metric.

**Use Case**: Testing whether a red or blue call-to-action button generates more clicks.

```ts
// feature-flags.config.ts
export default defineFeatureFlags(() => ({
  ctaButton: {
    enabled: true,
    variants: [
      { name: 'control', weight: 50, value: { color: 'blue', text: 'Sign Up' } },
      { name: 'treatment', weight: 50, value: { color: 'red', text: 'Get Started' } }
    ]
  }
}))
```

**Usage:**

```vue
<script setup>
const { getValue, getVariant } = useFeatureFlags()
const buttonConfig = getValue('ctaButton')
const variant = getVariant('ctaButton')

// Track which variant the user sees
onMounted(() => {
  analytics.track('cta_button_viewed', { variant })
})

function handleClick() {
  analytics.track('cta_button_clicked', { variant })
  // ... handle signup
}
</script>

<template>
  <button 
    :class="`bg-${buttonConfig.color}-500 text-white px-6 py-3`"
    @click="handleClick"
  >
    {{ buttonConfig.text }}
  </button>
</template>
```

**Best Practices:**
- Use 50/50 split for equal sample sizes
- Define success metrics before starting (click-through rate, conversion rate, etc.)
- Run the test long enough to reach statistical significance
- Track both the variant shown and user actions
- Document the hypothesis and results

#### A/B/n Test

Test multiple variations simultaneously to find the best-performing option.

**Use Case**: Testing four different homepage layouts to see which drives the most engagement.

```ts
// feature-flags.config.ts
export default defineFeatureFlags(() => ({
  homepageLayout: {
    enabled: true,
    variants: [
      { 
        name: 'original', 
        weight: 25, 
        value: { layout: 'hero-centered', hero: 'large' } 
      },
      { 
        name: 'minimal', 
        weight: 25, 
        value: { layout: 'hero-left', hero: 'small' } 
      },
      { 
        name: 'feature-focused', 
        weight: 25, 
        value: { layout: 'grid', hero: 'none' } 
      },
      { 
        name: 'testimonial-first', 
        weight: 25, 
        value: { layout: 'testimonial-hero', hero: 'medium' } 
      }
    ]
  }
}))
```

**Usage:**

```vue
<script setup>
const { getValue, getVariant } = useFeatureFlags()
const layoutConfig = getValue('homepageLayout')
const variant = getVariant('homepageLayout')

// Track variant exposure
onMounted(() => {
  analytics.track('homepage_viewed', { 
    variant,
    layout: layoutConfig.layout 
  })
})
</script>

<template>
  <div :class="`layout-${layoutConfig.layout}`">
    <HeroSection v-if="layoutConfig.hero !== 'none'" :size="layoutConfig.hero" />
    <TestimonialSection v-if="variant === 'testimonial-first'" />
    <FeaturesGrid v-if="variant === 'feature-focused'" />
    <!-- ... other components -->
  </div>
</template>
```

**Best Practices:**
- Use equal weights (25/25/25/25) for fair comparison
- Limit to 4-5 variants max to maintain statistical power
- Requires larger sample size than A/B tests
- Consider running A/B tests on top performers afterward
- Document what makes each variant unique

#### Canary Release

Release new features to a small subset of users first, typically internal users or beta testers, before wider rollout.

**Use Case**: Testing a new API integration with internal users before exposing to customers.

```ts
// feature-flags.config.ts
export default defineFeatureFlags((context) => ({
  newApiIntegration: {
    enabled: true,
    variants: [
      { 
        name: 'old-api', 
        weight: 95, 
        value: { endpoint: '/api/v1', version: 1 } 
      },
      { 
        name: 'new-api', 
        weight: 5, 
        value: { endpoint: '/api/v2', version: 2 } 
      }
    ]
  },
  
  // Alternative: Target specific users
  betaFeatures: {
    enabled: context?.user?.isBetaTester || context?.user?.role === 'admin',
    value: context?.user?.isBetaTester || context?.user?.role === 'admin'
  }
}))
```

**Usage:**

```ts
// composables/useApi.ts
export function useApi() {
  const { getValue } = useFeatureFlags()
  const apiConfig = getValue('newApiIntegration')
  
  async function fetchData() {
    const response = await fetch(apiConfig.endpoint + '/data')
    return response.json()
  }
  
  return { fetchData, apiVersion: apiConfig.version }
}
```

**Server-side usage:**

```ts
// server/api/data.ts
export default defineEventHandler(async (event) => {
  const { getValue, getVariant } = getFeatureFlags(event)
  const apiConfig = getValue('newApiIntegration')
  const variant = getVariant('newApiIntegration')
  
  // Log which API version is being used
  console.log(`Using API ${apiConfig.version} for request`)
  
  try {
    const data = await fetchFromApi(apiConfig.endpoint)
    
    // Track successful API calls by variant
    await analytics.track('api_call_success', { variant })
    
    return data
  } catch (error) {
    // Track errors by variant to identify issues with new API
    await analytics.track('api_call_error', { 
      variant, 
      error: error.message 
    })
    throw error
  }
})
```

**Best Practices:**
- Start with internal users (5% or less)
- Monitor error rates and performance metrics closely
- Have automated rollback if error rates spike
- Gradually increase percentage: 5% → 10% → 25% → 50% → 100%
- Use feature flags in combination with user roles for precise targeting
- Keep the canary period short (hours to days, not weeks)

**Combining Patterns:**

You can combine these patterns for sophisticated rollout strategies:

```ts
export default defineFeatureFlags((context) => ({
  // Canary + Gradual Rollout
  premiumFeature: {
    enabled: true,
    variants: [
      { 
        name: 'disabled', 
        weight: context?.user?.role === 'admin' ? 0 : 90,  // Admins always get it
        value: false 
      },
      { 
        name: 'enabled', 
        weight: context?.user?.role === 'admin' ? 100 : 10,  // 10% of regular users
        value: true 
      }
    ]
  }
}))
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

## 🎯 Context-Aware Configuration

Context-aware configuration allows you to create dynamic feature flags that evaluate differently based on request-specific information like user attributes, device type, environment, and more. This is the most powerful configuration method for personalized features and sophisticated A/B testing.

### Context Structure

The `context` parameter passed to your configuration function provides request-specific information. Here's the complete interface:

```ts
interface VariantContext {
  // User identification
  userId?: string
  sessionId?: string
  ipAddress?: string
  
  // User information
  user?: {
    id?: string
    role?: string
    isBetaTester?: boolean
    [key: string]: any  // Additional custom user properties
  }
  
  // Device information
  device?: {
    isMobile?: boolean
    [key: string]: any  // Additional custom device properties
  }
  
  // Additional custom context
  [key: string]: any
}
```

**Available Context Properties:**

- **`userId`**: User identifier (used for variant assignment)
- **`sessionId`**: Session identifier from cookies
- **`ipAddress`**: Client IP address from request headers
- **`user`**: Object containing user-specific data (role, status, preferences, etc.)
- **`device`**: Object containing device-specific data (mobile, browser, OS, etc.)
- **Custom properties**: Add any additional context data your application needs

### Populating Context

Context is automatically extracted from H3 events on the server. You can enrich it using server middleware to add custom user and device information:

```ts
// server/middleware/user-context.ts
export default defineEventHandler(async (event) => {
  // Get authenticated user from your auth system
  const user = await getUserFromSession(event)
  
  if (user) {
    // Populate user context
    event.context.user = {
      id: user.id,
      role: user.role,
      isBetaTester: user.betaTester,
      subscriptionTier: user.subscription,
      accountAge: user.accountAge
    }
  }
  
  // Detect device information
  const userAgent = getHeader(event, 'user-agent') || ''
  event.context.device = {
    isMobile: /mobile/i.test(userAgent),
    isTablet: /tablet/i.test(userAgent),
    browser: detectBrowser(userAgent)
  }
})
```

**Best Practice**: Populate `event.context.user.id` in your middleware for consistent variant assignment across sessions and devices.

### Usage Examples

#### Role-Based Flags

Control feature access based on user roles:

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags((context) => {
  return {
    // Admin-only features
    adminPanel: context?.user?.role === 'admin',
    advancedSettings: context?.user?.role === 'admin' || context?.user?.role === 'moderator',
    
    // Role-based feature variants
    dashboard: {
      enabled: true,
      value: context?.user?.role === 'admin' ? 'advanced' : 'basic'
    },
    
    // Multiple role check
    contentModeration: ['admin', 'moderator', 'editor'].includes(context?.user?.role)
  }
})
```

**Usage in components:**

```vue
<script setup>
const { isEnabled, getValue } = useFeatureFlags()
</script>

<template>
  <div>
    <!-- Show admin panel only for admins -->
    <AdminPanel v-if="isEnabled('adminPanel')" />
    
    <!-- Different dashboard based on role -->
    <AdvancedDashboard v-if="getValue('dashboard') === 'advanced'" />
    <BasicDashboard v-else />
  </div>
</template>
```

#### Environment-Based Flags

Enable features based on the deployment environment:

```ts
// feature-flags.config.ts
export default defineFeatureFlags((context) => {
  const isDev = process.env.NODE_ENV === 'development'
  const isStaging = process.env.NUXT_PUBLIC_ENV === 'staging'
  const isProd = process.env.NODE_ENV === 'production'
  
  return {
    // Development-only features
    devTools: isDev,
    debugPanel: isDev,
    mockData: isDev || isStaging,
    
    // Staging features
    experimentalFeatures: isDev || isStaging,
    
    // Production features with gradual rollout
    newCheckout: {
      enabled: isProd,
      variants: [
        { name: 'old', weight: 80, value: false },
        { name: 'new', weight: 20, value: true }
      ]
    },
    
    // Environment-specific API versions
    apiVersion: isProd ? 'v2' : 'v1',
    
    // Feature available in all environments except production
    betaFeatures: !isProd
  }
})
```

**Usage in API routes:**

```ts
// server/api/data.ts
export default defineEventHandler((event) => {
  const { isEnabled, getValue } = getFeatureFlags(event)
  
  if (isEnabled('mockData')) {
    return getMockData()
  }
  
  const apiVersion = getValue('apiVersion')
  return fetchDataFromAPI(apiVersion)
})
```

#### User Status-Based Flags

Enable features based on user status, subscription, or account properties:

```ts
// feature-flags.config.ts
export default defineFeatureFlags((context) => {
  const user = context?.user
  
  return {
    // Beta tester features
    betaFeatures: user?.isBetaTester ?? false,
    earlyAccess: user?.isBetaTester || user?.isEarlyAdopter,
    
    // Subscription-based features
    premiumFeatures: user?.subscriptionTier === 'premium',
    proTools: ['pro', 'premium', 'enterprise'].includes(user?.subscriptionTier),
    
    // Account age-based rollout
    newUserExperience: {
      enabled: true,
      value: (user?.accountAge || 0) < 30 // New users (< 30 days)
    },
    
    // User preference-based
    darkMode: user?.preferences?.theme === 'dark',
    
    // Engagement-based features
    advancedFeatures: (user?.loginCount || 0) > 10,
    
    // Combined conditions
    specialOffer: {
      enabled: user?.subscriptionTier === 'free' && (user?.accountAge || 0) > 90,
      value: 'upgrade-discount-20'
    }
  }
})
```

**Usage in components:**

```vue
<script setup>
const { isEnabled, getValue } = useFeatureFlags()

const showUpgradePrompt = computed(() => {
  return isEnabled('specialOffer')
})

const offerDetails = computed(() => {
  return getValue('specialOffer')
})
</script>

<template>
  <div>
    <!-- Premium features for subscribers -->
    <PremiumTools v-if="isEnabled('premiumFeatures')" />
    
    <!-- Beta features for testers -->
    <BetaFeaturesBanner v-if="isEnabled('betaFeatures')" />
    
    <!-- Special offer for eligible users -->
    <UpgradeOffer 
      v-if="showUpgradePrompt"
      :offer="offerDetails"
    />
  </div>
</template>
```

#### Device-Based Flags

Enable or disable features based on device characteristics:

```ts
// feature-flags.config.ts
export default defineFeatureFlags((context) => {
  const device = context?.device
  
  return {
    // Mobile-specific features
    mobileOptimizedUI: device?.isMobile ?? false,
    touchGestures: device?.isMobile || device?.isTablet,
    
    // Desktop-only features
    keyboardShortcuts: !device?.isMobile,
    multiWindowSupport: !device?.isMobile && !device?.isTablet,
    
    // Browser-specific features
    advancedAnimations: device?.browser !== 'ie',
    webGLFeatures: device?.supportsWebGL ?? false,
    
    // Responsive feature variants
    imageQuality: {
      enabled: true,
      value: device?.isMobile ? 'medium' : 'high'
    },
    
    // Connection-aware features
    autoplayVideos: device?.connectionType === 'wifi',
    
    // Progressive enhancement
    richTextEditor: {
      enabled: true,
      value: device?.isMobile ? 'simple' : 'advanced'
    }
  }
})
```

**Usage in components:**

```vue
<script setup>
const { isEnabled, getValue } = useFeatureFlags()

const imageQuality = computed(() => getValue('imageQuality'))
const editorType = computed(() => getValue('richTextEditor'))
</script>

<template>
  <div>
    <!-- Mobile-optimized UI -->
    <MobileNav v-if="isEnabled('mobileOptimizedUI')" />
    <DesktopNav v-else />
    
    <!-- Device-appropriate image quality -->
    <img 
      :src="`/images/hero-${imageQuality}.jpg`"
      alt="Hero"
    />
    
    <!-- Conditional feature loading -->
    <AdvancedEditor v-if="editorType === 'advanced'" />
    <SimpleEditor v-else />
    
    <!-- Touch-enabled features -->
    <SwipeGallery v-if="isEnabled('touchGestures')" />
    <ClickGallery v-else />
  </div>
</template>
```

### Fallback Behavior

When context is unavailable or properties are missing, flags gracefully fall back to default values:

```ts
// feature-flags.config.ts
export default defineFeatureFlags((context) => {
  return {
    // Using nullish coalescing for safe defaults
    adminPanel: context?.user?.role === 'admin',  // false if context/user/role is undefined
    
    // Explicit fallback values
    betaFeatures: context?.user?.isBetaTester ?? false,
    maxItems: context?.user?.preferences?.itemsPerPage ?? 20,
    
    // Fallback chains
    userId: context?.user?.id || context?.userId || 'anonymous',
    
    // Complex fallback logic
    theme: {
      enabled: true,
      value: context?.user?.preferences?.theme || 
             context?.device?.prefersDark ? 'dark' : 'light'
    },
    
    // Safe property access with optional chaining
    premiumFeature: context?.user?.subscription?.tier === 'premium'
  }
})
```

**Fallback Scenarios:**

1. **Server-Side Rendering (SSR)**: Context is populated from the H3 event
2. **Client-Side Rendering (CSR)**: Context may be limited; flags use fallback values
3. **Anonymous Users**: Context has no user data; flags default to public values
4. **Missing Middleware**: If context isn't populated, all context-dependent flags use defaults

**Best Practices:**

- Always use optional chaining (`?.`) when accessing context properties
- Provide sensible defaults with nullish coalescing (`??`)
- Test your flags with and without context to ensure graceful degradation
- Document which flags require context and their fallback behavior

**Example with comprehensive fallbacks:**

```ts
export default defineFeatureFlags((context) => {
  // Safe context extraction with defaults
  const user = context?.user || {}
  const device = context?.device || {}
  const isAuthenticated = !!user.id
  
  return {
    // Authenticated user features (false for anonymous)
    userDashboard: isAuthenticated,
    
    // Role-based with fallback
    adminFeatures: user.role === 'admin',  // undefined role = false
    
    // Device-based with fallback
    mobileUI: device.isMobile ?? false,
    
    // Complex logic with multiple fallbacks
    recommendedContent: {
      enabled: true,
      value: isAuthenticated 
        ? 'personalized' 
        : 'trending'
    }
  }
})
```

### Server-Side Context Population

For server-side routes and API endpoints, context is automatically available:

```ts
// server/api/features.ts
export default defineEventHandler((event) => {
  const { isEnabled, getValue } = getFeatureFlags(event)
  
  // Context is automatically populated from the event
  const hasAdminAccess = isEnabled('adminPanel')
  const apiVersion = getValue('apiVersion')
  
  return {
    features: {
      admin: hasAdminAccess,
      api: apiVersion
    }
  }
})
```

The module automatically extracts context from the H3 event, including:
- User information from `event.context.user`
- Session ID from cookies
- IP address from request headers
- Any custom properties you add to `event.context`

## ✅ Validation & Build Checks

The module includes built-in validation to catch configuration errors and undeclared flag usage, helping you maintain clean and error-free feature flag implementations.

### Automatic Runtime Validation

The module validates configurations automatically at runtime to catch errors early and prevent invalid flag definitions from causing issues in production.

#### Flag Naming Rules

All flag and variant names must follow these rules:

- **Must start with a letter** (a-z, A-Z)
- **Can contain**: letters, numbers, hyphens (-), underscores (_)
- **Maximum length**: 50 characters
- **Pattern**: `/^[a-z][\w-]*$/i`

**Valid Examples:**

```ts
{
  newFeature: true,              // ✅ Valid
  feature_v2: true,              // ✅ Valid
  my-feature-123: true,          // ✅ Valid
  experimentalDashboard: true    // ✅ Valid
}
```

**Invalid Examples:**

```ts
{
  '123feature': true,            // ❌ Starts with number
  'feature!': true,              // ❌ Contains invalid character
  'my feature': true,            // ❌ Contains space
  '_feature': true,              // ❌ Starts with underscore
  'a'.repeat(51): true           // ❌ Exceeds 50 characters
}
```

#### Variant Validation Rules

Variants must follow these rules:

- **Weights must be 0-100**: Each variant weight must be between 0 and 100
- **Total weights cannot exceed 100**: Sum of all variant weights must be ≤ 100
- **No duplicate variant names**: Each variant must have a unique name within a flag
- **Variant names follow flag naming rules**: Same naming conventions as flags

**Valid Examples:**

```ts
{
  experiment: {
    enabled: true,
    variants: [
      { name: 'control', weight: 50 },      // ✅ Valid
      { name: 'treatment', weight: 50 }     // ✅ Total: 100
    ]
  },
  
  gradualRollout: {
    enabled: true,
    variants: [
      { name: 'disabled', weight: 80 },     // ✅ Valid
      { name: 'enabled', weight: 20 }       // ✅ Total: 100
    ]
  },
  
  multiVariant: {
    enabled: true,
    variants: [
      { name: 'a', weight: 25 },            // ✅ Valid
      { name: 'b', weight: 25 },            // ✅ Valid
      { name: 'c', weight: 25 }             // ✅ Total: 75 (< 100 is OK)
    ]
  }
}
```

**Invalid Examples:**

```ts
{
  // ❌ Total weight exceeds 100
  badWeights: {
    enabled: true,
    variants: [
      { name: 'a', weight: 60 },
      { name: 'b', weight: 50 }             // Total: 110%
    ]
  },
  
  // ❌ Weight out of range
  invalidWeight: {
    enabled: true,
    variants: [
      { name: 'a', weight: 150 },           // Weight > 100
      { name: 'b', weight: -10 }            // Weight < 0
    ]
  },
  
  // ❌ Duplicate variant names
  duplicateNames: {
    enabled: true,
    variants: [
      { name: 'test', weight: 50 },
      { name: 'test', weight: 50 }          // Duplicate name
    ]
  },
  
  // ❌ Invalid variant name
  invalidName: {
    enabled: true,
    variants: [
      { name: '123variant', weight: 50 },   // Starts with number
      { name: 'variant!', weight: 50 }      // Invalid character
    ]
  }
}
```

**Runtime Validation Behavior:**

- **Development Mode**: Validation errors are logged as warnings to the console
- **Production Mode**: Validation errors are logged but don't block execution
- **Invalid Flags**: Flags with validation errors are treated as disabled
- **Graceful Degradation**: Application continues to function even with invalid flags

### Build-Time Validation

Build-time validation helps you catch issues before deployment by analyzing your code and flag configuration.

#### Using `validateFeatureFlags`

The `validateFeatureFlags` function scans your codebase to find flag usage and validates it against your configuration:

```ts
// scripts/validate-flags.ts
import { validateFeatureFlags } from 'nuxt-feature-flags/build'

const errors = await validateFeatureFlags({
  // Path to your feature flags configuration file
  configPath: './feature-flags.config.ts',
  
  // Glob patterns for files to scan
  srcPatterns: [
    '**/*.vue',
    '**/*.ts',
    '**/*.js',
    'server/**/*.ts'
  ],
  
  // Whether to throw an error if validation fails
  failOnErrors: true
})

if (errors.length > 0) {
  console.error('Feature flag validation failed:')
  errors.forEach(error => console.error(`  - ${error}`))
  process.exit(1)
}
```

#### Validation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configPath` | `string` | Required | Path to your feature flags config file |
| `srcPatterns` | `string[]` | `['**/*.vue', '**/*.ts']` | Glob patterns for files to scan |
| `failOnErrors` | `boolean` | `false` | Whether to throw an error on validation failures |
| `excludePatterns` | `string[]` | `['node_modules/**']` | Patterns to exclude from scanning |

#### What is Checked

The build-time validation performs these checks:

1. **Undeclared Flags**: Flags used in code but not defined in configuration
   ```ts
   // In your code:
   isEnabled('undeclaredFlag')  // ❌ Error: Flag not in config
   
   // In your config:
   // (flag is missing)
   ```

2. **Invalid Configurations**: Flags with validation errors (naming, weights, etc.)
   ```ts
   // In your config:
   {
     'invalid!flag': true  // ❌ Error: Invalid flag name
   }
   ```

3. **Unreferenced Flags**: Flags defined in config but never used in code
   ```ts
   // In your config:
   {
     unusedFlag: true  // ⚠️ Warning: Flag never used
   }
   
   // In your code:
   // (flag is never referenced)
   ```

4. **Typos in Flag Names**: Similar flag names that might be typos
   ```ts
   // In your config:
   { newDashboard: true }
   
   // In your code:
   isEnabled('newDashbord')  // ❌ Error: Did you mean 'newDashboard'?
   ```

#### Example Validation Output

```bash
$ npm run validate:flags

Validating feature flags...

✓ Found 15 flags in configuration
✓ Scanned 47 files

Errors:
  ✗ Undeclared flag 'experimentalFeatur' used in src/components/Dashboard.vue:23
    Did you mean 'experimentalFeature'?
  ✗ Invalid flag name 'new-feature!' in configuration
  ✗ Variant weights exceed 100% for flag 'abTest' (total: 110%)

Warnings:
  ⚠ Flag 'oldFeature' is declared but never used
  ⚠ Flag 'deprecatedFlag' is declared but never used

Validation failed with 3 errors and 2 warnings.
```

### CI/CD Integration

Integrate flag validation into your CI/CD pipeline to catch errors before they reach production.

#### GitHub Actions Example

```yaml
# .github/workflows/validate-flags.yml
name: Validate Feature Flags

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Validate feature flags
        run: npm run validate:flags
```

#### Package.json Script Integration

Add validation to your build process:

```json
{
  "scripts": {
    "validate:flags": "tsx scripts/validate-flags.ts",
    "build": "npm run validate:flags && nuxt build",
    "test": "npm run validate:flags && vitest run",
    "lint": "eslint . && npm run validate:flags"
  }
}
```

#### Pre-commit Hook Example

Use Husky to validate flags before commits:

```bash
# Install Husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run validate:flags"
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Validating feature flags..."
npm run validate:flags || {
  echo "❌ Feature flag validation failed. Please fix the errors before committing."
  exit 1
}
```

#### Validation Script Example

Create a comprehensive validation script:

```ts
// scripts/validate-flags.ts
import { validateFeatureFlags } from 'nuxt-feature-flags/build'
import { existsSync } from 'fs'

async function main() {
  console.log('🚩 Validating feature flags...\n')
  
  // Check if config file exists
  const configPath = './feature-flags.config.ts'
  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`)
    process.exit(1)
  }
  
  try {
    const errors = await validateFeatureFlags({
      configPath,
      srcPatterns: [
        'components/**/*.vue',
        'pages/**/*.vue',
        'composables/**/*.ts',
        'server/**/*.ts',
        'utils/**/*.ts'
      ],
      failOnErrors: false
    })
    
    if (errors.length === 0) {
      console.log('✅ All feature flags are valid!\n')
      process.exit(0)
    } else {
      console.error(`❌ Found ${errors.length} validation error(s):\n`)
      errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`)
      })
      console.error('\n')
      
      // Fail the build in CI environments
      if (process.env.CI === 'true') {
        process.exit(1)
      }
    }
  } catch (error) {
    console.error('❌ Validation failed with error:', error)
    process.exit(1)
  }
}

main()
```

#### Failing Build on Validation Errors

Configure your build to fail when validation errors are detected:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  hooks: {
    'build:before': async () => {
      if (process.env.NODE_ENV === 'production') {
        const { validateFeatureFlags } = await import('nuxt-feature-flags/build')
        
        const errors = await validateFeatureFlags({
          configPath: './feature-flags.config.ts',
          srcPatterns: ['**/*.vue', '**/*.ts'],
          failOnErrors: true
        })
        
        if (errors.length > 0) {
          throw new Error(`Feature flag validation failed with ${errors.length} errors`)
        }
      }
    }
  }
})
```

**Best Practices for CI/CD:**

- ✅ Run validation on every pull request
- ✅ Fail builds on validation errors in production
- ✅ Show warnings for unreferenced flags
- ✅ Use pre-commit hooks for fast feedback
- ✅ Include validation in your test suite
- ✅ Document validation failures clearly
- ✅ Set up notifications for validation failures

## � Trsoubleshooting

Having issues with feature flags? This section covers common problems and their solutions.

### Common Issues

#### Flags Not Updating

**Symptom**: Changes to flag configuration don't reflect in the application.

**Possible Causes & Solutions:**

1. **Dev server needs restart**
   ```bash
   # Stop the dev server and restart
   npm run dev
   ```
   
2. **Stale build cache**
   ```bash
   # Clear the Nuxt build cache
   rm -rf .nuxt
   npm run dev
   ```
   
3. **Config file path is incorrect**
   ```ts
   // nuxt.config.ts - verify the path is correct
   export default defineNuxtConfig({
     featureFlags: {
       config: './feature-flags.config.ts'  // Check this path
     }
   })
   ```
   
4. **Client-side cache**
   ```ts
   // Manually refresh flags on the client
   const { fetch } = useFeatureFlags()
   await fetch()
   ```
   
5. **Browser cache**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Clear browser cache and reload

**Prevention:**
- Restart dev server after config changes
- Use `fetch()` method to refresh flags programmatically
- Check browser console for errors

#### Type Errors

**Symptom**: TypeScript errors when using flag names, even though flags are defined.

**Possible Causes & Solutions:**

1. **Types not generated**
   ```bash
   # Regenerate types
   npx nuxi prepare
   
   # Or restart dev server
   npm run dev
   ```
   
2. **TypeScript server needs restart**
   - In VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
   - In other IDEs: Restart the IDE or TypeScript language service
   
3. **Flag name typo**
   ```ts
   // ❌ Typo in flag name
   isEnabled('newDashbord')  // Missing 'a'
   
   // ✅ Correct spelling
   isEnabled('newDashboard')
   ```
   
4. **Flag not in configuration**
   ```ts
   // Add the flag to your config
   export default defineFeatureFlags(() => ({
     newDashboard: true  // Make sure flag is defined
   }))
   ```
   
5. **Using wrong import**
   ```ts
   // ❌ Wrong import
   import { useFeatureFlags } from 'some-other-package'
   
   // ✅ Correct import (auto-imported by Nuxt)
   const { isEnabled } = useFeatureFlags()
   ```

**Prevention:**
- Run `nuxi prepare` after adding new flags
- Use autocomplete to avoid typos
- Keep TypeScript server up to date

#### Variant Assignment Not Working

**Symptom**: Users are not being assigned to variants, or assignment is inconsistent.

**Possible Causes & Solutions:**

1. **No identifier available**
   ```ts
   // Problem: Context has no user ID, session ID, or IP
   // Solution: Populate context in middleware
   
   // server/middleware/user-context.ts
   export default defineEventHandler((event) => {
     const user = await getUserFromSession(event)
     if (user) {
       event.context.user = {
         id: user.id  // This enables consistent variant assignment
       }
     }
   })
   ```
   
2. **Variant weights are incorrect**
   ```ts
   // ❌ Weights don't add up correctly
   {
     variants: [
       { name: 'a', weight: 60 },
       { name: 'b', weight: 60 }  // Total: 120% (invalid)
     ]
   }
   
   // ✅ Correct weights
   {
     variants: [
       { name: 'a', weight: 50 },
       { name: 'b', weight: 50 }  // Total: 100%
     ]
   }
   ```
   
3. **Flag is disabled**
   ```ts
   // Check if flag is enabled
   {
     myFlag: {
       enabled: false,  // ← Flag is disabled!
       variants: [...]
     }
   }
   ```
   
4. **Checking wrong variant name**
   ```ts
   // ❌ Variant name doesn't exist
   isEnabled('myFlag:treatement')  // Typo
   
   // ✅ Correct variant name
   isEnabled('myFlag:treatment')
   ```

**Debugging variant assignment:**

```ts
// Check what variant the user is assigned to
const { getVariant, getFlag } = useFeatureFlags()

const variant = getVariant('myFlag')
console.log('Assigned variant:', variant)

const flag = getFlag('myFlag')
console.log('Full flag details:', flag)
// { enabled: true, value: 'some-value', variant: 'treatment' }
```

**Prevention:**
- Always populate `context.user.id` in middleware
- Validate variant weights (should sum to ≤ 100)
- Use build-time validation to catch configuration errors

#### Server/Client Mismatch

**Symptom**: Flags have different values on server vs client, causing hydration errors.

**Possible Causes & Solutions:**

1. **Context differs between server and client**
   ```ts
   // Problem: Server has user context, client doesn't
   // Solution: Ensure context is available on both sides
   
   // Server-side: Context from event
   export default defineEventHandler((event) => {
     const { isEnabled } = getFeatureFlags(event)
     return { feature: isEnabled('myFlag') }
   })
   
   // Client-side: Fetch flags from server
   const { data } = await useFetch('/api/flags')
   ```
   
2. **Environment variables differ**
   ```ts
   // Problem: Different env vars on server vs client
   // Solution: Use runtime config for shared values
   
   // nuxt.config.ts
   export default defineNuxtConfig({
     runtimeConfig: {
       public: {
         environment: process.env.NODE_ENV
       }
     }
   })
   
   // feature-flags.config.ts
   export default defineFeatureFlags(() => {
     const config = useRuntimeConfig()
     return {
       devFeature: config.public.environment === 'development'
     }
   })
   ```
   
3. **Using client-only directives in SSR**
   ```vue
   <!-- ❌ v-feature doesn't work in SSR -->
   <div v-feature="'myFlag'">
     Server-rendered content
   </div>
   
   <!-- ✅ Use v-if with composable for SSR -->
   <script setup>
   const { isEnabled } = useFeatureFlags()
   </script>
   
   <template>
     <div v-if="isEnabled('myFlag')">
       Server-rendered content
     </div>
   </template>
   ```

**Prevention:**
- Use `v-if` with `isEnabled()` for server-rendered content
- Ensure context is populated consistently
- Test with SSR enabled

#### Flags Not Working in Production

**Symptom**: Flags work in development but not in production build.

**Possible Causes & Solutions:**

1. **Config file not included in build**
   ```ts
   // Verify config path in nuxt.config.ts
   export default defineNuxtConfig({
     featureFlags: {
       config: './feature-flags.config.ts'  // Must be accessible
     }
   })
   ```
   
2. **Environment variables not set**
   ```bash
   # Set environment variables in production
   NODE_ENV=production
   NUXT_PUBLIC_ENV=production
   ```
   
3. **Build cache issues**
   ```bash
   # Clear build cache and rebuild
   rm -rf .nuxt .output
   npm run build
   ```
   
4. **Runtime config not available**
   ```ts
   // Use runtime config instead of process.env
   const config = useRuntimeConfig()
   const isProd = config.public.environment === 'production'
   ```

**Prevention:**
- Test production builds locally before deploying
- Use runtime config for environment-specific values
- Verify all environment variables are set in production

### Debugging

Use these techniques to debug feature flag issues and understand how flags are being evaluated.

#### Log All Resolved Flags

See all flags and their resolved values:

```ts
// Client-side
const { flags } = useFeatureFlags()
console.log('All flags:', flags.value)

// Output:
// {
//   newDashboard: { enabled: true, value: true },
//   experiment: { enabled: true, value: 'treatment', variant: 'treatment' },
//   betaFeature: { enabled: false, value: false }
// }
```

```ts
// Server-side
export default defineEventHandler((event) => {
  const { flags } = getFeatureFlags(event)
  console.log('Server flags:', flags)
  
  return { flags }
})
```

#### Inspect Specific Flag Details

Get detailed information about a specific flag:

```ts
const { getFlag, isEnabled, getVariant, getValue } = useFeatureFlags()

// Get complete flag object
const flag = getFlag('myExperiment')
console.log('Flag details:', {
  enabled: flag?.enabled,
  value: flag?.value,
  variant: flag?.variant
})

// Check individual properties
console.log('Is enabled:', isEnabled('myExperiment'))
console.log('Variant:', getVariant('myExperiment'))
console.log('Value:', getValue('myExperiment'))
```

#### Check Context Population

Verify that context is being populated correctly:

```ts
// Server-side middleware
export default defineEventHandler((event) => {
  console.log('Request context:', {
    user: event.context.user,
    device: event.context.device,
    userId: event.context.userId,
    sessionId: event.context.sessionId,
    ipAddress: event.context.ipAddress
  })
})
```

```ts
// In feature flags config
export default defineFeatureFlags((context) => {
  console.log('Context received:', context)
  
  return {
    myFlag: {
      enabled: true,
      variants: [...]
    }
  }
})
```

#### Debug Variant Assignment

Understand why a user is assigned to a specific variant:

```ts
// Add logging to see variant assignment
export default defineFeatureFlags((context) => {
  const identifier = context?.user?.id || 
                     context?.userId || 
                     context?.sessionId || 
                     context?.ipAddress || 
                     'anonymous'
  
  console.log('Variant assignment identifier:', identifier)
  
  return {
    experiment: {
      enabled: true,
      variants: [
        { name: 'control', weight: 50 },
        { name: 'treatment', weight: 50 }
      ]
    }
  }
})
```

#### Enable Debug Mode

Create a debug flag to enable verbose logging:

```ts
// feature-flags.config.ts
export default defineFeatureFlags((context) => {
  const debug = process.env.DEBUG_FLAGS === 'true'
  
  if (debug) {
    console.log('=== Feature Flags Debug ===')
    console.log('Context:', context)
    console.log('Environment:', process.env.NODE_ENV)
    console.log('===========================')
  }
  
  return {
    // Your flags here
  }
})
```

```bash
# Enable debug mode
DEBUG_FLAGS=true npm run dev
```

#### Debugging Code Examples

**Debug flag evaluation in components:**

```vue
<script setup>
const { flags, isEnabled, getVariant, getValue } = useFeatureFlags()

// Log flag state on mount
onMounted(() => {
  console.group('Feature Flags Debug')
  console.log('All flags:', flags.value)
  console.log('New dashboard enabled:', isEnabled('newDashboard'))
  console.log('Experiment variant:', getVariant('experiment'))
  console.log('Theme value:', getValue('theme'))
  console.groupEnd()
})

// Watch for flag changes
watch(flags, (newFlags) => {
  console.log('Flags updated:', newFlags)
}, { deep: true })
</script>
```

**Debug server-side flag evaluation:**

```ts
// server/api/debug-flags.ts
export default defineEventHandler((event) => {
  const { flags, isEnabled, getVariant } = getFeatureFlags(event)
  
  return {
    context: {
      user: event.context.user,
      sessionId: event.context.sessionId,
      ipAddress: event.context.ipAddress
    },
    flags,
    examples: {
      newDashboard: {
        enabled: isEnabled('newDashboard'),
        variant: getVariant('newDashboard')
      }
    }
  }
})
```

**Debug variant assignment algorithm:**

```ts
// Create a test endpoint to see variant assignment
// server/api/test-variant.ts
export default defineEventHandler((event) => {
  const flagName = getQuery(event).flag as string
  const { getVariant, getFlag } = getFeatureFlags(event)
  
  const variant = getVariant(flagName)
  const flag = getFlag(flagName)
  
  return {
    flagName,
    assignedVariant: variant,
    flagDetails: flag,
    context: {
      userId: event.context.user?.id,
      sessionId: event.context.sessionId,
      ipAddress: event.context.ipAddress
    }
  }
})

// Test: GET /api/test-variant?flag=myExperiment
```

#### Common Debug Scenarios

**Scenario 1: Flag not enabling**

```ts
// Check if flag exists and is enabled
const { getFlag } = useFeatureFlags()
const flag = getFlag('myFlag')

if (!flag) {
  console.error('Flag "myFlag" not found in configuration')
} else if (!flag.enabled) {
  console.warn('Flag "myFlag" is disabled')
} else {
  console.log('Flag "myFlag" is enabled with value:', flag.value)
}
```

**Scenario 2: Variant not matching**

```ts
// Debug variant assignment
const { getVariant, getFlag } = useFeatureFlags()
const variant = getVariant('experiment')
const flag = getFlag('experiment')

console.log('Expected variant: treatment')
console.log('Actual variant:', variant)
console.log('Flag config:', flag)

if (variant !== 'treatment') {
  console.log('User is in a different variant group')
  console.log('This is expected behavior for A/B tests')
}
```

**Scenario 3: Context not available**

```ts
// Check if context is populated
export default defineFeatureFlags((context) => {
  if (!context) {
    console.warn('No context available')
  } else {
    console.log('Context keys:', Object.keys(context))
    console.log('User ID:', context.user?.id || 'not set')
  }
  
  return { /* flags */ }
})
```

### Getting Help

If you're still experiencing issues:

1. **Check the documentation**: Review relevant sections of this README
2. **Search existing issues**: Look for similar problems on [GitHub Issues](https://github.com/rxb3rth/nuxt-feature-flags/issues)
3. **Enable debug logging**: Use the debugging techniques above to gather information
4. **Create a minimal reproduction**: Isolate the problem in a small example
5. **Open an issue**: Provide debug output, configuration, and steps to reproduce

**When opening an issue, include:**
- Nuxt version (`npx nuxi info`)
- Module version
- Your feature flags configuration (sanitized)
- Relevant code snippets
- Error messages or unexpected behavior
- Steps to reproduce

## 💡 Best Practices

Follow these best practices to effectively manage feature flags in your application and avoid common pitfalls.

### Naming Conventions

Consistent, descriptive flag names make your codebase more maintainable and help team members understand flag purposes at a glance.

**Good Naming Examples:**

```ts
export default defineFeatureFlags(() => ({
  // ✅ Clear, descriptive names
  newCheckoutFlow: true,
  experimentDashboardRedesign: { enabled: true, variants: [...] },
  rolloutPremiumFeatures: { enabled: true, variants: [...] },
  
  // ✅ Feature area prefixes for organization
  authSocialLogin: true,
  authTwoFactor: false,
  paymentApplePay: true,
  paymentCrypto: false,
  
  // ✅ Consistent camelCase
  enableDarkMode: true,
  showBetaBadge: true,
  useNewApi: false,
  
  // ✅ Descriptive variant names
  homepageLayout: {
    enabled: true,
    variants: [
      { name: 'classic', weight: 50 },
      { name: 'modern', weight: 50 }
    ]
  }
}))
```

**Avoid These Patterns:**

```ts
export default defineFeatureFlags(() => ({
  // ❌ Not descriptive
  flag1: true,
  temp: false,
  test: true,
  
  // ❌ Invalid characters
  'new-feature!': true,
  'feature@2024': true,
  
  // ❌ Too long (exceeds 50 characters)
  thisIsAReallyLongFeatureFlagNameThatExceedsFiftyCharacters: true,
  
  // ❌ Inconsistent naming styles
  new_dashboard: true,  // snake_case
  NewFeature: true,     // PascalCase
  'old-feature': true,  // kebab-case in quotes
  
  // ❌ Unclear variant names
  experiment: {
    enabled: true,
    variants: [
      { name: 'a', weight: 50 },  // What is 'a'?
      { name: 'b', weight: 50 }   // What is 'b'?
    ]
  }
}))
```

**Recommended Patterns:**

1. **Use camelCase or kebab-case consistently** throughout your project
2. **Prefix by feature area** for better organization (e.g., `auth*`, `payment*`, `ui*`)
3. **Use descriptive names** that explain what the flag controls
4. **Keep names under 50 characters** for better readability
5. **Use action verbs** for boolean flags (e.g., `enable*`, `show*`, `use*`)
6. **Name variants clearly** to indicate what they represent

**Organizational Strategies:**

```ts
// Group related flags with prefixes
export default defineFeatureFlags(() => ({
  // Authentication features
  authSocialLogin: true,
  authTwoFactor: false,
  authPasswordless: false,
  
  // UI features
  uiDarkMode: true,
  uiCompactView: false,
  uiAnimations: true,
  
  // Experimental features
  experimentNewSearch: { enabled: true, variants: [...] },
  experimentAiRecommendations: { enabled: false, variants: [...] },
  
  // Rollout features (temporary)
  rolloutNewDashboard: { enabled: true, variants: [...] },
  rolloutPaymentV2: { enabled: true, variants: [...] }
}))
```

### Flag Lifecycle

Feature flags should be temporary. Follow a structured lifecycle to prevent flag accumulation and technical debt.

**Recommended Lifecycle Stages:**

#### 1. Introduction (0-10% rollout)

Start with a small percentage of users to validate the feature works correctly in production:

```ts
newFeature: {
  enabled: true,
  variants: [
    { name: 'disabled', weight: 90, value: false },
    { name: 'enabled', weight: 10, value: true }  // Start with 10%
  ]
}
```

**Actions:**
- Monitor error rates and performance metrics
- Gather initial user feedback
- Fix critical bugs before wider rollout
- Document the flag's purpose and owner

#### 2. Gradual Increase (10-50% rollout)

If the feature is stable, gradually increase the rollout:

```ts
// Week 1: 10% → 25%
newFeature: {
  enabled: true,
  variants: [
    { name: 'disabled', weight: 75, value: false },
    { name: 'enabled', weight: 25, value: true }
  ]
}

// Week 2: 25% → 50%
newFeature: {
  enabled: true,
  variants: [
    { name: 'disabled', weight: 50, value: false },
    { name: 'enabled', weight: 50, value: true }
  ]
}
```

**Actions:**
- Continue monitoring metrics
- Address user feedback
- Validate performance at scale
- Prepare for full rollout

#### 3. Full Rollout (100%)

Once the feature is proven stable, roll out to all users:

```ts
// Option 1: Use variants at 100%
newFeature: {
  enabled: true,
  variants: [
    { name: 'enabled', weight: 100, value: true }
  ]
}

// Option 2: Simplify to boolean (better)
newFeature: true
```

**Actions:**
- Monitor for any issues at full scale
- Plan for flag removal
- Update documentation

#### 4. Cleanup (Remove flag)

After the feature has been stable at 100% for a reasonable period (e.g., 2-4 weeks), remove the flag entirely:

```ts
// Before: Feature behind flag
if (isEnabled('newFeature')) {
  return <NewComponent />
} else {
  return <OldComponent />
}

// After: Flag removed, feature is default
return <NewComponent />
```

**Actions:**
- Remove flag from configuration
- Remove all flag checks from code
- Delete old code paths
- Update tests
- Document the change in release notes

**Flag Documentation Template:**

Keep a record of your flags to track their lifecycle:

```ts
/**
 * Flag: newCheckoutFlow
 * Owner: @payments-team
 * Created: 2024-01-15
 * Purpose: Gradual rollout of redesigned checkout experience
 * Target: 100% by 2024-02-15
 * Removal: 2024-03-01 (2 weeks after full rollout)
 * Metrics: Conversion rate, cart abandonment, error rate
 */
newCheckoutFlow: {
  enabled: true,
  variants: [
    { name: 'old', weight: 70, value: false },
    { name: 'new', weight: 30, value: true }
  ]
}
```

**Cleanup Checklist:**

- [ ] Feature has been at 100% rollout for at least 2 weeks
- [ ] No critical issues reported
- [ ] Metrics show stable or improved performance
- [ ] Old code path is no longer needed
- [ ] Tests updated to remove flag-dependent logic
- [ ] Flag removed from configuration
- [ ] All flag checks removed from codebase
- [ ] Documentation updated

### Performance Considerations

Feature flags are evaluated efficiently, but following these practices ensures optimal performance.

#### Per-Request Caching

The module automatically caches resolved flags for the duration of each request, making multiple flag checks very efficient:

```ts
// ✅ Efficient - flags are cached per request
export default defineEventHandler((event) => {
  const flags1 = getFeatureFlags(event)
  const flags2 = getFeatureFlags(event)
  const flags3 = getFeatureFlags(event)
  
  // All three calls return the same cached instance
  // No re-evaluation happens
})
```

**What this means:**
- First flag evaluation per request does the work
- Subsequent calls are instant (cached)
- No performance penalty for checking flags multiple times
- Cache is automatically cleared between requests

#### Minimize Flag Checks in Loops

While flag checks are fast, avoid unnecessary repeated evaluations in tight loops:

```ts
// ❌ Inefficient - checks flag on every iteration
for (let i = 0; i < items.length; i++) {
  if (isEnabled('newFeature')) {  // Checked 1000 times!
    processItem(items[i])
  }
}

// ✅ Efficient - check once before loop
const useNewFeature = isEnabled('newFeature')
for (let i = 0; i < items.length; i++) {
  if (useNewFeature) {
    processItem(items[i])
  }
}

// ✅ Even better - use filter
if (isEnabled('newFeature')) {
  items.forEach(item => processItem(item))
}
```

**Performance Impact:**
- Checking a flag 1000 times vs once: ~0.1ms difference (negligible)
- Still a good practice for code clarity
- More important for complex context-aware flags

#### Use Computed Properties for Reactive Flags

In Vue components, use computed properties to avoid unnecessary re-evaluations:

```ts
// ❌ Less efficient - re-evaluates on every render
<template>
  <div v-if="isEnabled('newFeature')">
    <FeatureComponent />
  </div>
</template>

// ✅ Better - computed property caches the result
<script setup>
const { isEnabled } = useFeatureFlags()

const showNewFeature = computed(() => isEnabled('newFeature'))
</script>

<template>
  <div v-if="showNewFeature">
    <FeatureComponent />
  </div>
</template>

// ✅ Best - combine multiple flag checks
<script setup>
const { isEnabled } = useFeatureFlags()

const features = computed(() => ({
  newDashboard: isEnabled('newDashboard'),
  darkMode: isEnabled('darkMode'),
  betaFeatures: isEnabled('betaFeatures')
}))
</script>

<template>
  <div v-if="features.newDashboard">
    <Dashboard :dark="features.darkMode" :beta="features.betaFeatures" />
  </div>
</template>
```

**Benefits:**
- Computed properties cache results
- Only re-evaluate when dependencies change
- Better performance in frequently re-rendered components
- Cleaner template code

#### Optimize Context-Aware Flags

For context-aware flags, keep the evaluation function lightweight:

```ts
// ❌ Expensive operations in flag evaluation
export default defineFeatureFlags(async (context) => {
  // Don't do this - async operations slow down every request
  const userData = await fetchUserData(context.userId)
  const settings = await fetchSettings()
  
  return {
    premiumFeature: userData.isPremium
  }
})

// ✅ Use pre-populated context from middleware
export default defineFeatureFlags((context) => {
  // Context is already populated by middleware - fast!
  return {
    premiumFeature: context?.user?.isPremium ?? false
  }
})

// server/middleware/user-context.ts
export default defineEventHandler(async (event) => {
  // Populate context once per request
  const user = await getUserFromSession(event)
  event.context.user = user
})
```

**Best Practices:**
- Populate context in middleware, not in flag evaluation
- Keep flag evaluation functions synchronous
- Avoid database queries or API calls in flag functions
- Use simple boolean/comparison logic

#### Bundle Size Considerations

The module has minimal impact on bundle size:

- **Server-side**: ~5KB (included in server bundle)
- **Client-side**: ~3KB (gzipped)
- **No runtime dependencies**

**Tips to minimize impact:**
- Tree-shaking automatically removes unused code
- Only import what you need: `const { isEnabled } = useFeatureFlags()`
- Flags are evaluated once and cached

### Testing Strategies

Comprehensive testing ensures your feature flags work correctly in all states.

#### Test Both Enabled and Disabled States

Every feature flag creates two code paths - test both:

```ts
// tests/components/FeatureComponent.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FeatureComponent from './FeatureComponent.vue'

describe('FeatureComponent', () => {
  it('shows new feature when flag is enabled', () => {
    // Mock the composable to return enabled
    vi.mock('#feature-flags/composables', () => ({
      useFeatureFlags: () => ({
        isEnabled: (flag: string) => flag === 'newFeature'
      })
    }))
    
    const wrapper = mount(FeatureComponent)
    expect(wrapper.find('.new-feature').exists()).toBe(true)
    expect(wrapper.find('.old-feature').exists()).toBe(false)
  })
  
  it('shows old feature when flag is disabled', () => {
    // Mock the composable to return disabled
    vi.mock('#feature-flags/composables', () => ({
      useFeatureFlags: () => ({
        isEnabled: () => false
      })
    }))
    
    const wrapper = mount(FeatureComponent)
    expect(wrapper.find('.new-feature').exists()).toBe(false)
    expect(wrapper.find('.old-feature').exists()).toBe(true)
  })
})
```

**What to test:**
- ✅ Feature behavior when flag is enabled
- ✅ Feature behavior when flag is disabled
- ✅ UI renders correctly in both states
- ✅ No errors occur in either state
- ✅ Analytics/tracking works in both states

#### Test All Variants

For A/B tests and multivariate flags, test each variant:

```ts
describe('CheckoutFlow with variants', () => {
  it('renders control variant correctly', () => {
    vi.mock('#feature-flags/composables', () => ({
      useFeatureFlags: () => ({
        isEnabled: () => true,
        getVariant: () => 'control',
        getValue: () => 'old-checkout'
      })
    }))
    
    const wrapper = mount(CheckoutFlow)
    expect(wrapper.find('.old-checkout').exists()).toBe(true)
  })
  
  it('renders treatment variant correctly', () => {
    vi.mock('#feature-flags/composables', () => ({
      useFeatureFlags: () => ({
        isEnabled: () => true,
        getVariant: () => 'treatment',
        getValue: () => 'new-checkout'
      })
    }))
    
    const wrapper = mount(CheckoutFlow)
    expect(wrapper.find('.new-checkout').exists()).toBe(true)
  })
  
  it('renders experimental variant correctly', () => {
    vi.mock('#feature-flags/composables', () => ({
      useFeatureFlags: () => ({
        isEnabled: () => true,
        getVariant: () => 'experimental',
        getValue: () => 'experimental-checkout'
      })
    }))
    
    const wrapper = mount(CheckoutFlow)
    expect(wrapper.find('.experimental-checkout').exists()).toBe(true)
  })
})
```

**Testing checklist for variants:**
- [ ] Test each variant renders correctly
- [ ] Test variant-specific logic executes properly
- [ ] Test transitions between variants (if applicable)
- [ ] Test analytics tracking for each variant
- [ ] Test error handling in each variant

#### Environment-Specific Configuration

Use different flag configurations for different environments:

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags(() => {
  const isDev = process.env.NODE_ENV === 'development'
  const isStaging = process.env.NUXT_PUBLIC_ENV === 'staging'
  const isProd = process.env.NUXT_PUBLIC_ENV === 'production'
  
  return {
    // Always enabled in dev, controlled rollout in production
    newFeature: isDev ? true : {
      enabled: true,
      variants: [
        { name: 'disabled', weight: 70, value: false },
        { name: 'enabled', weight: 30, value: true }
      ]
    },
    
    // Debug features only in dev
    debugPanel: isDev,
    verboseLogging: isDev || isStaging,
    
    // Staging-specific features
    experimentalFeatures: isStaging || isDev,
    
    // Production-only features
    analytics: isProd,
    errorReporting: isProd || isStaging
  }
})
```

**Environment-based testing:**

```ts
// tests/setup.ts
import { beforeEach } from 'vitest'

beforeEach(() => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.NUXT_PUBLIC_ENV = 'test'
})

// tests/feature-flags.spec.ts
describe('Feature flags by environment', () => {
  it('enables debug features in development', () => {
    process.env.NODE_ENV = 'development'
    const flags = loadFeatureFlags()
    expect(flags.debugPanel).toBe(true)
  })
  
  it('disables debug features in production', () => {
    process.env.NODE_ENV = 'production'
    const flags = loadFeatureFlags()
    expect(flags.debugPanel).toBe(false)
  })
})
```

**Testing strategies by environment:**

| Environment | Strategy |
|-------------|----------|
| **Development** | All flags enabled for easy testing |
| **Staging** | Mirror production config for realistic testing |
| **Test/CI** | Explicit flag states for predictable tests |
| **Production** | Gradual rollouts and A/B tests |

**Test configuration example:**

```ts
// feature-flags.test.config.ts
export default defineFeatureFlags(() => ({
  // Explicit states for testing
  newFeature: true,
  experimentalFeature: false,
  
  // Test both variants
  abTest: {
    enabled: true,
    variants: [
      { name: 'control', weight: 50, value: 'A' },
      { name: 'treatment', weight: 50, value: 'B' }
    ]
  }
}))

// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    env: {
      NUXT_FEATURE_FLAGS_CONFIG: './feature-flags.test.config.ts'
    }
  }
})
```

**Integration testing with flags:**

```ts
// tests/integration/checkout.spec.ts
describe('Checkout flow integration', () => {
  it('completes checkout with old flow', async () => {
    // Set flag state
    await setFeatureFlag('newCheckout', false)
    
    // Test old checkout flow
    await page.goto('/checkout')
    await page.fill('[name="email"]', 'test@example.com')
    await page.click('button[type="submit"]')
    
    expect(await page.textContent('.success')).toContain('Order placed')
  })
  
  it('completes checkout with new flow', async () => {
    // Set flag state
    await setFeatureFlag('newCheckout', true)
    
    // Test new checkout flow
    await page.goto('/checkout')
    await page.fill('[name="email"]', 'test@example.com')
    await page.click('.new-checkout-button')
    
    expect(await page.textContent('.success')).toContain('Order placed')
  })
})
```

## 🔄 Migration Guide

This guide helps you upgrade between versions of nuxt-feature-flags and adopt new features in existing projects.

### Current Version: v1.1.x

The current stable version is v1.1.x, which includes all the features documented in this README.

**Key Features in v1.1.x:**
- ✅ Context-aware flag evaluation
- ✅ TypeScript type generation
- ✅ A/B/n testing with persistent variant assignment
- ✅ Build-time validation
- ✅ Server-side and client-side APIs
- ✅ Template directives (`v-feature`)
- ✅ Automatic runtime validation

### Breaking Changes

#### v1.1.x

**No breaking changes** from v1.0.x. All existing configurations and code continue to work.

**New Features:**
- Enhanced TypeScript support with better type inference
- Improved variant assignment algorithm
- Build-time validation tools
- Better error messages and warnings

**Recommended Updates:**
While not required, we recommend adopting these patterns for better maintainability:

```ts
// Before (v1.0.x) - Still works
export default defineNuxtConfig({
  featureFlags: {
    flags: {
      newFeature: true
    }
  }
})

// After (v1.1.x) - Recommended
// feature-flags.config.ts
export default defineFeatureFlags(() => ({
  newFeature: true
}))

// nuxt.config.ts
export default defineNuxtConfig({
  featureFlags: {
    config: './feature-flags.config.ts'
  }
})
```

#### v1.0.x

Initial release. No migration needed.

### Upgrading from v1.0.x to v1.1.x

Follow these steps to upgrade to the latest version:

#### 1. Update the Package

```bash
# Using npm
npm install nuxt-feature-flags@latest

# Using yarn
yarn upgrade nuxt-feature-flags

# Using pnpm
pnpm update nuxt-feature-flags
```

#### 2. Regenerate Types

After upgrading, regenerate TypeScript types:

```bash
npx nuxi prepare
```

#### 3. Optional: Migrate to Configuration File

If you're using inline configuration, consider migrating to a dedicated config file for better organization:

**Before:**

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    flags: {
      newDashboard: true,
      experimentalFeature: false,
      betaFeature: {
        enabled: true,
        variants: [
          { name: 'control', weight: 50 },
          { name: 'treatment', weight: 50 }
        ]
      }
    }
  }
})
```

**After:**

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'

export default defineFeatureFlags(() => ({
  newDashboard: true,
  experimentalFeature: false,
  betaFeature: {
    enabled: true,
    variants: [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 }
    ]
  }
}))

// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feature-flags'],
  featureFlags: {
    config: './feature-flags.config.ts'
  }
})
```

**Benefits:**
- Better organization and maintainability
- Easier to use context-aware flags
- Cleaner `nuxt.config.ts`
- Better IDE support

#### 4. Optional: Add Build-Time Validation

Take advantage of new build-time validation features:

```ts
// scripts/validate-flags.ts
import { validateFeatureFlags } from 'nuxt-feature-flags/build'

const errors = await validateFeatureFlags({
  configPath: './feature-flags.config.ts',
  srcPatterns: ['**/*.vue', '**/*.ts'],
  failOnErrors: true
})

if (errors.length > 0) {
  console.error('Validation failed:', errors)
  process.exit(1)
}
```

```json
// package.json
{
  "scripts": {
    "validate:flags": "tsx scripts/validate-flags.ts",
    "build": "npm run validate:flags && nuxt build"
  }
}
```

#### 5. Test Your Application

After upgrading:

1. **Run your dev server**: `npm run dev`
2. **Check for console warnings**: Look for any deprecation warnings
3. **Test flag functionality**: Verify all flags work as expected
4. **Run your test suite**: Ensure all tests pass
5. **Build for production**: `npm run build` to verify production build works

### Adopting New Features

#### Using Context-Aware Flags

If you're not using context-aware flags yet, here's how to adopt them:

**Step 1: Create middleware to populate context**

```ts
// server/middleware/user-context.ts
export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  
  if (user) {
    event.context.user = {
      id: user.id,
      role: user.role,
      isBetaTester: user.betaTester
    }
  }
})
```

**Step 2: Update your config to use context**

```ts
// feature-flags.config.ts
export default defineFeatureFlags((context) => {
  return {
    // Role-based flags
    adminPanel: context?.user?.role === 'admin',
    
    // Beta features
    betaFeatures: context?.user?.isBetaTester ?? false,
    
    // Existing flags (unchanged)
    newDashboard: true
  }
})
```

**Step 3: Test with different user contexts**

```ts
// Test with admin user
// Test with regular user
// Test with anonymous user
```

#### Using Build-Time Validation

Add validation to catch errors early:

**Step 1: Create validation script**

```ts
// scripts/validate-flags.ts
import { validateFeatureFlags } from 'nuxt-feature-flags/build'

await validateFeatureFlags({
  configPath: './feature-flags.config.ts',
  srcPatterns: ['**/*.vue', '**/*.ts'],
  failOnErrors: true
})
```

**Step 2: Add to package.json**

```json
{
  "scripts": {
    "validate:flags": "tsx scripts/validate-flags.ts"
  }
}
```

**Step 3: Integrate with CI/CD**

```yaml
# .github/workflows/ci.yml
- name: Validate feature flags
  run: npm run validate:flags
```

#### Using TypeScript Types

If you're using JavaScript, consider migrating to TypeScript for better type safety:

**Step 1: Rename files**

```bash
# Rename config file
mv feature-flags.config.js feature-flags.config.ts
```

**Step 2: Add type annotations**

```ts
// feature-flags.config.ts
import { defineFeatureFlags } from '#feature-flags/handler'
import type { VariantContext } from '#feature-flags/types'

export default defineFeatureFlags((context: VariantContext) => ({
  newFeature: true,
  experiment: {
    enabled: true,
    variants: [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 }
    ]
  }
}))
```

**Step 3: Use typed composables**

```vue
<script setup lang="ts">
const { isEnabled, getValue } = useFeatureFlags()

// TypeScript will now provide autocomplete and type checking
const enabled: boolean = isEnabled('newFeature')
const value: any = getValue('experiment')
</script>
```

### Deprecation Policy

We follow semantic versioning and provide clear deprecation warnings:

- **Minor versions** (1.x.0): New features, no breaking changes
- **Patch versions** (1.0.x): Bug fixes, no breaking changes
- **Major versions** (2.0.0): Breaking changes with migration guide

**Deprecation Process:**

1. **Deprecation Warning**: Feature marked as deprecated in minor version
2. **Migration Period**: At least one major version cycle (6+ months)
3. **Removal**: Deprecated feature removed in next major version

**Current Deprecations:**

None. All features in v1.1.x are fully supported.

### Version History

#### v1.1.0 (Current)

**New Features:**
- Enhanced TypeScript support
- Build-time validation tools
- Improved error messages
- Better documentation

**Improvements:**
- Faster flag resolution
- Better variant assignment algorithm
- Improved caching

**Bug Fixes:**
- Fixed edge cases in variant assignment
- Improved SSR hydration
- Better error handling

#### v1.0.0

**Initial Release:**
- Core feature flag functionality
- Context-aware evaluation
- A/B testing support
- Server-side and client-side APIs
- Template directives
- TypeScript support

### Getting Help with Migration

If you encounter issues during migration:

1. **Check the changelog**: Review detailed changes in [CHANGELOG.md](./CHANGELOG.md)
2. **Search issues**: Look for migration-related issues on [GitHub](https://github.com/rxb3rth/nuxt-feature-flags/issues)
3. **Ask for help**: Open a discussion or issue if you need assistance
4. **Review examples**: Check the [examples directory](./examples) for reference implementations

### Migration Checklist

Use this checklist when upgrading:

- [ ] Update package to latest version
- [ ] Run `npx nuxi prepare` to regenerate types
- [ ] Review changelog for breaking changes
- [ ] Update configuration if needed
- [ ] Test all feature flags in development
- [ ] Run test suite
- [ ] Build for production
- [ ] Deploy to staging for testing
- [ ] Monitor for issues in production
- [ ] Update documentation
- [ ] Train team on new features

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/rxb3rth/nuxt-feature-flags.git
   cd nuxt-feature-flags
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following the existing style
   - Add tests for new features
   - Update documentation

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add new feature"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/) format

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Contribution Guidelines

- **Code Style**: Follow the existing code style and conventions
- **Tests**: Add tests for new features and bug fixes
- **Documentation**: Update README and JSDoc comments
- **Commits**: Use conventional commit messages
- **Pull Requests**: Provide clear description of changes

### Areas for Contribution

We especially welcome contributions in these areas:

- 🐛 Bug fixes
- 📝 Documentation improvements
- ✨ New features (discuss in an issue first)
- 🧪 Additional tests
- 🌐 Internationalization
- ♿ Accessibility improvements
- 🎨 Examples and demos

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
