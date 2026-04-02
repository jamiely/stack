# Broken Windows

### [src/game/Game.ts:693-711, src/game/Game.ts:2488-2507] Duplicated integer-key list for debug numbers
**Type**: duplication  
**Risk**: Low  
**Fix**: Extract the repeated `integerKeys` array to a single shared constant (e.g., `DEBUG_INTEGER_KEYS`) and reuse in both input parsing and HUD formatting.
**Code**:
```ts
const integerKeys: DebugNumberKey[] = [
  "comboTarget",
  "recoverySlowdownPlacements",
  // ...
  "distractionFireworksMaxActiveParticles",
  "dayNightCycleBlocks",
];
```

### [src/game/logic/fireworks.ts:437-440, src/game/logic/fireworks.ts:498-501] Primary/secondary burst speed and drag values are inline magic values
**Type**: magic-values  
**Risk**: Low  
**Fix**: Lift burst shaping literals (`speedMin/speedMax/drag/gravity multipliers`) into named constants near other simulation constants to make future morphology tuning safer and easier.
**Code**:
```ts
speedMin: 6,
speedMax: 14,
drag: 0.94,

speedMin: 4,
speedMax: 10,
gravity: sanitizedConfig.shellGravity * 1.45,
drag: 0.9,
```
