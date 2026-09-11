import { describe, expect, it } from 'vitest'
import { buildIndex, loadDataset } from '../data/index.ts'
import { chainWorkers, compareFoods, foodTiers } from './compare.ts'
import { solve } from './solve.ts'

const data = loadDataset()
const feed100 = { ratePerMin: 100 / 9, recipeChoice: {}, modifiers: {} }
const feed50 = { ...feed100, ratePerMin: 50 / 9 }

describe('foodTiers', () => {
  it('groups producible foods by stars, lowest first', () => {
    const tiers = foodTiers(data).map(([stars, foods]) => [stars, foods.map((f) => f.id).sort()])
    expect(tiers).toEqual([
      [0, ['canned-food', 'fish']],
      [1, ['berries', 'mushrooms']],
      [2, ['berry-soup', 'bread', 'smoked-fish']],
      [3, ['fish-skewers', 'jam-pastries', 'mushroom-stew']],
      [4, ['fancy-meals', 'hearty-meals', 'savory-meals']],
    ])
  })
})

describe('chainWorkers', () => {
  it('staffs the rounded-up building counts', () => {
    const { steps } = solve(data, { ...feed100, targetItem: 'bread' })
    const expected = steps.reduce((sum, s) => sum + s.buildingsCeil * data.buildingsById.get(s.buildingId)!.workers!, 0)
    expect(chainWorkers(data, steps)).toBe(expected)
    expect(expected).toBeGreaterThan(0)
  })

  it('is null when a building has no worker count', () => {
    const { steps } = solve(data, { ...feed100, targetItem: 'bread' })
    const index = { ...data, buildingsById: new Map(data.buildingsById) }
    index.buildingsById.set('bakery', { ...data.buildingsById.get('bakery')!, workers: null })
    expect(chainWorkers(index, steps)).toBeNull()
  })
})

describe('compareFoods', () => {
  it('lists exactly the foods of that quality, fewest workers first', () => {
    const options = compareFoods(data, feed100, 3)
    expect(options.map((o) => o.itemId).sort()).toEqual(['fish-skewers', 'jam-pastries', 'mushroom-stew'])
    const workers = options.map((o) => o.workers!)
    expect(workers).toEqual([...workers].sort((a, b) => a - b))
    for (const o of options) expect(o.workers).toBe(chainWorkers(data, o.result.steps))
  })

  it('applies building modifiers to every chain', () => {
    const plain = compareFoods(data, feed100, 2).find((o) => o.itemId === 'bread')!
    const boosted = compareFoods(data, { ...feed100, modifiers: { bakery: { steam: true } } }, 2).find((o) => o.itemId === 'bread')!
    expect(boosted.workersExact).toBeLessThan(plain.workersExact)
  })

  it('breaks ties by name', () => {
    const twin = { ...data.itemsById.get('fish')!, id: 'aardvark-fish', name: 'Aardvark Fish' }
    const recipe = { ...data.recipesById.get('fishing-dock/fish')!, id: 'fishing-dock/aardvark-fish', outputs: [{ item: 'aardvark-fish', qty: 1 }] }
    const index = buildIndex({ ...data.dataset, items: [...data.dataset.items, twin], recipes: [...data.dataset.recipes, recipe] })
    const [first, second] = compareFoods(index, feed50, 0).filter((o) => o.itemId.endsWith('fish'))
    expect([first.itemId, second.itemId]).toEqual(['aardvark-fish', 'fish'])
    expect(first.workers).toBe(second.workers)
  })

  it('is empty for a quality no producible food has', () => {
    expect(compareFoods(data, feed100, 9)).toEqual([])
  })
})
