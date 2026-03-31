---
status: completed
created: 2026-03-31
started: 2026-03-31
completed: 2026-03-31
---
# Task: Cloud debug controls and clamping

## Description
Add cloud debug controls, clamp/sanitization behavior, and live runtime application so deterministic stepping reflects updated cloud configuration on the next simulation step.

## Background
The design requires runtime tuning for cloud count/density, drift, and lifecycle thresholds with safe clamping and deterministic update behavior.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/cloud-fix-plan/design.md

**Additional References:**
- .agents/scratchpad/implementation/cloud-fix-plan/context.md (codebase patterns)
- .agents/scratchpad/implementation/cloud-fix-plan/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add cloud controls in debug metadata/config (`count/density`, drift speed, spawn-above band, despawn-below threshold, lane controls if included).
2. Implement clamping + sanitization in debug config pipeline with zero drift explicitly allowed.
3. Apply live debug updates so behavior changes on the next deterministic simulation step.
4. Add unit tests for clamp/sanitize behavior and e2e checks for live control effects.

## Dependencies
- task-04-game-runtime-cloud-integration.code-task.md

## Implementation Approach
1. TDD: write failing unit tests in `tests/unit/debugConfig.test.ts` and e2e checks in `tests/e2e/clouds.spec.ts`.
2. Implement debug controls, clamp/sanitize logic, and runtime application wiring.
3. Refactor for consistency with existing debug control conventions while keeping tests green.

## Acceptance Criteria

1. **Debug Clamp and Sanitization**
   - Given out-of-range or inverted cloud control inputs
   - When `clampDebugConfig` processes the values
   - Then resulting effective values are within bounds, ordered, and valid

2. **Live Deterministic Update Timing**
   - Given test mode is paused with deterministic stepping
   - When cloud debug values change and one simulation step is executed
   - Then cloud behavior reflects new settings on that step and not before

3. **Unit and E2E Tests Pass**
   - Given the implementation is complete
   - When running the relevant test suites
   - Then all tests for this task pass

## Metadata
- **Complexity**: High
- **Labels**: cloud,debug-controls,clamping,e2e,tdd
- **Required Skills**: TypeScript, Vitest, Playwright
