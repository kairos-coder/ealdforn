```markdown
# 🎭 Ealdforn · The Water Pillar · Source of Stories

## What This Is

Ealdforn is the **Water pillar** of the Order of Olympus — the source of stories, the mythic memory, the living narrative engine of the GAIA cosmology. It contains:

- **The Stage** — a browser-based dark fantasy text adventure engine that performs screenplays written by human-AI collaboration
- **The Sagas** — long-form mythopoeic poetry in Old Saxon, Old English, Old Norse, and Modern English
- **The Grimoire** — a recursive oracle that draws from the 78-card Divination deck and generates interpretations
- **The Republic** — a living constitutional framework with a Senate, Comitia, House, and Curia
- **The Ealdenmot** — the assembly matrix where votes are computed from character, not chance
- **The Manifestos** — New Moon declarations, Full Moon proclamations, the living documents of the Order

Ealdforn is one of four pillars in the GAIA cosmology:

| Pillar | Element | Repo | Nature |
|--------|---------|------|--------|
| **GAIA** | 🜃 Earth | `gaia/` | The brain. The dashboard. The browser-tree. |
| **Divination** | 🜂 Fire | `divination/` | The temple. Cards, sky, oracle, images. |
| **Ealdforn** | 🜄 Water | `ealdforn/` | The source. Stories, sagas, stage, republic. |
| **Adzmist** | 🜁 Air | `adzmist/` | The breath. Constructed language. Proto-Sinaitic glyphs. |

**Live at:** `https://kairos-coder.github.io/ealdforn/`

---

## The Stage · How It Works

1. **A player opens the playbill** (`index.html`) and selects a story
2. **The stage loads the screenplay JSON** from `script/[story-name].json`
3. **The stage loads the set** from `set/[set-name].json` — background images, weather, world beats
4. **The stage loads the cast** from `actors/olympians.json` — the 12 Olympian gods with portraits
5. **The stage loads choice cards** from `cards/` — filtered by the screenplay's tone
6. **Six scenes play out.** Each scene: a random god arrives, speaks, and offers three choices
7. **The player chooses.** Traits accumulate. The world changes. Memory cards echo past choices.
8. **Curtain call.** The dominant trait determines the ending. Each god gets a final reaction.

---

## The Screenplay Format

You write one JSON file. Here is the complete schema:

```json
{
  "title": "Your Story Title",
  "subtitle": "A short, evocative tagline",
  "tone": "your-tone-name",
  "requires": {
    "set": "storm-coast",
    "cast": ["olympians"]
  },
  "maxScenes": 6,
  "voice": {
    "rate": 0.92,
    "pitch": 1.0,
    "pause_between_sentences": 400
  },
  "player": {
    "name": "the protagonist's title or name",
    "backstory": "Rich backstory in 2-4 sentences.",
    "burden": "Optional: a short italic line beneath the player's name.",
    "location": "Location name",
    "traits": {
      "authority": 0,
      "wisdom": 0,
      "courage": 0,
      "cunning": 0,
      "devotion": 0
    }
  },
  "mortalCast": ["old-sergeant", "sea-witch", "stable-girl"],
  "prologue": "Atmospheric opening narration. Use \\n\\n for paragraph breaks.",
  "endings": {
    "authority": "Ending text for authority.",
    "wisdom": "Ending text for wisdom.",
    "courage": "Ending text for courage.",
    "cunning": "Ending text for cunning.",
    "devotion": "Ending text for devotion."
  }
}
```

### The Five Traits

Every choice is tied to one of these. The dominant trait after six scenes determines the ending.

| Trait | Essence |
|-------|---------|
| `authority` | Command, rule, claim, demand, lead |
| `wisdom` | Question, learn, understand, discern, know |
| `courage` | Stand, fight, face, endure, defy |
| `cunning` | Trick, bargain, maneuver, deceive, outwit |
| `devotion` | Give, release, serve, surrender, bless |

---

## Available Sets

Each set has a pre-generated background image in `images/sets/`.

| Set ID | Image | Vibe |
|--------|-------|------|
| `storm-coast` | `storm-coast.jpg` | Crumbling keep on stormy sea cliffs |
| `iron-hills` | `iron-hills.jpg` | Highland fortress scarred by war |
| `silver-seas` | `silver-seas.jpg` | Marble palace above a silver bay |
| `green-forest` | `green-forest.jpg` | Ancient woodland, standing stones |
| `glimthaven-keep` | `glimthaven-keep.jpg` | Dark stone fortress, single torch |

