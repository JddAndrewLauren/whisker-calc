import { describe, expect, it } from 'vitest'
import type { Overrides } from '../../src/data/types.ts'
import { buildDataset, canonicalItemName, guildFromText, slug } from './normalize.ts'
import type { ParsedBuilding } from './parseBuildingPage.ts'

const noOverrides: Overrides = { itemAliases: {}, buildings: {}, recipes: {}, preferredRecipe: {} }
const building = (name: string, recipes: ParsedBuilding['recipes'], extra: Partial<ParsedBuilding> = {}): ParsedBuilding => ({
  name,
  workers: 2,
  guildText: "Explorer's",
  catalyst: null,
  recipes,
  problems: [],
  ...extra,
})

describe('canonicalItemName', () => {
  it('title-cases and collapses whitespace', () => {
    expect(canonicalItemName('Iron ore')).toBe('Iron Ore')
    expect(canonicalItemName('  fine   tea ')).toBe('Fine Tea')
    expect(canonicalItemName('oil')).toBe('Oil')
  })
  it('applies aliases after title-casing', () => {
    expect(canonicalItemName('Iron', { Iron: 'Iron Bars' })).toBe('Iron Bars')
    expect(canonicalItemName('mushroom', { Mushroom: 'Mushrooms' })).toBe('Mushrooms')
  })
})

describe('slug / guildFromText', () => {
  it('slugifies', () => {
    expect(slug('Tailored Clothes')).toBe('tailored-clothes')
    expect(slug("Explorer's Guild")).toBe('explorers-guild')
  })
  it('maps guild text variants', () => {
    expect(guildFromText("Enginner's")).toBe('Engineer')
    expect(guildFromText('Explorers')).toBe('Explorer')
    expect(guildFromText('Farming')).toBe('Farmer')
    expect(guildFromText("Miner's")).toBe('Miner')
    expect(guildFromText('Cooks')).toBeNull()
  })
})

describe('buildDataset', () => {
  it('assigns ids, collects items and derives raw items', () => {
    const { dataset, rawItems, warnings } = buildDataset(
      [building('Cotton Gin', [{ inputs: [['Cotton', 1]], outputs: [['Threads', 8]], timeSeconds: 144 }])],
      noOverrides,
      'now',
    )
    expect(warnings).toEqual([])
    expect(dataset.buildings[0]).toMatchObject({ id: 'cotton-gin', workers: 2, guild: 'Explorer' })
    expect(dataset.recipes[0]).toEqual({
      id: 'cotton-gin/threads',
      building: 'cotton-gin',
      inputs: [{ item: 'cotton', qty: 1 }],
      outputs: [{ item: 'threads', qty: 8 }],
      timeSeconds: 144,
    })
    expect(dataset.items.map((i) => i.id)).toEqual(['cotton', 'threads'])
    expect(rawItems).toEqual(['cotton'])
  })

  it('suffixes colliding recipe ids with the first input', () => {
    const { dataset } = buildDataset(
      [
        building('Cannery', [
          { inputs: [['Berries', 1], ['Bronze Bars', 1]], outputs: [['Canned Food', 3]], timeSeconds: 89 },
          { inputs: [['Fish', 1], ['Bronze Bars', 1]], outputs: [['Canned Food', 3]], timeSeconds: 89 },
        ]),
      ],
      noOverrides,
      'now',
    )
    expect(dataset.recipes.map((r) => r.id)).toEqual(['cannery/canned-food', 'cannery/canned-food-from-fish'])
  })

  it('applies aliases, recipe overrides and preferred ordering', () => {
    const overrides: Overrides = {
      itemAliases: { Iron: 'Iron Bars' },
      buildings: { smokery: { workers: 4 } },
      recipes: { 'tea-roaster/tea': { inputs: [{ item: 'Tea Leaves', qty: 1 }] } },
      preferredRecipe: { threads: 'flax-spinner/threads' },
    }
    const { dataset, warnings } = buildDataset(
      [
        building('Cotton Gin', [{ inputs: [['Cotton', 1]], outputs: [['Threads', 8]], timeSeconds: 144 }]),
        building('Flax Spinner', [{ inputs: [['Flax', 2]], outputs: [['Threads', 3]], timeSeconds: 89 }]),
        building('Blast Furnace', [{ inputs: [['Iron ore', 1]], outputs: [['Iron', 5]], timeSeconds: 233 }]),
        building('Tea Roaster', [{ inputs: [['Tea', 1]], outputs: [['Tea', 5]], timeSeconds: 89 }]),
        building('Smokery', [{ inputs: [['Fish', 2]], outputs: [['Smoked Fish', 1]], timeSeconds: 89 }], { workers: null }),
      ],
      overrides,
      'now',
    )
    expect(warnings).toEqual([])
    expect(dataset.recipes[0].id).toBe('flax-spinner/threads')
    const furnace = dataset.recipes.find((r) => r.building === 'blast-furnace')!
    expect(furnace.outputs).toEqual([{ item: 'iron-bars', qty: 5 }])
    expect(furnace.inputs).toEqual([{ item: 'iron-ore', qty: 1 }])
    const tea = dataset.recipes.find((r) => r.id === 'tea-roaster/tea')!
    expect(tea.inputs).toEqual([{ item: 'tea-leaves', qty: 1 }])
    expect(dataset.buildings.find((b) => b.id === 'smokery')!.workers).toBe(4)
    expect(dataset.items.find((i) => i.id === 'iron-bars')!.name).toBe('Iron Bars')
  })

  it('warns on missing workers, unknown guild and dangling overrides', () => {
    const { warnings } = buildDataset(
      [building('Mill', [{ inputs: [['Wheat', 1]], outputs: [['Flour', 2]], timeSeconds: 89 }], { workers: null, guildText: 'Cooks' })],
      { ...noOverrides, recipes: { 'nope/x': {} }, preferredRecipe: { flour: 'nope/x' } },
      'now',
    )
    expect(warnings).toEqual([
      'Mill: unknown guild text "Cooks"',
      'Mill: no worker count',
      'override for unknown recipe nope/x',
      'preferredRecipe flour -> nope/x not found',
    ])
  })
})
