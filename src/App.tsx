import { useEffect, useRef, useState } from "react";
import "./App.css";
import { applyBundledLabels } from "./bundledSheet";
import { planCells, valuesFromTable } from "./cellPlan";
import {
  googleClientId,
  readGoogleSession,
  signInWithGoogle,
  signOutFromGoogle,
} from "./googleAuth";
import {
  loadSheetColumns,
  readSheetColumns,
  writeSheetCells,
  type Worksheet,
} from "./googleSheets";
import SheetChecks from "./SheetChecks";
import { readTable } from "./readTable";
import {
  claimDefaultColumnLabels,
  columnLabelsFor,
  linkWithColumnLabels,
  readSheetLink,
  targetSheetIdsFor,
  writeSheetLink,
  type ColumnEntry,
  type SheetLink,
} from "./sheetLink";
import { INPUT_SUMMARY } from "./inputStandard";
import SettingsPage from "./SettingsPage";

function UploadIcon() {
  return (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 16V5M8 8.5 12 4.5 16 8.5M5 19.5h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94a7.4 7.4 0 0 0 .06-.94c0-.32-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.59.22L2.71 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.13.22.4.31.59.22l2.39-.96c.51.4 1.06.72 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.57-.22 1.12-.54 1.63-.94l2.39.96c.22.09.46 0 .59-.22l1.92-3.32a.5.5 0 0 0-.12-.61l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 8.5 9.2 6.5h5.6L16 8.5h2.2a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5.8a1.5 1.5 0 0 1-1.5-1.5v-7a1.5 1.5 0 0 1 1.5-1.5H8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="13"
        r="2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

type Photo = {
  url: string;
  label: string;
};

function App() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const openingCameraRef = useRef(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [screen, setScreen] = useState<"home" | "settings">("home");
  const [sheetLink, setSheetLink] = useState<SheetLink | null>(() =>
    readSheetLink(),
  );
  const initialSession = readGoogleSession();
  const [googleToken, setGoogleToken] = useState<string | null>(
    initialSession?.accessToken ?? null,
  );
  const [accountName, setAccountName] = useState<string | null>(
    initialSession?.email ?? null,
  );
  const [columnsError, setColumnsError] = useState<string | null>(null);
  const [worksheets, setWorksheets] = useState<Worksheet[]>(
    () => readSheetLink()?.sheets ?? [],
  );
  const [readRows, setReadRows] = useState<string[][] | null>(null);
  const [readValues, setReadValues] = useState<Record<string, string[]> | null>(
    null,
  );
  const [reading, setReading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [readLabel, setReadLabel] = useState("Tabelle wird gelesen…");
  const [readError, setReadError] = useState<string | null>(null);
  const [writeNote, setWriteNote] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const columnsRequest = useRef(0);
  const readRequest = useRef(0);
  const sheetLinkRef = useRef(sheetLink);
  sheetLinkRef.current = sheetLink;

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  const spreadsheetId = sheetLink?.spreadsheetId ?? null;
  const selectedSheetId = sheetLink?.sheetId;

  useEffect(() => {
    const link = sheetLinkRef.current;
    if (!googleToken || !link || link.spreadsheetId !== spreadsheetId) return;
    const requestId = columnsRequest.current + 1;
    columnsRequest.current = requestId;
    void loadColumns(googleToken, link, requestId);
  }, [googleToken, spreadsheetId, selectedSheetId]);

  async function loadColumns(
    token: string,
    link: SheetLink,
    requestId: number,
  ) {
    setColumnsError(null);
    try {
      const sheet = await loadSheetColumns(link, token);
      if (columnsRequest.current !== requestId) return;
      setWorksheets(sheet.sheets);
      setSheetLink((current) => {
        if (!current || current.spreadsheetId !== link.spreadsheetId)
          return current;
        const name = sheet.title;
        const sheetId = current.sheetId ?? sheet.sheetId;
        const moved = applyBundledLabels(
          claimDefaultColumnLabels(current, sheetId),
          sheet.sheets,
        );
        const sameSheets =
          moved.sheets?.length === sheet.sheets.length &&
          moved.sheets.every(
            (item, index) =>
              item.id === sheet.sheets[index]?.id &&
              item.title === sheet.sheets[index]?.title,
          );
        const sameLabels =
          JSON.stringify(moved.columnLabels ?? {}) ===
          JSON.stringify(current.columnLabels ?? {});
        if (
          moved.name === name &&
          moved.sheetId === sheetId &&
          sameSheets &&
          sameLabels
        )
          return current;
        const updated = { ...moved, name, sheetId, sheets: sheet.sheets };
        writeSheetLink(updated);
        return updated;
      });
    } catch (error) {
      if (columnsRequest.current !== requestId) return;
      setColumnsError(
        error instanceof Error
          ? error.message
          : "Die Google-Tabelle konnte nicht geladen werden.",
      );
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOpen || !video || !stream) return;

    video.srcObject = stream;
    void video.play();

    return () => {
      video.srcObject = null;
    };
  }, [cameraOpen]);

  function resetReadout() {
    readRequest.current += 1;
    setReading(false);
    setReadRows(null);
    setReadValues(null);
    setReadError(null);
    setWriteNote(null);
    setWriteError(null);
    setTransferring(false);
  }

  function rememberPhoto(next: Photo) {
    resetReadout();
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      photoUrlRef.current = next.url;
      return next;
    });
  }

  function onFile(file: File | undefined, label: string) {
    if (!file) return;
    rememberPhoto({
      url: URL.createObjectURL(file),
      label,
    });
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
  }

  async function openCamera() {
    if (openingCameraRef.current) return;
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Diese Kamera ist hier nicht verfügbar. Lade ein Foto hoch.",
      );
      return;
    }

    openingCameraRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setCameraReady(false);
      setCameraOpen(true);
    } catch {
      setCameraError("Die Kamera ließ sich nicht öffnen. Lade ein Foto hoch.");
    } finally {
      openingCameraRef.current = false;
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        rememberPhoto({
          url: URL.createObjectURL(blob),
          label: "Gerade aufgenommen",
        });
      },
      "image/jpeg",
      0.92,
    );
  }

  function clearPhoto() {
    resetReadout();
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      photoUrlRef.current = null;
      return null;
    });
  }

  async function readPhoto() {
    if (!photo) return;
    const requestId = readRequest.current + 1;
    readRequest.current = requestId;
    setReading(true);
    setReadError(null);
    setWriteNote(null);
    setWriteError(null);
    setReadLabel("Tabelle wird gelesen…");
    try {
      const result = await readTable(photo.url, (label) => {
        if (readRequest.current === requestId) setReadLabel(label);
      });
      if (readRequest.current !== requestId) return;
      setReadRows(result.table);
      setReadValues(result.values);
      if (result.table.length === 0)
        setReadError("In dem Foto wurde keine Tabelle erkannt.");
    } catch (error) {
      if (readRequest.current !== requestId) return;
      setReadRows(null);
      setReadError(
        error instanceof Error
          ? error.message
          : "Die Tabelle konnte nicht gelesen werden.",
      );
    } finally {
      if (readRequest.current === requestId) setReading(false);
    }
  }

  async function transferPhoto() {
    const values = readValues ?? (readRows ? valuesFromTable(readRows) : null);
    if (!values || transferring) return;
    setTransferring(true);
    setWriteNote(null);
    setWriteError(null);
    try {
      setWriteNote(await writeReadValues(values));
    } catch (error) {
      setWriteError(
        error instanceof Error
          ? error.message
          : "Die Werte konnten nicht eingetragen werden.",
      );
    } finally {
      setTransferring(false);
    }
  }

  async function writeReadValues(values: Record<string, string[]>) {
    if (!googleToken) {
      return "Melde dich in den Einstellungen an, damit die Werte in die Google-Tabelle geschrieben werden.";
    }
    if (!sheetLink) return "Es ist keine Google-Tabelle verknüpft.";
    const sheets =
      worksheets.length > 0 ? worksheets : (sheetLink.sheets ?? []);
    const chosen = targetSheetIdsFor(sheetLink, sheets).flatMap((id) => {
      const sheet = sheets.find((item) => item.id === id);
      return sheet ? [sheet] : [];
    });
    if (chosen.length === 0) return "Wähle mindestens ein Tabellenblatt aus.";
    const notes: string[] = [];
    const skipped: string[] = [];
    for (const sheet of chosen) {
      const entries = columnLabelsFor(sheetLink, sheet.id);
      const columns = [
        ...new Set(
          entries
            .map((entry) => entry.letter.trim().toUpperCase())
            .filter((letter) => /^[A-Z]+$/.test(letter)),
        ),
      ];
      const columnRows = columns.length
        ? await readSheetColumns(
            sheetLink.spreadsheetId,
            sheet.title,
            columns,
            googleToken,
          )
        : {};
      const cells = planCells(entries, values, columnRows);
      if (cells.length === 0) {
        skipped.push(sheet.title);
        continue;
      }
      await writeSheetCells(
        sheetLink.spreadsheetId,
        sheet.title,
        cells,
        googleToken,
      );
      const placed = cells
        .map((cell) => `${cell.column}${cell.row}`)
        .join(", ");
      notes.push(`„${sheet.title}“ ${placed}`);
      console.log("Übertragen", { sheet: sheet.title, cells });
    }
    if (notes.length === 0)
      return "Für die gewählten Tabellenblätter gibt es keinen gesetzten Wert wie Bebber[0].";
    const written = `Eingetragen: ${notes.join("; ")}.`;
    return skipped.length === 0
      ? written
      : `${written} Ohne passende Schlüsselwörter: ${skipped.join(", ")}.`;
  }

  function clearSheetLink() {
    writeSheetLink(null);
    setSheetLink(null);
    setWorksheets([]);
    setColumnsError(null);
  }

  function changeColumnLabels(labels: ColumnEntry[]) {
    setSheetLink((current) => {
      if (!current) return current;
      const sheetId = current.sheetId ?? worksheets[0]?.id;
      const updated = linkWithColumnLabels(current, labels, sheetId);
      if (
        current.sheetId == null &&
        sheetId != null &&
        updated.columnLabels?.default
      ) {
        const columnLabels = { ...updated.columnLabels };
        delete columnLabels.default;
        updated.columnLabels = columnLabels;
      }
      writeSheetLink(updated);
      return updated;
    });
  }

  function toggleTargetSheet(sheetId: number) {
    setSheetLink((current) => {
      if (!current) return current;
      const sheets =
        worksheets.length > 0 ? worksheets : (current.sheets ?? []);
      const selected = new Set(targetSheetIdsFor(current, sheets));
      if (selected.has(sheetId)) selected.delete(sheetId);
      else selected.add(sheetId);
      const targetSheetIds = sheets
        .map((sheet) => sheet.id)
        .filter((id) => selected.has(id));
      if (selected.has(sheetId) && !targetSheetIds.includes(sheetId))
        targetSheetIds.push(sheetId);
      const updated = { ...current, targetSheetIds };
      writeSheetLink(updated);
      return updated;
    });
  }

  function chooseSheet(sheetId: number) {
    setSheetLink((current) => {
      if (!current || current.sheetId === sheetId) return current;
      const visibleId = current.sheetId ?? worksheets[0]?.id;
      const claimed =
        current.sheetId == null
          ? claimDefaultColumnLabels(current, visibleId)
          : current;
      if (claimed.sheetId === sheetId) {
        if (claimed !== current) writeSheetLink(claimed);
        return claimed;
      }
      const updated = { ...claimed, sheetId };
      writeSheetLink(updated);
      return updated;
    });
  }

  async function signIn() {
    const session = await signInWithGoogle();
    setGoogleToken(session.accessToken);
    setAccountName(session.email);
  }

  return (
    <div className="app">
      <header className="app-bar">
        {screen === "settings" ? (
          <button
            type="button"
            className="icon-button"
            aria-label="Zurück"
            onClick={() => setScreen("home")}
          >
            <BackIcon />
          </button>
        ) : null}
        <h1>{screen === "settings" ? "Einstellungen" : "Tabellen"}</h1>
        {screen === "home" ? (
          <button
            type="button"
            className="icon-button"
            aria-label="Einstellungen"
            onClick={() => setScreen("settings")}
          >
            <SettingsIcon />
          </button>
        ) : null}
      </header>

      <main className="app-body">
        {screen === "settings" ? (
          <SettingsPage
            link={sheetLink}
            onClear={clearSheetLink}
            authConfigured={Boolean(googleClientId)}
            accountName={accountName}
            notice={columnsError}
            worksheets={
              worksheets.length > 0 ? worksheets : (sheetLink?.sheets ?? [])
            }
            sheetId={sheetLink?.sheetId ?? null}
            onChooseSheet={chooseSheet}
            onChangeColumns={changeColumnLabels}
            onSignIn={() => {
              void signIn().catch((error: unknown) => {
                setColumnsError(
                  error instanceof Error
                    ? error.message
                    : "Die Google-Anmeldung wurde abgebrochen.",
                );
              });
            }}
            onSignOut={() => {
              signOutFromGoogle();
              setGoogleToken(null);
              setAccountName(null);
            }}
          />
        ) : (
          <>
            {sheetLink ? (
              <SheetChecks
                sheets={
                  worksheets.length > 0 ? worksheets : (sheetLink.sheets ?? [])
                }
                selected={targetSheetIdsFor(
                  sheetLink,
                  worksheets.length > 0 ? worksheets : (sheetLink.sheets ?? []),
                )}
                onToggle={toggleTargetSheet}
              />
            ) : null}

            {cameraError ? (
              <p className="notice" role="alert">
                {cameraError}
              </p>
            ) : null}

            {photo ? (
              <figure className="preview">
                <img
                  src={photo.url}
                  alt="Ausgewähltes Foto des Tabellenblatts"
                />
                <figcaption>
                  <p>{photo.label}</p>
                  <button
                    type="button"
                    className="button-text"
                    onClick={clearPhoto}
                  >
                    Entfernen
                  </button>
                </figcaption>
                {reading ? <p className="readout-status">{readLabel}</p> : null}
                {readError ? (
                  <p className="notice" role="alert">
                    {readError}
                  </p>
                ) : null}
                {readRows && readRows.length > 0 ? (
                  <section className="readout" aria-label="Gelesene Tabelle">
                    <h2>Gelesen aus dem Foto</h2>
                    <div className="readout-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            {readRows[0].map((cell, index) => (
                              <th key={index} scope="col">
                                {cell}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        {readRows.length > 1 ? (
                          <tbody>
                            {readRows.slice(1).map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {readRows[0].map((_, cellIndex) => (
                                  <td key={cellIndex}>
                                    {row[cellIndex] ?? ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        ) : null}
                      </table>
                    </div>
                    {readValues?.[INPUT_SUMMARY.key] ? (
                      <div className="readout-summary">
                        <h2>Gesamt</h2>
                        <div className="readout-table-wrap">
                          <table>
                            <thead>
                              <tr>
                                {INPUT_SUMMARY.fields.map((field) => (
                                  <th key={field} scope="col">
                                    {field}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {INPUT_SUMMARY.fields.map((field, index) => (
                                  <td key={field}>
                                    {readValues[INPUT_SUMMARY.key]?.[index] ??
                                      ""}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </figure>
            ) : (
              <div className="empty">
                <div className="sheet" aria-hidden="true" />
                <strong>Noch kein Foto</strong>
                <p>Nimm ein Tabellenblatt auf oder lade ein Foto hoch.</p>
              </div>
            )}
          </>
        )}
      </main>

      {screen === "home" ? (
        <div className="app-dock">
          {writeError ? (
            <p className="notice" role="alert">
              {writeError}
            </p>
          ) : null}
          {writeNote ? <p className="readout-status">{writeNote}</p> : null}
          {readRows && readRows.length > 0 ? (
            <button
              type="button"
              className="button button-primary"
              disabled={transferring || reading}
              onClick={() => void transferPhoto()}
            >
              {transferring ? "Wird übertragen…" : "Übertragen"}
            </button>
          ) : null}
          {photo ? (
            <button
              type="button"
              className={
                readRows && readRows.length > 0
                  ? "button button-secondary"
                  : "button button-primary"
              }
              disabled={reading || transferring}
              onClick={() => void readPhoto()}
            >
              {reading ? "Tabelle wird gelesen…" : "Tabelle auslesen"}
            </button>
          ) : null}
          <button
            type="button"
            className="button button-secondary"
            onClick={() => uploadRef.current?.click()}
          >
            <UploadIcon />
            Foto hochladen
          </button>
          <button
            type="button"
            className={
              photo ? "button button-secondary" : "button button-primary"
            }
            onClick={() => void openCamera()}
          >
            <CameraIcon />
            Foto machen
          </button>
        </div>
      ) : null}

      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          onFile(file, file?.name ?? "Hochgeladen");
        }}
      />

      {cameraOpen ? (
        <section className="camera" aria-label="Kamera">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedData={() => setCameraReady(true)}
          />
          <div className="camera-bar">
            <button type="button" className="button-text" onClick={stopCamera}>
              Abbrechen
            </button>
            <button
              type="button"
              className="shutter"
              aria-label="Foto aufnehmen"
              disabled={!cameraReady}
              onClick={capturePhoto}
            />
            <span />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default App;
