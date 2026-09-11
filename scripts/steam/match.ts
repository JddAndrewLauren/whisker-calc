import type { Confidence, Dataset, EntityHit, NumericHint, Recipe } from '../../src/data/types.ts'

export interface EntityName {
  kind: 'building' | 'item'
  id: string
  tokens: string[]
}

export interface MatchResult {
  entities: EntityHit[]
  /** Candidate recipe ids, best first, at most three. */
  recipes: string[]
  confidence: Confidence
}

/** Deliberately crude: enough that "roasting" and "Roaster", "Vises" and "Vise", "Pastries" and "Pastry" meet. */
export function stem(word: string): string {
  let w = word
  if (w.endsWith('ies')) w = w.slice(0, -3) + 'y'
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2)
  else if (w.endsWith('s') && w.length > 3) w = w.slice(0, -1)
  for (const suffix of ['ing', 'ed', 'er']) {
    if (w.endsWith(suffix) && w.length > suffix.length + 2) {
      w = w.slice(0, -suffix.length)
      break
    }
  }
  return w.endsWith('e') && w.length > 3 ? w.slice(0, -1) : w
}

/** Lower-cased stems; camelCase such as "CutStone" or "FineTea" splits into words. */
export function tokens(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem)
}

export function entityNames(dataset: Dataset, aliases: Record<string, string>): EntityName[] {
  const names: EntityName[] = [
    ...dataset.buildings.map((b) => ({ kind: 'building' as const, id: b.id, tokens: tokens(b.name) })),
    ...dataset.items.map((i) => ({ kind: 'item' as const, id: i.id, tokens: tokens(i.name) })),
  ]
  for (const [from, to] of Object.entries(aliases)) {
    const item = dataset.items.find((i) => i.name === to)
    if (item) names.push({ kind: 'item', id: item.id, tokens: tokens(from) })
  }
  return names
}

function findSequence(haystack: string[], needle: string[]): boolean {
  return haystack.some((_, i) => needle.every((t, j) => haystack[i + j] === t))
}

export function matchLine(text: string, names: EntityName[], recipes: Recipe[]): MatchResult {
  const words = tokens(text)
  const full = names.filter((n) => n.tokens.length && findSequence(words, n.tokens))
  const partial = names.filter((n) => n.tokens.length > 1 && !full.includes(n) && words.includes(n.tokens[n.tokens.length - 1]))

  const covered = (n: EntityName, t: string) => full.some((f) => f.kind === n.kind && f !== n && f.tokens.includes(t))
  // One hit per entity: an alias that shares tokens with the item name must not score twice. Full hits come first, so they win.
  const seen = new Set<string>()
  const hits = [
    ...full.filter((n) => !full.some((f) => f !== n && f.kind === n.kind && f.tokens.length > n.tokens.length && findSequence(f.tokens, n.tokens))),
    ...partial.filter((n) => !covered(n, n.tokens[n.tokens.length - 1])),
  ].filter((n) => !seen.has(n.kind + n.id) && seen.add(n.kind + n.id))
  const weight = (n: EntityName) => (full.includes(n) ? n.tokens.length : 0.5)

  const scored = recipes
    .map((r) => {
      let score = 0
      const kinds = new Set<string>()
      let anyFull = false
      for (const n of hits) {
        const w = weight(n)
        let role: string | null = null
        if (n.kind === 'building' && r.building === n.id) role = 'building'
        else if (n.kind === 'item' && r.outputs.some((o) => o.item === n.id)) role = 'output'
        else if (n.kind === 'item' && r.inputs.some((i) => i.item === n.id)) role = 'input'
        if (!role) continue
        score += role === 'input' ? w : 2 * w
        kinds.add(role)
        if (full.includes(n)) anyFull = true
      }
      return { id: r.id, score, kinds: kinds.size, anyFull }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  let confidence: Confidence = 'none'
  if (scored.length) {
    const [top, second] = scored
    if ((second && second.score === top.score) || !top.anyFull) confidence = 'low'
    else if (top.kinds >= 2) confidence = 'high'
    else confidence = 'medium'
  }
  const entities: EntityHit[] = hits.map((n) => ({ kind: n.kind, id: n.id, partial: !full.includes(n) }))
  return {
    entities,
    recipes: scored.slice(0, 3).map((s) => s.id),
    confidence,
  }
}

export function numericHints(text: string): NumericHint | null {
  const hint: NumericHint = {}
  // A number never ends mid-number ("6." is 6 at a sentence end), and a unit is a word other than the connectives.
  const range = /from\s+(\d[\d.:]*)(?![\d.:])\s*((?!(?:to|per|up|or|and)\b)[a-z]*)\s*(?:to\s+)?(\d[\d.:]*)(?![\d.:])\s*((?!(?:to|per|up|or|and)\b)[a-z]*)/i.exec(text)
  if (range) {
    hint.from = range[1].replace(/\.$/, '')
    hint.to = range[3].replace(/\.$/, '')
    const unit = range[2] || (range[3].endsWith('.') ? '' : range[4])
    if (unit) hint.unit = unit.toLowerCase()
  }
  const word = /\b(double|halve|halved|triple)\b/i.exec(text)
  if (word) hint.factor = { double: 2, halve: 0.5, halved: 0.5, triple: 3 }[word[1].toLowerCase()]
  const times = /by\s+(\d+(?:\.\d+)?)x\b/i.exec(text)
  if (times) hint.factor = Number(times[1])
  const percent = /by\s+~?(\d+(?:\.\d+)?)\s*%/i.exec(text)
  if (percent) hint.percent = Number(percent[1])
  return Object.keys(hint).length ? hint : null
}
