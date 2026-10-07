import { Enemy } from './entities';
import { LevelConfig, calculateDynamicDifficulty, DynamicDifficultyState } from '../types';

export interface WarpBeacon {
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export type FormationType =
  | 'scout_v'
  | 'sine_patrol'
  | 'pincer_flank'
  | 'heavy_convoy'
  | 'echelon_line'
  | 'asteroid_cluster'
  | 'strike_cross'
  | 'kamikaze_swarm'
  | 'hunter_squad'
  | 'player_ambush_pincer'
  | 'tracking_dive_squadron'
  | 'strafe_harass_wing'
  | 'spiral_pursuit_vortex'
  | 'strafe_sweep_squadron'
  | 'wraith_pursuit_pack'
  | 'cobra_zigzag_strike';

export class EnemySpawner {
  private level: LevelConfig;
  private timer: number = 0;
  private cargoTimer: number = 0;
  private asteroidTimer: number = 0;
  public waveCount: number = 0;
  public warpBeacons: WarpBeacon[] = [];
  public currentDynamicDifficulty: DynamicDifficultyState;
  private cargoMilestone1Fired: boolean = false;
  private cargoMilestone2Fired: boolean = false;

  constructor(level: LevelConfig) {
    this.level = level;
    this.timer = 20;
    this.cargoTimer = 900; // ~15 seconds into level for first natural supply craft
    this.asteroidTimer = 180;
    this.currentDynamicDifficulty = calculateDynamicDifficulty(level, 0, false);
  }

  public setLevel(level: LevelConfig) {
    this.level = level;
    this.timer = 20;
    this.cargoTimer = 900;
    this.asteroidTimer = 180;
    this.warpBeacons = [];
    this.waveCount = 0;
    this.cargoMilestone1Fired = false;
    this.cargoMilestone2Fired = false;
    this.currentDynamicDifficulty = calculateDynamicDifficulty(level, 0, false);
  }

