export type Guild = 'Engineer' | 'Explorer' | 'Farmer' | 'Miner'

export interface Ingredient {
  /** Item id (slug). */
  item: string
  qty: number
}

export interface Item {
  id: string
  name: string
}

export interface Building {
  id: string
  name: string
  /** Worker slots; null when the wiki page did not yield a number. */
  workers: number | null
  guild: Guild | null
  /** Display name of the catalyst item, e.g. "Scissors". */
  catalyst: string | null
  wikiUrl: string
}

export interface Recipe {
  id: string
  /** Building id. */
  building: string
  inputs: Ingredient[]
  outputs: Ingredient[]
  timeSeconds: number
}

export interface Dataset {
  generatedAt: string
  source: string
  items: Item[]
  buildings: Building[]
  recipes: Recipe[]
}

/** Hand-maintained fixes applied on top of the scraped wiki data. Item names are display names. */
export interface Overrides {
  /** Canonical display name -> replacement display name. */
  itemAliases: Record<string, string>
  /** Building id -> field overrides. */
  buildings: Record<string, { workers?: number; guild?: Guild; catalyst?: string }>
  /** Recipe id -> field overrides. Ingredient items are display names. */
  recipes: Record<
    string,
    { inputs?: { item: string; qty: number }[]; outputs?: { item: string; qty: number }[]; timeSeconds?: number }
  >
  /** Item id -> recipe id that should be the default producer. */
  preferredRecipe: Record<string, string>
}
