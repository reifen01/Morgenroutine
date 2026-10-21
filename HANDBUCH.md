# Morgenroutine & Handels-Wächter — Handbuch

> Stand: 21. Oktober 2026 · Bedienung der App, Bereich für Bereich.
> Die **Regeln selbst** (Schwellen der Kaufampel, 1-%-Regel, Stop, Handelszeiten, KESt, Blasen-Ampel, Bitcoin, Denkfehler) stehen nur an einer Stelle: **System → Regeln & Coach → Handbuch**. Dieses Dokument erklärt, *wo* du was findest und *wie* du es bedienst.

---

## 1. Überblick

Die App hat vier Bereiche unten in der Leiste:

| Bereich | Wofür |
|---|---|
| **Morgen** | Marktwerte holen, Kaufampel lesen, Blasen-Ampel, Bitcoin-Kurzfrist |
| **Depot** | Depotwert, Bestände, Steuer-Vorschau, Positionen, Journal (Käufe & Verkäufe), Watchlist |
| **Analyse** | Screener · Auswertung · Kaufziele · Cash · Rechner |
| **System** | Regeln & Coach · Workspace & Backup |

Oben in der Kopfzeile: das **Datum der Routine**, das **?** (öffnet dieses Handbuch passend zum Bereich, in dem du gerade bist) und – wenn die letzte Sicherung 7 Tage oder länger her ist – die **Backup-Erinnerung**. Die **Build-Version** steht im App-Logo; bei Fragen immer mit Screenshot.

**Alle Kurse in der App sind in Euro.** US-Kurse werden mit dem aktuellen EUR/USD-Kurs umgerechnet; die App nimmt jeweils den frischesten Kurs aus deutscher und US-Börse.

---

## 2. Tagesablauf

1. **Morgens vor Marktöffnung:** App öffnen (Update-Hinweis bestätigen, falls einer kommt) → **Morgen → 🌐 Marktwerte holen**.
2. **Ampel lesen:** Grün oder Rot? Steht ein Wert knapp vor dem Umschlag (z. B. VIX/VXV nahe 1,00 – Contango oder Backwardation)?
3. **Depot prüfen:** mehrmals am Tag, besonders zur US-Eröffnung und nach Schluss → **Depot → Aktualisieren**.
4. **Kaufen nur im erlaubten Zeitfenster** und nur bei grüner Ampel – Stückzahl und Stop aus dem **Rechner**.
5. **Nach jedem Kauf oder Verkauf:** im Journal buchen und danach **ein neues Backup** ziehen.
6. **Bei Unklarheit:** auf das 📖-Symbol neben einer Überschrift tippen – es springt direkt zur passenden Regel.
7. **Im Screener** prüfen, was in die Watchlist könnte.

---

## 3. Morgen

### Heute starten – Marktwerte holen
- **🌐 Marktwerte holen** holt mit einem Tipp: VIX, VXV, VVIX, S&P 500, WTI-Öl, Erdgas, die **Distribution Days** (S&P 500 und Nasdaq) und die Kurse aller Depot-, Journal- und Watchlist-Werte mit ATR.
- Gleichzeitig wird der **Tageseintrag** für die Auswertung gespeichert.
- Das Schild **LIVE** (grün) bedeutet: Abruf jünger als 30 Minuten. **VERALTET** (gelb): neu holen.
- **🔑 Aktien-Liste laden** spielt eine Backup-Datei ein (siehe System → Backup).

### Marktstimmung & Kaufschranken
- Die **Kaufampel**: jeder Indikator als Zeile mit Wert, Tagesänderung, Trend-Pfeil und Ampelfarbe; antippen für Details, **Alle auf** klappt alle auf.
- Oben die Gesamtaussage (Kaufen erlaubt / Kaufsperre).
- **Distribution Days – Quelle zählt:** Nur Werte aus Yahoo oder von dir manuell eingetragen lösen die Sperre aus. Kommt der Wert aus der KI oder einer Schätzung, erscheint ein **gelber Hinweis** statt einer Sperre – dann den Wert bitte selbst prüfen.
- Schwellen und Begründung: 📖 neben der Überschrift.

