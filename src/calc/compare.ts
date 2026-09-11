import type { DatasetIndex } from '../data/index.ts'
import type { Item } from '../data/types.ts'
import { solve } from './solve.ts'
import type { SolveInput, SolveResult, Step } from './types.ts'

export interface FoodOption {
  itemId: string
  result: SolveResult
  /** Workers for the rounded-up building counts; null when a building's worker count is unknown. */
  workers: number | null
  /** Workers for fractional building counts, to rank options the rounding ties. */
  workersExact: number
}

/** Producible foods grouped by quality in stars, lowest first. */
export function foodTiers(index: DatasetIndex): [number, Item[]][] {
  const tiers = new Map<number, Item[]>()
  for (const item of index.dataset.items) {
    if (item.quality === undefined || !index.recipesByOutput.has(item.id)) continue
    tiers.set(item.quality, [...(tiers.get(item.quality) ?? []), item])
  }
  return [...tiers].sort(([a], [b]) => a - b)
}

/** Workers staffing the rounded-up building counts of every step. */
export function chainWorkers(index: DatasetIndex, steps: Step[]): number | null {
  let total = 0
  for (const s of steps) {
    const workers = index.buildingsById.get(s.buildingId)?.workers
    if (workers === null || workers === undefined) return null
    total += s.buildingsCeil * workers
  }
  return total
}

function exactWorkers(index: DatasetIndex, steps: Step[]): number {
  return steps.reduce((sum, s) => sum + s.buildings * (index.buildingsById.get(s.buildingId)?.workers ?? 0), 0)
}

/** Every producible food of the given quality, solved for the same rate, fewest workers first. */
export function compareFoods(index: DatasetIndex, input: Omit<SolveInput, 'targetItem'>, quality: number): FoodOption[] {
  const foods = index.dataset.items.filter((i) => i.quality === quality && index.recipesByOutput.has(i.id))
  return foods
    .map((item) => {
      const result = solve(index, { ...input, targetItem: item.id })
      return { itemId: item.id, result, workers: chainWorkers(index, result.steps), workersExact: exactWorkers(index, result.steps) }
    })
    .sort(
      (a, b) =>
        (a.workers ?? Infinity) - (b.workers ?? Infinity) ||
        a.workersExact - b.workersExact ||
        index.itemsById.get(a.itemId)!.name.localeCompare(index.itemsById.get(b.itemId)!.name),
    )
}
