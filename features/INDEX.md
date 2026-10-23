# Feature Index

> Central tracking for all features. Updated by skills automatically.

## Status Legend
- **Roadmap** - `/init` done, feature identified in feature map, no spec file yet
- **Mapped** - already built before the kit arrived; proposed by `/map`, confirmed at `/init`, no spec folder yet — `/reverse-spec` writes it
- **Spec'd** - `/reverse-spec` done: runs in production, criteria confirmed, not yet verified — `/qa` closes that gap
- **Planned** - `/write-spec` done, full spec written, architecture not yet designed
- **Architected** - `/architecture` done, tech design approved, ready to build
- **Tasked** - `/tasks` done, tasks.md approved, ready to build
- **In Progress** - `/build` active or completed, not yet in QA
- **In Review** - `/qa` active, testing in progress
- **Approved** - `/qa` passed, no critical/high bugs, ready to deploy
- **Deployed** - `/deploy` done, live in production
- **Merged** - spec folded into another feature by `/refine`; the Spec cell names it, the folder lies in `features/archive/`

## Features

> The **Spec** column links to the feature **folder** (`features/MR-X-name/`), not a single file. Each folder contains `spec.md`, `design.md`, `tasks.md`, and `qa-report.md`.
>
> **A row is never a log.** This file is loaded into every session. What was built, fixed, measured or decided goes into the feature's folder (`design.md`, `qa-report.md`) and the commit — here only the status changes.
>
> **Feature** is the name only — two to four words, the way you would say it ("User accounts & login", "Kanban board"). **Description** is one sentence of what it does. Priority and dependencies are not columns: they are the **build order** line under the table, and it is the only place they live — there is no second roadmap table anywhere else.

