// Actual Three geometry/material contracts; canvas painting and WebGL are the explicit boundary.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from '../dist/vendor/three.module.min.js';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
// Retained public V16 numerical data: a source export needs neither git nor old commits.
const baseline=JSON.parse(read('tests/fixtures/world-v16.json'));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
function world(source){
 const ctx=new Proxy({measureText:s=>({width:s.length*24}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
 const window={cityAsset:n=>n,cityTexture(T,n){const tx=new T.Texture();tx.name=n;return tx;},People3D:{attach(){return{update(){},setPose(){},dispose(){},promise:Promise.resolve()};}}};
 const context=vm.createContext({window,console,Map,Set,Math,Number,document:{createElement:()=>({getContext:()=>ctx})},Image:class{addEventListener(){}}});
 vm.runInContext(read('Entwicklung/pub.js'),context);vm.runInContext(source,context);
 const scene=new T.Scene(),city=window.makeCity(T,scene);scene.updateMatrixWorld(true);
 const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o);});return{scene,city,meshes};
}
const current=world(read('Entwicklung/stadt.js'));
for(const key of['blocks','targets','spawn','carSpawn','bounds','parkedCars'])check('actual '+key+' identical to public V16 fixture',()=>assert.equal(JSON.stringify(current.city[key]),JSON.stringify(baseline.world[key])));
const walkerState=w=>w.city.pedestrians.map(({x,z,id})=>({x,z,id}));
check('NPC routes/identities start at the exact V16 positions',()=>assert.equal(JSON.stringify(walkerState(current)),JSON.stringify(baseline.pedestrians)));
check('all real geometry attributes and instance matrices are finite',()=>{
 for(const mesh of current.meshes){
  for(const attr of Object.values(mesh.geometry.attributes))for(const v of attr.array)assert(Number.isFinite(v),mesh.name);
  if(mesh.isInstancedMesh)for(const v of mesh.instanceMatrix.array)assert(Number.isFinite(v),mesh.name);
 }
});
const cost=w=>({drawObjects:w.meshes.length,triangles:w.meshes.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1),0)});
const before=baseline.staticBudget,after=cost(current);
check('additional entire-city draw objects <= 10 and triangles <= 10%',()=>{
 assert(after.drawObjects-before.drawObjects<=10,JSON.stringify({before,after}));
 assert(after.triangles<=before.triangles*1.10,JSON.stringify({before,after}));
});
const masonry=current.meshes.filter(o=>/^city_masonry_/.test(o.name));
const glass=current.meshes.filter(o=>/^city_recessed_glazing_/.test(o.name));
check('all six facades use actual linear vertex variation and matte non-metal masonry',()=>{
 assert.equal(masonry.length,6);assert.equal(glass.length,6);
 for(const o of masonry){const m=o.material,c=o.geometry.attributes.color;
  assert(m.vertexColors);assert.equal(c.count,o.geometry.attributes.position.count);assert(m.roughness>=.67);assert(m.metalness<=.05);
  assert(c.array.some(v=>v<.65),'recess tint missing');assert(c.array.some(v=>v>.88),'lit mineral surface missing');
  if(!m.map.name.includes('office')){assert.equal(m.normalMap.name,'beige_wall_001_nor_gl_1k.jpg');assert.equal(m.normalMap.colorSpace,T.NoColorSpace);assert(m.normalScale.x>0&&m.normalScale.x<.2);}
 }
});
check('glazing remains separate smooth dielectric geometry with no costly transmission pass',()=>{
 for(const o of glass){const m=o.material;assert(m.isMeshPhysicalMaterial);assert.equal(m.metalness,0);assert.equal(m.ior,1.5);assert(m.roughness<=.22);assert.equal(m.transmission,0);assert.equal(m.transparent,false);assert.equal(m.normalMap,null);assert(m.vertexColors);}
});
check('touched facade quads are non-degenerate and historical planes retain their exact offsets',()=>{
 for(const o of[...masonry,...glass]){
  const p=o.geometry.attributes.position,prior=baseline.facades.find(v=>v.map===o.material.map.name&&v.glazing===!!o.material.isMeshPhysicalMaterial&&v.vertices===p.count&&v.first[0]===p.getX(0)&&v.first[2]===p.getZ(0));
  assert(prior,o.name);assert.equal(sha(JSON.stringify(Array.from(p.array))),prior.positionSHA256,'facade/glass plane separation changed');
  const index=o.geometry.index.array;
  for(let i=0;i<index.length;i+=3){const a=new T.Vector3().fromBufferAttribute(p,index[i]),b=new T.Vector3().fromBufferAttribute(p,index[i+1]),c=new T.Vector3().fromBufferAttribute(p,index[i+2]);assert(new T.Vector3().crossVectors(b.sub(a),c.sub(a)).lengthSq()>1e-10);}
 }
});
const zinc=current.meshes.filter(o=>o.material?.name==='city_zinc_drainage');
check('zinc drainage uses at most two shared instanced batches and does not cast extra shadows',()=>{
 assert.equal(zinc.length,2);assert(zinc.every(o=>o.isInstancedMesh&&!o.castShadow));
 const cylinder=zinc.find(o=>o.geometry.type==='CylinderGeometry');assert(cylinder&&cylinder.count>80&&cylinder.count<160);
 const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();
 for(let i=0;i<cylinder.count;i++){cylinder.getMatrixAt(i,matrix);matrix.decompose(p,q,s);assert(Math.abs(s.x-.105)<1e-6);assert(Math.abs(s.z-.105)<1e-6);assert(s.y>3&&s.y<30);}
});
check('new mineral plinths have butt joints without coplanar overlapping top surfaces',()=>{
 const plinths=[],m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();
 for(const o of current.meshes.filter(o=>o.isInstancedMesh&&o.geometry.type==='BoxGeometry'))for(let i=0;i<o.count;i++){
  o.getMatrixAt(i,m);m.decompose(p,q,s);if(Math.abs(p.y-.18)<1e-6&&Math.abs(s.y-.43)<1e-6)plinths.push({minX:p.x-s.x/2,maxX:p.x+s.x/2,minZ:p.z-s.z/2,maxZ:p.z+s.z/2});
 }
 assert(plinths.length>100);for(let a=0;a<plinths.length;a++)for(let b=a+1;b<plinths.length;b++){
  const u=plinths[a],v=plinths[b],overlapX=Math.min(u.maxX,v.maxX)-Math.max(u.minX,v.minX),overlapZ=Math.min(u.maxZ,v.maxZ)-Math.max(u.minZ,v.minZ);
  assert(overlapX<1e-5||overlapZ<1e-5,'coplanar plinth overlap '+a+'/'+b);
 }
});
check('distant towers share one mineral surface batch; panes keep one shared geometry and varied instance colours',()=>{
 const far=current.meshes.filter(o=>o.material?.name==='city_far_masonry');assert.equal(far.length,1);assert(far[0].isInstancedMesh);assert.equal(far[0].count,198);assert.equal(far[0].material.map.name,'city_far_mineral_surface');
 const panes=current.meshes.filter(o=>o.material?.name==='distant_window_glazing');assert.equal(new Set(panes.map(o=>o.geometry)).size,1);const tones=new Set();for(const o of panes){assert(!o.material.transparent);for(let i=0;i<o.instanceColor.count;i++)tones.add([o.instanceColor.getX(i),o.instanceColor.getY(i),o.instanceColor.getZ(i)].join('/'));}assert(tones.size>=8);
});
check('world daylight retains exactly three lights, one shadow caster and the agreed neutral fill',()=>{
 const lights=[];current.scene.traverse(o=>{if(o.isLight)lights.push(o);});assert.equal(lights.length,3);assert.equal(lights.filter(o=>o.castShadow).length,1);assert(!lights.some(o=>o.isPointLight||o.isSpotLight));
 const fill=lights.find(o=>o.isHemisphereLight);assert.equal(fill.intensity,.72);assert.equal(fill.groundColor.getHex(),0x696b65);assert.equal(lights.find(o=>o.castShadow).intensity,2.65);
});
function snapshot(){const objects=[],geometry=new Set(),materials=new Set(),textures=new Set(),versions=[];current.scene.traverse(o=>{objects.push(o);if(o.geometry)geometry.add(o.geometry);for(const m of(o.material?(Array.isArray(o.material)?o.material:[o.material]):[])){materials.add(m);versions.push([m,m.version]);for(const v of Object.values(m))if(v?.isTexture){textures.add(v);versions.push([v,v.version]);}}});return{objects,geometry,materials,textures,versions};}
check('600 frames allocate no scene geometry, materials or textures and preserve their versions',()=>{
 const start=snapshot();for(let i=0;i<600;i++)current.city.update(1/60,i/60,{x:i%2?-85:24,z:i%3?-15:54});const end=snapshot();
 for(const key of['objects','geometry','materials','textures'])assert.deepEqual(end[key],start[key]);for(const [resource,version]of start.versions)assert.equal(resource.version,version);
});
check('Pub V16 source fingerprint and runtime lighting/LOD contract stay untouched',()=>{
 assert.equal(sha(read('Entwicklung/pub.js')),baseline.pub.sourceSHA256);
 const pub=current.city.pub;assert(pub);assert.equal(JSON.stringify(pub.blocks),JSON.stringify(baseline.pub.blocks));let count=0;pub.root.traverse(o=>{if(o.isLight)count++;});assert.equal(count,0);
});
check('photographic colour and data maps have explicit independent colour roles through decode and clone',()=>{
 const images=[],styles=[],window={cityAsset:n=>n};
 const c=vm.createContext({window,console,document:{createElement:()=>({width:2,height:2,getContext:()=>({set fillStyle(v){styles.push(v);},fillRect(){}})})},Image:class{constructor(){images.push(this);}}});
 vm.runInContext(read('Entwicklung/texturen.js'),c);
 const colour=window.cityTexture(T,'h3-v6-kalk.jpg'),normal=window.cityTexture(T,'beige_wall_001_nor_gl_1k.jpg'),rough=window.cityTexture(T,'h3-v6-belag-r.jpg'),clone=rough.clone();
 assert.equal(colour.colorSpace,T.SRGBColorSpace);assert.equal(normal.colorSpace,T.NoColorSpace);assert.equal(rough.colorSpace,T.NoColorSpace);assert.equal(clone.colorSpace,T.NoColorSpace);assert.equal(rough.name,'h3-v6-belag-r.jpg');assert.deepEqual(styles,['#b5b1a7','#8080ff','#d4d4d4']);
 for(const image of images)image.onload();assert.equal(clone.source,rough.source);assert.equal(clone.image,images[2]);
});
console.log(JSON.stringify({baseline:baseline.baseline,before,after,addedDrawObjects:after.drawObjects-before.drawObjects,addedTrianglePercent:100*(after.triangles/before.triangles-1),sourceSHA256:sha(read('Entwicklung/stadt.js'))}));
console.log(checks+' actual Three world/material checks passed. GPU time, canvas raster quality and visible z-fighting require browser inspection; no SSR or AAA claim.');
