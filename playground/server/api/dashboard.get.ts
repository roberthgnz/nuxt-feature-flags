export default defineEventHandler(async (event) => {
  const { isEnabled, flags, getVariant, getValue } = await getFeatureFlags(event)

  console.log('New request: ' + getRequestURL(event))
  console.log('newDashboard.isEnabled', isEnabled('newDashboard'))
  console.log('isAdmin', isEnabled('isAdmin'))

  // Demo variant usage
  console.log('abTestExample variant:', getVariant('abTestExample'))
  console.log('abTestExample value:', getValue('abTestExample'))
  console.log('buttonColor variant:', getVariant('buttonColor'))
  console.log('buttonColor value:', getValue('buttonColor'))
  console.log('premiumFeature variant:', getVariant('premiumFeature'))
  console.log('premiumFeature has premium:', getValue('premiumFeature'))

  return {
    flags,
    variants: {
      abTestExample: {
        variant: getVariant('abTestExample'),
        value: getValue('abTestExample'),
      },
      buttonColor: {
        variant: getVariant('buttonColor'),
        value: getValue('buttonColor'),
      },
      premiumFeature: {
        variant: getVariant('premiumFeature'),
        hasPremium: getValue('premiumFeature'),
      },
    },
  }
})
