import type { Step } from '../calc/types.ts'
import type { DatasetIndex } from '../data/index.ts'
import { describeRecipe } from './describe.ts'

interface Props {
  index: DatasetIndex
  steps: Step[]
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

export function StepsTable({ index, steps }: Props) {
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
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => {
            const recipe = index.recipesById.get(s.recipeId)!
            const building = index.buildingsById.get(s.buildingId)
            return (
              <tr key={s.recipeId}>
                <td style={{ paddingLeft: `${0.5 + s.depth}rem` }}>
                  <a href={building?.wikiUrl} target="_blank" rel="noreferrer">
                    {building?.name ?? s.buildingId}
                  </a>
                </td>
                <td className="muted">{describeRecipe(index, recipe).replace(/^[^:]+: /, '')}</td>
                <td>{fmt(s.demandPerMin)}</td>
                <td>{fmt(s.ratePerBuilding)}</td>
                <td>
                  <strong>{fmt(s.buildings)}</strong>
                  {s.speedMultiplier !== 1 && <span className="muted"> @ x{s.speedMultiplier.toFixed(2)}</span>}
                </td>
                <td>{s.buildingsCeil}</td>
                <td>{s.workers === null ? '?' : s.buildingsCeil * s.workers}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
