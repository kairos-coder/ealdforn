# ⚖️ The Ealdenmot — Bay of Ealdforn

**A browser-based political simulation. Year 1 AE to ∞.**

The Ealdenmot is the legislative assembly of the Bay of Ealdforn — a fictional city-state at the edge of the known world. It begins as three founders in a stone room above the harbor. It grows, by Fibonacci sequence, into a bicameral legislature with factions, courts, an Imperator, a Praetorian Guard, and a century of constitutional crises.

You are the observer. The Assembly convenes. The cards are drawn. The Bay evolves.

---

## What This Is

- **A political simulation** that runs in a single browser tab
- **Turn-based** — each turn advances the clock, grows the Assembly, draws policy cards, and triggers crises
- **Faction-driven** — representatives form factions based on shared values. Factions become parties. Parties become institutions.
- **Constitutional** — the Bay's government evolves from a unicameral Assembly into a complex state with an executive, a judiciary, and a permanent administrative corps
- **Trilingual** — the people speak Old Saxon (Ealdforn), the scribes write Latin, and you read the Modern English gloss

---

## How to Play

1. Open `index.html` — the Game Lobby. See the state of the Bay: the year, the population, the active offices, the faction standings, the looming crises.
2. Click **"Convene the Ealdenmot"** to enter the Assembly chamber.
3. A policy card is drawn. The Assembly votes. The meters shift. Factions form. The chronicle updates.
4. Return to the Lobby to see what changed.
5. Repeat for 100 years. Or 500. The engine has no upper limit.

---

## What's in the Repo

| File | Purpose |
|---|---|
| `index.html` | Game Lobby. Dashboard showing the current state of the Bay. |
| `ealdenmot.html` | The active legislative session. Cards are drawn and voted on here. |
| `witan.js` | The simulation engine. Reads `state.json`, processes turns, grows the Assembly, triggers crises. |
| `state.json` | Root configuration. All knobs, meters, offices, factions, and crisis queues. |
| `data/deck/reps.json` | Pool of representatives. Historical figures, faction founders, and ordinary citizens. |
| `data/deck/` | (Planned) Policy cards, crisis cards, constitutional choice cards. |

---

## The Offices of the Bay

The Bay's government is named in three languages:

| Spoken (Ealdforn) | Written (Latin) | Modern English |
|---|---|---|
| Ealdorman | Consul | President / Chief Magistrate |
| Berend | Quaestor | Treasurer / Grain Commissioner |
| Sceawere | Censor | Census-Taker / Registrar |
| Dema-weard | Praetor | Judge / Justice |
| Witan-heretoga | Dictator | Emergency Commander |
| Tidsceal | Pontifex | Calendar-Keeper |
| Weard | Aedilis | Public Works Commissioner |
| Writere | Scriba | Scribe / Archivist |
| Cydere | Praeco | Herald / Town Crier |

---

## The Founders

**Berend Thorvald of the Grange-hall.** Treasurer. Carries the grain. Argued for the spring equinox. The Grange political party traces its lineage to him.

**Sceawere Sigrid of the Scriptorium.** Census-taker. Registrar. Keeps the records. The Scriptorium — the Bay's administrative heart — traces its lineage to her.

**Dema-weard Hrolfr of the Harbor Watch.** Chairman. Judge. Commander. Speaks rarely. Acts decisively. The Codex Court and the Praetorian Order both trace their lineage to him.

In the first census, they were recorded as *HROLFRUS FILIUS NEMO, THORVALDUS FILIUS NEMO, SIGRIDA FILIA NEMO* — children of no one. The Bay has no lineages yet. The founders came from nowhere and built a city.

---

## The Simulation

The Ealdenmot begins as a unicameral Assembly of 3 reps. It grows by Fibonacci sequence (1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89...) until capped by constitutional amendment.

Factions form automatically at population thresholds. The Grain-Keepers at 5 reps. The Harbor League and Threshold Guard at 13. The Old Way at 21. These factions merge, split, and evolve into the political parties that dominate later eras.

Crises trigger at predetermined turns. The Grain Rot Crisis at Turn 7 — the Bay's first existential test. Later crises emerge from the simulation's accumulated state.

The government evolves. The Codex Court forms after the first judicial crisis. The Imperator's office is created by constitutional compromise. The Praetorian Order emerges as a permanent administrative corps. Every institution is built from precedent.

---

## The Tech

- **$0 API spend.** No server. No database. No secret keys.
- **Browser-only.** Everything runs client-side.
- **localStorage** saves the state between sessions.
- **Vanilla JS.** No frameworks. No build step.
- **GitHub Pages.** Push to deploy.

---

## The Order of Olympus

The Ealdenmot is part of the **Order of Olympus** — a constellation of browser-based mythic systems built by kairos-coder with multiple AI collaborators. Other projects include:

- **Digital Divination** — A 78-card tarot oracle with original AI-generated art
- **Ealdforn Stage** — A browser-based text adventure theater engine
- **The Nexus** — Constellation map of all repositories and the Olympian Bridge

---

## Status

**Active development.** The simulation engine runs from Year 1 AE. The first 10 turns are being scripted with branching choices. The middle game (Turns 11-90) and endgame (Turn 100) are designed and awaiting implementation.

The deck of policy cards is being populated. The faction evolution tree is mapped through Year 120. The constitutional amendment system is scaffolded.

---

*Regnavit Deus, et res bonae sunt.* — God reigned, and things were good.

*Numeramus. Nominamus. Neminem obliviscimur.* — We count. We name. We forget no one.
