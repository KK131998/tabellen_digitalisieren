import { INPUT_STANDARD, INPUT_SUMMARY, rowsForInputStandard } from './inputStandard'

const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash']
export const PAPER_COLUMNS = INPUT_STANDARD.columns

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
  error?: { message?: string }
}

const VALUE_COUNT = PAPER_COLUMNS.length - 1

function valuesFromCells(name: string, cells: unknown) {
  const list = Array.isArray(cells) ? cells.map((cell) => String(cell ?? '').trim()) : []
  if (list[0] === name) list.shift()
  const values = list.slice(0, VALUE_COUNT)
  while (values.length < VALUE_COUNT) values.push('')
  return values
}

export function keyedFromReading(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Die gelesene Tabelle hat nicht das erwartete Format.')
  }

  const record = value as Record<string, unknown>
  const keyed: Record<string, string[]> = {}
  for (const name of INPUT_STANDARD.rows) {
    keyed[name] = valuesFromCells(name, record[name])
  }
  keyed[INPUT_SUMMARY.key] = summaryFromReading(record[INPUT_SUMMARY.key])
  const people = INPUT_STANDARD.rows.map((name) => keyed[name])
  if (people.every((values) => values.every((value) => value === ''))) {
    throw new Error('Die gelesene Tabelle hat nicht das erwartete Format.')
  }
  return keyed
}

function summaryFromReading(value: unknown) {
  if (Array.isArray(value)) {
    return INPUT_SUMMARY.fields.map((_, index) => String(value[index] ?? '').trim())
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return INPUT_SUMMARY.fields.map((field) => String(record[field] ?? '').trim())
  }
  return INPUT_SUMMARY.fields.map(() => '')
}

export function tableFromReading(value: unknown): string[][] {
  const keyed = keyedFromReading(value)
  const rows = INPUT_STANDARD.rows.map((name) => [name, ...keyed[name]])
  return [[...PAPER_COLUMNS], ...rowsForInputStandard(rows)]
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Das Foto konnte nicht gelesen werden.'))
    image.src = url
  })
}

function prepareCanvas(image: HTMLImageElement) {
  const longSide = Math.max(image.width, image.height)
  const scale = longSide > 1400 ? 1400 / longSide : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Das Foto konnte nicht vorbereitet werden.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Das Foto konnte nicht vorbereitet werden.'))
        return
      }
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
      }
      resolve(btoa(binary))
    }, 'image/jpeg', 0.85)
  })
}

function readError(status: number, message: string) {
  if (status === 400 && /api key/i.test(message)) {
    return 'Der Gemini-API-Schlüssel wird nicht akzeptiert. Prüfe VITE_GEMINI_API_KEY in der Datei .env und starte die App neu.'
  }
  if (status === 401 || status === 403) {
    return 'Gemini lehnt den API-Schlüssel ab. Prüfe VITE_GEMINI_API_KEY in der Datei .env und starte die App neu.'
  }
  if (status === 429) {
    return 'Gemini ist gerade ausgelastet oder das Kontingent ist aufgebraucht. Versuch es in ein paar Minuten noch einmal.'
  }
  if (status === 404) return 'Das Gemini-Modell ist unter diesem Namen nicht erreichbar.'
  return 'Die Tabelle konnte nicht gelesen werden.'
}

function parsePayload(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const keyed = keyedFromReading(JSON.parse(trimmed) as unknown)
  console.log('Foto', keyed)
  return { table: tableFromReading(keyed), values: keyed }
}

export async function readTable(url: string, onProgress?: (label: string) => void) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? ''
  if (!apiKey) {
    throw new Error(
      'Für das Auslesen fehlt der Gemini-API-Schlüssel. Trag ihn in der Datei .env als VITE_GEMINI_API_KEY ein und starte die App neu.',
    )
  }

  onProgress?.('Foto wird vorbereitet')
  const image = await loadImage(url)
  const jpeg = await canvasToJpeg(prepareCanvas(image))
  onProgress?.('Tabelle wird gelesen')

  const requestBody = JSON.stringify({
    contents: [
      {
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: jpeg } },
          {
            text: [
              'Das Foto zeigt eine handgeschriebene Tabelle. Sie kann gedreht sein.',
              'Lies sie in der Richtung, in der die Handschrift steht.',
              'Die Werte je Name sind immer genau diese, in dieser Reihenfolge:',
              PAPER_COLUMNS.slice(1).join(', '),
              'Die Schlüssel der Personen sind immer diese Namen:',
              INPUT_STANDARD.rows.join(', '),
              'Zusätzlich gibt es unter den Namen die Zeile Gesamt.',
              `${INPUT_SUMMARY.key} ist ebenfalls ein Schlüssel. Die Liste ist immer genau: ${INPUT_SUMMARY.fields.join(', ')}.`,
              'Gib ein JSON-Objekt zurück. Jeder Name und Gesamt sind Schlüssel.',
              'Der Wert ist die Liste der Zellen, ohne den Namen noch einmal in die Liste zu schreiben.',
              'Der erste Listeneintrag ist der erste Wert, der zweite der nächste, und so weiter.',
              'Fehlt ein Name oder die Zeile Gesamt, setze die fehlenden Einträge auf leere Texte.',
              'Leere Zellen bleiben leer. Zahlen, Daten und Beträge bleiben so, wie sie geschrieben sind, inklusive Komma.',
              'Zeichen in einer Zelle, etwa eine Krone, bleiben Teil des Zelltexts.',
              'Die Legende zur Anwesenheit neben der Tabelle ist kein Tabellenwert.',
            ].join('\n'),
          },
        ],
      },
    ],
    generationConfig: {
      responseFormat: {
        text: {
          mimeType: 'APPLICATION_JSON',
          schema: {
            type: 'object',
            properties: Object.fromEntries(
              [...INPUT_STANDARD.rows, INPUT_SUMMARY.key].map((name) => [
                name,
                { type: 'array', items: { type: 'string' } },
              ]),
            ),
            required: [...INPUT_STANDARD.rows, INPUT_SUMMARY.key],
          },
        },
      },
    },
  })

  let lastError = 'Die Tabelle konnte nicht gelesen werden.'
  for (const model of MODELS) {
    let response: Response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(25_000),
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: requestBody,
        },
      )
    } catch (error) {
      if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        lastError = 'Das Auslesen hat zu lange gedauert. Versuch es noch einmal.'
        continue
      }
      throw new Error('Gemini ist nicht erreichbar. Prüfe die Internetverbindung und versuch es noch einmal.')
    }

    const body = (await response.json().catch(() => null)) as GeminiResponse | null
    if (response.status === 404) continue
    if (!response.ok) throw new Error(readError(response.status, body?.error?.message ?? ''))

    const text =
      body?.candidates
        ?.flatMap((candidate) => candidate.content?.parts ?? [])
        .filter((part) => !part.thought)
        .map((part) => part.text ?? '')
        .join('') ?? ''
    if (!text.trim()) {
      lastError = 'In dem Foto wurde keine Tabelle erkannt.'
      continue
    }
    try {
      return parsePayload(text)
    } catch {
      lastError = 'Die Tabelle wurde erkannt, ließ sich aber nicht lesen. Versuch es noch einmal.'
    }
  }

  throw new Error(lastError)
}
