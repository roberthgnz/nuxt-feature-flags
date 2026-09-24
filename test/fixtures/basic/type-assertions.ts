const { isEnabled, getVariant } = useFeatureFlags()
isEnabled('newDashboard')
isEnabled('inlineOnly')
isEnabled('checkout:control')
getVariant('checkout')
// @ts-expect-error unknown flag
isEnabled('newDashbaord')
// @ts-expect-error unknown flag
getVariant('nope')
