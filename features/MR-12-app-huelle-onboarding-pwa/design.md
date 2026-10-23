# MR-12 — Technisches Design

> Das WIE zu `spec.md`. Zwei Leser: der Nutzer (gibt frei) und `/build` (baut danach). Kein Code, aber genau.
> MR-12 läuft bereits produktiv (Status `Spec'd`). Dieses Design beschreibt den Bestand und **drei Änderungen**: Onboarding-Text (AC-2), Update-Prüfung (AC-5), Hinweis „Keine Anlageberatung“ (AC-12). Alle übrigen ACs bleiben unverändert.

## Bestand (unverändert)

| AC | Wo es heute lebt |
| --- | --- |
| AC-1, AC-3 | `src/components/OnboardingScreen.tsx`, eingeblendet aus `src/App.tsx` solange `morgenroutine_onboarding_done` fehlt |
| AC-4 | `src/components/PWAInstallPrompt.tsx`, Sperre über `pwa_install_dismissed` |
| AC-6 | `src/components/CompactHeader.tsx` (Logo-Knopf), Logik `handleCheckForUpdate` in `src/App.tsx` |
| AC-7 | `src/components/ErrorBoundary.tsx` |
| AC-8, AC-9 | `src/components/HelpModal.tsx`, Inhalt aus `HANDBUCH.md` |
| AC-10, AC-11 | `server.ts` (`/api/ping`, SPA-Fallback), Vercel-Einstieg `api/index.ts` |

## Component Structure

```
App (src/App.tsx)
+-- AnlageHinweis            NEU – Vollbild, vor allem anderen, nur bis „Verstanden“
+-- OnboardingScreen         geändert – Text von Schritt 3
|   +-- 4 Info-Schritte
|   +-- Schritt „App installieren?“ (nur wenn nicht installiert)
+-- CompactHeader            unverändert (Logo = Update-Prüfung von Hand)
+-- PWAUpdatePrompt          unverändert (Banner „Neue Version verfügbar“)
+-- PWAInstallPrompt         unverändert
+-- HelpModal                unverändert; zeigt den neuen Handbuch-Abschnitt
+-- ErrorBoundary            unverändert
```

**Reihenfolge beim allerersten Start:** Hinweis → Onboarding → App. Wer das Onboarding schon kennt (bestehende Installationen), sieht beim nächsten Start **nur** den Hinweis, einmal.

## Änderung 1 — Onboarding-Text (AC-2)

- Schritt 3 („Täglich 5 Minuten“) bekommt wörtlich den Text aus AC-2: „Öffne die App jeden Morgen vor der Börse. Sie prüft, ob dein Regelwerk heute Käufe erlaubt und ob eine deiner Positionen ihren Stop erreicht hat. Die Entscheidung triffst du.“
- Titel, Icon und die anderen Schritte bleiben.

## Änderung 2 — Update-Prüfung (AC-5)

**Ursache des heutigen Verhaltens** (gefunden beim Design): Die App ist auf „Update erst nach Rückfrage“ eingestellt (`registerType: 'prompt'` in `vite.config.ts`), gleichzeitig aber so, dass sich eine neue Version **sofort selbst aktiviert** (`skipWaiting` und `clientsClaim`). Die neue Version wartet dadurch nie auf die Rückfrage: Der Banner „Neue Version verfügbar“ erscheint oft gar nicht, und die Logo-Prüfung meldet „Bereits aktuell“, während die Seite noch den alten Stand zeigt. Erst ein kompletter Neustart lädt den neuen Stand. Dazu kommt: Am iPhone wird die installierte App beim Zurückholen aus dem Hintergrund nicht neu geladen, die nächste automatische Prüfung kommt erst nach 30 Minuten.

**Neues Verhalten:**
1. Die neue Version **wartet**, bis der Nutzer „Jetzt aktualisieren“ tippt — `skipWaiting` und `clientsClaim` entfallen in `vite.config.ts`. Damit erscheint der Banner verlässlich.
2. **Geprüft wird:**
   - sofort, wenn die App startet;
   - jedes Mal, wenn die App wieder sichtbar wird (aus dem Hintergrund zurück, Tab-Wechsel zurück);
   - weiterhin alle 30 Minuten, solange sie offen ist.
3. **Drosselung:** höchstens eine Prüfung pro 60 Sekunden, damit schnelles Hin- und Herwechseln den Server nicht belastet. Die Prüfung von Hand über das Logo ist davon ausgenommen.
4. „Jetzt aktualisieren“ aktiviert die wartende Version und lädt neu (wie heute). Das X schließt den Banner; beim nächsten Sichtbarwerden erscheint er wieder, solange die neue Version wartet.
5. Die Logo-Prüfung meldet „Update gefunden“, sobald eine Version **wartet oder gerade lädt** (wie heute), und zeigt dann auch den Banner.

**Fehlerfall:** Ohne Netz schlägt die Prüfung still fehl; kein Hinweis, die App läuft mit dem vorhandenen Stand weiter.

## Änderung 3 — Hinweis „Keine Anlageberatung“ (AC-12)

- **Vollbild-Seite** im Stil des Onboardings (gleicher Hintergrund, gleiche Kartenbreite), vor allem anderen, ohne Schließen-X.
- **Inhalt:** Überschrift „Wichtiger Hinweis“, darunter wörtlich: „Keine Anlageberatung — nur zu Informations- und Lernzwecken. Alle Entscheidungen triffst du selbst.“ Ein Knopf: „Verstanden“.
- **„Verstanden“** speichert die Bestätigung und blendet die Seite aus; danach folgt das Onboarding, falls es noch nicht durchlaufen ist.
- **Handbuch:** Ein neuer Abschnitt „Hinweis“ am Ende von Kapitel 1 „Überblick“ in `HANDBUCH.md` mit demselben Text — damit über das „?“ jederzeit nachlesbar.

