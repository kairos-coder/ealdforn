// ═══════════════════════════════════════
// FONT MASON v2 · Typography as Architecture
// ealdforn/telume/ealdor/js/font-mason.js
//
// v2 adds: dungeon cells, passage indicators, light overlays,
//          material presets, particle systems, minimap data
// ═══════════════════════════════════════

class FontMason {

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`FontMason: "#${containerId}" not found`);
        this.walls = [];
        this.arches = [];
        this.particles = [];
        this.lights = [];
    }

    // ═══════════════════════════════════════
    // MATERIAL LIBRARY (built-in defaults)
    // ═══════════════════════════════════════

    static MATERIALS = {
        cyclopean:      { chars:['█','▓','▒','█','▓'], textColor:'#3d362f', mortarColor:'#1a1410', fontSize:44, lineHeight:0.55, letterSpacing:-1, fontFamily:'monospace' },
        cyclopean_moss: { chars:['▓','░','▒','▓','░'], textColor:'#4a5a3a', mortarColor:'#2a3020', fontSize:44, lineHeight:0.55, letterSpacing:-1, fontFamily:'monospace' },
        ashlar:         { chars:['M','W','H','N','M'], textColor:'#4a3f35', mortarColor:'#242018', fontSize:41, lineHeight:0.52, letterSpacing:-3, fontFamily:"'UnifrakturMaguntia','Cinzel','Georgia',serif" },
        ashlar_dark:    { chars:['M','W','H','N','M'], textColor:'#3d362f', mortarColor:'#1f1a15', fontSize:33, lineHeight:0.54, letterSpacing:-3, fontFamily:"'UnifrakturMaguntia','Cinzel','Georgia',serif" },
        flagstone:      { chars:['▓','░','▒','█','░'], textColor:'#5c4f42', mortarColor:'#3a3028', fontSize:40, lineHeight:0.47, letterSpacing:-2, fontFamily:"'Georgia','Times New Roman',serif" },
        crystal_vein:   { chars:['◆','◇','◈','◆','◇'], textColor:'#a0d8f0', mortarColor:'#2a4a5a', fontSize:24, lineHeight:0.5, letterSpacing:0, fontFamily:"'Georgia',serif" },
        darkness:       { chars:[' '], textColor:'#0a0806', mortarColor:'#0a0806', fontSize:10, lineHeight:0.5, letterSpacing:0, fontFamily:'monospace' },
        vault_ceiling:  { chars:['⌢','⌣','~','⋅',' '], textColor:'#2a2520', mortarColor:'transparent', fontSize:14, lineHeight:0.85, letterSpacing:2, fontFamily:"'Georgia','Times New Roman',serif" },
    };

    static mat(name) {
        return { ...FontMason.MATERIALS[name] || FontMason.MATERIALS['cyclopean'] };
    }

    // ═══════════════════════════════════
    // DUNGEON CELL RENDERER
    // ═══════════════════════════════════

    buildCell(config = {}) {
        const {
            cellSize = { width: 400, height: 300 },
            farWallMat = 'cyclopean',
            leftWallMat = 'cyclopean',
            rightWallMat = 'cyclopean',
            floorMat = 'flagstone',
            ceilingMat = 'vault_ceiling',
            farPassage = false,
            leftPassage = false,
            rightPassage = false,
            cellData = null,
        } = config;

        const W = cellSize.width;
        const H = cellSize.height;
        const far = FontMason.mat(farWallMat);
        const left = FontMason.mat(leftWallMat);
        const right = FontMason.mat(rightWallMat);
        const floor = FontMason.mat(floorMat);
        const ceil = FontMason.mat(ceilingMat);

        // FAR WALL
        this.buildWall({
            ...far,
            x: 30, y: 15,
            width: W - 60, height: H - 30,
            z: 1,
            className: 'cell-wall far-wall',
            opening: farPassage ? {
                x: (W - 60) / 2 - 50, y: 20,
                width: 100, height: H - 70,
                arch: true,
                label: 'passage',
            } : null,
        });

        // LEFT WALL
        this.buildWall({
            ...left,
            x: 5, y: 15,
            width: 45, height: H - 30,
            z: 0,
            perspective: 'recede-left',
            className: 'cell-wall left-wall',
            opening: leftPassage ? {
                x: 10, y: H / 2 - 50,
                width: 30, height: 80,
                arch: true,
                label: 'passage',
            } : null,
        });

        // RIGHT WALL
        this.buildWall({
            ...right,
            x: W - 50, y: 15,
            width: 45, height: H - 30,
            z: 0,
            perspective: 'recede-right',
            className: 'cell-wall right-wall',
            opening: rightPassage ? {
                x: 5, y: H / 2 - 50,
                width: 30, height: 80,
                arch: true,
                label: 'passage',
            } : null,
        });

        // FLOOR
        this.buildFloor({
            ...floor,
            x: 30, y: H - 55,
            width: W - 60, height: 50,
            z: 0,
            perspectiveStrength: 12,
        });

        // CEILING
        this.buildVault({
            ...ceil,
            x: 30, y: -8,
            width: W - 60, height: 28,
            z: -1,
        });
    }

    // ═══════════════════════════════════
    // PASSAGE INDICATOR (glowing arch)
    // ═══════════════════════════════════

    buildPassageIndicator(config = {}) {
        const {
            x = 200, y = 60,
            width = 100, height = 120,
            color = 'rgba(184,134,11,0.35)',
            pulse = true,
        } = config;

        const el = document.createElement('div');
        el.className = 'passage-indicator';
        el.style.cssText = `
            position: absolute;
            left: ${x}px; top: ${y}px;
            width: ${width}px; height: ${height}px;
            border: 3px solid ${color};
            border-radius: ${width/2}px ${width/2}px 0 0;
            border-bottom: none;
            pointer-events: none;
            z-index: 6;
            ${pulse ? 'animation: passageGlow 3s ease-in-out infinite;' : ''}
        `;
        this.container.appendChild(el);
        return el;
    }

    // ═══════════════════════════════════
    // LIGHT OVERLAY
    // ═══════════════════════════════════

    buildLight(config = {}) {
        const {
            color = '#c44f1c',
            radius = 200,
            x = '50%',
            y = '45%',
            pulse = false,
            pulseColor = null,
            z = 0,
        } = config;

        const el = document.createElement('div');
        el.className = 'light-overlay';
        el.style.cssText = `
            position: absolute;
            left: ${typeof x === 'string' ? x : x + 'px'};
            top: ${typeof y === 'string' ? y : y + 'px'};
            transform: translate(-50%, -50%);
            width: ${radius * 2}px;
            height: ${radius * 2}px;
            background: radial-gradient(circle, ${color}22 0%, ${color}08 40%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: ${z};
            ${pulse ? `animation: lightPulse 3s ease-in-out infinite;` : ''}
            ${pulseColor ? `--pulse-color: ${pulseColor};` : ''}
        `;
        this.container.appendChild(el);
        this.lights.push(el);
        return el;
    }

    // ═══════════════════════════════════
    // PARTICLES
    // ═══════════════════════════════════

    spawnParticles(config = {}) {
        const {
            type = 'dust',
            count = 20,
            color = 'rgba(244,228,193,0.3)',
            minSize = 1,
            maxSize = 3,
            zone = { x: 0, y: 0, w: '100%', h: '100%' },
            duration = { min: 10, max: 25 },
            z = 3,
        } = config;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const size = minSize + Math.random() * (maxSize - minSize);
            const dur = duration.min + Math.random() * (duration.max - duration.min);
            const delay = Math.random() * 10;
            const x = typeof zone.x === 'string' ? zone.x : zone.x + Math.random() * zone.w;
            const y = typeof zone.y === 'string' ? zone.y : zone.y + Math.random() * zone.h;

            particle.style.cssText = `
                position: absolute;
                left: ${typeof x === 'string' ? x : x + 'px'};
                top: ${typeof y === 'string' ? y : y + 'px'};
                width: ${size}px; height: ${size}px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: ${z};
                animation: particleFloat ${dur}s linear ${delay}s infinite;
            `;
            this.container.appendChild(particle);
            this.particles.push(particle);
        }
    }

    clearParticles() {
        for (const p of this.particles) {
            if (p.parentNode) p.remove();
        }
        this.particles = [];
    }

    // ═══════════════════════════════════
    // WALL (base method, enhanced for v2)
    // ═══════════════════════════════════

    buildWall(config = {}) {
        const {
            x = 0, y = 0, width = 400, height = 300, z = 1,
            chars = ['█','▓','▒','█'],
            textColor = '#3d362f',
            mortarColor = '#1a1410',
            fontSize = 40,
            lineHeight = 0.55,
            letterSpacing = -1,
            fontFamily = 'monospace',
            highlightColor = 'rgba(255,255,255,0.03)',
            shadowColor = 'rgba(0,0,0,0.25)',
            perspective = null,
            weathering = 0.1,
            opening = null,
            className = '',
            id = null,
        } = config;

        const el = document.createElement('div');
        el.className = 'font-wall ' + className;
        if (id) el.id = id;

        const charW = fontSize * 0.58;
        const perRow = Math.ceil(width / (charW + letterSpacing)) + 2;
        const rowH = fontSize * lineHeight;
        const rows = Math.ceil(height / rowH) + 1;

        let text = '';
        const wearChars = ['░','▒',' ','·'];
        for (let r = 0; r < rows; r++) {
            const off = Math.floor(r * 0.6) % chars.length;
            for (let c = 0; c < perRow; c++) {
                if (weathering > 0 && Math.random() < weathering * 0.12) {
                    text += wearChars[Math.floor(Math.random() * wearChars.length)];
                } else {
                    text += chars[(c + off) % chars.length];
                }
            }
            text += '\n';
        }

        el.textContent = text;

        Object.assign(el.style, {
            position: 'absolute',
            left: x + 'px', top: y + 'px',
            width: width + 'px', height: height + 'px',
            zIndex: z,
            fontFamily, fontSize: fontSize + 'px',
            lineHeight, letterSpacing: letterSpacing + 'px',
            color: textColor, background: mortarColor,
            textShadow: `1px 1px 0 ${highlightColor}, -1px -1px 0 ${shadowColor}`,
            wordBreak: 'break-all', overflow: 'hidden',
            userSelect: 'none', whiteSpace: 'pre-line',
        });

        if (perspective === 'recede-left') {
            el.style.transform = 'perspective(800px) rotateY(12deg)';
            el.style.transformOrigin = 'right center';
        } else if (perspective === 'recede-right') {
            el.style.transform = 'perspective(800px) rotateY(-12deg)';
            el.style.transformOrigin = 'left center';
        }

        // Opening (passage/doorway)
        if (opening) {
            const cutout = document.createElement('div');
            cutout.className = 'wall-opening';
            const rad = opening.arch ? opening.width / 2 : 0;
            Object.assign(cutout.style, {
                position: 'absolute',
                left: opening.x + 'px', top: opening.y + 'px',
                width: opening.width + 'px', height: opening.height + 'px',
                background: '#0a0806',
                borderRadius: opening.arch ? `${rad}px ${rad}px 0 0` : '2px',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.7)',
                pointerEvents: 'none',
                zIndex: 2,
            });
            el.appendChild(cutout);

            // Glow border for passages
            if (opening.label === 'passage') {
                cutout.style.boxShadow = 'inset 0 0 30px rgba(0,0,0,0.7), 0 0 15px rgba(184,134,11,0.15)';
            }
        }

        this.container.appendChild(el);
        this.walls.push({ el, config });
        return el;
    }

    // ═══════════════════════════════════
    // ARCH
    // ═══════════════════════════════════

    buildArch(config = {}) {
        const {
            cx = 400, cy = 150, innerRadius = 100,
            stoneCount = 17, stoneDepth = 24, z = 5,
            chars = ['H','N','M','W'],
            textColor = '#4a3f35',
            fontSize = 27,
            fontFamily = 'monospace',
            highlightColor = 'rgba(255,255,255,0.04)',
            shadowColor = 'rgba(0,0,0,0.25)',
            keystoneOversize = 1.5,
            keystoneChar = 'M',
            fullCircle = false,
        } = config;

        const group = document.createElement('div');
        group.className = 'font-arch';
        Object.assign(group.style, {
            position: 'absolute', left: '0', top: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: z,
        });

        const span = fullCircle ? Math.PI * 2 : Math.PI;
        const start = fullCircle ? 0 : Math.PI;
        const count = fullCircle ? stoneCount * 2 : stoneCount;

        for (let i = 0; i < count; i++) {
            const angle = start + (span / (count - 1)) * i;
            const keystone = !fullCircle && (i === Math.floor(count / 2));
            const depth = keystone ? stoneDepth * keystoneOversize : stoneDepth;
            const sx = cx + Math.cos(angle) * innerRadius;
            const sy = cy - Math.sin(angle) * innerRadius;
            const arcLen = (span / count) * innerRadius;
            const sw = Math.max(6, arcLen * 0.75);

            const stone = document.createElement('div');
            stone.className = 'arch-stone' + (keystone ? ' keystone' : '');
            stone.textContent = keystone ? keystoneChar : chars[i % chars.length];

            Object.assign(stone.style, {
                position: 'absolute',
                left: (sx - sw / 2) + 'px', top: (sy - depth / 2) + 'px',
                width: sw + 'px', height: depth + 'px',
                fontFamily, fontSize: fontSize + 'px',
                color: textColor, textAlign: 'center',
                lineHeight: depth + 'px',
                textShadow: `1px 1px 0 ${highlightColor}, -1px -1px 0 ${shadowColor}`,
                transform: `rotate(${(angle - Math.PI / 2) * (180 / Math.PI)}deg)`,
                transformOrigin: 'center center',
                userSelect: 'none',
            });

            group.appendChild(stone);
        }

        this.container.appendChild(group);
        this.arches.push({ el: group, config });
        return group;
    }

    // ═══════════════════════════════════
    // FLOOR
    // ═══════════════════════════════════

    buildFloor(config = {}) {
        const {
            x = 0, y = 350, width = 800, height = 200, z = 0,
            chars = ['▓','░','▒','█'],
            textColor = '#5c4f42',
            mortarColor = '#3a3028',
            fontSize = 40,
            lineHeight = 0.47,
            letterSpacing = -2,
            fontFamily = 'monospace',
            perspectiveStrength = 15,
        } = config;

        const el = document.createElement('div');
        el.className = 'font-floor';

        const charW = fontSize * 0.55;
        const perRow = Math.ceil(width / (charW + letterSpacing)) + 2;
        const rowH = fontSize * lineHeight;
        const rows = Math.ceil(height / rowH) + 1;

        let text = '';
        for (let r = 0; r < rows; r++) {
            const off = Math.floor(r * 0.7) % chars.length;
            for (let c = 0; c < perRow; c++) {
                text += chars[(c + off) % chars.length];
            }
            text += '\n';
        }

        el.textContent = text;

        Object.assign(el.style, {
            position: 'absolute',
            left: x + 'px', top: y + 'px',
            width: width + 'px', height: height + 'px',
            zIndex: z,
            fontFamily, fontSize: fontSize + 'px',
            lineHeight, letterSpacing: letterSpacing + 'px',
            color: textColor, background: mortarColor,
            textShadow: '0 2px 3px rgba(0,0,0,0.3)',
            wordBreak: 'break-all', overflow: 'hidden',
            userSelect: 'none', whiteSpace: 'pre-line',
            transform: `perspective(600px) rotateX(${perspectiveStrength}deg)`,
            transformOrigin: 'top center',
        });

        this.container.appendChild(el);
        this.walls.push({ el, config, type: 'floor' });
        return el;
    }

    // ═══════════════════════════════════
    // VAULT (CEILING)
    // ═══════════════════════════════════

    buildVault(config = {}) {
        const {
            x = 100, y = -20, width = 600, height = 90, z = -1,
            chars = ['⌢','⌣','~','⋅',' '],
            textColor = '#2a2520',
            fontSize = 15,
            lineHeight = 0.85,
            letterSpacing = 2,
            fontFamily = "'Georgia','Times New Roman',serif",
            ribs = [],
        } = config;

        const el = document.createElement('div');
        el.className = 'font-vault';

        const charW = fontSize * 0.5;
        const perRow = Math.ceil(width / charW);
        const rowH = fontSize * lineHeight;
        const rows = Math.ceil(height / rowH);

        let text = '';
        for (let r = 0; r < rows; r++) {
            const indent = Math.floor((rows - r) * 0.8);
            text += ' '.repeat(Math.max(0, indent));
            for (let c = 0; c < perRow - indent * 2; c++) {
                text += chars[r % chars.length];
            }
            text += '\n';
        }

        el.textContent = text;

        Object.assign(el.style, {
            position: 'absolute',
            left: x + 'px', top: y + 'px',
            width: width + 'px', height: height + 'px',
            zIndex: z,
            fontFamily, fontSize: fontSize + 'px',
            lineHeight, letterSpacing: letterSpacing + 'px',
            color: textColor,
            textAlign: 'center', whiteSpace: 'pre',
            userSelect: 'none', overflow: 'hidden',
            borderRadius: '50% 50% 0 0',
        });

        this.container.appendChild(el);
        this.walls.push({ el, config, type: 'vault' });

        for (const rib of ribs) {
            const rEl = document.createElement('div');
            Object.assign(rEl.style, {
                position: 'absolute',
                left: rib.x + 'px', top: (y + 8) + 'px',
                width: (rib.depth || 6) + 'px', height: (height - 10) + 'px',
                background: rib.color || '#3d362f',
                zIndex: z + 1,
                borderRadius: '3px 3px 0 0',
            });
            this.container.appendChild(rEl);
        }

        return el;
    }

    // ═══════════════════════════════════
    // PILLAR
    // ═══════════════════════════════════

    buildPillar(config = {}) {
        const {
            x = 200, y = 100, width = 30, height = 120, z = 2,
            chars = ['H','H','H'],
            textColor = '#4a3f35',
            mortarColor = '#2a2520',
            fontSize = 20,
            lineHeight = 0.55,
            fontFamily = 'monospace',
            capital = false,
            capitalHeight = 26,
        } = config;

        const el = document.createElement('div');
        el.className = 'font-pillar';

        const rowH = fontSize * lineHeight;
        const rows = Math.ceil(height / rowH);
        let text = '';
        for (let r = 0; r < rows; r++) text += chars.join('') + '\n';

        el.textContent = text;

        Object.assign(el.style, {
            position: 'absolute',
            left: x + 'px', top: y + 'px',
            width: width + 'px', height: height + 'px',
            zIndex: z,
            fontFamily, fontSize: fontSize + 'px',
            lineHeight, letterSpacing: '-2px',
            color: textColor, background: mortarColor,
            textShadow: '1px 1px 0 rgba(255,255,255,0.03), -1px -1px 0 rgba(0,0,0,0.15)',
            textAlign: 'center', overflow: 'hidden',
            userSelect: 'none', whiteSpace: 'pre-line',
            borderRadius: '3px',
        });

        this.container.appendChild(el);

        if (capital) {
            const cap = document.createElement('div');
            cap.textContent = chars[0] + '  ' + chars[0];
            Object.assign(cap.style, {
                position: 'absolute',
                left: (x - 8) + 'px', top: (y - capitalHeight) + 'px',
                width: (width + 16) + 'px', height: capitalHeight + 'px',
                fontFamily, fontSize: (fontSize * 1.2) + 'px',
                color: '#5c4f42', textAlign: 'center',
                lineHeight: capitalHeight + 'px',
                zIndex: z + 1,
                textShadow: '1px 1px 0 rgba(255,255,255,0.04)',
                userSelect: 'none',
            });
            this.container.appendChild(cap);
        }

        return el;
    }

    // ═══════════════════════════════════
    // INSCRIPTION
    // ═══════════════════════════════════

    buildInscription(config = {}) {
        const {
            x = 300, y = 100,
            text = '',
            fontSize = 14,
            color = 'rgba(184,134,11,0.5)',
            fontFamily = "'Georgia','Times New Roman',serif",
            z = 10,
            rotation = 0,
            animation = null,
        } = config;

        const el = document.createElement('div');
        el.className = 'font-inscription';
        el.textContent = text;

        Object.assign(el.style, {
            position: 'absolute',
            left: x + 'px', top: y + 'px',
            fontSize: fontSize + 'px', color,
            fontFamily, letterSpacing: '4px',
            zIndex: z,
            pointerEvents: 'none', userSelect: 'none',
            transform: `rotate(${rotation}deg)`,
            textShadow: '0 0 8px rgba(184,134,11,0.15)',
        });

        if (animation) el.style.animation = animation;
        this.container.appendChild(el);
        return el;
    }

    // ═══════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════

    clear() {
        this.container.innerHTML = '';
        this.walls = [];
        this.arches = [];
        this.particles = [];
        this.lights = [];
    }

    getWall(id) {
        const found = this.walls.find(w => w.config?.id === id);
        return found ? found.el : null;
    }
}

// ═══════════════════════════════════
// GLOBAL ANIMATIONS (inject once)
// ═══════════════════════════════════

if (!document.getElementById('font-mason-styles')) {
    const style = document.createElement('style');
    style.id = 'font-mason-styles';
    style.textContent = `
        @keyframes passageGlow {
            0%,100% { border-color: rgba(184,134,11,0.2); box-shadow: 0 0 8px rgba(184,134,11,0.05); }
            50% { border-color: rgba(184,134,11,0.5); box-shadow: 0 0 20px rgba(184,134,11,0.2); }
        }
        @keyframes lightPulse {
            0%,100% { opacity: 0.8; }
            50% { opacity: 1; }
        }
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
    module.exports = FontMason;
}
