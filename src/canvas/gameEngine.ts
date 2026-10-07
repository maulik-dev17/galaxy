import { LevelConfig, PlayerStats, PowerUpType, calculateDynamicDifficulty, DynamicDifficultyState, BossConfig } from '../types';
import { sound } from '../audio';
import { haptics } from '../haptics';
import { LEVELS } from '../levels';
import { getStoredProfile, saveProfile } from '../profileStore';
import {
  Player,
  Projectile,
  HomingMissile,
  EnemyBullet,
  Enemy,
  Boss,
  PowerUp,
  Particle,
  ParticleSystem,
  FloatingText,
  Star,
  ParallaxStarfield
} from './entities';
import { EnemySpawner } from './spawner';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number) => void;
  onShieldsUpdate: (shields: number) => void;
  onHealthUpdate?: (health: number, maxHealth: number) => void;
  onBombsUpdate: (bombs: number) => void;
  onLevelProgressUpdate: (kills: number, targetKills: number, dynamicDifficulty?: DynamicDifficultyState) => void;
  onBossSpawn: (boss: Boss | null) => void;
  onBossHpUpdate: (hp: number, maxHp: number) => void;
  onStatsUpdate: (stats: Partial<PlayerStats>) => void;
  onLevelClear: (score: number, stars: number) => void;
  onGameOver: (score: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;
  public level: LevelConfig;

  // Canvas dimensions in CSS logical pixels
  public width: number = window.innerWidth;
  public height: number = window.innerHeight;

  // Entities
  public player: Player;
  public spawner: EnemySpawner;
  public projectiles: Projectile[] = [];
  public missiles: HomingMissile[] = [];
  public enemyBullets: EnemyBullet[] = [];
  public enemies: Enemy[] = [];
  public boss: Boss | null = null;
  public powerUps: PowerUp[] = [];
  public particles: Particle[] = [];
  public particleSystem: ParticleSystem = new ParticleSystem();
  public floatingTexts: FloatingText[] = [];
  public stars: Star[] = [];
  public starfield: ParallaxStarfield;

  // State
  public isRunning: boolean = false;
  private animId: number = 0;
  private frameCount: number = 0;
  public shake: number = 0;
  public redFlash: number = 0;
  public whiteFlash: number = 0;

  // Player gameplay stats
  public stats: PlayerStats = {
    score: 0,
    highScore: 0,
    health: 100,
    maxHealth: 100,
    shields: 100,
    maxShields: 100,
    isShieldRecharging: false,
    bombs: 2,
    spreadLevel: 1, // 1 to 4
    specialTimer: 0, // frames remaining of the 3-second swarm missile power-up (0 = inactive)
    specialMaxTimer: 180, // 3 seconds baseline
    overdriveTimer: 0,
    barrierTimer: 0,
    combo: 0,
    comboTimer: 0,
    killsInLevel: 0,
    lives: 3,
    maxLives: 3,
    distanceFlown: 0
  };

  private shieldRegenCooldown: number = 0;
  private bossSpawned: boolean = false;
  private levelClearing: boolean = false;
  private lastThreatStage: string = 'NORMAL';
  private keys: Record<string, boolean> = {};
  public isFiring: boolean = false;
  private fireCooldown: number = 0;
  private freeFlightMilestoneReached: number = 0;
  private freeFlightTierReached: number = 0;

  constructor(
    canvas: HTMLCanvasElement, 
    level: LevelConfig, 
    callbacks: GameEngineCallbacks,
    initialStats?: Partial<PlayerStats>,
    shipConfig?: { id?: string; color?: string; accent?: string }
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D context not supported');
    this.ctx = context;
    this.level = level;
    this.callbacks = callbacks;
    this.spawner = new EnemySpawner(level);

    if (initialStats) {
      this.stats = { ...this.stats, ...initialStats };
    }

    const w = canvas.clientWidth || window.innerWidth || 800;
    const h = canvas.clientHeight || window.innerHeight || 600;
    this.width = w;
    this.height = h;

    this.player = new Player(w / 2, h - 120, shipConfig);
    this.player.health = this.stats.health;
    this.player.maxHealth = this.stats.maxHealth;
    this.player.shields = this.stats.shields;
    this.player.maxShields = this.stats.maxShields;

    this.starfield = new ParallaxStarfield(this.width, this.height, this.level.boss.accentColor);
    this.stars = this.starfield.stars;
  }

  private initStars() {
    if (!this.starfield) {
      this.starfield = new ParallaxStarfield(this.width, this.height, this.level.boss.accentColor);
    } else {
      this.starfield.init();
    }
    this.stars = this.starfield.stars;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.starfield.resize(width, height);
    this.stars = this.starfield.stars;

    // Ensure player is kept in view at the lower section
    if (this.player) {
      if (this.player.y < 50 || this.player.y > height + 50) {
        this.player.x = width / 2;
        this.player.y = height - 120;
        this.player.targetX = width / 2;
        this.player.targetY = height - 120;
      }
    }
  }

  public setPointer(x: number, y: number) {
    const clampedX = Math.max(this.player.radius, Math.min(this.width - this.player.radius, x));
    const clampedY = Math.max(this.player.radius, Math.min(this.height - this.player.radius, y));
    this.player.targetX = clampedX;
    this.player.targetY = clampedY;
  }

  public setKey(key: string, isDown: boolean) {
    this.keys[key.toLowerCase()] = isDown;
  }

  public setFiring(firing: boolean) {
    this.isFiring = firing;
  }

  public firePrimary() {
    if (!this.isRunning || this.stats.shields <= 0) return;
    const isOverdrive = this.stats.overdriveTimer > 0;
    const fireInterval = isOverdrive ? 4 : 7;
    sound.playPlayerShoot();
    haptics.laser();
    const pDmg = isOverdrive ? 30 : 20;

    // Spread configurations aligned with sleek fighter wingtip cannons
    if (this.stats.spreadLevel === 1) {
      this.projectiles.push(new Projectile(this.player.x - 26, this.player.y + 6, 0, 24, pDmg));
      this.projectiles.push(new Projectile(this.player.x + 26, this.player.y + 6, 0, 24, pDmg));
    } else if (this.stats.spreadLevel === 2) {
      this.projectiles.push(new Projectile(this.player.x - 28, this.player.y + 6, -6, 24, pDmg));
      this.projectiles.push(new Projectile(this.player.x - 10, this.player.y - 2, 0, 25, pDmg));
      this.projectiles.push(new Projectile(this.player.x + 10, this.player.y - 2, 0, 25, pDmg));
      this.projectiles.push(new Projectile(this.player.x + 28, this.player.y + 6, 6, 24, pDmg));
    } else {
      // Spread Level 3+
      this.projectiles.push(new Projectile(this.player.x - 30, this.player.y + 8, -12, 24, pDmg));
      this.projectiles.push(new Projectile(this.player.x - 14, this.player.y, -4, 25, pDmg));
      this.projectiles.push(new Projectile(this.player.x, this.player.y - 22, 0, 26, pDmg * 1.2));
      this.projectiles.push(new Projectile(this.player.x + 14, this.player.y, 4, 25, pDmg));
      this.projectiles.push(new Projectile(this.player.x + 30, this.player.y + 8, 12, 24, pDmg));
    }

    // Muzzle sparks at cannon ports
    this.particleSystem.emitImpactSparks(this.player.x - 26, this.player.y + 4, '#00ffff', -Math.PI / 2);
    this.particleSystem.emitImpactSparks(this.player.x + 26, this.player.y + 4, '#00ffff', -Math.PI / 2);

    this.fireCooldown = fireInterval;
  }

  public triggerPlayerShoot() {
    if (!this.isRunning || this.stats.shields <= 0) return;
    if (this.fireCooldown <= 2) {
      this.firePrimary();
    }
  }

  public triggerBomb() {
    if (this.stats.bombs <= 0 || !this.isRunning) return;
    this.stats.bombs--;
    this.callbacks.onBombsUpdate(this.stats.bombs);

    sound.playBomb();
    this.shake = 35;
    this.whiteFlash = 12;

    // Colossal EMP Shockwave and electrical storm
    this.particleSystem.emitEmpBurst(this.player.x, this.player.y);

    // Clear all enemy bullets into sparkling ion bursts
    for (const b of this.enemyBullets) {
      this.particleSystem.emitImpactSparks(b.x, b.y, '#00ffff');
    }
    this.enemyBullets = [];

    // Damage all standard enemies heavily with sparks
    for (const e of this.enemies) {
      e.hp -= 250;
      this.particleSystem.emitImpactSparks(e.x, e.y, '#ff0055');
    }

    // Damage boss if active
    if (this.boss) {
      if (this.boss.hasKineticBarrier) {
        this.boss.hasKineticBarrier = false;
        this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y - 60, 'BARRIER SHATTERED!', '#00ffff'));
      }
      this.boss.hp -= 350;
      this.boss.hitFlash = 10;
      this.particleSystem.emitImpactSparks(this.boss.x, this.boss.y, '#00ffff');
      this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y - 40, '-350 EMP NUKE', '#00ffff'));
      this.callbacks.onBossHpUpdate(Math.max(0, this.boss.hp), this.boss.maxHp);
    }

    this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 60, 'EMP DETONATED!', '#ffffff'));
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    cancelAnimationFrame(this.animId);
    this.animId = requestAnimationFrame(this.loop);
  }

  public resume() {
    if (this.isRunning) return;
    this.isRunning = true;
    cancelAnimationFrame(this.animId);
    this.animId = requestAnimationFrame(this.loop);
  }

  public pause() {
    this.isRunning = false;
    cancelAnimationFrame(this.animId);
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animId);
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.update();
    this.render();
    this.animId = requestAnimationFrame(this.loop);
  };

  private update() {
    const width = this.width;
    const height = this.height;
    this.frameCount++;

    // Keyboard controls support
    const moveSpeed = 9;
    if (this.keys['w'] || this.keys['arrowup']) this.player.targetY -= moveSpeed;
    if (this.keys['s'] || this.keys['arrowdown']) this.player.targetY += moveSpeed;
    if (this.keys['a'] || this.keys['arrowleft']) this.player.targetX -= moveSpeed;
    if (this.keys['d'] || this.keys['arrowright']) this.player.targetX += moveSpeed;
    if (this.keys['b']) {
      this.triggerBomb();
      this.keys['b'] = false;
    }

    // Clamp target within screen boundaries
    this.player.targetX = Math.max(this.player.radius, Math.min(width - this.player.radius, this.player.targetX));
    this.player.targetY = Math.max(this.player.radius, Math.min(height - this.player.radius, this.player.targetY));

    // Update Player
    this.player.update(width, height);

    // Overdrive countdown
    const isOverdrive = this.stats.overdriveTimer > 0;
    if (isOverdrive) {
      this.stats.overdriveTimer--;
      if (this.stats.overdriveTimer === 0) {
        this.callbacks.onStatsUpdate({ overdriveTimer: 0 });
      }
    }

    // Energy Deflector Barrier countdown
    const isBarrier = this.stats.barrierTimer > 0;
    if (isBarrier) {
      this.stats.barrierTimer--;
      if (this.stats.barrierTimer === 0) {
        sound.playPowerupExpire();
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 35, 'BARRIER EXPIRED', '#94a3b8'));
        this.callbacks.onStatsUpdate({ barrierTimer: 0 });
      }
    }

    // Passive Energy Shield Regeneration System
    if (this.stats.health > 0 && this.stats.shields < this.stats.maxShields) {
      if (this.shieldRegenCooldown > 0) {
        this.shieldRegenCooldown--;
        if (this.stats.isShieldRecharging) {
          this.stats.isShieldRecharging = false;
          this.callbacks.onStatsUpdate({ isShieldRecharging: false });
        }
      } else {
        // Regenerate shields gradually (+0.25 pt/frame ~ 15 pt/sec)
        const oldShields = this.stats.shields;
        this.stats.shields = Math.min(this.stats.maxShields, this.stats.shields + 0.25);
        this.player.shields = this.stats.shields;
        this.stats.isShieldRecharging = true;

        if (Math.floor(this.stats.shields) !== Math.floor(oldShields)) {
          this.callbacks.onShieldsUpdate(Math.round(this.stats.shields));
          this.callbacks.onStatsUpdate({
            shields: Math.round(this.stats.shields),
            isShieldRecharging: true
          });
        }
      }
    } else {
      if (this.stats.isShieldRecharging) {
        this.stats.isShieldRecharging = false;
        this.callbacks.onStatsUpdate({ isShieldRecharging: false });
      }
    }

    // Periodic critical low shield warning beep
    if (this.stats.health > 0 && this.stats.shields > 0 && this.stats.shields <= 25 && this.frameCount % 90 === 0) {
      sound.playLowShieldBeep();
    }

    // Low hull integrity alarm (< 35% health)
    if (this.stats.health > 0 && this.stats.health <= 35 && this.frameCount % 60 === 0) {
      sound.playLowShieldBeep();
      this.redFlash = 6;
    }

    // Emit Realistic Engine Afterburners for Player Ship
    this.particleSystem.emitPlayerThruster(
      this.player.x,
      this.player.y,
      this.player.vx,
      this.player.vy,
      isOverdrive
    );

    // Special Swarm Missile Power-Up Timer Countdown (Active for exactly 3s / 180 frames per collection)
    if (this.stats.specialTimer > 0) {
      this.stats.specialTimer--;
      if (this.stats.specialTimer === 0) {
        sound.playPowerupExpire();
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 35, 'MISSILES EXPIRED', '#94a3b8'));
        this.callbacks.onStatsUpdate({
          specialTimer: 0,
          specialMaxTimer: 180
        });
      } else if (this.frameCount % 10 === 0) {
        this.callbacks.onStatsUpdate({
          specialTimer: this.stats.specialTimer,
          specialMaxTimer: this.stats.specialMaxTimer
        });
      }
    }

    // Swarm Missile Salvo Launching (Fires rapid dual homing missiles while power-up is active)
    if (this.stats.specialTimer > 0) {
      const missileInterval = isOverdrive ? 8 : 12;
      if (this.frameCount % missileInterval === 0) {
        sound.playMissileLaunch();
        // Dual wing launcher pods
        this.missiles.push(new HomingMissile(this.player.x - 26, this.player.y + 6, -20));
        this.missiles.push(new HomingMissile(this.player.x + 26, this.player.y + 6, 20));
      }
    }

    // Combo decay
    if (this.stats.comboTimer > 0) {
      this.stats.comboTimer--;
      if (this.stats.comboTimer === 0) {
        this.stats.combo = 0;
        this.callbacks.onStatsUpdate({ combo: 0 });
      }
    }

    // Player Primary Shooting (Triggered by Spacebar or Mouse click / hold)
    const wantsToFire = this.isRunning && this.stats.health > 0;
    if (wantsToFire) {
      if (this.fireCooldown <= 0) {
        this.firePrimary();
      } else {
        this.fireCooldown--;
      }
    } else {
      if (this.fireCooldown > 0) {
        this.fireCooldown--;
      }
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update();
      if (p.y < -40 || p.x < -40 || p.x > width + 40) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update Homing Swarm Missiles
    const lockTargets: { x: number; y: number; hp?: number }[] = [...this.enemies];
    if (this.boss) {
      lockTargets.push(this.boss);
    }

    for (let m = this.missiles.length - 1; m >= 0; m--) {
      const missile = this.missiles[m];
      missile.update(lockTargets);
      this.particleSystem.emitMissileExhaust(missile.x, missile.y, missile.angle);

      let hit = false;
      // Enemy missile collision
      for (let e = this.enemies.length - 1; e >= 0; e--) {
        const enemy = this.enemies[e];
        const dist = Math.hypot(missile.x - enemy.x, missile.y - enemy.y);
        if (dist < enemy.radius + missile.radius + 3) {
          enemy.hp -= missile.damage;
          enemy.hitFlash = 4;
          this.particleSystem.emitImpactSparks(missile.x, missile.y, '#f97316', missile.angle);
          sound.playExplosion('small');
          hit = true;
          break;
        }
      }

      // Boss missile collision
      if (!hit && this.boss) {
        const dist = Math.hypot(missile.x - this.boss.x, missile.y - this.boss.y);
        if (dist < this.boss.radius + missile.radius + 5) {
          if (this.boss.hasKineticBarrier) {
            sound.playShieldHit();
            this.particleSystem.emitImpactSparks(missile.x, missile.y, '#00f0ff', missile.angle);
            hit = true;
          } else {
            this.boss.hp -= missile.damage;
            this.boss.hitFlash = 4;
            this.particleSystem.emitImpactSparks(missile.x, missile.y, '#f97316', missile.angle);
            this.callbacks.onBossHpUpdate(Math.max(0, this.boss.hp), this.boss.maxHp);
            sound.playExplosion('small');
            hit = true;
          }
        }
      }

      if (hit || missile.life >= missile.maxLife || missile.y < -50 || missile.y > height + 50 || missile.x < -50 || missile.x > width + 50) {
        this.missiles.splice(m, 1);
      }
    }

    // Continuous Real-Time Distance Traveled Tracking (both Campaign & Free Flight)
    this.stats.distanceFlown = Math.floor(this.frameCount * 0.9);

    if (this.frameCount % 10 === 0) {
      this.callbacks.onStatsUpdate({ 
        distanceFlown: this.stats.distanceFlown,
        lives: this.stats.lives,
        isFreeFlight: this.stats.isFreeFlight 
      });
    }

    // Free Flight (Subway Surfers endless mode) Incursions & Milestones
    if (this.stats.isFreeFlight || this.level.id === 99) {
      this.stats.isFreeFlight = true;

      // Every 100m: Difficulty escalates with notification and telemetry
      const distanceTier = Math.floor(this.stats.distanceFlown / 100);
      if (distanceTier > this.freeFlightTierReached && this.stats.distanceFlown >= 100) {
        this.freeFlightTierReached = distanceTier;
        sound.playCargoAlert();
        this.shake = Math.min(18, 6 + distanceTier * 0.6);
        this.floatingTexts.push(
          new FloatingText(
            this.width / 2,
            160,
            `⚡ THREAT SURGE [${distanceTier * 100}M]: TIER ${distanceTier} (+${distanceTier * 5}% SPEED & HP)`,
            '#f59e0b'
          )
        );
      }

      // Milestone Incursion Boss spawns every 600 meters!
      const milestoneTarget = Math.floor(this.stats.distanceFlown / 600);
      if (milestoneTarget > this.freeFlightMilestoneReached && !this.boss && !this.bossSpawned) {
        this.freeFlightMilestoneReached = milestoneTarget;
        this.spawnFreeFlightMilestoneBoss();
      }
    } else if (!this.bossSpawned) {
      if (this.stats.killsInLevel >= this.level.targetKills && this.enemies.length === 0) {
        this.spawnBoss();
      }
    }

    // Periodically creates moving targets across the canvas with player tracking
    const newTargets = this.spawner.update(
      width,
      height,
      this.stats.killsInLevel,
      this.level.targetKills,
      this.boss !== null,
      this.enemies.length,
      this.player.x,
      this.player.y,
      this.stats.distanceFlown || 0
    );
    if (newTargets.length > 0) {
      this.enemies.push(...newTargets);
    }

    // Update Regular Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(this.player.x, this.player.y, width, height);

      // Emit alien craft engine propulsion plumes
      this.particleSystem.emitEnemyThruster(
        enemy.x,
        enemy.y,
        enemy.radius,
        enemy.type,
        this.level.enemySpeedMultiplier
      );

      // Telegraphed enemy combat firing with distance tier scaling
      if (enemy.y > 40 && enemy.y < height - 160 && enemy.type !== 'asteroid' && !enemy.isCargo) {
        const isFreeFlight = this.stats.isFreeFlight || this.level.id === 99;
        const distanceTier = isFreeFlight ? Math.floor((this.stats.distanceFlown || 0) / 100) : 0;
        const tierBulletBoost = isFreeFlight ? 1 + Math.min(1.0, distanceTier * 0.04) : 1;

        if (enemy.fireTelegraph > 0) {
          if (enemy.fireTelegraph === 1) {
            // Weapon discharges after charging
            sound.playEnemyShoot();
            const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            const dyn = this.spawner.currentDynamicDifficulty || calculateDynamicDifficulty(this.level, this.stats.killsInLevel, this.boss !== null, this.boss?.currentPhase || 1);
            const effectiveLevelId = isFreeFlight ? 3 : this.level.id;
            const speed = (4.0 + Math.min(2.5, effectiveLevelId * 0.25)) * this.level.bulletSpeedMultiplier * dyn.bulletSpeedMultiplier * tierBulletBoost;

            if (enemy.type === 'scarab') {
              // Corsair Gunship: Twin heavy plasma rounds
              this.enemyBullets.push(
                new EnemyBullet(enemy.x - 10, enemy.y + 12, Math.cos(angle) * speed, Math.sin(angle) * speed, '#f43f5e', 5.5)
              );
              this.enemyBullets.push(
                new EnemyBullet(enemy.x + 10, enemy.y + 12, Math.cos(angle) * speed, Math.sin(angle) * speed, '#f43f5e', 5.5)
              );
            } else if (enemy.type === 'interceptor') {
              // Heavy Destroyer: 3-way aimed plasma fan
              for (const offset of [-0.22, 0, 0.22]) {
                const a = angle + offset;
                this.enemyBullets.push(
                  new EnemyBullet(enemy.x, enemy.y + 16, Math.cos(a) * speed, Math.sin(a) * speed, '#f59e0b', 6.0)
                );
              }
            } else if (enemy.type === 'phantom') {
              // Phantom Infiltrator: Twin high-velocity violet rail bolts
              this.enemyBullets.push(
                new EnemyBullet(enemy.x - 8, enemy.y + 10, Math.cos(angle) * speed * 1.15, Math.sin(angle) * speed * 1.15, '#c084fc', 4.5)
              );
              this.enemyBullets.push(
                new EnemyBullet(enemy.x + 8, enemy.y + 10, Math.cos(angle) * speed * 1.15, Math.sin(angle) * speed * 1.15, '#c084fc', 4.5)
              );
            } else if (enemy.type === 'wraith') {
              // Wraith Hunter: Direct pursuit crimson plasma burst
              this.enemyBullets.push(
                new EnemyBullet(enemy.x, enemy.y + 12, Math.cos(angle) * speed * 1.1, Math.sin(angle) * speed * 1.1, '#ef4444', 5.2)
              );
            } else if (enemy.type === 'cobra') {
              // Cobra Viper: Rapid-fire jade beam bolt
              this.enemyBullets.push(
                new EnemyBullet(enemy.x, enemy.y + 10, Math.cos(angle) * speed * 1.25, Math.sin(angle) * speed * 1.25, '#10b981', 4.2)
              );
            } else {
              // Viper Scout or Mantis: Precision aimed plasma bolt
              this.enemyBullets.push(
                new EnemyBullet(enemy.x, enemy.y + 10, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ff0055', 4.8)
              );
            }
          }
        } else {
          const fireRate = this.level.enemyFireRate * (isFreeFlight ? (1 + Math.min(1.5, distanceTier * 0.05)) : 1);
          if (Math.random() < fireRate) {
            // Charge weapon telegraph
            enemy.fireTelegraph = 16;
          }
        }
      }

      // Check evasive reaction for agile fighters against incoming player fire
      if (enemy.type === 'wasp' || enemy.type === 'mantis' || enemy.type === 'cobra' || enemy.type === 'phantom') {
        for (const p of this.projectiles) {
          if (p.y > enemy.y && Math.hypot(p.x - enemy.x, p.y - enemy.y) < 55) {
            enemy.tryEvade(p.x);
            break;
          }
        }
      }

      // Check collision between Player Projectiles and Enemy Ships
      for (let j = this.projectiles.length - 1; j >= 0; j--) {
        const p = this.projectiles[j];
        const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (dist < enemy.radius + p.radius) {
          // Remove the projectile
          this.projectiles.splice(j, 1);
          this.particleSystem.emitImpactSparks(p.x, p.y, enemy.color, Math.PI / 2);

          // Remove the enemy ship on projectile impact
          enemy.hp = 0;
          break;
        }
      }

      // Check collision with Player body (ramming)
      if (this.player.invulnerableTime <= 0 && this.stats.health > 0) {
        const distToPlayer = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
        if (distToPlayer < enemy.radius + this.player.radius - 6) {
          enemy.hp = 0;
          const ramDmg = enemy.type === 'interceptor' ? 45 : enemy.type === 'asteroid' ? 40 : enemy.type === 'scarab' ? 35 : 25;
          this.damagePlayer(ramDmg, true);
        }
      }

      // Enemy Death
      if (enemy.hp <= 0) {
        sound.playExplosion(enemy.type === 'interceptor' || enemy.type === 'mantis' ? 'medium' : 'small');
        this.createEnemyExplosion(enemy);
        this.onEnemyKilled(enemy);
        this.enemies.splice(i, 1);
        continue;
      }

      // Off-screen cleanup
      if (enemy.y > height + 80) {
        this.enemies.splice(i, 1);
      }
    }

    // Boss Logic
    if (this.boss) {
      const updateResult = this.boss.update(width, this.player.x);

      // Automated phase transition and special ability telemetry
      if (updateResult.phaseChanged) {
        sound.playBossWarning();
        this.shake = 30;
        this.particleSystem.emitEmpBurst(this.boss.x, this.boss.y);
        this.floatingTexts.push(
          new FloatingText(
            this.boss.x,
            this.boss.y - 50,
            updateResult.phaseText || `PHASE ${updateResult.phaseChanged}!`,
            '#ff0055'
          )
        );
        if (updateResult.spawnDrones) {
          this.enemies.push(
            new Enemy(this.boss.x - 75, this.boss.y, 'wasp', this.level.enemySpeedMultiplier, 1, 1, 'sine')
          );
          this.enemies.push(
            new Enemy(this.boss.x + 75, this.boss.y, 'wasp', this.level.enemySpeedMultiplier, 1, 1, 'sine')
          );
        }
      }

      // Emit massive warship propulsion plumes and reactor vent motes
      this.particleSystem.emitBossThrusters(
        this.boss.x,
        this.boss.y,
        this.boss.radius,
        this.boss.accentColor,
        this.boss.currentPhase
      );

      // Boss Weapon Attacks
      this.boss.attackCooldown--;
      if (this.boss.attackCooldown <= 0) {
        this.executeBossAttack();
        this.boss.attackCooldown = Math.max(26, 75 - this.boss.currentPhase * 14);
      }

      // Boss vs Projectiles
      for (let j = this.projectiles.length - 1; j >= 0; j--) {
        const p = this.projectiles[j];
        const dist = Math.hypot(p.x - this.boss.x, p.y - this.boss.y);
        if (dist < this.boss.radius + p.radius) {
          this.projectiles.splice(j, 1);
          if (this.boss.hasKineticBarrier) {
            sound.playShieldHit();
            this.particleSystem.emitImpactSparks(p.x, p.y, '#00f0ff', Math.PI / 2);
            this.floatingTexts.push(new FloatingText(p.x, p.y - 15, 'SHIELDED', '#00f0ff'));
            break;
          }
          this.boss.hp -= p.damage;
          this.boss.hitFlash = 4;
          this.particleSystem.emitImpactSparks(p.x, p.y, this.boss.accentColor, Math.PI / 2);
          this.callbacks.onBossHpUpdate(Math.max(0, this.boss.hp), this.boss.maxHp);
          this.stats.score += 50;
          this.callbacks.onScoreUpdate(this.stats.score);
          break;
        }
      }

      // Boss Defeat
      if (this.boss.hp <= 0 && !this.levelClearing) {
        this.onBossDefeated();
      }
    }

    // Update Enemy Bullets
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.update();

      // Check collision with Player
      if (this.player.invulnerableTime <= 0 && this.stats.health > 0) {
        const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (dist < b.radius + this.player.radius - 4) {
          this.enemyBullets.splice(i, 1);
          const bulletDmg = Math.round(15 * (this.level.id >= 6 ? 1.25 : 1.0));
          this.damagePlayer(bulletDmg, false);
          continue;
        }
      }

      // Off-screen cleanup
      if (b.y > height + 40 || b.y < -40 || b.x < -40 || b.x > width + 40) {
        this.enemyBullets.splice(i, 1);
      }
    }

    // Update PowerUps with magnetic attraction & collection detection
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.update(this.player.x, this.player.y, this.stats.overdriveTimer > 0);

      const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dist < p.radius + this.player.radius + 15) {
        this.collectPowerUp(p.type);
        this.particleSystem.emitImpactSparks(p.x, p.y, '#00ffff', -Math.PI / 2);
        this.powerUps.splice(i, 1);
        continue;
      }

      if (p.y > height + 60 || p.y < -80 || p.x < -80 || p.x > width + 80) {
        this.powerUps.splice(i, 1);
      }
    }

    // Update Particles
    this.particleSystem.update();

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.update();
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update Multi-Layer Parallax Starfield (reacts to warp boost and player lateral velocity)
    const warpSpeed = this.levelClearing ? 4.5 : isOverdrive ? 2.0 : 1.0;
    this.starfield.update(warpSpeed, this.player.vx);

    // Screen Shake decay
    if (this.shake > 0) this.shake *= 0.9;
    if (this.shake < 0.4) this.shake = 0;

    // Flash decay
    if (this.redFlash > 0) this.redFlash--;
    if (this.whiteFlash > 0) this.whiteFlash--;
  }

  private render() {
    const width = this.width;
    const height = this.height;
    const ctx = this.ctx;

    // Deep Space Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, this.level.bgGradient[0]);
    bgGrad.addColorStop(1, this.level.bgGradient[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Nebula Glow
    const nebulaGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.35,
      20,
      width * 0.5,
      height * 0.35,
      width * 0.7
    );
    nebulaGrad.addColorStop(0, this.level.nebulaColor);
    nebulaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, width, height);

    // Apply Screen Shake
    ctx.save();
    if (this.shake > 0) {
      const dx = (Math.random() - 0.5) * this.shake;
      const dy = (Math.random() - 0.5) * this.shake;
      ctx.translate(dx, dy);
    }

    // Draw Multi-Layer Parallax Starfield & Deep Space Motes
    const warpSpeed = this.levelClearing ? 4.5 : this.stats.overdriveTimer > 0 ? 2.0 : 1.0;
    this.starfield.draw(ctx, warpSpeed);

    // Draw Incursion Warp Targeting Portals
    this.spawner.drawBeacons(ctx);

    // Draw Power-ups
    this.powerUps.forEach((p) => p.draw(ctx));

    // Draw Enemies
    this.enemies.forEach((e) => e.draw(ctx));

    // Draw Boss
    if (this.boss) {
      this.boss.draw(ctx);
    }

    // Draw Player Projectiles
    this.projectiles.forEach((p) => p.draw(ctx));

    // Draw Player Homing Swarm Missiles
    this.missiles.forEach((m) => m.draw(ctx));

    // Draw Enemy Bullets
    this.enemyBullets.forEach((b) => b.draw(ctx));

    // Draw Player Ship
    const isOverdrive = this.stats.overdriveTimer > 0;
    const isBarrier = this.stats.barrierTimer > 0;
    this.player.draw(ctx, isOverdrive, isBarrier);

    // Draw Energy Barrier Reticle when Deflector is Active
    if (isBarrier) {
      ctx.save();
      const bSec = (this.stats.barrierTimer / 60).toFixed(1);
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 42, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🛡️ BARRIER ${bSec}s`, this.player.x, this.player.y - 38);
      ctx.restore();
    }

    // Draw Holographic Tactical Missile Status Reticle on Ship when Active
    if (this.stats.specialTimer > 0) {
      ctx.save();
      const fraction = this.stats.specialTimer / this.stats.specialMaxTimer;
      const isLow = fraction < 0.25;
      const reticleColor = isLow ? (Math.floor(this.frameCount / 6) % 2 === 0 ? '#ef4444' : '#f59e0b') : '#f97316';

      ctx.shadowBlur = 12;
      ctx.shadowColor = reticleColor;
      ctx.strokeStyle = reticleColor;
      ctx.lineWidth = 2.5;

      // Arc gauge orbiting around the sleek starfighter
      const arcRadius = 36;
      ctx.beginPath();
      ctx.arc(
        this.player.x,
        this.player.y + 2,
        arcRadius,
        Math.PI * 0.5 - Math.PI * fraction,
        Math.PI * 0.5 + Math.PI * fraction
      );
      ctx.stroke();

      // Countdown duration indicator below ship
      ctx.fillStyle = reticleColor;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const secondsLeft = (this.stats.specialTimer / 60).toFixed(1);
      ctx.fillText(`🚀 ${secondsLeft}s`, this.player.x, this.player.y + arcRadius + 14);
      ctx.restore();
    }

    // Draw Particles (Volumetric smoke + additive glowing fire/shockwaves/sparks/thrusters)
    this.particleSystem.draw(ctx);

    // Draw Floating Combat Texts
    this.floatingTexts.forEach((ft) => ft.draw(ctx));

    ctx.restore(); // Restore shake

    // Real-Time Heads-Up Display (HUD) directly on canvas
    this.renderCanvasHUD(ctx);

    // Red Damage Vignette
    if (this.redFlash > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${Math.min(0.5, this.redFlash / 15)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // White Screen Flash (Nuke / Boss Defeat)
    if (this.whiteFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.85, this.whiteFlash / 12)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  /**
   * Renders a real-time, military sci-fi Heads-Up Display (HUD) directly on the 2D canvas,
   * showing live score telemetry and the player's remaining special Swarm Missile duration.
   */
  private renderCanvasHUD(ctx: CanvasRenderingContext2D) {
    const width = this.width;
    const isMissilesActive = this.stats.specialTimer > 0;
    const durationFraction = this.stats.specialMaxTimer > 0
      ? Math.max(0, Math.min(1, this.stats.specialTimer / this.stats.specialMaxTimer))
      : 0;
    const secondsRemaining = (this.stats.specialTimer / 60).toFixed(1);

    ctx.save();

    // Responsive sizing and position
    const isMobile = width < 680;
    const hudW = isMobile ? Math.min(width - 24, 380) : Math.min(width * 0.52, 540);
    const hudH = isMobile ? 48 : 54;
    const hudX = (width - hudW) / 2;
    const hudY = isMobile ? 66 : 14;

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. TACTICAL HUD BACKDROP PANEL
    // ─────────────────────────────────────────────────────────────────────────────
    ctx.shadowBlur = isMissilesActive ? 18 : 10;
    ctx.shadowColor = isMissilesActive ? '#f97316' : 'rgba(15, 23, 42, 0.7)';
    ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
    ctx.strokeStyle = isMissilesActive ? 'rgba(249, 115, 22, 0.8)' : 'rgba(51, 65, 85, 0.75)';
    ctx.lineWidth = 1.5;

    // Chamfered sci-fi panel shape
    const chamfer = 10;
    ctx.beginPath();
    ctx.moveTo(hudX + chamfer, hudY);
    ctx.lineTo(hudX + hudW - chamfer, hudY);
    ctx.lineTo(hudX + hudW, hudY + chamfer);
    ctx.lineTo(hudX + hudW, hudY + hudH - chamfer);
    ctx.lineTo(hudX + hudW - chamfer, hudY + hudH);
    ctx.lineTo(hudX + chamfer, hudY + hudH);
    ctx.lineTo(hudX, hudY + hudH - chamfer);
    ctx.lineTo(hudX, hudY + chamfer);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Corner Neon Accent Brackets
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isMissilesActive ? '#f97316' : '#0ea5e9';
    ctx.lineWidth = 2;
    const bLen = 8;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(hudX, hudY + bLen);
    ctx.lineTo(hudX, hudY + chamfer);
    ctx.lineTo(hudX + chamfer, hudY);
    ctx.lineTo(hudX + bLen + chamfer, hudY);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(hudX + hudW - bLen - chamfer, hudY);
    ctx.lineTo(hudX + hudW - chamfer, hudY);
    ctx.lineTo(hudX + hudW, hudY + chamfer);
    ctx.lineTo(hudX + hudW, hudY + bLen);
    ctx.stroke();

    // Center Vertical Tech Divider
    const midX = hudX + (isMobile ? hudW * 0.42 : hudW * 0.45);
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX, hudY + 8);
    ctx.lineTo(midX, hudY + hudH - 8);
    ctx.stroke();

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. LEFT MODULE: REAL-TIME SCORE TELEMETRY
    // ─────────────────────────────────────────────────────────────────────────────
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Micro-header label
    ctx.fillStyle = '#94a3b8';
    ctx.font = isMobile ? 'bold 8px monospace' : 'bold 9px monospace';
    ctx.fillText('SCORE // REAL-TIME', hudX + 14, hudY + 8);

    // Active combo multiplier badge
    if (this.stats.combo > 1) {
      const comboMult = (1 + Math.min(5, Math.floor(this.stats.combo / 4) * 0.5)).toFixed(1);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`⚡ x${this.stats.combo} (${comboMult}x)`, hudX + (isMobile ? 88 : 124), hudY + 8);
    }

    // Live Score Digits (High-intensity neon yellow/gold)
    ctx.fillStyle = '#fde047';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#eab308';
    ctx.font = isMobile ? '900 17px monospace' : '900 20px monospace';
    ctx.fillText(this.stats.score.toLocaleString(), hudX + 14, hudY + (isMobile ? 22 : 24));
    ctx.shadowBlur = 0;

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. RIGHT MODULE: REMAINING SWARM MISSILE POWER-UP DURATION
    // ─────────────────────────────────────────────────────────────────────────────
    const energyX = midX + 14;
    const energyW = hudX + hudW - energyX - 14;

    const isCritical = isMissilesActive && this.stats.specialTimer < 50; // Under 0.8s
    const energyThemeColor = isMissilesActive
      ? isCritical
        ? (Math.floor(this.frameCount / 6) % 2 === 0 ? '#ef4444' : '#f59e0b')
        : '#f97316'
      : '#64748b';

    // Status Label
    ctx.fillStyle = energyThemeColor;
    ctx.font = isMobile ? 'bold 8px monospace' : 'bold 9px monospace';
    ctx.fillText(
      isMissilesActive
        ? isCritical
          ? '🚀 DEPLETING SOON'
          : '🚀 SWARM MISSILES'
        : '🚀 MISSILES: STANDBY',
      energyX,
      hudY + 8
    );

    // Duration Readout (Clear countdown timer)
    ctx.textAlign = 'right';
    ctx.font = isMobile ? 'bold 10px monospace' : 'bold 11px monospace';
    ctx.fillStyle = isMissilesActive ? (isCritical ? '#ef4444' : '#ffffff') : '#64748b';
    ctx.shadowBlur = isMissilesActive ? 8 : 0;
    ctx.shadowColor = energyThemeColor;
    const readoutText = isMissilesActive ? `${secondsRemaining}s ACTIVE` : 'STANDBY (0s)';
    ctx.fillText(readoutText, hudX + hudW - 14, hudY + 7);
    ctx.shadowBlur = 0;

    // Segmented Launcher Pod Cells (10 glowing cyber-tubes)
    const barY = hudY + (isMobile ? 24 : 26);
    const barH = isMobile ? 12 : 14;
    const totalSegments = 10;
    const segGap = 3;
    const segW = (energyW - (totalSegments - 1) * segGap) / totalSegments;
    const activeSegments = Math.ceil(durationFraction * totalSegments);

    for (let s = 0; s < totalSegments; s++) {
      const sx = energyX + s * (segW + segGap);
      const isFilled = s < activeSegments && isMissilesActive;

      if (isFilled) {
        // Energized rocket cell with luminous fiery gradient
        ctx.shadowBlur = isCritical ? 10 : 8;
        ctx.shadowColor = isCritical ? '#ef4444' : '#ea580c';

        const cellGrad = ctx.createLinearGradient(sx, barY, sx, barY + barH);
        if (isCritical) {
          cellGrad.addColorStop(0, '#fca5a5');
          cellGrad.addColorStop(0.5, '#ef4444');
          cellGrad.addColorStop(1, '#991b1b');
        } else {
          cellGrad.addColorStop(0, '#ffffff');
          cellGrad.addColorStop(0.3, '#fed7aa');
          cellGrad.addColorStop(0.7, '#f97316');
          cellGrad.addColorStop(1, '#c2410c');
        }
        ctx.fillStyle = cellGrad;
        ctx.fillRect(sx, barY, segW, barH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, barY, segW, barH);
      } else {
        // Empty / Standby launcher tube
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(sx, barY, segW, barH);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, barY, segW, barH);

        // Center dot
        ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
        ctx.fillRect(sx + segW * 0.5 - 1, barY + barH * 0.5 - 1, 2, 2);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. BOTTOM SUB-STRIP: DYNAMIC DIFFICULTY & SECTOR THREAT TELEMETRY
    // ─────────────────────────────────────────────────────────────────────────────
    const dynState = this.spawner.currentDynamicDifficulty;
    if (dynState) {
      const subY = hudY + hudH + 4;
      const subH = 15;
      const stageColor = dynState.threatStage === 'CRITICAL' 
        ? '#ef4444' 
        : dynState.threatStage === 'HIGH INTENSITY' 
        ? '#f97316' 
        : dynState.threatStage === 'ESCALATING'
        ? '#f59e0b'
        : '#06b6d4';

      ctx.fillStyle = 'rgba(7, 12, 24, 0.8)';
      ctx.strokeStyle = stageColor;
      ctx.lineWidth = 1;
      ctx.fillRect(hudX, subY, hudW, subH);
      ctx.strokeRect(hudX, subY, hudW, subH);

      ctx.font = isMobile ? 'bold 7.5px monospace' : 'bold 8.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = stageColor;
      ctx.fillText(`THREAT INTENSITY: ${dynState.threatPercent}% [${dynState.threatStage}]`, hudX + 8, subY + 3.5);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`⚡ SPAWN +${Math.round((dynState.spawnFrequencyMultiplier - 1) * 100)}% | BULLET +${Math.round((dynState.bulletSpeedMultiplier - 1) * 100)}%`, hudX + hudW - 8, subY + 3.5);
    }

    ctx.restore();
  }

  private spawnBoss() {
    this.bossSpawned = true;
    sound.playBossWarning();
    this.shake = 25;

    this.boss = new Boss(this.level.boss, this.canvas.width);

    this.callbacks.onBossSpawn(this.boss);
    this.callbacks.onBossHpUpdate(this.boss.hp, this.boss.maxHp);
    this.floatingTexts.push(
      new FloatingText(this.canvas.width / 2, 220, `WARNING: ${this.level.boss.name.toUpperCase()}`, '#ff0055')
    );
  }

  private spawnFreeFlightMilestoneBoss() {
    this.bossSpawned = true;
    sound.playBossWarning();
    this.shake = 30;

    const bossIndex = (this.freeFlightMilestoneReached - 1) % LEVELS.length;
    const baseBoss = LEVELS[bossIndex].boss;
    const hpBoost = 1 + (this.freeFlightMilestoneReached - 1) * 0.45;
    const milestoneConfig: BossConfig = {
      ...baseBoss,
      hp: Math.round(baseBoss.hp * hpBoost),
      name: `${baseBoss.name} [MK.${this.freeFlightMilestoneReached}]`,
      levelId: baseBoss.levelId || (bossIndex + 1)
    };

    this.boss = new Boss(milestoneConfig, this.canvas.width);
    this.callbacks.onBossSpawn(this.boss);
    this.callbacks.onBossHpUpdate(this.boss.hp, this.boss.maxHp);
    this.floatingTexts.push(
      new FloatingText(this.canvas.width / 2, 220, `⚠️ MILESTONE BOSS: ${milestoneConfig.name}`, '#ffea00')
    );
  }

  private executeBossAttack() {
    if (!this.boss) return;
    const dyn = calculateDynamicDifficulty(this.level, this.stats.killsInLevel, true, this.boss.currentPhase);
    const res = this.boss.generateAttack(
      this.player.x, 
      this.player.y, 
      this.level.bulletSpeedMultiplier * dyn.bulletSpeedMultiplier
    );
    if (res.bullets.length > 0) {
      this.enemyBullets.push(...res.bullets);
      if (res.soundType === 'heavy') sound.playExplosion('small');
      else sound.playEnemyShoot();
    }
  }

  private onEnemyKilled(enemy: Enemy) {
    this.stats.killsInLevel++;
    const dyn = calculateDynamicDifficulty(this.level, this.stats.killsInLevel, this.boss !== null, this.boss?.currentPhase || 1);
    this.callbacks.onLevelProgressUpdate(this.stats.killsInLevel, this.level.targetKills, dyn);

    // Detect dynamic difficulty threat stage escalation
    if (dyn.threatStage !== this.lastThreatStage && !this.boss) {
      this.lastThreatStage = dyn.threatStage;
      if (dyn.threatStage === 'ESCALATING') {
        sound.playCargoAlert();
        this.floatingTexts.push(
          new FloatingText(this.width / 2, 170, '⚡ SECTOR THREAT ESCALATING: +25% SPAWN / +15% SPEED', '#f59e0b')
        );
      } else if (dyn.threatStage === 'HIGH INTENSITY') {
        sound.playBossWarning();
        this.shake = 12;
        this.floatingTexts.push(
          new FloatingText(this.width / 2, 170, '🔥 HIGH INTENSITY: HOSTILE REINFORCEMENTS SURGING', '#f97316')
        );
      } else if (dyn.threatStage === 'CRITICAL') {
        sound.playBossWarning();
        this.shake = 18;
        this.floatingTexts.push(
          new FloatingText(this.width / 2, 170, '🚨 CRITICAL SECTOR SURGE: MAXIMUM BULLET VELOCITY', '#ef4444')
        );
      }
    }

    // Combo system
    this.stats.combo++;
    this.stats.comboTimer = 160; // ~2.6 seconds
    const comboMult = 1 + Math.min(5, Math.floor(this.stats.combo / 4) * 0.5);
    const addedScore = Math.floor(enemy.scoreValue * comboMult);
    this.stats.score += addedScore;
    this.callbacks.onScoreUpdate(this.stats.score);

    this.floatingTexts.push(
      new FloatingText(
        enemy.x,
        enemy.y,
        `+${addedScore}${this.stats.combo > 4 ? ` (x${comboMult.toFixed(1)})` : ''}`,
        this.stats.combo > 4 ? '#ffea00' : '#00ffff'
      )
    );

    // Power-up Drops: Selective, balanced, and rewarding
    this.trySpawnPowerUp(enemy);
  }

  private trySpawnPowerUp(enemy: Enemy) {
    let dropChance = 0;
    let isGuaranteed = false;

    if (enemy.isCargo || enemy.type === 'drone') {
      dropChance = 1.0;
      isGuaranteed = true;
    } else if (enemy.type === 'interceptor') {
      dropChance = 0.35; // Heavy fleet flagship
    } else if (enemy.type === 'mantis') {
      dropChance = 0.22; // Elite assault striker
    } else if (enemy.type === 'scarab') {
      dropChance = 0.18; // Armored corvette
    } else if (enemy.type === 'kamikaze') {
      dropChance = 0.15; // Dive dart
    } else if (enemy.type === 'wasp') {
      dropChance = 0.12; // Fast scout
    } else if (enemy.type === 'asteroid') {
      dropChance = 0.12;
    }

    // High combo multiplier rewards aggressive play with up to +10% bonus drop chance
    const comboBonus = Math.min(0.10, (this.stats.combo / 20) * 0.10);
    dropChance += comboBonus;

    if (isGuaranteed || Math.random() < dropChance) {
      let chosenType: PowerUpType;

      if (enemy.type === 'asteroid') {
        chosenType = Math.random() < 0.75 ? 'shield' : 'bomb';
        this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, '+SHIELD CACHE DISCOVERED!', '#06b6d4'));
      } else if (isGuaranteed) {
        sound.playCargoAlert();
        const pool: PowerUpType[] = ['spread', 'swarm_missiles', 'overdrive', 'energy_shield', 'shield', 'bomb'];
        // Adaptive pity: if health or shield is low, prioritize shield
        if ((this.stats.shields < 45 || this.stats.health < 45) && Math.random() < 0.6) {
          chosenType = 'shield';
        } else if (this.stats.spreadLevel < 3 && Math.random() < 0.5) {
          chosenType = 'spread';
        } else {
          chosenType = pool[Math.floor(Math.random() * pool.length)];
        }
        this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 25, 'SUPPLY CARGO SECURED!', '#ffea00'));
      } else {
        // Dynamic adaptive weighting for combat drops:
        const lowHealth = this.stats.shields < 40 || this.stats.health < 40;
        const needsWeapons = this.stats.spreadLevel < 4;
        const roll = Math.random();

        if (lowHealth && roll < 0.55) {
          chosenType = 'shield';
        } else if (lowHealth && roll < 0.70) {
          chosenType = 'energy_shield';
        } else if (needsWeapons && roll < 0.42) {
          chosenType = 'spread';
        } else if (roll < 0.38) {
          chosenType = 'swarm_missiles';
        } else if (roll < 0.62) {
          chosenType = 'shield';
        } else if (roll < 0.82) {
          chosenType = 'overdrive';
        } else if (roll < 0.92) {
          chosenType = 'energy_shield';
        } else {
          chosenType = 'bomb';
        }

        // Float text indicating item drop
        let dropName = 'POWER-UP DROPPED';
        if (chosenType === 'shield') dropName = 'SHIELD REPAIR DROPPED!';
        else if (chosenType === 'spread') dropName = 'CANNON UPGRADE DROPPED!';
        else if (chosenType === 'swarm_missiles') dropName = 'MISSILE SALVO DROPPED!';
        else if (chosenType === 'overdrive') dropName = 'OVERDRIVE MATRIX DROPPED!';
        else if (chosenType === 'energy_shield') dropName = 'DEFLECTOR BARRIER DROPPED!';
        else if (chosenType === 'bomb') dropName = 'EMP BOMB DROPPED!';

        this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, dropName, '#00ffff'));
      }

      this.powerUps.push(new PowerUp(enemy.x, enemy.y, chosenType));
      this.particleSystem.emitImpactSparks(enemy.x, enemy.y, '#00ffff', -Math.PI / 2);
    }
  }

  private onBossDefeated() {
    if (!this.boss || this.levelClearing) return;
    this.levelClearing = true;

    sound.playExplosion('boss');
    this.shake = 50;
    this.whiteFlash = 30;

    const bx = this.boss.x;
    const by = this.boss.y;
    const bColor = this.boss.color;
    const bAccent = this.boss.accentColor;

    // Cataclysmic Supernova Detonation!
    this.particleSystem.createBossSupernova(bx, by, bColor, bAccent);

    // Staggered secondary hull breaches across boss chassis
    setTimeout(() => {
      this.particleSystem.createRealisticExplosion(bx - 45, by + 20, {
        scale: 1.8,
        coreColor: bColor,
        accentColor: bAccent,
      });
      sound.playExplosion('medium');
    }, 400);

    setTimeout(() => {
      this.particleSystem.createRealisticExplosion(bx + 50, by - 15, {
        scale: 2.0,
        coreColor: bAccent,
        accentColor: '#ffffff',
      });
      sound.playExplosion('medium');
    }, 850);

    this.enemyBullets = []; // clear bullets
    this.enemies = [];

    const isFreeFlight = this.stats.isFreeFlight || this.level.id === 99;

    if (isFreeFlight) {
      // In Free Flight mode, boss defeat awards massive score bonus and powerup cache, and the run continues!
      const bossBonus = 15000 + this.freeFlightMilestoneReached * 5000;
      this.stats.score += bossBonus;
      this.callbacks.onScoreUpdate(this.stats.score);
      this.floatingTexts.push(new FloatingText(bx, by, `MILESTONE CONQUERED! +${bossBonus.toLocaleString()} PTS`, '#ffea00'));

      // Spawn powerup cache
      const pool: PowerUpType[] = ['shield', 'spread', 'swarm_missiles', 'energy_shield', 'bomb'];
      pool.forEach((pType, idx) => {
        const offX = (idx - 2) * 32;
        this.powerUps.push(new PowerUp(bx + offX, by, pType));
      });

      this.boss = null;
      this.callbacks.onBossSpawn(null);
      this.bossSpawned = false; // Reset so next milestone boss can spawn
      this.levelClearing = false;
      return;
    }

    this.levelClearing = true;
    const bossScore = 5000 * this.level.id;
    this.stats.score += bossScore;
    this.callbacks.onScoreUpdate(this.stats.score);
    this.floatingTexts.push(new FloatingText(bx, by, `BOSS DESTROYED! +${bossScore}`, '#ffea00'));

    this.boss = null;
    this.callbacks.onBossSpawn(null);

    // Calculate stars: 3 stars if >70% shields, 2 stars if >30%, 1 star otherwise
    const stars = this.stats.shields > 70 ? 3 : this.stats.shields > 30 ? 2 : 1;

    setTimeout(() => {
      sound.playVictory();
      this.callbacks.onLevelClear(this.stats.score, stars);
    }, 1800);
  }

  private collectPowerUp(type: PowerUpType) {
    sound.playPowerup();
    let text = '';
    switch (type) {
      case 'spread':
        this.stats.spreadLevel = Math.min(4, this.stats.spreadLevel + 1);
        text = `SPREAD CANNON LV.${this.stats.spreadLevel}!`;
        break;
      case 'swarm_missiles': {
        const DURATION = 180; // Exactly 3.0 seconds (180 frames) per pickup
        this.stats.specialTimer += DURATION;
        this.stats.specialMaxTimer = Math.max(DURATION, this.stats.specialTimer);
        const totalSeconds = (this.stats.specialTimer / 60).toFixed(1);
        text = `🚀 SWARM MISSILES +3.0s! (${totalSeconds}s)`;
        break;
      }
      case 'energy_shield': {
        this.stats.barrierTimer = 240; // 4.0 seconds (240 frames)
        sound.playBarrierActivate();
        text = `🛡️ DEFLECTOR BARRIER (4.0s)!`;
        break;
      }
      case 'shield':
        this.stats.shields = Math.min(this.stats.maxShields, this.stats.shields + 40);
        this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 25);
        this.player.shields = this.stats.shields;
        this.player.health = this.stats.health;
        this.callbacks.onShieldsUpdate(this.stats.shields);
        this.callbacks.onHealthUpdate?.(this.stats.health, this.stats.maxHealth);
        text = `+40 SHIELD / +25 HULL RESTORED!`;
        break;
      case 'bomb':
        this.stats.bombs = Math.min(5, this.stats.bombs + 1);
        this.callbacks.onBombsUpdate(this.stats.bombs);
        text = `+1 EMP BOMB LOADED!`;
        break;
      case 'overdrive':
        this.stats.overdriveTimer = 360; // 6 seconds of hyper fire
        text = `OVERDRIVE ACTIVATED!`;
        break;
    }

    this.callbacks.onStatsUpdate({
      spreadLevel: this.stats.spreadLevel,
      specialTimer: this.stats.specialTimer,
      specialMaxTimer: this.stats.specialMaxTimer,
      overdriveTimer: this.stats.overdriveTimer,
      barrierTimer: this.stats.barrierTimer,
      shields: this.stats.shields,
      health: this.stats.health
    });

    this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 45, text, '#ffea00'));
  }

  public damagePlayer(amount: number, isRamming: boolean = false) {
    if (this.stats.barrierTimer > 0) {
      sound.playShieldHit();
      this.particleSystem.emitImpactSparks(this.player.x, this.player.y, '#00f0ff', -Math.PI / 2);
      this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 30, 'DEFLECTED!', '#00f0ff'));
      this.player.hitFlash = 6;
      return;
    }

    this.player.hitFlash = 12;
    this.player.invulnerableTime = 30; // Brief grace period
    this.shieldRegenCooldown = 210; // ~3.5s cooldown before shield regenerates
    this.stats.isShieldRecharging = false;

    if (this.stats.shields > 0) {
      // 1. Deflector Shields Absorb Damage
      if (amount <= this.stats.shields) {
        this.stats.shields -= amount;
        this.player.shieldFlash = 14;
        sound.playShieldHit();
        this.shake = isRamming ? 22 : 12;
        this.particleSystem.emitImpactSparks(this.player.x, this.player.y, '#00ffff', -Math.PI / 2);
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 25, `-${amount} SHIELD`, '#00f0ff'));
      } else {
        // Spillover damage through collapsed shield into hull!
        const spillover = amount - this.stats.shields;
        this.stats.shields = 0;
        this.stats.health = Math.max(0, this.stats.health - spillover);
        this.player.shieldFlash = 16;
        this.player.hullFlash = 16;
        sound.playExplosion('small');
        this.shake = 26;
        this.redFlash = 14;
        this.particleSystem.emitImpactSparks(this.player.x, this.player.y, '#00f0ff', -Math.PI / 2);
        this.particleSystem.emitImpactSparks(this.player.x, this.player.y, '#ef4444', -Math.PI / 2);
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 35, `SHIELD BROKEN! -${spillover} HULL`, '#ef4444'));
      }
    } else {
      // 2. Direct Penetrating Hull Armor Damage!
      this.stats.health = Math.max(0, this.stats.health - amount);
      this.player.hullFlash = 16;
      sound.playExplosion('small');
      this.shake = isRamming ? 28 : 20;
      this.redFlash = 16;
      this.particleSystem.emitImpactSparks(this.player.x, this.player.y, '#ef4444', -Math.PI / 2);
      this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 25, `-${amount} HULL`, '#f43f5e'));
    }

    // Sync player entity internal gauges
    this.player.shields = this.stats.shields;
    this.player.maxShields = this.stats.maxShields;
    this.player.health = this.stats.health;
    this.player.maxHealth = this.stats.maxHealth;

    // Trigger state callbacks
    this.callbacks.onShieldsUpdate(this.stats.shields);
    this.callbacks.onHealthUpdate?.(this.stats.health, this.stats.maxHealth);
    this.callbacks.onStatsUpdate({
      shields: this.stats.shields,
      health: this.stats.health,
      isShieldRecharging: false
    });

    // Check Catastrophic Hull Failure / Death -> Trigger Lives Loss or Game Over
    if (this.stats.health <= 0) {
      this.stats.health = 0;

      // If player has extra lives remaining, expend 1 life, reboot shields & hull with respawn barrier!
      if (this.stats.lives > 1) {
        this.stats.lives--;
        sound.playExplosion('medium');
        sound.playBarrierActivate();
        this.shake = 26;
        this.whiteFlash = 25;

        // Clear hostile bullets nearby so player doesn't instantly die on respawn
        this.enemyBullets = [];
        this.particleSystem.emitEmpBurst(this.player.x, this.player.y);

        // Emergency Hull and Shield restore
        this.stats.health = this.stats.maxHealth;
        this.stats.shields = this.stats.maxShields;
        this.player.health = this.stats.health;
        this.player.shields = this.stats.shields;
        this.player.invulnerableTime = 180; // 3 seconds of invulnerability
        this.stats.barrierTimer = 180;

        this.floatingTexts.push(
          new FloatingText(this.player.x, this.player.y - 45, `⚠️ LIFE LOST! [${this.stats.lives} LIVES LEFT]`, '#f43f5e')
        );
        this.floatingTexts.push(
          new FloatingText(this.player.x, this.player.y - 20, `EMERGENCY REBOOT (3.0s INVULNERABLE)`, '#00ffff')
        );

        this.callbacks.onShieldsUpdate(this.stats.shields);
        this.callbacks.onHealthUpdate?.(this.stats.health, this.stats.maxHealth);
        this.callbacks.onStatsUpdate({
          lives: this.stats.lives,
          health: this.stats.health,
          shields: this.stats.shields,
          barrierTimer: 180
        });
        return;
      }

      // Final Life Expended -> Trigger Game Over State
      this.stats.lives = 0;
      this.callbacks.onStatsUpdate({ lives: 0 });

      if (this.stats.isFreeFlight) {
        try {
          const profile = getStoredProfile();
          const dist = this.stats.distanceFlown || 0;
          const newBestDist = Math.max(profile.freeFlightBestDistance || 0, dist);
          const newBestScore = Math.max(profile.freeFlightHighScore || 0, this.stats.score);
          saveProfile({
            ...profile,
            freeFlightBestDistance: newBestDist,
            freeFlightHighScore: newBestScore
          });
        } catch (e) {
          console.error('Failed to update free flight records', e);
        }
      }

      sound.playGameOver();
      sound.playExplosion('boss');
      this.particleSystem.createRealisticExplosion(this.player.x, this.player.y, {
        scale: 2.6,
        coreColor: '#ff2200',
        accentColor: '#ffaa00',
        fireballCount: 36,
        sparkCount: 55,
        shrapnelCount: 26,
        smokeCount: 20,
        hasShockwave: true,
      });
      this.stop();
      setTimeout(() => {
        this.callbacks.onGameOver(this.stats.score);
      }, 950);
    }
  }

  private createEnemyExplosion(enemy: Enemy) {
    let scale = 1.0;
    let coreColor = enemy.color;
    let accentColor = enemy.wingColor;
    let shrapnelCount = 6;
    let fireballCount = 10;
    let sparkCount = 18;
    let smokeCount = 7;

    switch (enemy.type) {
      case 'drone':
        scale = 1.4;
        coreColor = '#ffea00';
        accentColor = '#00f0ff';
        fireballCount = 16;
        sparkCount = 36;
        shrapnelCount = 14;
        smokeCount = 8;
        this.shake = Math.max(this.shake, 12);
        break;
      case 'asteroid':
        scale = 1.3;
        coreColor = '#78716c';
        accentColor = '#06b6d4';
        fireballCount = 8;
        sparkCount = 28;
        shrapnelCount = 18;
        smokeCount = 12;
        this.shake = Math.max(this.shake, 8);
        break;
      case 'wasp':
        scale = 1.0;
        coreColor = '#ff6600';
        accentColor = '#ffee00';
        fireballCount = 10;
        sparkCount = 20;
        break;
      case 'scarab':
        scale = 1.2;
        coreColor = '#7700ee';
        accentColor = '#ff00ea';
        fireballCount = 14;
        sparkCount = 24;
        shrapnelCount = 8;
        break;
      case 'mantis':
        scale = 1.5;
        coreColor = '#0088cc';
        accentColor = '#00ffaa';
        fireballCount = 18;
        sparkCount = 30;
        shrapnelCount = 12;
        smokeCount = 10;
        this.shake = Math.max(this.shake, 10);
        break;
      case 'interceptor':
        scale = 1.8;
        coreColor = '#ee0044';
        accentColor = '#ffaa00';
        fireballCount = 24;
        sparkCount = 38;
        shrapnelCount = 16;
        smokeCount = 14;
        this.shake = Math.max(this.shake, 14);
        break;
    }

    this.particleSystem.createRealisticExplosion(enemy.x, enemy.y, {
      scale,
      coreColor,
      accentColor,
      fireballCount,
      sparkCount,
      shrapnelCount,
      smokeCount,
      hasShockwave: true,
    });
  }

  public createExplosion(x: number, y: number, color: string, count: number) {
    this.particleSystem.createRealisticExplosion(x, y, {
      scale: Math.max(1, count / 18),
      coreColor: color,
      accentColor: '#ffffff',
      fireballCount: Math.floor(count * 0.7),
      sparkCount: count,
      shrapnelCount: Math.floor(count * 0.4),
      smokeCount: Math.floor(count * 0.35),
      hasShockwave: true,
    });
  }
}
