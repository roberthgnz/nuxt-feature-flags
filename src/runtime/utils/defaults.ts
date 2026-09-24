export const DEFAULTS = {
  // Function configs are evaluated per request unless the user opts into sharing results.
  CACHE_TTL: 0,
  API_ROUTE: '/api/_feature-flags/feature-flags',
  STATE_KEY: 'feature-flags',
} as const
