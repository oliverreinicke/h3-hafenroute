import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),url=rel=>pathToFileURL(path.join(root,rel)).href;
const snap=o=>JSON.stringify(o);let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
let fixtureSource=fs.readFileSync(new URL('controls-v6.test.mjs',import.meta.url),'utf8').split("for(const code of ['Enter','NumpadEnter'])")[0];
fixtureSource=fixtureSource
 .replace('function fixture(){','function fixture(seed={}){const storageWrites=[];')
 .replace("new URL('../Entwicklung/',import.meta.url)",`new URL(${JSON.stringify(url('Entwicklung/'))})`)
 .replace('getItem(){return null},setItem(){}','getItem(key){return seed[key]??null},setItem(key,value){storageWrites.push([key,value]);seed[key]=value}')
 .replace('requestAnimationFrame(){}','requestAnimationFrame(fn){fn?.(0);return 1}')
 .replace('window.audit={panel,','window.audit={act,begin,beginBonus,bonusUnlocked,completeBonusIfInside,telemetry,renderCards,drawMap,mapPanel,journal,report,finish,context,onWorldAction,vehiclePanel,enter,home,getState:()=>s,getMission:()=>m,getCompleted:()=>completed,getStatus:()=>({bonusActive,bonusReached,bonusRecord,running,loading,target,selected}),setCompleted(value){completed=value;renderCards()},selectClinical(index){selected=index;m=D.missions[index];s=R.newState(m.id);running=true;bonusActive=false},setTele(value){t={...t,...value}},panel,')
 .replace('ctx.audit.stub(name=>calls.push(name));','')
 .replace('return {ctx,a:ctx.audit,','return {storageWrites,seed,ctx,a:ctx.audit,');
fixtureSource+='\nexport {fixture};';
const {fixture}=await import('data:text/javascript;base64,'+Buffer.from(fixtureSource).toString('base64'));
const idsFixture=fixture(),ids=idsFixture.ctx.H3_DATA.missions.map(m=>m.id);
const records=count=>Object.fromEntries(ids.slice(0,count).reverse().map((id,index)=>[id,{id,finished:'earlier',vehicle:'retained-'+index,score:80+index,maxPoints:100}]));
function setup({count=0,bonusRecord=null,deferredReady=false}={}){
 const prior=JSON.stringify(records(count)),seed={'h3-city-completed':prior};if(bonusRecord)seed['h3-city-bonus-pub']=JSON.stringify(bonusRecord);
 const f=fixture(seed),targets=[],engineCalls=[];let onInfo,onAction,resolveReady;
 let info={x:-85.2,z:15,heading:0,mode:'walk',cars:[{id:'taxi',type:'taxi',name:'Taxi Lindenhafen',x:-82.5,z:12.6}],mobility:[],speed:0,stationary:true,vehicleId:'taxi',vehicleType:'taxi',vehicleName:'Taxi Lindenhafen',dropoffDistance:200,pickupDistance:80,pubLocation:'outside',pubOrderState:'idle',pubOrderItem:null};
 const pending=deferredReady?new Promise(resolve=>resolveReady=resolve):Promise.resolve();
 for(const [id,w,h] of [['miniMap',216,172],['dialogMap',760,410]]){
  const canvas=f.el('#'+id);Object.assign(canvas,{id,width:w,height:h});canvas.ops=[];
  canvas.getContext=()=>new Proxy({fillText(text){canvas.ops.push(text)}},{get:(o,k)=>k in o?o[k]:(()=>{})});
 }
 Object.assign(f.ctx.Drive,{
  init(canvas,report,action){engineCalls.push('init');onInfo=report;onAction=action;report(info);},
  clearMission(){engineCalls.push('clearMission');info={...info,x:-85.2,z:15,mode:'walk',nearPatient:false,nearPubCounter:false,pubLocation:'outside',pubOrderState:'idle',pubOrderItem:null,missionId:null,passengerPresent:false};onInfo?.(info);return true;},
  setTarget(p){targets.push(p?JSON.parse(JSON.stringify(p)):null);onInfo?.(info);},resize(){},ready:()=>pending,
  resume(){engineCalls.push('resume');onInfo?.(info);},pause(){engineCalls.push('pause');},
  setMission(m){engineCalls.push('setMission:'+m.id);info={...info,missionId:m.id,pubLocation:'outside',nearPubCounter:false};onInfo?.(info);},
  requestEnter(id){engineCalls.push('enter:'+id);info={...info,mode:'car',vehicleId:id};onInfo?.(info);return 'entered';},
  requestExit(){engineCalls.push('exit');info={...info,mode:'walk'};onInfo?.(info);return 'exited';},
  orderPubFood(id){engineCalls.push('food:'+id);info={...info,pubOrderState:'preparing',pubOrderItem:id};onInfo?.(info);return true;},
  previewPubView(){throw Error('Bonus must not teleport the player');},portrait(){throw Error('Bonus must not open a clinical portrait');}
 });
 f.a.setTele(info);
 return {...f,prior,targets,engineCalls,info:()=>info,emit(value){info={...info,...value};(onInfo||f.a.telemetry)(info);},resolveReady:()=>resolveReady(),worldAction:value=>onAction?.(value)};
}

