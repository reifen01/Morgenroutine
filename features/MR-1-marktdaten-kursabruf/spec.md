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

### Verlauf & lokaler Zwischenspeicher

- **AC-15:** Beim Öffnen der App werden die Marktwerte der letzten 60 Tage geholt; der Server erlaubt 5 bis 120 Tage, Standard 60. _(`src/App.tsx:156–188`, `server.ts:981`)_
- **AC-16:** Der Server hält den Verlauf 1 Stunde im Zwischenspeicher. _(`server.ts:976–984`)_
- **AC-17:** In den Verlauf kommen nur Handelstage (Tage mit VIX- oder SPX-Wert); der heutige Tag ist nie dabei, weil sein Schlusskurs noch fehlt. _(`server.ts:1016–1024`, `src/utils/historyBackfill.ts:61`)_
- **AC-18:** Fehlende Tage werden neu angelegt; bei vorhandenen Tagen werden nur leere Felder gefüllt — ein erfasster Wert wird nie überschrieben. _(`src/utils/historyBackfill.ts:1–14`)_
- **AC-19:** Fehlt der S&P 500 im Verlauf, wird er als SPY × 10 gesetzt. _(`server.ts:998–1002`)_
- **AC-20:** Kommt etwas hinzu, erscheint „Verlauf ergänzt – N Tage neu, M Tage vervollständigt“; ohne Netz bleibt der Verlauf unverändert und es gibt keine Meldung. _(`src/App.tsx:172–184`)_
- **AC-21:** „📥 Letzten Cache laden“ spielt die zuletzt geholten Werte wieder ein; stammt der Cache von einem früheren Tag, ist das Datum orange markiert. Der Cache enthält alle sechs Ampel-Indikatoren inklusive SPX, die Distribution Days (SPX und NDX) und die Kurse **aller** beim Abruf versorgten Werte (Depot, Journal-Bestände, Watchlist) — keine feste Aktienliste. _(`src/components/MorgenroutineTab.tsx:201–263`, `916–930`)_

## Open Questions

- **Abweichung (AC-21):** Code speichert im Cache fest nur Tesla, ServiceNow, Alibaba und Bitcoin (`src/components/MorgenroutineTab.tsx:215–220`, `242–248`); AC-21 verlangt alle versorgten Werte. Gefunden 2026-10-22.
- **Abweichung (AC-21):** Code speichert im Cache nur VIX, VXV, VVIX, WTI und Gas — SPX und Distribution Days fehlen (`src/components/MorgenroutineTab.tsx:208–214`); AC-21 verlangt sie. Gefunden 2026-10-22.
