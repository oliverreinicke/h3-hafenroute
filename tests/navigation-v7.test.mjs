import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=n=>fs.readFileSync(new URL('../Entwicklung/'+n+'.js',import.meta.url),'utf8');
const window={},context=vm.createContext({window});for(const n of ['missions','rules','navigation'])vm.runInContext(source(n),context);
const nav=window.H3Navigation.create(null,null,{groundArrows:false}),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const point=(x,z,mode='walk',extra={})=>({x,z,mode,heading:0,viewHeading:0,...extra});
let count=0;function test(name,fn){nav.clear();fn();count++;console.log('PASS '+name)}
const cars=[{id:'taxi',type:'taxi',name:'Taxi',x:-82.5,z:12.6},{id:'volunteer',type:'volunteer',name:'Freiwilligenfahrdienst',x:-75,z:-39},{id:'wheelchair',type:'wheelchair',name:'Rollstuhltransport',x:-29,z:-9},{id:'lying',type:'lying',name:'Liegendtransport',x:37,z:61},{id:'ambulance',type:'ambulance',name:'Rettungswagen',x:83,z:11}];
function follow(start,target){
 let g=nav.update(start,target),previous=g.angle,maxTurn=0;
 const path=g.path.map(p=>({...p}));assert(path.length>=2);
 for(let n=1;n<path.length;n++){const a=path[n-1],b=path[n],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2);for(let k=1;k<=steps;k++){
  const info={...start,x:a.x+(b.x-a.x)*k/steps,z:a.z+(b.z-a.z)*k/steps};g=nav.getGuidance(info,target);const again=nav.update(info,target);assert.equal(g.angle,again.angle);assert.equal(g.routeLeg,again.routeLeg);
  if(!g.arrived){maxTurn=Math.max(maxTurn,Math.abs(wrap(g.angle-previous)));previous=g.angle;let length=0;for(let i=1;i<g.path.length;i++)length+=Math.hypot(g.path[i].x-g.path[i-1].x,g.path[i].z-g.path[i-1].z);assert(Math.abs(length-g.distance)<=.51)}
 }}
 assert(g.arrived);assert(maxTurn<.35,'unexplained route flip '+maxTurn);
}
for(const m of window.H3_DATA.missions){
 test(m.id+' initial walking route advances smoothly through every junction',()=>follow(point(-85.2,15,'walk',{missionId:m.id}),m.pickup));
 test(m.id+' confirmed vehicle route to pickup and destination remains coherent',()=>{const car=cars.find(v=>v.type===m.vehicleType);assert(car);follow(point(car.x,car.z,'car',{missionId:m.id,vehicleId:car.id}),m.pickup);nav.clear();follow(point(m.pickup.x,m.pickup.z,'car',{missionId:m.id,vehicleId:car.id}),m.dropoff)});
 test(m.id+' fixed target and fixed filtered camera do not rotate at idle',()=>{const info=point(-80.05,15,'walk',{missionId:m.id,viewHeading:.6}),first=nav.getGuidance(info,m.pickup),path=first.path;for(let i=0;i<500;i++){const g=nav.getGuidance(info,m.pickup);assert.equal(g.angle,first.angle);assert.equal(g.routeRevision,first.routeRevision);assert.equal(g.path,path)}});
}
for(const car of cars)test(car.id+' neutral vehicle search route is reachable',()=>follow(point(-85.2,15),car));
test('reported straight-walk flip repeats zero times over sixty metres',()=>{let previous,max=0;const versions=new Set();for(let z=15;z>-46;z-=.1){const g=nav.getGuidance(point(-80.05,z),{x:-88,z:-52});versions.add(g.routeRevision);if(previous!==undefined)max=Math.max(max,Math.abs(wrap(g.angle-previous)));previous=g.angle}assert(max<.01);assert.equal(versions.size,1)});
test('road-centre crossing noise never changes into a sideways or reverse instruction',()=>{let previous;for(let z=10;z>-40;z-=.1){const g=nav.update(point(-80+Math.sin(z*71)*.2,z),{x:-88,z:-52});assert(Math.abs(g.angle)<.05);if(previous!==undefined)assert(Math.abs(wrap(g.angle-previous))<.08);previous=g.angle}});
test('independent 0.2 mm corner repro advances once and never revives the old leg',()=>{const target={x:-24,z:-28};nav.update(point(-80,-27.3),target);let previous,leg=-1;for(let k=0;k<100;k++){const g=nav.getGuidance(point(-80,k%2?-27.3501:-27.3499),target);assert(g.routeLeg>=leg);leg=g.routeLeg;if(previous!==undefined)assert(Math.abs(wrap(g.angle-previous))<.03);previous=g.angle;const repeated=nav.update(point(-80,k%2?-27.3501:-27.3499),target);assert.equal(repeated.routeLeg,g.routeLeg)}});
test('camera heading crosses +/- pi by its shortest visual angle',()=>{let previous;for(const yaw of [3.12,3.13,-3.14,-3.13,-3.12]){const g=nav.getGuidance(point(-80,0,'car',{viewHeading:yaw}),{x:-80,z:-70});assert(Math.abs(wrap(g.angle+yaw-g.routeHeading))<1e-10);if(previous!==undefined)assert(Math.abs(wrap(g.angle-previous))<.03);previous=g.angle}});
for(const mode of ['walk','car'])test(mode+' arrival hysteresis prevents boundary flicker',()=>{const enter=mode==='walk'?3.7:11.9,inside=mode==='walk'?3.9:12.1,outside=mode==='walk'?5.1:14.1,target={x:-80,z:-70};assert(nav.update(point(-80,-70+enter,mode),target).arrived);for(let i=0;i<50;i++)assert(nav.update(point(-80,-70+(i%2?enter:inside),mode),target).arrived);assert(!nav.update(point(-80,-70+outside,mode),target).arrived)});
test('target, mode, vehicle and mission changes replace retained state immediately',()=>{let info=point(-80,0),target={x:-80,z:-70},previous=nav.update(info,target).routeRevision;for(const patch of [{missionId:'one'},{missionId:'two'},{mode:'car'},{vehicleId:'taxi'},{vehicleId:'lying'}]){info={...info,...patch};const g=nav.update(info,target);assert(g.routeRevision>previous);previous=g.routeRevision}target={x:88,z:28};assert(nav.update(info,target).routeRevision>previous);nav.update(info,null);assert(nav.update(info,target).routeRevision>previous)});
test('leaving the planned corridor reroutes without keeping an abandoned corner',()=>{const target={x:88,z:28},first=nav.update(point(-80,0),target);const next=nav.update(point(-24,-60),target);assert(next.routeRevision>first.routeRevision);assert.equal(next.path[0].x,-24);assert.equal(next.path[0].z,-60)});

