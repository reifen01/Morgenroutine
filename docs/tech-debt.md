# Tech Debt — internal work with no visible behaviour

> The one list of work that changes no acceptance criterion: refactorings, test coverage, cleanup,
> and the "we know, later" decisions. Features live in `features/INDEX.md`; this file is for what is
> *not* a feature.
>
> - **Fed by `/map`:** every concern from `docs/codebase/concerns.md` lands here once, with the commit it
>   was found at, and is set to `Resolved` when a later map no longer finds it. `concerns.md` is the
>   snapshot; this is the history.
> - **Worked by `/refactor`:** with no argument it takes the top `Planned` row, then the top `Open` row
>   that is an oversized or mixed-responsibility file, and sets it `Resolved` when the split is green.
> - **Yours to edit:** change a status, add what you found yourself, write why something is `Accepted`.
>   The kit only appends rows and changes statuses — it never deletes a row or rewrites your text.
> - **Compacted by `/cleanup`** (Resolved rows move to the archive below), **checked by `/audit`** (rows
>   whose path no longer exists).

**Status:** `Open` — found, undecided · `Planned` — do next, in this order · `Accepted` — known,
deliberately left, with the reason · `Resolved` — gone, with the commit that removed it. A security
smell never becomes `Accepted`: it is a finding for `/security-check` or the owning feature's next
`/qa`, and this file only records that it is known.

