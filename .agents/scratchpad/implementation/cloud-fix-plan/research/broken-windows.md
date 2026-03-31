## Broken Windows

### [src/game/Game.ts:421-423, src/game/Game.ts:623-627] Cloud count is hardcoded in multiple places
**Type**: magic-values
**Risk**: Low
**Fix**: Replace repeated `3`/preset arrays with a shared cloud-count source (or derived from config) to avoid drift when count becomes runtime-tunable.
**Code**:
```ts
private cloudWorldAnchors: Vector3[] = [new Vector3(), new Vector3(), new Vector3()];
private cloudSpawnFromTop: boolean[] = [false, false, false];
private cloudSizeScales: number[] = [1, 1, 1];
...
for (let index = 0; index < 3; index += 1) {
  const cloud = document.createElement("span");
  cloud.className = "distraction-cloud";
  this.cloudLayer.append(cloud);
}
```

### [src/game/Game.ts:678-692, src/game/Game.ts:2317-2331] Duplicate integer debug-key lists
**Type**: duplication
**Risk**: Low
**Fix**: Extract one shared `INTEGER_DEBUG_KEYS` constant used by both slider input handling and debug-value formatting.
**Code**:
```ts
const integerKeys: DebugNumberKey[] = [
  "comboTarget",
  "recoverySlowdownPlacements",
  ...
  "dayNightCycleBlocks",
];
...
const integerKeys: DebugNumberKey[] = [
  "prebuiltLevels",
  "comboTarget",
  ...
  "dayNightCycleBlocks",
];
```

### [tests/unit/clouds.test.ts:29] Trailing empty line near suite end
**Type**: formatting
**Risk**: Low
**Fix**: Remove extra blank line before closing `});` to keep test-file formatting consistent.
**Code**:
```ts
  it("clamps spawn noise before mapping", () => {
    expect(resolveCloudSpawnNdcX(-5)).toBeCloseTo(-0.95, 6);
    expect(resolveCloudSpawnNdcX(9)).toBeCloseTo(0.95, 6);
  });

});
```
