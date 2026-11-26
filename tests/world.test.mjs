import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as Real from '../dist/vendor/three.module.min.js';
import {mergeGeometries} from '../dist/vendor/BufferGeometryUtils.js';
let frame=0;const frames=new Map(),actions=[];
const ctx=new Proxy({measureText:s=>({width:s.length*24}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const canvas={width:1280,height:800,style:{},clientWidth:1280,clientHeight:800,getContext:()=>ctx,getBoundingClientRect:()=>({width:1280,height:800}),addEventListener(){},removeEventListener(){},setPointerCapture(){}};
class Renderer{constructor(){this.shadowMap={};this.isWebGLRenderer=false;}setPixelRatio(){}setSize(){}render(s,c){s.updateMatrixWorld(true);c.updateMatrixWorld(true)}dispose(){}}
class TextureLoader{load(){return new Real.Texture()}}
const THREE={...Real,WebGLRenderer:Renderer,TextureLoader};
const window={THREE,devicePixelRatio:1,addEventListener(){},removeEventListener(){},GeometryTools:{mergeGeometries},cityAsset:x=>x,People3D:{attach(){return {update(){},setPose(){},ready:false,promise:Promise.resolve()}}}};
const c=vm.createContext({window,THREE,console,Map,Set,Math,Number,performance:{now:()=>0},document:{createElement:()=>({...canvas})},requestAnimationFrame:fn=>{frames.set(++frame,fn);return frame},cancelAnimationFrame:id=>frames.delete(id),Image:class{constructor(){this.width=256;this.height=256}addEventListener(){}},ResizeObserver:class{observe(){}disconnect(){}}});
const source=new URL('../Entwicklung/',import.meta.url);
for(const f of ['rules.js','navigation.js'])vm.runInContext(fs.readFileSync(new URL(f,source),'utf8'),c);
vm.runInContext(fs.readFileSync(new URL('stadt.js',source),'utf8'),c);vm.runInContext(fs.readFileSync(new URL('fahrzeuge.js',source),'utf8'),c);
let drive=fs.readFileSync(new URL('fahrt.js',source),'utf8').replace('return {init,resume','return {__test:{clearAt,vehicleClear,clearOfCars,place,stepCar,stepPerson,tick,scene:()=>scene,city:()=>city,person:()=>person,car:()=>car,fleet:()=>fleet,movePlayer(x,z){pieces.char.position.set(x,0,z)},moveCar(x,z){car.root.position.set(x,0,z)},setVelocity(v){velocity=v},getVelocity:()=>velocity},init,resume');
vm.runInContext(drive,c);const api=window.Drive;api.init(canvas,()=>{},e=>actions.push(e));const t=api.__test;
const locations={home:{x:-88,z:-52},practice:{x:24,z:-46},hospital:{x:77,z:54},residence:{x:-31,z:54},rehab:{x:-31,z:-52}};
let count=0;function check(name,fn){fn();console.log('PASS '+name);count++}
check('five distinct visible vehicles',()=>assert.equal(new Set(t.fleet().map(v=>v.type)).size,5));
for(const v of t.fleet())check(v.type+' initially clear of buildings and fleet',()=>{assert(t.clearAt(v.root.position.x,v.root.position.z,1.3));for(const other of t.fleet())if(other!==v)assert(Math.hypot(other.root.position.x-v.root.position.x,other.root.position.z-v.root.position.z)>7)});
for(const [id,p]of Object.entries(locations))check(id+' patient position clear',()=>assert(t.clearAt(p.x,p.z,.5),`${id} intersects world collider`));
const mission={id:'test',pickup:locations.home,dropoff:locations.hospital,patient:{name:'Test',sex:'female',mobility:'wheelchair'},vehicleType:'wheelchair'};
api.setMission(mission);
check('walking shows avatar and never first-person',()=>{assert.equal(api.getInfo().firstPerson,false);assert.equal(api.__test.person().root.visible,true);api.resume();api.input('camera',true);assert.equal(api.getInfo().firstPerson,false);assert.equal(api.__test.person().root.visible,true);api.pause()});
check('cannot load before vehicle entry',()=>assert.equal(api.loadPatient(),false));
t.movePlayer(-82.5,15.5);check('taxi entry uses D4 outside follow view',()=>{assert(api.enterVehicle('taxi'));assert.equal(api.getInfo().firstPerson,false);assert.equal(t.person().root.visible,false)});
t.moveCar(-80,-52);check('incorrect vehicle cannot board patient',()=>assert.equal(api.loadPatient(),false));
api.exitVehicle();const wheelchair=t.fleet().find(v=>v.type==='wheelchair');t.movePlayer(wheelchair.root.position.x+2.9,wheelchair.root.position.z);check('wheelchair bus entry',()=>assert(api.enterVehicle('wheelchair')));
t.moveCar(-80,-52);t.setVelocity(.03);check('creeping at rounded zero speed still blocks boarding and exit',()=>{assert.equal(api.getInfo().speed,0);assert.equal(api.getInfo().stationary,false);assert.equal(api.loadPatient(),false);assert.equal(api.exitVehicle(),false)});t.setVelocity(0);api.resume();api.input('interact',true);check('stationary pickup emits patient action',()=>assert.equal(actions.at(-1).kind,'patient'));api.pause();
check('correct nearby vehicle loads passenger',()=>assert(api.loadPatient()));
check('wrong place cannot unload',()=>assert.equal(api.unloadPatient(),false));
t.moveCar(84,54);t.setVelocity(3);check('moving vehicle cannot unload',()=>assert.equal(api.unloadPatient(),false));t.setVelocity(0);
check('arrived stopped vehicle unloads',()=>assert(api.unloadPatient()));check('delivered state and marker cleared',()=>{assert.equal(api.getInfo().delivered,true);assert.equal(api.getInfo().passengerPresent,false);assert.equal(api.getInfo().targetX,undefined)});
check('pause preserves callbacks and mission',()=>{api.pause();api.resume();assert.equal(api.getInfo().missionId,'test')});
// Connected walking network, retaining actual world and vehicle colliders.
api.setMission(mission);
const min=-98,max=99,N=max-min+1,key=(x,z)=>(x-min)*N+z-min,seen=new Set(),queue=[];
function walkable(x,z){return x>=min&&x<=max&&z>=min&&z<=max&&t.clearAt(x,z,.34)&&t.clearOfCars(x,z,.29)}
const start={x:Math.round(t.city().spawn.x),z:Math.round(t.city().spawn.z)};queue.push(start);seen.add(key(start.x,start.z));
for(let at=0;at<queue.length;at++){const p=queue[at];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,z=p.z+dz,k=key(x,z);if(!seen.has(k)&&walkable(x,z)){seen.add(k);queue.push({x,z})}}}
for(const [id,p]of Object.entries(locations))check(id+' is reachable on foot from hub',()=>assert(queue.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<1.5)));
for(const v of t.fleet())check(v.type+' has a reachable entry approach',()=>assert(queue.some(q=>Math.hypot(q.x-v.root.position.x,q.z-v.root.position.z)<3.7)));
// All roads needed for A–B routes remain clear for the largest transport van.
api.setMission({...mission,vehicleType:'ambulance',patient:{name:'Test',mobility:'lying',sex:'male'}});
const ambulance=t.fleet().find(v=>v.type==='ambulance');t.movePlayer(ambulance.root.position.x+2.8,ambulance.root.position.z);assert(api.enterVehicle('ambulance'));
for(const [id,p]of Object.entries(locations))check(id+' has an accessible vehicle stop',()=>{const xs=[-80,-24,32,88],zs=[-84,-28,28,84];const points=[...xs.map(x=>({x,z:p.z,h:0})),...zs.map(z=>({x:p.x,z,h:Math.PI/2}))];assert(points.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<12&&t.vehicleClear(q.x,q.z,q.h)));});
console.log('Walking floodfill: '+queue.length+' reachable 1m-grid points.');
console.log(count+' geometry/lifecycle checks passed; rendering and rig posing require browser QA.');

