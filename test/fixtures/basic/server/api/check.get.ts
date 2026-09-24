export default defineEventHandler(async (event) => {
  const { isEnabled, getVariant } = await getFeatureFlags(event)
  return {
    isAdmin: isEnabled('isAdmin'),
    variant: getVariant('checkout'),
  }
})
