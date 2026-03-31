# Current Cloud System Research

## Scope
Investigated current cloud implementation and lifecycle behavior in runtime code.

## Key Findings

1. **Cloud state is managed inside `Game` rather than an isolated cloud module**
   - `src/game/Game.ts` stores cloud anchor arrays (`cloudWorldAnchors`, `cloudSpawnFromTop`, `cloudSizeScales`) and updates cloud actor DOM directly in `updateCloudLayer(...)`.

2. **Cloud count is currently fixed at 3 DOM nodes**
   - Created in `buildDistractionOverlay()` via `for (let index = 0; index < 3; index += 1)`.
   - This does not yet support a debug-tunable cloud density/count.

3. **Respawn behavior is mixed between periodic forced respawn + visibility-triggered respawn**
   - Periodic respawn every N levels: `CLOUD_RESPAWN_LEVEL_INTERVAL = 2`.
   - Visibility respawn: `shouldRespawnCloud(projected)` where off-bottom or behind-camera triggers respawn.

4. **Current vertical behavior includes ambient bobbing**
   - `worldPoint.y = anchor.y + cos(bobPhase + ...) * 0.22` introduces time-driven vertical movement.
   - This conflicts with requirement that vertical movement should primarily reflect camera/stack ascent.

5. **Current spawn method is camera-targeted and partially screen-anchored in construction**
   - `createCloudAnchor(...)` derives positions with `resolveCloudSpawnNdcX(...)` + `sampleWorldPointForScreenTarget(...)` and camera-relative values.
   - This can produce behavior that appears not strictly world-native.

6. **Depth (front/behind stack) is already represented, but not explicitly policy-driven**
   - Anchor generation uses front/back sign (`frontSign`) and depth offsets, but there is no explicit invariant like “maintain front/back mix ratio.”

## Behavior Risks Mapped to Reported Issues

- **“Clouds seem stuck in Y”** can happen from lifecycle strategy + projection coupling + LOD-throttled updates.
- **“Clouds disappear randomly”** can happen from:
  - periodic level-based respawn,
  - behind-camera respawn condition,
  - lack of explicit lifecycle semantics tied only to camera-relative thresholds.

## Existing Unit Logic Constraints

`src/game/logic/clouds.ts` currently only provides:
- `shouldRespawnCloud(projected)`
- `resolveCloudSpawnNdcX(noise)`

This is too narrow for desired deterministic, unit-testable world-lifecycle behavior (camera-relative spawn/despawn bands, front/back policy, recycle semantics).

## Component Relationship (Current)

```mermaid
flowchart TD
  A[Game.updateDistractionActors] --> B[updateCloudLayer]
  B --> C[cloudWorldAnchors[]]
  B --> D[project world point via camera]
  D --> E[shouldRespawnCloud(projected)]
  E -->|true| F[createCloudAnchor]
  B --> G[DOM transform .distraction-cloud]
  H[CLOUD_RESPAWN_LEVEL_INTERVAL] --> B
```

## Sources
- `src/game/Game.ts`
- `src/game/logic/clouds.ts`
- `tests/unit/clouds.test.ts`
- `tests/e2e/clouds.spec.ts`
