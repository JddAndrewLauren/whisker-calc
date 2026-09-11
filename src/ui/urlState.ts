import { NO_MODIFIERS, type ModifierSettings } from '../calc/types.ts'

export interface AppState {
  targetItem: string
  ratePerMin: number
  recipeChoice: Record<string, string>
  modifiers: Record<string, ModifierSettings>
}

export const DEFAULT_STATE: AppState = { targetItem: 'tailored-clothes', ratePerMin: 1, recipeChoice: {}, modifiers: {} }

function encodeModifier(m: ModifierSettings): string {
  const flags = (m.guild ? 'g' : '') + (m.catalyst ? 'c' : '') + (m.steam ? 's' : '')
  return flags + (m.extraPercent ? String(m.extraPercent) : '')
}

function decodeModifier(s: string): ModifierSettings | null {
  const m = /^([gcs]*)(-?\d+(?:\.\d+)?)?$/.exec(s)
  if (!m) return null
  return { guild: m[1].includes('g'), catalyst: m[1].includes('c'), steam: m[1].includes('s'), extraPercent: Number(m[2] ?? 0) }
}

const isDefault = (m: ModifierSettings) => encodeModifier(m) === ''

/** Encode state as a URL hash (without the leading '#'). Defaults are omitted. */
export function encodeState(s: AppState): string {
  const p = new URLSearchParams()
  p.set('i', s.targetItem)
  if (s.ratePerMin !== DEFAULT_STATE.ratePerMin) p.set('rate', String(s.ratePerMin))
  const r = Object.entries(s.recipeChoice).map(([item, recipe]) => `${item}:${recipe}`)
  if (r.length) p.set('r', r.join(';'))
  const m = Object.entries(s.modifiers)
    .filter(([, v]) => !isDefault(v))
    .map(([b, v]) => `${b}:${encodeModifier(v)}`)
  if (m.length) p.set('m', m.join(';'))
  return p.toString()
}

export function decodeState(hash: string): AppState {
  const p = new URLSearchParams(hash.replace(/^#/, ''))
  const state: AppState = { ...DEFAULT_STATE, recipeChoice: {}, modifiers: {} }
  const item = p.get('i')
  if (item) state.targetItem = item
  const rate = Number(p.get('rate'))
  if (p.has('rate') && Number.isFinite(rate) && rate >= 0) state.ratePerMin = rate
  for (const pair of (p.get('r') ?? '').split(';').filter(Boolean)) {
    const idx = pair.indexOf(':')
    if (idx > 0) state.recipeChoice[pair.slice(0, idx)] = pair.slice(idx + 1)
  }
  for (const pair of (p.get('m') ?? '').split(';').filter(Boolean)) {
    const idx = pair.indexOf(':')
    const m = idx > 0 ? decodeModifier(pair.slice(idx + 1)) : null
    if (m) state.modifiers[pair.slice(0, idx)] = { ...NO_MODIFIERS, ...m }
  }
  return state
}
