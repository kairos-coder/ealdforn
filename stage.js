// ============================================
// EALDFORN STAGE v3.0 — The Player
// ============================================
// Matches actual cards/ folder structure:
//   cards/authority.json, wisdom.json, courage.json,
//   cunning.json, devotion.json, ghost.json, domain/*.json
// Single tone file: cards/{tone}.json (keyed object or flat array)
// Falls back to standard trait + domain pools if no tone file.
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

  // ═══ CURTAIN REACTIONS ═══
  var CURTAIN_REACTIONS = {
    Zeus: { authority:'He left a thunderbolt frozen in the stone above your door.', wisdom:'He asked a question as he departed. You are still thinking about it.', courage:'He did not smile. But he did not strike.', cunning:'He laughed — once, sharp. "You would have made a terrible king. You would have made an excellent advisor."', devotion:'He bowed his head. Just slightly. The King of Gods, bowing to a Warden.' },
    Hera: { authority:'She straightened a tapestry on her way out.', wisdom:'She left a book on the table. It was not there before.', courage:'She touched your shoulder. "You remind me of someone I respected."', cunning:'She smiled — the real one. "Well played."', devotion:'She wept. Just one tear. It froze on the stone.' },
    Poseidon: { authority:'He calmed the sea for your fishing boats.', wisdom:'He showed you what the tide had hidden.', courage:'"The deep did not frighten you. It should have."', cunning:'He gave you a shell that whispers secrets.', devotion:'He returned something the sea took. It was personal.' },
    Demeter: { authority:'She made the garden bloom. In winter.', wisdom:'She taught you the name of every plant in the courtyard.', courage:'She stood with you in the frost.', cunning:'She left seeds that only grow in secret.', devotion:'She cried. The soil will remember.' },
    Athena: { authority:'She left an owl feather on your desk.', wisdom:'She answered the question you were too afraid to ask.', courage:'"You thought clearly under pressure."', cunning:'She smiled. "You planned for this."', devotion:'She bowed. Athena bows to no one.' },
    Apollo: { authority:'He sang one note. The keep hummed with it for hours.', wisdom:'He told you a prophecy. You will carry it alone.', courage:'"You faced the dark. The dark remembers."', cunning:'He laughed. "You tricked prophecy itself."', devotion:'He played his lyre for the dead. They listened.' },
    Artemis: { authority:'She marked a tree outside your wall with an arrow.', wisdom:'She showed you a trail you had never seen.', courage:'She nodded once. Hunters understand each other.', cunning:'She left a snare at your door.', devotion:'She released a white stag into the forest.' },
    Hephaestus: { authority:'He fixed the lock on the chest without being asked.', wisdom:'He showed you how the keep\'s foundations were laid.', courage:'He worked through the night beside you.', cunning:'He forged a key that opens one door.', devotion:'He left his hammer.' },
    Aphrodite: { authority:'She told you that you are more beautiful than you know.', wisdom:'She showed you who in the village is in love.', courage:'"Loving something that might leave is the bravest thing."', cunning:'She kissed your cheek. "That will fade. Use the memory."', devotion:'She wept. Aphrodite does not weep for mortals.' },
    Ares: { authority:'He saluted. A warrior\'s salute.', wisdom:'"You think before you fight."', courage:'He clasped your arm. "You would have stood."', cunning:'He grinned. "You fight with your head."', devotion:'He knelt. Ares knelt.' },
    Hermes: { authority:'He left a coin on the windowsill. Blank on both sides.', wisdom:'He told you a secret about the next town over.', courage:'He raced the wind on your behalf.', cunning:'He winked. "We should do business again."', devotion:'He delivered your message to the dead.' },
    Persephone: { authority:'She left a pomegranate on the chest. Unsplit.', wisdom:'She told you a name no one living knows.', courage:'She kissed your forehead. It was cold. It was kind.', cunning:'She laughed. "You bargained with the dead and won."', devotion:'She took the names. All of them. And thanked you.' }
  };

  var MEMORY_TEMPLATES = {
    authority: ['You named yourself. The word has not left the room since.','You held the door. The hall still carries the echo of that refusal.','The compact is still yours. You said so, and it became true.'],
    wisdom: ['You asked the right question. The answer is still reshaping things inside you.','You know something now that changes the shape of everything before it.','A god told you a truth. You have been carrying it quietly ever since.'],
    courage: ['You were afraid and stayed anyway. The keep has not forgotten that.','A god was surprised by you. That is rarer than it sounds.','You stood at an edge and did not step back.'],
    cunning: ['You gave away something worthless and received something valuable.','A god left satisfied with the wrong thing. This is your doing.','Hermes has been in the world for a very long time. You still surprised him.'],
    devotion: ['You gave something back. The lightness afterward was unexpected.','The released thing is gone. You keep reaching for it and finding only air.','You let go. The keep is different for it. So are you.']
  };

  // ═══ INIT ═══
  async function init() {
    var params = new URLSearchParams(window.location.search);
    var scriptId = params.get('script') || 'bastard-of-helm-hallen';
    var setId = params.get('set') || 'storm-coast';
    var castIds = params.get('cast') || 'olympians';

    console.log('🎭 Ealdforn Stage v3.0 — Raising the curtain...');
    try {
      var r = await fetch('script/' + scriptId + '.json');
      script = await r.json();
      state.maxScenes = script.maxScenes || 6;
      state.tone = script.tone || 'original';
      document.title = script.title + ' — Ealdforn Stage';
      if (script.voice) { voiceParams.rate = script.voice.rate||voiceParams.rate; voiceParams.pitch = script.voice.pitch||voiceParams.pitch; voiceParams.pauseBetweenSentences = script.voice.pause_between_sentences||voiceParams.pauseBetweenSentences; }
      console.log('   ✓ Script:', script.title, '· Tone:', state.tone);
    } catch (e) { renderError('Script not found: ' + scriptId); return false; }

    try {
      var sr = await fetch('set/' + setId + '.json');
      set = await sr.json();
    } catch (e) { set = { name:'Unknown Stage', weather:['The air is still.'], worldBeats:['The world waits.'], atmosphere:'storm-coast.jpg' }; }
    applySetBackground();

    var castList = castIds.split(',');
    for (var i = 0; i < castList.length; i++) {
      try { var cr = await fetch('actors/' + castList[i].trim() + '.json'); var ad = await cr.json(); Object.keys(ad).forEach(function(k){ cast[k]=ad[k]; }); } catch(e){}
    }

    if (script.mortalCast && script.mortalCast.length > 0) {
      try { var mr = await fetch('actors/mortals.json'); mortals = await mr.json(); } catch(e){}
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

    // Domain
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

    return sel.slice(0,3).map(function(c){ return { text:c.text, subtext:c.subtext||'', glyph:c.glyph||'◈', trait:c.trait, outcome:c.outcome||'The god regards you for a long moment, then turns and is gone.' }; });
  }

  // ═══ IMAGES ═══
  function applySetBackground() {
    var m = document.querySelector('.stage-main'); if(!m) return;
    m.style.backgroundImage = 'url(images/sets/'+(set.atmosphere||'storm-coast.jpg')+')';
    m.style.backgroundSize='cover'; m.style.backgroundPosition='center'; m.style.backgroundAttachment='fixed';
  }
  function getActorImage(a) { return a.image ? 'images/actors/'+a.image : pollinationsFallback(a); }
  function getMortalImage(m) { return m.image ? 'images/mortals/'+m.image : null; }
  function pollinationsFallback(a) {
    return 'https://image.pollinations.ai/prompt/'+encodeURIComponent('dark fantasy, '+(a.aspect||'mythic')+' god '+(a.name||'')+', '+(a.domain||'')+', cinematic, oil painting, portrait, 4k')+'?width=1024&height=768&seed='+Math.floor(Math.random()*99999)+'&nologo=true';
  }

  // ═══ ACTORS ═══
  function drawActor() {
    var names = Object.keys(cast).filter(function(n){ return cast[n].domain; });
    if (!names.length) return null;
    var unvisited = names.filter(function(n){ return state.visitedActors.indexOf(n)===-1; });
    var pool = unvisited.length ? unvisited : names;
    var drawn = pool[Math.floor(Math.random()*pool.length)];
    state.visitCounts[drawn] = (state.visitCounts[drawn]||0)+1;
    if (state.visitedActors.indexOf(drawn)>-1) state.returnedActors.push(drawn);
    state.currentActor = cast[drawn]; state.currentActor.name = drawn;
    state.visitedActors.push(drawn);
    state.curtainActors.push({ name:drawn, glyph:state.currentActor.glyph||'◈', color:state.currentActor.color||'#c9a84c', domain:state.currentActor.domain, trait:null });
    return state.currentActor;
  }
  function isReturn(n) { return (state.visitCounts[n]||0)>1; }
  function drawMortal() {
    var names = Object.keys(mortals); if (!names.length) return null;
    var avail = names.filter(function(n,i){ return i!==state.lastMortalIndex; });
    if (!avail.length) avail = names;
    var drawn = avail[Math.floor(Math.random()*avail.length)];
    state.lastMortalIndex = names.indexOf(drawn);
    return mortals[drawn];
  }

  function getWorldBeat() {
    if (set.worldBeats && state.worldBeatIndex < set.worldBeats.length) return set.worldBeats[state.worldBeatIndex++];
    return set.worldBeats ? set.worldBeats[set.worldBeats.length-1] : 'The world holds its breath.';
  }
  function getWeather() { return (set.weather&&set.weather.length) ? set.weather[Math.floor(Math.random()*set.weather.length)] : ''; }

  function getGreeting(a) {
    var g = {
      authority:['I have watched you from the peak of Olympus.','The blood of kings runs thin in you. But it runs.','You sit in a forgotten keep. And yet — you are interesting.'],
      order:['This keep is in chaos. I can help you order it.','Structure. Without it, you are just a soul in a crumbling castle.'],
      depths:['The sea has secrets. So do you.','The tide brought me here. It always brings me where something is about to change.'],
      harvest:['The earth here is tired. I can wake it.','You look hungry. When did you last eat something grown in your own soil?'],
      wisdom:['I have a question for you.','Knowledge is the only inheritance that cannot be stolen.'],
      light:['The sun still rises on this place. That is my doing.','Prophecy is not prediction. It is pattern.'],
      hunt:['Something is tracking you.','I have been watching you watch the forest.'],
      forge:['Your walls are weak. I can fix both.','I looked at your armory. It made me angry.'],
      beauty:['You are more compelling than you know.','Love is everywhere in this keep.'],
      war:['I smell blood.','Fight me. Right now. Show me what you are.'],
      messengers:['I have a message for you.','Quick — what do you need delivered?'],
      underworld:['The dead in this keep are not resting. They are waiting.','Winter always comes. But spring always follows.']
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
    var a=drawActor(); if(!a){ renderError('No actors.'); return; }
    var wb=getWorldBeat(), ret=isReturn(a.name);
    if (state.memoryCards.length) wb = '<span class="scene-memory">'+state.memoryCards[state.memoryCards.length-1]+'</span> '+wb;

    var arrival = '';
    if (ret && a.return_entrance) arrival = a.return_entrance[Math.floor(Math.random()*a.return_entrance.length)];
    else if (a.scenes && a.scenes.arrival && a.scenes.arrival.length) arrival = a.scenes.arrival[Math.floor(Math.random()*a.scenes.arrival.length)];
    else if (a.entrance) arrival = a.entrance;
    else arrival = 'appears before you, unmistakably divine.';
    if (ret && arrival.indexOf('return')===-1) arrival = 'returns — '+arrival;

    c.innerHTML =
      '<div class="scene-image"><img src="'+getActorImage(a)+'" alt="'+a.name+'" onerror="this.parentElement.innerHTML=\'<div class=img-placeholder>'+a.name+' arrives...</div>\'"></div>'+
      '<div class="scene-world"><div class="scene-location">'+(set.name||'The Stage')+' · Scene '+state.scene+'/'+state.maxScenes+(ret?' <span class="return-badge">Return</span>':'')+'</div><div class="scene-weather">'+getWeather()+'</div></div>'+
      '<div class="scene-narration">'+wb+'</div>'+
      '<div class="scene-arrival"><span class="actor-glyph" style="color:'+(a.color||'#c9a84c')+'">'+(a.glyph||'◈')+'</span> <span class="actor-name" style="color:'+(a.color||'#c9a84c')+'">'+a.name+'</span>, <span class="actor-domain">god of '+(a.domain||'the unknown')+'</span>, '+arrival+'.</div>'+
      '<div class="scene-speech">"'+getGreeting(a)+'"</div>'+
      '<div class="scene-actions"><button class="stage-btn" onclick="EaldfornStage.loadChoices()">Make Your Choice →</button></div>';
    updateHeader(); narrate(wb);
    state._pendingChoices = await getActorChoices(a);
    if (script.mortalCast && script.mortalCast.length && Object.keys(mortals).length && state.scene < state.maxScenes) state.mortalInterludePending = true;
  }

  async function loadChoices() {
    var el=document.getElementById('choicesContainer'); if(!el) return;
    var ch=state._pendingChoices||[], a=state.currentActor;
    if (!ch.length && a) ch = await getActorChoices(a);
    var silence = { text:'Say nothing.', subtext:'Let the god interpret your silence.', glyph:'🌫️', trait:getLeadingTrait(), outcome:getSilenceOutcome(a) };
    var all = ch.concat([silence]);
    el.innerHTML = all.map(function(c,i){
      var isSil = i===all.length-1;
      return '<button class="stage-choice'+(isSil?' silence-choice':'')+'" onclick="EaldfornStage.makeChoice(\''+(c.trait||'unknown')+'\',\''+escapeHTML(c.outcome||'')+'\',\''+(a?a.name||'':'')+'\',\''+(a?a.glyph||'':'')+'\','+isSil+')"><span class="choice-glyph">'+(c.glyph||'◈')+'</span><span class="choice-text">'+(c.text||'Act')+'</span>'+(c.subtext?'<span class="choice-subtext">'+c.subtext+'</span>':'')+'<span class="choice-hint">+'+(c.trait||'?')+(isSil?' (½)':'')+'</span></button>';
    }).join('');
  }

  function getSilenceOutcome(a) {
    var o = {
      Zeus:'The Thunderer waits. You do not speak. The silence stretches — and then he nods, slowly. "Few mortals understand the weight of silence. You do."',
      Hera:'She watches you with unreadable eyes. "You refuse to perform. That is... unexpected."',
      Poseidon:'The god of the deep listens to your silence as if it were a language. The tide withdraws.',
      Athena:'She tilts her head. "Silence is a strategy. I respect strategy."',
      Apollo:'"Even silence is a kind of prophecy. It foretells nothing. And everything."',
      Artemis:'She does not press. The huntress knows the value of stillness.',
      Hephaestus:'He grunts. "Not a talker. Good. Neither am I."',
      Aphrodite:'She smiles — not the dazzling smile, but something quieter. "You do not need to speak for me to see you."',
      Ares:'He snorts. "Silence. Either you are a coward or you are thinking. I will assume thinking."',
      Hermes:'He laughs — but it is not unkind. "No message? No bargain?"',
      Demeter:'She kneels beside you in the quiet. The earth breathes.',
      Persephone:'She takes your hand. This silence is the good kind.'
    };
    return o[a.name]||'The god waits. You do not speak. The silence itself becomes the answer.';
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

    if (state.mortalInterludePending && state.scene < state.maxScenes) { state.mortalInterludePending=false; setTimeout(renderMortalInterlude, 1500); }
    else if (state.scene >= state.maxScenes) { setTimeout(curtainCall, 2500); }
    else { document.getElementById('choicesContainer').innerHTML='<button class="stage-btn" onclick="EaldfornStage.nextScene()">Continue the Tale →</button>'; }
  }

  function renderMortalInterlude() {
    var m=drawMortal(); if(!m){ nextSceneFromInterlude(); return; }
    var reaction = m.reactions ? m.reactions[getLeadingTrait()]||'' : '';
    var img = getMortalImage(m);
    var c=document.getElementById('stageContainer');
    c.innerHTML =
      (img?'<div class="scene-image mortal-image"><img src="'+img+'" alt="'+m.name+'" onerror="this.style.display=\'none\'"></div>':'')+
      '<div class="scene-narration"><span class="mortal-label">A voice from Glimthaven</span></div>'+
      '<div class="scene-arrival"><span class="mortal-glyph">'+(m.glyph||'')+'</span> <span class="mortal-name">'+m.name+'</span>, <span class="mortal-role">'+m.role+'</span></div>'+
      '<div class="scene-speech">"'+m.greetings[Math.floor(Math.random()*m.greetings.length)]+'"</div>'+
      (reaction?'<div class="scene-outcome"><span class="mortal-reaction">'+reaction+'</span></div>':'')+
      '<div class="scene-actions"><button class="stage-btn" onclick="EaldfornStage.nextScene()">Continue the Tale →</button></div>';
    document.getElementById('choicesContainer').innerHTML='';
  }

  function nextSceneFromInterlude() { document.getElementById('choicesContainer').innerHTML=''; renderScene(); }
  async function nextScene() { document.getElementById('choicesContainer').innerHTML=''; await renderScene(); }

  // ═══ CURTAIN ═══
  function curtainCall() {
    var dominant='authority', highest=0;
    Object.keys(state.traits).forEach(function(t){ if((state.traits[t]||0)>highest){ highest=state.traits[t]; dominant=t; } });
    var ending = script.endings ? script.endings[dominant] : 'Your tale is complete.';

    var reactionsHtml = state.curtainActors.map(function(a){
      var r = CURTAIN_REACTIONS[a.name] ? (CURTAIN_REACTIONS[a.name][a.trait||dominant]||'They departed.') : 'They departed.';
      return '<div class="curtain-god-card"><span class="reaction-glyph">'+a.glyph+'</span> <span class="reaction-name">'+a.name+'</span> — '+r+'</div>';
    }).join('');

    var tensionNote = state.traitTensions.length ? '<div class="curtain-tension">The gods noticed your contradictions. '+state.traitTensions.map(function(t){return t.message;}).join(' ')+'</div>' : '';

    var c=document.getElementById('stageContainer');
    c.innerHTML =
      '<div class="scene-curtain"><div class="curtain-title">✦ Curtain Call ✦</div><div class="curtain-subtitle">'+script.title+' — Complete</div>'+
      '<div class="curtain-ending">'+ending+'</div>'+tensionNote+
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
  function updateHeader() { var b=document.getElementById('sceneBadge'); if(b) b.textContent='Scene '+state.scene+'/'+state.maxScenes; var t=document.getElementById('headerTitle'); if(t) t.textContent=script.title||'Ealdforn Stage'; }
  function updateChronicle() {
    var b=document.getElementById('chronicleBody'); if(!b) return;
    if (!state.chronicle.length) { b.innerHTML='<div class="chronicle-empty">The chronicle awaits...</div>'; return; }
    b.innerHTML = state.chronicle.map(function(e){ return '<div class="chronicle-entry"><span class="c-scene">S'+e.scene+'</span> <span class="c-actor">'+(e.glyph||'')+' '+e.actor+'</span>: '+e.outcome.substring(0,80)+'... <span class="c-trait">(+'+e.trait+(e.silence?'½':'')+')</span></div>'; }).join('');
    b.scrollTop=b.scrollHeight;
  }
  function escapeHTML(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init:init, nextScene:nextScene, loadChoices:loadChoices, makeChoice:makeChoice, restart:restart };
})();

document.addEventListener('DOMContentLoaded',function(){ EaldfornStage.init(); });
