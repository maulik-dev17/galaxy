import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, ChevronRight, Shield, Zap, Rocket, Award, 
  Coins, Gem, Volume2, VolumeX, Crosshair, ArrowUp, ShoppingCart, 
  Gift, Mail, Play, AlertTriangle, Star, Trophy
} from 'lucide-react';
import { PilotProfile, INITIAL_SHIPS, ShipInfo } from '../profileStore';
import { sound } from '../audio';
import { ASSETS } from '../assets/images';
import { LEVELS } from '../levels';
import { drawShipPreview } from '../canvas/entities';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PilotProfile;
  onUpdateProfile: (updated: Partial<PilotProfile>) => void;
  onStartMission?: (sectorId: number) => void;
}

export const ShipCanvasPreview: React.FC<{
  shipId: string;
  width?: number;
  height?: number;
  scale?: number;
  className?: string;
}> = ({ shipId, width = 240, height = 180, scale = 0.85, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    let time = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      time++;
      drawShipPreview(ctx, shipId, width, height, time, scale);
      animId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animId);
  }, [shipId, width, height, scale]);

  return <canvas ref={canvasRef} width={width} height={height} className={className} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. HANGAR / SHIPS MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const HangarModal: React.FC<ModalProps> = ({ isOpen, onClose, profile, onUpdateProfile }) => {
  const [selected, setSelected] = useState<ShipInfo['id']>(profile.selectedShip);

  if (!isOpen) return null;

  const currentShip = INITIAL_SHIPS.find((s) => s.id === selected) || INITIAL_SHIPS[0];
  const isUnlocked = true; // All commissioned fleet ships available for trial and flight

  const handleSelect = (ship: ShipInfo) => {
    sound.playRewardClaim();
    onUpdateProfile({ selectedShip: ship.id });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Rocket className="text-cyan-400" size={28} />
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 tracking-wider">
                FLEET HANGAR // 9 COMBAT STARFIGHTERS
              </h2>
              <p className="text-xs text-slate-400">Each ship features custom 3D hull geometry, bespoke armaments, and flight profiles</p>
            </div>
          </div>
          <button 
            onClick={() => { sound.playMenuClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid of Ships */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {/* Ship List */}
          <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
            {INITIAL_SHIPS.map((ship) => {
              const active = selected === ship.id;
              const equipped = profile.selectedShip === ship.id;

              return (
                <div
                  key={ship.id}
                  onClick={() => { sound.playMenuHover(); setSelected(ship.id); }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    active
                      ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center border shadow-inner overflow-hidden bg-slate-950/80"
                      style={{ borderColor: `${ship.color}60` }}
                    >
                      <ShipCanvasPreview shipId={ship.id} width={56} height={56} scale={0.42} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm tracking-wide">{ship.name}</span>
                        {equipped && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/50 font-black">
                            EQUIPPED
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{ship.title}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-400">READY</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Ship Detail Stage */}
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-black text-white">{currentShip.name}</h3>
                  <span className="text-xs text-cyan-400 font-semibold">{currentShip.title}</span>
                </div>
                <div 
                  className="px-3 py-1 rounded-full text-xs font-bold border"
                  style={{ color: currentShip.color, borderColor: `${currentShip.color}60`, backgroundColor: `${currentShip.color}15` }}
                >
                  CLASS {currentShip.id.toUpperCase()}
                </div>
              </div>

              {/* Large Animated Live Canvas Starfighter Inspection Stage */}
              <div className="relative w-full h-44 my-3 rounded-2xl bg-gradient-to-b from-slate-950/90 to-slate-900/80 border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)] pointer-events-none" />
                <ShipCanvasPreview shipId={currentShip.id} width={280} height={170} scale={0.88} />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">{currentShip.desc}</p>

              {/* Stats Bars */}
              <div className="space-y-2.5 mb-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 flex items-center gap-1"><Zap size={14} className="text-amber-400" /> SPEED</span>
                    <span className="font-bold text-white">{currentShip.speed} / 10</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${currentShip.speed * 10}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 flex items-center gap-1"><Crosshair size={14} className="text-rose-400" /> FIREPOWER</span>
                    <span className="font-bold text-white">{currentShip.firepower} / 10</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${currentShip.firepower * 10}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 flex items-center gap-1"><Shield size={14} className="text-cyan-400" /> SHIELD HULL</span>
                    <span className="font-bold text-white">{currentShip.shield} / 10</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${currentShip.shield * 10}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={() => handleSelect(currentShip)}
              disabled={profile.selectedShip === currentShip.id}
              className={`w-full py-3.5 rounded-xl font-bold tracking-wider text-sm transition-all ${
                profile.selectedShip === currentShip.id
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer'
              }`}
            >
              {profile.selectedShip === currentShip.id
                ? 'CURRENTLY COMMISSIONED'
                : 'COMMISSION STARFIGHTER'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. UPGRADES DEPOT MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const UpgradesModal: React.FC<ModalProps> = ({ isOpen, onClose, profile, onUpdateProfile }) => {
  if (!isOpen) return null;

  const upgradesList = [
    {
      id: 'spread',
      name: 'TWIN-PLASMA ACCELERATOR',
      subtitle: 'Increases cannon barrels & spread coverage',
      level: profile.upgrades.spreadLevel,
      maxLevel: 4,
      cost: 2500 * profile.upgrades.spreadLevel,
      icon: Crosshair,
      color: '#06b6d4',
      onUpgrade: () => {
        if (profile.coins >= 2500 * profile.upgrades.spreadLevel && profile.upgrades.spreadLevel < 4) {
          sound.playRewardClaim();
          onUpdateProfile({
            coins: profile.coins - 2500 * profile.upgrades.spreadLevel,
            upgrades: { ...profile.upgrades, spreadLevel: profile.upgrades.spreadLevel + 1 }
          });
        }
      }
    },
    {
      id: 'shield',
      name: 'KINETIC BARRIER RECHARGE',
      subtitle: 'Increases max shields & hit absorption capacity',
      level: Math.round(profile.upgrades.shieldCapacity / 25),
      maxLevel: 6,
      cost: 1800 * Math.round(profile.upgrades.shieldCapacity / 25),
      icon: Shield,
      color: '#3b82f6',
      onUpgrade: () => {
        const lvl = Math.round(profile.upgrades.shieldCapacity / 25);
        if (profile.coins >= 1800 * lvl && lvl < 6) {
          sound.playRewardClaim();
          onUpdateProfile({
            coins: profile.coins - 1800 * lvl,
            upgrades: { ...profile.upgrades, shieldCapacity: profile.upgrades.shieldCapacity + 25 }
          });
        }
      }
    },
    {
      id: 'bomb',
      name: 'EMP NUKE WARHEADS',
      subtitle: 'Maximum starting EMP shockwave capacity',
      level: profile.upgrades.bombCount,
      maxLevel: 5,
      cost: 3500 * profile.upgrades.bombCount,
      icon: Zap,
      color: '#ef4444',
      onUpgrade: () => {
        if (profile.coins >= 3500 * profile.upgrades.bombCount && profile.upgrades.bombCount < 5) {
          sound.playRewardClaim();
          onUpdateProfile({
            coins: profile.coins - 3500 * profile.upgrades.bombCount,
            upgrades: { ...profile.upgrades, bombCount: profile.upgrades.bombCount + 1 }
          });
        }
      }
    },
    {
      id: 'overdrive',
      name: 'ION AFTERBURNER TURBINES',
      subtitle: 'Extends overdrive duration & warp recharge speed',
      level: profile.upgrades.overdrivePower,
      maxLevel: 5,
      cost: 2200 * profile.upgrades.overdrivePower,
      icon: ArrowUp,
      color: '#a855f7',
      onUpgrade: () => {
        if (profile.coins >= 2200 * profile.upgrades.overdrivePower && profile.upgrades.overdrivePower < 5) {
          sound.playRewardClaim();
          onUpdateProfile({
            coins: profile.coins - 2200 * profile.upgrades.overdrivePower,
            upgrades: { ...profile.upgrades, overdrivePower: profile.upgrades.overdrivePower + 1 }
          });
        }
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-3xl bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <ArrowUp className="text-cyan-400" size={28} />
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 tracking-wider">
                WEAPON & SHIP UPGRADES
              </h2>
              <p className="text-xs text-slate-400">Permanently enhance your weapons, shields, and tactical ordinances</p>
            </div>
          </div>
          <button 
            onClick={() => { sound.playMenuClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {upgradesList.map((u) => {
            const isMax = u.level >= u.maxLevel;
            const canAfford = profile.coins >= u.cost;
            const Icon = u.icon;

            return (
              <div key={u.id} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="p-2.5 rounded-xl border"
                      style={{ backgroundColor: `${u.color}15`, borderColor: `${u.color}50` }}
                    >
                      <Icon size={20} style={{ color: u.color }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-wide">{u.name}</h4>
                      <span className="text-[10px] text-cyan-400 font-semibold">TIER {u.level} / {u.maxLevel}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">{u.subtitle}</p>

                  {/* Pip bars */}
                  <div className="flex gap-1.5 mb-4">
                    {Array.from({ length: u.maxLevel }).map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-2 flex-1 rounded-full ${
                          idx < u.level ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-800'
                        }`} 
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => { sound.playMenuClick(); u.onUpgrade(); }}
                  disabled={isMax || !canAfford}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    isMax
                      ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                      : canAfford
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-[1.02] cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isMax ? (
                    'MAXED OUT'
                  ) : (
                    <>
                      <span>UPGRADE TIER</span>
                      <Coins size={14} />
                      <span>{u.cost.toLocaleString()}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. MISSIONS & QUESTS MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const MissionsModal: React.FC<ModalProps> = ({ isOpen, onClose, profile, onUpdateProfile }) => {
  if (!isOpen) return null;

  const handleClaim = (mId: string) => {
    sound.playRewardClaim();
    const updatedMissions = profile.missions.map((m) => {
      if (m.id === mId && m.completed && !m.claimed) {
        if (m.rewardType === 'coins') {
          onUpdateProfile({ coins: profile.coins + m.rewardAmount });
        } else {
          onUpdateProfile({ gems: profile.gems + m.rewardAmount });
        }
        return { ...m, claimed: true };
      }
      return m;
    });
    onUpdateProfile({ missions: updatedMissions });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-3xl bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Award className="text-cyan-400" size={28} />
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 tracking-wider">
                DAILY FLEET MISSIONS
              </h2>
              <p className="text-xs text-slate-400">Complete tactical objectives to earn gold coins and precious gems</p>
            </div>
          </div>
          <button 
            onClick={() => { sound.playMenuClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          {profile.missions.map((m) => {
            const pct = Math.min(100, Math.round((m.current / m.target) * 100));

            return (
              <div 
                key={m.id} 
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  m.completed && !m.claimed 
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm">{m.title}</span>
                    <span className="text-[10px] text-slate-400">({m.current}/{m.target})</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{m.desc}</p>
                  <div className="h-1.5 w-full max-w-md bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    {m.rewardType === 'coins' ? <Coins size={16} /> : <Gem size={16} className="text-purple-400" />}
                    <span>+{m.rewardAmount}</span>
                  </div>

                  <button
                    onClick={() => handleClaim(m.id)}
                    disabled={!m.completed || m.claimed}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      m.claimed 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : m.completed
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {m.claimed ? 'CLAIMED' : m.completed ? 'CLAIM REWARD' : 'IN PROGRESS'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. SPECIAL EVENT: BOSS RUSH MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const BossRushModal: React.FC<ModalProps> = ({ isOpen, onClose, onStartMission }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl bg-gradient-to-b from-[#1a052e] via-slate-950 to-slate-950 border border-purple-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(168,85,247,0.35)] flex flex-col"
      >
        <div className="flex justify-between items-center pb-4 border-b border-purple-500/30">
          <div className="flex items-center gap-3">
            <Star className="text-purple-400 fill-purple-400" size={28} />
            <div>
              <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/50">
                SPECIAL EVENT // BOSS RUSH
              </span>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-amber-300 tracking-wider mt-1">
                TITAN GAUNTLET: 5 EPIC BOSSES
              </h2>
            </div>
          </div>
          <button 
            onClick={() => { sound.playMenuClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="my-6 flex flex-col sm:flex-row items-center gap-6">
          <img 
            src={ASSETS.bossRushCard} 
            alt="Boss Rush Avatar" 
            className="w-36 h-36 rounded-2xl border-2 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.6)] object-cover"
          />
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-bold text-white">CHALLENGE RULES:</h4>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Engage 5 flagship bosses consecutively with single health bar</li>
              <li>Each defeated boss drops guaranteed Overdrive & Shield repairs</li>
              <li>Earn <strong className="text-yellow-400 font-bold">10,000 Coins</strong> and <strong className="text-purple-400 font-bold">150 Gems</strong> upon completion</li>
              <li>Event expires in: <strong className="text-cyan-400">3d 12h 45m</strong></li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playRewardClaim();
            onClose();
            // Start Sector 10 apex boss showdown!
            onStartMission?.(10);
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-400 hover:brightness-110 text-white font-black tracking-widest text-sm shadow-[0_0_30px_rgba(217,70,239,0.5)] cursor-pointer transition-all active:scale-95"
        >
          ENTER BOSS RUSH GAUNTLET
        </button>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. DAILY REWARDS MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const DailyRewardsModal: React.FC<ModalProps> = ({ isOpen, onClose, profile, onUpdateProfile }) => {
  if (!isOpen) return null;

  const days = [
    { day: 1, reward: '500 Coins', icon: Coins, amount: 500, type: 'coins' },
    { day: 2, reward: '1,000 Coins', icon: Coins, amount: 1000, type: 'coins' },
    { day: 3, reward: '20 Gems', icon: Gem, amount: 20, type: 'gems' },
    { day: 4, reward: '2,000 Coins', icon: Coins, amount: 2000, type: 'coins' },
    { day: 5, reward: '50 Gems', icon: Gem, amount: 50, type: 'gems' },
    { day: 6, reward: '5,000 Coins', icon: Coins, amount: 5000, type: 'coins' },
    { day: 7, reward: '150 Gems & Ship Skin', icon: Star, amount: 150, type: 'gems' },
  ];

  const handleClaimToday = () => {
    sound.playRewardClaim();
    onUpdateProfile({
      coins: profile.coins + 1000,
      gems: profile.gems + 30,
      dailyClaimed: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl bg-slate-950/95 border border-cyan-500/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col"
      >
        <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Gift className="text-cyan-400" size={28} />
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 tracking-wider">
                7-DAY LOGIN STREAK REWARDS
              </h2>
              <p className="text-xs text-slate-400">Log in every day to claim escalating supply caches</p>
            </div>
          </div>
          <button 
            onClick={() => { sound.playMenuClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
          {days.map((d) => {
            const isToday = d.day === profile.dailyStreak;
            const isPassed = d.day < profile.dailyStreak;
            const Icon = d.icon;

            return (
              <div 
                key={d.day} 
                className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-between ${
                  isToday 
                    ? 'bg-gradient-to-b from-cyan-950/60 to-blue-950/60 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    : isPassed
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : 'bg-slate-900/70 border-slate-800'
                } ${d.day === 7 ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase">DAY {d.day}</span>
                <div className="my-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <Icon size={22} className={d.type === 'gems' ? 'text-purple-400' : 'text-amber-400'} />
                </div>
                <span className="text-[11px] font-bold text-white">{d.reward}</span>
                {isPassed && <span className="text-[9px] text-emerald-400 font-bold mt-1">✓ CLAIMED</span>}
                {isToday && !profile.dailyClaimed && <span className="text-[9px] text-cyan-300 font-bold mt-1 animate-pulse">READY!</span>}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleClaimToday}
          disabled={profile.dailyClaimed}
          className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all ${
            profile.dailyClaimed
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.5)] cursor-pointer'
          }`}
        >
          {profile.dailyClaimed ? 'TODAY CLAIMED (COME BACK TOMORROW)' : 'CLAIM DAY 3 REWARD (+1,000 COINS & +30 GEMS)'}
        </button>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. ACHIEVEMENTS MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const AchievementsModal: React.FC<ModalProps> = ({ isOpen, onClose, profile, onUpdateProfile }) => {
  if (!isOpen) return null;

  const handleClaim = (aId: string) => {
    sound.playRewardClaim();
    const updated = profile.achievements.map((a) => {
      if (a.id === aId && a.completed && !a.claimed) {
        onUpdateProfile({ gems: profile.gems + a.rewardGems });
        return { ...a, claimed: true };
      }
      return a;
    });
    onUpdateProfile({ achievements: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Award className="text-cyan-400" size={28} />
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 tracking-wider">
                PILOT ACCOMPLISHMENTS
              </h2>
              <p className="text-xs text-slate-400">Unlock prestigious badges to claim free purple gems</p>
            </div>
          </div>
          <button 
            onClick={() => { sound.playMenuClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3 my-5">
          {profile.achievements.map((a) => (
            <div 
              key={a.id} 
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                a.completed && !a.claimed 
                  ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">{a.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-white">{a.title}</h4>
                  <p className="text-xs text-slate-400">{a.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                  <Gem size={14} /> +{a.rewardGems}
                </span>
                <button
                  onClick={() => handleClaim(a.id)}
                  disabled={!a.completed || a.claimed}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    a.claimed
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : a.completed
                      ? 'bg-purple-600 hover:bg-purple-500 text-white animate-pulse cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {a.claimed ? 'CLAIMED' : a.completed ? 'CLAIM' : 'LOCKED'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. GALACTIC SHOP MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const ShopModal: React.FC<ModalProps> = ({ isOpen, onClose, profile, onUpdateProfile }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-3xl bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-cyan-400" size={28} />
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 tracking-wider">
                GALACTIC REQUISITION SHOP
              </h2>
              <p className="text-xs text-slate-400">Exchange currency for weapon packs, energy cells, and credits</p>
            </div>
          </div>
          <button 
            onClick={() => { sound.playMenuClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between text-center">
            <div>
              <Coins className="text-amber-400 mx-auto mb-2" size={32} />
              <h4 className="text-sm font-bold text-white">CREDIT CRATE</h4>
              <p className="text-xs text-slate-400 mt-1">Receive +25,000 Gold Coins</p>
            </div>
            <button
              onClick={() => {
                if (profile.gems >= 50) {
                  sound.playRewardClaim();
                  onUpdateProfile({ gems: profile.gems - 50, coins: profile.coins + 25000 });
                }
              }}
              disabled={profile.gems < 50}
              className="mt-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:bg-slate-800 disabled:text-slate-500"
            >
              50 GEMS
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between text-center">
            <div>
              <Zap className="text-cyan-400 mx-auto mb-2" size={32} />
              <h4 className="text-sm font-bold text-white">ION ENERGY RECHARGE</h4>
              <p className="text-xs text-slate-400 mt-1">Restore energy cell to 10/10</p>
            </div>
            <button
              onClick={() => {
                if (profile.coins >= 1000) {
                  sound.playRewardClaim();
                  onUpdateProfile({ coins: profile.coins - 1000, energy: 10 });
                }
              }}
              disabled={profile.coins < 1000}
              className="mt-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:bg-slate-800 disabled:text-slate-500"
            >
              1,000 COINS
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between text-center">
            <div>
              <Gem className="text-purple-400 mx-auto mb-2" size={32} />
              <h4 className="text-sm font-bold text-white">GEM PURSE</h4>
              <p className="text-xs text-slate-400 mt-1">Claim free daily gem grant (+100)</p>
            </div>
            <button
              onClick={() => {
                sound.playRewardClaim();
                onUpdateProfile({ gems: profile.gems + 100 });
              }}
              className="mt-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-black text-xs cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              CLAIM FREE
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. GALACTIC LEADERBOARD MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const LeaderboardModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const pilots = [
    { rank: 1, name: 'Valkyrie-Zero', sector: 'SECTOR 10', score: '1,420,800', badge: '🥇' },
    { rank: 2, name: 'NovaStrike_X', sector: 'SECTOR 10', score: '1,280,450', badge: '🥈' },
    { rank: 3, name: 'Astraea_Fleet', sector: 'SECTOR 09', score: '984,200', badge: '🥉' },
    { rank: 4, name: 'Rookie Pilot (You)', sector: 'SECTOR 06', score: '648,150', badge: '⚡' },
    { rank: 5, name: 'CyberWing_99', sector: 'SECTOR 06', score: '592,300', badge: '🚀' },
    { rank: 6, name: 'VanguardAce', sector: 'SECTOR 05', score: '480,900', badge: '🎖️' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400" size={28} />
            <div>
              <h2 className="text-xl font-black text-white tracking-wider">GALACTIC ACE LEADERBOARD</h2>
              <p className="text-xs text-slate-400">Global pilot sector clear rankings and campaign high scores</p>
            </div>
          </div>
          <button 
            onClick={() => { sound.playMenuClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 my-5">
          {pilots.map((p) => {
            const isPlayer = p.rank === 4;
            return (
              <div 
                key={p.rank} 
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isPlayer 
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center font-black text-sm text-slate-300">{p.badge}</span>
                  <div>
                    <span className={`font-bold text-sm ${isPlayer ? 'text-cyan-300 font-black' : 'text-white'}`}>
                      {p.name}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">{p.sector}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-amber-400 font-mono">{p.score}</span>
                  <span className="block text-[9px] text-slate-500 uppercase">PTS</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export const InboxModal: React.FC<ModalProps> = ({ isOpen, onClose, profile, onUpdateProfile }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xl bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col"
      >
        <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Mail className="text-cyan-400" size={28} />
            <div>
              <h2 className="text-xl font-black text-white tracking-wider">COMMANDER DISPATCH LOGS</h2>
              <p className="text-xs text-slate-400">Incoming fleet dispatches and battle compensation</p>
            </div>
          </div>
          <button 
            onClick={() => { sound.playMenuClick(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="my-5 p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-cyan-300">HIGH COMMAND DISPATCH // SECTOR 6</span>
            <span className="text-[10px] text-slate-400">Today</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Welcome to the front lines, Pilot. The Nebula Zone in Sector 6 has shown heightened hostile activity. High Command has granted you 5,000 Gold Credits and 50 Gems to bolster your vanguard starfighter. Good luck.
          </p>
          <div className="flex justify-between items-center pt-3 border-t border-cyan-500/20 mt-2">
            <span className="text-xs font-bold text-amber-400">+5,000 COINS • +50 GEMS</span>
            <button
              onClick={() => {
                sound.playRewardClaim();
                onUpdateProfile({ 
                  coins: profile.coins + 5000, 
                  gems: profile.gems + 50,
                  hasUnreadMail: false 
                });
                onClose();
              }}
              disabled={!profile.hasUnreadMail}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold ${
                profile.hasUnreadMail 
                  ? 'bg-emerald-500 text-white cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {profile.hasUnreadMail ? 'CLAIM GRANT' : 'CLAIMED'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
