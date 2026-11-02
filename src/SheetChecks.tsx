import type { Worksheet } from './googleSheets'

type SheetChecksProps = {
  sheets: Worksheet[]
  selected: number[]
  onToggle: (sheetId: number) => void
}

export default function SheetChecks({ sheets, selected, onToggle }: SheetChecksProps) {
  return (
    <fieldset className="sheet-checks">
      <legend>Tabellenblätter</legend>
      {sheets.length === 0 ? (
        <p>Nach der Anmeldung verfügbar</p>
      ) : (
        sheets.map((sheet) => (
          <label key={sheet.id}>
            <input
              type="checkbox"
              checked={selected.includes(sheet.id)}
              onChange={() => onToggle(sheet.id)}
            />
            {sheet.title}
          </label>
        ))
      )}
    </fieldset>
  )
}
