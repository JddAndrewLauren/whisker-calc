export type Guild = 'Engineer' | 'Explorer' | 'Farmer' | 'Miner'

export interface Ingredient {
  /** Item id (slug). */
  item: string
  qty: number
}

export interface Item {
  id: string
  name: string
  /** Satisfies hunger when eaten (tea does not). */
  food?: true
}

export interface Building {
  id: string
  name: string
  /** Worker slots; null when the wiki page did not yield a number. */
  workers: number | null
  guild: Guild | null
  /** Display name of the catalyst item, e.g. "Scissors". */
  catalyst: string | null
  /** Construction materials. */
  cost: Ingredient[]
  wikiUrl: string
}

export interface Recipe {
  id: string
  /** Building id. */
  building: string
  inputs: Ingredient[]
  outputs: Ingredient[]
  timeSeconds: number
  /** Farm land one building tends at base speed, for crop recipes. */
  tilesPerBuilding?: number
  /** Where the numbers come from when they are not a wiki recipe table. */
  note?: string
}

export interface Dataset {
  generatedAt: string
  source: string
  items: Item[]
  buildings: Building[]
  recipes: Recipe[]
}

/** Ingredient given by display name, as written in overrides. */
export interface NamedIngredient {
  item: string
  qty: number
}

/** Hand-maintained fixes applied on top of the scraped wiki data. Item names are display names. */
export interface Overrides {
  /** Canonical display name -> replacement display name. */
  itemAliases: Record<string, string>
  /** Building id -> field overrides. */
  buildings: Record<string, { workers?: number; guild?: Guild; catalyst?: string; cost?: NamedIngredient[] }>
  /** Recipe id -> field overrides. */
  recipes: Record<string, { inputs?: NamedIngredient[]; outputs?: NamedIngredient[]; timeSeconds?: number }>
  /** Item id -> recipe id that should be the default producer. */
  preferredRecipe: Record<string, string>
  /** Buildings whose wiki page has no recipe table; keyed by building id. */
  extraBuildings: Record<string, { name: string; workers: number; guild: Guild | null; catalyst: string | null; cost: NamedIngredient[] }>
  /** Hand-authored recipes for extra buildings. */
  extraRecipes: {
    building: string
    inputs: NamedIngredient[]
    outputs: NamedIngredient[]
    timeSeconds: number
    tilesPerBuilding?: number
    note?: string
  }[]
  /** Display names of items that satisfy hunger. */
  foods: string[]
}
