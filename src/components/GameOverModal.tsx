import React from 'react';
import { motion } from 'motion/react';
import { Skull, RotateCcw, Grid, Trophy, Rocket, Infinity as InfinityIcon } from 'lucide-react';
import { LevelConfig } from '../types';
import { getStoredProfile } from '../profileStore';

interface GameOverModalProps {
  level: LevelConfig;
  score: number;
  lives?: number;
  distanceFlown?: number;
  isFreeFlight?: boolean;
  onRetry: () => void;
  onOpenLevelSelect: () => void;
  onOpenMenu?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  level,
  score,
  lives = 0,
  distanceFlown = 0,
  isFreeFlight = false,
  onRetry,
  onOpenLevelSelect,
  onOpenMenu
}) => {
  const profile = getStoredProfile();
  const isEndless = isFreeFlight || level.id === 99;
  const bestDistance = Math.max(profile.freeFlightBestDistance || 0, distanceFlown);
  const isNewDistanceRecord = isEndless && distanceFlown > 0 && distanceFlown >= (profile.freeFlightBestDistance || 0);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-md bg-slate-950/95 border-2 rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center shadow-2xl ${
          isEndless
            ? 'border-fuchsia-500/60 shadow-[0_0_60px_rgba(217,70,239,0.35)]'
            : 'border-red-500/60 shadow-[0_0_60px_rgba(239,68,68,0.3)]'
        }`}
      >
        {/* Header Icon */}
        <div className={`p-3.5 border rounded-2xl mb-3 shadow-lg ${
          isEndless
            ? 'bg-fuchsia-950/70 border-fuchsia-500/50 text-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.4)]'
            : 'bg-red-950/60 border-red-500/40 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
        }`}>
          {isEndless ? <InfinityIcon size={46} className="animate-spin-slow" /> : <Skull size={46} className="animate-pulse" />}
        </div>

        {/* Badge */}
        <div className={`text-xs font-black tracking-widest px-3 py-1 rounded-full border mb-2 ${
          isEndless
            ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/50'
            : 'bg-red-950/80 text-red-400 border-red-500/50'
        }`}>
          {isEndless ? 'SUBWAY SURFERS FREE FLIGHT' : `${level.sector} MISSION TERMINATED`}
        </div>

        {/* Title: Clearly GAME OVER */}
        <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-500 to-amber-400 tracking-tight">
          GAME OVER
        </h2>
        
        <p className="text-sm text-slate-400 mt-1 mb-5">
          {isEndless
            ? 'All lives expended! Flight telemetry and distance recorded.'
            : `Your starfighter was destroyed in ${level.name}.`}
        </p>

        {/* New Record Banner if applicable */}
        {isNewDistanceRecord && (
          <div className="w-full mb-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-yellow-400/50 text-amber-300 text-xs font-black tracking-wider flex items-center justify-center gap-2 animate-bounce">
            <Trophy size={15} className="text-yellow-400" />
            <span>NEW DISTANCE RECORD: {distanceFlown.toLocaleString()} m!</span>
          </div>
        )}

        {/* Telemetry / Score Box: distance traveled, score, and lives */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-5 flex flex-col gap-2.5">
          {/* Distance Traveled */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs text-slate-400 tracking-wider">DISTANCE TRAVELED</span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-300 to-amber-300">
              {distanceFlown.toLocaleString()} m
            </span>
          </div>

          {/* Final Score */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs text-slate-400 tracking-wider">FINAL SCORE</span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
              {score.toLocaleString()}
            </span>
          </div>

          {/* Lives Lost */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 tracking-wider">LIVES REMAINING</span>
            <span className="font-bold text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              0 / 3 Lives (Expended)
            </span>
          </div>

          {isEndless && (
            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span>ALL-TIME BEST: <strong className="text-white">{bestDistance.toLocaleString()} m</strong></span>
              <span>RECORD: <strong className="text-amber-400">{(profile.freeFlightHighScore || 0).toLocaleString()}</strong></span>
            </div>
          )}
        </div>

        {/* Action Buttons: Prominent RESTART GAME button */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onRetry}
            className={`w-full py-4 text-white font-black text-base sm:text-lg tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
              isEndless
                ? 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 hover:from-fuchsia-500 hover:to-pink-500 shadow-[0_0_30px_rgba(217,70,239,0.6)]'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
            }`}
          >
            <RotateCcw size={20} className="animate-spin-slow" />
            <span>RESTART GAME</span>
          </button>

          <button
            onClick={onOpenLevelSelect}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Grid size={15} />
            <span>SECTOR DIRECTORY</span>
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