| ID | Feature | Description | Status | Spec | Created |
|----|---------|-------------|--------|------|---------|
| MR-1 | Marktdaten & Kursabruf | Holt per Klick die sechs Ampel-Indikatoren und die Kurse mit ATR für Depot und Watchlist, lädt beim Start die Historie nach. | Spec'd | [MR-1-marktdaten-kursabruf](MR-1-marktdaten-kursabruf/) | 2026-10-18 |
| MR-2 | Kaufampel & Distribution Days | Leitet aus den Marktwerten GREEN/RED ab, zählt die Verteilungstage für SPX und NDX und schreibt pro Tag einen Snapshot. | Mapped | | 2026-10-18 |
| MR-3 | Depot-Übersicht & Bestand | Bestandstabelle mit KESt-Vorschau, Aufteilung je Aktie, Depot und Besitzer, Depot-/Besitzer-Verwaltung, Checkliste. | Mapped | | 2026-10-18 |
| MR-4 | Kauf- & Verkaufsjournal mit KESt | Bucht Käufe als Lose und Verkäufe nach FIFO oder Durchschnitt mit KESt 27,5 %, importiert Excel und JSON. | Mapped | | 2026-10-18 |
| MR-5 | Kaufziele & Stop-Schutz | Wächter-Positionen mit Hartem Anker, Limit, Tranche und Stop-Kurs aus ATR-Parametern. | Mapped | | 2026-10-18 |
| MR-6 | Cash-Cockpit | Rechnet je Depot arbeitendes Kapital, freies Cash und reserviertes Budget aus Startkapital, Käufen und Verkäufen. | Mapped | | 2026-10-18 |
| MR-7 | Rechner & Watchlist | Stückzahl und Stop nach der 1-%-Regel, Denkfehler-Check, Favoriten-Watchlist und Aktiensuche. | Mapped | | 2026-10-18 |
| MR-8 | Aktien-Screener (Einbettung) | Bettet den externen Screener ein und übernimmt Treffer in die Watchlist. | Mapped | | 2026-10-18 |
| MR-9 | Auswertung & Erträgnisaufstellung | Wochen-/Monatsstatistik der Snapshots mit Pareto-Notizen und KI-Entwurf, Erträge je Jahr und Depot. | Spec'd | [MR-9-auswertung-ertraegnisaufstellung](MR-9-auswertung-ertraegnisaufstellung/) | 2026-10-18 |
| MR-10 | Regelwerk & KI-Coach | Durchsuchbares Handbuch mit Direktsprung und Chat mit dem Trading-Coach. | Mapped | | 2026-10-18 |
| MR-11 | Backup, Demo & Reset | Verschlüsselte Backup-Datei mit PIN/Passwort, Wiederherstellung mit Vergleich, Backup-Erinnerung, Demo-Daten, Alles löschen. | Mapped | | 2026-10-18 |
| MR-12 | App-Hülle, Onboarding & PWA | Installierbare PWA mit Onboarding, Handbuch-Hilfe, Fehlerseite, Update-Banner, Kopfzeile und Ping. | Spec'd | [MR-12-app-huelle-onboarding-pwa](MR-12-app-huelle-onboarding-pwa/) | 2026-10-18 |
| MR-13 | Blasen-Ampel (Sektoren) | Prüft je Sektor-ETF nach „Bubbles for Fama", ob sich die Branche in zwei Jahren verdoppelt hat; GRÜN/GELB/ROT mit Verlauf, sperrt keinen Kauf. | Mapped | | 2026-10-18 |
| MR-14 | Schwellen-Warnung | Weist darauf hin, wenn ein Ampel-Signal kurz vor dem Umschlag steht, nicht erst nach dem Umschlag. | Roadmap | — | 2026-10-18 |
| MR-15 | Depotstand-Verlauf | Zeigt, wie sich der Depotwert über Tage und Wochen entwickelt hat (eine Kapitalkurve existiert im Code, wird aber nicht angezeigt). | Roadmap | — | 2026-10-18 |
| MR-16 | Handbuch mit Hintergrund & Quellen | Jede Regel mit dem Warum und der Studie dahinter, wie es die Blasen-Ampel bereits macht. | Roadmap | — | 2026-10-18 |
| MR-17 | Stop-Assistent | Schlägt Stops automatisch vor, mit Verlauf, Warnung und Varianten wie Limit oder Trailing Stop. | Roadmap | — | 2026-10-18 |
| MR-18 | Cash-Konto mit Ein- & Auszahlungen | Führt das Verrechnungskonto wie bei der Bank: Einzahlung vom Referenzkonto, Käufe ziehen ab, Verkäufe buchen zu, Auszahlung zurück. | Roadmap | — | 2026-10-18 |
| MR-19 | Bitcoin-Kurzfrist (Hebel & Zone) | Zwei Zeilen für Bitcoin: ob der Perp-Markt überladen ist (OKX-Funding, Open Interest, Long-Quote) und wo der Kurs im Power-Law-Kanal steht; steuert Nachkauf und Stopps, sperrt nichts. | Mapped | | 2026-10-18 |

**Build order:** _Bestand (`/reverse-spec` → `/qa`): MR-1 → MR-2 → MR-5 → MR-13 → MR-19 → MR-4 → MR-3 → MR-6 → MR-7 → MR-9 → MR-11 → MR-12 → MR-10 → MR-8 · Geplant (`/write-spec`): P0: MR-17 (needs MR-5), MR-14 (needs MR-2) · P1: MR-18 (needs MR-6, MR-4), MR-15 (needs MR-3) · P2: MR-16 (needs MR-10)_

<!-- Add features above this line -->

## Deployments

> One line per release, written by `/deploy` — **the single deployment record**: tag · date · production URL · the features it shipped. `/security-check` reads the production URL here, `/audit` expects every Deployed feature on one line. A feature that was live before the kit arrived (reconstructed from code) gets its line from `/qa`: `live before the kit — verified by /qa on <date> · MR-X`.

- _Live vor dem Kit · Build `f81b07b` (PR #48, 18.10.2026) · https://morgenroutine.vercel.app · MR-1 bis MR-13, MR-19 — noch nicht durch `/qa` verifiziert_

## Next Available ID: MR-20
