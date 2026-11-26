/* Original score “Quaigroove”, 106 BPM / 32 bars, rendered locally.
   Vehicle layers are original procedural sound, not recordings or a driving assessment. */
window.H3Audio=(()=>{
 'use strict';
 let ctx=null,musicBus=null,effectsBus=null,music=null,musicPlaying=false,musicPauseTimer=null,musicToken=0;
 let speechEnabled=true,musicEnabled=true,effectsEnabled=true,playRequested=false,unlocked=false,scenePaused=false;
 let voice=null,speechToken=0,ducked=false,musicVolume=.45,speechVolume=.85,effectsVolume=.55;
 let noiseBuffer=null,engineBuffers=null,starterBuffer=null,engine=null,vehicle=null,pendingStarter=false,lastVehicleTime=0;
 const clipKeys=new Set(['city_female','city_male',...(window.H3Chats?.clipKeys||[]),...(window.H3_DATA?.missions||[]).flatMap(m=>['brief_'+m.id,m.id+'_intro',...m.dialogue.map(q=>m.id+'_'+q.id)])]);
 // Newly directed recordings already have their intended pace baked in.
 const directedClips=new Set(['stadttermin_intro','stadttermin_mobility','stadttermin_preparation','stadttermin_return','augenpraxis_intro','augenpraxis_mobility','augenpraxis_preparation','augenpraxis_escort']);
 const brief=m=>`Dein Auftrag: Hole ${m.patient.name} am Ort ${m.pickup.label} ab und begleite die Person zum ${m.dropoff.label}. Kläre zuerst im Gespräch den Unterstützungsbedarf und die Mitgaben, prüfe dann ein passendes Fahrzeug in der Stadt und schliesse die Fahrt mit einer persönlichen Übergabe ab.`;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0)),carMode=()=>vehicle?.mode==='car';
 const wantedMusic=()=>unlocked&&playRequested&&musicEnabled&&!carMode();
 const wantedEffects=()=>unlocked&&playRequested&&effectsEnabled&&carMode();
 const set=(p,v,tau=.12)=>{if(!p||!ctx)return;p.cancelScheduledValues(ctx.currentTime);p.setTargetAtTime(v,ctx.currentTime,tau)};
 function makeBuffers(){
  const rate=22050,length=rate*2;noiseBuffer=ctx.createBuffer(1,length,rate);const noise=noiseBuffer.getChannelData(0);let seed=1609;
  for(let k=0;k<length;k++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[k]=(seed/4294967296)*2-1}
  // Blend the seam to avoid a two-second click in continuous wind/road layers.
  const seam=440;for(let k=0;k<seam;k++){const f=k/seam;noise[length-seam+k]=noise[length-seam+k]*(1-f)+noise[k]*f}
  engineBuffers={};
  for(const diesel of [false,true]){const b=ctx.createBuffer(1,length,rate),a=b.getChannelData(0),hz=diesel?24:27;
   for(let k=0;k<length;k++){const t=k/rate,p=2*Math.PI*hz*t,body=Math.sin(p)*.45+Math.sin(p*2)*.25+Math.sin(p*3)*.12+Math.sin(p*.5)*.12,pulse=Math.pow(Math.max(0,Math.sin(p)),diesel?12:7);a[k]=body*.47+noise[k]*pulse*(diesel?.22:.11)+Math.sin(p*5)*.045;}
   engineBuffers[diesel?'diesel':'petrol']=b;
  }
  const electric=ctx.createBuffer(1,length,rate),ev=electric.getChannelData(0);for(let k=0;k<length;k++){const t=k/rate;ev[k]=Math.sin(2*Math.PI*110*t)*.12+Math.sin(2*Math.PI*220*t)*.035;}engineBuffers.electric=electric;
  starterBuffer=ctx.createBuffer(1,Math.round(rate*.48),rate);const a=starterBuffer.getChannelData(0);
  for(let k=0;k<a.length;k++){const t=k/rate,e=Math.sin(Math.PI*k/a.length);a[k]=e*(Math.sin(2*Math.PI*(38*t+46*t*t))*.25*(.6+.4*Math.sin(t*113)**2)+noise[k%length]*.05);}
 }
 function getCtx(){if(ctx)return ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;ctx=new AC();musicBus=ctx.createGain();effectsBus=ctx.createGain();musicBus.gain.value=effectsBus.gain.value=0;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=14;limiter.ratio.value=4;musicBus.connect(limiter);effectsBus.connect(limiter);limiter.connect(ctx.destination);makeBuffers();return ctx;}
 function ensureMusic(){if(music)return;music=new Audio(window.cityAsset('h3music_quai_groove.wav'));music.loop=true;music.preload='auto';music.volume=1;
  if(ctx.createMediaElementSource){ctx.createMediaElementSource(music).connect(musicBus);music._throughBus=true;}
 }
 function fade(){const mg=wantedMusic()?musicVolume*.85*(ducked?.16:1):0;set(musicBus?.gain,mg,.18);if(music&&!music._throughBus)music.volume=mg;set(effectsBus?.gain,wantedEffects()?effectsVolume*(ducked?.16:1)*(scenePaused?.14:1):0,.10);}
 function cancelMusicPause(){if(musicPauseTimer!==null){clearTimeout(musicPauseTimer);musicPauseTimer=null}}
 function syncMusic(immediate=false){
  fade();if(wantedMusic()){ensureMusic();fade();cancelMusicPause();if(!musicPlaying){musicPlaying=true;const token=++musicToken;music.play().catch(()=>{if(token===musicToken)musicPlaying=false})}return;}
  if(!music)return;if(immediate){cancelMusicPause();music.pause();musicPlaying=false;musicToken++;return;}
  if(musicPlaying&&musicPauseTimer===null){musicPauseTimer=setTimeout(()=>{musicPauseTimer=null;if(!wantedMusic()){music.pause();musicPlaying=false;musicToken++;}},400);}
 }
 function cleanupGroup(g){if(!g||g.cleaned)return;g.cleaned=true;for(const n of g.nodes){try{n.disconnect()}catch{}}}
 function stopEngine(immediate=false){if(!engine)return;const old=engine;engine=null;set(old.master.gain,0,immediate?.025:.06);for(const src of old.sources){try{src.stop(ctx.currentTime+(immediate?.04:.16))}catch{}}}
 function starter(g){const src=ctx.createBufferSource(),v=ctx.createGain(),f=ctx.createBiquadFilter();src.buffer=starterBuffer;f.type='lowpass';f.frequency.value=900;v.gain.value=.34;src.connect(f);f.connect(v);v.connect(g.master);g.nodes.push(src,v,f);g.sources.push(src);src.start();src.onended=()=>{src.disconnect();v.disconnect();f.disconnect()};}
 function startEngine(){if(engine||!wantedEffects())return;const electric=vehicle.vehicleType==='scooter',diesel=!['taxi','volunteer','civil','scooter'].includes(vehicle.vehicleType),g={electric,diesel,gear:0,rpm:diesel?720:810,nodes:[],sources:[],cleaned:false};
  g.master=ctx.createGain();g.master.gain.value=0;g.master.connect(effectsBus);g.nodes.push(g.master);set(g.master.gain,1,.12);
  function layer(buffer,type,hz,amount){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=hz;filter.Q.value=.5;gain.gain.value=amount;source.connect(filter);filter.connect(gain);gain.connect(g.master);g.nodes.push(source,filter,gain);g.sources.push(source);source.start();return{source,filter,gain};}
  g.motor=layer(engineBuffers[electric?'electric':diesel?'diesel':'petrol'],'lowpass',electric?1200:diesel?650:820,electric?.035:.34);
  g.road=layer(noiseBuffer,'lowpass',850,0);g.air=layer(noiseBuffer,'highpass',1800,0);
  let remaining=g.sources.length;for(const source of g.sources)source.onended=()=>{if(--remaining<=0)cleanupGroup(g)};
  engine=g;if(pendingStarter){if(!electric)starter(g);pendingStarter=false;}updateEngine();fade();
 }
 function updateEngine(){if(!engine||!vehicle)return;const g=engine,diesel=g.diesel,speed=scenePaused?0:clamp(vehicle.speed,0,90),acceleration=scenePaused?0:vehicle.acceleration||0;
  if(g.electric){g.rpm=speed*70;g.gear=0;set(g.motor.source.playbackRate,.65+speed/22,.18);set(g.motor.gain.gain,speed>0?.025+speed*.0015:0,.16);set(g.road.gain.gain,Math.pow(speed/30,1.2)*.07,.25);set(g.road.filter.frequency,550+speed*24,.2);set(g.air.gain.gain,Math.pow(speed/30,1.6)*.035,.25);return;}
  const bounds=diesel?[0,16,30,46]:[0,18,34,52];
  while(g.gear<3&&speed>bounds[g.gear+1]+.6)g.gear++;while(g.gear>0&&speed<bounds[g.gear]-3.5)g.gear--;
  const idle=diesel?720:810,base=g.gear===0?0:diesel?650:800,rpm=clamp(idle+base+(speed-bounds[g.gear])*(diesel?72:91)+Math.max(0,acceleration)*(diesel?80:110),idle,diesel?3300:4200);g.rpm=rpm;
  set(g.motor.source.playbackRate,rpm/idle,.17);set(g.motor.filter.frequency,(diesel?480:580)+rpm*.20+Math.max(0,acceleration)*65,.15);
  set(g.motor.gain.gain,(diesel?.35:.29)+Math.min(speed/90,.18)+Math.max(0,acceleration)*.018,.12);
  set(g.road.gain.gain,Math.pow(speed/90,1.15)*.12,.25);set(g.road.filter.frequency,450+speed*25,.2);set(g.air.gain.gain,Math.pow(speed/90,1.8)*.10,.32);
 }
 function reconcile(){syncMusic();if(wantedEffects())startEngine();else stopEngine();updateEngine();fade();}
 async function unlock(){try{const c=getCtx();if(!c)return false;await c.resume();unlocked=c.state==='running';reconcile();return unlocked}catch{return false}}
 function setMusic(value){musicEnabled=!!value;syncMusic(!musicEnabled)}
 function setSpeech(value){speechEnabled=!!value;if(!speechEnabled)stopSpeech()}
 function setEffects(value){effectsEnabled=!!value;if(!effectsEnabled){pendingStarter=false;stopEngine(true)}else reconcile();fade()}
 function pauseMusic(){playRequested=false;stopEngine(true);syncMusic(true);fade()}
 function resumeMusic(){playRequested=true;reconcile()}
 function setScenePaused(value){scenePaused=!!value;updateEngine();fade()}
 function updateVehicle(info){
  const previous=vehicle,now=ctx?.currentTime||0;
  if(!info||info.mode!=='car'){vehicle=null;pendingStarter=false;lastVehicleTime=now;reconcile();return;}
  const speed=info.stationary?0:clamp(info.speed,0,90),same=previous&&previous.vehicleId===info.vehicleId&&previous.vehicleType===(info.vehicleType||'taxi'),dt=Math.max(.06,now-lastVehicleTime),raw=same?(speed-previous.speed)/dt/3.6:0;
  vehicle={mode:'car',vehicleId:info.vehicleId,vehicleType:info.vehicleType||'taxi',speed,acceleration:same?(previous.acceleration||0)*.6+clamp(raw,-8,8)*.4:0};lastVehicleTime=now;
  if(!same){stopEngine();if(effectsEnabled)pendingStarter=true;}reconcile();
 }
 function setMusicVolume(value){musicVolume=clamp(value,0,1);fade()}
 function setSpeechVolume(value){speechVolume=clamp(value,0,1);if(voice)voice.volume=speechVolume}
 function setEffectsVolume(value){effectsVolume=clamp(value,0,1);fade()}
 function stopSpeech(){speechToken++;if(voice){voice.onended=voice.onerror=null;voice.pause();voice=null}try{window.speechSynthesis?.cancel()}catch{}ducked=false;fade()}
 function speechAsset(key){const url=window.cityAsset('h3voice_'+key+'.mp3');return url.startsWith('data:')?url:url+(url.includes('?')?'&':'?')+'speech=13';}
 function speak(key,text,options={}){stopSpeech();if(!speechEnabled||!unlocked){options.onEnd?.();return}const token=speechToken;let fallbackUsed=false;ducked=true;fade();const end=()=>{if(token!==speechToken)return;voice=null;ducked=false;fade();options.onEnd?.()};const fallback=()=>{if(token!==speechToken||fallbackUsed)return;fallbackUsed=true;if(voice){voice.onended=voice.onerror=null;voice.pause();voice=null}if(!('speechSynthesis'in window)||typeof window.SpeechSynthesisUtterance!=='function'){end();return}const u=new SpeechSynthesisUtterance(text);u.lang='de-CH';u.rate=1.05;u.volume=speechVolume;const vs=window.speechSynthesis.getVoices();const sex=options.sex||'female';u.voice=vs.find(v=>v.lang==='de-CH'&&(sex==='male'?/Jan|male/i:/Leni|female/i).test(v.name))||vs.find(v=>v.lang==='de-CH')||vs.find(v=>v.lang.startsWith('de'))||null;u.onend=end;u.onerror=end;window.speechSynthesis.speak(u)};
  if(!clipKeys.has(key)){fallback();return}try{voice=new Audio(speechAsset(key));voice.volume=speechVolume;voice.playbackRate=directedClips.has(key)?1:1.04;voice.preservesPitch=true;voice.onended=end;voice.onerror=fallback;voice.play().catch(fallback)}catch{fallback()}
 }
 function getState(){return{unlocked,music:musicEnabled,speech:speechEnabled,effects:effectsEnabled,musicActive:wantedMusic()&&musicPlaying,ducked,musicVolume,speechVolume,effectsVolume,vehicleMode:carMode()?'car':'walk',effectsActive:!!engine,scenePaused,speed:vehicle?.speed||0,rpm:engine?.rpm||0,gear:engine?.gear||0,engineType:engine?(engine.electric?'electric':engine.diesel?'diesel':'petrol'):null,musicGain:wantedMusic()?musicVolume*.85*(ducked?.16:1):0,effectsGain:wantedEffects()?effectsVolume*(ducked?.16:1)*(scenePaused?.14:1):0}}
 const briefings=Object.fromEntries((window.H3_DATA?.missions||[]).map(m=>[m.id,brief(m)]));
 return{briefings,unlock,setMusic,setSpeech,pauseMusic,resumeMusic,speak,stopSpeech,setMusicVolume,setSpeechVolume,setEffects,setEffectsVolume,setScenePaused,updateVehicle,getState,getBriefing:brief};
})();