  /**
   * Main periodic update tick. Returns an array of newly spawned moving targets.
   */
  public update(
    width: number,
    height: number,
    currentKills: number,
    targetKills: number,
    isBossActive: boolean,
    activeEnemyCount: number,
    playerX: number = width / 2,
    playerY: number = height - 120,
    distanceFlown: number = 0
  ): Enemy[] {
    const spawned: Enemy[] = [];

    // Calculate live dynamic difficulty based on current sector progress
    const dyn = calculateDynamicDifficulty(this.level, currentKills, isBossActive);
    this.currentDynamicDifficulty = dyn;

    // Update warp beacon animations
    for (let i = this.warpBeacons.length - 1; i >= 0; i--) {
      const beacon = this.warpBeacons[i];
      beacon.life--;
      if (beacon.life <= 0) {
        this.warpBeacons.splice(i, 1);
      }
    }

    const isFreeFlight = this.level.id === 99;
    const distanceTier = isFreeFlight ? Math.floor(distanceFlown / 100) : 0;

    // Difficulty escalates every 100m of travel!
    const tierSpeedBoost = isFreeFlight ? 1 + distanceTier * 0.05 : 1;
    const tierHpBoost = isFreeFlight ? 1 + distanceTier * 0.06 : 1;
    const tierBulletBoost = isFreeFlight ? 1 + Math.min(1.0, distanceTier * 0.04) : 1;
    const tierSpawnBoost = isFreeFlight ? Math.max(0.45, 1 - distanceTier * 0.04) : 1;

    const speedMult = this.level.enemySpeedMultiplier * (1 + dyn.sectorProgress * 0.1) * tierSpeedBoost;
    const hpMult = this.level.enemyHealthMultiplier * tierHpBoost;
    const bulletMult = this.level.bulletSpeedMultiplier * dyn.bulletSpeedMultiplier * tierBulletBoost;

    // 1. Regular Tactical Wave Spawner with Dynamic Frequency Scaling
    // Active enemy ceiling dynamically increases with sector progression and 100m distance tiers
    const maxActive = isBossActive 
      ? 3 
      : isFreeFlight
      ? Math.min(14, 5 + Math.floor(distanceTier * 0.5))
      : Math.min(12, 4 + Math.floor(this.level.id * 0.7) + Math.floor(dyn.sectorProgress * 3));
    const canSpawnStandard = (!isBossActive && currentKills < targetKills) || (isBossActive && activeEnemyCount < 2);

    this.timer--;
    if (this.timer <= 0 && canSpawnStandard && activeEnemyCount < maxActive) {
      const newEnemies = this.generateWave(width, isBossActive, dyn, playerX, playerY, distanceTier);
      spawned.push(...newEnemies);

      // Reset timer based on dynamic spawn frequency and 100m tier acceleration
      const baseRate = isBossActive ? 220 : Math.floor(dyn.currentSpawnRate * tierSpawnBoost);
      this.timer = Math.floor(baseRate * (0.88 + Math.random() * 0.24));
    }

    // 2. Milestone / Selective Recon Cargo Drone (Guaranteed power-up drops)
    // Milestone 1: ~35% of target kills
    // Milestone 2: ~70% of target kills
    const progress = targetKills > 0 ? currentKills / targetKills : 0;
    let shouldSpawnCargo = false;

    if (!isBossActive) {
      if (!this.cargoMilestone1Fired && progress >= 0.35) {
        this.cargoMilestone1Fired = true;
        shouldSpawnCargo = true;
      } else if (!this.cargoMilestone2Fired && progress >= 0.70) {
        this.cargoMilestone2Fired = true;
        shouldSpawnCargo = true;
      } else {
        this.cargoTimer--;
        if (this.cargoTimer <= 0 && activeEnemyCount < maxActive + 1) {
          shouldSpawnCargo = true;
          this.cargoTimer = Math.floor(1200 + Math.random() * 600); // 20-30 seconds
        }
      }
    }

    if (shouldSpawnCargo && !isBossActive) {
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? -45 : width + 45;
      const droneY = Math.random() * (height * 0.3) + 70;
      const drone = new Enemy(startX, droneY, 'drone', speedMult, hpMult, bulletMult, 'cross');
      drone.vx = (fromLeft ? 3.8 : -3.8) * speedMult;
      drone.vy = 0.4;
      drone.isCargo = true;

      this.warpBeacons.push({
        x: fromLeft ? 50 : width - 50,
        y: droneY,
        radius: 36,
        color: '#ffea00',
        life: 28,
        maxLife: 28
      });

      spawned.push(drone);
    }

    // 3. Destructible Asteroid Hazards (Only if allowed in sector)
    if (this.level.allowedEnemyTypes.includes('asteroid') && !isBossActive) {
      this.asteroidTimer--;
      if (this.asteroidTimer <= 0) {
        const astX = Math.random() * (width - 160) + 80;
        const asteroid = new Enemy(astX, -50, 'asteroid', speedMult, hpMult, bulletMult, 'linear');
        spawned.push(asteroid);

        this.warpBeacons.push({
          x: astX,
          y: 25,
          radius: 24,
          color: '#94a3b8',
          life: 18,
          maxLife: 18
        });

        // More frequent in Level 1 & 2 asteroid sectors, rarer in deep citadels
        const astInterval = this.level.id <= 2 ? 190 : 380;
        this.asteroidTimer = Math.floor(astInterval + Math.random() * 150);
      }
    }

    return spawned;
  }

