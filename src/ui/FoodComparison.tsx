import type { FoodOption } from '../calc/compare.ts'
import type { DatasetIndex } from '../data/index.ts'
import { ItemLabel } from './Icon.tsx'
import { StepsTable } from './StepsTable.tsx'

interface Props {
  index: DatasetIndex
  options: FoodOption[]
  population: number
  quality: number
  /** Plan one food on its own, in the "to feed" mode. */
  onPick: (itemId: string) => void
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
const workersLabel = (w: number | null) => (w === null ? '?' : String(w))

export function FoodComparison({ index, options, population, quality, onPick }: Props) {
  if (options.length === 0) return <p>No producible food has {quality}-star quality.</p>
  const hasTiles = options.some((o) => o.result.steps.some((s) => s.tiles !== undefined))
  return (
    <>
      <section>
        <h2>{quality}-star food, fewest workers first</h2>
        <table>
          <thead>
            <tr>
              <th>Food</th>
              <th>Workers</th>
              <th>Buildings</th>
              {hasTiles && <th>Farm tiles</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {options.map((o) => (
              <tr key={o.itemId}>
                <td>
                  <ItemLabel index={index} id={o.itemId} />
                </td>
                <td>
                  <strong>{workersLabel(o.workers)}</strong> of {population}
                  {o.workers !== null && population > 0 && <span className="muted"> ({Math.round((100 * o.workers) / population)}%)</span>}
                </td>
                <td>{o.result.steps.reduce((sum, s) => sum + s.buildingsCeil, 0)}</td>
                {hasTiles && <td>{fmt(o.result.steps.reduce((sum, s) => sum + (s.tiles ?? 0), 0))}</td>}
                <td>
                  <button type="button" onClick={() => onPick(o.itemId)}>
                    Plan this
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          Feeding {population} Whiskers one meal a day; the workers come out of that population and staff the rounded-up
          building counts ({options.map((o) => fmt(o.workersExact)).join(', ')} before rounding). Recipe choices and building
          modifiers below apply to every option.
        </p>
      </section>
      {options.map((o) => (
        <StepsTable
          key={o.itemId}
          index={index}
          steps={o.result.steps}
          title={
            <>
              <ItemLabel index={index} id={o.itemId} />: {workersLabel(o.workers)} of {population} Whiskers
            </>
          }
          footer={
            <p className="muted">
              {o.result.raw.length > 0 && (
                <>
                  Also needs mined inputs, not staffed here:{' '}
                  {o.result.raw.map((r, i) => (
                    <span key={r.itemId}>
                      {i > 0 && ', '}
                      {r.perMin.toFixed(3)} <ItemLabel index={index} id={r.itemId} /> per minute
                    </span>
                  ))}
                  .{' '}
                </>
              )}
              {o.result.steps.some((s) => index.recipesById.get(s.recipeId)?.note) && 'Hover "est." for where a number comes from.'}
            </p>
          }
        />
      ))}
    </>
  )
}
