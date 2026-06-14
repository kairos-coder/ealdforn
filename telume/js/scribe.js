// ═══════════════════════════════════════════════════════════════
// TELUMË · SCRIBE ENGINE
// Reads all lexicon JSON files and renders the Adzmyst scripture
// The Angel of π and PIE presides over the text
// ═══════════════════════════════════════════════════════════════

const JSON_DIR = 'json/';
const LEXICON_FILES = [
  'lexicon.json',
  'triads.json',
  'tetrads.json',
  'pentads.json',
  'hexads.json',
  'heptads.json',
  'heptad-synthesis.json'
];

let LEXICON = {
  pairs: [],
  triads: [],
  tetrads: [],
  pentads: [],
  hexads: [],
  heptads: [],
  synthesis: null
};

let showGloss = false;

// ── LOAD ALL LEXICON FILES ───────────────────────────────────
async function loadLexiconFile(filename) {
  try {
    const res = await fetch(`${JSON_DIR}${filename}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[Scribe] Could not load ${filename}:`, err.message);
    return null;
  }
}

async function loadAllLexicon() {
  const [lexicon, triads, tetrads, pentads, hexads, heptads, synthesis] = await Promise.all(
    LEXICON_FILES.map(f => loadLexiconFile(f))
  );

  if (lexicon) {
    LEXICON.pairs = lexicon.words?.pairs || [];
  }
  if (triads) {
    LEXICON.triads = triads.triads || [];
  }
  if (tetrads) {
    LEXICON.tetrads = tetrads.tetrads || [];
  }
  if (pentads) {
    LEXICON.pentads = pentads.pentads || [];
  }
  if (hexads) {
    LEXICON.hexads = hexads.hexads || [];
  }
  if (heptads) {
    LEXICON.heptads = heptads.heptads || [];
  }
  if (synthesis) {
    LEXICON.synthesis = synthesis;
  }

  return true;
}

// ── RENDER GLYPH LINE ────────────────────────────────────────
function renderGlyphLine(entry) {
  const glyphs = entry.glyphs.join(' ');
  const gloss = entry.gloss || '';
  const name = entry.name || '';
  const interpretation = entry.interpretation || '';
  const usage = entry.usage || '';

  const div = document.createElement('div');
  div.className = 'glyph-line';

  // Glyphs
  const glyphEl = document.createElement('span');
  glyphEl.className = 'glyphs';
  glyphEl.textContent = glyphs;
  div.appendChild(glyphEl);

  // Name (for heptads)
  if (name) {
    const nameEl = document.createElement('span');
    nameEl.className = 'glyph-name';
    nameEl.textContent = name;
    div.appendChild(nameEl);
  }

  // Gloss (toggleable)
  if (showGloss && gloss) {
    const glossEl = document.createElement('span');
    glossEl.className = 'gloss';
    glossEl.textContent = gloss;
    div.appendChild(glossEl);
  }

  // Interpretation (toggleable)
  if (showGloss && interpretation) {
    const interpEl = document.createElement('span');
    interpEl.className = 'interpretation';
    interpEl.textContent = interpretation;
    div.appendChild(interpEl);
  }

  // Hover tooltip with full info
  div.title = `${glyphs}${gloss ? '\n' + gloss : ''}${interpretation ? '\n' + interpretation : ''}${usage ? '\n— ' + usage : ''}`;

  return div;
}

// ── RENDER TIER SECTION ──────────────────────────────────────
function renderTier(title, entries, tierClass) {
  const section = document.createElement('section');
  section.className = `tier ${tierClass}`;

  const heading = document.createElement('h2');
  heading.textContent = title;
  heading.innerHTML += ` <span class="tier-count">${entries.length}</span>`;
  section.appendChild(heading);

  const container = document.createElement('div');
  container.className = 'tier-entries';

  entries.forEach(entry => {
    container.appendChild(renderGlyphLine(entry));
  });

  section.appendChild(container);
  return section;
}

