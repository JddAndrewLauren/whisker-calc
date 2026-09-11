import type { TargetMode } from '../calc/types.ts'
import type { DatasetIndex } from '../data/index.ts'
import type { Item } from '../data/types.ts'
import { ItemSelect } from './ItemSelect.tsx'
import type { AppState } from './urlState.ts'

interface Props {
  index: DatasetIndex
  items: Item[]
  state: AppState
  producerName: string | null
  ratePerMin: number
  onChange: (patch: Partial<AppState>) => void
}

const nonNegative = (value: string) => Math.max(0, Number(value) || 0)

export function TargetControls({ index, items, state, producerName, ratePerMin, onChange }: Props) {
  const targetName = index.itemsById.get(state.targetItem)?.name ?? state.targetItem
  return (
    <section className="controls">
      <label>
        Produce
        <ItemSelect items={items} value={state.targetItem} onChange={(targetItem) => onChange({ targetItem })} />
      </label>
      <select value={state.mode} onChange={(e) => onChange({ mode: e.target.value as TargetMode })} aria-label="Target mode">
        <option value="rate">at a rate of</option>
        <option value="population">to feed</option>
        <option value="buildings">using</option>
      </select>
      {state.mode === 'rate' && (
        <label>
          <input type="number" min="0" step="0.1" value={state.ratePerMin} onChange={(e) => onChange({ ratePerMin: nonNegative(e.target.value) })} />
          per minute
        </label>
      )}
      {state.mode === 'population' && (
        <label>
          <input type="number" min="0" step="1" value={state.population} onChange={(e) => onChange({ population: nonNegative(e.target.value) })} />
          Whiskers, one meal a day
        </label>
      )}
      {state.mode === 'buildings' && (
        <label>
          <input type="number" min="0" step="1" value={state.buildingCount} onChange={(e) => onChange({ buildingCount: nonNegative(e.target.value) })} />
          {producerName ?? 'buildings'}
        </label>
      )}
      {state.mode !== 'rate' && (
        <span className="muted">
          = {ratePerMin.toFixed(2)} {targetName} per minute
        </span>
      )}
    </section>
  )
}
