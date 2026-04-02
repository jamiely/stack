---
status: completed
created: 2026-04-02
started: 2026-04-02
completed: 2026-04-02
---
# Task: Wire controls through Game debug ranges + simulation mapping

## Description
Expose the new fireworks controls through Game debug metadata and runtime config mapping so paused deterministic test flows can apply knobs and observe changes only after manual stepping.

## Background
Simulation-side controls are ineffective unless surfaced via debug panel metadata and mapped through `buildFireworksSimulationConfig`. Paused semantics must remain step-gated.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/fireworks-starburst/design.md

**Additional References:**
- .agents/scratchpad/implementation/fireworks-starburst/context.md (codebase patterns)
- .agents/scratchpad/implementation/fireworks-starburst/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add new slider metadata entries in `DEBUG_RANGES` for all new fireworks controls.
2. Include count controls in integer formatting/parsing paths where required by existing debug panel behavior.
3. Map new debug fields into `buildFireworksSimulationConfig` without breaking legacy fireworks controls.
4. Preserve paused-mode semantics: config applies immediately, simulation effects appear after `stepSimulation`.

## Dependencies
- .agents/scratchpad/implementation/fireworks-starburst/tasks/task-01-extend-fireworks-config-schema-clamp-sanitize-contracts.code-task.md
- .agents/scratchpad/implementation/fireworks-starburst/tasks/task-03-add-morphology-shaping-controls-and-configurable-particle-counts.code-task.md

## Implementation Approach
1. TDD: add failing e2e integration assertions in `tests/e2e/fireworks.spec.ts` for debug control wiring and paused-step behavior.
2. Implement `DEBUG_RANGES` and mapping changes in `src/game/Game.ts` (and helpers if needed).
3. Refactor for consistent naming/ordering with existing debug controls while keeping tests green.

## Acceptance Criteria

1. **Debug wiring exposes and applies new controls**
   - Given a paused deterministic test session
   - When new fireworks controls are applied through the test/debug API and simulation is stepped
   - Then fireworks telemetry/state reflects mapped values only after deterministic stepping.

2. **Unit Tests Pass**
   - Given the implementation is complete
   - When running the relevant unit/e2e suites for this task
   - Then all tests for this task pass.

## Metadata
- **Complexity**: Medium
- **Labels**: fireworks,game-integration,debug-ui,e2e
- **Required Skills**: TypeScript, Playwright, deterministic test API usage
