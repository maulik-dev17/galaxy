import React, { useState, useEffect } from 'react';
import { 
  Volume2, VolumeX, Pause, Bomb, Zap, Rocket, Shield, 
  Activity, Heart, Compass, Crosshair, AlertTriangle, ChevronDown 
} from 'lucide-react';
import { LevelConfig, PlayerStats, DynamicDifficultyState, calculateDynamicDifficulty, GameSettings } from '../types';
import { Boss } from '../canvas/entities';

interface HUDProps {
  level: LevelConfig;
  stats: PlayerStats;
  boss: Boss | null;
  bossHp: number;
  bossMaxHp: number;
  killsInLevel: number;
  dynamicDifficulty?: DynamicDifficultyState | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onTriggerBomb: () => void;
  onPause: () => void;
  settings?: GameSettings;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  stats,
  boss,
  bossHp,
  bossMaxHp,
  killsInLevel,
  dynamicDifficulty,
  isMuted,
  onToggleMute,
  onTriggerBomb,
  onPause,
  settings
}) => {
  const isFreeFlight = stats.isFreeFlight || level.id === 99;
  const healthPercent = Math.max(0, Math.min(100, stats.maxHealth > 0 ? (stats.health / stats.maxHealth) * 100 : stats.health));
  const shieldPercent = Math.max(0, Math.min(100, stats.maxShields > 0 ? (stats.shields / stats.maxShields) * 100 : stats.shields));
  const waveProgress = Math.min(100, (killsInLevel / level.targetKills) * 100);
  const bossHpPercent = bossMaxHp > 0 ? Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100)) : 0;
  const dyn = dynamicDifficulty || calculateDynamicDifficulty(level, killsInLevel, boss !== null, boss?.currentPhase || 1);

  // Settings configurations
  const leftHanded = settings?.leftHanded || false;
  const reducedMotion = settings?.reducedMotion || false;
  const colorblindSafe = settings?.colorblindSafe || false;

  // Free Flight distance & boss milestones
  const distance = stats.distanceFlown || 0;
  const distanceToNextBoss = 600 - (distance % 600);
  const bossProgressPercent = ((distance % 600) / 600) * 100;
  const isBossImminent = isFreeFlight 
    ? (distanceToNextBoss <= 100 && !boss)
    : (!boss && killsInLevel >= Math.max(1, level.targetKills - 3));

  // Ghost damage trails for smooth visual delay
  const [ghostShield, setGhostShield] = useState(shieldPercent);
  const [ghostHealth, setGhostHealth] = useState(healthPercent);
  const [tierExpanded, setTierExpanded] = useState(false);

  useEffect(() => {
    if (shieldPercent < ghostShield) {
      const timer = setTimeout(() => setGhostShield(shieldPercent), 450);
      return () => clearTimeout(timer);
    } else {
      setGhostShield(shieldPercent);
    }
  }, [shieldPercent, ghostShield]);

  useEffect(() => {
    if (healthPercent < ghostHealth) {
      const timer = setTimeout(() => setGhostHealth(healthPercent), 450);
      return () => clearTimeout(timer);
    } else {
      setGhostHealth(healthPercent);
    }
  }, [healthPercent, ghostHealth]);

  // Haptic feedback on critical damage
  useEffect(() => {
    if (healthPercent < 25 && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [healthPercent]);

  const distanceTier = Math.floor(distance / 100);
  const forceBoost = distanceTier * 5;
  const velocityBoost = distanceTier * 5;
  const hpBoost = distanceTier * 6;

  // Color mappings
  const shieldColor = colorblindSafe ? '#38bdf8' : 'var(--cyan)';
  const healthColor = colorblindSafe
    ? (healthPercent < 30 ? '#ff2d55' : healthPercent < 60 ? '#fbbf24' : '#22c55e')
    : (healthPercent < 30 ? 'var(--red)' : healthPercent < 60 ? 'var(--amber)' : 'var(--green)');

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-2 sm:p-4 font-sans text-white overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. LOW HEALTH & BOSS IMMINENT AMBIENT VIGNETTES
          ───────────────────────────────────────────────────────────────────────────── */}
      {healthPercent < 25 && (
        <div 
          className={`absolute inset-0 pointer-events-none z-0 ${
            reducedMotion ? 'bg-red-950/20' : 'bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(255,45,85,0.38)_100%)] animate-heartbeat'
          }`} 
        />
      )}

      {isBossImminent && (
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none z-0 bg-gradient-to-b from-red-600/20 to-transparent animate-pulse" />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. SLIM VERTICAL EDGE BARS (Left: Shields, Right: Hull)
          Leaves bottom 80% completely clear for ship flight!
          ───────────────────────────────────────────────────────────────────────────── */}
      {/* Deflector Shield Vertical Bar (Left Edge) */}
      <div 
        className={`absolute top-24 ${leftHanded ? 'right-2' : 'left-2'} z-20 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-md border shadow-lg`}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: stats.isShieldRecharging ? 'rgba(0, 229, 255, 0.7)' : 'var(--border)'
        }}
        title="Deflector Shields"
      >
        <Shield size={14} style={{ color: shieldColor }} className={stats.isShieldRecharging ? 'animate-pulse' : ''} />
        
        {/* Vertical Bar Track */}
        <div className="relative w-2 sm:w-2.5 h-28 sm:h-32 bg-slate-900/90 rounded-full overflow-hidden p-[1px] border border-cyan-950/60 shadow-inner flex flex-col justify-end">
          {/* Ghost Bar (Damage Trail) */}
          <div 
            className="w-full bg-cyan-300/40 rounded-full transition-all duration-500 ease-out absolute bottom-0"
            style={{ height: `${ghostShield}%` }}
          />
          {/* Active Shield Bar */}
          <div 
            className="w-full rounded-full transition-all duration-150 z-10"
            style={{ 
              height: `${shieldPercent}%`,
              background: stats.isShieldRecharging 
                ? 'linear-gradient(to top, #0284c7, #38bdf8, #ffffff)' 
                : 'linear-gradient(to top, #0284c7, var(--cyan))',
              boxShadow: shieldPercent > 0 ? '0 0 10px rgba(0, 229, 255, 0.6)' : 'none'
            }}
          />
        </div>

        <span className="text-[10px] font-mono-nums font-black" style={{ color: shieldColor }}>
          {Math.round(shieldPercent)}%
        </span>
      </div>

      {/* Hull Armor Integrity Vertical Bar (Right Edge) */}
      <div 
        className={`absolute top-24 ${leftHanded ? 'left-2' : 'right-2'} z-20 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-md border shadow-lg`}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: healthPercent < 30 ? 'rgba(255, 45, 85, 0.7)' : 'var(--border)'
        }}
        title="Hull Armor Integrity"
      >
        <Heart 
          size={14} 
          style={{ color: healthColor }} 
          className={healthPercent < 30 ? (reducedMotion ? '' : 'animate-ping') : ''} 
        />
        
        {/* Vertical Bar Track */}
        <div className="relative w-2 sm:w-2.5 h-28 sm:h-32 bg-slate-900/90 rounded-full overflow-hidden p-[1px] border border-slate-900 shadow-inner flex flex-col justify-end">
          {/* Ghost Bar (Damage Trail) */}
          <div 
            className="w-full bg-red-400/40 rounded-full transition-all duration-500 ease-out absolute bottom-0"
            style={{ height: `${ghostHealth}%` }}
          />
          {/* Active Hull Bar */}
          <div 
            className="w-full rounded-full transition-all duration-150 z-10"
            style={{ 
              height: `${healthPercent}%`,
              background: healthPercent < 30 
                ? 'linear-gradient(to top, #991b1b, var(--red))' 
                : healthPercent < 60 
                ? 'linear-gradient(to top, #d97706, var(--amber))' 
                : 'linear-gradient(to top, #059669, var(--green))',
              boxShadow: healthPercent < 30 ? '0 0 10px rgba(255, 45, 85, 0.8)' : '0 0 8px rgba(45, 255, 154, 0.5)'
            }}
          />
        </div>

        <span className="text-[10px] font-mono-nums font-black" style={{ color: healthColor }}>
          {Math.round(healthPercent)}%
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. COMPACT TOP HUD BAR (~56px height, grid aligned)
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="w-full flex flex-col gap-1.5 z-20 max-w-xl mx-auto">
        <header className="w-full h-14 backdrop-blur-md px-3 sm:px-4 rounded-2xl border flex items-center justify-between shadow-xl gap-2 pointer-events-auto"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)'
          }}
        >
          {/* Left: Player Lives (Glowing Hearts + Count) */}
          <div className="flex items-center gap-1.5 min-w-[70px]">
            <div className="flex items-center gap-1" title={`${stats.lives ?? 3} Lives Remaining`}>
              {Array.from({ length: stats.maxLives ?? 3 }).map((_, i) => {
                const hasLife = i < (stats.lives ?? 3);
                return (
                  <Heart 
                    key={i} 
                    size={15} 
                    className={`transition-all duration-200 ${
                      hasLife 
                        ? 'fill-rose-500 text-rose-400 drop-shadow-[0_0_6px_rgba(255,45,85,0.8)] scale-100' 
                        : 'text-slate-700 opacity-25 scale-90'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-xs font-mono-nums font-bold text-slate-300 ml-0.5">
              {stats.lives ?? 3}
            </span>
          </div>

          {/* Center: Distance Odometer / Score & Boss Incursion Progress Bar */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 px-2">
            <div className="flex items-center gap-2 max-w-full">
              {/* Distance or Score Readout */}
              <div className="flex items-center gap-1.5">
                <Compass size={13} className="text-pink-400 shrink-0" />
                <span className="font-display font-black text-sm sm:text-base tracking-wider tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-200 to-amber-300 truncate">
                  {isFreeFlight ? `${distance.toLocaleString()} m` : `${(stats.score || 0).toLocaleString()} PTS`}
                </span>
              </div>

              {/* Collapsible Tier Badge in Free Flight */}
              {isFreeFlight && (
                <button
                  onClick={() => setTierExpanded(!tierExpanded)}
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-mono-nums font-black tracking-wide border flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all shadow-sm"
                  style={{
                    backgroundColor: 'rgba(255, 61, 203, 0.15)',
                    borderColor: 'rgba(255, 61, 203, 0.45)',
                    color: 'var(--magenta)'
                  }}
                  title="Toggle Sector Threat Telemetry"
                >
                  <span>T{distanceTier}</span>
                  <span className="text-[8px] opacity-75">+{forceBoost}%</span>
                  <ChevronDown size={10} className={`transition-transform duration-200 ${tierExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Micro Incursion Bar / Swarm Target Bar */}
            <div className="w-full max-w-[170px] sm:max-w-[210px] mt-1 flex flex-col gap-0.5">
              <div className="flex justify-between text-[8px] text-slate-400 font-mono-nums leading-none">
                <span className="truncate">
                  {isFreeFlight ? 'NEXT BOSS' : 'SWARM VANGUARD'}
                </span>
                <span className="text-amber-400 font-bold shrink-0">
                  {isFreeFlight ? `${distanceToNextBoss}m` : `${killsInLevel}/${level.targetKills}`}
                </span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${isFreeFlight ? bossProgressPercent : waveProgress}%`,
                    background: isFreeFlight 
                      ? 'linear-gradient(to right, var(--magenta), #ec4899, var(--amber))'
                      : 'linear-gradient(to right, var(--cyan), var(--blue))'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right: Sound Toggle + Tactical Pause Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onToggleMute}
              className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={16} className="text-rose-400" /> : <Volume2 size={16} className="text-cyan-400" />}
            </button>
            <button
              onClick={onPause}
              className="h-9 px-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 flex items-center gap-1 transition-all cursor-pointer active:scale-95 font-tech font-bold text-xs"
              title="Pause Mission (P or ESC)"
              aria-label="Pause Game"
            >
              <Pause size={14} />
              <span className="hidden sm:inline">PAUSE</span>
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────────────────────
            4. TIER TELEMETRY EXPANDED FLYOUT (Free Flight Threat Breakdown)
            ───────────────────────────────────────────────────────────────────────────── */}
        {tierExpanded && isFreeFlight && (
          <div 
            className="w-full max-w-sm mx-auto backdrop-blur-md px-3.5 py-2 rounded-xl border shadow-xl flex items-center justify-between text-xs font-mono-nums pointer-events-auto"
            style={{
              backgroundColor: 'var(--surface-solid)',
              borderColor: 'var(--magenta)'
            }}
          >
            <span className="flex items-center gap-1 font-bold text-fuchsia-300 text-[11px]">
              <Activity size={12} className="text-pink-400 animate-pulse" />
              TIER {distanceTier} FORCE
            </span>
            <div className="flex items-center gap-3 text-[10px] text-slate-300">
              <span>VELOCITY: <strong className="text-amber-400">+{velocityBoost}%</strong></span>
              <span>ENEMY HP: <strong className="text-rose-400">+{hpBoost}%</strong></span>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            5. CONSOLIDATED HORIZONTAL POWER-UP TRAY
            One clean row under top bar: Spread, Missiles, Barrier, Overdrive.
            Replaces the redundant 45% bottom panel and missile status duplicate!
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="w-full flex items-center justify-center gap-2 flex-wrap pt-0.5">
          {/* Spread Cannon Weapon Chip */}
          <div 
            className="px-2.5 py-1 rounded-full backdrop-blur-md border flex items-center gap-1.5 shadow-md"
            style={{
              backgroundColor: 'rgba(10, 18, 40, 0.75)',
              borderColor: 'rgba(0, 229, 255, 0.35)'
            }}
            title={`Spread Level ${stats.spreadLevel}`}
          >
            <Crosshair size={12} className="text-cyan-400" />
            <span className="font-tech font-bold text-[11px] tracking-wide text-cyan-300">
              SPREAD L{stats.spreadLevel}
            </span>
          </div>

          {/* Swarm Missiles Power-Up Chip */}
          {stats.specialTimer > 0 && (
            <div 
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border flex items-center gap-1.5 shadow-md transition-all ${
                stats.specialTimer < 180 ? 'animate-pulse' : ''
              }`}
              style={{
                backgroundColor: 'rgba(255, 154, 46, 0.18)',
                borderColor: stats.specialTimer < 180 ? 'var(--red)' : 'var(--orange)'
              }}
              title="Swarm Missiles Active"
            >
              <Rocket size={12} className="text-orange-400 animate-bounce" />
              <span className="font-tech font-bold text-[11px] tracking-wide text-orange-200">
                MISSILES {(stats.specialTimer / 60).toFixed(1)}s
              </span>
              {/* Circular Mini Progress Ring */}
              <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255, 154, 46, 0.2)" strokeWidth="3" />
                <circle 
                  cx="10" cy="10" r="8" fill="none" stroke="var(--orange)" strokeWidth="3" 
                  strokeDasharray="50"
                  strokeDashoffset={50 - (50 * (stats.specialTimer / (stats.specialMaxTimer || 180)))}
                />
              </svg>
            </div>
          )}

          {/* Energy Barrier Power-Up Chip */}
          {stats.barrierTimer > 0 && (
            <div 
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border flex items-center gap-1.5 shadow-md transition-all ${
                stats.barrierTimer < 180 ? 'animate-pulse' : ''
              }`}
              style={{
                backgroundColor: 'rgba(0, 229, 255, 0.18)',
                borderColor: stats.barrierTimer < 180 ? 'var(--red)' : 'var(--cyan)'
              }}
              title="Energy Barrier Shield Active"
            >
              <Shield size={12} className="text-cyan-400" />
              <span className="font-tech font-bold text-[11px] tracking-wide text-cyan-200">
                BARRIER {(stats.barrierTimer / 60).toFixed(1)}s
              </span>
            </div>
          )}

          {/* Overdrive Power-Up Chip */}
          {stats.overdriveTimer > 0 && (
            <div 
              className="px-2.5 py-1 rounded-full backdrop-blur-md border flex items-center gap-1.5 shadow-md"
              style={{
                backgroundColor: 'rgba(255, 61, 203, 0.18)',
                borderColor: 'var(--magenta)'
              }}
              title="Overdrive Hypercharge Active"
            >
              <Zap size={12} className="text-pink-400" />
              <span className="font-tech font-bold text-[11px] tracking-wide text-pink-200">
                OVERDRIVE {(stats.overdriveTimer / 60).toFixed(1)}s
              </span>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            6. MODULAR BOSS HP BAR (When Active Boss Battles Occur)
            ───────────────────────────────────────────────────────────────────────────── */}
        {boss && (
          <div 
            className="w-full max-w-lg mx-auto backdrop-blur-md px-3.5 py-2 rounded-2xl border shadow-2xl mt-1 pointer-events-auto"
            style={{
              backgroundColor: 'var(--surface-solid)',
              borderColor: boss.enraged ? 'var(--red)' : 'rgba(255, 45, 85, 0.5)'
            }}
          >
            <div className="flex justify-between items-center mb-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="font-display font-black text-xs text-red-400 tracking-wider">
                  {boss.name.toUpperCase()}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950/80 text-rose-300 border border-red-800/60 font-bold hidden sm:inline">
                  {boss.title}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono-nums font-bold">
                {boss.hasKineticBarrier && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-400 animate-pulse font-bold">
                    SHIELDED
                  </span>
                )}
                <span className="text-amber-400 text-[10px]">
                  PHASE {boss.currentPhase}/{boss.phases}
                </span>
                <span className="text-white">
                  {Math.round(bossHpPercent)}%
                </span>
              </div>
            </div>

            {/* Boss Bar with Phase Dividers */}
            <div className="relative h-2.5 w-full bg-slate-950 rounded-full overflow-hidden p-[1px] border border-red-950">
              <div 
                className={`h-full rounded-full transition-all duration-100 ${
                  boss.enraged 
                    ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-300 animate-pulse' 
                    : 'bg-gradient-to-r from-red-600 to-amber-400'
                }`}
                style={{ width: `${bossHpPercent}%` }}
              />
              {Array.from({ length: boss.phases - 1 }).map((_, idx) => (
                <div 
                  key={idx}
                  className="absolute top-0 bottom-0 w-[2px] bg-slate-950/90 z-10"
                  style={{ left: `${((idx + 1) / boss.phases) * 100}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            7. BOSS INCURSION IMMINENT WARNING BANNER
            ───────────────────────────────────────────────────────────────────────────── */}
        {isBossImminent && !boss && (
          <div 
            className="w-full max-w-sm mx-auto backdrop-blur-md px-3 py-1.5 rounded-xl border flex items-center justify-center gap-2 animate-bounce shadow-2xl mt-1"
            style={{
              backgroundColor: 'rgba(255, 45, 85, 0.25)',
              borderColor: 'var(--red)',
              color: '#ffffff'
            }}
          >
            <AlertTriangle size={15} className="text-amber-400 animate-pulse" />
            <span className="font-display font-black text-xs tracking-wider text-rose-200">
              {isFreeFlight 
                ? `BOSS INCURSION IMMINENT: ${distanceToNextBoss}m` 
                : 'FLAGSHIP DREADNOUGHT APPROACHING'}
            </span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          8. BOTTOM THUMB ZONE: COMPLETELY CLEAR MOVEMENT AREA
          Only the circular, thumb-reachable EMP NUKE button sits in the corner!
          ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="w-full flex items-end justify-between pointer-events-none p-1 sm:p-2 z-20">
        {/* Left Side: Empty, or EMP Button if Left-Handed Mode */}
        <div className="pointer-events-auto">
          {leftHanded && (
            <button
              onClick={onTriggerBomb}
              disabled={stats.bombs <= 0}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center transition-all shadow-2xl active:scale-90 cursor-pointer ${
                stats.bombs > 0 
                  ? 'bg-gradient-to-br from-rose-600 to-red-700 border-red-300 text-white shadow-[0_0_25px_rgba(255,45,85,0.7)]' 
                  : 'bg-slate-950/70 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title="Detonate EMP Nuke (Press B or Space)"
              aria-label="Detonate EMP Nuke"
            >
              <Bomb size={22} className={stats.bombs > 0 ? 'animate-bounce' : ''} />
              <span className="font-tech font-bold text-[9px] tracking-widest uppercase mt-0.5">EMP</span>
              {stats.bombs > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center border border-white shadow">
                  {stats.bombs}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Center: Always completely clear for player ship & drag touch controls! */}
        <div className="flex-1" />

        {/* Right Side: Circular Thumb-Reachable EMP Button (Standard Mode) */}
        <div className="pointer-events-auto">
          {!leftHanded && (
            <button
              onClick={onTriggerBomb}
              disabled={stats.bombs <= 0}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center transition-all shadow-2xl active:scale-90 cursor-pointer ${
                stats.bombs > 0 
                  ? 'bg-gradient-to-br from-rose-600 to-red-700 border-red-300 text-white shadow-[0_0_25px_rgba(255,45,85,0.7)] hover:shadow-[0_0_35px_rgba(255,45,85,0.9)]' 
                  : 'bg-slate-950/70 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title="Detonate EMP Nuke (Press B or Space)"
              aria-label="Detonate EMP Nuke"
            >
              <Bomb size={22} className={stats.bombs > 0 ? 'animate-bounce' : ''} />
              <span className="font-tech font-bold text-[9px] tracking-widest uppercase mt-0.5">EMP</span>
              {stats.bombs > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center border border-white shadow">
                  {stats.bombs}
                </span>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
