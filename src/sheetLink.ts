import { bundledSheetLink, clearedSheetLinkRaw, isClearedSheetLink } from "./bundledSheet";
import { columnLetter } from "./columnLetter";

const STORAGE_KEY = "tabellen.sheet-link";

export type ColumnMap = Partial<Record<string, number | null>>;

export type ColumnEntry = {
  letter: string;
  text: string;
};

export type StoredWorksheet = {
  id: number;
  title: string;
};

export type SheetLink = {
  url: string;
  spreadsheetId: string;
  name: string;
  sheetId?: number;
  targetSheetIds?: number[];
  sheets?: StoredWorksheet[];
  maps?: Record<string, ColumnMap>;
  columnLabels?: Record<string, ColumnEntry[]>;
};

export function readSheetLink(): SheetLink | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return bundledSheetLink();
    if (isClearedSheetLink(raw)) return null;
    const parsed = JSON.parse(raw) as SheetLink;
    if (!parsed.url || !parsed.spreadsheetId || !parsed.name) return null;
    if (
      parsed.maps &&
      (typeof parsed.maps !== "object" || Array.isArray(parsed.maps))
    )
      delete parsed.maps;
    parsed.columnLabels = columnLabelsFromStorage(parsed.columnLabels);
    parsed.sheets = worksheetsFromStorage(parsed.sheets);
    const targetSheetIds = sheetIdsFromStorage(parsed.targetSheetIds);
    if (targetSheetIds) parsed.targetSheetIds = targetSheetIds;
    else delete parsed.targetSheetIds;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSheetLink(link: SheetLink | null) {
  if (!link) {
    localStorage.setItem(STORAGE_KEY, clearedSheetLinkRaw());
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(link));
}

export function targetSheetIdsFor(link: SheetLink, sheets: { id: number }[]) {
  const known = new Set(sheets.map((sheet) => sheet.id));
  if (Array.isArray(link.targetSheetIds)) {
    return link.targetSheetIds.filter(
      (id) => known.size === 0 || known.has(id),
    );
  }
  const fallback = link.sheetId ?? sheets[0]?.id;
  if (fallback == null || (known.size > 0 && !known.has(fallback))) {
    return sheets[0] ? [sheets[0].id] : [];
  }
  return [fallback];
}

export function sheetMapKey(sheetId: number | null | undefined) {
  return sheetId == null ? "default" : String(sheetId);
}

export function columnMapFor(
  link: SheetLink | null,
  sheetId: number | null | undefined,
): ColumnMap {
  if (!link?.maps) return {};
  return (
    link.maps[sheetMapKey(sheetId)] ??
    (sheetId != null ? link.maps.default : undefined) ??
    {}
  );
}

export function columnLabelsFor(
  link: SheetLink | null,
  sheetId: number | null | undefined,
) {
  const stored = link?.columnLabels?.[sheetMapKey(sheetId)];
  if (stored && stored.length > 0) return stored;
  if (
    link &&
    link.sheetId == null &&
    link.columnLabels?.default &&
    link.columnLabels.default.length > 0
  ) {
    return link.columnLabels.default;
  }
  return [{ letter: "A", text: "" }];
}

export function linkWithColumnLabels(
  link: SheetLink,
  labels: ColumnEntry[],
  sheetId: number | null | undefined = link.sheetId,
): SheetLink {
  const key = sheetMapKey(sheetId);
  const columnLabels = {
    ...link.columnLabels,
    [key]: labels.length > 0 ? labels : [{ letter: "A", text: "" }],
  };
  return {
    ...link,
    ...(sheetId != null ? { sheetId } : {}),
    columnLabels,
  };
}

export function claimDefaultColumnLabels(
  link: SheetLink,
  sheetId: number | null | undefined,
): SheetLink {
  const labels = link.columnLabels?.default;
  if (sheetId == null || !labels || labels.length === 0) return link;
  const key = sheetMapKey(sheetId);
  if (link.columnLabels?.[key]) return link;
  const updated = linkWithColumnLabels(link, labels, sheetId);
  const columnLabels = { ...updated.columnLabels };
  delete columnLabels.default;
  return { ...updated, columnLabels };
}

function sheetIdsFromStorage(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const ids = value.filter(
    (id): id is number => typeof id === "number" && Number.isFinite(id),
  );
  return [...new Set(ids)];
}

function worksheetsFromStorage(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const sheets = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = (item as { id?: unknown }).id;
    const title = (item as { title?: unknown }).title;
    if (
      typeof id !== "number" ||
      !Number.isFinite(id) ||
      typeof title !== "string" ||
      !title.trim()
    )
      return [];
    return [{ id, title }];
  });
  return sheets.length > 0 ? sheets : undefined;
}

function columnLabelsFromStorage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const cleaned: Record<string, ColumnEntry[]> = {};
  for (const [key, labels] of Object.entries(value)) {
    if (!Array.isArray(labels)) continue;
    const entries = labels.flatMap((label, index) => {
      const entry = columnEntryFromStorage(label, index);
      return entry ? [entry] : [];
    });
    if (entries.length > 0) cleaned[key] = entries;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function columnEntryFromStorage(
  value: unknown,
  index: number,
): ColumnEntry | null {
  if (typeof value === "string")
    return { letter: columnLetter(index), text: value };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { letter?: unknown; text?: unknown };
  return {
    letter:
      typeof record.letter === "string" ? record.letter : columnLetter(index),
    text: typeof record.text === "string" ? record.text : "",
  };
}

export function linkWithColumn(
  link: SheetLink,
  paperColumn: string,
  index: number | null,
): SheetLink {
  const key = sheetMapKey(link.sheetId);
  return {
    ...link,
    maps: {
      ...link.maps,
      [key]: { ...columnMapFor(link, link.sheetId), [paperColumn]: index },
    },
  };
}

export function sheetLinkFromUrl(value: string): SheetLink {
  const url = new URL(value.trim());
  const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "docs.google.com" ||
    !match
  ) {
    throw new Error("Der Link muss zu einer Google-Tabelle führen.");
  }
  return {
    url: url.toString(),
    spreadsheetId: match[1],
    name: "Google-Tabelle",
  };
}
