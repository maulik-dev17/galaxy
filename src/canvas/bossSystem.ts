import { BossConfig, BossHullType, BossMovementStyle, BossAttackPattern, BossSpecialAbility } from '../types';
import { EnemyBullet } from './entities';

export interface BossAttackResult {
  bullets: EnemyBullet[];
  soundType: 'shoot' | 'heavy' | 'wave';
  specialTrigger?: BossSpecialAbility;
}

export class ModularBoss {
  name: string;
  title: string;
  x: number;
  y: number;
  targetY: number = 135;
  radius: number;
  hp: number;
  maxHp: number;
  color: string;
  accentColor: string;
  bulletSpeed: number;
  attackPatterns: BossAttackPattern[];
  phases: number;
  currentPhase: number = 1;
  hullType: BossHullType;
  movementStyle: BossMovementStyle;
  specialAbility?: BossSpecialAbility;
  levelId: number = 1;

  time: number = 0;
  attackCooldown: number = 60;
  spiralAngle: number = 0;
  hitFlash: number = 0;
  telegraphTime: number = 0;
  telegraphPattern: BossAttackPattern | null = null;
  phaseTransitionFlash: number = 0;
  phaseTransitionText: string = '';
  hasKineticBarrier: boolean = false;
  barrierTimer: number = 0;
  enraged: boolean = false;
  bankRoll: number = 0;
  warpCooldown: number = 0;
  barrageCount: number = 0;
  barrageOffset: number = 0;

  constructor(config: BossConfig, screenWidth: number) {
    this.name = config.name;
    this.title = config.title;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.color = config.color;
    this.accentColor = config.accentColor;
    this.radius = config.size || 70;
    this.bulletSpeed = config.bulletSpeed;
    this.attackPatterns = config.attackPatterns && config.attackPatterns.length > 0 
      ? config.attackPatterns 
      : ['radial', 'aimed_spread'];
    this.phases = Math.max(1, config.phases || 2);
    this.levelId = config.levelId || 1;
    this.hullType = config.hullType || this.inferHullType(config.name);
    this.movementStyle = config.movementStyle || this.inferMovementStyle(config.phases);
    this.specialAbility = config.specialAbility;

    this.x = screenWidth / 2;
    this.y = -this.radius * 2; // Arrives smoothly from above
  }

  private inferHullType(name: string): BossHullType {
    const n = name.toLowerCase();
    if (n.includes('carrier')) return 'carrier';
    if (n.includes('cruiser') || n.includes('destroyer')) return 'cruiser';
    if (n.includes('titan') || n.includes('colossus')) return 'titan';
    if (n.includes('core') || n.includes('sovereign') || n.includes('leviathan')) return 'archon';
    return 'dreadnought';
  }

  private inferMovementStyle(phases: number): BossMovementStyle {
    if (phases >= 4) return 'warp_flicker';
    if (phases === 3) return 'sweeping_strafe';
    return 'figure_eight';
  }

  public update(
    screenWidth: number,
    playerX: number = screenWidth / 2
  ): { phaseChanged?: number; phaseText?: string; spawnDrones?: boolean } {
    this.time++;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.telegraphTime > 0) this.telegraphTime--;
    if (this.phaseTransitionFlash > 0) this.phaseTransitionFlash--;
    if (this.warpCooldown > 0) this.warpCooldown--;

    if (this.hasKineticBarrier) {
      this.barrierTimer--;
      if (this.barrierTimer <= 0) {
        this.hasKineticBarrier = false;
      }
    }

    // 1. Entrance Descent
    if (this.y < this.targetY) {
      this.y += 2.5;
      return {};
    }

    // 2. Dynamic Movement according to Movement Style
    const speedMult = 1 + (this.currentPhase - 1) * 0.35;
    const prevX = this.x;

