// ============================================
// EALDFORN STAGE v2.2 — The Player
// ============================================
// Reads script, set, cast, and choice cards.
// Uses local images from images/ folder.
// Falls back to Pollinations for missing images.
//
// v2.2 additions:
//   - Memory Cards: prior choices flavor later scenes
//   - Voice Parameters: screenplay controls speech rate/pitch
//   - Curtain Call God Reactions: each god gets a closing line
//   - Ghost tone: card loading from tone-specific folder
//   - God Return Mechanic: second visits feel different
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
    visitedActors: [],       // god names seen this run
    visitCounts: {},         // { godName: N } for return mechanic
    chronicle: [],
    traits: {},
    worldBeatIndex: 0,
    tone: 'original',
    memoryCards: [],         // brief residue sentences from prior choices
    curtainActors: []        // ordered list of { name, glyph, color, domain } for curtain
  };

  // ── CHOICE CARD CACHE ──
  var choiceCache = {};

  // ── VOICE ──
  var voiceParams = { rate: 0.92, pitch: 1.0, pauseBetweenSentences: 400 };

  // ════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════
  async function init() {
    var params = new URLSearchParams(window.location.search);
    var scriptId = params.get('script') || 'bastard-of-helm-hallen';
    var setId = params.get('set') || 'storm-coast';
    var castIds = params.get('cast') || 'olympians';

    console.log('🎭 Ealdforn Stage v2.2 — Raising the curtain...');
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

      // Apply voice parameters from screenplay
      if (script.voice) {
        voiceParams.rate = script.voice.rate || voiceParams.rate;
        voiceParams.pitch = script.voice.pitch || voiceParams.pitch;
        voiceParams.pauseBetweenSentences = script.voice.pause_between_sentences || voiceParams.pauseBetweenSentences;
        console.log('   ✓ Voice params:', voiceParams);
      }
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
    if (actor.image) return 'images/actors/' + actor.image;
    console.log('   ⚡ No local image for ' + actor.name + ' — using Pollinations fallback');
    var prompt = 'dark fantasy, ' + (actor.aspect || 'mythic') + ' god ' + (actor.name || '') +
      ', ' + (actor.domain || '') + ', mythic atmosphere, cinematic lighting, oil painting style, portrait, 4k';
    var seed = Math.floor(Math.random() * 99999);
    return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) +
      '?width=1024&height=768&seed=' + seed + '&nologo=true';
  }

  // ════════════════════════════════════
  // VOICE NARRATION
  // ════════════════════════════════════
  function narrate(text) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    var sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    var index = 0;
    function speakNext() {
      if (index >= sentences.length) return;
      var utt = new SpeechSynthesisUtterance(sentences[index].trim());
      utt.rate = voiceParams.rate;
      utt.pitch = voiceParams.pitch;
      utt.onend = function() {
        index++;
        setTimeout(speakNext, voiceParams.pauseBetweenSentences);
      };
      window.speechSynthesis.speak(utt);
    }
    speakNext();
  }

  // ════════════════════════════════════
  // MEMORY CARD SYSTEM
  // ════════════════════════════════════
  var MEMORY_TEMPLATES = {
    authority: [
      'You named yourself. The word has not left the room since.',
      'You held the door. The hall still carries the echo of that refusal.',
      'The compact is still yours. You said so, and it became true.',
      'Authority, once claimed aloud, does not easily unclaim itself.'
    ],
    wisdom: [
      'You asked the right question. The answer is still reshaping things inside you.',
      'You know something now that changes the shape of everything before it.',
      'A god told you a truth. You have been carrying it quietly ever since.',
      'The knowing sits heavy, but less heavy than the not-knowing did.'
    ],
    courage: [
      'You were afraid and stayed anyway. The keep has not forgotten that.',
      'A god was surprised by you. That is rarer than it sounds.',
      'You stood at an edge and did not step back. The sea noted this.',
      'What you said to the god cannot be unsaid. This is not a problem.'
    ],
    cunning: [
      'You gave away something worthless and received something valuable. The arithmetic of it still pleases you.',
      'A god left satisfied with the wrong thing. This is your doing.',
      'You moved three things while the divine attention was elsewhere. They are still moved.',
      'Hermes has been in the world for a very long time. You still surprised him.'
    ],
    devotion: [
      'You gave something back. The lightness afterward was unexpected.',
      'The released thing is gone. You keep reaching for it and finding only air.',
      'Something has been witnessed. The witnessing is complete.',
      'You let go. The keep is different for it. So are you.'
    ]
  };

  function generateMemoryCard(trait) {
    var pool = MEMORY_TEMPLATES[trait] || ['The scene has passed. Something has changed.'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getMemoryLine() {
    if (state.memoryCards.length === 0) return null;
    // Return the most recent memory card
    return state.memoryCards[state.memoryCards.length - 1];
  }

  // ════════════════════════════════════
  // CURTAIN CALL GOD REACTIONS
  // ════════════════════════════════════
  var CURTAIN_REACTIONS = {
    authority: {
      Zeus: 'He watched you from the end. He does not say whether he approves. He doesn\'t need to.',
      Hera: 'She folded her hands and made a sound that was neither agreement nor disagreement. You will hear about this later.',
      Ares: 'He clapped once — sharp, final — and left without looking back.',
      Hephaestus: 'He was already thinking about something else. The compliment, when it came, arrived three days later in the form of a lock that could not be opened by anything divine.'
    },
    wisdom: {
      Athena: 'She left you with a question you haven\'t answered yet. You suspect you\'re not supposed to.',
      Apollo: 'He sang something on the way out. You didn\'t recognize the tune, but you\'ve been humming it ever since.',
      Persephone: 'She paused at the door. "The dead will know," she said. She meant it kindly.',
      Demeter: 'She pressed her thumb to the floor on her way out. Something in the stones is growing.'
    },
    courage: {
      Ares: 'He left a sword in the corner. Not a gift — more like punctuation.',
      Artemis: 'She notched an arrow and didn\'t fire it. This, you understood, was the point.',
      Poseidon: 'He looked at the cliffs one more time before he went. You had the feeling he was recalculating something.',
      Zeus: 'He left a bruise on your shoulder from where he gripped it. You will not remember receiving it.'
    },
    cunning: {
      Hermes: 'He left a coin on the windowsill. You found it was blank on both sides.',
      Aphrodite: 'She was still looking at the wet stones when she left. You think she came back later, when you were sleeping.',
      Athena: 'She told you afterward that she knew what you were doing. She also told you it worked.',
      Zeus: 'He sent a messenger three days later with a letter that said only: "Well played." The messenger seemed offended to be carrying it.'
    },
    devotion: {
      Persephone: 'She took everything you gave her with both hands, which is how she receives things that matter.',
      Demeter: 'She blessed the keep on her way out. You didn\'t ask her to. The kitchen garden is doing better.',
      Apollo: 'He stood in the doorway for a long moment after the names were gone, watching the torch burn white.',
      Hera: 'She said: "The oath is closed." Three words. But the way she said them made them feel like an ending that had been waiting a very long time.'
    }
  };

  function getDefaultCurtainReaction(actorName, trait) {
    var generic = {
      authority: actorName + ' departed without ceremony. The weight they left in the room was considerable.',
      wisdom: actorName + ' left you with more than you came in with. Whether that is a gift is still unclear.',
      courage: actorName + ' looked at you one last time at the door. The look said several things.',
      cunning: actorName + ' smiled when they left. You are still not sure why.',
      devotion: actorName + ' carried what you gave them carefully, like something that might break if handled without attention.'
    };
    return generic[trait] || actorName + ' has witnessed you. This is not nothing.';
  }

  function getCurtainReaction(actorName, trait) {
    if (CURTAIN_REACTIONS[trait] && CURTAIN_REACTIONS[trait][actorName]) {
      return CURTAIN_REACTIONS[trait][actorName];
    }
    return getDefaultCurtainReaction(actorName, trait);
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
    var tone = state.tone || 'original';
    var cardFiles = [
      'authority.json', 'wisdom.json', 'courage.json', 'cunning.json', 'devotion.json',
      'domain/war.json', 'domain/forge.json', 'domain/hunt.json', 'domain/harvest.json',
      'domain/underworld.json', 'domain/beauty.json', 'domain/depths.json',
      'domain/light.json', 'domain/wisdom-domain.json', 'domain/authority-domain.json',
      'domain/order.json', 'domain/messengers.json'
    ];

    // Tone-specific cards: try loading from tone subfolder
    if (tone !== 'original') {
      var toneFiles = [
        tone + '/authority.json',
        tone + '/wisdom.json',
        tone + '/courage.json',
        tone + '/cunning.json',
        tone + '/devotion.json'
      ];
      cardFiles = cardFiles.concat(toneFiles);
    }

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

    // 2. Pull from trait pools (standard + tone-specific)
    var traitPools = ['authority', 'wisdom', 'courage', 'cunning', 'devotion'];

    for (var i = 0; i < traitPools.length; i++) {
      // Standard
      var traitCards = await loadChoiceCards(traitPools[i] + '.json');
      if (traitCards) {
        var traitFiltered = traitCards.filter(function(c) {
          return (!c.tones || c.tones.indexOf(tone) > -1 || c.tones.indexOf('original') > -1);
        });
        choices = choices.concat(traitFiltered);
      }

      // Tone-specific
      if (tone !== 'original') {
        var toneTraitCards = await loadChoiceCards(tone + '/' + traitPools[i] + '.json');
        if (toneTraitCards) {
          choices = choices.concat(toneTraitCards);
        }
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

    // 5. Select 3 with trait diversity
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
        outcome: c.outcome || 'The god acknowledges your choice with a silence that contains entire seasons.'
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

    // Track visit counts for return mechanic
    state.visitCounts[drawn] = (state.visitCounts[drawn] || 0) + 1;

    // Track for curtain call
    state.curtainActors.push({
      name: drawn,
      glyph: state.currentActor.glyph || '◈',
      color: state.currentActor.color || '#c9a84c',
      domain: state.currentActor.domain || 'unknown',
      trait: null // filled on choice
    });

    return state.currentActor;
  }

  function isGodReturning(actorName) {
    return (state.visitCounts[actorName] || 0) > 1;
  }

  function getActorEntrance(actor) {
    var isReturn = isGodReturning(actor.name);

    // Return entrance: check for return_entrance field first
    if (isReturn && actor.return_entrance) {
      return actor.return_entrance[Math.floor(Math.random() * actor.return_entrance.length)];
    }

    // Standard entrance
    if (actor.scenes && actor.scenes.arrival && actor.scenes.arrival.length > 0) {
      return actor.scenes.arrival[Math.floor(Math.random() * actor.scenes.arrival.length)];
    }
    if (actor.entrance) return actor.entrance;

    // Fallback with return note
    if (isReturn) {
      return 'has returned. This visit feels different — more deliberate, as though the first was reconnaissance.';
    }
    return 'appears before you, unmistakably divine.';
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
    var burden = script.player ? script.player.burden : null;

    // Format prologue with paragraph breaks
    var prologueHtml = (script.prologue || 'The curtain rises.')
      .split('\n\n').map(function(p) {
        return '<p style="margin-bottom:10px;">' + p.trim() + '</p>';
      }).join('');

    container.innerHTML =
      '<div class="scene-world">' +
        '<div class="scene-location">' + (set.name || location) + '</div>' +
        '<div class="scene-weather">' + weather + '</div>' +
      '</div>' +
      '<div class="scene-prologue">' +
        '<div class="prologue-title">' + script.title + '</div>' +
        '<div class="prologue-subtitle">' + (script.subtitle || '') + ' · ' + state.tone.charAt(0).toUpperCase() + state.tone.slice(1) + ' Path</div>' +
        '<div class="prologue-text">' + prologueHtml + '</div>' +
        '<div class="prologue-player">You are <span class="player-name">' + playerName + '</span>. ' + (script.player ? script.player.backstory : '') + '</div>' +
        (burden ? '<div class="prologue-burden">' + burden + '</div>' : '') +
      '</div>' +
      '<div class="scene-actions">' +
        '<button class="stage-btn" onclick="EaldfornStage.nextScene()">Begin the Tale</button>' +
      '</div>';

    if (script.prologue) narrate(script.prologue);
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
    var isReturn = isGodReturning(actor.name);

    var arrival = getActorEntrance(actor);
    var imageUrl = getActorImage(actor);

    // Memory card: inject residue from prior choice if available
    var memoryLine = getMemoryLine();
    var memoryHtml = memoryLine
      ? '<div class="scene-memory">' + memoryLine + '</div>'
      : '';

    // Return god badge
    var returnBadge = isReturn
      ? '<span class="return-badge">returned</span> '
      : '';

    container.innerHTML =
      '<div class="scene-image">' +
        '<img src="' + imageUrl + '" alt="' + actor.name + ' appears" onerror="this.parentElement.innerHTML=\'<div class=img-placeholder>The mists part as ' + actor.name + ' arrives...</div>\'">' +
      '</div>' +
      '<div class="scene-world">' +
        '<div class="scene-location">' + (set.name || 'The Stage') + ' · Scene ' + state.scene + '/' + state.maxScenes + '</div>' +
        '<div class="scene-weather">' + weather + '</div>' +
      '</div>' +
      memoryHtml +
      '<div class="scene-narration">' + worldBeat + '</div>' +
      '<div class="scene-arrival">' +
        '<span class="actor-glyph" style="color:' + (actor.color || '#c9a84c') + '">' + (actor.glyph || '◈') + '</span> ' +
        returnBadge +
        '<span class="actor-name" style="color:' + (actor.color || '#c9a84c') + '">' + actor.name + '</span>, ' +
        '<span class="actor-domain">god of ' + (actor.domain || 'the unknown') + '</span>, ' + arrival + '.' +
      '</div>' +
      '<div class="scene-speech">' +
        '"' + getActorGreeting(actor) + '"' +
      '</div>' +
      '<div class="scene-actions">' +
        '<button class="stage-btn" onclick="EaldfornStage.loadChoices()">Make Your Choice →</button>' +
      '</div>';

    narrate(worldBeat);
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
        (actor ? escapeHTML(actor.name || '') : '') + '\', \'' + (actor ? actor.glyph || '' : '') + '\')">' +
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

    // Generate and store a memory card from this choice
    var memory = generateMemoryCard(trait);
    state.memoryCards.push(memory);

    // Tag curtain actor with the trait chosen during their scene
    for (var i = state.curtainActors.length - 1; i >= 0; i--) {
      if (state.curtainActors[i].name === actorName && !state.curtainActors[i].trait) {
        state.curtainActors[i].trait = trait;
        break;
      }
    }

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
        '<span class="actor-name">' + actorName + ':</span> ' + outcome +
      '</div>' +
      '<div class="trait-gain">' +
        'Trait gained: <span class="trait-name">+' + trait + '</span> · ' +
        'Authority:' + (state.traits.authority||0) + ' ' +
        'Wisdom:' + (state.traits.wisdom||0) + ' ' +
        'Courage:' + (state.traits.courage||0) + ' ' +
        'Cunning:' + (state.traits.cunning||0) + ' ' +
        'Devotion:' + (state.traits.devotion||0) +
      '</div>';

    narrate(outcome);
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

    // Build god reaction cards
    var godReactionsHtml = state.curtainActors.map(function(a) {
      var reaction = getCurtainReaction(a.name, a.trait || dominantTrait);
      return '<div class="curtain-god-card">' +
        '<span class="actor-glyph" style="color:' + a.color + '">' + a.glyph + '</span> ' +
        '<span class="curtain-god-name" style="color:' + a.color + '">' + a.name + '</span>' +
        '<div class="curtain-god-reaction">' + reaction + '</div>' +
      '</div>';
    }).join('');

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
        '<div class="curtain-gods">' + godReactionsHtml + '</div>' +
        '<div class="curtain-actions">' +
          '<button class="stage-btn" onclick="EaldfornStage.restart()">Play Again</button>' +
          '<a href="index.html" class="stage-btn">Return to Playbill</a>' +
        '</div>' +
      '</div>';

    document.getElementById('choicesContainer').innerHTML = '';
    narrate(ending);
  }

  function restart() {
    state.scene = 0;
    state.currentActor = null;
    state.visitedActors = [];
    state.visitCounts = {};
    state.chronicle = [];
    state.traits = {};
    state.worldBeatIndex = 0;
    state.memoryCards = [];
    state.curtainActors = [];
    if (script.player && script.player.traits) {
      state.traits = JSON.parse(JSON.stringify(script.player.traits));
    } else {
      state.traits = { authority: 0, wisdom: 0, courage: 0, cunning: 0, devotion: 0 };
    }
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
