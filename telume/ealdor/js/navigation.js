// ═══════════════════════════════════════════════════════════════
// NAVIGATION · Kingdom of Ealdor
// ealdforn/telume/ealdor/js/navigation.js
//
// A portable navigation bar built from FontMason primitives.
// Drop into any HTML file with one call:
//
//   Navigation.render('current-location-id');
//
// Renders a stone threshold bar showing all connected locations.
// Current location glows. Others are dim thresholds waiting.
// ═══════════════════════════════════════════════════════════════

const Navigation = (() => {

    // ═══════════════════════════════════════
    // WORLD MAP
    // Every location: glyph, label, file, connections
    // ═══════════════════════════════════════

    const WORLD = {
        courtyard:  { glyph: '𐤃', label: 'The Yard',      file: 'index.html',      connects: ['chapel','harbor','great_hall','farm','wild_wood','vault'] },
        chapel:     { glyph: '𐤀', label: 'Coal Chapel',   file: 'chapel.html',     connects: ['courtyard'] },
        harbor:     { glyph: '𐤕', label: 'Fjord Harbor',  file: 'harbor.html',     connects: ['courtyard'] },
        great_hall: { glyph: '𐤔', label: 'Great Hall',    file: 'great_hall.html', connects: ['courtyard'] },
        farm:       { glyph: '𐤐', label: 'The Farm',      file: 'farm.html',       connects: ['courtyard'] },
        wild_wood:  { glyph: '𐤌', label: 'Wild Wood',     file: 'wild_wood.html',  connects: ['courtyard'] },
        vault:      { glyph: '𐤇', label: 'Tablet Vault',  file: 'vault.html',      connects: ['courtyard'] },
        dungeon:    { glyph: '𐤆', label: 'The Dungeon',   file: 'dungeon.html',    connects: ['courtyard','vault'] },
        citadel:    { glyph: '𐤉', label: 'Citadel',       file: 'citadel.html',    connects: ['courtyard'] },
        court:      { glyph: '𐤎', label: 'The Court',     file: 'court.html',      connects: ['great_hall'] },
        painting:   { glyph: '𐤁', label: 'Gallery',       file: 'painting.html',   connects: ['great_hall','courtyard'] },
    };

    // ═══════════════════════════════════════
    // STYLES (injected once)
    // ═══════════════════════════════════════

    function _injectStyles() {
        if (document.getElementById('navigation-styles')) return;
        const style = document.createElement('style');
        style.id = 'navigation-styles';
        style.textContent = `
            #ealdor-nav {
                position: relative;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0;
                background: #1a1612;
                border-bottom: 2px solid #2a2520;
                border-top: 2px solid #2a2520;
                padding: 0;
                z-index: 100;
                overflow-x: auto;
                scrollbar-width: none;
                user-select: none;
            }
            #ealdor-nav::-webkit-scrollbar { display: none; }

            .nav-stone {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 0.35rem 0.9rem;
                cursor: pointer;
                border-right: 1px solid #2a2520;
                transition: background 0.2s, filter 0.2s;
                text-decoration: none;
                min-width: 60px;
                flex-shrink: 0;
            }
            .nav-stone:first-child { border-left: 1px solid #2a2520; }

            .nav-stone:hover {
                background: #242018;
                filter: brightness(1.4);
            }

            .nav-stone.current {
                background: #242018;
                border-bottom: 2px solid #b8860b;
                margin-bottom: -2px;
            }

            .nav-stone.current .nav-glyph {
                color: #b8860b;
                text-shadow: 0 0 10px rgba(184,134,11,0.5), 0 0 20px rgba(184,134,11,0.2);
                animation: navGlyphPulse 3s ease-in-out infinite;
            }

            .nav-stone.unreachable {
                opacity: 0.3;
                cursor: default;
                pointer-events: none;
            }

            .nav-glyph {
                font-family: 'Georgia', serif;
                font-size: 1rem;
                color: #5c4f42;
                line-height: 1;
                transition: color 0.2s, text-shadow 0.2s;
            }

            .nav-stone:hover .nav-glyph {
                color: #8b7d6b;
            }

            .nav-label {
                font-family: 'Cinzel', serif;
                font-size: 0.44rem;
                color: #5c4f42;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                margin-top: 2px;
                line-height: 1;
                white-space: nowrap;
                transition: color 0.2s;
            }

            .nav-stone:hover .nav-label {
                color: #8b7d6b;
            }

            .nav-stone.current .nav-label {
                color: #b8860b;
            }

            /* Mortar texture between stones */
            .nav-mortar {
                width: 1px;
                height: 100%;
                background: linear-gradient(to bottom, #1a1612, #2a2520, #1a1612);
                flex-shrink: 0;
            }

            /* Tooltip */
            .nav-stone::after {
                content: attr(data-tip);
                position: absolute;
                bottom: calc(100% + 6px);
                left: 50%;
                transform: translateX(-50%);
                background: rgba(10,8,6,0.95);
                border: 1px solid #b8860b;
                border-radius: 3px;
                padding: 0.2rem 0.5rem;
                font-family: 'Cinzel', serif;
                font-size: 0.55rem;
                color: #f4e4c1;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 200;
                letter-spacing: 1px;
            }
            .nav-stone:hover::after { opacity: 1; }

            @keyframes navGlyphPulse {
                0%,100% { text-shadow: 0 0 8px rgba(184,134,11,0.4), 0 0 16px rgba(184,134,11,0.15); }
                50%      { text-shadow: 0 0 14px rgba(184,134,11,0.7), 0 0 28px rgba(184,134,11,0.3); }
            }

            /* Save flash */
            @keyframes navSaveFlash {
                0%   { opacity: 1; }
                50%  { opacity: 0.4; }
                100% { opacity: 1; }
            }
            .nav-saving { animation: navSaveFlash 0.6s ease-in-out; }
        `;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════

    function render(currentId, options = {}) {
        _injectStyles();

        const {
            containerId = 'ealdor-nav',
            saveCallback = null,        // optional: called before navigation
            showAll = false,            // if true, show all locations not just connected
        } = options;

        // Find or create container
        let nav = document.getElementById(containerId);
        if (!nav) {
            nav = document.createElement('nav');
            nav.id = containerId;
            // Insert at top of body if no container
            document.body.insertBefore(nav, document.body.firstChild);
        }
        nav.id = 'ealdor-nav';
        nav.innerHTML = '';

        const current = WORLD[currentId];
        const reachable = new Set(current?.connects || []);

        // Determine which locations to show
        const toShow = showAll
            ? Object.keys(WORLD)
            : [currentId, ...(current?.connects || [])];

        // Sort: current first, then connected alphabetically
        toShow.sort((a, b) => {
            if (a === currentId) return -1;
            if (b === currentId) return 1;
            return (WORLD[a]?.label || a).localeCompare(WORLD[b]?.label || b);
        });

        toShow.forEach((locId, i) => {
            const loc = WORLD[locId];
            if (!loc) return;

            const isCurrent = locId === currentId;
            const isReachable = isCurrent || reachable.has(locId);

            const stone = document.createElement('a');
            stone.className = 'nav-stone' +
                (isCurrent ? ' current' : '') +
                (!isReachable ? ' unreachable' : '');

            stone.dataset.tip = isCurrent ? 'You are here' : `Go to ${loc.label}`;

            if (!isCurrent && isReachable) {
                stone.href = loc.file + `?from=${currentId}`;
                stone.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (saveCallback) saveCallback();
                    // Flash effect
                    stone.classList.add('nav-saving');
                    setTimeout(() => {
                        window.location.href = stone.href;
                    }, 400);
                });
            }

            stone.innerHTML = `
                <span class="nav-glyph">${loc.glyph}</span>
                <span class="nav-label">${loc.label}</span>
            `;

            nav.appendChild(stone);
        });

        return nav;
    }

    // ═══════════════════════════════════════
    // UPDATE (call on state change)
    // e.g. when ice threshold crossed, dim harbor
    // ═══════════════════════════════════════

    function update(currentId, blockedIds = []) {
        const nav = document.getElementById('ealdor-nav');
        if (!nav) return;

        blockedIds.forEach(id => {
            const stones = nav.querySelectorAll('.nav-stone');
            stones.forEach(stone => {
                if (stone.href && stone.href.includes(WORLD[id]?.file)) {
                    stone.classList.add('unreachable');
                    stone.dataset.tip = `${WORLD[id]?.label} — passage blocked`;
                }
            });
        });
    }

    // ═══════════════════════════════════════
    // WORLD MAP ACCESSOR
    // ═══════════════════════════════════════

    function getLocation(id) {
        return WORLD[id] || null;
    }

    function getConnections(id) {
        return WORLD[id]?.connects || [];
    }

    // ═══════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════

    return { render, update, getLocation, getConnections, WORLD };

})();

// ═══════════════════════════════════════
// MODULE EXPORT
// ═══════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}
