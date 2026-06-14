// ═══════════════════════════════════════════════════════════════
// TELUMË · LANGUAGE TOMES
// Reads markdown files from language/ and renders them as cards
// The Angel of π and PIE presides over the collection
// ═══════════════════════════════════════════════════════════════

const LANGUAGE_DIR = 'language/';

// ── KNOWN TOMES ──────────────────────────────────────────────
// Each tomes has a filename, an icon, and metadata
const TOMES = [
  {
    file: 'glyphs.md',
    icon: '𐤀',
    type: 'canon',
    description: 'The 22 Adzmyst glyphs as they appear in Telumë. Sacred seven, wider alphabet, density map.'
  },
  {
    file: 'threshold-pairs.md',
    icon: '𐤃',
    type: 'canon',
    description: 'Every door bears a pair. Catalog of known and theoretical threshold inscriptions.'
  },
  {
    file: 'phonemes.md',
    icon: '𐤐',
    type: 'reference',
    description: 'The sound of the vault. Consonants, vowels, stress, rhythm, sample names.'
  },
  {
    file: 'etymologies.md',
    icon: '𐤓',
    type: 'reference',
    description: 'The deep roots of names. Where words come from. The history the reader never sees.'
  },
  {
    file: 'angel-of-pi.md',
    icon: 'π',
    type: 'entity',
    description: 'The keeper of circles and roots. Presides over the language folder. Not a character — an infrastructure entity.'
  }
];

// ── ENTITY: ANGEL OF π AND PIE ────────────────────────────────
const ANGEL = {
  name: 'The Angel of π and PIE',
  glyph: 'π',
  title: 'Keeper of Circles and Roots',
  domain: 'Irrational precision, the mother tongue, the curve of glyphs, the deep roots of words',
  invocation: 'Invoked when a word\'s origin is sought, when a glyph\'s curve must be measured, when the vault\'s geometry requires attention.',
  aspects: [
    { name: 'The Measurer', concern: 'π — The curve of a glyph, the arc of the vault, the circle of the calendar year.' },
    { name: 'The Etymologist', concern: 'PIE — The mother tongue. Every word contains the ghost of a root. The angel traces them.' }
  ],
  note: 'The Angel does not appear in the story. It inhabits the infrastructure. Its annotations are invisible to the reader — but the writer knows it is there.'
};

