import { readFileSync } from 'node:fs'
import type { Overrides } from '../../src/data/types.ts'
import { BUILDING_TITLES } from '../wiki/buildings.ts'
import { fetchWikitext } from '../wiki/fetch.ts'
import { buildDataset } from '../wiki/normalize.ts'
import { parseBuildingPage } from '../wiki/parseBuildingPage.ts'
import { tablesToParsed } from './importTables.ts'
import { readIndex } from './readIndex.ts'
import { latestVersionDir } from './versions.ts'

/** Print where the wiki and the game's tables disagree, so every wiki error surfaces at once. */
const overrides = JSON.parse(readFileSync(new URL('../../src/data/overrides.json', import.meta.url), 'utf8')) as Overrides
const dumpsDir = new URL('../../data/dumps/', import.meta.url)
const gameVersion = process.argv[2] ?? latestVersionDir(dumpsDir)
if (!gameVersion) throw new Error('no dumps under data/dumps; run npm run dump')
const meta = { generatedAt: 'compare', gameVersion }

/** Known wiki quirks (names and mislabeled icons) so the table only shows real disagreements. */
const wikiOverrides: Overrides = {
  ...overrides,
  itemAliases: { ...overrides.itemAliases, Copper: 'Copper Ore', Iron: 'Iron Bars', Mushroom: 'Mushrooms', Plank: 'Planks', Wood: 'Logs' },
  buildings: { ...overrides.buildings, 'oil-press': { cost: [{ item: 'Planks', qty: 13 }, { item: 'Cut Stone', qty: 13 }, { item: 'Iron Bars', qty: 3 }, { item: 'Machinery', qty: 1 }] } },
  recipes: {
    ...overrides.recipes,
    'tea-roaster/tea': { inputs: [{ item: 'Tea Leaves', qty: 1 }, { item: 'Fuel', qty: 1 }] },
    'tea-roaster/fine-tea': { inputs: [{ item: 'Tea Leaves', qty: 2 }, { item: 'Spices', qty: 1 }, { item: 'Fuel', qty: 1 }] },
  },
}

const pages = await fetchWikitext(BUILDING_TITLES)
const wiki = buildDataset(BUILDING_TITLES.map((t) => parseBuildingPage(t, pages.get(t)!)), wikiOverrides, { ...meta, source: 'wiki' }).dataset
const { parsed, foods } = tablesToParsed(readIndex(new URL(`${gameVersion}/DataTableIndex.json`, dumpsDir)), overrides.farmTiles)
const tables = buildDataset(parsed, { ...overrides, foods: [...overrides.foods, ...foods] }, { ...meta, source: 'tables' }).dataset

const show = (v: unknown) => (Array.isArray(v) ? v.map((i: { item: string; qty: number }) => `${i.qty} ${i.item}`).join(' + ') : String(v))
const rows: { id: string; field: string; wiki: string; tables: string }[] = []
const diff = <T extends object>(kind: string, a: T[], b: T[], fields: (keyof T)[]) => {
  const byId = (list: T[]) => new Map(list.map((x) => [(x as { id: string }).id, x]))
  const [wa, tb] = [byId(a), byId(b)]
  for (const [id, w] of wa) {
    const t = tb.get(id)
    if (!t) continue
    for (const f of fields) if (JSON.stringify(w[f]) !== JSON.stringify(t[f])) rows.push({ id, field: `${kind}.${String(f)}`, wiki: show(w[f]), tables: show(t[f]) })
  }
  console.log(`${kind} only in wiki: ${[...wa.keys()].filter((id) => !tb.has(id)).join(', ') || '-'}`)
  console.log(`${kind} only in tables: ${[...tb.keys()].filter((id) => !wa.has(id)).join(', ') || '-'}`)
}
diff('building', wiki.buildings, tables.buildings, ['workers', 'guild', 'catalyst', 'cost'])
diff('recipe', wiki.recipes, tables.recipes, ['inputs', 'outputs', 'timeSeconds'])
console.table(rows)
