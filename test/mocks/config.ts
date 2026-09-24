// Default `#feature-flags/config` for tests. Tests that need a different config use
// `loadServerUtils()` from test/utils.ts, which swaps this module out.
export default {
  simpleFlag: true,
  disabledFlag: false,
  abTestFlag: {
    enabled: true,
    value: 'control',
    variants: [
      { name: 'control', weight: 50, value: 'control' },
      { name: 'treatment', weight: 50, value: 'treatment' },
    ],
  },
}
