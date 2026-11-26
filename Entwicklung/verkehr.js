/* Local civilian traffic. Physics is separate from interpolated instance rendering. */
window.H3Traffic = (() => {
 'use strict';
 const PI=Math.PI,LANE=2.5,ROAD_X=[-80,-24,32,88],ROAD_Z=[-84,-28,28,84];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),mod=(v,n)=>(v%n+n)%n;
 function makeRoute(minX,maxX,minZ,maxZ,r,reverse){
  const points=[];
  function point(x,z,h){const p=points[points.length-1];if(p&&Math.hypot(p.x-x,p.z-z)<.00001)return;points.push({x,z,h,s:0});}
  function line(ax,az,bx,bz){const n=Math.ceil(Math.hypot(bx-ax,bz-az)),h=Math.atan2(bx-ax,-(bz-az));for(let k=0;k<n;k++)point(ax+(bx-ax)*k/n,az+(bz-az)*k/n,h);}
  function arc(cx,cz,start){const n=Math.ceil(PI*r/2);for(let k=0;k<n;k++){const a=start+PI*.5*k/n;point(cx+Math.cos(a)*r,cz+Math.sin(a)*r,Math.atan2(-Math.sin(a),-Math.cos(a)));}}
  line(minX+r,minZ,maxX-r,minZ);arc(maxX-r,minZ+r,-PI/2);
  line(maxX,minZ+r,maxX,maxZ-r);arc(maxX-r,maxZ-r,0);
  line(maxX-r,maxZ,minX+r,maxZ);arc(minX+r,maxZ-r,PI/2);
  line(minX,maxZ-r,minX,minZ+r);arc(minX+r,minZ+r,PI);
  if(reverse){points.reverse();for(const p of points)p.h=wrap(p.h+PI);}
  points.push({...points[0]});let length=0;for(let k=1;k<points.length;k++){length+=Math.hypot(points[k].x-points[k-1].x,points[k].z-points[k-1].z);points[k].s=length;}
  const crossings=[];
  for(let xi=0;xi<ROAD_X.length;xi++)for(let zi=0;zi<ROAD_Z.length;zi++){
   let closest=null,distance=Infinity;for(const p of points){const d=Math.hypot(p.x-ROAD_X[xi],p.z-ROAD_Z[zi]);if(d<distance){distance=d;closest=p;}}
   if(distance<6)crossings.push({id:xi*4+zi,s:closest.s});
  }
  return {points,length,crossings};
 }
 const ROUTES=[makeRoute(-80+LANE,88-LANE,-84+LANE,84-LANE,3.5,false),makeRoute(-80-LANE,88+LANE,-84-LANE,84+LANE,8.5,true),makeRoute(-24+LANE,32-LANE,-28+LANE,28-LANE,3.5,false),makeRoute(-24-LANE,32+LANE,-28-LANE,28+LANE,8.5,true)];
 function pose(route,s,out){
  s=mod(s,route.length);let lo=0,hi=route.points.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(route.points[mid].s<=s)lo=mid;else hi=mid;}
  const a=route.points[lo],b=route.points[lo+1],len=b.s-a.s,f=len?(s-a.s)/len:0;out.x=a.x+(b.x-a.x)*f;out.z=a.z+(b.z-a.z)*f;out.heading=wrap(a.h+wrap(b.h-a.h)*f);out.curvature=wrap(b.h-a.h)/(len||1);return out;
 }
 // Oriented rectangle SAT. The same footprint is exported for player collision.
 function overlap(a,b,margin=0){
  const ah=a.heading||0,bh=b.heading||0,ac=Math.cos(ah),as=Math.sin(ah),bc=Math.cos(bh),bs=Math.sin(bh),dx=b.x-a.x,dz=b.z-a.z,aw=a.halfWidth+margin,al=a.halfLength+margin,bw=b.halfWidth,bl=b.halfLength;
  const rr=ac*bc+as*bs,rf=ac*bs-as*bc;
  if(Math.abs(dx*ac+dz*as)>aw+Math.abs(rr)*bw+Math.abs(rf)*bl)return false;
  if(Math.abs(dx*as-dz*ac)>al+Math.abs(rf)*bw+Math.abs(rr)*bl)return false;
  if(Math.abs(dx*bc+dz*bs)>bw+Math.abs(rr)*aw+Math.abs(rf)*al)return false;
  return Math.abs(dx*bs-dz*bc)<=bl+Math.abs(rf)*aw+Math.abs(rr)*al;
 }
 function roadClear(p){
  const c=Math.cos(p.heading),s=Math.sin(p.heading);
  for(const side of [-1,0,1])for(const end of [-1,0,1]){const x=p.x+c*side*p.halfWidth+s*end*p.halfLength,z=p.z+s*side*p.halfWidth-c*end*p.halfLength;let d=Infinity;for(const q of ROAD_X)d=Math.min(d,Math.abs(x-q));for(const q of ROAD_Z)d=Math.min(d,Math.abs(z-q));if(d>5.92)return false;}
  return true;
 }
 function create(T,scene,{makeVehicle,population=10}={}){
  if(typeof makeVehicle!=='function')throw Error('Für den Verkehr fehlt die lokale Fahrzeugfactory.');
  const group=new T.Group();group.name='H3_civilian_traffic';scene.add(group);
  population=clamp(Math.round(population)||10,10,16);
  const prototypes=[],parts=[],geometries=new Set(),materials=new Set(),plateTextures=new Set(),cars=[],obstacles=[],vehicles=[],nodes=Array.from({length:16},(_,id)=>({id,owner:null,since:0,candidates:[]}));
  const sample={x:0,z:0,heading:0,curvature:0,halfWidth:1,halfLength:2.5},look={...sample};
  const tmp=new T.Matrix4(),world=new T.Matrix4(),ry=new T.Matrix4(),rx=new T.Matrix4(),rootInverse=new T.Matrix4(),axleInverse=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),axis=new T.Vector3(0,1,0);
  let elapsed=0,disposed=false,steps=0,focusX=0,focusZ=0,drawn=0,heldId=null,walkFocus=null;
  const colours=[0xe7e9e5,0x536976,0x9a4740,0xaca9a1,0x38434b,0x718774,0xddd4be,0x607b8f,0x88564b,0xa8adb3,0x3b5162,0xd0c5b1,0x655651,0x71808d,0x585e59,0xb3b5b1];
  try{
   for(let index=0;index<2;index++){
    const model=makeVehicle([0,0,0,0xffffff],index,{id:'traffic-prototype-'+index,type:'civil',civil:true,noPlates:true});
    if(!model?.root||!model.chassis){model?.root?.removeFromParent();throw Error('Das lokale Verkehrsmodell ist unvollständig.');}
    model.root.position.set(0,-.085,0);model.root.rotation.set(0,0,0);model.root.updateWorldMatrix(true,true);rootInverse.copy(model.root.matrixWorld).invert();
    const box=new T.Box3().setFromObject(model.chassis),data=model.root.userData||{};
    const proto={model,index,cars:[],halfWidth:data.collisionHalfWidth||Math.max(Math.abs(box.min.x),Math.abs(box.max.x)),halfLength:data.collisionHalfLength||(box.max.z-box.min.z)*.5,centerZ:data.collisionCenterZ||(box.min.z+box.max.z)*.5,scale:model.root.scale.clone(),height:model.root.position.y};prototypes.push(proto);
    model.root.traverse(mesh=>{if(!mesh.isMesh)return;geometries.add(mesh.geometry);for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(mat);});
    model.root.traverse(mesh=>{
     if(!mesh.isMesh)return;const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
     if(mats.some(m=>/interior|carpet|fabric|headliner|screen|dash|seat|leather|steering/.test(m.name||'')))return;
     let wheel=null;for(const w of model.wheels||[]){for(let p=mesh;p&&p!==model.root;p=p.parent)if(p===w.axle){wheel=w;break;}if(wheel)break;}
     const local=new T.Matrix4(),tail=new T.Matrix4();
     if(wheel){local.multiplyMatrices(rootInverse,wheel.hub.matrixWorld);axleInverse.copy(wheel.axle.matrixWorld).invert();tail.multiplyMatrices(axleInverse,mesh.matrixWorld);}else local.multiplyMatrices(rootInverse,mesh.matrixWorld);
     const batch=new T.InstancedMesh(mesh.geometry,mesh.material,population);batch.name='civil_'+index+'_'+(wheel?'wheel_':'body_')+parts.length;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.frustumCulled=false;batch.castShadow=!wheel&&!!mesh.castShadow;batch.receiveShadow=true;batch.count=0;
     for(const m of mats)if(m.transparent)m.forceSinglePass=true;
     group.add(batch);parts.push({batch,proto,local,tail,wheel:!!wheel,front:!!wheel?.front,paint:mats.some(m=>/paint/.test(m.name||''))});
    });
    model.root.removeFromParent();
   }
   const seeds=population===10?[[0,18],[0,230],[0,440],[1,80],[1,290],[1,510],[2,18],[2,110],[3,65],[3,160]]:[[0,18],[0,150],[0,285],[0,420],[0,552],[1,70],[1,205],[1,340],[1,475],[1,610],[2,18],[2,88],[2,158],[3,45],[3,115],[3,185]].slice(0,population);
   for(let id=0;id<seeds.length;id++){
    const [route,initial]=seeds[id],proto=prototypes[id%3===1?1:0],car={id:'traffic-'+(id+1),number:id,route:ROUTES[route],routeIndex:route,initial,s:initial,previousS:initial,speed:0,previousOffset:0,offset:0,laneYaw:0,previousLaneYaw:0,steer:0,previousSteer:0,spin:0,previousSpin:0,halfWidth:proto.halfWidth,halfLength:proto.halfLength,proto,colour:new T.Color(colours[id]),x:0,z:0,heading:0,curvature:0,waiting:0,requestNode:-1,requestSince:Infinity,ownedNode:-1,ownedCrossing:0,bypass:null,viewDistance:0};
    if(window.H3Vehicles?.makePlates&&proto.model.root.userData.plateSlots){car.plates=window.H3Vehicles.makePlates(T,{id:car.id},proto.model.root.userData.plateSlots,proto.model.spec||{sx:proto.scale.x,sy:proto.scale.y,sz:proto.scale.z});car.plates.matrixAutoUpdate=false;group.add(car.plates);car.plates.traverse(mesh=>{if(!mesh.isMesh)return;geometries.add(mesh.geometry);materials.add(mesh.material);if(mesh.material.map?.isCanvasTexture)plateTextures.add(mesh.material.map);});}
    car.active=true;car.obstacle={id:car.id,x:0,z:0,heading:0,halfWidth:car.halfWidth,halfLength:car.halfLength};car.descriptor={id:car.id,type:'civil',name:'Stadtwagen '+(id+1),kind:'car',civil:true,traffic:true,x:0,z:0,heading:0,speed:0,colour:colours[id]};cars.push(car);proto.cars.push(car);obstacles.push(car.obstacle);vehicles.push(car.descriptor);
   }
  }catch(error){dispose();throw error;}
  function place(car,s,offset,out,yaw=0){pose(car.route,s,out);const c=Math.cos(out.heading),sn=Math.sin(out.heading);out.x+=c*offset;out.z+=sn*offset;out.heading=wrap(out.heading+yaw);out.halfWidth=car.halfWidth;out.halfLength=car.halfLength;return out;}
  function sync(car){place(car,car.s,car.offset,car,car.laneYaw);const o=car.obstacle;o.x=car.x-Math.sin(car.heading)*car.proto.centerZ;o.z=car.z+Math.cos(car.heading)*car.proto.centerZ;o.heading=car.heading;Object.assign(car.descriptor,{x:car.x,z:car.z,heading:car.heading,speed:car.speed});}
  function nextCrossing(car){let nearest=null,d=Infinity;for(const cross of car.route.crossings){const ahead=mod(cross.s-car.s,car.route.length);if(ahead<d){nearest=cross;d=ahead;}}return {cross:nearest,distance:d};}
  function reset(){
   if(disposed)return;elapsed=steps=0;heldId=null;walkFocus=null;obstacles.length=vehicles.length=0;for(const node of nodes){node.owner=null;node.candidates.length=0;node.since=0;}
   for(const car of cars){car.active=true;obstacles.push(car.obstacle);vehicles.push(car.descriptor);car.s=car.initial;car.previousS=car.s;car.speed=car.offset=car.previousOffset=car.laneYaw=car.previousLaneYaw=car.steer=car.previousSteer=car.spin=car.previousSpin=car.waiting=0;car.requestNode=car.ownedNode=-1;car.requestSince=Infinity;car.bypass=null;sync(car);}
   // Fixed seeds normally separate every car; deterministic fallback protects later route edits.
   for(const car of cars)for(let attempt=0;attempt<20;attempt++){let conflict=false;for(let k=0;k<car.number;k++)if(overlap(obstacles[car.number],obstacles[k],2)){conflict=true;break;}if(!conflict)break;car.s+=17;car.previousS=car.s;sync(car);}
   render(1);
  }
  function validBlocker(b){return b&&Number.isFinite(b.x)&&Number.isFinite(b.z)&&Number.isFinite(b.halfWidth)&&Number.isFinite(b.halfLength)&&b.halfWidth>=0&&b.halfLength>=0;}
  function clear(car,p,blockers,padding,checkRoad=true){
   if(checkRoad&&!roadClear(p))return false;
   for(const b of blockers){if(!validBlocker(b))continue;const reach=car.halfLength+b.halfLength+3;if(Math.abs(p.x-b.x)>reach||Math.abs(p.z-b.z)>reach)continue;const margin=padding+((b.kind==='pedestrian'||b.kind==='patient') ? .35 : 0);if(overlap(p,b,margin)){if(b.kind==='parked')car.probeBlocker=b;return false;}}
   for(const b of obstacles){if(b.id===car.id)continue;const reach=car.halfLength+b.halfLength+2;if(Math.abs(p.x-b.x)>reach||Math.abs(p.z-b.z)>reach)continue;if(overlap(p,b,padding))return false;}
   return true;
  }
  function updateBypass(car){if(car.bypass&&car.s>car.bypass.throughS)car.bypass=null;return car.bypass?car.bypass.offset:0;}
  function planBypass(car,blocker){
   let best=Infinity,at=0,lateral=0,angle=0;
   // Project the blocked car onto the upcoming route, including the next bend.
   // Current-heading projection misses parked cars immediately after a corner.
   for(let d=0;d<=48;d+=2){place(car,car.s+d,0,look);const dx=blocker.x-look.x,dz=blocker.z-look.z,dist=dx*dx+dz*dz;if(dist<best){best=dist;at=d;lateral=dx*Math.cos(look.heading)+dz*Math.sin(look.heading);angle=wrap((blocker.heading||0)-look.heading);}}
   const width=Math.abs(Math.cos(angle))*blocker.halfWidth+Math.abs(Math.sin(angle))*blocker.halfLength,along=Math.abs(Math.cos(angle))*blocker.halfLength+Math.abs(Math.sin(angle))*blocker.halfWidth,need=car.halfWidth+width+.44,candidates=[lateral-need,lateral+need].sort((a,b)=>Math.abs(a)-Math.abs(b));
   for(const offset of candidates){if(Math.abs(offset)>4.9)continue;place(car,car.s+at,offset,look);if(roadClear(look)){car.bypass={offset,throughS:car.s+at+car.halfLength+along+8};return;}}
  }
  function oncomingBeforeLaneChange(car){
   if(!car.bypass||Math.abs(car.bypass.offset)<1||Math.abs(car.offset)>.16)return false;
   if(car.ownedNode>=0){const d=mod(car.s-car.ownedCrossing,car.route.length);if(d<13||d>car.route.length-11.7)return false;}
   const c=Math.cos(car.heading),s=Math.sin(car.heading);
   return cars.some(other=>other.active&&other!==car&&Math.cos(other.heading-car.heading)<-.7&&((other.x-car.x)*s-(other.z-car.z)*c)>-6&&((other.x-car.x)*s-(other.z-car.z)*c)<48&&Math.abs((other.x-car.x)*c+(other.z-car.z)*s)<7);
  }

  function step(dt,blockers){
   elapsed+=dt;steps++;for(const node of nodes)node.candidates.length=0;
   for(const car of cars){if(!car.active)continue;
    car.previousS=car.s;car.previousOffset=car.offset;car.previousLaneYaw=car.laneYaw;car.previousSteer=car.steer;car.previousSpin=car.spin;
    if(car.ownedNode>=0){const passed=mod(car.s-car.ownedCrossing,car.route.length);const node=nodes[car.ownedNode];if(passed>13&&passed<car.route.length*.5||elapsed-node.since>5&&car.speed<.1&&passed>car.route.length*.5){node.owner=null;car.ownedNode=-1;}}
    const next=nextCrossing(car);car.crossing=next.cross;car.crossDistance=next.distance;
    if(next.distance<25&&car.ownedNode!==next.cross.id){if(car.requestNode!==next.cross.id){car.requestNode=next.cross.id;car.requestSince=elapsed;}nodes[next.cross.id].candidates.push(car);}else if(car.ownedNode<0){car.requestNode=-1;car.requestSince=Infinity;}
   }
   for(const node of nodes)if(node.owner===null&&node.candidates.length){let winner=node.candidates[0];for(const car of node.candidates)if(car.requestSince<winner.requestSince||car.requestSince===winner.requestSince&&car.number<winner.number)winner=car;node.owner=winner.number;node.since=elapsed;winner.ownedNode=node.id;winner.ownedCrossing=winner.crossing.s;winner.requestNode=-1;}
   for(const car of cars){if(!car.active)continue;
    let wanted=6.2+(car.number%4)*.42;let offsetGoal=updateBypass(car),bypassing=car.bypass||Math.abs(car.offset)>.08;
    if(bypassing)wanted=Math.min(wanted,2.8);
    for(let d=0;d<=12;d+=3){pose(car.route,car.s+d,look);if(Math.abs(look.curvature)>.025)wanted=Math.min(wanted,3.05);}
    if(car.crossDistance<25&&nodes[car.crossing.id].owner!==car.number)wanted=Math.min(wanted,Math.sqrt(8*Math.max(0,car.crossDistance-11.7)));
    const yieldLane=oncomingBeforeLaneChange(car);if(yieldLane)offsetGoal=0;car.probeBlocker=null;
    let freeDistance=35;
    // Every base route is fixed inside the carriageway. Only lane changes need
    // the more expensive nine-point road-envelope check during distant probing;
    // the actual movement is always checked. Two-metre probes cannot skip the
    // four-metre vehicle footprint and the short final sweep remains independent.
    for(let d=.4;d<=35;d+=2){const offset=car.offset+clamp(offsetGoal-car.offset,-d*.23,d*.23);place(car,car.s+d,offset,look);if(!clear(car,look,blockers,.33,Math.abs(offset)>.005)){freeDistance=Math.max(0,d-1.3);break;}}
    if(!car.bypass&&car.probeBlocker)planBypass(car,car.probeBlocker);
    if(yieldLane){wanted=0;if(car.ownedNode>=0&&car.crossDistance>11.7){nodes[car.ownedNode].owner=null;car.ownedNode=car.requestNode=-1;}}
    if(car.id===heldId||walkFocus&&Math.hypot(car.x-walkFocus.x,car.z-walkFocus.z)<8)wanted=0;
    wanted=Math.min(wanted,Math.sqrt(8*Math.max(0,freeDistance-1.1)));car.speed+=clamp(wanted-car.speed,-4*dt,1.65*dt);if(wanted<.05&&car.speed<.035)car.speed=0;
    const yawGoal=clamp((offsetGoal-car.offset)*.16,-.22,.22),nextYaw=car.laneYaw+(yawGoal-car.laneYaw)*(1-Math.exp(-dt*5));
    let travel=car.speed*dt,accepted=0;const count=Math.max(1,Math.ceil(travel/.15));let nextOffset=car.offset;
    for(let k=1;k<=count;k++){const move=travel*k/count,delta=offsetGoal-car.offset,shift=Math.sign(delta)*Math.min(Math.abs(delta),Math.max(0,Math.tan(nextYaw)*Math.sign(delta)*move)),off=car.offset+shift;place(car,car.s+move,off,sample,nextYaw);if(!clear(car,sample,blockers,.16)){car.speed=0;break;}accepted=move;nextOffset=off;}
    car.s+=accepted;car.offset=nextOffset;car.laneYaw=accepted>0?nextYaw:car.laneYaw;sync(car);car.spin+=accepted/(car.proto.model.wheelRadius||.34);car.steer+=(clamp(car.curvature*9+car.laneYaw*2.7,-1,1)-car.steer)*(1-Math.exp(-dt*8));car.waiting=car.speed<.1?car.waiting+dt:0;
    car.viewDistance=(car.x-focusX)**2+(car.z-focusZ)**2;
   }
  }
  function update(dt,blockers=[]){
   if(disposed||!Number.isFinite(dt)||dt<=0)return;
   blockers=Array.isArray(blockers)?blockers:[];const focus=blockers.find(b=>b.kind==='player'&&validBlocker(b));walkFocus=focus&&focus.halfWidth<.6?focus:null;if(focus){focusX=focus.x;focusZ=focus.z;}
   // The caller supplies60Hz ticks; bounded substeps also make a delayed tick safe.
   let remaining=Math.min(dt,.25);while(remaining>1e-9){const h=Math.min(1/60,remaining);step(h,blockers);remaining-=h;}
  }
  function render(alpha=1){
   if(disposed)return;alpha=clamp(Number.isFinite(alpha)?alpha:1,0,1);drawn=0;
   for(const part of parts){let count=0;const batch=part.batch;
    for(const car of part.proto.cars){if(!car.active||part.wheel&&car.viewDistance>135*135)continue;const at=car.previousS+(car.s-car.previousS)*alpha,offset=car.previousOffset+(car.offset-car.previousOffset)*alpha,yaw=car.previousLaneYaw+(car.laneYaw-car.previousLaneYaw)*alpha;place(car,at,offset,sample,yaw);position.set(sample.x,part.proto.height,sample.z);rotation.setFromAxisAngle(axis,-sample.heading);world.compose(position,rotation,part.proto.scale);
     if(part.wheel){ry.makeRotationY(-(car.previousSteer+(car.steer-car.previousSteer)*alpha)*.37);rx.makeRotationX(-(car.previousSpin+(car.spin-car.previousSpin)*alpha));tmp.copy(world).multiply(part.local);if(part.front)tmp.multiply(ry);tmp.multiply(rx).multiply(part.tail);}else tmp.copy(world).multiply(part.local);
     batch.setMatrixAt(count,tmp);if(part.paint)batch.setColorAt(count,car.colour);count++;
    }
    batch.count=count;batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;if(count)drawn++;
   }
   // Ten small registration pairs retain individual numbers; full car models
   // remain instanced. This is visual-only and never changes an obstacle pose.
   for(const car of cars)if(car.plates){car.plates.visible=car.active;if(!car.active)continue;const at=car.previousS+(car.s-car.previousS)*alpha,offset=car.previousOffset+(car.offset-car.previousOffset)*alpha,yaw=car.previousLaneYaw+(car.laneYaw-car.previousLaneYaw)*alpha;place(car,at,offset,sample,yaw);position.set(sample.x,car.proto.height,sample.z);rotation.setFromAxisAngle(axis,-sample.heading);car.plates.matrix.compose(position,rotation,car.proto.scale);car.plates.matrixWorldNeedsUpdate=true;}
  }
  function hold(id){const car=cars.find(c=>c.active&&c.id===id);if(!car)return false;heldId=id;return true;}
  function releaseHold(){heldId=null;}
  function transfer(id,origin){
   const car=cars.find(c=>c.active&&c.id===id);if(!car||Math.abs(car.speed)>=.02||!origin||Math.hypot(car.x-origin.x,car.z-origin.z)>4.5)return null;
   const config=[car.x,car.z,car.heading,car.descriptor.colour],model=makeVehicle(config,car.proto.index,{id:car.id,name:car.descriptor.name,type:'civil',civil:true});if(!model?.root)return null;
   Object.assign(model,{civil:true,kind:'car',fromTraffic:true,home:config.slice(),baseY:car.proto.height});car.active=false;car.speed=0;for(const node of nodes)if(node.owner===car.number)node.owner=null;car.ownedNode=-1;car.requestNode=-1;obstacles.splice(obstacles.indexOf(car.obstacle),1);vehicles.splice(vehicles.indexOf(car.descriptor),1);if(heldId===id)heldId=null;render(1);return model;
  }
  function dispose(){
   if(disposed)return;disposed=true;group.removeFromParent();for(const p of prototypes)p.model.root.removeFromParent();for(const p of parts)p.batch.dispose?.();for(const g of geometries)g.dispose?.();for(const m of materials)m.dispose?.();for(const texture of plateTextures)texture.dispose();group.clear();geometries.clear();materials.clear();plateTextures.clear();parts.length=prototypes.length=obstacles.length=vehicles.length=cars.length=0;
  }
  function getStatus(){return {cars:vehicles.length,population,routes:ROUTES.length,prototypes:prototypes.length,batches:parts.length,visibleBatches:drawn,plateMeshes:cars.filter(c=>c.active&&c.plates).length*2,steps,time:elapsed,moving:cars.filter(c=>c.active&&c.speed>.1).length,waiting:cars.filter(c=>c.active&&c.waiting>2).length,reservations:nodes.filter(n=>n.owner!==null).length,disposed};}
  reset();return {root:group,update,render,reset,dispose,hold,releaseHold,transfer,getVehicles:()=>vehicles,getObstacles:()=>obstacles,getStatus};
 }
 return {create};
})();
