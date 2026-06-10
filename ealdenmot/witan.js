/**
 * WITAN.JS — Ealdenmot Simulation Engine v6.1
 * Order of Olympus · Year 1 AE to ∞
 * 
 * Matrix-driven faction formation. Rep disposition determines alignment.
 * Factions evolve based on aggregate matrices.
 */

const Witan = (() => {
  let S;
  let decks = {};
  let repsData = null;
  let pendingChoice = null;
  let currentVote = null;

  // ─── MATRIX UTILITIES ─────────────────────────────────────────
  function matrixToValues(matrix) {
    if (!matrix) return { authority: 50, commerce: 50, militarism: 50, tradition: 50, sovereignty: 50, piety: 50 };
    const bodyAvg = matrix.body.reduce((a,b) => a+b, 0) / 5;
    const mindAvg = matrix.mind.reduce((a,b) => a+b, 0) / 5;
    const spiritAvg = matrix.spirit.reduce((a,b) => a+b, 0) / 5;
    const craftAvg = matrix.craft.reduce((a,b) => a+b, 0) / 5;
    const godsAvg = matrix.gods.reduce((a,b) => a+b, 0) / 5;
    
    return {
      authority: Math.floor((bodyAvg * 0.2 + mindAvg * 0.3 + spiritAvg * 0.2 + craftAvg * 0.1 + godsAvg * 0.2)),
      commerce: Math.floor((bodyAvg * 0.1 + mindAvg * 0.2 + spiritAvg * 0.1 + craftAvg * 0.4 + godsAvg * 0.2)),
      militarism: Math.floor((bodyAvg * 0.4 + mindAvg * 0.2 + spiritAvg * 0.2 + craftAvg * 0.1 + godsAvg * 0.1)),
      tradition: Math.floor((bodyAvg * 0.1 + mindAvg * 0.1 + spiritAvg * 0.3 + craftAvg * 0.1 + godsAvg * 0.4)),
      sovereignty: Math.floor((bodyAvg * 0.2 + mindAvg * 0.2 + spiritAvg * 0.2 + craftAvg * 0.2 + godsAvg * 0.2)),
      piety: Math.floor((bodyAvg * 0.1 + mindAvg * 0.1 + spiritAvg * 0.3 + craftAvg * 0.1 + godsAvg * 0.4))
    };
  }

  // ─── LOAD REPS DATA ───────────────────────────────────────────
  async function loadReps() {
    try {
      const res = await fetch('data/deck/reps.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      repsData = await res.json();
      console.log(`Loaded ${repsData.reps.length} representatives`);
      return repsData;
    } catch(e) {
      console.warn('Could not load reps.json, using default values');
      repsData = { reps: [] };
      return repsData;
    }
  }

  // ─── INIT ─────────────────────────────────────────────────────
  async function init(stateURL = 'state.json') {
    const saved = localStorage.getItem('ealdenmot_state_v6');
    if (saved) {
      try {
        S = JSON.parse(saved);
        console.log(`State loaded. Year ${S.meta.year} AE, Turn ${S.meta.turn}.`);
        await loadReps();
        await loadDecks();
        return S;
      } catch(e) { console.warn('localStorage corrupt, loading fresh.'); }
    }
    try {
      const res = await fetch(stateURL);
      if (!res.ok) throw new Error(`State fetch failed: ${res.status}`);
      S = await res.json();
      await loadReps();
      await loadDecks();
      if (repsData && repsData.reps) {
        S.reps.count = Math.min(repsData.reps.length, S.reps.count || 3);
      }
      saveState();
      return S;
    } catch(e) {
      console.error('Failed to load state.json.');
      S = getDefaultState();
      await loadReps();
      saveState();
      return S;
    }
  }

  function getDefaultState() {
    return {
      meta: { version: "6.1", turn: 0, year: 1, era: "Founding", realm: "Bay of Ealdforn", motto: "Regnavit Deus, et res bonae sunt.", population: 4872, turn_log: [] },
      government: { type: "unicameral", chambers: { assembly: { name: "The Ealdenmot", seats: 3 } }, executive: { type: "chairman", office_name: "Consul", officeholder: "hrolfr", powers: ["preside", "break_ties", "command_watch", "veto"], veto_active: true }, judiciary: { exists: false } },
      factions: { active: [], formation_threshold: 8, max_factions: 6, history: [] },
      reps: { count: 3, leadership: ["hrolfr","thorvald","sigrid"], capped_at: null, matrix_aggregation: true },
      meters: { authority: { value: 0 }, commerce: { value: 0 }, militarism: { value: 0 }, tradition: { value: 0 }, sovereignty: { value: 5 }, piety: { value: 3 } },
      offices: { roster: [] },
      constitution: { amendments: [], doctrines: [], precedents: [] },
      classification: { system: "none", ladder: [] },
      military: { harbor_watch: { exists: true, commander: "hrolfr", loyalty: "chairman" }, praetorian_order: { exists: false } },
      city: { name: "Caepton", tiles: [], districts: [], buildings: 0 },
      crisis_queue: [],
      active_decks: { policy: "data/deck/policy_cards.json", crisis: "data/deck/crisis_cards.json", judicial: "data/deck/judicial_cards.json", executive: "data/deck/executive_cards.json" }
    };
  }

  function saveState() { localStorage.setItem('ealdenmot_state_v6', JSON.stringify(S)); }
  function logTurn(msg) {
    if (!S.meta.turn_log) S.meta.turn_log = [];
    S.meta.turn_log.push(`Year ${S.meta.year} AE, Turn ${S.meta.turn}: ${msg}`);
  }

  // ─── LOAD DECKS ───────────────────────────────────────────────
  async function loadDecks() {
    const paths = S.active_decks || { policy: "data/deck/policy_cards.json", crisis: "data/deck/crisis_cards.json", judicial: "data/deck/judicial_cards.json", executive: "data/deck/executive_cards.json" };
    try {
      const [policy, crisis, judicial, executive] = await Promise.all([
        fetch(paths.policy).then(r => r.json()).catch(() => ({ cards: [] })),
        fetch(paths.crisis).then(r => r.json()).catch(() => ({ crises: [] })),
        fetch(paths.judicial).then(r => r.json()).catch(() => ({ cards: [] })),
        fetch(paths.executive).then(r => r.json()).catch(() => ({ cards: [] }))
      ]);
      decks = { policy: policy.cards || [], crisis: crisis.crises || [], judicial: judicial.cards || [], executive: executive.cards || [] };
    } catch(e) { decks = { policy: [], crisis: [], judicial: [], executive: [] }; }
  }

  // ─── POPULATION & REP GROWTH ──────────────────────────────────
  function growPopulation() {
    const baseRate = 0.005;
    const commerceBonus = (S.meters.commerce?.value || 0) * 0.001;
    const sovereigntyBonus = (S.meters.sovereignty?.value || 0) * 0.0005;
    const growthRate = Math.max(0.001, baseRate + commerceBonus + sovereigntyBonus);
    const naturalGrowth = Math.floor(S.meta.population * growthRate);
    const immigration = Math.max(0, Math.floor((S.meters.commerce?.value || 0) * 15));
    S.meta.population += naturalGrowth + immigration;
    
    const fib = S.reps.fibonacci_sequence || [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    const currentIdx = S.reps.fibonacci_index || 2;
    const nextThreshold = fib[currentIdx + 1];
    if (nextThreshold && S.reps.count >= fib[currentIdx] && S.reps.count < nextThreshold && S.meta.population > 5000) {
      S.reps.count = nextThreshold;
      S.reps.fibonacci_index = currentIdx + 1;
      logTurn(`Assembly grew to ${S.reps.count} seats (Fibonacci threshold reached).`);
      return true;
    }
    return false;
  }

  // ─── FACTION FORMATION ────────────────────────────────────────
  function checkFactions() {
    if (S.reps.count < (S.factions.formation_threshold || 8)) return;
    
    const existingFactionIds = S.factions.active.map(f => f.id);
    const factionDefs = [
      { id: 'grain_keepers', name: 'Grain-Keepers', leader: 'Astrid', values: ['commerce','tradition'], threshold: 8 },
      { id: 'harbor_league', name: 'Harbor League', leader: 'Kjell', values: ['commerce','authority'], threshold: 15 },
      { id: 'old_way', name: 'The Old Way', leader: null, values: ['piety','tradition'], threshold: 25 },
      { id: 'pure_register', name: 'Pure Register', leader: 'Runa', values: ['sovereignty','piety'], threshold: 40 },
      { id: 'scriptorium', name: 'Scriptorium', leader: 'Sigrid', values: ['authority','sovereignty'], threshold: 8 },
      { id: 'free_harbor', name: 'Free Harbor', leader: 'Kjell', values: ['commerce','sovereignty'], threshold: 20 },
      { id: 'binding_fold', name: 'Binding Fold', leader: 'Oswin', values: ['piety','tradition'], threshold: 35 }
    ];
    
    const newFactions = factionDefs.filter(f => S.reps.count >= f.threshold && !existingFactionIds.includes(f.id));
    
    newFactions.forEach(faction => {
      const seats = Math.max(3, Math.floor(S.reps.count * (0.15 + Math.random() * 0.1)));
      S.factions.active.push({
        id: faction.id,
        name: faction.name,
        leader: faction.leader,
        values: faction.values,
        seats: seats,
        founded_year: S.meta.year,
        founded_turn: S.meta.turn
      });
      S.factions.history.push({ event: 'faction_formed', faction: faction.id, year: S.meta.year, turn: S.meta.turn });
      logTurn(`${faction.name} formed with ${seats} seats. ${faction.leader ? 'Led by ' + faction.leader + '.' : ''}`);
    });
  }

  // ─── VOTE CALCULATION ─────────────────────────────────────────
  function calculateVote(card) {
    const results = { total: { aye: 0, nay: 0 }, byFaction: {}, vetoOverridePossible: false };
    
    S.factions.active.forEach(faction => {
      results.byFaction[faction.id] = { name: faction.name, aye: 0, nay: 0, total: faction.seats };
      let alignment = 0.5;
      const thresholds = card.thresholds || {};
      const factionValues = faction.values || [];
      
      let score = 0;
      factionValues.forEach(v => {
        const meterValue = S.meters[v]?.value || 50;
        const threshold = thresholds[v] || 50;
        if (meterValue >= threshold) score += 0.25;
      });
      alignment = Math.min(0.95, Math.max(0.05, 0.5 + (score / Math.max(1, factionValues.length)) * 0.3));
      
      for (let i = 0; i < faction.seats; i++) {
        const variation = Math.random() * 0.3 - 0.15;
        if ((alignment + variation) > 0.5) { results.byFaction[faction.id].aye++; results.total.aye++; }
        else { results.byFaction[faction.id].nay++; results.total.nay++; }
      }
    });

    const unalignedCount = S.reps.count - S.factions.active.reduce((sum, f) => sum + f.seats, 0);
    if (unalignedCount > 0) {
      results.byFaction['unaligned'] = { name: 'Unaligned', aye: 0, nay: 0, total: unalignedCount };
      for (let i = 0; i < unalignedCount; i++) {
        if (Math.random() > 0.5) { results.byFaction['unaligned'].aye++; results.total.aye++; }
        else { results.byFaction['unaligned'].nay++; results.total.nay++; }
      }
    }

    const totalVotes = results.total.aye + results.total.nay;
    results.passed = results.total.aye > results.total.nay;
    results.margin = results.total.aye - results.total.nay;
    results.supermajority = results.total.aye >= Math.floor(totalVotes * 0.67);
    results.vetoOverridePossible = results.supermajority;
    
    return results;
  }

  // ─── DRAW CARD ────────────────────────────────────────────────
  function drawCard() {
    const crisis = decks.crisis.find(c => c.trigger_turn === S.meta.turn && !S.crisis_queue?.find(q => q.id === c.id && q.resolution));
    if (crisis) {
      if (!S.crisis_queue) S.crisis_queue = [];
      if (!S.crisis_queue.find(q => q.id === crisis.id)) {
        S.crisis_queue.push({ id: crisis.id, title: crisis.title, description: crisis.description, choices: crisis.choices, resolution: null, triggered_turn: S.meta.turn });
      }
      const q = S.crisis_queue.find(q => q.id === crisis.id);
      if (q && !q.resolution) {
        pendingChoice = { type: 'crisis', card: crisis, queueEntry: q };
        logTurn(`⚡ CRISIS: ${crisis.title}`);
        return pendingChoice;
      }
    }
    
    const policyCard = decks.policy.find(c => c.turn === S.meta.turn);
    if (policyCard) {
      pendingChoice = { type: 'policy', card: policyCard };
      return pendingChoice;
    }
    
    if (decks.policy.length) {
      const randomCard = decks.policy[Math.floor(Math.random() * decks.policy.length)];
      pendingChoice = { type: 'policy', card: randomCard };
      return pendingChoice;
    }
    return null;
  }

  // ─── RESOLVE CHOICE ───────────────────────────────────────────
  function resolveChoice(choiceId) {
    if (!pendingChoice) return null;
    const { type, card, queueEntry } = pendingChoice;
    let choice;
    if (type === 'crisis') {
      choice = card.choices.find(c => c.id === choiceId);
      if (choice && queueEntry) { queueEntry.resolution = choiceId; queueEntry.resolved_turn = S.meta.turn; queueEntry.resolved_year = S.meta.year; }
    } else {
      choice = card.choices.find(c => c.id === choiceId);
    }
    if (!choice) { pendingChoice = null; return null; }
    
    if (choice.meter_effects) {
      Object.entries(choice.meter_effects).forEach(([meter, delta]) => {
        if (S.meters[meter]) S.meters[meter].value += delta;
      });
    }
    
    if (choice.unlocks === 'witan_heretoga') {
      S.government.executive.powers.push('emergency_command');
      S.constitution.doctrines.push({ name: "Captain's Authority", year: S.meta.year, description: "In crisis, the Witan-heretoga commands." });
    }
    
    logTurn(`${card.title}: ${choice.text}`);
    const result = { type, card, choice, choiceId };
    pendingChoice = null;
    currentVote = null;
    saveState();
    return result;
  }

  // ─── ADVANCE TURN ─────────────────────────────────────────────
  async function advanceTurn() {
    S.meta.turn++;
    if (S.meta.turn > 1 && S.meta.turn % 3 === 1) S.meta.year++;
    
    growPopulation();
    checkFactions();
    
    const card = drawCard();
    if (card) {
      currentVote = calculateVote(card.card);
      currentVote.choiceId = card.card.choices[0]?.id || 'a';
    }
    
    Object.keys(S.meters).forEach(k => {
      S.meters[k].value += Math.floor(Math.random() * 3) - 1;
      S.meters[k].value = Math.max(0, Math.min(100, S.meters[k].value));
    });
    
    if (S.meta.turn >= 25 && S.meta.era === "Founding") { S.meta.era = "Early Republic"; logTurn("The Founding Era ends. The Early Republic begins."); }
    if (S.meta.turn >= 60 && S.meta.era === "Early Republic") { S.meta.era = "Late Republic"; logTurn("The Early Republic gives way to the Late Republic."); }
    
    saveState();
    return { turn: S.meta.turn, year: S.meta.year, card, vote: currentVote, state: S };
  }

  // ─── PLAYER VETO / SIGN (for HTML compatibility) ───────────────
  function playerSign() {
    if (!pendingChoice || !currentVote) return null;
    return resolveChoice(currentVote.choiceId);
  }

  function playerVeto() {
    if (!pendingChoice || !currentVote) return null;
    if (currentVote.vetoOverridePossible) {
      logTurn(`Consul vetoed. Assembly overrides with ${currentVote.total.aye} votes (supermajority).`);
      return resolveChoice(currentVote.choiceId);
    } else {
      logTurn(`Consul vetoed. Override fails (${currentVote.total.aye}/${currentVote.total.aye + currentVote.total.nay} — needs 67%). Motion blocked.`);
      pendingChoice = null;
      currentVote = null;
      saveState();
      return { vetoed: true, voteResult: currentVote };
    }
  }

  // ─── API ──────────────────────────────────────────────────────
  return {
    init, advanceTurn, resolveChoice,
    playerSign, playerVeto,
    getPendingChoice: () => pendingChoice,
    getCurrentVote: () => currentVote,
    getState: () => S,
    getReps: () => repsData,
    saveState,
    resetAll: () => { if (confirm('Reset the chronicle?')) { localStorage.removeItem('ealdenmot_state_v6'); location.reload(); } }
  };
})();
