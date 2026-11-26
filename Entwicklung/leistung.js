/* Measured frame timing and conservative, reversible render-quality adaptation. */
window.H3Performance=(()=>{
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function create({devicePixelRatio=1,onProfile=()=>{}}={}){
  let quality='auto',scale=.85,elapsed=0,lastChange=0,lastSnapshot=-Infinity,slowFor=0,fastFor=0,active=false;
  const base=Math.min(Math.max(1,devicePixelRatio||1),1.6),samples=[],stats={frameMs:0,fps:0,p95ms:0,frames:0};
  let render={calls:0,triangles:0,geometries:0,textures:0};
  function profile(){return {quality,renderScale:scale,pixelRatio:base*scale,shadowMapSize:quality==='high'?1536:quality==='smooth'?768:1024,shadowRadius:quality==='high'?62:quality==='smooth'?42:50};}
  function emit(){onProfile(profile());}
  function setQuality(value){if(!['auto','high','smooth'].includes(value))return false;reset();quality=value;scale=value==='high'?1:value==='smooth'?.60:.85;slowFor=fastFor=0;lastChange=elapsed;emit();return true;}
  function record(milliseconds,info){
   if(info){render={calls:info.render?.calls||0,triangles:info.render?.triangles||0,geometries:info.memory?.geometries||0,textures:info.memory?.textures||0};}
   if(!Number.isFinite(milliseconds)||milliseconds<=0)return;
   elapsed+=milliseconds;samples.push(milliseconds);if(samples.length>240)samples.shift();stats.frameMs=milliseconds;stats.frames++;
   if(elapsed-lastSnapshot>=500||stats.frames<3){const sorted=samples.slice().sort((a,b)=>a-b),mean=samples.reduce((a,b)=>a+b,0)/samples.length;stats.fps=1000/mean;stats.p95ms=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))];lastSnapshot=elapsed;}
   if(quality!=='auto'||samples.length<45)return;
   const ema=samples.slice(-45).reduce((a,b)=>a+b,0)/Math.min(45,samples.length);
   slowFor=ema>24?slowFor+milliseconds:0;fastFor=ema<17.5?fastFor+milliseconds:0;
   if(slowFor>1800&&elapsed-lastChange>2200&&scale>.60){scale=Math.max(.60,Math.round((scale-.10)*100)/100);slowFor=fastFor=0;lastChange=elapsed;emit();}
   else if(fastFor>8000&&elapsed-lastChange>10000&&scale<1){scale=Math.min(1,Math.round((scale+.05)*100)/100);slowFor=fastFor=0;lastChange=elapsed;emit();}
  }
  function snapshot(){return {...stats,...render,...profile(),active};}
  function setActive(value){active=!!value;}
  function reset(){samples.length=0;stats.frameMs=stats.fps=stats.p95ms=stats.frames=0;elapsed=0;lastSnapshot=-Infinity;lastChange=slowFor=fastFor=0;}
  emit();return {record,snapshot,setQuality,setActive,reset,profile};
 }
 return {create};
})();
