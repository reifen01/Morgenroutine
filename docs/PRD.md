# Produktbeschreibung (PRD)

_Geschrieben von `/init` am 18.10.2026 für ein Produkt, das bereits läuft. Beschreibt die App, **wie sie ist**, nicht wie sie sein sollte. Quellen: `docs/codebase/`, Gespräch mit dem Nutzer._

## Vision

Die Morgenroutine ist ein Trading-Cockpit für Privatanleger. Sie liefert jeden Morgen vor Marktöffnung eine Kaufampel nach dem Regelwerk von René Berteit (VIX, VXV, VVIX, SPX, Öl, Gas, Distribution Days), rechnet Positionsgrößen und Stops nach der 1-%-Regel, führt Depot und Kauf-/Verkaufsjournal mit österreichischer KESt-Abrechnung und erklärt die Regeln im Handbuch und über einen KI-Coach. Die Disziplin kommt aus der Routine: Werte holen, Ampel lesen, Depot prüfen, Backup machen.

## Zielnutzer

Privatanleger, die nach festen Regeln handeln wollen, statt nach Gefühl. Die Steuerlogik ist auf Österreich festgelegt (KESt 27,5 %, FIFO oder gleitender Durchschnitt); alles andere ist für jeden Privatanleger nutzbar. Ein Nutzer pro Gerät, kein Konto, keine Anmeldung. Primärer Nutzer ist der Autor selbst, der die App am iPhone als installierte PWA mehrmals täglich öffnet.

**Ein typischer Tag** (vom Nutzer beschrieben): Gegen 8 Uhr Werte holen, bevor der Markt öffnet; Contango oder Backwardation an der Ampel ablesen und prüfen, ob ein Signal kurz vor dem Umschlag steht; Depot und Bitcoin mehrmals am Tag prüfen, besonders zur US-Eröffnung am Nachmittag und nach dem Schlusskurs; nach Käufen oder Verkäufen ein neues Backup ziehen; über das Fragezeichen im Handbuch nachlesen, wenn etwas unklar ist; im Screener prüfen, was in die Watchlist könnte.

## Kernfunktionen (Roadmap)

Die Feature-Karte mit Name, Beschreibung, Status und Reihenfolge lebt in **`features/INDEX.md`** und nur dort. Kurz gesagt: Das Produkt ist mit 13 Features vollständig nutzbar (Marktdaten, Kaufampel, Depot, Journal, Kaufziele, Cash, Rechner, Screener, Auswertung, Regelwerk, Backup, App-Hülle, Blasen-Ampel). Geplant und noch nicht gebaut sind fünf Ergänzungen, die aus dem Tagesablauf des Nutzers kommen: Schwellen-Warnung, Depotstand-Verlauf, Handbuch mit Quellen, Stop-Assistent und ein Cash-Konto mit Ein- und Auszahlungen.

## Erfolgskriterien

- Der Nutzer trifft jede Kauf-, Halte- und Verkaufsentscheidung mit der App, nicht daneben.
- Die Kaufampel, der Stop-Kurs und die KESt-Berechnung sind an genau einer Stelle definiert und durch `/qa` verifiziert (heute stehen Regel und Stop-Multiplikator an mehreren Stellen mit abweichenden Werten, siehe `docs/tech-debt.md` TD-10, TD-11).
- Kein Datenverlust: Backup-Roundtrip ist getestet, Reset ist bewusst.
- Jede Regel im Handbuch hat Hintergrund und Quelle.

## Rahmenbedingungen

