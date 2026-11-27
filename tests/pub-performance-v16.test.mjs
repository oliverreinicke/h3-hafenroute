// Independent Red Team performance contract. Real Three geometry and actual Pub/People sources.
// Rendering, canvas rasterisation, network fetch and GLTF decoding remain explicit test boundaries.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as Three from '../dist/vendor/three.module.min.js';
const base=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,base),'utf8');
const code=read('Entwicklung/pub.js'),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const foods=['burger','flammkuchen','fries','salad'];
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return{promise,resolve,reject};}
function fixture({actualPeople=false,ignoreCallback=false,withoutPeople=false}={}){
 const gradients=[],labels=[],actors=[],warnings=[],loads=[],allocations={};
 const T={...Three};
 for(const key of ['Group','Mesh','BufferGeometry','PlaneGeometry','BoxGeometry','CylinderGeometry','SphereGeometry','ConeGeometry','TorusGeometry','MeshBasicMaterial','MeshStandardMaterial','MeshPhysicalMaterial','CanvasTexture']){
  T[key]=new Proxy(Three[key],{construct(target,args){allocations[key]=(allocations[key]||0)+1;return Reflect.construct(target,args);}});
 }
 const context2d=new Proxy({
  measureText:s=>({width:s.length*20}),fillText:s=>labels.push(s),
  createLinearGradient:()=>({addColorStop(){}}),
  createRadialGradient(...args){const value={args,stops:[],addColorStop(at,color){this.stops.push([at,color]);}};gradients.push(value);return value;}
 },{get:(o,k)=>k in o?o[k]:(()=>{})});
 const window={cityAsset:n=>n,cityTexture(T,n){const tx=new T.Texture();tx.name=n;return tx;}};
 const sandbox=vm.createContext({window,THREE:T,console:{...console,warn:(...args)=>warnings.push(args)},Map,Set,Math,Number,document:{createElement:()=>({getContext:()=>context2d})},fetch:async url=>({arrayBuffer:async()=>url})});
 if(actualPeople){
  // Decode only is replaced: actual People3D template/attach/update/dispose and real AnimationMixer run.
  window.AssetLoader={GLTFLoader:class{parseAsync(url){const task=deferred();loads.push({url,...task});return task.promise;}}};
  window.SkeletonTools={clone:model=>model.clone(true)};
  vm.runInContext(read('Entwicklung/menschen.js'),sandbox);
  const attach=window.People3D.attach;
  window.People3D.attach=(...args)=>{const state=attach(...args);actors.push({state,anchor:args[0]});return state;};
 }else if(!withoutPeople){
  window.People3D={attach(anchor,spec,onReady){
   const task=deferred(),state={anchor,spec,pose:null,updates:[],disposed:0,promise:task.promise,
    setPose(p){this.pose=p;},update(dt,speed){this.updates.push([dt,speed]);},
    dispose(){this.disposed++;this.figure?.removeFromParent();}};
   state.resolve=()=>{if(!state.disposed){const group=new T.Group(),nested=new T.Group();group.name='test_delayed_figure';
    for(const parent of [group,nested]){const mesh=new T.Mesh(new T.BoxGeometry(.2,.4,.2),new T.MeshStandardMaterial());mesh.castShadow=true;parent.add(mesh);}
    group.add(nested);anchor.add(group);state.figure=group;if(!ignoreCallback)onReady?.();}
    task.resolve();};
   state.reject=task.reject;actors.push(state);return state;
  }};
 }
 vm.runInContext(code,sandbox);
 const parent=new T.Group(),pub=window.GCBPub.create(T,parent,{x:-95,z:-15,w:6.2,d:8});
 return {T,parent,pub,actors,gradients,labels,allocations,warnings,loads};
}
function snapshot(parent){
 const objects=[],geo=new Set(),mat=new Set(),tx=new Set(),versions=new Map(),lights=[];
 parent.traverse(o=>{objects.push(o);if(o.isLight)lights.push(o);if(o.geometry)geo.add(o.geometry);
  for(const m of(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){mat.add(m);versions.set(m,m.version);for(const v of Object.values(m))if(v?.isTexture){tx.add(v);versions.set(v,v.version);}}});
 return {objects,geo,mat,tx,versions,lights};
}
function sameResources(a,b){
 for(const k of['objects','geo','mat','tx'])assert.deepEqual(b[k],a[k],k+' allocated/replaced');
 for(const [o,version]of a.versions)assert.equal(o.version,version,'material/texture version changed');
}
const viewer=distance=>({x:-95+distance,z:-15});
const advance=(f,frames,distance,dt=1/60)=>{for(let i=0;i<frames;i++)f.pub.update(dt,i*dt,viewer(distance));};
function resetCalls(f){for(const a of f.actors)a.updates.length=0;}
async function resolveActors(f){for(const a of f.actors)a.resolve();await f.pub.ready;}
function modelFor(url){
 const group=new Three.Group(),mesh=new Three.Mesh(new Three.BoxGeometry(.25,1,.25),new Three.MeshStandardMaterial());
 mesh.material.name='Skin';group.add(mesh);
 return {scene:group,animations:url.includes('-body.')?['walk','idle_breathe'].map(n=>new Three.AnimationClip(n,1,[])):[]};
}
async function releaseModels(f){
 for(let n=0;n<8&&f.loads.length<10;n++)await Promise.resolve();
 assert.equal(f.loads.length,10,'two people, five retained model parts each');
 for(const task of f.loads)task.resolve(modelFor(task.url));
 await f.pub.ready;
}
const f=fixture({ignoreCallback:true});
await test('delayed actor readiness is awaited and recursive shadow opt-out also survives an ignored attach callback',async()=>{
 let ready=false;f.pub.ready.then(()=>ready=true);await Promise.resolve();assert.equal(ready,false);
 f.actors[0].resolve();await Promise.resolve();assert.equal(ready,false);
 f.actors[1].resolve();await f.pub.ready;assert.equal(ready,true);
 assert.deepEqual(f.actors.map(a=>a.pose),['standing','seated']);
 for(const a of f.actors){assert(a.figure);a.anchor.traverse(o=>{if(o.isMesh)assert.equal(o.castShadow,false,'late actor mesh castShadow');});}
});
await test('zero Pub lights on both sides of the former 19-m threshold; one finite merged four-triangle light pool',()=>{
 const before=snapshot(f.parent);assert.equal(before.lights.length,0);
 const pool=f.pub.root.getObjectByName('gcb_baked_light_pools');assert(pool?.isMesh);
 assert.equal(pool.geometry.index?.count??pool.geometry.attributes.position.count,12);
 assert.equal(f.pub.root.children.filter(o=>o.name==='gcb_baked_light_pools').length,1);
 assert(pool.material.isMeshBasicMaterial);assert.equal(pool.material.transparent,true);assert.equal(pool.material.depthWrite,false);assert.equal(pool.material.toneMapped,false);
 assert.equal(pool.castShadow,false);
 for(const attr of Object.values(pool.geometry.attributes))for(const n of attr.array)assert(Number.isFinite(n));
 pool.geometry.computeBoundingBox();const bounds=pool.geometry.boundingBox;
 assert(Math.abs(bounds.min.y-(f.pub.floorY+.006))<1e-6);
 assert(Math.abs(bounds.max.y-(f.pub.floorY+.006))<1e-6);
 assert(bounds.min.y>f.pub.floorY+.005);
 assert(bounds.min.x>-3&&bounds.max.x<3&&bounds.min.z>-3.9&&bounds.max.z<3.9,'pool extends outside room floor');
 const normals=pool.geometry.attributes.normal;
 for(let i=0;i<normals.count;i++)assert(normals.getY(i)>.99999,'pool must face up');
 const gradient=f.gradients.find(g=>g.args.length===6&&g.args[5]===64);assert(gradient);
 assert.deepEqual(gradient.args,[64,64,0,64,64,64]);assert.equal(gradient.stops.at(-1)[0],1);assert(gradient.stops.at(-1)[1].endsWith(',0)'));
 for(let i=0;i<200;i++){f.pub.update(1/60,i/60,viewer(i%2?18.9:19.1));assert.equal(snapshot(f.parent).lights.length,0);}
 sameResources(before,snapshot(f.parent));
});
await test('non-actor geometry remains small; room surfaces retain local warm material emission',()=>{
 let meshes=0,triangles=0;const mats=new Set();
 f.parent.traverse(o=>{if(!o.isMesh||o.parent.name==='test_delayed_figure'||o.parent.parent?.name==='test_delayed_figure')return;
  meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;mats.add(o.material);});
 assert.equal(meshes,24);assert.equal(triangles,22850);
 assert([...mats].filter(m=>m.isMeshStandardMaterial&&Math.abs(m.emissiveIntensity-.065)<1e-9).length>=9);
 assert([...mats].every(m=>!m.emissive||m.emissiveIntensity!==.065||m.emissive.r>m.emissive.b));
});
await test('near actors run every frame; 12-to-26-m actors run 15 Hz without accumulated slow motion',()=>{
 advance(f,1,26);resetCalls(f);advance(f,120,11.999);
 for(const a of f.actors){assert.equal(a.updates.length,120);assert(a.updates.every(([dt,s])=>Math.abs(dt-1/60)<1e-12&&s===0));}
 for(const distance of[12,18.9,19.1,25.999]){
  advance(f,1,26);resetCalls(f);advance(f,600,distance);
  for(const a of f.actors){assert.equal(a.updates.length,150,'rate at '+distance);assert(Math.abs(a.updates.reduce((n,[dt])=>n+dt,0)-10)<1e-9);assert.equal(a.anchor.visible,true);}
 }
});
await test('at and beyond 26 m actors are hidden, get zero updates, then return immediately with no catch-up jump',()=>{
 for(const distance of[26,26.001,150]){
  resetCalls(f);advance(f,600,distance);
  for(const a of f.actors){assert.equal(a.anchor.visible,false);assert.equal(a.updates.length,0);}
  advance(f,1,2);
  for(const a of f.actors){assert.equal(a.anchor.visible,true);assert.equal(a.updates.length,1);assert.equal(a.updates[0][0],1/60);}
  assert.deepEqual(f.actors.map(a=>a.pose),['standing','seated']);
 }
});
await test('no Three allocations, resource replacements, collider changes or shader-version churn in 1600 distance changes and 640 food orders',()=>{
 const before=snapshot(f.parent),allocated=JSON.stringify(f.allocations),blocks=JSON.stringify(f.pub.blocks);
 for(let i=0;i<1600;i++){f.pub.update(1/60,i/60,viewer([3,12,18.9,19.1,25.9,26,80][i%7]));if(i<640)assert(f.pub.setOrder(foods[i%4]));}
 assert.equal(f.pub.setOrder(null),true);assert.equal(JSON.stringify(f.allocations),allocated);
 assert.equal(JSON.stringify(f.pub.blocks),blocks);sameResources(before,snapshot(f.parent));
 assert(foods.every(id=>!f.pub.root.getObjectByName('gcb_order_'+id).visible));
});
await test('far-before-load remains hidden after a delayed load, and re-entry restores both actors without new geometry',async()=>{
 const g=fixture();advance(g,100,100);await resolveActors(g);
 for(const a of g.actors){assert.equal(a.anchor.visible,false);a.anchor.traverse(o=>{if(o.isMesh)assert.equal(o.castShadow,false);});}
 const before=snapshot(g.parent);advance(g,1,1);assert(g.actors.every(a=>a.anchor.visible&&a.updates.length===1));sameResources(before,snapshot(g.parent));g.pub.dispose();
});
await test('rejected actor promises settle Pub readiness; missing optional People3D remains safe',async()=>{
 const g=fixture();g.actors[0].reject(new Error('controlled decoder failure'));g.actors[1].resolve();await g.pub.ready;
 advance(g,1,100);advance(g,1,1);g.pub.dispose();assert(g.actors.every(a=>a.disposed===1));
 const h=fixture({withoutPeople:true});await h.pub.ready;advance(h,3,1);assert.equal(snapshot(h.parent).lights.length,0);h.pub.dispose();
});
await test('disposing before either promise resolves cannot resurrect actors or orders',async()=>{
 const g=fixture();g.pub.dispose();g.pub.dispose();for(const a of g.actors)a.resolve();await g.pub.ready;
 assert(g.actors.every(a=>a.disposed===1&&!a.figure));advance(g,2,1);assert(g.actors.every(a=>a.updates.length===0));assert.equal(g.pub.setOrder('burger'),false);
});
await test('actual People3D attach/update/dispose respects delayed readiness, hidden anchors, shadow opt-out and standing/seated poses',async()=>{
 const g=fixture({actualPeople:true});advance(g,10,100);await releaseModels(g);
 assert.equal(g.warnings.length,0);assert(g.actors.every(a=>a.state.ready&&a.state.figure&&!a.anchor.visible));
 assert.deepEqual(g.actors.map(a=>a.state.pose),['standing','seated']);
 for(const a of g.actors)a.anchor.traverse(o=>{if(o.isMesh)assert.equal(o.castShadow,false);});
 advance(g,120,1);assert(g.actors.every(a=>a.anchor.visible));
 const clonedMats=new Set();for(const a of g.actors)a.state.figure.traverse(o=>{if(o.material)clonedMats.add(o.material);});
 const disposed=new Set();for(const m of clonedMats)m.addEventListener('dispose',()=>disposed.add(m));
 g.pub.dispose();g.pub.dispose();assert(g.actors.every(a=>!a.state.ready&&a.state.figure===null));assert.equal(disposed.size,clonedMats.size);
});
await test('actual People3D late load after disposal does not clone or attach a figure',async()=>{
 const g=fixture({actualPeople:true});g.pub.dispose();await releaseModels(g);
 assert.equal(g.warnings.length,0);assert(g.actors.every(a=>!a.state.ready&&a.state.figure===null));
 for(const a of g.actors)assert(!a.anchor.children.some(o=>o.name==='test_delayed_figure'||o.isGroup));
});
await test('normal scene cleanup reaches every static geometry, material and texture including the new pool',()=>{
 const before=snapshot(f.parent),disposed=new Map(),resources=new Set([...before.geo,...before.mat,...before.tx]);
 for(const item of resources)item.addEventListener('dispose',()=>disposed.set(item,(disposed.get(item)||0)+1));
 const calls=f.actors.map(a=>a.updates.length);f.pub.dispose();f.pub.dispose();advance(f,20,1);
 assert.deepEqual(f.actors.map(a=>a.updates.length),calls);assert(f.actors.every(a=>a.disposed===1));
 // Same ownership split as Drive.reset: Pub disposes actors; scene traversal disposes retained static resources.
 const after=snapshot(f.parent);for(const item of new Set([...after.geo,...after.mat,...after.tx]))item.dispose();
 const pool=f.pub.root.getObjectByName('gcb_baked_light_pools');for(const item of[pool.geometry,pool.material,pool.material.map])assert.equal(disposed.get(item),1);
 for(const item of new Set([...after.geo,...after.mat,...after.tx]))assert.equal(disposed.get(item),1);
});
await test('five clinical cases, bonus gates, UI and speech sources retain the approved versions',()=>{
 const approved={
  'missions.js':'1c7627b43641db3958c772e739698bfb2949ae912e2e7fd4d358d833e21a0c0b',
  'rules.js':'d8ed826b79b0e64c4a5690d60bd014e4b072cce45c83d1e7f002e639e3c66afe',
  'audio.js':'a8940ca5585538af439d3feb4571596745515d5330f027f449261cdd768bf2a3',
  'gespraeche.js':'8be8bf7f77ff6b6568a8c6d7eef42540e094e89a0894257ee22920abc544b559',
  'menschen.js':'ecc43123be7e6295c4a337d7d88a06ddd9ae5824c3d4ac64e46897ea826b3599',
  'ui.html':'5c94308f2f160bfc827c977525c773837c89d13779a5699bbbb85fc1dc1fd755'
 };
 for(const [name,hash]of Object.entries(approved))assert.equal(sha(read('Entwicklung/'+name)),hash,name+' changed outside V16 scope');
 // Normalize the intentional public-export QA removal and provenance-comment rewrite.
 const app=read('Entwicklung/app.js').replace(/\/\*QA-BEGIN\*\/[\s\S]*?\/\*QA-END\*\//g,'');
 assert.equal(sha(app),'4de86ca32784e2e89d4a4fb4e70140989da4f94064c937a6206d9e0e839d04c2','five-case/bonus app changed');
 const dto={window:{}};vm.runInNewContext(read('Entwicklung/missions.js'),dto);assert.equal(dto.window.H3_DATA.missions.length,5);
});
await test('distance bands work radially in every direction; long and invalid frame gaps cannot create a catch-up explosion',async()=>{
 const g=fixture();await resolveActors(g);
 for(let direction=0;direction<8;direction++){
  const angle=direction*Math.PI/4;
  for(const distance of[11.99,12.01,18.99,19.01,25.99,26.01,100]){
   advance(g,1,100);resetCalls(g);
   const position={x:-95+Math.cos(angle)*distance,z:-15+Math.sin(angle)*distance};
   for(let frame=0;frame<120;frame++)g.pub.update(1/60,frame/60,position);
   const expected=distance<12?120:distance<26?30:0;
   for(const a of g.actors){assert.equal(a.updates.length,expected,'band '+distance+' direction '+direction);assert.equal(a.anchor.visible,distance<26);}
   assert.equal(snapshot(g.parent).lights.length,0);
  }
 }
 for(const dt of[3600,Infinity,NaN,-20,0,undefined]){
  advance(g,1,100);resetCalls(g);g.pub.update(dt,1,viewer(1));
  assert(g.actors.every(a=>a.updates.length===1&&Number.isFinite(a.updates[0][0])&&a.updates[0][0]>=0&&a.updates[0][0]<=.1));
 }
 g.pub.dispose();
});
console.log('OK '+checks+' independent V16 groups; Pub SHA256 '+sha(code));

