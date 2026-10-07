import { LevelConfig, LevelProgress } from './types';

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    sector: 'SECTOR 01',
    name: 'Asteroid Outskirts',
    subtitle: 'The Frontier Perimeter',
    description: 'Hostile scout drones are probing the outer asteroid perimeter. Slower movement and telegraphed single plasma shots allow tactical familiarization.',
    difficulty: 'Normal',
    threatRating: 'LOW HAZARD - CADET PATROL',
    bgGradient: ['#0d0415', '#020617'],
    nebulaColor: 'rgba(120, 40, 200, 0.15)',
    targetKills: 14,
    enemySpawnRate: 75,
    enemyFireRate: 0.005,
    enemySpeedMultiplier: 0.80,
    enemyHealthMultiplier: 0.85,
    bulletSpeedMultiplier: 0.80,
    allowedEnemyTypes: ['wasp', 'scarab', 'kamikaze', 'asteroid', 'drone'],
    boss: {
      name: 'Vanguard Dreadwing',
      title: 'Flagship Strike Commander',
      hp: 320,
      color: '#ffaa00',
      accentColor: '#00ffff',
      size: 58,
      bulletSpeed: 3.2,
      phases: 2,
      levelId: 1,
      hullType: 'cruiser',
      movementStyle: 'figure_eight',
      attackPatterns: ['aimed_spread', 'radial']
    }
  },
  {
    id: 2,
    sector: 'SECTOR 02',
    name: 'Neon Orbital Yards',
    subtitle: 'Fleet Construction Depot',
    description: 'Armored enemy corvettes deploy in twin formations. Target their forward batteries while navigating drifting orbital debris.',
    difficulty: 'Normal',
    threatRating: 'LOW HAZARD - ESCORT CORVETTES',
    bgGradient: ['#041517', '#080520'],
    nebulaColor: 'rgba(0, 220, 200, 0.18)',
    targetKills: 18,
    enemySpawnRate: 65,
    enemyFireRate: 0.009,
    enemySpeedMultiplier: 0.92,
    enemyHealthMultiplier: 0.95,
    bulletSpeedMultiplier: 0.90,
    allowedEnemyTypes: ['wasp', 'scarab', 'kamikaze', 'asteroid', 'drone'],
    boss: {
      name: 'Goliath Battlecruiser',
      title: 'Fleet Heavy Carrier',
      hp: 480,
      color: '#ff0077',
      accentColor: '#ffff00',
      size: 65,
      bulletSpeed: 3.6,
      phases: 2,
      levelId: 2,
      hullType: 'carrier',
      movementStyle: 'sweeping_strafe',
      attackPatterns: ['radial', 'quad_catapult', 'plasma_barrage'],
      specialAbility: 'drone_escort'
    }
  },
  {
    id: 3,
    sector: 'SECTOR 03',
    name: 'Ion Plasma Trench',
    subtitle: 'Deep Mining Gorge',
    description: 'Agile Mantis strike fighters dive in coordinated pincer swoops. Watch for accelerating dive runs and dual plasma rounds.',
    difficulty: 'Normal',
    threatRating: 'MODERATE - AGGRESSIVE STRIKE WING',
    bgGradient: ['#150804', '#050a1a'],
    nebulaColor: 'rgba(255, 100, 20, 0.16)',
    targetKills: 22,
    enemySpawnRate: 58,
    enemyFireRate: 0.013,
    enemySpeedMultiplier: 1.05,
    enemyHealthMultiplier: 1.05,
    bulletSpeedMultiplier: 1.0,
    allowedEnemyTypes: ['wasp', 'scarab', 'mantis', 'kamikaze', 'asteroid', 'drone'],
    boss: {
      name: 'Phantom Dreadnought',
      title: 'Heavy Assault Destroyer',
      hp: 700,
      color: '#00ff66',
      accentColor: '#ff00aa',
      size: 70,
      bulletSpeed: 4.0,
      phases: 2,
      levelId: 3,
      hullType: 'dreadnought',
      movementStyle: 'aggressive_pursuit',
      attackPatterns: ['cross', 'laser_sweep', 'plasma_barrage'],
      specialAbility: 'shockwave_pulse'
    }
  },
  {
    id: 4,
    sector: 'SECTOR 04',
    name: 'Plasma Belt',
    subtitle: 'Superheated Ion Field',
    description: 'Heavy warship escorts arrive. Fortified hulls and aimed 3-way burst volleys test defensive maneuvering.',
    difficulty: 'Hard',
    threatRating: 'ELEVATED - HEAVY BATTLEGROUP',
    bgGradient: ['#170417', '#000000'],
    nebulaColor: 'rgba(220, 0, 255, 0.2)',
    targetKills: 26,
    enemySpawnRate: 52,
    enemyFireRate: 0.018,
    enemySpeedMultiplier: 1.15,
    enemyHealthMultiplier: 1.2,
    bulletSpeedMultiplier: 1.12,
    allowedEnemyTypes: ['wasp', 'scarab', 'mantis', 'interceptor', 'kamikaze', 'cobra', 'drone'],
    boss: {
      name: 'Sol Invictus',
      title: 'Solar Core Titan',
      hp: 1000,
      color: '#ffcc00',
      accentColor: '#ff2200',
      size: 76,
      bulletSpeed: 4.4,
      phases: 3,
      levelId: 4,
      hullType: 'titan',
      movementStyle: 'sweeping_strafe',
      attackPatterns: ['spiral', 'cluster_mines', 'radial'],
      specialAbility: 'solar_flare_burst'
    }
  },
  {
    id: 5,
    sector: 'SECTOR 05',
    name: 'Cybernetic Citadel',
    subtitle: 'The Central Spire',
    description: 'Midway fleet confrontation. Interceptors employ evasive thruster jinks and coordinated crossfire barrages.',
    difficulty: 'Hard',
    threatRating: 'HIGH RISK - CITADEL PERIMETER',
    bgGradient: ['#02120e', '#09031a'],
    nebulaColor: 'rgba(0, 255, 170, 0.2)',
    targetKills: 30,
    enemySpawnRate: 46,
    enemyFireRate: 0.022,
    enemySpeedMultiplier: 1.25,
    enemyHealthMultiplier: 1.35,
    bulletSpeedMultiplier: 1.22,
    allowedEnemyTypes: ['wasp', 'scarab', 'mantis', 'interceptor', 'kamikaze', 'drone', 'asteroid'],
    boss: {
      name: 'Aegis Super-Carrier',
      title: 'Armada Command Flagship',
      hp: 1350,
      color: '#00e5ff',
      accentColor: '#ff0055',
      size: 80,
      bulletSpeed: 4.8,
      phases: 3,
      levelId: 5,
      hullType: 'carrier',
      movementStyle: 'figure_eight',
      attackPatterns: ['cross', 'quad_catapult', 'plasma_barrage'],
      specialAbility: 'kinetic_barrier'
    }
  },
  {
    id: 6,
    sector: 'SECTOR 06',
    name: 'Solar Storm Front',
    subtitle: 'Corona Flare Zone',
    description: 'Blinding electromagnetic turbulence. Enemy hulls are reinforced with thermal ablative armor; squadrons attack in rapid dive-bombing passes.',
    difficulty: 'Extreme',
    threatRating: 'SEVERE - CORONA TURBULENCE',
    bgGradient: ['#1c0800', '#0a0014'],
    nebulaColor: 'rgba(255, 120, 0, 0.22)',
    targetKills: 34,
    enemySpawnRate: 40,
    enemyFireRate: 0.027,
    enemySpeedMultiplier: 1.35,
    enemyHealthMultiplier: 1.5,
    bulletSpeedMultiplier: 1.32,
    allowedEnemyTypes: ['wasp', 'scarab', 'mantis', 'interceptor', 'kamikaze', 'phantom', 'cobra', 'drone'],
    boss: {
      name: 'Helios Vanguard',
      title: 'Corona Dreadnought',
      hp: 1800,
      color: '#ff8800',
      accentColor: '#ffffff',
      size: 84,
      bulletSpeed: 5.2,
      phases: 3,
      levelId: 6,
      hullType: 'dreadnought',
      movementStyle: 'aggressive_pursuit',
      attackPatterns: ['sniper_burst', 'laser_sweep', 'aimed_spread'],
      specialAbility: 'enrage_burst'
    }
  },
  {
    id: 7,
    sector: 'SECTOR 07',
    name: 'Void Nebula',
    subtitle: 'The Dark Shroud',
    description: 'Stealth interceptors decloak right before discharging heavy cluster rounds. High-speed evasive action needed.',
    difficulty: 'Extreme',
    threatRating: 'CRITICAL - STEALTH INTERCEPTION',
    bgGradient: ['#09001f', '#020008'],
    nebulaColor: 'rgba(140, 20, 240, 0.25)',
    targetKills: 38,
    enemySpawnRate: 36,
    enemyFireRate: 0.032,
    enemySpeedMultiplier: 1.45,
    enemyHealthMultiplier: 1.65,
    bulletSpeedMultiplier: 1.42,
    allowedEnemyTypes: ['wasp', 'mantis', 'interceptor', 'kamikaze', 'phantom', 'wraith', 'drone'],
    boss: {
      name: 'Void Leviathan',
      title: 'Phantom Archon',
      hp: 2300,
      color: '#b300ff',
      accentColor: '#00ffff',
      size: 88,
      bulletSpeed: 5.6,
      phases: 3,
      levelId: 7,
      hullType: 'archon',
      movementStyle: 'warp_flicker',
      attackPatterns: ['homing_orbs', 'singularity_vortex', 'spiral'],
      specialAbility: 'warp_ambush'
    }
  },
  {
    id: 8,
    sector: 'SECTOR 08',
    name: 'Pulsar Core',
    subtitle: 'Relativistic Dynamo',
    description: 'High-speed waves alternating with multi-tiered drone formations. Rapid reflex evasion and precision fire required.',
    difficulty: 'Nightmare',
    threatRating: 'LETHAL - PULSAR RUN',
    bgGradient: ['#00181c', '#0c001f'],
    nebulaColor: 'rgba(0, 190, 255, 0.25)',
    targetKills: 42,
    enemySpawnRate: 32,
    enemyFireRate: 0.037,
    enemySpeedMultiplier: 1.55,
    enemyHealthMultiplier: 1.8,
    bulletSpeedMultiplier: 1.52,
    allowedEnemyTypes: ['wasp', 'scarab', 'mantis', 'interceptor', 'kamikaze', 'phantom', 'wraith', 'cobra', 'drone'],
    boss: {
      name: 'Pulsar Colossus',
      title: 'Cyclonic Juggernaut',
      hp: 2900,
      color: '#00ffc4',
      accentColor: '#ff00aa',
      size: 92,
      bulletSpeed: 6.0,
      phases: 4,
      levelId: 8,
      hullType: 'titan',
      movementStyle: 'sweeping_strafe',
      attackPatterns: ['cyclone_spiral', 'spiral', 'cluster_mines'],
      specialAbility: 'shockwave_pulse'
    }
  },
  {
    id: 9,
    sector: 'SECTOR 09',
    name: 'Event Horizon',
    subtitle: 'Gravitational Breach',
    description: 'The alien armada elite honor guard. Relentless projectile storms and armored interceptors deploy evasive maneuvers.',
    difficulty: 'Nightmare',
    threatRating: 'MAXIMUM DANGER - WARLORD FLEET',
    bgGradient: ['#1f000b', '#030008'],
    nebulaColor: 'rgba(255, 0, 80, 0.28)',
    targetKills: 46,
    enemySpawnRate: 28,
    enemyFireRate: 0.042,
    enemySpeedMultiplier: 1.65,
    enemyHealthMultiplier: 2.0,
    bulletSpeedMultiplier: 1.62,
    allowedEnemyTypes: ['wasp', 'scarab', 'mantis', 'interceptor', 'kamikaze', 'phantom', 'wraith', 'cobra', 'drone'],
    boss: {
      name: 'Apex Sovereign',
      title: 'Warlord of the Rift',
      hp: 3700,
      color: '#ff0044',
      accentColor: '#ffea00',
      size: 98,
      bulletSpeed: 6.5,
      phases: 4,
      levelId: 9,
      hullType: 'archon',
      movementStyle: 'warp_flicker',
      attackPatterns: ['laser_sweep', 'plasma_barrage', 'cyclone_spiral'],
      specialAbility: 'drone_escort'
    }
  },
  {
    id: 10,
    sector: 'SECTOR 10',
    name: 'The Omega Sovereign',
    subtitle: 'Final Extinction Gateway',
    description: 'The ultimate hardcore confrontation. The Supreme Mothercore unleashes maximum density bullet hell and aggressive escort wings.',
    difficulty: 'Hell',
    threatRating: 'APOCALYPTIC - SUPREME MOTHERCORE',
    bgGradient: ['#140026', '#000000'],
    nebulaColor: 'rgba(255, 215, 0, 0.25)',
    targetKills: 52,
    enemySpawnRate: 25,
    enemyFireRate: 0.048,
    enemySpeedMultiplier: 1.75,
    enemyHealthMultiplier: 2.25,
    bulletSpeedMultiplier: 1.72,
    allowedEnemyTypes: ['wasp', 'scarab', 'mantis', 'interceptor', 'kamikaze', 'phantom', 'wraith', 'cobra', 'drone'],
    boss: {
      name: 'OMEGA ZERO',
      title: 'Cataclysmic Void Singularity',
      hp: 4800,
      color: '#ffea00',
      accentColor: '#00ffff',
      size: 105,
      bulletSpeed: 7.0,
      phases: 4,
      levelId: 10,
      hullType: 'archon',
      movementStyle: 'warp_flicker',
      attackPatterns: ['singularity_vortex', 'cyclone_spiral', 'homing_orbs', 'radial'],
      specialAbility: 'dark_matter_singularity'
    }
  }
];

