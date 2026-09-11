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
  /** Food quality in stars, 0-4, from the game's meal table; present when `food` is. */
  quality?: number
  /** Wiki file name of the in-game icon, e.g. "Tex wood 07.png"; absent when the scraper found none. */
  icon?: string
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
  /** Wiki file name of the infobox picture, e.g. "Bakery.PNG"; absent when the page has none. */
  icon?: string
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
  /** Where the numbers come from when they are not straight from the game's data tables. */
  note?: string
}

/** 'tables': the game's own DataTables (data/dumps). 'wiki': scraped from the official wiki. */
export type DatasetSource = 'tables' | 'wiki'

export interface Dataset {
  generatedAt: string
  source: DatasetSource
  /** Whiskerwood version the numbers belong to (Content/Movies/Version.txt), or "unknown" for wiki data. */
  gameVersion: string
  items: Item[]
  buildings: Building[]
  recipes: Recipe[]
}

export type DatasetMeta = Pick<Dataset, 'generatedAt' | 'source' | 'gameVersion'>

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
  extraBuildings: Record<string, { name: string; workers: number; guild: Guild | null; catalyst: string | null; cost: NamedIngredient[]; icon: string }>
  /** Hand-authored recipes for extra buildings. */
  extraRecipes: {
    building: string
    inputs: NamedIngredient[]
    outputs: NamedIngredient[]
    timeSeconds: number
    tilesPerBuilding?: number
    note?: string
  }[]
  /** Crop display name -> farm land one Farm tends at base speed. No game table records this. */
  farmTiles: Record<string, number>
  /** Display name -> quality in stars (0-4) of every item that satisfies hunger. */
  foods: Record<string, number>
  /** Display name -> wiki icon file, for items that never appear in a scraped recipe table. */
  itemIcons: Record<string, string>
  /** Wiki icon file used as the site favicon. */
  favicon: string
}

export type LedgerStatus = 'unreviewed' | 'needs-verification' | 'applied' | 'not-applicable' | 'superseded'

export interface EntityHit {
  kind: 'building' | 'item'
  id: string
  /** Only the last word of a multi-word name appeared ("Vises" for Wooden Vises). */
  partial: boolean
}

export type Confidence = 'high' | 'medium' | 'low' | 'none'

/** Numbers a balance line states, kept as written ("5:8", "89"). */
export interface NumericHint {
  from?: string
  to?: string
  unit?: string
  factor?: number
  percent?: number
}

/** One balance line from a Steam patch post, with the review state that survives re-fetching. */
export interface LedgerEntry {
  /** `${gid}:${hash}`: first 8 hex chars of sha1(`version|section|text`), so ids survive a post being re-edited; an exact duplicate bullet gets "-2". */
  id: string
  gid: string
  /** Bullet ordinal within the post, for ordering only. */
  index: number
  version: string
  patch: number
  /** Post date, UTC. */
  date: string
  section: string
  text: string
  entities: EntityHit[]
  /** Candidate recipe ids, best first. */
  recipes: string[]
  confidence: Confidence
  numbers: NumericHint | null
  status: LedgerStatus
  /** Free text: what was done about the line. */
  resolution: string
}

export interface PatchLedger {
  entries: LedgerEntry[]
}
