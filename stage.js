// ============================================
// EALDFORN STAGE v2.1 — The Player
// ============================================
// Reads script, set, cast, and choice cards.
// Uses local images from images/ folder.
// Falls back to Pollinations for missing images.
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
    chronicle: [],
    traits: {},
    worldBeatIndex: 0,
    tone: 'original'
  };

  // ── CHOICE CARD CACHE ──
  var choiceCache = {};

  // ════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════
  async function init() {
    var params = new URLSearchParams(window.location.search);
    var scriptId = params.get('script') || 'bastard-of-helm-hallen';
    var setId = params.get('set') || 'storm-coast';
    var castIds = params.get('cast') || 'olympians';

    console.log('🎭 Ealdforn Stage v2.1 — Raising the curtain...');
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

    // Preload choice cards
    await preloadChoiceCards();

    renderPrologue();
    return true;
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
    // Use local image if available
    if (actor.image) {
      return 'images/actors/' + actor.image;
    }
    // Fallback: generate via Pollinations
    console.log('   ⚡ No local image for ' + actor.name + ' — using Pollinations fallback');
    var prompt = 'dark fantasy, ' + (actor.aspect || 'mythic') + ' god ' + (actor.name || '') + 
      ', ' + (actor.domain || '') + ', mythic atmosphere, cinematic lighting, oil painting style, portrait, 4k';
    var seed = Math.floor(Math.random() * 99999);
    return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + 
      '?width=1024&height=768&seed=' + seed + '&nologo=true';
  }

  // ════════════════════════════════════
  // CHOICE CARD DATABASE
  // ════════════════════════════════════
  async function loadChoiceCards(cardFile) {
    if (choiceCache[cardFile]) return choiceCache[cardFile];
    try {
      var resp = await fetch('cards/' + cardFile);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var data = await resp.json();
      choiceCache[cardFile] = data;
      console.log('   ✓ Cards loaded:', cardFile, '(' + data.length + ' choices)');
      return data;
    } catch (e) {
      console.warn('   ○ Cards not found: ' + cardFile);
      return null;
    }
  }

  async function preloadChoiceCards() {
    var cardFiles = [
      'authority.json', 'wisdom.json', 'courage.json', 'cunning.json', 'devotion.json',
      'domain/war.json', 'domain/forge.json', 'domain/hunt.json', 'domain/harvest.json',
      'domain/underworld.json', 'domain/beauty.json', 'domain/depths.json',
      'domain/light.json', 'domain/wisdom-domain.json', 'domain/authority-domain.json',
      'domain/order.json', 'domain/messengers.json'
    ];
    
    var promises = cardFiles.map(function(f) { return loadChoiceCards(f); });
    await Promise.allSettled(promises);
    console.log('   ✓ Choice card preload complete');
  }

  async function getActorChoices(actor) {
    var domain = actor.domain || 'authority';
    var tone = state.tone || 'original';
    var choices = [];

    // 1. Try domain-specific cards first
    var domainFile = 'domain/' + domain + '.json';
    var domainCards = await loadChoiceCards(domainFile);
    
    if (domainCards && domainCards.length > 0) {
      var domainFiltered = domainCards.filter(function(c) {
        return !c.tones || c.tones.indexOf(tone) > -1 || c.tones.indexOf('original') > -1;
      });
      choices = choices.concat(domainFiltered);
    }

    // 2. Pull from trait pools
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

    // 3. Deduplicate by ID
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
        glyph: c.glyph,
        trait: c.trait,
        outcome: c.outcome
      };
    });
  }

  // ════════════════════════════════════
  // ACTOR MANAGEMENT
  // ════════════════════════════════════
  function drawActor() {
    var actorNames = Object.keys(cast).filter(function(name) {
      return state.visitedActors.indexOf(name) === -1 && cast[name].domain;
    });
    
    if (actorNames.length === 0) {
      actorNames = Object.keys(cast).filter(function(name) {
        return cast[name].domain;
      });
    }

    var drawn = actorNames[Math.floor(Math.random() * actorNames.length)];
    state.currentActor = cast[drawn];
    state.currentActor.name = drawn;
    state.visitedActors.push(drawn);
    return state.currentActor;
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
        'The blood of kings runs thin in you, bastard. But it runs. That is enough to begin with.',
        'You sit in a crumbling keep on the edge of a forgotten coast. And yet — you are interesting. Do you know how rare that is?'
      ],
      order: [
        'This keep is in chaos. I can help you order it — but order has a price.',
        'Structure, little lord. Without it, you are just a man in a crumbling castle waiting to be swept away.',
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
        'Knowledge is the only inheritance that cannot be stolen. Your father gave you none. I can give you some.',
        'You think you know your situation. You do not. Let me show you what you are missing.'
      ],
      light: [
        'The sun still rises on this place. That is my doing. Do you know why?',
        'I see a shadow on you — old, cold, not yours. Do you want me to illuminate it?',
        'Prophecy is not prediction. It is pattern. And you, bastard, are part of a very old pattern.'
      ],
      hunt: [
        'Something is tracking you. It has been for weeks. Do you want to know what it is?',
        'The woods around your keep are full of prey — and predators. Which are you?',
        'I have been watching you watch the forest. You have good instincts. Untrained, but good.'
      ],
      forge: [
        'Your walls are weak. Your swords are dull. I can fix both — but I do not work for free.',
        'You have the hands of a lord, not a smith. But that can change. Everything can change.',
        'I looked at your armory. It made me angry. Let me make it right.'
      ],
      beauty: [
        'You are more beautiful than you know, bastard. That is a weapon. Have you learned to wield it?',
        'Love is everywhere in this keep — unspoken, unacknowledged, unreturned. I can see it all.',
        'Do you know why people follow you? It is not your blood. It is something else. Do you want to know what?'
      ],
      war: [
        'I smell blood. Yours, soon, unless you prepare. Are you ready to fight?',
        'Fight me. Right now. Show me what you are. I will know in three seconds if you are worth my time.',
        'There is an army coming. You know this. What you do not know is how many, or when, or from where. I do.'
      ],
      messengers: [
        'I have a message for you. It arrived three days ago. I ran here. Do you want to hear it?',
        'Quick — before the next god arrives — what do you need delivered? I can go anywhere. Anywhere.',
        'I know something about your father that no one else knows. Not even Zeus. Want to trade?'
      ],
      underworld: [
        'Your mother is not gone. She is just... elsewhere. I can take you to her.',
        'The dead speak of you. Do you want to know what they say? It is not what you expect.',
        'Winter always comes, bastard. But spring always follows. I should know — I am both.'
      ]
    };
    var pool = greetings[actor.domain] || ['I am here. Choose wisely, for these moments echo in eternity.'];
    return pool[Math.floor(Math.random() * pool.length)];
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
    var worldBeat = getWorldBeat();
    var weather = getWeather();

    // Pick an arrival scene
    var arrival = '';
    if (actor.scenes && actor.scenes.arrival && actor.scenes.arrival.length > 0) {
      arrival = actor.scenes.arrival[Math.floor(Math.random() * actor.scenes.arrival.length)];
    } else if (actor.entrance) {
      arrival = actor.entrance;
    } else {
      arrival = 'appears before you, unmistakably divine.';
    }

    // Get actor image (local or Pollinations fallback)
    var imageUrl = getActorImage(actor);

    container.innerHTML = 
      '<div class="scene-image">' +
        '<img src="' + imageUrl + '" alt="' + actor.name + ' appears" onerror="this.parentElement.innerHTML=\'<div class=img-placeholder>The mists part as ' + actor.name + ' arrives...</div>\'">' +
      '</div>' +
      '<div class="scene-world">' +
        '<div class="scene-location">' + (set.name || 'The Stage') + ' · Scene ' + state.scene + '/' + state.maxScenes + '</div>' +
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

    choicesEl.innerHTML = choices.map(function(c, i) {
      return '<button class="stage-choice" onclick="EaldfornStage.makeChoice(\'' + 
        (c.trait || 'unknown') + '\', \'' + 
        escapeHTML(c.outcome || 'The god acknowledges your choice.') + '\', \'' +
        (actor ? actor.name || '' : '') + '\', \'' + (actor ? actor.glyph || '' : '') + '\')">' +
        '<span class="choice-glyph">' + (c.glyph || '◈') + '</span>' +
        '<span class="choice-text">' + (c.text || 'Act') + '</span>' +
        '<span class="choice-hint">+' + (c.trait || '?') + '</span></button>';
    }).join('');
  }

  // ════════════════════════════════════
  // CHOICE RESOLUTION
  // ════════════════════════════════════
  function makeChoice(trait, outcome, actorName, actorGlyph) {
    state.traits[trait] = (state.traits[trait] || 0) + 1;

    state.chronicle.push({
      scene: state.scene,
      actor: actorName,
      glyph: actorGlyph,
      trait: trait,
      outcome: outcome
    });

    var container = document.getElementById('stageContainer');
    container.innerHTML = 
      '<div class="scene-outcome">' +
        '<span class="actor-glyph" style="color:' + (state.currentActor ? state.currentActor.color : '#c9a84c') + '">' + actorGlyph + '</span> ' +
        '<span class="actor-name">' + actorName + ':</span> "' + outcome + '"' +
      '</div>' +
      '<div class="trait-gain">' +
        'Trait: <span class="trait-name">+' + trait + '</span> · ' +
        'Authority:' + (state.traits.authority||0) + ' ' +
        'Wisdom:' + (state.traits.wisdom||0) + ' ' +
        'Courage:' + (state.traits.courage||0) + ' ' +
        'Cunning:' + (state.traits.cunning||0) + ' ' +
        'Devotion:' + (state.traits.devotion||0) +
      '</div>';

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

    var container = document.getElementById('stageContainer');
    container.innerHTML = 
      '<div class="scene-curtain">' +
        '<div class="curtain-title">✦ Curtain Call ✦</div>' +
        '<div class="curtain-subtitle">' + script.title + ' — Complete</div>' +
        '<div class="curtain-ending">' + ending + '</div>' +
        '<div class="curtain-traits">' +
          'Dominant Trait: <span class="trait-name">' + dominantTrait.toUpperCase() + '</span><br>' +
          'Authority:' + (state.traits.authority||0) + ' · ' +
          'Wisdom:' + (state.traits.wisdom||0) + ' · ' +
          'Courage:' + (state.traits.courage||0) + ' · ' +
          'Cunning:' + (state.traits.cunning||0) + ' · ' +
          'Devotion:' + (state.traits.devotion||0) +
        '</div>' +
        '<div class="curtain-actions">' +
          '<button class="stage-btn" onclick="EaldfornStage.restart()">Play Again</button>' +
          '<a href="index.html" class="stage-btn">Return to Playbill</a>' +
        '</div>' +
      '</div>';

    document.getElementById('choicesContainer').innerHTML = '';
  }

  function restart() {
    state.scene = 0;
    state.currentActor = null;
    state.visitedActors = [];
    state.chronicle = [];
    state.traits = {};
    state.worldBeatIndex = 0;
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
        '<span class="c-trait">(+' + entry.trait + ')</span></div>';
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
