import type { DatasetIndex } from '../data/index.ts'
import { buildingSpeed, producerFor, ratePerBuilding } from './solve.ts'
import type { Target } from './types.ts'

/**
 * Working seconds in one in-game day. The Farmer's Almanac gives 0.05 years of growth as
 * "864 seconds / 1.6 days", so a day is 540 s of working time.
 */
export const DAY_SECONDS = 540
/** Whiskers seek one meal each evening. Miners and Heavy Eaters take one more. */
export const MEALS_PER_DAY = 1

/** Items per minute the target mode asks for. */
export function targetRate(index: DatasetIndex, t: Target): number {
  switch (t.mode) {
    case 'population':
      return (t.population * MEALS_PER_DAY) / (DAY_SECONDS / 60)
    case 'buildings': {
      const recipe = producerFor(index, t.targetItem, t.recipeChoice)
      if (!recipe) return 0
      return t.buildingCount * ratePerBuilding(recipe, buildingSpeed(t, recipe.building))
    }
    default:
      return t.ratePerMin
  }
}
