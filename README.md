# Tabellen digitalisieren

Webapp zum Übernehmen von Tabellen aus Fotos in eine Excel-Tabelle. Ein Tabellenblatt wird in der App fotografiert oder als Bild hochgeladen. Die App liest die Tabelle aus dem Bild und ordnet die erkannten Spalten den Spalten einer Excel-Datei zu.

## Ablauf

1. Excel-Datei laden. Die Spalten dieser Datei sind das Ziel.
2. Tabellenblatt fotografieren oder ein vorhandenes Foto hochladen. Die Aufnahme erfolgt direkt in der Webapp über die Kamera des Geräts.
3. Tabelle aus dem Bild auslesen. Das Auslesen startet mit der Aufnahme, ein separater Zwischenschritt ist nicht nötig.
4. Erkannte Spalten den Excel-Spalten zuordnen. Die App schlägt passende Zuordnungen vor, die Zuordnung bleibt prüfbar und änderbar.
5. Übernommene Zeilen prüfen und als Excel-Datei speichern.

## Funktionen

- Kameraaufnahme in der Webapp und Upload eines Fotos
- Auslesen von Tabellenblättern aus dem Bild
- Erkennen von Spaltenüberschriften und Zellwerten
- Zuordnung der Foto-Spalten zu den Spalten der geladenen Excel-Tabelle
- Vorschlag für passende Spalten, manuelle Korrektur der Zuordnung
- Übernahme der Zeilen in die Excel-Struktur und Export als Excel-Datei

## Technik

- React 19
- TypeScript
- Vite

## Lokal starten

```bash
npm install
npm run dev
```

## To-Do

Grundlage

README durch die Produktbeschreibung ersetzen
Git-Repository anlegen und ersten Commit machen
Seitenstruktur festlegen: Excel laden, Foto aufnehmen, Spalten zuordnen, Ergebnis prüfen, Excel speichern
Excel

Excel-Datei hochladen (.xlsx)
Spaltenüberschriften und vorhandene Zeilen auslesen
Zielspalten in der Oberfläche anzeigen
Ausgefüllte Tabelle wieder als Excel-Datei herunterladen
Foto

Kamera in der Webapp öffnen und ein Foto aufnehmen
Alternativ ein vorhandenes Foto hochladen
Aufnahmevorschau anzeigen, mit der Möglichkeit, neu zu fotografieren
Auslesen direkt nach der Aufnahme starten
Tabelle aus dem Foto

Tabellenbereich im Foto erkennen
Spaltenüberschriften und Zellwerte auslesen
Erkannte Tabelle als Vorschau anzeigen
Schlechte Fotos abfangen: unscharf, abgeschnitten, kein Tabellenblatt erkennbar
Spalten verbinden

Erkannte Spalten neben die Excel-Spalten stellen
Passende Zuordnung vorschlagen (gleicher oder ähnlicher Spaltenname)
Zuordnung manuell ändern
Spalten ohne Treffer markieren und leer lassen oder überspringen
Übernahme

Zeilen aus dem Foto in die Excel-Spalten schreiben
Ergebnis vor dem Speichern Zeile für Zeile prüfen und korrigieren
Mehrere Fotos nacheinander in dieselbe Excel-Datei übernehmen
Fertige Datei herunterladen
Absicherung

Auf dem Handy prüfen: Kamera, Upload, Zuordnung, Download
Leere Datei, falsches Dateiformat und fehlende Spalten testen
Große Tabellen und schiefe Fotos testen

Ask