export const FREE_FLIGHT_LEVEL: LevelConfig = {
  id: 99,
  sector: 'INFINITY SECTOR',
  name: 'Endless Free Flight',
  subtitle: 'Infinite Subsurface Space Run',
  description: 'Uncapped survival deep space run. Difficulty surges every 100 meters, with dreadnought boss incursions every 600 meters! Dodge hazards, collect caches, and survive!',
  difficulty: 'Hell',
  threatRating: 'UNRESTRICTED INFINITE RUN',
  bgGradient: ['#090014', '#020008'],
  nebulaColor: 'rgba(168, 85, 247, 0.25)',
  targetKills: 9999999,
  enemySpawnRate: 50,
  enemyFireRate: 0.016,
  enemySpeedMultiplier: 1.05,
  enemyHealthMultiplier: 1.05,
  bulletSpeedMultiplier: 1.0,
  allowedEnemyTypes: ['wasp', 'scarab', 'mantis', 'interceptor', 'kamikaze', 'phantom', 'wraith', 'cobra', 'drone', 'asteroid'],
  boss: {
    name: 'Vanguard Dreadwing',
    title: 'Milestone Incursion Boss',
    hp: 450,
    color: '#ffaa00',
    accentColor: '#00ffff',
    size: 60,
    bulletSpeed: 3.5,
    phases: 2,
    levelId: 1,
    hullType: 'cruiser',
    movementStyle: 'figure_eight',
    attackPatterns: ['aimed_spread', 'radial']
  }
};

