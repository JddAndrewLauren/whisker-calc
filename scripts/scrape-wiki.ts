import { readFileSync, writeFileSync } from 'node:fs'
import type { Overrides } from '../src/data/types.ts'
import { BUILDING_TITLES } from './wiki/buildings.ts'
import { fetchWikitext } from './wiki/fetch.ts'
import { buildDataset } from './wiki/normalize.ts'
import { parseBuildingPage } from './wiki/parseBuildingPage.ts'

const overridesPath = new URL('../src/data/overrides.json', import.meta.url)
const outputPath = new URL('../src/data/whiskerwood.json', import.meta.url)

const overrides = JSON.parse(readFileSync(overridesPath, 'utf8')) as Overrides
const pages = await fetchWikitext(BUILDING_TITLES)
const parsed = BUILDING_TITLES.map((title) => parseBuildingPage(title, pages.get(title)!))

const problems = parsed.flatMap((p) => p.problems.map((m) => `${p.name}: ${m}`))
if (problems.length) {
  console.error('Parse problems (wiki layout changed?):')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}

const { dataset, warnings, rawItems } = buildDataset(parsed, overrides, { generatedAt: new Date().toISOString().slice(0, 10), source: 'wiki', gameVersion: 'unknown' })
writeFileSync(outputPath, JSON.stringify(dataset, null, 2) + '\n')

console.log(`buildings: ${dataset.buildings.length}, recipes: ${dataset.recipes.length}, items: ${dataset.items.length}`)
console.log(`raw items: ${rawItems.join(', ')}`)
for (const w of warnings) console.log('warning: ' + w)
console.log(`wrote ${outputPath.pathname}`)
