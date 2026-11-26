import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from "three";
import { comboLabel, comboTier } from "../logic/juice";

/** Particle look: dust puffs grow and fade slowly, chips and shards spin and fall, confetti flutters. */
export type ParticleKind = "dust" | "chip" | "shard" | "confetti";

interface Particle {
  kind: ParticleKind;
  position: Vector3;
  velocity: Vector3;
  spin: Vector3;
  rotation: Vector3;
  size: number;
  life: number;
  maxLife: number;
  color: Color;
}

const MAX_PARTICLES = 420;
const GRAVITY: Record<ParticleKind, number> = { dust: -0.6, chip: 14, shard: 16, confetti: 2.6 };
const DRAG: Record<ParticleKind, number> = { dust: 3.2, chip: 0.4, shard: 0.3, confetti: 2.2 };
const CONFETTI_COLORS = ["#ff5d8f", "#ffd447", "#4fd1ff", "#7cff6b", "#c58bff", "#ff9f51"];

const hidden = new Matrix4().makeScale(0, 0, 0);

/**
 * Everything the juice pass draws: a pooled instanced particle system and a flash ring in the scene,
 * plus DOM stamps and the streak counter over the HUD.
 */
export class JuiceLayer {
  readonly root = new Group();
  readonly overlay: HTMLDivElement;
  private readonly particles: Particle[] = [];
  private readonly mesh: InstancedMesh;
  private readonly ring: Mesh;
  private ringLife = 0;
  private readonly stamp: HTMLDivElement;
  private readonly combo: HTMLDivElement;
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly scale = new Vector3();
  private random: () => number;
  /** Telemetry for tests: what has been shown since the last reset. */
  readonly counts = { stamps: 0, rings: 0, confetti: 0, dust: 0, chip: 0, shard: 0 };
  lastStamp = "";