    switch (this.movementStyle) {
      case 'sweeping_strafe': {
        const sweepPeriod = this.time * 0.024 * speedMult;
        this.x = screenWidth / 2 + Math.sin(sweepPeriod) * (screenWidth * 0.35);
        this.y = this.targetY + Math.cos(sweepPeriod * 2) * 25;
        break;
      }

      case 'aggressive_pursuit': {
        // Tracks player with smooth mechanical inertia
        const dx = playerX - this.x;
        this.x += dx * (0.025 * speedMult);
        this.y = this.targetY + Math.sin(this.time * 0.05 * speedMult) * 18;
        break;
      }

      case 'warp_flicker': {
        // Hover, then sudden tactical micro-warp jump across sectors
        this.y = this.targetY + Math.sin(this.time * 0.04) * 15;
        if (this.warpCooldown <= 0) {
          const targetOffset = (Math.random() - 0.5) * (screenWidth * 0.6);
          this.x = Math.max(this.radius + 40, Math.min(screenWidth - this.radius - 40, screenWidth / 2 + targetOffset));
          this.warpCooldown = Math.floor(180 / speedMult);
          this.hitFlash = 6;
        }
        break;
      }

      case 'figure_eight':
      default: {
        const t = this.time * 0.02 * speedMult;
        this.x = screenWidth / 2 + Math.sin(t) * (screenWidth * 0.3);
        this.y = this.targetY + Math.sin(t * 2) * 22;
        break;
      }
    }

    // Smooth banking roll calculation
    this.bankRoll = Math.max(-0.25, Math.min(0.25, (this.x - prevX) * 0.035));

    // 3. Automated Phase Progression Check
    const hpFraction = this.hp / this.maxHp;
    let newPhase = this.currentPhase;

    if (this.phases >= 4) {
      if (hpFraction < 0.25) newPhase = 4;
      else if (hpFraction < 0.5) newPhase = 3;
      else if (hpFraction < 0.75) newPhase = 2;
      else newPhase = 1;
    } else if (this.phases === 3) {
      if (hpFraction < 0.33) newPhase = 3;
      else if (hpFraction < 0.66) newPhase = 2;
      else newPhase = 1;
    } else if (this.phases === 2) {
      if (hpFraction < 0.5) newPhase = 2;
      else newPhase = 1;
    }

    if (newPhase > this.currentPhase) {
      this.currentPhase = newPhase;
      this.phaseTransitionFlash = 35;
      this.enraged = this.currentPhase >= this.phases;

      let bannerText = `PHASE ${this.currentPhase}: WEAPONS OVERCHARGED!`;
      if (this.currentPhase >= this.phases) {
        bannerText = `CRITICAL PHASE ${this.currentPhase}: CORE OVERDRIVE!`;
      }
      this.phaseTransitionText = bannerText;

      // Activate special ability on phase shift if configured
      let spawnDrones = false;
      if (this.specialAbility === 'kinetic_barrier') {
        this.hasKineticBarrier = true;
        this.barrierTimer = 180; // 3 seconds kinetic shield
      } else if (this.specialAbility === 'drone_escort') {
        spawnDrones = true;
      }

      return {
        phaseChanged: this.currentPhase,
        phaseText: bannerText,
        spawnDrones
      };
    }

