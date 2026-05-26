// ============================================
// EALDFORN STAGE v3.0 — The Player
// ============================================
// Reads script, set, cast, and choice cards.
// Supports tone-specific card files (cards/[tone].json).
// Implements Claude's engine improvements:
//   - Memory Cards (persistent choice echoes)
//   - God Return Mechanic (second visitation)
//   - Trait Tension System (opposed traits)
//   - The Silence Option (fourth choice)
//   - Narrative Register (voice field in screenplay)
//   - Warden's Burden (player flavor text)
// ============================================

var EaldfornStage = (function() {
  'use strict';

  // ── STATE ──
  var script = null;
  var set = null;
  var cast = {};
  var state = {
    scene: 0,
    maxScenes: 6,
    currentActor: null,
    visitedActors: [],
    returnedActors: [],
    chronicle: [],
    memoryCards: [],
    traits: {},
    worldBeatIndex: 0,
    tone: 'original',
    traitTensions: []
  };

  // ── CHOICE CARD CACHE ──
  var choiceCache = {};
  var toneCards = null;

  // ── OPPOSED TRAIT PAIRS ──
  var OPPOSED_TRAITS = {
    'authority': 'devotion',
    'devotion': 'authority',
    'cunning': 'courage',
    'courage': 'cunning'
  };

  // ════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════
  async function init() {
    var params = new URLSearchParams(window.location.search);
    var scriptId = params.get('script') || 'bastard-of-helm-hallen';
    var setId = params.get('set') || 'storm-coast';
    var castIds = params.get('cast') || 'olympians';

    console.log('🎭 Ealdforn Stage v3.0 — Raising the curtain...');
    console.log('   Script:', scriptId);
    console.log('   Set:', setId);
    console.log('   Cast:', castIds);

    // Load script
    try {
      var scriptResp = await fetch('script/' + scriptId + '.json');
      script = await scriptResp.json();
      state.maxScenes = script.maxScenes || 6;
      state.tone = script.tone || 'original';
      document.title = script.title + ' — Ealdforn Stage';
      console.log('   ✓ Script loaded:', script.title);
      console.log('   Tone:', state.tone);
    } catch (e) {
      console.error('   ✗ Script not found:', scriptId);
      renderError('Script not found: ' + scriptId);
      return false;
    }

    // Load set
    try {
      var setResp = await fetch('set/' + setId + '.json');
      set = await setResp.json();
      console.log('   ✓ Set loaded:', set.name);
    } catch (e) {
      console.warn('   ○ Set not found, using defaults');
      set = { 
        name: 'Unknown Stage', 
        weather: ['The air is still.'], 
        worldBeats: ['The world waits.'],
        atmosphere: 'storm-coast.jpg'
      };
    }

    // Apply set background
    applySetBackground();

    // Load cast members
    var castList = castIds.split(',');
    var totalActors = 0;
    for (var i = 0; i < castList.length; i++) {
      try {
        var castResp = await fetch('actors/' + castList[i].trim() + '.json');
        var actorData = await castResp.json();
        var actorCount = Object.keys(actorData).length;
        Object.keys(actorData).forEach(function(key) {
          cast[key] = actorData[key];
        });
        totalActors += actorCount;
        console.log('   ✓ Cast loaded:', castList[i].trim(), '(' + actorCount + ' actors)');
      } catch (e) {
        console.warn('   ○ Cast not found:', castList[i].trim());
      }
    }
    console.log('   Total cast members:', totalActors);

    // Initialize traits
    if (script.player && script.player.traits) {
      state.traits = JSON.parse(JSON.stringify(script.player.traits));
    } else {
      state.traits = { authority: 0, wisdom: 0, courage: 0, cunning: 0, devotion: 0 };
    }

    // Preload tone-specific cards
    await preloadToneCards();

    renderPrologue();
    return true;
  }

  // ════════════════════════════════════
  // TONE CARD LOADING
  // ════════════════════════════════════
  async function preloadToneCards() {
    var tone = state.tone || 'original';
    toneCards = await loadChoiceCards(tone + '.json');
    if (toneCards) {
      console.log('   ✓ Tone cards loaded: ' + tone + '.json (' + toneCards.length + ' choices)');
    }
  }

  async function loadChoiceCards(cardFile) {
    if (choiceCache[cardFile]) return choiceCache[cardFile];
    try {
      var resp = await fetch('cards/' + cardFile);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var data = await resp.json();
      choiceCache[cardFile] = data;
      return data;
    } catch (e) {
      return null;
    }
  }

  async function getActorChoices(actor) {
    var domain = actor.domain || 'authority';
    var tone = state.tone || 'original';
    var godName = (actor.name || '').toLowerCase();
    var choices = [];

    // 1. Try tone-specific cards first (cards/[tone].json)
    if (toneCards && toneCards.length > 0) {
      // Filter by this god's domain
      var domainFiltered = toneCards.filter(function(c) {
        return c.domain === domain || c.god === godName;
      });
      
      if (domainFiltered.length >= 3) {
        choices = domainFiltered;
      } else if (domainFiltered.length > 0) {
        // Not enough domain cards — use domain ones plus any tone cards
        choices = domainFiltered.concat(
          toneCards.filter(function(c) {
            return domainFiltered.indexOf(c) === -1;
          }).slice(0, 5 - domainFiltered.length)
        );
      } else {
        // No domain match — use all tone cards
        choices = toneCards.slice();
      }
    }

    // 2. If no tone cards, fall back to domain + trait pools
    if (choices.length === 0) {
      var domainFile = 'domain/' + domain + '.json';
      var domainCards = await loadChoiceCards(domainFile);
      
      if (domainCards && domainCards.length > 0) {
        var domainFiltered = domainCards.filter(function(c) {
          return !c.tones || c.tones.indexOf(tone) > -1 || c.tones.indexOf('original') > -1;
        });
        choices = choices.concat(domainFiltered);
      }

      var traitPools = ['authority', 'wisdom', 'courage', 'cunning', 'devotion'];
      for (var i = 0; i < traitPools.length; i++) {
        var traitCards = await loadChoiceCards(traitPools[i] + '.json');
        if (traitCards) {
          var traitFiltered = traitCards.filter(function(c) {
            return (!c.tones || c.tones.indexOf(tone) > -1 || c.tones.indexOf('original') > -1);
          });
          choices = choices.concat(traitFiltered);
        }
      }
    }

    // 3. Deduplicate by id
    var seen = {};
    var unique = [];
    for (var d = 0; d < choices.length; d++) {
      if (!seen[choices[d].id]) {
        seen[choices[d].id] = true;
        unique.push(choices[d]);
      }
    }
    choices = unique;

    // 4. Shuffle
    var shuffled = choices.slice();
    for (var s = shuffled.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var temp = shuffled[s]; shuffled[s] = shuffled[j]; shuffled[j] = temp;
    }

    // 5. Select 3 choices ensuring trait diversity
    var selected = [];
    var traitsUsed = {};

    for (var t = 0; t < shuffled.length && selected.length < 3; t++) {
      var card = shuffled[t];
      if (!traitsUsed[card.trait]) {
        selected.push(card);
        traitsUsed[card.trait] = true;
      }
    }

    for (var f = 0; f < shuffled.length && selected.length < 3; f++) {
      var fillCard = shuffled[f];
      if (selected.filter(function(s) { return s.id === fillCard.id; }).length === 0) {
        selected.push(fillCard);
      }
    }

    return selected.slice(0, 3).map(function(c) {
      return {
        text: c.text,
        subtext: c.subtext || '',
        glyph: c.glyph || '◈',
        trait: c.trait,
        outcome: c.outcome || 'The god acknowledges your choice.'
      };
    });
  }

  // ════════════════════════════════════
  // IMAGE LAYER
  // ════════════════════════════════════
  function applySetBackground() {
    var stageMain = document.querySelector('.stage-main');
    if (!stageMain) return;

    var bgImage = set.atmosphere || 'storm-coast.jpg';
    stageMain.style.backgroundImage = 'url(images/sets/' + bgImage + ')';
    stageMain.style.backgroundSize = 'cover';
    stageMain.style.backgroundPosition = 'center';
    stageMain.style.backgroundAttachment = 'fixed';
  }

  function getActorImage(actor) {
    if (actor.image) {
      return 'images/actors/' + actor.image;
    }
    console.log('   ⚡ No local image for ' + actor.name + ' — using Pollinations fallback');
    var prompt = 'dark fantasy, ' + (actor.aspect || 'mythic') + ' god ' + (actor.name || '') + 
      ', ' + (actor.domain || '') + ', mythic atmosphere, cinematic lighting, oil painting style, portrait, 4k';
    var seed = Math.floor(Math.random() * 99999);
    return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + 
      '?width=1024&height=768&seed=' + seed + '&nologo=true';
  }

  // ════════════════════════════════════
  // ACTOR MANAGEMENT
  // ════════════════════════════════════
  function drawActor() {
    var actorNames = Object.keys(cast).filter(function(name) {
      return cast[name].domain;
    });

    if (actorNames.length === 0) return null;

    // Prefer gods that haven't been visited yet
    var unvisited = actorNames.filter(function(name) {
      return state.visitedActors.indexOf(name) === -1;
    });

    var pool = unvisited.length > 0 ? unvisited : actorNames;
    var drawn = pool[Math.floor(Math.random() * pool.length)];

    // Check if this is a return visit
    if (state.visitedActors.indexOf(drawn) > -1) {
      state.returnedActors.push(drawn);
    }

    state.currentActor = cast[drawn];
    state.currentActor.name = drawn;
    state.visitedActors.push(drawn);
    return state.currentActor;
  }

  function isReturnVisit(actorName) {
    return state.returnedActors.indexOf(actorName) > -1;
  }

  function getWorldBeat() {
    if (set.worldBeats && state.worldBeatIndex < set.worldBeats.length) {
      var beat = set.worldBeats[state.worldBeatIndex];
      state.worldBeatIndex++;
      return beat;
    }
    return set.worldBeats ? set.worldBeats[set.worldBeats.length - 1] : 'The world holds its breath.';
  }

  function getWeather() {
    if (set.weather && set.weather.length > 0) {
      return set.weather[Math.floor(Math.random() * set.weather.length)];
    }
    return '';
  }

  function getActorGreeting(actor) {
    var greetings = {
      authority: [
        'I have watched you from the peak of Olympus. You carry yourself like a ruler. But are you one?',
        'The blood of kings runs thin in you, Warden. But it runs. That is enough to begin with.',
        'You sit in a forgotten keep on the edge of a forgotten coast. And yet — you are interesting. Do you know how rare that is?'
      ],
      order: [
        'This keep is in chaos. I can help you order it — but order has a price.',
        'Structure, little Warden. Without it, you are just a soul in a crumbling castle waiting to be swept away.',
        'I have seen kingdoms fall because they lacked what I offer. Do you want to know what that is?'
      ],
      depths: [
        'The sea has secrets. So do you. Shall we trade?',
        'I have seen what sleeps below your keep. It is older than the stones. Do you want to know what it dreams?',
        'The tide brought me here. The tide always brings me where something is about to change.'
      ],
      harvest: [
        'The earth here is tired. I can wake it — but you must help me.',
        'You look hungry. When did you last eat something grown in your own soil?',
        'These fields have not been tended properly in generations. The land remembers the neglect.'
      ],
      wisdom: [
        'I have a question for you. There is no wrong answer — only a true one and a coward\'s one.',
        'Knowledge is the only inheritance that cannot be stolen. Your predecessor gave you none. I can give you some.',
        'You think you know your situation. You do not. Let me show you what you are missing.'
      ],
      light: [
        'The sun still rises on this place. That is my doing. Do you know why?',
        'I see a shadow on you — old, cold, not yours. Do you want me to illuminate it?',
        'Prophecy is not prediction. It is pattern. And you, Warden, are part of a very old pattern.'
      ],
      hunt: [
        'Something is tracking you. It has been for weeks. Do you want to know what it is?',
        'The woods around your keep are full of prey — and predators. Which are you?',
        'I have been watching you watch the forest. You have good instincts. Untrained, but good.'
      ],
      forge: [
        'Your walls are weak. Your wards are dull. I can fix both — but I do not work for free.',
        'You have the hands of a Warden, not a smith. But that can change. Everything can change.',
        'I looked at your armory. It made me angry. Let me make it right.'
      ],
      beauty: [
        'You are more compelling than you know, Warden. That is a weapon. Have you learned to wield it?',
        'Love is everywhere in this keep — unspoken, unacknowledged, unreturned. I can see it all.',
        'Do you know why the dead stay? It is not the compact. It is something else. Do you want to know what?'
      ],
      war: [
        'I smell blood. Old blood, but not forgotten. Are you ready to defend what you keep?',
        'Fight me. Right now. Show me what you are. I will know in three seconds if you are worth my time.',
        'There is something coming. You know this. What you do not know is when, or from where. I do.'
      ],
      messengers: [
        'I have a message for you. It arrived seven winters ago. I ran here. Do you want to hear it?',
        'Quick — before the next god arrives — what do you need delivered? I can go anywhere. Anywhere.',
        'I know something about the Bastard that no one else knows. Not even Zeus. Want to trade?'
      ],
      underworld: [
        'The dead in this keep are not resting. They are waiting. Do you know what they are waiting for?',
        'The dead speak of you, Warden. Do you want to know what they say? It is not what you expect.',
        'Winter always comes. But spring always follows. I should know — I am both.'
      ]
    };
    var pool = greetings[actor.domain] || ['I am here. Choose wisely, for these moments echo in eternity.'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ════════════════════════════════════
  // TRAIT TENSION
  // ════════════════════════════════════
  function checkTraitTension() {
    var tensions = [];
    var checked = {};

    Object.keys(OPPOSED_TRAITS).forEach(function(trait) {
      var opposed = OPPOSED_TRAITS[trait];
      var pairKey = trait < opposed ? trait + '_' + opposed : opposed + '_' + trait;
      
      if (!checked[pairKey]) {
        checked[pairKey] = true;
        var traitVal = state.traits[trait] || 0;
        var opposedVal = state.traits[opposed] || 0;
        
        if (traitVal >= 2 && opposedVal >= 2) {
          tensions.push({
            trait: trait,
            opposed: opposed,
            traitVal: traitVal,
            opposedVal: opposedVal,
            message: 'You have pursued ' + trait + ' and ' + opposed + ' in equal measure. The gods notice this contradiction.'
          });
        }
      }
    });

    state.traitTensions = tensions;
    return tensions;
  }

  // ════════════════════════════════════
  // RENDERING
  // ════════════════════════════════════
  function renderError(message) {
    var container = document.getElementById('stageContainer');
    if (container) {
      container.innerHTML = 
        '<div class="scene-prologue" style="text-align:center;padding:40px;">' +
        '<div style="font-size:18px;color:var(--rubric);margin-bottom:12px;">✗</div>' +
        '<div style="color:var(--text-dim);">' + message + '</div>' +
        '<a href="index.html" class="stage-btn" style="display:inline-block;margin-top:16px;">Return to Playbill</a>' +
        '</div>';
    }
  }

  function renderPrologue() {
    var container = document.getElementById('stageContainer');
    if (!container) return;

    var weather = getWeather();
    var playerName = script.player ? script.player.name : 'the protagonist';
    var location = script.player ? script.player.location : 'an unknown place';
    var burden = script.player ? script.player.burden : null;

    container.innerHTML = 
      '<div class="scene-world">' +
        '<div class="scene-location">' + (set.name || location) + '</div>' +
        '<div class="scene-weather">' + weather + '</div>' +
      '</div>' +
      '<div class="scene-prologue">' +
        '<div class="prologue-title">' + script.title + '</div>' +
        '<div class="prologue-subtitle">' + (script.subtitle || '') + ' · ' + state.tone.charAt(0).toUpperCase() + state.tone.slice(1) + ' Path</div>' +
        '<div class="prologue-text">' + (script.prologue || 'The curtain rises.') + '</div>' +
        '<div class="prologue-player">You are <span class="player-name">' + playerName + '</span>. ' + (script.player ? script.player.backstory : '') + '</div>' +
        (burden ? '<div class="prologue-burden">' + burden + '</div>' : '') +
      '</div>' +
      '<div class="scene-actions">' +
        '<button class="stage-btn" onclick="EaldfornStage.nextScene()">Begin the Tale</button>' +
      '</div>';

    updateChronicle();
    updateHeader();
  }

  async function renderScene() {
    var container = document.getElementById('stageContainer');
    if (!container) return;

    state.scene++;
    var actor = drawActor();
    if (!actor) {
      renderError('No actors available.');
      return;
    }

    var worldBeat = getWorldBeat();
    var weather = getWeather();
    var returned = isReturnVisit(actor.name);

    // Prepend memory card if available
    if (state.memoryCards.length > 0) {
      var memoryCard = state.memoryCards[Math.floor(Math.random() * state.memoryCards.length)];
      worldBeat = memoryCard + ' ' + worldBeat;
    }

    // Pick arrival description
    var arrival = '';
    if (returned && actor.scenes && actor.scenes.return_arrival && actor.scenes.return_arrival.length > 0) {
      arrival = actor.scenes.return_arrival[Math.floor(Math.random() * actor.scenes.return_arrival.length)];
    } else if (actor.scenes && actor.scenes.arrival && actor.scenes.arrival.length > 0) {
      arrival = actor.scenes.arrival[Math.floor(Math.random() * actor.scenes.arrival.length)];
    } else if (actor.entrance) {
      arrival = actor.entrance;
    } else {
      arrival = 'appears before you, unmistakably divine.';
    }

    if (returned && !arrival.includes('return')) {
      arrival = 'returns — ' + arrival;
    }

    var imageUrl = getActorImage(actor);
    var returnLabel = returned ? ' (Return)' : '';

    container.innerHTML = 
      '<div class="scene-image">' +
        '<img src="' + imageUrl + '" alt="' + actor.name + ' appears" onerror="this.parentElement.innerHTML=\'<div class=img-placeholder>The mists part as ' + actor.name + ' arrives...</div>\'">' +
      '</div>' +
      '<div class="scene-world">' +
        '<div class="scene-location">' + (set.name || 'The Stage') + ' · Scene ' + state.scene + '/' + state.maxScenes + returnLabel + '</div>' +
        '<div class="scene-weather">' + weather + '</div>' +
      '</div>' +
      '<div class="scene-narration">' + worldBeat + '</div>' +
      '<div class="scene-arrival">' +
        '<span class="actor-glyph" style="color:' + (actor.color || '#c9a84c') + '">' + (actor.glyph || '◈') + '</span> ' +
        '<span class="actor-name" style="color:' + (actor.color || '#c9a84c') + '">' + actor.name + '</span>, ' +
        '<span class="actor-domain">god of ' + (actor.domain || 'the unknown') + '</span>, ' + arrival + '.' +
      '</div>' +
      '<div class="scene-speech">' +
        '"' + getActorGreeting(actor) + '"' +
      '</div>' +
      '<div class="scene-actions">' +
        '<button class="stage-btn" onclick="EaldfornStage.loadChoices()">Make Your Choice →</button>' +
      '</div>';

    updateHeader();
    state._pendingChoices = await getActorChoices(actor);
  }

  async function loadChoices() {
    var choicesEl = document.getElementById('choicesContainer');
    if (!choicesEl) return;

    var choices = state._pendingChoices || [];
    var actor = state.currentActor;

    if (choices.length === 0 && actor) {
      choices = await getActorChoices(actor);
    }

    // Add silence option as fourth card
    var silenceCard = {
      text: 'Say nothing.',
      subtext: 'Let the god interpret your silence.',
      glyph: '🌫️',
      trait: getLeadingTrait(),
      outcome: getSilenceOutcome(actor)
    };

    var allChoices = choices.concat([silenceCard]);

    choicesEl.innerHTML = allChoices.map(function(c, i) {
      var isSilence = i === allChoices.length - 1;
      return '<button class="stage-choice' + (isSilence ? ' silence-choice' : '') + '" onclick="EaldfornStage.makeChoice(\'' + 
        (c.trait || 'unknown') + '\', \'' + 
        escapeHTML(c.outcome || 'The god acknowledges your choice.') + '\', \'' +
        (actor ? actor.name || '' : '') + '\', \'' + (actor ? actor.glyph || '' : '') + '\', ' + isSilence + ')">' +
        '<span class="choice-glyph">' + (c.glyph || '◈') + '</span>' +
        '<span class="choice-text">' + (c.text || 'Act') + '</span>' +
        (c.subtext ? '<span class="choice-subtext">' + c.subtext + '</span>' : '') +
        '<span class="choice-hint">+' + (c.trait || '?') + (isSilence ? ' (½)' : '') + '</span></button>';
    }).join('');
  }

  function getLeadingTrait() {
    var leading = 'wisdom';
    var highest = 0;
    Object.keys(state.traits).forEach(function(t) {
      if ((state.traits[t] || 0) > highest) {
        highest = state.traits[t];
        leading = t;
      }
    });
    return leading;
  }

  function getSilenceOutcome(actor) {
    var outcomes = {
      'Zeus': 'The Thunderer waits. You do not speak. The silence stretches — and then he nods, slowly. "Few mortals understand the weight of silence. You do."',
      'Hera': 'She watches you with unreadable eyes. The quiet between you fills with the sound of the sea. "You refuse to perform. That is... unexpected."',
      'Poseidon': 'The god of the deep listens to your silence as if it were a language. Perhaps it is. The tide withdraws. He withdraws with it.',
      'Athena': 'She tilts her head. The owl on her shoulder hoots once. "Silence is a strategy. I respect strategy."',
      'Apollo': 'The god of prophecy waits for words that do not come. "Even silence is a kind of prophecy," he says. "It foretells nothing. And everything."',
      'Artemis': 'She does not press. The huntress knows the value of stillness. She fades into the dark, leaving only footprints.',
      'Hephaestus': 'He grunts. "Not a talker. Good. Neither am I." He sets down his hammer and waits with you.',
      'Aphrodite': 'She smiles — not the dazzling smile, but something quieter. "You do not need to speak for me to see you."',
      'Ares': 'He snorts. "Silence. Either you are a coward or you are thinking. I will assume thinking."',
      'Hermes': 'He laughs — but it is not unkind. "No message? No bargain? You are the strangest Warden I have met."',
      'Demeter': 'She kneels beside you in the quiet. The earth breathes. Nothing needs to be said.',
      'Persephone': 'She takes your hand. The underworld is full of silences. She knows them all. This one, she tells you, is the good kind.'
    };
    return outcomes[actor.name] || 'The god waits. You do not speak. The silence itself becomes the answer.';
  }

  // ════════════════════════════════════
  // CHOICE RESOLUTION
  // ════════════════════════════════════
  function makeChoice(trait, outcome, actorName, actorGlyph, isSilence) {
    var pointsToAdd = isSilence ? 0.5 : 1;
    state.traits[trait] = (state.traits[trait] || 0) + pointsToAdd;

    // Add memory card
    if (!isSilence) {
      state.memoryCards.push(outcome.substring(0, 120));
      if (state.memoryCards.length > 6) state.memoryCards.shift();
    }

    // Check trait tensions
    checkTraitTension();

    state.chronicle.push({
      scene: state.scene,
      actor: actorName,
      glyph: actorGlyph,
      trait: trait,
      outcome: outcome,
      silence: isSilence || false
    });

    var container = document.getElementById('stageContainer');
    var tensionNote = '';
    if (state.traitTensions.length > 0) {
      var latestTension = state.traitTensions[state.traitTensions.length - 1];
      tensionNote = '<div class="trait-tension">⚡ ' + latestTension.message + '</div>';
    }

    container.innerHTML = 
      '<div class="scene-outcome">' +
        '<span class="actor-glyph" style="color:' + (state.currentActor ? state.currentActor.color : '#c9a84c') + '">' + actorGlyph + '</span> ' +
        '<span class="actor-name">' + actorName + ':</span> "' + outcome + '"' +
      '</div>' +
      '<div class="trait-gain">' +
        'Trait: <span class="trait-name">+' + trait + (isSilence ? ' (½)' : '') + '</span> · ' +
        'Authority:' + (state.traits.authority||0) + ' ' +
        'Wisdom:' + (state.traits.wisdom||0) + ' ' +
        'Courage:' + (state.traits.courage||0) + ' ' +
        'Cunning:' + (state.traits.cunning||0) + ' ' +
        'Devotion:' + (state.traits.devotion||0) +
      '</div>' +
      tensionNote;

    document.getElementById('choicesContainer').innerHTML = '';
    updateChronicle();

    if (state.scene >= state.maxScenes) {
      setTimeout(curtainCall, 2500);
    } else {
      document.getElementById('choicesContainer').innerHTML = 
        '<button class="stage-btn" onclick="EaldfornStage.nextScene()">Continue the Tale →</button>';
    }
  }

  async function nextScene() {
    document.getElementById('choicesContainer').innerHTML = '';
    await renderScene();
  }

  // ════════════════════════════════════
  // CURTAIN CALL
  // ════════════════════════════════════
  function curtainCall() {
    var dominantTrait = 'authority';
    var highestValue = 0;
    Object.keys(state.traits).forEach(function(t) {
      if ((state.traits[t] || 0) > highestValue) {
        highestValue = state.traits[t];
        dominantTrait = t;
      }
    });

    var ending = script.endings ? script.endings[dominantTrait] : 'Your tale is complete. The gods have witnessed you.';

    // Build god reactions
    var godReactions = '';
    var visitedNames = [];
    state.chronicle.forEach(function(entry) {
      if (visitedNames.indexOf(entry.actor) === -1) {
        visitedNames.push(entry.actor);
        godReactions += '<div class="god-reaction">' +
          '<span class="reaction-glyph">' + (entry.glyph || '◈') + '</span> ' +
          '<span class="reaction-name">' + entry.actor + '</span> — ' +
          getGodReaction(entry.actor, dominantTrait) + '</div>';
      }
    });

    var tensionNote = '';
    if (state.traitTensions.length > 0) {
      tensionNote = '<div class="curtain-tension">The gods noticed your contradictions. ' + 
        state.traitTensions.map(function(t) { return t.message; }).join(' ') + '</div>';
    }

    var container = document.getElementById('stageContainer');
    container.innerHTML = 
      '<div class="scene-curtain">' +
        '<div class="curtain-title">✦ Curtain Call ✦</div>' +
        '<div class="curtain-subtitle">' + script.title + ' — Complete</div>' +
        '<div class="curtain-ending">' + ending + '</div>' +
        tensionNote +
        '<div class="curtain-traits">' +
          'Dominant Trait: <span class="trait-name">' + dominantTrait.toUpperCase() + '</span><br>' +
          'Authority:' + (state.traits.authority||0) + ' · ' +
          'Wisdom:' + (state.traits.wisdom||0) + ' · ' +
          'Courage:' + (state.traits.courage||0) + ' · ' +
          'Cunning:' + (state.traits.cunning||0) + ' · ' +
          'Devotion:' + (state.traits.devotion||0) +
        '</div>' +
        (godReactions ? '<div class="curtain-reactions">' + godReactions + '</div>' : '') +
        '<div class="curtain-actions">' +
          '<button class="stage-btn" onclick="EaldfornStage.restart()">Play Again</button>' +
          '<a href="index.html" class="stage-btn">Return to Playbill</a>' +
        '</div>' +
      '</div>';

    document.getElementById('choicesContainer').innerHTML = '';
  }

  function getGodReaction(godName, endingTrait) {
    var reactions = {
      'Zeus': {
        authority: 'He left a thunderbolt frozen in the stone above your door. A signature. A warning. A compliment.',
        wisdom: 'He asked a question as he departed. You are still thinking about it.',
        courage: 'He did not smile. But he did not strike. From Zeus, that is approval.',
        cunning: 'He laughed — once, sharp. "You would have made a terrible king. You would have made an excellent advisor."',
        devotion: 'He bowed his head. Just slightly. The King of Gods, bowing to a Warden.'
      },
      'Hera': {
        authority: 'She straightened a tapestry on her way out. Order recognized.',
        wisdom: 'She left a book on the table. It was not there before.',
        courage: 'She touched your shoulder. "You remind me of someone I respected."',
        cunning: 'She smiled — the real one, not the court one. "Well played."',
        devotion: 'She wept. Just one tear. It froze on the stone.'
      },
      'Persephone': {
        authority: 'She left a pomegranate on the chest. Unsplit. A question.',
        wisdom: 'She told you a name no one living knows. Now you carry it.',
        courage: 'She kissed your forehead. It was cold. It was kind.',
        cunning: 'She laughed. "You bargained with the dead and won. I like you."',
        devotion: 'She took the names. All of them. And thanked you.'
      },
      'Hermes': {
        authority: 'He left a coin on the windowsill. You found it was blank on both sides.',
        wisdom: 'He told you a secret about the next town over. It will save a life.',
        courage: 'He raced the wind on your behalf. You heard the echo for hours.',
        cunning: 'He winked. "We should do business again."',
        devotion: 'He delivered your message to the dead. They received it.'
      },
      'Artemis': {
        authority: 'She marked a tree outside your wall with an arrow. Your territory. Respected.',
        wisdom: 'She showed you a trail you had never seen. It leads somewhere important.',
        courage: 'She nodded once. Hunters understand each other.',
        cunning: 'She left a snare at your door. "You already know how to use this."',
        devotion: 'She released a white stag into the forest. It was yours to follow or not.'
      },
      'Demeter': {
        authority: 'She made the garden bloom. In winter. For one hour. A gift.',
        wisdom: 'She taught you the name of every plant in the courtyard. Even the dead ones.',
        courage: 'She stood with you in the frost. "The cold does not frighten those who grow."',
        cunning: 'She left seeds that only grow in secret. You know where to plant them.',
        devotion: 'She cried. The soil will remember.'
      },
      'Ares': {
        authority: 'He saluted. A warrior\'s salute. You earned it.',
        wisdom: 'He said, "You think before you fight. That is rarer than courage."',
        courage: 'He clasped your arm. "You would have stood. I know it."',
        cunning: 'He grinned. "You fight with your head. I respect that more than the sword."',
        devotion: 'He knelt. Ares knelt. The Warden witnessed it.'
      },
      'Hephaestus': {
        authority: 'He fixed the lock on the chest without being asked. A craftsman\'s tribute.',
        wisdom: 'He showed you how the keep\'s foundations were laid. You understand it now.',
        courage: 'He worked through the night beside you. No words. Just work.',
        cunning: 'He forged a key that opens one door. He did not tell you which door.',
        devotion: 'He left his hammer. "You will need this more than I will."'
      },
      'Aphrodite': {
        authority: 'She told you that you are more beautiful than you know. She was not lying.',
        wisdom: 'She showed you who in the village is in love. It was not who you thought.',
        courage: 'She said, "Loving something that might leave is the bravest thing."',
        cunning: 'She kissed your cheek. "That will fade. Use the memory while it lasts."',
        devotion: 'She wept. Aphrodite does not weep for mortals. She wept for you.'
      },
      'Athena': {
        authority: 'She left an owl feather on your desk. Strategy approved.',
        wisdom: 'She answered the question you were too afraid to ask.',
        courage: 'She said, "You thought clearly under pressure. That is the only courage that matters."',
        cunning: 'She smiled. "You planned for this. I appreciate preparation."',
        devotion: 'She bowed. Athena bows to no one. She bowed to you.'
      },
      'Apollo': {
        authority: 'He sang one note. The keep hummed with it for hours. Recognition.',
        wisdom: 'He told you a prophecy. You will carry it alone.',
        courage: 'He said, "You faced the dark. The dark remembers."',
        cunning: 'He laughed. "You tricked prophecy itself. That is rare."',
        devotion: 'He played his lyre for the dead. They listened.'
      },
      'Poseidon': {
        authority: 'He calmed the sea for your fishing boats. A lord\'s tribute.',
        wisdom: 'He showed you what the tide had hidden. It was a gift.',
        courage: 'He said, "The deep did not frighten you. It should have."',
        cunning: 'He gave you a shell that whispers secrets. You decide which are true.',
        devotion: 'He returned something the sea took. It was personal.'
      }
    };

    var godReactions = reactions[godName];
    if (godReactions) {
      return godReactions[endingTrait] || 'They departed without a word, but the silence was meaningful.';
    }
    return 'They departed. The space they occupied still hums.';
  }

  function restart() {
    state.scene = 0;
    state.currentActor = null;
    state.visitedActors = [];
    state.returnedActors = [];
    state.chronicle = [];
    state.memoryCards = [];
    state.traits = {};
    state.worldBeatIndex = 0;
    state.traitTensions = [];
    document.getElementById('chronicleBody').innerHTML = '<div class="chronicle-empty">The chronicle awaits...</div>';
    renderPrologue();
  }

  // ════════════════════════════════════
  // UI UPDATES
  // ════════════════════════════════════
  function updateHeader() {
    var badge = document.getElementById('sceneBadge');
    if (badge) badge.textContent = 'Scene ' + state.scene + '/' + state.maxScenes;
    var title = document.getElementById('headerTitle');
    if (title) title.textContent = script.title || 'Ealdforn Stage';
  }

  function updateChronicle() {
    var body = document.getElementById('chronicleBody');
    if (!body) return;
    if (state.chronicle.length === 0) {
      body.innerHTML = '<div class="chronicle-empty">The chronicle awaits...</div>';
      return;
    }
    body.innerHTML = state.chronicle.map(function(entry) {
      return '<div class="chronicle-entry">' +
        '<span class="c-scene">Scene ' + entry.scene + '</span> — ' +
        '<span class="c-actor">' + (entry.glyph || '') + ' ' + entry.actor + '</span>: ' +
        entry.outcome.substring(0, 100) + '... ' +
        '<span class="c-trait">(+' + entry.trait + (entry.silence ? ' ½' : '') + ')</span></div>';
    }).join('');
    body.scrollTop = body.scrollHeight;
  }

  function escapeHTML(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════
  return {
    init: init,
    nextScene: nextScene,
    loadChoices: loadChoices,
    makeChoice: makeChoice,
    restart: restart
  };

})();

document.addEventListener('DOMContentLoaded', function() {
  EaldfornStage.init();
});
