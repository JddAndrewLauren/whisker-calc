import type { ParsedBuilding, RawRecipe } from '../wiki/parseBuildingPage.ts'
import { type Row, type TableIndex, table } from './readIndex.ts'

/** Buildings whose GridactorDefs row lists no recipe but which run one all the same. */
const EXTRA_RECIPE_LINKS: Record<string, string[]> = { steamboiler: ['recipe.boiler'] }

export interface ImportResult {
  parsed: ParsedBuilding[]
  /** Display names of every physical resource the game files as food. */
  foods: string[]
  problems: string[]
}

/**
 * Turn the game's DataTables into the same shape the wiki parser produces, so buildDataset
 * applies ids, aliases and overrides identically. Ships, recipes with no output and outputs
 * that are not physical goods (research, bugtraps, coins) are skipped.
 */
export function tablesToParsed(index: TableIndex, farmTiles: Record<string, number>): ImportResult {
  const problems: string[] = []
  const defs = table(index, 'GridactorDefs_Sync')
  const recipes = table(index, 'AssetLookups/IndustryRecipes')
  const resources = table(index, 'AssetLookups/ResourceLookup')
  const loc = table(index, 'TextDB/Loc_En')
  const crops = table(index, 'AssetLookups/Crops')
  const tunes = table(index, 'SystemTunes')

  const str = (row: Row, col: string): string | null => {
    const v = row[col]
    return typeof v === 'string' && v !== '' && v !== 'None' ? v : null
  }
  const num = (row: Row, col: string, what: string): number => {
    const v = Number(row[col])
    if (!Number.isFinite(v)) problems.push(`${what}: ${col} is not a number (${JSON.stringify(row[col])})`)
    return v
  }
  const text = (key: string, what: string): string => {
    const v = loc[key]?.Value
    if (typeof v !== 'string') {
      problems.push(`${what}: no English text for ${key}`)
      return key
    }
    return v
  }
  const resourceName = (id: string): string => {
    const r = resources[id]
    if (!r) {
      problems.push(`unknown resource ${id}`)
      return id
    }
    return text(String(r.stringKey), `resource ${id}`)
  }
  const physical = (id: string) => resources[id]?.isNonPhysical !== 'True'
  /** "Texture2D'.../Tex_baking_04.Tex_baking_04'" -> "Tex baking 04.png", the name the wiki hosts the same art under. */
  const iconFile = (id: string): string | null => {
    const m = /\/([^/.']+)\.[^/.']+'$/.exec(String(resources[id]?.Icon ?? ''))
    // MediaWiki capitalises the first letter of every file name.
    return m ? m[1][0].toUpperCase() + m[1].slice(1).replace(/_/g, ' ') + '.png' : null
  }
  /** Resource slots like in1/inCt1 .. in4/inCt4 as [resource id, qty]. */
  const slots = (row: Row, idPrefix: string, qtyPrefix: string, n: number, what: string): [string, number][] => {
    const out: [string, number][] = []
    for (let i = 1; i <= n; i++) {
      const id = str(row, `${idPrefix}${i}`)
      if (id) out.push([id, num(row, `${qtyPrefix}${i}`, what)])
    }
    return out
  }
  /** Resource ids that reach the dataset, so foods nothing produces or consumes are left out. */
  const used = new Set<string>()
  /** Raw item name -> icon file, shared by every building like the wiki parser's per-page map. */
  const icons: Record<string, string> = {}
  const named = (list: [string, number][]): [string, number][] =>
    list.map(([id, qty]) => {
      used.add(id)
      const name = resourceName(id)
      const icon = iconFile(id)
      if (icon) icons[name] = icon
      return [name, qty]
    })

  const building = (key: string, row: Row, raw: RawRecipe[]): ParsedBuilding => {
    const name = text(String(row.stringKey), key)
    return {
      name,
      workers: num(row, 'maxAgents_contextual', key),
      guildText: str(row, 'guildSpecialty')?.replace(/^guild_/, '') ?? null,
      catalyst: str(row, 'catalyst') ? resourceName(str(row, 'catalyst')!) : null,
      cost: named(slots(row, 'cost', 'ct', 4, key)),
      recipes: raw,
      // The wiki names every building picture after the building.
      image: `${name}.PNG`,
      icons,
      problems: [],
    }
  }

  const parsed: ParsedBuilding[] = []
  for (const [key, row] of Object.entries(defs)) {
    const listed = Array.isArray(row.supportedIndustryRecipes) ? row.supportedIndustryRecipes : []
    const raw: RawRecipe[] = []
    for (const rk of [...listed, ...(EXTRA_RECIPE_LINKS[key] ?? [])]) {
      const r = recipes[rk]
      if (!r) {
        problems.push(`${key}: unknown recipe ${rk}`)
        continue
      }
      if (str(r, 'shipToSpawn')) continue
      const outputs = slots(r, 'out', 'outCt', 3, rk)
      if (outputs.length === 0 || !outputs.every(([id]) => physical(id))) continue
      raw.push({ inputs: named(slots(r, 'in', 'inCt', 4, rk)), outputs: named(outputs), timeSeconds: num(r, 'recipeTime', rk) })
    }
    if (raw.length) parsed.push(building(key, row, raw))
  }

  const secondsPerYear = num(tunes.SecondsPerYear ?? {}, 'FloatValue', 'SystemTunes.SecondsPerYear')
  const yieldFactor = num(tunes.GlobalCropYieldFactor ?? {}, 'FloatValue', 'SystemTunes.GlobalCropYieldFactor')
  const farmRecipes: RawRecipe[] = []
  for (const [id, crop] of Object.entries(crops)) {
    const [[cropName]] = named([[id, 0]])
    const tiles = farmTiles[cropName]
    if (tiles === undefined) {
      problems.push(`farm: no farmTiles override for ${cropName}`)
      continue
    }
    const years = num(crop, 'GrowthPeriodInYears', id)
    const maxYield = num(crop, 'MaximumYield', id)
    const growth = years * secondsPerYear
    farmRecipes.push({
      inputs: [],
      outputs: [[cropName, tiles * maxYield * yieldFactor]],
      timeSeconds: growth,
      tilesPerBuilding: tiles,
      note: `Crops table: growth ${years} years (${growth} s), max yield ${maxYield} per tile. ${tiles} tiles per Farm is the Farmer's Almanac estimate.`,
    })
  }
  if (defs.farm) parsed.push(building('farm', defs.farm, farmRecipes))
  else problems.push('farm: no GridactorDefs_Sync row')

  const foods = Object.entries(resources)
    .filter(([id, r]) => r.Category === 'food' && used.has(id))
    .map(([id]) => resourceName(id))

  return { parsed, foods, problems }
}
