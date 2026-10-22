# MR-1 · Marktdaten & Kursabruf

> Reconstructed from code, confirmed 2026-10-22. This feature was built before the kit's chain existed; there is no tasks.md and none is expected. The QA report is what verifies it.
>
> Aus dem Code rekonstruiert und am 22.10.2026 bestätigt. Das Feature entstand vor der Kit-Kette; es gibt keine tasks.md und es wird keine erwartet. Geprüft wird es über den QA-Report.

## Zweck

Holt per Klick die Tageswerte der sechs Ampel-Indikatoren und die Kurse mit ATR und Tagesänderung für Depot und Watchlist, lädt beim Start die Kurshistorie der letzten Wochen nach und hält alles lokal vor.

## User Stories

- Als Anleger möchte ich morgens mit einem Klick alle Marktwerte und Kurse holen, damit ich die Ampel nicht von Hand füllen muss.
- Als Anleger möchte ich, dass ein ausgefallener Datenanbieter nicht den ganzen Abruf scheitern lässt, damit ich trotzdem verlässliche Kurse bekomme.

## Acceptance Criteria

### Live-Abruf am Server

- **AC-1:** Eine Anfrage ohne Symbole wird mit der Meldung „Keine Symbole übergeben.“ abgelehnt. _(`server.ts:653`)_
- **AC-2:** Wird dieselbe Symbol-Liste innerhalb von 60 Sekunden erneut abgefragt, kommt die zwischengespeicherte Antwort; die Erfolgsmeldung zeigt dann „(Cache)“. _(`server.ts:659`, `src/components/MorgenroutineTab.tsx:391`)_
- **AC-3:** Yahoo wird zuerst über `query1`, bei Fehler über `query2` abgefragt. _(`server.ts:537`)_
- **AC-4:** Der Kurs ist der aktuelle Marktpreis; fehlt er, gilt der letzte Tagesschluss. _(`server.ts:694–714`)_
- **AC-5:** Die ATR ist der einfache Durchschnitt der True Range der letzten 14 Tage; bei weniger als 15 Tagesbalken bleibt sie leer. _(`server.ts:562–583`)_
- **AC-6:** Die Tagesänderung in % rechnet gegen den Schlusskurs des Vortags; welcher Balken der Vortag ist, richtet sich nach dem letzten Handelstag. _(`server.ts:716–738`)_
- **AC-7:** Liefert Yahoo für die Frankfurter Notierungen von Tesla, ServiceNow oder Alibaba keinen Kurs, wird Stooq gefragt; der Kurs ist dann als „stooq“ markiert. _(`server.ts:744–764`)_

## Open Questions

_Keine Abweichungen bisher._

_Continues at: Block 2 von 3 (Abruf im Client, AC-8 bis AC-14), dann Block 3 (Historie & lokaler Cache). Run /reverse-spec MR-1 to resume._
