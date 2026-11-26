import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as T from '../dist/vendor/three.module.min.js';
const source=name=>fs.readFileSync(new URL('../Entwicklung/'+name,import.meta.url),'utf8');
const window={},c=vm.createContext({window,console});for(const f of ['missions.js','rules.js','navigation.js'])vm.runInContext(source(f),c);
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name)}
const scene=new T.Scene(),floor=window.H3Navigation.create(T,scene);
const forbidden=new Proxy({},{get(_target,key){throw Error('Compact guidance allocated/accessed Three resource '+String(key))}});
const hud=window.H3Navigation.create(forbidden,forbidden,{groundArrows:false});
for(const m of window.H3_DATA.missions)test(m.id+' HUD-only navigation retains full camera/route semantics without touching Three',()=>{
 for(const mode of ['walk','car'])for(const viewHeading of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const pos of [{x:-85.2,z:15},{x:-80.2,z:-30},{x:-80,z:-30.6},{x:m.pickup.x,z:m.pickup.z}])for(const target of [m.pickup,m.dropoff,null]){
  floor.clear();hud.clear();const info={...pos,heading:0,viewHeading,mode};assert.equal(JSON.stringify(hud.update(info,target)),JSON.stringify(floor.update(info,target)));
 }
});
test('HUD-only clear/dispose are idempotent with no scene or GPU references',()=>{hud.clear();hud.dispose();hud.dispose();assert.equal(hud.update({x:0,z:0},null),undefined)});
floor.dispose();
const html=source('ui.html'),css=source('style.css');
test('one compact directional card contains circle, distance and destination only',()=>{const card=html.split('<aside id="routeGuide"')[1].split('</aside>')[0];assert.match(card,/class="routeDisc"/);assert.match(card,/id="routeArrow"/);assert.match(card,/<b id="routeRemaining"/);assert.match(card,/id="routeDestination"/);assert(!card.includes('routeInstruction'));assert.match(html,/<button id="miniMapBtn"[^>]*type="button"/);assert.match(html,/id="miniMap"/);assert(!html.includes('id="distance"'))});
test('task hint is a semantic button and full map remains directly reachable',()=>{assert.match(html,/<button id="objectiveBtn"[^>]*type="button"/);assert.match(html,/<button id="mapBtn"/);assert.match(css,/\.routeLabels b\{[^}]*font-size:32px/);assert.match(css,/flex-direction:row;text-align:left/)});
const elements=new Map(),events=[],listeners={};const paint=new Proxy({},{get:()=>()=>{}});
const el=k=>{if(!elements.has(k))elements.set(k,{id:k.slice(1),innerHTML:'',textContent:'',hidden:false,open:false,style:{},attributes:{},dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attributes[k]=v},getContext:()=>paint,focus(){},showModal(){this.open=true},close(){this.open=false},scrollIntoView(){},addEventListener(){},querySelectorAll(){return[]},querySelector(q){return el(k+' '+q)}});return elements.get(k)};
const A=new Proxy({briefings:{}},{get:(o,k)=>k in o?o[k]:(...args)=>events.push([k,...args])});
const doc={querySelector:el,querySelectorAll:()=>[],body:el('body'),addEventListener(){}};
const ctx={console,document:doc,localStorage:{getItem(){return null},setItem(){}},requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},addEventListener:(k,f)=>listeners[k]=f,H3Audio:A,Drive:{pause(){},resume(){},setTarget(){},resize(){}},URL,Blob};ctx.window=ctx;vm.createContext(ctx);for(const f of ['missions.js','rules.js'])vm.runInContext(source(f),ctx);
const instrument=source('app.js').replace(/\}\)\(\);\s*$/,`window.audit={updateGuidance,telemetry,update,journal,tutorial,state:()=>({m,s,t,target}),set(mission,state,tele){m=mission;s=state;t=tele;running=true;target=m.pickup}};})();`);vm.runInContext(instrument,ctx);
const tele={mode:'walk',x:-80,z:0,speed:0,cars:[],pickupDistance:50,dropoffDistance:60,heading:0,distance:50,guidance:{angle:0,distance:70,arrived:false}};
for(const m of ctx.H3_DATA.missions)test(m.id+' compact task opens complete current instruction and five steps in journal',()=>{
 const s=ctx.H3Rules.newState(m.id);ctx.audit.set(m,s,tele);ctx.audit.update();el('#objectiveBtn').onclick();const body=el('#dialogBody').innerHTML;
 assert.match(el('#objectiveTitle').textContent,/Lerne die Person/);assert(body.includes(m.patient.name));assert(body.includes(m.transportOrder));assert(body.includes('kläre Mobilität'));for(const label of ['Gespräch','Vorbereitung','Fahrzeug','Abholung','Übergabe'])assert(body.includes(label));
 s.asked=m.dialogue.map(q=>q.id);s.prepared=true;s.approved={id:'taxi',type:m.vehicleType};s.loaded=true;ctx.audit.update();ctx.audit.journal();assert.match(el('#objectiveTitle').textContent,/Bring die Person/);assert(el('#dialogBody').innerHTML.includes('Parkiere, steige aus'));
});
test('walking omits speed panel; driving displays vehicle speed without duplicate destination',()=>{ctx.audit.set(ctx.H3_DATA.missions[0],ctx.H3Rules.newState('stadttermin'),tele);ctx.audit.telemetry(tele);assert(el('#vehicleHud').hidden);ctx.audit.telemetry({...tele,mode:'car',vehicleName:'Testwagen',speed:31});assert(!el('#vehicleHud').hidden);assert.equal(el('#speed').textContent,'31');assert.equal(el('#travelMode').textContent,'Testwagen')});
test('compact HUD uses route distance and the short +/-180 degree turn',()=>{ctx.audit.set(ctx.H3_DATA.missions[0],ctx.H3Rules.newState('stadttermin'),tele);let previous;for(const degrees of [179,-179,-178,179]){ctx.audit.updateGuidance({...tele,guidance:{angle:degrees*Math.PI/180,distance:127,arrived:false}});const value=Number(el('#routeArrow').style.transform.slice(7,-4));if(previous!==undefined)assert(Math.abs(value-previous)<.06);previous=value;assert.equal(el('#routeRemaining').textContent,'127 m');assert.equal(el('#routeDestination').textContent,ctx.H3_DATA.missions[0].pickup.label)}});
test('tutorial describes the single direction card and accessible map',()=>{ctx.audit.tutorial();const body=el('#dialogBody').innerHTML;assert(body.includes('Der Richtungspfeil oben'));assert(body.includes('M öffnet die Karte'));assert(!body.includes('Pfeile auf der Strasse'))});
console.log(count+' compact HUD/resource checks passed. Responsive visual layout still requires browser QA.');
