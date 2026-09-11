import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Dataset } from '../src/data/types.ts'

/** The output of `npm run icons`: every item and building in the dataset has its PNG under public/icons. */
describe('fetch-icons output', () => {
  const dataset = JSON.parse(readFileSync(new URL('../src/data/whiskerwood.json', import.meta.url), 'utf8')) as Dataset
  const missing = (kind: string, ids: string[]) => ids.filter((id) => !existsSync(new URL(`../public/icons/${kind}/${id}.png`, import.meta.url)))
  it('exist for every item', () => {
    expect(missing('items', dataset.items.map((i) => i.id))).toEqual([])
  })
  it('exist for every building', () => {
    expect(missing('buildings', dataset.buildings.map((b) => b.id))).toEqual([])
  })
})
