import type { ModifierSettings } from './types.ts'

/** Wiki bonuses are given in percentage points; they are assumed to stack additively. */
export function speedMultiplier(m: ModifierSettings): number {
  return 1 + (m.guild ? 0.5 : 0) + (m.catalyst ? 0.25 : 0) + (m.steam ? 1 : 0) + m.extraPercent / 100
}
