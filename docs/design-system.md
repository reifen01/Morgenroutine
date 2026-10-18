# Design-System

_Von `/init` am 18.10.2026 aus dem Code gelesen (`docs/codebase/architecture.md` → Design system, `src/index.css`, `vite.config.ts`, `index.html`). Das ist der Ist-Zustand, kein Entwurf; der Nutzer korrigiert, was nicht stimmt. `/build` wendet es an, ohne nachzufragen._

## Grundlage

- **Styling:** Tailwind CSS v4 über `@tailwindcss/vite`; Utility-Klassen direkt im JSX. Keine Komponentenbibliothek, keine CSS-Module, keine `tailwind.config`.
- **Tokens:** nur Schrift-Tokens in `src/index.css` (`@theme`): `--font-sans` Inter, `--font-display` Space Grotesk, `--font-mono` Fira Code. Fonts per Google-Fonts-Link in `index.html`, vom Service Worker gecacht.
- **Icons:** `lucide-react`. **Charts:** `recharts` (nur `DepotCurveChart`, derzeit nicht gerendert). **Markdown:** `react-markdown` + `remark-gfm`.

## Farben (Ist-Zustand)

- Palette: Tailwind **slate** für Flächen und Text; Akzente **amber** (Warnung/GELB), **emerald** (GREEN/positiv), **rose** (RED/negativ).
- App-Hintergrund `#F4F4F7` (`App.tsx`, Manifest `background_color`), Marken-/Theme-Farbe `#1e293b` (slate-800, `theme_color`).
- Lesbarkeit: `src/index.css:51-56` dunkelt `text-slate-300/400/450/500` global ab.
- **Dark Mode: nicht definiert.** Die App ist nur hell. Ein Dark Mode wäre ein eigenes Vorhaben über `/refine MR-12`.
- Keine reinen `#000`/`#fff`-Texte; Weiß nur als Kartenfläche `bg-white`.

## Typografie

- Fließtext Inter; Überschriften Space Grotesk (`font-display`); Zahlen und Kennwerte Fira Code (`font-mono`).
- Block-Titel klein, `uppercase tracking-wide`, mit Emoji-Präfix; Kennzahlen groß in Mono.
- Zahlenformat de-DE über `formatAccounting` / `toLocaleString("de-DE")` (`src/utils/mathUtils.ts`), Datum DD.MM.YYYY.

## Radius, Abstand, Erhebung

- Karten: `bg-white border border-slate-200 rounded-3xl shadow-sm`; auf dem Handy randlos (`src/index.css:62-68`).
- Unter-Reiter: Pillen `rounded-xl`, aktiv `bg-slate-800 text-white`.
- Haupt-Tabs: `border-b-2 border-slate-800` als Aktivmarkierung.
- Trennung von Flächen über Rahmen und leichten Schatten, nicht über starke Elevation.

## Komponenten-Konventionen

- Buttons: `rounded-xl`, primär `bg-slate-800 text-white`, sekundär `border border-slate-200`.
- Formularfelder: `rounded-xl border border-slate-200`, Zahlenfelder in Mono; Komma-Eingabe wird akzeptiert (`parseCleanFloat`).
- Ampel-Punkte: farbiger Kreis (emerald/amber/rose) vor dem Label, Trendpfeil rechts (`TrendArrow`).
- Lade-, Leer- und Fehlerzustände: siehe `docs/app-shell.md` → Page Pattern.
- Hover- und Fokus-Zustände: **nicht systematisch vorhanden** — Tailwind-`hover:` nur punktuell, keine sichtbaren `focus-visible`-Stile. Offener Punkt für MR-12.

## Mobile / PWA

- Viewport ohne Zoom (`user-scalable=no`), Safe-Area-Insets, `overscroll-behavior: none` im Standalone-Modus (`src/index.css:9-40`).
- Manifest: `display: standalone`, `lang: de`, Icons 16 bis 512 px unter `public/`.

---

_Lebendes Dokument. Was hier fehlt (Dark Mode, Fokus-Stile, Farb-Tokens), ist nicht erfunden, sondern als offen markiert._
