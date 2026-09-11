import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { NewsItem } from './fetch.ts'
import { isPatchPost, parseChangelog, stripTags } from './parseChangelog.ts'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}.json`, import.meta.url), 'utf8')) as NewsItem

describe('parseChangelog', () => {
  it('splits a patch post into version, section and bullet lines', () => {
    const lines = parseChangelog(fixture('patch-27').contents)
    expect(new Set(lines.map((l) => `${l.version} #${l.patch}`))).toEqual(new Set(['0.7.206 #27']))
    const gameplay = lines.filter((l) => l.section === 'Gameplay')
    expect(gameplay).toHaveLength(11)
    expect(gameplay[0]).toEqual({ version: '0.7.206', patch: 27, section: 'Gameplay', index: 6, text: 'Nerf cannon frame and cannon production ratios from 5:8 to 1:1' })
    expect(lines.every((l) => !/[[\]]/.test(l.text))).toBe(true)
  })

  it('handles a post with a hotpatch block above the main version block', () => {
    const lines = parseChangelog(fixture('patch-26').contents)
    expect(lines[0]).toMatchObject({ version: '0.7.201', patch: 26, section: 'Bugs', index: 0 })
    expect(lines.filter((l) => l.version === '0.7.200').length).toBeGreaterThan(50)
    const firstMain = lines.find((l) => l.version === '0.7.200')!
    expect(firstMain.index).toBeGreaterThan(lines.filter((l) => l.version === '0.7.201').length - 1)
  })

  it('collapses tags and whitespace inside a line', () => {
    expect(stripTags('[p]Fix [b]this[/b]\n and  that[/p]')).toBe('Fix this and that')
  })
})

describe('isPatchPost', () => {
  it('accepts announcements whose body parses as a changelog, whatever the title, and rejects sales, previews and syndicated press', () => {
    expect(isPatchPost(fixture('patch-27'))).toBe(true)
    expect(isPatchPost(fixture('patch-26'))).toBe(true)
    expect(isPatchPost({ ...fixture('patch-27'), title: 'Hotfix for the Nautical Update' })).toBe(true)
    expect(isPatchPost(fixture('sale'))).toBe(false)
    expect(isPatchPost(fixture('preview-26'))).toBe(false)
    expect(isPatchPost(fixture('rps'))).toBe(false)
    expect(parseChangelog(fixture('sale').contents)).toEqual([])
  })
})
