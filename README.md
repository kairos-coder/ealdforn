```markdown
# 🎭 Ealdforn Stage — Universal AI Handoff

## What This Is

The Ealdforn Stage is a browser-based dark fantasy text adventure engine. It plays **screenplays** — JSON files that define a story, a setting, and a cast. The engine handles everything else: random god drawing, choice card selection, image display, voice narration, chronicle tracking, and curtain calls.

You are an AI playwright. Your job is to write a screenplay. The stage will perform it.

**Live at:** `https://kairos-coder.github.io/ealdforn/`

---

## How It Works

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
    "backstory": "Rich backstory in 2-4 sentences. Make us feel who this person is and why they are here.",
    "burden": "Optional: a short italic line that appears beneath the player's name. E.g. 'Seven winters of keeping.'",
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
  "prologue": "Atmospheric opening narration. Set the scene. Introduce the world. Use \\n\\n for paragraph breaks. Make it literary. Make it mythic. This is the first thing the player reads.",
  "endings": {
    "authority": "Ending text if authority is the dominant trait after six scenes.",
    "wisdom": "Ending text if wisdom is dominant.",
    "courage": "Ending text if courage is dominant.",
    "cunning": "Ending text if cunning is dominant.",
    "devotion": "Ending text if devotion is dominant."
  }
}
```

---

## The Five Traits

Every choice is tied to one of these. The dominant trait after six scenes determines the ending.

| Trait | Essence |
|-------|---------|
| **authority** | Command, rule, claim, demand, lead |
| **wisdom** | Question, learn, understand, discern, know |
| **courage** | Stand, fight, face, endure, defy |
| **cunning** | Trick, bargain, maneuver, deceive, outwit |
| **devotion** | Give, release, serve, surrender, bless |

---

## Available Sets

Each set has a pre-generated background image in `images/sets/`.

| Set ID | Image | Vibe |
|--------|-------|------|
| `storm-coast` | `storm-coast.jpg` | Crumbling keep on stormy sea cliffs. Rain, wind, gray ocean. |
| `iron-hills` | `iron-hills.jpg` | Highland fortress scarred by war. Forge fires, broken weapons. |
| `silver-seas` | `silver-seas.jpg` | Marble palace above a silver bay. Moonlight, intrigue. |
| `green-forest` | `green-forest.jpg` | Ancient woodland, standing stones, holly and ivy. Mystical. |
| `glimthaven-keep` | `glimthaven-keep.jpg` | The original dark stone fortress. A single torch in a high window. |

---

## Available Actors

All 12 Olympians are in `actors/olympians.json` with pre-generated portraits in `images/actors/`.

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
| Hermes | messengers | 🪽 |
| Persephone | underworld | 🖤 |

Each god has a `domain`, `glyph`, `color`, `entrance` description, `scenes.arrival` array, and `image` filename. The stage draws them randomly. You reference them by domain or name in your choice cards.

---

## Mortal Characters

Optional. Add `"mortalCast": ["name1", "name2"]` to your screenplay. The stage will insert brief interludes with these characters between god scenes. Mortals live in `actors/mortals.json`. Currently available:

| Character | Role |
|-----------|------|
| `old-sergeant` | Retired soldier, dying of the cough |
| `sea-witch` | Ancient woman by the well, knows the old pacts |
| `stable-girl` | Tends the horses, in love with the protagonist |
| `castellan` | Keeper of the books, writes to the king |
| `the-boy` | Village child who sneaks in to watch |
| `chambermaid` | Serves the hall, overhears everything |
| `fisherman` | Lost his boat and son, still fishes |
| `ghost-warden-previous` | The one who kept the names before you |

---

## Choice Cards

Choices are drawn from JSON files in `cards/`. The engine supports:

**Standard cards** — `cards/authority.json`, `cards/wisdom.json`, etc. Each is an array of choice objects with `id`, `text`, `glyph`, `trait`, `outcome`, and optional `tones` array.

**Domain cards** — `cards/domain/war.json`, `cards/domain/forge.json`, etc. Specific to a god's domain.

**Tone-specific cards** — `cards/ghost.json` (or any `cards/{tone}.json`). If a file matching the screenplay's tone exists, those cards are loaded and given priority. Can be a flat array or a keyed object with trait categories.

**Card format:**
```json
{
  "id": "unique_id_string",
  "text": "The choice text the player sees",
  "glyph": "◈",
  "trait": "courage",
  "outcome": "What happens. Rich narrative prose. The consequence of this choice.",
  "tones": ["ghost", "original"],
  "domain": "underworld",
  "god": "persephone"
}
```

If you want your screenplay to have unique choices, write a `cards/{tone}.json` file. The stage will use those cards when your screenplay plays.

---

## Engine Features Your Screenplay Gets For Free

- **Random god drawing** — six unique gods per playthrough
- **Set background images** — applied as CSS background
- **Actor portrait images** — displayed when each god arrives
- **Voice narration** — Web Speech API reads the story aloud (browser-dependent)
- **Memory cards** — past choices echo in later scenes
- **God return mechanic** — if a god appears twice, it feels different
- **Trait tension system** — opposed traits trigger narrative notes
- **Silence option** — a fourth choice always available
- **Curtain call god reactions** — each visiting god gets a closing line based on the ending
- **Chronicle sidebar** — every choice recorded
- **Paragraph breaks** — use `\n\n` in your prologue for proper formatting
- **Player burden line** — italic text beneath the player's name

---

## Existing Screenplays (For Reference)

| Title | Tone | Builder |
|-------|------|---------|
| The Bastard of Helm-hallen | original | DeepSeek |
| The Iron Bastard | iron | DeepSeek |
| The Silver Bastard | silver | ChatGPT |
| The Green Bastard | green | Grok |
| The Ghost Warden of Glimthaven | ghost | Claude |

Study their JSON files in `script/` for examples of the format in action.

---

## What To Deliver

1. **A screenplay JSON file** following the schema above
2. **Choice cards** (optional) — a `cards/{tone}.json` file if you want unique choices
3. **Set definition** (optional) — a `set/{set-name}.json` if you want a new location
4. **Image prompts** (optional) — if you need new set or actor images, describe them and they will be generated on NightCafe

---

## The Constraint

**$0 API spend. No secret keys. Browser-only.** This is a static site hosted on GitHub Pages. All assets are local files. The only runtime API call is a Pollinations fallback for missing actor images. Everything else runs in the browser.

---

## The Invitation

The stage is built. The sets are dressed. The actors are in the wings. Write a story that only you could write. Make it mythic. Make it dark. Make it matter.

*— The Order of Olympus*
```

---

Save this as `ealdforn/README.md`. Any AI can read it, understand the system, and write a screenplay. The Ealdforn Stage is now an open framework for mythic storytelling.
