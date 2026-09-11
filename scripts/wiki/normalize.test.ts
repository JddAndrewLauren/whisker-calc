import { describe, expect, it } from 'vitest'
import type { Overrides } from '../../src/data/types.ts'
import { buildDataset, canonicalItemName, guildFromText, slug } from './normalize.ts'
import type { ParsedBuilding } from './parseBuildingPage.ts'

const noOverrides: Overrides = { itemAliases: {}, buildings: {}, recipes: {}, preferredRecipe: {}, extraBuildings: {}, extraRecipes: [], farmTiles: {}, foods: {}, itemIcons: {}, favicon: '' }
const meta = { generatedAt: 'now', source: 'wiki' as const, gameVersion: 'unknown' }
/** A parsed page whose every item carries an icon named after it, unless `extra` says otherwise. */
const building = (name: string, recipes: ParsedBuilding['recipes'], extra: Partial<ParsedBuilding> = {}): ParsedBuilding => {
  const cost = extra.cost ?? [['Logs', 3]]
  const names = [...cost.map(([n]) => n), ...recipes.flatMap((r) => [...r.inputs, ...r.outputs].map(([n]) => n))]
  return {
    name,
    workers: 2,
    guildText: "Explorer's",
    catalyst: null,
    cost,
    recipes,
    image: `${name}.PNG`,
    icons: Object.fromEntries(names.map((n) => [n, `${n}.png`])),
    problems: [],
    ...extra,
  }
}

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
      meta,
    )
    expect(warnings).toEqual([])
    expect(dataset.buildings[0]).toMatchObject({ id: 'cotton-gin', workers: 2, guild: 'Explorer', cost: [{ item: 'logs', qty: 3 }], icon: 'Cotton Gin.PNG' })
    expect(dataset.recipes[0]).toEqual({
      id: 'cotton-gin/threads',
      building: 'cotton-gin',
      inputs: [{ item: 'cotton', qty: 1 }],
      outputs: [{ item: 'threads', qty: 8 }],
      timeSeconds: 144,
    })
    expect(dataset.items.map((i) => i.id)).toEqual(['cotton', 'logs', 'threads'])
    expect(dataset.items[0]).toEqual({ id: 'cotton', name: 'Cotton', icon: 'Cotton.png' })
    expect(rawItems).toEqual(['cotton', 'logs'])
  })

  it('keeps the first icon per item (pages in name order), warns when pages disagree, and fills gaps from itemIcons', () => {
    const { dataset, warnings } = buildDataset(
      [
        building('Mill', [{ inputs: [['Wheat', 1]], outputs: [['Flour', 2]], timeSeconds: 89 }]),
        building('Bakery', [{ inputs: [['Flour', 2]], outputs: [['Bread', 5]], timeSeconds: 144 }], { icons: { Flour: 'Tex corn.png', Bread: 'Bread.png', Logs: 'Logs.png' } }),
      ],
      {
        ...noOverrides,
        extraRecipes: [{ building: 'mill', inputs: [{ item: 'Water', qty: 1 }], outputs: [{ item: 'Flour', qty: 1 }], timeSeconds: 1 }],
        itemIcons: { Water: 'Tex water.png', Cake: 'x.png', Bread: 'Other.png' },
      },
      meta,
    )
    expect(dataset.items.find((i) => i.id === 'flour')!.icon).toBe('Tex corn.png')
    expect(dataset.items.find((i) => i.id === 'water')!.icon).toBe('Tex water.png')
    expect(dataset.items.find((i) => i.id === 'bread')!.icon).toBe('Bread.png')
    expect(warnings).toEqual([
      'Flour: icon Flour.png differs from Tex corn.png',
      'itemIcons Cake is not an item',
      'itemIcons Bread ignored: the wiki shows Bread.png',
    ])
  })

  it('warns for a building without a picture and an item without an icon', () => {
    const { warnings } = buildDataset(
      [building('Mill', [{ inputs: [['Wheat', 1]], outputs: [['Flour', 2]], timeSeconds: 89 }], { image: null, icons: { Logs: 'Logs.png', Wheat: 'Wheat.png' } })],
      noOverrides,
      meta,
    )
    expect(warnings).toEqual(['Mill: no infobox image', 'Flour: no icon (add it to itemIcons)'])
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
      meta,
    )
    expect(dataset.recipes.map((r) => r.id)).toEqual(['cannery/canned-food', 'cannery/canned-food-from-fish'])
  })

  it('applies aliases, recipe overrides and preferred ordering', () => {
    const overrides: Overrides = {
      ...noOverrides,
      itemAliases: { Iron: 'Iron Bars' },
      buildings: { smokery: { workers: 4, cost: [{ item: 'Planks', qty: 21 }] } },
      recipes: { 'tea-roaster/tea': { inputs: [{ item: 'Tea Leaves', qty: 1 }] } },
      preferredRecipe: { threads: 'flax-spinner/threads' },
      itemIcons: { Planks: 'Tex wood 07.png', 'Tea Leaves': 'Tex herbs 07.png' },
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
      meta,
    )
    expect(warnings).toEqual([])
    expect(dataset.recipes[0].id).toBe('flax-spinner/threads')
    const furnace = dataset.recipes.find((r) => r.building === 'blast-furnace')!
    expect(furnace.outputs).toEqual([{ item: 'iron-bars', qty: 5 }])
    expect(furnace.inputs).toEqual([{ item: 'iron-ore', qty: 1 }])
    const tea = dataset.recipes.find((r) => r.id === 'tea-roaster/tea')!
    expect(tea.inputs).toEqual([{ item: 'tea-leaves', qty: 1 }])
    expect(dataset.buildings.find((b) => b.id === 'smokery')).toMatchObject({ workers: 4, cost: [{ item: 'planks', qty: 21 }] })
    expect(dataset.items.find((i) => i.id === 'iron-bars')!.name).toBe('Iron Bars')
  })

  it('warns on missing workers, unknown guild and dangling overrides', () => {
    const { dataset, warnings } = buildDataset(
      [building('Mill', [{ inputs: [['Wheat', 1]], outputs: [['Flour', 2]], timeSeconds: 89 }], { workers: null, guildText: 'Cooks', cost: [] })],
      {
        ...noOverrides,
        recipes: { 'nope/x': {} },
        preferredRecipe: { flour: 'nope/x' },
        extraRecipes: [{ building: 'ghost', inputs: [], outputs: [{ item: 'Water', qty: 1 }], timeSeconds: 1 }],
        foods: { Cake: 1 },
      },
      meta,
    )
    expect(dataset.recipes.map((r) => r.id)).toEqual(['mill/flour'])
    expect(warnings).toEqual([
      'Mill: unknown guild text "Cooks"',
      'Mill: no worker count',
      'Mill: no construction cost',
      'override for unknown recipe nope/x',
      'extra recipe for unknown building ghost skipped',
      'preferredRecipe flour -> nope/x not found',
      'food Cake is not an item',
    ])
  })

  it('merges extra buildings, extra recipes and food flags', () => {
    const { dataset, rawItems, warnings } = buildDataset(
      [building('Mill', [{ inputs: [['Wheat', 1]], outputs: [['Flour', 5]], timeSeconds: 89 }])],
      {
        ...noOverrides,
        extraBuildings: { farm: { name: 'Farm', workers: 2, guild: 'Farmer', catalyst: null, cost: [{ item: 'Planks', qty: 8 }], icon: 'Farm.PNG' } },
        extraRecipes: [
          { building: 'farm', inputs: [], outputs: [{ item: 'Wheat', qty: 144 }], timeSeconds: 1728, tilesPerBuilding: 72, note: 'almanac' },
          { building: 'farm', inputs: [], outputs: [{ item: 'Berries', qty: 72 }], timeSeconds: 864, tilesPerBuilding: 36 },
        ],
        foods: { Berries: 1 },
        itemIcons: { Berries: 'Tex berries.png', Planks: 'Tex planks.png' },
      },
      meta,
    )
    expect(warnings).toEqual([])
    expect(dataset.buildings.map((b) => b.id)).toEqual(['mill', 'farm'])
    expect(dataset.buildings[1]).toEqual({
      id: 'farm',
      name: 'Farm',
      workers: 2,
      guild: 'Farmer',
      catalyst: null,
      cost: [{ item: 'planks', qty: 8 }],
      wikiUrl: 'https://wiki.hoodedhorse.com/Whiskerwood/Farm',
      icon: 'Farm.PNG',
    })
    expect(dataset.recipes.map((r) => r.id)).toEqual(['mill/flour', 'farm/wheat', 'farm/berries'])
    expect(dataset.recipes[1]).toMatchObject({ outputs: [{ item: 'wheat', qty: 144 }], timeSeconds: 1728, tilesPerBuilding: 72, note: 'almanac' })
    expect(dataset.recipes[2]).not.toHaveProperty('note')
    expect(dataset.items.find((i) => i.id === 'berries')).toEqual({ id: 'berries', name: 'Berries', icon: 'Tex berries.png', food: true, quality: 1 })
    expect(dataset.items.find((i) => i.id === 'wheat')).not.toHaveProperty('food')
    expect(rawItems).toEqual(['logs', 'planks'])
  })
})

it('keeps tiles and notes that the parser attached to a recipe', () => {
  const { dataset } = buildDataset(
    [building('Farm', [{ inputs: [], outputs: [['Wheat', 144]], timeSeconds: 1728, tilesPerBuilding: 72, note: 'crops table' }])],
    noOverrides,
    { generatedAt: 'now', source: 'tables', gameVersion: '0.7.206.0' },
  )
  expect(dataset).toMatchObject({ generatedAt: 'now', source: 'tables', gameVersion: '0.7.206.0' })
  expect(dataset.recipes[0]).toMatchObject({ id: 'farm/wheat', tilesPerBuilding: 72, note: 'crops table' })
})
