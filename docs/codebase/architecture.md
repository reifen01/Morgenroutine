# Architecture

_Mapped by `/map` on 2026-10-18 at commit `ef921bc`._

## Layers and entry points

Das Projekt besteht aus **einer Codebasis mit zwei Laufzeiten**: einer React-Single-Page-PWA (Browser) und einem Express-Server (Node), der in der Entwicklung die Vite-Middleware einbettet und in Produktion entweder selbst `dist/` ausliefert oder — auf Vercel — als eine einzige Serverless-Funktion läuft. **Es gibt keine Datenbank**: aller Nutzerzustand liegt im `localStorage` des Browsers; der Server hält nur flüchtige Caches und eine optionale JSON-Datei (siehe *Data*). `.ai-eng-kit` → `layers` ist leer; die unten beschriebene Server-Laufzeit ist Teil derselben App, keine eigene Layer.

### Client (React 19 + Vite, PWA)
- **Einstieg:** `index.html` (lädt `/src/main.tsx`, Google Fonts Inter/Space Grotesk/Fira Code, PWA-Meta-Tags) → `src/main.tsx` (rendert `<ErrorBoundary><App/></ErrorBoundary>` in `#root`) → `src/App.tsx` (1024 Zeilen; hält den gesamten globalen Zustand als `useState`, persistiert ihn per `useEffect` in `localStorage` und rendert Header, Tab-Leiste und die Tab-Inhalte).
- **Zustandsmodell (stated, `src/App.tsx:116-442`):** jede Entität ist ein `useState` in `App`, initialisiert aus `localStorage`, und wird an die Tab-Komponenten als Props plus Setter weitergereicht. Keine State-Library, kein Router — der aktive Tab ist ein `useState<"morgenroutine" | "screener" | "kaufziele" | "cash" | "rechner" | "journal" | "auswertung" | "regelwerk" | "ai-coach" | "workspace">` (`src/App.tsx:64`), die URL ändert sich beim Tabwechsel nicht.
- **Server-Aufrufe vom Client** (alle relativ, `fetch("/api/…")`): `src/App.tsx:157` (`/api/market-history`, beim Start), `src/components/MorgenroutineTab.tsx:296,301,628` (`/api/fetch-live-prices`, `/api/calculate-distribution-days`), `src/components/AICoachTab.tsx:79` (`/api/chat`), `src/components/AuswertungTab.tsx:41` (`/api/analyze-period`), `src/utils/useStockSearch.ts:51` (`/api/stock-search`).
- **PWA:** `vite.config.ts` → `VitePWA({ registerType: 'prompt', … })` mit Workbox-Precache aller Build-Assets und Runtime-Cache für Google Fonts; `src/usePWAUpdate.ts` kapselt den Service-Worker-Lebenszyklus (Update-Badge im Header, Banner `PWAUpdatePrompt`). Build-Version wird in `vite.config.ts` → `__BUILD_VERSION__` aus `VERCEL_GIT_COMMIT_SHA` bzw. `git rev-parse --short HEAD` eingebrannt.
- **Eingebettete Fremd-App:** `src/components/AktienScreenerTab.tsx:19-20` bindet `https://aktien-screener-at.vercel.app` (Fallback-Origin `https://rabe-screener.vercel.app`) per `<iframe>` ein und übergibt Watchlist/Depot-Ticker als Query-Parameter `?embed=1&mr=…&dp=…`; die Rückrichtung läuft über `window.postMessage({type:"aks-watchlist-add", symbols})`, das `src/App.tsx:455-476` nur von diesen beiden Origins annimmt.

### Server (Express 4, `server.ts`)
- **Hauptdatei:** `server.ts` (1401 Zeilen) — Express-App, `express.json({ limit: "50mb" })` (`server.ts:12`), alle API-Routen, die Gemini-Client-Initialisierung (`server.ts:26-37`, `@google/genai`, Schlüssel aus `process.env.GEMINI_API_KEY`), In-Memory-Caches und am Ende `startServer()`.
- **Start lokal (stated, `package.json` → `"dev": "tsx server.ts"`):** `startServer()` (`server.ts:1373`) hängt bei `NODE_ENV !== "production"` die Vite-Dev-Middleware ein (`server.ts:1382`), sonst `express.static(dist)` plus Catch-all `app.get('*')` → `dist/index.html` (`server.ts:1386-1389`); lauscht auf Port **3000** (`server.ts:10`, `server.ts:1392`). `npm run build` bündelt zusätzlich den Server nach `dist/server.cjs`, `npm start` startet ihn.
- **Vercel-Variante (stated):** `api/index.ts` importiert `../server.js` per dynamischem Import und reicht `(req, res)` an die Express-App durch; `vercel.json` schreibt `/api/(.*)` und `/auth/(.*)` auf `/api/index` um (`maxDuration: 60`), `buildCommand: vite build`, `outputDirectory: dist` — das statische Frontend liefert Vercel, der Server-Code läuft nur für `/api/*` und `/auth/*`. Bei gesetztem `process.env.VERCEL` wird `startServer()` nicht aufgerufen (`server.ts:1397-1399`). Dass Vercel das aktuelle Produktionsziel ist, ist aus `vercel.json` **inferred** (es gibt keine Deploy-Pipeline im Repo; `README.md` nennt noch Google AI Studio / Cloud Run als Herkunft).
- **Grenze Client ↔ Server:** ausschließlich die JSON-Routen unter `/api/*`; der Server kennt keine Nutzerdaten, bekommt sie aber pro Aufruf im Request-Body (z. B. Tages-Snapshots an `/api/analyze-period`, Chatverlauf an `/api/chat`).

## Routes, screens, or tools

### Server-Routen (`server.ts`)

