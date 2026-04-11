import { useFeatureFlags } from '#imports'

export const vFeature = {
  mounted(el: HTMLElement, binding: { value: string }) {
    const { isEnabled } = useFeatureFlags()
    const flagName = binding.value

    if (!isEnabled(flagName)) {
      el.parentNode?.removeChild(el)
    }
  },
}