// Execute the real application against a canvas recorder: check the rendered
// map, live telemetry and real click/keyboard bindings, rather than a copy.
const elements=new Map(),listeners={},paintLog=[];
const paint=new Proxy({},{get:(_o,k)=>(...args)=>paintLog.push([k,...args]),set:(_o,k,v)=>{paintLog.push(['style',k,v]);return true}});
const el=k=>{if(!elements.has(k))elements.set(k,{id:k.slice(1),width:216,height:172,innerHTML:'',textContent:'',hidden:false,open:false,style:{},attributes:{},dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attributes[k]=v},getContext:()=>paint,focus(){ctx.document.activeElement=this},closest(selector){return ['button','button,a[href]'].includes(selector)&&this.id.endsWith('Btn')?this:null},showModal(){this.open=true},close(){this.open=false},scrollIntoView(){},addEventListener(){},querySelectorAll(){return[]},querySelector(q){return el(k+' '+q)}});return elements.get(k)};
const A=new Proxy({briefings:{}},{get:(o,k)=>k in o?o[k]:()=>{}}),destinations=[],worldInputs=[];
const ctx={console,document:{querySelector:el,querySelectorAll:()=>[],body:el('body'),addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},addEventListener:(k,f)=>listeners[k]=f,H3Audio:A,Drive:{pause(){},resume(){},input(...a){worldInputs.push(a)},setTarget(p){destinations.push(p)},resize(){}},URL,Blob};ctx.window=ctx;vm.createContext(ctx);for(const n of ['missions','rules'])vm.runInContext(source(n),ctx);
vm.runInContext(source('app').replace(/\}\)\(\);\s*$/,`window.audit={drawMap,mapPanel,navVehicle,telemetry,updateGuidance,state:()=>({target}),setAction(fn){context=fn},set(mission,tele){m=mission;s=R.newState(m.id);t=tele;running=true;target=m.pickup}};})();`),ctx);
const mission=ctx.H3_DATA.missions[0],tele={...point(-85.2,15),cars,pickupDistance:60,dropoffDistance:130,guidance:{angle:0,distance:70,path:[{x:-85.2,z:15},{x:-80,z:15},{x:-80,z:-52}]}};
const setup=()=>ctx.audit.set(mission,tele);
test('visible semantic minimap button and M each open the full named vehicle map',()=>{setup();el('#miniMapBtn').onclick();assert(el('#modal').open);for(const car of cars)assert(el('#dialogBody').innerHTML.includes(car.name));el('#modal').close();let prevented=false;listeners.keydown({code:'KeyM',preventDefault(){prevented=true}});assert(prevented);assert(el('#modal').open);assert(el('#dialogBody').innerHTML.includes('Norden bleibt oben'))});
test('all five live car positions and stable numbered identities are painted neutrally',()=>{setup();paintLog.length=0;ctx.audit.drawMap(el('#miniMap'));const vehicles=paintLog.filter(q=>q[0]==='fillRect'&&q[3]===7&&q[4]===9);assert.equal(vehicles.length,5);const scale=172/220;for(let i=0;i<cars.length;i++){assert(Math.abs(vehicles[i][1]-(108+cars[i].x*scale-3.5))<1e-8);assert(Math.abs(vehicles[i][2]-(86+cars[i].z*scale-4.5))<1e-8);assert(paintLog.some(q=>q[0]==='fillText'&&q[1]===String(i+1)))}const colours=paintLog.filter(q=>q[0]==='style'&&q[1]==='fillStyle'&&q[2]==='#9cead9');assert.equal(colours.length,5)});
test('driving telemetry updates the actual vehicle marker while the map stays north-up',()=>{setup();const moving={...tele,mode:'car',heading:1.2,viewHeading:-2,cars:cars.map((v,i)=>({...v,x:v.x+(i===0?20:0),z:v.z+(i===0?10:0)}))};ctx.audit.telemetry(moving);paintLog.length=0;ctx.audit.drawMap(el('#miniMap'));const car=paintLog.find(q=>q[0]==='fillRect'&&q[3]===7&&q[4]===9);assert(Math.abs(car[1]-(108+moving.cars[0].x*172/220-3.5))<1e-8);assert.deepEqual(paintLog.filter(q=>q[0]==='rotate').map(q=>q[1]),[1.2])});
test('map route uses exactly the current guidance path, without another road projection',()=>{setup();ctx.H3Rules.route=()=>{throw Error('map recomputed competing route')};paintLog.length=0;ctx.audit.drawMap(el('#miniMap'));const lines=paintLog.filter(q=>q[0]==='lineTo');assert(lines.some(q=>Math.abs(q[1]-(108-80*172/220))<1e-8&&Math.abs(q[2]-(86-52*172/220))<1e-8))});
test('each named vehicle can be marked as a search target without choosing a case answer',()=>{setup();for(const car of cars){ctx.audit.navVehicle(car.id);assert.equal(ctx.audit.state().target.id,car.id);assert.equal(destinations.at(-1).id,car.id)}assert.equal(destinations.length,5)});
for(const code of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])test(code+' transfers restored minimap focus to the city before the next Enter action',()=>{
 setup();el('#modal').close();el('#miniMapBtn').onclick();ctx.audit.navVehicle('wheelchair');el('#miniMapBtn').focus();assert.equal(ctx.document.activeElement,el('#miniMapBtn'));
 let actions=0;ctx.audit.setAction(()=>actions++);
 const key=code=>{const e={code,target:ctx.document.activeElement,prevented:false,preventDefault(){this.prevented=true}};listeners.keydown(e);return e};
 assert(!key('Enter').prevented);assert.equal(actions,0); // Native button activation remains available before movement.
 assert(key(code).prevented);assert.equal(ctx.document.activeElement,el('#city'));assert(worldInputs.length);
 assert(key('Enter').prevented);assert.equal(actions,1);assert(!el('#modal').open);
});
test('dialog arrow navigation does not transfer focus to the game canvas',()=>{
 setup();el('#modal').open=true;el('#miniMapBtn').focus();listeners.keydown({code:'ArrowDown',target:ctx.document.activeElement,preventDefault(){}});assert.equal(ctx.document.activeElement,el('#miniMapBtn'));el('#modal').close();
});
console.log(count+' V7 route stability, live minimap and interaction checks passed; responsive geometry requires browser QA.');
