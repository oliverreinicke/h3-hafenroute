// Actual Three.js geometry and collision contract; GPU and image appearance are reviewed in the browser.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from '../dist/vendor/three.module.min.js';
const code=fs.readFileSync(new URL('../Entwicklung/pub.js',import.meta.url),'utf8');
const labels=[],actors=[];
const ctx=new Proxy({
 measureText:s=>({width:s.length*20}),
 fillText(text){labels.push(text);},
 createLinearGradient(){return {addColorStop(){}};},
 createRadialGradient(){return {addColorStop(){}};}
},{get:(o,k)=>k in o?o[k]:(()=>{})});
const window={cityAsset:n=>n,cityTexture(T,n){const t=new T.Texture();t.name=n;return t;},
 People3D:{attach(anchor,spec){const actor={anchor,spec,pose:null,updates:0,disposed:0,promise:Promise.resolve(),setPose(p){this.pose=p;},update(){this.updates++;},dispose(){this.disposed++;}};actors.push(actor);return actor;}}};
const sandbox=vm.createContext({window,console,Map,Set,Math,Number,document:{createElement:()=>({getContext:()=>ctx})}});
vm.runInContext(code,sandbox);
const parent=new T.Group(),pub=window.GCBPub.create(T,parent,{x:-95,z:-15,w:6.2,d:8});
parent.updateMatrixWorld(true);await pub.ready;
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function clearAt(x,z,r=.32){return pub.blocks.every(b=>{const nx=Math.max(b.minX,Math.min(b.maxX,x)),nz=Math.max(b.minZ,Math.min(b.maxZ,z));return (x-nx)**2+(z-nz)**2>=r*r;});}
const meshes=[];parent.traverse(o=>{if(o.isMesh)meshes.push(o);});
const geometries=new Set(meshes.map(o=>o.geometry)),materials=new Set(meshes.map(o=>o.material)),textures=new Set();
for(const m of materials)for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
const triangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0);
const ids=['burger','flammkuchen','fries','salad'];
check('one real pub has its readable requested name and stable public API',()=>{
 assert.equal(pub.root.name,'gcb_pub');assert(labels.includes('GCB Pub'));assert(labels.includes('GCB Küche'));
 for(const k of['update','setOrder','contains','dispose'])assert.equal(typeof pub[k],'function');
 assert.equal(pub.floorY,-.15);assert(pub.contains(-94.3,-15));assert(!pub.contains(-90,-15));
 assert.equal(pub.entrance.x,-91.9);assert.equal(pub.entrance.z,-15);
 assert.equal(pub.interior.x,-94.3);assert.equal(pub.counter.x,-95.3);
});
check('all positions, UVs, normals, colours and computed bounds are finite',()=>{
 for(const m of meshes){
  const g=m.geometry;
  for(const a of Object.values(g.attributes))for(const v of a.array)assert(Number.isFinite(v),m.name);
  g.computeBoundingBox();g.computeBoundingSphere();assert(Number.isFinite(g.boundingSphere.radius));
  for(let i=0;i<g.attributes.normal.count;i++)assert(Math.abs(new T.Vector3().fromBufferAttribute(g.attributes.normal,i).length()-1)<1e-5,m.name+' non-unit normal');
 }
});
check('source sign faces the street and the room has a single flat floor',()=>{
 const sign=pub.root.getObjectByName('gcb_sign'),direction=new T.Vector3(0,0,1).applyQuaternion(sign.quaternion);
 assert(direction.x>.9999);assert.equal(sign.position.x,3.317);
 const floor=meshes.find(m=>m.name==='gcb_furnishing_floor'),b=floor.geometry.boundingBox;
 assert(Math.abs(b.max.y-pub.floorY)<1e-6);assert(b.min.x<-3&&b.max.x>3);assert(b.min.z<-3.9&&b.max.z>3.9);
 const retainedPavementY=-.17;assert(b.max.y-retainedPavementY>=.01,'pub floor is coplanar with the retained city pavement');
});
check('the real 1.88-m portal and centre aisle pass a .32-m character in both directions',()=>{
 for(let x=-90.8;x>=-95.3;x-=.025){assert(clearAt(x,-15),'entry blocked at '+x);assert(clearAt(x,-14.85),'entry shoulder blocked at '+x);}
 for(let x=-95.3;x<=-90.8;x+=.025)assert(clearAt(x,-15),'exit blocked at '+x);
 for(const p of[pub.entrance,pub.interior,pub.counter])assert(clearAt(p.x,p.z),'declared point blocked');
 assert(!pub.blocks.some(b=>b.minX<-97&&b.maxX>-93&&b.minZ<-18&&b.maxZ>-12),'whole footprint is blocked');
});
check('solid walls and real furniture block feet while low furniture does not force the camera down',()=>{
 for(const [x,z]of[[-98,-15],[-95,-18.9],[-95,-11.1],[-96.85,-15],[-95.8,-16.2],[-93.77,-12.64]])assert(!clearAt(x,z),'solid obstacle open '+x+','+z);
 const low=pub.blocks.filter(b=>/counter|table|stool/.test(b.name));assert.equal(low.length,6);assert(low.every(b=>b.cameraBlocking===false));
 assert(pub.blocks.filter(b=>/wall|door/.test(b.name)).every(b=>b.cameraBlocking!==false));
});
check('batched non-actor geometry and warm lighting stay within the declared small-pub budget',()=>{
 assert(meshes.length<=40,'draw objects '+meshes.length);assert(triangles<25000,'triangles '+triangles);
 const lights=[];parent.traverse(o=>{if(o.isPointLight)lights.push(o);});
 assert.equal(lights.length,0,'pub must not add city-wide light shader variants');
 assert(pub.root.getObjectByName('gcb_baked_light_pools')?.isMesh);
 assert(meshes.some(m=>m.material.emissiveIntensity>0&&m.material.emissive?.r>m.material.emissive?.b));
});
check('the existing rigged waiter and seated guest load in the agreed poses and face the room',()=>{
 assert.equal(actors.length,2);assert.equal(actors[0].pose,'standing');assert.equal(actors[1].pose,'seated');
 const waiter=pub.root.getObjectByName('gcb_waiter'),guest=pub.root.getObjectByName('gcb_guest');
 assert(new T.Vector3(0,0,1).applyQuaternion(waiter.quaternion).x>.99);
 assert(waiter.position.z-.24>1.13,'waiter overlaps the back-bar shelves');
 assert(new T.Vector3(0,0,1).applyQuaternion(guest.quaternion).z<-.99);
 assert(guest.position.y>pub.floorY);
});
check('all four dishes are actual distinct geometry and sit on top of the counter',()=>{
 for(const id of ids){
  const group=pub.root.getObjectByName('gcb_order_'+id);assert(group?.isGroup);assert(group.children.length>=2);
  assert.equal(group.visible,false);
  const b=new T.Box3().setFromObject(group);assert(b.min.y>=1.039&&b.min.y<1.044,'dish floats below/above counter '+id);
  assert(b.max.y>1.13&&b.max.y<1.7,'dish has no food '+id);
 }
});
check('orders show exactly one prebuilt dish, reject unknown choices, and allocate no new scene resources',()=>{
 const beforeChildren=pub.root.children.length;
 for(let i=0;i<160;i++)for(const id of ids){
  assert.equal(pub.setOrder(id),true);
  assert.deepEqual(ids.filter(k=>pub.root.getObjectByName('gcb_order_'+k).visible),[id]);
 }
 assert.equal(pub.setOrder('unknown'),false);assert.equal(pub.setOrder({id:'unknown'}),false);assert.equal(pub.setOrder(42),false);
 assert.equal(pub.setOrder({id:'burger'}),true);assert.equal(pub.setOrder(null),true);
 assert(ids.every(id=>!pub.root.getObjectByName('gcb_order_'+id).visible));assert.equal(pub.root.children.length,beforeChildren);
 const now=[];parent.traverse(o=>{if(o.isMesh)now.push(o);});assert.deepEqual(new Set(now.map(o=>o.geometry)),geometries);assert.deepEqual(new Set(now.map(o=>o.material)),materials);
});
check('1600 scene updates retain collider identities, world coordinates and GPU resource identities',()=>{
 const blockState=JSON.stringify(pub.blocks),children=pub.root.children.slice();
 for(let i=0;i<1600;i++)pub.update(1/60,i/60,{x:-94.3,z:-15});
 assert.equal(JSON.stringify(pub.blocks),blockState);assert.deepEqual(pub.root.children,children);
 const now=[];parent.traverse(o=>{if(o.isMesh)now.push(o);});assert.deepEqual(new Set(now.map(o=>o.geometry)),geometries);assert.deepEqual(new Set(now.map(o=>o.material)),materials);
 assert(actors.every(a=>a.updates===1600));
});
check('far-away pub actors are hidden, disposal is idempotent, and ordinary scene cleanup sees every owned resource',()=>{
 pub.update(1/60,30,{x:90,z:90});assert.equal(pub.root.getObjectByName('gcb_waiter').visible,false);assert.equal(pub.root.getObjectByName('gcb_guest').visible,false);
 const before=actors.map(a=>a.updates);pub.dispose();pub.dispose();pub.update(1/60,31,{x:-94.3,z:-15});assert.deepEqual(actors.map(a=>a.updates),before);assert(actors.every(a=>a.disposed===1));assert.equal(pub.setOrder('salad'),false);
 const disposed=new Set();for(const r of[...geometries,...materials,...textures])r.addEventListener('dispose',()=>disposed.add(r));
 for(const r of[...geometries,...materials,...textures])r.dispose();assert.equal(disposed.size,geometries.size+materials.size+textures.size);
});
console.log(JSON.stringify({sourceSHA256:crypto.createHash('sha256').update(code).digest('hex'),drawObjects:meshes.length,triangles,geometries:geometries.size,materials:materials.size,textures:textures.size}));
console.log(checks+' GCB Pub geometry/collision/resource checks passed; browser appearance and GPU frame cost remain separate.');

