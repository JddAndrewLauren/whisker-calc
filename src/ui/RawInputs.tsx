import type { SolveResult } from '../calc/types.ts'
import type { DatasetIndex } from '../data/index.ts'

interface Props {
  index: DatasetIndex
  raw: SolveResult['raw']
}

export function RawInputs({ index, raw }: Props) {
  if (raw.length === 0) return null
  return (
    <section>
      <h2>Raw inputs</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Needed / min</th>
          </tr>
        </thead>
        <tbody>
          {raw.map((r) => (
            <tr key={r.itemId}>
              <td>{index.itemsById.get(r.itemId)?.name ?? r.itemId}</td>
              <td>{r.perMin.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Farms, mines, foraging, water and steam are not modeled; the wiki has no fixed rate for them. Copper and bronze bars also
        show here because their furnace pages have no recipe table yet.
      </p>
    </section>
  )
}
