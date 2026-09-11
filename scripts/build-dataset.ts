import { readFileSync, writeFileSync } from 'node:fs'
import type { Overrides } from '../src/data/types.ts'
import { tablesToParsed } from './tables/importTables.ts'
import { readIndex } from './tables/readIndex.ts'
import { latestVersionDir } from './tables/versions.ts'
import { buildDataset } from './wiki/normalize.ts'

const dumpsDir = new URL('../data/dumps/', import.meta.url)
const overridesPath = new URL('../src/data/overrides.json', import.meta.url)
const outputPath = new URL('../src/data/whiskerwood.json', import.meta.url)

const gameVersion = process.argv[2] ?? latestVersionDir(dumpsDir)
if (!gameVersion) throw new Error('no dumps under data/dumps; run npm run dump')
const overrides = JSON.parse(readFileSync(overridesPath, 'utf8')) as Overrides
const index = readIndex(new URL(`${gameVersion}/DataTableIndex.json`, dumpsDir))
const { parsed, foods, problems } = tablesToParsed(index, overrides.farmTiles)

if (problems.length) {
  console.error('Import problems (table layout changed?):')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}

const { dataset, warnings, rawItems } = buildDataset(
  parsed,
  { ...overrides, foods: [...overrides.foods, ...foods] },
  { generatedAt: new Date().toISOString().slice(0, 10), source: 'tables', gameVersion },
)
writeFileSync(outputPath, JSON.stringify(dataset, null, 2) + '\n')

console.log(`game version ${gameVersion} (tables exported ${index.ExportDate})`)
console.log(`buildings: ${dataset.buildings.length}, recipes: ${dataset.recipes.length}, items: ${dataset.items.length}`)
console.log(`raw items: ${rawItems.join(', ')}`)
for (const w of warnings) console.log('warning: ' + w)
console.log(`wrote ${outputPath.pathname}`)
