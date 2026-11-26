/**
 * Yeti distraction motion: the yeti stands on real balcony ledges and leaps between them.
 * Pure and deterministic: positions are world units, time is seconds, no three.js.
 * The root point is the yeti's ground point (the centre of its standing footprint).
 */

export interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** A standing spot: the ground point on a ledge top, plus the facade's outward normal. */
export interface Perch {
  key: string;
  x: number;
  y: number;
  z: number;
  normalX: number;
  normalZ: number;
}

/** Mesh extents as fractions of the yeti's height, measured from the GLB's clips (it faces local -Z). */
export interface YetiExtents {
  halfWidth: number;
  back: number;
  front: number;
  bottom: number;
}

export const YETI_GROUND_EXTENTS: YetiExtents = { halfWidth: 0.62, back: 0.37, front: 0.37, bottom: 0 };
export const YETI_AIR_EXTENTS: YetiExtents = { halfWidth: 0.62, back: 0.57, front: 0.74, bottom: 0.15 };
/** Gap between the facade and the yeti's back: clears protruding sills, bay windows and eaves. */
export const YETI_WALL_CLEARANCE = 0.2;
/** Gap between the yeti's front and the ledge's raised lip. */
export const YETI_LIP_CLEARANCE = 0.04;

export const YETI_TAKEOFF_SECONDS = 0.22;
export const YETI_LIFT_SECONDS = 0.11;
export const YETI_LAND_LEAD_SECONDS = 0.15;
export const YETI_LANDING_SECONDS = 0.19;
export const YETI_IDLE_BLEND_SECONDS = 0.12;
export const YETI_MIN_PERCH_SECONDS = 1.1;
export const YETI_FADE_SECONDS = 0.3;
const IDLE_CLIP_SECONDS = 1;
const JUMP_IDLE_CLIP_SECONDS = 0.5;
/** Clip-time fractions where the Jump clip leaves the ground and Jump_Land touches down. */
const JUMP_LIFTOFF = 0.6;
const JUMP_END = 0.9;
const LAND_TOUCHDOWN = 0.4;
const LAND_END = 0.9;
const ARRIVAL_DROP = 3.2;
const ARRIVAL_OUT = 1.8;
const ARRIVAL_SECONDS = 0.6;

export type YetiClip = "Idle" | "Jump" | "Jump_Idle" | "Jump_Land";
export type YetiPhase = "hidden" | "perched" | "takeoff" | "air" | "landing" | "leaving";

export interface YetiClipWeight {
  clip: YetiClip;
  /** Normalized clip time, 0..1. */
  time: number;
  weight: number;
}

export interface YetiPose {
  phase: YetiPhase;
  x: number;
  y: number;
  z: number;
  yaw: number;
  presence: number;
  clips: YetiClipWeight[];
  /** True on the frame the feet touch down. */
  landed: boolean;
}

export interface Hop {
  from: Perch;
  to: Perch;
  /** How far the leap swings out from the facade at its widest, along (outX, outZ). */
  outX: number;
  outZ: number;
  bulge: number;
  arc: number;
  duration: number;
  fromYaw: number;
  toYaw: number;
  /** An arrival drops in from the air: it skips the takeoff crouch. */
  arrival: boolean;
}

/** How far the standing feet reach forward, and how high that foot band is (fractions of height). */
export const YETI_FOOT_FRONT = 0.22;
export const YETI_FOOT_BAND = 0.1;

/**
 * Largest yeti that fits between the wall and the ledge lip, capped at the preferred height.
 * Only its feet must stay behind a low lip; the belly may lean out over it.
 */
export function fitYetiHeight(preferredHeight: number, ledgeInteriorDepth: number, lipHeight: number): number {
  const room = ledgeInteriorDepth - YETI_WALL_CLEARANCE - YETI_LIP_CLEARANCE;
  const withFeet = room / (YETI_GROUND_EXTENTS.back + YETI_FOOT_FRONT);
  const fitted = lipHeight <= withFeet * YETI_FOOT_BAND
    ? withFeet
    : room / (YETI_GROUND_EXTENTS.back + YETI_GROUND_EXTENTS.front);
  return Math.max(0, Math.min(preferredHeight, fitted));
}

/** Yaw that turns the model (its face points down its local -Z) to face out from the facade. */
export function perchYaw(normalX: number, normalZ: number): number {
  return Math.atan2(normalX, normalZ) + Math.PI;
}

/**
 * Ground point on a ledge: back against the wall plus clearance. `wallOffset` is the signed distance
 * from the ledge's centre to the facade along the outward normal (negative: the wall is behind it).
 */