await test('zero or four actual clinical completions expose no bonus in home, tutorial, map or minimap',()=>{
 for(const count of [0,4]){
  const f=setup({count});assert.equal(f.a.bonusUnlocked(),false);f.a.renderCards();assert(!f.el('#missionCards').innerHTML.includes('data-bonus-pub'));assert(!f.el('#missionCards').innerHTML.includes('GCB Pub'));assert(!f.el('#home .caption').textContent.includes('GCB Pub'));
  f.a.tutorial(false);assert(!f.el('#dialogBody').innerHTML.includes('GCB Pub'));f.a.mapPanel();assert(!f.el('#dialogBody').innerHTML.includes('GCB Pub'));assert(!f.el('#dialogBody').innerHTML.includes('navpub'));
  f.a.drawMap(f.el('#miniMap'));assert(!f.el('#miniMap').ops.includes('G'));assert(!f.el('#miniMap').ops.includes('G · Pub'));
  const before=f.targets.length;f.a.act('navpub');assert.equal(f.targets.length,before);
 }
});
await test('a forced bonus start stays locked at four of five and ignores unrelated completed IDs',async()=>{
 const f=setup({count:4});f.a.setCompleted({...records(4),invented:{finished:'irrelevant'}});assert.equal(await f.a.act('beginbonus'),false);assert.equal(f.a.getStatus().bonusActive,false);assert(!f.engineCalls.includes('init'));assert.equal(f.storageWrites.length,0);
});
await test('five saved completions in any order reveal exactly one separate sixth card on initial load',()=>{
 const f=setup({count:5}),html=f.el('#missionCards').innerHTML;assert.equal(f.a.bonusUnlocked(),true);assert.equal((html.match(/data-mission="\d"/g)||[]).length,5);assert.equal((html.match(/data-bonus-pub=/g)||[]).length,1);assert(html.includes('ZUSATZMISSION 6'));assert.equal(f.ctx.H3_DATA.missions.length,5);assert.equal(f.el('#totalProgress').textContent,'5 von 5 abgeschlossen');assert(f.el('#home .caption').textContent.includes('GCB Pub'));
});
await test('the last remaining clinical case unlocks the bonus in its report, regardless of case order',()=>{
 const f=setup(),missingIndex=1,prior=Object.fromEntries(ids.filter((_,i)=>i!==missingIndex).map(id=>[id,{id,finished:'retained',score:91}]));f.a.setCompleted(prior);f.a.selectClinical(missingIndex);
 Object.assign(f.a.getState(),{approved:{id:'taxi',type:'taxi'},loaded:true,pack:[],collisions:0,reason:'retained'});
 f.ctx.FormData=class{getAll(){return[]}};f.ctx.H3Rules.handoverIssues=()=>[];f.ctx.Drive.unloadPatient=()=>true;
 f.a.finish();assert.equal(f.a.bonusUnlocked(),true);assert(f.el('#dialogBody').innerHTML.includes('Zusatzmission 6 freigeschaltet'));assert(f.el('#dialogBody').innerHTML.includes('data-action="beginbonus"'));
 for(const id of Object.keys(prior))assert.equal(snap(f.a.getCompleted()[id]),snap(prior[id]));assert.equal(f.seed['h3-city-bonus-pub'],undefined);
});
await test('bonus starts the ordinary world at normal spawn after clearMission, without touching clinical saves',async()=>{
 const f=setup({count:5});assert(await f.a.beginBonus());assert(f.engineCalls.includes('clearMission'));assert(!f.engineCalls.some(c=>c.startsWith('setMission:')));assert.equal(f.info().x,-85.2);assert.equal(f.info().z,15);assert.equal(f.info().missionId,null);assert.equal(f.a.getState(),null);assert.equal(f.a.getStatus().bonusActive,true);assert.equal(f.el('#missionTag').textContent,'ZUSATZMISSION 6');assert.equal(f.seed['h3-city-completed'],f.prior);assert.equal(f.storageWrites.length,0);assert.equal(f.a.getStatus().target.label,'GCB Pub');
});
await test('an earlier incidental Pub visit and stale inside telemetry during loading cannot complete the bonus',async()=>{
 const f=setup({count:5,deferredReady:true});f.emit({mode:'walk',pubLocation:'inside'});assert.equal(f.seed['h3-city-bonus-pub'],undefined);
 const task=f.a.beginBonus();await new Promise(setImmediate);assert(f.a.getStatus().loading);f.emit({pubLocation:'inside'});assert.equal(f.a.getStatus().bonusReached,false);assert.equal(f.seed['h3-city-bonus-pub'],undefined);f.emit({pubLocation:'outside'});f.resolveReady();await task;assert.equal(f.a.getStatus().bonusReached,false);
});
await test('only actual walking entry in the active bonus completes once and clears the search route',async()=>{
 const f=setup({count:5});await f.a.beginBonus();f.a.act('bonuscontinue');f.emit({pubLocation:'outside',atTarget:true,distance:0});assert.equal(f.a.getStatus().bonusReached,false);f.emit({mode:'car',pubLocation:'inside'});assert.equal(f.a.getStatus().bonusReached,false);
 f.emit({mode:'walk',pubLocation:'inside'});assert.equal(f.a.getStatus().bonusReached,true);assert.equal(f.a.getStatus().target,null);assert.equal(f.targets.at(-1),null);assert.equal(f.el('#routeGuide').hidden,true);assert(f.el('#dialogBody').innerHTML.includes('GCB Pub gefunden'));assert(f.el('#dialogBody').innerHTML.includes('Weiter erkunden'));
 for(let i=0;i<20;i++)f.emit({pubLocation:'inside'});assert.equal(f.storageWrites.filter(([key])=>key==='h3-city-bonus-pub').length,1);assert.equal(f.seed['h3-city-completed'],f.prior);
});
await test('continue exploring resumes after success and still permits the waiter menu and food ordering',async()=>{
 const f=setup({count:5});await f.a.beginBonus();f.a.act('bonuscontinue');f.emit({pubLocation:'inside',nearPubCounter:true});assert(f.el('#modal').open);const before=f.engineCalls.filter(x=>x==='resume').length;f.a.act('bonuscontinue');assert.equal(f.el('#modal').open,false);assert(f.engineCalls.filter(x=>x==='resume').length>before);
 f.a.context();assert(f.el('#dialogBody').innerHTML.includes('Pub-Burger'));f.a.act('pubfood','burger');assert(f.engineCalls.includes('food:burger'));assert.equal(f.el('#modal').open,false);assert.equal(f.seed['h3-city-completed'],f.prior);
});
await test('bonus vehicles and world events stay free of patient forms, reports and clinical mutation',async()=>{
 const f=setup({count:5});await f.a.beginBonus();f.a.act('bonuscontinue');f.a.vehiclePanel('taxi');assert(f.el('#dialogBody').innerHTML.includes('Entdeckungstour'));assert(!f.el('#dialogBody').innerHTML.includes('vehicleForm'));assert(!f.el('#dialogBody').innerHTML.includes(f.a.getMission().patient.name));
 f.a.enter('taxi');f.a.act('bonuscontinue');f.worldAction({kind:'collision'});f.worldAction({kind:'patient'});f.worldAction({kind:'destination'});assert.equal(f.a.getState(),null);assert.equal(f.seed['h3-city-completed'],f.prior);f.a.journal();assert(f.el('#dialogBody').innerHTML.includes('Finde das GCB Pub'));assert(!f.el('#dialogBody').innerHTML.includes('Fallangaben'));f.a.tutorial(false);assert(f.el('#dialogBody').innerHTML.includes('Finde das GCB Pub'));assert.equal(f.seed['h3-city-completed'],f.prior);assert.equal(f.storageWrites.length,0);
});
await test('bonus records survive reload separately; a replay does not save again and clinical replays still work',async()=>{
 const record={id:'gcb-pub',finished:'2026-11-27T12:00:00.000Z'},f=setup({count:5,bonusRecord:record});assert(f.el('#missionCards').innerHTML.includes('Zusatzmission abgeschlossen'));await f.a.beginBonus();f.a.act('bonuscontinue');f.emit({pubLocation:'inside'});assert.equal(f.storageWrites.filter(([key])=>key==='h3-city-bonus-pub').length,0);
 f.a.home();assert.equal(f.a.getStatus().bonusActive,false);assert.equal(f.ctx.H3_DATA.missions.length,5);await f.a.begin(2);assert.equal(f.a.getStatus().bonusActive,false);assert(f.engineCalls.includes('setMission:'+ids[2]));assert.equal(f.seed['h3-city-completed'],f.prior);assert.equal(f.seed['h3-city-bonus-pub'],JSON.stringify(record));
});

