export interface ModifierSettings {
  /** Staffed by the building's preferred guild: +50%. */
  guild: boolean
  /** Catalyst in use: +25%. */
  catalyst: boolean
  /** Adjacent running Steam Engine: +100%. */
  steam: boolean
  /** Any other bonus or penalty, in percentage points. */
  extraPercent: number
}

export const NO_MODIFIERS: ModifierSettings = { guild: false, catalyst: false, steam: false, extraPercent: 0 }

export interface SolveInput {
  targetItem: string
  ratePerMin: number
  /** Item id -> recipe id. Absent means the dataset's first producer. */
  recipeChoice: Record<string, string>
  /** Building id -> modifier settings. Absent means no modifiers. */
  modifiers: Record<string, Partial<ModifierSettings>>
}

/** How the user states the target: a rate, a population to feed, or a number of producing buildings. */
export type TargetMode = 'rate' | 'population' | 'buildings'

export interface Target extends Omit<SolveInput, 'ratePerMin'> {
  mode: TargetMode
  ratePerMin: number
  population: number
  buildingCount: number
}

export interface Step {
  recipeId: string
  buildingId: string
  itemId: string
  /** Units of the output item needed per minute. */
  demandPerMin: number
  /** Output units one building makes per minute, after modifiers. */
  ratePerBuilding: number
  buildings: number
  buildingsCeil: number
  workers: number | null
  speedMultiplier: number
  depth: number
  /** Farm land needed, for crop recipes. Independent of speed modifiers. */
  tiles?: number
}

export interface SolveResult {
  steps: Step[]
  raw: { itemId: string; perMin: number }[]
  warnings: string[]
}
