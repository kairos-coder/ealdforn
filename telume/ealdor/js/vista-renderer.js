// ═══════════════════════════════════════
// VISTA RENDERER · Canvas-based landscape engine
// ealdforn/telume/ealdor/js/vista-renderer.js
// ═══════════════════════════════════════

class VistaRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`VistaRenderer: canvas with id "${canvasId}" not found`);
    }
    this.ctx = this.canvas.getContext('2d');
    this.vista = null;
    this.state = null;
    this.hoveredZone = null;
    this.animFrame = null;
    this.time = 0;
    this.callbacks = {
      onZoneClick: null,    // (zoneId) => void
      onZoneHover: null,    // (zoneId | null) => void
      onTransition: null,   // (vistaId, zoneId) => void
      onAction: null,       // (zoneId, actionName) => void
    };

    this._bindMouse();
  }

  // ═══════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════

  async load(vistaUrl) {
    const resp = await fetch(vistaUrl);
    this.vista = await resp.json();
    this.canvas.width = this.vista.width;
    this.canvas.height = this.vista.height;
    this.startLoop();
  }

  loadDirect(vistaObject) {
    this.vista = vistaObject;
    this.canvas.width = this.vista.width;
    this.canvas.height = this.vista.height;
    this.startLoop();
  }

  setState(state) {
    this.state = state;
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  destroy() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.canvas.removeEventListener('click', this._clickHandler);
    this.canvas.removeEventListener('mousemove', this._moveHandler);
    this.canvas.removeEventListener('mouseleave', this._leaveHandler);
  }

  // ═══════════════════════════════════
  // MOUSE BINDING
  // ═══════════════════════════════════

  _bindMouse() {
    this._clickHandler = (e) => {
      const zone = this._getZoneAtEvent(e);
      if (zone) {
        if (this.callbacks.onZoneClick) this.callbacks.onZoneClick(zone);
        // Also check transitions
        if (this.vista && this.vista.transitions) {
          const transition = this.vista.transitions.find(t => t.from === zone);
          if (transition && this.callbacks.onTransition) {
            // Check conditions
            if (this._checkCondition(transition.condition)) {
              this.callbacks.onTransition(transition.to, zone);
              return;
            }
          }
        }
        // Otherwise trigger the zone's action
        const structure = this._getStructure(zone);
        if (structure && structure.action && this.callbacks.onAction) {
          this.callbacks.onAction(zone, structure.action);
        }
      }
    };

    this._moveHandler = (e) => {
      const zone = this._getZoneAtEvent(e);
      if (zone !== this.hoveredZone) {
        this.hoveredZone = zone;
        if (this.callbacks.onZoneHover) this.callbacks.onZoneHover(zone);
      }
      this.canvas.style.cursor = zone ? 'pointer' : 'default';
    };

    this._leaveHandler = () => {
      this.hoveredZone = null;
      if (this.callbacks.onZoneHover) this.callbacks.onZoneHover(null);
      this.canvas.style.cursor = 'default';
    };

    this.canvas.addEventListener('click', this._clickHandler);
    this.canvas.addEventListener('mousemove', this._moveHandler);
    this.canvas.addEventListener('mouseleave', this._leaveHandler);
  }

  _getZoneAtEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return this._getZoneAt(x, y);
  }

  _getZoneAt(x, y) {
    if (!this.vista) return null;
    for (const s of this.vista.structures) {
      if (!s.clickable) continue;
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        return s.zone;
      }
    }
    return null;
  }

  _getStructure(zoneId) {
    if (!this.vista) return null;
    return this.vista.structures.find(s => s.zone === zoneId) || null;
  }

  _checkCondition(condition) {
    if (!condition || !this.state) return true;
    for (const [key, val] of Object.entries(condition)) {
      if (key === 'ice') {
        if (val.min !== undefined && this.state.ice < val.min) return false;
        if (val.max !== undefined && this.state.ice > val.max) return false;
      }
      if (key === 'faith') {
        if (val.min !== undefined && this.state.faith < val.min) return false;
        if (val.max !== undefined && this.state.faith > val.max) return false;
      }
    }
    return true;
  }

  // ═══════════════════════════════════
  // ANIMATION LOOP
  // ═══════════════════════════════════

  startLoop() {
    const loop = (timestamp) => {
      this.time = timestamp;
      this._draw();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  // ═══════════════════════════════════
  // MASTER DRAW
  // ═══════════════════════════════════

  _draw() {
    if (!this.vista) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this._drawSky();
    this._drawWeather();
    this._drawTerrain();
    this._drawStructures();
    this._drawInteriors();
    this._drawNPCs();
    this._drawPlayer();
    this._drawOverlays();
    this._drawUI();
  }

  // ═══════════════════════════════════
  // LAYER 0: SKY
  // ═══════════════════════════════════

  _drawSky() {
    const sky = this.vista.sky;
    const ctx = this.ctx;
    const h = this.canvas.height * 0.45;

    // Base gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(0.5, sky.mid || sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, h);

    // Aurora (faith-based)
    if (sky.aurora && this.state && this.state.faith >= sky.aurora.threshold) {
      const alpha = sky.aurora.opacity * ((this.state.faith - sky.aurora.threshold) / (100 - sky.aurora.threshold));
      const auroraGrad = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.7);
      const waveOffset = Math.sin(this.time / 3000) * 30;
      for (let i = 0; i < sky.aurora.colors.length; i++) {
        const color = sky.aurora.colors[i];
        auroraGrad.addColorStop(i / (sky.aurora.colors.length - 1), color);
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = auroraGrad;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.4 + waveOffset);
      for (let x = 0; x < this.canvas.width; x += 5) {
        const y = h * 0.4 + Math.sin(x / 80 + this.time / 2000) * 25 + waveOffset;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.canvas.width, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Stars
    if (sky.stars) {
      // Use deterministic pseudo-random based on vista ID
      const seed = this._hashCode(this.vista.id);
      ctx.fillStyle = '#c8d8e4';
      for (let i = 0; i < sky.starsCount; i++) {
        const x = ((seed * (i + 1) * 137) % this.canvas.width);
        const y = ((seed * (i + 1) * 251) % (h * 0.6));
        const twinkle = 0.3 + Math.sin(this.time / 1500 + i) * 0.3;
        ctx.globalAlpha = twinkle;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }
  }

  _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // ═══════════════════════════════════
  // LAYER 0.5: WEATHER PARTICLES
  // ═══════════════════════════════════

  _drawWeather() {
    if (!this.state || !this.vista.weather) return;
    const seasonKey = ['spring','summer','autumn','winter'][this.state.season];
    const weather = this.vista.weather[seasonKey];
    if (!weather || !weather.particles) return;

    const ctx = this.ctx;
    const seed = this._hashCode(this.vista.id + this.state.season);
    const count = weather.particles === 'snow' ? 60 : weather.particles === 'leaves' ? 20 : 30;

    ctx.fillStyle = weather.particleColor || '#c8d8e4';
    for (let i = 0; i < count; i++) {
      const x = ((seed * (i + 1) * 173 + this.time * 0.02 * (i % 3 + 1)) % (this.canvas.width + 40)) - 20;
      const y = ((seed * (i + 1) * 311 + this.time * 0.05 * (i % 4 + 1)) % (this.canvas.height + 20)) - 10;
      const size = weather.particles === 'snow' ? 1.5 + (i % 3) : weather.particles === 'leaves' ? 2 + (i % 4) : 1;
      ctx.globalAlpha = 0.4 + (i % 3) * 0.2;
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
  }

  // ═══════════════════════════════════
  // LAYER 1: TERRAIN
  // ═══════════════════════════════════

  _drawTerrain() {
    if (!this.vista.terrain) return;
    const ctx = this.ctx;

    for (const t of this.vista.terrain) {
      ctx.fillStyle = t.color;
      ctx.fillRect(t.x, t.y, t.w, t.h);

      switch (t.type) {
        case 'water':
          this._drawWater(t);
          break;
        case 'cliff':
          this._drawCliff(t);
          break;
        case 'forest':
          this._drawForest(t);
          break;
        case 'ground':
          this._drawGround(t);
          break;
      }
    }
  }

  _drawWater(t) {
    const ctx = this.ctx;
    // Wave lines
    ctx.strokeStyle = t.deepColor || '#1a3040';
    ctx.lineWidth = 1;
    for (let i = 0; i < t.w; i += 25) {
      const waveY = t.y + 15 + Math.sin((i + this.time / 400) / 20) * 4;
      ctx.beginPath();
      ctx.moveTo(t.x + i, waveY);
      ctx.lineTo(t.x + i + 20, waveY + 3);
      ctx.stroke();
    }

    // Ice freeze
    if (this.state && t.freezable && t.freezeThresholds) {
      const ice = this.state.ice;
      for (const threshold of t.freezeThresholds) {
        if (ice >= threshold.ice) {
          const alpha = Math.min(1, (ice - threshold.ice + 10) / 20);
          ctx.fillStyle = t.iceColor || '#c8d8e4';
          ctx.globalAlpha = alpha;
          ctx.fillRect(t.x, t.y + threshold.y, t.w, threshold.h);
          ctx.globalAlpha = 1;

          // Ice edge highlight
          ctx.strokeStyle = t.iceEdgeColor || '#e8f0f8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(t.x, t.y + threshold.y);
          ctx.lineTo(t.x + t.w, t.y + threshold.y);
          ctx.stroke();
        }
      }

      // Ice features
      if (t.features) {
        for (const f of t.features) {
          if (f.visibleWhen && ice >= f.visibleWhen.ice) {
            this._drawTerrainFeature(f);
          }
        }
      }
    }
  }

  _drawCliff(t) {
    const ctx = this.ctx;
    const strata = t.strata || [t.color];
    const strataH = t.h / strata.length;
    for (let i = 0; i < strata.length; i++) {
      ctx.fillStyle = strata[i];
      ctx.fillRect(t.x, t.y + i * strataH, t.w, strataH + 1);
      // Rocky texture
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let j = 0; j < t.w; j += 12) {
        ctx.fillRect(t.x + j + (i % 3) * 4, t.y + i * strataH + 2, 4, 2);
      }
    }
  }

  _drawForest(t) {
    const ctx = this.ctx;
    // Base
    ctx.fillStyle = t.color;
    ctx.fillRect(t.x, t.y, t.w, t.h);

    // Trees
    const density = t.treeDensity || 0.5;
    const spacing = Math.floor(30 / density);
    const seed = this._hashCode(t.id || 'forest');

    for (let x = t.x; x < t.x + t.w; x += spacing) {
      const offsetX = (seed * (x + 1) * 7) % 15;
      const h = 20 + (seed * x * 13) % 25;
      const treeX = x + offsetX;

      // Trunk
      ctx.fillStyle = '#3d2b1f';
      ctx.fillRect(treeX - 1.5, t.y + h * 0.5, 3, h * 0.5);

      // Canopy
      ctx.fillStyle = t.treeColor || '#2d3a1f';
      ctx.beginPath();
      ctx.moveTo(treeX, t.y);
      ctx.lineTo(treeX - 10, t.y + h * 0.7);
      ctx.lineTo(treeX + 10, t.y + h * 0.7);
      ctx.closePath();
      ctx.fill();

      // Highlight
      ctx.fillStyle = t.treeHighlight || '#3d5a2a';
      ctx.beginPath();
      ctx.moveTo(treeX, t.y + 2);
      ctx.lineTo(treeX - 6, t.y + h * 0.5);
      ctx.lineTo(treeX + 6, t.y + h * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // Mist
    if (t.mist) {
      const mistGrad = ctx.createLinearGradient(0, t.y, 0, t.y + 20);
      mistGrad.addColorStop(0, 'transparent');
      mistGrad.addColorStop(1, t.mistColor || '#8a9baa');
      ctx.globalAlpha = t.mistOpacity || 0.15;
      ctx.fillStyle = mistGrad;
      ctx.fillRect(t.x, t.y, t.w, 20);
      ctx.globalAlpha = 1;
    }

    // Features (clearings, paths)
    if (t.features) {
      for (const f of t.features) {
        if (f.type === 'clearing') {
          ctx.fillStyle = '#3d4f2a';
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  _drawGround(t) {
    const ctx = this.ctx;
    // Paths
    if (t.paths) {
      ctx.strokeStyle = t.pathColor || '#6b5d4f';
      ctx.lineCap = 'round';
      for (const p of t.paths) {
        ctx.lineWidth = p.width;
        ctx.beginPath();
        ctx.moveTo(p.from[0], p.from[1]);
        ctx.lineTo(p.to[0], p.to[1]);
        ctx.stroke();
      }
    }
  }

  _drawTerrainFeature(f) {
    const ctx = this.ctx;
    switch (f.type) {
      case 'ship_trapped':
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(f.x - 12, f.y - 4, 24, 8);
        ctx.fillStyle = '#6b4f3d';
        ctx.fillRect(f.x - 6, f.y - 16, 3, 14);
        ctx.beginPath();
        ctx.moveTo(f.x - 6, f.y - 16);
        ctx.lineTo(f.x + 8, f.y - 10);
        ctx.lineTo(f.x + 8, f.y - 4);
        ctx.lineTo(f.x - 6, f.y - 4);
        ctx.fill();
        break;
      case 'ice_fisher':
        ctx.fillStyle = '#5c4f42';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8b7d6b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x + 3, f.y + 12);
        ctx.stroke();
        break;
    }
  }

  // ═══════════════════════════════════
  // LAYER 2: STRUCTURES
  // ═══════════════════════════════════

  _drawStructures() {
    if (!this.vista.structures) return;
    const ctx = this.ctx;

    // Sort by y for depth ordering
    const sorted = [...this.vista.structures].sort((a, b) => a.y - b.y);

    for (const s of sorted) {
      ctx.save();

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(s.x + 3, s.y + 3, s.w, s.h);

      // Base building
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.w, s.h);

      // Wall texture lines
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      for (let ly = s.y + 6; ly < s.y + s.h; ly += 8) {
        ctx.beginPath();
        ctx.moveTo(s.x + 2, ly);
        ctx.lineTo(s.x + s.w - 2, ly);
        ctx.stroke();
      }

      // Roof
      this._drawRoof(s);

      // Crenellations
      if (s.crenellations) {
        ctx.fillStyle = s.highlightColor || s.color;
        const spacing = s.crenellationSpacing || 22;
        const height = s.crenellationHeight || 10;
        for (let cx = s.x; cx < s.x + s.w; cx += spacing) {
          ctx.fillRect(cx, s.y - height, spacing * 0.6, height);
        }
      }

      // Features
      if (s.features) {
        for (const f of s.features) {
          this._drawStructureFeature(s, f);
        }
      }

      // Highlight on hover
      if (s.clickable && s.zone === this.hoveredZone) {
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x - 1, s.y - 1, s.w + 2, s.h + 2);
      }

      ctx.restore();
    }
  }

  _drawRoof(s) {
    const ctx = this.ctx;
    const roofColor = s.roofColor || '#3d362f';
    ctx.fillStyle = roofColor;

    switch (s.roof) {
      case 'peaked':
        ctx.beginPath();
        ctx.moveTo(s.x - 4, s.y);
        ctx.lineTo(s.x + s.w / 2, s.y - (s.roofHeight || 25));
        ctx.lineTo(s.x + s.w + 4, s.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;

      case 'vaulted':
        ctx.beginPath();
        ctx.arc(s.x + s.w / 2, s.y, s.w / 2 + 3, Math.PI, 0, false);
        ctx.fill();
        break;

      case 'domed':
        ctx.beginPath();
        ctx.arc(s.x + s.w / 2, s.y, s.w / 2, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.arc(s.x + s.w / 2 - 10, s.y - 5, s.w / 5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'gabled':
        ctx.beginPath();
        ctx.moveTo(s.x - 3, s.y);
        ctx.lineTo(s.x + s.w / 2, s.y - (s.roofHeight || 20));
        ctx.lineTo(s.x + s.w + 3, s.y);
        ctx.closePath();
        ctx.fill();
        break;

      case 'steeple':
        const sh = s.roofHeight || 45;
        ctx.fillRect(s.x + s.w / 2 - 7, s.y - sh, 14, sh);
        ctx.beginPath();
        ctx.moveTo(s.x + s.w / 2 - 9, s.y - sh);
        ctx.lineTo(s.x + s.w / 2, s.y - sh - 15);
        ctx.lineTo(s.x + s.w / 2 + 9, s.y - sh);
        ctx.closePath();
        ctx.fill();
        break;

      case 'conical':
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.w / 2, s.y - (s.roofHeight || 30));
        ctx.lineTo(s.x + s.w, s.y);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  _drawStructureFeature(s, f) {
    const ctx = this.ctx;
    const fx = s.x + (f.x - s.x);
    const fy = s.y + (f.y - s.y);

    switch (f.type) {
      case 'door':
        if (f.open) {
          ctx.fillStyle = '#1a1410';
          ctx.fillRect(fx, fy, f.w, f.h);
          // Door arch
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(fx + f.w / 2, fy, f.w / 2, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#1a1410';
          ctx.beginPath();
          ctx.arc(fx + f.w / 2, fy, f.w / 2 - 2, Math.PI, 0);
          ctx.fill();
        } else {
          ctx.fillStyle = '#4a3a2f';
          ctx.fillRect(fx, fy, f.w, f.h);
          ctx.strokeStyle = '#3d362f';
          ctx.lineWidth = 1;
          ctx.strokeRect(fx, fy, f.w, f.h);
        }
        break;

      case 'window':
        ctx.fillStyle = f.lit ? (f.color || '#daa520') : '#1a1410';
        ctx.fillRect(fx, fy, f.w, f.h);
        ctx.strokeStyle = '#3d362f';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(fx, fy, f.w, f.h);
        // Cross
        ctx.beginPath();
        ctx.moveTo(fx + f.w / 2, fy);
        ctx.lineTo(fx + f.w / 2, fy + f.h);
        ctx.moveTo(fx, fy + f.h / 2);
        ctx.lineTo(fx + f.w, fy + f.h / 2);
        ctx.stroke();
        if (f.lit) {
          const glow = ctx.createRadialGradient(fx + f.w / 2, fy + f.h / 2, 2, fx + f.w / 2, fy + f.h / 2, 15);
          glow.addColorStop(0, 'rgba(218,165,32,0.3)');
          glow.addColorStop(1, 'rgba(218,165,32,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(fx - 10, fy - 10, f.w + 20, f.h + 20);
        }
        break;

      case 'brazier':
        ctx.fillStyle = '#2a2018';
        ctx.fillRect(fx - 5, fy, 10, 8);
        ctx.fillStyle = f.color || '#c44f1c';
        const pulse = f.pulse ? 0.7 + Math.sin(this.time / 600) * 0.3 : 1;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(fx, fy - 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;

      case 'smoke':
        if (f.visible) {
          ctx.fillStyle = 'rgba(139,125,107,0.2)';
          const smokeOffset = Math.sin(this.time / 800) * 4;
          ctx.beginPath();
          ctx.arc(fx, fy + smokeOffset, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(fx + 2, fy - 6 + smokeOffset, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'portcullis':
        ctx.strokeStyle = '#2a2018';
        ctx.lineWidth = 1;
        for (let i = 0; i < f.w; i += 6) {
          ctx.beginPath();
          ctx.moveTo(fx + i, fy);
          ctx.lineTo(fx + i, fy + (f.raised ? 5 : f.h || 10));
          ctx.stroke();
        }
        break;

      case 'banner':
        ctx.fillStyle = f.color || '#b8860b';
        ctx.fillRect(fx - 8, fy, 16, 20);
        ctx.fillStyle = '#f4e4c1';
        ctx.font = '10px serif';
        ctx.textAlign = 'center';
        ctx.fillText(f.text || '', fx, fy + 14);
        break;

      case 'well':
        ctx.strokeStyle = '#4a3a2f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fx, fy, f.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#1a1410';
        ctx.beginPath();
        ctx.arc(fx, fy, f.r - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6b5d4f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx - f.r, fy);
        ctx.lineTo(fx + f.r, fy);
        ctx.moveTo(fx, fy - f.r);
        ctx.lineTo(fx, fy + f.r);
        ctx.stroke();
        break;

      case 'market_stall':
        ctx.fillStyle = f.color || '#8b7d6b';
        ctx.fillRect(fx, fy, f.w, f.h);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(fx, fy, f.w, 3);
        break;

      case 'granary_tower':
        ctx.fillStyle = f.color || '#5c4f42';
        ctx.fillRect(fx, fy, f.w, f.h);
        // Fill level indicator
        if (f.fillLevel !== undefined) {
          const fillH = f.h * f.fillLevel;
          ctx.fillStyle = '#b8860b';
          ctx.fillRect(fx + 4, fy + f.h - fillH, f.w - 8, fillH);
        }
        // Conical roof
        ctx.fillStyle = '#3d362f';
        ctx.beginPath();
        ctx.moveTo(fx - 2, fy);
        ctx.lineTo(fx + f.w / 2, fy - 15);
        ctx.lineTo(fx + f.w + 2, fy);
        ctx.closePath();
        ctx.fill();
        break;

      case 'forge':
        ctx.fillStyle = f.color || '#4a3a2f';
        ctx.fillRect(fx, fy, f.w, f.h);
        if (f.smoke) {
          ctx.fillStyle = 'rgba(139,125,107,0.3)';
          ctx.beginPath();
          ctx.arc(fx + f.w / 2, fy - 4, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'watchtower':
        ctx.fillStyle = s.color;
        ctx.fillRect(fx, fy, f.w, f.h);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(fx, fy, f.w, 3);
        ctx.fillStyle = '#c44f1c';
        ctx.beginPath();
        ctx.arc(fx + f.w / 2, fy - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'people':
        for (let i = 0; i < f.count; i++) {
          const px = f.scattered ? fx + (Math.sin(i * 2.7) * 15) : fx + i * 10;
          const py = f.scattered ? fy + (Math.cos(i * 3.1) * 12) : fy;
          ctx.fillStyle = '#6b5d4f';
          ctx.beginPath();
          ctx.arc(px, py - 4, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(px - 1.5, py - 1, 3, 6);
        }
        break;

      case 'glow':
        const glowGrad = ctx.createRadialGradient(fx, fy, 2, fx, fy, f.r);
        glowGrad.addColorStop(0, 'rgba(196,79,28,0.4)');
        glowGrad.addColorStop(1, 'rgba(196,79,28,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(fx - f.r, fy - f.r, f.r * 2, f.r * 2);
        break;
    }
  }

  // ═══════════════════════════════════
  // LAYER 3: INTERIORS
  // ═══════════════════════════════════

  _drawInteriors() {
    if (!this.vista.structures) return;
    const ctx = this.ctx;

    for (const s of this.vista.structures) {
      if (!s.interior || !s.interior.visible) continue;

      // Find the door to position interior view
      const door = s.features ? s.features.find(f => f.type === 'door' && f.open) : null;
      if (!door) continue;

      const doorAbsX = s.x + (door.x - s.x);
      const doorAbsY = s.y + (door.y - s.y);

      // Interior depth
      const depth = s.interior.depth || 25;
      ctx.fillStyle = s.interior.color || '#1a1410';
      ctx.fillRect(doorAbsX + 2, doorAbsY + 2, door.w - 4, depth);

      // Interior features
      if (s.interior.features) {
        ctx.save();
        // Clip to door area
        ctx.beginPath();
        ctx.rect(doorAbsX + 2, doorAbsY + 2, door.w - 4, depth);
        ctx.clip();

        const scale = 0.4; // scale down for depth
        for (const f of s.interior.features) {
          const ifx = doorAbsX + (f.x - s.x) * scale + 6;
          const ify = doorAbsY + 4 + (f.y - s.y) * 0.3;

          switch (f.type) {
            case 'round_table':
              ctx.fillStyle = '#8b7d6b';
              ctx.beginPath();
              ctx.arc(ifx, ify, f.r * scale, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#6b5d4f';
              ctx.lineWidth = 1;
              ctx.stroke();
              break;

            case 'fire_pit':
              if (f.lit) {
                ctx.fillStyle = '#c44f1c';
                ctx.beginPath();
                ctx.arc(ifx, ify, f.r * scale, 0, Math.PI * 2);
                ctx.fill();
              }
              break;

            case 'council_stone':
              ctx.fillStyle = '#5c4f42';
              ctx.beginPath();
              ctx.arc(ifx, ify, f.r * scale, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#4a4138';
              ctx.stroke();
              break;

            case 'empty_throne':
              ctx.fillStyle = f.color || '#b8860b';
              ctx.fillRect(ifx, ify, f.w * scale, f.h * scale);
              ctx.fillStyle = '#1a1410';
              ctx.fillRect(ifx + 1, ify + 1, f.w * scale - 2, f.h * scale - 2);
              break;

            case 'glyph_floor':
              ctx.fillStyle = 'rgba(184,134,11,0.15)';
              ctx.fillRect(ifx, ify, f.w * scale, f.h * scale);
              if (f.glyphs && this.state) {
                ctx.fillStyle = '#b8860b';
                ctx.font = `${6 * scale}px serif`;
                ctx.textAlign = 'center';
                const tabletCount = this.state.tabletFragments || 0;
                for (let i = 0; i < Math.min(tabletCount, f.glyphs.length); i++) {
                  ctx.fillText(f.glyphs[i], ifx + 8 + i * 10 * scale, ify + 12 * scale);
                }
              }
              break;

            case 'tablet_stand':
              ctx.fillStyle = '#5c4f42';
              ctx.fillRect(ifx, ify, f.w * scale, f.h * scale);
              if (this.state && f.tabletCount) {
                const count = Math.min(this.state.tabletFragments, f.tabletCount);
                for (let i = 0; i < count; i++) {
                  ctx.fillStyle = '#f4e4c1';
                  ctx.fillRect(ifx - 2, ify - i * 3, 6 * scale, 2);
                }
              }
              break;

            case 'brazier':
              ctx.fillStyle = '#c44f1c';
              const p = f.pulse ? 0.6 + Math.sin(this.time / 500) * 0.4 : 1;
              ctx.globalAlpha = p;
              ctx.beginPath();
              ctx.arc(ifx, ify, f.r * scale, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
              break;

            case 'bed':
              ctx.fillStyle = '#f4e4c1';
              ctx.fillRect(ifx, ify, f.w * scale, f.h * scale);
              ctx.fillStyle = '#8b7d6b';
              ctx.fillRect(ifx + 2, ify + 2, (f.w * scale) - 4, (f.h * scale) - 4);
              if (f.empty && this.state && this.state.rabbitAppeared) {
                ctx.fillStyle = '#c8d8e4';
                ctx.font = '8px serif';
                ctx.fillText('🐇', ifx + 5 * scale, ify + 8 * scale);
              }
              break;

            case 'fireplace':
              ctx.fillStyle = '#3d362f';
              ctx.fillRect(ifx, ify, f.w * scale, f.h * scale);
              if (f.lit) {
                ctx.fillStyle = '#c44f1c';
                ctx.fillRect(ifx + 2, ify + 2, 4 * scale, 4 * scale);
              }
              break;

            case 'candle':
              ctx.fillStyle = f.lit ? '#daa520' : '#5c4f42';
              ctx.fillRect(ifx, ify, 1.5, 6 * scale);
              if (f.lit) {
                ctx.fillStyle = '#daa520';
                ctx.beginPath();
                ctx.arc(ifx + 0.75, ify - 1, 2, 0, Math.PI * 2);
                ctx.fill();
              }
              break;

            case 'npc_spot':
              if (f.npc && this.vista.npcs) {
                const npc = this.vista.npcs.find(n => n.id === f.npc);
                if (npc && this._isNpcVisible(npc)) {
                  ctx.font = '10px serif';
                  ctx.fillText(npc.glyph, ifx, ify);
                }
              }
              break;
          }
        }
        ctx.restore();
      }
    }
  }

  // ═══════════════════════════════════
  // LAYER 4: NPCs
  // ═══════════════════════════════════

  _drawNPCs() {
    if (!this.vista.npcs || !this.state) return;
    const ctx = this.ctx;

    for (const npc of this.vista.npcs) {
      if (!this._isNpcVisible(npc)) continue;
      if (npc.zone && this.state.playerZone === npc.zone) continue; // drawn in interior if inside

      // Only draw if player is in same zone or NPC is always visible
      const npcZone = npc.zone;
      if (npcZone && this.state.playerZone !== npcZone && !npc.visible) continue;

      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.fillText(npc.glyph, npc.x, npc.y);

      // Glow for special NPCs
      if (npc.id === 'rabbit' && this.state.rabbitAppeared) {
        const glow = ctx.createRadialGradient(npc.x, npc.y, 4, npc.x, npc.y, 16);
        glow.addColorStop(0, 'rgba(200,216,228,0.3)');
        glow.addColorStop(1, 'rgba(200,216,228,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(npc.x - 16, npc.y - 16, 32, 32);
      }
    }
  }

  _isNpcVisible(npc) {
    if (npc.visible) return true;
    if (npc.condition && this.state) {
      return !!this.state[npc.condition];
    }
    return false;
  }

  // ═══════════════════════════════════
  // LAYER 5: PLAYER
  // ═══════════════════════════════════

  _drawPlayer() {
    if (!this.state || !this.vista.structures) return;
    const ctx = this.ctx;

    const structure = this.vista.structures.find(s => s.zone === this.state.playerZone);
    if (!structure) return;

    const px = structure.x + structure.w / 2;
    const py = structure.y + structure.h / 2;

    // Pulse ring
    const pulse = 0.5 + Math.sin(this.time / 400) * 0.5;
    ctx.beginPath();
    ctx.arc(px, py, 10 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(218,165,32,${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#daa520';
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ═══════════════════════════════════
  // LAYER 6: OVERLAYS
  // ═══════════════════════════════════

  _drawOverlays() {
    if (!this.vista.overlays || !this.state) return;
    const ctx = this.ctx;

    for (const overlay of this.vista.overlays) {
      switch (overlay.type) {
        case 'gradient_overlay':
          this._drawGradientOverlay(overlay);
          break;
        case 'color_overlay':
          this._drawColorOverlay(overlay);
          break;
        case 'vignette':
          this._drawVignette(overlay);
          break;
      }
    }
  }

  _drawGradientOverlay(overlay) {
    const ctx = this.ctx;
    const value = this.state[overlay.property] || 0;

    if (overlay.steps) {
      // Step-based (like ice)
      let currentStep = overlay.steps[0];
      for (const step of overlay.steps) {
        if (value >= step.value) currentStep = step;
      }
      if (currentStep.opacity <= 0) return;

      const target = this.vista.terrain.find(t => t.id === overlay.target);
      if (!target) return;

      const h = target.h * (parseFloat(currentStep.height) / 100);
      const grad = ctx.createLinearGradient(0, target.y, 0, target.y + h);
      grad.addColorStop(0, overlay.toColor);
      grad.addColorStop(1, overlay.fromColor);
      ctx.globalAlpha = currentStep.opacity;
      ctx.fillStyle = grad;
      ctx.fillRect(target.x, target.y, target.w, h);
      ctx.globalAlpha = 1;
    } else {
      // Simple value-based
      const alpha = Math.min(1, value / 100);
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      // Apply to entire canvas or specific target
      ctx.fillStyle = overlay.toColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  _drawColorOverlay(overlay) {
    if (!overlay.colors) return;
    const ctx = this.ctx;
    const value = this.state[overlay.property];
    const color = overlay.colors[value] || overlay.colors['0'];
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _drawVignette(overlay) {
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const innerR = maxR * (overlay.innerRadius || 0.6);
    const outerR = maxR * (overlay.outerRadius || 1.0);

    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, overlay.color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ═══════════════════════════════════
  // LAYER 7: UI OVERLAY
  // ═══════════════════════════════════

  _drawUI() {
    if (!this.vista.structures) return;
    const ctx = this.ctx;

    // Zone labels on hover
    if (this.hoveredZone) {
      const s = this.vista.structures.find(st => st.zone === this.hoveredZone && st.clickable);
      if (s) {
        const labelX = s.x + s.w / 2;
        const labelY = s.y - 10;

        // Background
        const text = s.ealdorName || s.name;
        ctx.font = 'bold 11px Georgia, serif';
        const metrics = ctx.measureText(text);
        const pad = 8;
        ctx.fillStyle = 'rgba(26,20,16,0.85)';
        ctx.fillRect(labelX - metrics.width / 2 - pad, labelY - 18, metrics.width + pad * 2, 22);
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1;
        ctx.strokeRect(labelX - metrics.width / 2 - pad, labelY - 18, metrics.width + pad * 2, 22);

        // Text
        ctx.fillStyle = '#f4e4c1';
        ctx.textAlign = 'center';
        ctx.fillText(text, labelX, labelY - 3);

        // Action hint
        if (s.actionName) {
          ctx.font = 'italic 9px Georgia, serif';
          ctx.fillStyle = '#8b7d6b';
          ctx.fillText(s.actionName, labelX, labelY + 10);
        }
      }
    }

    // Transition hints
    if (this.hoveredZone && this.vista.transitions) {
      const transition = this.vista.transitions.find(t => t.from === this.hoveredZone);
      if (transition && this._checkCondition(transition.condition)) {
        const s = this._getStructure(this.hoveredZone);
        if (s) {
          ctx.font = 'italic 9px Georgia, serif';
          ctx.fillStyle = '#6b8e23';
          ctx.textAlign = 'center';
          ctx.fillText(`→ ${transition.label}`, s.x + s.w / 2, s.y + s.h + 15);
        }
      }
    }
  }
}

// ═══════════════════════════════════
// EXPORT
// ═══════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VistaRenderer;
}
