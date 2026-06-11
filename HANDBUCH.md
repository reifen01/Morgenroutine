# Morgenroutine & Handels-Wächter — Handbuch

> Stand: 10. Juni 2026 · Build-Familie PR #1 – PR #11

---

## 1. Was die App heute kann

### 1.1 Datenerfassung (Eingabe)
Vier Wege, die täglichen Marktdaten in die Routine zu bekommen — alle führen zum selben State, du wählst je nach Situation:

| Methode | Wann sinnvoll | Was sie macht |
|---|---|---|
| **Manuell** (Felder ausfüllen) | Wenn du dir 100% sicher sein willst oder offline bist | Du tippst VIX, VXV, … selbst |
| **📋 Text kopieren** (TradingView-Watchlist als Text) | Schnell, wenn du eh TradingView offen hast | Parser extrahiert die Werte aus der Text-Tabelle |
| **📸 Screenshot hochladen** | Aus dem Brokerprogramm / iPhone Screenshot | Gemini-OCR liest die Werte aus dem Bild |
| **🌐 Live abrufen** (Yahoo Finance) | Per Klick alle Werte tagesfrisch | Holt VIX, VXV, VVIX, SPX, WTI, Gas + alle Portfolio-/Watchlist-Aktien mit ATR + Distribution Days in einem Schritt |

### 1.2 Live-Abruf: was per Klick automatisch befüllt wird
Mit einem einzigen Klick auf **„🌐 Jetzt abrufen"**:

**Marktindikatoren:**
- VIX (`^VIX`)
- VXV / 3-Monats-Vola (`^VIX3M`)
- VVIX (`^VVIX`)
- **SPX** (`^GSPC`, mit `SPY × 10`-Fallback)
- WTI Öl (`CL=F`)
- Henry Hub Gas (`NG=F`)

