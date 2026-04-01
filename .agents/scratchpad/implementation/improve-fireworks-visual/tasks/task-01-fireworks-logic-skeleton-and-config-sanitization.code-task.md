---
status: completed
created: 2026-04-01
started: 2026-04-01
completed: 2026-04-01
---
# Task: Fireworks Logic Skeleton and Config Sanitization

## Description
Create a standalone deterministic fireworks logic module with typed config/state models and sanitization helpers so the system has a testable foundation before Game integration.

## Background
The current fireworks implementation is a pulse-only distraction visual with no per-firework lifecycle simulation. The design requires a deterministic simulation module that can be unit tested independently first.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/improve-fireworks-visual/design.md

**Additional References:**
- .agents/scratchpad/implementation/improve-fireworks-visual/context.md (codebase patterns)
- .agents/scratchpad/implementation/improve-fireworks-visual/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add `src/game/logic/fireworks.ts` with typed config/state/snapshot interfaces and seeded RNG plumbing only.
2. Implement `sanitizeFireworksConfig` to clamp numeric bounds and normalize min/max relationships safely.
3. Implement deterministic `initializeFireworksState` and a step skeleton (`stepFireworksState`) suitable for replay tests.
4. Add `tests/unit/fireworks.test.ts` coverage for sanitization and deterministic initialize/step behavior.

## Dependencies
- None (first implementation step).

## Implementation Approach
1. Write failing unit tests for adversarial sanitization and deterministic initialization/step replay.
2. Implement minimal sanitize/initialize/step logic to satisfy deterministic contracts.
3. Refactor model naming/helpers for clarity while keeping tests green.

## Acceptance Criteria

1. **Sanitization Clamps Adversarial Inputs**
   - Given an invalid fireworks config with negative, inverted, or tiny values
   - When `sanitizeFireworksConfig` is called
   - Then returned values are clamped to safe bounds and min/max pairs are normalized.

2. **Deterministic Initialization and Step Replay**
   - Given the same seed, sanitized config, and fixed-step sequence
   - When initializing and stepping fireworks state in two independent runs
   - Then shell/particle snapshots and telemetry are identical.

3. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,logic,determinism,testing
- **Required Skills**: TypeScript, Vitest, deterministic simulation