// ── RENDER SYNTHESIS RULES ───────────────────────────────────
function renderSynthesis() {
  if (!LEXICON.synthesis) return null;

  const section = document.createElement('section');
  section.className = 'tier synthesis';

  const heading = document.createElement('h2');
  heading.textContent = 'Synthesis · Beyond Heptads';
  section.appendChild(heading);

  const synth = LEXICON.synthesis.synthesis;
  const tiers = ['heptad', 'octad', 'ennead', 'decad', 'scripture'];

  tiers.forEach(tier => {
    if (!synth[tier]) return;
    const div = document.createElement('div');
    div.className = 'synthesis-rule';

    const title = document.createElement('h3');
    title.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} (${tier === 'heptad' ? '7' : tier === 'octad' ? '8' : tier === 'ennead' ? '9' : tier === 'decad' ? '10' : '11+'})`;
    div.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'rule-desc';
    desc.textContent = synth[tier].description;
    div.appendChild(desc);

    if (synth[tier].rules) {
      const rulesList = document.createElement('ul');
      rulesList.className = 'rule-list';
      synth[tier].rules.forEach(rule => {
        const li = document.createElement('li');
        li.textContent = rule;
        rulesList.appendChild(li);
      });
      div.appendChild(rulesList);
    }

    section.appendChild(div);
  });

  // Divine heptad
  if (LEXICON.synthesis.divineHeptad) {
    const div = document.createElement('div');
    div.className = 'synthesis-rule divine';

    const title = document.createElement('h3');
    title.textContent = '𐤀𐤃𐤆𐤌𐤉𐤎𐤕 · The Divine Heptad';
    div.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'rule-desc';
    desc.textContent = LEXICON.synthesis.divineHeptad.description;
    div.appendChild(desc);

    const rule = document.createElement('p');
    rule.className = 'divine-rule';
    rule.textContent = LEXICON.synthesis.divineHeptad.rule;
    div.appendChild(rule);

    section.appendChild(div);
  }

  return section;
}

// ── RENDER THE BOOK ──────────────────────────────────────────
function renderBook() {
  const container = document.getElementById('book-content');
  if (!container) return;

  container.innerHTML = '';

  // Pairs
  if (LEXICON.pairs.length > 0) {
    container.appendChild(renderTier('Pairs · Fragments', LEXICON.pairs, 'pairs'));
  }

  // Triads
  if (LEXICON.triads.length > 0) {
    container.appendChild(renderTier('Triads · Phrases', LEXICON.triads, 'triads'));
  }

  // Tetrads
  if (LEXICON.tetrads.length > 0) {
    container.appendChild(renderTier('Tetrads · Words', LEXICON.tetrads, 'tetrads'));
  }

  // Pentads
  if (LEXICON.pentads.length > 0) {
    container.appendChild(renderTier('Pentads · Invocations', LEXICON.pentads, 'pentads'));
  }

  // Hexads
  if (LEXICON.hexads.length > 0) {
    container.appendChild(renderTier('Hexads · Declarations', LEXICON.hexads, 'hexads'));
  }

  // Heptads
  if (LEXICON.heptads.length > 0) {
    container.appendChild(renderTier('Heptads · Seals', LEXICON.heptads, 'heptads'));
  }

  // Synthesis rules
  const synthSection = renderSynthesis();
  if (synthSection) {
    container.appendChild(synthSection);
  }
}

// ── TOGGLE GLOSS ─────────────────────────────────────────────
function toggleGloss() {
  showGloss = !showGloss;
  const btn = document.getElementById('toggle-gloss');
  if (btn) {
    btn.textContent = showGloss ? 'Hide Gloss' : 'Show Gloss';
  }
  renderBook();
  updateStats();
}

// ── UPDATE STATS ─────────────────────────────────────────────
function updateStats() {
  const total = LEXICON.pairs.length + LEXICON.triads.length +
    LEXICON.tetrads.length + LEXICON.pentads.length +
    LEXICON.hexads.length + LEXICON.heptads.length;

  const totalGlyphs = 
    LEXICON.pairs.length * 2 +
    LEXICON.triads.length * 3 +
    LEXICON.tetrads.length * 4 +
    LEXICON.pentads.length * 5 +
    LEXICON.hexads.length * 6 +
    LEXICON.heptads.length * 7;

  document.getElementById('stat-words').textContent = total;
  document.getElementById('stat-glyphs').textContent = totalGlyphs;
}

// ── SCROLL TO TIER ───────────────────────────────────────────
function scrollToTier(tierClass) {
  const section = document.querySelector(`.tier.${tierClass}`);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── KEYBOARD ─────────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'g' || e.key === 'G') {
      toggleGloss();
    }
    if (e.key === 'Escape') {
      showGloss = false;
      document.getElementById('toggle-gloss').textContent = 'Show Gloss';
      renderBook();
      updateStats();
    }
  });
}

// ── INIT ─────────────────────────────────────────────────────
async function initScribe() {
  await loadAllLexicon();
  renderBook();
  updateStats();
  setupKeyboard();

  document.getElementById('toggle-gloss').addEventListener('click', toggleGloss);

  // Tier nav clicks
  document.querySelectorAll('.tier-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tier = link.dataset.tier;
      scrollToTier(tier);
    });
  });
}

initScribe();