### Blasen-Ampel (Sektoren)
- Prüft je Sektor-ETF, ob sich die Branche in zwei Jahren verdoppelt hat (Studie „Bubbles for Fama“).
- **Grün / Gelb / Rot** mit Verlauf. **Sperrt keinen Kauf** – sie ist ein Warnhinweis für Nachkäufe und Stops.

### Bitcoin-Kurzfrist
- Zwei Zeilen: **Hebel** (ist der Perp-Markt überladen? Funding, Open Interest, Long-Quote) und **Zone** (wo steht der Kurs im Power-Law-Kanal).
- Steuert Nachkauf und Stops beim langfristigen Halten, **sperrt nichts**.

### Tages-Eingaben
- Nur nötig, wenn beim Abruf ein Wert fehlt. Die Leiste ist normalerweise zugeklappt.
- **Zur Tages-Eingabe springen** (im gelben Hinweis bei fehlenden Werten) klappt sie auf und springt hin.

---

## 4. Depot

### Depotwert & Aktualisieren
- Ganz oben, groß: **Depotwert**, darunter **Gewinn gesamt** (€ und %), **Heute** (€ und % seit Vortagesschluss) und der **Einstand**.
- **Aktualisieren** holt nur die Kurse für Depot, Journal-Bestände und Watchlist. Ampelwerte und Distribution Days holt weiterhin nur **Morgen → Marktwerte holen**. Darunter steht, wann zuletzt geholt wurde.

### Depots & Besitzer
- Zugeklappte Leiste: eigene Depot-/Broker-Namen (z. B. Flatex.at, DADAT) und Besitzer anlegen. Sie stehen dann in den Formularen zur Auswahl.
- **Namen müssen exakt gleich geschrieben sein** wie in den Buchungen – sonst landen Käufe und Verkäufe nicht beim richtigen Depot.

### Bestände
- **📊 Depot-Übersicht:** Kuchendiagramm mit dem Depotwert in der Mitte, umschaltbar nach **Aktie / Depot / Besitzer**; darunter Gewinn/Verlust je Aktie und die Gewinner/Verlierer von heute.
- Die Bestände werden **aus dem Journal berechnet**: Käufe minus Verkäufe. Stimmt eine Stückzahl nicht, fehlt fast immer ein gebuchter Verkauf.

### Steuer-Vorschau je Depot
- Je Depot ein eigener Block: **Unrealisierte Gewinne**, **Unrealisierte Verluste** (Kursminus noch nicht verkaufter Positionen – **das ist keine Steuer**), **Netto** und die **KESt-Vorschau** (27,5 % auf das Netto).
- Verluste werden nur **innerhalb desselben Depots** automatisch verrechnet; depotübergreifend nur über die Steuererklärung.
- Bei Brokern, die nicht steuereinfach sind, steht ein gelber Hinweis: KESt beim Verkauf selbst erklären.

### Positionen
- Liste im Zeilen-Stil: Kürzel, Name, Kurs mit Tagesänderung, Depot · Besitzer, Gewinn/Verlust, Stück × Ø-Kurs = Wert. Ein **\*** beim Kurs heißt: kein Live-Kurs, der Ø-Kaufkurs ist eingesetzt.
- **Je Depot | Gesamt:** „Gesamt“ fasst dieselbe Aktie über alle Depots zu einer Zeile zusammen. Aufgeklappt siehst du dann die **Aufteilung je Depot** mit eigenem Verkaufen-Knopf (ein Verkauf wird immer in einem bestimmten Depot gebucht).
- Aufgeklappt außerdem: ISIN/WKN, Kurs-Symbol und -Quelle, Steuer-Matching und alle Käufe der Position (bearbeiten/löschen).

### Transaktions-Journal
- Reiter **Alle / Käufe / Verkäufe**, Suche immer sichtbar, weitere Filter hinter **Filter ▾**.
- **Gliedern nach** Depot, Besitzer oder Wertpapier – mit kräftigen Zwischenüberschriften. Gleiche Aktie mit mehreren Buchungen erscheint als graue Leiste zum Aufklappen.
- **Was bedeuten die Symbole?** erklärt: 📥 Kauf, 💸 Verkauf, 🔁 Sparplan, orange „noch x aktiv“ = Kauf teilweise verkauft.
- **+ Kauf buchen**, **+ Verkauf buchen**, **+ Import** (Excel-Tabelle oder JSON, z. B. Sparplan) – Import hängt nur an, bestehende Buchungen bleiben unverändert.

