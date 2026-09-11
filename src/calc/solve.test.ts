import { describe, expect, it } from 'vitest'
import { buildIndex, loadDataset } from '../data/index.ts'
import type { Dataset } from '../data/types.ts'
import { solve } from './solve.ts'
import type { SolveInput } from './types.ts'

const data = loadDataset()
const base: SolveInput = { targetItem: 'tailored-clothes', ratePerMin: 1, recipeChoice: {}, modifiers: {} }
const step = (r: ReturnType<typeof solve>, buildingId: string) => r.steps.find((s) => s.buildingId === buildingId)!

describe('solve: tailored clothes chain from the wiki data', () => {
  it('needs 1.2 tailors, 1.94 weavers, 0.45 cotton gins for 1 cloak/min', () => {
    const r = solve(data, base)
    expect(r.warnings).toEqual([])
    expect(r.steps.map((s) => s.buildingId)).toEqual(['tailor', 'weaver', 'cotton-gin'])
    expect(step(r, 'tailor').buildings).toBeCloseTo(1.2, 3)
    expect(step(r, 'weaver').demandPerMin).toBeCloseTo(1.5, 6)
    expect(step(r, 'weaver').buildings).toBeCloseTo(1.942, 3)
    expect(step(r, 'cotton-gin').buildings).toBeCloseTo(0.45, 3)
    expect(step(r, 'weaver').buildings / step(r, 'cotton-gin').buildings).toBeCloseTo(4.31, 2)
    expect(step(r, 'weaver').buildingsCeil).toBe(2)
    expect(step(r, 'weaver').workers).toBe(3)
    expect(r.raw).toEqual([{ itemId: 'cotton', perMin: expect.closeTo(0.1875, 6) }])
  })

  it('switches the thread producer to the flax spinner', () => {
    const r = solve(data, { ...base, recipeChoice: { threads: 'flax-spinner/threads' } })
    expect(step(r, 'flax-spinner').buildings).toBeCloseTo(1.5 / ((3 * 60) / 89), 3)
    expect(r.raw).toEqual([{ itemId: 'flax', perMin: expect.closeTo(1, 6) }])
  })

  it('applies per-building modifiers', () => {
    const r = solve(data, { ...base, modifiers: { weaver: { guild: true, catalyst: true }, 'cotton-gin': { extraPercent: 100 } } })
    expect(step(r, 'weaver').buildings).toBeCloseTo(1.942 / 1.75, 3)
    expect(step(r, 'cotton-gin').buildings).toBeCloseTo(0.225, 3)
    expect(step(r, 'tailor').buildings).toBeCloseTo(1.2, 3)
  })

  it('handles a recipe with no inputs', () => {
    const r = solve(data, { ...base, targetItem: 'fish', ratePerMin: 10 })
    expect(r.steps).toHaveLength(1)
    expect(step(r, 'fishing-dock').buildings).toBeCloseTo(10 / (60 / 21), 3)
    expect(r.raw).toEqual([])
  })

  it('returns nothing for a zero rate', () => {
    expect(solve(data, { ...base, ratePerMin: 0 })).toEqual({ steps: [], raw: [], warnings: [] })
  })
})

describe('solve: synthetic datasets', () => {
  const synthetic: Dataset = {
    generatedAt: 'test',
    source: 'test',
    items: ['a', 'b', 'c', 'raw'].map((id) => ({ id, name: id })),
    buildings: ['ba', 'bb', 'bc'].map((id) => ({ id, name: id, workers: 1, guild: null, catalyst: null, wikiUrl: '' })),
    recipes: [
      { id: 'ba/a', building: 'ba', inputs: [{ item: 'b', qty: 1 }, { item: 'c', qty: 1 }], outputs: [{ item: 'a', qty: 1 }], timeSeconds: 60 },
      { id: 'bb/b', building: 'bb', inputs: [{ item: 'c', qty: 2 }], outputs: [{ item: 'b', qty: 1 }], timeSeconds: 60 },
      { id: 'bc/c', building: 'bc', inputs: [{ item: 'raw', qty: 1 }], outputs: [{ item: 'c', qty: 1 }], timeSeconds: 60 },
    ],
  }

  it('aggregates demand for an item used by several consumers and reports the deepest depth', () => {
    const r = solve(buildIndex(synthetic), { ...base, targetItem: 'a', ratePerMin: 1 })
    const c = step(r, 'bc')
    expect(c.demandPerMin).toBe(3)
    expect(c.depth).toBe(2)
    expect(r.steps.map((s) => s.buildingId)).toEqual(['ba', 'bb', 'bc'])
  })

  it('warns on cycles instead of hanging', () => {
    const cyclic: Dataset = {
      ...synthetic,
      recipes: [{ id: 'ba/a', building: 'ba', inputs: [{ item: 'a', qty: 1 }], outputs: [{ item: 'a', qty: 2 }], timeSeconds: 60 }],
    }
    const r = solve(buildIndex(cyclic), { ...base, targetItem: 'a', ratePerMin: 1 })
    expect(r.warnings).toEqual(['cycle: a -> a'])
    expect(r.raw).toEqual([{ itemId: 'a', perMin: 0.5 }])
  })
})
