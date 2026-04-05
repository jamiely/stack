## Broken Windows

### [src/game/Game.ts:1349-1368, src/game/Game.ts:2617-2640] Remy lifecycle reset block is duplicated
**Type**: duplication
**Risk**: Low
**Fix**: Extract shared Remy runtime reset helper (e.g., `resetRemyRuntimeState`) used by both `resetWorld()` and `refreshRemyCharacterSelection()` to reduce drift risk during refactor.
**Code**:
```ts
private resetWorld(): void {
  this.remyLoadGeneration += 1;
  this.remyIsLoading = false;
  this.remyRefreshPending = false;
  this.remyAppearanceRefreshPending = false;
  this.detachRemyCharacter();
  this.remyCharacter = null;
  ...
}

private refreshRemyCharacterSelection(): void {
  this.remyLoadGeneration += 1;
  this.remyIsLoading = false;
  this.remyRefreshPending = false;
  this.remyAppearanceRefreshPending = false;
  this.activeRemyCharacterId = null;
  ...
  this.loadRemyCharacter();
}
```

### [src/game/Game.ts:891-915, src/game/Game.ts:3795-3819] Integer debug-key lists are duplicated
**Type**: duplication
**Risk**: Low
**Fix**: Lift the integer-key array into a shared constant so slider parsing and label formatting cannot diverge.
**Code**:
```ts
const integerKeys: DebugNumberKey[] = [
  "comboTarget",
  "recoverySlowdownPlacements",
  ...
  "dayNightCycleBlocks",
];
```

### [src/game/Game.ts:3239-3240] One-line suppression wrapper adds avoidable indirection
**Type**: complexity
**Risk**: Low
**Fix**: Inline `this.placeRemyOnTopLedge()` at the two callsites or rename wrapper to a clearer intent if it must remain as a semantic boundary.
**Code**:
```ts
private syncRemyTentacleSuppression(): void {
  this.placeRemyOnTopLedge();
}
```
