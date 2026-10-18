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
| TD-1 | Open | `src/components/PortfolioTab.tsx` | Gemischte Datei, 3514 Zeilen: Stop-Formel, FIFO/KESt (zweimal), Cash-Salden, V8-Import, localStorage, ~45 States, Pine-Script, CRUD, 858 Zeilen toter JSX | Jede Änderung liest alles; Steuerlogik und UI untrennbar | high | MR-5, MR-6 | 296d310 | |
| TD-2 | Open | `src/components/MorgenroutineTab.tsx` | Gemischte Datei, 2935 Zeilen: DecimalInput, Live-Abruf-Orchestrierung, Regime-Regel (zweimal), OCR-Pipeline, TV-Parser, Import-Cache, DD-Abruf, FX | Kern-Datenpfad und Regime-Urteil in einer UI-Datei | high | MR-1, MR-3 | 296d310 | |
| TD-3 | Open | `src/components/WorkspaceSyncTab.tsx` | Gemischte Datei, 2890 Zeilen: OAuth, Profile (lokal/cloud/Datei), Drive-, Sheets-, Docs-REST, V8-Export/Import, Hilfetexte | Vier Fremd-APIs und Token-Handling in einer Komponente | high | MR-9, MR-10 | 296d310 | |
| TD-4 | Open | `server.ts` | Gemischte Datei, 1262 Zeilen: Bootstrap, vier KI-Endpunkte mit Prompts, OAuth-Callback-HTML, Profil-Lockbox, Yahoo/Stooq/ATR, Aktien-Dictionary, DD-Algorithmus, Serving | Alle Server-Verantwortungen in einer Datei | high | MR-1, MR-2, MR-8, MR-9 | 296d310 | |
| TD-5 | Open | `src/components/CombinedJournal.tsx` | 1875 Zeilen, ~90 durchgereichte Props; Sortier-/Filterlogik doppelt zu PortfolioTab | Jede Formularänderung berührt zwei Dateien | medium | MR-6 | 296d310 | |
| TD-6 | Open | `src/components/RechnerTab.tsx` | 1319 Zeilen: 1 %-Regel, ATR-Stop-Finder, zwei identische Debounce-Effekte, Watchlist-CRUD, Checkliste | Rechenlogik ohne eigenes Modul | medium | MR-4 | 296d310 | |
| TD-7 | Open | `src/App.tsx` | 849 Zeilen: State-Container für 14 localStorage-Keys ohne Shape-Prüfung, Backup-Payload, CSV mit Regime-Regel, Reset | Persistenz und Regeln im Root | medium | MR-3, MR-11, MR-12 | 296d310 | |
| TD-8 | Open | `src/utils/yahooMapping.ts:116` · `server.ts:526` | ATR zweimal implementiert; Frontend-Kopie wird nicht aufgerufen, Server rundet anders | Zwei Wahrheiten für den Stop-Abstand | medium | MR-1 | 296d310 | |
| TD-9 | Open | `src/utils/yahooMapping.ts:9` · `server.ts:505` | Yahoo-Symbole der Marktindikatoren zweimal gepflegt | Drift bei Symbolwechsel | low | MR-1 | 296d310 | |
| TD-10 | Open | `server.ts:518` · `server.ts:776` | Yahoo-Host-Fallback query1→query2 zweimal; zweite Variante ohne encodeURIComponent | Ein Fix landet nur in einer Kopie | medium | MR-1, MR-2 | 296d310 | |
| TD-11 | Open | `src/App.tsx:479` · `MorgenroutineTab.tsx:329, 1285` · `WorkspaceSyncTab.tsx:882` · `server.ts:52` | Regime-Regel GREEN/RED an fünf Stellen, einmal mit VVIX, sonst ohne | Snapshot kann RED sagen, Cockpit GREEN | high | MR-3 | 296d310 | |
| TD-12 | Open | `src/App.tsx:466` · `WorkspaceSyncTab.tsx:866` | CSV-/Sheet-Zeile des Tagesjournals zweimal formatiert | Spaltenänderung muss zweimal passieren | low | MR-3, MR-10 | 296d310 | |
| TD-13 | Open | `PortfolioTab.tsx:1693` · `RechnerTab.tsx:410` · `server.ts:63` | Stop-Loss-Formel drei Stellen, zwei Formeln, Faktor 1.5 vs 2 | Rechner und Portfolio widersprechen sich und dem Coach | high | MR-4, MR-5, MR-8 | 296d310 | |
| TD-14 | Open | `src/components/PortfolioTab.tsx:966, 1177` | FIFO-/Durchschnitts-Matching als Vorschau und Buchung doppelt | Steuerbetrag kann in Vorschau und Buchung abweichen | high | MR-6 | 296d310 | |
| TD-15 | Open | `PortfolioTab.tsx:81` · `WorkspaceSyncTab.tsx:793, 1383` · `backupFile.ts:201` | Vier Pfade zum Wiederherstellen eines V8-Backups mit vier Prüfungen; Erzeugen zweimal | Inkonsistente Wiederherstellung | medium | MR-9, MR-11 | 296d310 | |
| TD-16 | Open | `src/utils/backupFile.ts:63, 157, 218, 233` | summarize ≡ summarizePayload; parseBackupFile ⊂ parseAnyBackup | Totes Duplikat | low | MR-11 | 296d310 | |
| TD-17 | Open | `PortfolioTab.tsx:181–600` · `CombinedJournal.tsx:197–490` | Journal-Sortierung/-Filter in beiden Dateien; PortfolioTab-Variante hängt am toten Block | Verwirrende Suche, doppelte States | medium | MR-6 | 296d310 | |
| TD-18 | Open | `mathUtils.ts:10` · `MorgenroutineTab.tsx:57` · `PortfolioTab.tsx:1179` | Zahlenparser dreimal verschieden (mit/ohne Tausender, rohes parseFloat) | Eingabe „1.234,5" wird je Tab anders gelesen | medium | MR-1, MR-6 | 296d310 | |
| TD-19 | Open | `MorgenroutineTab.tsx:540, 660` · `server.ts:395` | Plausibilitätsgrenzen je Kennzahl dreimal | Grenzen driften zwischen OCR, Text und Prompt | low | MR-1 | 296d310 | |
| TD-20 | Open | `src/components/RechnerTab.tsx:72, 107` | Debounced Stock-Search zweimal, 600 vs 500 ms | Identischer Effekt doppelt | low | MR-4 | 296d310 | |
| TD-21 | Open | `package.json` | Kein Test-Runner, kein Test-Skript, kein CI | Alle folgenden Geld-Pfade ungeprüft | high | unassigned | 296d310 | |
| TD-22 | Open | `src/components/RechnerTab.tsx:228–320` | Positionsgröße / 1 %-Regel / CRV ohne Test | Falsche Stückzahl = falsches Risiko | high | MR-4 | 296d310 | |
| TD-23 | Open | `PortfolioTab.tsx:1693` · `server.ts:526` · `yahooMapping.ts:116` | Stop-Loss, Risiko je Position und ATR ohne Test | Stop zu eng oder zu weit | high | MR-1, MR-5 | 296d310 | |
| TD-24 | Open | `src/components/PortfolioTab.tsx:966–1352` | FIFO/Durchschnitt, KESt 27,5 %, Lose verbrauchen/zurückgeben, Undo ohne Test | Dauerhaft falsche Steuerdokumentation | high | MR-6 | 296d310 | |
| TD-25 | Open | `PortfolioTab.tsx:423–495` · `DepotCurveChart.tsx:40–160` | Cash-Salden, Gesamtvermögen, Equity-Kurve, Drawdown ohne Test | Falsche Depotkennzahlen | medium | MR-5, MR-6 | 296d310 | |
| TD-26 | Open | `src/utils/encryption.ts` | PBKDF2/AES-GCM-Roundtrip ohne Test | Stiller Fehler macht jedes Backup unlesbar | high | MR-11 | 296d310 | |
| TD-27 | Open | `src/utils/backupFile.ts` · `src/App.tsx:412` | Backup-Format, Legacy-Adapter, Einspielen ohne Shape-Check und ohne Test | Datenverlust beim Restore | high | MR-11 | 296d310 | |
| TD-28 | Open | `MorgenroutineTab.tsx:540` · `server.ts:489` | OCR-Übernahme und Modellantwort-Parsing ohne Test | Falsche Marktwerte im Cockpit | medium | MR-1 | 296d310 | |
| TD-29 | Open | `src/components/MorgenroutineTab.tsx:622–760` | TradingView-Text-Parser ohne Test (Matcher „450" für ServiceNow) | Fehlzuordnung von Werten | medium | MR-1 | 296d310 | |
| TD-30 | Open | `server.ts:776–896` | Distribution-Day-Zählung und Yahoo-Parsing ohne Test | Kaufverbot auf falscher Zählung | medium | MR-2 | 296d310 | |
| TD-31 | Open | `server.ts:576–611` | Stooq-CSV-Parser ohne Test | Fallback-Kurse falsch | low | MR-1 | 296d310 | |
| TD-32 | Open | `src/utils/periodStats.ts` | ISO-Woche, Min/Max/Avg ohne Test | Auswertung verschiebt Tage | low | MR-7 | 296d310 | |
| TD-33 | Open | `src/App.tsx:782–826` | „Alle Daten löschen" unumkehrbar, nur zwei confirm() | Totalverlust per Doppelklick | medium | MR-11 | 296d310 | |
| TD-34 | Open | `server.ts:297–349` | Profil-Lockbox mit PIN ohne Test | Profile gehen still verloren | low | MR-9 | 296d310 | |
| TD-35 | Open | `server.ts` (alle Routen) | Keine Authentifizierung und kein Rate-Limit auf irgendeiner Route | Jeder kann die Gemini-Quota des Betreibers aufbrauchen | high | MR-1, MR-2, MR-4, MR-7, MR-8, MR-9 | 296d310 | |
| TD-36 | Open | `server.ts:198–262` | OAuth-Callback sendet Token-Hash per postMessage mit targetOrigin `*` | Google-Token an fremde Opener | high | MR-9 | 296d310 | |
| TD-37 | Open | `src/components/WorkspaceSyncTab.tsx:216–220` | postMessage-Listener akzeptiert `.run.app`, `includes('localhost')`; Vercel-Domain fehlt | Login auf Vercel vermutlich defekt, Filter umgehbar | medium | MR-9 | 296d310 | |
| TD-38 | Open | `server.ts:265–349` | PINs und Google-IDs im Klartext in `cloud_profiles.json`, globaler Namensraum, kein Versuchszähler, Datei nicht in .gitignore | Profile ausspähbar, versehentlicher Commit möglich | high | MR-9 | 296d310 | |
| TD-39 | Open | `src/components/WorkspaceSyncTab.tsx:202, 226, 329` | Google-Access-Token mit Drive-Scope im localStorage, Implicit Flow | Jedes Skript auf der Origin liest das Token | medium | MR-9 | 296d310 | |
| TD-40 | Open | `server.ts:1110–1232` · `RechnerTab.tsx:72–200` | Aktiensuche lässt Gemini Kurs und ATR „schätzen"; Werte füllen den Stop-Finder vor; Fallback-Dictionary mit festen Kursen | Stop und Positionsgröße auf halluzinierten Zahlen | high | MR-4 | 296d310 | |
| TD-41 | Open | `server.ts:89–133` | `/api/chat` validiert `messages` nicht; jede Rolle ≠ user wird zu model | System-Prompt unterlaufbar, 500 mit Fehlertext | medium | MR-8 | 296d310 | |
| TD-42 | Open | `server.ts:136–194` | `/api/analyze-period` interpoliert Body-Felder roh in den Prompt | Prompt-Injection-Fläche | low | MR-7 | 296d310 | |
| TD-43 | Open | `server.ts:352–500` | `/api/parse-screenshot`: mimeType ungeprüft, Modellantwort per JSON.parse übernommen | Nur Client-Plausibilität schützt | low | MR-1 | 296d310 | |
| TD-44 | Open | `server.ts:12–13` | Body-Limit 50 MB auf jeder Route | Speicher-/DoS-Fläche in 60-s-Function | medium | MR-12 | 296d310 | |
| TD-45 | Open | `server.ts:708` · `api/index.ts:17` · `MorgenroutineTab.tsx:279` | Stack-Traces gehen an den Client und in den Toast | Interna sichtbar | low | MR-1, MR-12 | 296d310 | |
| TD-46 | Open | `server.ts:16–24` | `/api/ping` verrät hasGeminiKey, Node-Version, isVercel ohne Auth | Aufklärung erleichtert | low | MR-12 | 296d310 | |
| TD-47 | Open | `vercel.json` · `server.ts` | Keine Security-Header (X-Frame-Options, nosniff, Referrer-Policy, HSTS) | Clickjacking/Sniffing, nur Host könnte sie setzen | medium | MR-12 | 296d310 | |
| TD-48 | Open | `server.ts` | Kein CORS-Modul; Same-Origin für Browser, keine Grenze für Nicht-Browser | Folgt aus TD-35 | low | MR-12 | 296d310 | |
| TD-49 | Open | `WorkspaceSyncTab.tsx:679–790, 1338` | Drive-Backup und lokaler JSON-Download im Klartext, nur Backup-Modal verschlüsselt | Komplettes Portfolio unverschlüsselt in Drive | medium | MR-9, MR-11 | 296d310 | |
| TD-50 | Open | `encryption.ts:13` · `BackupSetupModal.tsx:14` | Fester App-Salt und 4-stellige PIN erlaubt | Offline-Brute-Force mit 10 000 Versuchen | medium | MR-11 | 296d310 | |
| TD-51 | Open | `src/App.tsx:412` · `backupFile.ts:146` · `WorkspaceSyncTab.tsx:437` | Entschlüsselter/importierter Inhalt ohne Schema-Prüfung in State und localStorage | Manipuliertes Backup crasht die App | medium | MR-11, MR-9 | 296d310 | |
| TD-52 | Open | `WorkspaceSyncTab.tsx:703, 1349` · `PortfolioTab.tsx:259` | Persönliche E-Mail als authorEmail in jedem V8-Backup; „Flatex"/„Andres" als Defaults | Personenbezug im Code | low | MR-5, MR-9 | 296d310 | |
| TD-53 | Open | `server.ts:273` (`cloudProfiles`) | Profile im Prozessspeicher einer Serverless-Function; Speichern meldet Erfolg | Datenverlust bei jedem Cold Start ohne Fehler | high | MR-9 | 296d310 | |
| TD-54 | Open | `server.ts:515, 769, 770, 774` | Caches im Prozessspeicher einer Serverless-Function | Cache trifft selten | low | MR-1, MR-2, MR-4 | 296d310 | |
| TD-55 | Open | `server.ts:957–971, 1046–1060, 1098–1104` · `MorgenroutineTab.tsx:311, 1244` | Distribution Days liefern feste Schätzwerte 2/3 oder Gemini-Schätzung als Messwert; Prompts mit festem Datum „Juni 2026" | Kaufverbot steht auf erfundenen Daten | high | MR-2, MR-3 | 296d310 | |
| TD-56 | Open | `server.ts:113, 1004, 1073, 1127` vs `:159, :441` | Modell-IDs uneinheitlich: gemini-3.5-flash ohne Fallback vs 2.5→2.0→1.5-Kette | Ein Endpunkt fällt aus, der andere nicht | medium | MR-2, MR-4, MR-8 | 296d310 | |
| TD-57 | Open | `server.ts:462, 475` · `vercel.json` · `MorgenroutineTab.tsx:498` | Timeout-Budget OCR: 3×30 s Server, 60 s Function, 25 s Client | Server rechnet ins Leere | medium | MR-1 | 296d310 | |
| TD-58 | Open | `server.ts:519, 630, 778` · `yahooMapping.ts:29` | Alle Marktdaten am inoffiziellen Yahoo-Chart-Endpunkt mit gefälschtem User-Agent; Stooq deckt drei Ticker | Abschaltung legt das Cockpit lahm | medium | MR-1, MR-2 | 296d310 | |
| TD-59 | Open | `src/types.ts:12–51` · `backupFile.ts:203` · `server.ts:471` | LivePrices auf vier Assets festgeschrieben; Typen inkonsistent | Fünftes Asset braucht Änderungen an sechs Stellen | medium | MR-1, MR-5 | 296d310 | |
| TD-60 | Open | `PortfolioTab.tsx:117, 428–2129` · `RechnerTab.tsx:40` · `MorgenroutineTab.tsx:123` | Fest einkodierte Zahlen: Start-Cash 40000 sechsmal neben START_CASH=0, FX-Defaults 1.10/1.080, Tranche 20000 | Zwei verschiedene Defaults fürs Startkapital | medium | MR-4, MR-5 | 296d310 | |
| TD-61 | Open | `src/components/PortfolioTab.tsx:2385–3243` | 858 Zeilen toter JSX hinter `{false && (` samt zugehöriger States | Jede Suche findet zuerst die tote Variante | medium | MR-6 | 296d310 | |
| TD-62 | Open | `server.ts:771, 1210` | RATE_LIMIT_COOLDOWN_MS = 5 min, Log sagt „30 seconds" | Irreführende Diagnose | low | MR-4 | 296d310 | |
| TD-63 | Open | `src/App.tsx:342–436` | 14 setItem-Effekte ohne try/catch; JSON.parse ohne Shape-Prüfung | Quota/Private Mode bricht still | low | MR-12 | 296d310 | |
| TD-64 | Open | `src/components/AICoachTab.tsx:82` | Chat sendet komplette History ohne Obergrenze | Tokens und Latenz wachsen linear | low | MR-8 | 296d310 | |
| TD-65 | Open | `api/index.ts:7` · `vercel.json` | Import `../server.js` aus `server.ts`; Bündelung durch Vercel nur angenommen, kein lokales Skript | Deploy lokal nicht nachstellbar | low | MR-12 | 296d310 | |

## Archive (Resolved)
_Moved here by `/cleanup`, one line each: ID, path, what, resolving commit._
