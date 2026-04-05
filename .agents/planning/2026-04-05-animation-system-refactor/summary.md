# Planning Summary: Animation System Refactor

## Project
- **Name:** `2026-04-05-animation-system-refactor`
- **Directory:** `.agents/planning/2026-04-05-animation-system-refactor`

## Artifacts Created

- `rough-idea.md` — original problem statement and goals
- `idea-honing.md` — iterative requirements clarification Q&A
- `research/current-architecture-audit.md` — architecture coupling and risk audit
- `research/asset-loading-and-animation-compatibility.md` — character/animation asset + backend analysis
- `research/debug-controls-and-tuning-surface.md` — runtime tuning and debug UX recommendations
- `research/testability-and-regression-risk.md` — regression/testability analysis and extraction seams
- `research/main-game-facade-methods.md` — candidate game-facing manager API methods
- `design/detailed-design.md` — standalone detailed design with architecture/dataflow/component diagrams
- `implementation/plan.md` — incremental, test-driven implementation plan with checklist
- `summary.md` — this document

## Design Overview (brief)

The design introduces a centralized `CharacterAnimationManager` facade that hides character animation internals from `Game`. It preserves current visible behavior while removing Remy-centric coupling and improving testability.

Core contract:
- `preload()`
- `spawnLedgeCharacter()` (internal manager selection)
- `spawnCharacter('bat'|'ufo'|'gorilla')` (explicit non-ledge branch)
- `update(dt)`
- `release(actor)`
- `disposeAll()`

Key behavior decisions captured:
- Ledge character and ledge animation selection are both round-robin.
- Optional seed for deterministic behavior.
- Best-effort preload with fallback placeholder spawn.
- Runtime debug tuning uses profile dropdown + optional animation selector + position/rotation/scale controls (session-only).
- Fireworks/effects stay out of this refactor.

## Implementation Plan Overview (brief)

The implementation plan breaks work into 8 incremental, demoable steps:
1. Facade integration with existing ledge path
2. Deterministic round-robin selection extraction
3. Transform hierarchy + selector-based debug tuning
4. Remy naming removal and character-agnostic modularization
5. Explicit non-ledge branch for `bat`/`ufo`/`gorilla`
6. Manager-owned preload + fallback placeholder behavior
7. Lifecycle/determinism hardening (`update`, `release`, `disposeAll`)
8. Regression closure, coverage hardening, and docs finalization

Each step includes integrated test requirements and avoids testing-only phases.

## Suggested Next Steps

1. Review `design/detailed-design.md` and `implementation/plan.md` for any final ordering or naming preferences.
2. Begin implementation following the checklist in `implementation/plan.md`.
3. Keep regression risk low by extracting pure modules first and wiring adapters incrementally.

## Areas to Potentially Refine Later

- Whether to move non-humanoid actors from overlay-backed implementation to fully 3D asset-backed actors in a later phase.
- Whether to add a dedicated character tuning mode (currently deferred).
- Whether to add explicit debug/test spawn-by-ID methods (currently deferred).
