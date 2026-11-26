import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from '../dist/vendor/three.module.min.js';
const dirname=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,dirname),'utf8');
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name)}
function world(source){
 const ctx=new Proxy({measureText:s=>({width:s.length*24}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
 const window={cityAsset:n=>n,cityTexture(T,n){const tex=new T.Texture();tex.name=n;return tex},People3D:{attach(){return{update(){},setPose(){},promise:Promise.resolve()}}}};
 const context=vm.createContext({window,console,Map,Set,Math,Number,document:{createElement:()=>({width:512,height:256,getContext:()=>ctx})},Image:class{addEventListener(){}}});
 vm.runInContext(source,context);const scene=new T.Scene(),city=window.makeCity(T,scene);return {scene,city};
}
const before=JSON.parse(read('tests/fixtures/city-v5-baseline.json'));
const after=world(read('Entwicklung/stadt.js'));
const stable=o=>JSON.stringify(o);
for(const k of ['blocks','targets','spawn','carSpawn','bounds','parkedCars'])check(k+' preserves actual V5 city data',()=>assert.equal(stable(after.city[k]),stable(before.city[k])));
const meshes=[];after.scene.traverse(o=>{if(o.isMesh)meshes.push(o)});
check('all generated coordinates/normals/UVs and instance transforms are finite',()=>{for(const o of meshes){for(const a of Object.values(o.geometry.attributes))for(const v of a.array)assert(Number.isFinite(v));if(o.isInstancedMesh)for(const v of o.instanceMatrix.array)assert(Number.isFinite(v))}});
const leaves=meshes.filter(o=>o.material.map?.name==='h3-v6-platane-zweig.webp');
check('branched leafy trees use shared district batches, depth-writing cutout leaves and matching shadow mask',()=>{assert(leaves.length>=4&&leaves.length<=32);const unique=new Set(leaves.map(o=>o.geometry));assert.equal(unique.size,2);for(const o of leaves){assert(o.isInstancedMesh&&o.frustumCulled&&o.castShadow);assert(o.material.depthWrite);assert(!o.material.transparent);assert(o.material.alphaTest>.2);assert(o.customDepthMaterial?.isMeshDepthMaterial);assert.equal(o.customDepthMaterial.map,o.material.map);assert.equal(o.customDepthMaterial.alphaTest,o.material.alphaTest)}});
check('bark has spatial UVs, local colour and normal maps',()=>{const wood=meshes.filter(o=>o.material.map?.name==='h3-v6-platanenrinde.jpg');assert(wood.length>0);for(const o of wood){assert(o.geometry.attributes.uv);assert.equal(o.material.normalMap?.name,'h3-v6-platanenrinde-n.jpg');assert.equal(o.material.normalMap.colorSpace,T.NoColorSpace)}});
check('photographic masonry and recessed reflective window bays use separate materials',()=>{const photo=meshes.filter(o=>o.material.map?.name==='h3-v6-kalk.jpg');assert(photo.some(o=>o.material.isMeshPhysicalMaterial));assert(photo.some(o=>o.material.isMeshStandardMaterial&&!o.material.isMeshPhysicalMaterial));for(const o of photo)assert(o.geometry.attributes.uv.count>100)});
check('ground uses matched locally decoded colour/normal/roughness maps',()=>{const floors=meshes.filter(o=>o.material.map?.name==='h3-v6-belag.jpg'||o.material.map?.name==='h3-v6-quaistein.jpg');assert.equal(floors.length,9);for(const o of floors){assert(o.material.normalMap&&o.material.roughnessMap);assert.equal(o.material.normalMap.colorSpace,T.NoColorSpace);assert.equal(o.material.roughnessMap.colorSpace,T.NoColorSpace);assert(o.receiveShadow)}});
const cost=w=>{let meshes=0,instances=0,triangles=0;w.scene.traverse(o=>{if(!o.isMesh)return;meshes++;instances+=o.isInstancedMesh?o.count:0;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1)});return {meshes,instances,triangles}};
const original=before.cost,current=cost(after);
check('detailed city remains below V5 scene geometry and mesh budget',()=>{assert(current.meshes<original.meshes);assert(current.instances<original.instances*.4);assert(current.triangles<original.triangles*.75)});
check('wind update changes only uniforms and does not allocate new scene meshes',()=>{const count=meshes.length,sceneChildren=after.scene.children.length;for(let i=0;i<200;i++)after.city.update(1/60,i/60);let updated=0;after.scene.traverse(o=>{if(o.isMesh)updated++});assert.equal(updated,count);assert.equal(after.scene.children.length,sceneChildren)});
const audit=JSON.parse(fs.readFileSync(new URL('./fixtures/asset-hashes.json',import.meta.url),'utf8'));
for(const a of audit.assets)check(a.asset+' hash matches the retained source snapshot',()=>{const bytes=fs.readFileSync(new URL('dist/assets/'+a.asset,dirname));assert.equal(bytes.length,a.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256)});
// Exercise actual decode barrier and clone invalidation for the new normal-map naming convention.
{
 const images=[],styles=[];const window={cityAsset:n=>n};
 const context=vm.createContext({window,console,document:{createElement:()=>({width:0,height:0,getContext:()=>({set fillStyle(s){styles.push(s)},fillRect(){}})})},Image:class{constructor(){images.push(this)}}});
 vm.runInContext(read('Entwicklung/texturen.js'),context);
 const texture=window.cityTexture(T,'h3-v6-platanenrinde-n.jpg'),clone=texture.clone();let ready=false;const task=window.cityTextureReady().then(()=>ready=true);await Promise.resolve();
 check('new normal names get a neutral valid placeholder and are awaited',()=>{assert.equal(styles[0],'#8080ff');assert(!ready);assert.equal(texture.image.width,2)});
 images[0].onload();await task;check('actual image decode resolves the barrier and updates clones',()=>{assert(ready);assert.equal(texture.image,images[0]);assert.equal(clone.image,images[0])});
}
console.log(JSON.stringify({before:original,after:current}));
console.log(checks+' V6 graphics checks passed. Geometry checks do not measure GPU FPS or replace browser inspection.');
