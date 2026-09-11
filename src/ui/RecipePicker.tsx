import type { DatasetIndex } from '../data/index.ts'
import { describeRecipe } from './describe.ts'
import { ItemLabel } from './Icon.tsx'

interface Props {
  index: DatasetIndex
  /** Items in the current solution that have more than one producer. */
  itemIds: string[]
  choice: Record<string, string>
  onChange: (itemId: string, recipeId: string) => void
}

export function RecipePicker({ index, itemIds, choice, onChange }: Props) {
  if (itemIds.length === 0) return null
  return (
    <section>
      <h2>Recipe choices</h2>
      {itemIds.map((itemId) => {
        const options = index.recipesByOutput.get(itemId) ?? []
        return (
          <label key={itemId} className="row">
            <ItemLabel index={index} id={itemId} />
            <select value={choice[itemId] ?? options[0]?.id} onChange={(e) => onChange(itemId, e.target.value)}>
              {options.map((r) => (
                <option key={r.id} value={r.id}>
                  {describeRecipe(index, r)}
                </option>
              ))}
            </select>
          </label>
        )
      })}
    </section>
  )
}
