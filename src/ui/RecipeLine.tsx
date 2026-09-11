import { Fragment } from 'react'
import type { DatasetIndex } from '../data/index.ts'
import type { Recipe } from '../data/types.ts'
import { ItemLabel } from './Icon.tsx'

/** "3 [icon]Threads -> 3 [icon]Fabrics (233s)": the recipe without its building prefix, an icon before every item. */
export function RecipeLine({ index, recipe }: { index: DatasetIndex; recipe: Recipe }) {
  const side = (list: Recipe['inputs']) =>
    list.length === 0
      ? 'nothing'
      : list.map((i, n) => (
          <Fragment key={i.item}>
            {n > 0 && ' + '}
            <ItemLabel index={index} id={i.item} qty={i.qty} />
          </Fragment>
        ))
  return (
    <span className="recipe">
      {side(recipe.inputs)} <span className="arrow">-&gt;</span> {side(recipe.outputs)} ({recipe.timeSeconds}s)
    </span>
  )
}
