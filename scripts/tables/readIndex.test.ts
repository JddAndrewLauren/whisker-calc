import { expect, it } from 'vitest'
import { table, type TableIndex } from './readIndex.ts'

const index: TableIndex = { ExportDate: '', TotalTables: 2, Tables: { 'Game/Data/Crops': {}, 'Game/Mods/Crops': {} } }

it('refuses an ambiguous short name instead of picking one', () => {
  expect(() => table(index, 'Crops')).toThrow(/table Crops is ambiguous; tables: Game\/Data\/Crops, Game\/Mods\/Crops/)
})
