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

## Out of Scope (später)

- Dashboard-Grafiken (Diagramme der Kennzahlen je Zeitraum) — vom Nutzer für später gewünscht; kommt über `/refine MR-9` und ein Design, sobald es dran ist. _(2026-10-22)_

## Open Questions

_Keine Abweichungen bisher._

_Continues at: Block 2 von 2 (KI-Entwurf & Erträgnisaufstellung, ab AC-8), dann die neuen Kriterien Quartal & Jahr. Run /reverse-spec MR-9 to resume._