### Kauf und Verkauf buchen
- **Verkauf immer über das Formular buchen** („💸 Position verkaufen“ in der Positionszeile oder „+ Verkauf buchen“). Nur dann werden die verkauften Stück von den Käufen abgezogen.
- **Methode Durchschnitt** (Österreich, so rechnen die Banken): die Stück werden anteilig von allen Käufen abgezogen, der Ø-Einstand der restlichen Stück bleibt gleich.
- **FIFO** verbraucht die ältesten Käufe zuerst – der Ø der Reststücke weicht dann von der Bank ab.
- Einen Verkauf zu bearbeiten oder zu löschen gibt die Stück an die Käufe zurück.
- Kleine KESt-Abweichungen zur Bank (wenige Euro) kommen vom Ø-Einstand der Bank; für die Steuer gilt die Bank.

### Watchlist
- Ganz unten im Depot, standardmäßig offen: Kurs in € und Änderung seit Vortag, Stern für Favoriten.
- Aufgeklappt: ATR, Einstieg, Quelle, **In Rechner laden**, Löschen. **+ Wert hinzufügen** öffnet das Formular.

---

## 5. Analyse

### Screener
- Aktien-Screener nach den Kriterien von **Jens Rabe**, fest in die App eingebaut: Reiter **Watchlist / Scanner / Verlauf**.
- **Watchlist:** Ticker eingeben → **Prüfen**. Je Aktie Ampelpunkt, Urteil (z. B. Rabe-Setup, Earnings abwarten), Kurs und Tagesänderung; aufgeklappt die 8 Kriterien, Kennzahlen, Links (Yahoo, Finviz, TradingView) und das Geschäftsmodell.
- **Scanner:** durchsucht ein Universum (S&P 100, Nasdaq 100, S&P 500 …) mit Filtern.
- **🔔 Änderungen seit …** (in der Watchlist): was sich seit der letzten Prüfung verschlechtert oder verbessert hat; **Gesehen – als neue Basis speichern** setzt den Vergleichspunkt neu.
- **Verlauf:** Tages-Schnappschüsse je Aktie mit Wochen-/Monats-/Jahresauswertung und Erkenntnis-Notizen.
- **In Watchlist + MR** übernimmt Treffer direkt in die Morgenroutine-Watchlist.
- Die Screener-Daten (Liste, Verlauf, Basis, Notizen, Filter) sind **im Backup enthalten**.

### Auswertung & Erträgnisaufstellung
- **Routine-Auswertung:** Wochen- oder Monatsübersicht aus deinen täglichen Abrufen; je Zeitraum eine Pareto-Notiz („Was war wichtig?“) mit KI-Entwurf.
- **Erträgnisaufstellung:** realisierte Gewinne und Verluste je Jahr und Depot mit KESt.

### Kaufziele & Stop-Schutz
- Deine Wächter-Positionen mit **Hartem Anker**, Limit, Tranche und **Stop-Kurs** aus den ATR-Einstellungen.
- **Verkauf buchen** springt ins Depot und öffnet das Verkaufsformular vorbefüllt.

### Cash-Cockpit
- Arbeitendes Kapital, freies Cash und reserviertes Budget je Depot.
- **Noch nicht fertig:** Das Startkapital je Depot ist nicht hinterlegt, die Zahlen sind daher noch nicht aussagekräftig. Das geplante **Cash-Konto mit Ein- & Auszahlungen (MR-18)** löst das.

### Rechner
- **Positionsgröße & Risiko:** Stückzahl und Stop nach der **1-%-Regel**. Suche nach Name, Ticker, WKN oder ISIN übernimmt Kurs und ATR.
- **ATR Stop-Loss-Finder:** rechnet wie der Pine-Script-Indikator in TradingView.
- **Disziplin-Filter:** Psychologie-Check vor jedem Kauf (die 7 Denkfehler).
- **Risikoanalyse:** zeigt das Ergebnis und warnt bei Widersprüchen.

---

## 6. System

### Regeln & Coach
- **Handbuch (Regeln):** durchsuchbar, mit Hintergrund und Quelle – Kaufampel, Distribution-Days-Quellenregel, 1-%-Regel, Stop-Loss, Handelszeiten (Österreich), KESt, Blasen-Ampel, Bitcoin-Kurzfrist, die 7 Denkfehler, Disziplin-Quote. Jedes 📖 in der App springt hierher; **Zurück** bringt dich zum Ausgangsbereich.
- **KI-Coach:** Chat mit dem Trading-Coach, der nach diesem Regelwerk antwortet.