export function getLevelConfig(levelId: number): LevelConfig {
  if (levelId === 99) {
    return FREE_FLIGHT_LEVEL;
  }
  return LEVELS.find((l) => l.id === levelId) || LEVELS[0];
}

const STORAGE_KEY = 'galaxy_space_shooter_progress_v2';

export function getStoredProgress(): Record<number, LevelProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load level progress', e);
  }

  // Default: Level 1 unlocked, others locked
  const initial: Record<number, LevelProgress> = {};
  LEVELS.forEach((lvl, idx) => {
    initial[lvl.id] = {
      levelId: lvl.id,
      unlocked: idx === 0,
      completed: false,
      highScore: 0,
      stars: 0
    };
  });
  return initial;
}

export function saveLevelResult(levelId: number, score: number, stars: number) {
  const current = getStoredProgress();
  const existing = current[levelId] || {
    levelId,
    unlocked: true,
    completed: false,
    highScore: 0,
    stars: 0
  };

  existing.completed = true;
  existing.highScore = Math.max(existing.highScore, score);
  existing.stars = Math.max(existing.stars, stars);
  current[levelId] = existing;

  // Unlock next level if available
  const nextId = levelId + 1;
  if (current[nextId]) {
    current[nextId].unlocked = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save level progress', e);
  }
}
