import { useState, type FormEvent } from "react";
import ColumnFields from "./ColumnFields";
import type { Worksheet } from "./googleSheets";
import { columnLabelsFor, type ColumnEntry, type SheetLink } from "./sheetLink";
import SheetPicker from "./SheetPicker";

type SettingsPageProps = {
  link: SheetLink | null;
  onSave: (url: string) => void;
  onClear: () => void;
  authConfigured: boolean;
  accountName: string | null;
  notice: string | null;
  worksheets: Worksheet[];
  sheetId: number | null;
  onChooseSheet: (sheetId: number) => void;
  onChangeColumns: (entries: ColumnEntry[]) => void;
  onSignIn: () => void;
  onSignOut: () => void;
};

export default function SettingsPage({
  link,
  onSave,
  onClear,
  authConfigured,
  accountName,
  notice,
  worksheets,
  sheetId,
  onChooseSheet,
  onChangeColumns,
  onSignIn,
  onSignOut,
}: SettingsPageProps) {
  const activeSheetId = sheetId ?? worksheets[0]?.id ?? null;

  return (
    <div className="settings">
      <section>
        <h2>Google-Konto</h2>
        {authConfigured ? (
          accountName ? (
            <>
              <p>Angemeldet als {accountName}.</p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onSignOut}
                >
                  Abmelden
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                Melde dich an, damit die App die verknüpfte Google-Tabelle
                verwenden kann.
              </p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={onSignIn}
                >
                  Mit Google anmelden
                </button>
              </div>
            </>
          )
        ) : (
          <p>
            Die Anmeldung braucht eine Client-ID in der Datei .env unter
            VITE_GOOGLE_CLIENT_ID. In der Google Cloud Console ein Projekt
            anlegen, die Google Sheets API aktivieren und eine OAuth-Client-ID
            für eine Webanwendung erstellen. Als JavaScript-Ursprung
            http://localhost:5173 eintragen.
          </p>
        )}
      </section>

      <section>
        <h2>Google-Tabelle</h2>

        {link ? (
          <>
            <div className="link-card">
              <p className="link-name">{link.name}</p>
              <p className="link-url">
                {link.url.split("/").map((part, index) => (
                  <span key={`${part}-${index}`}>
                    {index > 0 ? "/" : ""}
                    {part}
                    <wbr />
                  </span>
                ))}
              </p>
              <button type="button" className="button-text" onClick={onClear}>
                Verknüpfung lösen
              </button>
            </div>
            {notice ? (
              <p className="notice" role="alert">
                {notice}
              </p>
            ) : null}
            <SheetPicker
              sheets={worksheets}
              sheetId={activeSheetId}
              onChange={onChooseSheet}
            />
            <ColumnFields
              entries={columnLabelsFor(link, activeSheetId)}
              onChange={onChangeColumns}
            />
          </>
        ) : (
          <LinkForm onSave={onSave} signedIn={Boolean(accountName)} />
        )}
      </section>
    </div>
  );
}

function LinkForm({
  onSave,
  signedIn,
}: {
  onSave: (url: string) => void;
  signedIn: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      onSave(value);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Der Link ist ungültig.",
      );
    }
  }

  return (
    <form className="link-form" onSubmit={submit}>
      <p>
        {signedIn
          ? "Trage den Link der Google-Tabelle ein. Danach erscheinen die Tabellenblätter."
          : "Trage den Link ein und melde dich an. Danach erscheinen die Tabellenblätter."}
      </p>
      <label htmlFor="sheet-url">Link zur Google-Tabelle</label>
      <input
        id="sheet-url"
        type="url"
        inputMode="url"
        autoComplete="off"
        placeholder="https://docs.google.com/spreadsheets/d/…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
      />
      <button type="submit" className="button button-primary">
        Verknüpfen
      </button>
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