| Route / screen / tool / job | Layer | File | What it does | Nav entry? |
|---|---|---|---|---|
| `GET /api/ping` | Server | `server.ts:16` | Diagnose: Node-Version, ob `GEMINI_API_KEY` gesetzt ist, ob `VERCEL` gesetzt ist, Zeitstempel. Keine externen Dienste. | nein (kein Aufrufer in `src/`) |
| `POST /api/chat` | Server | `server.ts:89` | AI-Handels-Coach: nimmt `messages[{role,text}]`, baut eine Gemini-Chat-Session (`gemini-3.5-flash`, `systemInstruction` = Handels-Handbuch-Regeln `server.ts:40-86`) und liefert `{text}`. 503 ohne Gemini-Schlüssel. **Extern:** Google Gemini. | aufgerufen aus `AICoachTab.tsx:79` |
| `POST /api/analyze-period` | Server | `server.ts:136` | Wochen-/Monats-Pareto-Auswertung: nimmt `label, kind, snapshots[], stats`, fragt Gemini (Fallback-Kette `gemini-2.5-flash` → `2.0-flash` → `1.5-flash`, `server.ts:205`) und liefert `{text}`. **Extern:** Google Gemini. | aufgerufen aus `AuswertungTab.tsx:41` |
| `GET /auth/callback` (+ `/auth/callback/`) | Server | `server.ts:230` | Liefert eine statische HTML-Seite, die `window.location.hash` per `postMessage({type:'OAUTH_AUTH_SUCCESS', hash}, '*')` an `window.opener` schickt und das Popup schließt (Rest der entfernten Google-Workspace-Anbindung, siehe `WorkspaceSyncTab.tsx:1-8`). Keine externen Dienste. | nein (kein Aufrufer in `src/`) |
| `POST /api/profiles/save` | Server | `server.ts:329` | Legt unter `name` (kleingeschrieben) ein Profil `{pin, payload{clientId, spreadsheetId, documentId, folderId}}` in `cloudProfiles` an bzw. überschreibt es bei passender PIN; schreibt `cloud_profiles.json`. Keine externen Dienste. | nein (kein Aufrufer in `src/`) |
| `POST /api/profiles/load` | Server | `server.ts:360` | Gibt das Profil-`payload` zu `name` zurück, wenn `pin` übereinstimmt (404 unbekannt, 403 falsche PIN). Keine externen Dienste. | nein (kein Aufrufer in `src/`) |
| `POST /api/parse-screenshot` | Server | `server.ts:384` | OCR per Gemini-Vision: nimmt `imageBase64` (Data-URL), fragt nacheinander `gemini-2.5-flash`/`2.0-flash`/`1.5-flash` mit JSON-Schema (vix, vxv, vvix, spx, wti, gas, tsla, now, baba, btc), 30-s-Timeout je Versuch. **Extern:** Google Gemini. | nein (kein Aufrufer in `src/`) |
| `POST /api/fetch-live-prices` | Server | `server.ts:646` | Nimmt `symbols[]`, holt je Symbol den Yahoo-Chart (`range=2mo&interval=1d`, `yahooFetch`), rechnet ATR(14) und Vortagesschluss, trennt Ampel-Indikatoren (`YAHOO_MARKET_MAP` `server.ts:517`) von Aktienkursen, versucht bei fehlendem Kurs Stooq (`STOOQ_MAP` `server.ts:589`), cached 60 s pro Symbolmenge. **Extern:** Yahoo Finance (`query1`/`query2.finance.yahoo.com`), Stooq (`stooq.com/q/d/l/`). | aufgerufen aus `MorgenroutineTab.tsx:296` |
| `POST /api/market-history` | Server | `server.ts:975` | Nimmt `days` (5–120, Standard 60), lädt 6 Monate Tagesschlüsse für `^VIX ^VIX3M ^VVIX ^GSPC CL=F NG=F` (Ersatz `SPY×10` für SPX) und rechnet Distribution Days je Tag für SPY/QQQ zurück; Antwort `{history{date→…}, source:"yahoo", generatedAt, days}`, Cache 1 h. **Extern:** Yahoo Finance. | aufgerufen aus `App.tsx:157` (automatisch beim Start) |
| `POST /api/calculate-distribution-days` | Server | `server.ts:1043` | Distribution Days (25 Tage) für SPY und QQQ: (1) Tages-Cache, (2) Berechnung aus Yahoo-Daten (`source:"yahoo"`), (3) Fallback Gemini mit Google-Search-Grounding (`gemini-3.5-flash`, `source:"ai"`), (4) Gemini ohne Suche, (5) feste Schätzwerte 2/3 (`source:"estimate"`); 5-min-Cooldown nach 429. **Extern:** Yahoo Finance, Google Gemini (inkl. `googleSearch`-Tool). | aufgerufen aus `MorgenroutineTab.tsx:301,628` |
| `POST /api/stock-search` | Server | `server.ts:1249` | Aktiensuche nach Name/Ticker/ISIN/WKN: lokales Wörterbuch `STOCK_DICTIONARY` (`server.ts:790-834`, 44 Einträge) zuerst, ab 3 Zeichen zusätzlich Gemini (`gemini-3.5-flash`, JSON-Schema), max. 5 Treffer, `searchCache` ≤100 Einträge, 5-min-Cooldown nach 429. **Extern:** Google Gemini. | aufgerufen aus `useStockSearch.ts:51` |
| `GET *` (nur Produktion, nicht Vercel) | Server | `server.ts:1387` | SPA-Fallback: liefert `dist/index.html`; davor `express.static(dist)` (`server.ts:1386`). | — |
| Vite-Middleware (nur Dev) | Server | `server.ts:1382` | `app.use(vite.middlewares)` — liefert das Frontend mit HMR. | — |
| Vercel-Function `api/index.ts` | Server | `api/index.ts:12` | Wrapper: lädt `../server.js` einmal, reicht jede Anfrage an die Express-App; 500-JSON bei Ladefehler. Erhält per `vercel.json` alle `/api/*` und `/auth/*`. | — |

### Screens (Client, `src/App.tsx` + `src/components/`)

Vier Haupt-Tabs in der Leiste (`src/App.tsx:700-753`): **Morgen** (`morgenroutine`), **Depot** (`journal`), **Analyse** (Klick setzt `screener`; aktiv bei allen `ANALYSE_TABS`), **System** (Klick setzt `regelwerk`; aktiv bei `regelwerk`/`workspace`). Analyse hat eine zweite Reiterzeile `ANALYSE_REITER` (`src/App.tsx:51-57`, Reihenfolge screener → auswertung → kaufziele → cash → rechner), System eine zweite Reiterzeile „🎓 Regeln & Coach" / „🗂️ Workspace & Backup" (`src/App.tsx:906-929`).