    return {};
  }

  /**
   * Executes a modular attack pattern based on current phase and configured arsenal.
   */
  public generateAttack(
    playerX: number,
    playerY: number,
    bulletSpeedMult: number = 1
  ): BossAttackResult {
    const pattern = this.attackPatterns[Math.floor(Math.random() * this.attackPatterns.length)];
    const speed = this.bulletSpeed * bulletSpeedMult * (1 + (this.currentPhase - 1) * 0.12);
    const bullets: EnemyBullet[] = [];
    let soundType: 'shoot' | 'heavy' | 'wave' = 'shoot';

    switch (pattern) {
      case 'radial': {
        soundType = 'heavy';
        const count = 12 + this.currentPhase * 4;
        for (let i = 0; i < count; i++) {
          const a = (i * Math.PI * 2) / count + this.time * 0.06;
          bullets.push(
            new EnemyBullet(this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, this.accentColor, 6)
          );
        }
        break;
      }

      case 'spiral': {
        soundType = 'wave';
        this.spiralAngle += 0.38;
        const arms = this.currentPhase >= 3 ? 4 : 3;
        for (let i = 0; i < arms; i++) {
          const a = this.spiralAngle + (i * Math.PI * 2) / arms;
          bullets.push(
            new EnemyBullet(
              this.x,
              this.y,
              Math.cos(a) * speed * 0.9,
              Math.sin(a) * speed * 0.9,
              '#ff00aa',
              6.5
            )
          );
        }
        break;
      }

      case 'aimed_spread': {
        soundType = 'shoot';
        const baseAngle = Math.atan2(playerY - this.y, playerX - this.x);
        const offsets = this.currentPhase >= 3 
          ? [-0.35, -0.18, 0, 0.18, 0.35] 
          : [-0.22, 0, 0.22];
        offsets.forEach((off) => {
          const a = baseAngle + off;
          bullets.push(
            new EnemyBullet(
              this.x,
              this.y + 20,
              Math.cos(a) * speed * 1.15,
              Math.sin(a) * speed * 1.15,
              '#ffea00',
              6
            )
          );
        });
        break;
      }

      case 'cross': {
        soundType = 'heavy';
        const rays = this.currentPhase >= 3 ? 12 : 8;
        for (let i = 0; i < rays; i++) {
          const a = (i * Math.PI * 2) / rays + (this.time * 0.05);
          bullets.push(
            new EnemyBullet(this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, '#00ffcc', 6)
          );
        }
        break;
      }

      case 'plasma_barrage': {
        soundType = 'shoot';
        // Alternating heavy broadside salvo
        [-this.radius * 0.5, this.radius * 0.5].forEach((offset) => {
          const a = Math.PI / 2 + (Math.random() - 0.5) * 0.25;
          bullets.push(
            new EnemyBullet(this.x + offset, this.y + 25, Math.cos(a) * speed * 1.25, Math.sin(a) * speed * 1.25, '#f43f5e', 6.5)
          );
        });
        break;
      }

      case 'cluster_mines': {
        soundType = 'heavy';
        // Cluster munitions floating forward
        for (let i = -1; i <= 1; i++) {
          const a = Math.PI / 2 + i * 0.28;
          bullets.push(
            new EnemyBullet(this.x + i * 25, this.y + 20, Math.cos(a) * speed * 0.75, Math.sin(a) * speed * 0.75, '#f97316', 8)
          );
        }
        break;
      }

      case 'sniper_burst': {
        soundType = 'heavy';
        // Precision high-velocity dual tracers aimed right at starfighter
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        bullets.push(
          new EnemyBullet(this.x - 14, this.y + 18, Math.cos(angle) * speed * 1.35, Math.sin(angle) * speed * 1.35, '#38bdf8', 5.5)
        );
        bullets.push(
          new EnemyBullet(this.x + 14, this.y + 18, Math.cos(angle) * speed * 1.35, Math.sin(angle) * speed * 1.35, '#38bdf8', 5.5)
        );
        break;
      }

      case 'laser_sweep': {
        soundType = 'heavy';
        // Continuous sweeping fan of concentrated laser bolts across screen
        const count = 7 + this.currentPhase * 2;
        const sweepPhase = Math.sin(this.time * 0.15);
        const centerAngle = Math.atan2(playerY - this.y, playerX - this.x);
        for (let i = 0; i < count; i++) {
          const off = (i - (count - 1) / 2) * 0.11 + sweepPhase * 0.22;
          const a = centerAngle + off;
          bullets.push(
            new EnemyBullet(
              this.x,
              this.y + 25,
              Math.cos(a) * speed * 1.25,
              Math.sin(a) * speed * 1.25,
              '#ef4444',
              5.5
            )
          );
        }
        break;
      }

      case 'singularity_vortex': {
        soundType = 'wave';
        // Inward vortex of dark matter bolts
        const count = 10 + this.currentPhase * 3;
        for (let i = 0; i < count; i++) {
          const a = (i * Math.PI * 2) / count + (this.time * 0.09);
          const spd = speed * (0.8 + 0.3 * Math.sin(i + this.time * 0.1));
          bullets.push(
            new EnemyBullet(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, '#c084fc', 7)
          );
        }
        break;
      }

      case 'cyclone_spiral': {
        soundType = 'wave';
        // Interleaved dual counter-rotating cyclones
        const arms = 6;
        for (let i = 0; i < arms; i++) {
          const a1 = (i * Math.PI * 2) / arms + (this.time * 0.08);
          const a2 = (i * Math.PI * 2) / arms - (this.time * 0.08);
          bullets.push(
            new EnemyBullet(this.x, this.y, Math.cos(a1) * speed * 0.95, Math.sin(a1) * speed * 0.95, '#06b6d4', 6),
            new EnemyBullet(this.x, this.y, Math.cos(a2) * speed * 0.85, Math.sin(a2) * speed * 0.85, '#ec4899', 6)
          );
        }
        break;
      }

      case 'quad_catapult': {
        soundType = 'heavy';
        // 4 heavy explosive flak shells launched from 4 battery ports
        [-this.radius * 0.7, -this.radius * 0.25, this.radius * 0.25, this.radius * 0.7].forEach((ox, idx) => {
          const a = Math.PI / 2 + (idx - 1.5) * 0.22;
          bullets.push(
            new EnemyBullet(this.x + ox, this.y + 20, Math.cos(a) * speed * 1.1, Math.sin(a) * speed * 1.1, '#f59e0b', 8.5)
          );
        });
        break;
      }

      case 'homing_orbs':
      default: {
        soundType = 'wave';
        const count = 4 + this.currentPhase * 2;
        for (let i = 0; i < count; i++) {
          const a = (i * Math.PI * 2) / count + this.time * 0.08;
          bullets.push(
            new EnemyBullet(this.x, this.y, Math.cos(a) * speed * 0.85, Math.sin(a) * speed * 0.85, '#a855f7', 7)
          );
        }
        break;
      }
    }

    return { bullets, soundType };
  }

  /**
   * Procedural modular rendering based on hull archetype.
   */
  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.bankRoll);

    const r = this.radius;

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. ENGINE NACELLES & PROPULSION PLUMES
    // ─────────────────────────────────────────────────────────────────────────────
    ctx.shadowBlur = this.enraged ? 25 : 15;
    ctx.shadowColor = this.accentColor;
    const enginePuffs = this.hullType === 'carrier' || this.hullType === 'titan' 
      ? [-r * 0.8, -r * 0.35, r * 0.35, r * 0.8] 
      : [-r * 0.55, 0, r * 0.55];

    enginePuffs.forEach((offset) => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(offset - 8, -r * 0.72, 16, 12);
      ctx.fillStyle = this.enraged ? '#ff2200' : this.accentColor;
      ctx.fillRect(offset - 6, -r * 0.72, 12, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(offset - 3, -r * 0.72, 6, 2);
    });
    ctx.shadowBlur = 0;

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. PROCEDURAL MODULAR HULL GEOMETRY
    // ─────────────────────────────────────────────────────────────────────────────
    const hullFill = this.hitFlash > 0 ? '#ffffff' : '#0f172a';
    const armorPlate = this.hitFlash > 0 ? '#ffffff' : '#1e293b';

    ctx.fillStyle = hullFill;
    ctx.strokeStyle = this.accentColor;
    ctx.lineWidth = 2.5;

    if (this.levelId === 1) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 1: Vanguard Dreadwing (Fast Swept Strike Cruiser)
      // ═════════════════════════════════════════════════════════════════════
      ctx.beginPath();
      ctx.moveTo(0, r * 1.3);
      ctx.lineTo(r * 0.45, r * 0.7);
      ctx.lineTo(r * 1.35, -r * 0.1);
      ctx.lineTo(r * 1.25, -r * 0.65);
      ctx.lineTo(r * 0.5, -r * 0.5);
      ctx.lineTo(0, -r * 0.65);
      ctx.lineTo(-r * 0.5, -r * 0.5);
      ctx.lineTo(-r * 1.25, -r * 0.65);
      ctx.lineTo(-r * 1.35, -r * 0.1);
      ctx.lineTo(-r * 0.45, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dual Wingtip Azure Razor Cutters
      [-r * 1.15, r * 1.15].forEach((wx) => {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(wx - 4, -r * 0.3, 8, r * 0.65);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(wx - 2, r * 0.35, 4, 8);
      });

    } else if (this.levelId === 2) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 2: Goliath Battlecruiser (Heavy Fleet Carrier with Launch Decks)
      // ═════════════════════════════════════════════════════════════════════
      // Wide Industrial Carrier Box Hull
      ctx.beginPath();
      ctx.moveTo(0, r * 0.95);
      ctx.lineTo(r * 1.55, r * 0.45);
      ctx.lineTo(r * 1.45, -r * 0.65);
      ctx.lineTo(r * 0.7, -r * 0.75);
      ctx.lineTo(-r * 0.7, -r * 0.75);
      ctx.lineTo(-r * 1.45, -r * 0.65);
      ctx.lineTo(-r * 1.55, r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Twin Illuminated Flight Deck Runways with Hazard Striping
      [-r * 0.9, r * 0.45].forEach((rx) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(rx, -r * 0.45, r * 0.45, r * 0.85);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, -r * 0.45, r * 0.45, r * 0.85);

        // Blinking Green Runway Guide Lights
        for (let l = 0; l < 4; l++) {
          ctx.fillStyle = Math.sin(this.time * 0.15 + l) > 0 ? '#22c55e' : '#14532d';
          ctx.beginPath();
          ctx.arc(rx + r * 0.22, -r * 0.35 + l * (r * 0.22), 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

    } else if (this.levelId === 3) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 3: Phantom Dreadnought (Armored Trench Assault Destroyer)
      // ═════════════════════════════════════════════════════════════════════
      // Heavy Diamond Hull with Ramming Bow
      ctx.beginPath();
      ctx.moveTo(0, r * 1.4);          // Prow ram
      ctx.lineTo(r * 0.6, r * 0.4);
      ctx.lineTo(r * 1.25, 0);
      ctx.lineTo(r * 1.1, -r * 0.65);
      ctx.lineTo(0, -r * 0.5);
      ctx.lineTo(-r * 1.1, -r * 0.65);
      ctx.lineTo(-r * 1.25, 0);
      ctx.lineTo(-r * 0.6, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Toxic Emerald Glowing Conduits
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.2);
      ctx.lineTo(-r * 0.3, r * 0.2);
      ctx.lineTo(0, r * 0.7);
      ctx.lineTo(r * 0.3, r * 0.2);
      ctx.lineTo(r * 0.8, -r * 0.2);
      ctx.stroke();
      ctx.restore();

      // Heavy Side Turret Sponsons
      [-r * 1.05, r * 1.05].forEach((tx) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tx - 6, -r * 0.2, 12, r * 0.5);
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(tx - 3, r * 0.25, 6, 6);
      });

    } else if (this.levelId === 4) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 4: Sol Invictus (Solar Core Titan with Rotating Corona Rings)
      // ═════════════════════════════════════════════════════════════════════
      // Hexagonal Solar Bastion Chassis
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = Math.cos(a) * (r * 1.2);
        const py = Math.sin(a) * (r * 1.0);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Concentric Rotating Solar Flare Rings
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#f59e0b';
      ctx.lineWidth = 2.5;

      // Outer Ring
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.05, r * 0.55, this.time * 0.04, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Counter-Rotating Ring
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.75, r * 0.4, -this.time * 0.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

    } else if (this.levelId === 5) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 5: Aegis Super-Carrier (Cybernetic Command Flagship)
      // ═════════════════════════════════════════════════════════════════════
      // Sleek Cybernetic Arrowhead
      ctx.beginPath();
      ctx.moveTo(0, r * 1.35);
      ctx.lineTo(r * 1.35, -r * 0.2);
      ctx.lineTo(r * 0.75, -r * 0.75);
      ctx.lineTo(0, -r * 0.45);
      ctx.lineTo(-r * 0.75, -r * 0.75);
      ctx.lineTo(-r * 1.35, -r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 6 Orbiting Defensive Shield Projector Nodes
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + this.time * 0.04;
        const px = Math.cos(a) * (r * 1.35);
        const py = Math.sin(a) * (r * 0.85);
        ctx.fillStyle = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#06b6d4';
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

    } else if (this.levelId === 6) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 6: Helios Vanguard (Corona Battle Dreadnought with Incinerator Horns)
      // ═════════════════════════════════════════════════════════════════════
      // Heavy Dreadnought Hull
      ctx.beginPath();
      ctx.moveTo(0, r * 0.8);
      ctx.lineTo(r * 0.5, r * 0.3);
      ctx.lineTo(r * 1.3, r * 0.1);
      ctx.lineTo(r * 1.25, -r * 0.65);
      ctx.lineTo(0, -r * 0.5);
      ctx.lineTo(-r * 1.25, -r * 0.65);
      ctx.lineTo(-r * 1.3, r * 0.1);
      ctx.lineTo(-r * 0.5, r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Massive Protruding Incinerator Magma Horns
      [-r * 0.45, r * 0.45].forEach((hx) => {
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.moveTo(hx - 8, r * 0.2);
        ctx.lineTo(hx, r * 1.45); // Extends far forward
        ctx.lineTo(hx + 8, r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glowing Magma Emitter Tip
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(hx, r * 1.45, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

    } else if (this.levelId === 7) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 7: Void Leviathan (Biomechanical Void Organism)
      // ═════════════════════════════════════════════════════════════════════
      // 4 Flexing Void Mandibles / Scythes
      const flex = Math.sin(this.time * 0.08) * 0.15;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.7);
      ctx.bezierCurveTo(r * (1.2 + flex), r * 1.2, r * 1.6, 0, r * 1.3, -r * 0.6);
      ctx.lineTo(r * 0.4, -r * 0.65);
      ctx.lineTo(0, -r * 0.45);
      ctx.lineTo(-r * 0.4, -r * 0.65);
      ctx.lineTo(-r * 1.3, -r * 0.6);
      ctx.bezierCurveTo(-r * 1.6, 0, -r * (1.2 + flex), r * 1.2, 0, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pulsing Bioluminescent Tendrils (Ultraviolet)
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.3);
      ctx.quadraticCurveTo(-r * 0.2, 0, 0, r * 0.5);
      ctx.quadraticCurveTo(r * 0.2, 0, r * 0.7, -r * 0.3);
      ctx.stroke();

    } else if (this.levelId === 8) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 8: Pulsar Colossus (Relativistic Dynamo Juggernaut)
      // ═════════════════════════════════════════════════════════════════════
      // Heavy Armored Core Housing
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dual Counter-Rotating Relativistic Accelerator Rings
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#06b6d4';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Ring 1 (Tilted +35 deg, clockwise spin)
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.35, r * 0.5, Math.PI / 5 + this.time * 0.05, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2 (Tilted -35 deg, counter-clockwise spin)
      ctx.strokeStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.35, r * 0.5, -Math.PI / 5 - this.time * 0.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

    } else if (this.levelId === 9) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 9: Apex Sovereign (Armada Supreme Warlord Flagship)
      // ═════════════════════════════════════════════════════════════════════
      // Tri-Hull Dreadnought Prow
      ctx.beginPath();
      ctx.moveTo(0, r * 1.45);         // Center dread prow
      ctx.lineTo(r * 0.5, r * 0.7);
      ctx.lineTo(r * 1.5, r * 0.1);    // Starboard wing blade
      ctx.lineTo(r * 1.3, -r * 0.6);
      ctx.lineTo(0, -r * 0.4);
      ctx.lineTo(-r * 1.3, -r * 0.6);
      ctx.lineTo(-r * 1.5, r * 0.1);   // Port wing blade
      ctx.lineTo(-r * 0.5, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crimson Energy Scythe Edges
      ctx.save();
      ctx.strokeStyle = '#ff0055';
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ff0055';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 1.45, r * 0.1);
      ctx.lineTo(-r * 0.5, r * 0.7);
      ctx.lineTo(0, r * 1.45);
      ctx.lineTo(r * 0.5, r * 0.7);
      ctx.lineTo(r * 1.45, r * 0.1);
      ctx.stroke();
      ctx.restore();

      // Twin Command Observation Towers
      [-r * 0.45, r * 0.45].forEach((bx) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bx - 10, -r * 0.35, 20, 24);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(bx - 6, -r * 0.28, 12, 6);
      });

    } else if (this.levelId === 10) {
      // ═════════════════════════════════════════════════════════════════════
      // LEVEL 10: OMEGA ZERO (Cataclysmic Void Singularity)
      // ═════════════════════════════════════════════════════════════════════
      // 4 Floating Counter-Orbiting Dark Matter Monolith Shards
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + this.time * 0.03;
        const dist = r * 1.25;
        const mx = Math.cos(a) * dist;
        const my = Math.sin(a) * dist;

        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(a + Math.PI / 4);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 18);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Gravitational Event Horizon Distortion Halo
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Pitch-Black Event Horizon Void Sphere
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.stroke();

    } else {
      // ═════════════════════════════════════════════════════════════════════
      // FREE FLIGHT / DEFAULT MILESTONE BOSS (Celestial Incursion Archon)
      // ═════════════════════════════════════════════════════════════════════
      ctx.beginPath();
      ctx.moveTo(0, r * 1.3);
      ctx.lineTo(r * 0.5, r * 0.85);
      ctx.lineTo(r * 1.45, r * 0.35);
      ctx.lineTo(r * 1.4, -r * 0.5);
      ctx.lineTo(0, -r * 0.6);
      ctx.lineTo(-r * 1.4, -r * 0.5);
      ctx.lineTo(-r * 1.45, r * 0.35);
      ctx.lineTo(-r * 0.5, r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden Celestial Filaments
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.1, r * 0.45, this.time * 0.04, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. CENTRAL GLOWING CORE / CITADEL BRIDGE
    // ─────────────────────────────────────────────────────────────────────────────
    const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, r * 0.4);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, this.enraged ? '#ff0055' : this.accentColor);
    coreGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, r * 0.05, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. WEAPON CHARGING TELEGRAPH FLARE
    // ─────────────────────────────────────────────────────────────────────────────
    if (this.telegraphTime > 0) {
      ctx.save();
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#ffea00';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, r * 0.95, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. KINETIC FORCEFIELD BARRIER (If Active)
    // ─────────────────────────────────────────────────────────────────────────────
    if (this.hasKineticBarrier) {
      ctx.save();
      ctx.shadowBlur = 26;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3.5;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.16)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating hex barrier nodes
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + this.time * 0.04;
        const px = Math.cos(a) * (r * 1.5);
        const py = Math.sin(a) * (r * 1.5);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. PHASE TRANSITION SHOCKWAVE EXPANSION
    // ─────────────────────────────────────────────────────────────────────────────
    if (this.phaseTransitionFlash > 0) {
      ctx.save();
      const progress = 1 - this.phaseTransitionFlash / 35; // 0 -> 1
      const waveRadius = r * (1 + progress * 2.2);
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 4 * (1 - progress);
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff0055';
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 7. CRITICAL DAMAGE SMOKE & OVERHEAT EMISSIONS (HP < 45%)
    // ─────────────────────────────────────────────────────────────────────────────
    if (this.hp < this.maxHp * 0.45 && Math.random() < 0.35) {
      ctx.fillStyle = Math.random() < 0.5 ? '#ff4400' : '#ffff00';
      ctx.beginPath();
      const ox = (Math.random() - 0.5) * r * 1.2;
      const oy = (Math.random() - 0.5) * r * 0.8;
      ctx.arc(ox, oy, 3 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Re-export alias for seamless compatibility
export { ModularBoss as Boss };
