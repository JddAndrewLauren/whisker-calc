import type { DatasetIndex } from '../data/index.ts'
import type { Ingredient } from '../data/types.ts'

interface Props {
  index: DatasetIndex
  cost: Ingredient[]
}

export function ConstructionCosts({ index, cost }: Props) {
  if (cost.length === 0) return null
  return (
    <section>
      <h2>Materials to build</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {cost.map((c) => (
            <tr key={c.item}>
              <td>{index.itemsById.get(c.item)?.name ?? c.item}</td>
              <td>{c.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">Construction cost of the rounded-up building counts above. Machinery worn down over time is not counted.</p>
    </section>
  )
}
