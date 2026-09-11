import { speedMultiplier } from '../calc/speed.ts'
import { NO_MODIFIERS, type ModifierSettings } from '../calc/types.ts'
import type { Building } from '../data/types.ts'

interface Props {
  buildings: Building[]
  modifiers: Record<string, ModifierSettings>
  onChange: (buildingId: string, next: ModifierSettings) => void
}

export function BuildingModifiers({ buildings, modifiers, onChange }: Props) {
  if (buildings.length === 0) return null
  return (
    <section>
      <h2>Production speed modifiers</h2>
      <table>
        <thead>
          <tr>
            <th>Building</th>
            <th>Guild match (+50%)</th>
            <th>Catalyst (+25%)</th>
            <th>Steam engine (+100%)</th>
            <th>Extra %</th>
            <th>Speed</th>
          </tr>
        </thead>
        <tbody>
          {buildings.map((b) => {
            const m = modifiers[b.id] ?? NO_MODIFIERS
            const set = (patch: Partial<ModifierSettings>) => onChange(b.id, { ...m, ...patch })
            return (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>
                  <input type="checkbox" checked={m.guild} onChange={(e) => set({ guild: e.target.checked })} />{' '}
                  {b.guild ? `${b.guild}s` : 'n/a'}
                </td>
                <td>
                  <input type="checkbox" checked={m.catalyst} onChange={(e) => set({ catalyst: e.target.checked })} />{' '}
                  {b.catalyst ?? 'n/a'}
                </td>
                <td>
                  <input type="checkbox" checked={m.steam} onChange={(e) => set({ steam: e.target.checked })} />
                </td>
                <td>
                  <input
                    type="number"
                    step="5"
                    value={m.extraPercent}
                    onChange={(e) => set({ extraPercent: Number(e.target.value) || 0 })}
                  />
                </td>
                <td>x{speedMultiplier(m).toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
