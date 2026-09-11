import { describe, expect, it } from 'vitest'
import { loadDataset } from '../data/index.ts'
import { solve } from './solve.ts'
import { targetRate } from './target.ts'
import type { Target } from './types.ts'

const data = loadDataset()
const base: Target = { mode: 'rate', targetItem: 'bread', ratePerMin: 1, population: 0, buildingCount: 0, quality: 3, recipeChoice: {}, modifiers: {} }

describe('targetRate', () => {
  it('passes a rate through', () => {
    expect(targetRate(data, { ...base, ratePerMin: 2.5 })).toBe(2.5)
  })

  it('feeds one meal per whisker per 540 s day', () => {
    expect(targetRate(data, { ...base, mode: 'population', population: 90 })).toBeCloseTo(10, 9)
  })

  it('feeds a population the same way in quality mode', () => {
    expect(targetRate(data, { ...base, mode: 'quality', population: 90 })).toBeCloseTo(10, 9)
  })

  it('turns a building count into the rate the solver would assign it', () => {
    const t: Target = { ...base, mode: 'buildings', targetItem: 'tailored-clothes', buildingCount: 2, modifiers: { tailor: { guild: true } } }
    const rate = targetRate(data, t)
    expect(rate).toBeCloseTo((2 * 2 * 60 * 1.5) / 144, 9)
    expect(solve(data, { ...t, ratePerMin: rate }).steps[0].buildings).toBeCloseTo(2, 9)
  })

  it('gives zero for an item nothing produces', () => {
    expect(targetRate(data, { ...base, mode: 'buildings', targetItem: 'coal', buildingCount: 3 })).toBe(0)
  })
})
