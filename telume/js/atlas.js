// ═══════════════════════════════════════════════════════════════
// TELUMË · ATLAS ENGINE
// Renders the SVG map from json/map.json
// ═══════════════════════════════════════════════════════════════

let MAP_DATA = null;

// ── LOAD MAP DATA ────────────────────────────────────────────
async function loadMapData() {
  try {
    const res = await fetch('json/map.json');
    if (!res.ok) throw new Error(`Failed to load map.json: ${res.status}`);
    MAP_DATA = await res.json();
    return true;
  } catch (err) {
    console.error('[Atlas] Failed to load map data:', err);
    return false;
  }
}

// ── BUILD SVG ────────────────────────────────────────────────
function buildSvg() {
  const svg = document.getElementById('mapSvg');
  if (!svg || !MAP_DATA) return;

  // Clear existing
  svg.innerHTML = '';

  // Build defs (patterns, filters)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const fogPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  fogPattern.setAttribute('id', 'fogPattern');
  fogPattern.setAttribute('width', '20');
  fogPattern.setAttribute('height', '20');
  fogPattern.setAttribute('patternUnits', 'userSpaceOnUse');
  const fogDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  fogDot.setAttribute('cx', '10');
  fogDot.setAttribute('cy', '10');
  fogDot.setAttribute('r', '1');
  fogDot.setAttribute('fill', '#6A5030');
  fogDot.setAttribute('opacity', '0.3');
  fogPattern.appendChild(fogDot);
  defs.appendChild(fogPattern);
  svg.appendChild(defs);

  // Terrain
  MAP_DATA.terrain.forEach(t => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', t.svg.element);
    Object.entries(t.svg).forEach(([key, val]) => {
      if (key !== 'element') el.setAttribute(key, val);
    });
    Object.entries(t.style).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
    svg.appendChild(el);
  });

  // Paths
  MAP_DATA.paths.forEach(p => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', p.svg.element);
    Object.entries(p.svg).forEach(([key, val]) => {
      if (key !== 'element') el.setAttribute(key, val);
    });
    Object.entries(p.style).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
    el.setAttribute('fill', 'none');
    svg.appendChild(el);
  });

  // Locations
  MAP_DATA.locations.forEach(loc => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'location-marker');
    group.setAttribute('data-id', loc.id);
    group.addEventListener('click', () => showLocation(loc.id));

    // Glow circle
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', loc.x);
    glow.setAttribute('cy', loc.y);
    glow.setAttribute('r', loc.startLocation ? '14' : '12');
    glow.setAttribute('fill', 'none');
    glow.setAttribute('stroke', '#8A6008');
    glow.setAttribute('stroke-width', '0.5');
    glow.setAttribute('class', 'marker-glow');
    glow.setAttribute('opacity', loc.discovered ? '0.3' : '0.1');
    group.appendChild(glow);

    // Dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', loc.x);
    dot.setAttribute('cy', loc.y);
    dot.setAttribute('r', loc.startLocation ? '5' : loc.discovered ? '4' : '3.5');
    dot.setAttribute('fill', loc.discovered ? '#C8980A' : '#6A5030');
    dot.setAttribute('opacity', loc.discovered ? '1' : '0.5');
    dot.setAttribute('class', loc.startLocation ? 'marker-dot marker-pulse' : 'marker-dot');
    group.appendChild(dot);

    // Glyph label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', loc.x);
    text.setAttribute('y', loc.y - 14);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', "'Cinzel', serif");
    text.setAttribute('font-size', loc.startLocation ? '10' : '9');
    text.setAttribute('fill', loc.discovered ? '#8A6008' : '#6A5030');
    text.setAttribute('opacity', loc.discovered ? '0.7' : '0.4');
    text.textContent = loc.discovered ? loc.glyph : '?';
    group.appendChild(text);

    // Hover events
    group.addEventListener('mouseenter', (e) => showTooltip(e, loc));
    group.addEventListener('mousemove', (e) => moveTooltip(e));
    group.addEventListener('mouseleave', hideTooltip);

    svg.appendChild(group);
  });

  // Fog of war overlay
  if (MAP_DATA.fogOfWar && MAP_DATA.fogOfWar.enabled) {
    const fog = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    fog.setAttribute('x', '0');
    fog.setAttribute('y', '0');
    fog.setAttribute('width', MAP_DATA.meta.bounds.width);
    fog.setAttribute('height', MAP_DATA.meta.bounds.height);
    fog.setAttribute('fill', 'url(#fogPattern)');
    fog.setAttribute('opacity', MAP_DATA.fogOfWar.opacity);
    fog.setAttribute('pointer-events', 'none');
    svg.appendChild(fog);
  }
}

// ── TOOLTIP ──────────────────────────────────────────────────
const tooltip = document.getElementById('tooltip');

function showTooltip(e, loc) {
  if (!loc.discovered) {
    tooltip.textContent = 'Unknown Location';
  } else {
    tooltip.textContent = loc.name;
  }
  tooltip.style.opacity = '1';
}

function moveTooltip(e) {
  const wrapper = document.getElementById('mapWrapper');
  const rect = wrapper.getBoundingClientRect();
  tooltip.style.left = (e.clientX - rect.left + 16) + 'px';
  tooltip.style.top  = (e.clientY - rect.top - 40) + 'px';
}

function hideTooltip() {
  tooltip.style.opacity = '0';
}

// ── INFO PANEL ───────────────────────────────────────────────
function showLocation(id) {
  const loc = MAP_DATA.locations.find(l => l.id === id);
  if (!loc) return;

  const panel = document.getElementById('info-panel');
  document.getElementById('panelGlyph').textContent = loc.discovered ? loc.glyph : '?';
  document.getElementById('panelName').textContent = loc.name;
  document.getElementById('panelDesc').textContent = loc.description;
  document.getElementById('panelLink').href = loc.link;

  if (!loc.discovered) {
    document.getElementById('panelDesc').textContent =
      'This location has not yet been discovered. Its name is unknown. Its glyph is unread.';
    document.getElementById('panelLink').style.display = 'none';
  } else {
    document.getElementById('panelLink').style.display = 'block';
  }

  panel.classList.add('visible');
}

// Close panel on click outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('info-panel');
  if (!panel.contains(e.target) && !e.target.closest('.location-marker')) {
    panel.classList.remove('visible');
  }
});

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('info-panel').classList.remove('visible');
  }
});

// ── INIT ─────────────────────────────────────────────────────
async function initAtlas() {
  const ok = await loadMapData();
  if (!ok) {
    document.getElementById('mapSvg').innerHTML =
      '<text x="400" y="300" text-anchor="middle" font-family="Cinzel,serif" font-size="14" fill="#8A6008">𐤆 Failed to load map data</text>';
    return;
  }
  buildSvg();

  // Update title
  document.querySelector('.map-title').textContent = MAP_DATA.meta.name;
  document.querySelector('.map-subtitle').textContent =
    `${MAP_DATA.meta.subtitle} · Year ${MAP_DATA.meta.year}`;
}

initAtlas();
