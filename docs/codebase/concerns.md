# Concerns

_Mapped by `/map` on 2026-10-18 at commit `ef921bc`. Fakten mit Fundstellen; was damit geschieht, entscheidet der Nutzer._

Lesehilfe: Zeilenzahlen stammen aus `wc -l`. Severity: **high** = Nutzer oder Daten können Schaden nehmen · **medium** = die nächste Änderung bricht wahrscheinlich etwas · **low** = sonstiges. Alles ohne Zusatz ist im Code so nachgelesen; Folgerungen tragen `(inferred)`.

## Oversized files and mixed responsibilities

| File | Lines | Responsibilities found | Severity |
|---|---|---|---|
| `src/components/CombinedJournal.tsx` | 2520 | UI (Journal-Listen, Kauf-/Verkaufsformulare, Import-Dialog, Coach-Einblendungen) **+** Import-Fachlogik (`bewerteImport` Z. 244–305: Duplikat-Regel, ID-Vergabe Z. 283) **+** Aggregation (`combinedTransactions` Z. 409–546, Sparplan-Gruppierung Z. 547–605, Gliederung Z. 1128–1150) **+** irreversible Löschungen über natives `confirm()` (Z. 1033, 1036, 2327). Das Props-Interface (Z. 24–119) reicht 60+ State-Setter aus `PortfolioTab` durch. | high |
| `src/components/PortfolioTab.tsx` | 2332 | UI (Ansichten „depot“, „kaufziele“, „cash“) **+** Steuer-/Lot-Verbrauch FIFO & Durchschnitt (Vorschau Z. 1011–1122, Buchung Z. 1227–1396, KESt Z. 1325–1327) **+** Stop-Loss-Berechnung je Position (Z. 1738–1757) **+** unverschlüsselter JSON-Restore mit eigener Schema-Prüfung (Z. 103–137) **+** direkte `localStorage`-Zugriffe (Z. 146–173, 244–258) **+** Pine-Script-Vorlage als String (Z. 1699–1721) **+** gesamter Formular-State für `CombinedJournal` (Z. 175–210). | high |
| `src/components/MorgenroutineTab.tsx` | 1721 | UI (Ampel, Indikator-Zeilen, Hilfetexte ab Z. 914) **+** Live-Abruf-Orchestrierung und Merge zweier Endpunkte (Z. 289–473) **+** eigene Kopie der Kaufsperre-Regel (Z. 801–840) **+** `localStorage`-Cache mit fest verdrahteten vier Keys (Z. 142–257) **+** Asset-Stammdaten (Z. 852–857) **+** Kurs-Umrechnung (Z. 587–622) **+** ungenutzte Bild-Kompression (Z. 477–512). | high |
| `server.ts` | 1401 | HTTP-Routing **+** vier Gemini-Prompt-Texte inkl. System-Instruction (Z. 42–86, 151–202, 424–452, 1120–1197) **+** Yahoo-/Stooq-Datenzugriff (Z. 533–556, 600–644, 856–914) **+** Fachregeln (ATR Z. 558–579, Distribution Days Z. 916–961) **+** sechs In-Memory-Caches **+** Datei-Persistenz `cloud_profiles.json` (Z. 305–326) **+** statisches Aktien-Wörterbuch mit Fantasiekursen (Z. 790–835) **+** Vite-Dev-Server-Start (Z. 1373–1399). | high |
| `src/components/RechnerTab.tsx` | 1368 | UI (Rechner, Psychologie-Checks, Watchlist-Karte) **+** Positions-/Risiko-Mathematik (Z. 224–323) **+** ATR-Stop-Mathematik (Z. 400–426) **+** Watchlist-Pflege (Z. 1098, 1241–1259) **+** zwei Suchinstanzen (Z. 95, 105). | high |
| `src/App.tsx` | 1024 | Shell und Navigation **+** `localStorage`-Persistenz aller Datensätze (Z. 112–139, 228–442, 445–551) **+** Backfill-Fetch (Z. 153–185) **+** `postMessage`-Brücke zum Screener (Z. 455–476) **+** Backup-Restore-Anwendung (Z. 524–543) **+** Reset-All (Z. 979–1016) **+** Demo-Laden (Z. 969–978) **+** Toast-System (Z. 557–568). | high |
| `src/components/DepotTable.tsx` | 428 | UI-Tabelle **+** Bewertung je Position (Z. 72–97) **+** KESt-Vorschau pro Depot (Z. 103–116). | medium |
| `src/components/DepotDashboard.tsx` | 260 | UI (Kuchen, Listen) **+** eigene Bewertung je Position (Z. 51–60) parallel zu `DepotTable`. | medium |
| `src/utils/backupFile.ts` | 287 | Dateiformat und Verschlüsselung **+** Browser-Download (Z. 166–177) **+** `localStorage`-Merkhilfe (Z. 139–164) **+** Legacy-Adapter (Z. 201–236). | low |