export function resolvePerchOffset(wallOffset: number, height: number): number {
  return wallOffset + YETI_WALL_CLEARANCE + YETI_GROUND_EXTENTS.back * height;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpExtents(t: number): YetiExtents {
  return {
    halfWidth: lerp(YETI_GROUND_EXTENTS.halfWidth, YETI_AIR_EXTENTS.halfWidth, t),
    back: lerp(YETI_GROUND_EXTENTS.back, YETI_AIR_EXTENTS.back, t),
    front: lerp(YETI_GROUND_EXTENTS.front, YETI_AIR_EXTENTS.front, t),
    bottom: lerp(YETI_GROUND_EXTENTS.bottom, YETI_AIR_EXTENTS.bottom, t),
  };
}

export function yetiBox(x: number, y: number, z: number, yaw: number, height: number, extents: YetiExtents = YETI_GROUND_EXTENTS): Box {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const corners: Array<[number, number]> = [
    [-extents.halfWidth, -extents.front],
    [extents.halfWidth, -extents.front],
    [-extents.halfWidth, extents.back],
    [extents.halfWidth, extents.back],
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  corners.forEach(([lx, lz]) => {
    // three.js Y rotation: x' = x cos + z sin, z' = -x sin + z cos.
    const wx = x + (lx * cos + lz * sin) * height;
    const wz = z + (-lx * sin + lz * cos) * height;
    minX = Math.min(minX, wx);
    maxX = Math.max(maxX, wx);
    minZ = Math.min(minZ, wz);
    maxZ = Math.max(maxZ, wz);
  });
  return { minX, maxX, minY: y + extents.bottom * height, maxY: y + height, minZ, maxZ };
}

export function boxesOverlap(a: Box, b: Box, epsilon = 0.005): boolean {
  return (
    a.minX < b.maxX - epsilon &&
    a.maxX > b.minX + epsilon &&
    a.minY < b.maxY - epsilon &&
    a.maxY > b.minY + epsilon &&
    a.minZ < b.maxZ - epsilon &&
    a.maxZ > b.minZ + epsilon
  );
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerpAngle(from: number, to: number, t: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}

export interface HopFrame {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** 0 on the ground pose, 1 fully tucked in the air: how far the clip's extents have grown. */
  air: number;
}

/**
 * One moment of a leap. The airborne clips reach further back than the standing ones, so the root
 * shifts out from the wall by that growth; feet meet each perch exactly at both ends.
 */
export function sampleHopFrame(hop: Hop, seconds: number, height: number): HopFrame {
  const u = Math.min(1, Math.max(0, seconds / hop.duration));
  // Push out fast, hold the swing through the middle, tuck back in late: clears ledges stacked above each other.
  const swing = hop.bulge * (1 - (1 - Math.sin(Math.PI * u)) ** 2);
  const along = smooth(u);
  const yaw = lerpAngle(hop.fromYaw, hop.toYaw, smooth(u));
  const rise = hop.arrival ? 1 : Math.min(1, Math.max(0, seconds / YETI_LIFT_SECONDS));
  const fall = Math.min(1, Math.max(0, (hop.duration - seconds) / YETI_LAND_LEAD_SECONDS));
  const air = Math.min(rise, fall);
  const shift = air * (YETI_AIR_EXTENTS.back - YETI_GROUND_EXTENTS.back) * height;
  return {
    x: lerp(hop.from.x, hop.to.x, along) + hop.outX * swing - Math.sin(yaw) * shift,
    y: lerp(hop.from.y, hop.to.y, along) + hop.arc * 4 * u * (1 - u),
    z: lerp(hop.from.z, hop.to.z, along) + hop.outZ * swing - Math.cos(yaw) * shift,
    yaw,
    air,
  };
}

/**
 * The standing yeti as two boxes: its feet (short reach forward, so they stay behind a ledge lip)
 * and the body above them, which may lean out over the lip.
 */
export function standingBody(x: number, y: number, z: number, yaw: number, height: number): Box[] {
  const feet = yetiBox(x, y, z, yaw, height, { ...YETI_GROUND_EXTENTS, front: YETI_FOOT_FRONT });
  const body = yetiBox(x, y, z, yaw, height, { ...YETI_GROUND_EXTENTS, bottom: YETI_FOOT_BAND });
  return [{ ...feet, maxY: y + YETI_FOOT_BAND * height }, body];
}

/** Body boxes for one moment of a leap; at its ends it is the standing body. */
export function hopFrameBody(frame: HopFrame, height: number): Box[] {
  if (frame.air <= 0) {
    return standingBody(frame.x, frame.y, frame.z, frame.yaw, height);
  }
  return [yetiBox(frame.x, frame.y, frame.z, frame.yaw, height, lerpExtents(frame.air))];
}

export function bodyHits(body: Box[], obstacles: Box[]): boolean {
  return body.some((part) => obstacles.some((obstacle) => boxesOverlap(part, obstacle)));
}

/** The planner keeps this much air around every obstacle, so no in-between frame can graze one. */
export const YETI_HOP_MARGIN = 0.05;

function inflate(box: Box, margin: number): Box {
  return {
    minX: box.minX - margin,
    maxX: box.maxX + margin,
    minY: box.minY - margin,
    maxY: box.maxY + margin,
    minZ: box.minZ - margin,
    maxZ: box.maxZ + margin,
  };
}

export function hopIsClear(hop: Hop, obstacles: Box[], height: number, samples = 64, margin = 0): boolean {
  const padded = margin > 0 ? obstacles.map((obstacle) => inflate(obstacle, margin)) : obstacles;
  for (let index = 1; index < samples; index += 1) {
    const frame = sampleHopFrame(hop, (hop.duration * index) / samples, height);
    if (bodyHits(hopFrameBody(frame, height), padded)) {
      return false;
    }
  }
  return true;
}

/**
 * Plan an eased leap swung out from the facade (wider until it clears every obstacle) with a
 * parabolic arc on top. Returns null when no tried arc clears the tower.
 */
export function planHop(from: Perch, to: Perch, obstacles: Box[], height: number): Hop | null {
  const normalX = from.normalX + to.normalX;
  const normalZ = from.normalZ + to.normalZ;
  const normalLength = Math.hypot(normalX, normalZ) || 1;
  const outX = normalX / normalLength;
  const outZ = normalZ / normalLength;
  const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  const duration = Math.min(1.25, Math.max(0.6, 0.45 + distance * 0.08));
  const baseArc = Math.max(0, to.y - from.y) * 0.35 + height * 0.35;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const hop: Hop = {
      from,
      to,
      outX,
      outZ,
      bulge: height * 0.4 + attempt * 0.3,
      arc: baseArc + attempt * 0.1,
      duration,
      fromYaw: perchYaw(from.normalX, from.normalZ),
      toYaw: perchYaw(to.normalX, to.normalZ),
      arrival: false,
    };
    if (hopIsClear(hop, obstacles, height, 64, YETI_HOP_MARGIN)) {
      return hop;
    }
  }
  return null;
}

/** The highest perch wins; ties keep the current one so the yeti does not dither. */
export function choosePerch(candidates: Perch[], currentKey: string | null): Perch | null {
  let best: Perch | null = null as Perch | null;
  candidates.forEach((candidate) => {
    if (!best || candidate.y > best.y + 1e-6 || (Math.abs(candidate.y - best.y) <= 1e-6 && candidate.key === currentKey)) {
      best = candidate;
    }
  });
  return best;
}

function idleClip(seconds: number, weight = 1): YetiClipWeight {
  return { clip: "Idle", time: (seconds % IDLE_CLIP_SECONDS) / IDLE_CLIP_SECONDS, weight };
}

/** Deterministic state machine: arrive → perched → takeoff → air → landing → perched → … → leaving. */
export class YetiMotion {
  phase: YetiPhase = "hidden";
  perch: Perch | null = null;
  hop: Hop | null = null;
  presence = 0;
  phaseSeconds = 0;
  private perchedSeconds = 0;
  private lastPose: YetiPose | null = null;

  reset(): void {
    this.phase = "hidden";
    this.perch = null;
    this.hop = null;
    this.presence = 0;
    this.phaseSeconds = 0;
    this.perchedSeconds = 0;
    this.lastPose = null;
  }

  update(deltaSeconds: number, active: boolean, candidates: Perch[], obstacles: Box[], height: number): YetiPose | null {
    const dt = Math.max(0, deltaSeconds);
    this.phaseSeconds += dt;
    let landed = false;

    if (this.phase !== "hidden" && this.phase !== "leaving" && !active) {
      this.leave();
    }

    if (this.phase === "leaving") {
      this.presence = Math.max(0, this.presence - dt / YETI_FADE_SECONDS);
      if (this.presence <= 0 || !this.lastPose) {
        this.reset();
        return null;
      }
      this.lastPose = { ...this.lastPose, phase: "leaving", presence: this.presence, landed: false };
      return this.lastPose;
    }

    if (!active) {
      return null;
    }

    const current = (key: string) => candidates.find((candidate) => candidate.key === key) ?? null;

    if (this.phase === "hidden") {
      const target = choosePerch(candidates, null);
      if (!target) {
        return null;
      }
      this.hop = this.arrivalHop(target);
      this.perch = target;
      this.phase = "air";
      this.phaseSeconds = 0;
    }

    if (this.phase === "perched" && this.perch) {
      this.perchedSeconds += dt;
      const live = current(this.perch.key);
      if (live) {
        this.perch = live;
      }
      const best = choosePerch(candidates, this.perch.key);
      const wantsHigher = best !== null && best.key !== this.perch.key && best.y > this.perch.y + 0.5;
      if (wantsHigher && this.perchedSeconds >= YETI_MIN_PERCH_SECONDS) {
        const hop = planHop(this.perch, best!, obstacles, height);
        if (hop) {
          this.hop = hop;
          this.phase = "takeoff";
          this.phaseSeconds = 0;
        }
      }
      if (!live && this.phase === "perched") {
        this.leave();
        return this.update(0, active, candidates, obstacles, height);
      }
    }

    if (this.phase === "takeoff" && this.phaseSeconds >= YETI_TAKEOFF_SECONDS) {
      this.phaseSeconds -= YETI_TAKEOFF_SECONDS;
      this.phase = "air";
    }

    if (this.phase === "air" && this.hop && this.phaseSeconds >= this.hop.duration) {
      this.phaseSeconds -= this.hop.duration;
      this.phase = "landing";
      this.perch = this.hop.to;
      landed = true;
    }

    if (this.phase === "landing" && this.phaseSeconds >= YETI_LANDING_SECONDS + YETI_IDLE_BLEND_SECONDS) {
      this.phase = "perched";
      this.perchedSeconds = this.phaseSeconds - YETI_LANDING_SECONDS - YETI_IDLE_BLEND_SECONDS;
      this.phaseSeconds = 0;
      this.hop = null;
    }

    this.presence = Math.min(1, this.presence + dt / YETI_FADE_SECONDS);
    this.lastPose = this.pose(landed, height);
    return this.lastPose;
  }

  /** Body boxes for the current pose: in the air they use the tucked clip's larger extents. */
  body(height: number): Box[] | null {
    const pose = this.lastPose;
    if (!pose) {
      return null;
    }
    if (pose.phase === "air" && this.hop) {
      return hopFrameBody(sampleHopFrame(this.hop, this.phaseSeconds, height), height);
    }
    return standingBody(pose.x, pose.y, pose.z, pose.yaw, height);
  }

  private leave(): void {
    this.phase = "leaving";
    this.phaseSeconds = 0;
  }

  private arrivalHop(target: Perch): Hop {
    const yaw = perchYaw(target.normalX, target.normalZ);
    const outX = target.x + target.normalX * ARRIVAL_OUT;
    const outZ = target.z + target.normalZ * ARRIVAL_OUT;
    return {
      from: { ...target, key: "arrival", x: outX, y: target.y + ARRIVAL_DROP, z: outZ },
      to: target,
      outX: 0,
      outZ: 0,
      bulge: 0,
      arc: 0,
      duration: ARRIVAL_SECONDS,
      fromYaw: yaw,
      toYaw: yaw,
      arrival: true,
    };
  }

  private pose(landed: boolean, height: number): YetiPose {
    const t = this.phaseSeconds;
    const base = { phase: this.phase, presence: this.presence, landed };
    if (this.phase === "air" && this.hop) {
      const { x, y, z, yaw } = sampleHopFrame(this.hop, t, height);
      const untilTouchdown = this.hop.duration - t;
      let clip: YetiClipWeight;
      if (untilTouchdown <= YETI_LAND_LEAD_SECONDS) {
        clip = { clip: "Jump_Land", time: LAND_TOUCHDOWN * (1 - untilTouchdown / YETI_LAND_LEAD_SECONDS), weight: 1 };
      } else if (!this.hop.arrival && t < YETI_LIFT_SECONDS) {
        clip = { clip: "Jump", time: JUMP_LIFTOFF + (JUMP_END - JUMP_LIFTOFF) * (t / YETI_LIFT_SECONDS), weight: 1 };
      } else {
        clip = { clip: "Jump_Idle", time: (t % JUMP_IDLE_CLIP_SECONDS) / JUMP_IDLE_CLIP_SECONDS, weight: 1 };
      }
      return { ...base, x, y, z, yaw, clips: [clip] };
    }

    const perch = this.perch!;
    const at = { x: perch.x, y: perch.y, z: perch.z, yaw: perchYaw(perch.normalX, perch.normalZ) };
    if (this.phase === "takeoff") {
      return { ...base, ...at, clips: [{ clip: "Jump", time: JUMP_LIFTOFF * Math.min(1, t / YETI_TAKEOFF_SECONDS), weight: 1 }] };
    }
    if (this.phase === "landing") {
      const landTime = LAND_TOUCHDOWN + (LAND_END - LAND_TOUCHDOWN) * Math.min(1, t / YETI_LANDING_SECONDS);
      const blend = Math.max(0, Math.min(1, (t - YETI_LANDING_SECONDS) / YETI_IDLE_BLEND_SECONDS));
      return {
        ...base,
        ...at,
        clips: [
          { clip: "Jump_Land", time: landTime, weight: 1 - blend },
          idleClip(Math.max(0, t - YETI_LANDING_SECONDS), blend),
        ],
      };
    }
    return { ...base, ...at, clips: [idleClip(this.perchedSeconds)] };
  }
}