// ── FETCH AND PARSE MARKDOWN ─────────────────────────────────
async function fetchTome(filename) {
  try {
    const res = await fetch(`${LANGUAGE_DIR}${filename}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`[Tomes] Could not load ${filename}:`, err.message);
    return null;
  }
}

function parseMarkdownPreview(md) {
  if (!md) return { title: 'Unavailable', excerpt: 'This tomes could not be loaded.', status: 'missing' };

  const lines = md.split('\n');

  // Extract title from first # heading
  let title = 'Untitled';
  let excerpt = '';
  let status = 'unknown';

  for (const line of lines) {
    if (line.startsWith('# ') && title === 'Untitled') {
      title = line.replace(/^# /, '').trim();
    }
    // Extract status line
    if (line.startsWith('**Status:')) {
      const match = line.match(/\*\*Status:\*\*\s*(.+)/);
      if (match) status = match[1].trim();
    }
    // Build excerpt from first meaningful paragraph
    if (!line.startsWith('#') && !line.startsWith('**') && line.trim().length > 30 && !excerpt) {
      excerpt = line.trim().substring(0, 160) + '…';
    }
  }

  if (!excerpt) excerpt = 'Open this tomes to read its contents.';

  return { title, excerpt, status };
}

// ── RENDER ────────────────────────────────────────────────────
function createTomeCard(tome, preview) {
  const card = document.createElement('a');
  card.className = 'card';
  card.href = `${LANGUAGE_DIR}${tome.file}`;

  const statusClass = preview.status.toLowerCase().includes('active') ? 'active' :
    preview.status.toLowerCase().includes('stub') ? 'pending' : 'built';

  card.innerHTML = `
    <div class="card-glyph">${tome.icon}</div>
    <div class="card-title">${preview.title}</div>
    <div class="card-desc">${preview.excerpt}</div>
    <div class="card-status ${statusClass}">${preview.status}</div>
  `;

  return card;
}

function createAngelCard() {
  const card = document.createElement('div');
  card.className = 'card angel-card';
  card.id = 'angel-card';
  card.style.cursor = 'pointer';

  card.innerHTML = `
    <div class="card-glyph">${ANGEL.glyph}</div>
    <div class="card-title">${ANGEL.name}</div>
    <div class="card-desc">${ANGEL.title}. ${ANGEL.domain}.</div>
    <div class="card-status active">Entity · Presiding</div>
  `;

  card.addEventListener('click', () => toggleAngelPanel());

  return card;
}

function createAngelPanel() {
  // Remove existing panel if any
  const existing = document.getElementById('angel-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'angel-panel';
  panel.className = 'angel-panel';

  panel.innerHTML = `
    <div class="angel-panel-inner">
      <button class="angel-panel-close" onclick="document.getElementById('angel-panel').remove()">×</button>
      <div class="panel-glyph">${ANGEL.glyph}</div>
      <div class="panel-name">${ANGEL.name}</div>
      <div class="panel-title">${ANGEL.title}</div>
      <div class="panel-section">
        <h4>Domain</h4>
        <p>${ANGEL.domain}</p>
      </div>
      <div class="panel-section">
        <h4>Invocation</h4>
        <p>${ANGEL.invocation}</p>
      </div>
      <div class="panel-section">
        <h4>Aspects</h4>
        ${ANGEL.aspects.map(a => `
          <div class="aspect">
            <strong>${a.name}</strong>
            <span>${a.concern}</span>
          </div>
        `).join('')}
      </div>
      <div class="panel-section note">
        <p>${ANGEL.note}</p>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Close on escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      panel.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Close on click outside
  panel.addEventListener('click', (e) => {
    if (e.target === panel) panel.remove();
  });
}

function toggleAngelPanel() {
  const existing = document.getElementById('angel-panel');
  if (existing) {
    existing.remove();
  } else {
    createAngelPanel();
  }
}

// ── BUILD SECTION ─────────────────────────────────────────────
async function buildLanguageSection() {
  const container = document.getElementById('language-cards');
  if (!container) {
    console.warn('[Tomes] No #language-cards container found in the page');
    return;
  }

  // Show loading state
  container.innerHTML = '<div class="card"><div class="card-desc" style="text-align:center;grid-column:1/-1;">Loading tomes…</div></div>';

  // Fetch all tomes
  const cards = [];
  for (const tome of TOMES) {
    const md = await fetchTome(tome.file);
    const preview = parseMarkdownPreview(md);
    cards.push(createTomeCard(tome, preview));
  }

  // Clear and populate
  container.innerHTML = '';

  // Add the Angel card first
  container.appendChild(createAngelCard());

  // Add the tomes
  cards.forEach(card => container.appendChild(card));
}

// ── ANGEL PANEL STYLES ────────────────────────────────────────
function injectAngelStyles() {
  if (document.getElementById('angel-styles')) return;

  const style = document.createElement('style');
  style.id = 'angel-styles';
  style.textContent = `
    .angel-card {
      border-color: rgba(200,152,10,0.4) !important;
      position: relative;
    }
    .angel-card::after {
      content: '';
      position: absolute; inset: -1px;
      border: 1px solid transparent;
      background: conic-gradient(from 0deg, transparent, rgba(200,152,10,0.3), transparent, rgba(200,152,10,0.3), transparent) border-box;
      -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
      border-radius: inherit;
    }
    .angel-card:hover {
      border-color: var(--gold) !important;
      box-shadow: 0 0 24px rgba(200,152,10,0.15);
    }

    .angel-panel {
      position: fixed; inset: 0;
      z-index: 200;
      display: flex;
      align-items: center; justify-content: center;
      background: rgba(26,16,8,0.7);
      backdrop-filter: blur(4px);
      padding: 2rem;
    }
    .angel-panel-inner {
      background: var(--parchment, #F5ECD7);
      border: 1px solid var(--gold-dark, #8A6008);
      padding: 2rem;
      max-width: 520px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
      border-radius: 2px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.2);
    }
    .angel-panel-close {
      position: absolute; top: 0.8rem; right: 1rem;
      background: none; border: none;
      font-size: 1.4rem; color: var(--ink-dim, #6A5030);
      cursor: pointer; line-height: 1;
    }
    .angel-panel-close:hover { color: var(--gold-dark, #8A6008); }
    .angel-panel .panel-glyph {
      font-size: 3rem; text-align: center;
      color: var(--gold-dark, #8A6008); margin-bottom: 0.3rem;
    }
    .angel-panel .panel-name {
      font-family: 'Cinzel Decorative', serif;
      font-size: 1.3rem; text-align: center;
      color: var(--gold-dark, #8A6008);
      letter-spacing: 3px; margin-bottom: 0.2rem;
    }
    .angel-panel .panel-title {
      font-family: 'Cinzel', serif;
      font-size: 0.65rem; letter-spacing: 3px;
      text-transform: uppercase; text-align: center;
      color: var(--ink-dim, #6A5030); margin-bottom: 1.5rem;
    }
    .angel-panel .panel-section {
      margin-bottom: 1.2rem;
    }
    .angel-panel .panel-section h4 {
      font-family: 'Cinzel', serif;
      font-size: 0.6rem; letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--gold-dark, #8A6008);
      margin-bottom: 0.3rem;
    }
    .angel-panel .panel-section p {
      font-size: 0.9rem; line-height: 1.7;
      color: var(--ink-mid, #3A2810);
      font-style: italic;
    }
    .angel-panel .aspect {
      padding: 0.5rem 0;
      border-top: 1px solid var(--border, rgba(164,134,80,0.25));
    }
    .angel-panel .aspect strong {
      font-family: 'Cinzel', serif;
      font-size: 0.7rem; letter-spacing: 1px;
      color: var(--ink-mid, #3A2810);
      display: block; margin-bottom: 0.2rem;
    }
    .angel-panel .aspect span {
      font-size: 0.85rem; color: var(--ink-dim, #6A5030);
      font-style: italic;
    }
    .angel-panel .note {
      border-top: 1px solid var(--border, rgba(164,134,80,0.25));
      padding-top: 1rem;
      font-size: 0.8rem !important;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);
}

// ── INIT ─────────────────────────────────────────────────────
async function initLanguageTomes() {
  injectAngelStyles();
  await buildLanguageSection();
}

// Auto-init if the container exists
if (document.getElementById('language-cards')) {
  initLanguageTomes();
}
