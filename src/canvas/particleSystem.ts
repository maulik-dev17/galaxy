/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EnemyType } from '../types';

export type ParticleKind =
  | 'thruster'
  | 'smoke'
  | 'fireball'
  | 'spark'
  | 'shrapnel'
  | 'shockwave'
  | 'splatter';

export interface ParticleConfig {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize?: number;
  life: number;
  maxLife: number;
  color: string;
  endColor?: string;
  drag?: number;
  gravity?: number;
  rotation?: number;
  angularVelocity?: number;
  glow?: number;
  shape?: 'circle' | 'triangle' | 'streak';
}

export class Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  initialSize: number;
  maxSize: number;
  life: number;
  maxLife: number;
  color: string;
  endColor: string;
  drag: number;
  gravity: number;
  rotation: number;
  angularVelocity: number;
  glow: number;
  shape: 'circle' | 'triangle' | 'streak';

  constructor(cfg: ParticleConfig) {
    this.kind = cfg.kind;
    this.x = cfg.x;
    this.y = cfg.y;
    this.vx = cfg.vx;
    this.vy = cfg.vy;
    this.size = cfg.size;
    this.initialSize = cfg.size;
    this.maxSize = cfg.maxSize ?? cfg.size;
    this.life = cfg.life;
    this.maxLife = cfg.maxLife;
    this.color = cfg.color;
    this.endColor = cfg.endColor ?? cfg.color;
    this.drag = cfg.drag ?? 0.98;
    this.gravity = cfg.gravity ?? 0;
    this.rotation = cfg.rotation ?? Math.random() * Math.PI * 2;
    this.angularVelocity = cfg.angularVelocity ?? (Math.random() - 0.5) * 0.2;
    this.glow = cfg.glow ?? 8;
    this.shape = cfg.shape ?? 'circle';
  }

  update(): boolean {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.drag;
    this.vy = this.vy * this.drag + this.gravity;
    this.rotation += this.angularVelocity;
    this.life--;

    const progress = 1 - this.life / this.maxLife; // 0 -> 1

    if (this.kind === 'thruster') {
      // Thrusters start medium, shrink slightly and fade
      this.size = Math.max(0.5, this.initialSize * (1 - progress * 0.7));
    } else if (this.kind === 'fireball') {
      // Fireballs billow and expand rapidly then dissipate
      this.size = this.initialSize + (this.maxSize - this.initialSize) * Math.sin(progress * Math.PI * 0.5);
    } else if (this.kind === 'smoke') {
      // Smoke expands continuously and slows down
      this.size = this.initialSize + (this.maxSize - this.initialSize) * progress;
    } else if (this.kind === 'shockwave') {
      this.size = this.initialSize + (this.maxSize - this.initialSize) * progress;
    }

    return this.life > 0;
  }
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly maxParticles = 400;

  public clear() {
    this.particles = [];
  }

  public get count(): number {
    return this.particles.length;
  }

  public add(cfg: ParticleConfig) {
    if (this.particles.length >= this.maxParticles) {
      // Drop older non-shockwave particle if saturated
      this.particles.shift();
    }
    this.particles.push(new Particle(cfg));
  }

  public update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.update()) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Ultra-fast high-framerate rendering with zero allocations.
   * Additive blending ('lighter') provides intense organic glow without expensive CPU shadowBlur.
   */
  public draw(ctx: CanvasRenderingContext2D) {
    const len = this.particles.length;
    if (len === 0) return;

    // --- PASS 1: Volumetric Smoke (Alpha Blend) ---
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      if (p.kind !== 'smoke') continue;
      const progress = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, (1 - progress) * 0.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- PASS 2: Luminous Elements (Additive 'lighter') ---
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      if (p.kind === 'smoke') continue;

      const progress = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, 1 - progress);

      if (p.kind === 'thruster') {
        ctx.fillStyle = progress < 0.25 ? '#ffffff' : p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'spark' || p.shape === 'streak') {
        // Direct coordinate streak without matrix save/translate/rotate overhead
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'shockwave') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 3.5 * (1 - progress));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'shrapnel') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.75, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'fireball') {
        ctx.fillStyle = progress < 0.25 ? '#ffffff' : progress < 0.6 ? p.color : p.endColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // HIGH-LEVEL EMITTERS: Realistic Engine Thrusters
  // =========================================================================

  /**
   * Emits rich, multi-layered engine afterburner thruster particles for the player ship.
   * Includes primary twin nozzles, optional overdrive central plume, inertial reaction,
   * supersonic shock diamonds, and soft dissipating exhaust smoke.
   */
  public emitPlayerThruster(
    playerX: number,
    playerY: number,
    playerVx: number,
    playerVy: number,
    isOverdrive: boolean
  ) {
    // Sleek twin engine nozzle positions aligned with scaled ship fuselage
    const leftNozzleX = playerX - 9;
    const rightNozzleX = playerX + 9;
    const nozzleY = playerY + 23;

    const baseSpeed = isOverdrive ? 10 : 7;
    const count = isOverdrive ? 3 : 2;

    const nozzles = [leftNozzleX, rightNozzleX];
    if (isOverdrive) {
      nozzles.push(playerX); // Extra center turbo jet in Overdrive
    }

    for (const nx of nozzles) {
      for (let i = 0; i < count; i++) {
        // Conical spray with backward thrust + slight horizontal turbulence
        const spreadX = (Math.random() - 0.5) * (isOverdrive ? 3.0 : 1.8);
        const exhaustVy = baseSpeed + Math.random() * (isOverdrive ? 4.5 : 3.0) - playerVy * 0.15;
        const exhaustVx = spreadX + playerVx * 0.2;

        const isCore = Math.random() < 0.45;
        const color = isOverdrive
          ? isCore
            ? '#ffffff'
            : Math.random() < 0.6
            ? '#00f0ff'
            : '#0066ff'
          : isCore
          ? '#fff0aa'
          : Math.random() < 0.6
          ? '#ff7700'
          : '#ff2200';

        const endColor = isOverdrive ? '#0033aa' : '#991100';

        this.add({
          kind: 'thruster',
          x: nx + (Math.random() - 0.5) * 2,
          y: nozzleY + Math.random() * 2,
          vx: exhaustVx,
          vy: exhaustVy,
          size: (isOverdrive ? 3.5 : 2.4) + Math.random() * 1.6,
          life: Math.floor(Math.random() * (isOverdrive ? 12 : 9) + 7),
          maxLife: 18,
          color,
          endColor,
          drag: 0.94,
          glow: isOverdrive ? 14 : 9,
        });
      }

      // Occasional faint exhaust smoke puff
      if (Math.random() < (isOverdrive ? 0.25 : 0.15)) {
        this.add({
          kind: 'smoke',
          x: nx + (Math.random() - 0.5) * 4,
          y: nozzleY + 12 + Math.random() * 6,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 2.5 + Math.random() * 2,
          size: 3,
          maxSize: 10 + Math.random() * 6,
          life: 25 + Math.floor(Math.random() * 15),
          maxLife: 40,
          color: isOverdrive ? 'rgba(0, 150, 255, 0.25)' : 'rgba(80, 75, 70, 0.35)',
          drag: 0.95,
        });
      }
    }
  }

  /**
   * Emits distinct alien engine propulsion plumes for regular enemy spacecraft.
   */
  public emitEnemyThruster(
    enemyX: number,
    enemyY: number,
    radius: number,
    type: EnemyType,
    speedMult: number
  ) {
    if (type === 'drone') {
      // Recon Target Drone: Golden/cyan sparkling trail
      if (Math.random() < 0.8) {
        this.add({
          kind: 'spark',
          x: enemyX + (Math.random() - 0.5) * 6,
          y: enemyY + (Math.random() - 0.5) * 6,
          vx: -(Math.random() * 2 + 1),
          vy: (Math.random() - 0.5) * 1.5,
          size: 2.5,
          life: 14,
          maxLife: 14,
          color: Math.random() < 0.5 ? '#ffea00' : '#00ffff',
          drag: 0.94,
          glow: 14,
        });
      }
    } else if (type === 'asteroid') {
      // Asteroid: Drifting mineral dust motes
      if (Math.random() < 0.3) {
        this.add({
          kind: 'smoke',
          x: enemyX + (Math.random() - 0.5) * radius * 0.8,
          y: enemyY - radius * 0.5,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -1.2,
          size: 2,
          maxSize: 6,
          life: 20,
          maxLife: 20,
          color: 'rgba(120, 113, 108, 0.4)',
          drag: 0.96,
        });
      }
    } else if (type === 'wasp') {
      // Wasp: Agile high-frequency amber stinger jet
      if (Math.random() < 0.75) {
        this.add({
          kind: 'thruster',
          x: enemyX + (Math.random() - 0.5) * 4,
          y: enemyY - radius * 0.7, // Thrust upward as it dives downward
          vx: (Math.random() - 0.5) * 2,
          vy: -(2.5 + Math.random() * 3) * speedMult,
          size: 2.5 + Math.random() * 2,
          life: 8 + Math.floor(Math.random() * 6),
          maxLife: 14,
          color: Math.random() < 0.5 ? '#ffff00' : '#ff9900',
          endColor: '#ff4400',
          drag: 0.93,
          glow: 8,
        });
      }
    } else if (type === 'scarab') {
      // Scarab: Pulsing purple bio-plasma ion trail
      if (Math.random() < 0.6) {
        this.add({
          kind: 'thruster',
          x: enemyX + (Math.random() - 0.5) * 6,
          y: enemyY - radius * 0.75,
          vx: (Math.random() - 0.5) * 1.8,
          vy: -(2.0 + Math.random() * 2.5) * speedMult,
          size: 3.5 + Math.random() * 2,
          life: 10 + Math.floor(Math.random() * 8),
          maxLife: 18,
          color: Math.random() < 0.4 ? '#ffffff' : '#cc00ff',
          endColor: '#6600cc',
          drag: 0.94,
          glow: 10,
        });
      }
    } else if (type === 'mantis') {
      // Mantis: Twin cyan/teal ion thrusters
      const offsets = [-radius * 0.45, radius * 0.45];
      for (const ox of offsets) {
        if (Math.random() < 0.65) {
          this.add({
            kind: 'thruster',
            x: enemyX + ox,
            y: enemyY - radius * 0.6,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -(2.8 + Math.random() * 2.5) * speedMult,
            size: 2.8 + Math.random() * 2,
            life: 9 + Math.floor(Math.random() * 6),
            maxLife: 15,
            color: Math.random() < 0.4 ? '#ffffff' : '#00ffff',
            endColor: '#0066aa',
            drag: 0.93,
            glow: 9,
          });
        }
      }
    } else if (type === 'interceptor') {
      // Interceptor: Twin heavy rocket burners with lingering smoke
      const offsets = [-radius * 0.4, radius * 0.4];
      for (const ox of offsets) {
        this.add({
          kind: 'thruster',
          x: enemyX + ox,
          y: enemyY - radius * 0.7,
          vx: (Math.random() - 0.5) * 1.8,
          vy: -(3.2 + Math.random() * 3) * speedMult,
          size: 4 + Math.random() * 2.5,
          life: 12 + Math.floor(Math.random() * 8),
          maxLife: 20,
          color: Math.random() < 0.4 ? '#ffffff' : '#ff0055',
          endColor: '#990022',
          drag: 0.94,
          glow: 12,
        });

        if (Math.random() < 0.25) {
          this.add({
            kind: 'smoke',
            x: enemyX + ox,
            y: enemyY - radius * 0.7 - 8,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -2,
            size: 3,
            maxSize: 11,
            life: 20,
            maxLife: 20,
            color: 'rgba(80, 50, 70, 0.35)',
            drag: 0.95,
          });
        }
      }
    } else if (type === 'kamikaze') {
      // Kamikaze: Supercharged orange/red rocket exhaust plume with sparks
      this.add({
        kind: 'thruster',
        x: enemyX + (Math.random() - 0.5) * 4,
        y: enemyY - radius * 0.75,
        vx: (Math.random() - 0.5) * 2,
        vy: -(4.0 + Math.random() * 3.5) * speedMult,
        size: 3.5 + Math.random() * 2,
        life: 11 + Math.floor(Math.random() * 7),
        maxLife: 18,
        color: Math.random() < 0.5 ? '#ffffff' : '#ff4400',
        endColor: '#ffaa00',
        drag: 0.93,
        glow: 14,
      });

      if (Math.random() < 0.35) {
        this.add({
          kind: 'spark',
          x: enemyX,
          y: enemyY - radius * 0.7,
          vx: (Math.random() - 0.5) * 3,
          vy: -(2.5 + Math.random() * 3),
          size: 2,
          life: 10,
          maxLife: 10,
          color: '#ffd000',
          glow: 10,
          shape: 'streak',
        });
      }
    } else if (type === 'phantom') {
      // Phantom: Void stealth ion thruster with violet shimmer
      if (Math.random() < 0.75) {
        this.add({
          kind: 'thruster',
          x: enemyX + (Math.random() - 0.5) * 6,
          y: enemyY - radius * 0.65,
          vx: (Math.random() - 0.5) * 2.5,
          vy: -(3.0 + Math.random() * 2.5) * speedMult,
          size: 3.0 + Math.random() * 2,
          life: 10 + Math.floor(Math.random() * 6),
          maxLife: 16,
          color: Math.random() < 0.4 ? '#ffffff' : '#c084fc',
          endColor: '#6b21a8',
          drag: 0.94,
          glow: 12,
        });
      }
    } else if (type === 'wraith') {
      // Wraith: Aggressive ruby pursuit jets with bright sparks
      const offsets = [-radius * 0.35, radius * 0.35];
      for (const ox of offsets) {
        if (Math.random() < 0.7) {
          this.add({
            kind: 'thruster',
            x: enemyX + ox,
            y: enemyY - radius * 0.7,
            vx: (Math.random() - 0.5) * 2,
            vy: -(3.5 + Math.random() * 3) * speedMult,
            size: 3.2 + Math.random() * 2,
            life: 11 + Math.floor(Math.random() * 6),
            maxLife: 17,
            color: Math.random() < 0.4 ? '#ffffff' : '#ef4444',
            endColor: '#991b1b',
            drag: 0.93,
            glow: 14,
          });
        }
      }
    } else if (type === 'cobra') {
      // Cobra: Emerald / cyan serpentine ion wake
      if (Math.random() < 0.8) {
        this.add({
          kind: 'thruster',
          x: enemyX + (Math.random() - 0.5) * 5,
          y: enemyY - radius * 0.65,
          vx: (Math.random() - 0.5) * 2.8,
          vy: -(3.2 + Math.random() * 2.5) * speedMult,
          size: 2.8 + Math.random() * 2,
          life: 9 + Math.floor(Math.random() * 6),
          maxLife: 15,
          color: Math.random() < 0.5 ? '#10b981' : '#06b6d4',
          endColor: '#047857',
          drag: 0.93,
          glow: 11,
        });
      }
    }
  }

  /**
   * Emits colossal capital-ship thrusters and glowing reactor venting motes for bosses.
   */
  public emitBossThrusters(
    bossX: number,
    bossY: number,
    radius: number,
    accentColor: string,
    currentPhase: number
  ) {
    // Left and right heavy warp nacelles
    const leftX = bossX - radius * 0.8;
    const rightX = bossX + radius * 0.8;
    const nozzleY = bossY - radius * 0.3;

    const nacelles = [leftX, rightX];
    for (const nx of nacelles) {
      for (let i = 0; i < 2; i++) {
        this.add({
          kind: 'thruster',
          x: nx + (Math.random() - 0.5) * 8,
          y: nozzleY,
          vx: (Math.random() - 0.5) * 3,
          vy: -(4.0 + Math.random() * 4),
          size: 5 + Math.random() * 3.5,
          life: 14 + Math.floor(Math.random() * 10),
          maxLife: 24,
          color: Math.random() < 0.4 ? '#ffffff' : accentColor,
          endColor: '#330033',
          drag: 0.94,
          glow: 14,
        });
      }

      if (Math.random() < 0.3) {
        this.add({
          kind: 'smoke',
          x: nx,
          y: nozzleY - 14,
          vx: (Math.random() - 0.5) * 2,
          vy: -2.5,
          size: 6,
          maxSize: 18 + Math.random() * 8,
          life: 30,
          maxLife: 30,
          color: 'rgba(40, 25, 45, 0.4)',
          drag: 0.96,
        });
      }
    }

    // Swirling reactor energy motes around boss core in enraged phases
    if (currentPhase >= 2 && Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.3 + Math.random() * 0.3);
      this.add({
        kind: 'spark',
        x: bossX + Math.cos(angle) * dist,
        y: bossY + Math.sin(angle) * dist,
        vx: -Math.sin(angle) * 3 + (Math.random() - 0.5),
        vy: Math.cos(angle) * 3 + (Math.random() - 0.5),
        size: 2.2,
        life: 15,
        maxLife: 15,
        color: accentColor,
        glow: 12,
        shape: 'streak',
      });
    }
  }

  // =========================================================================
  // HIGH-LEVEL EMITTERS: Realistic Explosions & Combat Impacts
  // =========================================================================

  /**
   * Creates a multi-phase realistic explosion complete with shockwave,
   * billowing fireballs, high-speed incandescent sparks, tumbling hull shrapnel,
   * and lingering dissipating smoke clouds.
   */
  public createRealisticExplosion(
    x: number,
    y: number,
    options: {
      scale?: number;
      coreColor?: string;
      accentColor?: string;
      fireballCount?: number;
      sparkCount?: number;
      shrapnelCount?: number;
      smokeCount?: number;
      hasShockwave?: boolean;
      shakeScreen?: boolean;
    } = {}
  ) {
    const scale = options.scale ?? 1.0;
    const coreColor = options.coreColor ?? '#ff5500';
    const accentColor = options.accentColor ?? '#ffea00';
    const fireballCount = options.fireballCount ?? Math.floor(12 * scale);
    const sparkCount = options.sparkCount ?? Math.floor(18 * scale);
    const shrapnelCount = options.shrapnelCount ?? Math.floor(8 * scale);
    const smokeCount = options.smokeCount ?? Math.floor(8 * scale);
    const hasShockwave = options.hasShockwave ?? true;

    // 1. Shockwave Ring
    if (hasShockwave) {
      this.add({
        kind: 'shockwave',
        x,
        y,
        vx: 0,
        vy: 0,
        size: 4,
        maxSize: 55 * scale,
        life: Math.floor(14 * Math.min(2, scale)),
        maxLife: Math.floor(14 * Math.min(2, scale)),
        color: accentColor,
        glow: 16,
      });

      // Secondary inner hot shockwave
      this.add({
        kind: 'shockwave',
        x,
        y,
        vx: 0,
        vy: 0,
        size: 2,
        maxSize: 32 * scale,
        life: Math.floor(9 * Math.min(2, scale)),
        maxLife: Math.floor(9 * Math.min(2, scale)),
        color: '#ffffff',
        glow: 20,
      });
    }

    // 2. Volumetric Fireball Billows
    for (let i = 0; i < fireballCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 5 + 1.5) * scale;
      const initialSize = (Math.random() * 6 + 4) * scale;
      const maxSize = initialSize * (Math.random() * 2.2 + 2.0);

      this.add({
        kind: 'fireball',
        x: x + (Math.random() - 0.5) * 10 * scale,
        y: y + (Math.random() - 0.5) * 10 * scale,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: initialSize,
        maxSize,
        life: Math.floor(Math.random() * 15 + 14 * scale),
        maxLife: Math.floor(30 * scale),
        color: Math.random() < 0.4 ? '#ffffff' : accentColor,
        endColor: coreColor,
        drag: 0.88,
        glow: 18,
      });
    }

    // 3. High-Speed Incandescent Sparks / Streaks
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 12 + 4) * scale;

      this.add({
        kind: 'spark',
        shape: 'streak',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (Math.random() * 1.8 + 1.2) * Math.min(2, scale),
        life: Math.floor(Math.random() * 18 + 10 * scale),
        maxLife: Math.floor(32 * scale),
        color: Math.random() < 0.35 ? '#ffffff' : Math.random() < 0.65 ? accentColor : coreColor,
        drag: 0.93,
        glow: 12,
      });
    }

    // 4. Tumbling Metallic Shrapnel Fragments
    for (let i = 0; i < shrapnelCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 7 + 2) * scale;

      this.add({
        kind: 'shrapnel',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (Math.random() * 3 + 2) * scale,
        life: Math.floor(Math.random() * 20 + 20),
        maxLife: 40,
        color: Math.random() < 0.5 ? '#b4c6d4' : '#475569',
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.35,
        drag: 0.95,
        glow: 4,
      });
    }

    // 5. Dissipating Volumetric Smoke Clouds
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 2.5 + 0.8) * scale;

      this.add({
        kind: 'smoke',
        x: x + (Math.random() - 0.5) * 12 * scale,
        y: y + (Math.random() - 0.5) * 12 * scale,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        size: (Math.random() * 8 + 5) * scale,
        maxSize: (Math.random() * 16 + 18) * scale,
        life: Math.floor(Math.random() * 25 + 30),
        maxLife: 60,
        color: Math.random() < 0.4 ? 'rgba(35, 30, 35, 0.45)' : 'rgba(55, 45, 50, 0.4)',
        drag: 0.94,
      });
    }
  }

  /**
   * Cataclysmic Supernova detonation sequence for defeated bosses.
   */
  public createBossSupernova(x: number, y: number, color: string, accentColor: string) {
    // 3 expanding concentric shockwaves
    this.add({
      kind: 'shockwave',
      x,
      y,
      vx: 0,
      vy: 0,
      size: 10,
      maxSize: 180,
      life: 30,
      maxLife: 30,
      color: '#ffffff',
      glow: 30,
    });
    this.add({
      kind: 'shockwave',
      x,
      y,
      vx: 0,
      vy: 0,
      size: 5,
      maxSize: 140,
      life: 25,
      maxLife: 25,
      color: accentColor,
      glow: 24,
    });
    this.add({
      kind: 'shockwave',
      x,
      y,
      vx: 0,
      vy: 0,
      size: 2,
      maxSize: 90,
      life: 20,
      maxLife: 20,
      color,
      glow: 20,
    });

    // Massive firestorm
    this.createRealisticExplosion(x, y, {
      scale: 2.8,
      coreColor: color,
      accentColor,
      fireballCount: 35,
      sparkCount: 60,
      shrapnelCount: 25,
      smokeCount: 22,
      hasShockwave: false,
    });
  }

  /**
   * Rich kinetic impact sparks when projectiles hit armor/shields.
   */
  public emitImpactSparks(x: number, y: number, color: string, hitAngleRad: number = -Math.PI / 2) {
    const count = 7;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.6;
      const angle = hitAngleRad + spread;
      const speed = Math.random() * 8 + 3;

      this.add({
        kind: 'spark',
        shape: 'streak',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5,
        life: 8 + Math.floor(Math.random() * 6),
        maxLife: 14,
        color: Math.random() < 0.4 ? '#ffffff' : color,
        drag: 0.91,
        glow: 10,
      });
    }
  }

  /**
   * Glowing exhaust trail particles for active homing micro-missiles.
   */
  public emitMissileExhaust(x: number, y: number, angleRad: number) {
    const spread = (Math.random() - 0.5) * 0.6;
    const speed = Math.random() * 3 + 1.5;
    const exhaustAngle = angleRad + Math.PI + spread;
    this.add({
      kind: 'thruster',
      x: x + (Math.random() - 0.5) * 2,
      y: y + (Math.random() - 0.5) * 2,
      vx: Math.cos(exhaustAngle) * speed,
      vy: Math.sin(exhaustAngle) * speed,
      size: 2.2 + Math.random() * 1.2,
      life: 6 + Math.floor(Math.random() * 5),
      maxLife: 11,
      color: Math.random() < 0.6 ? '#f97316' : '#ffea00',
      endColor: '#7c2d12',
      drag: 0.92,
      glow: 10,
    });
  }

  /**
   * EMP shockwave burst clearing bullets and electrifying the sector.
   */
  public emitEmpBurst(x: number, y: number) {
    this.add({
      kind: 'shockwave',
      x,
      y,
      vx: 0,
      vy: 0,
      size: 15,
      maxSize: 350,
      life: 28,
      maxLife: 28,
      color: '#00ffff',
      glow: 28,
    });

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 14 + 5;
      this.add({
        kind: 'spark',
        shape: 'streak',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.8,
        life: 20 + Math.floor(Math.random() * 10),
        maxLife: 30,
        color: Math.random() < 0.4 ? '#ffffff' : '#00e5ff',
        drag: 0.94,
        glow: 14,
      });
    }
  }

  /**
   * Energy core absorption pulse / shield deflection flash.
   */
  public emitShieldDeflection(x: number, y: number, color: string = '#00f0ff') {
    this.add({
      kind: 'shockwave',
      x,
      y,
      vx: 0,
      vy: 0,
      size: 4,
      maxSize: 48,
      life: 14,
      maxLife: 14,
      color,
      glow: 20,
    });

    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI * 2) / 10;
      const speed = Math.random() * 4 + 2;
      this.add({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.2,
        life: 14,
        maxLife: 14,
        color: Math.random() < 0.4 ? '#ffffff' : color,
        glow: 12,
      });
    }
  }
}
