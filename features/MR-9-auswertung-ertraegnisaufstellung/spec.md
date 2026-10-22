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

- **AC-15:** Die Routine-Auswertung lässt sich zusätzlich nach **Quartal** („Q3 / 2026“) und **Jahr** („2026“) zusammenfassen; der Umschalter hat vier Stufen: Woche, Monat, Quartal, Jahr. _(neu, noch ohne Beleg im Code)_
- **AC-16:** Quartal und Jahr zeigen dieselben Kennzahlen wie Woche und Monat (AC-3 bis AC-5) und haben je eine eigene Pareto-Notiz mit KI-Entwurf (AC-7, AC-8, AC-14). _(neu, noch ohne Beleg im Code)_

### KI-Entwurf

- **AC-8:** „KI-Entwurf erstellen“ schickt die Daten des Zeitraums an die KI; der Entwurf erscheint im Textfeld und wird **sofort automatisch gespeichert**, ohne Rückfrage und ohne extra Klick auf „Speichern“. _(`src/components/AuswertungTab.tsx:39–64`)_
- **AC-9:** Fehlt der Gemini-Schlüssel, kommt „Gemini API-Schlüssel ist nicht konfiguriert.“; ohne Tagesdaten „Keine Tagesdaten für diesen Zeitraum vorhanden.“ _(`server.ts:148–153`)_
- **AC-10:** Die KI begründet Kaufen/Kaufverbot ausschließlich mit den sechs Schranken der Regel-Matrix; Kursbewegungen sind nie ein Sperrgrund. Bei Distribution Days nennt sie immer die Quelle (Yahoo/manuell = harte Sperre, KI/Schätzung = nur Warnung). Der Text hat vier Abschnitte: Markt, Regel-Check, Pareto-Kern, Learning. _(`server.ts:155–206`)_
- **AC-11:** Die KI versucht nacheinander `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`; scheitern alle, erscheint „Analyse fehlgeschlagen“. _(`server.ts:209–229`, `src/components/AuswertungTab.tsx:59–60`)_
- **AC-14:** Die KI wertet zusätzlich die **Wirkung auf Depot und Trades** im Zeitraum aus: Käufe und Verkäufe, realisierter Gewinn/Verlust, und ob an ROT-Tagen gekauft wurde (Disziplin). _(neu, noch ohne Beleg im Code)_

### Datenschutz & Hinweise _(aus `/dsgvo MR-9`, 2026-10-22)_

- **AC-17:** An die KI gehen je Trade nur Titel, Datum, Ergebnis in % und ob an einem ROT-Tag gekauft wurde — keine Euro-Beträge, keine Stückzahl, keine Besitzer- oder Depotnamen, keine Notizen, Gedanken oder Ziele. _(Art. 5(1)(c) DSGVO; neu)_
- **AC-18:** Trades fließen nur ein, wenn der Schalter „Trades in KI-Auswertung einbeziehen“ an ist; Standard ist aus. Beim ersten Einschalten erklärt ein Hinweis, was an Google Gemini geht; der Schalter ist jederzeit wieder ausschaltbar und wirkt sofort. Ist er aus, bleibt die KI-Auswertung bei den Marktdaten. _(Art. 6(1)(a), Art. 7 DSGVO; neu)_
- **AC-19:** Ein KI-Entwurf ist sichtbar als „KI-Entwurf (Gemini)“ gekennzeichnet. _(Art. 50 AI Act; neu)_
- **AC-20:** Aus der Auswertung ist eine Datenschutzerklärung erreichbar, die Vercel, Google Gemini und die USA als Exportland nennt. _(Art. 13 DSGVO, Art. 19 Abs. 4 DSG; neu)_
- **AC-21:** Eine einzelne Pareto-Notiz lässt sich löschen. _(Art. 17 DSGVO; neu)_
- **AC-22:** Der Server speichert und protokolliert keine Trade-Daten; Fehlermeldungen enthalten keinen Prompt-Inhalt. _(Art. 5(1)(c), Art. 32 DSGVO; neu)_
- **AC-23:** Unter jedem KI-Entwurf steht „Keine Anlageberatung — nur zu Informations- und Lernzwecken.“; die KI prüft Trades gegen das Regelwerk und gibt keine Kauf- oder Verkaufsempfehlung für einzelne Titel. _(neu)_