Nur lang, eine Verantwortung: keine Datei über ~800 Zeilen ohne Mischung gefunden. `src/utils/handbuchInhalt.ts` (282) und `src/utils/yahooMapping.ts` (248) sind reine Datentabellen bzw. Helfer.

## Duplicated logic

| Was | Pfad A | Pfad B (und weitere) | Severity |
|---|---|---|---|
| **Kaufsperre-Regel** (VIX < 25, Contango, VVIX < 130, WTI < 100, Gas < 4,50, DD ≥ 5 nur bei Quelle yahoo/manual) | `src/utils/marketHealth.ts` (65) Z. 18–65 — laut Kopfkommentar „die eine Quelle“ | `src/components/MorgenroutineTab.tsx` (1721) Z. 801–840: vollständige zweite Implementierung mit denselben Schwellen und derselben Prüfreihenfolge, obwohl Z. 367–369 „keine zweite Regel-Kopie“ versichert. Die Schwellen stehen zusätzlich als Prosa in `server.ts` Z. 59–65 (System-Prompt) und Z. 157–171 (Analyse-Prompt), in `src/utils/handbuchInhalt.ts` (282) und `HANDBUCH.md` (269). | high |
| **Stop-Loss-Multiplikator** | Regel „Kurs − 2 × ATR“: `server.ts` Z. 68 und Z. 171, `HANDBUCH.md` Z. 50 und Z. 190, `src/utils/handbuchInhalt.ts` Z. 132, 138 | Implementierung mit Default **1,5**: `src/components/PortfolioTab.tsx` Z. 146–148 (`atrMultiplier`, in `localStorage`) und `src/components/RechnerTab.tsx` Z. 128 (`atrCalcMult`, nur im State). Zwei unabhängige Werte, beide ungleich der Handbuchregel; der Pine-Script-Text Z. 1724 nennt den jeweils eingestellten Wert als „100 % synchron“. | high |
| **ATR-Berechnung (14 Tage, True Range)** | `src/utils/yahooMapping.ts` (248) Z. 150–169 `computeATR` | `server.ts` Z. 558–579 `computeATRFromBars` — gleicher Algorithmus, Server rundet auf 4 Stellen und prüft Zahlentypen, Client nicht. Der Kopfkommentar von `yahooMapping.ts` Z. 3 („Shared by frontend and backend“) trifft nicht zu: `server.ts` importiert die Datei nicht. | medium |
| **Positionsgröße / 1 %-Regel** | `src/components/RechnerTab.tsx` Z. 224–323 | `src/components/PortfolioTab.tsx` Z. 1753–1756 (Risikoanteil je Position, rechnet gegen `START_CASH = 0`, Z. 139 → immer 0 %). | medium |
| **Markt-Symboltabelle** (^VIX, ^VIX3M, ^VVIX, ^GSPC, CL=F, NG=F) | `src/utils/yahooMapping.ts` Z. 10–17 `MARKET_SYMBOLS` | `server.ts` Z. 517–524 `YAHOO_MARKET_MAP` **und** Z. 969–971 `MARKET_HISTORY_SYMBOLS` — dreimal dieselben sechs Paare. | medium |
| **Yahoo-Fetch mit query1/query2-Fallback** | `server.ts` Z. 533–556 `yahooFetch` | `server.ts` Z. 856–914 `fetchYahooData` — zweite Implementierung mit anderem User-Agent und eigenem Parsing. | medium |
| **SPY × 10 als SPX-Ersatz** | `server.ts` Z. 994–998 | `src/components/MorgenroutineTab.tsx` Z. 335–343; Konstanten `SPX_SURROGATE_*` in `src/utils/yahooMapping.ts` Z. 29–30 nur clientseitig. | low |
| **Zahlen-Parser (Komma/Punkt)** | `src/utils/mathUtils.ts` (138) Z. 10–34 `parseCleanFloat` | `src/utils/importParser.ts` (169) Z. 58–78 `parseZahl` (andere Tausender-Regel: „1.000“ → 1000 nur bei genau drei Nachstellen); `src/components/MorgenroutineTab.tsx` Z. 52, 64–65 (`DecimalInput`, eigener Komma-Ersatz); rohes `parseFloat` auf Nutzereingaben in `src/components/PortfolioTab.tsx` Z. 868–901, 1015, 1229–1231 und `src/components/RechnerTab.tsx` Z. 143–144, 921 — dort ergibt „12,5“ `NaN` → 0. | medium |
| **Wiederherstellungspfade** | verschlüsselt/Legacy: `src/utils/backupFile.ts` Z. 262–287 → `src/App.tsx` Z. 524–543 `applyRestoredPayload` | `src/components/PortfolioTab.tsx` Z. 103–137 `handleUploadLocalJson` (eigene Prüfung, eigene Feldnamen `checklistState`, ohne Watchlist/Verlauf; UI-Einstieg Z. 2105); Demo: `src/App.tsx` Z. 975–977; JSON-Anhängen: `src/components/CombinedJournal.tsx` Z. 324–333. Vier Wege schreiben dieselben Datensätze mit unterschiedlichen Prüfungen. | medium |
| **Kombinierte Transaktionsliste** | `src/components/CombinedJournal.tsx` Z. 409–546 `combinedTransactions` | `src/components/PortfolioTab.tsx` Z. 633–760 — gleicher Aufbau; dort nur einmal referenziert (die Definition), also toter Zwilling. | medium |
| **Kern-Asset-Stammdaten** | `src/utils/assetRegistry.ts` (201) Z. 30–39 `CORE_ASSET_META` („die EINE Stelle“) | `src/components/MorgenroutineTab.tsx` Z. 852–857 `coreAssetMeta` (BTC-ISIN `DE000A27Z304` dort, `""` im Register); `src/components/PortfolioTab.tsx` Z. 857–861 (Namen als `if`-Kette); `server.ts` Z. 790–835 `STOCK_DICTIONARY` (eigene ISIN/WKN-Liste). | medium |
| **Ticker-Alias-Tabellen** | `src/utils/yahooMapping.ts` Z. 49–67 `TICKER_TO_YAHOO` | `src/components/AktienScreenerTab.tsx` (81) Z. 28–31 `ALIAS_US`; `src/utils/assetRegistry.ts` Z. 47–59 `KEY_ALIASES`. | low |
| **Kurs-Lookup je Depotposition** | `src/components/DepotTable.tsx` Z. 74: `getLivePrice(livePrices, canonicalAssetKey(h.key, h.name))` | `src/components/DepotDashboard.tsx` Z. 53: direkter Index `livePrices[h.key]` ohne Normalisierung — dieselbe Position kann in Tabelle und Dashboard unterschiedlich bewertet werden (inferred). | medium |
| **Tagesänderung absolut** `wert − wert/(1+pct/100)` | `src/components/MorgenroutineTab.tsx` Z. 707 | `src/components/DepotDashboard.tsx` Z. 57 | low |
| **Backup-Zusammenfassung** | `src/utils/backupFile.ts` Z. 64–71 `summarize` | `src/utils/backupFile.ts` Z. 238–245 `summarizePayload` — wortgleich. | low |
| **Handbuch-Inhalt** | `HANDBUCH.md` (269), per `?raw` in `src/components/HelpModal.tsx` Z. 5 | `src/utils/handbuchInhalt.ts` (282) für `src/components/Handbuch.tsx` Z. 13; dazu `HANDBUCH.pdf` und `public/anleitung.html`. Vier Fassungen, keine erzeugt die andere. | low |

