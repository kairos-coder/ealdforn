// ============================================
// EALDFORN STAGE v1.0 — The Player
// ============================================
// Reads script, set, and cast from URL params.
// Renders scenes: world beat → actor arrival → choices → outcome.
// All creative decisions live in JSON. The stage just plays.
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
    worldBeatIndex: 0
  };

  // ════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════
  async function init() {
    var params = new URLSearchParams(window.location.search);
    var scriptId = params.get('script') || 'bastard-of-helm-hallen';
    var setId = params.get('set') || 'storm-coast';
    var castIds = params.get('cast') || 'olympians';

    console.log('🎭 Ealdforn Stage — Raising the curtain...');
    console.log('   Script:', scriptId);
    console.log('   Set:', setId);
    console.log('   Cast:', castIds);

    // Load script
    try {
      var scriptResp = await fetch('script/' + scriptId + '.json');
      script = await scriptResp.json();
      state.maxScenes = script.maxScenes || 6;
      document.title = script.title + ' — Ealdforn Stage';
      console.log('   ✓ Script loaded:', script.title);
    } catch (e) {
      console.error('   ✗ Script not found:', scriptId);
      return false;
    }

    // Load set
    try {
      var setResp = await fetch('set/' + setId + '.json');
      set = await setResp.json();
      console.log('   ✓ Set loaded:', set.name);
    } catch (e) {
      console.warn('   ○ Set not found, using defaults');
      set = { name: 'Unknown Stage', weather: ['The air is still.'], worldBeats: ['The world waits.'] };
    }

    // Load cast members
    var castList = castIds.split(',');
    for (var i = 0; i < castList.length; i++) {
      try {
        var castResp = await fetch('actors/' + castList[i].trim() + '.json');
        var actorData = await castResp.json();
        Object.keys(actorData).forEach(function(key) {
          cast[key] = actorData[key];
        });
        console.log('   ✓ Cast loaded:', castList[i].trim(), '(' + Object.keys(actorData).length + ' actors)');
      } catch (e) {
        console.warn('   ○ Cast not found:', castList[i].trim());
      }
    }

    // Initialize traits from script
    if (script.player && script.player.traits) {
      state.traits = JSON.parse(JSON.stringify(script.player.traits));
    }

    renderPrologue();
    return true;
  }

  // ════════════════════════════════════
  // SCENE MANAGEMENT
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

  // ════════════════════════════════════
  // RENDERING
  // ════════════════════════════════════
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
        '<div class="prologue-subtitle">' + (script.subtitle || '') + '</div>' +
        '<div class="prologue-text">' + (script.prologue || 'The curtain rises.') + '</div>' +
        '<div class="prologue-player">You are <span class="player-name">' + playerName + '</span>. ' + (script.player ? script.player.backstory : '') + '</div>' +
      '</div>' +
      '<div class="scene-actions">' +
        '<button class="stage-btn" onclick="EaldfornStage.nextScene()">Begin the Tale</button>' +
      '</div>';

    updateChronicle();
    updateHeader();
  }

  function renderScene() {
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

    // Generate image
    var imageUrl = generateImage(actor, arrival, set.name);

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
        '<span class="actor-domain">' + (actor.domain || 'the unknown') + '</span>, ' + arrival + '.' +
      '</div>' +
      '<div class="scene-speech">' +
        '"' + getActorGreeting(actor) + '"' +
      '</div>';

    // Render choices
    var choicesEl = document.getElementById('choicesContainer');
    if (choicesEl) {
      var choices = getActorChoices(actor);
      choicesEl.innerHTML = choices.map(function(c, i) {
        return '<button class="stage-choice" onclick="EaldfornStage.makeChoice(\'' + 
          (c.trait || 'unknown') + '\', \'' + 
          escapeHTML(c.outcome || 'The god acknowledges your choice.') + '\', \'' +
          (actor.name || '') + '\', \'' + (actor.glyph || '') + '\')">' +
          '<span class="choice-glyph">' + (c.glyph || '◈') + '</span>' +
          '<span class="choice-text">' + (c.text || 'Act') + '</span>' +
          '<span class="choice-hint">+' + (c.trait || '?') + '</span></button>';
      }).join('');
    }

    updateHeader();
  }

  function getActorGreeting(actor) {
    var greetings = {
      authority: ['I have watched you from the peak of Olympus.', 'You carry yourself like a ruler. But are you one?', 'The blood of kings runs thin in you, bastard. But it runs.'],
      order: ['This keep is in chaos. I can help you order it.', 'Structure, little lord. Without it, you are just a man in a crumbling castle.'],
      depths: ['The sea has secrets. So do you.', 'I have seen what sleeps below your keep. Do you want to know?'],
      harvest: ['The earth here is tired. I can wake it.', 'You look hungry. When did you last eat something grown in your own soil?'],
      wisdom: ['I have a question for you.', 'Knowledge is the only inheritance that cannot be stolen.'],
      light: ['The sun still rises on Glimthaven Keep. That is my doing.', 'I see a shadow on you. Do you want me to illuminate it?'],
      hunt: ['Something is tracking you. Do you want to know what it is?', 'The woods around your keep are full of prey — and predators.'],
      forge: ['Your walls are weak. Your swords are dull. I can fix both.', 'You have the hands of a lord, not a smith. But that can change.'],
      beauty: ['You are more beautiful than you know, bastard.', 'Love is a weapon. Have you learned to wield it?'],
      war: ['I smell blood. Yours, soon, unless you prepare.', 'Fight me. Right now. Show me what you are.'],
      messengers: ['I have a message for you. It arrived three days ago. I ran here.', 'Quick — before the next god arrives — what do you need delivered?'],
      underworld: ['Your mother is not gone. She is just... elsewhere.', 'The dead speak of you. Do you want to know what they say?']
    };
    var pool = greetings[actor.domain] || ['I am here. Choose wisely.'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getActorChoices(actor) {
    // Use actor's defined choices, or generate defaults
    if (actor.choices && actor.choices[actor.domain]) {
      var pool = actor.choices[actor.domain];
      var shuffled = pool.slice();
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = temp;
      }
      return shuffled.slice(0, 3);
    }

    // Default choices by domain
    var defaults = {
      authority: [
        { text: 'Swear fealty', glyph: '⚡', trait: 'authority', outcome: 'You bend the knee. The god acknowledges you.' },
        { text: 'Demand their respect', glyph: '🗡️', trait: 'courage', outcome: 'Bold. The god does not strike you down. That is respect enough.' },
        { text: 'Ask about your father', glyph: '👑', trait: 'wisdom', outcome: 'The god tells you something about the king you did not know.' }
      ],
      wisdom: [
        { text: 'Answer their question', glyph: '🦉', trait: 'wisdom', outcome: 'You answer. The god nods. You have passed.' },
        { text: 'Ask for counsel', glyph: '📜', trait: 'wisdom', outcome: 'The god shares knowledge that will help you rule.' },
        { text: 'Request a secret', glyph: '👁️', trait: 'cunning', outcome: 'The god whispers something only they know.' }
      ],
      courage: [
        { text: 'Accept the challenge', glyph: '⚔️', trait: 'courage', outcome: 'You face the god. You do not win — but you do not fall.' },
        { text: 'Stand your ground', glyph: '🛡️', trait: 'courage', outcome: 'The god tests you. You hold. They are impressed.' },
        { text: 'Ask for training', glyph: '🏋️', trait: 'courage', outcome: 'The god agrees to teach you. It will be painful. It will be worth it.' }
      ]
    };

    var pool = defaults[actor.domain] || defaults['authority'];
    return pool.slice(0, 3);
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

    // Render outcome
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

  function nextScene() {
    document.getElementById('choicesContainer').innerHTML = '';
    renderScene();
  }

  // ════════════════════════════════════
  // CURTAIN CALL
  // ════════════════════════════════════
  function curtainCall() {
    var dominantTrait = Object.keys(state.traits).reduce(function(a, b) {
      return (state.traits[a] || 0) > (state.traits[b] || 0) ? a : b;
    });

    var ending = script.endings ? script.endings[dominantTrait] : 'Your tale is complete.';

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
  // IMAGE GENERATION
  // ════════════════════════════════════
  function generateImage(actor, scene, location) {
    var prompt = 'dark fantasy, ' + (actor.aspect || 'mythic') + ' god ' + (actor.name || '') + 
      ', ' + scene + ', ' + location + 
      ', mythic atmosphere, cinematic lighting, oil painting style, medieval, 4k';
    var seed = Math.floor(Math.random() * 99999);
    return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + 
      '?width=1024&height=768&seed=' + seed + '&nologo=true';
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
        entry.outcome.substring(0, 80) + '... ' +
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
    makeChoice: makeChoice,
    restart: restart
  };

})();

// Auto-init when the page loads
document.addEventListener('DOMContentLoaded', function() {
  EaldfornStage.init();
});
