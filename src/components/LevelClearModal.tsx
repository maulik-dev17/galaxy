import React from 'react';
import { motion } from 'motion/react';
import { Star, ArrowRight, RotateCcw, Grid } from 'lucide-react';
import { LevelConfig } from '../types';

interface LevelClearModalProps {
  level: LevelConfig;
  score: number;
  stars: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onRetry: () => void;
  onOpenLevelSelect: () => void;
  onOpenMenu?: () => void;
}

export const LevelClearModal: React.FC<LevelClearModalProps> = ({
  level,
  score,
  stars,
  hasNextLevel,
  onNextLevel,
  onRetry,
  onOpenLevelSelect,
  onOpenMenu
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-950/95 border-2 border-cyan-400 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(6,182,212,0.35)] flex flex-col items-center"
      >
        <div className="text-xs font-black tracking-widest text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-500/50 mb-3">
          {level.sector} VICTORY
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 tracking-tight">
          SECTOR CLEARED!
        </h2>
        <p className="text-sm text-slate-400 mt-1 mb-6">
          Boss <strong className="text-white">{level.boss.name}</strong> Neutralized
        </p>

        {/* 3 Animated Stars */}
        <div className="flex justify-center items-center gap-3 my-2">
          {[1, 2, 3].map((starIdx) => (
            <motion.div
              key={starIdx}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15 * starIdx, type: 'spring' }}
            >
              <Star
                size={40}
                className={
                  starIdx <= stars
                    ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]'
                    : 'text-slate-800'
                }
              />
            </motion.div>
          ))}
        </div>

        {/* Score Box */}
        <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 my-6">
          <span className="text-xs text-slate-400 tracking-widest block mb-1">FINAL SECTOR SCORE</span>
          <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
            {score.toLocaleString()}
          </span>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-3">
          {hasNextLevel && (
            <button
              onClick={onNextLevel}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base tracking-widest rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.6)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <span>ADVANCE TO NEXT SECTOR</span>
              <ArrowRight size={18} />
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={onRetry}
              className="py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <RotateCcw size={15} /> REPLAY
            </button>
            <button
              onClick={onOpenLevelSelect}
              className="py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Grid size={15} /> SECTORS
            </button>
          </div>

          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className="w-full py-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded-xl border border-slate-800 font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              MAIN MENU
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
