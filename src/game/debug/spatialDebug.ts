import {
  AxesHelper,
  Box3,
  BoxGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
  WireframeGeometry,
} from "three";
import type { CharacterSceneNodes, RemyDebugConfig } from "../characters/contracts";
import { createTransformSnapshot, roundScalar, roundVector, type SpatialVector3Snapshot, type TransformSnapshot } from "./transformSnapshot";

export interface SpatialBoundsSnapshot {
  min: SpatialVector3Snapshot;
  max: SpatialVector3Snapshot;
  size: SpatialVector3Snapshot;
  center: SpatialVector3Snapshot;
}

export interface SpatialHelperPointsSnapshot {
  placementOrigin: SpatialVector3Snapshot;
  modelOrigin: SpatialVector3Snapshot;
  boundsCenter: SpatialVector3Snapshot;
  bottomContactPoint: SpatialVector3Snapshot;
}

export interface SpatialAnchorSnapshot {
  level: number | null;
  faceId: string | null;
  slabPosition: SpatialVector3Snapshot | null;
  ledgePosition: SpatialVector3Snapshot | null;
  ledgeRotationYDegrees: number | null;
  ledgeHeight: number | null;
  ledgeDepth: number | null;
  usableWidth: number | null;
  widthRatio: number | null;
  laneOffset: number | null;
  targetHeight: number | null;
  relationToLedge: {
    x: number;
    y: number;
    z: number;
  } | null;
  support: LedgeSupportSnapshot | null;
}

export interface LedgeSupportSnapshot {
  ledgeLocalBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  footprintLocalBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  margins: {
    left: number;
    right: number;
    back: number;
    front: number;
  };
  footprintCoverageRatio: number;
  centerOnLedge: boolean;
  footprintIntersectsLedge: boolean;
  /** Legacy alias kept for tests/debug UI: distance from character bottom to the walkable ledge top. */
  verticalGap: number;
  ledgeTopY: number;
  topSurfaceVerticalGap: number;
  penetratesLedgeTop: boolean;
}

export interface CharacterSpatialSnapshot {
  role: "primary" | "secondary";
  characterId: string | null;
  attached: boolean;
  attachmentParentName: string | null;
  uniformScale: number;
  facingRotationYDegrees: number;
  poseRotationDegrees: SpatialVector3Snapshot;
  worldPosition: SpatialVector3Snapshot;
  baseHeight: number;
  baseDepth: number;
  debugConfig: RemyDebugConfig;
  bounds: SpatialBoundsSnapshot;
  helpers: SpatialHelperPointsSnapshot;
  nodes: {
    characterRoot: TransformSnapshot;
    placementNode: TransformSnapshot;
    facingNode: TransformSnapshot;
    scaleNode: TransformSnapshot;
    correctionNode: TransformSnapshot;
    poseRotateX: TransformSnapshot;
    poseRotateY: TransformSnapshot;
    poseRotateZ: TransformSnapshot;
    animationTarget: TransformSnapshot;
  };
  anchor: SpatialAnchorSnapshot | null;
}

export interface CharacterSpatialDebugInput {
  role: "primary" | "secondary";
  characterId: string | null;
  view: {
    baseHeight: number;
    baseDepth: number;
    sceneNodes: CharacterSceneNodes;
  };
  debugConfig: RemyDebugConfig;
  anchor?: {
    level: number | null;
    faceId: string | null;
    slabPosition: SpatialVector3Snapshot | null;
    ledgePosition: SpatialVector3Snapshot | null;
    ledgeRotationY: number | null;
    ledgeHeight: number | null;
    ledgeDepth: number | null;
    usableWidth: number | null;
    widthRatio: number | null;
    laneOffset: number | null;
    targetHeight: number | null;
  } | null;
}

const BOUNDS = new Box3();
const SIZE = new Vector3();
const CENTER = new Vector3();
const PLACEMENT_ORIGIN = new Vector3();
const MODEL_ORIGIN = new Vector3();

function worldToLedgeLocal(
  worldPoint: SpatialVector3Snapshot,
  ledgeWorldPosition: SpatialVector3Snapshot,
  ledgeRotationY: number,
): { x: number; z: number } {
  const dx = worldPoint.x - ledgeWorldPosition.x;
  const dz = worldPoint.z - ledgeWorldPosition.z;
  const cosine = Math.cos(ledgeRotationY);
  const sine = Math.sin(ledgeRotationY);

  return {
    x: dx * cosine - dz * sine,
    z: dx * sine + dz * cosine,
  };
}

