import type { DatasetIndex } from '../data/index.ts'
import type { Ingredient } from '../data/types.ts'
import type { Step } from './types.ts'

/** Construction materials for the rounded-up building counts of every step. */
export function chainCost(index: DatasetIndex, steps: Step[]): Ingredient[] {
  const total = new Map<string, number>()
  for (const s of steps) {
    for (const c of index.buildingsById.get(s.buildingId)?.cost ?? []) {
      total.set(c.item, (total.get(c.item) ?? 0) + c.qty * s.buildingsCeil)
    }
  }
  return [...total]
    .map(([item, qty]) => ({ item, qty }))
    .sort((a, b) => b.qty - a.qty || a.item.localeCompare(b.item))
}
