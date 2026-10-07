import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rocket, Plane, ArrowUpCircle, Settings, 
  ChevronLeft, ChevronRight, Play, Volume2, VolumeX, Grid,
  Infinity as InfinityIcon, Compass, Trophy, Star, Lock,
  Sliders, Eye, Hand, Sparkles
} from 'lucide-react';
import { PilotProfile, getStoredProfile, saveProfile, INITIAL_SHIPS, getStoredSettings, saveSettings } from '../profileStore';
import { LEVELS } from '../levels';
import { sound } from '../audio';
import { ASSETS } from '../assets/images';
import { 
  HangarModal, UpgradesModal, ShipCanvasPreview 
} from './MenuModals';
import { LevelSelectModal } from './LevelSelectModal';
import { GameSettings } from '../types';

interface MainMenuProps {
  onStartGame: (sectorId: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  completedSectors: number;
  settings?: GameSettings;
  onUpdateSettings?: (settings: Partial<GameSettings>) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  isMuted,
  onToggleMute,
  completedSectors,
  settings: propSettings,
  onUpdateSettings
}) => {
  const [profile, setProfile] = useState<PilotProfile>(() => getStoredProfile());
  const [settings, setSettings] = useState<GameSettings>(() => propSettings || getStoredSettings());

  // Default sector selector to player's NEXT UNLOCKED sector, not Sector 10/HELL!
  const defaultNextSector = Math.min(10, Math.max(1, completedSectors + 1));
  const [selectedSector, setSelectedSector] = useState<number>(() => {
    return profile.selectedSector && profile.selectedSector <= defaultNextSector
      ? profile.selectedSector
      : defaultNextSector;
  });

  const [gameMode, setGameMode] = useState<'campaign' | 'free_flight'>('campaign');

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    'hangar' | 'upgrades' | 'settings' | 'sector_map' | null
  >(null);

  // Sync profile changes to localStorage
  const updateProfile = (updated: Partial<PilotProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      saveProfile(next);
      return next;
    });
  };

  const updateGameSettings = (updated: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updated };
      saveSettings(next);
      if (onUpdateSettings) onUpdateSettings(next);
      return next;
    });
  };

  const handleSectorChange = (delta: number) => {
    sound.playMenuClick();
    setSelectedSector((prev) => {
      let next = prev + delta;
      if (next < 1) next = 10;
      if (next > 10) next = 1;
      updateProfile({ selectedSector: next });
      return next;
    });
  };

  const currentLevelConfig = LEVELS.find((l) => l.id === selectedSector) || LEVELS[0];
  const activeShip = INITIAL_SHIPS.find((s) => s.id === profile.selectedShip) || INITIAL_SHIPS[0];
  const isSectorUnlocked = selectedSector <= (completedSectors + 1);

  // Check if an upgrade is affordable to light up the "NEW" indicator
  const hasAffordableUpgrade = [
    { level: profile.upgrades?.spreadLevel || 1, max: 4, cost: 2500 * (profile.upgrades?.spreadLevel || 1) },
    { level: Math.round(((profile.upgrades?.shieldCapacity || 100) - 100) / 25) + 1, max: 5, cost: 2000 * (Math.round(((profile.upgrades?.shieldCapacity || 100) - 100) / 25) + 1) },
    { level: profile.upgrades?.bombCount || 2, max: 4, cost: 3000 * (profile.upgrades?.bombCount || 2) }
  ].some((u) => u.level < u.max && profile.coins >= u.cost);

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Normal':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-600/50';
      case 'Hard':
        return 'bg-amber-950/80 text-amber-400 border-amber-600/50';
      case 'Extreme':
        return 'bg-orange-950/80 text-orange-400 border-orange-600/50';
      case 'Nightmare':
        return 'bg-purple-950/80 text-purple-400 border-purple-600/50';
      case 'Hell':
      default:
        return 'bg-rose-950/80 text-rose-400 border-rose-600/50 animate-pulse';
    }
  };

  return (
    <div className="relative w-full h-screen max-h-[100dvh] bg-[#030712] text-white font-sans select-none overflow-hidden flex flex-col justify-between p-2.5 sm:p-4">
      {/* ─────────────────────────────────────────────────────────────────────────────
          BACKGROUND HERO CANVAS & COSMIC NEBULA (With AA legibility scrim)
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img 
          src={ASSETS.menuBg} 
          alt="Galaxy Background" 
          className="w-full h-full object-cover object-center opacity-65 filter brightness-95"
        />
        {/* Darkening Gradients for AAA contrast and UI legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1)_0%,rgba(147,51,234,0.08)_50%,transparent_75%)]" />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          1. TOP NAVIGATION BAR (Brand pill + Audio + Settings)
          ───────────────────────────────────────────────────────────────────────────── */}
      <header className="relative z-10 w-full flex items-center justify-between gap-2 max-w-lg mx-auto shrink-0 pt-0.5">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-tech font-bold tracking-widest backdrop-blur-md shadow-md">
          <Rocket size={13} className="text-cyan-400" />
          <span>GALAXY SHOOTER</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Audio Sound Toggle */}
          <button 
            onClick={onToggleMute}
            className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 text-slate-300 hover:text-white transition-all shadow flex items-center justify-center cursor-pointer active:scale-95"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX size={17} className="text-rose-400" /> : <Volume2 size={17} className="text-cyan-400" />}
          </button>

          {/* Quick Settings */}
          <button 
            onClick={() => { sound.playMenuClick(); setActiveModal('settings'); }}
            className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 text-slate-300 hover:text-white transition-all shadow flex items-center justify-center cursor-pointer active:scale-95"
            title="Controls & Settings"
            aria-label="Settings"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. COMPACT HERO TITLE (~18% of height)
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center my-auto shrink-0 py-1">
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight leading-none filter drop-shadow-[0_0_35px_rgba(0,229,255,0.5)]">
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-blue-400 tracking-wider">
            GALAXY
          </span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-400 to-purple-500 tracking-wider -mt-1 drop-shadow-[0_0_25px_rgba(255,61,203,0.7)]">
            SHOOTER
          </span>
        </h1>

        <div className="flex items-center gap-2 mt-1.5">
          <div className="h-[1px] w-8 sm:w-14 bg-gradient-to-r from-transparent to-cyan-400" />
          <p className="text-[10px] text-cyan-300 tracking-[0.2em] font-tech font-bold uppercase">
            NEON ARCADE STARFIGHTER
          </p>
          <div className="h-[1px] w-8 sm:w-14 bg-gradient-to-l from-transparent to-cyan-400" />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. CONTEXTUAL MAIN CONTROLS (Mode Toggle -> Contextual Panel -> Single Play CTA)
          ───────────────────────────────────────────────────────────────────────────── */}
      <main className="relative z-10 w-full max-w-md mx-auto flex flex-col gap-2.5 shrink-0 my-auto">
        {/* Animated Segmented Mode Toggle (Campaign | Free Flight) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-md shadow-xl">
          <button
            onClick={() => { sound.playMenuClick(); setGameMode('campaign'); }}
            className={`flex-1 py-2 px-3 rounded-xl font-display font-black text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              gameMode === 'campaign'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(0,229,255,0.45)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass size={13} />
            <span>CAMPAIGN</span>
          </button>

          <button
            onClick={() => { sound.playMenuClick(); setGameMode('free_flight'); }}
            className={`flex-1 py-2 px-3 rounded-xl font-display font-black text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              gameMode === 'free_flight'
                ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-[0_0_15px_rgba(255,61,203,0.45)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <InfinityIcon size={13} className="text-pink-300" />
            <span>FREE FLIGHT</span>
          </button>
        </div>

        {/* ── Contextual Panel (Campaign Sector Carousel OR Free Flight Stats) ── */}
        {gameMode === 'campaign' ? (
          <div 
            className="w-full backdrop-blur-md px-3 py-2.5 rounded-2xl border flex flex-col gap-2 shadow-xl"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)'
            }}
          >
            {/* Sector Selector Header with Prev / Next Carousel */}
            <div className="flex items-center justify-between gap-2">
              <button 
                onClick={() => handleSectorChange(-1)}
                className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                title="Previous Sector"
                aria-label="Previous Sector"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex flex-col items-center text-center flex-1 min-w-0 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-tech text-xs font-black tracking-widest text-cyan-300">
                    SECTOR {selectedSector < 10 ? `0${selectedSector}` : selectedSector} / 10
                  </span>
                  <span className={`text-[9px] font-tech font-bold px-1.5 py-0.2 rounded-full border ${getDifficultyBadge(currentLevelConfig.difficulty)}`}>
                    {currentLevelConfig.difficulty}
                  </span>
                  {!isSectorUnlocked && (
                    <span className="text-[9px] font-tech font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-600/60 flex items-center gap-0.5">
                      <Lock size={9} /> LOCKED
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-sm sm:text-base text-white truncate max-w-full leading-tight mt-0.5">
                  {currentLevelConfig.name}
                </h3>

                <p className="text-[11px] text-slate-400 font-tech truncate max-w-full">
                  Boss: <strong className="text-slate-200">{currentLevelConfig.boss.name}</strong> • {currentLevelConfig.subtitle}
                </p>
              </div>

              <button 
                onClick={() => handleSectorChange(1)}
                className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                title="Next Sector"
                aria-label="Next Sector"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Obvious "Browse Sectors" Entry Point Button */}
            <button
              onClick={() => { sound.playMenuClick(); setActiveModal('sector_map'); }}
              className="w-full py-1.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-300 hover:text-white font-tech font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
            >
              <Grid size={13} className="text-cyan-400" />
              <span>BROWSE ALL 10 SECTORS DIRECTORY →</span>
            </button>
          </div>
        ) : (
          <div 
            className="w-full backdrop-blur-md px-3.5 py-2.5 rounded-2xl border flex flex-col gap-1.5 shadow-xl text-left"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'rgba(255, 61, 203, 0.4)'
            }}
          >
            <div className="flex justify-between items-center text-xs">
              <span className="font-display font-bold text-xs tracking-wider text-fuchsia-300 flex items-center gap-1.5">
                <InfinityIcon size={14} className="text-pink-400" />
                ENDLESS FREE FLIGHT
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-500/50 font-tech font-bold">
                ENDLESS
              </span>
            </div>

            {/* Single-line Compact Stats Row with Icons */}
            <div className="flex items-center justify-between text-xs font-mono-nums text-slate-300 py-0.5">
              <span className="flex items-center gap-1">
                <Trophy size={12} className="text-amber-400" />
                Best: <strong className="text-white">{(profile.freeFlightBestDistance || 0).toLocaleString()} m</strong>
              </span>
              <span className="text-slate-500">|</span>
              <span>Boss/600 m</span>
              <span className="text-slate-500">|</span>
              <span className="text-rose-400">+5%/100 m</span>
            </div>

            <p className="text-[11px] text-slate-400 font-tech leading-tight">
              Uncapped voyage! Fly until hull failure. Incursion bosses arrive every 600m with power-up loot.
            </p>
          </div>
        )}

        {/* ── Active Starfighter Compact Strip (Single Line, Ellipsis) ── */}
        <div 
          onClick={() => { sound.playMenuClick(); setActiveModal('hangar'); }}
          className="w-full flex items-center justify-between backdrop-blur-md border rounded-2xl px-3 py-2 cursor-pointer transition-all hover:bg-slate-900/90 active:scale-98"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border-dim)'
          }}
          title="Commission Starfighter in Hangar"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-9 h-9 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border shadow-inner shrink-0"
              style={{ borderColor: `${activeShip.color}70` }}
            >
              <ShipCanvasPreview shipId={activeShip.id} width={36} height={36} scale={0.32} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[9px] text-slate-400 block font-tech uppercase tracking-wider leading-none">
                ACTIVE SHIP
              </span>
              <span className="text-xs font-display font-bold text-white tracking-wide truncate block max-w-[170px] sm:max-w-xs mt-0.5">
                {activeShip.name}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-tech font-bold text-cyan-400 tracking-wider shrink-0 hover:underline">
            CHANGE →
          </span>
        </div>

        {/* ── ONE Single Primary PLAY Action Button (Driven by Toggle) ── */}
        <button
          onClick={() => {
            sound.playRewardClaim();
            onStartGame(gameMode === 'campaign' ? selectedSector : 99);
          }}
          disabled={gameMode === 'campaign' && !isSectorUnlocked}
          className={`group relative w-full py-3.5 sm:py-4 px-6 rounded-2xl font-display font-black text-base sm:text-lg tracking-wider uppercase transition-all duration-200 transform active:scale-96 flex items-center justify-center gap-2.5 cursor-pointer shadow-xl truncate ${
            gameMode === 'campaign' && !isSectorUnlocked
              ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
              : gameMode === 'campaign'
              ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-400 hover:from-cyan-400 hover:to-blue-500 text-white border border-cyan-200 shadow-[0_0_35px_rgba(0,229,255,0.7)]'
              : 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 hover:from-fuchsia-500 hover:to-pink-500 text-white border border-fuchsia-200 shadow-[0_0_35px_rgba(255,61,203,0.75)]'
          }`}
        >
          <Play size={20} className="fill-white text-white shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate">
            {gameMode === 'campaign'
              ? isSectorUnlocked 
                ? `START MISSION • SEC ${selectedSector < 10 ? `0${selectedSector}` : selectedSector}`
                : 'SECTOR LOCKED'
              : 'LAUNCH FREE FLIGHT'}
          </span>
        </button>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. PROMOTED BOTTOM NAVIGATION BAR (Hangar, Upgrades, Sectors)
          ───────────────────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 w-full max-w-md mx-auto grid grid-cols-3 gap-2 shrink-0 pt-1 pb-0.5">
        {/* Hangar Tab with Ship Count Badge */}
        <button
          onClick={() => { sound.playMenuClick(); setActiveModal('hangar'); }}
          className="relative py-2.5 px-2 rounded-xl backdrop-blur-md border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-white font-tech font-bold text-xs tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <Plane size={16} className="text-cyan-400" />
          <div className="flex items-center gap-1 leading-none">
            <span>HANGAR</span>
            <span className="text-[10px] px-1 py-0.2 rounded-full bg-cyan-950 text-cyan-300 font-mono-nums font-black border border-cyan-600/50">
              9
            </span>
          </div>
        </button>

        {/* Upgrades Tab with NEW indicator dot */}
        <button
          onClick={() => { sound.playMenuClick(); setActiveModal('upgrades'); }}
          className="relative py-2.5 px-2 rounded-xl backdrop-blur-md border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-white font-tech font-bold text-xs tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <ArrowUpCircle size={16} className="text-indigo-400" />
          <div className="flex items-center gap-1 leading-none">
            <span>UPGRADES</span>
            {hasAffordableUpgrade && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="Affordable upgrade ready!" />
            )}
          </div>
        </button>

        {/* Sectors Directory Tab */}
        <button
          onClick={() => { sound.playMenuClick(); setActiveModal('sector_map'); }}
          className="relative py-2.5 px-2 rounded-xl backdrop-blur-md border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-white font-tech font-bold text-xs tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <Grid size={16} className="text-purple-400" />
          <div className="flex items-center gap-1 leading-none">
            <span>SECTORS</span>
          </div>
        </button>
      </nav>

      {/* ─────────────────────────────────────────────────────────────────────────────
          INTERACTIVE MODAL OVERLAYS
          ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeModal === 'hangar' && (
          <HangarModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            profile={profile}
            onUpdateProfile={updateProfile}
          />
        )}
        {activeModal === 'upgrades' && (
          <UpgradesModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            profile={profile}
            onUpdateProfile={updateProfile}
          />
        )}
        {activeModal === 'sector_map' && (
          <LevelSelectModal
            onClose={() => setActiveModal(null)}
            onSelectLevel={(id) => {
              setSelectedSector(id);
              updateProfile({ selectedSector: id });
              setActiveModal(null);
            }}
            selectedLevelId={selectedSector}
            progress={LEVELS.reduce((acc, lvl) => {
              acc[lvl.id] = {
                levelId: lvl.id,
                unlocked: lvl.id <= (completedSectors + 1),
                completed: lvl.id <= completedSectors,
                highScore: 10000 * lvl.id,
                stars: lvl.id <= completedSectors ? 3 : 0
              };
              return acc;
            }, {} as Record<number, any>)}
          />
        )}
        {activeModal === 'settings' && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none font-sans"
            onClick={() => setActiveModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border p-5 sm:p-6 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto"
              style={{
                backgroundColor: 'var(--surface-solid)',
                borderColor: 'var(--border)'
              }}
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-display font-black text-base text-white tracking-wide flex items-center gap-2">
                  <Sliders size={18} className="text-cyan-400" />
                  SETTINGS // SYSTEM CONTROLS
                </h3>
              </div>

              {/* Master Audio */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <div>
                  <span className="font-tech font-bold text-sm text-slate-200 block">Master Sound FX</span>
                  <span className="text-[11px] text-slate-400 font-tech">Sound effects & combat audio</span>
                </div>
                <button 
                  onClick={onToggleMute}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 font-tech font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isMuted ? <VolumeX size={16} className="text-rose-400" /> : <Volume2 size={16} />}
                  <span>{isMuted ? 'MUTED' : 'ENABLED'}</span>
                </button>
              </div>

              {/* Left-Handed Mode */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <div>
                  <span className="font-tech font-bold text-sm text-slate-200 block flex items-center gap-1.5">
                    <Hand size={14} className="text-cyan-400" />
                    Left-Handed Layout
                  </span>
                  <span className="text-[11px] text-slate-400 font-tech">Swaps EMP button to left thumb</span>
                </div>
                <button 
                  onClick={() => updateGameSettings({ leftHanded: !settings.leftHanded })}
                  className={`px-3 py-1.5 rounded-xl border font-tech font-bold text-xs transition-all cursor-pointer ${
                    settings.leftHanded
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.leftHanded ? 'ON (LEFT)' : 'OFF (RIGHT)'}
                </button>
              </div>

              {/* Colorblind-Safe Mode */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <div>
                  <span className="font-tech font-bold text-sm text-slate-200 block flex items-center gap-1.5">
                    <Eye size={14} className="text-cyan-400" />
                    Colorblind-Safe Palette
                  </span>
                  <span className="text-[11px] text-slate-400 font-tech">High-contrast icons & colors</span>
                </div>
                <button 
                  onClick={() => updateGameSettings({ colorblindSafe: !settings.colorblindSafe })}
                  className={`px-3 py-1.5 rounded-xl border font-tech font-bold text-xs transition-all cursor-pointer ${
                    settings.colorblindSafe
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.colorblindSafe ? 'ACTIVE' : 'DEFAULT'}
                </button>
              </div>

              {/* Reduced Motion Toggle */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <div>
                  <span className="font-tech font-bold text-sm text-slate-200 block flex items-center gap-1.5">
                    <Sparkles size={14} className="text-cyan-400" />
                    Reduced Motion
                  </span>
                  <span className="text-[11px] text-slate-400 font-tech">Disables heavy shake & flashes</span>
                </div>
                <button 
                  onClick={() => updateGameSettings({ reducedMotion: !settings.reducedMotion })}
                  className={`px-3 py-1.5 rounded-xl border font-tech font-bold text-xs transition-all cursor-pointer ${
                    settings.reducedMotion
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.reducedMotion ? 'ENABLED' : 'OFF'}
                </button>
              </div>

              {/* Flight Navigation Reference */}
              <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-1 font-tech">
                <span className="text-cyan-300 font-bold block mb-1">TACTICAL CONTROLS:</span>
                <p><strong className="text-white">TOUCH DRAG / WASD / MOUSE:</strong> Flight Navigation</p>
                <p><strong className="text-white">AUTO-FIRE / SPACE:</strong> Twin Plasma Cannons</p>
                <p><strong className="text-white">EMP BUTTON / B:</strong> Tactical EMP Nuke</p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="mt-1 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-black text-xs tracking-wider border border-slate-700 cursor-pointer active:scale-95"
              >
                APPLY & CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