function createLedgeSupportSnapshot(
  bounds: Box3,
  bottomContactPoint: SpatialVector3Snapshot,
  ledgeWorldPosition: SpatialVector3Snapshot | null,
  ledgeRotationY: number | null,
  ledgeDepth: number | null,
  usableWidth: number | null,
  precision: number,
): LedgeSupportSnapshot | null {
  if (
    ledgeWorldPosition === null ||
    ledgeRotationY === null ||
    ledgeDepth === null ||
    usableWidth === null ||
    ledgeDepth <= 0 ||
    usableWidth <= 0
  ) {
    return null;
  }

  const corners = [
    { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
    { x: bounds.min.x, y: bounds.min.y, z: bounds.max.z },
    { x: bounds.max.x, y: bounds.min.y, z: bounds.min.z },
    { x: bounds.max.x, y: bounds.min.y, z: bounds.max.z },
  ].map((corner) => worldToLedgeLocal(corner, ledgeWorldPosition, ledgeRotationY));
  const center = worldToLedgeLocal(bottomContactPoint, ledgeWorldPosition, ledgeRotationY);

  const footprintLocalBounds = {
    minX: Math.min(...corners.map((corner) => corner.x)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    minZ: Math.min(...corners.map((corner) => corner.z)),
    maxZ: Math.max(...corners.map((corner) => corner.z)),
  };
  const ledgeLocalBounds = {
    minX: -usableWidth / 2,
    maxX: usableWidth / 2,
    minZ: -ledgeDepth / 2,
    maxZ: ledgeDepth / 2,
  };

  const overlapX = Math.max(
    0,
    Math.min(footprintLocalBounds.maxX, ledgeLocalBounds.maxX) -
      Math.max(footprintLocalBounds.minX, ledgeLocalBounds.minX),
  );
  const overlapZ = Math.max(
    0,
    Math.min(footprintLocalBounds.maxZ, ledgeLocalBounds.maxZ) -
      Math.max(footprintLocalBounds.minZ, ledgeLocalBounds.minZ),
  );
  const footprintArea = Math.max(
    0.0001,
    (footprintLocalBounds.maxX - footprintLocalBounds.minX) *
      (footprintLocalBounds.maxZ - footprintLocalBounds.minZ),
  );
  const footprintCoverageRatio = (overlapX * overlapZ) / footprintArea;
  const centerOnLedge =
    center.x >= ledgeLocalBounds.minX &&
    center.x <= ledgeLocalBounds.maxX &&
    center.z >= ledgeLocalBounds.minZ &&
    center.z <= ledgeLocalBounds.maxZ;

  const topSurfaceVerticalGap = bottomContactPoint.y - ledgeWorldPosition.y;

  return {
    ledgeLocalBounds: {
      minX: roundScalar(ledgeLocalBounds.minX, precision),
      maxX: roundScalar(ledgeLocalBounds.maxX, precision),
      minZ: roundScalar(ledgeLocalBounds.minZ, precision),
      maxZ: roundScalar(ledgeLocalBounds.maxZ, precision),
    },
    footprintLocalBounds: {
      minX: roundScalar(footprintLocalBounds.minX, precision),
      maxX: roundScalar(footprintLocalBounds.maxX, precision),
      minZ: roundScalar(footprintLocalBounds.minZ, precision),
      maxZ: roundScalar(footprintLocalBounds.maxZ, precision),
    },
    margins: {
      left: roundScalar(footprintLocalBounds.minX - ledgeLocalBounds.minX, precision),
      right: roundScalar(ledgeLocalBounds.maxX - footprintLocalBounds.maxX, precision),
      back: roundScalar(footprintLocalBounds.minZ - ledgeLocalBounds.minZ, precision),
      front: roundScalar(ledgeLocalBounds.maxZ - footprintLocalBounds.maxZ, precision),
    },
    footprintCoverageRatio: roundScalar(footprintCoverageRatio, precision),
    centerOnLedge,
    footprintIntersectsLedge: overlapX > 0 && overlapZ > 0,
    verticalGap: roundScalar(topSurfaceVerticalGap, precision),
    ledgeTopY: roundScalar(ledgeWorldPosition.y, precision),
    topSurfaceVerticalGap: roundScalar(topSurfaceVerticalGap, precision),
    penetratesLedgeTop: topSurfaceVerticalGap < -0.005,
  };
}

export function createCharacterSpatialSnapshot(
  input: CharacterSpatialDebugInput,
  precision = 4,
): CharacterSpatialSnapshot | null {
  const { sceneNodes } = input.view;
  if (!sceneNodes.characterRoot.parent) {
    return null;
  }

  sceneNodes.characterRoot.updateWorldMatrix(true, true);
  const bounds = BOUNDS.setFromObject(sceneNodes.animationTarget);
  if (bounds.isEmpty()) {
    return null;
  }

  const size = bounds.getSize(SIZE);
  const center = bounds.getCenter(CENTER);
  sceneNodes.placementNode.getWorldPosition(PLACEMENT_ORIGIN);
  sceneNodes.animationTarget.getWorldPosition(MODEL_ORIGIN);

  const bottomContactPoint = roundVector({
    x: center.x,
    y: bounds.min.y,
    z: center.z,
  }, precision);

  const anchorLedgeWorldPosition = input.anchor?.ledgePosition
    ? {
        x: input.anchor.ledgePosition.x + (input.anchor.slabPosition?.x ?? 0),
        y: input.anchor.ledgePosition.y + (input.anchor.slabPosition?.y ?? 0),
        z: input.anchor.ledgePosition.z + (input.anchor.slabPosition?.z ?? 0),
      }
    : null;

  const anchor = input.anchor
    ? {
        level: input.anchor.level,
        faceId: input.anchor.faceId,
        slabPosition: input.anchor.slabPosition,
        ledgePosition: input.anchor.ledgePosition,
        ledgeRotationYDegrees:
          input.anchor.ledgeRotationY === null ? null : roundScalar((input.anchor.ledgeRotationY * 180) / Math.PI, precision),
        ledgeHeight: input.anchor.ledgeHeight === null ? null : roundScalar(input.anchor.ledgeHeight, precision),
        ledgeDepth: input.anchor.ledgeDepth === null ? null : roundScalar(input.anchor.ledgeDepth, precision),
        usableWidth: input.anchor.usableWidth === null ? null : roundScalar(input.anchor.usableWidth, precision),
        widthRatio: input.anchor.widthRatio === null ? null : roundScalar(input.anchor.widthRatio, precision),
        laneOffset: input.anchor.laneOffset === null ? null : roundScalar(input.anchor.laneOffset, precision),
        targetHeight: input.anchor.targetHeight === null ? null : roundScalar(input.anchor.targetHeight, precision),
        relationToLedge:
          anchorLedgeWorldPosition === null
            ? null
            : {
                x: roundScalar(bottomContactPoint.x - anchorLedgeWorldPosition.x, precision),
                y: roundScalar(bottomContactPoint.y - anchorLedgeWorldPosition.y, precision),
                z: roundScalar(bottomContactPoint.z - anchorLedgeWorldPosition.z, precision),
              },
        support: createLedgeSupportSnapshot(
          bounds,
          bottomContactPoint,
          anchorLedgeWorldPosition,
          input.anchor.ledgeRotationY,
          input.anchor.ledgeDepth,
          input.anchor.usableWidth,
          precision,
        ),
      }
    : null;

  const placementNodeSnapshot = createTransformSnapshot(sceneNodes.placementNode, precision);
  const facingNodeSnapshot = createTransformSnapshot(sceneNodes.facingNode, precision);
  const scaleNodeSnapshot = createTransformSnapshot(sceneNodes.scaleNode, precision);
  const poseRotateXSnapshot = createTransformSnapshot(sceneNodes.poseRotateX, precision);
  const poseRotateYSnapshot = createTransformSnapshot(sceneNodes.poseRotateY, precision);
  const poseRotateZSnapshot = createTransformSnapshot(sceneNodes.poseRotateZ, precision);

  return {
    role: input.role,
    characterId: input.characterId,
    attached: sceneNodes.characterRoot.parent !== null,
    attachmentParentName: sceneNodes.characterRoot.parent?.name ?? null,
    uniformScale: roundScalar(scaleNodeSnapshot.localScale.x, precision),
    facingRotationYDegrees: roundScalar(facingNodeSnapshot.localRotationDegrees.y, precision),
    poseRotationDegrees: {
      x: poseRotateXSnapshot.localRotationDegrees.x,
      y: poseRotateYSnapshot.localRotationDegrees.y,
      z: poseRotateZSnapshot.localRotationDegrees.z,
    },
    worldPosition: placementNodeSnapshot.worldPosition,
    baseHeight: roundScalar(input.view.baseHeight, precision),
    baseDepth: roundScalar(input.view.baseDepth, precision),
    debugConfig: {
      yawDegrees: roundScalar(input.debugConfig.yawDegrees, precision),
      pitchDegrees: roundScalar(input.debugConfig.pitchDegrees, precision),
      rollDegrees: roundScalar(input.debugConfig.rollDegrees, precision),
      translateX: roundScalar(input.debugConfig.translateX, precision),
      translateY: roundScalar(input.debugConfig.translateY, precision),
      translateZ: roundScalar(input.debugConfig.translateZ, precision),
    },
    bounds: {
      min: roundVector(bounds.min, precision),
      max: roundVector(bounds.max, precision),
      size: roundVector(size, precision),
      center: roundVector(center, precision),
    },
    helpers: {
      placementOrigin: roundVector(PLACEMENT_ORIGIN, precision),
      modelOrigin: roundVector(MODEL_ORIGIN, precision),
      boundsCenter: roundVector(center, precision),
      bottomContactPoint,
    },
    nodes: {
      characterRoot: createTransformSnapshot(sceneNodes.characterRoot, precision),
      placementNode: placementNodeSnapshot,
      facingNode: facingNodeSnapshot,
      scaleNode: scaleNodeSnapshot,
      correctionNode: createTransformSnapshot(sceneNodes.correctionNode, precision),
      poseRotateX: poseRotateXSnapshot,
      poseRotateY: poseRotateYSnapshot,
      poseRotateZ: poseRotateZSnapshot,
      animationTarget: createTransformSnapshot(sceneNodes.animationTarget, precision),
    },
    anchor,
  };
}

export interface SpatialDebugSurfaceState {
  visible: boolean;
}

export interface SpatialDebugSurface {
  readonly root: Group;
  update(snapshot: CharacterSpatialSnapshot | null, state: SpatialDebugSurfaceState): void;
}

export function createSpatialDebugSurface(): SpatialDebugSurface {
  const root = new Group();
  root.name = "spatial-debug-surface";
  root.visible = false;

  const axes = new AxesHelper(0.65);
  axes.name = "spatial-debug-placement-origin";
  root.add(axes);

  const pointGeometry = new SphereGeometry(0.08, 8, 8);
  const boundsCenterMarker = new Mesh(pointGeometry, new MeshBasicMaterial({ color: 0x3ddc97, depthTest: false }));
  boundsCenterMarker.name = "spatial-debug-bounds-center";
  const contactMarker = new Mesh(pointGeometry, new MeshBasicMaterial({ color: 0xffb703, depthTest: false }));
  contactMarker.name = "spatial-debug-contact-point";
  const modelOriginMarker = new Mesh(pointGeometry, new MeshBasicMaterial({ color: 0xff4d6d, depthTest: false }));
  modelOriginMarker.name = "spatial-debug-model-origin";

  const boundsGeometry = new WireframeGeometry(new BoxGeometry(1, 1, 1));
  const boundsLines = new LineSegments(boundsGeometry, new LineBasicMaterial({ color: 0x8ecae6, depthTest: false }));
  boundsLines.name = "spatial-debug-bounds";

  root.add(boundsCenterMarker, contactMarker, modelOriginMarker, boundsLines);

  return {
    root,
    update(snapshot, state) {
      root.visible = state.visible && snapshot !== null;
      if (!root.visible || !snapshot) {
        return;
      }

      axes.position.set(
        snapshot.helpers.placementOrigin.x,
        snapshot.helpers.placementOrigin.y,
        snapshot.helpers.placementOrigin.z,
      );
      modelOriginMarker.position.set(snapshot.helpers.modelOrigin.x, snapshot.helpers.modelOrigin.y, snapshot.helpers.modelOrigin.z);
      boundsCenterMarker.position.set(snapshot.helpers.boundsCenter.x, snapshot.helpers.boundsCenter.y, snapshot.helpers.boundsCenter.z);
      contactMarker.position.set(
        snapshot.helpers.bottomContactPoint.x,
        snapshot.helpers.bottomContactPoint.y,
        snapshot.helpers.bottomContactPoint.z,
      );

      boundsLines.position.set(snapshot.bounds.center.x, snapshot.bounds.center.y, snapshot.bounds.center.z);
      boundsLines.scale.set(
        Math.max(snapshot.bounds.size.x, 0.0001),
        Math.max(snapshot.bounds.size.y, 0.0001),
        Math.max(snapshot.bounds.size.z, 0.0001),
      );
    },
  };
}
