// Production vehicle assets, full city/controller and real Three CPU geometry.
// The renderer and canvas are mocked: GPU appearance is checked separately.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as Real from '../dist/vendor/three.module.min.js';
import {mergeGeometries} from '../dist/vendor/BufferGeometryUtils.js';
const T=Real;
function geometryScene(raw){
 const data=Buffer.from(raw),length=data.readUInt32LE(12),j=JSON.parse(data.subarray(20,20+length).toString()),bin=data.subarray(28+length),types={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array,5122:Int16Array,5120:Int8Array},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 function attr(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],C=types[a.componentType],n=sizes[a.type],out=new C(a.count*n),offset=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||n*C.BYTES_PER_ELEMENT;for(let k=0;k<a.count;k++)for(let c=0;c<n;c++){const at=offset+k*stride+c*C.BYTES_PER_ELEMENT;out[k*n+c]=a.componentType===5126?bin.readFloatLE(at):a.componentType===5125?bin.readUInt32LE(at):a.componentType===5123?bin.readUInt16LE(at):a.componentType===5122?bin.readInt16LE(at):a.componentType===5120?bin.readInt8(at):bin.readUInt8(at)}return new T.BufferAttribute(out,n,!!a.normalized);}
 const materials=(j.materials||[]).map(m=>new T.MeshStandardMaterial({name:m.name||'',color:new T.Color().fromArray(m.pbrMetallicRoughness?.baseColorFactor||[1,1,1])}));
 function node(i){const n=j.nodes[i],o=new T.Group();o.name=n.name||'';if(n.matrix){o.matrix.fromArray(n.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale)}else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}if(n.mesh!==undefined)for(const p of j.meshes[n.mesh].primitives){const g=new T.BufferGeometry();for(const[name,id]of Object.entries(p.attributes)){const key={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',TEXCOORD_1:'uv1',COLOR_0:'color',TANGENT:'tangent'}[name];if(key)g.setAttribute(key,attr(id));}if(p.indices!==undefined)g.setIndex(attr(p.indices));const mesh=new T.Mesh(g,materials[p.material]||new T.MeshStandardMaterial());mesh.name=n.name||'';o.add(mesh);}for(const c of n.children||[])o.add(node(c));return o;}
 const scene=new T.Group();for(const i of j.scenes[j.scene||0].nodes)scene.add(node(i));scene.updateMatrixWorld(true);return scene;
}

let frameId=0,time=0,checks=0;
const frames=new Map(),actions=[],source=new URL('../Entwicklung/',import.meta.url);
const paint=new Proxy({measureText:s=>({width:s.length*20}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const canvas={width:1280,height:800,style:{},clientWidth:1280,clientHeight:800,getContext:()=>paint,getBoundingClientRect:()=>({width:1280,height:800}),addEventListener(){},removeEventListener(){},setPointerCapture(){}};
class Renderer{constructor(){this.shadowMap={};this.isWebGLRenderer=false;}setPixelRatio(){}setSize(){}render(s,c){s.updateMatrixWorld(true);c.updateMatrixWorld(true)}dispose(){}}
const THREE={...Real,WebGLRenderer:Renderer,TextureLoader:class{load(){return new Real.Texture()}}};
const window={THREE,devicePixelRatio:1,addEventListener(){},removeEventListener(){},GeometryTools:{mergeGeometries},cityAsset:n=>n,People3D:{attach(){return{update(){},setPose(){},dispose(){},ready:false,promise:Promise.resolve()}}},AssetLoader:{GLTFLoader:class{async parseAsync(raw){return{scene:geometryScene(raw)}}}}};
const context=vm.createContext({window,THREE,console,Map,Set,Math,Number,performance:{now:()=>0},document:{createElement:()=>({...canvas})},fetch:async file=>({ok:true,arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../dist/assets/'+file,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}),requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id),Image:class{constructor(){this.width=256;this.height=256}addEventListener(){}},ResizeObserver:class{observe(){}disconnect(){}}});
for(const name of ['rules.js','navigation.js','pub.js','stadt.js','fahrzeuge.js','mobilitaet.js','verkehr.js'])vm.runInContext(fs.readFileSync(new URL(name,source),'utf8'),context);
assert.equal(window.H3Vehicles.getStatus().sportsReady,false);
await window.H3Vehicles.preload();
assert.equal(window.H3Vehicles.getStatus().sportsReady,true);
let factoryCalls=0;const make=window.H3Vehicles.make;window.H3Vehicles.make=(...args)=>{factoryCalls++;return make(...args)};
const hooks='return {__test:{traffic:()=>traffic,fleet:()=>fleet,car:()=>car,city:()=>city,scene:()=>scene,camera:()=>camera,clearAt,clearOfCars,vehicleClear,vehicleWallsClear,cameraStep,place,stepCar,pending:()=>({pendingEnter,pendingExit}),velocity:()=>velocity,setVelocity(v){velocity=v},setWalk(x,z){mode="walk";pieces.char.position.set(x,groundHeight(x,z),z);characterHeading=0;footSpeed=walkVelocityX=walkVelocityZ=0;syncPose()},setCar(x,z,h){car.root.position.set(x,car.baseY??-.085,z);car.heading=vehicleHeading=h;car.root.rotation.y=-h;syncPose()}},init,resume';
const drive=fs.readFileSync(new URL('fahrt.js',source),'utf8').replace('return {init,resume',hooks);
vm.runInContext(drive,context);
const api=window.Drive;api.init(canvas,()=>{},e=>actions.push(e));const t=api.__test,traffic=t.traffic();
function test(name,fn){fn();checks++;console.log('PASS '+name)}
function frame(ms){const entry=frames.entries().next().value;assert(entry);frames.delete(entry[0]);entry[1](ms)}
function run(seconds){for(let k=0;k<Math.round(seconds*60);k++){time+=1000/60;frame(time)}}
function start(){api.pause();t.place();api.resume();time=0;frame(0)}
function intersects(a,b){const dx=b.x-a.x,dz=b.z-a.z;for(const h of [a.heading,b.heading])for(const side of [true,false]){const x=side?Math.cos(h):Math.sin(h),z=side?Math.sin(h):-Math.cos(h);let r=0;for(const p of[a,b]){const c=Math.cos(p.heading),s=Math.sin(p.heading);r+=Math.abs(x*c+z*s)*p.halfWidth+Math.abs(x*s-z*c)*p.halfLength;}if(Math.abs(dx*x+dz*z)>=r)return false;}return true}
function blockers(){return t.fleet().filter(v=>v.kind!=='scooter').map(v=>{const p=v.root.position,h=v.root.userData,o=h.collisionCenterZ||0;return{id:v.id,kind:'parked',heading:v.heading,x:p.x-Math.sin(v.heading)*o,z:p.z+Math.cos(v.heading)*o,halfWidth:h.collisionHalfWidth,halfLength:h.collisionHalfLength}})}
function safe(parked){const list=traffic.getObstacles();for(let i=0;i<list.length;i++){const a=list[i];assert([a.x,a.z,a.heading,a.halfWidth,a.halfLength].every(Number.isFinite));for(let j=0;j<i;j++)assert(!intersects(a,list[j]),a.id+' overlaps '+list[j].id);for(const b of parked)assert(!intersects(a,b),a.id+' overlaps '+b.id)}}
function resources(){const objects=[],geos=new Set(),mats=new Set();traffic.root.traverse(o=>{objects.push(o);if(o.geometry)geos.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))mats.add(m)});return{objects,geos,mats}}

test('16 traffic cars include three sport coupes, plus two parked sports; five clinical vehicles stay intact',()=>{
 const info=api.getInfo(),sports=info.mobility.filter(v=>v.modelIndex===5);
 assert.equal(traffic.getStatus().population,16);assert.equal(traffic.getStatus().cars,16);assert.equal(traffic.getStatus().prototypes,3);assert.equal(traffic.getStatus().sports,3);assert.equal(sports.length,5);
 assert.deepEqual(Array.from(info.cars,v=>v.type),['taxi','volunteer','wheelchair','lying','ambulance']);assert.equal(info.mobility.length,32);assert.equal(info.mobility.filter(v=>v.kind==='scooter').length,12);
 for(const v of sports){assert.equal(v.type,'civil');assert(v.civil);assert.match(v.name,/Sportwagen/)}
 const quay=t.fleet().find(v=>v.id==='city-car-1');assert.equal(quay.index,5);assert(Math.hypot(quay.root.position.x-t.city().spawn.x,quay.root.position.z-t.city().spawn.z)<10);
 assert.equal(factoryCalls,12,'five clinical + four parked + three stable traffic prototypes');
});
test('every sport hull and BL identity matches its source and parking spot is reachable',()=>{
 for(const v of t.fleet().filter(v=>v.index===5)){
  const h=v.root.userData;assert(h.collisionHalfWidth>.9&&h.collisionHalfWidth<1.3);assert(h.collisionHalfLength>2&&h.collisionHalfLength<2.5);assert(h.cameraRoofHeight>1&&h.cameraRoofHeight<1.7);assert.equal(h.registration,window.H3Vehicles.plateNumber({id:v.id}));
  const p=v.root.position,approach=p.x-h.collisionHalfWidth-.5;assert(t.clearAt(approach,p.z,.34)&&t.clearOfCars(approach,p.z,.34),v.id+' lacks clear approach');
  t.setWalk(approach,p.z);assert(api.enterVehicle(v.id));assert(t.vehicleClear(p.x,p.z,v.heading),v.id+' parked hull blocked');assert.equal(api.getInfo().vehicleModelIndex,5);assert.equal(api.getInfo().firstPerson,false);assert.equal(api.requestExit(),'exited');
 }
});
test('mixed traffic has safe collisions, finite interpolated wheels and stable resources for 120 simulated seconds',()=>{
 start();const parked=blockers(),before=resources(),factories=factoryCalls,obstacles=traffic.getObstacles(),identity=obstacles.slice(),previous=obstacles.map(v=>({x:v.x,z:v.z})),lastMoved=obstacles.map(()=>0);
 for(let k=0;k<120*60;k++){
  traffic.update(1/60,parked);if(k%12===0){safe(parked);traffic.render((k%3)/2)}
  if(k%60===0)obstacles.forEach((v,i)=>{if(Math.hypot(v.x-previous[i].x,v.z-previous[i].z)>.05)lastMoved[i]=k;previous[i].x=v.x;previous[i].z=v.z});
 }
 lastMoved.forEach((k,i)=>assert(k>90*60,obstacles[i].id+' permanently queued'));assert.equal(factoryCalls,factories);assert.deepEqual(resources(),before);assert.equal(traffic.getObstacles(),obstacles);obstacles.forEach((v,i)=>assert.equal(v,identity[i]));
 for(const p of traffic.root.children.filter(v=>v.isInstancedMesh)){assert(p.count<=16);for(let k=0;k<p.count*16;k++)assert(Number.isFinite(p.instanceMatrix.array[k]))}
});
test('reset deterministically restores all 16 and three sport prototypes without recreation',()=>{
 const parked=blockers(),factory=factoryCalls;traffic.reset();for(let k=0;k<240;k++)traffic.update(1/60,parked);const first=JSON.stringify(traffic.getVehicles());traffic.reset();for(let k=0;k<240;k++)traffic.update(1/60,parked);assert.equal(JSON.stringify(traffic.getVehicles()),first);assert.equal(factoryCalls,factory);assert.equal(traffic.getStatus().sports,3);
});
test('moving sport stops for Enter, transfers exact identity/paint/pose/hull, then can be driven and exited with F',()=>{
 start();run(1);const v={...traffic.getVehicles().find(v=>v.modelIndex===5)},before=traffic.getObstacles().find(q=>q.id===v.id);assert(v.speed>0);
 // Approach from the driver's side; the pedestrian and hold both request a stop.
 t.setWalk(v.x-Math.cos(v.heading)*(v.halfWidth+.65),v.z-Math.sin(v.heading)*(v.halfWidth+.65));assert.equal(api.requestEnter(v.id),'waiting');run(2);
 assert.equal(api.getInfo().mode,'car');const model=t.car(),p=model.root.position;assert.equal(model.index,5);assert.equal(model.type,'civil');assert(model.fromTraffic&&model.civil);assert.equal(model.id,v.id);assert.match(model.spec.name,/Sportwagen/);assert.equal(model.spec.top,19.4);assert.equal(model.root.userData.registration,window.H3Vehicles.plateNumber({id:v.id}));assert.equal(model.root.userData.collisionHalfWidth,before.halfWidth);assert.equal(model.root.userData.collisionHalfLength,before.halfLength);
 assert.equal(api.getInfo().vehicleName,model.spec.name);assert.equal(api.getInfo().vehicleModelIndex,5);assert.equal(api.getInfo().firstPerson,false);assert.equal(traffic.getStatus().cars,15);assert.equal(traffic.getStatus().sports,2);assert(!traffic.getObstacles().some(q=>q.id===model.id));assert.equal(api.getInfo().mobility.filter(q=>q.id===model.id).length,1);
 assert(p.distanceTo(new Real.Vector3(v.x,model.baseY,v.z))<2,'transfer jumped pose');
 t.setCar(-80,0,0);const startZ=model.root.position.z;api.input('gas',true);run(1.25);api.input('gas',false);assert(model.root.position.z<startZ-2);assert(t.velocity()>0);
 t.cameraStep(0);const camera=t.camera(),offset=camera.position.clone().sub(model.root.position);assert(offset.z>3&&offset.y>model.root.userData.cameraRoofHeight);assert.equal(api.getInfo().firstPerson,false);
 assert.equal(api.requestExit(),'braking');run(2);assert.equal(api.getInfo().mode,'walk');assert.equal(t.velocity(),0);const info=api.getInfo();assert(t.clearAt(info.x,info.z,.34)&&t.clearOfCars(info.x,info.z,.34));assert(api.enterVehicle(model.id));assert.equal(api.requestExit(),'exited');
});
test('sport acceleration reaches the bounded 70 km/h profile and steering stays gradual at top speed',()=>{
 const model=t.car();t.setWalk(model.root.position.x-2,model.root.position.z);assert(api.enterVehicle(model.id));api.input('gas',true);
 // Reuse one clear road point to isolate the speed cap from the finite city.
 for(let k=0;k<6*60;k++){t.setCar(-80,0,0);t.stepCar(1/60);assert(t.velocity()<=19.4)}
 assert.equal(t.velocity(),19.4);api.input('gas',false);api.input('right',true);t.setCar(-80,0,0);t.stepCar(1/60);assert(api.getInfo().heading>0&&api.getInfo().heading<.01,'top-speed steering snapped');api.input('right',false);t.setVelocity(0);assert.equal(api.requestExit(),'exited');
});
test('sport collision envelope blocks a wall and other car; no civil car can transport the patient',()=>{
 const sport=t.car();t.setWalk(sport.root.position.x-2,sport.root.position.z);assert(api.enterVehicle(sport.id));t.setCar(-80,0,0);const p=sport.root.position,h=sport.root.userData,wall={minX:p.x-.5,maxX:p.x+.5,minZ:p.z-h.collisionHalfLength-.15,maxZ:p.z-h.collisionHalfLength+.1};t.city().blocks.push(wall);assert.equal(t.vehicleWallsClear(p.x,p.z,0),false);t.city().blocks.pop();assert(t.vehicleWallsClear(p.x,p.z,0));
 assert.equal(t.vehicleClear(-82.5,12.6,0),false,'sport passed through parked taxi');
 const mission={id:'sport-civil-test',pickup:{x:-88,z:-52},dropoff:{x:77,z:54},patient:{name:'Fiktiver Test',sex:'female',mobility:'walk'},vehicleType:'taxi'};api.setMission(mission);const q=t.fleet().find(v=>v.index===5);t.setWalk(q.root.position.x-2,q.root.position.z);assert(api.enterVehicle(q.id));t.setCar(-80,-52,0);assert.equal(api.loadPatient(),false);assert.equal(api.getInfo().cars.length,5);
});
test('mission reset frees transferred sport resources once and restores traffic; dispose is idempotent',()=>{
 start();const v=traffic.getVehicles().find(v=>v.modelIndex===5);t.setWalk(v.x-2,v.z);assert(api.enterVehicle(v.id));const model=t.car(),geometry=new Set(),materials=new Set(),disposed={geometry:0,material:0};model.root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))materials.add(m)});for(const g of geometry)g.addEventListener('dispose',()=>disposed.geometry++);for(const m of materials)m.addEventListener('dispose',()=>disposed.material++);
 t.place();assert(!model.root.parent);assert(!t.fleet().includes(model));assert.equal(disposed.geometry,geometry.size);assert.equal(disposed.material,materials.size);assert.equal(traffic.getStatus().cars,16);assert.equal(traffic.getStatus().sports,3);t.place();assert.equal(disposed.geometry,geometry.size);assert.equal(disposed.material,materials.size);
 const maps=new Set(traffic.root.children.filter(o=>o.userData.h3Plates).map(o=>o.children[0].material.map));let freed=0;for(const map of maps)map.addEventListener('dispose',()=>freed++);api.reset();assert.equal(freed,16);traffic.dispose();assert.equal(freed,16);assert.equal(traffic.getStatus().disposed,true);
});
console.log(checks+' V17 sport traffic/controller/actual-GLB checks passed. GPU appearance excluded.');
