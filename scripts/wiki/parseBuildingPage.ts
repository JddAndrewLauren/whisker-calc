export interface RawRecipe {
  inputs: [name: string, qty: number][]
  outputs: [name: string, qty: number][]
  timeSeconds: number
  /** Farm land one building tends at base speed, for crop recipes. */
  tilesPerBuilding?: number
  /** Where the numbers come from when they are not a plain recipe row. */
  note?: string
}

export interface ParsedBuilding {
  name: string
  workers: number | null
  /** Raw guild text from the infobox, e.g. "Explorer's". */
  guildText: string | null
  catalyst: string | null
  /** Construction materials from the infobox, raw names. */
  cost: [name: string, qty: number][]
  recipes: RawRecipe[]
  /** Infobox picture of the building, a wiki file name such as "Bakery.PNG". */
  image: string | null
  /** Raw item name -> wiki file name of the icon shown next to it, e.g. "Tex wood 07.png". */
  icons: Record<string, string>
  /** Cells that looked like items but did not parse. Non-empty means the wiki layout changed. */
  problems: string[]
}

const ITEM_CELL = /\[\[File:([^|\]]+)[^\]]*\]\]\s*([A-Za-z][A-Za-z' -]*?)\s+(\d+(?:\.\d+)?)\s*$/
const COST_CELL = /\[\[File:([^|\]]+)[^\]]*\]\]\s*([A-Za-z][A-Za-z' -]*?)\s*$/
const TIME = /(\d+(?:\.\d+)?)\s*s\b/
const TABLE = /\{\|[^\n]*\n([\s\S]*?)\n\|\}/g

/** Wiki file names may be written with spaces or underscores; MediaWiki treats them alike. */
const fileName = (raw: string) => raw.trim().replace(/_/g, ' ')

/** Remember the icon shown next to an item, unless it is one of the wiki's own Icons8 UI glyphs. */
function recordIcon(icons: Record<string, string>, name: string, rawFile: string): void {
  const file = fileName(rawFile)
  if (!/^Icons8/i.test(file)) icons[name] ??= file
}

/** Strip a leading `attr="..." |` prefix from a table cell. Pipes inside [[File:...]] are untouched. */
function cellContent(cell: string): string {
  const m = /^([^[\]|]*)\|([\s\S]*)$/.exec(cell)
  return (m ? m[2] : cell).trim()
}

function splitCells(row: string): string[] {
  return ('\n' + row.trim())
    .split(/\n\|/)
    .map(cellContent)
    .filter((c) => c.length > 0)
}

/** Recipes live in whichever tables have a production-time cell; not every page puts them under ==Recipes==. */
function parseRecipes(text: string, problems: string[], icons: Record<string, string>): RawRecipe[] {
  const tables = [...text.matchAll(TABLE)].map((m) => m[1]).filter((t) => t.includes('time-machine'))
  if (tables.length === 0) {
    problems.push('no recipe table')
    return []
  }
  const recipes: RawRecipe[] = []
  for (const row of tables.flatMap((t) => t.split(/\n\|-[^\n]*\n/))) {
    const trimmed = row.trim()
    if (!trimmed.startsWith('|')) continue
    const recipe: RawRecipe = { inputs: [], outputs: [], timeSeconds: NaN }
    let seenTime = false
    for (const cell of splitCells(trimmed)) {
      if (cell.includes('time-machine')) {
        const t = TIME.exec(cell)
        if (t) recipe.timeSeconds = Number(t[1])
        else problems.push(`unparsed time cell: ${cell}`)
        seenTime = true
        continue
      }
      if (!cell.includes('[[File:')) continue
      const m = ITEM_CELL.exec(cell)
      if (!m) {
        problems.push(`unparsed item cell: ${cell}`)
        continue
      }
      const name = m[2].trim()
      recordIcon(icons, name, m[1])
      ;(seenTime ? recipe.outputs : recipe.inputs).push([name, Number(m[3])])
    }
    if (recipe.outputs.length === 0) continue
    if (Number.isNaN(recipe.timeSeconds)) problems.push(`recipe without time: ${JSON.stringify(recipe.outputs)}`)
    recipes.push(recipe)
  }
  return recipes
}

function parseWorkers(text: string): number | null {
  const m = /^!.*?Employees[^\n]*\n\|-[^\n]*\n([\s\S]*?)\n\|-/m.exec(text)
  if (!m) return null
  const cells = splitCells(m[1])
  const last = cells[cells.length - 1] ?? ''
  const n = /(\d+)\s*$/.exec(last)
  return n ? Number(n[1]) : null
}

/** Infobox block after the "Construction Material" header: icon+name cells each followed by a quantity cell. */
function parseCost(text: string, icons: Record<string, string>): [string, number][] {
  const m = /^!.*?Construction Material[^\n]*\n([\s\S]*?)(?=\n!|\n\|\})/m.exec(text)
  if (!m) return []
  const cost: [string, number][] = []
  let pending: string | null = null
  for (const line of m[1].split('\n')) {
    if (!line.startsWith('|') || line.startsWith('|-')) continue
    const cell = cellContent(line.slice(1))
    const item = COST_CELL.exec(cell)
    if (item) {
      pending = item[2]
      recordIcon(icons, pending, item[1])
    } else if (pending && /^\d+$/.test(cell)) {
      cost.push([pending, Number(cell)])
      pending = null
    }
  }
  return cost
}

/** The infobox picture: the 160px File at the top of the page, else the first File that is not a UI icon. */
function parseImage(text: string): string | null {
  const m = /\[\[File:([^|\]]+)\|\s*160px/.exec(text) ?? /\[\[File:((?!Icons8)[^|\]]+)/.exec(text)
  return m ? fileName(m[1]) : null
}

export function parseBuildingPage(title: string, text: string): ParsedBuilding {
  const problems: string[] = []
  const icons: Record<string, string> = {}
  const guild = /([A-Za-z']+) Guild Pref/.exec(text)
  const catalyst = /\|\s*(?:The )?([A-Za-z ]+?) (?:is|are) made in the \[\[/.exec(text)
  return {
    name: title.replace(/_/g, ' '),
    workers: parseWorkers(text),
    guildText: guild ? guild[1] : null,
    catalyst: catalyst ? catalyst[1].trim() : null,
    cost: parseCost(text, icons),
    recipes: parseRecipes(text, problems, icons),
    image: parseImage(text),
    icons,
    problems,
  }
}
