import { GameSettings } from './types';

export interface MissionItem {
  id: string;
  title: string;
  desc: string;
  target: number;
  current: number;
  rewardType: 'coins' | 'gems';
  rewardAmount: number;
  completed: boolean;
  claimed: boolean;
}

export interface AchievementItem {
  id: string;
  title: string;
  desc: string;
  target: number;
  current: number;
  rewardGems: number;
  completed: boolean;
  claimed: boolean;
  icon: string;
}

export type ShipId = 
  | 'vanguard' 
  | 'corsair' 
  | 'phantom' 
  | 'archon' 
  | 'valkyrie' 
  | 'wraith' 
  | 'tempest' 
  | 'solaris' 
  | 'nightshade';

export interface ShipInfo {
  id: ShipId;
  name: string;
  title: string;
  speed: number; // 1-10
  firepower: number; // 1-10
  shield: number; // 1-10
  costCoins: number;
  unlocked: boolean;
  color: string;
  accent: string;
  desc: string;
}

export interface PilotProfile {
  name: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  coins: number;
  gems: number;
  energy: number;
  maxEnergy: number;
  selectedShip: ShipId;
  selectedSector: number;
  freeFlightBestDistance: number;
  freeFlightHighScore: number;
  upgrades: {
    spreadLevel: number;
    shieldCapacity: number;
    bombCount: number;
    overdrivePower: number;
  };
  dailyStreak: number;
  dailyClaimed: boolean;
  hasUnreadMail: boolean;
  missions: MissionItem[];
  achievements: AchievementItem[];
}

const PROFILE_KEY = 'galaxy_shooter_pilot_profile_v2';

const DEFAULT_SHIPS: ShipInfo[] = [
  {
    id: 'vanguard',
    name: 'VANGUARD X-1',
    title: 'Precision Strike Fighter',
    speed: 8,
    firepower: 7,
    shield: 6,
    costCoins: 0,
    unlocked: true,
    color: '#00ffff',
    accent: '#3b82f6',
    desc: 'The fleet vanguard starfighter. Agile, high maneuverability with needle nose and twin wingtip plasma accelerators.'
  },
  {
    id: 'corsair',
    name: 'CORSAIR ASSAULT',
    title: 'Heavy Assault Gunship',
    speed: 6,
    firepower: 9,
    shield: 8,
    costCoins: 0,
    unlocked: true,
    color: '#a855f7',
    accent: '#ec4899',
    desc: 'Heavy diamond hull plating with quad forward autocannons. Devastating punch with thick reinforced armor.'
  },
  {
    id: 'phantom',
    name: 'PHANTOM INFILTRATOR',
    title: 'Stealth Interceptor',
    speed: 10,
    firepower: 8,
    shield: 5,
    costCoins: 0,
    unlocked: true,
    color: '#06b6d4',
    accent: '#10b981',
    desc: 'Forward-swept stealth wings with dual aerodynamic canards and pinpoint hyper-velocity railguns.'
  },
  {
    id: 'archon',
    name: 'ARCHON TITAN',
    title: 'Flagship Colossus',
    speed: 7,
    firepower: 10,
    shield: 10,
    costCoins: 0,
    unlocked: true,
    color: '#f59e0b',
    accent: '#ef4444',
    desc: 'Supreme capital starfighter. Reinforced kinetic shields with triple-prong prow and heavy broadside sponsons.'
  },
  {
    id: 'valkyrie',
    name: 'VALKYRIE INTERCEPTOR',
    title: 'Solar Blade Interceptor',
    speed: 9,
    firepower: 9,
    shield: 7,
    costCoins: 0,
    unlocked: true,
    color: '#ef4444',
    accent: '#f59e0b',
    desc: 'Crimson solar-foil scissor wings with dual stabilizer rudders and high-density particle beam cutters.'
  },
  {
    id: 'wraith',
    name: 'NEBULA WRAITH',
    title: 'Bio-Void Scythe Fighter',
    speed: 9,
    firepower: 10,
    shield: 6,
    costCoins: 0,
    unlocked: true,
    color: '#d946ef',
    accent: '#06b6d4',
    desc: 'Alien bio-tech void fighter with curved scythe wings, pulsing anti-matter filaments, and dark energy cannons.'
  },
  {
    id: 'tempest',
    name: 'TEMPEST LIGHTNING',
    title: 'Twin-Fuselage Catamaran',
    speed: 9,
    firepower: 10,
    shield: 7,
    costCoins: 0,
    unlocked: true,
    color: '#38bdf8',
    accent: '#6366f1',
    desc: 'Dual-hull twin-fuselage heavy interceptor generating continuous high-voltage ionized plasma arcs across twin needle bows.'
  },
  {
    id: 'solaris',
    name: 'SOLARIS PHOENIX',
    title: 'Coronal Firebird',
    speed: 8,
    firepower: 9,
    shield: 9,
    costCoins: 0,
    unlocked: true,
    color: '#f97316',
    accent: '#eab308',
    desc: 'Swept flaming firebird aerodynamic wings with solar collector sails and superheated coronal flare thrust vents.'
  },
  {
    id: 'nightshade',
    name: 'NIGHTSHADE STEALTH',
    title: 'Faceted Void Bomber',
    speed: 8,
    firepower: 10,
    shield: 8,
    costCoins: 0,
    unlocked: true,
    color: '#8b5cf6',
    accent: '#06b6d4',
    desc: 'Hexagonal faceted radar-absorbent obsidian flying wing with neon magenta sensor seams and dual heavy proton cannons.'
  }
];

