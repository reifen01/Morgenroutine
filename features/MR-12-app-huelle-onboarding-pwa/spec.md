# MR-12 · App-Hülle, Onboarding & PWA

> Reconstructed from code, confirmed 2026-10-23. This feature was built before the kit's chain existed; there is no tasks.md and none is expected. The QA report is what verifies it.
>
> Aus dem Code rekonstruiert und am 23.10.2026 bestätigt. Das Feature entstand vor der Kit-Kette; es gibt keine tasks.md und es wird keine erwartet. Geprüft wird es über den QA-Report.

## Zweck

Liefert die App als installierbare PWA aus: Onboarding beim ersten Start, Installations- und Update-Hinweise, Kopfzeile mit Build-Version, Fehlerseite, Handbuch-Hilfe und Diagnose-Endpunkt.

## User Stories

- Als neuer Nutzer möchte ich beim ersten Start kurz erfahren, was die App tut und was nicht, damit ich sie richtig einsetze.
- Als Nutzer am iPhone möchte ich neue Versionen ohne Umwege bekommen, damit ich immer mit dem aktuellen Stand arbeite.

## Acceptance Criteria

### Onboarding, Installation & Updates

- **AC-1:** Das Onboarding erscheint nur beim allerersten Start; einmal durchlaufen, kommt es nie wieder. _(`src/App.tsx:560, 664`, `src/components/OnboardingScreen.tsx:67–70`)_
- **AC-2:** Das Onboarding zeigt vier Schritte: „Willkommen“ (alle Daten bleiben auf dem Gerät), „Dein Portfolio“, „Täglich 5 Minuten“, „KI-Coach inklusive“. Schritt 3 lautet: „Öffne die App jeden Morgen vor der Börse. Sie prüft, ob dein Regelwerk heute Käufe erlaubt und ob eine deiner Positionen ihren Stop erreicht hat. Die Entscheidung triffst du.“ _(`src/components/OnboardingScreen.tsx:14–34`)_
- **AC-3:** Läuft die App noch nicht installiert, folgt als letzter Schritt „App installieren?“ — unter Android mit dem Installationsdialog, am iPhone mit Anleitung über das Teilen-Menü; ist sie installiert, entfällt der Schritt. _(`src/components/OnboardingScreen.tsx:60–87, 111`)_
- **AC-4:** Der Installations-Banner erscheint nicht in der installierten App; nach „Später“ bleibt er 7 Tage weg; am iPhone erscheint er nach 3 Sekunden. _(`src/components/PWAInstallPrompt.tsx:14–70`)_
- **AC-5:** Beim Start der App **und jedes Mal, wenn sie aus dem Hintergrund zurückkommt**, sucht sie sofort nach einer neuen Version, zusätzlich alle 30 Minuten. Gibt es eine, erscheint „Neue Version verfügbar“ mit „Jetzt aktualisieren“ (lädt neu) von selbst — mehrmaliges Tippen auf das Logo ist nicht nötig; das X schließt den Hinweis. _(`src/usePWAUpdate.ts:4–40`, `src/components/PWAUpdatePrompt.tsx`)_
- **AC-6:** Die Kopfzeile zeigt die Build-Version; ein Klick sucht nach Updates bzw. spielt ein vorhandenes ein. _(`src/components/CompactHeader.tsx:47–67`)_
- **AC-7:** Stürzt die Oberfläche ab, erscheint statt eines weißen Bildschirms eine Fehlerseite mit „Neu laden“ und einem Knopf, der nur die App-Zwischenspeicher leert — nie die Nutzerdaten. _(`src/components/ErrorBoundary.tsx:22–50`)_

## Open Questions

- **Abweichung (AC-2):** Code sagt in Schritt 3 „die App sagt dir, ob du kaufen, halten oder verkaufen solltest“ (`src/components/OnboardingScreen.tsx:28`) — widerspricht „Keine Anlageberatung“ (PRD → Nicht-Ziele, MR-9 AC-23). AC-2 verlangt den neuen Text. Gefunden 2026-10-23.
- **Abweichung (AC-5):** Code prüft nur beim echten Neustart und danach alle 30 Minuten (`src/usePWAUpdate.ts:22–31`); am iPhone wird die installierte App beim Zurückholen aus dem Hintergrund nicht neu geladen, ein Update wird daher erst nach Schließen, Neustart und mehrmaligem Tippen aufs Logo sichtbar. AC-5 verlangt die Prüfung auch beim Zurückkehren in den Vordergrund. Gefunden 2026-10-23.

_Continues at: Block 2 von 2 (Handbuch-Hilfe, Ping, SPA-Fallback, ab AC-8), dann neues Kriterium „Keine Anlageberatung“ beim ersten Start. Run /reverse-spec MR-12 to resume._
