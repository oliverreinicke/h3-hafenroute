// Independent lifecycle edge checks against production sources. Portable offline test.
// CPU/controller checks only; native keys, GPU and asset rasterisation require browser QA.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {setImmediate as settle} from 'node:timers/promises';
import * as T from '../dist/vendor/three.module.min.js';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject};}
function loader(){
 const requests=[],window={cityAsset:n=>n,AssetLoader:{GLTFLoader:class{async parseAsync(value){if(value==='bad')throw Error('decode rejected');return{scene:new T.Group()};}}}};
 vm.runInNewContext(read('Entwicklung/fahrzeuge.js'),{window,console,Map,Set,Math,Number,fetch:name=>{const task=deferred();requests.push({name,...task});return task.promise;}});
 return{api:window.H3Vehicles,requests};
}
const response=value=>({ok:true,arrayBuffer:async()=>value});
await test('slow sport decode gates ready and concurrent starts share exactly five requests',async()=>{
 const f=loader(),first=f.api.preload(),second=f.api.preload();let done=false;first.then(()=>{done=true});
 assert.equal(f.requests.length,5);
 for(const r of f.requests)if(!r.name.includes('supercar'))r.resolve(response('ok'));
 await settle();
 assert.equal(f.api.getStatus().loaded,4);assert.equal(f.api.getStatus().ready,false);assert.equal(f.api.getStatus().sportsReady,false);assert.equal(done,false);
 assert.throws(()=>f.api.make(T,new T.Scene(),[0,0,0,0xffffff],5,{sx:1,sy:1,sz:1},{id:'early'}),/noch nicht geladen/);
 f.requests.find(r=>r.name.includes('supercar')).resolve(response('ok'));
 await Promise.all([first,second]);assert.equal(f.api.getStatus().ready,true);assert.equal(f.api.getStatus().sportsReady,true);
 await f.api.preload();assert.equal(f.requests.length,5);
});
for(const failure of['network','decode'])await test(failure+' failure refuses sport fallback and a retry recovers all five templates',async()=>{
 const f=loader(),pending=f.api.preload(),rejected=assert.rejects(pending,/Fahrzeugmodell fehlt|decode rejected/);
 for(const r of f.requests)r.resolve(r.name.includes('supercar')?(failure==='network'?{ok:false}:response('bad')):response('ok'));
 await rejected;assert.equal(f.api.getStatus().ready,false);assert.equal(f.api.getStatus().sportsReady,false);
 assert.throws(()=>f.api.make(T,new T.Scene(),[0,0,0,0xffffff],5,{sx:1,sy:1,sz:1},{id:'failed'}),/noch nicht geladen/);
 const retry=f.api.preload();assert.equal(f.requests.length,10);for(const r of f.requests.slice(5))r.resolve(response('ok'));await retry;
 assert.equal(f.api.getStatus().loaded,5);assert.equal(f.api.getStatus().ready,true);
});

