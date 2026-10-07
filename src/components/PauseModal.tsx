import React from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, Grid, Volume2, VolumeX } from 'lucide-react';
import { LevelConfig } from '../types';

interface PauseModalProps {
  level: LevelConfig;
  isMuted: boolean;
  onResume: () => void;
  onRetry: () => void;
  onOpenLevelSelect: () => void;
  onOpenMenu?: () => void;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  level,
  isMuted,
  onResume,
  onRetry,
  onOpenLevelSelect,
  onOpenMenu,
  onToggleMute
}) => {
  return (
    <div
      onClick={onResume}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-mono cursor-pointer"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-slate-950/95 border border-cyan-500/50 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(6,182,212,0.35)] flex flex-col items-center cursor-default"
      >
        <span className="text-xs font-bold text-cyan-400 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-800 mb-2">
          {level.sector}
        </span>
        <h2 className="text-3xl font-black text-white tracking-wider mb-1">TACTICAL PAUSE</h2>
        <p className="text-xs text-slate-400 mb-4">{level.name}</p>

        <p className="text-[11px] text-cyan-300 font-bold bg-cyan-950/60 px-3 py-1.5 rounded-lg border border-cyan-500/30 mb-5 animate-pulse">
          PRESS [P], [SPACE], OR [ESC] TO RESUME
        </p>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm tracking-widest rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-cyan-300"
          >
            <Play size={18} fill="currentColor" /> RESUME MISSION
          </button>

          <button
            onClick={onRetry}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw size={15} /> RESTART SECTOR
          </button>

          <button
            onClick={onOpenLevelSelect}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Grid size={15} /> SECTOR DIRECTORY
          </button>

          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className="w-full py-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              MAIN MENU
            </button>
          )}

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-xl border border-slate-800 font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all mt-1"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>{isMuted ? 'SOUND: OFF' : 'SOUND: ON'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