- **Hosting:** Vercel (`vercel.json`, statischer Client plus eine Serverless-Function für `/api/*`); Live-Adresse `https://morgenroutine.vercel.app`; Deploy durch Merge auf `main`, keine weitere Freigabe.
- **Data region:** keine Datenbank; Nutzerdaten liegen ausschließlich im Browser des Geräts. Die Vercel-Function-Region ist im Repo nicht festgelegt (nur im Vercel-Dashboard sichtbar).
- **No backend — localStorage only.** Server hält nur flüchtige Caches und ruft Yahoo Finance, Stooq und Google Gemini auf. Das Verschlüsselungs-Backup ist der einzige Weg, Daten zwischen Geräten zu bewegen.
- **Stack (fix):** React 19 + Vite 6 + TypeScript, Tailwind v4, Express 4, `@google/genai`; npm; keine Tests, kein CI (offener Punkt).
- **Data protection law:** GDPR (EU/AT), DSG (CH), AI Act (EU) — die App bietet KI-Funktionen (Coach, Perioden-Analyse, Aktiensuche, Distribution-Days-Fallback) über Gemini.
- **Data protection stance:** standard.
- **Quality:** standard (`.ai-eng-kit` → `quality`).
- **Design system:** siehe `docs/design-system.md` (aus dem Code gelesen).
- **Externe Abhängigkeiten ohne Zusage:** inoffizielle Yahoo-Finance-Chart-Endpunkte, Stooq-CSV, der externe Aktien-Screener unter `aktien-screener-at.vercel.app`.
- **Team:** ein Autor, Arbeit über Claude Code auf Feature-Branches `claude/<thema>`, Merge per Pull Request.

## Nicht-Ziele

- Keine Broker-Anbindung, keine automatische Orderausführung — die App bereitet Entscheidungen vor, sie führt sie nicht aus.
- Keine Nutzerkonten, kein Server-Speicher für Depotdaten, kein Sync zwischen Geräten außer per Backup-Datei.
- Keine Echtzeit-Kurse; der 60-Sekunden-Cache reicht.
- Keine Anlageberatung; die Regeln sind das Regelwerk des Nutzers.
- Keine Steuerlogik für andere Länder als Österreich.

## Was bereits existiert

_Aus dem Code gelesen, nicht verifiziert — `/reverse-spec` schreibt die Spezifikation, `/qa` prüft sie. Fundstellen in `docs/codebase/architecture.md` und `features.md`._

- **MR-1 Marktdaten & Kursabruf** — `POST /api/fetch-live-prices`, `POST /api/market-history`; Yahoo→Stooq-Fallback, ATR(14), 60-s-Cache.
- **MR-2 Kaufampel & Distribution Days** — `src/utils/marketHealth.ts`, `POST /api/calculate-distribution-days`; Snapshot in `morgenroutine_daily_history`.
- **MR-3 Depot-Übersicht & Bestand** — `DepotDashboard`, `DepotTable`, Depot-/Besitzer-Verwaltung in `PortfolioTab`.
- **MR-4 Kauf- & Verkaufsjournal mit KESt** — `CombinedJournal`, `morgenroutine_purchases`, `morgenroutine_sold_trades`, `importParser.ts`.
- **MR-5 Kaufziele & Stop-Schutz** — Ansicht `kaufziele` in `PortfolioTab`, `morgenroutine_portfolio`, ATR-Parameter.
- **MR-6 Cash-Cockpit** — Ansicht `cash` in `PortfolioTab`, `morgenroutine_depot_starting_cash`.
- **MR-7 Rechner & Watchlist** — `RechnerTab`, `POST /api/stock-search`, `morgenroutine_watchlist`.
- **MR-8 Aktien-Screener (Einbettung)** — `AktienScreenerTab`, iframe + `postMessage` nur von erlaubten Origins.
- **MR-9 Auswertung & Erträgnisaufstellung** — `AuswertungTab`, `Ertraegnisaufstellung`, `POST /api/analyze-period`.
- **MR-10 Regelwerk & KI-Coach** — `RegelwerkTab`, `Handbuch`, `AICoachTab`, `POST /api/chat`.
- **MR-11 Backup, Demo & Reset** — `BackupSetupModal`, `BackupRestoreModal`, `encryption.ts`, `backupFile.ts`, Reset in `App.tsx`.
- **MR-12 App-Hülle, Onboarding & PWA** — `App.tsx`, `CompactHeader`, `OnboardingScreen`, PWA-Prompts, `ErrorBoundary`, `GET /api/ping`.
- **MR-13 Blasen-Ampel (Sektoren)** — `src/utils/blasenAmpel.ts`, `BlasenAmpel.tsx`, `POST /api/blasen-monatskurse` (PR #46, Nachtrag zur Karte).

**Aufräumliste (kein Feature):** `GET /auth/callback`, `POST /api/profiles/save|load` samt `cloud_profiles.json`, `POST /api/parse-screenshot`, `public/anleitung.html` — ohne Aufrufer im Client; Entscheidung „entfernen" steht in `docs/tech-debt.md` (TD-39, TD-41, TD-45, TD-65).
