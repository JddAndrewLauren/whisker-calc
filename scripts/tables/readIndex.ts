import { readFileSync } from 'node:fs'

/** One DataTable row as TableGraph exports it: every scalar is a string, arrays stay arrays. */
export type Row = Record<string, string | string[]>

export interface TableIndex {
  ExportDate: string
  TotalTables: number
  Tables: Record<string, Record<string, Row>>
}

export function readIndex(path: string | URL): TableIndex {
  return JSON.parse(readFileSync(path, 'utf8')) as TableIndex
}

/** Find a table by the tail of its asset path, e.g. "AssetLookups/Crops". */
export function table(index: TableIndex, shortName: string): Record<string, Row> {
  const keys = Object.keys(index.Tables).filter((k) => k.endsWith('/' + shortName))
  if (keys.length !== 1) {
    throw new Error(`table ${shortName} ${keys.length ? 'is ambiguous' : 'not found'}; tables: ${Object.keys(index.Tables).join(', ')}`)
  }
  return index.Tables[keys[0]]
}