// Reuse the existing actual-Drive test boundary, with its real Three geometry and movement code.
let engineSource=fs.readFileSync(new URL('pub-interaction-v15.test.mjs',import.meta.url),'utf8').split("await test(")[0];
engineSource=engineSource.replace("'../dist/vendor/three.module.min.js'",JSON.stringify(url('dist/vendor/three.module.min.js'))).replace("'../dist/vendor/BufferGeometryUtils.js'",JSON.stringify(url('dist/vendor/BufferGeometryUtils.js'))).replace("new URL('../',import.meta.url)",`new URL(${JSON.stringify(pathToFileURL(root+'/').href)})`).replace('person,city,camera,pubOrder,clearAt','person,city,camera,pubOrder,clearAt,patient,mission');
engineSource+='\nexport {world};';const {world}=await import('data:text/javascript;base64,'+Buffer.from(engineSource).toString('base64'));
await test('actual Drive.clearMission disposes an onboard patient and pending food, restores normal spawn and clears target/counters',()=>{
 const e=world();e.api.previewPubView('inside');assert(e.api.orderPubFood('fries'));assert.equal(e.api.getInfo().pubOrderState,'preparing');assert(e.api.clearMission());assert.equal(e.api.getInfo().pubOrderState,'idle');e.api.resume();e.advance(2);assert(!e.orders.includes('fries'));
 e.api.previewPubView('inside');assert(e.api.orderPubFood('burger'));
 e.api.setMission({id:'retiring-case',pickup:{x:-85.2,z:15},dropoff:{x:24,z:-46},vehicleType:'taxi',patient:{name:'Fictional',sex:'female',mobility:'walk'}});assert.equal(e.api.getInfo().pubOrderState,'idle');assert(e.api.enterVehicle('taxi'));assert(e.api.loadPatient());
 const old=e.api.__pubTest().patient;let actorDisposals=0;old.actor.dispose=()=>actorDisposals++;const resources=new Set(),disposed=new Set();old.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))resources.add(m)});for(const r of resources)r.addEventListener('dispose',()=>disposed.add(r));
 assert(e.api.clearMission());const info=e.api.getInfo();assert.equal(actorDisposals,1);assert.equal(disposed.size,resources.size);assert.equal(old.root.parent,null);assert.equal(e.api.__pubTest().patient,null);assert.equal(info.missionId,undefined);assert.equal(info.passengerPresent,false);assert.equal(info.delivered,false);assert.equal(info.targetX,undefined);assert.equal(info.pubOrderState,'idle');assert.equal(info.x,-85.2);assert.equal(info.z,15);assert.equal(info.mode,'walk');assert.equal(info.collisionCount,0);assert.equal(info.travelDistance,0);
 e.api.resume();e.advance(3);assert(!e.orders.includes('fries'));e.api.reset();
});
console.log(checks+' bonus gating, persistence, mode and actual-Drive cleanup checks passed. Browser flow remains independent QA.');
