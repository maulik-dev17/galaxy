/**
 * Haptic Feedback Engine for Galaxy Shooter
 * Implements navigator.vibrate patterns for game events:
 * - Laser fire: short crisp burst (~12ms, throttled)
 * - Damage: longer pulse (75ms - 100ms)
 * - Low health: distinctive rhythmic distress heartbeat ([70, 90, 110, 750])
 * - EMP: colossal shockwave explosion pattern ([140, 50, 90, 40, 180])
 */

import { getStoredSettings } from './profileStore';

class HapticsEngine {
  private lastLaserTime = 0;
  private lowHealthInterval: number | null = null;
  private isLowHealthActive = false;
  public enabled = true;

  /**
   * Validates if navigator.vibrate is available and permitted by user preferences.
   */
  public canVibrate(): boolean {
    if (!this.enabled) return false;
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      return false;
    }
    // Respect reduced motion setting if active
    try {
      const settings = getStoredSettings();
      if (settings?.reducedMotion) return false;
    } catch {
      // ignore
    }
    return true;
  }

  /**
   * Short crisp burst on laser fire (~12ms).
   * Throttled to ~75ms so continuous autofire delivers a punchy arcade staccato
   * without motor saturation or device lockup.
   */
  public laser() {
    if (!this.canVibrate()) return;
    const now = performance.now();
    if (now - this.lastLaserTime < 75) return;
    this.lastLaserTime = now;

    try {
      navigator.vibrate(12);
    } catch {
      // ignore
    }
  }

  /**
   * Longer pulse on taking damage.
   * Standard hit: 75ms solid pulse.
   * Heavy hit / ramming / hull breach: [90, 35, 75] multi-stage shock pulse.
   */
  public damage(isHeavy: boolean = false) {
    if (!this.canVibrate()) return;
    try {
      if (isHeavy) {
        navigator.vibrate([90, 35, 75]);
      } else {
        navigator.vibrate(75);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Distinctive pattern for low health:
   * A critical alarm double-thump heartbeat rhythm:
   * 70ms pulse, 90ms rest, 110ms pulse.
   */
  public lowHealth() {
    if (!this.canVibrate()) return;
    try {
      navigator.vibrate([70, 90, 110]);
    } catch {
      // ignore
    }
  }

  /**
   * Starts periodic low-health alarm heartbeat when hull integrity is critical (< 25%).
   */
  public startLowHealthAlarm() {
    if (this.isLowHealthActive) return;
    this.isLowHealthActive = true;
    this.lowHealth();
    this.lowHealthInterval = window.setInterval(() => {
      if (this.isLowHealthActive) {
        this.lowHealth();
      }
    }, 1600);
  }

  /**
   * Stops low-health alarm when shields/health recover or round ends.
   */
  public stopLowHealthAlarm() {
    this.isLowHealthActive = false;
    if (this.lowHealthInterval !== null) {
      clearInterval(this.lowHealthInterval);
      this.lowHealthInterval = null;
    }
  }

  /**
   * Distinctive colossal shockwave pattern for EMP usage:
   * Heavy primary detonation, vacuum pause, and secondary ion rumble:
   * [140ms blast, 50ms pause, 90ms shockwave, 40ms pause, 180ms ion rumble]
   */
  public emp() {
    if (!this.canVibrate()) return;
    try {
      navigator.vibrate([140, 50, 90, 40, 180]);
    } catch {
      // ignore
    }
  }

  /**
   * Immediately halts any ongoing vibration pattern.
   */
  public stop() {
    this.stopLowHealthAlarm();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // ignore
      }
    }
  }
}

export const haptics = new HapticsEngine();
