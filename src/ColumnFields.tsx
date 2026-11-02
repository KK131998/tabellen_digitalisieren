import { useEffect, useRef } from 'react'
import { columnLetter } from './columnLetter'
import type { ColumnEntry } from './sheetLink'

type ColumnFieldsProps = {
  entries: ColumnEntry[]
  onChange: (entries: ColumnEntry[]) => void
}

export default function ColumnFields({ entries, onChange }: ColumnFieldsProps) {
  const focusIndex = useRef<number | null>(null)

  useEffect(() => {
    if (focusIndex.current == null) return
    document.getElementById(`column-letter-${focusIndex.current}`)?.focus()
    focusIndex.current = null
  }, [entries])

  function changeEntry(index: number, patch: Partial<ColumnEntry>) {
    onChange(entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)))
  }

  function addColumn() {
    focusIndex.current = entries.length
    onChange([...entries, { letter: columnLetter(entries.length), text: '' }])
  }

  function removeColumn(index: number) {
    onChange(entries.filter((_, entryIndex) => entryIndex !== index))
  }

  return (
    <div className="column-fields">
      {entries.map((entry, index) => (
        <div className="column-field" key={index}>
          <input
            id={`column-letter-${index}`}
            type="text"
            aria-label={`Spalte ${index + 1}`}
            value={entry.letter}
            autoComplete="off"
            onChange={(event) => changeEntry(index, { letter: event.target.value })}
          />
          <input
            id={`column-text-${index}`}
            type="text"
            aria-label={`Text ${index + 1}`}
            value={entry.text}
            autoComplete="off"
            onChange={(event) => changeEntry(index, { text: event.target.value })}
          />
          {entries.length > 1 ? (
            <button
              type="button"
              className="column-remove"
              aria-label={`Spalte ${index + 1} entfernen`}
              onClick={() => removeColumn(index)}
            >
              ×
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      <button type="button" className="column-add" aria-label="Spalte hinzufügen" onClick={addColumn}>
        +
      </button>
    </div>
  )
}
