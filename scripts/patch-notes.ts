import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Dataset, Overrides, PatchLedger } from '../src/data/types.ts'
import { fetchNews } from './steam/fetch.ts'
import { buildEntries, formatSummary, mergeLedger, pendingEntries } from './steam/ledger.ts'
import { entityNames } from './steam/match.ts'
import { isPatchPost } from './steam/parseChangelog.ts'

/**
 * `npm run patches` fetches Whiskerwood's Steam patch posts and merges their balance lines into
 * src/data/patch-ledger.json, keeping review state. `npm run patches -- --check` is offline and
 * exits 1 while unreviewed lines newer than the dataset's game version exist.
 */
const ledgerPath = new URL('../src/data/patch-ledger.json', import.meta.url)
const read = <T>(url: URL) => JSON.parse(readFileSync(url, 'utf8')) as T
const dataset = read<Dataset>(new URL('../src/data/whiskerwood.json', import.meta.url))
const overrides = read<Overrides>(new URL('../src/data/overrides.json', import.meta.url))
let ledger: PatchLedger = existsSync(ledgerPath) ? read<PatchLedger>(ledgerPath) : { entries: [] }

if (!process.argv.includes('--check')) {
  const names = entityNames(dataset, overrides.itemAliases)
  const posts = (await fetchNews()).filter(isPatchPost)
  const fresh = posts.flatMap((p) => buildEntries(p, names, dataset.recipes))
  const merged = mergeLedger(ledger, fresh)
  ledger = merged.ledger
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
  console.log(`patch posts: ${posts.length}, lines: ${fresh.length}, added: ${merged.added}, preserved: ${fresh.length - merged.added}`)
  for (const id of merged.textChanged) console.log(`warning: text changed for reviewed entry ${id}; review state reset`)
}

console.log(formatSummary(ledger, dataset.gameVersion))
if (process.argv.includes('--check') && pendingEntries(ledger, dataset.gameVersion).length) process.exit(1)
