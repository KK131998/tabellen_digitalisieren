import { columnLetter } from './columnLetter'
import { PAPER_COLUMNS } from './readTable'
import type { ColumnMap } from './sheetLink'

type ColumnMappingProps = {
  columns: string[]
  map: ColumnMap
  onChange: (paperColumn: string, index: number | null) => void
}

function mappedIndex(map: ColumnMap, column: string, columnCount: number) {
  const index = map[column]
  return typeof index === 'number' && index >= 0 && index < columnCount ? index : null
}

export default function ColumnMapping({ columns, map, onChange }: ColumnMappingProps) {
  return (
    <section className="column-map" aria-label="Spalten vom Foto">
      <h2>Spalten vom Foto</h2>
      <p>Jede Spalte des Standardblatts zeigt auf eine Spalte der Google-Tabelle.</p>
      {columns.length === 0 ? <p>Die Auswahl füllt sich, sobald die Spalten der Google-Tabelle geladen sind.</p> : null}
      {PAPER_COLUMNS.map((column) => {
        const selected = mappedIndex(map, column, columns.length)
        return (
          <label key={column}>
            {column}
            <select
              value={selected == null ? '' : String(selected)}
              disabled={columns.length === 0}
              onChange={(event) => onChange(column, event.target.value === '' ? null : Number(event.target.value))}
            >
              <option value="">nicht übernehmen</option>
              {columns.map((name, index) => (
                <option key={`${name}-${index}`} value={String(index)}>
                  {columnLetter(index)} · {name}
                </option>
              ))}
            </select>
          </label>
        )
      })}
    </section>
  )
}
