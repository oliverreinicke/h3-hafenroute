import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const w={};const c=vm.createContext({window:w});for(const n of ['missions','rules'])vm.runInContext(fs.readFileSync(new URL('../Entwicklung/'+n+'.js',import.meta.url),'utf8'),c);
const R=w.H3Rules,D=w.H3_DATA;let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name)}
for(const m of D.missions){
 const s=R.newState(m.id);Object.assign(s,{asked:m.dialogue.map(q=>q.id),pack:m.packOptions.filter(p=>p.status==='required').map(p=>p.id),prepared:true,escort:true,costs:true,approved:{id:m.vehicleType,type:m.vehicleType}});
 const t={vehicleId:m.vehicleType,vehicleType:m.vehicleType,mode:'car',stationary:true,pickupDistance:8,dropoffDistance:200,passengerPresent:false};
 test(m.id+' valid preparation + offer + pickup',()=>{assert.equal(R.prepIssues(m,s).length,0);assert.equal(R.vehicleIssues(m,m.vehicleType,m.check.correctId).length,0);assert.equal(R.boardIssues(m,s,t).length,0)});
 test(m.id+' conversation, missing and distracting items prevent preparation',()=>{assert(R.prepIssues(m,{...s,asked:[]}).length);assert(R.prepIssues(m,{...s,pack:[]}).length);assert(R.prepIssues(m,{...s,pack:[...s.pack,...m.packOptions.filter(p=>p.status==='leave').map(p=>p.id)]}).length)});
 test(m.id+' optional items accepted',()=>assert.equal(R.prepIssues(m,{...s,pack:[...s.pack,...m.packOptions.filter(p=>p.status==='optional').map(p=>p.id)]}).length,0));
 test(m.id+' other four offers refused',()=>{for(const o of D.offers)if(o.id!==m.vehicleType)assert(R.vehicleIssues(m,o.id,m.check.correctId).length)});
 test(m.id+' unsafe or premature pickup blocked',()=>{for(const patch of [{stationary:false,speed:0},{mode:'walk'},{pickupDistance:13},{vehicleId:'other'}])assert(R.boardIssues(m,s,{...t,...patch}).length)});
 const h=m.handover.filter(h=>h.required).map(h=>h.id),arrival={...t,mode:'walk',x:m.dropoff.x,z:m.dropoff.z,dropoffDistance:8,passengerPresent:true};s.loaded=true;
 test(m.id+' full correct handover accepted',()=>assert.equal(R.handoverIssues(m,s,arrival,h).length,0));
 test(m.id+' unloaded, distant, moving, in-car and over-sharing handover blocked',()=>{assert(R.handoverIssues(m,{...s,loaded:false},arrival,h).length);for(const patch of [{passengerPresent:false},{dropoffDistance:13},{stationary:false,speed:0},{mode:'car'},{x:999,z:999}])assert(R.handoverIssues(m,s,{...arrival,...patch},h).length);assert(R.handoverIssues(m,s,arrival,[]).length);assert(R.handoverIssues(m,s,arrival,m.handover.map(h=>h.id)).length)});
 test(m.id+' navigation uses axis-aligned roads',()=>{for(const [a,b]of [[m.pickup,m.dropoff],[{x:-85.2,z:15},m.pickup]]){const path=R.route(a,b);assert(path.length>=3);assert.equal(path[0],a);assert.equal(path.at(-1),b);for(let k=2;k<path.length-1;k++){const p=path[k-1],q=path[k];assert(Math.abs(p.x-q.x)<.001||Math.abs(p.z-q.z)<.001);assert([-80,-24,32,88].includes(p.x)&&p.x===q.x||[-84,-28,28,84].includes(p.z)&&p.z===q.z)}}});
}
console.log(checks+' rule and route checks passed');
