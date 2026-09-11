import type { Building, Dataset, Guild, Ingredient, Item, Overrides, Recipe } from '../../src/data/types.ts'
import type { ParsedBuilding } from './parseBuildingPage.ts'
import { WIKI_BASE } from './fetch.ts'

/** "Iron ore" -> "Iron Ore", then aliases. */
export function canonicalItemName(raw: string, aliases: Record<string, string> = {}): string {
  const titled = raw
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
  return aliases[titled] ?? titled
}

export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function guildFromText(text: string | null): Guild | null {
  if (!text) return null
  if (/^engin/i.test(text)) return 'Engineer'
  if (/^explor/i.test(text)) return 'Explorer'
  if (/^farm/i.test(text)) return 'Farmer'
  if (/^min/i.test(text)) return 'Miner'
  return null
}

export interface BuildResult {
  dataset: Dataset
  warnings: string[]
  /** Items that no recipe produces. */
  rawItems: string[]
}

export function buildDataset(parsed: ParsedBuilding[], overrides: Overrides, generatedAt: string): BuildResult {
  const warnings: string[] = []
  const items = new Map<string, Item>()
  const ingredient = (name: string, qty: number): Ingredient => {
    const display = canonicalItemName(name, overrides.itemAliases)
    const id = slug(display)
    items.set(id, { id, name: display })
    return { item: id, qty }
  }

  const buildings: Building[] = []
  const recipes: Recipe[] = []
  const sorted = [...parsed].sort((a, b) => a.name.localeCompare(b.name))
  for (const p of sorted) {
    const id = slug(p.name)
    const guild = guildFromText(p.guildText)
    if (!guild) warnings.push(`${p.name}: unknown guild text ${JSON.stringify(p.guildText)}`)
    const ov = overrides.buildings[id] ?? {}
    const building: Building = {
      id,
      name: p.name,
      workers: ov.workers ?? p.workers,
      guild: ov.guild ?? guild,
      catalyst: ov.catalyst ?? p.catalyst,
      wikiUrl: `${WIKI_BASE}/${p.name.replace(/ /g, '_')}`,
    }
    if (building.workers === null) warnings.push(`${p.name}: no worker count`)
    buildings.push(building)

    const used = new Set<string>()
    for (const raw of p.recipes) {
      const inputs = raw.inputs.map(([n, q]) => ingredient(n, q))
      const outputs = raw.outputs.map(([n, q]) => ingredient(n, q))
      let rid = `${id}/${outputs[0].item}`
      if (used.has(rid) && inputs.length) rid += `-from-${inputs[0].item}`
      for (let n = 2; used.has(rid); n++) rid = `${id}/${outputs[0].item}-${n}`
      used.add(rid)
      const rov = overrides.recipes[rid]
      recipes.push({
        id: rid,
        building: id,
        inputs: rov?.inputs ? rov.inputs.map((i) => ingredient(i.item, i.qty)) : inputs,
        outputs: rov?.outputs ? rov.outputs.map((i) => ingredient(i.item, i.qty)) : outputs,
        timeSeconds: rov?.timeSeconds ?? raw.timeSeconds,
      })
    }
  }
  for (const rid of Object.keys(overrides.recipes)) {
    if (!recipes.some((r) => r.id === rid)) warnings.push(`override for unknown recipe ${rid}`)
  }

  for (const [itemId, rid] of Object.entries(overrides.preferredRecipe)) {
    const idx = recipes.findIndex((r) => r.id === rid && r.outputs.some((o) => o.item === itemId))
    if (idx < 0) {
      warnings.push(`preferredRecipe ${itemId} -> ${rid} not found`)
      continue
    }
    const [r] = recipes.splice(idx, 1)
    recipes.unshift(r)
  }

  const produced = new Set(recipes.flatMap((r) => r.outputs.map((o) => o.item)))
  const rawItems = [...items.keys()].filter((i) => !produced.has(i)).sort()

  return {
    dataset: {
      generatedAt,
      source: WIKI_BASE,
      items: [...items.values()].sort((a, b) => a.id.localeCompare(b.id)),
      buildings,
      recipes,
    },
    warnings,
    rawItems,
  }
}
