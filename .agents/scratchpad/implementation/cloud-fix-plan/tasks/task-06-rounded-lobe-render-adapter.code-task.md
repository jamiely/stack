---
status: completed
created: 2026-03-31
started: 2026-03-31
completed: 2026-03-31
---
# Task: Rounded-lobe cloud render adapter

## Description
Implement rounded-lobe cloud rendering and lane-aware visual adapter mapping from simulation state to DOM/CSS presentation.

## Background
The fix plan requires replacing legacy simple cloud visuals with smooth rounded-lobe variants while keeping simulation semantics unchanged.

## Reference Documentation
**Required:**
- Design: .agents/scratchpad/implementation/cloud-fix-plan/design.md

**Additional References:**
- .agents/scratchpad/implementation/cloud-fix-plan/context.md (codebase patterns)
- .agents/scratchpad/implementation/cloud-fix-plan/plan.md (overall strategy)

**Note:** You MUST read the design document before beginning implementation.

## Technical Requirements
1. Add render adapter mapping from cloud `styleVariant` and `lane` metadata to deterministic classes/style vars.
2. Implement rounded-lobe DOM/CSS structure in `Game.ts` + `src/styles.css`.
3. Preserve simulation output semantics while adding subtle front/back lane visual differentiation.
4. Add e2e assertions validating cloud node presence and variant/layer classes.

## Dependencies
- task-05-cloud-debug-controls-and-clamps.code-task.md

## Implementation Approach
1. TDD: add failing e2e checks for rounded cloud classes and lane-layer mapping.
2. Implement DOM/CSS adapter updates for rounded-lobe visuals.
3. Refactor style/class naming for maintainability while keeping deterministic mappings.

## Acceptance Criteria

1. **Rounded-Lobe Rendering**
   - Given clouds are active in the scene
   - When cloud nodes are rendered
   - Then each cloud uses rounded-lobe visual structure/classes rather than legacy style

2. **Lane-Aware Visual Mapping**
   - Given simulation clouds include front and back lanes
   - When render adapter applies classes/style vars
   - Then lane-specific layering cues match deterministic lane metadata

3. **E2E Tests Pass**
   - Given the implementation is complete
   - When running the relevant test suites
   - Then all tests for this task pass

## Metadata
- **Complexity**: Medium
- **Labels**: cloud,rendering,css,adapter,e2e,tdd
- **Required Skills**: TypeScript, CSS, Playwright