### Backup & Wiederherstellen
- **💾 Backup-Datei erstellen:** speichert alle deine Daten verschlüsselt (PIN oder Passwort) in einer Datei – Depot, Käufe, Verkäufe, Watchlist, Kaufziele, Depots/Besitzer, Startkapital, Tagesverlauf, Lern-Notizen und die Screener-Daten.
- **🔑 Backup-Datei laden:** spielt eine Datei ein und zeigt vorher den Vergleich mit den aktuellen Daten. Ältere Backups bleiben lesbar.
- Die Verschlüsselung läuft nur auf deinem Gerät; die App sieht deinen PIN nie. **PIN gut aufbewahren** – ohne PIN ist die Datei nicht lesbar.
- Die App erinnert oben, wenn die letzte Sicherung 7 Tage oder länger zurückliegt.

### Demo-Daten & Alles löschen
- **Demo-Daten laden** füllt die App mit einem klar markierten Mini-Portfolio – überschreibt deine Werte, vorher Backup!
- **Alle Daten zurücksetzen** löscht alles auf diesem Gerät (inkl. Screener-Daten und gemerkter Auf/Zu-Zustände). Nicht rückgängig zu machen – vorher Backup!

### Installation & Updates
- **iPhone:** App-Link in Safari öffnen → Teilen 📤 → „Zum Home-Bildschirm“ → Hinzufügen. Der Link lässt sich unter Workspace & Backup kopieren.
- Ist eine neue Version live, erscheint ein **Update-Hinweis** – antippen lädt sie.

---

## 7. Module auf- und zuklappen

- Jedes Modul mit dunkler Symbol-Kachel lässt sich **zuklappen**: auf die Überschrift oder den Pfeil rechts tippen. Ebenso die dunklen Leisten (Depots & Besitzer, Depot-Übersicht, Watchlist, Tages-Eingaben).
- Die App **merkt sich**, was du auf- oder zugeklappt hast – auf diesem Gerät, auch nach einem Neustart. So stellst du dir deine eigene Übersicht zusammen.
- Diese Einstellung ist **nicht im Backup** (reine Anzeige).

---

## 8. Deine Daten

- **Alles liegt nur auf deinem Gerät** (im Speicher des Browsers bzw. der installierten App). Es gibt kein Konto und keinen Server, der deine Depotdaten speichert.
- Zwischen Geräten wandern die Daten **nur per Backup-Datei**.
- ⚠️ **Niemals in Safari „Verlauf und Websitedaten löschen“** – das löscht dein komplettes Depot in der App. Vorher immer ein Backup.

---

## 9. Was die App nicht tut

- Keine Broker-Anbindung, keine automatischen Orders – die App bereitet Entscheidungen vor, sie führt sie nicht aus.
- Keine Echtzeit-Kurse; ein kurzer Zwischenspeicher (rund eine Minute) reicht.
- Keine Anlageberatung – die Regeln sind dein Regelwerk.
- Steuerlogik nur für Österreich (KESt 27,5 %).

---

## 10. Bei Problemen

| Symptom | Erste Maßnahme |
|---|---|
| Werte nicht aktuell | Update-Hinweis antippen bzw. App einmal schließen und neu öffnen, dann **Marktwerte holen** |
| Kurs mit **\*** (kein Live-Kurs) | Marktwerte holen bzw. Aktualisieren; bleibt es, Position aufklappen und das Kurs-Symbol prüfen |
| Stückzahl im Depot zu hoch | Fehlt ein Verkauf? Journal → Verkäufe prüfen und den Verkauf über das Formular nachbuchen |
| Distribution Days mit gelbem Hinweis | Quelle war KI/Schätzung – Wert selbst prüfen und unter Tages-Eingaben eintragen |
| Abruf meldet einen Fehler | Fehlertext und Build-Version (im Logo) per Screenshot schicken |
| Daten auf neuem Gerät | System → Workspace & Backup → **Backup-Datei laden** |

**Niemals** Safari-Websitedaten oder den Verlauf löschen, um ein Problem zu beheben.
