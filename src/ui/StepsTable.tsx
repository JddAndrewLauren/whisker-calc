import type { Step } from '../calc/types.ts'
import type { DatasetIndex } from '../data/index.ts'
import { BuildingLabel } from './Icon.tsx'
import { RecipeLine } from './RecipeLine.tsx'

interface Props {
  index: DatasetIndex
  steps: Step[]
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

export function StepsTable({ index, steps }: Props) {
  const hasTiles = steps.some((s) => s.tiles !== undefined)
  return (
    <section>
      <h2>Buildings needed</h2>
      <table>
        <thead>
          <tr>
            <th>Building</th>
            <th>Recipe</th>
            <th>Output / min</th>
            <th>Per building / min</th>
            <th>Buildings</th>
            <th>Rounded up</th>
            <th>Workers</th>
            {hasTiles && <th>Farm tiles</th>}
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => {
            const recipe = index.recipesById.get(s.recipeId)!
            return (
              <tr key={s.recipeId}>
                <td style={{ paddingLeft: `${0.5 + s.depth}rem` }}>
                  <BuildingLabel index={index} id={s.buildingId} link />
                </td>
                <td className="muted">
                  <RecipeLine index={index} recipe={recipe} />
                  {recipe.note && (
                    <>
                      {' '}
                      <abbr className="tag" title={recipe.note}>
                        est.
                      </abbr>
                    </>
                  )}
                </td>
                <td>{fmt(s.demandPerMin)}</td>
                <td>{fmt(s.ratePerBuilding)}</td>
                <td>
                  <strong>{fmt(s.buildings)}</strong>
                  {s.speedMultiplier !== 1 && <span className="muted"> @ x{s.speedMultiplier.toFixed(2)}</span>}
                </td>
                <td>{s.buildingsCeil}</td>
                <td>{s.workers === null ? '?' : s.buildingsCeil * s.workers}</td>
                {hasTiles && <td>{s.tiles === undefined ? '' : fmt(s.tiles)}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="muted">Hover "est." for where a number comes from when it is not straight from the game's data tables.</p>
    </section>
  )
}
