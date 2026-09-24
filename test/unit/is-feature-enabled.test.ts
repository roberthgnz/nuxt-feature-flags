import { describe, it, expect } from 'vitest'
import { reactive, watchEffect } from 'vue'
import { createFlagsHelpers, isFlagEnabled } from '../../src/runtime/shared/helpers'
import type { ResolvedFlags } from '../../src/runtime/types'

const flags: ResolvedFlags = {
  on: { enabled: true, value: true },
  off: { enabled: false, value: false },
  color: { enabled: true, value: 'green', variant: 'green' },
  rollout: { enabled: false, value: false, variant: 'old' },
}

describe('isFlagEnabled', () => {
  it('checks whether a flag is enabled', () => {
    expect(isFlagEnabled(flags, 'on')).toBe(true)
    expect(isFlagEnabled(flags, 'off')).toBe(false)
    expect(isFlagEnabled(flags, 'missing')).toBe(false)
    expect(isFlagEnabled(flags, '')).toBe(false)
  })

  it('checks the assigned variant with `flag:variant`', () => {
    expect(isFlagEnabled(flags, 'color:green')).toBe(true)
    expect(isFlagEnabled(flags, 'color:red')).toBe(false)
    expect(isFlagEnabled(flags, 'missing:green')).toBe(false)
    expect(isFlagEnabled(flags, 'color:')).toBe(false)
    expect(isFlagEnabled(flags, 'on:undefined')).toBe(false)
  })

  it('matches the variant even when that bucket turns the flag off', () => {
    expect(isFlagEnabled(flags, 'rollout')).toBe(false)
    expect(isFlagEnabled(flags, 'rollout:old')).toBe(true)
  })
})

describe('createFlagsHelpers', () => {
  it('exposes values and variants', () => {
    const { getValue, getVariant, flags: exposed } = createFlagsHelpers(flags)
    expect(exposed).toBe(flags)
    expect(getValue('color')).toBe('green')
    expect(getVariant('color')).toBe('green')
    expect(getValue('missing')).toBeUndefined()
    expect(getVariant('on')).toBeUndefined()
  })

  it('stays reactive over a reactive flags object', () => {
    const state = reactive<ResolvedFlags>({ beta: { enabled: false } })
    const { isEnabled } = createFlagsHelpers(state)
    const seen: boolean[] = []
    watchEffect(() => seen.push(isEnabled('beta')), { flush: 'sync' })

    state.beta = { enabled: true }

    expect(seen).toEqual([false, true])
  })
})
