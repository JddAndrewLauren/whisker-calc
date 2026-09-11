import { expect, it } from 'vitest'
import { loadDataset } from '../data/index.ts'
import { chainCost } from './cost.ts'
import { solve } from './solve.ts'

const data = loadDataset()

it('sums construction materials over the rounded-up buildings', () => {
  const r = solve(data, { targetItem: 'tailored-clothes', ratePerMin: 1, recipeChoice: {}, modifiers: {} })
  // 2 tailors (13 planks, 8 cut stone, 1 machinery), 2 weavers (21 logs, 1 machinery), 1 cotton gin (8 planks, 13 cut stone, 1 machinery), 1 farm (8 planks)
  expect(chainCost(data, r.steps)).toEqual([
    { item: 'logs', qty: 42 },
    { item: 'planks', qty: 42 },
    { item: 'cut-stone', qty: 29 },
    { item: 'machinery', qty: 5 },
  ])
})

it('is empty without steps', () => {
  expect(chainCost(data, [])).toEqual([])
})
