export const INPUT_SUMMARY = {
  key: 'Gesamt',
  fields: ['Datum', 'Kosten', 'Anzahl TN', 'Spiele'] as const,
}

export const INPUT_STANDARD = {
  id: 'eingabe',
  title: 'Eingabetabelle',
  columns: [
    'Name',
    'Anwesenheit',
    'Pudel',
    'Niederlagen',
    '50 Cent',
    'Sonstiges',
    'Score',
    'Zu Zahlen',
    'Gezahlt',
  ] as const,
  rows: [
    'Bebber',
    'Kruesel',
    'Erik',
    'Jakob',
    'Höppi',
    'Marius',
    'Michael',
    'Michel',
    'Pippo',
    'Spösen',
    'Klaus',
    'Silas',
    'Leonard',
  ] as const,
}

export function rowsForInputStandard(readRows: string[][]) {
  const byName = new Map<string, string[]>()
  for (const row of readRows) {
    const name = row[0]?.trim()
    if (!name || name === INPUT_STANDARD.columns[0]) continue
    byName.set(name, row)
  }

  return INPUT_STANDARD.rows.map((name) => {
    const found = byName.get(name) ?? []
    return INPUT_STANDARD.columns.map((_, index) => (index === 0 ? name : (found[index]?.trim() ?? '')))
  })
}
