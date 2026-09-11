import type { NewsItem } from './fetch.ts'

export interface ChangelogLine {
  /** Game version the block is headed with, e.g. "0.7.206". */
  version: string
  patch: number
  /** Changelog section, e.g. "Gameplay". */
  section: string
  /** Ordinal over every bullet in the post, so keys never shift when sections are added. */
  index: number
  text: string
}

/** Sections that carry balance changes. */
export const BALANCE_SECTIONS = ['Gameplay', 'Features']

// Every patch post repeats the same skeleton: "[b]vX.Y.Z Patch #N[/b]" (sometimes with a suffix such as
// "Hotpatch #1", and some posts carry several such blocks), then "[p][b]Section[/b][/p][list]" of
// "[*][p]text[/p][/*]" items.
const VERSION_HEADER = /\[b\]\s*v(\d+(?:\.\d+)+)\s+Patch\s+#(\d+)[^[]*\[\/b\]/g
const SECTION = /\[p\]\[b\]([^[]+)\[\/b\]\[\/p\]\s*\[list\]([\s\S]*?)\[\/list\]/g
const ITEM = /\[\*\]\[p\]([\s\S]*?)\[\/p\]\[\/\*\]/g

export function stripTags(bbcode: string): string {
  return bbcode
    .replace(/\[\/?[a-z*]+[^\]]*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseChangelog(contents: string): ChangelogLine[] {
  const headers = [...contents.matchAll(VERSION_HEADER)]
  const lines: ChangelogLine[] = []
  let index = 0
  headers.forEach((h, i) => {
    const block = contents.slice(h.index + h[0].length, headers[i + 1]?.index ?? contents.length)
    for (const s of block.matchAll(SECTION)) {
      const section = s[1].trim()
      for (const item of s[2].matchAll(ITEM)) {
        const text = stripTags(item[1])
        if (text) lines.push({ version: h[1], patch: Number(h[2]), section, index: index++, text })
      }
    }
  })
  return lines
}

/** Patch posts only: community announcements whose body parses as a changelog. Sales, previews and syndicated press have no version header. */
export function isPatchPost(item: NewsItem): boolean {
  return item.feedname === 'steam_community_announcements' && parseChangelog(item.contents).length > 0
}
