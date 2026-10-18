# Morgenroutine

> The AI Engineering Kit is installed in this project — a spec-driven workflow.
> This file is the one place the project's context is maintained.

<!-- AI-ENG-KIT:START (managed — do not edit by hand; refreshed by /verify-setup) -->
## AI Engineering Workflow

This project uses the AI Engineering Kit — a spec-driven workflow. Development runs in phases, each driven by a skill:

`/init → /write-spec → /architecture → /tasks → /build → /qa → /deploy`   (`/refine` & `/audit` anytime · `/dsgvo` when personal data is involved · `/e2e-tests` for critical flows · `/security-check` & `/cleanup` after `/deploy`)

- **Feature specs** live in `features/MR-X-name/`: `spec.md` (the contract — WHAT), `design.md` (the technical design — HOW), `tasks.md` (the ordered build plan), `qa-report.md` (the test report).
- **Acceptance Criteria** carry stable IDs (`AC-1`, `AC-2`, …). The chain is **AC → Task → Test**.
- **Project status** is tracked in `features/INDEX.md`.
- `spec.md` is **read-only during `/build`** — it is the stable contract.
- **One working language** for the whole project — the conversation *and* every document the skills write, acceptance criteria included. It is recorded under Key Conventions below.

@.claude/rules/general.md
@.claude/rules/security.md
<!-- AI-ENG-KIT:END -->

## Key Conventions

- **Working language: Deutsch.** Talk to the user in Deutsch and write every project document in Deutsch — see `.claude/rules/general.md` → Working Language.
- **Feature IDs:** MR-1, MR-2, etc. (sequential)
- **Commits:** `feat(MR-X): description`, `fix(MR-X): description`
- **Single Responsibility:** One feature per folder
- **Feature branches:** you create a branch `feat/MR-X-name` before `/build`; work stays there through build/QA, and `/deploy` merges it in. The main branch always stays deployable.
- **Human-in-the-loop:** All workflows have user approval checkpoints.
- **Secrets / env files:** Never read, edit, or create env files — they hold private keys. When a real value is needed, ask the user in chat what to paste where; never write it yourself.
- **This project existed before the kit.** Its code, structure, and conventions are the source of truth — follow what is already there rather than the kit's defaults. Where the two disagree, the project wins.

## How This Project Runs

_Aufgezeichnet von `/init` am 18.10.2026 (Stand `ef921bc` + PR #46). Bestätigt vom Nutzer; Start, Probe, Lint und Build wurden in der Session selbst ausgeführt._

- **Platform:** web — React 19 + Vite PWA im Browser, Express-Server in `server.ts`, auf Vercel als eine Serverless-Function (`api/index.ts`)
- **Stack:** Framework Express 4 (Server) + React 19/Vite 6 (Client), Backend **localstorage** (keine Datenbank; alle Nutzerdaten im Browser des Geräts), Tests **keine** (kein Runner, offener Punkt TD-26), Deploy **vercel**, Paketmanager npm, UI Tailwind v4
- **Start:** `npm run dev` (Express mit Vite-Middleware, Port 3000 fest). Ohne `GEMINI_API_KEY` startet der Server, die KI-Routen antworten 503.
- **Verify:** HTTP gegen `http://localhost:3000` — `GET /api/ping` → 200 mit `"ok": true`; Startseite `/` → 200
- **Layers:** none (`layers: []`)
- **Closing check:** kein Aggregat (`commands.check: null`); einzeln `npm run lint` (= `tsc --noEmit`) und `npm run build`; **Test-Befehl fehlt** — jede `/qa` prüft gegen die laufende Instanz und per Code-Lesen, bis ein Runner existiert
- **Go-live:** Merge auf `main` → Vercel baut automatisch (`vercel.json`, `vite build`); Live-Adresse `morgenroutine.vercel.app`; Kontrolle durch den Nutzer über die Build-Version im App-Logo (PWA-Update-Prüfung). Keine menschliche Freigabe außer dem Merge selbst.
- **Codebase map:** `docs/codebase/` — Stand `ef921bc` plus Nachträge MR-13 (`3d39c89`) und MR-19 (`f81b07b`); vor jedem `/architecture` lesen, `/map` nach größeren Änderungen erneut

## Product Context

@docs/PRD.md

## Data Model

@docs/data-model.md

## Feature Overview

@features/INDEX.md
