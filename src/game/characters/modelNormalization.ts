import { Box3, Object3D, Vector3 } from "three";
import type { RemyModelNormalizationMetrics } from "./contracts";

export function measureRemyModelNormalization(model: Object3D): RemyModelNormalizationMetrics | null {
  const modelBounds = new Box3().setFromObject(model);
  const modelSize = modelBounds.getSize(new Vector3());
  if (modelSize.y <= 0) {
    return null;
  }

  const modelCenter = modelBounds.getCenter(new Vector3());
  return {
    boundsCenter: {
      x: modelCenter.x,
      y: modelCenter.y,
      z: modelCenter.z,
    },
    baseHeight: modelSize.y,
    baseDepth: Math.max(modelSize.x, modelSize.z),
    centerOffsetFromFeet: modelCenter.y - modelBounds.min.y,
  };
}

export function applyRemyModelNormalization(model: Object3D, metrics: RemyModelNormalizationMetrics): void {
  model.position.set(-metrics.boundsCenter.x, -metrics.boundsCenter.y, -metrics.boundsCenter.z);
}

export function normalizeRemyModel(model: Object3D): RemyModelNormalizationMetrics | null {
  const metrics = measureRemyModelNormalization(model);
  if (!metrics) {
    return null;
  }

  applyRemyModelNormalization(model, metrics);
  return metrics;
}
