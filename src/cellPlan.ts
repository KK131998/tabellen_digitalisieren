import type { ColumnEntry } from './sheetLink'

const REFERENCE = /^(.+?)\s*\[\s*(\d+)\s*\]$/
const COLUMN = /^[A-Z]+$/

export type PlannedCell = {
  column: string
  row: number
  value: string
}

export function firstFreeRow(rows: string[]) {
  let last = 0
  rows.forEach((cell, index) => {
    if (cell.trim()) last = index + 1
  })
  return last + 1
}

export function rowForColumns(columnRows: Record<string, string[]>, columns: string[]) {
  return columns.reduce((row, column) => Math.max(row, firstFreeRow(columnRows[column] ?? [])), 1)
}

export function planCells(
  entries: ColumnEntry[],
  values: Record<string, string[]>,
  columnRows: Record<string, string[]>,
) {
  const prepared: { column: string; value: string }[] = []

  for (const entry of entries) {
    const column = entry.letter.trim().toUpperCase()
    if (!COLUMN.test(column)) continue
    const match = entry.text.trim().match(REFERENCE)
    if (!match) continue
    const value = values[match[1].trim()]?.[Number(match[2])]?.trim() ?? ''
    if (!value) continue
    prepared.push({ column, value })
  }

  const row = rowForColumns(columnRows, [...new Set(prepared.map((item) => item.column))])
  const nextRow = new Map<string, number>()
  return prepared.map((item) => {
    const cellRow = nextRow.get(item.column) ?? row
    nextRow.set(item.column, cellRow + 1)
    return { column: item.column, row: cellRow, value: item.value }
  })
}

export function valuesFromTable(table: string[][]) {
  const values: Record<string, string[]> = {}
  for (const row of table.slice(1)) {
    const name = row[0]?.trim()
    if (!name || name === 'Name') continue
    values[name] = row.slice(1).map((cell) => cell.trim())
  }
  return values
}
