import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Star, Play, ShieldAlert, Award, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { LEVELS } from '../levels';
import { LevelProgress, LevelConfig } from '../types';
import { sound } from '../audio';

interface LevelSelectModalProps {
  progress: Record<number, LevelProgress>;
  selectedLevelId: number;
  onSelectLevel: (levelId: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  progress,
  selectedLevelId: initialSelectedId,
  onSelectLevel,
  onClose
}) => {
  const [selectedId, setSelectedId] = useState<number>(initialSelectedId);

  const getDifficultyBadge = (diff: LevelConfig['difficulty']) => {
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

  const selectedLevel = LEVELS.find((l) => l.id === selectedId) || LEVELS[0];
  const selectedProgress = progress[selectedId] || { unlocked: selectedId === 1, completed: false, highScore: 0, stars: 0 };
  const canDeploy = selectedProgress.unlocked;

  // Determine the next recommended unlocked sector
  const nextRecommendedId = LEVELS.find((l) => {
    const p = progress[l.id];
    return p?.unlocked && !p?.completed;
  })?.id || 1;

  const handleCardClick = (levelId: number, isUnlocked: boolean) => {
    if (!isUnlocked) {
      sound.playEnemyShoot();
      return;
    }
    sound.playMenuClick();
    setSelectedId(levelId);
  };

  const handleDeploy = () => {
    if (canDeploy) {
      sound.playRewardClaim();
      onSelectLevel(selectedId);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 select-none font-sans"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--surface-solid)',
          borderColor: 'var(--border)'
        }}
      >
        {/* ─────────────────────────────────────────────────────────────────────────────
            1. STICKY HEADER (Back Button + Title + Subtitle)
            ───────────────────────────────────────────────────────────────────────────── */}
        <header className="px-4 py-3.5 sm:px-6 sm:py-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'rgba(5, 8, 22, 0.85)',
            borderColor: 'var(--border-dim)'
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => { sound.playMenuClick(); onClose(); }}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
              title="Return to Main Menu"
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="font-display font-black text-base sm:text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-300 to-blue-400">
                CAMPAIGN SECTOR DIRECTORY
              </h2>
              <p className="text-[11px] text-slate-400 font-tech">
                10 Hardcore Sectors • Defeat all Bosses to liberate the galaxy
              </p>
            </div>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────────────────────
            2. COMPACT SCROLLABLE SECTOR LIST (~88-96px cards, 4+ visible)
            ───────────────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {LEVELS.map((lvl) => {
            const p = progress[lvl.id] || { 
              unlocked: lvl.id === 1, 
              completed: false, 
              highScore: 0, 
              stars: 0 
            };
            const isUnlocked = p.unlocked;
            const isSelected = selectedId === lvl.id;
            const isRecommended = lvl.id === nextRecommendedId;

            return (
              <div
                key={lvl.id}
                onClick={() => handleCardClick(lvl.id, isUnlocked)}
                className={`relative rounded-2xl border p-3 transition-all duration-150 flex items-center justify-between gap-3 text-left ${
                  !isUnlocked
                    ? 'bg-slate-950/40 border-slate-800/50 opacity-55 cursor-not-allowed'
                    : isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.25)] ring-1 ring-cyan-400/80 cursor-pointer'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/90 cursor-pointer'
                }`}
              >
                {/* Left: Sector Number & Visual Thumbnail Badge */}
                <div 
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex flex-col items-center justify-center shrink-0 shadow-inner ${
                    !isUnlocked
                      ? 'bg-slate-950 border-slate-800 text-slate-600'
                      : isSelected
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                  style={{
                    boxShadow: isSelected ? 'inset 0 0 12px rgba(0, 229, 255, 0.3)' : 'none'
                  }}
                >
                  <span className="font-tech text-[9px] tracking-widest uppercase">SEC</span>
                  <span className="font-display font-black text-base sm:text-lg leading-none">
                    {lvl.id < 10 ? `0${lvl.id}` : lvl.id}
                  </span>
                </div>

                {/* Center: Sector Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h3 className="font-display font-bold text-sm text-white truncate max-w-[160px] sm:max-w-xs">
                      {lvl.name}
                    </h3>
                    <span className={`text-[9px] font-tech font-bold px-1.5 py-0.2 rounded-full border ${getDifficultyBadge(lvl.difficulty)}`}>
                      {lvl.difficulty}
                    </span>
                    {isRecommended && (
                      <span className="text-[9px] font-mono-nums font-black px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-400 animate-pulse">
                        NEXT
                      </span>
                    )}
                    {p.completed && (
                      <span className="text-[9px] font-tech font-bold px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 flex items-center gap-0.5">
                        <CheckCircle2 size={10} /> CLEAR
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 font-tech truncate">
                    {lvl.subtitle} • <span className="text-slate-300 font-medium">{lvl.threatRating}</span>
                  </p>

                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-300">
                    <span className="flex items-center gap-1">
                      <ShieldAlert size={12} className="text-rose-400 shrink-0" />
                      <strong className="text-white truncate font-medium max-w-[110px] sm:max-w-none">{lvl.boss.name}</strong>
                    </span>
                    {p.highScore > 0 && (
                      <span className="text-amber-400 font-mono-nums font-bold flex items-center gap-1 hidden sm:inline-flex">
                        <Award size={11} /> {p.highScore.toLocaleString()} PTS
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Honest Star Rating or Padlock */}
                <div className="shrink-0 flex flex-col items-end justify-center min-w-[65px]">
                  {isUnlocked ? (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((starNum) => {
                        const isFilled = starNum <= p.stars;
                        return (
                          <Star
                            key={starNum}
                            size={14}
                            className={`transition-colors ${
                              isFilled
                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]'
                                : 'text-slate-700'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-tech font-bold">
                      <Lock size={12} />
                      <span>LOCKED</span>
                    </div>
                  )}

                  {!isUnlocked && (
                    <span className="text-[9px] text-slate-500 font-tech mt-0.5">
                      Clear Sec {lvl.id - 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            3. STICKY FOOTER: ONE FULL-WIDTH SINGLE-LINE "DEPLOY" BUTTON
            ───────────────────────────────────────────────────────────────────────────── */}
        <footer className="p-3 sm:p-4 border-t shrink-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(5, 8, 22, 0.95)',
            borderColor: 'var(--border-dim)'
          }}
        >
          <button
            onClick={handleDeploy}
            disabled={!canDeploy}
            className={`w-full py-3.5 px-4 rounded-xl font-display font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg truncate ${
              canDeploy
                ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-400 hover:from-cyan-400 hover:to-blue-500 text-white border border-cyan-300 shadow-[0_0_25px_rgba(0,229,255,0.4)]'
                : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <Play size={15} className={canDeploy ? 'fill-white text-white' : ''} />
            <span className="truncate">
              {canDeploy 
                ? `DEPLOY TO SECTOR ${selectedLevel.id < 10 ? `0${selectedLevel.id}` : selectedLevel.id} • ${selectedLevel.name.toUpperCase()}`
                : 'SECTOR LOCKED'}
            </span>
          </button>
        </footer>
      </motion.div>
    </div>
  );
};