## Code Structure

| Modul / Pfad | Aufgabe und Schnittstelle | Darf verwenden |
| --- | --- | --- |
| `src/components/AnlageHinweis.tsx` (neu) | Zeigt den Hinweis; meldet „bestätigt“ an den Aufrufer zurück | React, `lucide-react` (Icon), wie `OnboardingScreen` |
| `src/components/OnboardingScreen.tsx` | Nur der Text von Schritt 3 ändert sich | — |
| `src/App.tsx` | Liest das neue Merkmal beim Start; zeigt `AnlageHinweis` vor `OnboardingScreen` | bestehendes Muster wie `onboardingDone` |
| `src/usePWAUpdate.ts` | Prüft beim Start, bei Sichtbarwerden (gedrosselt) und alle 30 min | `virtual:pwa-register` (bestehend) |
| `vite.config.ts` | `skipWaiting` und `clientsClaim` entfernen | — |
| `HANDBUCH.md` | Abschnitt „Hinweis“ in Kapitel 1 | — |

Keine neuen Ebenen, keine neuen Hilfsdateien außer `AnlageHinweis.tsx`.

## Footprint

- **Code und Tests:** `src/components/AnlageHinweis.tsx` (neu), `src/components/OnboardingScreen.tsx`, `src/App.tsx`, `src/usePWAUpdate.ts`, `vite.config.ts`, `HANDBUCH.md`. Tests: keine (kein Test-Runner im Projekt, TD-26); Prüfung über `npm run lint`, `npm run build` und `/qa` gegen die laufende App.
- **Migrationen, Tabellen und Zugriffsregeln:** keine.
- **Umgebungsvariablen:** keine.
- **Pakete:** keine neuen.
- **Anbindungen:** Service Worker / PWA-Update (Vercel liefert die neue Version aus), App-Start in `src/App.tsx`.

## Data Model

Ein neues Merkmal im Browser:

```
morgenroutine_hinweis_bestaetigt
- Inhalt: Zeitpunkt der Bestätigung (Datum und Uhrzeit, ISO-Format), Text
- Fehlt es → Hinweis wird gezeigt
- Gehört zu: diesem Gerät / diesem Browser, kein Personenbezug
- Gespeichert in: localStorage
- Bleibt bis: „Alles löschen“ (MR-11 löscht alle morgenroutine_*-Schlüssel) — danach erscheint der Hinweis wieder, wie beim ersten Start
- Nicht im Backup (wie das Onboarding-Merkmal)
```

Unverändert: `morgenroutine_onboarding_done`, `pwa_install_dismissed`.

## Behaviors & Access

Keine Server-Änderung. `/api/ping` und SPA-Fallback bleiben wie in AC-10, AC-11.

## Dependencies

Keine neuen Pakete.

## Settings the user makes

none

## Technical Decisions

| Entscheidung | Begründung | Alternative | Nachteil | Datum |
| --- | --- | --- | --- | --- |
| Codebase-Karte auf `ef921bc`; seither neu: `BitcoinKurzfrist.tsx`, `BlasenAmpel.tsx`, `bitcoinKurzfrist.ts`, `blasenAmpel.ts` (MR-19/MR-13, als Nachträge in der Karte), `DepotKopf.tsx`, `ModulKopf.tsx`, `kursAbruf.ts` (Hilfsmodule, keine Routen) | Keine neue Route, kein Auth-Pfad, nichts davon berührt MR-12 | `/map --refresh` vorher | — | 2026-10-23 |
| `skipWaiting`/`clientsClaim` entfernen, Modus „prompt“ behalten | Nur so wartet die neue Version auf „Jetzt aktualisieren“ und der Banner erscheint verlässlich; die alten Einstellungen widersprechen dem gewählten Modus | Modus „autoUpdate“ (lädt neu, sobald eine Version da ist) | Ein Tipp mehr für den Nutzer; dafür wird nie mitten in einer Eingabe neu geladen | 2026-10-23 |
| Prüfen bei Sichtbarwerden, gedrosselt auf 1× pro 60 s | Am iPhone ist „aus dem Hintergrund zurück“ der eigentliche Morgen-Start; ohne Drosselung bei jedem Wechsel eine Anfrage | Nur kürzeres Intervall (z. B. 5 min) | Minimal mehr Anfragen an Vercel beim Wechseln; vernachlässigbar | 2026-10-23 |
| Eigenes Merkmal für den Hinweis statt Onboarding-Merkmal mitbenutzen | Bestehende Installationen (Onboarding schon erledigt) sehen den Hinweis so trotzdem einmal | Hinweis als erster Onboarding-Schritt | Ein localStorage-Schlüssel mehr | 2026-10-23 |
| Hinweis als eigene Komponente vor dem Onboarding | Er muss auch ohne Onboarding erscheinen (siehe oben) und darf nicht übersprungen werden | Toast oder Banner | Ein Tipp mehr beim ersten Start | 2026-10-23 |

## Open Questions

- [ ] Nach dem Entfernen von `skipWaiting` braucht die **erste** Umstellung einmal noch den alten Weg (App schließen und neu starten), weil die heute installierte Version die neue Logik noch nicht kennt. Ab dann gilt AC-5. → beim Release dem Nutzer sagen.
