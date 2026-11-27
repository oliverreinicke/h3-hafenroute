// Exercise the actual app/map action code; DOM and drawing are observation boundaries.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
let fixtureSource=fs.readFileSync(new URL('controls-v6.test.mjs',import.meta.url),'utf8').split("for(const code of ['Enter','NumpadEnter'])")[0];
fixtureSource=fixtureSource
  .replace("new URL('../Entwicklung/',import.meta.url)",`new URL(${JSON.stringify(pathToFileURL(path.join(root,'Entwicklung/')).href)})`)
  .replace('window.audit={panel,','window.audit={act,mapPanel,drawMap,renderCards,getState:()=>s,getMission:()=>m,getTarget:()=>target,getCompleted:()=>completed,setCompleted(value){completed=value;renderCards()},setTele(value){t={...t,...value}},panel,')
  .replace('ctx.audit.stub(name=>calls.push(name));','');
fixtureSource+='\nexport {fixture};';
const {fixture}=await import('data:text/javascript;base64,'+Buffer.from(fixtureSource).toString('base64'));
const snapshot=value=>JSON.stringify(value);let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function setup({unlocked=true}={}){
  const f=fixture(),drawings=new Map(),targets=[];let writes=0;
  if(unlocked)f.a.setCompleted(Object.fromEntries(f.ctx.H3_DATA.missions.map(m=>[m.id,{id:m.id,finished:'prior'}])));
  for(const [id,w,h] of [['miniMap',216,172],['dialogMap',760,410]]){
    const canvas=f.el('#'+id),ops=[];Object.assign(canvas,{id,width:w,height:h});
    const ctx=new Proxy({
      fillText(text,x,y){ops.push({type:'text',text,x,y,color:this.fillStyle,font:this.font});},
      arc(x,y,r){ops.push({type:'circle',x,y,r,color:this.fillStyle});}
    },{get:(o,k)=>k in o?o[k]:(()=>{})});canvas.getContext=()=>ctx;drawings.set(id,ops);
  }
  f.a.setTele({x:-85.2,z:15,heading:0,cars:[],mobility:[],dropoffDistance:200,pickupDistance:80,stationary:true});
  f.ctx.Drive.setTarget=p=>targets.push(JSON.parse(JSON.stringify(p)));
  f.ctx.Drive.previewPubView=()=>{throw Error('A map action must not teleport the player');};
  f.ctx.localStorage.setItem=()=>writes++;
  return {...f,drawings,targets,writes:()=>writes};
}

test('the normal map offers the Pub under places, explains its marker, and keeps the mission return action',()=>{
  const f=setup();f.a.mapPanel();const html=f.el('#dialogBody').innerHTML;
  assert(html.includes('Orte in der Stadt'));assert(/data-action="navpub"/.test(html));assert(html.includes('GCB Pub finden'));assert(html.includes('Goldenes G: GCB Pub'));assert(html.includes('Zum Abholort'));assert(html.includes('Auf der Karte wird niemand teleportiert.'));
});
test('finding the Pub changes only the navigation target, without a teleport, mission mutation or save write',()=>{
  const f=setup(),state=snapshot(f.a.getState()),mission=snapshot(f.a.getMission()),completed=snapshot(f.a.getCompleted());
  f.a.act('navpub');assert.deepEqual(f.targets,[{x:-90.4,z:-15,label:'GCB Pub'}]);assert.equal(snapshot(f.a.getState()),state);assert.equal(snapshot(f.a.getMission()),mission);assert.equal(snapshot(f.a.getCompleted()),completed);assert.equal(f.writes(),0);assert.equal(f.el('#modal').open,false);
  assert.equal(f.el('#objectiveTitle').textContent,'Lerne die Person kennen.');
});
test('the existing pickup action restores the original mission navigation after visiting the Pub',()=>{
  const f=setup(),pickup=snapshot(f.a.getMission().pickup);f.a.act('navpub');f.a.act('navpickup');assert.equal(snapshot(f.a.getTarget()),pickup);assert.equal(snapshot(f.targets.at(-1)),pickup);assert.equal(f.a.getState().loaded,false);assert.equal(f.writes(),0);
});
test('a loaded transport keeps its clinical state and can restore its original handover destination',()=>{
  const f=setup();f.a.getState().loaded=true;f.a.getState().prepared=true;const before=snapshot(f.a.getState()),dropoff=snapshot(f.a.getMission().dropoff);
  f.a.act('navpub');f.a.mapPanel();assert(f.el('#dialogBody').innerHTML.includes('Zum Übergabeort'));
  const back=f.el('#dialogBody [data-action="navdrop"]');assert.equal(typeof back.onclick,'function');back.onclick();assert.equal(snapshot(f.a.getTarget()),dropoff);assert.equal(snapshot(f.a.getState()),before);assert.equal(f.writes(),0);
});
test('both actual map renderers place a distinct golden G, with a Pub label rather than a vehicle P',()=>{
  const f=setup();for(const id of ['miniMap','dialogMap']){
    const c=f.el('#'+id);f.a.drawMap(c);const ops=f.drawings.get(id),scale=Math.min(c.width/228,c.height/220),x=c.width/2-90.4*scale,y=c.height/2-15*scale;
    assert(ops.some(o=>o.type==='circle'&&o.color==='#d5b978'&&Math.abs(o.x-x)<1e-8&&Math.abs(o.y-y)<1e-8));
    assert(ops.some(o=>o.type==='text'&&o.text==='G'&&Math.abs(o.x-x)<1e-8));
    assert(ops.some(o=>o.type==='text'&&o.text===(id==='miniMap'?'G · Pub':'GCB Pub')));
  }
});
test('the ordinary GTA home and its five mission cards remain intact, with only a short Pub hint',()=>{
  const f=setup();f.a.renderCards();const html=f.el('#missionCards').innerHTML;
  assert.equal(f.ctx.H3_DATA.missions.length,5);assert.equal((html.match(/data-mission="\d"/g)||[]).length,5);
  for(const m of f.ctx.H3_DATA.missions)assert(html.includes(m.title));
  assert(f.el('#home .caption').textContent.includes('GCB Pub über die Karte (M) finden'));
  const ui=fs.readFileSync(path.join(root,'Entwicklung/ui.html'),'utf8');assert(ui.includes('<span class="gameAcronym">GTA</span>'));assert(ui.includes('Gesundheit.<br>Transport.<br><em>Abenteuer.</em>'));assert(ui.includes('Fünf Menschen. Fünf Transportaufträge.'));assert(!/<button[^>]*>[^<]*GCB Pub/.test(ui));
  f.a.tutorial(false);assert(f.el('#dialogBody').innerHTML.includes('wähle «GCB Pub finden»'));assert(f.el('#dialogBody').innerHTML.includes('Patientinnen und Patienten fahren mit dem geprüften Transportangebot.'));
});
console.log(checks+' Pub map/navigation checks passed against the actual app. Real map readability remains browser QA.');