export const INITIAL_SHIPS = DEFAULT_SHIPS;

export function getStoredProfile(): PilotProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load profile', e);
  }

  return {
    name: 'Rookie Pilot',
    level: 3,
    xp: 450,
    nextLevelXp: 1000,
    coins: 12450,
    gems: 320,
    energy: 10,
    maxEnergy: 10,
    selectedShip: 'vanguard',
    selectedSector: 6,
    freeFlightBestDistance: 0,
    freeFlightHighScore: 0,
    upgrades: {
      spreadLevel: 1,
      shieldCapacity: 100,
      bombCount: 2,
      overdrivePower: 1
    },
    dailyStreak: 3,
    dailyClaimed: false,
    hasUnreadMail: true,
    missions: [
      {
        id: 'm1',
        title: 'Sector Vanguard Purge',
        desc: 'Destroy 40 hostile fighters in any sector',
        target: 40,
        current: 28,
        rewardType: 'coins',
        rewardAmount: 1500,
        completed: false,
        claimed: false
      },
      {
        id: 'm2',
        title: 'Boss Destroyer',
        desc: 'Defeat 2 Flagship Bosses without losing all shields',
        target: 2,
        current: 2,
        rewardType: 'gems',
        rewardAmount: 60,
        completed: true,
        claimed: false
      },
      {
        id: 'm3',
        title: 'EMP Overload',
        desc: 'Detonate 3 EMP Bombs during combat',
        target: 3,
        current: 3,
        rewardType: 'coins',
        rewardAmount: 2000,
        completed: true,
        claimed: false
      },
      {
        id: 'm4',
        title: 'Swarm Missile Salvo',
        desc: 'Lock onto 50 hostiles with homing missiles',
        target: 50,
        current: 34,
        rewardType: 'gems',
        rewardAmount: 80,
        completed: false,
        claimed: false
      }
    ],
    achievements: [
      {
        id: 'a1',
        title: 'First Flight',
        desc: 'Clear Sector 1 with 3 Stars',
        target: 1,
        current: 1,
        rewardGems: 50,
        completed: true,
        claimed: true,
        icon: '🚀'
      },
      {
        id: 'a2',
        title: 'Nebula Veteran',
        desc: 'Reach Sector 6 in Campaign mode',
        target: 6,
        current: 6,
        rewardGems: 100,
        completed: true,
        claimed: false,
        icon: '🌌'
      },
      {
        id: 'a3',
        title: 'Titan Slayer',
        desc: 'Eliminate the Omega Sovereign flagship',
        target: 1,
        current: 0,
        rewardGems: 250,
        completed: false,
        claimed: false,
        icon: '👑'
      },
      {
        id: 'a4',
        title: 'Arsenal Supremacy',
        desc: 'Reach Level 4 Spread Cannon upgrade',
        target: 4,
        current: 2,
        rewardGems: 120,
        completed: false,
        claimed: false,
        icon: '⚡'
      }
    ]
  };
}

export function saveProfile(profile: PilotProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

const SETTINGS_KEY = 'galaxy_shooter_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  hudScale: 'normal',
  leftHanded: false,
  colorblindSafe: false,
  reducedMotion: false,
};

export function getStoredSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}
