export type GameState = 
  | 'menu' 
  | 'level_select' 
  | 'playing' 
  | 'paused' 
  | 'level_cleared' 
  | 'gameover' 
  | 'campaign_victory';

export type PowerUpType = 'spread' | 'swarm_missiles' | 'shield' | 'bomb' | 'overdrive' | 'energy_shield';

export type EnemyType = 
  | 'wasp' 
  | 'scarab' 
  | 'mantis' 
  | 'interceptor' 
  | 'kamikaze' 
  | 'drone' 
  | 'asteroid'
  | 'phantom'
  | 'wraith'
  | 'cobra';

export interface LevelConfig {
  id: number;
  sector: string;
  name: string;
  subtitle: string;
  description: string;
  difficulty: 'Normal' | 'Hard' | 'Extreme' | 'Nightmare' | 'Hell';
  threatRating: string;
  bgGradient: [string, string]; // Top & bottom colors
  nebulaColor: string;
  targetKills: number; // Kills needed to summon boss
  enemySpawnRate: number; // Frames between spawns
  enemyFireRate: number; // Probability of enemy firing
  enemySpeedMultiplier: number;
  enemyHealthMultiplier: number;
  bulletSpeedMultiplier: number;
  allowedEnemyTypes: EnemyType[];
  boss: BossConfig;
}

export type BossHullType = 'dreadnought' | 'carrier' | 'cruiser' | 'titan' | 'archon';

export type BossMovementStyle = 'figure_eight' | 'sweeping_strafe' | 'aggressive_pursuit' | 'warp_flicker';

export type BossAttackPattern = 
  | 'radial' 
  | 'aimed_spread' 
  | 'spiral' 
  | 'cross' 
  | 'plasma_barrage' 
  | 'cluster_mines' 
  | 'sniper_burst' 
  | 'homing_orbs'
  | 'cyclone_spiral'
  | 'laser_sweep'
  | 'singularity_vortex'
  | 'quad_catapult';

export type BossSpecialAbility = 
  | 'drone_escort' 
  | 'kinetic_barrier' 
  | 'enrage_burst' 
  | 'shockwave_pulse'
  | 'warp_ambush'
  | 'dark_matter_singularity'
  | 'solar_flare_burst';

export interface BossConfig {
  name: string;
  title: string;
  hp: number;
  color: string;
  accentColor: string;
  size?: number;
  bulletSpeed: number;
  attackPatterns: BossAttackPattern[];
  phases: number;
  levelId?: number;
  hullType?: BossHullType;
  movementStyle?: BossMovementStyle;
  specialAbility?: BossSpecialAbility;
}

export interface PlayerStats {
  score: number;
  highScore: number;
  health: number; // Hull armor integrity (0 to maxHealth)
  maxHealth: number;
  shields: number; // Energy deflector shield (0 to maxShields)
  maxShields: number;
  isShieldRecharging?: boolean;
  bombs: number;
  spreadLevel: number; // 1 to 4
  specialTimer: number; // frames remaining of the 3-second swarm missile power-up (0 = inactive)
  specialMaxTimer: number; // maximum chain duration for progress bar
  overdriveTimer: number; // frames remaining
  barrierTimer: number; // frames remaining of temporary invulnerability barrier (0 = inactive)
  combo: number;
  comboTimer: number;
  killsInLevel: number;
  lives: number; // Player lives count (default 3)
  maxLives: number;
  distanceFlown?: number;
  isFreeFlight?: boolean;
}

export interface LevelProgress {
  levelId: number;
  unlocked: boolean;
  completed: boolean;
  highScore: number;
  stars: number; // 0 to 3
}

export interface GameSettings {
  hudScale: 'compact' | 'normal' | 'large';
  leftHanded: boolean;
  colorblindSafe: boolean;
  reducedMotion: boolean;
}

export interface DynamicDifficultyState {
  sectorProgress: number; // 0.0 to 1.0 (or higher during boss phases)
  spawnFrequencyMultiplier: number; // e.g. 1.0x at 0% up to 1.65x at 100%
  bulletSpeedMultiplier: number; // e.g. 1.0x at 0% up to 1.40x at 100%
  currentSpawnRate: number; // Effective frame delay between spawns
  threatPercent: number; // 100% to 165%
  threatStage: 'NORMAL' | 'ESCALATING' | 'HIGH INTENSITY' | 'CRITICAL';
}

export function calculateDynamicDifficulty(
  level: LevelConfig,
  killsInLevel: number,
  isBossActive: boolean = false,
  bossPhase: number = 1
): DynamicDifficultyState {
  const baseProgress = level.targetKills > 0 
    ? Math.min(1.0, Math.max(0, killsInLevel / level.targetKills)) 
    : 0;

  // If boss is active, progress is maximized and intensifies further with boss phases
  const sectorProgress = isBossActive 
    ? 1.0 + (bossPhase - 1) * 0.18 
    : baseProgress;

  // Dynamic spawn frequency increases up to +65% as sector progress climbs
  // (During boss encounters, spawn rate is moderated to focus on the boss)
  const spawnFrequencyMultiplier = isBossActive
    ? 0.4
    : 1.0 + sectorProgress * 0.65;

  // Dynamic bullet speed increases up to +38% based on current sector progress
  const bulletSpeedMultiplier = 1.0 + sectorProgress * 0.38;

  // Frame delay between wave spawns inversely scales with spawn frequency
  const currentSpawnRate = isBossActive
    ? 220
    : Math.max(22, Math.round(level.enemySpawnRate / spawnFrequencyMultiplier));

  const threatPercent = Math.round((1.0 + sectorProgress * 0.55) * 100);

  let threatStage: DynamicDifficultyState['threatStage'] = 'NORMAL';
  if (sectorProgress >= 0.8) {
    threatStage = 'CRITICAL';
  } else if (sectorProgress >= 0.5) {
    threatStage = 'HIGH INTENSITY';
  } else if (sectorProgress >= 0.25) {
    threatStage = 'ESCALATING';
  }

  return {
    sectorProgress,
    spawnFrequencyMultiplier: Number(spawnFrequencyMultiplier.toFixed(2)),
    bulletSpeedMultiplier: Number(bulletSpeedMultiplier.toFixed(2)),
    currentSpawnRate,
    threatPercent,
    threatStage
  };
}
