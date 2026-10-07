import { PowerUpType, EnemyType } from '../types';

export class Player {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  radius: number = 20; // Natural fighter scale matching enemy starfighters (wasp: 20, scarab: 24, mantis: 26)
  targetX: number;
  targetY: number;
  hitFlash: number = 0;
  shieldFlash: number = 0;
  hullFlash: number = 0;
  invulnerableTime: number = 0;
  health: number = 100;
  maxHealth: number = 100;
  shields: number = 100;
  maxShields: number = 100;
  shipId: string = 'vanguard';
  shipColor: string = '#00ffff';
  shipAccent: string = '#3b82f6';
  time: number = 0;

  constructor(x: number, y: number, ship?: { id?: string; color?: string; accent?: string }) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    if (ship?.id) this.shipId = ship.id;
    if (ship?.color) this.shipColor = ship.color;
    if (ship?.accent) this.shipAccent = ship.accent;
  }

  update(width: number, height: number) {
    this.time++;
    const prevX = this.x;
    const prevY = this.y;

    // Smooth real-time movement interpolation
    this.x += (this.targetX - this.x) * 0.25;
    this.y += (this.targetY - this.y) * 0.25;

    // Bounds clamp
    this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));

    // Do not reset targetX/targetY here so interpolation works

    this.vx = this.x - prevX;
    this.vy = this.y - prevY;

    if (this.hitFlash > 0) this.hitFlash--;
    if (this.shieldFlash > 0) this.shieldFlash--;
    if (this.hullFlash > 0) this.hullFlash--;
    if (this.invulnerableTime > 0) this.invulnerableTime--;
  }

  draw(ctx: CanvasRenderingContext2D, overdrive: boolean, barrierActive: boolean = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Dynamic 3D banking roll when maneuvering sideways
    const bankRoll = Math.max(-0.25, Math.min(0.25, this.vx * 0.022));
    ctx.rotate(bankRoll);

    // Scale player starfighter to naturally match the enemy ships scale (wingspan: 71px, length: 56px)
    ctx.scale(0.48, 0.48);

    // If invulnerable, flicker
    if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime / 4) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHIP MODEL PROCEDURAL RENDERING (Unique geometry per ship ID)
    // ─────────────────────────────────────────────────────────────────────────
    const isHit = this.hitFlash > 0;
    const primColor = isHit ? '#ffffff' : this.shipColor;
    const secColor = isHit ? '#ffffff' : (this.shipAccent || '#38bdf8');
    const nozzleGlow = overdrive ? '#00f0ff' : '#ff9900';

    renderStarfighterModel(ctx, this.shipId, isHit, primColor, secColor, nozzleGlow, overdrive, this.time);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. DYNAMIC ENERGY SHIELD DOME & HULL BREACH (When Damaged or Barrier Active)
    // ─────────────────────────────────────────────────────────────────────────
    // Deflector Shield Ripple on Shield Impact
    if (this.shieldFlash > 0 || (this.shields > 0 && this.hitFlash > 0)) {
      ctx.save();
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3.5;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = Math.cos(a) * 64;
        const py = Math.sin(a) * 64;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Shimmering inner deflector ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Hull Breach Red Flash on Armor Damage
    if (this.hullFlash > 0 || (this.shields <= 0 && this.hitFlash > 0)) {
      ctx.save();
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#ef4444';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (barrierActive) {
      ctx.save();
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.16)';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = Math.cos(a) * 65;
        const py = Math.sin(a) * 65;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Shimmering deflector ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. TACTICAL SHIP MINI GAUGE (Shield & Hull Integrity)
    // ─────────────────────────────────────────────────────────────────────────
    if (this.shields < this.maxShields || this.health < this.maxHealth || this.hitFlash > 0) {
      const gaugeW = 74;
      const gaugeY = 72;

      // Shield Mini-Bar (Cyan)
      if (this.maxShields > 0) {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
        ctx.fillRect(-gaugeW / 2, gaugeY, gaugeW, 3.5);
        const sPct = Math.max(0, Math.min(1, this.shields / this.maxShields));
        ctx.fillStyle = sPct > 0.3 ? '#00f0ff' : '#f43f5e';
        ctx.fillRect(-gaugeW / 2, gaugeY, gaugeW * sPct, 3.5);
      }

      // Hull Health Mini-Bar (Green -> Amber -> Red)
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(-gaugeW / 2, gaugeY + 5, gaugeW, 3.5);
      const hPct = Math.max(0, Math.min(1, this.health / this.maxHealth));
      ctx.fillStyle = hPct > 0.5 ? '#10b981' : hPct > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(-gaugeW / 2, gaugeY + 5, gaugeW * hPct, 3.5);
    }

    ctx.restore();
  }
}

/**
 * Procedural Starfighter Model Renderer
 * Renders distinct hull geometry, wings, cockpit, engine nozzles, and weaponry per ship ID.
 */
