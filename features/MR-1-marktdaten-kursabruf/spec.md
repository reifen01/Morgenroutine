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

### Abruf in der App

- **AC-8:** „Marktwerte holen“ fragt Kurse und Distribution Days gleichzeitig ab; scheitern die Distribution Days, kommen die Kurse trotzdem an und die Distribution Days behalten ihren bisherigen Wert. _(`src/components/MorgenroutineTab.tsx:282–350`)_
- **AC-9:** Liefert Yahoo keinen S&P 500 (`^GSPC`), wird der SPX als SPY × 10 gesetzt. _(`src/components/MorgenroutineTab.tsx:322–330`)_
- **AC-10:** Alle Kurse werden in Euro angezeigt; Dollar-Kurse werden mit dem EUR/USD-Kurs umgerechnet. Liegt dieser außerhalb von 0,5 bis 2, gilt er als unplausibel und reine Dollar-Werte bekommen keinen Kurs. _(`src/utils/kursAbruf.ts:52–54`, `src/utils/yahooMapping.ts:219–222`)_
- **AC-11:** Ist eine Aktie an mehreren Börsen notiert, gewinnt der frischeste Kurs; liegen die Kurse höchstens 5 Minuten auseinander, wird die Euro-Notierung bevorzugt. Beim Kurs steht die Quelle (Börse, Uhrzeit, ggf. Umrechnungskurs). _(`src/utils/yahooMapping.ts:224–245`)_
- **AC-12:** Bei einem Fehler erscheint „Live-Abruf fehlgeschlagen“ mit der Meldung des Servers; die bisherigen Werte bleiben stehen. _(`src/components/MorgenroutineTab.tsx:399–407`)_
- **AC-13:** Bei Erfolg erscheint „Live-Daten geladen – N Werte aktualisiert“, und der Zeitpunkt des letzten Abrufs wird gespeichert. _(`src/components/MorgenroutineTab.tsx:385–398`)_
- **AC-14:** „Aktualisieren“ im Depot holt nur Kurse — keine Ampel-Werte, kein Tages-Snapshot. _(`src/utils/kursAbruf.ts:100–120`)_

## Open Questions

_Keine Abweichungen bisher._

_Continues at: Block 3 von 3 (Historie & lokaler Cache, ab AC-15). Run /reverse-spec MR-1 to resume._
