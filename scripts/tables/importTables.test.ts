import { describe, expect, it } from 'vitest'
import { readIndex, table } from './readIndex.ts'
import { tablesToParsed } from './importTables.ts'

const index = readIndex(new URL('./__fixtures__/index.excerpt.json', import.meta.url))
const farmTiles = { Cotton: 72, Berries: 36 }
const { parsed, foods, problems } = tablesToParsed(index, farmTiles)
const byName = (name: string) => parsed.find((p) => p.name === name)!

describe('tablesToParsed', () => {
  it('reports no problems on the fixture', () => {
    expect(problems).toEqual([])
  })

  it('names buildings from the English text table and skips those with no usable recipe', () => {
    expect(parsed.map((p) => p.name).sort()).toEqual(['Cannery', 'Cotton Gin', 'Farm', 'Steam Boiler', 'Tailor', 'Water Pump', 'Weaver'])
  })

  it('reads workers, guild, catalyst and construction cost', () => {
    expect(byName('Weaver')).toMatchObject({
      workers: 3,
      guildText: 'explorers',
      catalyst: 'Scissors',
      cost: [['Logs', 21], ['Machinery', 1]],
    })
    expect(byName('Steam Boiler')).toMatchObject({ workers: 0, guildText: null, catalyst: null })
  })

  it('keeps recipe order and resolves resource ids to display names', () => {
    expect(byName('Cannery').recipes.map((r) => r.inputs[0][0])).toEqual(['Berries', 'Fish', 'Mushrooms'])
    expect(byName('Cotton Gin').recipes).toEqual([{ inputs: [['Cotton', 1]], outputs: [['Threads', 8]], timeSeconds: 144 }])
    expect(byName('Water Pump').recipes).toEqual([{ inputs: [], outputs: [['Piped Water', 5]], timeSeconds: 8 }])
  })

  it('skips ship recipes, recipes without outputs and non-physical outputs', () => {
    expect(parsed.find((p) => p.name.includes('Shipyard'))).toBeUndefined()
    expect(parsed.find((p) => p.name.includes('Wheel'))).toBeUndefined()
    expect(byName('Tailor').recipes.map((r) => r.outputs[0][0])).toEqual(['Tailored Cloaks', 'Bedding'])
  })

  it('names icons the way the wiki hosts the same textures', () => {
    expect(byName('Weaver').image).toBe('Weaver.PNG')
    expect(byName('Weaver').icons).toMatchObject({ Logs: 'Tex wood 03.png', Planks: 'Tex wood 07.png', Machinery: 'Tex MiningIcons 14 t.png', Cotton: 'Cotton.png' })
  })

  it('links the boiler recipe that its building row does not list', () => {
    expect(byName('Steam Boiler').recipes).toEqual([{ inputs: [['Fuel', 1]], outputs: [['Piped Steam', 89]], timeSeconds: 21 }])
  })

  it('derives farm recipes from the crops table and the tiles override', () => {
    expect(byName('Farm').recipes).toEqual([
      expect.objectContaining({ outputs: [['Cotton', 144]], timeSeconds: 1728, tilesPerBuilding: 72 }),
      expect.objectContaining({ outputs: [['Berries', 72]], timeSeconds: 864, tilesPerBuilding: 36 }),
    ])
    expect(byName('Farm').recipes[0].note).toContain('0.1 years (1728 s)')
  })

  it('grades the foods the recipes touch by the meal table tier', () => {
    expect(foods).toEqual({ Berries: 1, 'Canned Food': 0, Fish: 0, Mushrooms: 1 })
  })

  it('reports a crop with no tiles override and a missing text key instead of guessing', () => {
    const r = tablesToParsed(index, { Cotton: 72 })
    expect(r.problems).toEqual(['farm: no farmTiles override for Berries'])
    const broken = structuredClone(index)
    delete table(broken, 'TextDB/Loc_En')['building.weaver']
    expect(tablesToParsed(broken, farmTiles).problems).toEqual(['weaver: no English text for building.weaver'])
  })

  it('reports a renamed SystemTunes row as a problem instead of crashing', () => {
    const broken = structuredClone(index)
    delete table(broken, 'SystemTunes').SecondsPerYear
    expect(tablesToParsed(broken, farmTiles).problems).toEqual(['SystemTunes.SecondsPerYear: FloatValue is not a number (undefined)'])
  })

  it('fails loudly on a missing table', () => {
    expect(() => table(index, 'Nope')).toThrow(/table Nope not found/)
  })
})
