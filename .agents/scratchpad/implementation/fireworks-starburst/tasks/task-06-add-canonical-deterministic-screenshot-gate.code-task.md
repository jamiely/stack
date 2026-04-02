---
status: completed
created: 2026-04-02
started: 2026-04-02
completed: 2026-04-02
---
# Task: Add canonical deterministic screenshot gate

## Description
Create a deterministic Playwright visual regression test for chrysanthemum fireworks and commit the canonical baseline snapshot with fixed capture timing and tolerance contract.

## Background
This is the visual acceptance gate for morphology tuning. It must be stable and anchored to seed 42 at first primary-burst transition plus two ticks under paused manual stepping.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/fireworks-starburst/design.md

**Additional References:**
- .agents/scratchpad/implementation/fireworks-starburst/context.md (codebase patterns)
- .agents/scratchpad/implementation/fireworks-starburst/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add Playwright scenario in `tests/e2e/fireworks.spec.ts` that captures canonical screenshot using deterministic paused-step anchor.
2. Use screenshot options and tolerances exactly: animations disabled, caret hidden, css scale, threshold 0.12, maxDiffPixels 180.
3. Validate adversarial sensitivity by perturbing a morphology knob and asserting telemetry change before canonical assertion.
4. Add/update baseline at `tests/e2e/fireworks.spec.ts-snapshots/fireworks-chrysanthemum-canonical-chromium-darwin.png`.

## Dependencies
- .agents/scratchpad/implementation/fireworks-starburst/tasks/task-05-wire-controls-through-game-debug-ranges-and-simulation-mapping.code-task.md

## Implementation Approach
1. TDD: add failing canonical screenshot + adversarial sensitivity assertions in `tests/e2e/fireworks.spec.ts`.
2. Capture baseline snapshot once deterministic anchor is stable.
3. Refine selector/capture scope only as needed without relaxing tolerance contract.

## Acceptance Criteria

1. **Canonical visual gate is deterministic**
   - Given `/?debug&test&paused=1&seed=42` and deterministic burst anchor logic
   - When first primary burst occurs and the simulation advances two additional ticks
   - Then screenshot comparison passes against the canonical baseline within threshold 0.12 and maxDiffPixels 180.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the relevant unit/e2e suites for this task
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,playwright,visual-regression,determinism
- **Required Skills**: Playwright, deterministic harness control, snapshot testing
