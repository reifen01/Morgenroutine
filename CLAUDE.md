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

_Recorded by `/init`. Until then, do not guess these — ask._

- **Platform:** _web / mobile / desktop / mcp / cli / extension / other_
- **Stack:** _framework, backend, tests, deploy_
- **Start:** _the command that runs the app locally_
- **Verify:** _how to probe a running instance (HTTP, stdio/JSON-RPC, …)_
- **Layers:** _additional runtimes beside the app — name → root, start, test, packs under `docs/stacks/`; or "none"_
- **Closing check:** _aggregate command, or individual lint/test/build commands; included layer names_
- **Codebase map:** `docs/codebase/` — written by `/map`, read before designing anything; `/map` again after large changes

## Product Context

@docs/PRD.md

## Data Model

@docs/data-model.md

## Feature Overview

@features/INDEX.md