| Route / screen / tool / job | Layer | File | What it does | Nav entry? |
|---|---|---|---|---|
| Tab `morgenroutine` („Morgen") | Client | `src/components/MorgenroutineTab.tsx` (1721 Z.), gerendert `src/App.tsx:758` | Tägliche Routine: Eingabe/Live-Abruf der sechs Ampel-Indikatoren (VIX, VXV, VVIX, SPX, WTI, Gas) und Distribution Days, Kaufampel (`utils/marketHealth.ts`), Status-Zusammenfassung, Trend-Pfeile (`TrendBarometer`), Live-Assetkurse (€) & ATR mit EUR/USD-Umrechnung, Import-Cache „Cache laden" (`:224`), schreibt Tages-Snapshot. | ja — Haupttab 1 |
| Tab `journal` („Depot") | Client | `src/components/PortfolioTab.tsx` (2332 Z., `ansicht="depot"`), gerendert `src/App.tsx:837` | Depot-Übersicht (`DepotDashboard` `:2202`), sortierbare Bestandstabelle mit KESt-Vorschau (`DepotTable` `:2207`), kombiniertes Kauf-/Verkaufs-Journal (`CombinedJournal` `:2238`), Depots & Besitzer-Verwaltung (`:1957-2046`), Tranchen-Checkliste; nimmt `verkaufVorlage` aus den Kaufzielen entgegen. | ja — Haupttab 2 |
| Block „⭐ Watchlist" im Depot | Client | `src/components/RechnerTab.tsx` mit `ansicht="watchlist"`, gerendert `src/App.tsx:865-894` | Aufklappbarer Block unter dem Depot: Favoriten-Watchlist (Symbol, Kurs, Tagesänderung, ATR), Aktiensuche, „In den Rechner laden" (setzt `rechnerVorlage`, springt zu `rechner`). | ja — Teil von Depot |
| Tab `screener` („🔎 Screener") | Client | `src/components/AktienScreenerTab.tsx` (81 Z.), gerendert `src/App.tsx:794` | iframe auf den externen Aktien-Screener (`aktien-screener-at.vercel.app`) mit Watchlist/Depot-Tickern als `?mr=`/`?dp=`; Link „Eigenes Fenster". | ja — Analyse-Reiter 1 (Standard beim Klick auf „Analyse") |
| Tab `auswertung` („📊 Auswertung") | Client | `src/components/AuswertungTab.tsx` (209 Z.), gerendert `src/App.tsx:896` | Wochen-/Monatsstatistik aus `dailyHistory` (`utils/periodStats.ts`), KI-Entwurf per `/api/analyze-period`, editierbare Pareto-Learnings, Erträgnisaufstellung (`Ertraegnisaufstellung` `:94`). | ja — Analyse-Reiter 2 |
| Tab `kaufziele` („🎯 Kaufziele") | Client | `src/components/PortfolioTab.tsx` mit `ansicht="kaufziele"` (`:1593-1947`), gerendert `src/App.tsx:810` | Kaufziele & Stop-Schutz: Positionen mit hartem Anker, Limit, Tranche, Stop-Kurs (= max(Anker, Kurs − m·ATR)), Pine-Script-ATR-Parameter (`:1613`), „HODL Sparplan Index" (`:1837`), „🎯 Rechnen" → Rechner, „Verkauf buchen" → Depot. | ja — Analyse-Reiter 3 |
| Tab `cash` („💵 Cash") | Client | `src/components/PortfolioTab.tsx` mit `ansicht="cash"` (`:1505-1946`), gerendert `src/App.tsx:810` | Cash-Cockpit: arbeitendes Depot-Kapital, freies Cash, reserviertes Budget je Depot (aus `depotStartingCash`, Käufen, Verkäufen). | ja — Analyse-Reiter 4 |
| Tab `rechner` („🧮 Rechner") | Client | `src/components/RechnerTab.tsx` (1368 Z., `ansicht="rechner"`), gerendert `src/App.tsx:796` | Positionsgrößen-/Stop-Loss-Rechner (1 %-Regel, Depotgröße, Einstieg, Stop, Tranche, Kursziel), Blitz-Suche per `useStockSearch`, Denkfehler-Checkliste, ATR-Rechner mit Pine-Script-Analyse, „Mathematische Risikoanalyse"; übernimmt `rechnerVorlage`. | ja — Analyse-Reiter 5 |
| Tab `regelwerk` („🎓 Regeln & Coach") | Client | `src/components/RegelwerkTab.tsx` (79 Z.), gerendert `src/App.tsx:931` | Eigener Umschalter „Handels-Regeln" / „AI-Handels-Coach": zeigt `Handbuch` (mit Direktsprung `handbuchAbschnitt` und Zurück-Knopf) oder `AICoachTab`. | ja — System-Reiter 1 (Standard beim Klick auf „System") |
| Tab `workspace` („🗂️ Workspace & Backup") | Client | `src/components/WorkspaceSyncTab.tsx` (212 Z.), gerendert `src/App.tsx:945` | PIN-Backup erstellen/laden (öffnet die Modals), App-Link + QR-Code (extern `api.qrserver.com`, `:124`), Demo-Daten laden (`utils/demoData.ts`), „Alle Daten zurücksetzen" (löscht alle `morgenroutine_*`-Keys, `src/App.tsx:979-1016`). | ja — System-Reiter 2 |
| Tab-Wert `ai-coach` | Client | `src/App.tsx:64`, `:205` | Im Union-Typ und in `helpSectionForTab` vorhanden, aber **kein Button setzt ihn und kein Render-Zweig zeigt ihn** — toter Wert; der Coach läuft über `regelwerk`. | nein |
| Modal: Handbuch-Hilfe | Client | `src/components/HelpModal.tsx` (316 Z.), `src/App.tsx:673` | Rendert `HANDBUCH.md` (per `?raw`-Import, `:5`) als Markdown mit Inhaltsverzeichnis, springt je aktivem Tab zu einem Abschnitt (`helpSectionForTab` `src/App.tsx:196-207`), enthält `InstallInstructions`. | Header-Button „?" (`CompactHeader.tsx:99`) |
| Modal: Backup erstellen | Client | `src/components/BackupSetupModal.tsx` (185 Z.), `src/App.tsx:679` | PIN (≥4 Ziffern) oder Passwort (≥8), verschlüsselt den `BackupPayload` (`utils/backupFile.ts` → `utils/encryption.ts`, AES-GCM-256/PBKDF2) und lädt eine `.json` herunter; setzt `morgenroutine_last_backup_at`. | Header-Badge „🛟 Backup" (`CompactHeader.tsx:69`), Workspace-Tab |
| Modal: Backup laden | Client | `src/components/BackupRestoreModal.tsx` (283 Z.), `src/App.tsx:686` | Datei wählen, Vergleich alt/neu (Zähler + `lastModified`), entschlüsseln, `applyRestoredPayload` (`src/App.tsx:524`). | Workspace-Tab, Morgen-Tab (`onOpenRestoreBackup`) |
| Onboarding | Client | `src/components/OnboardingScreen.tsx` (184 Z.), `src/App.tsx:629` | Mehrstufiger Willkommensdialog beim ersten Start; setzt `morgenroutine_onboarding_done`. | automatisch, solange der Key fehlt |
| PWA-Installationshinweis | Client | `src/components/PWAInstallPrompt.tsx` (148 Z.), `src/App.tsx:631` | `beforeinstallprompt`-Banner (Android/Desktop) bzw. iOS-Anleitung; Ausblenden merkt sich `pwa_install_dismissed`. | automatisch |
| PWA-Update-Banner | Client | `src/components/PWAUpdatePrompt.tsx` (36 Z.), `src/App.tsx:632` | „Neue Version verfügbar" unten rechts, `onApply` lädt neu. | automatisch bei `needRefresh` |
| Fehlerseite | Client | `src/components/ErrorBoundary.tsx` (146 Z.), `src/main.tsx:9` | Fängt Render-Fehler, bietet Neuladen und „Caches leeren" (nur Service-Worker-Caches, nie `localStorage`, `:33-48`). | automatisch bei Fehler |
| Statische Seite `/anleitung.html` | Client | `public/anleitung.html` (295 Z.) | Eigenständige Installations-Anleitung ohne React; wird von Vite als statisches Asset ausgeliefert. | nein (Link im Repo nicht gefunden) |

### Alle Komponenten in `src/components/` (26 Dateien)

| Komponente | Datei | Zweck | Nav-Eintrag? / unter welchem Haupttab |
|---|---|---|---|
| `AICoachTab` | `src/components/AICoachTab.tsx` (307 Z.) | Chat-Oberfläche zum Gemini-Coach (`/api/chat`); Verlauf nur im React-State. | nein — eingebettet in System → Regeln & Coach (`RegelwerkTab.tsx:74`) und in den Kauf-/Verkaufsformularen des Depots (`CombinedJournal.tsx:1459,1770`) |
| `AktienScreenerTab` | `src/components/AktienScreenerTab.tsx` (81 Z.) | iframe-Einbettung des externen Screeners, Ticker-Brücke. | ja — Analyse → Screener |
| `AuswertungTab` | `src/components/AuswertungTab.tsx` (209 Z.) | Wochen-/Monatsauswertung + KI-Learnings + Erträgnisaufstellung. | ja — Analyse → Auswertung |
| `BackupRestoreModal` | `src/components/BackupRestoreModal.tsx` (283 Z.) | Backup-Datei laden/entschlüsseln/vergleichen. | nein — Modal (System → Workspace, Header) |
| `BackupSetupModal` | `src/components/BackupSetupModal.tsx` (185 Z.) | Backup-Datei verschlüsselt erzeugen. | nein — Modal (System → Workspace, Header) |
| `CombinedJournal` | `src/components/CombinedJournal.tsx` (2520 Z.) | Kauf- und Verkaufsbuchung mit FIFO/Durchschnitt-KESt-Matching, Excel-/JSON-Import (`utils/importParser.ts`), kombinierte Chronologie, Anschaffungs-Journal, Trade-Historie. | nein — Teil von Depot (`PortfolioTab.tsx:2238`) |
| `CompactHeader` | `src/components/CompactHeader.tsx` (121 Z.) | Kopfzeile: Logo (Update-Check), Titel, Update-/Backup-Badges, Datum, Hilfe-Button, Bereitschafts-Punkt. | nein — Shell |
| `DepotCurveChart` | `src/components/DepotCurveChart.tsx` (394 Z.) | Recharts-Kapitalkurve aus `soldTrades` je Depot. | nein — in `PortfolioTab.tsx:30` importiert, **aber nirgends gerendert** (kein `<DepotCurveChart` in `src/`) |
| `DepotDashboard` | `src/components/DepotDashboard.tsx` (260 Z.) | Depot-Übersicht: Aufteilung je Aktie/Depot/Besitzer, G/V je Aktie, Tagesgewinner/-verlierer. | nein — Teil von Depot (`PortfolioTab.tsx:2202`) |
| `DepotTable` | `src/components/DepotTable.tsx` (428 Z.) | Sortierbare Bestandstabelle mit Aufklappzeilen (ISIN/WKN, Kaufdaten, KESt-Vorschau). | nein — Teil von Depot (`PortfolioTab.tsx:2207`) |
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` (146 Z.) | Render-Fehlerfänger mit Wiederherstellungsseite. | nein — Shell (`src/main.tsx`) |
| `Ertraegnisaufstellung` | `src/components/Ertraegnisaufstellung.tsx` (215 Z.) | Jahres-/Depot-Summen realisierter Verkäufe (G/V, KESt, Netto). | nein — Teil von Analyse → Auswertung (`AuswertungTab.tsx:94`) |
| `Handbuch` | `src/components/Handbuch.tsx` (186 Z.) | Durchsuchbares Regel-Handbuch aus `utils/handbuchInhalt.ts` mit Direktsprung. | nein — Teil von System → Regeln & Coach (`RegelwerkTab.tsx:70`) |
| `HelpModal` | `src/components/HelpModal.tsx` (316 Z.) | Markdown-Viewer für `HANDBUCH.md` mit Abschnittsnavigation. | nein — Modal (Header „?") |
| `HilfeLink` | `src/components/HilfeLink.tsx` (52 Z.) | Buch-Button; feuert `CustomEvent("morgenroutine:handbuch")`, das `src/App.tsx:77-92` in einen Sprung nach `regelwerk` übersetzt. | nein — in Morgen, Depot, Analyse verwendet |
| `InstallInstructions` | `src/components/InstallInstructions.tsx` (69 Z.) | iOS/Android/Desktop-Installationsanleitung. | nein — in `HelpModal.tsx:309`, `OnboardingScreen.tsx:111` |
| `MorgenroutineTab` | `src/components/MorgenroutineTab.tsx` (1721 Z.) | Tagesroutine, Live-Abruf, Kaufampel, Snapshot. | ja — Morgen |
| `OnboardingScreen` | `src/components/OnboardingScreen.tsx` (184 Z.) | Erststart-Dialog. | nein — Overlay |
| `PWAInstallPrompt` | `src/components/PWAInstallPrompt.tsx` (148 Z.) | Installationsbanner. | nein — Overlay |
| `PWAUpdatePrompt` | `src/components/PWAUpdatePrompt.tsx` (36 Z.) | Update-Banner. | nein — Overlay |
| `PortfolioTab` | `src/components/PortfolioTab.tsx` (2332 Z.) | Depot (Standard), Kaufziele und Cash — drei Ansichten in einer Komponente (`ansicht`-Prop `:65`). | ja — Depot; Analyse → Kaufziele; Analyse → Cash |
| `RechnerTab` | `src/components/RechnerTab.tsx` (1368 Z.) | Rechner (Standard) und Watchlist — zwei Ansichten in einer Komponente (`ansicht`-Prop `:50`). | ja — Analyse → Rechner; Watchlist-Block unter Depot |
| `RegelwerkTab` | `src/components/RegelwerkTab.tsx` (79 Z.) | Umschalter Handbuch / AI-Coach. | ja — System → Regeln & Coach |
| `SecretInput` | `src/components/SecretInput.tsx` (59 Z.) | Maskiertes PIN-/Passwortfeld mit Halten-zum-Anzeigen. | nein — in beiden Backup-Modals |
| `TrendBarometer` | `src/components/TrendBarometer.tsx` (252 Z.) | `computeTrend` + `TrendArrow` je Ampel-Indikator über die letzten Handelstage (rein informativ). | nein — Teil von Morgen (`MorgenroutineTab.tsx:28`) |
| `WorkspaceSyncTab` | `src/components/WorkspaceSyncTab.tsx` (212 Z.) | Backup-Einstieg, QR-Link, Demo-Daten, Reset. | ja — System → Workspace & Backup |

## Data: schema source and entities

**Schema lives in:** several — **`src/types.ts` leads** (alle Nutzer-Entitäten als TypeScript-Interfaces; die `localStorage`-Keys in `src/App.tsx` speichern genau diese Typen als JSON). Ergänzend: `src/utils/backupFile.ts:1-21` (Backup-Dateiformat `MR-BACKUP-1`, `BackupPayload` als Summe aller Entitäten), `server.ts:302-307` (`ProfilePayload`, einzige serverseitig persistierte Struktur). Es gibt keine Migrationen, kein ORM, keine Datenbank; `docs/data-model.md` ist noch die Kit-Vorlage.

Persistenz ist **ausschließlich der Browser-`localStorage` des jeweiligen Geräts** (`src/App.tsx:444-551`), plus eine Backup-Datei, die der Nutzer selbst herunterlädt. Der Server hält nur Caches (verloren bei Neustart bzw. je Serverless-Instanz) und — nur außerhalb Vercel sinnvoll — die Datei `cloud_profiles.json`. Alle Keys mit Präfix `morgenroutine_` werden von „Alle Daten zurücksetzen" gelöscht (`src/App.tsx:989-994`); `pwa_install_dismissed` ist nicht präfixiert und überlebt das.

| Table / entity | Defined in | Owned by (route group / module) | Notes (relations, RLS/policies present?) |
|---|---|---|---|
| `morgenroutine_portfolio` → `PortfolioItem[]` | `src/types.ts:64-77`; gelesen `src/App.tsx:266`, geschrieben `:446` | Depot / Kaufziele (`PortfolioTab`) | Handels-Wächter-Positionen: `key` (Asset-Schlüssel, klein), `harterAnker`, `limitPreis`, `tranchenGroesse`, `stopKurs`, `status` green/yellow/red/sold, optional `ticker`, `isin`. Verknüpft über `key` mit `LivePrices`, `PortfolioPurchase`, `SoldTradeItem`. Keine Policies (lokal). |
| `morgenroutine_purchases` → `PortfolioPurchase[]` | `src/types.ts:97-111`; gelesen `src/App.tsx:309` (auch `:351,:393` zur Depot-/Besitzer-Rekonstruktion), geschrieben `:499` | Depot (`CombinedJournal`) | Kauf-Tranchen (Lots): `key`, `kaufDatum`, `kaufKurs`, `anzahlAktien`, `tatsaechlicheKosten`, `verbleibendeAnzahlAktien`, `depot`, `besitzerName`, `gedanken`, `ziele`. Ein Kauf gehört zu genau einem Asset-`key`; Verkäufe verbrauchen Lots über `consumedLots.purchaseId`. |
| `morgenroutine_sold_trades` → `SoldTradeItem[]` | `src/types.ts:79-95`; gelesen `src/App.tsx:292` (auch `:362,:404`), geschrieben `:495` | Depot (`CombinedJournal`), Auswertung (`Ertraegnisaufstellung`) | Realisierte Verkäufe mit `gewinnVerlust`, `kestBetrag`, `nettoGewinn`, `taxMethod` FIFO/durchschnitt, `consumedLots[]` → `PortfolioPurchase.id`, `depot`, `besitzerName`. |
| `morgenroutine_watchlist` → `WatchlistItem[]` | `src/types.ts:172-181`; gelesen `src/App.tsx:432` und direkt `src/components/PortfolioTab.tsx:245`, geschrieben `src/App.tsx:450`; ergänzt per `postMessage` `src/App.tsx:455-476` | Rechner/Watchlist (`RechnerTab`), Screener-Brücke | `symbol`, `name`, `atr`, `price` (Strings), optional `changePct`, `quelle`. |
| `morgenroutine_live_prices` → `LivePrices` = `Record<string, LivePriceData>` | `src/types.ts:6-27`; gelesen `src/App.tsx:251`, geschrieben `:550` | Morgen (`MorgenroutineTab`), alle Tabs lesend | Kurs je Asset-`key`: `price`, `date`, `atr`, `quelle`, `changePct`. Freier Schlüsselraum (Umbau 07/2026, `src/types.ts:17-27`); Zugriff über `getLivePrice()`/`ensureLivePrice()`. |
| `morgenroutine_market_state` → `MarketState` | `src/types.ts:121-134`; gelesen `src/App.tsx:229`, geschrieben `:546` | Morgen (`MorgenroutineTab`), Workspace | Ampel-Indikatoren `vix vxv vvix spx wti gas`, `distSpx`, `distNdx`, `distSource` yahoo/ai/estimate/manual, `tagesAenderung`. Grundlage der Kaufsperre (`src/utils/marketHealth.ts`). |
| `morgenroutine_daily_history` → `DailySnapshot[]` | `src/types.ts:138-157`; gelesen `src/App.tsx:117`, geschrieben `:134`; aufgefüllt aus `/api/market-history` via `src/utils/historyBackfill.ts` (`src/App.tsx:153-185`) | Morgen (schreibt), Auswertung (liest) | Ein Datensatz je Datum (`date` YYYY-MM-DD) mit den sechs Indikatoren, `distSpx/distNdx`, `distSource`, `ratio`, `status` GREEN/RED. Upsert in `recordDailySnapshot` (`src/App.tsx:142`). |
| `morgenroutine_period_learnings` → `PeriodLearning[]` | `src/types.ts:160-166`; gelesen `src/App.tsx:126`, geschrieben `:138` | Auswertung (`AuswertungTab`) | Je `periodKey` („2026-W24" oder „2026-06") ein editierbarer Text (`kind`, `text`, `updatedAt`). |
| `morgenroutine_checklist` → `ChecklistItem[]` | `src/types.ts:113-119`; gelesen `src/App.tsx:279`, geschrieben `:491` | Depot (`PortfolioTab`) | Tranchen-Checkliste: `title`, `tranchenGroesse`, `status`, `kategorie`. |
| `morgenroutine_custom_depots` → `string[]` | `src/App.tsx:334-374` (lesen, inkl. Rekonstruktion aus Käufen/Verkäufen), geschrieben `:479` | Depot (Depot- & Besitzer-Verwaltung) | Namen der Broker/Depots; referenziert von `PortfolioPurchase.depot`, `SoldTradeItem.depot`, Schlüssel in `depotStartingCash`. |
| `morgenroutine_custom_besitzer` → `string[]` | `src/App.tsx:376-416`, geschrieben `:483` | Depot | KYC-Besitzernamen; referenziert von `PortfolioPurchase.besitzerName`, `SoldTradeItem.besitzerName`. |
| `morgenroutine_depot_starting_cash` → `Record<string, number>` | `src/App.tsx:418-428`, geschrieben `:487` | Analyse → Cash, Depot | Startkapital je Depotname. |
| `morgenroutine_data_last_modified` → ISO-String | `src/App.tsx:40` (Konstante `LAST_MODIFIED_KEY`), gelesen `:112`, geschrieben `:506` bei jeder Änderung privater Daten | Backup-Vergleich (`BackupRestoreModal`) | Zeitstempel für „lokale Daten neuer als Backup". |
| `morgenroutine_last_backup_at` → ISO-String | `src/utils/backupFile.ts:139` (Konstante `LAST_BACKUP_KEY`), geschrieben `:144`, gelesen `:156` (`tageSeitBackup`) | Header-Badge (`CompactHeader`) | Zeitpunkt der letzten erzeugten Backup-Datei. |
| `morgenroutine_onboarding_done` → `"1"` | gelesen `src/App.tsx:555`, geschrieben `src/components/OnboardingScreen.tsx:68` | Onboarding | Flag. |
| `morgenroutine_prices_cache` → `{timestamp, marketState{vix,vxv,vvix,wti,gas}, livePrices{tsla,now,baba,btc}}` | gelesen `src/components/MorgenroutineTab.tsx:158`, geschrieben `:217` | Morgen („Cache laden", `:224`) | Import-Zwischenspeicher; **fest auf vier Assets `tsla/now/baba/btc`** verdrahtet (`:150-156`, `:208-213`), im Gegensatz zum freien `LivePrices`-Schlüsselraum. |
| `morgenroutine_prices_last_updated` → ISO-String | gelesen `src/components/MorgenroutineTab.tsx:171`, geschrieben `:192,:221,:250` | Morgen | Zeitpunkt des letzten Imports/Cache-Übernahme. |
| `morgenroutine_last_live_fetch` → ISO-String | gelesen `src/components/MorgenroutineTab.tsx:260`, geschrieben `:451` | Morgen | `fetchedAt` des letzten erfolgreichen `/api/fetch-live-prices`. |
| `morgenroutine_atr_multiplier` → Zahl als String | gelesen `src/components/PortfolioTab.tsx:147`, geschrieben `:164` | Analyse → Kaufziele (Pine-Script-Parameter) | Stop = Kurs − Multiplikator·ATR. |
| `morgenroutine_atr_length` → Zahl als String | gelesen `src/components/PortfolioTab.tsx:152`, geschrieben `:168` | Analyse → Kaufziele | ATR-Periode. |
| `morgenroutine_atr_smoothing` → String | gelesen `src/components/PortfolioTab.tsx:157`, geschrieben `:172` | Analyse → Kaufziele | Glättungsmethode. |
| `pwa_install_dismissed` → Zeitstempel als String | gelesen `src/components/PWAInstallPrompt.tsx:28`, geschrieben `:70` | PWA-Banner | Ohne `morgenroutine_`-Präfix; wird vom Reset nicht gelöscht. |
| Backup-Datei `MR-BACKUP-1` (`.json`-Download) → `BackupPayload` | `src/utils/backupFile.ts:1-21` (Format), Payload-Zusammenstellung `src/App.tsx:510-522` | Backup-Modals | Enthält verschlüsselt: portfolio, watchlist, livePrices, purchases, soldTrades, checklist, customDepots, customBesitzer, depotStartingCash, dailyHistory, periodLearnings; unverschlüsselt nur `summary`-Zähler und `lastModified`. AES-GCM-256, PBKDF2 200k Iterationen, fester Salt `APP_SALT` (`src/utils/encryption.ts:12`). Nicht enthalten: `marketState`, ATR-Parameter, Import-Cache. |
| Demo-Datensatz | `src/utils/demoData.ts` (`DEMO_PAYLOAD` als `BackupPayload`); zusätzlich `public/Morgenroutine_Demo.json` | Workspace („Demo-Portfolio aktivieren") | Statisch im Code; überschreibt nach Rückfrage den Zustand. |
| Server-Datei `cloud_profiles.json` → `Record<name, {pin, payload: ProfilePayload}>` | `server.ts:302-318` (Typ, Pfad `path.join(process.cwd(), "cloud_profiles.json")`, Laden beim Start), Schreiben `saveProfilesToFile` `server.ts:320` | `/api/profiles/*` | PIN **im Klartext**, Google-IDs im Klartext. Datei liegt nicht im Repo und ist **nicht in `.gitignore`**; auf Vercel ist das Dateisystem flüchtig (inferred). |
| Server-Cache `livePriceCache` (`Map`) | `server.ts:530-531`, TTL 60 s | `/api/fetch-live-prices` | Schlüssel = sortierte Symbolliste; unbegrenzt in der Größe. |
| Server-Cache `marketHistoryCache` | `server.ts:972-973`, TTL 1 h | `/api/market-history` | Ein Eintrag (letzte `days`-Anfrage). |
| Server-Cache `cachedDistDays` | `server.ts:843`, gültig für das heutige Datum | `/api/calculate-distribution-days` | `distSpx`, `distNdx`, `reasoning`, `date`. |
| Server-Cache `searchCache` (`Map`) + `lastRateLimitTime` | `server.ts:838-840`, max. 100 Einträge, Cooldown 5 min | `/api/stock-search`, `/api/calculate-distribution-days` | Gemeinsamer 429-Cooldown beider Routen. |
| Service-Worker-Caches (Workbox) | `vite.config.ts` → `VitePWA.workbox` (Precache `**/*.{js,css,html,ico,png,svg,webp,woff,woff2}`, Runtime `google-fonts-cache`, `gstatic-fonts-cache`) | PWA | Nur Assets, keine API-Antworten; `ErrorBoundary.tsx:33-48` leert sie auf Wunsch. |

## Server functions and endpoints

| Function / endpoint | File | Called from | Touches (tables) |
|---|---|---|---|
| `GET /api/ping` | `server.ts:16` | kein Aufrufer in `src/` | — (liest `process.env.GEMINI_API_KEY`, `VERCEL` nur als Boolean) |
| `POST /api/chat` | `server.ts:89` | `src/components/AICoachTab.tsx:79` | — (Gemini; Chatverlauf kommt im Body) |
| `POST /api/analyze-period` | `server.ts:136` | `src/components/AuswertungTab.tsx:41` | — (Gemini; Snapshots kommen im Body) |
| `GET /auth/callback` | `server.ts:230` | kein Aufrufer in `src/` | — |
| `POST /api/profiles/save` | `server.ts:329` | kein Aufrufer in `src/` | `cloudProfiles` (RAM) + `cloud_profiles.json` |
| `POST /api/profiles/load` | `server.ts:360` | kein Aufrufer in `src/` | `cloudProfiles` (RAM) |
| `POST /api/parse-screenshot` | `server.ts:384` | kein Aufrufer in `src/` | — (Gemini Vision) |
| `POST /api/fetch-live-prices` | `server.ts:646` | `src/components/MorgenroutineTab.tsx:296` | `livePriceCache`; Yahoo, Stooq |
| `POST /api/market-history` | `server.ts:975` | `src/App.tsx:157` | `marketHistoryCache`; Yahoo |
| `POST /api/calculate-distribution-days` | `server.ts:1043` | `src/components/MorgenroutineTab.tsx:301,628` | `cachedDistDays`, `lastRateLimitTime`; Yahoo, Gemini (+ Google Search Grounding) |
| `POST /api/stock-search` | `server.ts:1249` | `src/utils/useStockSearch.ts:51` (Hook, genutzt in `RechnerTab`, `CombinedJournal`) | `STOCK_DICTIONARY`, `searchCache`, `lastRateLimitTime`; Gemini |
| `saveProfilesToFile()` | `server.ts:320` | `/api/profiles/save` | `cloud_profiles.json` |
| `yahooFetch(url)` | `server.ts:533` | `/api/fetch-live-prices` | Yahoo (`query1` → `query2` Fallback) |
| `computeATRFromBars(bars, period=14)` | `server.ts:558` | `/api/fetch-live-prices`, `fetchStooqDaily` | — |
| `fetchStooqDaily(symbol)` | `server.ts:600` | `/api/fetch-live-prices` | Stooq CSV (`STOOQ_MAP` `:589`, nur BABA/TL0/4S0-Listungen) |
| `fetchYahooData(symbol, range="45d")` | `server.ts:856` | `/api/market-history`, `/api/calculate-distribution-days` | Yahoo (`query1` → `query2`) |
| `calculateDistributionDays(days, len=25)` | `server.ts:916` | `/api/market-history`, `/api/calculate-distribution-days` | — (Regel: Schluss ≤ 0,998·Vortag und Volumen > Vortag) |
| `startServer()` | `server.ts:1373` | Modul-Ende `server.ts:1397` (nur ohne `VERCEL`) | Vite-Middleware bzw. `dist/` |
| `handler(req, res)` | `api/index.ts:12` | Vercel-Runtime (`vercel.json` rewrites) | lädt `server.ts` als Modul |
| Client-Hilfsfunktion `handleLoadToCalculator` | `src/App.tsx:586` | `PortfolioTab` („🎯 Rechnen") | setzt `rechnerVorlage`, wechselt Tab |
| Client-Hilfsfunktion `applyRestoredPayload` / `collectBackupPayload` | `src/App.tsx:524` / `:510` | Backup-Modals, Demo-Daten | alle `morgenroutine_*`-Entitäten |

## Authentication and permissions

**Es gibt keine Authentifizierung und keine Berechtigungsprüfung** — weder Sessions, noch JWT, noch einen Provider; keine Middleware außer `express.json`/`express.urlencoded` (`server.ts:12-13`). **Jede Route in `server.ts` ist ohne Prüfung erreichbar**, auch die Gemini-gestützten (`/api/chat`, `/api/analyze-period`, `/api/parse-screenshot`, `/api/stock-search`, `/api/calculate-distribution-days`), die das Kontingent des serverseitigen `GEMINI_API_KEY` verbrauchen, und `/api/profiles/*`, dessen einziger Schutz der im Klartext gespeicherte PIN-Vergleich ist (`server.ts:339-341`, `:372-374`). Kein Rate-Limiting, kein CORS-Header, keine Security-Header im Code (gesucht: `cors`, `helmet`, `rateLimit`, `Strict-Transport` in `server.ts` und `vercel.json` — nichts gefunden).

Client-seitig gibt es kein Nutzerkonto: Die Daten gehören dem Gerät (`localStorage`). Der einzige „Schutz" ist die PIN/Passwort-Verschlüsselung der Backup-Datei im Browser (`src/utils/encryption.ts`), die der Server nie sieht. Ein Rest der früheren Google-OAuth-Anbindung ist `/auth/callback` (`server.ts:230`), dessen Seite den URL-Hash per `postMessage` mit Ziel-Origin `'*'` an den Opener sendet; im Client existiert kein Empfänger mehr (`grep OAUTH_AUTH_SUCCESS src/` leer).

## Shared shell

- **Root:** `src/main.tsx` → `ErrorBoundary` → `App` (`src/App.tsx:626-1023`): `div.flex.flex-col.h-screen` mit Hintergrund `#F4F4F7`.
- **Overlays vor dem Inhalt** (`src/App.tsx:629-660`): `OnboardingScreen` (bis `morgenroutine_onboarding_done`), `PWAInstallPrompt`, `PWAUpdatePrompt`, Toast (ein globaler `toast`-State, 4 s, `src/App.tsx:557-568`, Typen success/warning/error).
- **Header:** `src/components/CompactHeader.tsx` (`src/App.tsx:662-671`): Logo-Button (Klick = Update-Check bzw. Update anwenden), Titel „Morgenroutine / Handels-Wächter", Badge „Update verfügbar", Badge „🛟 Kein Backup / Backup: n T" (ab 7 Tagen oder nie), Datum `routineDate` (DD.MM.YYYY), „?"-Button → `HelpModal`, Bereitschafts-Punkt (`isSystemReady` = VIX, VXV, WTI, Gas gesetzt, `src/App.tsx:620-624`).
- **Modals auf Shell-Ebene:** `HelpModal`, `BackupSetupModal`, `BackupRestoreModal` (`src/App.tsx:673-697`).
- **Navigation (`<nav>`, `src/App.tsx:700-753`), Reihenfolge:** 1 „Morgen" (`CloudSun`, `morgenroutine`) · 2 „Depot" (`Wallet`, `journal`) · 3 „Analyse" (`TrendingUp`, setzt `screener`) · 4 „System" (`GraduationCap`, setzt `regelwerk`). Zweite Ebene: Analyse → `ANALYSE_REITER` „🔎 Screener · 📊 Auswertung · 🎯 Kaufziele · 💵 Cash · 🧮 Rechner" (`src/App.tsx:776-792`); System → „🎓 Regeln & Coach · 🗂️ Workspace & Backup" (`src/App.tsx:906-929`); dritte Ebene nur in `RegelwerkTab` („Handels-Regeln" / „AI-Handels-Coach", `RegelwerkTab.tsx:39-66`).
- **Tab-übergreifende Sprünge:** `rechnerVorlage` (Kaufziele/Watchlist → Rechner, `src/App.tsx:66,586-618,880-884`), `verkaufVorlage` (Kaufziele → Depot, `:68,813`), `CustomEvent "morgenroutine:handbuch"` (Hilfe-Buch-Symbol → System/Handbuch mit Zurück-Knopf, `:70-104`), `helpSectionForTab` (Header-„?" → passender Handbuch-Abschnitt, `:196-207`).
- **Hauptbereich:** `<main class="flex-1 overflow-y-auto …">` mit `max-w-7xl` (`src/App.tsx:756-757`). Keine Auth-Zustände, keine Rollen — die Shell ist für alle gleich.
- `docs/app-shell.md` ist noch die unausgefüllte Kit-Vorlage.

## Design system

- **Styling:** Tailwind CSS v4 über `@tailwindcss/vite` (`vite.config.ts`, `src/index.css:1` `@import "tailwindcss"`), Utility-Klassen direkt in JSX; keine Komponentenbibliothek (kein shadcn, kein `components/ui/`), keine CSS-Module.
- **Tokens (`src/index.css:3-7`, `@theme`):** `--font-sans` Inter, `--font-display` Space Grotesk, `--font-mono` Fira Code (Fonts per Google-Fonts-Link in `index.html`). Farben kommen aus der Tailwind-Slate-Palette; globale Überschreibung `src/index.css:51-56` macht `text-slate-300/400/450/500` dunkler (Lesbarkeit). Manifest-/Markenfarben: `theme_color #1e293b`, `background_color #F4F4F7` (`vite.config.ts`, `index.html`).
- **Wiederkehrende Muster:** Karten `bg-white border border-slate-200 rounded-3xl shadow-sm` (auf Handy randlos, `src/index.css:62-68`), Tab-Buttons `tab-btn` mit `border-b-2 border-slate-800` (`src/App.tsx:705-709`), Unter-Reiter als Pillen `rounded-xl bg-slate-800 text-white` (`src/App.tsx:782-786`), Block-Titel `uppercase tracking-wide` mit Emoji-Präfix, Zahlen in `font-mono`, Formatierung über `formatAccounting`/`parseCleanFloat` (`src/utils/mathUtils.ts`), Datumsformat de-DE.
- **Icons:** `lucide-react`; **Charts:** `recharts` (nur `DepotCurveChart.tsx`, derzeit nicht gerendert); **Markdown:** `react-markdown` + `remark-gfm` (`HelpModal.tsx`); `motion` ist in `package.json`, aber in `src/` nicht importiert (`grep "from \"motion"` leer).
- **PWA-Spezifika:** Safe-Area-Padding, `overscroll-behavior: none` im Standalone-Modus, `user-scalable=no` (`index.html`, `src/index.css:9-40`).
- Kein `docs/design-system.md` vorhanden.

## Could not determine

- **Produktionsziel und Live-URL:** `vercel.json` und `api/index.ts` deuten auf Vercel; `README.md` und `.env.example` (`APP_URL`, „AI Studio … Cloud Run") auf Google AI Studio. Welche Instanz aktuell live ist, steht in keiner Datei — `/init` muss fragen.
- **Ob `cloud_profiles.json` irgendwo produktiv existiert** und ob `/api/profiles/*`, `/api/parse-screenshot`, `/auth/callback`, `/api/ping` noch gebraucht werden: im Client gibt es keinen Aufrufer; ob ein externer Nutzer (z. B. der Screener oder ein Skript) sie verwendet, ist aus dem Repo nicht ersichtlich.
- **Verwendete Gemini-Modellnamen:** `server.ts` nennt `gemini-3.5-flash` (`:114,:1140,:1200,:1291`) neben `gemini-2.5-flash`/`2.0-flash`/`1.5-flash`; ob alle im Konto verfügbar sind, lässt sich ohne Schlüssel nicht prüfen.
- **Der externe Aktien-Screener** (`aktien-screener-at.vercel.app`, `rabe-screener.vercel.app`): eigener Code außerhalb dieses Repos; nur die Schnittstelle (Query-Parameter, `postMessage`-Typ) ist hier belegt.
- **`DepotCurveChart`** wird importiert, aber nicht gerendert — ob das Absicht (abgeschaltet) oder vergessen ist, sagt der Code nicht.
- **`motion`-Abhängigkeit** ohne Import in `src/` — Rest oder geplant, unklar.
- Keine Tests, keine CI-Workflows, keine Security-Header-Konfiguration im Repo gefunden (gesucht: `*.test.*`, `.github/`, `helmet`, `headers` in `vercel.json`).