| ID | Status | Path | What | Why it matters | Severity | Owning features | Found (commit) | Resolved (commit) |
|----|--------|------|------|----------------|----------|-----------------|----------------|-------------------|
| TD-1 | Open | `src/components/CombinedJournal.tsx` | Gemischte Datei, 2520 Zeilen: Journal-UI, Import-Fachlogik, Aggregation, irreversible Löschungen per confirm(), 60+ durchgereichte Setter | Jede Änderung liest alles | high | MR-4 | ef921bc | |
| TD-2 | Open | `src/components/PortfolioTab.tsx` | Gemischte Datei, 2332 Zeilen: drei Ansichten, FIFO/Durchschnitt/KESt, Stop-Loss, JSON-Restore, localStorage, Pine-Script, Formular-State | Steuerlogik und UI untrennbar | high | MR-3, MR-4, MR-5, MR-6 | ef921bc | |
| TD-3 | Open | `src/components/MorgenroutineTab.tsx` | Gemischte Datei, 1721 Zeilen: UI, Abruf-Orchestrierung, zweite Kaufsperre-Kopie, fest verdrahteter Cache, Stammdaten, Umrechnung, toter Code | Kern-Datenpfad in einer UI-Datei | high | MR-1, MR-2 | ef921bc | |
| TD-4 | Open | `server.ts` | Gemischte Datei, 1401 Zeilen: Routing, vier Prompts, Yahoo/Stooq, ATR, DD, sechs Caches, Datei-Persistenz, Wörterbuch, Dev-Server | Alle Server-Verantwortungen in einer Datei | high | MR-1, MR-2, MR-7, MR-9, MR-10, MR-12 | ef921bc | |
| TD-5 | Open | `src/components/RechnerTab.tsx` | Gemischte Datei, 1368 Zeilen: Rechner-UI, Positions-/Risiko-Mathematik, ATR-Stop, Watchlist, zwei Suchinstanzen | Rechenlogik ohne eigenes Modul | high | MR-7 | ef921bc | |
| TD-6 | Open | `src/App.tsx` | 1024 Zeilen: Shell, localStorage-Persistenz, Backfill, Screener-Brücke, Restore, Reset, Demo, Toast | Persistenz und Regeln im Root | high | MR-8, MR-11, MR-12 | ef921bc | |
| TD-7 | Open | `src/components/DepotTable.tsx` | 428 Zeilen: Tabelle + Bewertung je Position + KESt-Vorschau | Fachlogik in der Tabelle | medium | MR-3 | ef921bc | |
| TD-8 | Open | `src/components/DepotDashboard.tsx` | 260 Zeilen: Kuchen + eigene Bewertung je Position parallel zu DepotTable | Zwei Bewertungen | medium | MR-3 | ef921bc | |
| TD-9 | Open | `src/utils/backupFile.ts` | 287 Zeilen: Format, Verschlüsselung, Download, localStorage, Legacy-Adapter | Vermischt | low | MR-11 | ef921bc | |
| TD-10 | Open | `src/utils/marketHealth.ts` · `MorgenroutineTab.tsx:801–840` | Kaufsperre-Regel zweimal implementiert, dazu als Prosa in server.ts, handbuchInhalt.ts, HANDBUCH.md | Ampel und Snapshot können abweichen | high | MR-2 | ef921bc | |
| TD-11 | Open | `server.ts:68` · `HANDBUCH.md:50` · `PortfolioTab.tsx:146` · `RechnerTab.tsx:128` | Stop-Multiplikator: Handbuch 2×ATR, Code-Default 1,5 an zwei unabhängigen Stellen | Regel und Umsetzung widersprechen sich | high | MR-5, MR-7, MR-10 | ef921bc | |
| TD-12 | Open | `src/utils/yahooMapping.ts:150` · `server.ts:558` | ATR zweimal implementiert; „Shared"-Kommentar trifft nicht zu | Zwei Wahrheiten für den Stop-Abstand | medium | MR-1 | ef921bc | |
| TD-13 | Open | `RechnerTab.tsx:224` · `PortfolioTab.tsx:1753` | 1 %-Regel zweimal; PortfolioTab rechnet gegen START_CASH=0 → immer 0 % | Falsche Risikoanzeige | medium | MR-5, MR-7 | ef921bc | |
| TD-14 | Open | `yahooMapping.ts:10` · `server.ts:517, 969` | Markt-Symboltabelle dreimal | Drift bei Symbolwechsel | medium | MR-1 | ef921bc | |
| TD-15 | Open | `server.ts:533` · `server.ts:856` | Yahoo-Fetch mit Fallback zweimal, anderer User-Agent, eigenes Parsing | Ein Fix landet nur in einer Kopie | medium | MR-1, MR-2 | ef921bc | |
| TD-16 | Open | `server.ts:994` · `MorgenroutineTab.tsx:335` · `yahooMapping.ts:29` | SPY×10 als SPX-Ersatz an drei Stellen | Drift | low | MR-1 | ef921bc | |
| TD-17 | Open | `mathUtils.ts:10` · `importParser.ts:58` · `MorgenroutineTab.tsx:52` · `PortfolioTab.tsx:868, 1015, 1229` · `RechnerTab.tsx:143, 921` | Zahlen-Parser dreimal verschieden plus rohes parseFloat auf Nutzereingaben („12,5" → NaN → 0) | Falsche Beträge je Eingabeort | medium | MR-1, MR-4, MR-7 | ef921bc | |
| TD-18 | Open | `backupFile.ts:262` · `App.tsx:524` · `PortfolioTab.tsx:103` · `App.tsx:975` · `CombinedJournal.tsx:324` | Vier Wiederherstellungspfade mit unterschiedlichen Prüfungen | Inkonsistenter Restore | medium | MR-4, MR-11 | ef921bc | |
| TD-19 | Open | `CombinedJournal.tsx:409` · `PortfolioTab.tsx:633–760` | combinedTransactions zweimal; PortfolioTab-Zwilling tot | Toter Zwilling | medium | MR-4 | ef921bc | |
| TD-20 | Open | `assetRegistry.ts:30` · `MorgenroutineTab.tsx:852` · `PortfolioTab.tsx:857` · `server.ts:790` | Kern-Asset-Stammdaten viermal, abweichende BTC-ISIN | Drift | medium | MR-1, MR-7 | ef921bc | |
| TD-21 | Open | `yahooMapping.ts:49` · `AktienScreenerTab.tsx:28` · `assetRegistry.ts:47` | Ticker-Alias-Tabellen dreimal | Drift | low | MR-7, MR-8 | ef921bc | |
| TD-22 | Open | `DepotTable.tsx:74` · `DepotDashboard.tsx:53` | Kurs-Lookup einmal normalisiert, einmal roher Index | Position in Tabelle und Dashboard unterschiedlich bewertet | medium | MR-3 | ef921bc | |
| TD-23 | Open | `MorgenroutineTab.tsx:707` · `DepotDashboard.tsx:57` | Tagesänderung absolut zweimal | Duplikat | low | MR-2, MR-3 | ef921bc | |
| TD-24 | Open | `src/utils/backupFile.ts:64, 238` | summarize ≡ summarizePayload | Duplikat | low | MR-11 | ef921bc | |
| TD-25 | Open | `HANDBUCH.md` · `handbuchInhalt.ts` · `HANDBUCH.pdf` · `public/anleitung.html` | Handbuch-Inhalt in vier Fassungen, keine erzeugt die andere | Veraltete Fassungen | low | MR-10, MR-12 | ef921bc | |
| TD-26 | Open | `package.json` | Kein Test-Runner, kein Test-Skript, kein CI | Alle folgenden Pfade ungeprüft | high | unassigned | ef921bc | |
| TD-27 | Open | `src/utils/encryption.ts` | PBKDF2/AES-GCM ohne Test | Stiller Fehler macht jedes Backup unlesbar | high | MR-11 | ef921bc | |
| TD-28 | Open | `backupFile.ts:77` · `App.tsx:524` | decryptJson ungeprüft als BackupPayload; applyRestoredPayload greift direkt zu | Fehlerhaftes Backup überschreibt alle Daten | high | MR-11 | ef921bc | |
| TD-29 | Open | `src/App.tsx:979–1016` | Reset-All irreversibel, nur zwei confirm() | Totalverlust | high | MR-11 | ef921bc | |
| TD-30 | Open | `mathUtils.ts:121` · `PortfolioTab.tsx:1011, 1227` | FIFO/Durchschnitt, Rundungsrest, Rückbuchung, KESt ohne Test | Steuerzahlen | high | MR-4 | ef921bc | |
| TD-31 | Open | `src/components/RechnerTab.tsx:224, 400` | Stückzahl, Stop, CRV, FX, ATR-Stop ohne Test | Falsches Risiko | high | MR-7 | ef921bc | |
| TD-32 | Open | `marketHealth.ts` · `historyBackfill.ts:48` | Kaufsperre und Merge-Regeln ohne Test | Falsches Kaufverbot | medium | MR-2 | ef921bc | |
| TD-33 | Open | `server.ts:916, 558` | DD-Zählung und ATR ohne Test | Falsche Zählung | medium | MR-1, MR-2 | ef921bc | |
| TD-34 | Open | `server.ts:384–511` | OCR-Antwort per JSON.parse ohne Schema | Ungeprüfte Werte | medium | unassigned | ef921bc | |
| TD-35 | Open | `src/utils/importParser.ts` | Datums-/Zahlenerkennung, Summenzeilen, importId ohne Test | Falscher Import | medium | MR-4 | ef921bc | |
| TD-36 | Open | `CombinedJournal.tsx:244–305` | Duplikat-Zählregel beim Import ohne Test | Doppelte Buchungen | medium | MR-4 | ef921bc | |
| TD-37 | Open | `src/utils/periodStats.ts:34` | ISO-Kalenderwoche ohne Test | Jahreswechsel | low | MR-9 | ef921bc | |
| TD-38 | Open | `server.ts` (alle /api/*) | Keine Auth, kein Rate-Limit vor Gemini- und Yahoo-Routen | Kontingent von GEMINI_API_KEY für jeden verbrauchbar | high | MR-1, MR-2, MR-7, MR-9, MR-10 | ef921bc | |
| TD-39 | Open | `server.ts:305–378` | PIN im Klartext in cloud_profiles.json, nicht gitignored, unbegrenzte Versuche, kein Client-Aufrufer | Ausspähbar, versehentlicher Commit | high | unassigned | ef921bc | |
| TD-40 | Open | `server.ts:12–13` | Body-Limit 50 MB global | DoS-/Kostenfläche | medium | MR-12 | ef921bc | |
| TD-41 | Open | `server.ts:230–293` | /auth/callback sendet OAuth-Fragment per postMessage an `*`; Route tot, aber erreichbar | Token an fremde Origin | medium | unassigned | ef921bc | |
| TD-42 | Open | `server.ts:89–107` | /api/chat: messages unvalidiert, 500 mit Fehlertext | Unterlaufbar | medium | MR-10 | ef921bc | |
| TD-43 | Open | `server.ts:136–178` | /api/analyze-period bettet Body roh in den Prompt | Prompt-Injection, Kostenhebel | medium | MR-9 | ef921bc | |
| TD-44 | Open | `server.ts:1292` · `useStockSearch.ts:51` | /api/stock-search: query roh im Prompt, Modellantwort ungeprüft in Watchlist/Kaufformular | Halluzinierte Kurse | medium | MR-7 | ef921bc | |
| TD-45 | Open | `server.ts:424–506` | /api/parse-screenshot: Bild als Prompt, Antwort ungeprüft; kein Aufrufer | Toter Endpunkt mit Fläche | medium | unassigned | ef921bc | |
| TD-46 | Open | `server.ts` · `vercel.json` · `index.html` | Keine Security-Header, externe Fonts ohne CSP | Clickjacking/Sniffing | medium | MR-12 | ef921bc | |
| TD-47 | Open | `src/components/AktienScreenerTab.tsx:54, 73` | Watchlist- und Depot-Ticker als URL-Parameter an fremde Origin | Bestandsdaten verlassen die App | medium | MR-8 | ef921bc | |
| TD-48 | Open | `api/index.ts:19` · `server.ts:774` | Stack-Traces in Fehlerantworten | Interna sichtbar | low | MR-12 | ef921bc | |
| TD-49 | Open | `server.ts:16–24` | /api/ping verrät hasGeminiKey, Node-Version, isVercel | Aufklärung | low | MR-12 | ef921bc | |
| TD-50 | Open | `server.ts` (17× console.log) | Modell-/OCR-Antworten vollständig im Server-Log | Daten im Log | low | MR-10, MR-9 | ef921bc | |
| TD-51 | Open | `src/components/WorkspaceSyncTab.tsx:140` | QR-Code bei api.qrserver.com erzeugt | App-Origin an Dritten | low | MR-11 | ef921bc | |
| TD-52 | Open | `PortfolioTab.tsx:281, 1001, 1181` · `assetRegistry.ts:113` | Personennamen als Code-Defaults | DSGVO-relevant | low | MR-3, MR-4 | ef921bc | |
| TD-53 | Open | `src/App.tsx:445–551` | Alle Depotdaten unverschlüsselt in localStorage (Design) | Bekannt, dokumentieren | low | MR-11 | ef921bc | |
| TD-54 | Open | `MorgenroutineTab.tsx:195–222, 236–242, 592, 884` | Fester Zugriff auf tsla/now/baba/btc, obwohl LivePrices offen ist; nach Reset-All Fehler-Toast trotz Abruf (inferred) | Absturz nach Reset | high | MR-1 | ef921bc | |
| TD-55 | Open | `server.ts:456–501` · `vercel.json:10` | OCR bis 91 s bei maxDuration 60; übrige Routen ohne Timeout | Server rechnet ins Leere | medium | MR-1, MR-2 | ef921bc | |
| TD-56 | Open | `server.ts:305, 530, 838, 972` | Sechs In-Memory-Zustände in Serverless-Funktion; Datei-Persistenz schlägt still fehl | Cache trifft selten, Profile verloren | medium | MR-1, MR-2, MR-7 | ef921bc | |
| TD-57 | Open | `server.ts:114, 1140, 1200, 1291` vs `:205, 456` | Gemini-Modell-IDs uneinheitlich | Teilausfall bei Abkündigung | medium | MR-2, MR-7, MR-9, MR-10 | ef921bc | |
| TD-58 | Open | `server.ts:1130, 1185` | Festes Datum „Juni 2026" in DD-Prompts | Schätzwerte für falschen Monat | medium | MR-2 | ef921bc | |
| TD-59 | Open | `server.ts:1097–1113, 1237` · `App.tsx:244` | Feste Ersatzwerte 2/3 bzw. 2/1 als Daten gespeichert | Sperre hängt allein an distSource | low | MR-2 | ef921bc | |
| TD-60 | Open | `server.ts:535–644, 857, 994` · `yahooMapping.ts:76` | Kursquelle: Kette inoffizieller Endpunkte mit gefälschtem User-Agent | Abschaltung legt Cockpit lahm | medium | MR-1 | ef921bc | |
| TD-61 | Open | `src/components/PortfolioTab.tsx:139, 1411, 1520, 1756` | START_CASH=0 als Konstante: Risiko 0 %, Depotkapital 0 €, workingCapital negativ | Falsche Anzeige | medium | MR-5, MR-6 | ef921bc | |
| TD-62 | Open | `src/components/PortfolioTab.tsx:244–258` | Watchlist aus localStorage statt Prop, Default AAPL/NVDA/MSFT | Zweiter Lesepfad | low | MR-7 | ef921bc | |
| TD-63 | Open | `src/components/PortfolioTab.tsx:1257, 1744` | Verkauf fällt auf "tsla" zurück; btc-Sonderfall im Stop | Stille Fehlbuchung | low | MR-4, MR-5 | ef921bc | |
| TD-64 | Open | `CombinedJournal.tsx:283` · `importParser.ts:161` · `PortfolioTab.tsx:937, 1354` | Drei ID-Schemata für Buchungen | Kollisionen | low | MR-4 | ef921bc | |
| TD-65 | Open | `server.ts:229–511` · `MorgenroutineTab.tsx:477–512` · `PortfolioTab.tsx:633` | Toter Code: drei Routen ohne Aufrufer, ungenutzte Funktionen und Imports | Verwirrende Suche | low | unassigned | ef921bc | |
| TD-66 | Open | `tsconfig.json` | Kein strict; hohe any-Dichte (server.ts 23, CombinedJournal 28) | Typprüfung sagt wenig | medium | unassigned | ef921bc | |
| TD-67 | Open | `src/App.tsx:360–413` · `App.tsx:971–985` · `CombinedJournal.tsx:1033` · `RechnerTab.tsx:207` | Leere catch-Blöcke, confirm() in PWA, eslint-disable exhaustive-deps | Stille Fehler | low | MR-4, MR-7, MR-11 | ef921bc | |
| TD-68 | Open | `vite.config.ts:31, 56` · `dist/assets` | Bundle 759 KB in einem Chunk; skipWaiting+clientsClaim neben registerType prompt | Ladezeit, widersprüchliche Update-Strategie | low | MR-12 | ef921bc | |

## Archive (Resolved)
_Moved here by `/cleanup`, one line each: ID, path, what, resolving commit._