  constructor(random: () => number = Math.random) {
    this.random = random;
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: "#ffffff" }), MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 14;
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      this.mesh.setMatrixAt(i, hidden);
      this.mesh.setColorAt(i, new Color("#ffffff"));
    }
    this.ring = new Mesh(
      new RingGeometry(0.82, 1, 48),
      new MeshBasicMaterial({ color: "#ffd66b", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.ring.renderOrder = 15;
    this.root.add(this.mesh, this.ring);

    this.overlay = document.createElement("div");
    this.overlay.className = "juice-overlay";
    this.stamp = document.createElement("div");
    this.stamp.className = "juice-stamp";
    this.stamp.dataset.testid = "juice-stamp";
    this.combo = document.createElement("div");
    this.combo.className = "juice-combo";
    this.combo.dataset.testid = "juice-combo";
    this.overlay.append(this.stamp, this.combo);
  }

  setRandom(random: () => number): void {
    this.random = random;
  }

  reset(): void {
    this.particles.length = 0;
    for (let i = 0; i < MAX_PARTICLES; i += 1) this.mesh.setMatrixAt(i, hidden);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.ringLife = 0;
    this.ring.visible = false;
    this.stamp.className = "juice-stamp";
    this.stamp.textContent = "";
    this.combo.className = "juice-combo";
    this.combo.textContent = "";
    this.lastStamp = "";
    Object.keys(this.counts).forEach((key) => { this.counts[key as keyof typeof this.counts] = 0; });
  }

  get activeParticles(): number {
    return this.particles.length;
  }

  emit(kind: ParticleKind, at: Vector3, options: {
    count: number; color?: string | Color; spread?: Vector3; speed?: number; up?: number; direction?: Vector3; size?: number; life?: number;
  }): void {
    const r = this.random;
    for (let i = 0; i < options.count; i += 1) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const spread = options.spread ?? new Vector3(0.3, 0.1, 0.3);
      const position = at.clone().add(new Vector3((r() - 0.5) * 2 * spread.x, (r() - 0.5) * 2 * spread.y, (r() - 0.5) * 2 * spread.z));
      const speed = (options.speed ?? 2) * (0.5 + r());
      const direction = options.direction
        ? options.direction.clone().add(new Vector3((r() - 0.5) * 0.9, (r() - 0.5) * 0.4, (r() - 0.5) * 0.9)).normalize()
        : new Vector3(r() - 0.5, 0, r() - 0.5).normalize();
      const velocity = direction.multiplyScalar(speed);
      velocity.y += (options.up ?? 1) * (0.6 + r() * 0.8);
      const color = kind === "confetti"
        ? new Color(CONFETTI_COLORS[Math.floor(r() * CONFETTI_COLORS.length)]!)
        : new Color(options.color ?? "#ffffff");
      if (kind === "dust") color.lerp(new Color("#ffffff"), 0.55);
      const life = (options.life ?? (kind === "dust" ? 0.7 : kind === "confetti" ? 2.8 : 1.3)) * (0.7 + r() * 0.6);
      this.particles.push({
        kind,
        position,
        velocity,
        spin: new Vector3((r() - 0.5) * 16, (r() - 0.5) * 16, (r() - 0.5) * 16),
        rotation: new Vector3(r() * 6, r() * 6, r() * 6),
        size: (options.size ?? (kind === "dust" ? 0.32 : kind === "confetti" ? 0.22 : 0.16)) * (0.6 + r() * 0.8),
        life,
        maxLife: life,
        color,
      });
      this.counts[kind === "confetti" ? "confetti" : kind] += 1;
    }
  }

  flashRing(at: Vector3, radius: number): void {
    this.ring.position.copy(at);
    this.ring.userData.radius = radius;
    this.ringLife = 0.45;
    this.ring.visible = true;
    this.counts.rings += 1;
  }

  /** A big punchy word: restarts its CSS animation each time. */
  showStamp(text: string, tier: "perfect" | "big" | "milestone" | "record" = "perfect"): void {
    this.stamp.textContent = text;
    this.stamp.className = "juice-stamp";
    void this.stamp.offsetWidth;
    this.stamp.className = `juice-stamp juice-stamp--${tier} juice-stamp--show`;
    this.lastStamp = text;
    this.counts.stamps += 1;
  }

  /** The streak counter: grows and shakes harder with each tier; hidden below x2. */
  showCombo(combo: number): void {
    const label = comboLabel(combo);
    this.combo.textContent = label;
    this.combo.className = "juice-combo";
    if (!label) return;
    void this.combo.offsetWidth;
    this.combo.className = `juice-combo juice-combo--tier${comboTier(combo)} juice-combo--bump`;
  }

  update(deltaSeconds: number): void {
    const dt = Math.max(0, Math.min(0.05, deltaSeconds));
    if (this.ringLife > 0) {
      this.ringLife = Math.max(0, this.ringLife - dt);
      const t = 1 - this.ringLife / 0.45;
      const radius = Number(this.ring.userData.radius) || 4;
      this.ring.scale.setScalar(radius * (0.6 + t * 0.9));
      (this.ring.material as MeshBasicMaterial).opacity = (1 - t) * 0.7;
      this.ring.visible = this.ringLife > 0;
    }
    if (this.particles.length === 0 && !this.mesh.userData.dirty) return;
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= GRAVITY[p.kind] * dt;
      p.velocity.multiplyScalar(Math.max(0, 1 - DRAG[p.kind] * dt));
      if (p.kind === "confetti") p.velocity.x += Math.sin(p.life * 7 + i) * 2 * dt;
      p.position.addScaledVector(p.velocity, dt);
      p.rotation.addScaledVector(p.spin, dt);
    }
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const p = this.particles[i];
      if (!p) {
        this.mesh.setMatrixAt(i, hidden);
        continue;
      }
      const t = p.life / p.maxLife;
      const grow = p.kind === "dust" ? 1 + (1 - t) * 1.8 : 1;
      const fade = p.kind === "dust" ? t : Math.min(1, t * 4);
      const s = p.size * grow * fade;
      if (p.kind === "confetti") this.scale.set(s, s * 0.15, s * 0.7);
      else this.scale.set(s, s, s);
      this.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), p.rotation.x).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), p.rotation.y));
      this.matrix.compose(p.position, this.quaternion, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
      this.mesh.setColorAt(i, p.color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.userData.dirty = this.particles.length > 0;
  }
}