## Untested critical paths

Kein Testrunner im Manifest (`package.json` Z. 6–12: `dev`, `build`, `start`, `clean`, `lint` = `tsc --noEmit`), `.ai-eng-kit` → `stack.test: null`. Suche nach `*.test.*`, `*.spec.*`, `__tests__`, `vitest.config.*`, `jest.config.*`, `playwright.config.*` außerhalb `node_modules`: **0 Treffer**. Es gibt also für keinen der folgenden Pfade einen Test; die Severity bemisst, was ohne Test kaputtgehen kann.

| Pfad | Lines | Was ungetestet ist | Severity |
|---|---|---|---|
| `src/utils/encryption.ts` | 96 | PBKDF2 (200 000 Iterationen, fester Salt Z. 13) + AES-GCM; Round-Trip, falsche PIN, kaputte Base64. | high |
| `src/utils/backupFile.ts` → `src/components/BackupRestoreModal.tsx` → `src/App.tsx` | 287 / 283 / 1024 | `decryptJson` gibt das `JSON.parse`-Ergebnis ungeprüft als `BackupPayload` zurück (`backupFile.ts` Z. 77–96, 102–107); `applyRestoredPayload` (`App.tsx` Z. 524–543) greift direkt auf `payload.portfolio.length` zu. Legacy-V8-Adapter Z. 215–236. Ein fehlerhaftes Backup überschreibt alle Daten. | high |
| `src/App.tsx` Z. 979–1016 | 1024 | Reset-All: löscht alle `morgenroutine_*`-Keys irreversibel; einzige Sicherung sind zwei `window.confirm`. | high |
| `src/utils/mathUtils.ts` Z. 121–138 + `src/components/PortfolioTab.tsx` Z. 1011–1122, 1227–1396 | 138 / 2332 | Anteiliger Lot-Verbrauch (Durchschnitt), FIFO-Matching, Rundungsrest im letzten Lot, Edit-Modus mit Rückbuchung `consumedLots` (Z. 1238–1254), KESt (`kestAuf`, 27,5 %). Steuerzahlen. | high |
| `src/components/RechnerTab.tsx` Z. 224–323, 400–426 | 1368 | Stückzahl (abgerundet), Stop aus Tranche, CRV, FX-Umrechnung, ATR-Stop. | high |
| `src/utils/marketHealth.ts` + `src/utils/historyBackfill.ts` Z. 48–109 | 65 / 109 | Kaufsperre-Entscheid und Merge-Regeln „nie überschreiben, ai/estimate durch yahoo ersetzen“. | medium |
| `server.ts` Z. 916–961, 558–579 | 1401 | Distribution-Day-Zählung (0,2 %-Regel, Fenster 25+1), ATR. | medium |
| `server.ts` Z. 384–511 | 1401 | OCR-Antwort wird per `JSON.parse(responseText)` ohne Schema-Prüfung zurückgegeben (Z. 504–506). | medium |
| `src/utils/importParser.ts` | 169 | Datums-/Zahlenerkennung, Summenzeilen-Schutz, Gebührenspalte, deterministische `importId`. | medium |
| `src/components/CombinedJournal.tsx` Z. 244–305 | 2520 | Duplikat-Zählregel beim Import. | medium |
| `src/utils/periodStats.ts` Z. 34–45 | 112 | ISO-Kalenderwoche (Jahreswechsel). | low |

