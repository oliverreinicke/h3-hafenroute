// Real Three.js geometry checks for the authored harbour boats. No renderer/FPS claims.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from '../dist/vendor/three.module.min.js';
const repo=new URL('../',import.meta.url);
const source=fs.readFileSync(new URL('Entwicklung/stadt.js',repo),'utf8');
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/harbor-v13.json',import.meta.url),'utf8'));
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function world(code){
  const ctx=new Proxy({measureText:s=>({width:s.length*24}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
  const window={cityAsset:n=>n,cityTexture(T,n){const tex=new T.Texture();tex.name=n;return tex;},People3D:{attach(){return {update(){},setPose(){},promise:Promise.resolve()};}}};
  const context=vm.createContext({window,console,Map,Set,Math,Number,document:{createElement:()=>({getContext:()=>ctx})},Image:class{addEventListener(){}}});
  vm.runInContext(code,context);const scene=new T.Scene(),city=window.makeCity(T,scene);scene.updateMatrixWorld(true);return {scene,city};
}
const after=world(source),boats=[];
after.scene.traverse(o=>{if(o.userData.harborBoat)boats.push(o);});
const state=w=>Object.fromEntries(['blocks','targets','spawn','carSpawn','bounds','parkedCars'].map(k=>[k,w.city[k]]));
const walkerState=w=>w.city.pedestrians.map(({x,z,id})=>({x,z,id}));
const staticData=JSON.stringify(state(after)),walkerIds=walkerState(after).map(p=>p.id);
check('transport targets, colliders, spawn and NPC positions remain finite and usable',()=>{
  assert.equal(after.city.targets.length,5);assert(after.city.blocks.length>0);assert(after.city.pedestrians.length>0);
  for(const p of[...after.city.targets,after.city.spawn,after.city.carSpawn,...walkerState(after)])assert(Number.isFinite(p.x)&&Number.isFinite(p.z));
  for(const b of after.city.blocks)assert(b.minX<b.maxX&&b.minZ<b.maxZ);
});
check('three different metre-scaled vessels occupy the original water positions',()=>{
  assert.equal(boats.length,3);
  assert.deepEqual(boats.map(o=>o.userData.harborBoat),['sail','cabin','open']);
  assert.deepEqual(boats.map(o=>[o.position.x,o.position.z]),baseline.boatPositionsXZ);
  assert(boats.every(o=>Math.abs(o.position.y+1.03)<1e-9));
});
const boatMeshes=[];for(const b of boats)b.traverse(o=>{if(o.isMesh)boatMeshes.push(o);});
const contacts=after.scene.getObjectByName('harbor_boat_water_contacts'),moorings=after.scene.getObjectByName('harbor_mooring_lines');
check('all boat buffers have finite coordinates, UVs, colours and unit normals',()=>{
  for(const o of boatMeshes){
    const a=o.geometry.attributes;for(const key of ['position','normal','uv','color']){assert(a[key],o.name+' '+key);for(const v of a[key].array)assert(Number.isFinite(v),o.name+' '+key);}
    for(let i=0;i<a.normal.count;i++){const length=Math.hypot(a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i));assert(Math.abs(length-1)<1e-5,o.name+' non-unit normal');}
    assert.equal(o.geometry.groups.length,0,'each material batch needs one draw');
  }
});
function shell(b){
  const mesh=b.children.find(o=>o.isMesh&&o.userData.harborBoatPart==='body'),p=mesh.geometry.attributes.position;
  return {p,count:b.userData.hullSurfaceVertices};
}
function key(p,i){return [p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');}
check('actual hull/deck/bow/stern triangles form closed, outward-oriented surfaces',()=>{
  for(const b of boats){
    const {p,count}=shell(b),edges=new Map();let volume=0;
    for(let i=0;i<count;i+=3){
      const a=new T.Vector3().fromBufferAttribute(p,i),v=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
      assert(new T.Vector3().crossVectors(v.clone().sub(a),c.clone().sub(a)).lengthSq()>1e-16,'degenerate hull triangle');
      volume+=a.dot(new T.Vector3().crossVectors(v,c))/6;
      for(const [u,v]of[[i,i+1],[i+1,i+2],[i+2,i]]){const k=[key(p,u),key(p,v)].sort().join('|');edges.set(k,(edges.get(k)??0)+1);}
    }
    assert([...edges.values()].every(n=>n===2),b.name+' has an open or overlapping hull edge');
    assert(volume>0,b.name+' hull faces point inward');
  }
});
check('measured hulls have real draft, narrow bows, broad sterns and sensible proportions',()=>{
  for(const b of boats){
    const {p,count}=shell(b),bounds=new T.Box3();for(let i=0;i<count;i++)bounds.expandByPoint(new T.Vector3().fromBufferAttribute(p,i));
    const dim=b.userData.dimensions,s=b.scale.x,size=bounds.getSize(new T.Vector3());
    assert(Math.abs(size.z*s-dim.length)<1e-5);assert(Math.abs(size.x*s-dim.beam)<1e-5);assert(Math.abs(-bounds.min.y*s-dim.draft)<1e-5);
    assert(size.z/size.x>2.5&&size.z/size.x<4.1);assert(bounds.min.y<-.3&&bounds.max.y>.4);
    let bowWidth=0,sternWidth=0;for(let i=0;i<count;i++){if(Math.abs(p.getZ(i)-bounds.min.z)<1e-5)bowWidth=Math.max(bowWidth,Math.abs(p.getX(i)));if(Math.abs(p.getZ(i)-bounds.max.z)<1e-5)sternWidth=Math.max(sternWidth,Math.abs(p.getX(i)));}
    assert(bowWidth<sternWidth*.1);assert(sternWidth>dim.beam/s*.30);
    const worldBounds=new T.Box3().setFromObject(b);assert(worldBounds.max.x<-110,'boat intrudes on the road');assert(worldBounds.min.y<-1.3&&worldBounds.max.y>-.4,'vessel floats outside the waterline');
  }
});
check('raked cabin walls face outward and glazing lies outside the opaque wall planes',()=>{
  for(const b of boats.filter(b=>b.userData.harborBoat!=='open')){
    const kind=b.userData.harborBoat,L=b.userData.dimensions.length/b.scale.x,B=b.userData.dimensions.beam/b.scale.x,F=kind==='sail'?.72:.62;
    const y=F+.025,z=kind==='sail'?-.35:-.48,w=B*(kind==='sail'?.66:.82),h=kind==='sail'?.62:1.05,d=L*(kind==='sail'?.39:.46);
    const body=b.children.find(o=>o.userData.harborBoatPart==='body'),p=body.geometry.attributes.position,n=body.geometry.attributes.normal;
    const planes=[{fn:(x,yy,zz)=>zz-z+d*.5-d*.23*((yy-y)/h),normal:new T.Vector3(0,d*.23/h,-1)},
      {fn:(x,yy)=>x-w*.5+w*.11*((yy-y)/h),normal:new T.Vector3(1,w*.11/h,0)},
      {fn:(x,yy,zz)=>zz-z-d*.5+d*.16*((yy-y)/h),normal:new T.Vector3(0,d*.16/h,1)},
      {fn:(x,yy)=>x+w*.5-w*.11*((yy-y)/h),normal:new T.Vector3(-1,w*.11/h,0)}];
    for(const plane of planes){let triangles=0;for(let i=0;i<p.count;i+=3){const ys=[p.getY(i),p.getY(i+1),p.getY(i+2)];if(ys.some(v=>v<y-1e-6||v>y+h+1e-6)||ys.reduce((a,b)=>a+b)/3<=y+.01||ys.reduce((a,b)=>a+b)/3>=y+h-.01)continue;
        if([i,i+1,i+2].every(j=>Math.abs(plane.fn(p.getX(j),p.getY(j),p.getZ(j)))<1e-6)){triangles++;assert(new T.Vector3().fromBufferAttribute(n,i).dot(plane.normal)>0.99,'inward cabin wall');}}
      assert.equal(triangles,2,'each cabin wall has two exterior triangles');}
    const glass=b.children.find(o=>o.userData.harborBoatPart==='glass').geometry.attributes.position;
    for(let i=0;i<glass.count;i++){
      const height=(glass.getY(i)-y)/h,x=glass.getX(i),zz=glass.getZ(i);
      const outsideSide=Math.abs(x)-w*(.5-.11*height),outsideFront=-(zz-z+d*(.5-.23*height));
      assert(Math.abs(outsideSide-.018)<1e-6||Math.abs(outsideFront-.018)<1e-6,'glass intersects cabin shell');
    }
  }
});
const triangles=o=>(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
// Historical 12 draws / 546 triangles are measured baseline costs, not revised allowances.
const oldTriangles=baseline.boatTriangles;
const mainDraws=boatMeshes.length+2,newTriangles=boatMeshes.reduce((n,o)=>n+triangles(o),0)+triangles(contacts),shadowBatches=boatMeshes.filter(o=>o.castShadow);
check('draws, shadow casters and triangles stay below the original additional budgets',()=>{
  assert.equal(oldTriangles,546);assert.equal(boatMeshes.length,30);assert.equal(mainDraws,32);
  assert(mainDraws-baseline.boatDrawObjects<baseline.maximumAdditionalDrawObjectsExclusive);assert(mainDraws+shadowBatches.length-baseline.boatDrawObjects<baseline.maximumAdditionalDrawObjectsExclusive,'include possible shadow passes');assert(newTriangles-oldTriangles<baseline.maximumAdditionalTrianglesExclusive);
  assert.equal(shadowBatches.length,3);assert(shadowBatches.every(o=>o.userData.harborBoatPart==='body'&&!o.userData.detail));
});
check('glazing shares one non-transmissive single-pass material, other finishes are shared too',()=>{
  const mats=new Set(boatMeshes.map(o=>o.material));assert.equal(mats.size,8);
  const glass=boatMeshes.filter(o=>o.userData.harborBoatPart==='glass');assert.equal(new Set(glass.map(o=>o.material)).size,1);
  assert(glass.every(o=>o.material.transmission===0&&o.material.forceSinglePass));
  const textures=new Set();for(const m of mats)for(const v of Object.values(m))if(v?.isTexture)textures.add(v);assert.equal(textures.size,1);
});
check('batched water contacts lie above water and rotate along each vessel',()=>{
  const p=contacts.geometry.attributes.position;assert.equal(p.count,18);
  for(let j=0;j<3;j++){
    const b=boats[j],box=new T.Box3();for(let i=j*6;i<j*6+6;i++){assert(Math.abs(p.getY(i)+1.017)<1e-6);box.expandByPoint(new T.Vector3().fromBufferAttribute(p,i));}
    assert(box.expandByScalar(1e-6).containsPoint(new T.Vector3(b.position.x,-1.017,b.position.z)));
    const corners=[0,1,2].map(i=>new T.Vector3().fromBufferAttribute(p,j*6+i));
    const edges=[[0,1],[0,2],[1,2]].map(([a,b])=>corners[b].clone().sub(corners[a])).sort((a,b)=>a.lengthSq()-b.lengthSq()),edge=edges[0].normalize();
    const widthAxis=new T.Vector3(1,0,0).applyQuaternion(b.quaternion);assert(Math.abs(edge.dot(widthAxis))>0.999999,'contact rotated in the opposite direction');
  }
});
function resources(){const g=new Set(),m=new Set(),t=new Set();after.scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)for(const mat of(Array.isArray(o.material)?o.material:[o.material])){m.add(mat);for(const x of Object.values(mat))if(x?.isTexture)t.add(x);}});return {g,m,t};}
const initialResources=resources(),ropePositions=moorings.geometry.attributes.position,ropeArray=ropePositions.array;
after.city.update(1/60,0,{x:-115,z:-45});const startRopes=ropeArray.slice(),startBoatY=boats.map(b=>b.position.y);
check('small fittings remain visible from shore and cull only at a long distance',()=>{
  assert(boats.every(b=>b.getObjectByName(b.name+'_fittings').visible));after.city.update(1/60,0,{x:500,z:500});assert(boats.every(b=>!b.getObjectByName(b.name+'_fittings').visible));after.city.update(1/60,0,{x:-115,z:-45});
});
check('1000 updates keep resources stable, ropes attached, anchors fixed and transport data unchanged',()=>{
  for(let i=1;i<=1000;i++)after.city.update(1/60,i/60,{x:-115,z:-45});
  const end=resources();for(const k of['g','m','t'])assert.deepEqual(end[k],initialResources[k]);assert.equal(ropePositions.array,ropeArray);
  assert(boats.some((b,i)=>Math.abs(b.position.y-startBoatY[i])>.005));
  assert(ropeArray.some((v,i)=>Math.abs(v-startRopes[i])>.005));
  for(let r=0;r<4;r++)for(let k=0;k<3;k++)assert.equal(ropeArray[r*72+69+k],startRopes[r*72+69+k]);
  for(let r=0;r<4;r++){
    const boat=boats[Math.floor(r/2)],side=r%2===0?-1:1,dim=boat.userData.dimensions,B=dim.beam/boat.scale.x,L=dim.length/boat.scale.x,F=r<2?.72:.62;
    const cleat=new T.Vector3(side*B*.33,F+.11,r<2?-L*.33:L*.35).applyMatrix4(boat.matrixWorld);
    assert(cleat.distanceTo(new T.Vector3().fromArray(ropeArray,r*72))<1e-5,'mooring detaches from cleat');
  }
  assert.equal(JSON.stringify(state(after)),staticData);assert.deepEqual(walkerState(after).map(p=>p.id),walkerIds);assert(walkerState(after).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
  for(const b of boats){const s=shell(b),v=new T.Vector3();let low=Infinity,high=-Infinity;for(let i=0;i<s.count;i++){v.fromBufferAttribute(s.p,i).applyMatrix4(b.matrixWorld);low=Math.min(low,v.y);high=Math.max(high,v.y);}assert(low<-1.25&&high>-.7,'bob lifts hull out of water');}
});
check('spatial skyline batches share opaque paired panes for all four facades',()=>{
  const panes=[];after.scene.traverse(o=>{if(o.material?.name==='distant_window_glazing')panes.push(o);});assert(panes.length>0);assert.equal(new Set(panes.map(o=>o.material)).size,1);
  assert.equal(new Set(panes.map(o=>o.geometry)).size,1);
  const positions=panes[0].geometry.attributes.position,normals=panes[0].geometry.attributes.normal;
  assert.equal(positions.count,8);assert.equal(panes[0].geometry.index.count,12);
  for(let i=0;i<8;i++){assert.equal(Math.abs(positions.getZ(i)),.5);assert.equal(normals.getZ(i),Math.sign(positions.getZ(i)));}
  for(const mesh of panes){assert(mesh.isInstancedMesh);assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.depthWrite,true);assert.equal(mesh.material.side,T.DoubleSide);assert.equal(mesh.material.roughness,.30);assert.equal(mesh.material.metalness,.12);}
});
check('boat geometries, materials and textures participate in ordinary scene disposal',()=>{
  const gs=new Set(boatMeshes.map(o=>o.geometry));gs.add(contacts.geometry);gs.add(moorings.geometry);
  const ms=new Set(boatMeshes.map(o=>o.material));ms.add(contacts.material);ms.add(moorings.material);const ts=new Set();for(const m of ms)for(const v of Object.values(m))if(v?.isTexture)ts.add(v);
  let disposed=0;for(const object of[...gs,...ms,...ts])object.addEventListener('dispose',()=>disposed++);
  const seenG=new Set(),seenM=new Set(),seenT=new Set();after.scene.traverse(o=>{if(o.geometry&&!seenG.has(o.geometry)){seenG.add(o.geometry);o.geometry.dispose();}for(const m of(o.material?(Array.isArray(o.material)?o.material:[o.material]):[])){if(seenM.has(m))continue;seenM.add(m);for(const v of Object.values(m))if(v?.isTexture&&!seenT.has(v)){seenT.add(v);v.dispose();}m.dispose();}});
  assert.equal(disposed,gs.size+ms.size+ts.size);
});
console.log(JSON.stringify({sourceSHA256:crypto.createHash('sha256').update(source).digest('hex'),mainDraws,shadowBatches:shadowBatches.length,boatTriangles:newTriangles,oldTriangles,extraTriangles:newTriangles-oldTriangles}));
console.log(checks+' boat V14 checks passed. CPU geometry checks do not measure GPU FPS or replace visual review.');
