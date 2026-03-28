---
name: debug-control-renormalization
description: Updates a runtime debug slider so a target value is centered, then propagates the same normalization across config clamps, docs, and tests. Use when changing gameplay defaults and wanting the slider midpoint to match the new default.
---

# Debug Control Renormalization

Use this skill when a debug slider value should become the visual midpoint of the control (e.g., set slab height default to `3` and make `3` the center of the range).

## Workflow

1. **Set the new default value** in `src/game/debugConfig.ts`.
2. **Renormalize slider range** in `src/game/Game.ts` (`DEBUG_RANGES`) so:
   - `targetDefault = (min + max) / 2`
   - Keep practical gameplay bounds (avoid invalid/negative values).
3. **Update clamp bounds** in `src/game/debugConfig.ts` (`clampDebugConfig`) to match the new slider min/max.
4. **Update tests** that assume previous defaults/ranges:
   - Unit tests for clamp behavior (`tests/unit/debugConfig.test.ts`)
   - Gameplay/unit tests asserting exact dimensions if defaults changed.
5. **Update docs** when defaults/ranges change:
   - `README.md`
   - `docs/features.md`
6. **Validate**:
   - `npm run test:unit`
   - `npm run test:e2e`
7. **Commit** with a focused message describing default + normalization changes.

## Quick checklist

- [ ] Default value changed
- [ ] Slider range re-centered around default
- [ ] Clamp range synced
- [ ] Tests updated
- [ ] Docs updated
- [ ] Unit + E2E passing