// Rig regression: real GLB hierarchy, renderer and skinning excluded.
{
const buffer=fs.readFileSync(new URL('../dist/assets/female-body.glb',import.meta.url));const data=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
function skeleton(){const model=new Real.Group();const nodes=data.nodes.map(n=>{const b=new Real.Bone();b.name=n.name||'';if(n.translation)b.position.fromArray(n.translation);if(n.rotation)b.quaternion.fromArray(n.rotation);if(n.scale)b.scale.fromArray(n.scale);return b});for(let i=0;i<nodes.length;i++)for(const j of(data.nodes[i].children||[]))nodes[i].add(nodes[j]);for(const i of data.scenes[data.scene||0].nodes)model.add(nodes[i]);const body=new Real.Mesh(new Real.BoxGeometry(.4,1.68,.2),new Real.MeshStandardMaterial({name:'Skin'}));body.position.y=.84;model.add(body);return model}
const THREE={...Real,TextureLoader:class{load(){return new Real.Texture()}}};
const window={cityAsset:n=>n,AssetLoader:{GLTFLoader:class{async parseAsync(raw){const name=new TextDecoder().decode(raw);return {scene:name.includes('body')?skeleton():new Real.Group(),animations:[new Real.AnimationClip('walk',1,[]),new Real.AnimationClip('idle_breathe',1,[])]}}}},SkeletonTools:{clone:o=>o.clone(true)}};
const context=vm.createContext({window,THREE,console,Map,fetch:async url=>({arrayBuffer:async()=>new TextEncoder().encode(url).buffer})});vm.runInContext(fs.readFileSync(new URL('../Entwicklung/menschen.js',import.meta.url),'utf8'),context);
const scene=new Real.Scene(),root=new Real.Group();root.rotation.y=.8;scene.add(root);const actor=window.People3D.attach(root,{sex:'female',height:1.68,shirt:0x333333,pants:0x555555,hair:0x444444,skin:0xffffff});await actor.promise;assert(actor.ready);const fig=actor.figure;const pos=name=>fig.getObjectByName(name).getWorldPosition(new Real.Vector3());scene.updateMatrixWorld(true);const standingHead=pos('head').y;
actor.setPose('seated');scene.updateMatrixWorld(true);const forward=new Real.Vector3(0,0,1).transformDirection(fig.matrixWorld),down=new Real.Vector3(0,-1,0).transformDirection(fig.matrixWorld);
for(let frame=0;frame<100;frame++){actor.update(.016,0);scene.updateMatrixWorld(true);for(const side of ['l','r']){const thigh=pos('calf_'+side).sub(pos('thigh_'+side)).normalize(),calf=pos('foot_'+side).sub(pos('calf_'+side)).normalize();assert(thigh.dot(forward)>.999,'thigh not forward or pose drift');assert(calf.dot(down)>.999,'shin not down or pose drift')}}
assert(pos('head').y<standingHead-.35);console.log('PASS anatomical seated knee/shin directions in rotated parent; 100 updates without pose accumulation.');
actor.setPose('lying');scene.updateMatrixWorld(true);assert(new Real.Vector3(0,0,1).transformDirection(fig.matrixWorld).dot(new Real.Vector3(0,1,0))>.999);console.log('PASS lying body is face-up; standing pose can restore.');actor.setPose('standing');scene.updateMatrixWorld(true);assert(Math.abs(pos('head').y-standingHead)<.001);
console.log('Pose test uses real source GLB bone hierarchy; mesh skinning and visible seating require browser inspection.');
}
