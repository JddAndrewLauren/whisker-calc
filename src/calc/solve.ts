import type { DatasetIndex } from '../data/index.ts'
import type { Recipe } from '../data/types.ts'
import { speedMultiplier } from './speed.ts'
import { NO_MODIFIERS, type SolveInput, type SolveResult, type Step } from './types.ts'

export function producerFor(index: DatasetIndex, itemId: string, choice: Record<string, string>): Recipe | undefined {
  const chosen = choice[itemId]
  if (chosen) {
    const r = index.recipesById.get(chosen)
    if (r && r.outputs.some((o) => o.item === itemId)) return r
  }
  return index.recipesByOutput.get(itemId)?.[0]
}

export function solve(index: DatasetIndex, input: SolveInput): SolveResult {
  const demand = new Map<string, number>()
  const depthOf = new Map<string, number>()
  const raw = new Map<string, number>()
  const warnings: string[] = []

  const propagate = (itemId: string, rate: number, depth: number, path: string[]) => {
    if (path.includes(itemId)) {
      warnings.push(`cycle: ${[...path, itemId].join(' -> ')}`)
      raw.set(itemId, (raw.get(itemId) ?? 0) + rate)
      return
    }
    const recipe = producerFor(index, itemId, input.recipeChoice)
    if (!recipe) {
      raw.set(itemId, (raw.get(itemId) ?? 0) + rate)
      return
    }
    demand.set(recipe.id, (demand.get(recipe.id) ?? 0) + rate)
    depthOf.set(recipe.id, Math.max(depthOf.get(recipe.id) ?? 0, depth))
    const outQty = recipe.outputs.find((o) => o.item === itemId)!.qty
    const crafts = rate / outQty
    for (const i of recipe.inputs) propagate(i.item, crafts * i.qty, depth + 1, [...path, itemId])
  }

  if (input.ratePerMin > 0) propagate(input.targetItem, input.ratePerMin, 0, [])

  const steps: Step[] = []
  for (const [recipeId, demandPerMin] of demand) {
    const recipe = index.recipesById.get(recipeId)!
    const building = index.buildingsById.get(recipe.building)
    const speed = speedMultiplier({ ...NO_MODIFIERS, ...input.modifiers[recipe.building] })
    const itemId = recipe.outputs[0].item
    const ratePerBuilding = (recipe.outputs[0].qty * 60 * speed) / recipe.timeSeconds
    const buildings = demandPerMin / ratePerBuilding
    steps.push({
      recipeId,
      buildingId: recipe.building,
      itemId,
      demandPerMin,
      ratePerBuilding,
      buildings,
      buildingsCeil: Math.ceil(buildings - 1e-9),
      workers: building?.workers ?? null,
      speedMultiplier: speed,
      depth: depthOf.get(recipeId) ?? 0,
    })
  }
  steps.sort((a, b) => a.depth - b.depth || a.buildingId.localeCompare(b.buildingId))

  return {
    steps,
    raw: [...raw].map(([itemId, perMin]) => ({ itemId, perMin })).sort((a, b) => a.itemId.localeCompare(b.itemId)),
    warnings,
  }
}
