# App-Hülle & Navigation

_Von `/init` am 18.10.2026 aus `docs/codebase/architecture.md` → Shared shell übernommen (Stand `ef921bc`). Struktur, nicht Gestaltung; Farben und Schrift stehen in `docs/design-system.md`._

## Owning feature

Owner: **MR-12 App-Hülle, Onboarding & PWA** — trägt die Akzeptanzkriterien der Hülle. Änderungen am Rahmen laufen über `/refine MR-12`.

## Top-Level Areas

Eine Seite, kein Router; der aktive Bereich ist ein Zustand in `src/App.tsx`. Vier Haupt-Tabs in der Leiste (`src/App.tsx:700-753`), zwei davon mit einer zweiten Reiterzeile.

| Bereich | Was der Nutzer dort tut | Sichtbar für | Owning feature |
|---|---|---|---|
| **Morgen** (`morgenroutine`) | Tageswerte holen, Kaufampel und Blasen-Ampel lesen, Snapshot schreiben | alle | MR-2 (Screen), MR-1, MR-13 |
| **Depot** (`journal`) | Bestand, Aufteilung, Journal, Depots/Besitzer, Watchlist-Block | alle | MR-3 (Screen), MR-4, MR-7 |
| **Analyse** → 🔎 Screener (`screener`) | Externen Screener nutzen, Treffer in Watchlist | alle | MR-8 |
| **Analyse** → 📊 Auswertung (`auswertung`) | Wochen/Monate auswerten, Notizen, Erträge | alle | MR-9 |
| **Analyse** → 🎯 Kaufziele (`kaufziele`) | Wächter-Positionen und Stops pflegen | alle | MR-5 |
| **Analyse** → 💵 Cash (`cash`) | Cash je Depot prüfen | alle | MR-6 |
| **Analyse** → 🧮 Rechner (`rechner`) | Positionsgröße und Stop rechnen | alle | MR-7 |
| **System** → 🎓 Regeln & Coach (`regelwerk`) | Handbuch lesen, Coach fragen | alle | MR-10 |
| **System** → 🗂️ Workspace & Backup (`workspace`) | Backup, Demo, Reset, App-Link | alle | MR-11 |

Reihenfolge der zweiten Zeile unter Analyse: Screener · Auswertung · Kaufziele · Cash · Rechner (`ANALYSE_REITER`, `src/App.tsx:51-57`). Klick auf „Analyse" öffnet Screener, Klick auf „System" öffnet Regeln & Coach.

## Layout Regions

- **Header** (`src/components/CompactHeader.tsx`): Logo-Button (Update-Check), Titel, Badge „Update verfügbar", Backup-Badge (ab 7 Tagen), Routine-Datum, „?"-Hilfe, Bereitschafts-Punkt.
- **Tab-Leiste** (`<nav>`, `src/App.tsx:700-753`): vier Buttons mit Icon, aktiv = `border-b-2 border-slate-800`; zweite Reiterzeile als Pillen unter Analyse und System.
- **Content** (`<main>`, `max-w-7xl`, scrollt): der aktive Tab.
- **Mobile:** gleiche Leiste, kein Burger, Karten randlos bis zum Bildschirmrand; PWA `display: standalone` mit Safe-Area-Padding.

## Page Pattern

- **Seitenkopf:** Block-Titel `uppercase tracking-wide` mit Emoji-Präfix; primäre Aktion als Button im Block (z. B. „🌐 Jetzt abrufen").
- **Ladezustand:** Spinner-Icon im Button bzw. in der Karte (`Loader2`), Text „lädt…".
- **Leerzustand:** Hinweistext in der Karte („Noch keine Käufe"), Demo-Daten über System → Workspace.
- **Fehlerzustand:** globaler Toast oben rechts (`src/App.tsx:557-568`, 4 s, Typen success/warning/error); Render-Fehler → `ErrorBoundary` mit Neuladen und „Caches leeren".
- **Feedback:** derselbe Toast; irreversible Aktionen über `window.confirm`.
- **Tab-übergreifende Sprünge:** `rechnerVorlage` (Kaufziele/Watchlist → Rechner), `verkaufVorlage` (Kaufziele → Depot), Ereignis `morgenroutine:handbuch` (Hilfe-Buch → Handbuch mit Zurück), `helpSectionForTab` (Header-„?" → passender Abschnitt).

## Auth States

- **Kein Login, keine Rollen.** Die Hülle ist für alle gleich. Einziger Zustandsunterschied: das Onboarding-Overlay vor dem ersten Durchlauf (`morgenroutine_onboarding_done`).

## Shell Components

| Komponente | Datei | Zweck |
|---|---|---|
| `App` | `src/App.tsx` | Zustand, Persistenz, Tab-Leiste, Overlays, Modals |
| `CompactHeader` | `src/components/CompactHeader.tsx` | Kopfzeile |
| `HelpModal` | `src/components/HelpModal.tsx` | Handbuch-Hilfe (`HANDBUCH.md`) |
| `OnboardingScreen` | `src/components/OnboardingScreen.tsx` | Erststart-Tour |
| `PWAInstallPrompt` / `PWAUpdatePrompt` | `src/components/PWA*.tsx` | Install- und Update-Banner |
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | Fehlerseite |
| `HilfeLink` | `src/components/HilfeLink.tsx` | Buch-Button → Handbuch |

---

_Lebendes Dokument. Fügt `/architecture` einen Nav-Eintrag oder ein Muster hinzu, wird diese Karte zuerst aktualisiert; Verhaltensänderungen der Hülle gehen über `/refine MR-12`._
