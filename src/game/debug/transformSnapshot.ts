import { Euler, Object3D, Quaternion, Vector3 } from "three";

export interface SpatialVector3Snapshot {
  x: number;
  y: number;
  z: number;
}

export interface TransformSnapshot {
  name: string;
  visible: boolean;
  localPosition: SpatialVector3Snapshot;
  localRotationDegrees: SpatialVector3Snapshot;
  localScale: SpatialVector3Snapshot;
  worldPosition: SpatialVector3Snapshot;
  worldRotationDegrees: SpatialVector3Snapshot;
  worldScale: SpatialVector3Snapshot;
}

const WORLD_POSITION = new Vector3();
const WORLD_SCALE = new Vector3();
const WORLD_QUATERNION = new Quaternion();
const WORLD_EULER = new Euler();

export function createTransformSnapshot(object: Object3D, precision = 4): TransformSnapshot {
  object.updateWorldMatrix(true, false);
  object.getWorldPosition(WORLD_POSITION);
  object.getWorldScale(WORLD_SCALE);
  object.getWorldQuaternion(WORLD_QUATERNION);
  WORLD_EULER.setFromQuaternion(WORLD_QUATERNION, object.rotation.order);

  return {
    name: object.name,
    visible: object.visible,
    localPosition: roundVector(object.position, precision),
    localRotationDegrees: roundEulerDegrees(object.rotation, precision),
    localScale: roundVector(object.scale, precision),
    worldPosition: roundVector(WORLD_POSITION, precision),
    worldRotationDegrees: roundEulerDegrees(WORLD_EULER, precision),
    worldScale: roundVector(WORLD_SCALE, precision),
  };
}

export function roundScalar(value: number, precision = 4): number {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

export function roundVector(vector: Vector3 | SpatialVector3Snapshot, precision = 4): SpatialVector3Snapshot {
  return {
    x: roundScalar(vector.x, precision),
    y: roundScalar(vector.y, precision),
    z: roundScalar(vector.z, precision),
  };
}

export function roundEulerDegrees(euler: Euler, precision = 4): SpatialVector3Snapshot {
  return {
    x: roundScalar(radiansToDegrees(euler.x), precision),
    y: roundScalar(radiansToDegrees(euler.y), precision),
    z: roundScalar(radiansToDegrees(euler.z), precision),
  };
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
