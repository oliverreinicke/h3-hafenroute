import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as Real from '../dist/vendor/three.module.min.js';
import {mergeGeometries} from '../dist/vendor/BufferGeometryUtils.js';
const base=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,base),'utf8');
let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS '+name);}

// Actual Drive code and Three mathematics. Only rendering, DOM and model decoding are boundaries.
function world({draft=true,deferredPub=false}={}){
  const frames=new Map(),events=[],orders=[];let frameId=0,ms=0,pubDisposals=0,resolvePub;
  const context2d=new Proxy({measureText:s=>({width:s.length*20}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
  const canvas={width:800,height:600,style:{},getBoundingClientRect:()=>({width:800,height:600}),getContext:()=>context2d,addEventListener(){},removeEventListener(){},setPointerCapture(){}};
  class Renderer{constructor(){this.shadowMap={};this.info={render:{calls:10,triangles:100},memory:{geometries:20,textures:5}};this.isWebGLRenderer=false;}setPixelRatio(){}setSize(){}render(s,c){s.updateMatrixWorld(true);c.updateMatrixWorld(true);}dispose(){}}
  const THREE={...Real,WebGLRenderer:Renderer},pub={
    entrance:{x:-91.9,z:-15},interior:{x:-94.3,z:-15},counter:{x:-95.3,z:-15},floorY:-.17,
    contains:(x,z)=>x>-97.9&&x<-91.9&&z>-18.8&&z<-11.2,
    ready:deferredPub?new Promise(resolve=>resolvePub=resolve):Promise.resolve(),setOrder:item=>orders.push(item),dispose:()=>pubDisposals++
  };
  const blocks=[
    {minX:-98.1,maxX:-97.9,minZ:-19,maxZ:-11},{minX:-98.1,maxX:-91.9,minZ:-19,maxZ:-18.8},{minX:-98.1,maxX:-91.9,minZ:-11.2,maxZ:-11},
    {minX:-92.1,maxX:-91.9,minZ:-19,maxZ:-15.9},{minX:-92.1,maxX:-91.9,minZ:-14.1,maxZ:-11},
    {minX:-97.5,maxX:-96.35,minZ:-18,maxZ:-12,cameraBlocking:false}
  ];
  const window={THREE,GeometryTools:{mergeGeometries},GCB_PUB_DRAFT:draft,devicePixelRatio:1,cityAsset:x=>x,
    People3D:{attach(){return {update(){},setPose(){},dispose(){},promise:Promise.resolve()};}},
    makeCity(T,scene){const sun=new T.DirectionalLight();sun.position.set(-110,78,-63);sun.castShadow=true;scene.add(sun);return {pub,bounds:{minX:-999,maxX:999,minZ:-999,maxZ:999},blocks,spawn:{x:-85.2,z:15},pedestrians:[],update(){}};}
  };
  const context=vm.createContext({window,THREE,console,Map,Set,Math,Number,performance:{now:()=>ms},document:{createElement:()=>({...canvas})},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),ResizeObserver:class{observe(){}disconnect(){}}});
  const code=read('Entwicklung/fahrt.js').replace('return {init,resume','return {__pubTest:()=>({person,city,camera,pubOrder,clearAt}),init,resume');
  vm.runInContext(code,context);const api=window.Drive;api.init(canvas,()=>{},event=>events.push(event));
  return {api,pub,orders,events,frames,resolvePub:()=>resolvePub(),pubDisposals:()=>pubDisposals,
    advance(seconds){for(let n=0;n<Math.ceil(seconds*60);n++){const first=frames.entries().next().value;if(!first)break;frames.delete(first[0]);ms+=1000/60;first[1](ms);}}
  };
}

await test('preview viewpoints require explicit draft mode and refuse to move an active mission',()=>{
  const e=world({draft:false});assert.equal(e.api.previewPubView('inside'),false);assert.equal(e.api.getInfo().x,-85.2);e.api.reset();
  const f=world();f.api.setMission({id:'clinical-state',pickup:{x:-85.2,z:15},dropoff:{x:24,z:-46},vehicleType:'taxi',patient:{name:'Fictional',sex:'female',mobility:'walk'}});
  const before=f.api.getInfo();assert.equal(f.api.previewPubView('inside'),false);assert.equal(f.api.getInfo().x,before.x);assert.equal(f.api.getInfo().missionId,'clinical-state');f.api.reset();
});
await test('the player can walk through the real collision opening and walk back out',()=>{
  const e=world();assert(e.api.previewPubView('outside'));e.api.resume();e.api.input('gas',true);e.advance(2.9);
  const inside=e.api.getInfo();assert.equal(inside.pubLocation,'inside');assert(inside.x<-93);assert(inside.x>=-96.04,'walked into the counter');assert.equal(inside.autoRunning,false);assert(inside.speed<=6);
  e.api.input('gas',false);e.api.input('brake',true);e.advance(6);assert.equal(e.api.getInfo().pubLocation,'outside');assert(e.api.getInfo().x>-91.4);e.api.reset();
});
await test('indoor chase camera stays clear of walls and below the ceiling while turning',()=>{
  const e=world();assert(e.api.previewPubView('inside'));e.api.resume();e.api.input('right',true);
  for(let n=0;n<40;n++){e.advance(.1);const s=e.api.__pubTest();assert(s.camera.position.y<=2.680001);assert(s.clearAt(s.camera.position.x,s.camera.position.z,.15,true),'camera inside a wall');assert(s.camera.fov>=54&&s.camera.fov<=62);}
  e.api.reset();
});
await test('menu interaction is confined to the customer side and retains the old patient/vehicle priorities',()=>{
  const e=world();e.api.resume();e.api.input('interact',true);assert.equal(e.events.at(-1)?.kind,'vehicle');assert.equal(e.api.orderPubFood('burger'),false);
  assert(e.api.previewPubView('inside'));e.api.resume();e.api.input('interact',true);assert.equal(e.events.at(-1)?.kind,'pub-order');e.api.reset();
  const f=world();f.api.setMission({id:'patient-priority',pickup:{x:-85.2,z:15},dropoff:{x:10,z:20},vehicleType:'taxi',patient:{name:'Fictional',sex:'female',mobility:'walk'}});f.api.resume();f.api.input('interact',true);assert.equal(f.events.at(-1)?.kind,'patient');f.api.reset();
});
await test('one order is served once after simulation time, rejects repeats and replaces a served plate',()=>{
  const e=world();assert(e.api.previewPubView('inside'));assert.equal(e.api.orderPubFood('missing'),false);
  assert(e.api.orderPubFood('burger'));assert.equal(e.api.orderPubFood('salad'),false);assert.deepEqual(e.orders,[null]);e.api.resume();e.advance(1.4);assert.equal(e.api.getInfo().pubOrderState,'preparing');e.advance(.3);
  assert.equal(e.api.getInfo().pubOrderState,'served');assert.deepEqual(e.orders,[null,'burger']);e.advance(3);assert.deepEqual(e.orders,[null,'burger']);
  assert(e.api.orderPubFood('salad'));assert.deepEqual(e.orders,[null,'burger',null]);e.advance(1.6);assert.deepEqual(e.orders,[null,'burger',null,'salad']);e.api.reset();
});
await test('pause preserves an order and reset cancels it without a late timer or RAF chain',()=>{
  const e=world();e.api.previewPubView('inside');e.api.orderPubFood('fries');e.api.resume();e.advance(.6);e.api.pause();e.advance(20);assert.equal(e.api.getInfo().pubOrderState,'preparing');assert.deepEqual(e.orders,[null]);
  e.api.resume();e.advance(.3);e.api.reset();assert.equal(e.pubDisposals(),1);assert.equal(e.frames.size,0);assert.deepEqual(e.orders,[null]);
});
await test('Drive.ready waits for the waiter models before declaring the world ready',async()=>{
  const e=world({deferredPub:true});let done=false;const task=e.api.ready().then(()=>done=true);await Promise.resolve();await Promise.resolve();assert.equal(done,false);e.resolvePub();await task;assert.equal(done,true);e.api.reset();
});

// Run the actual preview UI against a small DOM and Drive boundary, including native button activation.
function ui(){
  const listeners=new Map(),nodes=new Map();let action,telemetry,resumes=0,pauses=0,accepted=0;
  let info={pubLocation:'outside',nearPubCounter:false,pubOrderState:'idle',pubOrderItem:null};
  const doc={hidden:false,activeElement:null,getElementById:id=>nodes.get(id),addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);}};
  class Node{
    constructor(id,tag='div'){this.id=id;this.tag=tag;this.hidden=false;this.disabled=false;this.dataset={};this.handlers=new Map();this.classList={toggle(){},add(){}};this.style={};this.textContent='';this.innerHTML='';}
    addEventListener(name,fn){if(!this.handlers.has(name))this.handlers.set(name,[]);this.handlers.get(name).push(fn);}
    setAttribute(){}focus(){doc.activeElement=this;}closest(tag){return this.tag===tag?this:null;}
    querySelector(selector){return selector==='.spinner'?spinner:heading;}
    dispatch(name,event={}){for(const fn of this.handlers.get(name)||[])fn({target:this,preventDefault(){},...event});}
    click(){if(!this.disabled)this.dispatch('click');}
  }
  for(const id of ['city','outsideBtn','insideBtn','pauseBtn','orderTrigger','menuOverlay','foodMenu','closeMenu','waiterLine','locationName','locationHint','loading','loadingText','pauseNote','menuGreeting'])nodes.set(id,new Node(id,['outsideBtn','insideBtn','pauseBtn','orderTrigger','closeMenu'].includes(id)?'button':'div'));
  const foods=['burger','flammkuchen','fries','salad'].map(food=>{const n=new Node(food,'button');n.dataset.food=food;return n;}),spinner=new Node('spinner'),heading=new Node('heading');
  nodes.get('menuOverlay').hidden=true;nodes.get('pauseNote').hidden=true;doc.querySelectorAll=selector=>selector==='[data-food]'?foods:[];
  const Drive={init(canvas,onInfo,onAction){telemetry=onInfo;action=onAction;telemetry(info);},previewPubView(view){info={...info,pubLocation:view,nearPubCounter:view==='inside'};telemetry(info);return true;},ready:()=>Promise.resolve(),resume(){resumes++;},pause(){pauses++;},reset(){},input(kind,pressed){if(kind==='interact'&&pressed)action({kind:'pub-order'});},orderPubFood(item){if(info.pubOrderState==='preparing')return false;accepted++;info={...info,pubOrderState:'preparing',pubOrderItem:item};telemetry(info);return true;}};
  const window={Drive,addEventListener(){}};vm.runInNewContext(read('Entwicklung/pub-preview.js'),{window,document:doc,console,Error});
  const key=(key,{repeat=false,shiftKey=false}={})=>{const event={key,repeat,shiftKey,target:doc.activeElement||nodes.get('city'),prevented:false,preventDefault(){this.prevented=true;},stopPropagation(){}};for(const fn of listeners.get('keydown')||[])fn(event);if(key==='Enter'&&!event.prevented&&doc.activeElement?.tag==='button')doc.activeElement.click();};
  return {nodes,foods,doc,key,accepted:()=>accepted,resumes:()=>resumes,pauses:()=>pauses};
}
await test('real menu keyboard code chooses with arrows and Enter, without duplicate held-key orders',async()=>{
  const u=ui();await new Promise(setImmediate);assert.equal(u.nodes.get('loading').hidden,true,u.nodes.get('loadingText').textContent);u.nodes.get('insideBtn').click();u.key('Enter');assert.equal(u.nodes.get('menuOverlay').hidden,false);assert.equal(u.doc.activeElement,u.foods[0]);
  u.key('ArrowDown');assert.equal(u.doc.activeElement,u.foods[1]);u.key('Enter');assert.equal(u.accepted(),1);assert.equal(u.nodes.get('menuOverlay').hidden,true);
  u.key('Enter',{repeat:true});assert.equal(u.accepted(),1);assert.equal(u.nodes.get('menuOverlay').hidden,true);assert(u.resumes()>0);
});
await test('Escape closes an unsubmitted menu, clears focus back to the canvas and keeps the world resumable',async()=>{
  const u=ui();await new Promise(setImmediate);assert.equal(u.nodes.get('loading').hidden,true,u.nodes.get('loadingText').textContent);u.nodes.get('insideBtn').click();u.key('Enter');u.key('Tab',{shiftKey:true});assert.equal(u.doc.activeElement,u.nodes.get('closeMenu'));u.key('Escape');assert.equal(u.accepted(),0);assert.equal(u.nodes.get('menuOverlay').hidden,true);assert.equal(u.doc.activeElement,u.nodes.get('city'));assert(u.pauses()>0&&u.resumes()>0);
});
console.log(checks+' Pub interaction checks passed. GPU, furnishings and actual browser accessibility remain visual QA.');
