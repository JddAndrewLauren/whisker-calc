import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { Dataset } from '../../src/data/types.ts'

/** Recipe ids that have been in circulation in shared links. Renames go here deliberately. */
const aliasedIds: Record<string, string> = {}

it('keeps every recipe id that links may already point at', () => {
  const dataset = JSON.parse(readFileSync(new URL('../../src/data/whiskerwood.json', import.meta.url), 'utf8')) as Dataset
  const current = new Set(dataset.recipes.map((r) => r.id))
  const expected = readFileSync(new URL('./__fixtures__/recipe-ids.txt', import.meta.url), 'utf8').trim().split('\n')
  const missing = expected.map((id) => aliasedIds[id] ?? id).filter((id) => !current.has(id))
  expect(missing).toEqual([])
})
