// ═══════════════════════════════════════
// FONT MASON · Typography as Architecture
// ealdforn/telume/ealdor/js/font-mason.js
// ═══════════════════════════════════════
//
// Walls are made of letters. Stones are glyphs.
// The heaviest blackletter fonts become ashlar masonry.
// Line-height is mortar. Letter-spacing is the chisel.
// One div per wall. Zero images. Infinite cathedrals.

class FontMason {

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`FontMason: "#${containerId}" not found`);
        this.walls = [];
        this.arches = [];
    }

    // ═══════════════════════════════════════
    // WALL — a single div of crushed text
    // ═══════════════════════════════════════

    buildWall(config = {}) {
        const {
            x = 0, y = 0, width = 400, height = 300, z = 1,
            fontFamily = "'UnifrakturMaguntia','Cinzel','Georgia',serif",
            fontSize = 42,
            lineHeight = 0.55,
            letterSpacing = -3,
            textColor = '#4a3f35',
            mortarColor = '#2a2520',
            characters = ['M','W','H','N','M'],
            highlightColor = 'rgba(255,255,255,0.05)',
            shadowColor = 'rgba(0,0,0,0.3)',
            perspective = null,
            courseOffset = 0.6,
            weathering = 0,
            openings = [],
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
        const wear = ['░','▒','▓',' '];
        for (let r = 0; r < rows; r++) {
            const off = Math.floor(r * courseOffset) % characters.length;
            for (let c = 0; c < perRow; c++) {
                if (weathering > 0 && Math.random() < weathering * 0.15) {
                    text += wear[Math.floor(Math.random() * wear.length)];
                } else {
                    text += characters[(c + off) % characters.length];
                }
            }
            text += '\n';
        }

        el.textContent = text;
        Object.assign(el.style, {
            position:'absolute', left:x+'px', top:y+'px',
            width:width+'px', height:height+'px', zIndex:z,
            fontFamily, fontSize:fontSize+'px',
            lineHeight, letterSpacing:letterSpacing+'px',
            color:textColor, background:mortarColor,
            textShadow:`1px 1px 0 ${highlightColor}, -1px -1px 0 ${shadowColor}, 0 1px 2px rgba(0,0,0,0.2)`,
            wordBreak:'break-all', overflow:'hidden',
            userSelect:'none', whiteSpace:'pre-line',
            transition:'color 0.5s, text-shadow 0.5s',
        });

        if (perspective === 'recede-left') {
            el.style.transform = 'perspective(800px) rotateY(12deg)';
            el.style.transformOrigin = 'right center';
        } else if (perspective === 'recede-right') {
            el.style.transform = 'perspective(800px) rotateY(-12deg)';
            el.style.transformOrigin = 'left center';
        }

        for (const op of openings) {
            const cut = this._opening(op);
            el.appendChild(cut);
        }

        this.container.appendChild(el);
        this.walls.push({ el, config });
        return el;
    }

    // ═══════════════════════════════════════
    // OPENING — dark cutout for window/door
    // ═══════════════════════════════════════

    _opening(op) {
        const el = document.createElement('div');
        el.className = 'wall-opening';
        const rad = op.arch ? op.width / 2 : 0;
        Object.assign(el.style, {
            position:'absolute',
            left:op.x+'px', top:op.y+'px',
            width:op.width+'px', height:op.height+'px',
            background:'#0a0806',
            borderRadius: op.arch ? `${rad}px ${rad}px 0 0` : '2px',
            boxShadow:'inset 0 0 40px rgba(0,0,0,0.8)',
            pointerEvents:'none', zIndex:2,
        });

        if (op.glass) {
            const g = document.createElement('div');
            Object.assign(g.style, {
                position:'absolute', inset:'4px',
                background:'linear-gradient(180deg, #1a3040 0%, #2a4a6a 40%, #3a5a7a 100%)',
                borderRadius:'inherit',
                boxShadow:'inset 0 0 20px rgba(0,0,0,0.5)',
            });
            el.appendChild(g);

            if (op.glassFrost > 0) {
                const f = document.createElement('div');
                Object.assign(f.style, {
                    position:'absolute', bottom:'0', left:'0',
                    width:'100%', height:op.glassFrost+'%',
                    background:'rgba(200,216,228,0.7)',
                    borderRadius:'inherit', transition:'height 1.5s ease',
                });
                f.setAttribute('data-frost','');
                el.appendChild(f);
            }

            const m = document.createElement('div');
            Object.assign(m.style, {
                position:'absolute', left:'50%', top:'4px',
                width:'4px', height:'calc(100% - 8px)',
                background:'#3d362f', transform:'translateX(-50%)',
            });
            el.appendChild(m);
        }

        return el;
    }

    // ═══════════════════════════════════════
    // FLOOR — perspective-tilted text plane
    // ═══════════════════════════════════════

    buildFloor(config = {}) {
        const {
            x = 0, y = 350, width = 800, height = 200, z = 0,
            fontFamily = "'Georgia','Times New Roman',serif",
            fontSize = 50, lineHeight = 0.5, letterSpacing = -2,
            textColor = '#5c4f42', mortarColor = '#3d342b',
            characters = ['▓','░','▓','▒','░'],
            perspectiveStrength = 15,
            glyphCarving = null,
        } = config;

        const el = document.createElement('div');
        el.className = 'font-floor';

        const charW = fontSize * 0.55;
        const perRow = Math.ceil(width / (charW + letterSpacing)) + 2;
        const rowH = fontSize * lineHeight;
        const rows = Math.ceil(height / rowH) + 1;

        let text = '';
        for (let r = 0; r < rows; r++) {
            const off = Math.floor(r * 0.7) % characters.length;
            for (let c = 0; c < perRow; c++) {
                text += characters[(c + off) % characters.length];
            }
            text += '\n';
        }

        el.textContent = text;
        Object.assign(el.style, {
            position:'absolute', left:x+'px', top:y+'px',
            width:width+'px', height:height+'px', zIndex:z,
            fontFamily, fontSize:fontSize+'px',
            lineHeight, letterSpacing:letterSpacing+'px',
            color:textColor, background:mortarColor,
            textShadow:'0 2px 4px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.03)',
            wordBreak:'break-all', overflow:'hidden',
            userSelect:'none', whiteSpace:'pre-line',
            transform:`perspective(600px) rotateX(${perspectiveStrength}deg)`,
            transformOrigin:'top center',
        });

        this.container.appendChild(el);
        this.walls.push({ el, config, type:'floor' });

        if (glyphCarving) {
            const g = document.createElement('div');
            g.className = 'floor-glyph';
            g.textContent = glyphCarving.text;
            Object.assign(g.style, {
                position:'absolute',
                left:glyphCarving.x+'px', top:glyphCarving.y+'px',
                fontSize:(glyphCarving.size||28)+'px',
                color:glyphCarving.color||'rgba(184,134,11,0.15)',
                letterSpacing:(glyphCarving.spacing||40)+'px',
                pointerEvents:'none', zIndex:z+1,
                transform:`perspective(600px) rotateX(${perspectiveStrength}deg)`,
                transformOrigin:'top center',
            });
            this.container.appendChild(g);
        }

        return el;
    }

    // ═══════════════════════════════════════
    // ARCH — voussoirs arranged in semicircle
    // ═══════════════════════════════════════

    buildArch(config = {}) {
        const {
            cx = 400, cy = 150, innerRadius = 100,
            stoneCount = 17, stoneDepth = 24, z = 5,
            fontFamily = "'UnifrakturMaguntia','Cinzel',serif",
            fontSize = 28, textColor = '#4a3f35',
            highlightColor = 'rgba(255,255,255,0.06)',
            shadowColor = 'rgba(0,0,0,0.3)',
            keystoneOversize = 1.5, keystoneChar = 'M',
            voussoirChars = ['H','N','M','W'],
        } = config;

        const group = document.createElement('div');
        group.className = 'font-arch';
        Object.assign(group.style, {
            position:'absolute', left:'0', top:'0',
            width:'100%', height:'100%',
            pointerEvents:'none', zIndex:z,
        });

        const span = Math.PI;
        const start = Math.PI;

        for (let i = 0; i < stoneCount; i++) {
            const angle = start + (span / (stoneCount - 1)) * i;
            const keystone = (i === Math.floor(stoneCount / 2));
            const depth = keystone ? stoneDepth * keystoneOversize : stoneDepth;
            const sx = cx + Math.cos(angle) * innerRadius;
            const sy = cy - Math.sin(angle) * innerRadius;
            const arcLen = (span / stoneCount) * innerRadius;
            const sw = arcLen * 0.8;

            const stone = document.createElement('div');
            stone.className = 'arch-stone' + (keystone ? ' keystone' : '');
            stone.textContent = keystone ? keystoneChar : voussoirChars[i % voussoirChars.length];

            Object.assign(stone.style, {
                position:'absolute',
                left:(sx - sw/2)+'px', top:(sy - depth/2)+'px',
                width:sw+'px', height:depth+'px',
                fontFamily, fontSize:fontSize+'px',
                color:textColor, textAlign:'center',
                lineHeight:depth+'px',
                textShadow:`1px 1px 0 ${highlightColor}, -1px -1px 0 ${shadowColor}`,
                transform:`rotate(${(angle - Math.PI/2)*(180/Math.PI)}deg)`,
                transformOrigin:'center center',
                userSelect:'none',
            });

            group.appendChild(stone);
        }

        this.container.appendChild(group);
        this.arches.push({ el: group, config });
        return group;
    }

    // ═══════════════════════════════════════
    // VAULT — arched ceiling with ribs
    // ═══════════════════════════════════════

    buildVault(config = {}) {
        const {
            x = 100, y = -20, width = 600, height = 90, z = -1,
            fontFamily = "'Georgia','Times New Roman',serif",
            fontSize = 18, lineHeight = 0.9, letterSpacing = 2,
            textColor = '#2a2520', backgroundColor = 'transparent',
            ribs = [],
        } = config;

        const el = document.createElement('div');
        el.className = 'font-vault';

        const charW = fontSize * 0.5;
        const perRow = Math.ceil(width / charW);
        const rowH = fontSize * lineHeight;
        const rows = Math.ceil(height / rowH);
        const vaultChars = ['⌢','⌣','~','⋅',' '];

        let text = '';
        for (let r = 0; r < rows; r++) {
            const indent = Math.floor((rows - r) * 0.8);
            text += ' '.repeat(Math.max(0, indent));
            for (let c = 0; c < perRow - indent * 2; c++) {
                text += vaultChars[r % vaultChars.length];
            }
            text += '\n';
        }

        el.textContent = text;
        Object.assign(el.style, {
            position:'absolute', left:x+'px', top:y+'px',
            width:width+'px', height:height+'px', zIndex:z,
            fontFamily, fontSize:fontSize+'px',
            lineHeight, letterSpacing:letterSpacing+'px',
            color:textColor, background:backgroundColor,
            textAlign:'center', whiteSpace:'pre',
            userSelect:'none', overflow:'hidden',
            borderRadius:'50% 50% 0 0',
        });

        this.container.appendChild(el);
        this.walls.push({ el, config, type:'vault' });

        for (const rib of ribs) {
            const rEl = document.createElement('div');
            Object.assign(rEl.style, {
                position:'absolute',
                left:rib.x+'px', top:(y+10)+'px',
                width:(rib.depth||6)+'px', height:(height-10)+'px',
                background:rib.color||'#3d362f', zIndex:z+1,
                borderRadius:'3px 3px 0 0',
                boxShadow:'0 0 6px rgba(0,0,0,0.4)',
            });
            this.container.appendChild(rEl);
        }

        return el;
    }

    // ═══════════════════════════════════════
    // PILLAR — vertical column with capital
    // ═══════════════════════════════════════

    buildPillar(config = {}) {
        const {
            x = 200, y = 100, width = 40, height = 300, z = 2,
            fontFamily = "'UnifrakturMaguntia','Cinzel',serif",
            fontSize = 24, lineHeight = 0.6, letterSpacing = -2,
            textColor = '#4a3f35', mortarColor = '#2a2520',
            characters = ['H','H','H'],
            capital = false, capitalHeight = 30,
        } = config;

        const el = document.createElement('div');
        el.className = 'font-pillar';

        const rowH = fontSize * lineHeight;
        const rows = Math.ceil(height / rowH);
        let text = '';
        for (let r = 0; r < rows; r++) text += characters.join('') + '\n';

        el.textContent = text;
        Object.assign(el.style, {
            position:'absolute', left:x+'px', top:y+'px',
            width:width+'px', height:height+'px', zIndex:z,
            fontFamily, fontSize:fontSize+'px',
            lineHeight, letterSpacing:letterSpacing+'px',
            color:textColor, background:mortarColor,
            textShadow:'1px 1px 0 rgba(255,255,255,0.05), -1px -1px 0 rgba(0,0,0,0.2)',
            textAlign:'center', overflow:'hidden',
            userSelect:'none', whiteSpace:'pre-line',
            borderRadius:'4px', boxShadow:'2px 0 8px rgba(0,0,0,0.3)',
        });

        this.container.appendChild(el);

        if (capital) {
            const cap = document.createElement('div');
            cap.textContent = 'M  M';
            Object.assign(cap.style, {
                position:'absolute',
                left:(x-8)+'px', top:(y-capitalHeight)+'px',
                width:(width+16)+'px', height:capitalHeight+'px',
                fontFamily, fontSize:(fontSize*1.2)+'px',
                color:'#5c4f42', textAlign:'center',
                lineHeight:capitalHeight+'px', letterSpacing:'-2px',
                zIndex:z+1,
                textShadow:'1px 1px 0 rgba(255,255,255,0.06), -1px -1px 0 rgba(0,0,0,0.3)',
                userSelect:'none',
            });
            this.container.appendChild(cap);
        }

        return el;
    }

    // ═══════════════════════════════════════
    // INSCRIPTION — glowing glyph text overlay
    // ═══════════════════════════════════════

    buildInscription(config = {}) {
        const {
            x = 300, y = 100, text = '𐤃 𐤀 𐤕',
            fontSize = 24, color = 'rgba(184,134,11,0.4)',
            fontFamily = "'Georgia','Times New Roman',serif",
            z = 10, rotation = 0, animation = null,
        } = config;

        const el = document.createElement('div');
        el.className = 'font-inscription';
        el.textContent = text;

        Object.assign(el.style, {
            position:'absolute', left:x+'px', top:y+'px',
            fontSize:fontSize+'px', color, fontFamily,
            letterSpacing:'8px', zIndex:z,
            pointerEvents:'none', userSelect:'none',
            transform:`rotate(${rotation}deg)`,
            textShadow:'0 0 10px rgba(184,134,11,0.2)',
        });

        if (animation) el.style.animation = animation;
        this.container.appendChild(el);
        return el;
    }

    // ═══════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════

    clear() {
        this.container.innerHTML = '';
        this.walls = [];
        this.arches = [];
    }

    getWall(id) {
        const found = this.walls.find(w => w.config.id === id);
        return found ? found.el : null;
    }

    setFrost(wallId, openingIndex, frostPercent) {
        const wall = this.walls.find(w => w.config.id === wallId);
        if (!wall?.el) return;
        const openings = wall.el.querySelectorAll('.wall-opening');
        if (openings[openingIndex]) {
            const frost = openings[openingIndex].querySelector('[data-frost]');
            if (frost) frost.style.height = frostPercent + '%';
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontMason;
}
