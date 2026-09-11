import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Dataset, Overrides } from '../../src/data/types.ts'
import { entityNames, matchLine, numericHints, stem, tokens } from './match.ts'

const dataset = JSON.parse(readFileSync(new URL('../../src/data/whiskerwood.json', import.meta.url), 'utf8')) as Dataset
const overrides = JSON.parse(readFileSync(new URL('../../src/data/overrides.json', import.meta.url), 'utf8')) as Overrides
const names = entityNames(dataset, { ...overrides.itemAliases, Plank: 'Planks' })
const match = (text: string) => matchLine(text, names, dataset.recipes)

describe('stem / tokens', () => {
  it('meets plural, verb and agent forms in the middle', () => {
    for (const [a, b] of [['roasting', 'Roaster'], ['Vises', 'Vise'], ['Pastries', 'Pastry'], ['Threads', 'Thread'], ['Boilers', 'Boiler']]) {
      expect(stem(a.toLowerCase())).toBe(stem(b.toLowerCase()))
    }
    expect(tokens('CutStone and FineTea')).toEqual(tokens('Cut Stone and Fine Tea'))
    expect(tokens('Cut Stone')).toHaveLength(2)
    expect(stem('smoked')).toBe(stem('smoke'))
  })
})

describe('matchLine', () => {
  it.each([
    ['Reduce Stone Cutter cycle time from 377 to 233 seconds.', 'stone-cutter/cut-stone'],
    ['Reduce Tea roasting cycle time from 89 to 55 seconds', 'tea-roaster/tea'],
    ['Boost Thread per Cotton from 3 to 8', 'cotton-gin/threads'],
    ['Boost the number of fuel generated per coal from 5 to 21', 'sifting-tower/fuel'],
    ['Nerf netter production speed from 211 to 377 seconds per cycle', 'netter/fishing-nets'],
    ['Reduce fish produced per fishing dock cycle from 2 to 1', 'fishing-dock/fish'],
    ['Increase Vises production cycle time from 144 to 377 seconds', 'carpenter/wooden-vises'],
    ['Boost FineTea per cycle from 3 to 8', 'tea-roaster/fine-tea'],
    ['Double production cycle time of Steam Boilers', 'steam-boiler/steam'],
  ])('%s -> %s', (text, recipe) => {
    expect(match(text).recipes[0]).toBe(recipe)
  })

  it('grades confidence by evidence', () => {
    expect(match('Reduce Tea roasting cycle time from 89 to 55 seconds').confidence).toBe('high')
    expect(match('Nerf netter production speed from 211 to 377 seconds per cycle').confidence).toBe('medium')
    expect(match('Increase Vises production cycle time from 144 to 377 seconds').confidence).toBe('low')
    expect(match('Reduce Stone Cutter cycle time from 377 to 233 seconds.').confidence).toBe('low')
    expect(match('Tweak world map generation to make empty islands more common')).toEqual({ entities: [], recipes: [], confidence: 'none' })
  })

  it('drops partial hits that a full hit already explains', () => {
    expect(match('Reduce fish produced per fishing dock cycle from 2 to 1').entities.map((e) => e.id)).not.toContain('smoked-fish')
    expect(match('Boost Tea per cycle from 3 to 5').entities.map((e) => e.id)).not.toContain('fine-tea')
    expect(match('Boost FineTea per cycle from 3 to 8').entities.map((e) => e.id)).toEqual(['fine-tea'])
  })

  it('reports a last-word-only hit as partial', () => {
    expect(match('Increase Vises production cycle time from 144 to 377 seconds').entities).toEqual([{ kind: 'item', id: 'wooden-vises', partial: true }])
  })

  it('resolves alias spellings to the aliased item', () => {
    expect(match('Increase plank cost portion of Large Warehouse from 34 planks 55 planks').entities).toEqual([{ kind: 'item', id: 'planks', partial: false }])
  })

  it('scores an alias that shares tokens with the item name once', () => {
    const text = 'Reduce plank cost of Furniture from 4 to 2'
    const noAlias = matchLine(text, entityNames(dataset, overrides.itemAliases), dataset.recipes)
    expect(match(text)).toEqual(noAlias)
    expect(match(text).confidence).toBe('high')
  })
})

describe('numericHints', () => {
  it.each([
    ['Reduce Stone Cutter cycle time from 377 to 233 seconds.', { from: '377', to: '233', unit: 'seconds' }],
    ['Increase Cotton to Thread cycle time from 89seconds to 144seconds', { from: '89', to: '144', unit: 'seconds' }],
    ['Increase plank cost portion of Large Warehouse from 34 planks 55 planks', { from: '34', to: '55', unit: 'planks' }],
    ['Flip Stone to CutStone recipe ratio from 2:3 to 3:2', { from: '2:3', to: '3:2' }],
    ['Double production cycle time of Steam Boilers', { factor: 2 }],
    ['Halve fish production by shore fishing', { factor: 0.5 }],
    ['Reduce steam consumption of Steam Engine boosting Factories by 87.5%', { percent: 87.5 }],
    ['Boost yields by 3x', { factor: 3 }],
    ['Increase default fire tender range By 50%', { percent: 50 }],
    ['Fish production halved', { factor: 0.5 }],
    ['Triple the output of Smokers', { factor: 3 }],
    ['Add Gauno to fertilizer recipe', null],
    ['Increase capacity of rail carts from 3 to 6. Whiskers more likely to avoid stations with crowded platforms', { from: '3', to: '6' }],
    ['Nerf whisker population tax from 5 to 3 per whisker per day in normal difficulty', { from: '5', to: '3' }],
    ['Boost max horizontal Whisker Launcher distance from 5 to 8 to match height limit', { from: '5', to: '8' }],
    ['Whisker Launcher vertical range adjusted to max 10 tiles up or 3 tiles down (from 10 up or down). Max range details now shown in destination assigner.', null],
  ])('%s', (text, expected) => {
    expect(numericHints(text)).toEqual(expected)
  })
})
