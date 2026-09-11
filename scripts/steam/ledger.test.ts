import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Dataset, LedgerEntry, PatchLedger } from '../../src/data/types.ts'
import type { NewsItem } from './fetch.ts'
import { buildEntries, compareVersions, formatSummary, mergeLedger, pendingEntries } from './ledger.ts'
import { entityNames } from './match.ts'

const dataset = JSON.parse(readFileSync(new URL('../../src/data/whiskerwood.json', import.meta.url), 'utf8')) as Dataset
const post = JSON.parse(readFileSync(new URL('./__fixtures__/patch-27.json', import.meta.url), 'utf8')) as NewsItem
const names = entityNames(dataset, {})
const entries = buildEntries(post, names, dataset.recipes)

describe('buildEntries', () => {
  it('keeps only balance sections, keyed by post and a hash of the line', () => {
    expect(entries).toHaveLength(17)
    expect(entries.map((e) => e.section)).toEqual([...Array(6).fill('Features'), ...Array(11).fill('Gameplay')])
    expect(entries[6]).toMatchObject({ gid: post.gid, index: 6, version: '0.7.206', patch: 27, date: '2026-09-11', status: 'unreviewed', resolution: '' })
    expect(entries[6].id).toMatch(new RegExp(`^${post.gid}:[0-9a-f]{8}$`))
    expect(entries[6].numbers).toEqual({ from: '5:8', to: '1:1' })
  })

  it('keeps ids when a hotpatch block is prepended and renumbers every bullet', () => {
    const hotpatch = '[b]v0.7.207 Patch #27 Hotpatch #1[/b][p][b]Gameplay[/b][/p][list][*][p]Halve cannon cost[/p][/*][/list]'
    const shifted = buildEntries({ ...post, contents: hotpatch + post.contents }, names, dataset.recipes)
    expect(shifted).toHaveLength(18)
    expect(shifted[7]).toMatchObject({ id: entries[6].id, index: 7, text: entries[6].text })
    expect(shifted.slice(1).map((e) => e.id)).toEqual(entries.map((e) => e.id))
  })

  it('suffixes an exact duplicate bullet in document order', () => {
    const bullet = /\[\*\]\[p\]Nerf cannon frame[^]*?\[\/\*\]/.exec(post.contents)![0]
    const doubled = buildEntries({ ...post, contents: post.contents.replace(bullet, bullet + bullet) }, names, dataset.recipes)
    expect(doubled.map((e) => e.id).filter((id) => id.startsWith(entries[6].id))).toEqual([entries[6].id, `${entries[6].id}-2`])
    expect(new Set(doubled.map((e) => e.id)).size).toBe(doubled.length)
  })
})

describe('mergeLedger', () => {
  const reviewed: LedgerEntry = { ...entries[6], status: 'applied', resolution: 'done', entities: [], recipes: [] }
  const stale: LedgerEntry = { ...entries[0], id: 'old:0', gid: 'old', version: '0.6.100', text: 'gone from the feed', status: 'not-applicable' }

  it('keeps review state, refreshes matches, adds new lines and never drops old ones', () => {
    const { ledger, added, textChanged } = mergeLedger({ entries: [reviewed, stale] }, entries)
    expect(added).toBe(entries.length - 1)
    expect(textChanged).toEqual([])
    const kept = ledger.entries.find((e) => e.id === reviewed.id)!
    expect(kept).toMatchObject({ status: 'applied', resolution: 'done', recipes: entries[6].recipes })
    expect(ledger.entries[0]).toBe(stale)
    expect(ledger.entries.map((e) => e.id).slice(1)).toEqual(entries.map((e) => e.id))
  })

  it('resets and flags reviewed entries whose text changed', () => {
    const { ledger, textChanged } = mergeLedger({ entries: [{ ...reviewed, text: 'older wording' }] }, entries)
    expect(textChanged).toEqual([reviewed.id])
    expect(ledger.entries.find((e) => e.id === reviewed.id)).toMatchObject({ text: entries[6].text, status: 'unreviewed', resolution: '' })
  })

  it('does not flag unreviewed entries whose text changed', () => {
    const { textChanged, added } = mergeLedger({ entries: [{ ...entries[6], text: 'older wording' }] }, entries)
    expect(textChanged).toEqual([])
    expect(added).toBe(entries.length - 1)
  })
})

describe('formatSummary', () => {
  it('prints counts and one row per pending line', () => {
    const ledger: PatchLedger = { entries: [{ ...entries[0], status: 'applied' }, { ...entries[6], confidence: 'low', recipes: [] }] }
    expect(formatSummary(ledger, '0.7.205').split('\n')).toEqual([
      'ledger: 2 entries; dataset gameVersion: 0.7.205',
      'pending: 1   unreviewed: 1   needs-verification: 0   applied: 1   not-applicable: 0   superseded: 0',
      'v0.7.206 #27  low    -                              Nerf cannon frame and cannon production ratios from 5:8 to 1:1',
    ])
  })
})

describe('compareVersions / pendingEntries', () => {
  it('compares dotted versions numerically', () => {
    expect(compareVersions('0.7.206', '0.6.193')).toBeGreaterThan(0)
    expect(compareVersions('0.6.10', '0.6.9')).toBeGreaterThan(0)
    expect(compareVersions('0.7.206.0', '0.7.206')).toBe(0)
  })

  it('reports unreviewed lines newer than the dataset, or all of them when the version is unknown', () => {
    const ledger: PatchLedger = {
      entries: [
        { ...entries[0], id: 'a', version: '0.7.200' },
        { ...entries[1], id: 'b', version: '0.7.206' },
        { ...entries[2], id: 'c', version: '0.7.206', status: 'needs-verification' },
        { ...entries[3], id: 'd', version: '0.7.210' },
      ],
    }
    expect(pendingEntries(ledger, '0.7.205').map((e) => e.id)).toEqual(['b', 'd'])
    expect(pendingEntries(ledger, '0.7.206.0').map((e) => e.id)).toEqual(['d'])
    expect(pendingEntries(ledger, 'unknown').map((e) => e.id)).toEqual(['a', 'b', 'd'])
  })
})
