import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, RotateCcw, Grid } from 'lucide-react';

interface VictoryModalProps {
  finalScore: number;
  totalStars: number;
  onRestartCampaign: () => void;
  onOpenLevelSelect: () => void;
  onOpenMenu?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  finalScore,
  totalStars,
  onRestartCampaign,
  onOpenLevelSelect,
  onOpenMenu
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-950/95 border-2 border-yellow-400 rounded-3xl p-6 sm:p-10 text-center shadow-[0_0_80px_rgba(250,204,21,0.4)] flex flex-col items-center"
      >
        <div className="p-4 bg-yellow-950/60 border border-yellow-400/50 rounded-3xl mb-4 text-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)]">
          <Trophy size={60} className="animate-bounce" />
        </div>

        <div className="text-xs font-black tracking-widest text-yellow-400 bg-yellow-950/80 px-4 py-1 rounded-full border border-yellow-500/50 mb-3">
          10/10 SECTORS LIBERATED
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 tracking-tight">
          GALAXY CONQUERED!
        </h1>
        <p className="text-sm text-slate-300 mt-2 mb-6">
          The Omega Sovereign and its alien swarms have been eradicated. You have proven yourself as the supreme galaxy ace pilot!
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 tracking-widest block mb-1">TOTAL CAMPAIGN SCORE</span>
            <span className="text-2xl sm:text-3xl font-black text-yellow-400">
              {finalScore.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
            <span className="text-[11px] text-slate-400 tracking-widest block mb-1">STARS EARNED</span>
            <div className="flex items-center gap-1.5 text-yellow-400 font-black text-2xl sm:text-3xl">
              <Star size={24} className="fill-yellow-400" />
              <span>{totalStars} / 30</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onRestartCampaign}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-base tracking-widest rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.6)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw size={18} />
            <span>PLAY AGAIN (NEW GAME+)</span>
          </button>

          <button
            onClick={onOpenLevelSelect}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Grid size={15} />
            <span>VIEW ALL SECTORS</span>
          </button>

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