  /**
   * Generates a tactical formation of enemies based on current sector difficulty and allowed types.
   */
  private generateWave(
    width: number, 
    isBossActive: boolean, 
    dyn?: DynamicDifficultyState,
    playerX: number = width / 2,
    playerY: number = 500,
    distanceTier: number = 0
  ): Enemy[] {
    this.waveCount++;
    const enemies: Enemy[] = [];
    const isFreeFlight = this.level.id === 99;
    const difficulty = dyn || this.currentDynamicDifficulty;

    const tierSpeedBoost = isFreeFlight ? 1 + distanceTier * 0.05 : 1;
    const tierHpBoost = isFreeFlight ? 1 + distanceTier * 0.06 : 1;
    const tierBulletBoost = isFreeFlight ? 1 + Math.min(1.0, distanceTier * 0.04) : 1;

    const speedMult = this.level.enemySpeedMultiplier * (1 + difficulty.sectorProgress * 0.1) * tierSpeedBoost;
    const hpMult = this.level.enemyHealthMultiplier * tierHpBoost;
    const bulletMult = this.level.bulletSpeedMultiplier * difficulty.bulletSpeedMultiplier * tierBulletBoost;
    const allowed = this.level.allowedEnemyTypes;

    // During boss battle, spawn occasional light wasp adds
    if (isBossActive) {
      const side = Math.random() < 0.5;
      const x = side ? 70 : width - 70;
      enemies.push(new Enemy(x, -40, 'wasp', speedMult * 0.85, hpMult * 0.8, bulletMult, 'sine'));
      return enemies;
    }

    const formations: FormationType[] = [];
    // Select formations based on allowed units & player tracking
    formations.push('scout_v');
    formations.push('sine_patrol');
    formations.push('echelon_line');
    formations.push('player_ambush_pincer');
    formations.push('tracking_dive_squadron');
    formations.push('strafe_harass_wing');

    // In Free Flight, unlock formations as 100m distance tiers progress
    if (allowed.includes('mantis') && (!isFreeFlight || distanceTier >= 1)) {
      formations.push('pincer_flank');
    }
    if (allowed.includes('interceptor') && (!isFreeFlight || distanceTier >= 2)) {
      formations.push('heavy_convoy');
      formations.push('strike_cross');
    }
    if (allowed.includes('kamikaze') && (!isFreeFlight || distanceTier >= 3)) {
      formations.push('kamikaze_swarm');
    }
    formations.push('hunter_squad');
    if (this.level.id >= 3 || (isFreeFlight && distanceTier >= 4)) {
      formations.push('spiral_pursuit_vortex');
    }
    if (allowed.includes('phantom') || (isFreeFlight && distanceTier >= 1)) {
      formations.push('strafe_sweep_squadron');
    }
    if (allowed.includes('wraith') || (isFreeFlight && distanceTier >= 2)) {
      formations.push('wraith_pursuit_pack');
    }
    if (allowed.includes('cobra') || (isFreeFlight && distanceTier >= 1)) {
      formations.push('cobra_zigzag_strike');
    }

    const chosen = formations[this.waveCount % formations.length];
    const baseX = Math.random() * (width - 240) + 120;

    switch (chosen) {
      case 'scout_v': {
        // Arrowhead formation: In Level 1-2, 3 scouts; in higher levels, 3-5 with leader
        const leadType = allowed.includes('scarab') && this.level.id >= 2 ? 'scarab' : 'wasp';
        enemies.push(new Enemy(baseX, -50, leadType, speedMult, hpMult, bulletMult, 'linear'));
        enemies.push(new Enemy(baseX - 55, -90, 'wasp', speedMult, hpMult, bulletMult, 'sine'));
        enemies.push(new Enemy(baseX + 55, -90, 'wasp', speedMult, hpMult, bulletMult, 'sine'));

        if (this.level.id >= 5) {
          enemies.push(new Enemy(baseX - 105, -130, 'wasp', speedMult, hpMult, bulletMult, 'zigzag'));
          enemies.push(new Enemy(baseX + 105, -130, 'wasp', speedMult, hpMult, bulletMult, 'zigzag'));
        }

        this.warpBeacons.push({
          x: baseX,
          y: 40,
          radius: 35,
          color: leadType === 'scarab' ? '#6366f1' : '#eab308',
          life: 22,
          maxLife: 22
        });
        break;
      }

      case 'sine_patrol': {
        // S-curve snake stream of scouts
        const count = this.level.id <= 2 ? 3 : 4;
        const entryX = Math.random() < 0.5 ? width * 0.28 : width * 0.72;
        for (let i = 0; i < count; i++) {
          enemies.push(new Enemy(entryX, -50 - i * 60, 'wasp', speedMult * 1.05, hpMult, bulletMult, 'sine'));
        }

        this.warpBeacons.push({
          x: entryX,
          y: 35,
          radius: 30,
          color: '#ffaa00',
          life: 22,
          maxLife: 22
        });
        break;
      }

      case 'pincer_flank': {
        // Coordinated dive swoop inward from left and right boundaries
        const unitType = allowed.includes('mantis') ? 'mantis' : 'wasp';
        enemies.push(new Enemy(65, -50, unitType, speedMult, hpMult, bulletMult, 'dive'));
        enemies.push(new Enemy(width - 65, -50, unitType, speedMult, hpMult, bulletMult, 'dive'));

        if (this.level.id >= 5 && allowed.includes('scarab')) {
          enemies.push(new Enemy(120, -110, 'scarab', speedMult, hpMult, bulletMult, 'linear'));
          enemies.push(new Enemy(width - 120, -110, 'scarab', speedMult, hpMult, bulletMult, 'linear'));
        }

        this.warpBeacons.push({ x: 80, y: 40, radius: 32, color: '#00e5ff', life: 24, maxLife: 24 });
        this.warpBeacons.push({ x: width - 80, y: 40, radius: 32, color: '#00e5ff', life: 24, maxLife: 24 });
        break;
      }

      case 'heavy_convoy': {
        // Armored Interceptor flagship flanked by Corvettes
        enemies.push(new Enemy(baseX, -70, 'interceptor', speedMult, hpMult, bulletMult, 'linear'));
        enemies.push(new Enemy(baseX - 80, -50, 'scarab', speedMult, hpMult, bulletMult, 'sine'));
        enemies.push(new Enemy(baseX + 80, -50, 'scarab', speedMult, hpMult, bulletMult, 'sine'));

        this.warpBeacons.push({
          x: baseX,
          y: 45,
          radius: 44,
          color: '#f97316',
          life: 26,
          maxLife: 26
        });
        break;
      }

      case 'strike_cross': {
        // Fast dual angle diagonal assault
        enemies.push(new Enemy(baseX - 60, -60, 'mantis', speedMult * 1.1, hpMult, bulletMult, 'zigzag'));
        enemies.push(new Enemy(baseX + 60, -60, 'mantis', speedMult * 1.1, hpMult, bulletMult, 'zigzag'));
        if (allowed.includes('interceptor')) {
          enemies.push(new Enemy(baseX, -120, 'interceptor', speedMult * 0.9, hpMult, bulletMult, 'linear'));
        }
        break;
      }

      case 'kamikaze_swarm': {
        // High-speed razor dive darts spawning at top of screen charging downwards toward player
        const count = 3;
        const spacing = 70;
        for (let i = 0; i < count; i++) {
          enemies.push(new Enemy(baseX + (i - 1) * spacing, -45 - i * 30, 'kamikaze', speedMult * 1.15, hpMult * 0.9, bulletMult, 'linear'));
        }
        this.warpBeacons.push({
          x: baseX,
          y: 40,
          radius: 38,
          color: '#ff3300',
          life: 20,
          maxLife: 20
        });
        break;
      }

      case 'hunter_squad': {
        // Combined-arms tactical strike wing: Lead corvette with flanking scouts & dive darts
        const centerType = allowed.includes('interceptor') ? 'interceptor' : allowed.includes('scarab') ? 'scarab' : 'wasp';
        const wingType = allowed.includes('kamikaze') ? 'kamikaze' : allowed.includes('mantis') ? 'mantis' : 'wasp';
        enemies.push(new Enemy(baseX, -60, centerType, speedMult, hpMult, bulletMult, 'linear'));
        enemies.push(new Enemy(baseX - 65, -85, wingType, speedMult, hpMult, bulletMult, 'dive'));
        enemies.push(new Enemy(baseX + 65, -85, wingType, speedMult, hpMult, bulletMult, 'dive'));
        this.warpBeacons.push({
          x: baseX,
          y: 45,
          radius: 40,
          color: '#f59e0b',
          life: 22,
          maxLife: 22
        });
        break;
      }

      case 'player_ambush_pincer': {
        // Dynamic Player-Targeted Ambush: Spawns flanking pincer wings on both sides of player position
        const pincerLeft = Math.max(55, playerX - 160);
        const pincerRight = Math.min(width - 55, playerX + 160);
        const wingType = allowed.includes('mantis') ? 'mantis' : 'wasp';

        enemies.push(new Enemy(pincerLeft, -50, wingType, speedMult * 1.1, hpMult, bulletMult, 'pincer_converge'));
        enemies.push(new Enemy(pincerRight, -50, wingType, speedMult * 1.1, hpMult, bulletMult, 'pincer_converge'));
        if (allowed.includes('kamikaze') && Math.random() < 0.6) {
          enemies.push(new Enemy(playerX, -100, 'kamikaze', speedMult * 1.2, hpMult * 0.9, bulletMult, 'intercept_ram'));
        }

        this.warpBeacons.push({ x: pincerLeft, y: 35, radius: 34, color: '#00e5ff', life: 22, maxLife: 22 });
        this.warpBeacons.push({ x: pincerRight, y: 35, radius: 34, color: '#00e5ff', life: 22, maxLife: 22 });
        break;
      }

      case 'tracking_dive_squadron': {
        // High-Threat Strike Team: Aligns directly overhead of player ship with lead targeting
        const targetCenter = Math.max(80, Math.min(width - 80, playerX));
        const leadType = allowed.includes('scarab') ? 'scarab' : 'wasp';
        const wingType = allowed.includes('kamikaze') ? 'kamikaze' : allowed.includes('mantis') ? 'mantis' : 'wasp';

        enemies.push(new Enemy(targetCenter, -60, leadType, speedMult, hpMult, bulletMult, 'homing_swoop'));
        enemies.push(new Enemy(targetCenter - 55, -95, wingType, speedMult * 1.1, hpMult, bulletMult, 'intercept_ram'));
        enemies.push(new Enemy(targetCenter + 55, -95, wingType, speedMult * 1.1, hpMult, bulletMult, 'intercept_ram'));

        this.warpBeacons.push({
          x: targetCenter,
          y: 40,
          radius: 42,
          color: '#ef4444',
          life: 24,
          maxLife: 24
        });
        break;
      }

      case 'strafe_harass_wing': {
        // Aerial Dogfight Wing: Descends to combat ceiling and actively strafes across player coordinates
        const entryX = Math.max(90, Math.min(width - 90, playerX + (Math.random() - 0.5) * 120));
        const count = this.level.id <= 3 ? 2 : 3;
        for (let i = 0; i < count; i++) {
          const type = allowed.includes('mantis') && i === 0 ? 'mantis' : 'wasp';
          enemies.push(new Enemy(entryX + (i - 1) * 60, -50 - i * 35, type, speedMult * 1.05, hpMult, bulletMult, 'strafe_harass'));
        }

        this.warpBeacons.push({
          x: entryX,
          y: 40,
          radius: 36,
          color: '#a855f7',
          life: 22,
          maxLife: 22
        });
        break;
      }

      case 'spiral_pursuit_vortex': {
        // Relentless Corkscrew Vortex: Swirls downwards while continuously centering orbit on playerX
        const vortexCenter = Math.max(70, Math.min(width - 70, playerX));
        const count = 2;
        for (let i = 0; i < count; i++) {
          const type = allowed.includes('kamikaze') && i === 1 ? 'kamikaze' : 'wasp';
          enemies.push(new Enemy(vortexCenter + (i === 0 ? -40 : 40), -50 - i * 45, type, speedMult * 1.1, hpMult, bulletMult, 'spiral_pursuit'));
        }

        this.warpBeacons.push({
          x: vortexCenter,
          y: 45,
          radius: 38,
          color: '#06b6d4',
          life: 24,
          maxLife: 24
        });
        break;
      }

      case 'strafe_sweep_squadron': {
        // High-Speed Lateral Strafing Squadron (Phantom Stealth Infiltrators)
        const strafeCenter = Math.max(90, Math.min(width - 90, playerX + (Math.random() - 0.5) * 140));
        const count = isFreeFlight && distanceTier >= 3 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          const type = allowed.includes('phantom') || isFreeFlight ? 'phantom' : 'wasp';
          enemies.push(new Enemy(strafeCenter + (i - 0.5) * 70, -50 - i * 40, type, speedMult * 1.12, hpMult, bulletMult, 'strafing_sweep'));
        }

        this.warpBeacons.push({
          x: strafeCenter,
          y: 40,
          radius: 40,
          color: '#c084fc',
          life: 24,
          maxLife: 24
        });
        break;
      }

      case 'wraith_pursuit_pack': {
        // Aggressive Dogfight Hunters: Continuously chase and track player coordinates
        const entryX = Math.max(80, Math.min(width - 80, playerX + (Math.random() < 0.5 ? -120 : 120)));
        const count = isFreeFlight && distanceTier >= 4 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          const type = allowed.includes('wraith') || isFreeFlight ? 'wraith' : 'mantis';
          enemies.push(new Enemy(entryX + (i - 0.5) * 60, -60 - i * 45, type, speedMult * 1.15, hpMult * 1.05, bulletMult, 'chase_hunter'));
        }

        this.warpBeacons.push({
          x: entryX,
          y: 45,
          radius: 44,
          color: '#ef4444',
          life: 24,
          maxLife: 24
        });
        break;
      }

