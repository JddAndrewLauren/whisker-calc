import { expect, it } from 'vitest'
import { DEFAULT_STATE, decodeState, encodeState, type AppState } from './urlState.ts'

it('round-trips state through the hash', () => {
  const s: AppState = {
    ...DEFAULT_STATE,
    targetItem: 'bedding',
    ratePerMin: 2.5,
    recipeChoice: { threads: 'flax-spinner/threads', fuel: 'sifting-tower/fuel' },
    modifiers: {
      weaver: { guild: true, catalyst: true, steam: false, extraPercent: 25 },
      'cotton-gin': { guild: false, catalyst: false, steam: true, extraPercent: -10 },
      tailor: { guild: false, catalyst: false, steam: false, extraPercent: 0 },
    },
  }
  const encoded = encodeState(s)
  expect(encoded).toBe('i=bedding&rate=2.5&r=threads%3Aflax-spinner%2Fthreads%3Bfuel%3Asifting-tower%2Ffuel&m=weaver%3Agc25%3Bcotton-gin%3As-10')
  const { tailor: _omitted, ...expectedModifiers } = s.modifiers
  expect(decodeState('#' + encoded)).toEqual({ ...s, modifiers: expectedModifiers })
})

it('encodes the population and buildings modes by their own parameter', () => {
  const pop: AppState = { ...DEFAULT_STATE, mode: 'population', targetItem: 'bread', population: 90 }
  expect(encodeState(pop)).toBe('i=bread&pop=90')
  expect(decodeState(encodeState(pop))).toEqual(pop)

  const n: AppState = { ...DEFAULT_STATE, mode: 'buildings', buildingCount: 3 }
  expect(encodeState(n)).toBe('i=tailored-clothes&n=3')
  expect(decodeState(encodeState(n))).toEqual(n)
})

it('falls back to defaults on an empty or garbled hash', () => {
  expect(decodeState('')).toEqual(DEFAULT_STATE)
  expect(decodeState('#rate=abc&pop=-1&m=weaver:zz;nope')).toEqual(DEFAULT_STATE)
})
