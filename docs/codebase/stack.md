# Stack

_Mapped by `/map` on 2026-10-18 at commit `296d310`. Stated = steht so in einer Datei; inferred = meine Lesart, zu bestätigen._

## Language and runtime

- **TypeScript ~5.8.2** (`package.json` → `devDependencies.typescript`, stated) für Client **und** Server. `tsconfig.json` (stated): `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit: true`, `allowJs: true`, Alias `@/*` → `./*`. Kein `include`/`files`-Feld, also gilt die Konfiguration für das ganze Repo (inferred).
- **Node.js** als Laufzeit des Servers (`server.ts`, `package.json` → `"dev": "tsx server.ts"`, stated). **Keine Versionspinnung gefunden**: weder `.nvmrc`, `.node-version` noch `engines` in `package.json`. Einziger Hinweis ist `@types/node ^22.14.0` (`package.json`, stated) → Node 22 als Zielversion (inferred). `README.md` nennt nur „Prerequisites: Node.js" (stated).
- **Browser** als zweite Laufzeit für die React-App (`index.html` → `<script type="module" src="/src/main.tsx">`, stated); `tsconfig.json` → `lib: ["ES2022", "DOM", "DOM.Iterable"]` (stated).
- **Ein Runtime, keine Layer.** `.ai-eng-kit` → `layers: []` (stated). Gesucht nach zweiten Runtimes (`pyproject.toml`, `go.mod`, `composer.json`, eigenständige Ordner mit eigenem Manifest): keine gefunden. `api/` ist kein eigener Layer, sondern der Vercel-Einstieg in denselben Express-Server (`api/index.ts` → `await import('../server.js')`, stated — siehe „How it goes live").

## Framework

- **App (Client): React 19.0.1** (`package.json` → `react`, `react-dom` `^19.0.1`, stated), gebaut mit **Vite 6** (`vite ^6.2.3`, stated) über `@vitejs/plugin-react ^5.0.4` (`vite.config.ts` Zeile 2 und 28, stated). Einstieg: `index.html` → `src/main.tsx` → `src/App.tsx` (stated). Single-Page-App ohne Router-Bibliothek: Tab-Navigation lebt im State von `src/App.tsx` (inferred aus der Abhängigkeitsliste — kein `react-router` o. ä. in `package.json`).
- **Backend: Express 4.21.2** (`package.json` → `express ^4.21.2`, stated), eine einzige Datei `server.ts` (1262 Zeilen). Sie trägt alle API-Routen, den Vite-Dev-Middleware-Modus und die statische Auslieferung von `dist/` in Produktion (`server.ts` Zeilen 1233–1262, stated).
- **UI-Styling: Tailwind CSS v4** (`tailwindcss ^4.1.14`, `@tailwindcss/vite ^4.1.14`, stated) — eingebunden als Vite-Plugin (`vite.config.ts` Zeile 29) und per `@import "tailwindcss"` plus `@theme`-Block in `src/index.css` (stated). Keine `tailwind.config.*` und keine `postcss.config.*` vorhanden (gesucht, nicht gefunden — bei Tailwind v4 erwartbar). `autoprefixer ^10.4.21` ist installiert (`package.json`, stated), wird aber nirgends konfiguriert (inferred: ungenutzt).
- **PWA:** `vite-plugin-pwa ^1.3.0` (`package.json`, stated) mit `registerType: 'prompt'`, Workbox-`skipWaiting`/`clientsClaim`, Manifest (`name`, `short_name`, Icons, `lang: 'de'`, `display: 'standalone'`) und Runtime-Caching für Google Fonts — alles in `vite.config.ts` Zeilen 30–87 (stated). Die Service-Worker-Logik im Client liegt in `src/usePWAUpdate.ts` (`registerSW` aus `virtual:pwa-register`, Update-Poll alle 30 Minuten, stated); UI dazu in `src/components/PWAUpdatePrompt.tsx`, `src/components/PWAInstallPrompt.tsx`, `src/components/InstallInstructions.tsx`.
- **Weitere Client-Bibliotheken** (`package.json`, stated): `recharts ^3.8.1` (Charts, laut `HANDBUCH.md` → PR #1 für die Depotkurve), `motion ^12.23.24` (Animation), `lucide-react ^0.546.0` (Icons), `react-markdown ^10.1.0` + `remark-gfm ^4.0.1` (Markdown-Rendering).
- **Herkunft:** Das Projekt stammt aus Google AI Studio (`README.md` → „Run and deploy your AI Studio app", `metadata.json` → `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, `assets/.aistudio/`, `package.json` → `"name": "react-example"`, stated). Der Paketname `react-example` ist der Template-Rest, nicht der Produktname (inferred).

## Backend and data

- **Keine Datenbank, kein BaaS.** `.ai-eng-kit` → `stack.backend: null` (stated). Gesucht nach ORM-Schemas, Migrationsordnern, Supabase/Prisma/Drizzle-Konfiguration und DB-Clients in `package.json`: nichts gefunden.
- **Primäre Datenhaltung: `localStorage` im Browser.** `HANDBUCH.md` → 1.5 „Alles in localStorage — jedes Gerät hat sein eigenes Portfolio" (stated). Die Schlüssel sind über die Komponenten verteilt; die Präfixe sind `morgenroutine_*` (u. a. `morgenroutine_portfolio`, `morgenroutine_purchases`, `morgenroutine_sold_trades`, `morgenroutine_watchlist`, `morgenroutine_daily_history`, `morgenroutine_market_state`, `morgenroutine_checklist`, `morgenroutine_period_learnings`) und `g_workspace_*` (Google-Workspace-IDs und Access-Token, siehe Integrationen) sowie `pwa_install_dismissed` (stated, aus `grep localStorage` über `src/`). **Es gibt keine eine Datei, die das Schema beschreibt** — die Typen der gespeicherten Objekte stehen in `src/types.ts` (124 Zeilen, stated); das ist die beste Quelle für `docs/data-model.md` (inferred).
- **Serverseitig persistiert wird nur eine Datei:** `cloud_profiles.json` im `process.cwd()` des Servers — die „Central Access Box" für Google-Workspace-Profile (Name → PIN im Klartext + `clientId`, `spreadsheetId`, `documentId`, `folderId`), geschrieben von `/api/profiles/save`, gelesen von `/api/profiles/load` (`server.ts` Zeilen 264–350, stated). Die Datei ist nicht im Repo und nicht in `.gitignore`. Auf Vercel ist das Dateisystem einer Function flüchtig, der Speicher also faktisch nur in-memory pro Instanz (inferred; der Code fängt Schreibfehler ab und läuft „in-memory only" weiter, `server.ts` Zeile 290–294, stated).
- **Server-Caches (nur im Prozessspeicher):** Live-Preise 60 s (`livePriceCache`, `server.ts` Zeile 497–499), Distribution Days einmal pro Tag (`cachedDistDays`, Zeile 788), Rate-Limit-Cooldown nach Gemini-429 (`lastRateLimitTime`, `RATE_LIMIT_COOLDOWN_MS` = 5 min, Zeilen 784–785) — alle stated.
- **Export/Backup-Formate:** verschlüsselte Backup-Datei `MR-BACKUP-1` (AES-GCM-256, PBKDF2-SHA256 mit 200k Iterationen, Web Crypto API) in `src/utils/backupFile.ts` und `src/utils/encryption.ts` (stated); Google Sheets/Docs/Drive als optionales Export-Ziel (siehe Integrationen).

## Package manager and scripts

- **npm** — `package-lock.json` mit `lockfileVersion: 3` liegt im Root (stated); `.ai-eng-kit` → `packageManager: "npm"` (stated). Kein `yarn.lock`, `pnpm-lock.yaml` oder `bun.lockb` gefunden.
- Scripts aus `package.json` (verbatim, stated):

| Script | Befehl | Rolle |
|---|---|---|
| `dev` | `tsx server.ts` | **Start** (Entwicklung: Express + Vite-Middleware, stated durch den Namen und `server.ts` Zeile 1235–1243) |
| `build` | `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs` | **Build** (Client nach `dist/`, Server nach `dist/server.cjs`; stated) |
| `start` | `node dist/server.cjs` | **Start in Produktion** auf einem Node-Host (stated durch den Namen; inferred: nicht der Vercel-Pfad, siehe „How it goes live") |
| `clean` | `rm -rf dist` | Aufräumen (stated) |
| `lint` | `tsc --noEmit` | **Lint** = reiner Type-Check (stated durch den Namen; inferred: kein ESLint — keine ESLint-/Prettier-Konfiguration im Repo gefunden) |

- **Kein `test`-Script**, kein Test-Runner in `package.json`, keine `*.test.*`/`*.spec.*`-Dateien, keine `vitest.config`/`jest.config`/`playwright.config` (gesucht über das ganze Repo außer `node_modules`, nicht gefunden). `.ai-eng-kit` → `stack.test: null`, `commands.test: null` (stated).

## How it runs (proposal for `/init`)

- **Start:** `npm run dev` — stated, `package.json` (`tsx server.ts`); `.ai-eng-kit` → `commands.dev: "npm run dev"` (stated). Benötigt `GEMINI_API_KEY` in `.env.local` für die KI-Routen (`README.md`, stated); ohne Schlüssel startet der Server, die KI-Routen antworten mit `503` (`server.ts` Zeile 92–96, stated).
- **Base URL / probe:** `http://localhost:3000` — Port ist hart codiert (`server.ts` Zeile 10 `const PORT = 3000;`, Bind an `0.0.0.0`, Zeile 1253, stated). Health-Route **`GET /api/ping`** antwortet JSON `{ ok, runtime, hasGeminiKey, isVercel, timestamp }` (`server.ts` Zeilen 16–24, stated; `HANDBUCH.md` → 1.7 nennt sie als Health-Check, stated). Probe-Vorschlag: HTTP `GET /api/ping` → `200` mit `"ok": true`.
- **Build:** `npm run build` — stated, `package.json`; `.ai-eng-kit` → `commands.build` (stated). Auf Vercel nur `vite build` (`vercel.json` → `buildCommand`, stated). · **Test:** keiner vorhanden (siehe oben). · **Lint:** `npm run lint` (= `tsc --noEmit`) — stated, `package.json`; `.ai-eng-kit` → `commands.lint` (stated).
- **Produktionslauf lokal:** `NODE_ENV=production npm start` serviert `dist/` statisch mit SPA-Fallback auf `dist/index.html` (`server.ts` Zeilen 1244–1251, stated; dass `NODE_ENV` dafür gesetzt sein muss, ist stated in Zeile 1235).
- **Umgebungsvariablen** (Namen aus `.env.example`, stated): `GEMINI_API_KEY`, `APP_URL`. `GEMINI_API_KEY` wird in `server.ts` Zeile 27 gelesen (stated). **`APP_URL` wird nirgends im Code referenziert** (grep über `src/`, `server.ts`, `vite.config.ts`: kein Treffer — inferred: Altlast oder für den Host gedacht). Zusätzlich gelesen, aber nicht in `.env.example`: `VERCEL` (`server.ts` Zeilen 21, 1258), `NODE_ENV` (Zeile 1235), `VERCEL_GIT_COMMIT_SHA` und `DISABLE_HMR` (`vite.config.ts` Zeilen 10, 85–86) — alle stated.

## Integrations and external services

| Service | Used for | Configured in (file, variable **names** only) |
|---|---|---|
| **Google Gemini** (`@google/genai ^2.4.0`, serverseitig) | KI-Coach-Chat (`POST /api/chat`, Modell `gemini-3.5-flash`), Wochen-/Monats-Auswertung (`POST /api/analyze-period`, Fallback-Kette `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash`), Screenshot-OCR mit Bild-`inlineData` (`POST /api/parse-screenshot`, gleiche Kette), Distribution-Days-Fallback mit Search Grounding `tools: [{ googleSearch: {} }]` (`POST /api/calculate-distribution-days`, `gemini-3.5-flash`), Aktien-Suche (`POST /api/stock-search`, `gemini-3.5-flash`, mit lokalem `STOCK_DICTIONARY` als Fallback) — alles `server.ts`, stated | `server.ts` Zeile 27: `GEMINI_API_KEY` (über `dotenv.config()`, Zeile 7); dokumentiert in `.env.example` und `README.md` |
| **Yahoo Finance** (ohne Schlüssel, `v8/finance/chart`) | Live-Kurse, ATR und Marktindikatoren (`^VIX`, `^VIX3M`, `^VVIX`, `^GSPC`, `CL=F`, `NG=F`) in `POST /api/fetch-live-prices`; SPY/QQQ-Tagesdaten für Distribution Days — Hosts `query1.finance.yahoo.com` mit Fallback `query2.finance.yahoo.com` (`server.ts` Zeilen 482–720, 801–858, stated). Symbol-Mapping geteilt in `src/utils/yahooMapping.ts` (stated) | keine Konfiguration, keine Variable (stated) |
| **Stooq** (CSV, ohne Schlüssel) | Zweitquelle, wenn Yahoo ein Aktiensymbol nicht liefert (`fetchStooqDaily`, `https://stooq.com/q/d/l/…`, `server.ts` Zeilen 550–612, 686–710, stated) | keine Konfiguration (stated) |
| **Google OAuth 2.0 (Implicit Flow)** | Anmeldung für Workspace-Sync, Scopes `drive`, `spreadsheets`, `documents`, `userinfo.email`, `userinfo.profile`; Popup → `/auth/callback` (Express-Route, `server.ts` Zeilen 198–265) → `postMessage` des URL-Hash an `window.opener` (stated) | **Client-ID wird vom Nutzer in der App eingegeben** und in `localStorage` → `g_workspace_client_id` abgelegt (`src/components/WorkspaceSyncTab.tsx` Zeilen ~284–303, stated); Access-Token in `localStorage` → `g_workspace_access_token` (stated). Keine Server-Variable. |
| **Google Drive API v3, Sheets API v4, Docs API v1** | Backup-Ordner, Tages-Journal-Spreadsheet (`Tages_Journal!A1:N1`), Journal-Dokument; direkt aus dem Browser mit dem OAuth-Token (`src/components/WorkspaceSyncTab.tsx`, Zeilen 597–1329, stated) | `localStorage` → `g_workspace_backup_folder_id`, `g_workspace_spreadsheet_id`, `g_workspace_document_id`, `g_workspace_sheet_export_mode`, `g_workspace_local_profiles` (stated) |
| **„Central Access Box" (eigener Server)** | Teilen der Workspace-IDs zwischen Geräten per Name + PIN (`POST /api/profiles/save`, `POST /api/profiles/load`, `server.ts` Zeilen 297–350, stated) | Datei `cloud_profiles.json` im Arbeitsverzeichnis des Servers (`PROFILES_FILE`, Zeile 275, stated) |
| **Google Fonts** | Inter, Space Grotesk, Fira Code (`index.html` Zeilen 24–26, stated); PWA-Runtime-Cache dafür in `vite.config.ts` Zeilen 60–82 (stated) | keine |
| **api.qrserver.com** | QR-Code-Bild in der Workspace-Ansicht (`src/components/WorkspaceSyncTab.tsx` Zeile 2446, stated) | keine |
| **GitHub** (`reifen01/Morgenroutine`) | Link auf `HANDBUCH.md` aus der Hilfe (`src/components/HelpModal.tsx` Zeilen 119, 196, stated); `git remote origin` zeigt auf dasselbe Repo (stated) | keine |

Nicht gefunden (gesucht in `package.json`, `server.ts`, `src/`): Error-Tracking (Sentry o. ä.), Analytics, E-Mail-Versand, Zahlungsanbieter, eigene Auth-Bibliothek, Rate-Limiting-Middleware, CORS-/Helmet-Middleware.

## How it goes live

- **Vercel** — stated durch `vercel.json`: `buildCommand: "vite build"`, `outputDirectory: "dist"`, `framework: null`, Rewrites `/api/(.*)` und `/auth/(.*)` → `/api/index`, `functions["api/index.ts"].maxDuration: 60`. `HANDBUCH.md` → 2 „PR #1 … Vercel-Deployment (morgenroutine.vercel.app)" nennt die Produktions-URL (stated im Handbuch; ob sie noch gilt, ist nicht aus dem Repo prüfbar). `.ai-eng-kit` → `stack.deploy: null` (stated — noch nicht bestätigt).
- **Serverless-Einstieg:** `api/index.ts` exportiert einen `(req, res)`-Handler, der `../server.js` lazy importiert, die Express-App cached und Ladefehler als JSON `500` zurückgibt (stated). `server.ts` ruft `app.listen` nur, wenn `process.env.VERCEL` nicht gesetzt ist, und exportiert `app` als Default (Zeilen 1258–1262, stated); der Vite-Import im Dev-Pfad ist dynamisch, damit Vercel ihn nicht beim Function-Init lädt (Kommentar Zeile 1236–1237, stated). Dass `'../server.js'` auf Vercel zur `server.ts` aufgelöst wird, übernimmt Vercels TypeScript-Bundling (inferred).
- **Zwei Produktionspfade:** Vercel baut nur den Client (`vite build`) und führt den Server als Function aus; `npm run build` + `npm start` bündelt zusätzlich `dist/server.cjs` für einen klassischen Node-Host (`package.json`, stated). Welcher Pfad tatsächlich genutzt wird, ist aus dem Repo nicht endgültig ablesbar — das Handbuch und `vercel.json` sprechen für Vercel (inferred).
- **Build-Version:** `vite.config.ts` → `resolveBuildVersion()` nimmt `VERCEL_GIT_COMMIT_SHA` (erste 7 Zeichen), sonst `git rev-parse --short HEAD`, sonst `'dev'`, und injiziert sie als `__BUILD_VERSION__` (stated); der Client zeigt sie im Header (`src/components/CompactHeader.tsx` Zeilen 57–58, stated).
- **CI / Gates:** **kein `.github/`-Ordner**, keine Workflows, kein `Dockerfile`, `Procfile`, `fly.toml`, kein Deploy-Script (gesucht, nicht gefunden). Keine Branch-Protection oder Review-Pflicht aus dem Repo ersichtlich. Das Release-Journal in `HANDBUCH.md` → 2 beschreibt elf PRs (stated) — Auslieferung über GitHub-PRs mit Vercel-Git-Integration (inferred).
- **Aktueller Branch:** `claude/exciting-mccarthy-odsd1p` mit Remote-Tracking; ein lokaler `main` ist in diesem Checkout nicht vorhanden (`git branch -a`, stated).

## Could not determine

- **Node-Version:** kein `.nvmrc`, `.node-version`, `engines`; Vercel-Runtime nicht in `vercel.json` festgelegt → `/init` sollte fragen (Hinweis: `@types/node ^22`).
- **Deploy-Ziel bestätigen:** `vercel.json` und `HANDBUCH.md` sagen Vercel (`morgenroutine.vercel.app`), `.ai-eng-kit` → `deploy: null`; ob zusätzlich ein Node-Host über `npm start` bedient wird, ist nicht ablesbar.
- **Zweck von `APP_URL`** in `.env.example` — im Code nicht referenziert.
- **Test-Strategie:** kein Runner, keine Tests, kein E2E — ob das gewollt ist oder aufgeholt werden soll, muss der Nutzer entscheiden.
- **Lint:** `lint` ist nur `tsc --noEmit`; ob ESLint/Prettier erwünscht sind, ist nicht festgehalten.
- **Google-OAuth-Client:** Client-ID wird zur Laufzeit vom Nutzer eingegeben; welche Redirect-URIs im Google-Cloud-Projekt eingetragen sind (`<origin>/auth/callback`), ist nicht im Repo.
- **Persistenz von `cloud_profiles.json` in Produktion:** auf Vercel vermutlich flüchtig (inferred) — ob die Profil-Box in Produktion überhaupt genutzt wird, ist nicht ablesbar.
- **Gemini-Modellnamen:** `gemini-3.5-flash` wird in vier Routen verwendet, während `HANDBUCH.md` → PR #2 „`gemini-3.5-flash` → `gemini-2.5-flash` (richtiger Modellname)" nur für die OCR korrigiert hat; ob `gemini-3.5-flash` heute existiert, kann das Repo nicht belegen.
- **Vercel-Projekt-Einstellungen** (Env-Variablen auf Vercel, Production-Branch, Domains) liegen nur im Vercel-Dashboard.
