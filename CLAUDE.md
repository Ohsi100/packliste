# CLAUDE.md – Packliste

## Ziel
Private Offline-App für das Handy (Android, Chrome), mit der Christian und Lena abhaken,
was sie für den Urlaub eingepackt haben und **in welches Gepäckstück** (Koffer 1, Koffer 2, Rucksack, Kosmetiktasche …).

## Harte Anforderungen
- **PWA**, installierbar über "Zum Startbildschirm hinzufügen", **voll offline** nach dem ersten Laden (Service Worker `sw.js`).
- Kein Server, kein Login. Hosting als statische Seite über **GitHub Pages** (Repo `Ohsi100/packliste`).
- Daten nur lokal im Browser (localStorage, mit try/catch). Export/Import als JSON-Datei (Sicherung, Übertragung aufs zweite Handy).
- Oberfläche auf Deutsch, mobile first, große Tippflächen.
- Ohne Build-Schritt: HTML/CSS/Vanilla-JS mit Ionic (lokal unter `lib/`).

## Design
- Halte dich an `Designvorgaben.md` (Kopie im Projektordner), Theme **"Bunt & fröhlich"**.
- Farben nur als CSS-Variablen in `theme.css`, überall sonst nur die Variablen benutzen.

## Funktionen (Version 0.1)
- **Packliste**: alle Sachen nach Kategorie, Filter Offen/Gepackt/Alle, Filter nach Person, Suche.
  - Antippen → Bottom Sheet "Wohin gepackt?" mit allen Gepäckstücken.
  - Wischen nach rechts → erstes Gepäckstück (Koffer 1), nach links → zweites (Koffer 2); halb nach links zeigt zusätzlich das dritte (Rucksack).
  - Erneutes Wischen auf das gleiche Gepäck packt wieder aus. Jede Änderung mit "Rückgängig" im Toast.
- **Personen**: Jede Sache gehört Christian, Lena oder ist "Gemeinsam". "Beide" beim Anlegen erzeugt zwei Einträge.
- **Gepäck**: Karten je Gepäckstück mit Inhalt; Taschen (z. B. Kosmetiktasche) können in einem Koffer stecken. Anlegen, umbenennen, Farbe, löschen.
- **Mehr**: "Neu packen" (alles wieder ungepackt, Etappe Hinweg ↔ Rückweg), Namen der Personen ändern, Sicherung speichern/laden, Startliste wiederherstellen.

## Technik-Notizen
- Versionsnummer nur in `version.js`; bei jeder Änderung hochzählen, sonst bekommt das Handy kein Update.
- Neue Dateien in `sw.js` (Liste `DATEIEN`) eintragen.
- Auf `localhost` ist der Service Worker absichtlich aus (Änderungen sofort sichtbar). Offline-Test über `http://127.0.0.1:8081`.
- Testserver: `Testserver-starten.cmd` (Port 8081).
- Icons: Lucide, nur die benutzten in `js/icons.js`.