### Erträgnisaufstellung

- **AC-12:** Verkäufe werden je Kalenderjahr und Depot zusammengefasst: Anzahl, Gewinne, Verluste, Netto und gebuchte KESt; das neueste Jahr steht oben. _(`src/components/Ertraegnisaufstellung.tsx:63–111`)_
- **AC-13:** Gewinne und Verluste werden pro Depot verrechnet, nicht depotübergreifend; je Depot steht die Steuermethode (FIFO/Durchschnitt), bei verschiedenen Methoden „gemischt“. _(`src/components/Ertraegnisaufstellung.tsx:9–10, 89–92`)_

## Product Decisions

| Entscheidung | Begründung | Datum |
|--------------|------------|-------|
| Quartal und Jahr in der Routine-Auswertung (AC-15, AC-16) | Längere Zeiträume für die Disziplin-Auswertung | 2026-10-22 |
| KI-Entwurf wird automatisch gespeichert (AC-8) | Kein Verlust durch vergessenes „Speichern“ | 2026-10-22 |
| KI wertet Wirkung auf Depot & Trades aus (AC-14), nur per Opt-in und datensparsam (AC-17, AC-18) | Lernen aus den eigenen Trades; Trades gehen an Google, daher Einwilligung und nur das Nötigste | 2026-10-22 |
| „Keine Anlageberatung“-Hinweis und keine Einzeltitel-Empfehlungen (AC-23) | Regelprüfung statt Beratung; Nutzer sind auch fremde Privatanleger | 2026-10-22 |

## Out of Scope (später)

- Dashboard-Grafiken (Diagramme der Kennzahlen je Zeitraum) — vom Nutzer für später gewünscht; kommt über `/refine MR-9` und ein Design, sobald es dran ist. _(2026-10-22)_

## Open Questions

- **Abweichung (AC-8):** Code legt den KI-Entwurf nur ins Textfeld; gespeichert wird erst per Klick auf „Speichern“ (`src/components/AuswertungTab.tsx:57, 193–198`). AC-8 verlangt automatisches Speichern. Gefunden 2026-10-22.
- **Fehlt (AC-14):** Die KI bekommt heute nur Marktdaten, keine Trades (`src/components/AuswertungTab.tsx:45–50`). Gefunden 2026-10-22.
- [x] **Datenschutz (AC-14):** Damit gehen persönliche Finanzdaten an Google Gemini. → `/dsgvo MR-9` ausgeführt, Ergebnis AC-17 bis AC-23, Details in `docs/privacy.md` (2026-10-22)
- [ ] **App-weiter Hinweis (→ MR-12):** Der Nutzer wünscht „Keine Anlageberatung — nur zu Informations- und Lernzwecken“ auch beim ersten Start bzw. bei der Installation der App. Das gehört zum Onboarding (MR-12, noch ohne Spec) — kommt mit `/reverse-spec MR-12` als neues Kriterium dort hinein.
- [ ] **Gemini-Tarif:** Solange der Gratis-Tarif läuft, darf Google Eingaben für eigene Zwecke nutzen; AC-18 (Einwilligung) ist deshalb Pflicht. Empfehlung: bezahlter Tarif + Vercel-Region Frankfurt (siehe `docs/privacy.md` → Offene Punkte).
- [ ] **Modelle (AC-11):** `gemini-2.0-flash` und `gemini-1.5-flash` sind möglicherweise abgekündigt — `/qa` prüft die Erreichbarkeit.
- **Fehlt (AC-15, AC-16):** Code kennt nur Woche und Monat (`src/utils/periodStats.ts:12`, `src/components/AuswertungTab.tsx:109–122`). Gefunden 2026-10-22.
