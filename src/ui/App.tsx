import { useMemo } from 'react'
import { solve } from '../calc/solve.ts'
import { loadDataset } from '../data/index.ts'
import { BuildingModifiers } from './BuildingModifiers.tsx'
import { ItemSelect } from './ItemSelect.tsx'
import { RawInputs } from './RawInputs.tsx'
import { RecipePicker } from './RecipePicker.tsx'
import { StepsTable } from './StepsTable.tsx'
import { useHashState } from './useHashState.ts'

const index = loadDataset()
const producible = index.dataset.items.filter((i) => index.recipesByOutput.has(i.id)).sort((a, b) => a.name.localeCompare(b.name))

export function App() {
  const [state, update] = useHashState()
  const result = useMemo(() => solve(index, state), [state])

  const choosableItems = useMemo(() => {
    const seen = new Set<string>()
    for (const s of result.steps) {
      const recipe = index.recipesById.get(s.recipeId)!
      for (const id of [s.itemId, ...recipe.inputs.map((i) => i.item)]) {
        if ((index.recipesByOutput.get(id)?.length ?? 0) > 1) seen.add(id)
      }
    }
    return [...seen]
  }, [result])

  const buildings = useMemo(
    () => result.steps.map((s) => index.buildingsById.get(s.buildingId)!).filter((b, i, arr) => arr.indexOf(b) === i),
    [result],
  )

  return (
    <main>
      <header>
        <h1>Whiskerwood production calculator</h1>
        <p className="muted">How many of each building you need to sustain a target output, using base recipe times from the wiki.</p>
      </header>

      <section className="controls">
        <label>
          Produce
          <ItemSelect items={producible} value={state.targetItem} onChange={(targetItem) => update((s) => ({ ...s, targetItem }))} />
        </label>
        <label>
          at
          <input
            type="number"
            min="0"
            step="0.1"
            value={state.ratePerMin}
            onChange={(e) => update((s) => ({ ...s, ratePerMin: Math.max(0, Number(e.target.value) || 0) }))}
          />
          per minute
        </label>
      </section>

      {result.warnings.map((w) => (
        <p key={w} className="warning">
          {w}
        </p>
      ))}

      {result.steps.length === 0 ? (
        <p>Pick an item and a rate above.</p>
      ) : (
        <>
          <StepsTable index={index} steps={result.steps} />
          <RecipePicker
            index={index}
            itemIds={choosableItems}
            choice={state.recipeChoice}
            onChange={(itemId, recipeId) => update((s) => ({ ...s, recipeChoice: { ...s.recipeChoice, [itemId]: recipeId } }))}
          />
          <BuildingModifiers
            buildings={buildings}
            modifiers={state.modifiers}
            onChange={(buildingId, next) => update((s) => ({ ...s, modifiers: { ...s.modifiers, [buildingId]: next } }))}
          />
          <RawInputs index={index} raw={result.raw} />
        </>
      )}

      <footer className="muted">
        <p>
          Assumptions: recipe times are for a fully staffed building, and speed bonuses stack additively. Data scraped{' '}
          {index.dataset.generatedAt} from the{' '}
          <a href={index.dataset.source} target="_blank" rel="noreferrer">
            Whiskerwood wiki
          </a>
          . The link in your address bar reproduces this calculation.
        </p>
      </footer>
    </main>
  )
}
