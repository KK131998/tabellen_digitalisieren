import type { SheetLink } from './sheetLink'

export type Worksheet = {
  id: number
  title: string
}

export type SheetColumns = {
  title: string
  columns: string[]
  sheets: Worksheet[]
  sheetId: number
}

type SpreadsheetMeta = {
  properties?: { title?: string }
  sheets?: { properties?: { sheetId?: number; title?: string } }[]
}

type GoogleErrorBody = {
  error?: {
    message?: string
    status?: string
    details?: { reason?: string }[]
  }
}

function headersFromRow(row: unknown[]) {
  const headers = row.map((cell, index) => {
    const text = String(cell ?? '').trim()
    return text || `Spalte ${index + 1}`
  })
  while (headers.length > 0 && /^Spalte \d+$/.test(headers[headers.length - 1])) {
    headers.pop()
  }
  return headers
}

function sheetRange(title: string) {
  return `'${title.replace(/'/g, "''")}'!1:1`
}

function sheetsError(status: number, body: GoogleErrorBody | null) {
  const reason = body?.error?.details?.find((detail) => detail.reason)?.reason
  const message = body?.error?.message ?? ''
  if (status === 401) return 'Die Anmeldung ist abgelaufen. Bitte erneut anmelden.'
  if (reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' || /insufficient/i.test(message)) {
    return 'Die Anmeldung darf Google-Tabellen noch nicht lesen. Unter Google Auth Platform, Datenzugriff, den Bereich für Google Sheets hinzufügen. Danach in der App abmelden und neu anmelden.'
  }
  if (/has not been used|is disabled/i.test(message)) {
    return 'Die Google Sheets API ist in diesem Cloud-Projekt noch nicht aktiv.'
  }
  if (status === 403) {
    return 'Kein Zugriff auf diese Datei. In Google Tabellen unter Datei auf „Als Google-Tabelle speichern“ klicken und danach den Link der neuen Datei eintragen. Eine hochgeladene Excel-Datei lässt sich so nicht lesen.'
  }
  if (status === 404) return 'Die Google-Tabelle wurde über den Link nicht gefunden.'
  return message || 'Die Spalten konnten nicht geladen werden.'
}

async function sheetsSend<T>(path: string, token: string, method: 'GET' | 'POST', payload?: unknown): Promise<T> {
  const response = await fetch(`https://sheets.googleapis.com/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  if (response.ok) return response.json() as Promise<T>

  const body = (await response.json().catch(() => null)) as GoogleErrorBody | null
  throw new Error(sheetsError(response.status, body))
}

async function sheetsGet<T>(path: string, token: string): Promise<T> {
  return sheetsSend<T>(path, token, 'GET')
}

async function assertSheetsScope(token: string) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`)
  if (!response.ok) return
  const info = (await response.json()) as { scope?: string }
  if (!info.scope?.includes('https://www.googleapis.com/auth/spreadsheets')) {
    throw new Error(
      'Die Anmeldung darf Google-Tabellen noch nicht lesen. Unter Google Auth Platform, Datenzugriff, den Bereich für Google Sheets hinzufügen. Danach in der App abmelden und neu anmelden.',
    )
  }
}

function gidFromUrl(url: string) {
  const parsed = new URL(url)
  return parsed.searchParams.get('gid') ?? parsed.hash.match(/gid=(\d+)/)?.[1] ?? null
}

export async function loadSheetColumns(link: SheetLink, token: string): Promise<SheetColumns> {
  await assertSheetsScope(token)
  const meta = await sheetsGet<SpreadsheetMeta>(
    `/spreadsheets/${link.spreadsheetId}?fields=properties.title,sheets.properties`,
    token,
  )
  const sheets = (meta.sheets ?? []).flatMap((item) => {
    const id = item.properties?.sheetId
    const title = item.properties?.title
    return id == null || !title ? [] : [{ id, title }]
  })
  const gid = gidFromUrl(link.url)
  const fromUrl = gid == null ? undefined : Number(gid)
  const preferred = link.sheetId ?? fromUrl
  const sheet = (preferred == null ? undefined : sheets.find((item) => item.id === preferred)) ?? sheets[0]
  if (!sheet) throw new Error('Die Tabelle enthält kein Blatt.')

  const range = encodeURIComponent(sheetRange(sheet.title))
  const values = await sheetsGet<{ values?: unknown[][] }>(
    `/spreadsheets/${link.spreadsheetId}/values/${range}`,
    token,
  )
  const row = values.values?.[0] ?? []
  return {
    title: meta.properties?.title || sheet.title,
    columns: headersFromRow(row),
    sheets,
    sheetId: sheet.id,
  }
}

function quoteSheetTitle(title: string) {
  return `'${title.replace(/'/g, "''")}'`
}

export async function readSheetColumns(
  spreadsheetId: string,
  sheetTitle: string,
  columns: string[],
  token: string,
) {
  const quoted = quoteSheetTitle(sheetTitle)
  const query = columns
    .map((column) => `ranges=${encodeURIComponent(`${quoted}!${column}:${column}`)}`)
    .join('&')
  const body = await sheetsGet<{ valueRanges?: { range?: string; values?: unknown[][] }[] }>(
    `/spreadsheets/${spreadsheetId}/values:batchGet?${query}`,
    token,
  )
  const rows: Record<string, string[]> = {}
  columns.forEach((column, index) => {
    const range = body.valueRanges?.[index]
    rows[column] = columnFromRange(range?.range, range?.values)
  })
  return rows
}

function columnFromRange(range: string | undefined, values: unknown[][] | undefined) {
  const cells = (values ?? []).map((row) => String(row?.[0] ?? ''))
  const match = range?.match(/[A-Z]+(\d+)(?::[A-Z]+\d+)?$/i)
  const start = match ? Number(match[1]) : 1
  if (start <= 1) return cells
  return [...Array(start - 1).fill(''), ...cells]
}

export async function writeSheetCells(
  spreadsheetId: string,
  sheetTitle: string,
  cells: { column: string; row: number; value: string }[],
  token: string,
) {
  const quoted = quoteSheetTitle(sheetTitle)
  const result = await sheetsSend<{ totalUpdatedCells?: number }>(
    `/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    token,
    'POST',
    {
      valueInputOption: 'USER_ENTERED',
      data: cells.map((cell) => ({
        range: `${quoted}!${cell.column}${cell.row}`,
        values: [[cell.value]],
      })),
    },
  )
  if (!result.totalUpdatedCells) {
    throw new Error('Google hat keine Zellen geändert.')
  }
}
