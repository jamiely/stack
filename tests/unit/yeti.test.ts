import { readFileSync } from "node:fs";
import { AnimationMixer, Box3, SkinnedMesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import { GORILLA_CLIP_NAMES, normalizeGorillaModel } from "../../src/game/distractions/gorillaModel";
import {
  YETI_AIR_EXTENTS,
  YETI_GROUND_EXTENTS,
  YETI_MIN_PERCH_SECONDS,
  YETI_WALL_CLEARANCE,
  YetiMotion,
  bodyHits,
  boxesOverlap,
  choosePerch,
  fitYetiHeight,
  hopIsClear,
  perchYaw,
  planHop,
  resolvePerchOffset,
  sampleHopFrame,
  standingBody,
  yetiBox,
  type Box,
  type Perch,
  type YetiPose,
} from "../../src/game/logic/yeti";

const HEIGHT = 1.2;
// Tower of three 7x3x7 slabs centred on the origin, stacked from y=0.
const slab = (level: number): Box => ({ minX: -3.65, maxX: 3.65, minY: level * 3 - 1.5, maxY: level * 3 + 1.5, minZ: -3.65, maxZ: 3.65 });
const tower = [slab(0), slab(1), slab(2)];
// Ledge floors stick out of the +Z face (0.3 deep beyond the wall, 0.18 thick) at each level's base.
const ledgeTop = (level: number) => level * 3 - 1.5 + 0.2;
const ledgeFloor = (level: number): Box => ({ minX: -2, maxX: 2, minY: ledgeTop(level) - 0.18, maxY: ledgeTop(level), minZ: 3.5, maxZ: 5.3 });
const obstacles = [...tower, ledgeFloor(0), ledgeFloor(1), ledgeFloor(2)];
const perchAt = (level: number, x = 0): Perch => ({
  key: `L${level}`,
  x,
  y: ledgeTop(level),
  z: 3.5 + resolvePerchOffset(0, HEIGHT),
  normalX: 0,
  normalZ: 1,
});

describe("yeti grounding geometry", () => {
  it("faces out from the facade and sits its back a clearance away from the wall", () => {
    const perch = perchAt(1);
    const box = yetiBox(perch.x, perch.y, perch.z, perchYaw(0, 1), HEIGHT);
    expect(box.minZ).toBeCloseTo(3.5 + YETI_WALL_CLEARANCE, 6);
    expect(box.minY).toBe(perch.y);
    expect(bodyHits(standingBody(perch.x, perch.y, perch.z, perchYaw(0, 1), HEIGHT), obstacles)).toBe(false);
    // A raised lip at the ledge's outer edge stops the feet, not the belly leaning over it.
    const lip: Box = { minX: -2, maxX: 2, minY: perch.y, maxY: perch.y + 0.06, minZ: box.maxZ - 0.1, maxZ: box.maxZ + 0.2 };
    expect(bodyHits(standingBody(perch.x, perch.y, perch.z, perchYaw(0, 1), HEIGHT), [lip])).toBe(false);
    expect(boxesOverlap(box, lip)).toBe(true);
    // Turned toward +X the body box swaps axes.
    const side = yetiBox(0, 0, 0, perchYaw(1, 0), HEIGHT);
    expect(side.minX).toBeCloseTo(-YETI_GROUND_EXTENTS.back * HEIGHT, 6);
    expect(side.maxX).toBeCloseTo(YETI_GROUND_EXTENTS.front * HEIGHT, 6);
  });

  it("fits the yeti between wall and lip, letting the belly lean over a low lip", () => {
    const lowLip = fitYetiHeight(3, 1.4, 0.05);
    expect(lowLip).toBeCloseTo((1.4 - 0.24) / (0.37 + 0.22), 6);
    expect(fitYetiHeight(3, 1.4, 1)).toBeCloseTo((1.4 - 0.24) / 0.74, 6);
    expect(fitYetiHeight(1, 5, 0.05)).toBe(1);
    expect(fitYetiHeight(1, 0.1, 0)).toBe(0);
  });

  it("picks the highest perch and keeps the current one on a tie", () => {
    const a = perchAt(1, -1);
    const b = { ...perchAt(1, 1), key: "other" };
    expect(choosePerch([a, perchAt(2), b], null)?.key).toBe("L2");
    expect(choosePerch([a, b], "other")?.key).toBe("other");
    expect(choosePerch([], null)).toBeNull();
  });

  it("plans a leap whose eased arc clears the tower, the ledges and the lip", () => {
    const hop = planHop(perchAt(0), perchAt(2), obstacles, HEIGHT)!;
    expect(hop).not.toBeNull();
    expect(hopIsClear(hop, obstacles, HEIGHT, 600)).toBe(true);
    const start = sampleHopFrame(hop, 0, HEIGHT);
    const end = sampleHopFrame(hop, hop.duration, HEIGHT);
    expect([start.x, start.y, start.z]).toEqual([hop.from.x, hop.from.y, hop.from.z]);
    expect(end.y).toBeCloseTo(hop.to.y, 6);
    expect(end.z).toBeCloseTo(hop.to.z, 6);
    // Eased: the first and last tenth of the time cover far less height than the middle.
    const y = (f: number) => sampleHopFrame(hop, hop.duration * f, HEIGHT).y;
    expect(Math.max(...[0.3, 0.5, 0.7].map(y))).toBeGreaterThan(hop.to.y);
    expect(Math.abs(y(0.05) - y(0))).toBeLessThan(Math.abs(y(0.55) - y(0.45)) * 3);
  });

  it("reports when no arc can clear the obstacles", () => {
    const wall: Box = { minX: -50, maxX: 50, minY: -50, maxY: 50, minZ: 4.6, maxZ: 50 };
    expect(planHop(perchAt(0), perchAt(2), [...obstacles, wall], HEIGHT)).toBeNull();
  });
});

describe("yeti motion", () => {
  const run = (motion: YetiMotion, seconds: number, perches: Perch[], active = true) => {
    const poses: YetiPose[] = [];
    for (let t = 0; t < seconds; t += 1 / 60) {
      const pose = motion.update(1 / 60, active, perches, obstacles, HEIGHT);
      if (pose) poses.push(pose);
    }
    return poses;
  };

  it("drops in, lands, idles on the ledge and leaps when a higher ledge appears", () => {
    const motion = new YetiMotion();
    const arrival = run(motion, 1.5, [perchAt(1)]);
    expect(arrival[0]!.phase).toBe("air");
    expect(arrival.filter((pose) => pose.landed)).toHaveLength(1);
    const settled = arrival[arrival.length - 1]!;
    expect(settled.phase).toBe("perched");
    expect([settled.x, settled.y, settled.z]).toEqual([perchAt(1).x, perchAt(1).y, perchAt(1).z]);
    expect(settled.clips).toEqual([expect.objectContaining({ clip: "Idle", weight: 1 })]);

    const leap = run(motion, YETI_MIN_PERCH_SECONDS + 3, [perchAt(1), perchAt(2)]);
    const phases = leap.map((pose) => pose.phase).filter((phase, index, all) => phase !== all[index - 1]);
    expect(phases).toEqual(["perched", "takeoff", "air", "landing", "perched"]);
    expect(leap.filter((pose) => pose.landed)).toHaveLength(1);
    expect(leap[leap.length - 1]!.y).toBe(perchAt(2).y);
    // Every frame of the leap keeps the body out of the tower and the ledges.
    const check = new YetiMotion();
    run(check, 1.5, [perchAt(1)]);
    for (let t = 0; t < YETI_MIN_PERCH_SECONDS + 3; t += 1 / 60) {
      check.update(1 / 60, true, [perchAt(1), perchAt(2)], obstacles, HEIGHT);
      expect(bodyHits(check.body(HEIGHT)!, obstacles)).toBe(false);
    }
  });

  it("follows a perch that moves with its slab and fades out when the channel ends", () => {
    const motion = new YetiMotion();
    run(motion, 1.5, [perchAt(1)]);
    const shifted = { ...perchAt(1), x: 0.4 };
    expect(run(motion, 0.1, [shifted]).at(-1)!.x).toBe(0.4);
    const leaving = run(motion, 1, [shifted], false);
    expect(leaving[0]!.phase).toBe("leaving");
    expect(leaving.at(-1)!.presence).toBeLessThan(0.1);
    expect(motion.phase).toBe("hidden");
    expect(motion.body(HEIGHT)).toBeNull();
  });

  it("leaves when its ledge disappears and nothing else is reachable", () => {
    const motion = new YetiMotion();
    run(motion, 1.5, [perchAt(1)]);
    run(motion, 0.05, []);
    expect(["leaving", "hidden"]).toContain(motion.phase);
  });

  it("stays hidden with no perch and resets cleanly", () => {
    const motion = new YetiMotion();
    expect(run(motion, 1, [])).toEqual([]);
    run(motion, 1, [perchAt(0)]);
    motion.reset();
    expect(motion.phase).toBe("hidden");
    expect(motion.presence).toBe(0);
  });
});

async function parseYeti() {
  const previousSelf = globalThis.self;
  const previousCreateImageBitmap = globalThis.createImageBitmap;
  globalThis.self = globalThis as Window & typeof globalThis;
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close: () => undefined }) as ImageBitmap;
  try {
    const glb = readFileSync(new URL("../../assets/quaternius_yeti_model_b.glb", import.meta.url));
    return await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer, "");
  } finally {
    globalThis.self = previousSelf;
    globalThis.createImageBitmap = previousCreateImageBitmap;
  }
}

