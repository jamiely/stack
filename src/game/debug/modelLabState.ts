export interface ModelLabState {
  enabled: boolean;
  showSpatialHelpers: boolean;
  forceTopFallback: boolean;
  overheadInspectionView: boolean;
}

export type ModelLabStatePatch = Partial<Omit<ModelLabState, "enabled">>;

export function createModelLabState(enabled: boolean): ModelLabState {
  return {
    enabled,
    showSpatialHelpers: false,
    forceTopFallback: false,
    overheadInspectionView: false,
  };
}

export function applyModelLabStatePatch(state: ModelLabState, patch: ModelLabStatePatch): ModelLabState {
  if (!state.enabled) {
    return state;
  }

  return {
    enabled: state.enabled,
    showSpatialHelpers: patch.showSpatialHelpers ?? state.showSpatialHelpers,
    forceTopFallback: patch.forceTopFallback ?? state.forceTopFallback,
    overheadInspectionView: patch.overheadInspectionView ?? state.overheadInspectionView,
  };
}