// Reuse only the shared real-geometry setup, not its assertions or test results.
// URLs derive from this test location and work in an exported directory without Git.
let fixture=read('tests/sport-traffic-v17.test.mjs').split("test('16 traffic cars")[0];
assert(fixture.includes('const api=window.Drive;'));
for(const file of['three.module.min.js','BufferGeometryUtils.js'])fixture=fixture.replaceAll("'../dist/vendor/"+file+"'",JSON.stringify(new URL('../dist/vendor/'+file,import.meta.url).href));
fixture=fixture.replace("source=new URL('../Entwicklung/',import.meta.url)","source=new URL("+JSON.stringify(new URL('../Entwicklung/',import.meta.url).href)+")");
fixture=fixture.replace("new URL('../dist/assets/'+file,import.meta.url)","new URL(file,"+JSON.stringify(new URL('../dist/assets/',import.meta.url).href)+")");
fixture+='\nexport {api,t,traffic,run,start,actions,factoryCalls};';
const env=await import('data:text/javascript;base64,'+Buffer.from(fixture).toString('base64'));
const{api,t,traffic,run,start,actions}=env;
await test('held forward/sprint are cleared on a sport claim; repeated Enter cannot duplicate the model or BL plate',()=>{
 start();run(1);const v={...traffic.getVehicles().find(q=>q.modelIndex===5)},initialCalls=env.factoryCalls;
 t.setWalk(v.x-Math.cos(v.heading)*(v.halfWidth+.65),v.z-Math.sin(v.heading)*(v.halfWidth+.65));
 api.input('gas',true);api.input('sprint',true);assert.equal(api.requestEnter(v.id),'waiting');
 for(let i=0;i<12;i++)assert.equal(api.requestEnter(v.id),'waiting');
 run(2);assert.equal(api.getInfo().mode,'car');assert.equal(api.getInfo().vehicleModelIndex,5);assert.equal(t.velocity(),0);
 const model=t.car(),position=model.root.position.clone();
 for(let i=0;i<12;i++)assert.equal(api.requestEnter(v.id),'unavailable');run(.4);
 assert.equal(env.factoryCalls-initialCalls,1);assert.equal(t.velocity(),0);assert(model.root.position.distanceTo(position)<1e-8);
 assert.equal(traffic.getVehicles().some(q=>q.id===v.id),false);assert.equal(traffic.getObstacles().some(q=>q.id===v.id),false);
 assert.equal(api.getInfo().mobility.filter(q=>q.id===v.id).length,1);assert.equal(t.fleet().filter(q=>q.id===v.id).length,1);
 const hidden=traffic.root.children.filter(q=>q.userData.h3Plates&&q.userData.registration===model.root.userData.registration);assert.equal(hidden.length,1);assert.equal(hidden[0].visible,false);
 assert.equal(api.requestExit(),'exited');assert.equal(api.requestExit(),'unavailable');assert.equal(api.requestEnter(v.id),'entered');assert.equal(env.factoryCalls-initialCalls,1);
});
await test('pause cancels a pending moving-sport request and leaves no delayed claim after resume',()=>{
 start();run(1);const v={...traffic.getVehicles().find(q=>q.modelIndex===5)};
 t.setWalk(v.x-Math.cos(v.heading)*(v.halfWidth+.65),v.z-Math.sin(v.heading)*(v.halfWidth+.65));
 assert.equal(api.requestEnter(v.id),'waiting');api.pause();assert.equal(t.pending().pendingEnter,null);api.resume();run(2);
 assert.equal(api.getInfo().mode,'walk');assert.equal(traffic.getStatus().cars,16);assert.equal(t.fleet().some(q=>q.fromTraffic),false);
});
await test('movement cancels a sport stop request, while repeated exit requests produce one final exit',()=>{
 start();run(1);let v={...traffic.getVehicles().find(q=>q.modelIndex===5)};
 t.setWalk(v.x-Math.cos(v.heading)*(v.halfWidth+.65),v.z-Math.sin(v.heading)*(v.halfWidth+.65));
 assert.equal(api.requestEnter(v.id),'waiting');api.input('gas',true);assert.equal(t.pending().pendingEnter,null);api.input('gas',false);
 start();v=traffic.getVehicles().find(q=>q.modelIndex===5);t.setWalk(v.x-2,v.z);assert.equal(api.requestEnter(v.id),'entered');
 t.setCar(-80,0,0);t.setVelocity(5);actions.length=0;assert.equal(api.requestExit(),'braking');
 for(let i=0;i<12;i++)assert.equal(api.requestExit(),'braking');api.input('gas',true);api.input('sprint',true);run(2);
 assert.equal(api.getInfo().mode,'walk');assert.equal(t.velocity(),0);assert.equal(actions.filter(q=>q.kind==='exit'&&q.status==='exited').length,1);
});
api.reset();
console.log(checks+' independent V17 preload/claim/cancel/idempotency checks passed; native input and GPU excluded.');
