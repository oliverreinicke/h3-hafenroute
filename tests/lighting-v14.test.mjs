import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as Real from '../dist/vendor/three.module.min.js';
import {mergeGeometries} from '../dist/vendor/BufferGeometryUtils.js';

// Exercise the real Drive lifecycle with real Three materials/math and a GPU boundary stub.
// Browser QA is still needed for the appearance and GPU frame cost.
const source=fs.readFileSync(new URL('../Entwicklung/fahrt.js',import.meta.url),'utf8');
let checks=0;
const test=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
function setup({failCapture=false}={}){
  const gradients=[],targets=[],captures=[],renderers=[];
  let shouldFail=failCapture;
  const context2d=new Proxy({
    measureText:s=>({width:s.length*20}),
    createRadialGradient:()=>({addColorStop(){}}),
    createLinearGradient:()=>{const stops=[];gradients.push(stops);return {addColorStop:(at,color)=>stops.push([at,color])};}
  },{get:(o,k)=>k in o?o[k]:(()=>{})});
  const canvas={width:800,height:600,style:{},getBoundingClientRect:()=>({width:800,height:600}),getContext:()=>context2d,addEventListener(){},removeEventListener(){},setPointerCapture(){}};
  class Renderer{
    constructor(){this.outputColorSpace=Real.LinearSRGBColorSpace;this.shadowMap={};this.info={render:{calls:1,triangles:1},memory:{geometries:1,textures:1}};this.isWebGLRenderer=true;this.disposed=false;renderers.push(this);}
    setPixelRatio(value){this.ratio=value;}setSize(){}render(s,c){s.updateMatrixWorld(true);c.updateMatrixWorld(true);}dispose(){this.disposed=true;}
  }
  class Target extends Real.WebGLCubeRenderTarget{
    constructor(...args){super(...args);this.disposeCount=0;targets.push(this);}
    dispose(){this.disposeCount++;super.dispose();}
  }
  class Capture{
    constructor(near,far,target){this.position=new Real.Vector3();this.target=target;this.near=near;this.far=far;}
    update(renderer,scene){
      captures.push({visible:state().marker.root.visible,person:state().person.root.visible,fleet:state().fleet.map(v=>v.root.visible),environment:scene.environment,position:this.position.toArray()});
      if(shouldFail){shouldFail=false;throw new Error('Synthetic capture failure');}
    }
  }
  const THREE={...Real,WebGLRenderer:Renderer,WebGLCubeRenderTarget:Target,CubeCamera:Capture};
  const window={THREE,GeometryTools:{mergeGeometries},devicePixelRatio:2,cityAsset:x=>x,
    People3D:{attach(){return {update(){},setPose(){},dispose(){},promise:Promise.resolve()};}},
    makeCity(T,scene){const sun=new T.DirectionalLight();sun.position.set(-110,78,-63);sun.castShadow=true;scene.add(sun);return {bounds:{minX:-999,maxX:999,minZ:-999,maxZ:999},blocks:[],spawn:{x:-85.2,z:15},pedestrians:[],update(){}};}
  };
  const context=vm.createContext({window,THREE,console,Map,Set,Math,Number,performance:{now:()=>0},document:{createElement:()=>({...canvas})},requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}}});
  vm.runInContext(source.replace('return {init,resume','return {__lighting:()=>({renderer,scene,marker,person,fleet}),init,resume'),context);
  const api=window.Drive,state=()=>api.__lighting();api.init(canvas,()=>{},()=>{});
  return {api,state,gradients,targets,captures,renderers};
}

await test('sRGB, ACES, capped resolution and cached soft shadows stay enabled',()=>{
  const e=setup(),r=e.state().renderer;
  assert.equal(r.outputColorSpace,Real.SRGBColorSpace);assert.equal(r.toneMapping,Real.ACESFilmicToneMapping);assert.equal(r.toneMappingExposure,1.06);
  assert.equal(r.ratio,1.6);assert.equal(r.shadowMap.enabled,true);assert.equal(r.shadowMap.type,Real.PCFSoftShadowMap);assert.equal(r.shadowMap.autoUpdate,false);
  assert.equal(e.targets.length,1);assert.equal(e.targets[0].width,128);assert.equal(e.targets[0].height,128);e.api.reset();
});
await test('fallback reflections use neutral daytime rather than pink sunset',()=>{
  const e=setup(),stops=e.gradients[0];assert(stops.length>=6);
  const colors=stops.map(([,hex])=>new Real.Color(hex));
  assert(colors[0].b>colors[0].r);assert(colors[1].b>colors[1].r);
  const horizon=colors[2];assert(Math.max(horizon.r,horizon.g,horizon.b)-Math.min(horizon.r,horizon.g,horizon.b)<.1);
  assert.equal(e.state().scene.environment.colorSpace,Real.SRGBColorSpace);assert.equal(e.state().scene.environment.mapping,Real.EquirectangularReflectionMapping);e.api.reset();
});
await test('one actual waterfront capture excludes the target and restores each visibility state',async()=>{
  const e=setup();e.api.setTarget({x:1,z:2});const s=e.state(),fallback=s.scene.environment;let fallbackDisposals=0;fallback.addEventListener('dispose',()=>fallbackDisposals++);
  s.fleet[2].root.visible=false;
  await e.api.ready();assert.equal(e.captures.length,1);assert.equal(e.captures[0].visible,false);assert.equal(e.captures[0].person,false);assert(e.captures[0].fleet.every(v=>v===false));
  assert.equal(s.marker.root.visible,true);assert.equal(s.person.root.visible,true);assert.equal(s.fleet[2].root.visible,false);
  assert.deepEqual(e.captures[0].position,[-77,3.1,8]);assert.equal(s.scene.environment,e.targets[0].texture);assert.equal(fallbackDisposals,1);
  await e.api.ready();assert.equal(e.captures.length,1);e.api.reset();assert.equal(e.targets[0].disposeCount,1);assert.equal(fallbackDisposals,1);
});
await test('capture failure restores gameplay objects and keeps the valid fallback',async()=>{
  const e=setup({failCapture:true});e.api.setTarget({x:1,z:2});const s=e.state(),fallback=s.scene.environment;let disposals=0;fallback.addEventListener('dispose',()=>disposals++);s.fleet[1].root.visible=false;
  await assert.rejects(e.api.ready(),/Synthetic capture failure/);
  assert.equal(s.marker.root.visible,true);assert.equal(s.person.root.visible,true);assert.equal(s.fleet[1].root.visible,false);assert.equal(s.scene.environment,fallback);assert.equal(disposals,0);
  await e.api.ready();assert.equal(e.captures.length,2);assert.equal(s.scene.environment,e.targets[0].texture);assert.equal(disposals,1);e.api.reset();
});
await test('reset disposes the fallback as well as the probe after a failed capture',async()=>{
  const e=setup({failCapture:true}),fallback=e.state().scene.environment;let disposals=0;fallback.addEventListener('dispose',()=>disposals++);
  await assert.rejects(e.api.ready(),/Synthetic capture failure/);e.api.reset();assert.equal(disposals,1);assert.equal(e.targets[0].disposeCount,1);assert.equal(e.renderers[0].disposed,true);
});
console.log(checks+' reflection/render lifecycle checks passed; no GPU benchmark claimed.');
