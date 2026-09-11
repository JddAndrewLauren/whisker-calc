import type { DatasetIndex } from '../data/index.ts'
import type { Recipe } from '../data/types.ts'

/** "Weaver: 3 Threads -> 3 Fabrics (233s)" */
export function describeRecipe(index: DatasetIndex, r: Recipe): string {
  const name = (id: string) => index.itemsById.get(id)?.name ?? id
  const side = (list: Recipe['inputs']) => list.map((i) => `${i.qty} ${name(i.item)}`).join(' + ') || 'nothing'
  return `${index.buildingsById.get(r.building)?.name ?? r.building}: ${side(r.inputs)} -> ${side(r.outputs)} (${r.timeSeconds}s)`
}
