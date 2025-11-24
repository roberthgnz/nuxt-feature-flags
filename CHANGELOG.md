# Changelog


## v1.1.7

[compare changes](https://github.com/rxb3rth/nuxt-feature-flags/compare/v1.1.6...v1.1.7)

### 🩹 Fixes

- **config-file-runtime-loading**: Resolve critical bug where feature flags from config files were not available at runtime ([58a7469](https://github.com/rxb3rth/nuxt-feature-flags/commit/58a7469))
  - Fix runtime config structure to properly nest flags under `runtimeConfig.public.featureFlags.flags`
  - Add HMR support for config file changes in development mode
  - Improve error handling and logging for config file loading
  - Add comprehensive property-based tests for all correctness properties
  - Ensure backward compatibility with inline flag configurations

### 🧪 Tests

- Add 10 comprehensive property-based tests using fast-check
- Add integration tests for config file loading
- All 255 tests passing with 9 correctness properties validated

### ❤️ Contributors

- Rxb3rth <reliutg@gmail.com>

## v1.1.6

[compare changes](https://github.com/rxb3rth/nuxt-feature-flags/compare/v1.1.5...v1.1.6)

### 📖 Documentation

- Fix documentation links to use actual paths from docs site ([#](https://github.com/rxb3rth/nuxt-feature-flags/commit/#))

### ❤️ Contributors

- Rxb3rth <reliutg@gmail.com>

## v1.1.5

[compare changes](https://github.com/rxb3rth/nuxt-feature-flags/compare/v1.1.4...v1.1.5)

### 📖 Documentation

- Significantly reduce README size by moving detailed documentation to docs site ([#](https://github.com/rxb3rth/nuxt-feature-flags/commit/#))
- Keep only essential quick start and API reference in README
- Reduce package size by ~10KB

### ❤️ Contributors

- Rxb3rth <reliutg@gmail.com>

## v1.1.4

[compare changes](https://github.com/rxb3rth/nuxt-feature-flags/compare/v1.1.3...v1.1.4)

### 🩹 Fixes

- Resolve build path parsing issue and reorganize project structure ([de3b7c5](https://github.com/rxb3rth/nuxt-feature-flags/commit/de3b7c5))

### ❤️ Contributors

- Rxb3rth <reliutg@gmail.com>

## v1.1.3

[compare changes](https://github.com/rxb3rth/nuxt-feature-flags/compare/v1.1.2...v1.1.3)

### 🩹 Fixes

- Improve type definitions and enhance runtime configuration handling ([465b28a](https://github.com/rxb3rth/nuxt-feature-flags/commit/465b28a))
- Refactor flag handling to support function-based definitions and improve runtime config assignment ([ba9f08f](https://github.com/rxb3rth/nuxt-feature-flags/commit/ba9f08f))

### ❤️ Contributors

- Rxb3rth <reliutg@gmail.com>

