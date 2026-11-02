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
