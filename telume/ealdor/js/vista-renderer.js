// vista-renderer.js — loads JSON, draws to canvas
class VistaRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.vista = null;
    this.state = null; // reference to game state
    this.hoveredZone = null;
    this.animFrame = null;
  }

  async load(vistaUrl) {
    const resp = await fetch(vistaUrl);
    this.vista = await resp.json();
    this.canvas.width = this.vista.width;
    this.canvas.height = this.vista.height;
    this.startAnimation();
  }

  setState(state) {
    this.state = state;
  }

  draw() {
    if (!this.vista) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawSky();
    this.drawTerrain();
    this.drawStructures();
    this.drawInteriors();
    this.drawNPCs();
    this.drawPlayer();
    this.drawOverlays();
    this.drawUI();
  }

  drawSky() {
    const sky = this.vista.sky;
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.3);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.3);
  }

  drawTerrain() {
    for (const t of this.vista.terrain) {
      this.ctx.fillStyle = t.color;
      this.ctx.fillRect(t.x, t.y, t.w, t.h);
      // Add texture lines for forest
      if (t.type === 'forest') {
        this.ctx.fillStyle = '#3d4f2a';
        for (let i = t.x; i < t.x + t.w; i += 20) {
          this.ctx.beginPath();
          this.ctx.moveTo(i, t.y);
          this.ctx.lineTo(i - 8, t.y + t.h);
          this.ctx.lineTo(i + 8, t.y + t.h);
          this.ctx.fill();
        }
      }
    }
  }

  drawStructures() {
    for (const s of this.vista.structures) {
      this.ctx.fillStyle = s.color;
      this.ctx.fillRect(s.x, s.y, s.w, s.h);
      
      // Roof styles
      this.ctx.fillStyle = '#3d362f';
      switch (s.roof) {
        case 'peaked':
          this.ctx.beginPath();
          this.ctx.moveTo(s.x - 5, s.y);
          this.ctx.lineTo(s.x + s.w/2, s.y - 30);
          this.ctx.lineTo(s.x + s.w + 5, s.y);
          this.ctx.fill();
          break;
        case 'vaulted':
          this.ctx.beginPath();
          this.ctx.arc(s.x + s.w/2, s.y, s.w/2 + 5, Math.PI, 0);
          this.ctx.fill();
          break;
        case 'domed':
          this.ctx.beginPath();
          this.ctx.arc(s.x + s.w/2, s.y, s.w/2, Math.PI, 0);
          this.ctx.fill();
          break;
        case 'gabled':
          this.ctx.beginPath();
          this.ctx.moveTo(s.x - 3, s.y);
          this.ctx.lineTo(s.x + s.w/2, s.y - 20);
          this.ctx.lineTo(s.x + s.w + 3, s.y);
          this.ctx.fill();
          break;
        case 'steeple':
          this.ctx.fillRect(s.x + s.w/2 - 8, s.y - 40, 16, 45);
          this.ctx.beginPath();
          this.ctx.moveTo(s.x + s.w/2 - 10, s.y - 40);
          this.ctx.lineTo(s.x + s.w/2, s.y - 55);
          this.ctx.lineTo(s.x + s.w/2 + 10, s.y - 40);
          this.ctx.fill();
          break;
      }
      
      // Crenellations
      if (s.crenellations) {
        this.ctx.fillStyle = s.color;
        for (let cx = s.x; cx < s.x + s.w; cx += 25) {
          this.ctx.fillRect(cx, s.y - 10, 15, 15);
        }
      }
      
      // Glow effect
      if (s.glow === 'ember') {
        const glowGrad = this.ctx.createRadialGradient(s.x + s.w/2, s.y + s.h/2, 5, s.x + s.w/2, s.y + s.h/2, 60);
        glowGrad.addColorStop(0, 'rgba(196,79,28,0.4)');
        glowGrad.addColorStop(1, 'rgba(196,79,28,0)');
        this.ctx.fillStyle = glowGrad;
        this.ctx.fillRect(s.x - 60, s.y - 60, s.w + 120, s.h + 120);
      }
      
      // Open door
      if (s.doorOpen) {
        this.ctx.fillStyle = '#1a1410';
        this.ctx.fillRect(s.x + s.w/2 - 10, s.y + s.h - 30, 20, 30);
      }
      
      // Lit window
      if (s.windowLit) {
        this.ctx.fillStyle = '#daa520';
        this.ctx.fillRect(s.x + s.w/2 - 8, s.y + 15, 16, 16);
      }
    }
  }

  drawInteriors() {
    // Draw visible interior details through doorways
    for (const s of this.vista.structures) {
      if (!s.interior || !s.doorOpen) continue;
      const doorX = s.x + s.w/2 - 8;
      const doorY = s.y + s.h - 28;
      this.ctx.fillStyle = '#2a2018';
      this.ctx.fillRect(doorX, doorY, 16, 26);
      
      if (s.interior === 'round_table') {
        this.ctx.fillStyle = '#8b7d6b';
        this.ctx.beginPath();
        this.ctx.arc(doorX + 8, doorY + 10, 6, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (s.interior === 'empty_throne') {
        this.ctx.fillStyle = '#b8860b';
        this.ctx.fillRect(doorX + 2, doorY + 4, 12, 18);
      }
    }
  }

  drawNPCs() {
    if (!this.state) return;
    for (const npc of this.vista.npcs) {
      if (npc.condition && !this.state[npc.condition]) continue;
      if (!npc.visible && !npc.condition) continue;
      this.ctx.font = '18px serif';
      this.ctx.fillText(npc.glyph, npc.x, npc.y);
    }
  }

  drawPlayer() {
    if (!this.state) return;
    const zone = this.vista.structures.find(s => s.zone === this.state.playerZone);
    if (!zone) return;
    const px = zone.x + zone.w/2;
    const py = zone.y + zone.h/2;
    
    // Pulsing circle
    const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;
    this.ctx.beginPath();
    this.ctx.arc(px, py, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(218,165,32,${pulse})`;
    this.ctx.fill();
    this.ctx.strokeStyle = '#daa520';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Player glyph
    this.ctx.font = '14px serif';
    this.ctx.fillStyle = '#daa520';
    this.ctx.fillText('𐤃', px - 6, py + 5);
  }

  drawOverlays() {
    if (!this.state) return;
    for (const overlay of this.vista.overlays) {
      if (overlay.type === 'gradient_overlay') {
        const value = this.state[overlay.property] || 0;
        const alpha = value / 100;
        const terrain = this.vista.terrain.find(t => t.type === 'water' || t.name === overlay.zone);
        if (!terrain) continue;
        
        const grad = this.ctx.createLinearGradient(0, terrain.y, 0, terrain.y + terrain.h);
        grad.addColorStop(0, `rgba(200,216,228,${alpha})`);
        grad.addColorStop(0.5, `rgba(200,216,228,${alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(200,216,228,0)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(terrain.x, terrain.y, terrain.w, terrain.h);
      }
    }
  }

  drawUI() {
    if (this.hoveredZone) {
      const zone = this.vista.structures.find(s => s.zone === this.hoveredZone);
      if (zone) {
        this.ctx.strokeStyle = '#b8860b';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(zone.x - 2, zone.y - 2, zone.w + 4, zone.h + 4);
        
        // Label
        this.ctx.font = 'bold 13px Georgia';
        this.ctx.fillStyle = '#f4e4c1';
        this.ctx.fillText(zone.name, zone.x + 4, zone.y - 6);
      }
    }
  }

  startAnimation() {
    const loop = () => {
      this.draw();
      this.animFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  getZoneAt(x, y) {
    if (!this.vista) return null;
    for (const s of this.vista.structures) {
      if (s.clickable && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        return s.zone;
      }
    }
    return null;
  }
}
