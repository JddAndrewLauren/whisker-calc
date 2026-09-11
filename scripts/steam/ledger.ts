import { createHash } from 'node:crypto'
import type { LedgerEntry, PatchLedger, Recipe } from '../../src/data/types.ts'
import type { NewsItem } from './fetch.ts'
import { type EntityName, matchLine, numericHints } from './match.ts'
import { compareVersions } from '../tables/versions.ts'
import { BALANCE_SECTIONS, type ChangelogLine, parseChangelog } from './parseChangelog.ts'

export { compareVersions }

/** `${gid}:${hash}` over the line's content, so an edited post (a hotpatch block prepended, say) keeps its ids; repeats get "-2", "-3", ... in document order. */
function lineId(gid: string, line: ChangelogLine, seen: Map<string, number>): string {
  const base = `${gid}:${createHash('sha1').update(`${line.version}|${line.section}|${line.text}`).digest('hex').slice(0, 8)}`
  const n = (seen.get(base) ?? 0) + 1
  seen.set(base, n)
  return n === 1 ? base : `${base}-${n}`
}

export function buildEntries(item: NewsItem, names: EntityName[], recipes: Recipe[]): LedgerEntry[] {
  const date = new Date(item.date * 1000).toISOString().slice(0, 10)
  const seen = new Map<string, number>()
  return parseChangelog(item.contents)
    .filter((l) => BALANCE_SECTIONS.includes(l.section))
    .map((l) => ({
      id: lineId(item.gid, l, seen),
      gid: item.gid,
      index: l.index,
      version: l.version,
      patch: l.patch,
      date,
      section: l.section,
      text: l.text,
      ...matchLine(l.text, names, recipes),
      numbers: numericHints(l.text),
      status: 'unreviewed',
      resolution: '',
    }))
}

export interface MergeResult {
  ledger: PatchLedger
  added: number
  /** Ids whose text changed since they were reviewed; their status is back to 'unreviewed'. */
  textChanged: string[]
}

/** Keep review state from the existing ledger while the text is unchanged, refresh everything else, never drop an entry. */
export function mergeLedger(existing: PatchLedger, fresh: LedgerEntry[]): MergeResult {
  const byId = new Map(existing.entries.map((e) => [e.id, e]))
  const textChanged: string[] = []
  let added = 0
  for (const entry of fresh) {
    const old = byId.get(entry.id)
    if (!old) added++
    else if (old.text !== entry.text && old.status !== 'unreviewed') textChanged.push(entry.id)
    const keep = old && old.text === entry.text
    byId.set(entry.id, keep ? { ...entry, status: old.status, resolution: old.resolution } : entry)
  }
  const entries = [...byId.values()].sort(
    (a, b) => compareVersions(a.version, b.version) || a.date.localeCompare(b.date) || a.gid.localeCompare(b.gid) || a.index - b.index,
  )
  return { ledger: { entries }, added, textChanged }
}

/** Unreviewed lines newer than the dataset's game version; every unreviewed line when that version is unknown. */
export function pendingEntries(ledger: PatchLedger, gameVersion: string): LedgerEntry[] {
  const known = /^\d/.test(gameVersion)
  return ledger.entries.filter((e) => e.status === 'unreviewed' && (!known || compareVersions(e.version, gameVersion) > 0))
}

export function formatSummary(ledger: PatchLedger, gameVersion: string): string {
  const count = (status: LedgerEntry['status']) => ledger.entries.filter((e) => e.status === status).length
  const pending = pendingEntries(ledger, gameVersion)
  const lines = [
    `ledger: ${ledger.entries.length} entries; dataset gameVersion: ${gameVersion}`,
    `pending: ${pending.length}   unreviewed: ${count('unreviewed')}   needs-verification: ${count('needs-verification')}   applied: ${count('applied')}   not-applicable: ${count('not-applicable')}   superseded: ${count('superseded')}`,
    ...pending.map((e) => `v${e.version} #${e.patch}  ${e.confidence.padEnd(6)} ${(e.recipes[0] ?? '-').padEnd(30)} ${e.text}`),
  ]
  return lines.join('\n')
}