## Security smells

| Location | What | Severity |
|---|---|---|
| `server.ts` (1401) — alle `/api/*`-Routen | Keine Authentifizierung und kein Rate-Limit vor den Gemini-Aufrufen `/api/chat` (Z. 89), `/api/analyze-period` (Z. 136), `/api/parse-screenshot` (Z. 384), `/api/calculate-distribution-days` (Z. 1043), `/api/stock-search` (Z. 1249) sowie vor den Yahoo-Abrufen `/api/fetch-live-prices` (Z. 646), `/api/market-history` (Z. 975). Wer die URL kennt, verbraucht das Kontingent von `GEMINI_API_KEY`. Der 429-Cooldown (Z. 839–840) ist Quotenschutz, kein Zugriffsschutz. `vercel.json` (14) leitet `/api/(.*)` ungefiltert auf die Funktion. | high |
| `server.ts` Z. 305–378 `/api/profiles/save`, `/api/profiles/load` | PIN im Klartext im Speicher und in `cloud_profiles.json` (Z. 322, im Projektverzeichnis `process.cwd()`); Vergleich per `!==` (Z. 339, 373); `pin.trim()` ohne Typprüfung (Nicht-String → 500); unbegrenzte Rateversuche; `git check-ignore cloud_profiles.json` schlägt fehl → die Datei wäre bei einem lokalen Commit nicht ausgeschlossen. Kein Aufrufer im Client (`grep /api/profiles src` → 0). | high |
| `server.ts` Z. 12–13 | `express.json({ limit: "50mb" })` und `urlencoded` 50 MB global für jede Route, auch für reine Text-Endpunkte. | medium |
| `server.ts` Z. 230–293 `/auth/callback` | `window.opener.postMessage({ hash: window.location.hash }, '*')` — OAuth-Fragment an beliebige Origin. Route ohne Aufrufer (laut `src/components/WorkspaceSyncTab.tsx` Z. 4–7 wurde OAuth entfernt), aber erreichbar: `vercel.json` Z. 7 schreibt `/auth/(.*)` auf die Funktion um. | medium |
| `server.ts` Z. 89–107 `/api/chat` | `req.body.messages` unvalidiert: `messages.map` auf `undefined` → TypeError → 500 mit `error.message` (Z. 130). Nutzertext geht ungefiltert als Gemini-History hinein. | medium |
| `server.ts` Z. 136–178 `/api/analyze-period` | `snapshots`/`stats` werden per `JSON.stringify` in den Prompt eingebettet (Z. 175–178); Inhalt und Größe nur durch das 50-MB-Limit begrenzt — Prompt-Injection-Fläche und Kostenhebel. | medium |
| `server.ts` Z. 1292 `/api/stock-search` | `query.trim()` wörtlich im Prompt; Modellantwort (`symbol`, `name`, `price`, `atr`, `isin`, `wkn`) ungeprüft an den Client (Z. 1322–1339) und über `src/utils/useStockSearch.ts` (91) Z. 51–60 in Watchlist/Kaufformular. | medium |
| `server.ts` Z. 424–452, 504–506 `/api/parse-screenshot` | Bildinhalt ist Prompt-Eingabe (Nutzer-Screenshot); Antwort per `JSON.parse` ohne Schema-Abgleich durchgereicht. Kein Aufrufer im Client (`grep parse-screenshot src` → 0). | medium |
| `server.ts`, `vercel.json`, `index.html`, `api/index.ts` | Keine Security-Header konfiguriert (Suche nach `helmet`, `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport`, `nosniff`, `"headers"` → 0 Treffer). Externe Fonts in `index.html` Z. 24–26 ohne CSP. | medium |
| `src/components/AktienScreenerTab.tsx` Z. 54–57, 73–78 | Watchlist- und Depot-Ticker des Nutzers werden als URL-Parameter (`?mr=`, `?dp=`) an die fremde Origin `aktien-screener-at.vercel.app` übergeben (iframe-`src`); zweite erlaubte Origin `rabe-screener.vercel.app` Z. 20. Bestandsdaten verlassen damit die App. | medium |
| `api/index.ts` (27) Z. 19–25; `server.ts` Z. 774 | Stack-Traces in Fehlerantworten (1200 bzw. 500 Zeichen). | low |
| `server.ts` Z. 16–24 `/api/ping` | Gibt `hasGeminiKey`, Node-Version und `isVercel` preis. | low |
| `server.ts` Z. 505, 1048, 1089, 1159, 1218 (17× `console.log`) | Modell-/OCR-Antworten landen vollständig im Server-Log. | low |
| `src/components/WorkspaceSyncTab.tsx` (212) Z. 140 | QR-Code wird bei `api.qrserver.com` erzeugt (App-Origin geht an Dritten). | low |
| `src/components/PortfolioTab.tsx` Z. 281–284, 1001–1002, 1181–1182; `src/utils/assetRegistry.ts` Z. 113 | Personennamen als Code-Defaults („Flatex“/„Andres“, „Reinhards reale Bestände“). Für `/dsgvo` relevant. | low |
| `src/App.tsx` Z. 445–551 | Alle Depot-, Kauf- und Verkaufsdaten liegen unverschlüsselt in `localStorage` (Design der App; Backup ist verschlüsselt). | low |

