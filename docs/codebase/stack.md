# Stack

_Mapped by `/map` on 2026-10-18 at commit `ef921bc`. Stated = steht so in einer Datei; inferred = meine Lesart, zu bestätigen._

## Language and runtime

- **TypeScript 5.8** (stated: `package.json` → `"typescript": "~5.8.2"`; `tsconfig.json` → `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit: true`, Alias `@/*` → `./*`). Frontend wie Server sind TypeScript: `server.ts` (1401 Zeilen) und `src/**/*.tsx|ts`.
- **Node.js** als Server-Laufzeit — **keine Version festgeschrieben**: kein `.nvmrc`, kein `.node-version`, kein `engines`-Feld in `package.json` (gesucht, nicht gefunden). `@types/node ^22.14.0` (stated, `package.json`) deutet auf Node 22 hin (inferred); in der Mapping-Umgebung lief `node v22.22.0` / `npm 10.9.4`. `README.md` nennt nur „Prerequisites: Node.js".
- **ESM**: `"type": "module"` (stated, `package.json`); der Server-Build bündelt trotzdem nach CJS (`--format=cjs`, siehe Scripts).
- **Browser-Laufzeit zusätzlich als PWA**: Service Worker über `vite-plugin-pwa` (stated: `vite.config.ts` → `VitePWA({ registerType: 'prompt', … })`, `src/usePWAUpdate.ts` → `registerSW` aus `virtual:pwa-register`, Typen in `src/vite-env.d.ts`).
- **Layers:** `.ai-eng-kit` → `layers: []`. Im Repo gefunden: **keine** zweite Laufzeit (kein `pyproject.toml`, `go.mod`, `composer.json`, kein eigener Ordner mit eigenem Manifest). Ein früherer Ordner `aktien-screener/` wurde entfernt (stated: `git log` → Commit `689592a` „Aufräumen: aktien-screener/ entfernt – Screener lebt jetzt im eigenen Repo reifen01/aktien-screener"); er ist heute ein externer Dienst, kein Layer (siehe Integrations).

## Framework

- **App (Client):** React 19 (stated: `package.json` → `"react": "^19.0.1"`, `"react-dom": "^19.0.1"`), gebaut mit **Vite 6** (`"vite": "^6.2.3"`, `vite.config.ts` mit `@vitejs/plugin-react`), Einstieg `index.html` → `/src/main.tsx` → `src/App.tsx` (1024 Zeilen) innerhalb `src/components/ErrorBoundary.tsx`. Single-Page-App ohne Router-Bibliothek (inferred: keine `react-router`-Abhängigkeit in `package.json`; Tabs werden in `src/App.tsx` als State geschaltet).
- **Backend:** Express 4 (stated: `"express": "^4.21.2"`, `server.ts` Z. 1 `import express from "express"`). `server.ts` ist zugleich API-Server und Auslieferer des Frontends: im Dev-Modus Vite als Middleware (`server.ts` Z. 1373–1382, `createViteServer({ server: { middlewareMode: true }, appType: "spa" })`), in Produktion `express.static(dist)` + SPA-Fallback (Z. 1385–1389). Export `export default app` (Z. 1401) für den Serverless-Wrapper `api/index.ts`.
- **UI / Styling:** Tailwind CSS v4 über `@tailwindcss/vite` (stated: `package.json`, `vite.config.ts`, `src/index.css` → `@import "tailwindcss";` mit `@theme`-Fonts Inter / Space Grotesk / Fira Code). Icons `lucide-react`, Animation `motion`, Charts `recharts`, Markdown `react-markdown` + `remark-gfm` (alle stated, `package.json`).
- `.ai-eng-kit` → `stack.framework: "express"`, `ui: "tailwind"` (stated) — deckt sich mit dem Befund; das Frontend-Framework React ist dort nicht eigens erfasst.
- Herkunft: `README.md` ist die unveränderte Google-AI-Studio-Vorlage („Run and deploy your AI Studio app", `package.json` → `"name": "react-example"`); `metadata.json` nennt `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` (stated). `HANDBUCH.md` PR #1: „Rebuild der App aus dem Google-AI-Studio-ZIP" (stated).

## Backend and data

- **Keine Datenbank, kein BaaS.** Gesucht in `package.json` (kein `pg`, `prisma`, `supabase`, `mongoose`, `drizzle`), in `server.ts` (nur `fs`), im Repo (kein `migrations/`, `prisma/`, `supabase/`): nichts gefunden. `.ai-eng-kit` → `stack.backend: null` (stated).
- **Primäre Persistenz ist der Browser:** `localStorage` (61 Fundstellen in `src/`, u. a. `src/App.tsx`, `src/components/PortfolioTab.tsx`, `src/components/MorgenroutineTab.tsx`). `HANDBUCH.md` § 1.5: „Alles in localStorage — jedes Gerät hat sein eigenes Portfolio" (stated). Backups als verschlüsselte Datei im Browser: `src/utils/backupFile.ts`, `src/utils/encryption.ts` (stated im Dateikopf: PBKDF2-SHA256 200k Iterationen, AES-GCM-256 via `crypto.subtle`).
- **Einzige serverseitige Ablage:** `cloud_profiles.json` im Arbeitsverzeichnis (`server.ts` Z. 305 `PROFILES_FILE = path.join(process.cwd(), "cloud_profiles.json")`, gelesen Z. 311–313, geschrieben Z. 322 über `/api/profiles/save` Z. 329 / `/api/profiles/load` Z. 360). Diese Datei liegt nicht im Repo. Kein Aufruf dieser beiden Routen aus `src/` gefunden (grep `fetch("/api/` → nur `/api/chat`, `/api/analyze-period`, `/api/fetch-live-prices`, `/api/calculate-distribution-days`, `/api/market-history`, `/api/stock-search`) — Überbleibsel der entfernten Google-Workspace-Integration (inferred; `src/components/WorkspaceSyncTab.tsx` Z. 4–7 sagt stated, dass OAuth/Sheets/Docs/Drive entfernt wurden). Auf Vercel ist das Dateisystem einer Function nicht dauerhaft, die Datei wäre dort flüchtig (inferred).
- **Schema:** kein Schema-Ordner. Die Datentypen der App stehen in `src/types.ts` (stated: `LivePriceData`, `PortfolioItem`, `SoldTradeItem`, `PortfolioPurchase`, `ChecklistItem`, `MarketState`, `DailySnapshot`, `PeriodLearning`, `ChatMessage`, `WatchlistItem`, …) — das ist die einzige Quelle, aus der `docs/data-model.md` gefüllt werden kann. Demo-Daten: `public/Morgenroutine_Demo.json`, `src/utils/demoData.ts`.

## Package manager and scripts

- **npm** — stated: `package-lock.json` vorhanden, kein `pnpm-lock.yaml` / `yarn.lock`; `.ai-eng-kit` → `packageManager: "npm"`.
- Scripts aus `package.json` (verbatim):

| Script | Befehl | Rolle |
|---|---|---|
| `dev` | `tsx server.ts` | **Start** (Dev: Express + Vite-Middleware, Port 3000) — stated durch Name, Verhalten in `server.ts` Z. 1373 ff. |
| `build` | `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs` | **Build** (Client nach `dist/`, Server nach `dist/server.cjs`) — stated |
| `start` | `node dist/server.cjs` | **Start (Produktion, selbst gehostet)** — stated durch Name; erwartet `NODE_ENV=production` für statische Auslieferung (inferred aus `server.ts` Z. 1374) |
| `clean` | `rm -rf dist` | Aufräumen — stated |
| `lint` | `tsc --noEmit` | **Lint** — nur Typprüfung; kein ESLint/Prettier (gesucht: keine `.eslintrc*`, `eslint.config.*`, `.prettierrc*`) |
| — | — | **Test:** kein Script, kein Runner in `package.json`, keine `*.test.*`/`*.spec.*`-Dateien im Repo (gesucht) |

- Dev-Tooling (stated, `devDependencies`): `tsx`, `esbuild`, `vite-plugin-pwa`, `sharp` (vermutlich für Icon-Erzeugung; kein Script nutzt es — inferred), `autoprefixer`.

## How it runs (proposal for `/init`)

- **Start:** `npm run dev` — stated, `package.json`; `server.ts` Z. 10 `const PORT = 3000`, Z. 1392 `app.listen(PORT, "0.0.0.0")`. **Vom Orchestrator am 2026-10-18 verifiziert:** startet Express auf Port 3000 mit Vite-Middleware.
- **Base URL / probe:** `http://localhost:3000` · Health-Route `GET /api/ping` (`server.ts` Z. 16–24) antwortet mit `{ ok: true, runtime, hasGeminiKey, isVercel, timestamp }` — **verifiziert: 200 mit `{ok:true,…}`**. `HANDBUCH.md` § 1.7 nennt `/api/ping` als Health-Check (stated).
- **Build:** `npm run build` — **verifiziert: läuft durch.** · **Test:** keiner vorhanden (siehe oben). · **Lint:** `npm run lint` (= `tsc --noEmit`) — **verifiziert: läuft durch.**
- **Umgebung:** `server.ts` Z. 7 `dotenv.config()`; benötigte Variable `GEMINI_API_KEY` (Name aus `.env.example` und `server.ts` Z. 20/27). Ohne Key startet der Server, die Gemini-Routen antworten dann mit Fehler (inferred aus `aiClient` null-Guard Z. 28 ff.). Weitere Variablen-Namen: `APP_URL` (nur in `.env.example`, nirgends im Code referenziert — gesucht in `server.ts`, `src/`, `api/`, `vite.config.ts`), `VERCEL` (Z. 21, 1397), `NODE_ENV` (Z. 1374), `VERCEL_GIT_COMMIT_SHA` und `DISABLE_HMR` (`vite.config.ts`).
- `.ai-eng-kit` hat heute `commands.dev/build/lint` gesetzt, `test: null`, `check: null`, `probe.kind/baseUrl: null` (stated) — Vorschlag: `probe.kind: http`, `baseUrl: http://localhost:3000`, Health `/api/ping`.

## Integrations and external services

| Service | Used for | Configured in (file, variable **names** only) |
|---|---|---|
| **Google Gemini API** (`@google/genai`, Modell `gemini-3.5-flash`) | KI-Coach-Chat (`/api/chat`, `server.ts` Z. 89), Perioden-Auswertung (`/api/analyze-period`, Z. 136), Screenshot-OCR (`/api/parse-screenshot`, Z. 384), Fallback in Distribution-Days / Stock-Search (Z. 1139, 1199, 1291) | `server.ts` Z. 27–31 `new GoogleGenAI({…})`; Variable `GEMINI_API_KEY` (`.env.example`, serverseitig, nie im Client) — stated |
| **Yahoo Finance Chart-API** (`query1`/`query2.finance.yahoo.com/v8/finance/chart/`) | Live-Kurse, ATR, Markthistorie, Distribution Days (`/api/fetch-live-prices` Z. 646, `/api/market-history` Z. 975, `/api/calculate-distribution-days` Z. 1043) | `server.ts` Z. 663, 859; keine Variable, kein Key — stated |
| **Stooq** (`stooq.com/q/d/l/`) | Tages-CSV als Fallback für einzelne Symbole (`fetchStooqDaily`, `server.ts` Z. 600–612, Mapping `STOOQ_MAP`) | `server.ts` Z. 608; kein Key — stated |
| **Aktien-Screener** (externe App `https://aktien-screener-at.vercel.app`, Alt-Origin `https://rabe-screener.vercel.app`) | Eigenständiger Screener im Tab „Analyse", eingebettet per iframe; Übergabe Watchlist/Depot über Query `?mr=`/`?dp=`, Rückkanal `postMessage {type:"aks-watchlist-add"}` (stated im Dateikopf) | `src/components/AktienScreenerTab.tsx` Z. 19–20 `SCREENER_ORIGIN`, `SCREENER_ORIGINS` (hart codiert, keine Variable). Quellcode liegt laut `git log` (`689592a`) im Repo `reifen01/aktien-screener` — stated |
| **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) | Schriften Inter, Space Grotesk, Fira Code | `index.html` `<link>`; Workbox-Runtime-Cache in `vite.config.ts` — stated |
| **api.qrserver.com** | QR-Code der App-URL im Tab „Workspace & Datensicherung" | `src/components/WorkspaceSyncTab.tsx` Z. 140, kein Key — stated |
| **GitHub** (`github.com/reifen01/Morgenroutine`) | Link zum Handbuch aus der Hilfe; Git-Remote `origin` | `src/components/HelpModal.tsx` Z. 123; `git remote -v` — stated |
| **Google OAuth (Rest)** | `GET /auth/callback` (`server.ts` Z. 230–293) reicht `window.location.hash` per `postMessage` an das Opener-Fenster; `vercel.json` leitet `/auth/(.*)` auf die Function. Kein Client-Code nutzt es mehr (Google-Workspace-Integration laut `WorkspaceSyncTab.tsx` Z. 4–7 entfernt) — toter Pfad (inferred) | `server.ts`, `vercel.json`; keine Variable |

Kein Error-Tracking (kein `@sentry/*` o. ä. in `package.json`), kein Analytics-SDK, keine Mail-/Zahlungsdienste gefunden (gesucht in `package.json`, `src/`, `server.ts`).

## How it goes live

- **Vercel** — stated: `vercel.json` (`buildCommand: "vite build"`, `outputDirectory: "dist"`, `framework: null`, Rewrites `/api/(.*)` und `/auth/(.*)` → `/api/index`, `functions["api/index.ts"].maxDuration: 60`). `api/index.ts` ist der Serverless-Wrapper: lädt `../server.js` lazy, cached die Express-App und reicht `(req, res)` durch; bei Ladefehler JSON-500 mit Stack-Auszug. `server.ts` Z. 1397 `if (!process.env.VERCEL) startServer()` — auf Vercel kein `listen`, kein Vite. Produktions-URL `morgenroutine.vercel.app` (stated: `HANDBUCH.md` Z. 86 Release-Journal PR #1 „Vercel-Deployment (morgenroutine.vercel.app)", `src/components/ErrorBoundary.tsx` Z. 140). Build-Version aus `VERCEL_GIT_COMMIT_SHA` → `__BUILD_VERSION__` (`vite.config.ts` `resolveBuildVersion`). `.ai-eng-kit` → `stack.deploy: null` (stated) — Vorschlag: `vercel`.
- **Auslösung:** keine CI im Repo — kein `.github/workflows/`, kein `Dockerfile`, `Procfile`, `fly.toml`, kein Deploy-Script (gesucht). Die Vercel-Git-Integration (Deploy bei Push auf `main`) ist nicht im Repo sichtbar und nur aus dem Release-Journal in `HANDBUCH.md` (§ 2, PR #1–#11 mit Vercel-Fixes wie PR #3 „Vercel-Routing-Fix") zu schließen (inferred).
- **Menschliche Gates:** Historie läuft über Pull Requests auf `main` (stated: `git log` → „Merge pull request #44 … #36 …"); ob Reviews verpflichtend sind (Branch-Protection), ist im Repo nicht sichtbar. `.claude/settings.json` verbietet `git push --force` (stated; vom Kit ergänzt, Diff gegen `origin/main`).
- **Selbst gehostet (Alternative):** `npm run build` + `NODE_ENV=production npm run start` liefert `dist/` über Express aus (`server.ts` Z. 1384–1389) — stated im Code, ob jemand so deployt ist nicht dokumentiert.
- **PWA-Update-Pfad:** `vite.config.ts` → Workbox `skipWaiting`, `clientsClaim`, `cleanupOutdatedCaches`; `src/usePWAUpdate.ts` pollt alle 30 Minuten (`UPDATE_CHECK_INTERVAL_MS`) und zeigt Banner `src/components/PWAUpdatePrompt.tsx` (stated; `HANDBUCH.md` PR #4).
- **Projekteigenes Claude-Tooling (lag schon auf `main`, stated: `git ls-tree origin/main -- .claude`):** Sub-Agenten `.claude/agents/code-reviewer.md` (Code-Review), `.claude/agents/frontend-developer.md` (React/Vue/Angular-Frontend); Command `.claude/commands/generate-tests.md` (Testdatei für eine Quelldatei erzeugen); `.claude/settings.json` (Deny-Liste für `.env*`, `secrets/`). Vom Kit hinzugekommen: `.claude/agents/qa-engineer.md`, `.claude/skills/*`, `.claude/rules/*` (stated, `.ai-eng-kit` → `managed`).

## Could not determine

- **Node-Version** für Produktion — nirgends festgeschrieben (`.nvmrc`, `engines`, Vercel-Runtime-Setting fehlen). `/init` sollte fragen; Vorschlag Node 22 (aus `@types/node`).
- **Ob Vercel wirklich bei Push auf `main` deployt** und ob Branch-Protection/Reviews aktiv sind — nur über das Vercel-Dashboard bzw. GitHub-Settings erkennbar, nicht im Repo.
- **Welche Env-Variablen in Vercel gesetzt sind** — nur `GEMINI_API_KEY` ist im Code referenziert; `APP_URL` aus `.env.example` wird nirgends gelesen (Zweck unklar).
- **Status von `/api/profiles/*` und `/auth/callback`** — kein Aufrufer in `src/` gefunden; ob sie bewusst behalten wurden oder entfernt werden sollen, muss der Nutzer sagen.
- **Ob der externe Aktien-Screener (`aktien-screener-at.vercel.app`) als Teil dieses Produkts gilt** — Code liegt in `reifen01/aktien-screener`; die Schnittstelle (Query-Parameter, `postMessage`) ist nur hier dokumentiert, nicht versioniert.
- **Tests** — es gibt keine; welcher Runner gewünscht ist (`.ai-eng-kit` → `test: null`, `e2e: null`), muss `/init` klären.
- **Zweck von `sharp`** in `devDependencies` — kein Script nutzt es.
