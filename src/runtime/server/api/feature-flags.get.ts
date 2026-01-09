import { eventHandler } from 'h3'
import { resolveFeatureFlags } from '../utils/feature-flags'

export default eventHandler(async (event) => {
  const flags = await resolveFeatureFlags(event)
  return flags
})