      case 'cobra_zigzag_strike': {
        // Agile Evasive Viper Strikers: Sharp 45-degree diagonal slashes dodging player fire
        const entryX = Math.random() * (width - 200) + 100;
        const count = 3;
        for (let i = 0; i < count; i++) {
          const type = allowed.includes('cobra') || isFreeFlight ? 'cobra' : 'wasp';
          enemies.push(new Enemy(entryX + (i - 1) * 65, -50 - i * 35, type, speedMult * 1.18, hpMult, bulletMult, 'evasive_zigzag'));
        }

        this.warpBeacons.push({
          x: entryX,
          y: 40,
          radius: 38,
          color: '#10b981',
          life: 22,
          maxLife: 22
        });
        break;
      }

      case 'echelon_line':
      default: {
        // Horizontal sweeping line
        const count = this.level.id <= 2 ? 3 : 4;
        const spacing = Math.min(85, (width - 140) / count);
        const start = (width - spacing * (count - 1)) / 2;
        const type = allowed.includes('scarab') && Math.random() < 0.5 ? 'scarab' : 'wasp';

        for (let i = 0; i < count; i++) {
          enemies.push(new Enemy(start + i * spacing, -50 - i * 22, type, speedMult, hpMult, bulletMult, 'zigzag'));
        }
        break;
      }
    }

    return enemies;
  }

  /**
   * Draws telegraphed hyperspace warp portals on canvas before enemy units arrive.
   */
  public drawBeacons(ctx: CanvasRenderingContext2D) {
    if (this.warpBeacons.length === 0) return;

    ctx.save();
    for (const b of this.warpBeacons) {
      const progress = b.life / b.maxLife; // 1 -> 0
      const currentRadius = b.radius * (1.6 - progress * 0.6);
      const alpha = Math.sin(progress * Math.PI) * 0.85;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 15;
      ctx.shadowColor = b.color;

      // Concentric targeting rings
      ctx.beginPath();
      ctx.arc(b.x, b.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(b.x, b.y, currentRadius * 0.45, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair targeting reticle lines
      const arm = currentRadius * 0.7;
      ctx.beginPath();
      ctx.moveTo(b.x - arm, b.y);
      ctx.lineTo(b.x + arm, b.y);
      ctx.moveTo(b.x, b.y - arm);
      ctx.lineTo(b.x, b.y + arm);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }
}
