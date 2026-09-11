import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Dataset, Overrides } from '../src/data/types.ts'
import { curlDownload, fetchImageThumbs } from './wiki/fetch.ts'

/** Download every item and building icon named in whiskerwood.json into public/icons. Pass --force to refetch. */
const force = process.argv.includes('--force')
const dataset = JSON.parse(readFileSync(new URL('../src/data/whiskerwood.json', import.meta.url), 'utf8')) as Dataset
const { favicon } = JSON.parse(readFileSync(new URL('../src/data/overrides.json', import.meta.url), 'utf8')) as Overrides
const publicDir = fileURLToPath(new URL('../public/', import.meta.url))

const ITEM_PX = 64
const BUILDING_PX = 96

interface Job {
  file: string
  dest: string
  width: number
}
const blank = [...dataset.items, ...dataset.buildings].filter((e) => !e.icon)
if (blank.length) {
  console.error('entries without an icon (see the scraper warnings): ' + blank.map((e) => e.id).join(', '))
  process.exit(1)
}
const jobs: Job[] = [
  ...dataset.items.map((i) => ({ file: i.icon!, dest: `icons/items/${i.id}.png`, width: ITEM_PX })),
  ...dataset.buildings.map((b) => ({ file: b.icon!, dest: `icons/buildings/${b.id}.png`, width: BUILDING_PX })),
  { file: favicon, dest: 'favicon.png', width: ITEM_PX },
]

const wanted = jobs.filter((j) => force || !existsSync(publicDir + j.dest))
console.log(`${jobs.length} icons, ${wanted.length} to fetch`)

for (const width of [...new Set(wanted.map((j) => j.width))]) {
  const batch = wanted.filter((j) => j.width === width)
  const urls = fetchImageThumbs([...new Set(batch.map((j) => j.file))], width)
  for (const j of batch) {
    mkdirSync(publicDir + j.dest.replace(/[^/]+$/, ''), { recursive: true })
    curlDownload(urls.get(j.file)!, publicDir + j.dest)
    console.log(`  ${j.dest}  <-  ${j.file}`)
  }
}
