import { expect, it } from 'vitest'
import { speedMultiplier } from './speed.ts'
import { NO_MODIFIERS } from './types.ts'

it('stacks bonuses additively', () => {
  expect(speedMultiplier(NO_MODIFIERS)).toBe(1)
  expect(speedMultiplier({ ...NO_MODIFIERS, guild: true })).toBe(1.5)
  expect(speedMultiplier({ ...NO_MODIFIERS, guild: true, catalyst: true, steam: true })).toBe(2.75)
  expect(speedMultiplier({ ...NO_MODIFIERS, extraPercent: 100 })).toBe(2)
  expect(speedMultiplier({ ...NO_MODIFIERS, extraPercent: -60 })).toBeCloseTo(0.4)
})
