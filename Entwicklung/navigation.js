/* Shared route guidance for the compact HUD; optional ground arrows for development/regression fixtures. */
window.H3Navigation=(()=>{
 'use strict';
 const EPS=.015,MAX_ARROWS=40,HORIZON=100;
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function clean(points){
  const out=[];
  for(const q of points||[]){if(!Number.isFinite(q?.x)||!Number.isFinite(q?.z))continue;const p={x:q.x,z:q.z};if(!out.length||distance(p,out.at(-1))>EPS)out.push(p);}
  for(let k=1;k<out.length-1;){const a=out[k-1],b=out[k],c=out[k+1],ab=distance(a,b),bc=distance(b,c),dot=((b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z))/(ab*bc);if(dot>.9999)out.splice(k,1);else k++;}
  return out;
 }
 function create(T,scene,{groundArrows=true}={}){
  let group,geometry,outlineMat,fillMat,outline,arrows,dummy;
  if(groundArrows){
   group=new T.Group();group.name='H3_navigation_route';scene.add(group);
  const shape=new T.Shape();shape.moveTo(-.20,-.72);shape.lineTo(.20,-.72);shape.lineTo(.20,-.04);shape.lineTo(.57,-.04);shape.lineTo(0,.80);shape.lineTo(-.57,-.04);shape.lineTo(-.20,-.04);shape.closePath();
   geometry=new T.ExtrudeGeometry(shape,{depth:.018,steps:1,bevelEnabled:false,curveSegments:1});geometry.rotateX(-Math.PI/2);
   outlineMat=new T.MeshBasicMaterial({color:0x163e43,transparent:true,opacity:.90,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:T.DoubleSide,fog:false});
   fillMat=new T.MeshBasicMaterial({color:0xffd068,transparent:true,opacity:.96,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,side:T.DoubleSide,fog:false});
   outline=new T.InstancedMesh(geometry,outlineMat,MAX_ARROWS);arrows=new T.InstancedMesh(geometry,fillMat,MAX_ARROWS);
  for(const mesh of [outline,arrows]){mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(mesh);}
  outline.name='route_arrow_outline';arrows.name='route_arrow_fill';outline.renderOrder=7;arrows.renderOrder=8;group.visible=false;
   dummy=new T.Object3D();
  }
  let cached=null,revision=0,drawn=-1,disposed=false;
  const isRoadLeg=s=>(Math.abs(s.a.x-s.b.x)<EPS&&[-80,-24,32,88].some(x=>Math.abs(s.a.x-x)<EPS))||(Math.abs(s.a.z-s.b.z)<EPS&&[-84,-28,28,84].some(z=>Math.abs(s.a.z-z)<EPS));
  function project(info,leg){
   const ux=(leg.b.x-leg.a.x)/leg.length,uz=(leg.b.z-leg.a.z)/leg.length,dx=info.x-leg.a.x,dz=info.z-leg.a.z;
   return {along:dx*ux+dz*uz,cross:Math.abs(dx*uz-dz*ux)};
  }
  function plan(info,target){
   if(!info||!target||!Number.isFinite(info.x)||!Number.isFinite(info.z)||!Number.isFinite(target.x)||!Number.isFinite(target.z))return null;
   const key=[target.x,target.z,info.mode,info.vehicleId||'',info.missionId||''].join('/');
   // Retain the chosen corridor and its progress. Re-projecting the origin every
   // 1.75 m used to revive a tiny sideways access leg on every straight walk.
   if(cached&&cached.key===key&&cached.segments.length){
    const leg=cached.segments[cached.index],q=project(info,leg),corridor=info.mode==='car'?8:11;
    if(q.cross<=corridor&&q.along>=-8&&q.along<=leg.length+corridor)return cached;
   }
   const raw=window.H3Rules?.route?.({x:info.x,z:info.z},target);if(!raw)return null;
   const points=clean(raw),segments=[];let length=0;
   for(let k=1;k<points.length;k++){const a=points[k-1],b=points[k],len=distance(a,b);segments.push({a,b,length:len,start:length,heading:Math.atan2(b.x-a.x,-(b.z-a.z))});length+=len;}
   let index=0;
   // Pavement and carriageway run alongside the same road. A small connector
   // to its mathematical centre line is not a genuine walking/driving turn.
   const access=info.mode==='car'?6:9;
   if(segments.length>1&&segments[0].length<=access&&!isRoadLeg(segments[0])&&isRoadLeg(segments[1]))index=1;
   cached={key,index,points,segments,length,revision:++revision,arrived:false,path:[],origin:{x:0,z:0},projection:{x:0,z:0}};
   return cached;
  }
  function activeRoute(info,target){
   const p=plan(info,target);if(!p||!p.segments.length)return null;
   let index=p.index;
   for(;index<p.segments.length-1;index++){
    const leg=p.segments[index],q=project(info,leg),corridor=info.mode==='car'?6:9;
    if(!(leg.length-q.along<=.65&&q.cross<=corridor))break;
   }
   // Once a corner has been reached, millimetre noise must not select the old
   // leg again. Clear/target/mode/mission changes start a fresh route instead.
   p.index=index;
   const first=p.segments[index],q=project(info,first),along=Math.max(0,Math.min(first.length,q.along));
   const projection=p.projection;projection.x=first.a.x+(first.b.x-first.a.x)*along/first.length;projection.z=first.a.z+(first.b.z-first.a.z)*along/first.length;
   p.origin.x=info.x;p.origin.z=info.z;p.path.length=0;p.path.push(p.origin);
   if(distance(p.origin,projection)>EPS)p.path.push(projection);
   for(let k=index;k<p.segments.length;k++)p.path.push(p.segments[k].b);
   return {p,index,first,along,remaining:first.length-along,start:first.start+along,next:p.segments[index+1],revision:p.revision+'/'+index};
  }
  function getGuidance(info,target){
   if(!target||!info){cached=null;return {angle:0,distance:0,nextDistance:0,instruction:'Suchziel auf der Karte wählen.',arrived:false,path:[]};}
   const straight=distance(info,target),route=activeRoute(info,target),p=route?.p;
   const arrival=info.mode==='car'?12:3.8,departure=info.mode==='car'?14:5;
   const arrived=straight<=(p?.arrived?departure:arrival);if(p)p.arrived=arrived;
   if(arrived)return {angle:0,distance:Math.round(straight),nextDistance:0,instruction:info.mode==='car'?'Zielzone erreicht – anhalten.':'Ziel erreicht.',arrived:true,path:p?.path||[],routeRevision:p?.revision};
   if(!route)return {angle:0,distance:Math.round(straight),nextDistance:Math.round(straight),instruction:'Route wird vorbereitet.',arrived:false,path:[]};
   const {index,first,remaining,next}=route,view=Number.isFinite(info.viewHeading)?info.viewHeading:(info.heading||0);
   // Aim ahead along the actual route, rather than at the nearest infinitesimal
   // connector. This also rounds the direction change at a genuine junction.
   let ahead=info.mode==='car'?10:5.5,aimX=first.b.x,aimZ=first.b.z;
   for(let k=index;k<p.segments.length;k++){
    const leg=p.segments[k],offset=k===index?route.along:0,available=leg.length-offset;
    if(ahead<=available||k===p.segments.length-1){const f=Math.min(leg.length,offset+ahead)/leg.length;aimX=leg.a.x+(leg.b.x-leg.a.x)*f;aimZ=leg.a.z+(leg.b.z-leg.a.z)*f;break;}
    ahead-=available;
   }
   const routeHeading=Math.atan2(aimX-info.x,-(aimZ-info.z)),angle=wrap(routeHeading-view);
   const nextDistance=Math.max(0,Math.round(remaining));let instruction='Der Route bis zum Ziel folgen.';
   const movementAngle=wrap(first.heading-(info.heading||0)),cameraOffset=wrap(view-(info.heading||0));
   if(Math.abs(cameraOffset)>.35)instruction='Der Route bis zum Ziel folgen.';
   else if(Math.abs(movementAngle)>2.45)instruction=info.mode==='car'?'Wenden und der Route folgen.':'Umdrehen und der Route folgen.';
   else if(next){const turn=wrap(next.heading-first.heading);if(Math.abs(turn)>2.45)instruction=nextDistance<=4?'Hier umdrehen.':`In ${nextDistance} m umdrehen.`;else if(Math.abs(turn)>.35){const side=turn>0?'rechts':'links';instruction=nextDistance<=4?`Jetzt ${side} abbiegen.`:`In ${nextDistance} m ${side} abbiegen.`;}}
   return {angle,distance:Math.max(0,Math.round(p.length-route.start+distance(info,p.projection))),nextDistance,instruction,arrived:false,routeHeading,routeLegHeading:first.heading,routeLeg:index,routeRevision:p.revision,path:p.path};
  }
  function update(info,target){
   if(disposed)return;
   const guidance=getGuidance(info,target);if(!groundArrows)return guidance;const route=activeRoute(info,target);
   if(!route||!target||guidance.arrived){group.visible=false;arrows.count=outline.count=0;return guidance;}
   group.visible=true;if(drawn===route.revision&&arrows.count>0)return guidance;
   const spacing=info.mode==='car'?4.7:3.6,scale=info.mode==='car'?1.18:.89;
   let count=0;
   function arrow(seg,along){
    if(count>=MAX_ARROWS)return;
    const f=along/seg.length,x=seg.a.x+(seg.b.x-seg.a.x)*f,z=seg.a.z+(seg.b.z-seg.a.z)*f;
    const onRoad=[-80,-24,32,88].some(a=>Math.abs(a-x)<6)||[-84,-28,28,84].some(a=>Math.abs(a-z)<6),y=(onRoad?-.09:-.17)+.037;
    dummy.position.set(x,y,z);dummy.rotation.set(0,-seg.heading,0);dummy.scale.setScalar(scale*1.13);dummy.updateMatrix();outline.setMatrixAt(count,dummy.matrix);
    dummy.position.y=y+.003;dummy.scale.setScalar(scale);dummy.updateMatrix();arrows.setMatrixAt(count++,dummy.matrix);
   }
   // Even a short, still-active access leg needs its own first arrow. Previously
   // fixed 2.6/4.2m sampling silently skipped it and contradicted the HUD.
   const firstStep=Math.min(info.mode==='car'?4.2:2.6,route.remaining*.5);
   if(route.remaining>EPS)arrow(route.first,route.along+firstStep);
   const limit=Math.min(route.p.length-1.2,route.start+HORIZON);
   for(let d=route.start+firstStep+spacing;d<limit&&count<MAX_ARROWS;d+=spacing){
    const seg=route.p.segments.find(s=>d>=s.start&&d<s.start+s.length);if(!seg)continue;
    const along=d-seg.start;if(along<.85||seg.length-along<.85)continue;arrow(seg,along);
   }
   arrows.count=outline.count=count;arrows.instanceMatrix.needsUpdate=outline.instanceMatrix.needsUpdate=true;drawn=route.revision;return guidance;
  }
  function clear(){cached=null;drawn=-1;if(group){group.visible=false;arrows.count=outline.count=0;}}
  function dispose(){if(disposed)return;disposed=true;clear();if(group){scene.remove(group);geometry.dispose();outlineMat.dispose();fillMat.dispose();}}
  return {update,clear,dispose,getGuidance};
 }
 return {create};
})();