export function renderStarfighterModel(
  ctx: CanvasRenderingContext2D,
  shipId: string,
  isHit: boolean,
  primColor: string,
  secColor: string,
  nozzleGlow: string,
  overdrive: boolean,
  time: number = 0
) {
  if (shipId === 'corsair') {
    // ═════════════════════════════════════════════════════════════════════════
    // CORSAIR ASSAULT: Heavy Diamond Gunship with Quad Autocannons
    // ═════════════════════════════════════════════════════════════════════════
    [-24, 0, 24].forEach((offset) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(offset - 7, 40, 14, 12);
      ctx.fillStyle = nozzleGlow;
      ctx.fillRect(offset - 5, 46, 10, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(offset - 2, 44, 4, 3);
    });

    // Heavy Diamond Outer Armor
    ctx.fillStyle = isHit ? '#ffffff' : '#331040';
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(64, 10);
    ctx.lineTo(48, 52);
    ctx.lineTo(-48, 52);
    ctx.lineTo(-64, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = secColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner Titanium Bulkhead Plates
    ctx.fillStyle = primColor;
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(38, 6);
    ctx.lineTo(28, 42);
    ctx.lineTo(-28, 42);
    ctx.lineTo(-38, 6);
    ctx.closePath();
    ctx.fill();

    // Quad Heavy Autocannon Barrels
    [-44, -18, 18, 44].forEach((off) => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(off - 5, -32, 10, 58);
      ctx.fillStyle = secColor;
      ctx.fillRect(off - 3, -36, 6, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(off, -36, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Reinforced Command Visor
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(-16, -8, 32, 20);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-12, -4, 24, 10);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-12, -4, 24, 10);

  } else if (shipId === 'phantom') {
    // ═════════════════════════════════════════════════════════════════════════
    // PHANTOM INFILTRATOR: Forward-Swept Stealth Interceptor
    // ═════════════════════════════════════════════════════════════════════════
    [-18, 18].forEach((off) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(off - 6, 42, 12, 11);
      ctx.fillStyle = overdrive ? '#00f0ff' : '#10b981';
      ctx.fillRect(off - 4, 47, 8, 4);
    });

    // Forward-Swept Inverted Wings
    ctx.fillStyle = isHit ? '#ffffff' : '#042f2e';
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(18, -25);
    ctx.lineTo(78, -44); // Sweeps aggressively forward!
    ctx.lineTo(74, 18);
    ctx.lineTo(24, 36);
    ctx.lineTo(0, 48);
    ctx.lineTo(-24, 36);
    ctx.lineTo(-74, 18);
    ctx.lineTo(-78, -44);
    ctx.lineTo(-18, -25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = primColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Stealth Faceted Plates
    ctx.fillStyle = isHit ? '#ffffff' : '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(50, -20);
    ctx.lineTo(18, 26);
    ctx.lineTo(0, 36);
    ctx.lineTo(-18, 26);
    ctx.lineTo(-50, -20);
    ctx.closePath();
    ctx.fill();

    // Dual Forward Aerodynamic Canards
    ctx.fillStyle = secColor;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(36, -32);
    ctx.lineTo(26, -20);
    ctx.lineTo(0, -34);
    ctx.lineTo(-26, -20);
    ctx.lineTo(-36, -32);
    ctx.closePath();
    ctx.fill();

    // Glowing Emerald Laser Aperture
    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#10b981';
    ctx.beginPath();
    ctx.arc(0, -62, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Hexagonal Stealth Canopy
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.stroke();

  } else if (shipId === 'archon') {
    // ═════════════════════════════════════════════════════════════════════════
    // ARCHON TITAN: Flagship Colossus with Trident Prow & Heavy Sponsons
    // ═════════════════════════════════════════════════════════════════════════
    [-34, -12, 12, 34].forEach((off) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(off - 6, 44, 12, 14);
      ctx.fillStyle = nozzleGlow;
      ctx.fillRect(off - 4, 50, 8, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(off - 2, 48, 4, 3);
    });

    // Massive Trident Hull Base
    ctx.fillStyle = isHit ? '#ffffff' : '#451a03';
    ctx.beginPath();
    ctx.moveTo(0, -78);          // Center prong
    ctx.lineTo(18, -44);
    ctx.lineTo(48, -66);         // Starboard prong
    ctx.lineTo(78, -12);         // Outer heavy sponson
    ctx.lineTo(72, 52);
    ctx.lineTo(0, 42);
    ctx.lineTo(-72, 52);
    ctx.lineTo(-78, -12);        // Port heavy sponson
    ctx.lineTo(-48, -66);        // Port prong
    ctx.lineTo(-18, -44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = primColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Gold Ablative Armor Citadel
    ctx.fillStyle = isHit ? '#ffffff' : primColor;
    ctx.beginPath();
    ctx.moveTo(0, -62);
    ctx.lineTo(30, -25);
    ctx.lineTo(52, 22);
    ctx.lineTo(0, 34);
    ctx.lineTo(-52, 22);
    ctx.lineTo(-30, -25);
    ctx.closePath();
    ctx.fill();

    // Hyper-Core Fusion Reactor Orb (Glowing Amber/Red)
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#f59e0b';
    const corePulse = Math.sin(time * 0.1) * 3;
    const coreGrad = ctx.createRadialGradient(0, -2, 2, 0, -2, 18 + corePulse);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, '#fbbf24');
    coreGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, -2, 14 + corePulse * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Broadside Orbital Missile Cells
    [-58, 58].forEach((off) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(off - 7, 2, 14, 24);
      ctx.fillStyle = secColor;
      ctx.fillRect(off - 5, 6, 10, 4);
      ctx.fillRect(off - 5, 14, 10, 4);
    });

  } else if (shipId === 'valkyrie') {
    // ═════════════════════════════════════════════════════════════════════════
    // VALKYRIE INTERCEPTOR: Solar-Blade Crimson Interceptor
    // ═════════════════════════════════════════════════════════════════════════
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-14, 40, 28, 14);
    ctx.fillStyle = overdrive ? '#00f0ff' : '#ef4444';
    ctx.fillRect(-10, 46, 20, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, 45, 10, 3);

    // Swept Scissor Wings with Ruby Solar Foils
    ctx.fillStyle = isHit ? '#ffffff' : '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(26, -20);
    ctx.lineTo(84, 38);
    ctx.lineTo(78, 58);
    ctx.lineTo(18, 38);
    ctx.lineTo(0, 48);
    ctx.lineTo(-18, 38);
    ctx.lineTo(-78, 58);
    ctx.lineTo(-84, 38);
    ctx.lineTo(-26, -20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = primColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Solar Blade Edges (Glowing Gold)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(26, -20);
    ctx.lineTo(82, 38);
    ctx.moveTo(-26, -20);
    ctx.lineTo(-82, 38);
    ctx.stroke();

    // Twin Vertical Stabilizer Fins
    [-24, 24].forEach((off) => {
      ctx.fillStyle = isHit ? '#ffffff' : '#991b1b';
      ctx.fillRect(off - 3, 8, 6, 26);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(off - 2, 4, 4, 6);
    });

    // Spearhead Needle Prow
    ctx.fillStyle = isHit ? '#ffffff' : '#fee2e2';
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(15, -36);
    ctx.lineTo(-15, -36);
    ctx.closePath();
    ctx.fill();

    // Crimson Cockpit Visor
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.ellipse(0, 4, 11, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

  } else if (shipId === 'wraith') {
    // ═════════════════════════════════════════════════════════════════════════
    // NEBULA WRAITH: Biomechanical Alien Void Fighter
    // ═════════════════════════════════════════════════════════════════════════
    [-22, 22].forEach((off) => {
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(off, 42, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = overdrive ? '#00f0ff' : '#d946ef';
      ctx.beginPath();
      ctx.arc(off, 44, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Curved Crescent Scythe Wings
    ctx.fillStyle = isHit ? '#ffffff' : '#3b0764';
    ctx.beginPath();
    ctx.moveTo(0, -66);
    ctx.bezierCurveTo(46, -46, 90, -10, 86, 48);
    ctx.lineTo(66, 42);
    ctx.bezierCurveTo(60, 0, 36, -15, 14, 30);
    ctx.lineTo(0, 42);
    ctx.lineTo(-14, 30);
    ctx.bezierCurveTo(-36, -15, -60, 0, -66, 42);
    ctx.lineTo(-86, 48);
    ctx.bezierCurveTo(-90, -10, -46, -46, 0, -66);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = primColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Bioluminescent Filaments (Pulsing Cyan/Magenta)
    const bioPulse = Math.sin(time * 0.12) * 2;
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, -25);
    ctx.bezierCurveTo(38, -10, 58, 12, 68, 36);
    ctx.moveTo(-12, -25);
    ctx.bezierCurveTo(-38, -10, -58, 12, -68, 36);
    ctx.stroke();

    // Void Crystal Core
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, -54);
    ctx.lineTo(19, 0);
    ctx.lineTo(0, 32);
    ctx.lineTo(-19, 0);
    ctx.closePath();
    ctx.fill();

    // Glowing Cyan Void Eye
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#06b6d4';
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(0, 2, 7 + bioPulse * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  } else if (shipId === 'tempest') {
    // ═════════════════════════════════════════════════════════════════════════
    // TEMPEST LIGHTNING: Twin-Fuselage Catamaran Interceptor (NEW!)
    // ═════════════════════════════════════════════════════════════════════════
    [-38, -22, 22, 38].forEach((off) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(off - 5, 42, 10, 12);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(off - 3, 48, 6, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(off - 1.5, 46, 3, 3);
    });

    [-30, 30].forEach((hullX) => {
      ctx.fillStyle = isHit ? '#ffffff' : '#0369a1';
      ctx.beginPath();
      ctx.moveTo(hullX, -72);
      ctx.lineTo(hullX + 16, -15);
      ctx.lineTo(hullX + 14, 46);
      ctx.lineTo(hullX - 14, 46);
      ctx.lineTo(hullX - 16, -15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#0c4a6e';
      ctx.beginPath();
      ctx.ellipse(hullX, -10, 7, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#090d16';
      ctx.fillRect(hullX - 3, -78, 6, 14);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(hullX - 1.5, -82, 3, 6);
    });

    ctx.fillStyle = isHit ? '#ffffff' : '#082f49';
    ctx.fillRect(-20, 0, 40, 26);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(-20, 0, 40, 26);

    ctx.save();
    ctx.strokeStyle = '#67e8f9';
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const arcY = Math.sin(time * 0.25) * 8 + 12;
    ctx.moveTo(-28, arcY);
    ctx.lineTo(-12, arcY - 6);
    ctx.lineTo(0, arcY + 6);
    ctx.lineTo(12, arcY - 4);
    ctx.lineTo(28, arcY);
    ctx.stroke();

    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(0, 13, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  } else if (shipId === 'solaris') {
    // ═════════════════════════════════════════════════════════════════════════
    // SOLARIS PHOENIX: Swept Coronal Firebird (NEW!)
    // ═════════════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#f97316';
    const flameY = 46 + Math.sin(time * 0.3) * 6;
    const flameGrad = ctx.createLinearGradient(0, 40, 0, flameY + 20);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.3, '#facc15');
    flameGrad.addColorStop(0.7, '#ea580c');
    flameGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-16, 42);
    ctx.lineTo(0, flameY + 22);
    ctx.lineTo(16, 42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = isHit ? '#ffffff' : '#7c2d12';
    ctx.beginPath();
    ctx.moveTo(0, -68);
    ctx.lineTo(32, -28);
    ctx.lineTo(82, 10);
    ctx.lineTo(86, 32);
    ctx.lineTo(58, 28);
    ctx.lineTo(72, 48);
    ctx.lineTo(40, 42);
    ctx.lineTo(48, 62);
    ctx.lineTo(18, 48);
    ctx.lineTo(0, 56);
    ctx.lineTo(-18, 48);
    ctx.lineTo(-48, 62);
    ctx.lineTo(-40, 42);
    ctx.lineTo(-72, 48);
    ctx.lineTo(-58, 28);
    ctx.lineTo(-86, 32);
    ctx.lineTo(-82, 10);
    ctx.lineTo(-32, -28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = isHit ? '#ffffff' : '#ea580c';
    ctx.beginPath();
    ctx.moveTo(0, -56);
    ctx.lineTo(24, -14);
    ctx.lineTo(46, 18);
    ctx.lineTo(0, 36);
    ctx.lineTo(-46, 18);
    ctx.lineTo(-24, -14);
    ctx.closePath();
    ctx.fill();

    [-34, 34].forEach((wx) => {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#eab308';
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(wx, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(0, -72);
    ctx.lineTo(12, -40);
    ctx.lineTo(0, -32);
    ctx.lineTo(-12, -40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

  } else if (shipId === 'nightshade') {
    // ═════════════════════════════════════════════════════════════════════════
    // NIGHTSHADE STEALTH: Faceted Obsidian Void Flying Wing (NEW!)
    // ═════════════════════════════════════════════════════════════════════════
    [-24, 24].forEach((off) => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(off - 10, 44, 20, 8);
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(off - 7, 48, 14, 3);
    });

    ctx.fillStyle = isHit ? '#ffffff' : '#09090b';
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(78, 6);
    ctx.lineTo(84, 26);
    ctx.lineTo(46, 54);
    ctx.lineTo(0, 38);
    ctx.lineTo(-46, 54);
    ctx.lineTo(-84, 26);
    ctx.lineTo(-78, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = isHit ? '#ffffff' : '#18181b';
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(52, 4);
    ctx.lineTo(26, 38);
    ctx.lineTo(0, 30);
    ctx.lineTo(-26, 38);
    ctx.lineTo(-52, 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(0, 30);
    ctx.moveTo(-52, 4);
    ctx.lineTo(0, -10);
    ctx.lineTo(52, 4);
    ctx.stroke();

    [-22, 22].forEach((tx) => {
      ctx.fillStyle = '#020617';
      ctx.fillRect(tx - 6, -18, 12, 28);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx - 6, -18, 12, 28);

      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(tx, -10, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-8, -36, 16, 4);

  } else {
    // ═════════════════════════════════════════════════════════════════════════
    // VANGUARD X-1 (Default): Precision Strike Fighter
    // ═════════════════════════════════════════════════════════════════════════
    [-20, 20].forEach((off) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(off - 6, 42, 12, 10);
      ctx.fillStyle = nozzleGlow;
      ctx.fillRect(off - 4, 48, 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(off - 2, 46, 4, 3);
    });

    if (overdrive) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-8, 43, 16, 9);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-6, 48, 12, 4);
    }

    ctx.fillStyle = isHit ? '#ffffff' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(74, 32);
    ctx.lineTo(74, 62);
    ctx.lineTo(26, 44);
    ctx.lineTo(0, 56);
    ctx.lineTo(-26, 44);
    ctx.lineTo(-74, 62);
    ctx.lineTo(-74, 32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = isHit ? '#ffffff' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(54, 26);
    ctx.lineTo(54, 48);
    ctx.lineTo(18, 36);
    ctx.lineTo(0, 46);
    ctx.lineTo(-18, 36);
    ctx.lineTo(-54, 48);
    ctx.lineTo(-54, 26);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = overdrive ? '#00f0ff' : primColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(18, 20);
    ctx.lineTo(62, 38);
    ctx.moveTo(-18, 20);
    ctx.lineTo(-62, 38);
    ctx.stroke();

    [-64, 64].forEach((off) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(off - 5, 14, 10, 34);
      ctx.fillStyle = secColor;
      ctx.fillRect(off - 3, 10, 6, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(off, 10, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    const bodyGrad = ctx.createLinearGradient(0, -66, 0, 52);
    bodyGrad.addColorStop(0, primColor);
    bodyGrad.addColorStop(0.35, secColor);
    bodyGrad.addColorStop(0.7, '#1e1b4b');
    bodyGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -66);
    ctx.lineTo(28, -14);
    ctx.lineTo(30, 46);
    ctx.lineTo(0, 38);
    ctx.lineTo(-30, 46);
    ctx.lineTo(-28, -14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#002b66';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = overdrive ? '#00f0ff' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -48, 5, 0, Math.PI * 2);
    ctx.fill();

    const cockpitGrad = ctx.createRadialGradient(0, 4, 3, 0, 6, 24);
    cockpitGrad.addColorStop(0, '#ffffff');
    cockpitGrad.addColorStop(0.35, '#fbbf24');
    cockpitGrad.addColorStop(0.8, '#d97706');
    cockpitGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, 12, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * Dedicated Live Canvas Preview for Ships in Hangar & Menu
 */
export function drawShipPreview(
  ctx: CanvasRenderingContext2D,
  shipId: string,
  width: number,
  height: number,
  time: number = 0,
  scale: number = 0.65
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2 + Math.sin(time * 0.05) * 3;

  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Gentle subtle hover roll
  ctx.rotate(Math.sin(time * 0.035) * 0.06);

  // Background glow halo
  const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
  glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.18)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 65, 0, Math.PI * 2);
  ctx.fill();

  const primColor = 
    shipId === 'corsair' ? '#a855f7' :
    shipId === 'phantom' ? '#06b6d4' :
    shipId === 'archon' ? '#f59e0b' :
    shipId === 'valkyrie' ? '#ef4444' :
    shipId === 'wraith' ? '#d946ef' :
    shipId === 'tempest' ? '#38bdf8' :
    shipId === 'solaris' ? '#f97316' :
    shipId === 'nightshade' ? '#8b5cf6' :
    '#00ffff';

  const secColor = 
    shipId === 'corsair' ? '#ec4899' :
    shipId === 'phantom' ? '#10b981' :
    shipId === 'archon' ? '#ef4444' :
    shipId === 'valkyrie' ? '#f59e0b' :
    shipId === 'wraith' ? '#06b6d4' :
    shipId === 'tempest' ? '#6366f1' :
    shipId === 'solaris' ? '#eab308' :
    shipId === 'nightshade' ? '#06b6d4' :
    '#3b82f6';

  renderStarfighterModel(ctx, shipId, false, primColor, secColor, '#ff9900', false, time);
  ctx.restore();
}

export class Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number = 5;
  damage: number;

  constructor(x: number, y: number, angleDeg: number = 0, speed: number = 22, damage: number = 18) {
    this.x = x;
    this.y = y;
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    this.vx = Math.cos(rad) * speed;
    this.vy = Math.sin(rad) * speed;
    this.damage = damage;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = '#ffdd33';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff6600';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 4, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class HomingMissile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number = 8;
  maxSpeed: number = 21;
  accel: number = 0.7;
  angle: number;
  radius: number = 6;
  damage: number = 34;
  target: { x: number; y: number; hp?: number } | null = null;
  life: number = 0;
  maxLife: number = 180; // Up to 3s flight time

  constructor(x: number, y: number, initialAngleDeg: number) {
    this.x = x;
    this.y = y;
    this.angle = ((initialAngleDeg - 90) * Math.PI) / 180;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
  }

  update(potentialTargets: { x: number; y: number; hp?: number }[]) {
    this.life++;

    // Re-acquire closest valid enemy target ahead
    if (!this.target || (this.target.hp !== undefined && this.target.hp <= 0)) {
      let minDist = 750;
      let closest: { x: number; y: number; hp?: number } | null = null;
      for (const t of potentialTargets) {
        if (t.hp !== undefined && t.hp <= 0) continue;
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d < minDist) {
          minDist = d;
          closest = t;
        }
      }
      this.target = closest;
    }

    if (this.target) {
      const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += Math.max(-0.16, Math.min(0.16, diff));
    }

    if (this.speed < this.maxSpeed) {
      this.speed += this.accel;
    }
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Aerodynamic missile chassis
    ctx.fillStyle = '#f97316';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(3.5, 0);
    ctx.lineTo(3.5, 7);
    ctx.lineTo(0, 5.5);
    ctx.lineTo(-3.5, 7);
    ctx.lineTo(-3.5, 0);
    ctx.closePath();
    ctx.fill();

    // Hot incandescent warhead tip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -7, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Engine burner glow
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.arc(0, 8, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;

  constructor(x: number, y: number, vx: number, vy: number, color: string = '#ff0055', radius: number = 5) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Hot white inner core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export type FlightPattern = 
  | 'sine' 
  | 'dive' 
  | 'zigzag' 
  | 'cross' 
  | 'linear'
  | 'homing_swoop'
  | 'intercept_ram'
  | 'strafe_harass'
  | 'pincer_converge'
  | 'spiral_pursuit'
  | 'strafing_sweep'
  | 'evasive_zigzag'
  | 'chase_hunter';

export class Enemy {
  x: number;
  y: number;
  vx: number = 0;
  vy: number;
  startX: number;
  radius: number;
  hp: number;
  maxHp: number;
  time: number;
  type: EnemyType;
  flightPattern: FlightPattern;
  color: string;
  wingColor: string;
  scoreValue: number;
  rotation: number = 0;
  rotationSpeed: number = 0;
  hitFlash: number = 0;
  hasEnergyCore: boolean = false;
  energyAmount: number = 0;
  isCargo: boolean = false;
  fireTelegraph: number = 0;
  bulletSpeedMult: number = 1;
  bankAngle: number = 0;
  evasionCooldown: number = 0;

  constructor(
    x: number,
    y: number,
    type: EnemyType,
    speedMult: number = 1,
    hpMult: number = 1,
    bulletMult: number = 1,
    flightPattern: FlightPattern = 'sine'
  ) {
    this.x = x;
    this.startX = x;
    this.y = y;
    this.type = type;
    this.flightPattern = flightPattern;
    this.bulletSpeedMult = bulletMult;
    this.time = Math.random() * 100;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.05;

    switch (type) {
      case 'drone': // High-speed target prize cargo drone (Guaranteed special power-up drop)
        this.radius = 22;
        this.maxHp = Math.round(50 * hpMult);
        this.vy = 1.1 * speedMult;
        this.vx = 4.0 * speedMult;
        this.color = '#ffea00';
        this.wingColor = '#00f0ff';
        this.scoreValue = 750;
        this.isCargo = true;
        this.hasEnergyCore = true;
        this.energyAmount = 180;
        break;
      case 'asteroid': // Destructible space mineral rock
        this.radius = 24 + Math.random() * 10;
        this.maxHp = Math.round(55 * hpMult);
        this.vy = (1.4 + Math.random() * 1.0) * speedMult;
        this.vx = (Math.random() - 0.5) * 1.0 * speedMult;
        this.color = '#a8a29e';
        this.wingColor = '#06b6d4';
        this.scoreValue = 150;
        this.hasEnergyCore = false;
        break;
      case 'kamikaze': // Fast high-threat razor dive dart
        this.radius = 19;
        this.maxHp = Math.round(28 * hpMult);
        this.vy = (3.4 + Math.random() * 0.8) * speedMult;
        this.color = '#ff3300';
        this.wingColor = '#ff9900';
        this.scoreValue = 220;
        this.hasEnergyCore = false;
        break;
      case 'wasp': // Fast agile scout starfighter
        this.radius = 20;
        this.maxHp = Math.round(30 * hpMult);
        this.vy = (2.8 + Math.random() * 0.8) * speedMult;
        this.color = '#ffaa00';
        this.wingColor = '#ffff44';
        this.scoreValue = 140;
        this.hasEnergyCore = false;
        break;
      case 'mantis': // Pincer dive assault fighter
        this.radius = 26;
        this.maxHp = Math.round(65 * hpMult);
        this.vy = (2.4 + Math.random() * 0.5) * speedMult;
        this.color = '#00e5ff';
        this.wingColor = '#00ffaa';
        this.scoreValue = 280;
        this.hasEnergyCore = false;
        break;
      case 'interceptor': // Heavy fleet destroyer
        this.radius = 32;
        this.maxHp = Math.round(140 * hpMult);
        this.vy = (1.6 + Math.random() * 0.4) * speedMult;
        this.color = '#ff0077';
        this.wingColor = '#ff55cc';
        this.scoreValue = 500;
        this.hasEnergyCore = false;
        break;
      case 'phantom': // Void Stealth Strafer: High-speed lateral strafing fighter
        this.radius = 23;
        this.maxHp = Math.round(44 * hpMult);
        this.vy = (2.2 + Math.random() * 0.4) * speedMult;
        this.color = '#c084fc';
        this.wingColor = '#a855f7';
        this.scoreValue = 260;
        this.hasEnergyCore = false;
        if (flightPattern === 'sine') this.flightPattern = 'strafing_sweep';
        break;
      case 'wraith': // Apex Chaser: Continuous pursuit dogfighter that aggressively chases the player
        this.radius = 25;
        this.maxHp = Math.round(58 * hpMult);
        this.vy = (2.5 + Math.random() * 0.5) * speedMult;
        this.color = '#ef4444';
        this.wingColor = '#b91c1c';
        this.scoreValue = 320;
        this.hasEnergyCore = false;
        if (flightPattern === 'sine') this.flightPattern = 'chase_hunter';
        break;
      case 'cobra': // Viper Zig-Zagger: Sharp angled evasive slither fighter
        this.radius = 21;
        this.maxHp = Math.round(36 * hpMult);
        this.vy = (2.8 + Math.random() * 0.5) * speedMult;
        this.color = '#10b981';
        this.wingColor = '#06b6d4';
        this.scoreValue = 230;
        this.hasEnergyCore = false;
        if (flightPattern === 'sine') this.flightPattern = 'evasive_zigzag';
        break;
      case 'scarab':
      default: // Armored Corvette
        this.radius = 24;
        this.maxHp = Math.round(48 * hpMult);
        this.vy = (2.0 + Math.random() * 0.6) * speedMult;
        this.color = '#aa00ff';
        this.wingColor = '#e066ff';
        this.scoreValue = 200;
        this.hasEnergyCore = false;
        break;
    }
    this.hp = this.maxHp;
  }

  update(playerX: number = this.x, playerY: number = this.y + 350, width: number = 800, height: number = 600) {
    this.time++;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.fireTelegraph > 0) this.fireTelegraph--;
    if (this.evasionCooldown > 0) this.evasionCooldown--;
    const prevX = this.x;
    this.rotation += this.rotationSpeed;

    const dx = playerX - this.x;
    const dy = Math.max(20, playerY - this.y);

    if (this.type === 'drone' || this.flightPattern === 'cross') {
      this.x += this.vx;
      this.y += this.vy;
    } else if (this.type === 'asteroid') {
      this.x += this.vx;
      this.y += this.vy;
    } else if (this.flightPattern === 'homing_swoop') {
      // Homing Swoop: Continuously leads toward player coordinates with proportional pursuit
      const targetAngle = Math.atan2(dy, dx);
      const desiredVx = Math.cos(targetAngle) * (this.vy * 1.35);
      this.vx += (desiredVx - this.vx) * 0.09;
      this.x += this.vx;
      this.y += Math.max(2.0, Math.sin(targetAngle) * (this.vy * 1.25));
    } else if (this.flightPattern === 'intercept_ram' || this.type === 'kamikaze') {
      // Intercept Ram / Razor Dive Dart: Locks onto player coordinates and plunges downwards with predictive lead
      const targetAngle = Math.atan2(dy, dx);
      const diveSpeed = this.vy * 1.32;
      const targetVx = Math.cos(targetAngle) * diveSpeed;
      this.vx += (targetVx - this.vx) * 0.11;
      this.x += this.vx;
      this.y += Math.max(2.4, Math.sin(targetAngle) * diveSpeed);
    } else if (this.flightPattern === 'strafe_harass') {
      // Strafe Harass: Approaches combat ceiling, strafes back and forth across playerX, then dives
      const targetAltitude = playerY - 220;
      if (this.y < targetAltitude) {
        this.x += Math.sign(dx) * Math.min(2.5, Math.abs(dx) * 0.026);
        this.y += this.vy * 1.1;
      } else if (this.time % 200 < 135) {
        // Active strafe harassment across player position
        const strafeOffset = Math.sin(this.time * 0.08) * 105;
        const targetX = playerX + strafeOffset;
        this.x += (targetX - this.x) * 0.08;
        this.y += 0.35; // slow creeping descent
      } else {
        // Breakaway dive pass directly at player
        this.x += Math.sign(dx) * 2.2;
        this.y += this.vy * 1.85;
      }
    } else if (this.flightPattern === 'pincer_converge') {
      // Pincer Converge: Closes in from outer flanks directly aiming inward at (playerX, playerY)
      const targetAngle = Math.atan2(dy, dx);
      const speed = this.vy * 1.18;
      this.x += Math.cos(targetAngle) * speed;
      this.y += Math.max(1.8, Math.sin(targetAngle) * speed);
    } else if (this.flightPattern === 'strafing_sweep' || this.type === 'phantom') {
      // Phantom / Strafing Sweep: High-speed lateral strafing across player lane with sinusoidal sweep
      const sweepWidth = Math.min(220, (width - 120) * 0.45);
      const sweepFreq = 0.055;
      const strafeX = this.startX + Math.sin(this.time * sweepFreq) * sweepWidth;
      const trackingPull = Math.sign(dx) * Math.min(1.8, Math.abs(dx) * 0.02);
      this.x = strafeX + trackingPull * (this.time * 0.15);
      this.y += this.vy * 0.95;
    } else if (this.flightPattern === 'chase_hunter' || this.type === 'wraith') {
      // Wraith / Chase Hunter: Dynamic relentless pursuit dogfighter actively chasing player position
      const targetAngle = Math.atan2(dy, dx);
      const pursuitSpeed = this.vy * 1.25;
      const desiredVx = Math.cos(targetAngle) * pursuitSpeed;
      const desiredVy = Math.max(1.8, Math.sin(targetAngle) * pursuitSpeed);
      this.vx += (desiredVx - this.vx) * 0.085;
      this.x += this.vx;
      this.y += desiredVy;
    } else if (this.flightPattern === 'evasive_zigzag' || this.type === 'cobra') {
      // Cobra / Evasive Zig-Zag: Violent 45-degree angular diagonal slashes dodging player fire
      const cycle = 32;
      const phase = this.time % cycle;
      const direction = phase < cycle / 2 ? 1 : -1;
      const snapSpeed = 3.6 * direction;
      const playerBias = Math.sign(dx) * Math.min(1.4, Math.abs(dx) * 0.015);
      this.x += snapSpeed + playerBias;
      this.y += this.vy * 1.1;
    } else if (this.flightPattern === 'spiral_pursuit') {
      // Corkscrew spiral descent whose vortex center continuously seeks playerX
      this.startX += Math.sign(playerX - this.startX) * Math.min(2.8, Math.abs(playerX - this.startX) * 0.035);
      const radius = Math.max(25, 75 - (this.time * 0.12));
      this.x = this.startX + Math.sin(this.time * 0.075) * radius;
      this.y += this.vy * 1.12;
    } else if (this.type === 'mantis') {
      // Mantis: Pincer dive striker that swoops aggressively downwards toward player
      const diveFactor = Math.min(1.7, 1.0 + (height - dy) / height);
      const trackingPull = Math.sign(dx) * Math.min(2.4, Math.abs(dx) * 0.022);
      this.x += Math.sin(this.time * 0.055) * 2.2 + trackingPull;
      this.y += this.vy * diveFactor;
    } else if (this.type === 'scarab') {
      // Scarab: Armored Corvette that methodically advances downward while aligning guns with player
      const trackingSpeed = Math.sign(dx) * Math.min(1.4, Math.abs(dx) * 0.014);
      this.x += trackingSpeed + Math.sin(this.time * 0.035) * 0.9;
      this.y += this.vy;
    } else if (this.type === 'interceptor') {
      // Interceptor: Massive dreadnought slowly pushing downwards toward player with heavy presence
      const trackingSpeed = Math.sign(dx) * Math.min(0.8, Math.abs(dx) * 0.008);
      this.x += trackingSpeed;
      this.y += this.vy;
    } else if (this.flightPattern === 'zigzag') {
      // Angular cuts biased downwards and toward player
      const period = Math.floor(this.time / 28) % 2 === 0 ? 1 : -1;
      const trackingPull = Math.sign(dx) * Math.min(1.2, Math.abs(dx) * 0.01);
      this.x += period * 2.4 + trackingPull;
      this.y += this.vy;
    } else if (this.flightPattern === 'dive') {
      // Tactical dive-and-recover swoop downwards toward player
      const diveProgress = (this.time * 0.04) % (Math.PI * 2);
      const trackingPull = Math.sign(dx) * Math.min(1.5, Math.abs(dx) * 0.012);
      this.x = this.startX + Math.sin(diveProgress) * 75 + trackingPull * (this.time * 0.2);
      const speedMod = 1.0 + Math.sin(diveProgress * 2) * 0.45;
      this.y += this.vy * speedMod;
    } else {
      // Wasp / Scout default: Fast agile sinusoidal descent moving downwards toward player
      const waveWidth = 55;
      const freq = 0.065;
      const trackingPull = Math.sign(dx) * Math.min(1.6, Math.abs(dx) * 0.015);
      this.x = this.startX + Math.sin(this.time * freq) * waveWidth + trackingPull * (this.time * 0.2);
      this.y += this.vy;
    }

    // Horizontal bounds containment
    this.x = Math.max(this.radius + 5, Math.min(width - this.radius - 5, this.x));

    this.vx = this.x - prevX;
    this.bankAngle = Math.max(-0.55, Math.min(0.55, this.vx * 0.07));
  }

  tryEvade(projectileX: number) {
    if (this.evasionCooldown <= 0 && (this.type === 'wasp' || this.type === 'mantis' || this.type === 'cobra' || this.type === 'phantom')) {
      const dir = projectileX > this.x ? -1 : 1;
      const evadeDist = this.type === 'cobra' ? 32 : 26;
      this.x += dir * evadeDist;
      this.evasionCooldown = this.type === 'cobra' ? 35 : 50;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. RECON PRIZE DRONE (Moving Golden/Cyan Target)
    if (this.type === 'drone') {
      ctx.rotate(this.rotation);
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffea00';

      // Outer hexagonal protective chassis
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = Math.cos(a) * this.radius;
        const py = Math.sin(a) * this.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Glowing Cyan Core
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Hot white center beacon
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Target Bracket Reticle indicating prize target
      ctx.restore();
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 1.5;
      const bracketSize = this.radius * 1.5;
      const bArm = 6;
      // Top-Left
      ctx.beginPath(); ctx.moveTo(-bracketSize, -bracketSize + bArm); ctx.lineTo(-bracketSize, -bracketSize); ctx.lineTo(-bracketSize + bArm, -bracketSize); ctx.stroke();
      // Top-Right
      ctx.beginPath(); ctx.moveTo(bracketSize - bArm, -bracketSize); ctx.lineTo(bracketSize, -bracketSize); ctx.lineTo(bracketSize, -bracketSize + bArm); ctx.stroke();
      // Bottom-Left
      ctx.beginPath(); ctx.moveTo(-bracketSize, bracketSize - bArm); ctx.lineTo(-bracketSize, bracketSize); ctx.lineTo(-bracketSize + bArm, bracketSize); ctx.stroke();
      // Bottom-Right
      ctx.beginPath(); ctx.moveTo(bracketSize - bArm, bracketSize); ctx.lineTo(bracketSize, bracketSize); ctx.lineTo(bracketSize, bracketSize - bArm); ctx.stroke();
      ctx.restore();
      return;
    }

    // 2. ASTEROID HAZARD TARGET
    if (this.type === 'asteroid') {
      ctx.rotate(this.rotation);
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = '#44403c';
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 2;

      // Faceted craggy asteroid polygon
      ctx.beginPath();
      const points = 7;
      for (let i = 0; i < points; i++) {
        const a = (i * Math.PI * 2) / points;
        const rad = this.radius * (0.8 + ((i * 3) % 4) * 0.08);
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Crystalline Vein
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.4, -this.radius * 0.2);
      ctx.lineTo(0, 0);
      ctx.lineTo(this.radius * 0.5, this.radius * 0.3);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // 3. SCI-FI ENEMY SPACESIPS (Viper Starfighter, Phantom Infiltrator, Corsair Gunship, Heavy Destroyer)
    const r = this.radius;

    // Dynamic banking roll when maneuvering horizontally
    ctx.rotate(this.bankAngle);

    // Tactical seeker lock indicator for player-tracking flight patterns
    if (this.flightPattern === 'homing_swoop' || this.flightPattern === 'intercept_ram' || this.flightPattern === 'strafe_harass') {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(0, r + 4);
      ctx.lineTo(0, r + 36);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Glowing weapon charge flare when telegraphed attack is imminent
    if (this.fireTelegraph > 0) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ff0055';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, r * 1.05, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Radiant Energy Matrix Aura around ships carrying special power canister
    if (this.hasEnergyCore || this.isCargo) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 2;
      const pulse = Math.sin(this.time * 0.15) * 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 7 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating plasma nodes
      ctx.fillStyle = '#00f0ff';
      for (let k = 0; k < 3; k++) {
        const na = (k * Math.PI * 2) / 3 + this.time * 0.06;
        const nx = Math.cos(na) * (r + 7 + pulse);
        const ny = Math.sin(na) * (r + 7 + pulse);
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.type === 'wasp') {
      // ══════════════════════════════════════════════════════════════
      // VIPER STRIKE FIGHTER (Fast Attack Delta Starfighter)
      // ══════════════════════════════════════════════════════════════
      const primaryColor = this.hitFlash > 0 ? '#ffffff' : '#1e293b';
      const accentGrad = ctx.createLinearGradient(0, -r, 0, r);
      accentGrad.addColorStop(0, '#f97316');
      accentGrad.addColorStop(0.5, '#ef4444');
      accentGrad.addColorStop(1, '#dc2626');

      // Rear Engine Exhaust Housings (Pointing up towards space)
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff9900';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, -r * 0.85, 6, 7);
      ctx.fillRect(4, -r * 0.85, 6, 7);
      // Incandescent Nozzle Cores
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(-9, -r * 0.85, 4, 3);
      ctx.fillRect(5, -r * 0.85, 4, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-8, -r * 0.85, 2, 2);
      ctx.fillRect(6, -r * 0.85, 2, 2);
      ctx.shadowBlur = 0;

      // Swept Delta Wings (Titanium Slate & Armor Plates)
      ctx.fillStyle = primaryColor;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.15); // Forward needle nose
      ctx.lineTo(r * 1.4, -r * 0.35); // Right wingtip
      ctx.lineTo(r * 1.35, -r * 0.7); // Right wing trailing edge
      ctx.lineTo(r * 0.45, -r * 0.5);
      ctx.lineTo(0, -r * 0.65);
      ctx.lineTo(-r * 0.45, -r * 0.5);
      ctx.lineTo(-r * 1.35, -r * 0.7); // Left wing trailing edge
      ctx.lineTo(-r * 1.4, -r * 0.35); // Left wingtip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Chevron Trim (Vibrant Red/Amber Racing Armor)
      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : accentGrad;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.8);
      ctx.lineTo(r * 0.7, -r * 0.1);
      ctx.lineTo(r * 0.4, -r * 0.4);
      ctx.lineTo(0, -r * 0.2);
      ctx.lineTo(-r * 0.4, -r * 0.4);
      ctx.lineTo(-r * 0.7, -r * 0.1);
      ctx.closePath();
      ctx.fill();

      // Wingtip Plasma Cannon Muzzles
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(r * 1.25, -r * 0.1, 4, r * 0.5);
      ctx.fillRect(-r * 1.25 - 4, -r * 0.1, 4, r * 0.5);
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(r * 1.25 + 2, r * 0.4, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-r * 1.25 - 2, r * 0.4, 2, 0, Math.PI * 2); ctx.fill();

      // Sharp Center Fuselage
      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, r * 1.25);
      ctx.lineTo(r * 0.32, -r * 0.1);
      ctx.lineTo(r * 0.25, -r * 0.65);
      ctx.lineTo(-r * 0.25, -r * 0.65);
      ctx.lineTo(-r * 0.32, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cockpit Canopy (Amber Gold Core with Specular Reflection)
      const cockpitGrad = ctx.createLinearGradient(0, -r * 0.1, 0, r * 0.5);
      cockpitGrad.addColorStop(0, '#ffffff');
      cockpitGrad.addColorStop(0.3, '#ffcc00');
      cockpitGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = cockpitGrad;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.2, r * 0.16, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'mantis') {
      // ══════════════════════════════════════════════════════════════
      // PHANTOM STEALTH INFILTRATOR (Forward-Swept Wing Fighter)
      // ══════════════════════════════════════════════════════════════
      const bodyColor = this.hitFlash > 0 ? '#ffffff' : '#090d16';
      const wingGrad = ctx.createLinearGradient(0, -r, 0, r);
      wingGrad.addColorStop(0, '#0284c7');
      wingGrad.addColorStop(1, '#06b6d4');

      // Dual Rear Thruster Manifolds
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-12, -r * 0.8, 7, 8);
      ctx.fillRect(5, -r * 0.8, 7, 8);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-11, -r * 0.8, 5, 3);
      ctx.fillRect(6, -r * 0.8, 5, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -r * 0.8, 3, 2);
      ctx.fillRect(7, -r * 0.8, 3, 2);
      ctx.shadowBlur = 0;

      // Aggressive Forward-Swept Wings (Pointing forward & outward toward player)
      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#1e293b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.lineTo(r * 0.6, -r * 0.45);
      ctx.lineTo(r * 1.5, r * 0.55); // Forward swept wingtip
      ctx.lineTo(r * 1.45, r * 0.8);  // Blade wingtip
      ctx.lineTo(r * 0.75, r * 0.2);
      ctx.lineTo(0, r * 0.9);         // Forward nose
      ctx.lineTo(-r * 0.75, r * 0.2);
      ctx.lineTo(-r * 1.45, r * 0.8); // Left blade wingtip
      ctx.lineTo(-r * 1.5, r * 0.55); // Left forward swept wingtip
      ctx.lineTo(-r * 0.6, -r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Neon Plasma Conduits on Wings
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.4, -r * 0.2);
      ctx.lineTo(r * 1.25, r * 0.5);
      ctx.moveTo(-r * 0.4, -r * 0.2);
      ctx.lineTo(-r * 1.25, r * 0.5);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Heavy Twin Underslung Railgun Barrels extending forward
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(r * 0.25, r * 0.1, 4, r * 0.9);
      ctx.fillRect(-r * 0.25 - 4, r * 0.1, 4, r * 0.9);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(r * 0.25, r * 0.95, 4, 3);
      ctx.fillRect(-r * 0.25 - 4, r * 0.95, 4, 3);

      // Stealth Faceted Fuselage
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.15); // Razor nose point
      ctx.lineTo(r * 0.35, r * 0.1);
      ctx.lineTo(r * 0.3, -r * 0.7);
      ctx.lineTo(-r * 0.3, -r * 0.7);
      ctx.lineTo(-r * 0.35, r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Armored Cockpit Visor (Emerald / Cyan glow)
      const canopyGrad = ctx.createLinearGradient(0, -r * 0.1, 0, r * 0.5);
      canopyGrad.addColorStop(0, '#ffffff');
      canopyGrad.addColorStop(0.3, '#00ffcc');
      canopyGrad.addColorStop(1, '#006655');
      ctx.fillStyle = canopyGrad;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.48);
      ctx.lineTo(r * 0.18, 0);
      ctx.lineTo(0, -r * 0.15);
      ctx.lineTo(-r * 0.18, 0);
      ctx.closePath();
      ctx.fill();

    } else if (this.type === 'scarab') {
      // ══════════════════════════════════════════════════════════════
      // CORSAIR HEAVY GUNSHIP (Diamond-Hull Armored Assault Corvette)
      // ══════════════════════════════════════════════════════════════
      const primaryColor = this.hitFlash > 0 ? '#ffffff' : '#1e1b4b';
      const armorPlate = this.hitFlash > 0 ? '#ffffff' : '#312e81';

      // Twin Reinforced Engine Nacelles (at the rear)
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#818cf8';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-r * 0.65 - 4, -r * 0.8, 9, 8);
      ctx.fillRect(r * 0.65 - 5, -r * 0.8, 9, 8);
      ctx.fillStyle = '#818cf8';
      ctx.fillRect(-r * 0.65 - 3, -r * 0.8, 7, 3);
      ctx.fillRect(r * 0.65 - 4, -r * 0.8, 7, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-r * 0.65 - 1, -r * 0.8, 3, 2);
      ctx.fillRect(r * 0.65 - 2, -r * 0.8, 3, 2);
      ctx.shadowBlur = 0;

      // Heavy Diamond Hull Armor Plates
      ctx.fillStyle = primaryColor;
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.1);       // Forward prow rammer
      ctx.lineTo(r * 1.25, 0);      // Mid sponson
      ctx.lineTo(r * 0.75, -r * 0.75); // Rear engine wing
      ctx.lineTo(-r * 0.75, -r * 0.75);
      ctx.lineTo(-r * 1.25, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Layered Composite Armor Panels
      ctx.fillStyle = armorPlate;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.8);
      ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(r * 0.5, -r * 0.55);
      ctx.lineTo(-r * 0.5, -r * 0.55);
      ctx.lineTo(-r * 0.85, 0);
      ctx.closePath();
      ctx.fill();

      // Military Hazard Chevrons (Yellow / Black stripes)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.2);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.4, -r * 0.2);
      ctx.moveTo(-r * 0.35, -r * 0.35);
      ctx.lineTo(0, -r * 0.15);
      ctx.lineTo(r * 0.35, -r * 0.35);
      ctx.stroke();

      // Twin Forward Autocannons
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-r * 0.3 - 3, r * 0.2, 6, r * 0.7);
      ctx.fillRect(r * 0.3 - 3, r * 0.2, 6, r * 0.7);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-r * 0.3 - 2, r * 0.85, 4, 3);
      ctx.fillRect(r * 0.3 - 2, r * 0.85, 4, 3);

      // Reinforced Command Visor
      const visorGrad = ctx.createLinearGradient(0, 0, 0, r * 0.5);
      visorGrad.addColorStop(0, '#ffffff');
      visorGrad.addColorStop(0.3, '#f43f5e');
      visorGrad.addColorStop(1, '#881337');
      ctx.fillStyle = visorGrad;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.3, r * 0.18, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'kamikaze') {
      // ══════════════════════════════════════════════════════════════
      // RAZOR DIVE DART (High-Speed Downward Ramming Striker)
      // ══════════════════════════════════════════════════════════════
      const hullColor = this.hitFlash > 0 ? '#ffffff' : '#450a0a';
      const wingGrad = ctx.createLinearGradient(0, -r, 0, r);
      wingGrad.addColorStop(0, '#ea580c');
      wingGrad.addColorStop(0.5, '#dc2626');
      wingGrad.addColorStop(1, '#991b1b');

      // Supercharged Afterburner Nozzle (pointing up)
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ff4400';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-6, -r * 0.9, 12, 8);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(-4, -r * 0.9, 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -r * 0.9, 4, 2);
      ctx.shadowBlur = 0;

      // Razor Needle Forward Arrow Wings
      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : wingGrad;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.35); // Long sharp needle nose piercing downwards
      ctx.lineTo(r * 1.1, -r * 0.4); // Swept sharp right wingtip
      ctx.lineTo(r * 0.8, -r * 0.7);
      ctx.lineTo(r * 0.3, -r * 0.55);
      ctx.lineTo(0, -r * 0.8); // Rear engine notch
      ctx.lineTo(-r * 0.3, -r * 0.55);
      ctx.lineTo(-r * 0.8, -r * 0.7);
      ctx.lineTo(-r * 1.1, -r * 0.4); // Swept sharp left wingtip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Carbon Armor Reinforcement Spine
      ctx.fillStyle = hullColor;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.15);
      ctx.lineTo(r * 0.25, 0);
      ctx.lineTo(r * 0.2, -r * 0.65);
      ctx.lineTo(-r * 0.2, -r * 0.65);
      ctx.lineTo(-r * 0.25, 0);
      ctx.closePath();
      ctx.fill();

      // Incandescent Red Cockpit Visor / Target Seeker Eye
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff0033';
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(0, r * 0.25, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, r * 0.25, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (this.type === 'phantom') {
      // ══════════════════════════════════════════════════════════════
      // PHANTOM INFILTRATOR (Stealth Forward-Swept Void Strafer)
      // ══════════════════════════════════════════════════════════════
      const hullColor = this.hitFlash > 0 ? '#ffffff' : '#1e112a';
      const wingColor = this.hitFlash > 0 ? '#ffffff' : '#3b0764';

      // Rear Ion Engine Nozzles
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#c084fc';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, -r * 0.85, 6, 8);
      ctx.fillRect(4, -r * 0.85, 6, 8);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(-9, -r * 0.85, 4, 3);
      ctx.fillRect(5, -r * 0.85, 4, 3);
      ctx.shadowBlur = 0;

      // Aggressive Forward-Swept Inverted Wings
      ctx.fillStyle = wingColor;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.2);         // Needle nose
      ctx.lineTo(r * 0.45, r * 0.3);
      ctx.lineTo(r * 1.4, r * 0.7);   // Forward-raked outer wingtip
      ctx.lineTo(r * 1.25, -r * 0.4); // Trailing edge
      ctx.lineTo(r * 0.35, -r * 0.6);
      ctx.lineTo(0, -r * 0.75);
      ctx.lineTo(-r * 0.35, -r * 0.6);
      ctx.lineTo(-r * 1.25, -r * 0.4);
      ctx.lineTo(-r * 1.4, r * 0.7);
      ctx.lineTo(-r * 0.45, r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Stealth Faceted Center Fuselage
      ctx.fillStyle = hullColor;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.25);
      ctx.lineTo(r * 0.3, 0);
      ctx.lineTo(r * 0.22, -r * 0.7);
      ctx.lineTo(-r * 0.22, -r * 0.7);
      ctx.lineTo(-r * 0.3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Glowing Neon Violet Wing Conduits
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.35, 0);
      ctx.lineTo(r * 1.2, r * 0.55);
      ctx.moveTo(-r * 0.35, 0);
      ctx.lineTo(-r * 1.2, r * 0.55);
      ctx.stroke();

      // Emerald Targeting Visor
      ctx.fillStyle = '#10b981';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.2, r * 0.14, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (this.type === 'wraith') {
      // ══════════════════════════════════════════════════════════════
      // WRAITH APEX PREDATOR (Heavy Crimson Pursuit Dogfighter)
      // ══════════════════════════════════════════════════════════════
      const hullColor = this.hitFlash > 0 ? '#ffffff' : '#2d0607';
      const armorColor = this.hitFlash > 0 ? '#ffffff' : '#7f1d1d';

      // Twin Heavy Thruster Turbine Housings
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-r * 0.55 - 4, -r * 0.85, 8, 9);
      ctx.fillRect(r * 0.55 - 4, -r * 0.85, 8, 9);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-r * 0.55 - 3, -r * 0.85, 6, 4);
      ctx.fillRect(r * 0.55 - 3, -r * 0.85, 6, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-r * 0.55 - 1.5, -r * 0.85, 3, 2);
      ctx.fillRect(r * 0.55 - 1.5, -r * 0.85, 3, 2);
      ctx.shadowBlur = 0;

      // Heavy Diamond Pursuit Hull with Dual Razor Pincer Prongs
      ctx.fillStyle = armorColor;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.25, r * 1.35);  // Starboard prow prong
      ctx.lineTo(r * 0.1, r * 0.7);
      ctx.lineTo(0, r * 0.85);        // Center throat notch
      ctx.lineTo(-r * 0.1, r * 0.7);
      ctx.lineTo(-r * 0.25, r * 1.35); // Port prow prong
      ctx.lineTo(-r * 0.6, r * 0.4);
      ctx.lineTo(-r * 1.3, -r * 0.2); // Port swept wing
      ctx.lineTo(-r * 0.7, -r * 0.75);
      ctx.lineTo(r * 0.7, -r * 0.75);
      ctx.lineTo(r * 1.3, -r * 0.2);  // Starboard swept wing
      ctx.lineTo(r * 0.6, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Layered Carbon Armor Spine
      ctx.fillStyle = hullColor;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.75);
      ctx.lineTo(r * 0.35, 0);
      ctx.lineTo(r * 0.25, -r * 0.6);
      ctx.lineTo(-r * 0.25, -r * 0.6);
      ctx.lineTo(-r * 0.35, 0);
      ctx.closePath();
      ctx.fill();

      // Wingtip Heavy Pursuit Cannons
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(r * 1.15, -r * 0.1, 4, r * 0.6);
      ctx.fillRect(-r * 1.15 - 4, -r * 0.1, 4, r * 0.6);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(r * 1.15, r * 0.45, 4, 3);
      ctx.fillRect(-r * 1.15 - 4, r * 0.45, 4, 3);

      // Glowing Ruby Target Core
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#ff0033';
      ctx.beginPath();
      ctx.arc(0, r * 0.15, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, r * 0.15, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (this.type === 'cobra') {
      // ══════════════════════════════════════════════════════════════
      // COBRA VIPER (Evasive Zig-Zag Striker)
      // ══════════════════════════════════════════════════════════════
      const hullColor = this.hitFlash > 0 ? '#ffffff' : '#022c22';
      const wingGrad = ctx.createLinearGradient(0, -r, 0, r);
      wingGrad.addColorStop(0, '#059669');
      wingGrad.addColorStop(0.5, '#10b981');
      wingGrad.addColorStop(1, '#06b6d4');

      // Serpentine Twin Rear Engine Jets
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8, -r * 0.85, 5, 8);
      ctx.fillRect(3, -r * 0.85, 5, 8);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-7, -r * 0.85, 3, 3);
      ctx.fillRect(4, -r * 0.85, 3, 3);
      ctx.shadowBlur = 0;

      // Serpentine Blade Wings (Swept Diamond Slither Wings)
      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : wingGrad;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.35); // Sharp needle fang prow
      ctx.lineTo(r * 0.4, r * 0.5);
      ctx.lineTo(r * 1.25, r * 0.1); // Razor side canard
      ctx.lineTo(r * 1.1, -r * 0.5);
      ctx.lineTo(r * 0.4, -r * 0.7);
      ctx.lineTo(0, -r * 0.6);
      ctx.lineTo(-r * 0.4, -r * 0.7);
      ctx.lineTo(-r * 1.1, -r * 0.5);
      ctx.lineTo(-r * 1.25, r * 0.1);
      ctx.lineTo(-r * 0.4, r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Slithering Carbon Armor Center
      ctx.fillStyle = hullColor;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.2);
      ctx.lineTo(r * 0.25, 0);
      ctx.lineTo(r * 0.2, -r * 0.55);
      ctx.lineTo(-r * 0.2, -r * 0.55);
      ctx.lineTo(-r * 0.25, 0);
      ctx.closePath();
      ctx.fill();

      // Twin Emerald Railgun Needles
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(r * 0.2, r * 0.2, 3, r * 0.9);
      ctx.fillRect(-r * 0.2 - 3, r * 0.2, 3, r * 0.9);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(r * 0.2, r * 1.05, 3, 3);
      ctx.fillRect(-r * 0.2 - 3, r * 1.05, 3, 3);

      // Cyan / Gold Visor
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.18, r * 0.14, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, r * 0.15, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else {
      // ══════════════════════════════════════════════════════════════
      // DREADNOUGHT DESTROYER (Heavy Interceptor Battleship)
      // ══════════════════════════════════════════════════════════════
      const hullColor = this.hitFlash > 0 ? '#ffffff' : '#18181b';
      const armorColor = this.hitFlash > 0 ? '#ffffff' : '#27272a';

      // Triple Heavy Engine Propulsion Bank
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#f97316';
      [-r * 0.55, 0, r * 0.55].forEach((offset) => {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(offset - 4, -r * 0.85, 8, 8);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(offset - 3, -r * 0.85, 6, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(offset - 1.5, -r * 0.85, 3, 2);
      });
      ctx.shadowBlur = 0;

      // Heavy Battleship Armored Wing Sponsons
      ctx.fillStyle = hullColor;
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.2);         // Forward ramming bow
      ctx.lineTo(r * 0.6, r * 0.6);
      ctx.lineTo(r * 1.4, r * 0.1);   // Starboard battery pod
      ctx.lineTo(r * 1.3, -r * 0.6);  // Starboard wing trailing edge
      ctx.lineTo(r * 0.65, -r * 0.7);
      ctx.lineTo(0, -r * 0.8);        // Stern
      ctx.lineTo(-r * 0.65, -r * 0.7);
      ctx.lineTo(-r * 1.3, -r * 0.6); // Port wing trailing edge
      ctx.lineTo(-r * 1.4, r * 0.1);  // Port battery pod
      ctx.lineTo(-r * 0.6, r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy Armor Citadel Plates
      ctx.fillStyle = armorColor;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.85);
      ctx.lineTo(r * 0.55, r * 0.15);
      ctx.lineTo(r * 0.45, -r * 0.5);
      ctx.lineTo(-r * 0.45, -r * 0.5);
      ctx.lineTo(-r * 0.55, r * 0.15);
      ctx.closePath();
      ctx.fill();

      // Broadside Heavy Particle Cannon Barrels
      ctx.fillStyle = '#09090b';
      ctx.fillRect(r * 1.0 - 3, -r * 0.1, 6, r * 0.7);
      ctx.fillRect(-r * 1.0 - 3, -r * 0.1, 6, r * 0.7);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(r * 1.0 - 2, r * 0.55, 4, 3);
      ctx.fillRect(-r * 1.0 - 2, r * 0.55, 4, 3);

      // Missile Pod Hatches (Hexagonal Cells)
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(r * 0.35, -r * 0.25, 8, 12);
      ctx.fillRect(-r * 0.35 - 8, -r * 0.25, 8, 12);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(r * 0.35 + 2, -r * 0.2, 4, 3);
      ctx.fillRect(-r * 0.35 - 6, -r * 0.2, 4, 3);

      // Command Bridge Citadel (Glowing Amber Viewport)
      const bridgeGrad = ctx.createLinearGradient(0, 0, 0, r * 0.5);
      bridgeGrad.addColorStop(0, '#ffffff');
      bridgeGrad.addColorStop(0.3, '#f59e0b');
      bridgeGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = bridgeGrad;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.25, r * 0.18, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mini Shield/Health Bar when damaged
    if (this.hp < this.maxHp) {
      const barW = this.radius * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-barW / 2, -this.radius - 12, barW, 4);
      ctx.fillStyle = this.hp / this.maxHp > 0.4 ? '#00ff88' : '#ff0055';
      ctx.fillRect(-barW / 2, -this.radius - 12, barW * (this.hp / this.maxHp), 4);
    }

    ctx.restore();
  }
}

export { ModularBoss, Boss } from './bossSystem';

export class PowerUp {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 1.6;
  type: PowerUpType;
  radius: number = 19;
  time: number = 0;
  magnetized: boolean = false;

  constructor(x: number, y: number, type: PowerUpType) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.vx = (Math.random() - 0.5) * 1.6;
    this.vy = 1.2 + Math.random() * 0.5;
  }

  update(playerX: number = -999, playerY: number = -999, isOverdrive: boolean = false) {
    this.time++;

    // Magnetic Attractor: When player is nearby, canisters gravitate toward player!
    const magnetDistance = isOverdrive ? 210 : 130;
    const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);

    if (distToPlayer < magnetDistance) {
      this.magnetized = true;
      const angle = Math.atan2(playerY - this.y, playerX - this.x);
      const pull = Math.min(10.5, 3.8 + (magnetDistance - distToPlayer) * 0.065);
      this.vx += (Math.cos(angle) * pull - this.vx) * 0.18;
      this.vy += (Math.sin(angle) * pull - this.vy) * 0.18;
      this.x += this.vx;
      this.y += this.vy;
    } else {
      this.magnetized = false;
      this.vx *= 0.95;
      this.y += this.vy;
      this.x += this.vx + Math.sin(this.time * 0.055) * 1.1;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    let color = '#00ffff';
    let label = 'S';
    let sublabel = '';

    switch (this.type) {
      case 'spread':
        color = '#10b981';
        label = 'SPREAD';
        sublabel = '+CANNON';
        break;
      case 'swarm_missiles':
        color = '#f97316';
        label = 'MISSILE';
        sublabel = '+SALVO';
        break;
      case 'shield':
        color = '#06b6d4';
        label = 'SHIELD';
        sublabel = '+REPAIR';
        break;
      case 'energy_shield':
        color = '#00f0ff';
        label = 'BARRIER';
        sublabel = 'DEFLECT';
        break;
      case 'bomb':
        color = '#ef4444';
        label = 'EMP';
        sublabel = 'NUKE';
        break;
      case 'overdrive':
        color = '#d946ef';
        label = 'OVERDRIVE';
        sublabel = 'HYPER';
        break;
    }

    const pulse = Math.sin(this.time * 0.12) * 2;
    const glowRadius = this.radius + pulse;

    // Magnetic lock beam when gravitating toward player
    if (this.magnetized) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Outer Rotating Hexagonal Energy Shield Rings
    ctx.save();
    ctx.rotate(this.time * 0.035);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const px = Math.cos(a) * glowRadius;
      const py = Math.sin(a) * glowRadius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Solid High-Tech Core Canister
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner Glowing Core
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.7);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.5, color);
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Canister Badge & Label Typography
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 8.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;
    ctx.fillText(label, 0, -2);

    ctx.fillStyle = color;
    ctx.font = '800 6.5px monospace';
    ctx.fillText(sublabel, 0, 7);

    ctx.restore();
  }
}

export { Particle, ParticleSystem } from './particleSystem';

export class FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number = 40;
  maxLife: number = 40;

  constructor(x: number, y: number, text: string, color: string = '#00ffff') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
  }

  update() {
    this.y -= 1.4;
    this.life--;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.font = '900 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export type StarLayerDepth = 'far' | 'mid' | 'near';

export interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class Star {
  x: number;
  y: number;
  size: number;
  baseSpeed: number;
  speed: number;
  color: string;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  depth: StarLayerDepth;
  depthFactor: number;
  hasGlow: boolean;

  constructor(width: number, height: number, colorTheme: string, depth?: StarLayerDepth) {
    this.depth = depth || (Math.random() < 0.5 ? 'far' : Math.random() < 0.75 ? 'mid' : 'near');
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.twinkleSpeed = 0.02 + Math.random() * 0.04;
    this.twinklePhase = Math.random() * Math.PI * 2;

    if (this.depth === 'far') {
      // Layer 0: Distant cosmos - tiny, subtle, slow drift
      this.depthFactor = 0.35;
      this.size = 0.8 + Math.random() * 0.6;
      this.baseSpeed = 0.45 + Math.random() * 0.45;
      this.baseAlpha = 0.25 + Math.random() * 0.35;
      this.hasGlow = false;
      const farColors = ['#94a3b8', '#cbd5e1', '#64748b', colorTheme];
      this.color = farColors[Math.floor(Math.random() * farColors.length)];
    } else if (this.depth === 'mid') {
      // Layer 1: Mid-field star clusters - medium size and speed
      this.depthFactor = 0.75;
      this.size = 1.4 + Math.random() * 0.8;
      this.baseSpeed = 1.4 + Math.random() * 0.9;
      this.baseAlpha = 0.45 + Math.random() * 0.35;
      this.hasGlow = Math.random() < 0.2;
      const midColors = ['#ffffff', '#e0f2fe', '#bae6fd', colorTheme, '#fef08a'];
      this.color = midColors[Math.floor(Math.random() * midColors.length)];
    } else {
      // Layer 2: Foreground hyper-near stars - large, bright, rushing by fast
      this.depthFactor = 1.35;
      this.size = 2.4 + Math.random() * 1.4;
      this.baseSpeed = 3.6 + Math.random() * 2.2;
      this.baseAlpha = 0.75 + Math.random() * 0.25;
      this.hasGlow = true;
      const nearColors = ['#ffffff', '#ffffff', '#38bdf8', '#38bdf8', '#a855f7'];
      this.color = nearColors[Math.floor(Math.random() * nearColors.length)];
    }

    this.speed = this.baseSpeed;
    this.alpha = this.baseAlpha;
  }

  update(height: number, width: number, warpBoost: number = 1, playerVx: number = 0) {
    this.twinklePhase += this.twinkleSpeed;
    const twinkle = Math.sin(this.twinklePhase) * 0.25;
    this.alpha = Math.max(0.1, Math.min(1.0, this.baseAlpha + twinkle));

    // Vertical downward movement with depth-based speed and warp boost
    this.y += this.speed * warpBoost;

    // Horizontal parallax shift based on player lateral movement
    this.x -= playerVx * this.depthFactor * 0.12;

    // Wrap around boundaries smoothly
    if (this.y > height + 15) {
      this.y = -10;
      this.x = Math.random() * width;
    } else if (this.y < -15) {
      this.y = height + 10;
      this.x = Math.random() * width;
    }

    if (this.x < -20) {
      this.x = width + 15;
    } else if (this.x > width + 20) {
      this.x = -15;
    }
  }

  draw(ctx: CanvasRenderingContext2D, warpBoost: number = 1) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;

    const isWarping = warpBoost > 1.15;
    // Streak length stretches dynamically according to depth speed and warp boost
    const streakLength = isWarping 
      ? Math.max(this.size * 2, this.speed * warpBoost * (this.depthFactor * 1.8))
      : this.depth === 'near' 
      ? this.size * 2.2 
      : this.size;

    if (this.hasGlow && this.depth === 'near') {
      ctx.shadowBlur = isWarping ? 14 : 8;
      ctx.shadowColor = this.color;
    }

    if (streakLength > this.size * 1.4) {
      // Render as streamlined relativistic light beam
      const halfW = Math.max(0.6, this.size * 0.5);
      ctx.beginPath();
      ctx.moveTo(this.x - halfW, this.y);
      ctx.lineTo(this.x + halfW, this.y);
      ctx.lineTo(this.x + halfW * 0.4, this.y - streakLength);
      ctx.lineTo(this.x - halfW * 0.4, this.y - streakLength);
      ctx.closePath();
      ctx.fill();

      // Optical cross sparkle on bright foreground stars
      if (this.depth === 'near' && !isWarping && this.size > 2.6) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        const arm = this.size * 2.2;
        ctx.beginPath();
        ctx.moveTo(this.x - arm, this.y);
        ctx.lineTo(this.x + arm, this.y);
        ctx.moveTo(this.x, this.y - arm * 0.7);
        ctx.lineTo(this.x, this.y + arm * 0.7);
        ctx.stroke();
      }
    } else {
      // Circle star
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class ParallaxStarfield {
  public stars: Star[] = [];
  public shootingStars: ShootingStar[] = [];
  public nebulaDust: { x: number; y: number; radius: number; alpha: number; color: string; vy: number }[] = [];
  private shootingStarTimer: number = 0;
  private width: number;
  private height: number;
  private colorTheme: string;

  constructor(width: number, height: number, colorTheme: string) {
    this.width = width;
    this.height = height;
    this.colorTheme = colorTheme;
    this.init();
  }

  public init() {
    this.stars = [];
    this.nebulaDust = [];
    this.shootingStars = [];
    this.shootingStarTimer = Math.floor(180 + Math.random() * 240);

    // Layer 0: Deep Cosmos (120 stars) - slow, distant background
    for (let i = 0; i < 120; i++) {
      this.stars.push(new Star(this.width, this.height, this.colorTheme, 'far'));
    }

    // Layer 1: Midground (75 stars) - medium speed
    for (let i = 0; i < 75; i++) {
      this.stars.push(new Star(this.width, this.height, this.colorTheme, 'mid'));
    }

    // Layer 2: Foreground Hyper-Speed (35 stars) - high speed, bright streaks
    for (let i = 0; i < 35; i++) {
      this.stars.push(new Star(this.width, this.height, this.colorTheme, 'near'));
    }

    // Atmospheric deep cosmic nebula dust clouds (drifting softly in the deep background)
    for (let i = 0; i < 6; i++) {
      this.nebulaDust.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 70 + Math.random() * 90,
        alpha: 0.04 + Math.random() * 0.06,
        color: this.colorTheme,
        vy: 0.25 + Math.random() * 0.35,
      });
    }
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.init();
  }

  public update(warpBoost: number = 1, playerVx: number = 0) {
    for (const star of this.stars) {
      star.update(this.height, this.width, warpBoost, playerVx);
    }

    // Update nebula dust clouds
    for (const d of this.nebulaDust) {
      d.y += d.vy * warpBoost;
      d.x -= playerVx * 0.04;
      if (d.y - d.radius > this.height) {
        d.y = -d.radius;
        d.x = Math.random() * this.width;
      }
    }

    // Shooting stars / meteors
    this.shootingStarTimer--;
    if (this.shootingStarTimer <= 0) {
      this.shootingStarTimer = Math.floor(200 + Math.random() * 260); // every 3-6 seconds
      const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.4;
      const speed = 12 + Math.random() * 8;
      this.shootingStars.push({
        x: Math.random() * (this.width * 0.8),
        y: -30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 60 + Math.random() * 40,
        life: 28,
        maxLife: 28,
        color: Math.random() < 0.5 ? '#ffffff' : this.colorTheme,
        size: 2.5
      });
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.x += ss.vx * (warpBoost > 1.2 ? 1.5 : 1.0);
      ss.y += ss.vy * (warpBoost > 1.2 ? 1.5 : 1.0);
      ss.life--;
      if (ss.life <= 0 || ss.y > this.height + 100 || ss.x > this.width + 100) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D, warpBoost: number = 1) {
    // 1. Draw Deep Nebula Dust Clouds
    for (const d of this.nebulaDust) {
      ctx.save();
      const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.radius);
      grad.addColorStop(0, d.color);
      grad.addColorStop(1, 'transparent');
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw Stars Layer by Layer (Far -> Mid -> Near)
    for (const star of this.stars) {
      star.draw(ctx, warpBoost);
    }

    // 3. Draw Shooting Stars / Meteors
    for (const ss of this.shootingStars) {
      ctx.save();
      const progress = ss.life / ss.maxLife;
      ctx.globalAlpha = progress * 0.9;
      ctx.strokeStyle = ss.color;
      ctx.lineWidth = ss.size;
      ctx.shadowBlur = 12;
      ctx.shadowColor = ss.color;

      const angle = Math.atan2(ss.vy, ss.vx);
      const tailX = ss.x - Math.cos(angle) * ss.length;
      const tailY = ss.y - Math.sin(angle) * ss.length;

      const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.7, ss.color);
      grad.addColorStop(1, '#ffffff');

      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(ss.x, ss.y);
      ctx.stroke();

      // Incandescent head spark
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, ss.size * 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

export class EnergyOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  energyAmount: number;
  life: number = 0;
  maxLife: number = 180;
  color: string;
  size: number = 6.5;

  constructor(x: number, y: number, energyAmount: number = 180, color: string = '#00f0ff') {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 3.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.energyAmount = energyAmount;
    this.color = color;
  }

  update(playerX: number, playerY: number): boolean {
    this.life++;
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    // Magnetic homing toward player ship
    if (this.life > 6) {
      const pull = Math.min(1.4, 0.45 + this.life * 0.035);
      this.vx += (dx / Math.max(1, dist)) * pull;
      this.vy += (dy / Math.max(1, dist)) * pull;

      const currentSpeed = Math.hypot(this.vx, this.vy);
      if (currentSpeed > 15) {
        this.vx = (this.vx / currentSpeed) * 15;
        this.vy = (this.vy / currentSpeed) * 15;
      }
    } else {
      this.vx *= 0.94;
      this.vy *= 0.94;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Contact with player starfighter
    return dist < 32;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = this.color;

    // Pulsing energy matrix
    const pulse = Math.sin(this.life * 0.25) * 2;
    const rad = Math.max(3, this.size + pulse);

    // Glowing outer halo
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, rad, 0, Math.PI * 2);
    ctx.fill();

    // Hot incandescent core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, rad * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Streamer lightning tail
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 2, this.y - this.vy * 2);
    ctx.stroke();

    ctx.restore();
  }
}

