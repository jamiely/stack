---
status: completed
created: 2026-04-01
started: 2026-04-01
completed: 2026-04-01
---
# Task: Render Adapter Replacement and Regression Coverage

## Description
Replace the legacy fireworks pulse DOM path with a staged render adapter fed by simulation state, and finalize regression/docs updates.

## Background
The final step makes the visual overhaul user-visible, ensuring render metadata and cleanup behavior match simulation lifecycle while preserving existing gameplay regression contracts.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/improve-fireworks-visual/design.md

**Additional References:**
- .agents/scratchpad/implementation/improve-fireworks-visual/context.md (codebase patterns)
- .agents/scratchpad/implementation/improve-fireworks-visual/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Replace fireworks-only pulse rendering path in `src/game/Game.ts` with simulation-driven render nodes and metadata.
2. Update `src/styles.css` for staged shell/primary/secondary/fade visuals and cleanup semantics.
3. Extend `tests/e2e/fireworks.spec.ts` with render metadata, cleanup removal, and adversarial stress assertions.
4. Add/adjust `tests/e2e/gameplay.spec.ts` regression assertion for debug launch button contract.
5. Update `README.md` and `docs/features.md` to reflect new fireworks behavior, controls, and observability.

## Dependencies
- task-06-game-loop-integration-and-public-fireworks-snapshot.code-task.md

## Implementation Approach
1. Write failing E2E render and stress assertions (including adversarial branch) plus gameplay regression checks.
2. Implement render adapter mapping and remove legacy pulse-only logic.
3. Refactor styles/docs and verify suites stay green.

## Acceptance Criteria

1. **Render Metadata Mirrors Simulation Lifecycle**
   - Given deterministic fireworks lifecycle progression
   - When reading rendered fireworks nodes
   - Then node metadata reflects simulation IDs/stages and expired entities are removed.

2. **Stress Regression Safety**
   - Given low cap and high burst adversarial settings
   - When stepping deterministic simulation for 30 seconds
   - Then cap is never exceeded, secondary drops occur first, and active counts do not run away.

3. **Regression and Docs Updated**
   - Given overhaul implementation is complete
   - When running gameplay regression checks and reading docs
   - Then debug launch contract still passes and README/features documentation match shipped behavior.

4. **Tests Pass**
   - Given the implementation is complete
   - When running the test suite
   - Then all tests for this task pass.

## Metadata
- **Complexity**: High
- **Labels**: fireworks,rendering,e2e,docs,regression
- **Required Skills**: TypeScript, Playwright, CSS, technical writing
