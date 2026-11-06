import type { ColumnEntry, SheetLink, StoredWorksheet } from "./sheetLink";

const CLEARED = '{"cleared":true}';

export const BUNDLED_LABELS: Record<string, ColumnEntry[]> = {
  Eingabetabelle: [
    { letter: "B", text: "Bebber[0]" },
    { letter: "C", text: "Bebber[1]" },
    { letter: "D", text: "Bebber[2]" },
    { letter: "E", text: "Bebber[3]" },
    { letter: "F", text: "Bebber[4]" },
    { letter: "G", text: "Bebber[5]" },
    { letter: "I", text: "Kruesel[0]" },
  ],
  Gezahlt_Tabelle: [
    { letter: "C", text: "Bebber[7]" },
    { letter: "D", text: "Bebber[8]" },
  ],
};

export function bundledSheetLink(): SheetLink {
  return {
    url: "https://docs.google.com/spreadsheets/d/1micbTZUKRXxL7mR39Hrs-OxQCNbo7Bt-1L50Fnr-WQc/edit",
    spreadsheetId: "1micbTZUKRXxL7mR39Hrs-OxQCNbo7Bt-1L50Fnr-WQc",
    name: "KCWD Statistik All Time",
  };
}

export function isClearedSheetLink(raw: string) {
  return raw === CLEARED;
}

export function clearedSheetLinkRaw() {
  return CLEARED;
}

export function applyBundledLabels(link: SheetLink, sheets: StoredWorksheet[]): SheetLink {
  const columnLabels = { ...link.columnLabels };
  let changed = false;
  for (const sheet of sheets) {
    const bundled = BUNDLED_LABELS[sheet.title];
    if (!bundled) continue;
    const key = String(sheet.id);
    const current = columnLabels[key];
    if (current?.some((entry) => entry.text.trim())) continue;
    columnLabels[key] = bundled.map((entry) => ({ ...entry }));
    changed = true;
  }
  return changed ? { ...link, columnLabels } : link;
}
