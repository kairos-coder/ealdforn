// object-renderer.js
// Renders JSON object definitions into CSS-styled DOM elements
// ealdforn/telume/ealdor/js/object-renderer.js

class ObjectRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.objects = new Map(); // id → DOM element
        this.state = null;
        this.callbacks = {};
    }

    setState(state) {
        this.state = state;
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    // Load a full room definition
    loadRoom(roomJson) {
        this.container.innerHTML = '';
        this.objects.clear();

        // Build background/layers first
        if (roomJson.layers) {
            for (const layer of roomJson.layers) {
                this._renderLayer(layer);
            }
        }

        // Build objects
        if (roomJson.objects) {
            for (const obj of roomJson.objects) {
                this._renderObject(obj, this.container);
            }
        }

        // Build particles
        if (roomJson.particles) {
            for (const p of roomJson.particles) {
                this._renderParticleSystem(p);
            }
        }
    }

    // Render a single object from JSON
    _renderObject(objDef, parent) {
        const el = document.createElement('div');
        el.className = 'rendered-object';
        if (objDef.class) el.classList.add(objDef.class);
        if (objDef.id) el.id = objDef.id;

        // Apply base styles
        Object.assign(el.style, {
            position: 'absolute',
            boxSizing: 'border-box',
            ...this._resolvePosition(objDef.position),
            ...this._resolveStyle(objDef.style),
        });

        // Type-specific rendering
        switch (objDef.type) {
            case 'rect':
                el.style.width = (objDef.width || 50) + 'px';
                el.style.height = (objDef.height || 50) + 'px';
                break;

            case 'circle':
                const r = objDef.radius || 25;
                el.style.width = (r * 2) + 'px';
                el.style.height = (r * 2) + 'px';
                el.style.borderRadius = '50%';
                break;

            case 'text':
                el.textContent = objDef.content || '';
                Object.assign(el.style, {
                    fontFamily: objDef.font || 'Georgia, serif',
                    fontSize: (objDef.fontSize || 14) + 'px',
                    color: objDef.color || '#f4e4c1',
                });
                break;

            case 'sprite':
                el.textContent = objDef.glyph || '𐤃';
                el.style.fontSize = (objDef.fontSize || 24) + 'px';
                el.style.textAlign = 'center';
                el.style.lineHeight = '1';
                break;

            case 'container':
                // Just a grouping div — children rendered inside
                break;

            case 'svg-path':
                el.innerHTML = objDef.svg;
                break;
        }

        // Interaction
        if (objDef.interaction) {
            el.classList.add('zone');
            el.dataset.zone = objDef.zone || objDef.id;
            el.title = objDef.interaction.label || objDef.name;
            el.style.cursor = 'pointer';

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.callbacks.onInteract) {
                    this.callbacks.onInteract(objDef, el);
                }
            });
        }

        // Animations
        if (objDef.animation) {
            el.style.animation = objDef.animation;
        }

        // Hover effects
        if (objDef.hover) {
            el.addEventListener('mouseenter', () => {
                Object.assign(el.style, objDef.hover);
            });
            el.addEventListener('mouseleave', () => {
                Object.assign(el.style, this._resolveStyle(objDef.style));
            });
        }

        // State bindings
        if (objDef.bind) {
            this._applyBinding(el, objDef);
        }

        // Render children
        if (objDef.children) {
            for (const child of objDef.children) {
                this._renderObject(child, el);
            }
        }

        parent.appendChild(el);
        this.objects.set(objDef.id, el);
        return el;
    }

    // Resolve position: supports "center", percentages, pixels, and named anchors
    _resolvePosition(pos) {
        if (!pos) return { left: '0', top: '0' };
        const style = {};

        // X position
        if (pos.x === 'center') {
            style.left = '50%';
            style.transform = 'translateX(-50%)';
        } else if (typeof pos.x === 'number') {
            style.left = pos.x + 'px';
        } else if (typeof pos.x === 'string') {
            style.left = pos.x;
        }

        // Y position
        if (pos.y === 'center') {
            style.top = '50%';
            if (!style.transform) style.transform = '';
            style.transform += ' translateY(-50%)';
        } else if (typeof pos.y === 'number') {
            style.top = pos.y + 'px';
        } else if (typeof pos.y === 'string') {
            style.top = pos.y;
        }

        // Z index
        if (pos.z !== undefined) {
            style.zIndex = pos.z;
        }

        return style;
    }

    // Resolve style object (supports state-dependent values)
    _resolveStyle(styleDef) {
        if (!styleDef) return {};
        const resolved = {};

        for (const [key, value] of Object.entries(styleDef)) {
            if (typeof value === 'string' && value.startsWith('$')) {
                // State binding: "$ice > 50 ? #c8d8e4 : transparent"
                resolved[key] = this._evalBinding(value);
            } else if (typeof value === 'object' && value.bind) {
                resolved[key] = this._evalBinding(value.bind);
            } else {
                resolved[key] = value;
            }
        }

        return resolved;
    }

    // Evaluate a state binding expression
    _evalBinding(expression) {
        if (!this.state) return expression;
        // Simple bindings: "$ice" → state.ice, "$faith > 50 ? yes : no"
        try {
            const withState = expression.replace(/\$(\w+)/g, (_, key) => {
                return JSON.stringify(this.state[key] ?? 0);
            });
            return eval(withState);
        } catch (e) {
            return expression;
        }
    }

    // Apply a state binding to an element (updates on render)
    _applyBinding(el, objDef) {
        if (!this.state) return;

        for (const [prop, expression] of Object.entries(objDef.bind)) {
            const value = this._evalBinding(expression);
            if (prop === 'visible') {
                el.style.display = value ? '' : 'none';
            } else if (prop === 'opacity') {
                el.style.opacity = value;
            } else if (prop === 'text') {
                el.textContent = value;
            } else if (prop === 'height') {
                el.style.height = value + '%';
            } else {
                el.style[prop] = value;
            }
        }
    }

    // Update all bindings (call on state change)
    refreshBindings() {
        for (const [id, el] of this.objects) {
            // Find the original object definition to re-apply bindings
            // (In practice, you'd store the def alongside the element)
        }
    }

    _renderLayer(layer) {
        const el = document.createElement('div');
        el.className = 'room-layer ' + (layer.class || '');
        Object.assign(el.style, {
            position: 'absolute',
            ...this._resolvePosition(layer.position),
            width: layer.width || '100%',
            height: layer.height || '100%',
            ...this._resolveStyle(layer.style),
            pointerEvents: layer.interactive ? 'auto' : 'none',
            zIndex: layer.z || 0,
        });
        this.container.appendChild(el);
    }

    _renderParticleSystem(pDef) {
        const layer = document.createElement('div');
        layer.className = 'particle-layer';
        Object.assign(layer.style, {
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: pDef.z || 5,
        });
        this.container.appendChild(layer);

        // Spawn initial particles
        for (let i = 0; i < (pDef.count || 20); i++) {
            this._spawnParticle(layer, pDef);
        }

        // Continuous spawning
        if (pDef.continuous) {
            setInterval(() => {
                this._spawnParticle(layer, pDef);
            }, pDef.interval || 3000);
        }
    }

    _spawnParticle(layer, pDef) {
        const particle = document.createElement('div');
        const size = (Math.random() * (pDef.maxSize - pDef.minSize) + pDef.minSize) || 3;
        const startX = pDef.originX ? 
            (typeof pDef.originX === 'function' ? pDef.originX() : pDef.originX) :
            Math.random() * 100;
        const startY = pDef.originY || 50;

        Object.assign(particle.style, {
            position: 'absolute',
            width: size + 'px',
            height: size + 'px',
            background: pDef.color || 'rgba(200,216,228,0.6)',
            borderRadius: '50%',
            left: startX + '%',
            top: startY + '%',
            pointerEvents: 'none',
            animation: `${pDef.animationName || 'particleFloat'} ${Math.random() * 3 + 2}s ease-out forwards`,
            animationDelay: Math.random() * 0.5 + 's',
        });

        layer.appendChild(particle);
        setTimeout(() => particle.remove(), 4000);
    }
}
