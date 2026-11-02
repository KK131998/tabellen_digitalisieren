import type { Worksheet } from './googleSheets'

type SheetPickerProps = {
  sheets: Worksheet[]
  sheetId: number | null
  onChange: (sheetId: number) => void
}

export default function SheetPicker({ sheets, sheetId, onChange }: SheetPickerProps) {
  return (
    <label className="sheet-picker">
      Tabellenblatt
      <select
        value={sheets.length === 0 ? '' : String(sheetId ?? sheets[0].id)}
        disabled={sheets.length === 0}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {sheets.length === 0 ? (
          <option value="">Nach der Anmeldung verfügbar</option>
        ) : (
          sheets.map((sheet) => (
            <option key={sheet.id} value={String(sheet.id)}>
              {sheet.title}
            </option>
          ))
        )}
      </select>
    </label>
  )
}