Geprüft, ohne Befund: `dangerouslySetInnerHTML`, `eval`, `new Function` (0 Treffer in `src/`, `server.ts`); `GEMINI_API_KEY` wird nur in `server.ts` Z. 20, 27 gelesen, kein `VITE_`-Prefix, `vite.config.ts` Z. 24–26 definiert nur `__BUILD_VERSION__` — kein Schlüssel im Client-Bundle; `src/components/SecretInput.tsx` (59) hält PIN nur im React-State; der `postMessage`-Empfang `src/App.tsx` Z. 455–462 prüft `e.origin` gegen `SCREENER_ORIGINS` und filtert Symbole per Regex; `/api/market-history` begrenzt `days` auf 5–120 (`server.ts` Z. 977). CORS: kein `cors`-Middleware, keine `Access-Control-*`-Header gesetzt → Browser-Same-Origin gilt, aber nicht für direkte HTTP-Clients.

## Performance and fragility

| Pfad | Lines | Was | Severity |
|---|---|---|---|
| `src/components/MorgenroutineTab.tsx` Z. 195–222 (`saveToImportCache`), Z. 236–242, Z. 592 | 1721 | Greift fest auf `updatedLive.tsla.price`, `.now`, `.baba`, `.btc` zu (Z. 210–213), obwohl `LivePrices` seit dem Umbau ein offenes Record ist (`src/types.ts` Z. 16–27) und `initialLivePrices` (`src/utils/assetRegistry.ts` Z. 198–201) kein `now` mehr enthält. Nach Reset-All (`src/App.tsx` Z. 1006) oder bei frischem Profil wirft Z. 211 im `try` von `handleFetchLivePrices` — nach bereits gesetztem Markt-State (Z. 364, 424), also Fehler-Toast trotz erfolgtem Abruf (inferred). Gleiche Annahme in Z. 884–891 (`lp.price` ohne Null-Guard). | high |
| `server.ts` Z. 456–501 vs. `vercel.json` Z. 10–12 | 1401 / 14 | OCR-Route: bis zu 3 Modelle × 30 s Timeout + 2 × 0,5 s Pause = 91 s möglich, `maxDuration` ist 60. Die übrigen Routen haben gar keinen Timeout: `fetch` ohne `AbortController` (0 Treffer), `/api/calculate-distribution-days` reiht Yahoo + bis zu zwei Gemini-Aufrufe (Z. 1058–1245), `/api/market-history` acht Yahoo-Abrufe (Z. 990, 1010). | medium |
| `server.ts` Z. 305, 530, 838–843, 972 | 1401 | Sechs In-Memory-Zustände (`cloudProfiles`, `livePriceCache`, `searchCache`, `lastRateLimitTime`, `cachedDistDays`, `marketHistoryCache`) in einer Serverless-Funktion: pro Instanz, nicht geteilt, bei Kaltstart leer; `api/index.ts` Z. 3–10 cacht nur das Modul. Die Datei-Persistenz Z. 320–326 schlägt auf schreibgeschütztem Dateisystem still fehl (Fehler wird nur geloggt) (inferred). | medium |
| `server.ts` Z. 114, 1140, 1200, 1291 vs. Z. 205, 456 | 1401 | Modell-IDs uneinheitlich: `gemini-3.5-flash` fest an vier Stellen, Fallback-Kette `gemini-2.5-flash` → `2.0` → `1.5` an zwei anderen. Bei Abkündigung eines Modells fällt ein Teil der Routen aus, ein anderer nicht. | medium |
| `server.ts` Z. 1130, 1185 | 1401 | Festes Datum „Juni 2026“ in den Distribution-Day-Prompts; `${currentDateStr}` steht daneben. Der Fallback liefert so Schätzwerte für einen falschen Monat. | medium |
| `server.ts` Z. 1097–1102, 1108–1113, 1237–1243; `src/App.tsx` Z. 244–245 | 1401 / 1024 | Feste Ersatzwerte `distSpx 2 / distNdx 3` („estimate“) bzw. Start-Default `2 / 1` werden als Daten gespeichert; die Sperre hängt allein an `distSource` (`src/utils/marketHealth.ts` Z. 39). | low |
| `server.ts` Z. 535–556, 589–644, 857–860, 994–998; `src/utils/yahooMapping.ts` Z. 76–83 | 1401 / 248 | Kursquelle ist eine Kette inoffizieller Endpunkte (Yahoo query1/query2 mit gefälschtem Browser-User-Agent Z. 542, 613, 868; Stooq-CSV; SPY × 10; je Wert bis zu fünf Börsenkandidaten). Keine Zusage eines Anbieters; `v7/quote` ist laut Kommentar Z. 660 schon weggefallen. | medium |
| `src/components/PortfolioTab.tsx` Z. 139, 1411, 1423–1424, 1520, 1756 | 2332 | `START_CASH = 0` ist Konstante: Risiko-Anteil immer 0 %, Anzeige „Depotkapital: 0 €“, `workingCapital` wird bei gesetzter Reserve negativ. | medium |
| `src/components/PortfolioTab.tsx` Z. 244–258 | 2332 | Liest die Watchlist aus `localStorage` statt aus dem Prop `watchlist` und setzt einen Default (AAPL/NVDA/MSFT), den es sonst nirgends gibt. | low |
| `src/components/PortfolioTab.tsx` Z. 1257, 1744 | 2332 | Verkauf fällt auf Key `"tsla"` zurück, wenn kein Asset gefunden wird; `item.key !== 'btc'` als Sonderfall im Stop-Loss. | low |
| `src/components/CombinedJournal.tsx` Z. 283 vs. `src/utils/importParser.ts` Z. 161–169 | 2520 / 169 | Zwei ID-Schemata für Importe: `Math.random` (JSON-Weg) gegen deterministische `importId` (Tabellen-Weg). `PortfolioTab.tsx` Z. 937, 1354 nutzt `"buy_"+Date.now()` / `"sale_"+Date.now()`. | low |
| Toter Code | — | `server.ts` Z. 229–293 (`/auth/callback`), Z. 305–378 (Profile), Z. 384–511 (`/api/parse-screenshot`) — ohne Aufrufer im Repo; `src/components/MorgenroutineTab.tsx` Z. 477–512 `resizeAndCompressImage`, Z. 474 `isDragging`, Z. 137 `showSicherheitsInfo` (jeweils nur Definition), ungenutzte Icon-Imports Z. 8–23 (`Camera`, `Zap`, `Coins`, `Clipboard`, `CheckCircle`, `AlertTriangle`); `src/components/PortfolioTab.tsx` Z. 143 `showWatchlistHelp`, Z. 633–760 `combinedTransactions`, Imports `HelpCircle`, `CheckCircle`, `Clipboard`, `History`, `TrendingDown`; `src/components/CombinedJournal.tsx` Z. 603 `void einzeln`. `{false &&`: 0 Treffer. `TODO`/`FIXME`: 0 Treffer. | low |
| `tsconfig.json` (26); `any`-Zählung | — | Kein `"strict"`; `: any`/`as any`: `server.ts` 23, `src/components/CombinedJournal.tsx` 28, `src/components/PortfolioTab.tsx` 9, `src/components/MorgenroutineTab.tsx` 4. `npx tsc --noEmit` läuft heute fehlerfrei (Exit 0), sagt aber wegen der `any`-Dichte wenig. | medium |
| `src/App.tsx` Z. 360, 371, 402, 413 | 1024 | Leere `catch {}`-Blöcke beim Lesen von `localStorage`. | low |
| `src/App.tsx` Z. 971, 980, 985; `src/components/CombinedJournal.tsx` Z. 1033, 1036, 2327 | — | Irreversible Aktionen hängen an nativem `confirm()`; die App läuft als PWA `display: standalone` (`vite.config.ts` Z. 40). | low |
| `src/App.tsx` Z. 184, `src/components/RechnerTab.tsx` Z. 207, 210–222, `src/components/PortfolioTab.tsx` Z. 1167 | — | `eslint-disable react-hooks/exhaustive-deps`; `RechnerTab` ruft `runCalculations` aus einem Effekt mit unvollständiger Abhängigkeitsliste. | low |
| `dist/assets/index-*.js` (Build vom 18.10.2026 im Arbeitsverzeichnis) | — | Ein einziges Client-Chunk von 759 KB (unkomprimiert) plus 66 KB CSS; einzige Abspaltung ist `demoData` (1,6 KB). `recharts`, `motion`, `react-markdown` liegen im Hauptbundle (`package.json` Z. 14–26). | low |
| `vite.config.ts` (99) Z. 56–57 | 99 | Service Worker mit `skipWaiting` + `clientsClaim`: ein neuer Worker übernimmt sofort auch offene Tabs; zusammen mit `registerType: 'prompt'` (Z. 31) zwei gegensätzliche Update-Strategien (inferred). | low |

