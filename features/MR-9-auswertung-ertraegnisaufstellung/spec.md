# MR-9 · Auswertung & Erträgnisaufstellung

> Reconstructed from code, confirmed 2026-10-22. This feature was built before the kit's chain existed; there is no tasks.md and none is expected. The QA report is what verifies it.
>
> Aus dem Code rekonstruiert und am 22.10.2026 bestätigt. Das Feature entstand vor der Kit-Kette; es gibt keine tasks.md und es wird keine erwartet. Geprüft wird es über den QA-Report.

## Zweck

Fasst die Tages-Snapshots der Morgenroutine zu Zeiträumen zusammen, hält je Zeitraum eine Pareto-Notiz (optional als KI-Entwurf) und stellt die realisierten Erträge je Jahr und Depot zusammen.

## User Stories

- Als Anleger möchte ich sehen, wie sich die Ampel-Werte über eine Woche oder einen Monat entwickelt haben, damit ich Muster im Marktregime erkenne.
- Als Anleger möchte ich je Zeitraum festhalten, was ich gelernt habe, damit meine Disziplin über die Zeit nachvollziehbar bleibt.

## Acceptance Criteria

### Routine-Auswertung

- **AC-1:** Der Tagesverlauf wird nach ISO-Kalenderwoche (Montag–Sonntag) oder Kalendermonat zusammengefasst; umgeschaltet wird mit „Woche“ / „Monat“. _(`src/utils/periodStats.ts:34–49`, `src/components/AuswertungTab.tsx:109–122`)_
- **AC-2:** Zeiträume heißen „KW 24 / 2026“ bzw. „Juni 2026“; der neueste steht oben. _(`src/utils/periodStats.ts:56–63, 110–111`)_
- **AC-3:** Jeder Zeitraum zeigt ersten und letzten erfassten Tag sowie die Zahl der GRÜN- und ROT-Tage. _(`src/utils/periodStats.ts:98–102`, `src/components/AuswertungTab.tsx:139–143`)_
- **AC-4:** Für VIX, VXV, VVIX, SPX, WTI, Gas und VIX/VXV zeigt jeder Zeitraum Ø sowie Minimum–Maximum; fehlende Tageswerte zählen nicht mit, ohne jeden Wert steht „—“. _(`src/utils/periodStats.ts:86–93`, `src/components/AuswertungTab.tsx:147–159`)_
- **AC-5:** Distribution Days: je Zeitraum der Durchschnitt für SPX und für NDX. _(`src/components/AuswertungTab.tsx:160–164`)_
- **AC-6:** Ohne Tagesdaten erscheint „Noch keine Tagesdaten erfasst …“ mit Verweis auf „Marktwerte holen“. _(`src/components/AuswertungTab.tsx:126–131`)_
- **AC-7:** Je Zeitraum lässt sich eine Pareto-Notiz schreiben; Speichern ersetzt die frühere Notiz desselben Zeitraums, darunter steht „Zuletzt gespeichert: …“. _(`src/components/AuswertungTab.tsx:66–74, 189–192`)_

### KI-Entwurf

- **AC-8:** „KI-Entwurf erstellen“ schickt die Daten des Zeitraums an die KI; der Entwurf erscheint im Textfeld und wird **sofort automatisch gespeichert**, ohne Rückfrage und ohne extra Klick auf „Speichern“. _(`src/components/AuswertungTab.tsx:39–64`)_
- **AC-9:** Fehlt der Gemini-Schlüssel, kommt „Gemini API-Schlüssel ist nicht konfiguriert.“; ohne Tagesdaten „Keine Tagesdaten für diesen Zeitraum vorhanden.“ _(`server.ts:148–153`)_
- **AC-10:** Die KI begründet Kaufen/Kaufverbot ausschließlich mit den sechs Schranken der Regel-Matrix; Kursbewegungen sind nie ein Sperrgrund. Bei Distribution Days nennt sie immer die Quelle (Yahoo/manuell = harte Sperre, KI/Schätzung = nur Warnung). Der Text hat vier Abschnitte: Markt, Regel-Check, Pareto-Kern, Learning. _(`server.ts:155–206`)_
- **AC-11:** Die KI versucht nacheinander `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`; scheitern alle, erscheint „Analyse fehlgeschlagen“. _(`server.ts:209–229`, `src/components/AuswertungTab.tsx:59–60`)_
- **AC-14:** Die KI wertet zusätzlich die **Wirkung auf Depot und Trades** im Zeitraum aus: Käufe und Verkäufe, realisierter Gewinn/Verlust, und ob an ROT-Tagen gekauft wurde (Disziplin). _(neu, noch ohne Beleg im Code)_

### Erträgnisaufstellung

- **AC-12:** Verkäufe werden je Kalenderjahr und Depot zusammengefasst: Anzahl, Gewinne, Verluste, Netto und gebuchte KESt; das neueste Jahr steht oben. _(`src/components/Ertraegnisaufstellung.tsx:63–111`)_
- **AC-13:** Gewinne und Verluste werden pro Depot verrechnet, nicht depotübergreifend; je Depot steht die Steuermethode (FIFO/Durchschnitt), bei verschiedenen Methoden „gemischt“. _(`src/components/Ertraegnisaufstellung.tsx:9–10, 89–92`)_

## Out of Scope (später)

- Dashboard-Grafiken (Diagramme der Kennzahlen je Zeitraum) — vom Nutzer für später gewünscht; kommt über `/refine MR-9` und ein Design, sobald es dran ist. _(2026-10-22)_

## Open Questions

- **Abweichung (AC-8):** Code legt den KI-Entwurf nur ins Textfeld; gespeichert wird erst per Klick auf „Speichern“ (`src/components/AuswertungTab.tsx:57, 193–198`). AC-8 verlangt automatisches Speichern. Gefunden 2026-10-22.
- **Fehlt (AC-14):** Die KI bekommt heute nur Marktdaten, keine Trades (`src/components/AuswertungTab.tsx:45–50`). Gefunden 2026-10-22.
- [ ] **Datenschutz (AC-14):** Damit gehen persönliche Finanzdaten (Käufe, Verkäufe, Gewinne) an Google Gemini. Vor dem Bau `/dsgvo MR-9` ausführen.
- [ ] **Modelle (AC-11):** `gemini-2.0-flash` und `gemini-1.5-flash` sind möglicherweise abgekündigt — `/qa` prüft die Erreichbarkeit.

_Continues at: neue Kriterien Quartal & Jahr (ab AC-15). Run /reverse-spec MR-9 to resume._
