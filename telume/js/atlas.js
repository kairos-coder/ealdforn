// ═══════════════════════════════════════════════════════════════
// TELUMË · ATLAS ENGINE
// Interactivity layer for the hardcoded SVG map
// Geography is in atlas.html. This handles tooltips, info panel,
// and city-state data from telume.json.
// ═══════════════════════════════════════════════════════════════

let TELUME_DATA = null;

// ── CITY-STATE DATA (fallback if telume.json unavailable) ─────
const FALLBACK_CITIES = {
  nesatta: {
    name: 'Nešatta',
    tier: 'Hittite · Pankus Fire-Keeper',
    description: 'Oldest of the seven. Archive city. Nearly abandoned. Holds the glyph archive that could break every other kingdom\'s origin story. The Pankus assembly meets here every seven years.',
    realm: 'haldorian'
  },
  tihomir: {
    name: 'Tihomir',
    tier: 'Old Church Slavonic · Witness City',
    description: 'Monastery on the Mingan Archipelago. Does not vote in the Pankus. Keeps the written record. Bogumil\'s home. Where the Nešatta Codex was transcribed.',
    realm: 'haldorian'
  },
  tsarnigrad: {
    name: 'Tsarnigrad',
    tier: 'Old East Slavic · Dark Fortress',
    description: 'The almost-monarchy. Greatest internal threat to the Pankus covenant. The city that effaced and recarved the "no king" inscription. Stockpiling grain as the ice advances.',
    realm: 'haldorian'
  },
  radogost: {
    name: 'Radogost',
    tier: 'Old West Slavic · Trade Heart',
    description: 'Glad host at the Miramichi river mouth. Inland gateway to the river routes. Where the Pankus gets its grain. The most welcoming of the seven — and the most vulnerable.',
    realm: 'haldorian'
  },
  aristopol: {
    name: 'Aristopol',
    tier: 'Macedonian Greek · Empire-Builder',
    description: '"The city of the best" — named themselves after a quality they assigned to themselves. Perpetually proposes a hegemon for the Pankus. Exhausting and indispensable. Building ships faster than anyone else.',
    realm: 'haldorian'
  },
  gordeon: {
    name: 'Gordéon',
    tier: 'Phrygian · The Unsolvable City',
    description: 'Old money. Old gods. Arrived with wealth nobody can account for. The Gordian knot as political theology. Doesn\'t explain itself. Buying fuel at unusual rates.',
    realm: 'haldorian'
  },
  pescassa: {
    name: 'Pescassa',
    tier: 'Epic Latin · Maritime Fishing City',
    description: 'The language of the net and the oar, not the sword and the senate. Arrived in boats. Never left. Latin fishing root + Anatolian suffix from centuries of trading with Nešatta.',
    realm: 'haldorian'
  },
  ealdenburg: {
    name: 'Ealdenburg',
    tier: 'Capital of Ealdor',
    description: 'The Old Fort. Hillfort of timber halls and standing stones. Where the Witenagemot meets to choose the king. The Ring lies to the north.',
    realm: 'ealdor'
  },
  suryapura: {
    name: 'Sūryapura',
    tier: 'Capital of Sūrya Samrājya · Sun City',
    description: 'Temple complex of golden spires and observatories. The Sun-King resides here. The Trilingual Codex is kept in the Agnihotra temple. The Terminal hums on solstices.',
    realm: 'surya'
  },
  ring: {
    name: 'The Ring',
    tier: 'Sacred Site · Manicouagan Crater',
    description: 'Where Hengist swore the first oath. Where Ymir hit the ground. Where the oldest ogham circle stands. Three traditions, one site, a religious order that serves all three.',
    realm: 'ealdor'
  }
};

// ── LOAD TELUME DATA ─────────────────────────────────────────
async function loadTelumeData() {
  try {
    const res = await fetch('json/telume.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    TELUME_DATA = await res.json();
    return true;
  } catch (err) {
    console.warn('[Atlas] Could not load telume.json, using fallback:', err.message);
    return false;
  }
}

// ── GET CITY INFO ────────────────────────────────────────────
function getCityInfo(id) {
  // Try telume.json first
  if (TELUME_DATA) {
    for (const realm of TELUME_DATA.realms) {
      if (realm.id === 'haldorian' && realm.cityStates) {
        const city = realm.cityStates.find(c => c.id === id);
        if (city) {
          return {
            name: city.name,
            tier: `${city.tier} · ${city.character.split('.')[0]}`,
            description: city.character,
            realm: 'haldorian'
          };
        }
      }
      // Check capitals
      if (realm.capital && realm.id === id.replace('pura', '').replace('burg', '')) {
        // fuzzy match for suryapura / ealdenburg
      }
    }
  }
  // Fallback
  return FALLBACK_CITIES[id] || {
    name: id,
    tier: 'Unknown',
    description: 'Location data not yet recorded.',
    realm: 'unknown'
  };
}

// ── TOOLTIP ──────────────────────────────────────────────────
const tooltip = document.getElementById('tooltip');

function showTooltip(e, cityId) {
  const info = getCityInfo(cityId);
  tooltip.textContent = info.name;
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
  const info = getCityInfo(id);
  const panel = document.getElementById('info-panel');

  document.getElementById('panelName').textContent = info.name;
  document.getElementById('panelTier').textContent = info.tier;
  document.getElementById('panelDesc').textContent = info.description;

  panel.classList.add('visible');
}

// Close panel on click outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('info-panel');
  if (!panel.contains(e.target) && !e.target.closest('.city-marker')) {
    panel.classList.remove('visible');
  }
});

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('info-panel').classList.remove('visible');
  }
});

// ── ATTACH INTERACTIVITY TO CITY MARKERS ─────────────────────
function attachCityEvents() {
  document.querySelectorAll('.city-marker').forEach(marker => {
    const id = marker.getAttribute('data-id');
    if (!id) return;

    marker.addEventListener('click', () => showLocation(id));

    marker.addEventListener('mouseenter', (e) => {
      showTooltip(e, id);
    });

    marker.addEventListener('mousemove', (e) => {
      moveTooltip(e);
    });

    marker.addEventListener('mouseleave', () => {
      hideTooltip();
    });
  });
}

// ── INIT ─────────────────────────────────────────────────────
async function initAtlas() {
  await loadTelumeData();
  attachCityEvents();
}

initAtlas();