## Could not determine

- Ob die Vercel-Produktion Security-Header setzt oder Anfragen begrenzt — im Repo steht dazu nichts; nur ein Live-Check (`/security-check`) kann das zeigen.
- Ob `/api/parse-screenshot`, `/auth/callback` und `/api/profiles/*` von einem externen Client (z. B. dem AI-Studio-Vorgänger laut `README.md`, `metadata.json`) noch aufgerufen werden — im Repo gibt es keinen Aufrufer.
- Ob `cloud_profiles.json` je in einer Produktionsumgebung geschrieben wurde; `.env*` wurde gemäß Regel nicht gelesen, Secrets im Vercel-Projekt sind nicht sichtbar.
- Der Absturz in `saveToImportCache` ist aus dem Code abgeleitet, nicht ausgeführt — es gibt keinen Testlauf und keine Browser-Sitzung in dieser Analyse.
- Tatsächliche Kontingente und Ausfallraten von Yahoo, Stooq und Gemini — nicht im Repo.
- Ob die Bundle-Größe in `dist/` dem Commit `ef921bc` entspricht (der Ordner ist git-ignoriert; Zeitstempel 18.10.2026 18:33, Commit vom selben Tag).
- Ob der Multiplikator 1,5 (Code) oder 2 (Handbuch) die vom Nutzer gewollte Regel ist — das entscheidet `/reverse-spec`, nicht die Karte.