**Distribution Days:**
- SPX und NDX programmatisch aus 25 Handelstagen via SPY/QQQ-Yahoo-Bars
- Bei Yahoo-Ausfall: Gemini-AI-Fallback via Search Grounding
- Begründung („AI Verteilungsanalyse") wird darunter mitgeliefert

**Portfolio-Aktien (alle mit EUR-Preis + 14-Tage-ATR):**
- TSLA (`TL0.F` → `TL0.DE` Fallback)
- NOW / ServiceNow (`4S0.F` → `4S0.DE` Fallback)
- BABA / Alibaba (`BABA.F` → `BABA.DE` → `BABA.MU` → `BABA.SG` Fallback-Kette)
- BTC / Bitcoin (`BTC-EUR`)

**Watchlist:**
- Jeder Watchlist-Eintrag bekommt Preis und ATR

**Cache:**
- Antwort wird 60 s im Memory zwischengespeichert (kein doppelter Yahoo-Call bei Mehrfachklick)
- Frontend persistiert in localStorage als „Letzter Cache"

### 1.3 Rechner & Risiko-Management
- **1%-Risiko-Regel:** automatische Stückzahl-Berechnung pro Kauf
- **Harter Anker / Stop-Loss:** `max(Harter Anker, Kurs − 2 × ATR)` — exakt nach der Regel
- **Portfolio-Journal:** Käufe, Verkäufe, FIFO/Durchschnitt-Methode, KESt-27,5%-Abrechnung
- **Depotkurve:** Visualisierung der Performance über Zeit

### 1.4 KI-Coach
- Chat mit dem unbestechlichen Trading-Coach (Gemini 2.5 Flash)
- Antwortet nach dem Regelwerk (René Berteit + DACH/Österreich-Edition)
- Erinnert an Disziplin-Quote, fordert Bear Case

### 1.5 Datenpersistenz
- **Alles in localStorage** — jedes Gerät hat sein eigenes Portfolio
- Kein Server, der mitschneidet — du teilst die App, dein Gegenüber sieht **nicht** dein Portfolio
- Optional: Google Workspace Sync für Export

### 1.6 Plattformen
- **iPhone:** PWA über Safari („Zum Home-Bildschirm hinzufügen")
- **Android:** PWA über Chrome (Install-Button)
- **Windows / Mac:** PWA über Chrome/Edge oder im Browser
- **Auto-Update-Banner:** zeigt sich, wenn eine neue Version live ist — ein Klick lädt sie

### 1.7 Diagnose
- Build-Version (Commit-SHA) wird neben dem **LUMINA**-Logo angezeigt → Screenshot enthält automatisch die Version
- `/api/ping` als Health-Check
- Fehler-Toast mit Stack-Trace bei Live-Abruf-Problemen

---

## 2. Release-Journal

Chronologisch von Start bis heute, kompakt:

### 🚀 PR #1 — Erstaufsetzen + PWA + Vercel
- Rebuild der App aus dem Google-AI-Studio-ZIP
- React 19 + TypeScript + Vite 6 + TailwindCSS v4
- Recharts für die Depotkurve
- PWA-Support via `vite-plugin-pwa` (iOS, Android, Desktop)
- Vercel-Deployment (morgenroutine.vercel.app)
- App-Icon (Sonne + Kursbalken, Indigo)
- Onboarding-Screen für Erstnutzer
- Installations-Anleitung als HTML
- Erster OCR-Fix (Gemini-Modell-Versuch)

### 🌐 PR #2 — Yahoo-Finance-Live-Daten (1. Anlauf)
- Neuer Tab „🌐 Live abrufen" im Schnell-Import-Center
- `/api/fetch-live-prices` Endpoint (mit `v7/quote` — funktionierte später nicht mehr)
- `src/utils/yahooMapping.ts` als gemeinsame Symbol-Mapping
- Watchlist-State von RechnerTab → App.tsx hochgehoben
- OCR-Fix: `gemini-3.5-flash` → `gemini-2.5-flash` (richtiger Modellname)
- OCR-Timeout 7,5 s → 30 s

### 🔧 PR #3 — Vercel-Routing-Fix (NOT_FOUND)
- `vercel.json`: Rewrite-Ziel `/api` → `/api/index`
- `maxDuration` 60 s → 10 s (war später falsch, siehe PR #5)

### 🆕 PR #4 — PWA-Auto-Update-Banner
- `registerType: 'prompt'` + `skipWaiting` + `clientsClaim`
- Neue Komponente `PWAUpdatePrompt.tsx`
- Banner unten rechts: „Neue Version verfügbar — Jetzt aktualisieren"
- 30-Min-Intervall-Check im Hintergrund

### 🔧 PR #5 — Live-Endpoint umgebaut auf Chart-only
- `v7/finance/quote` entfernt (war seit 2024 Auth-pflichtig)
- Nur noch `v8/finance/chart` (gleich wie Distribution Days)
- Aktueller Preis aus `meta.regularMarketPrice`
- ATR aus 14-Tage-Bars
- `query2.finance.yahoo.com` als Mirror-Fallback
- `maxDuration` zurück auf 60 s

### 🔍 PR #6 — Fehler-Detail im Toast
- Fehler-Toasts blieben 15 s statt 4 s
- Multiline-Rendering
- Stack-Trace im Toast lesbar

### 🏷️ PR #7 — Build-Version + Diagnose
- **Build-Version-Badge** neben LUMINA (Commit-SHA via `VERCEL_GIT_COMMIT_SHA`)
- `/api/ping` Health-Check
- `/api/yahoo-test` Yahoo-Probe (später entfernt)
- **vite-Import dynamisch** — entscheidender Fix für `FUNCTION_INVOCATION_FAILED`

### 🐛 PR #8 — Cold-Start-Error sichtbar machen
- `api/index.ts` als `(req, res)`-Handler
- Lazy-Import von `server.ts` mit try/catch
- JSON-Error-Response statt generischer Vercel-Fehlerseite

### 🧪 PR #9 — Bisect + Cleanup
- Test mit minimalem Handler → bewies: Vite war der Crash-Verursacher
- Express-Wrapper wiederhergestellt
- `/api/yahoo-test` entfernt
- Toast-Dauer wieder 4 s

### 🇨🇳 PR #10 — BABA-Fallback-Kette
- Primary `BABA.DE` → `BABA.F` (Frankfurt zuverlässig)
- Auto-Fallback `BABA.F → BABA.DE → BABA.MU → BABA.SG`
- Gleiches Muster für TSLA und NOW (`.F → .DE`)
- Frontend sendet alle Kandidaten, Response-Resolver pickt ersten Treffer

### 🇺🇸 PR #11 — SPX richtig + Distribution Days mit
- **SPX-Wert war als String `7519.10` im CSV-Export hardcoded** → war der S&P-Schluss vom 26. Mai, also 2 Wochen alt
- Feld `spx` zu `MarketState` hinzugefügt
- **SPY × 10** als Surrogat-Fallback (Yahoo flackt bei `^GSPC`)
- **Distribution Days laufen parallel zum Live-Preis-Call** — ein Klick reicht
- Toast zählt DD mit

---

## 3. Regel-Handbuch — Entscheidungs-Matrix

> Das ist die operative Quintessenz des „unbestechlichen Handels-Handbuchs" (René Berteit + Österreich-Edition).
> Werte werden mit dem Live-Abruf geholt, die Logik wenden wir hier strikt an.

### 3.1 Wann darfst du KAUFEN?

**Alle Bedingungen müssen erfüllt sein. Wenn auch nur EINE bricht: Kein Neukauf.**

| Indikator | Schwelle | Aktuell-Wert holen aus | Was tun bei Verletzung |
|---|---|---|---|
| **VIX** | `< 25` | Live-Abruf → `marketState.vix` | VIX ≥ 25 → **Absolutes Kaufverbot.** Markt zu nervös. |
| **VIX/VXV-Ratio** | `< 1.0` (Contango) | Live-Abruf → `vix / vxv` | Ratio ≥ 1.0 (Backwardation) → **Absolutes Kaufverbot.** Future-Markt ist „inverted", Profis erwarten Crash. |
| **VVIX** | `< 130` (hart), idealerweise `< 110` | Live-Abruf → `marketState.vvix` | VVIX > 130 → **Absoluter Kaufstopp**; 110–130 → Profis sichern ab, du wirst defensiv; <100 = entspannt |
| **WTI Öl** | `< $100` | Live-Abruf → `marketState.wti` | WTI ≥ $100 → **Risiko halbieren (0,5% statt 1%)**, nicht Kaufverbot, aber Stop-Anpassung |
| **Henry Hub Gas** | `< $4.50` | Live-Abruf → `marketState.gas` | Gas ≥ $4.50 → **Absolutes Kaufverbot.** Energiekosten schlagen durch. |
| **Distribution Days SPX** | `< 5` | Live-Abruf → `marketState.distSpx` | ≥ 5 → Verteilungsdruck, defensiv handeln, keine Neukäufe in den Indizes |
| **Distribution Days NDX** | `< 5` | Live-Abruf → `marketState.distNdx` | ≥ 5 → wie oben, gilt für Nasdaq-Werte |
| **US-Timing** | Goldenes Window `16:00–21:30 MEZ` | Uhrzeit | Außerhalb: kein Kauf, weite Geld-Brief-Spannen oder Opening Flush |

**Status GREEN** = alle Schwellen eingehalten → 1% Risiko-Regel anwenden, kaufen.
**Status RED** = irgendeine Schwelle verletzt → kein Neukauf heute.

### 3.2 Wann musst du VERKAUFEN?

| Trigger | Quelle | Aktion |
|---|---|---|
| **Stop-Loss erreicht** | `kurs ≤ stopKurs` aus Portfolio-Item | Sofort verkaufen, ohne Diskussion |
| **„Tabula Rasa"-Test** am Wochenende sagt NEIN | Eigene Frage: „Würde ich heute frisch kaufen?" | Montag bei Eröffnung manuell glattstellen |
| **Regel-Verletzung dauerhaft** (z.B. VVIX > 130 mehrere Tage) | Live-Abruf | Position prüfen, Risiko abbauen |
| **Plan zum Verkauf erreicht** (Take-Profit aus Journal) | Journal-Notiz | Plan ausführen, nicht aus Gier hinauszögern |

### 3.3 Stop-Loss-Berechnung

```
Stop = max(Harter Anker, Aktueller Kurs − (2 × ATR))
```

- **Harter Anker** trägst du beim Kauf ein (z.B. „nicht unter EUR 280")
- **ATR** wird live aus 14 Tagen berechnet (Live-Abruf)
- **Niemals nach unten verschieben** — Stop kann nur höher rutschen, nie tiefer
- Rechner in der App nimmt dir die Mathematik ab

**Beispiel TSLA:** Kurs 332,60 €, ATR 12,27 €, Harter Anker 280 €
- Kurs − 2×ATR = 332,60 − 24,54 = 308,06 €
- max(280, 308,06) = **308,06 €** → das ist dein Stop

### 3.4 Stückzahl-Berechnung (1%-Regel)

```
Riskobetrag = Depotwert × 0,01    (oder × 0,005 wenn WTI ≥ 100)
Stückzahl   = abrunden( Risikobetrag / (Kurs − Stop) )
```

- **Wertorientiert:** je weiter Stop entfernt, desto weniger Stücke
- **Kaufmännisch immer abrunden**
- **Stop wird bei Kauf direkt platziert**

**Beispiel TSLA bei 332,60 €:** Depot 50.000 €, Stop 308,06 €
- Risikobetrag = 500 €
- Differenz Kurs−Stop = 24,54 €
- Stückzahl = floor(500 / 24,54) = **20 Stück** → Position 6.652 €

### 3.5 Cash als Sachwert-Äquivalent
Freies Cash ist kein totes Kapital, sondern dein **Rabatt-Gutschein** für die nächste Panikphase (Fear & Greed < 30). Nicht „investieren um zu investieren".

### 3.6 Disziplin-Quote (DQ%)
- Selbstgemessen: Anteil der Trades, bei denen alle Regeln strikt eingehalten wurden
- **Ziel: ≥ 95%**
- Der AI-Coach prüft und erinnert

### 3.7 Steuern (Österreich-Edition)
- **KESt 27,5%** — wird automatisch von DADAT abgezogen
- Verlustausgleich läuft im Hintergrund innerhalb des Kalenderjahres
- Trading-GmbH rentiert sich erst ab ~€150.000–200.000 Depotwert

---

## 4. Tagesablauf (Praxis)

**08:00–09:00 MEZ — Morgenroutine:**
1. App öffnen → falls Update-Banner → drücken
2. **„🌐 Live abrufen"** → ein Klick füllt alles
3. Status oben prüfen: GREEN oder RED?
4. Bei RED: was ist verletzt? Heute keine Neukäufe.
5. Bei GREEN: vorhandene Positionen checken (Stops haben sich evtl. mit höheren ATR-Werten nach oben verschoben? Stop manuell hochziehen.)

**16:00–21:30 MEZ — Goldenes Window:**
- Käufe nur in diesem Fenster
- 1%-Risiko-Regel strikt
- Stop direkt mit dem Kauf platzieren

**Wochenende:**
- Clean-Slate-Test pro Position: „Würde ich heute frisch kaufen?"
- Bei NEIN → Montag glattstellen

---

## 5. Was die App NICHT tut (und auch nicht sollen)

- ❌ Trades automatisch ausführen (keine Broker-Anbindung — bewusst)
- ❌ Eigenständig Stops verschieben (du behältst die Kontrolle)
- ❌ Echtzeit-Streaming (Yahoo-Cache 60 s reicht)
- ❌ Daten serverseitig speichern (alles in deinem Browser)

---

## 6. Bei Problemen

| Symptom | Erste Maßnahme |
|---|---|
| Werte nicht aktuell | Update-Banner klicken oder PWA neu öffnen, dann Live-Abruf |
| Live-Abruf wirft Fehler-Toast | Fehlertext kopieren, Build-Version aus Header notieren |
| Build-Version-Badge fehlt nach Update | Cache leeren (Strg+Shift+R im Browser) |
| BABA-Preis fehlt | Yahoo droppt grad alle BABA-EUR-Listings — manuell eintragen oder warten |
