import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBuildingPage } from './parseBuildingPage.ts'

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}.txt`, import.meta.url), 'utf8')
const parse = (name: string) => parseBuildingPage(name, fixture(name))

describe('parseBuildingPage', () => {
  it('parses the Weaver (two recipes, infobox fields)', () => {
    const b = parse('Weaver')
    expect(b.problems).toEqual([])
    expect(b.workers).toBe(3)
    expect(b.guildText).toBe("Explorer's")
    expect(b.catalyst).toBe('Scissors')
    expect(b.cost).toEqual([['Logs', 21], ['Machinery', 1]])
    expect(b.recipes).toEqual([
      { inputs: [['Flax', 1]], outputs: [['Woven Cloaks', 2]], timeSeconds: 233 },
      { inputs: [['Threads', 3]], outputs: [['Fabrics', 3]], timeSeconds: 233 },
    ])
  })

  it('parses the Tailor', () => {
    const b = parse('Tailor')
    expect(b.problems).toEqual([])
    expect(b.workers).toBe(3)
    expect(b.recipes).toEqual([
      { inputs: [['Fabrics', 3]], outputs: [['Tailored Clothes', 2]], timeSeconds: 144 },
      { inputs: [['Fabrics', 3]], outputs: [['Bedding', 3]], timeSeconds: 144 },
    ])
  })

  it('handles multi-input rows, doubled 30px, colspan prefixes and pollution cells (Bakery)', () => {
    const b = parse('Bakery')
    expect(b.problems).toEqual([])
    expect(b.workers).toBe(3)
    expect(b.guildText).toBe('Farming')
    expect(b.recipes).toEqual([
      { inputs: [['Flour', 2], ['Fuel', 1]], outputs: [['Bread', 5]], timeSeconds: 144 },
      { inputs: [['Flour', 3], ['Berries', 1], ['Fuel', 1]], outputs: [['Jam Pastries', 5]], timeSeconds: 144 },
    ])
  })

  it('handles a recipe with no item inputs (Fishing Dock)', () => {
    const b = parse('Fishing_Dock')
    expect(b.problems).toEqual([])
    expect(b.name).toBe('Fishing Dock')
    expect(b.workers).toBe(3)
    expect(b.cost).toEqual([['Logs', 21], ['Machinery', 1]])
    expect(b.recipes).toEqual([{ inputs: [], outputs: [['Fish', 1]], timeSeconds: 21 }])
  })

  it('finds a recipe table that has no ==Recipes== heading (Ore Furnace)', () => {
    const b = parse('Ore_Furnace')
    expect(b.problems).toEqual([])
    expect(b.workers).toBe(2)
    expect(b.guildText).toBe("Miner's")
    expect(b.catalyst).toBe('Fire Tongs')
    expect(b.cost).toEqual([['Cut stone', 13], ['Machinery', 1]])
    expect(b.recipes).toEqual([
      { inputs: [['Copper', 1], ['Fuel', 1]], outputs: [['Copper Bars', 5]], timeSeconds: 144 },
      { inputs: [['Copper', 1], ['Tin Ore', 1], ['Fuel', 1]], outputs: [['Bronze Bars', 5]], timeSeconds: 144 },
      { inputs: [['Gold Ore', 1], ['Fuel', 1]], outputs: [['Gold Bullion', 1]], timeSeconds: 377 },
    ])
  })

  it('keeps raw item names untouched (Blast Furnace)', () => {
    const b = parse('Blast_Furnace')
    expect(b.problems).toEqual([])
    expect(b.recipes[0]).toEqual({ inputs: [['Iron ore', 1], ['Fuel', 2]], outputs: [['Iron', 5]], timeSeconds: 233 })
  })

  it('handles empty leading cells (Tea Roaster)', () => {
    const b = parse('Tea_Roaster')
    expect(b.problems).toEqual([])
    expect(b.recipes).toEqual([
      { inputs: [['Tea', 1], ['Fuel', 1]], outputs: [['Tea', 5]], timeSeconds: 89 },
      { inputs: [['Tea', 2], ['Spices', 1], ['Fuel', 1]], outputs: [['Fine tea', 5]], timeSeconds: 89 },
    ])
  })

  it('reports unparsed item cells instead of silently dropping them', () => {
    const text = '==Recipes==\n{|\n|-\n| [[File:X.png|30px]] Broken\n| [[File:Icons8-time-machine-96.png|30px]] 10.0s\n| [[File:Y.png|30px]] Out 1\n|}'
    const b = parseBuildingPage('X', text)
    expect(b.problems).toHaveLength(1)
    expect(b.problems[0]).toContain('Broken')
  })
})
