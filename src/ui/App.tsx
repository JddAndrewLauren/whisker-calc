import { useMemo } from 'react'
import { compareFoods } from '../calc/compare.ts'
import { chainCost } from '../calc/cost.ts'
import { producerFor, solve } from '../calc/solve.ts'
import { targetRate } from '../calc/target.ts'
import { loadDataset } from '../data/index.ts'
import { BuildingModifiers } from './BuildingModifiers.tsx'
import { ConstructionCosts } from './ConstructionCosts.tsx'
import { FoodComparison } from './FoodComparison.tsx'
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
  const comparing = state.mode === 'quality'
  const options = useMemo(
    () => (comparing ? compareFoods(index, { ratePerMin, recipeChoice: state.recipeChoice, modifiers: state.modifiers }, state.quality) : []),
    [comparing, ratePerMin, state.recipeChoice, state.modifiers, state.quality],
  )
  const allSteps = useMemo(() => (comparing ? options.flatMap((o) => o.result.steps) : result.steps), [comparing, options, result])

  const choosableItems = useMemo(() => {
    const seen = new Set<string>()
    for (const s of allSteps) {
      const recipe = index.recipesById.get(s.recipeId)!
      for (const id of [s.itemId, ...recipe.inputs.map((i) => i.item)]) {
        if ((index.recipesByOutput.get(id)?.length ?? 0) > 1) seen.add(id)
      }
    }
    return [...seen]
  }, [allSteps])

  const buildings = useMemo(
    () => allSteps.map((s) => index.buildingsById.get(s.buildingId)!).filter((b, i, arr) => arr.indexOf(b) === i),
    [allSteps],
  )

  const target = index.itemsById.get(state.targetItem)
  const producer = producerFor(index, state.targetItem, state.recipeChoice)
  const notFood = state.mode === 'population' && target && !target.food
  // In feed mode offer only food, but keep a non-food target in the list so its name stays visible next to the warning.
  const items = state.mode !== 'population' ? producible : notFood ? [target, ...foods] : foods

  return (
    <main>
      <header>
        <h1>
          <img className="icon" src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width={36} height={36} />
          Whiskerwood production calculator
        </h1>
        <p className="muted">How many of each building you need to sustain a target output, using base recipe times from the game's data tables.</p>
      </header>

      <TargetControls
        index={index}
        items={items}
        state={state}
        producerId={producer?.building ?? null}
        ratePerMin={ratePerMin}
        onChange={(patch) => update((s) => ({ ...s, ...patch }))}
      />

      {notFood && <p className="warning">{target.name} does not satisfy hunger. Pick a food item to feed Whiskers.</p>}
      {result.warnings.map((w) => (
        <p key={w} className="warning">
          {w}
        </p>
      ))}

      {comparing ? (
        <FoodComparison
          index={index}
          options={options}
          population={state.population}
          quality={state.quality}
          onPick={(targetItem) => update((s) => ({ ...s, mode: 'population', targetItem }))}
        />
      ) : result.steps.length === 0 ? (
        <p>Pick an item and a target above.</p>
      ) : (
        <StepsTable index={index} steps={result.steps} />
      )}
      {allSteps.length > 0 && (
        <>
          <RecipePicker
            index={index}
            itemIds={choosableItems}
            choice={state.recipeChoice}
            onChange={(itemId, recipeId) => update((s) => ({ ...s, recipeChoice: { ...s.recipeChoice, [itemId]: recipeId } }))}
          />
          <BuildingModifiers
            index={index}
            buildings={buildings}
            modifiers={state.modifiers}
            onChange={(buildingId, next) => update((s) => ({ ...s, modifiers: { ...s.modifiers, [buildingId]: next } }))}
          />
          {!comparing && <RawInputs index={index} raw={result.raw} />}
          {!comparing && <ConstructionCosts index={index} cost={cost} />}
        </>
      )}

      <footer className="muted">
        <p>
          Assumptions: recipe times are for a fully staffed building, and speed bonuses stack additively. Farms follow the wiki's
          Farmer's Almanac at maximum yield (about 72 tiles per Farm for cotton, wheat, tea and peppers, 36 for berries, flax,
          mushrooms and trees); use the Extra % field for poorer soil. Feeding assumes one meal per Whisker per 540-second working
          day; Miners and Heavy Eaters take one more. Food quality stars come from the game's meal table. The Steam Boiler's water intake is not part of its
          recipe. Mines are not
          modeled. Data from {index.dataset.source === 'tables' ? `the game's data tables, version ${index.dataset.gameVersion},` : 'the wiki,'}{' '}
          imported {index.dataset.generatedAt}; building names link to the{' '}
          <a href="https://wiki.hoodedhorse.com/Whiskerwood/" target="_blank" rel="noreferrer">
            Whiskerwood wiki
          </a>
          . The link in your address bar reproduces this calculation.
        </p>
        <p>
          Item and building images are game art by Minakata Dynamics, published by Hooded Horse, served from the{' '}
          <a href="https://wiki.hoodedhorse.com/Whiskerwood/" target="_blank" rel="noreferrer">
            official wiki
          </a>
          . This is an unofficial fan tool.
        </p>
      </footer>
    </main>
  )
}
