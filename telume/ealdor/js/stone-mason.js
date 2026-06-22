// stone-mason.js
// Renders walls, floors, arches, and vaults from JSON definitions
// ealdforn/telume/ealdor/js/stone-mason.js

class StoneMason {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.state = null;
        this.stoneElements = []; // flat array of all stone DOM elements
    }

    setState(state) {
        this.state = state;
        this.refreshBindings();
    }

    buildChapel(chapelJson) {
        this.container.innerHTML = '';
        this.stoneElements = [];
        
        const dims = chapelJson.dimensions;
        this.container.style.cssText = `
            position: relative;
            width: ${dims.width}px;
            height: ${dims.height}px;
            overflow: hidden;
            background: #1a1410;
            perspective: ${800 / dims.perspective}px;
            perspective-origin: 50% 45%;
        `;

        // Build layers back to front
        if (chapelJson.ceiling) this._buildCeiling(chapelJson.ceiling, dims);
        if (chapelJson.walls) {
            for (const wall of chapelJson.walls) {
                this._buildWall(wall, dims, chapelJson.stoneConfig);
            }
        }
        if (chapelJson.floor) this._buildFloor(chapelJson.floor, dims, chapelJson.stoneConfig);
        if (chapelJson.objects) this._buildObjects(chapelJson.objects);
    }

    _buildWall(wallDef, dims, stoneConfig) {
        const wallEl = document.createElement('div');
        wallEl.className = 'masonry-wall';
        wallEl.dataset.wallId = wallDef.id;
        
        // Base wall positioning
        Object.assign(wallEl.style, {
            position: 'absolute',
            left: wallDef.x + 'px',
            top: wallDef.y + 'px',
            width: wallDef.width + 'px',
            height: wallDef.height + 'px',
            background: '#2a2520', // mortar color
            overflow: 'hidden',
        });

        // Apply perspective if receding
        if (wallDef.perspective === 'recede-left') {
            wallEl.style.transform = 'perspective(600px) rotateY(15deg)';
            wallEl.style.transformOrigin = 'right center';
        } else if (wallDef.perspective === 'recede-right') {
            wallEl.style.transform = 'perspective(600px) rotateY(-15deg)';
            wallEl.style.transformOrigin = 'left center';
        }

        // Generate stones
        const stones = generateWall({
            x: 0, y: 0,
            width: wallDef.width,
            height: wallDef.height,
            courseHeight: stoneConfig.courseHeight,
            colorBase: stoneConfig.colorBase,
            colorVariance: stoneConfig.colorVariance,
            mortarGap: stoneConfig.mortarGap,
            weathering: stoneConfig.weathering,
        });

        // Cut openings (windows, doors)
        const openings = wallDef.openings || [];
        
        for (const stone of stones) {
            // Check if stone overlaps any opening
            let inOpening = false;
            for (const opening of openings) {
                if (this._stoneInOpening(stone, opening)) {
                    inOpening = true;
                    break;
                }
            }
            
            if (!inOpening) {
                const stoneEl = renderStone(stone, wallEl);
                this.stoneElements.push({ el: stoneEl, def: stone, wall: wallDef.id });
            }
        }

        // Build arches over openings
        for (const opening of openings) {
            if (opening.type === 'window' && opening.arch) {
                const archStones = generateArch({
                    cx: opening.x + opening.width / 2,
                    cy: opening.y,
                    radius: opening.arch.radius,
                    stoneCount: opening.arch.stoneCount,
                    stoneDepth: opening.arch.stoneDepth,
                    colorBase: stoneConfig.colorBase,
                    colorVariance: stoneConfig.colorVariance,
                });
                
                for (const aStone of archStones) {
                    const aEl = this._renderArchStone(aStone, wallEl);
                    this.stoneElements.push({ el: aEl, def: aStone, wall: wallDef.id, type: 'arch' });
                }
            }
        }

        // Add features (plinth, tally marks, niche)
        if (wallDef.features) {
            for (const feature of wallDef.features) {
                this._buildFeature(feature, wallEl, stoneConfig);
            }
        }

        this.container.appendChild(wallEl);
    }

    _stoneInOpening(stone, opening) {
        const sx = stone.x, sy = stone.y, sw = stone.w, sh = stone.h;
        const ox = opening.x, oy = opening.y, ow = opening.width, oh = opening.height;
        
        // Simple rectangular overlap
        return (
            sx + sw > ox + 5 &&
            sx < ox + ow - 5 &&
            sy + sh > oy + 5 &&
            sy < oy + oh - 5
        );
    }

    _renderArchStone(aStone, container) {
        const el = document.createElement('div');
        el.className = 'stone arch-stone' + (aStone.type === 'keystone' ? ' keystone' : '');
        
        // Calculate position from angle and radius
        const x = aStone.cx + Math.cos(aStone.angle) * aStone.innerRadius;
        const y = aStone.cy - Math.sin(aStone.angle) * aStone.innerRadius;
        const depth = aStone.outerRadius - aStone.innerRadius;
        const width = (Math.PI * aStone.innerRadius * 2) / (aStone.angle ? 20 : 13); // approximate
        
        Object.assign(el.style, {
            position: 'absolute',
            left: x + 'px',
            top: y + 'px',
            width: width + 'px',
            height: depth + 'px',
            background: aStone.color,
            borderRadius: '2px',
            transform: `rotate(${(aStone.angle - Math.PI/2) * (180/Math.PI)}deg)`,
            transformOrigin: 'left center',
            boxShadow: aStone.highlighted 
                ? '0 0 8px rgba(184,134,11,0.3), inset 1px 1px 0 rgba(255,255,255,0.1)'
                : 'inset 1px 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.3)',
        });
        
        container.appendChild(el);
        return el;
    }

    _buildFloor(floorDef, dims, stoneConfig) {
        const floorEl = document.createElement('div');
        floorEl.className = 'masonry-floor';
        
        Object.assign(floorEl.style, {
            position: 'absolute',
            left: '5%',
            top: floorDef.y + 'px',
            width: '90%',
            height: floorDef.height + 'px',
            background: '#2a2520',
            transform: 'perspective(500px) rotateX(20deg)',
            transformOrigin: 'top center',
        });

        // Floor stones (larger, flatter)
        const floorStones = generateWall({
            x: 0, y: 0,
            width: dims.width * 0.9,
            height: floorDef.height,
            courseHeight: stoneConfig.courseHeight * (floorDef.stoneScale || 1.5),
            colorBase: { r: 92, g: 79, b: 66 },
            colorVariance: 25,
            mortarGap: 4,
            weathering: 0.6,
        });

        for (const stone of floorStones) {
            const stoneEl = renderStone(stone, floorEl);
            this.stoneElements.push({ el: stoneEl, def: stone, type: 'floor' });
        }

        // Glyph carvings
        if (floorDef.features) {
            for (const feature of floorDef.features) {
                if (feature.type === 'glyph_carving') {
                    const glyphEl = document.createElement('div');
                    glyphEl.style.cssText = `
                        position: absolute;
                        left: ${feature.x}px;
                        top: ${feature.y}px;
                        font-size: 28px;
                        color: rgba(184,134,11,0.3);
                        letter-spacing: ${feature.spacing}px;
                        pointer-events: none;
                    `;
                    glyphEl.textContent = feature.glyphs.join(' ');
                    floorEl.appendChild(glyphEl);
                }
            }
        }

        this.container.appendChild(floorEl);
    }

    _buildCeiling(ceilingDef, dims) {
        const ceilingEl = document.createElement('div');
        ceilingEl.className = 'masonry-ceiling';
        
        Object.assign(ceilingEl.style, {
            position: 'absolute',
            top: '-40px',
            left: '5%',
            width: '90%',
            height: '80px',
            background: 'radial-gradient(ellipse at 50% 100%, #2a2520 0%, #1a1410 80%)',
            borderRadius: '50% 50% 0 0',
        });

        // Vault ribs
        if (ceilingDef.ribs) {
            for (const rib of ceilingDef.ribs) {
                const ribEl = document.createElement('div');
                ribEl.style.cssText = `
                    position: absolute;
                    left: ${rib.x}px;
                    top: 10px;
                    width: 8px;
                    height: 65px;
                    background: linear-gradient(to bottom, #3d362f, #2a2520);
                    border-radius: 4px 4px 0 0;
                `;
                ceilingEl.appendChild(ribEl);
            }
        }

        this.container.appendChild(ceilingEl);
    }

    _buildFeature(feature, wallEl, stoneConfig) {
        switch (feature.type) {
            case 'plinth':
                // Larger stones for the plinth
                const plinthStones = generateWall({
                    x: feature.x, y: feature.y,
                    width: feature.width, height: feature.height,
                    courseHeight: stoneConfig.courseHeight * (feature.stoneScale || 1.5),
                    colorBase: { r: 80, g: 70, b: 60 },
                    colorVariance: 15,
                    mortarGap: 3,
                    weathering: 0.2,
                });
                for (const stone of plinthStones) {
                    renderStone(stone, wallEl);
                }
                break;

            case 'tally_marks':
                const tallyEl = document.createElement('div');
                tallyEl.className = 'tally-marks';
                tallyEl.style.cssText = `
                    position: absolute;
                    left: ${feature.x}px;
                    top: ${feature.y}px;
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    color: rgba(244,228,193,0.25);
                    line-height: 1.4;
                `;
                if (feature.bind && this.state) {
                    const count = this.state[feature.bind]?.length || 0;
                    let marks = '';
                    for (let i = 0; i < Math.min(count, 50); i++) {
                        marks += (i % 5 === 4) ? '|  ' : '|';
                    }
                    tallyEl.textContent = marks || 'No tallies yet.';
                }
                wallEl.appendChild(tallyEl);
                break;

            case 'niche':
                const nicheEl = document.createElement('div');
                nicheEl.style.cssText = `
                    position: absolute;
                    left: ${feature.x}px;
                    top: ${feature.y}px;
                    width: ${feature.width}px;
                    height: ${feature.height}px;
                    background: #1a1410;
                    border: 3px solid #2a2520;
                    border-radius: ${feature.arch ? '30px 30px 6px 6px' : '6px'};
                    box-shadow: inset 0 0 30px rgba(0,0,0,0.6);
                `;
                wallEl.appendChild(nicheEl);
                break;
        }
    }

    _buildObjects(objects) {
        for (const obj of objects) {
            // Delegate to object-renderer or handle specific types
            // Brazier, NPC, etc.
        }
    }

    refreshBindings() {
        // Update tally marks, glow intensity, etc.
    }
}

// ═══════════════════════════════════
// HELPER: Color Variance
// ═══════════════════════════════════

function varyColor(base, variance) {
    const r = Math.max(0, Math.min(255, base.r + (Math.random() - 0.5) * variance));
    const g = Math.max(0, Math.min(255, base.g + (Math.random() - 0.5) * variance));
    const b = Math.max(0, Math.min(255, base.b + (Math.random() - 0.5) * variance));
    return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
}
