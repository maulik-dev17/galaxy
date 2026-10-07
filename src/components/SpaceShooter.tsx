import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Play, Grid, Volume2, VolumeX, Shield, Bomb, Zap, Crosshair } from 'lucide-react';
import { GameState, LevelConfig, PlayerStats, LevelProgress, DynamicDifficultyState, calculateDynamicDifficulty, GameSettings } from '../types';
import { LEVELS, FREE_FLIGHT_LEVEL, getLevelConfig, getStoredProgress, saveLevelResult } from '../levels';
import { getStoredProfile, getStoredSettings, INITIAL_SHIPS } from '../profileStore';
import { GameEngine } from '../canvas/gameEngine';
import { Boss } from '../canvas/entities';
import { sound } from '../audio';
import { HUD } from './HUD';
import { MainMenu } from './MainMenu';
import { LevelSelectModal } from './LevelSelectModal';
import { LevelClearModal } from './LevelClearModal';
import { GameOverModal } from './GameOverModal';
import { VictoryModal } from './VictoryModal';
import { PauseModal } from './PauseModal';

export default function SpaceShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-level App State - Default to 'menu' so player sees the AAA Main Menu!
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [progress, setProgress] = useState<Record<number, LevelProgress>>(() => getStoredProgress());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dynamicDifficulty, setDynamicDifficulty] = useState<DynamicDifficultyState | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => getStoredSettings());

  // References to keep event handlers fresh without re-subscribing or stopping the engine
  const gameStateRef = useRef<GameState>(gameState);
  const currentLevelIdRef = useRef<number>(currentLevelId);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    currentLevelIdRef.current = currentLevelId;
  }, [currentLevelId]);

  // Live HUD States
  const [score, setScore] = useState<number>(0);
  const [health, setHealth] = useState<number>(100);
  const [shields, setShields] = useState<number>(100);
  const [bombs, setBombs] = useState<number>(2);
  const [killsInLevel, setKillsInLevel] = useState<number>(0);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [bossHp, setBossHp] = useState<number>(0);
  const [bossMaxHp, setBossMaxHp] = useState<number>(0);
  const [starsEarned, setStarsEarned] = useState<number>(0);
  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    highScore: 0,
    health: 100,
    maxHealth: 100,
    shields: 100,
    maxShields: 100,
    isShieldRecharging: false,
    bombs: 2,
    spreadLevel: 1,
    specialTimer: 0,
    specialMaxTimer: 180,
    overdriveTimer: 0,
    barrierTimer: 0,
    combo: 0,
    comboTimer: 0,
    killsInLevel: 0,
    lives: 3,
    maxLives: 3,
    distanceFlown: 0
  });

  const currentLevel: LevelConfig = getLevelConfig(currentLevelId);

  // Refresh progress state from storage
  const reloadProgress = useCallback(() => {
    setProgress(getStoredProgress());
  }, []);

  // Initialize or re-initialize game engine
  const startLevel = useCallback((levelId: number) => {
    const targetLvl = getLevelConfig(levelId);
    setCurrentLevelId(targetLvl.id);
    currentLevelIdRef.current = targetLvl.id;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (engineRef.current) {
      engineRef.current.stop();
    }

    // Load pilot profile upgrades and active commission ship
    const profile = getStoredProfile();
    const ship = INITIAL_SHIPS.find((s) => s.id === profile.selectedShip) || INITIAL_SHIPS[0];
    const initialShields = profile.upgrades?.shieldCapacity || 100;
    const initialBombs = profile.upgrades?.bombCount || 2;
    const initialSpread = profile.upgrades?.spreadLevel || 1;
    const isFreeFlightMode = targetLvl.id === 99;

    // Reset Live HUD state
    setScore(0);
    setHealth(100);
    setShields(initialShields);
    setBombs(initialBombs);
    setKillsInLevel(0);
    setBoss(null);
    setBossHp(0);
    setBossMaxHp(0);
    setDynamicDifficulty(calculateDynamicDifficulty(targetLvl, 0, false));
    const initPlayerStats: PlayerStats = {
      score: 0,
      highScore: isFreeFlightMode ? (profile.freeFlightHighScore || 0) : 0,
      health: 100,
      maxHealth: 100,
      shields: initialShields,
      maxShields: initialShields,
      isShieldRecharging: false,
      bombs: initialBombs,
      spreadLevel: initialSpread,
      specialTimer: 0,
      specialMaxTimer: 180,
      overdriveTimer: 0,
      barrierTimer: 0,
      combo: 0,
      comboTimer: 0,
      killsInLevel: 0,
      lives: 3,
      maxLives: 3,
      isFreeFlight: isFreeFlightMode,
      distanceFlown: 0
    };
    setStats(initPlayerStats);

    const engine = new GameEngine(
      canvas, 
      targetLvl, 
      {
        onScoreUpdate: (newScore) => {
          setScore(newScore);
          setStats((prev) => ({ ...prev, score: newScore }));
        },
        onHealthUpdate: (newHealth) => {
          setHealth(newHealth);
          setStats((prev) => ({ ...prev, health: newHealth }));
        },
        onShieldsUpdate: (newShields) => {
          setShields(newShields);
          setStats((prev) => ({ ...prev, shields: newShields }));
        },
        onBombsUpdate: (newBombs) => {
          setBombs(newBombs);
          setStats((prev) => ({ ...prev, bombs: newBombs }));
        },
        onLevelProgressUpdate: (kills, _targetKills, dyn) => {
          setKillsInLevel(kills);
          if (dyn) setDynamicDifficulty(dyn);
        },
        onBossSpawn: (spawnedBoss) => {
          setBoss(spawnedBoss);
        },
        onBossHpUpdate: (hp, maxHp) => {
          setBossHp(hp);
          setBossMaxHp(maxHp);
        },
        onStatsUpdate: (partial) => {
          setStats((prev) => ({ ...prev, ...partial }));
        },
        onLevelClear: (finalScore, stars) => {
          saveLevelResult(targetLvl.id, finalScore, stars);
          reloadProgress();
          setStarsEarned(stars);

          if (targetLvl.id >= 10) {
            setGameState('campaign_victory');
          } else {
            setGameState('level_cleared');
          }
        },
        onGameOver: (finalScore) => {
          setScore(finalScore);
          setGameState('gameover');
        }
      },
      initPlayerStats,
      { id: ship.id, color: ship.color, accent: ship.accent }
    );

    engine.resize(window.innerWidth, window.innerHeight);
    engineRef.current = engine;
    engine.start();
    setGameState('playing');
  }, [reloadProgress]);

  // Pause action
  const handlePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      engineRef.current?.pause();
      setGameState('paused');
    }
  }, []);

  // Resume action
  const handleResume = useCallback(() => {
    if (gameStateRef.current === 'paused') {
      engineRef.current?.resume();
      setGameState('playing');
    }
  }, []);

  // EMP Bomb action
  const handleTriggerBomb = useCallback(() => {
    engineRef.current?.triggerBomb();
  }, []);

  // Sound toggle
  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Mount effect: keep window ready
  useEffect(() => {
    // Keep profile & progress fresh on mount
    reloadProgress();
  }, [reloadProgress]);

  // Window Resize & Controls Listeners (Attached ONCE, never killed by state changes)
  useEffect(() => {
    let cachedRectLeft = 0;
    let cachedRectTop = 0;

    const updateRect = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        cachedRectLeft = rect.left;
        cachedRectTop = rect.top;
      }
    };
    updateRect();

    const handleResize = () => {
      updateRect();
      if (engineRef.current && canvasRef.current) {
        engineRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };

    const updatePointer = (clientX: number, clientY: number) => {
      if (!engineRef.current || gameStateRef.current !== 'playing') return;
      engineRef.current.setPointer(clientX - cachedRectLeft, clientY - cachedRectTop);
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY - 45);
      } else if ('clientX' in e) {
        updatePointer((e as MouseEvent).clientX, (e as MouseEvent).clientY);
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY - 45);
      } else if ('clientX' in e) {
        updatePointer((e as MouseEvent).clientX, (e as MouseEvent).clientY);
      }
      if (gameStateRef.current === 'playing') {
        engineRef.current?.setFiring(true);
        engineRef.current?.triggerPlayerShoot();
      }
    };

    const handlePointerUp = () => {
      if (gameStateRef.current === 'playing') {
        engineRef.current?.setFiring(false);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (gameStateRef.current === 'playing') {
        updatePointer(e.clientX, e.clientY);
        engineRef.current?.triggerPlayerShoot();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Pause with Escape or P
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameStateRef.current === 'playing') {
          handlePause();
          return;
        } else if (gameStateRef.current === 'paused') {
          handleResume();
          return;
        }
      }

      // Resume from pause with Enter (or Space if paused)
      if ((e.key === ' ' || e.key === 'Enter') && gameStateRef.current === 'paused') {
        handleResume();
        return;
      }

      // Restart / Deploy with Space or Enter from Game Over
      if ((e.key === ' ' || e.key === 'Enter') && gameStateRef.current === 'gameover') {
        startLevel(currentLevelIdRef.current);
        return;
      }

      // Primary Shoot with Spacebar
      if (e.key === ' ' || e.code === 'Space') {
        if (gameStateRef.current === 'playing') {
          e.preventDefault();
          engineRef.current?.setFiring(true);
          engineRef.current?.triggerPlayerShoot();
          engineRef.current?.setKey(' ', true);
          return;
        }
      }

      // EMP Bomb trigger with B key
      if (e.key === 'b' || e.key === 'B') {
        if (gameStateRef.current === 'playing') {
          handleTriggerBomb();
          return;
        }
      }

      engineRef.current?.setKey(e.key, true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        engineRef.current?.setFiring(false);
        engineRef.current?.setKey(' ', false);
        return;
      }
      engineRef.current?.setKey(e.key, false);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateRect, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mousedown', handlePointerDown, { passive: true });
    window.addEventListener('mouseup', handlePointerUp, { passive: true });
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateRect);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      engineRef.current?.stop();
    };
  }, [handlePause, handleResume, startLevel]);

  // Star and campaign stats
  const progressList = Object.values(progress) as LevelProgress[];
  const totalStars = progressList.reduce((acc, curr) => acc + (curr.stars || 0), 0);
  const completedSectors = progressList.filter((p) => p.completed).length;

  return (
    <div className="relative w-full h-full bg-[#050510] overflow-hidden select-none font-mono">
      {/* 60 FPS HTML5 Canvas Arena */}
      <canvas
        ref={canvasRef}
        className="block absolute inset-0 z-0 touch-none cursor-crosshair"
      />

      {/* In-Game HUD */}
      {gameState === 'playing' && (
        <HUD
          level={currentLevel}
          stats={stats}
          boss={boss}
          bossHp={bossHp}
          bossMaxHp={bossMaxHp}
          killsInLevel={killsInLevel}
          dynamicDifficulty={dynamicDifficulty}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onTriggerBomb={handleTriggerBomb}
          onPause={handlePause}
          settings={gameSettings}
        />
      )}

      {/* Main Menu Dashboard */}
      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 overflow-hidden"
          >
            <MainMenu
              onStartGame={(sec) => startLevel(sec)}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              completedSectors={completedSectors}
              settings={gameSettings}
              onUpdateSettings={(s) => setGameSettings((prev) => ({ ...prev, ...s }))}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Select Modal */}
      <AnimatePresence>
        {gameState === 'level_select' && (
          <LevelSelectModal
            progress={progress}
            selectedLevelId={currentLevelId}
            onSelectLevel={(id) => startLevel(id)}
            onClose={() => setGameState('menu')}
          />
        )}
      </AnimatePresence>

      {/* Tactical Pause Modal */}
      <AnimatePresence>
        {gameState === 'paused' && (
          <PauseModal
            level={currentLevel}
            isMuted={isMuted}
            onResume={handleResume}
            onRetry={() => startLevel(currentLevelId)}
            onOpenLevelSelect={() => setGameState('level_select')}
            onOpenMenu={() => {
              engineRef.current?.stop();
              setGameState('menu');
            }}
            onToggleMute={handleToggleMute}
          />
        )}
      </AnimatePresence>

      {/* Level Clear Modal */}
      <AnimatePresence>
        {gameState === 'level_cleared' && (
          <LevelClearModal
            level={currentLevel}
            score={score}
            stars={starsEarned}
            hasNextLevel={currentLevelId < 10}
            onNextLevel={() => startLevel(currentLevelId + 1)}
            onRetry={() => startLevel(currentLevelId)}
            onOpenLevelSelect={() => setGameState('level_select')}
            onOpenMenu={() => {
              engineRef.current?.stop();
              setGameState('menu');
            }}
          />
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState === 'gameover' && (
          <GameOverModal
            level={currentLevel}
            score={score}
            lives={stats.lives}
            distanceFlown={stats.distanceFlown}
            isFreeFlight={currentLevelId === 99 || stats.isFreeFlight}
            onRetry={() => startLevel(currentLevelId)}
            onOpenLevelSelect={() => setGameState('level_select')}
            onOpenMenu={() => {
              engineRef.current?.stop();
              setGameState('menu');
            }}
          />
        )}
      </AnimatePresence>

      {/* Campaign Complete / Victory Modal */}
      <AnimatePresence>
        {gameState === 'campaign_victory' && (
          <VictoryModal
            finalScore={score}
            totalStars={totalStars}
            onRestartCampaign={() => startLevel(1)}
            onOpenLevelSelect={() => setGameState('level_select')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
