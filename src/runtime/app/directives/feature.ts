import { shallowRef, watchEffect } from 'vue'
import type { ObjectDirective, ShallowRef, WatchStopHandle } from 'vue'
import type { ResolvedFlags } from '../../types'
import { isFlagEnabled } from '../../shared/helpers'

interface ElementState {
  flag: ShallowRef<string>
  display: string
  stop: WatchStopHandle
}

/**
 * `v-feature="'flag'"` / `v-feature="'flag:variant'"`: shows the element only when the
 * flag is enabled (or the visitor is in that variant). Works like `v-show`: hidden
 * elements are rendered with `display: none` on the server too, so there is no flash,
 * and they toggle when the flags are refreshed. Use `v-if` + `isEnabled()` to keep
 * the markup out of the page entirely.
 */
export function createFeatureDirective(flags: ResolvedFlags): ObjectDirective<HTMLElement, string> {
  const states = new WeakMap<HTMLElement, ElementState>()

  return {
    beforeMount(el, binding) {
      const flag = shallowRef(binding.value)
      const display = el.style.display === 'none' ? '' : el.style.display
      const stop = watchEffect(() => {
        el.style.display = isFlagEnabled(flags, flag.value) ? display : 'none'
      }, { flush: 'sync' })
      states.set(el, { flag, display, stop })
    },
    updated(el, binding) {
      const state = states.get(el)
      if (state) {
        state.flag.value = binding.value
      }
    },
    unmounted(el) {
      states.get(el)?.stop()
      states.delete(el)
    },
    getSSRProps(binding) {
      return isFlagEnabled(flags, binding.value) ? {} : { style: { display: 'none' } }
    },
  }
}