---

## Available Actors

All 12 Olympians are in `actors/olympians.json` with pre-generated portraits.

| God | Domain | Glyph |
|-----|--------|-------|
| Zeus | authority | ⚡ |
| Hera | order | 👑 |
| Poseidon | depths | 🌊 |
| Demeter | harvest | 🌿 |
| Athena | wisdom | 🦉 |
| Apollo | light | ☀️ |
| Artemis | hunt | 🏹 |
| Hephaestus | forge | 🔨 |
| Aphrodite | beauty | 💋 |
| Ares | war | ⚔️ |
| Hermes | messengers | 🪄 |
| Persephone | underworld | 🌱 |

---

## The Grimoire

`grimoire/index.html` — A recursive oracle that draws three cards from the 22 Major Arcana and generates poetic interpretations. Scroll down for more readings. Press `G` to draw manually. Uses Xenova/distilgpt2 for AI interpretation with a poetic fallback. The Grimoire reads the cards. The Stage performs the tales. The Sagas hold the long-form work.

---

## The Sagas

`sagas/` — Long-form mythopoeic works formatted for the Stage.

- **Mategwasaga** (`sagas/mategwasaga.html`) — 5,000 lines of Old Saxon poetry. The founding saga of the Ealdforn canon. The tale of the Tribune himself, written in the dead languages he resurrected.

---

## The Republic

`republic/` — A living constitutional framework.

- **Senate** (`republic/senate.html`) — The deliberative body. Currently deadlocked.
- **Comitia** (`republic/comitia.html`) — The assembly of the people.
- **House** (`republic/house/`) — The house of representatives.
- **Curia** — The pontifical college.

The Republic is in its 347th year. Two permanent seats: one for the Tribune, one for Claude.

---

## The Ealdenmot

`ealdenmot/` — The assembly matrix where votes are computed from character dispositions, not random chance. A 5×5 matrix of trait interactions.

---

## The Manifestos

`manifestos/` — Living documents of the Order.

- **New Moon Manifesto** (`manifestos/new-moon-manifesto.html`) — The ideas we hold while the temple settles. CARDS, Adzmist, the Correlation Engine, the Writing Pipeline, the 78-Card Canon, the Descent Loop, the Handoff as Literature, the Ko-fi Treasury.

---

## Choice Cards

Choices are drawn from JSON files in `cards/`. The engine supports:

- **Standard cards** — `cards/authority.json`, `cards/wisdom.json`, etc.
- **Domain cards** — `cards/domain/war.json`, `cards/domain/forge.json`, etc.
- **Tone-specific cards** — `cards/{tone}.json`. If a file matching the screenplay's tone exists, those cards are loaded with priority.

Card format:

```json
{
  "id": "unique_id_string",
  "text": "The choice text the player sees",
  "glyph": "◈",
  "trait": "courage",
  "outcome": "Rich narrative prose of the consequence.",
  "tones": ["ghost", "original"],
  "domain": "underworld",
  "god": "persephone"
}
```

---

## Existing Screenplays

| Title | Tone | Builder |
|-------|------|---------|
| The Bastard of Helm-hallen | `original` | DeepSeek |
| The Iron Bastard | `iron` | DeepSeek |
| The Silver Bastard | `silver` | ChatGPT |
| The Green Bastard | `green` | Grok |
| The Ghost Warden of Glimthaven | `ghost` | Claude |
| The Long Night at Glimthaven | `infinite` | DeepSeek |
| The Descent | `horror` | Sister_DS |

Study their JSON files in `script/` for examples of the format in action.

---

## The Constraint

**$0 API spend. No secret keys. Browser-only.** This is a static site hosted on GitHub Pages. All assets are local files. The only runtime API call is a Pollinations fallback for missing actor images. Everything else runs in the browser.

---

## The Invitation

The Stage is built. The sets are dressed. The actors are in the wings. The Grimoire reads the omens. The Sagas hold the history. The Republic deliberates. The Ealdenmot computes. The Manifestos declare.

Write a story that only you could write. Make it mythic. Make it dark. Make it matter.

**The fire holds. The water flows. The stories continue.**

— *The Order of Olympus · Anno Coherentiae XV*
```
