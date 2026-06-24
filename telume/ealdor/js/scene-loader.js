// ═══════════════════════════════════════
// SCENE LOADER · Adzmyst World Engine
// ealdforn/telume/ealdor/js/scene-loader.js
//
// Reads a scene JSON. Resolves materials. Resolves objects.
// Builds rooms with perspective. Places objects relatively.
// Handles openings, passages, exits, canvas layers.
// Wires click zones. Connects to game state.
//
// Scene HTML becomes:
//   const loader = new SceneLoader('container-id');
//   loader.load('json/scenes/great_hall.json');
//   loader.setState(state);
// ═══════════════════════════════════════

class SceneLoader {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`SceneLoader: "#${containerId}" not found`);
        this.mason = null;
        this.scene = null;
        this.state = null;
        this.materials = {};
        this.objects = {};
        this.objectCache = {};
        this.builtElements = [];
        this.canvasLayers = {};
        this.exitZones = [];
        this.interactiveZones = [];
        this.onInteract = null;  // callback for custom interactions
        this.onExit = null;      // callback for exit navigation
    }

    // ═══════════════════════════════════
    // LOAD
    // ═══════════════════════════════════

    async load(sceneUrl) {
        // Fetch scene JSON
        const resp = await fetch(sceneUrl);
        if (!resp.ok) throw new Error(`SceneLoader: ${resp.status} loading ${sceneUrl}`);
        this.scene = await resp.json();

        // Load materials
        await this._loadMaterials();

        // Load objects referenced in the scene
        await this._loadReferencedObjects();

        // Clear container
        this.container.innerHTML = '';
        this.builtElements = [];
        this.canvasLayers = {};
        this.exitZones = [];
        this.interactiveZones = [];

        // Set container size
        if (this.scene.size) {
            this.container.style.width = this.scene.size.w + 'px';
            this.container.style.height = this.scene.size.h + 'px';
        }

        // Create FontMason instance
        this.mason = new FontMason(this.container.id);

        // Build layers in order: background → room → objects → overlays → exits
        if (this.scene.background) this._buildBackground();
        if (this.scene.room) this._buildRoom();
        if (this.scene.objects) this._buildObjects();
        if (this.scene.overlays) this._buildOverlays();
        if (this.scene.npcs) this._buildNPCs();
        if (this.scene.exits) this._buildExits();
        if (this.scene.atmosphere) this._buildAtmosphere();
    }

    setState(state) {
        this.state = state;
        // Re-render any state-bound elements
        this._refreshBindings();
    }

    // ═══════════════════════════════════
    // MATERIALS
    // ═══════════════════════════════════

    async _loadMaterials() {
        // Try to load external materials file
        try {
            const resp = await fetch('json/materials.json');
            if (resp.ok) {
                const data = await resp.json();
                // Flatten all categories into one lookup
                for (const category of Object.values(data)) {
                    Object.assign(this.materials, category);
                }
            }
        } catch (e) {
            console.warn('SceneLoader: materials.json not found, using built-in defaults');
        }

        // Merge with FontMason built-in materials
        if (FontMason.MATERIALS) {
            Object.assign(this.materials, FontMason.MATERIALS);
        }

        // Add scene-specific materials
        if (this.scene.materials) {
            Object.assign(this.materials, this.scene.materials);
        }
    }

    resolveMaterial(name) {
        if (!name) return FontMason.mat('cyclopean');
        const mat = this.materials[name];
        if (!mat) {
            console.warn(`SceneLoader: material "${name}" not found, using cyclopean`);
            return FontMason.mat('cyclopean');
        }
        // Ensure it has chars array
        if (!mat.chars && mat.characters) mat.chars = mat.characters;
        if (!mat.chars) mat.chars = ['█','▓','▒'];
        return { ...mat };
    }

    // ═══════════════════════════════════
    // OBJECTS
    // ═══════════════════════════════════

    async _loadReferencedObjects() {
        const objectNames = new Set();

        // Collect from room features
        if (this.scene.room) {
            for (const wall of ['farWall','leftWall','rightWall']) {
                const features = this.scene.room[wall]?.features;
                if (features) features.forEach(f => {
                    if (typeof f === 'string') objectNames.add(f);
                    else if (f.type) objectNames.add(f.type);
                });
            }
            const floorFeatures = this.scene.room.floor?.features;
            if (floorFeatures) floorFeatures.forEach(f => {
                if (typeof f === 'string') objectNames.add(f);
                else if (f.type) objectNames.add(f.type);
            });
        }

        // Collect from scene objects
        if (this.scene.objects) {
            this.scene.objects.forEach(obj => {
                if (typeof obj === 'string') objectNames.add(obj);
                else if (obj.type) objectNames.add(obj.type);
            });
        }

        // Collect from NPCs
        if (this.scene.npcs) {
            this.scene.npcs.forEach(npc => {
                if (npc.type) objectNames.add(npc.type);
            });
        }

        // Load each object JSON
        for (const name of objectNames) {
            await this._loadObject(name);
        }
    }

    async _loadObject(name) {
    if (this.objectCache[name]) return this.objectCache[name];

    // Check inline definitions FIRST — before trying external fetch
    if (this.scene.objectDefinitions && this.scene.objectDefinitions[name]) {
        this.objectCache[name] = this.scene.objectDefinitions[name];
        return this.scene.objectDefinitions[name];
    }

    try {
        const resp = await fetch(`json/objects/${name}.json`);
        if (resp.ok) {
            const obj = await resp.json();
            this.objectCache[name] = obj;
            return obj;
        }
    } catch (e) {
        // Object JSON not found
    }

    return null;
}

    // ═══════════════════════════════════
    // BACKGROUND
    // ═══════════════════════════════════

    _buildBackground() {
        const bg = this.scene.background;
        if (typeof bg === 'string') {
            this._setupCanvasLayer('background', bg, {
                x: 0, y: 0,
                w: this.scene.size.w,
                h: this.scene.size.h,
                z: -10,
            });
        } else if (typeof bg === 'object') {
            this._setupCanvasLayer('background', bg.type, {
                x: bg.x || 0, y: bg.y || 0,
                w: bg.w || this.scene.size.w,
                h: bg.h || this.scene.size.h,
                z: bg.z || -10,
                ...bg,
            });
        }
    }

    _setupCanvasLayer(id, type, config) {
        const canvas = document.createElement('canvas');
        canvas.id = `layer-${id}`;
        canvas.width = config.w;
        canvas.height = config.h;
        canvas.style.cssText = `
            position: absolute;
            left: ${config.x}px; top: ${config.y}px;
            width: ${config.w}px; height: ${config.h}px;
            z-index: ${config.z};
            pointer-events: none;
        `;
        this.container.appendChild(canvas);

        const layer = { canvas, ctx: canvas.getContext('2d'), type, config };
        this.canvasLayers[id] = layer;

        // Start appropriate animation
        switch (type) {
            case 'ouranos_sky':
                this._animateOuranos(layer);
                break;
            case 'pontus_water':
                this._animatePontus(layer);
                break;
            case 'starfield':
                this._animateStarfield(layer);
                break;
        }

        return layer;
    }

    // ═══════════════════════════════════
    // CANVAS ANIMATIONS
    // ═══════════════════════════════════

    _animateStarfield(layer) {
        const stars = Array.from({ length: 60 }, () => ({
            x: Math.random() * layer.config.w,
            y: Math.random() * layer.config.h,
            r: Math.random() * 1.2,
            a: Math.random() * 0.5 + 0.1,
            tw: Math.random() * Math.PI * 2,
        }));

        const draw = () => {
            const ctx = layer.ctx;
            const W = layer.config.w, H = layer.config.h;
            ctx.clearRect(0, 0, W, H);
            stars.forEach(s => {
                const a = s.a * (0.7 + 0.3 * Math.sin(Date.now() * 0.001 + s.tw));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200,216,228,${a})`;
                ctx.fill();
            });
            layer._animFrame = requestAnimationFrame(draw);
        };
        draw();
    }

    _animatePontus(layer) {
        const WAVE_TITANS = [
            { freq: 0.8, amp: 1.0, color: [30, 100, 160] },
            { freq: 0.9, amp: 0.7, color: [40, 110, 170] },
            { freq: 1.0, amp: 0.6, color: [35, 105, 165] },
            { freq: 0.7, amp: 0.9, color: [25, 95, 155] },
            { freq: 1.1, amp: 0.5, color: [45, 115, 175] },
            { freq: 0.85, amp: 0.55, color: [38, 108, 168] },
        ];
        const offsets = WAVE_TITANS.map(() => Math.random() * Math.PI * 2);

        const draw = () => {
            const ctx = layer.ctx;
            const W = layer.config.w, H = layer.config.h;
            ctx.clearRect(0, 0, W, H);

            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#0a1828');
            bg.addColorStop(0.5, '#122438');
            bg.addColorStop(1, '#1a3048');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            WAVE_TITANS.forEach((t, i) => {
                offsets[i] += 0.012 * t.freq;
                const yC = 30 + i * (H / 7);
                const amp = 8 + t.amp * 14 + Math.sin(Date.now() * 0.0005 + i) * 3;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${t.color[0]},${t.color[1]},${t.color[2]},0.5)`;
                ctx.lineWidth = 1.5;
                for (let x = 0; x <= W; x += 3) {
                    const y = yC + Math.sin(x * 0.006 + offsets[i]) * amp
                            + Math.sin(x * 0.015 + offsets[i] * 0.7) * (amp * 0.3);
                    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            });

            layer._animFrame = requestAnimationFrame(draw);
        };
        draw();
    }

    _animateOuranos(layer) {
        const CONSTELLATIONS = [
            { name: 'Orion', stars: [[0.15, 0.3], [0.18, 0.45], [0.22, 0.55], [0.18, 0.65]], lines: [[0, 1], [1, 2], [2, 3]] },
            { name: 'Ursa', stars: [[0.38, 0.2], [0.50, 0.22], [0.60, 0.14], [0.70, 0.25]], lines: [[0, 1], [1, 2], [2, 3]] },
            { name: 'Scorpius', stars: [[0.82, 0.3], [0.88, 0.5], [0.80, 0.68], [0.72, 0.65]], lines: [[0, 1], [1, 2], [2, 3]] },
        ];

        const draw = () => {
            const ctx = layer.ctx;
            const W = layer.config.w, H = layer.config.h;
            const cx = W / 2, cy = H / 2;
            ctx.clearRect(0, 0, W, H);

            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.55);
            grad.addColorStop(0, 'rgba(12,16,40,0.95)');
            grad.addColorStop(1, 'rgba(2,4,15,0.99)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            CONSTELLATIONS.forEach(c => {
                ctx.strokeStyle = 'rgba(100,130,200,0.10)';
                ctx.lineWidth = 0.5;
                c.lines.forEach(([a, b]) => {
                    ctx.beginPath();
                    ctx.moveTo(c.stars[a][0] * W, c.stars[a][1] * H);
                    ctx.lineTo(c.stars[b][0] * W, c.stars[b][1] * H);
                    ctx.stroke();
                });
            });

            layer._animFrame = requestAnimationFrame(draw);
        };
        draw();
    }

    // ═══════════════════════════════════
    // ROOM BUILDER
    // ═══════════════════════════════════

    _buildRoom() {
        const room = this.scene.room;
        const size = this.scene.size;
        const margin = room.margin || 10;

        // Calculate wall dimensions
        const farW = size.w - margin * 2 - (room.leftWall?.width || 60) - (room.rightWall?.width || 60);
        const farX = margin + (room.leftWall?.width || 60);
        const farH = size.h * 0.55;
        const farY = margin;

        const sideW = room.leftWall?.width || 50;
        const sideH = farH + 40;

        const floorY = farY + farH;
        const floorH = size.h - floorY - margin;

        // FAR WALL
        if (room.farWall) {
            const mat = this.resolveMaterial(room.farWall.material);
            const openings = this._buildOpenings(room.farWall, farX, farY, farW, farH);
            this.mason.buildWall({
                ...mat,
                x: farX, y: farY,
                width: farW, height: farH,
                z: 1,
                openings,
                id: 'far-wall',
            });

            // Far wall features
            if (room.farWall.features) {
                this._placeWallFeatures(room.farWall.features, 'far', farX, farY, farW, farH);
            }
        }

        // LEFT WALL
        if (room.leftWall) {
            const mat = this.resolveMaterial(room.leftWall.material);
            const openings = this._buildOpenings(room.leftWall, 0, farY, sideW, sideH);
            this.mason.buildWall({
                ...mat,
                x: margin, y: farY,
                width: sideW, height: sideH,
                z: 0,
                perspective: 'recede-left',
                openings,
                id: 'left-wall',
            });

            if (room.leftWall.features) {
                this._placeWallFeatures(room.leftWall.features, 'left', margin, farY, sideW, sideH);
            }
        }

        // RIGHT WALL
        if (room.rightWall) {
            const mat = this.resolveMaterial(room.rightWall.material);
            const sideRX = size.w - margin - sideW;
            const openings = this._buildOpenings(room.rightWall, sideRX, farY, sideW, sideH);
            this.mason.buildWall({
                ...mat,
                x: sideRX, y: farY,
                width: sideW, height: sideH,
                z: 0,
                perspective: 'recede-right',
                openings,
                id: 'right-wall',
            });

            if (room.rightWall.features) {
                this._placeWallFeatures(room.rightWall.features, 'right', sideRX, farY, sideW, sideH);
            }
        }

        // FLOOR
        if (room.floor) {
            const mat = this.resolveMaterial(room.floor.material);
            this.mason.buildFloor({
                ...mat,
                x: margin, y: floorY,
                width: size.w - margin * 2, height: floorH,
                z: 0,
                perspectiveStrength: room.floor.perspective || 12,
            });

            if (room.floor.features) {
                this._placeFloorFeatures(room.floor.features, margin, floorY, size.w - margin * 2, floorH);
            }
        }

        // CEILING
        if (room.ceiling) {
            const mat = this.resolveMaterial(room.ceiling.material);
            this.mason.buildVault({
                ...mat,
                x: farX, y: farY - 20,
                width: farW, height: 40,
                z: -1,
                ribs: room.ceiling.ribs || [],
            });
        }
    }

    _buildOpenings(wallDef, wallX, wallY, wallW, wallH) {
        if (!wallDef.openings) return [];
        return wallDef.openings.map(op => {
            const base = {
                x: op.x || wallW * 0.35,
                y: op.y || wallH * 0.1,
                width: op.width || 100,
                height: op.height || wallH * 0.6,
                arch: op.arch !== false,
                label: op.type || 'opening',
            };

            if (op.type === 'passage') {
                base.glass = false;
                base.label = 'passage';
            } else if (op.type === 'window') {
                base.glass = true;
                base.glassFrost = this.state?.ice || 0;
            } else if (op.type === 'door') {
                base.glass = false;
                base.label = 'door';
            }

            return base;
        });
    }

    // ═══════════════════════════════════
    // FEATURE PLACEMENT
    // ═══════════════════════════════════

    _placeWallFeatures(features, wall, wallX, wallY, wallW, wallH) {
        features.forEach((feature, index) => {
            const featureName = typeof feature === 'string' ? feature : feature.type;
            const featureConfig = typeof feature === 'string' ? {} : feature;

            // Calculate default position
            let fx = wallX + wallW * 0.2 + index * 80;
            let fy = wallY + wallH * 0.3;

            if (featureConfig.position) {
                fx = wallX + (featureConfig.position.x || 0);
                fy = wallY + (featureConfig.position.y || 0);
            }

            this._placeObject(featureName, fx, fy, featureConfig);
        });
    }

    _placeFloorFeatures(features, floorX, floorY, floorW, floorH) {
        features.forEach((feature, index) => {
            const featureName = typeof feature === 'string' ? feature : feature.type;
            const featureConfig = typeof feature === 'string' ? {} : feature;

            let fx = floorX + floorW * 0.3 + index * 100;
            let fy = floorY + floorH * 0.3;

            if (featureConfig.position) {
                fx = floorX + (featureConfig.position.x || 0);
                fy = floorY + (featureConfig.position.y || 0);
            }

            this._placeObject(featureName, fx, fy, featureConfig);
        });
    }

    // ═══════════════════════════════════
    // OBJECT PLACEMENT
    // ═══════════════════════════════════

    _buildObjects() {
        if (!this.scene.objects) return;
        this.scene.objects.forEach(obj => {
            const name = typeof obj === 'string' ? obj : obj.type;
            const config = typeof obj === 'string' ? {} : obj;
            const x = config.x || this.scene.size.w / 2 - 50;
            const y = config.y || this.scene.size.h * 0.6;
            this._placeObject(name, x, y, config);
        });
    }

    async _placeObject(name, x, y, config = {}) {
        const objDef = await this._loadObject(name);

        if (!objDef) {
            // Fallback: render as inscription with the name
            this.mason.buildInscription({
                text: name, x, y,
                fontSize: 12,
                color: '#8b7d6b',
                fontFamily: "'Cinzel',serif",
                z: 10,
            });
            return;
        }

        // Render each layer of the object
        for (const layer of objDef.layers || []) {
            const lx = x + (layer.position?.x || 0);
            const ly = y + (layer.position?.y || 0);
            const lw = layer.dimensions?.width || 80;
            const lh = layer.dimensions?.height || 80;
            const matName = layer.material || 'ashlar_limestone';
            const mat = this.resolveMaterial(matName);

            switch (layer.type) {
                case 'wall':
                    this.mason.buildWall({ ...mat, x: lx, y: ly, width: lw, height: lh, z: layer.position?.z || 10 });
                    break;
                case 'pillar':
                    this.mason.buildPillar({ ...mat, x: lx, y: ly, width: lw, height: lh, z: layer.position?.z || 10, capital: layer.capital });
                    break;
                case 'floor':
                    this.mason.buildFloor({ ...mat, x: lx, y: ly, width: lw, height: lh, z: layer.position?.z || 5 });
                    break;
                case 'arch':
                    this.mason.buildArch({ ...mat, cx: lx + lw/2, cy: ly, innerRadius: lw/2, z: layer.position?.z || 12, stoneCount: layer.stoneCount || 15, stoneDepth: layer.stoneDepth || 20 });
                    break;
                case 'inscription':
                    this.mason.buildInscription({
                        text: layer.content || '',
                        x: lx, y: ly,
                        fontSize: layer.style?.fontSize || 12,
                        color: layer.style?.color || '#8b7d6b',
                        fontFamily: layer.style?.fontFamily || "'Georgia',serif",
                        z: layer.position?.z || 15,
                        animation: layer.style?.animation,
                    });
                    break;
                case 'overlay': {
                    const el = document.createElement('div');
                    el.textContent = layer.content || '';
                    Object.assign(el.style, {
                        position: 'absolute',
                        left: lx + 'px', top: ly + 'px',
                        zIndex: layer.position?.z || 15,
                        pointerEvents: 'none',
                        ...(layer.style || {}),
                    });
                    if (layer.style?.animation) el.style.animation = layer.style.animation;
                    this.container.appendChild(el);
                    this.builtElements.push(el);
                    break;
                }
                case 'canvas': {
                    this._setupCanvasLayer(`${name}-${layer.id || 'layer'}`, layer.canvasType || 'starfield', {
                        x: lx, y: ly,
                        w: lw, h: lh,
                        z: layer.position?.z || 5,
                    });
                    break;
                }
            }
        }

        // Build interaction zone
        if (objDef.interaction || config.interaction) {
            const interaction = config.interaction || objDef.interaction;
            const zoneX = x + (interaction.zone?.x || -10);
            const zoneY = y + (interaction.zone?.y || -10);
            const zoneW = interaction.zone?.width || (objDef.bounds?.width || 100);
            const zoneH = interaction.zone?.height || (objDef.bounds?.height || 100);

            const zone = document.createElement('div');
            zone.className = 'zone';
            zone.title = interaction.label || name;
            zone.style.cssText = `
                position: absolute;
                left: ${zoneX}px; top: ${zoneY}px;
                width: ${zoneW}px; height: ${zoneH}px;
                z-index: 30; cursor: pointer;
            `;
            zone.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onInteract) {
                    this.onInteract(name, interaction.action, config);
                }
                // Dispatch for custom handlers
                zone.dispatchEvent(new CustomEvent('scene-interact', {
                    detail: { object: name, action: interaction.action, config },
                    bubbles: true,
                }));
            });
            this.container.appendChild(zone);
            this.interactiveZones.push({ el: zone, name, interaction });
        }
    }

    // ═══════════════════════════════════
    // NPCs
    // ═══════════════════════════════════

    _buildNPCs() {
        if (!this.scene.npcs) return;
        this.scene.npcs.forEach(npc => {
            const name = npc.type || npc.id;
            const x = npc.x || this.scene.size.w / 2;
            const y = npc.y || this.scene.size.h * 0.7;
            this._placeObject(name, x, y, npc);

            // NPC-specific state binding
            if (npc.bind) {
                const el = this.container.querySelector(`[data-npc="${npc.id}"]`);
                if (el && this.state) {
                    if (npc.bind.visible && !this.state[npc.bind.visible]) {
                        el.style.display = 'none';
                    }
                }
            }
        });
    }

    // ═══════════════════════════════════
    // EXITS
    // ═══════════════════════════════════

    _buildExits() {
        if (!this.scene.exits) return;
        this.scene.exits.forEach(exit => {
            const size = this.scene.size;
            let x, y, w, h;

            switch (exit.direction) {
                case 'north':
                    x = size.w / 2 - 40; y = 5; w = 80; h = 40;
                    break;
                case 'south':
                    x = size.w / 2 - 40; y = size.h - 50; w = 80; h = 45;
                    break;
                case 'east':
                    x = size.w - 45; y = size.h / 2 - 40; w = 40; h = 80;
                    break;
                case 'west':
                    x = 5; y = size.h / 2 - 40; w = 40; h = 80;
                    break;
                default:
                    x = exit.x || size.w / 2 - 40;
                    y = exit.y || size.h - 50;
                    w = exit.w || 80;
                    h = exit.h || 45;
            }

            const zone = document.createElement('div');
            zone.className = 'zone';
            zone.title = exit.label || `Go ${exit.direction}`;
            zone.style.cssText = `
                position: absolute;
                left: ${x}px; top: ${y}px;
                width: ${w}px; height: ${h}px;
                z-index: 35; cursor: pointer;
            `;
            zone.addEventListener('click', () => {
                if (this.onExit) {
                    this.onExit(exit);
                }
                if (exit.target) {
                    if (typeof state !== 'undefined' && typeof saveState === 'function') saveState();
                    setTimeout(() => {
                        window.location.href = exit.target + (exit.param ? `?from=${exit.param}` : '');
                    }, 600);
                }
            });
            this.container.appendChild(zone);
            this.exitZones.push({ el: zone, exit });
        });
    }

    // ═══════════════════════════════════
    // ATMOSPHERE
    // ═══════════════════════════════════

    _buildAtmosphere() {
        const atm = this.scene.atmosphere;
        if (!atm) return;

        if (atm.particles) {
            atm.particles.forEach(p => {
                this._spawnParticles(p);
            });
        }

        if (atm.sounds) {
            // Sound hooks for future Web Audio integration
            atm.sounds.forEach(s => {
                console.log(`🔊 Sound hook: ${s.type} (volume: ${s.volume})`);
            });
        }
    }

    _spawnParticles(config) {
        const count = config.count || 15;
        const color = config.color || 'rgba(244,228,193,0.3)';
        const minSize = config.minSize || 1;
        const maxSize = config.maxSize || 3;
        const zone = config.zone || { x: 0, y: 0, w: this.scene.size.w, h: this.scene.size.h };
        const z = config.z || 3;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const size = minSize + Math.random() * (maxSize - minSize);
            const dur = 10 + Math.random() * 20;
            const delay = Math.random() * 10;
            const px = zone.x + Math.random() * zone.w;
            const py = zone.y + Math.random() * zone.h;

            particle.style.cssText = `
                position: absolute;
                left: ${px}px; top: ${py}px;
                width: ${size}px; height: ${size}px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: ${z};
                animation: particleFloat ${dur}s linear ${delay}s infinite;
            `;
            this.container.appendChild(particle);
            this.builtElements.push(particle);
        }
    }

    // ═══════════════════════════════════
    // STATE BINDINGS
    // ═══════════════════════════════════

    _refreshBindings() {
    if (!this.state || !this.scene) return;

        // Update frost on windows
        if (this.scene.room?.farWall?.openings) {
            this.scene.room.farWall.openings.forEach((op, i) => {
                if (op.type === 'window') {
                    this.mason?.setFrost?.('far-wall', i, this.state.ice || 0);
                }
            });
        }

        // Update NPC visibility
        if (this.scene.npcs) {
            this.scene.npcs.forEach(npc => {
                if (npc.bind?.visible) {
                    const visible = this.state[npc.bind.visible];
                    // Find and toggle NPC element
                }
            });
        }
    }

    // ═══════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════

    destroy() {
        // Cancel all animation frames
        for (const layer of Object.values(this.canvasLayers)) {
            if (layer._animFrame) cancelAnimationFrame(layer._animFrame);
        }
        this.container.innerHTML = '';
        this.builtElements = [];
        this.canvasLayers = {};
        this.exitZones = [];
        this.interactiveZones = [];
    }
}

// ═══════════════════════════════════
// GLOBAL PARTICLE ANIMATION
// ═══════════════════════════════════

if (!document.getElementById('scene-loader-styles')) {
    const style = document.createElement('style');
    style.id = 'scene-loader-styles';
    style.textContent = `
        @keyframes particleFloat {
            0% { transform: translateY(0) translateX(0); opacity: 0.4; }
            50% { opacity: 0.7; }
            100% { transform: translateY(-80px) translateX(12px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ═══════════════════════════════════
// EXPORT
// ═══════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneLoader;
}
