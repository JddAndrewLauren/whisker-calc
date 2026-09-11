import type { Building, Dataset, Item, Recipe } from './types.ts'
import raw from './whiskerwood.json'

export interface DatasetIndex {
  dataset: Dataset
  itemsById: Map<string, Item>
  buildingsById: Map<string, Building>
  recipesById: Map<string, Recipe>
  /** Recipes producing each item, in dataset order (first = default). */
  recipesByOutput: Map<string, Recipe[]>
}

export function buildIndex(dataset: Dataset): DatasetIndex {
  const recipesByOutput = new Map<string, Recipe[]>()
  for (const r of dataset.recipes) {
    for (const o of r.outputs) {
      const list = recipesByOutput.get(o.item) ?? []
      list.push(r)
      recipesByOutput.set(o.item, list)
    }
  }
  return {
    dataset,
    itemsById: new Map(dataset.items.map((i) => [i.id, i])),
    buildingsById: new Map(dataset.buildings.map((b) => [b.id, b])),
    recipesById: new Map(dataset.recipes.map((r) => [r.id, r])),
    recipesByOutput,
  }
}

export function loadDataset(): DatasetIndex {
  return buildIndex(raw as Dataset)
}
