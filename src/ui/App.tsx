import { useMemo } from 'react'
import { chainCost } from '../calc/cost.ts'
import { producerFor, solve } from '../calc/solve.ts'
import { targetRate } from '../calc/target.ts'
import { loadDataset } from '../data/index.ts'
import { BuildingModifiers } from './BuildingModifiers.tsx'
import { ConstructionCosts } from './ConstructionCosts.tsx'
import { RawInputs } from './RawInputs.tsx'
import { RecipePicker } from './RecipePicker.tsx'
import { StepsTable } from './StepsTable.tsx'
import { TargetControls } from './TargetControls.tsx'
import { useHashState } from './useHashState.ts'

const index = loadDataset()
const producible = index.dataset.items.filter((i) => index.recipesByOutput.has(i.id)).sort((a, b) => a.name.localeCompare(b.name))
const foods = producible.filter((i) => i.food)

export function App() {
  const [state, update] = useHashState()
  const ratePerMin = useMemo(() => targetRate(index, state), [state])
  const result = useMemo(() => solve(index, { ...state, ratePerMin }), [state, ratePerMin])
  const cost = useMemo(() => chainCost(index, result.steps), [result])

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

  const target = index.itemsById.get(state.targetItem)
  const producer = producerFor(index, state.targetItem, state.recipeChoice)
  const producerName = producer ? (index.buildingsById.get(producer.building)?.name ?? producer.building) : null
  const notFood = state.mode === 'population' && target && !target.food
  // In feed mode offer only food, but keep a non-food target in the list so its name stays visible next to the warning.
  const items = state.mode !== 'population' ? producible : notFood ? [target, ...foods] : foods

  return (
    <main>
      <header>
        <h1>Whiskerwood production calculator</h1>
        <p className="muted">How many of each building you need to sustain a target output, using base recipe times from the wiki.</p>
      </header>

      <TargetControls
        items={items}
        state={state}
        targetName={target?.name ?? state.targetItem}
        producerName={producerName}
        ratePerMin={ratePerMin}
        onChange={(patch) => update((s) => ({ ...s, ...patch }))}
      />

      {notFood && <p className="warning">{target.name} does not satisfy hunger. Pick a food item to feed Whiskers.</p>}
      {result.warnings.map((w) => (
        <p key={w} className="warning">
          {w}
        </p>
      ))}

      {result.steps.length === 0 ? (
        <p>Pick an item and a target above.</p>
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
          <ConstructionCosts index={index} cost={cost} />
        </>
      )}

      <footer className="muted">
        <p>
          Assumptions: recipe times are for a fully staffed building, and speed bonuses stack additively. Farms follow the wiki's
          Farmer's Almanac at maximum yield (about 72 tiles per Farm for cotton, wheat, tea and peppers, 36 for berries, flax,
          mushrooms and trees); use the Extra % field for poorer soil. Feeding assumes one meal per Whisker per 540-second working
          day; Miners and Heavy Eaters take one more. Water Pump and Steam Boiler rates are estimates, editable in overrides.json.
          Mines are not modeled. Data scraped{' '}
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
