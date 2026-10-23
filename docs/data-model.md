# Datenmodell

_Source: `src/types.ts` (führend; die `localStorage`-Schlüssel in `src/App.tsx` speichern genau diese Typen als JSON), ergänzt um `src/utils/backupFile.ts` (Backup-Format) — read by /init on 2026-10-18, aus `docs/codebase/architecture.md` → Data._

> Produkt-Höhe: Entitäten, Beziehungen, Eigentümer. Feldtypen und Details stehen je Feature in dessen `design.md`. Es gibt keine Datenbank: jede Entität ist ein `localStorage`-Schlüssel im Browser des Geräts (Präfix `morgenroutine_`), und alle zusammen bilden den `BackupPayload`, der verschlüsselt als Datei exportiert wird. Der Server hält nichts davon.

## Entitäten

| Entität | Was sie darstellt | Gehört zu / wer sieht sie |
|---|---|---|
| `MarketState` | Die Ampel-Indikatoren des Tages (VIX, VXV, VVIX, SPX, WTI, Gas, Distribution Days mit Quelle) | MR-2; nur dieses Gerät |
| `DailySnapshot` | Ein Datensatz pro Handelstag: Indikatoren, Ratio, Status GREEN/RED | MR-2 schreibt, MR-9 liest |
| `LivePrices` | Aktueller Kurs, ATR und Tagesänderung je Asset-Schlüssel (offener Schlüsselraum) | MR-1 schreibt, alle lesen |
| `PortfolioItem` | Eine Wächter-Position: Harter Anker, Limit, Tranche, Stop-Kurs, Status | MR-5 |
| `PortfolioPurchase` | Ein Kauf als Los: Datum, Kurs, Stück, Kosten, verbleibende Stück, Depot, Besitzer | MR-4 |
| `SoldTradeItem` | Ein realisierter Verkauf mit Gewinn, KESt, Netto, Steuermethode und den verbrauchten Losen | MR-4 schreibt, MR-9 liest |
| `WatchlistItem` | Ein beobachtetes Wertpapier mit Kurs, ATR, Tagesänderung, Quelle | MR-7; MR-8 fügt hinzu |
| `ChecklistItem` | Eine Tranchen-Aufgabe mit Status und Kategorie | MR-3 |
| Depots (`string[]`) | Namen der Broker/Depots | MR-3 |
| Besitzer (`string[]`) | Namen der Depotinhaber | MR-3 |
| Startkapital je Depot (`Record<string, number>`) | Startcash je Depotname | MR-6 |
| `PeriodLearning` | Eine Pareto-Notiz je Woche oder Monat | MR-9 |
| ATR-Parameter (Multiplikator, Länge, Glättung) | Einstellungen des Stop-Rechners | MR-5 |
| Blasen-Monatskurse (Cache) | Monatsschlüsse der Sektor-ETFs, 12 h gültig | MR-13 |
| Bitcoin-Kurzfrist-Rohdaten (Cache) | OKX-Funding, Open Interest, Long-Quote, Tagesschlüsse, Fear & Greed, 30 min gültig | MR-19 |
| Import-Cache, Zeitstempel (letzter Abruf, letzte Änderung, letztes Backup) | Technische Merker | MR-1, MR-11 |
| Onboarding-Flag, Hinweis-Bestätigung („Keine Anlageberatung“), PWA-Install-Sperre | Technische Merker der Hülle | MR-12 |
| Screener-Daten (`rabe.*`: Liste, Verlauf, Basis, Notizen, Filter) | Gespeicherte Daten des eingebauten Aktien-Screeners (`public/screener/`), seit 21.10.2026 im Backup | MR-8 |
| `BackupPayload` → Backup-Datei `MR-BACKUP-1` | Alle obigen Nutzer-Entitäten gebündelt, AES-GCM-verschlüsselt mit PIN oder Passwort | MR-11; die Datei gehört dem Nutzer |

Serverseitig existiert nur `cloud_profiles.json` (Reste der entfernten Google-Anbindung, ohne Aufrufer) sowie flüchtige Caches — beides kein Teil des Produkt-Datenmodells.

## Beziehungen

- Ein **Asset-Schlüssel** (z. B. `tsla`, `btc`) verbindet `LivePrices`, `PortfolioItem`, `PortfolioPurchase`, `SoldTradeItem` und `WatchlistItem`; es gibt keine eigene Asset-Tabelle, nur die Stammdaten in `src/utils/assetRegistry.ts`.
- Ein **Verkauf** verbraucht ein oder mehrere **Käufe** (Lose) über `consumedLots` → `PortfolioPurchase.id`; beim Bearbeiten werden die Lose zurückgegeben.
- Käufe und Verkäufe gehören je zu genau einem **Depot** und einem **Besitzer** (Namen als Referenz); fehlende Depots werden beim Laden aus den Buchungen rekonstruiert.
- **Startkapital je Depot** plus Käufe und Verkäufe ergeben das Cash-Cockpit (MR-6); das geplante Cash-Konto (MR-18) wird hier Ein- und Auszahlungen als eigene Entität ergänzen.
- Ein **DailySnapshot** entsteht aus dem **MarketState** eines Tages; **PeriodLearning** hängt an einer Woche oder einem Monat von Snapshots.
- Der **BackupPayload** enthält alle Nutzer-Entitäten außer `MarketState`, Import-Cache und ATR-Parametern.

## Diagramm

```
Asset-Schlüssel (tsla, btc, …)
  ├─ LivePrices            (Kurs, ATR, Tagesänderung)
  ├─ PortfolioItem         (Wächter-Position, Stop)
  ├─ WatchlistItem
  ├─ PortfolioPurchase ──┐ (Los)
  └─ SoldTradeItem ──────┘ verbraucht Lose
        └─ Depot · Besitzer ── Startkapital je Depot

MarketState (heute) → DailySnapshot (je Tag) → PeriodLearning (je Woche/Monat)

BackupPayload = alle Nutzer-Entitäten → Backup-Datei (verschlüsselt)
```

---

_Lebendes Dokument. Wenn `/architecture` ein Feature entwirft, das eine Entität einführt oder ändert, wird diese Karte zuerst aktualisiert._
