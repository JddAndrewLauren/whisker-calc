export interface RawRecipe {
  inputs: [name: string, qty: number][]
  outputs: [name: string, qty: number][]
  timeSeconds: number
}

export interface ParsedBuilding {
  name: string
  workers: number | null
  /** Raw guild text from the infobox, e.g. "Explorer's". */
  guildText: string | null
  catalyst: string | null
  recipes: RawRecipe[]
  /** Cells that looked like items but did not parse. Non-empty means the wiki layout changed. */
  problems: string[]
}

const ITEM_CELL = /\]\]\s*([A-Za-z][A-Za-z' -]*?)\s+(\d+(?:\.\d+)?)\s*$/
const TIME = /(\d+(?:\.\d+)?)\s*s\b/

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

function parseRecipes(text: string, problems: string[]): RawRecipe[] {
  const section = /==\s*Recipes\s*==([\s\S]*?)\|\}/.exec(text)
  if (!section) {
    problems.push('no Recipes section')
    return []
  }
  const recipes: RawRecipe[] = []
  for (const row of section[1].split(/\n\|-[^\n]*\n/)) {
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
      ;(seenTime ? recipe.outputs : recipe.inputs).push([m[1].trim(), Number(m[2])])
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

export function parseBuildingPage(title: string, text: string): ParsedBuilding {
  const problems: string[] = []
  const guild = /([A-Za-z']+) Guild Pref/.exec(text)
  const catalyst = /\|\s*(?:The )?([A-Za-z ]+?) (?:is|are) made in the \[\[/.exec(text)
  return {
    name: title.replace(/_/g, ' '),
    workers: parseWorkers(text),
    guildText: guild ? guild[1] : null,
    catalyst: catalyst ? catalyst[1].trim() : null,
    recipes: parseRecipes(text, problems),
    problems,
  }
}