it("the real GLB's poses keep their feet on the root and stay inside the measured extents", async () => {
  const gltf = await parseYeti();
  const model = normalizeGorillaModel(gltf.scene, 1);
  let mesh: SkinnedMesh | null = null;
  model.traverse((node) => {
    if (node instanceof SkinnedMesh) mesh = node;
  });
  const skinned = mesh as unknown as SkinnedMesh;
  const mixer = new AnimationMixer(model);
  const bounds = (clipName: string, time: number) => {
    mixer.stopAllAction();
    const action = mixer.clipAction(gltf.animations.find((clip) => clip.name === clipName)!);
    action.reset().play();
    action.time = time * action.getClip().duration;
    mixer.update(0);
    model.updateMatrixWorld(true);
    skinned.computeBoundingBox();
    return new Box3().copy(skinned.boundingBox!).applyMatrix4(skinned.matrixWorld);
  };
  expect(GORILLA_CLIP_NAMES).toContain("Idle");
  // Every standing moment the motion uses: feet on the ground point, body inside the ground extents.
  const grounded: Array<[string, number]> = [["Idle", 0], ["Idle", 0.5], ["Jump", 0], ["Jump", 0.3], ["Jump", 0.55], ["Jump_Land", 0.45], ["Jump_Land", 0.9]];
  grounded.forEach(([clip, time]) => {
    const box = bounds(clip, time);
    expect(Math.abs(box.min.y)).toBeLessThan(0.01);
    expect(box.max.z).toBeLessThanOrEqual(YETI_GROUND_EXTENTS.back + 0.005);
    expect(Math.max(-box.min.x, box.max.x)).toBeLessThanOrEqual(YETI_GROUND_EXTENTS.halfWidth + 0.005);
  });
  // Airborne poses stay inside the air extents the collision check uses.
  [["Jump_Idle", 0], ["Jump_Idle", 0.5], ["Jump", 0.9], ["Jump_Land", 0]].forEach(([clip, time]) => {
    const box = bounds(clip as string, time as number);
    expect(box.max.z).toBeLessThanOrEqual(YETI_AIR_EXTENTS.back + 0.005);
    expect(-box.min.z).toBeLessThanOrEqual(YETI_AIR_EXTENTS.front + 0.005);
    expect(box.min.y).toBeGreaterThanOrEqual(YETI_AIR_EXTENTS.bottom - 0.005);
  });
});
