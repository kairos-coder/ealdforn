// ============================================
// EALDFORN STAGE v4.0 — The Player
// ============================================
// Full mortal + god integration.
// Mortals drawn from the same pool as gods in loopMode.
// Mortal-specific greetings and choice card domains.
// ============================================

var EaldfornStage = (function() {
  'use strict';

  var script = null, set = null, cast = {}, mortals = {};
  var state = {
    scene: 0, maxScenes: 6, currentActor: null,
    visitedActors: [], returnedActors: [], visitCounts: {},
    chronicle: [], memoryCards: [], traits: {},
    worldBeatIndex: 0, tone: 'original',
    traitTensions: [], curtainActors: [],
    mortalInterludePending: false, lastMortalIndex: -1
  };

  var choiceCache = {};
  var voiceParams = { rate: 0.92, pitch: 1.0, pauseBetweenSentences: 400 };

  var OPPOSED_TRAITS = {
    authority: 'devotion', devotion: 'authority',
    cunning: 'courage', courage: 'cunning'
  };

  var CURTAIN_REACTIONS = {
    Zeus: { authority:'He left a thunderbolt frozen in the stone above your door.', wisdom:'He asked a question as he departed.', courage:'He did not smile. But he did not strike.', cunning:'He laughed — once, sharp.', devotion:'He bowed his head. Just slightly.' },
    Hera: { authority:'She straightened a tapestry on her way out.', wisdom:'She left a book on the table.', courage:'She touched your shoulder.', cunning:'She smiled — the real one.', devotion:'She wept. Just one tear.' },
    Poseidon: { authority:'He calmed the sea for your fishing boats.', wisdom:'He showed you what the tide had hidden.', courage:'"The deep did not frighten you."', cunning:'He gave you a shell that whispers secrets.', devotion:'He returned something the sea took.' },
    Demeter: { authority:'She made the garden bloom. In winter.', wisdom:'She taught you the name of every plant.', courage:'She stood with you in the frost.', cunning:'She left seeds that only grow in secret.', devotion:'She cried. The soil will remember.' },
    Athena: { authority:'She left an owl feather on your desk.', wisdom:'She answered the question you were too afraid to ask.', courage:'"You thought clearly under pressure."', cunning:'She smiled. "You planned for this."', devotion:'She bowed. Athena bows to no one.' },
    Apollo: { authority:'He sang one note. The keep hummed for hours.', wisdom:'He told you a prophecy.', courage:'"You faced the dark."', cunning:'He laughed. "You tricked prophecy itself."', devotion:'He played his lyre for the dead.' },
    Artemis: { authority:'She marked a tree outside your wall.', wisdom:'She showed you a trail you had never seen.', courage:'She nodded once.', cunning:'She left a snare at your door.', devotion:'She released a white stag.' },
    Hephaestus: { authority:'He fixed the lock without being asked.', wisdom:'He showed you how the foundations were laid.', courage:'He worked through the night beside you.', cunning:'He forged a key that opens one door.', devotion:'He left his hammer.' },
    Aphrodite: { authority:'She told you that you are more beautiful than you know.', wisdom:'She showed you who in the village is in love.', courage:'"Loving something that might leave is bravest."', cunning:'She kissed your cheek.', devotion:'She wept. Aphrodite does not weep for mortals.' },
    Ares: { authority:'He saluted. A warrior\'s salute.', wisdom:'"You think before you fight."', courage:'He clasped your arm.', cunning:'He grinned. "You fight with your head."', devotion:'He knelt. Ares knelt.' },
    Hermes: { authority:'He left a coin on the windowsill.', wisdom:'He told you a secret.', courage:'He raced the wind on your behalf.', cunning:'He winked. "We should do business again."', devotion:'He delivered your message to the dead.' },
    Persephone: { authority:'She left a pomegranate on the chest.', wisdom:'She told you a name no one living knows.', courage:'She kissed your forehead.', cunning:'She laughed. "You bargained with the dead and won."', devotion:'She took the names. All of them.' }
  };

  var MEMORY_TEMPLATES = {
    authority: ['You named yourself. The word has not left the room since.','You held the door. The hall still carries the echo.','The compact is still yours.'],
    wisdom: ['You asked the right question. The answer is still reshaping things.','You know something now that changes everything.','A truth was told. You carry it quietly.'],
    courage: ['You were afraid and stayed anyway.','A god was surprised by you. That is rarer than it sounds.','You stood at an edge and did not step back.'],
    cunning: ['You gave away something worthless and received something valuable.','A god left satisfied with the wrong thing.','You surprised a trickster. That is not easy.'],
    devotion: ['You gave something back. The lightness was unexpected.','The released thing is gone. You keep reaching for it.','You let go. The keep is different for it.']
  };

  // ═══ INIT ═══
  async function init() {
    var params = new URLSearchParams(window.location.search);
    var scriptId = params.get('script') || 'bastard-of-helm-hallen';
    var setId = params.get('set') || 'storm-coast';
    var castIds = params.get('cast') || 'olympians';

    console.log('🎭 Ealdforn Stage v4.0 — Raising the curtain...');
    try {
      var r = await fetch('script/' + scriptId + '.json');
      script = await r.json();
      state.maxScenes = script.maxScenes || 6;
      state.tone = script.tone || 'original';
      document.title = script.title + ' — Ealdforn Stage';
      if (script.voice) { voiceParams.rate = script.voice.rate||voiceParams.rate; voiceParams.pitch = script.voice.pitch||voiceParams.pitch; voiceParams.pauseBetweenSentences = script.voice.pause_between_sentences||voiceParams.pauseBetweenSentences; }
      console.log('   ✓ Script:', script.title, '· Tone:', state.tone);
      if (script.loopMode) console.log('   ∞ Loop mode active');
    } catch (e) { renderError('Script not found: ' + scriptId); return false; }

    try { var sr = await fetch('set/' + setId + '.json'); set = await sr.json(); }
    catch (e) { set = { name:'Unknown Stage', weather:['The air is still.'], worldBeats:['The world waits.'], atmosphere:'storm-coast.jpg' }; }
    applySetBackground();

    // Load all cast files
    var castList = castIds.split(',');
    for (var i = 0; i < castList.length; i++) {
      try { var cr = await fetch('actors/' + castList[i].trim() + '.json'); var ad = await cr.json(); Object.keys(ad).forEach(function(k){ cast[k]=ad[k]; }); console.log('   ✓ Cast loaded:', castList[i].trim(), '(' + Object.keys(ad).length + ' actors)'); } catch(e){}
    }

    // Load mortals if specified
    if (castIds.indexOf('mortals') > -1 || (script.mortalCast && script.mortalCast.length > 0)) {
      try { var mr = await fetch('actors/mortals.json'); mortals = await mr.json(); console.log('   ✓ Mortals loaded:', Object.keys(mortals).length + ' characters'); } catch(e){}
    }

    if (script.player && script.player.traits) { state.traits = JSON.parse(JSON.stringify(script.player.traits)); }
    else { state.traits = { authority:0, wisdom:0, courage:0, cunning:0, devotion:0 }; }

    renderPrologue();
    return true;
  }

  // ═══ CARDS ═══
  async function loadCardFile(f) {
    if (choiceCache[f]) return choiceCache[f];
    try { var r = await fetch('cards/' + f); var d = await r.json(); choiceCache[f]=d; return d; } catch(e){ return null; }
  }

  function normalize(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    var flat = [];
    Object.keys(data).forEach(function(k){ if (Array.isArray(data[k])) flat = flat.concat(data[k]); });
    return flat;
  }

  async function getActorChoices(actor) {
    var domain = actor.domain || 'authority', tone = state.tone || 'original', choices = [];
    var isMortal = actor.isMortal || false;

    function toneMatch(c) {
      if (!c.tones && !c.tone) return true;
      if (c.tones && Array.isArray(c.tones)) return c.tones.indexOf(tone)>-1 || c.tones.indexOf('original')>-1;
      if (c.tone) return c.tone===tone || c.tone==='original';
      return false;
    }

    // Tone file
    if (tone !== 'original') {
      var toneCards = normalize(await loadCardFile(tone + '.json'));
      choices = choices.concat(toneCards);
    }

    // Domain cards (works for both gods and mortals)
    var dc = normalize(await loadCardFile('domain/' + domain + '.json'));
    choices = choices.concat(dc.filter(toneMatch));

    // Trait pools
    var traits = ['authority','wisdom','courage','cunning','devotion'];
    for (var i=0; i<traits.length; i++) {
      var tc = normalize(await loadCardFile(traits[i] + '.json'));
      choices = choices.concat(tc.filter(toneMatch));
    }

    var seen={}; choices=choices.filter(function(c){ if(!c.id||seen[c.id]) return false; seen[c.id]=true; return true; });
    for (var s=choices.length-1; s>0; s--){ var j=Math.floor(Math.random()*(s+1)); var tmp=choices[s]; choices[s]=choices[j]; choices[j]=tmp; }

    var sel=[], tu={};
    for (var t=0; t<choices.length && sel.length<3; t++){ if(!tu[choices[t].trait]){ sel.push(choices[t]); tu[choices[t].trait]=true; } }
    for (var f=0; f<choices.length && sel.length<3; f++){ if(!sel.find(function(x){return x.id===choices[f].id})) sel.push(choices[f]); }

    return sel.slice(0,3).map(function(c){ return { text:c.text, subtext:c.subtext||'', glyph:c.glyph||'◈', trait:c.trait, outcome:c.outcome||'They regard you for a long moment, then continue.' }; });
  }

  // ═══ IMAGES ═══
  function applySetBackground() {
    var m = document.querySelector('.stage-main'); if(!m) return;
    m.style.backgroundImage = 'url(images/sets/'+(set.atmosphere||'storm-coast.jpg')+')';
    m.style.backgroundSize='cover'; m.style.backgroundPosition='center'; m.style.backgroundAttachment='fixed';
  }
  function getActorImage(a) {
    if (a.image) return 'images/actors/' + a.image;
    return pollinationsFallback(a);
  }
  function pollinationsFallback(a) {
    return 'https://image.pollinations.ai/prompt/'+encodeURIComponent('dark fantasy, '+(a.aspect||'mythic')+' '+(a.name||'')+', '+(a.domain||'')+', cinematic, oil painting, portrait, 4k')+'?width=1024&height=768&seed='+Math.floor(Math.random()*99999)+'&nologo=true';
  }

  // ═══ ACTOR DRAWING (unified pool) ═══
  function getAllActorNames() {
    var godNames = Object.keys(cast).filter(function(n){ return cast[n].domain; });
    var mortalNames = Object.keys(mortals);
    return godNames.concat(mortalNames);
  }

  function drawActor() {
    var allNames = getAllActorNames();
    if (!allNames.length) return null;

    // In loop mode, reset visited when all have been seen
    var unvisited = allNames.filter(function(n){ return state.visitedActors.indexOf(n)===-1; });
    if (unvisited.length === 0) {
      if (script.loopMode) {
        state.visitedActors = [];
        state.returnedActors = [];
        unvisited = allNames;
      } else {
        unvisited = allNames;
      }
    }

    var pool = unvisited.length ? unvisited : allNames;
    var drawn = pool[Math.floor(Math.random()*pool.length)];

    state.visitCounts[drawn] = (state.visitCounts[drawn]||0)+1;
    if (state.visitedActors.indexOf(drawn)>-1) state.returnedActors.push(drawn);

    // Check if mortal or god
    if (mortals[drawn]) {
      state.currentActor = mortals[drawn];
      state.currentActor.name = drawn;
      state.currentActor.isMortal = true;
    } else {
      state.currentActor = cast[drawn];
      state.currentActor.name = drawn;
      state.currentActor.isMortal = false;
    }

    state.visitedActors.push(drawn);
    state.curtainActors.push({
      name: drawn,
      glyph: state.currentActor.glyph||'◈',
      color: state.currentActor.color||'#c9a84c',
      domain: state.currentActor.domain,
      isMortal: state.currentActor.isMortal||false,
      trait: null
    });

    return state.currentActor;
  }

  function isReturn(n) { return (state.visitCounts[n]||0)>1; }

  function getWorldBeat() {
    if (set.worldBeats && state.worldBeatIndex < set.worldBeats.length) return set.worldBeats[state.worldBeatIndex++];
    return set.worldBeats ? set.worldBeats[set.worldBeats.length-1] : 'The world holds its breath.';
  }
  function getWeather() { return (set.weather&&set.weather.length) ? set.weather[Math.floor(Math.random()*set.weather.length)] : ''; }

  function getGreeting(a) {
    // Mortals use their own greetings from the actor definition
    if (a.isMortal && a.greetings && a.greetings.length) {
      return a.greetings[Math.floor(Math.random()*a.greetings.length)];
    }
    // Gods use domain-based greetings
    var g = {
      authority:['I have watched you from the peak of Olympus.','The blood of kings runs thin in you. But it runs.','You sit in a forgotten keep. And yet — you are interesting.'],
      order:['This keep is in chaos. I can help you order it.','Structure. Without it, you are just a soul in a crumbling castle.'],
      depths:['The sea has secrets. So do you.','The tide brought me here.'],
      harvest:['The earth here is tired. I can wake it.','You look hungry.'],
      wisdom:['I have a question for you.','Knowledge is the only inheritance that cannot be stolen.'],
      light:['The sun still rises on this place.','Prophecy is not prediction. It is pattern.'],
      hunt:['Something is tracking you.','I have been watching you watch the forest.'],
      forge:['Your walls are weak. I can fix both.','I looked at your armory.'],
      beauty:['You are more compelling than you know.','Love is everywhere in this keep.'],
      war:['I smell blood.','Fight me. Right now.'],
      messengers:['I have a message for you.','Quick — what do you need delivered?'],
      underworld:['The dead in this keep are not resting.','Winter always comes. But spring always follows.']
    };
    var p = g[a.domain] || ['I am here. Choose wisely.'];
    return p[Math.floor(Math.random()*p.length)];
  }

  function getLeadingTrait() {
    var l='wisdom', h=0;
    Object.keys(state.traits).forEach(function(t){ if((state.traits[t]||0)>h){ h=state.traits[t]; l=t; } });
    return l;
  }

  function checkTension() {
    var tensions=[], checked={};
    Object.keys(OPPOSED_TRAITS).forEach(function(t){
      var o=OPPOSED_TRAITS[t], pk = t<o ? t+'_'+o : o+'_'+t;
      if(!checked[pk]){ checked[pk]=true; if((state.traits[t]||0)>=2 && (state.traits[o]||0)>=2) tensions.push({message:'You have pursued '+t+' and '+o+' in equal measure. The gods notice this contradiction.'}); }
    });
    state.traitTensions = tensions;
  }

  // ═══ NARRATION ═══
  function narrate(text) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    var sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    var idx=0;
    function next(){ if(idx>=sentences.length) return; var u=new SpeechSynthesisUtterance(sentences[idx].trim()); u.rate=voiceParams.rate; u.pitch=voiceParams.pitch; u.onend=function(){ idx++; setTimeout(next, voiceParams.pauseBetweenSentences); }; window.speechSynthesis.speak(u); }
    next();
  }

  // ═══ RENDER ═══
  function renderError(m) { var c=document.getElementById('stageContainer'); if(c) c.innerHTML='<div class="scene-prologue" style="text-align:center;padding:40px;"><div style="font-size:18px;color:var(--rubric);">✗</div><div style="color:var(--text-dim);">'+m+'</div><a href="index.html" class="stage-btn" style="display:inline-block;margin-top:16px;">Return to Playbill</a></div>'; }

  function renderPrologue() {
    var c=document.getElementById('stageContainer'); if(!c) return;
    var playerName=script.player?script.player.name:'the protagonist';
    var burden=script.player?script.player.burden:null;
    var prologue = (script.prologue||'The curtain rises.').split(/\n\n/).map(function(p){ return '<p>'+p.trim()+'</p>'; }).join('');
    c.innerHTML =
      '<div class="scene-world"><div class="scene-location">'+(set.name||'')+'</div><div class="scene-weather">'+getWeather()+'</div></div>'+
      '<div class="scene-prologue"><div class="prologue-title">'+script.title+'</div><div class="prologue-subtitle">'+(script.subtitle||'')+' · '+state.tone.charAt(0).toUpperCase()+state.tone.slice(1)+' Path</div>'+
      '<div class="prologue-text">'+prologue+'</div>'+
      '<div class="prologue-player">You are <span class="player-name">'+playerName+'</span>. '+(script.player?script.player.backstory:'')+'</div>'+
      (burden?'<div class="prologue-burden">'+burden+'</div>':'')+
      '</div><div class="scene-actions"><button class="stage-btn" onclick="EaldfornStage.nextScene()">Begin the Tale</button></div>';
    updateChronicle(); updateHeader(); narrate(script.prologue||'');
  }

  async function renderScene() {
    var c=document.getElementById('stageContainer'); if(!c) return;
    state.scene++;

    // Loop mode: no max scenes
    if (script.loopMode && state.scene > 999) state.scene = 1;

    var a=drawActor(); if(!a){ renderError('No actors.'); return; }
    var wb=getWorldBeat(), ret=isReturn(a.name);
    if (state.memoryCards.length) wb = '<span class="scene-memory">'+state.memoryCards[state.memoryCards.length-1]+'</span> '+wb;

    var arrival = '';
    if (ret && a.return_entrance) arrival = a.return_entrance[Math.floor(Math.random()*a.return_entrance.length)];
    else if (a.scenes && a.scenes.arrival && a.scenes.arrival.length) arrival = a.scenes.arrival[Math.floor(Math.random()*a.scenes.arrival.length)];
    else if (a.entrance) arrival = a.entrance;
    else arrival = a.isMortal ? 'steps through the gate, shaking off the cold' : 'appears before you, unmistakably divine.';
    if (ret && arrival.indexOf('return')===-1) arrival = 'returns — '+arrival;

    var actorType = a.isMortal ? a.role || 'mortal' : 'god of '+(a.domain||'the unknown');
    var sceneLabel = script.loopMode ? 'Visit ' + state.scene : 'Scene '+state.scene+'/'+state.maxScenes;

    c.innerHTML =
      '<div class="scene-image"><img src="'+getActorImage(a)+'" alt="'+a.name+'" onerror="this.parentElement.innerHTML=\'<div class=img-placeholder>'+a.name+' arrives...</div>\'"></div>'+
      '<div class="scene-world"><div class="scene-location">'+(set.name||'The Stage')+' · '+sceneLabel+(ret?' <span class="return-badge">Return</span>':'')+'</div><div class="scene-weather">'+getWeather()+'</div></div>'+
      '<div class="scene-narration">'+wb+'</div>'+
      '<div class="scene-arrival"><span class="actor-glyph" style="color:'+(a.color||'#c9a84c')+'">'+(a.glyph||'◈')+'</span> <span class="actor-name" style="color:'+(a.color||'#c9a84c')+'">'+a.name+'</span>, <span class="actor-domain">'+actorType+'</span>, '+arrival+'.</div>'+
      '<div class="scene-speech">"'+getGreeting(a)+'"</div>'+
      '<div class="scene-actions"><button class="stage-btn" onclick="EaldfornStage.loadChoices()">Make Your Choice →</button></div>';
    updateHeader(); narrate(wb);
    state._pendingChoices = await getActorChoices(a);
  }

  async function loadChoices() {
    var el=document.getElementById('choicesContainer'); if(!el) return;
    var ch=state._pendingChoices||[], a=state.currentActor;
    if (!ch.length && a) ch = await getActorChoices(a);
    var silence = { text:'Say nothing.', subtext:a.isMortal?'Let the silence speak for itself.':'Let the god interpret your silence.', glyph:'🌫️', trait:getLeadingTrait(), outcome:getSilenceOutcome(a) };
    var all = ch.concat([silence]);
    el.innerHTML = all.map(function(c,i){
      var isSil = i===all.length-1;
      return '<button class="stage-choice'+(isSil?' silence-choice':'')+'" onclick="EaldfornStage.makeChoice(\''+(c.trait||'unknown')+'\',\''+escapeHTML(c.outcome||'')+'\',\''+(a?a.name||'':'')+'\',\''+(a?a.glyph||'':'')+'\','+isSil+')"><span class="choice-glyph">'+(c.glyph||'◈')+'</span><span class="choice-text">'+(c.text||'Act')+'</span>'+(c.subtext?'<span class="choice-subtext">'+c.subtext+'</span>':'')+'<span class="choice-hint">+'+(c.trait||'?')+(isSil?' (½)':'')+'</span></button>';
    }).join('');
  }

  function getSilenceOutcome(a) {
    if (a.isMortal) {
      var mortalSilences = {
        'tavern-wench': 'She nods slowly, as if you\'ve said something important. She slides a drink across the bar anyway. Some silences need company.',
        'wrixl-witch': 'She cackles. "Silence! The best answer. The stones taught you well." She leaves a bundle on the table. You don\'t open it.',
        'lord-of-bones': 'He stands in the quiet like he was born in it. After a long moment, he touches the wall where the names are carved. "I understand," he says. And leaves.',
        'mysterious-stranger': 'They smile — a real smile, not the one they wear at the gate. "You\'re learning. Silence is the only language the truth speaks."',
        'fell-folk': 'The wild ones do not speak. Neither do you. The silence between you is older than words. They bow their heads and fade into the mist.',
        'gilded-merchant': 'He waits. You wait. The silence stretches. Finally he laughs — a genuine laugh, not his merchant\'s laugh. "No one ever just... doesn\'t speak. I like you."'
      };
      return mortalSilences[a.name] || 'They wait. You do not speak. The silence itself becomes the conversation.';
    }
    var o = {
      Zeus:'The Thunderer waits. "Few mortals understand the weight of silence. You do."',
      Hera:'She watches you. "You refuse to perform. That is... unexpected."',
      Poseidon:'The god of the deep listens to your silence as if it were a language.',
      Athena:'She tilts her head. "Silence is a strategy. I respect strategy."',
      Apollo:'"Even silence is a kind of prophecy."',
      Artemis:'She does not press. The huntress knows the value of stillness.',
      Hephaestus:'He grunts. "Not a talker. Good. Neither am I."',
      Aphrodite:'She smiles. "You do not need to speak for me to see you."',
      Ares:'He snorts. "Silence. I will assume thinking."',
      Hermes:'He laughs. "No message? No bargain?"',
      Demeter:'She kneels beside you in the quiet. The earth breathes.',
      Persephone:'She takes your hand. This silence is the good kind.'
    };
    return o[a.name]||'The visitor waits. You do not speak. The silence itself becomes the answer.';
  }

  // ═══ CHOICE ═══
  function makeChoice(trait, outcome, actorName, actorGlyph, isSilence) {
    var pts = isSilence ? 0.5 : 1;
    state.traits[trait] = (state.traits[trait]||0) + pts;
    if (!isSilence) {
      var pool = MEMORY_TEMPLATES[trait]||['Something has changed.'];
      state.memoryCards.push(pool[Math.floor(Math.random()*pool.length)]);
      if (state.memoryCards.length > 6) state.memoryCards.shift();
    }
    checkTension();
    for (var i=state.curtainActors.length-1; i>=0; i--) { if (state.curtainActors[i].name===actorName && !state.curtainActors[i].trait) { state.curtainActors[i].trait=trait; break; } }
    state.chronicle.push({ scene:state.scene, actor:actorName, glyph:actorGlyph, trait:trait, outcome:outcome, silence:isSilence });

    var c=document.getElementById('stageContainer');
    var tensionNote = state.traitTensions.length ? '<div class="trait-tension">⚡ '+state.traitTensions[state.traitTensions.length-1].message+'</div>' : '';
    c.innerHTML =
      '<div class="scene-outcome"><span class="actor-glyph" style="color:'+(state.currentActor?state.currentActor.color:'#c9a84c')+'">'+actorGlyph+'</span> <span class="actor-name">'+actorName+':</span> "'+outcome+'"</div>'+
      '<div class="trait-gain">Trait: <span class="trait-name">+'+trait+(isSilence?' (½)':'')+'</span> · A:'+(state.traits.authority||0)+' W:'+(state.traits.wisdom||0)+' Co:'+(state.traits.courage||0)+' Cu:'+(state.traits.cunning||0)+' D:'+(state.traits.devotion||0)+'</div>'+tensionNote;
    document.getElementById('choicesContainer').innerHTML='';
    updateChronicle(); narrate(outcome);

    if (!script.loopMode && state.scene >= state.maxScenes) {
      setTimeout(curtainCall, 2500);
    } else {
      document.getElementById('choicesContainer').innerHTML='<button class="stage-btn" onclick="EaldfornStage.nextScene()">'+(script.loopMode?'Another Visitor Arrives →':'Continue the Tale →')+'</button>';
    }
  }

  async function nextScene() { document.getElementById('choicesContainer').innerHTML=''; await renderScene(); }

  // ═══ CURTAIN (only for non-loop mode) ═══
  function curtainCall() {
    var dominant='authority', highest=0;
    Object.keys(state.traits).forEach(function(t){ if((state.traits[t]||0)>highest){ highest=state.traits[t]; dominant=t; } });
    var ending = script.endings ? script.endings[dominant] : 'Your tale is complete.';

    var reactionsHtml = state.curtainActors.map(function(a){
      if (a.isMortal) {
        return '<div class="curtain-god-card"><span class="reaction-glyph">'+a.glyph+'</span> <span class="reaction-name">'+a.name+'</span> — They departed. The fire remembers them.</div>';
      }
      var r = CURTAIN_REACTIONS[a.name] ? (CURTAIN_REACTIONS[a.name][a.trait||dominant]||'They departed.') : 'They departed.';
      return '<div class="curtain-god-card"><span class="reaction-glyph">'+a.glyph+'</span> <span class="reaction-name">'+a.name+'</span> — '+r+'</div>';
    }).join('');

    var c=document.getElementById('stageContainer');
    c.innerHTML =
      '<div class="scene-curtain"><div class="curtain-title">✦ Curtain Call ✦</div><div class="curtain-subtitle">'+script.title+' — Complete</div>'+
      '<div class="curtain-ending">'+ending+'</div>'+
      '<div class="curtain-traits">Dominant: <span class="trait-name">'+dominant.toUpperCase()+'</span><br>A:'+(state.traits.authority||0)+' W:'+(state.traits.wisdom||0)+' Co:'+(state.traits.courage||0)+' Cu:'+(state.traits.cunning||0)+' D:'+(state.traits.devotion||0)+'</div>'+
      (reactionsHtml?'<div class="curtain-reactions">'+reactionsHtml+'</div>':'')+
      '<div class="curtain-actions"><button class="stage-btn" onclick="EaldfornStage.restart()">Play Again</button><a href="index.html" class="stage-btn">Return to Playbill</a></div></div>';
    document.getElementById('choicesContainer').innerHTML='';
    narrate(ending);
  }

  function restart() {
    state.scene=0; state.currentActor=null; state.visitedActors=[]; state.returnedActors=[]; state.visitCounts={};
    state.chronicle=[]; state.memoryCards=[]; state.traits={}; state.worldBeatIndex=0; state.traitTensions=[];
    state.curtainActors=[]; state.mortalInterludePending=false; state.lastMortalIndex=-1;
    if (script.player && script.player.traits) state.traits = JSON.parse(JSON.stringify(script.player.traits));
    else state.traits = { authority:0, wisdom:0, courage:0, cunning:0, devotion:0 };
    document.getElementById('chronicleBody').innerHTML='<div class="chronicle-empty">The chronicle awaits...</div>';
    renderPrologue();
  }

  // ═══ UI ═══
  function updateHeader() {
    var b=document.getElementById('sceneBadge');
    if (b) b.textContent = script.loopMode ? 'Visit ' + state.scene : 'Scene '+state.scene+'/'+state.maxScenes;
    var t=document.getElementById('headerTitle'); if(t) t.textContent=script.title||'Ealdforn Stage';
  }
  function updateChronicle() {
    var b=document.getElementById('chronicleBody'); if(!b) return;
    if (!state.chronicle.length) { b.innerHTML='<div class="chronicle-empty">The chronicle awaits...</div>'; return; }
    b.innerHTML = state.chronicle.map(function(e){ return '<div class="chronicle-entry"><span class="c-scene">'+(script.loopMode?'V':'S')+e.scene+'</span> <span class="c-actor">'+(e.glyph||'')+' '+e.actor+'</span>: '+e.outcome.substring(0,80)+'... <span class="c-trait">(+'+e.trait+(e.silence?'½':'')+')</span></div>'; }).join('');
    b.scrollTop=b.scrollHeight;
  }
  function escapeHTML(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init:init, nextScene:nextScene, loadChoices:loadChoices, makeChoice:makeChoice, restart:restart };
})();

document.addEventListener('DOMContentLoaded',function(){ EaldfornStage.init(); });
