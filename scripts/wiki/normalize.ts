import type { Building, Dataset, DatasetMeta, Guild, Ingredient, Item, NamedIngredient, Overrides, Recipe } from '../../src/data/types.ts'
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

const wikiUrl = (name: string) => `${WIKI_BASE}/${name.replace(/ /g, '_')}`

export function buildDataset(parsed: ParsedBuilding[], overrides: Overrides, meta: DatasetMeta): BuildResult {
  const warnings: string[] = []
  const items = new Map<string, Item>()
  const ingredient = (name: string, qty: number, icon?: string): Ingredient => {
    const display = canonicalItemName(name, overrides.itemAliases)
    const id = slug(display)
    const item = items.get(id) ?? { id, name: display }
    items.set(id, item)
    if (icon) {
      if (item.icon === undefined) item.icon = icon
      else if (item.icon !== icon) warnings.push(`${display}: icon ${icon} differs from ${item.icon}`)
    }
    return { item: id, qty }
  }
  const named = (list: NamedIngredient[]) => list.map((i) => ingredient(i.item, i.qty))

  const buildings: Building[] = []
  const recipes: Recipe[] = []
  const used = new Set<string>()
  const recipeId = (buildingId: string, inputs: Ingredient[], outputs: Ingredient[]) => {
    let rid = `${buildingId}/${outputs[0].item}`
    if (used.has(rid) && inputs.length) rid += `-from-${inputs[0].item}`
    for (let n = 2; used.has(rid); n++) rid = `${buildingId}/${outputs[0].item}-${n}`
    used.add(rid)
    return rid
  }

  const sorted = [...parsed].sort((a, b) => a.name.localeCompare(b.name))
  for (const p of sorted) {
    const id = slug(p.name)
    const guild = guildFromText(p.guildText)
    if (p.guildText !== null && !guild) warnings.push(`${p.name}: unknown guild text ${JSON.stringify(p.guildText)}`)
    const ov = overrides.buildings[id] ?? {}
    const building: Building = {
      id,
      name: p.name,
      workers: ov.workers ?? p.workers,
      guild: ov.guild ?? guild,
      catalyst: ov.catalyst ?? p.catalyst,
      cost: ov.cost ? named(ov.cost) : p.cost.map(([n, q]) => ingredient(n, q, p.icons[n])),
      wikiUrl: wikiUrl(p.name),
      ...(p.image !== null && { icon: p.image }),
    }
    if (building.workers === null) warnings.push(`${p.name}: no worker count`)
    if (p.image === null) warnings.push(`${p.name}: no infobox image`)
    if (building.cost.length === 0) warnings.push(`${p.name}: no construction cost`)
    buildings.push(building)

    for (const raw of p.recipes) {
      const inputs = raw.inputs.map(([n, q]) => ingredient(n, q, p.icons[n]))
      const outputs = raw.outputs.map(([n, q]) => ingredient(n, q, p.icons[n]))
      const rid = recipeId(id, inputs, outputs)
      const rov = overrides.recipes[rid]
      recipes.push({
        id: rid,
        building: id,
        inputs: rov?.inputs ? named(rov.inputs) : inputs,
        outputs: rov?.outputs ? named(rov.outputs) : outputs,
        timeSeconds: rov?.timeSeconds ?? raw.timeSeconds,
        ...(raw.tilesPerBuilding !== undefined && { tilesPerBuilding: raw.tilesPerBuilding }),
        ...(raw.note !== undefined && { note: raw.note }),
      })
    }
  }
  for (const rid of Object.keys(overrides.recipes)) {
    if (!recipes.some((r) => r.id === rid)) warnings.push(`override for unknown recipe ${rid}`)
  }

  for (const [id, b] of Object.entries(overrides.extraBuildings)) {
    if (buildings.some((x) => x.id === id)) warnings.push(`extra building ${id} duplicates a scraped building`)
    buildings.push({ id, name: b.name, workers: b.workers, guild: b.guild, catalyst: b.catalyst, cost: named(b.cost), wikiUrl: wikiUrl(b.name), icon: b.icon })
  }
  for (const r of overrides.extraRecipes) {
    if (!buildings.some((b) => b.id === r.building)) {
      warnings.push(`extra recipe for unknown building ${r.building} skipped`)
      continue
    }
    const inputs = named(r.inputs)
    const outputs = named(r.outputs)
    recipes.push({
      id: recipeId(r.building, inputs, outputs),
      building: r.building,
      inputs,
      outputs,
      timeSeconds: r.timeSeconds,
      ...(r.tilesPerBuilding !== undefined && { tilesPerBuilding: r.tilesPerBuilding }),
      ...(r.note !== undefined && { note: r.note }),
    })
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

  for (const [name, quality] of Object.entries(overrides.foods)) {
    const item = items.get(slug(canonicalItemName(name, overrides.itemAliases)))
    if (item) {
      item.food = true
      item.quality = quality
    } else warnings.push(`food ${name} is not an item`)
  }

  for (const [name, icon] of Object.entries(overrides.itemIcons)) {
    const item = items.get(slug(canonicalItemName(name, overrides.itemAliases)))
    if (!item) warnings.push(`itemIcons ${name} is not an item`)
    else if (item.icon === undefined) item.icon = icon
    else if (item.icon !== icon) warnings.push(`itemIcons ${name} ignored: the wiki shows ${item.icon}`)
  }
  for (const item of items.values()) {
    if (item.icon === undefined) warnings.push(`${item.name}: no icon (add it to itemIcons)`)
  }

  const produced = new Set(recipes.flatMap((r) => r.outputs.map((o) => o.item)))
  const rawItems = [...items.keys()].filter((i) => !produced.has(i)).sort()

  return {
    dataset: {
      ...meta,
      items: [...items.values()].sort((a, b) => a.id.localeCompare(b.id)),
      buildings,
      recipes,
    },
    warnings,
    rawItems,
  }
}
