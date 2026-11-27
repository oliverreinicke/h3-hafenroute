/* Public-use city vehicles for the player's own journeys. No patient transport. */
window.H3Mobility=(()=>{
 function scooter(T,scene,position,identity){
  const [x,z,heading,colour]=position,root=new T.Group(),chassis=new T.Group();root.add(chassis);scene.add(root);
  const metal=new T.MeshStandardMaterial({color:0x343b3f,metalness:.76,roughness:.31}),paint=new T.MeshStandardMaterial({color:colour,metalness:.43,roughness:.36}),rubber=new T.MeshStandardMaterial({color:0x1c2021,roughness:.92}),alloy=new T.MeshStandardMaterial({color:0xb8c4c7,metalness:.88,roughness:.26});
  paint.name='h3_scooter_paint';
  const brakeLight=new T.MeshStandardMaterial({color:0xb21c2e,emissive:0xd62a35,emissiveIntensity:.55,roughness:.3});
  const lamp=new T.MeshStandardMaterial({color:0xf3ffeb,emissive:0xe3ffeb,emissiveIntensity:.4,roughness:.23});
  function mesh(g,m,parent=chassis,x=0,y=0,z=0){const q=new T.Mesh(g,m);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;parent.add(q);return q;}
  const box=(w,h,d,m,x,y,z,parent=chassis)=>mesh(new T.BoxGeometry(w,h,d),m,parent,x,y,z);
  function tube(a,b,r,m,parent=chassis){const start=new T.Vector3(...a),end=new T.Vector3(...b),v=end.clone().sub(start),q=mesh(new T.CylinderGeometry(r,r,v.length(),12),m,parent);q.position.copy(start).lerp(end,.5);q.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return q;}
  box(.25,.085,.83,paint,0,.143,.045);box(.222,.014,.69,rubber,0,.193,.06);
  for(let i=-3;i<=3;i++)box(.205,.004,.009,metal,0,.202,.06+i*.083);
  box(.205,.025,.28,metal,0,.11,.015);
  const barY=1.2872,barZ=-.3586;
  tube([0,.18,-.35],[0,barY,barZ],.023,metal);tube([0,.18,-.35],[0,.34,-.43],.026,paint);
  tube([-.27,barY,barZ],[.27,barY,barZ],.018,alloy);
  for(const side of [-1,1]){tube([side*.16,barY,barZ],[side*.285,barY,barZ],.027,rubber);tube([side*.18,barY-.025,barZ-.03],[side*.26,barY-.04,barZ-.05],.008,metal);}
  const display=box(.09,.014,.065,rubber,0,barY+.022,barZ);display.rotation.x=.22;
  box(.06,.003,.038,new T.MeshStandardMaterial({color:0x87d9b8,emissive:0x298769,emissiveIntensity:.4,roughness:.35}),0,barY+.032,barZ);
  const cable=new T.CatmullRomCurve3([new T.Vector3(.19,barY-.025,barZ-.03),new T.Vector3(.11,.82,-.40),new T.Vector3(.025,.34,-.44)]);mesh(new T.TubeGeometry(cable,14,.004,5,false),rubber);
  box(.075,.04,.035,lamp,0,.84,-.345);box(.12,.025,.02,brakeLight,0,.205,.46);
  const wheels=[];for(const [front,wz]of[[true,-.46],[false,.45]]){
   const hub=new T.Group(),axle=new T.Group();hub.position.set(0,.112,wz);hub.add(axle);root.add(hub);
   const tyre=mesh(new T.TorusGeometry(.086,.023,8,28),rubber,axle);tyre.rotation.y=Math.PI/2;
   const rim=mesh(new T.CylinderGeometry(.065,.065,.052,16),alloy,axle);rim.rotation.z=Math.PI/2;
   const cap=mesh(new T.CylinderGeometry(.026,.026,.064,12),metal,axle);cap.rotation.z=Math.PI/2;
   for(let n=0;n<6;n++){const a=n*Math.PI/3;tube([-.034,.017*Math.cos(a),.017*Math.sin(a)],[-.034,.063*Math.cos(a),.063*Math.sin(a)],.006,metal,axle);}
   wheels.push({hub,axle,front});
   const guard=mesh(new T.TorusGeometry(.117,.011,5,24,Math.PI),paint,chassis,0,.112,wz);guard.rotation.y=Math.PI/2;
  }
  for(const side of [-1,1])tube([side*.045,.25,-.40],[side*.045,.112,-.46],.013,alloy);
  tube([-.08,.12,.24],[-.135,.014,.29],.007,metal);
  // Merge fixed details by material; the two wheel axles retain their animation.
  function batch(parent){
   if(!window.GeometryTools?.mergeGeometries)return;
   const groups=new Map();
   for(const q of parent.children.slice()){
    if(!q.isMesh)continue;q.updateMatrix();
    const g=q.geometry.index?q.geometry.toNonIndexed():q.geometry.clone();g.applyMatrix4(q.matrix);g.deleteAttribute('uv');
    const id=q.material.uuid;if(!groups.has(id))groups.set(id,{material:q.material,parts:[]});groups.get(id).parts.push(g);parent.remove(q);q.geometry.dispose();
   }
   for(const {material,parts}of groups.values()){const g=window.GeometryTools.mergeGeometries(parts),q=new T.Mesh(g,material);q.castShadow=true;q.receiveShadow=true;parent.add(q);parts.forEach(p=>p.dispose());}
  }
  batch(chassis);for(const wheel of wheels)batch(wheel.axle);
  root.position.set(x,-.09,z);root.rotation.y=-heading;
  Object.assign(root.userData,{collisionHalfWidth:.30,collisionHalfLength:.59,collisionCenterZ:0,cameraRoofHeight:1.95,vehicleDetail:'original-electric-scooter',passengerSeat:null});
  return {root,chassis,wheels,brakeLight,heading,id:identity.id,type:'scooter',kind:'scooter',civil:true,home:position,baseY:-.09,wheelRadius:.109,index:0,spec:{name:identity.name,sx:.34,sy:1,sz:.25,top:20/3.6}};
 }
 function create(T,scene,makeVehicle,{sports=false}={}){
  const list=[];
  // Sport models replace two existing parking places; population and all five
  // clinical transport offers stay unchanged.
  const cars=[['city-car-1',sports?'Sportwagen am Quai':'Quai-Kombi',sports?[-83.5,24,0,0xb9362e]:[-83.5,65,0,0x335d78],sports?5:0],['city-car-2','Silberner Stadtwagen',[-20,-61,Math.PI,0xa8afb4],0],['city-car-3','Familienvan',[37,4,0,0x8e3a35],1],['city-car-4',sports?'Blauer Sportwagen':'Blauer Stadtwagen',[84,-57,Math.PI,0x527b93],sports?5:0]];
  for(const [id,name,position,index]of cars){const q=makeVehicle(position,index,{id,name,type:'civil',civil:true});Object.assign(q,{civil:true,kind:'car',home:position,baseY:-.085});list.push(q);}
  const scooters=[
   ['scooter-quai','Quai 1',[-88,6,0,0x72b6a0]],['scooter-quai-2','Quai 2',[-88,2,0,0x72b6a0]],['scooter-quai-3','Quai 3',[-88,10,0,0x72b6a0]],
   ['scooter-platz','Stadtplatz 1',[-17.1,-18,Math.PI/2,0xd0a85d]],['scooter-platz-2','Stadtplatz 2',[-17.1,-14,Math.PI/2,0xd0a85d]],['scooter-platz-3','Stadtplatz 3',[-17.1,-22,Math.PI/2,0xd0a85d]],
   ['scooter-spital','Spital 1',[79.8,50,Math.PI,0x738ca5]],['scooter-spital-2','Spital 2',[79.8,47,Math.PI,0x738ca5]],['scooter-spital-3','Spital 3',[79.8,44,Math.PI,0x738ca5]],
   ['scooter-ost','Ostquai 1',[95.5,-8,0,0x72b6a0]],['scooter-ost-2','Ostquai 2',[95.5,-4,0,0xd0a85d]],['scooter-ost-3','Ostquai 3',[95.5,0,0,0x738ca5]]
  ];
  // One geometry tree, shared fixed materials and three shared paint variants.
  const first=scooters[0],prototype=scooter(T,scene,first[2],{id:first[0],name:'E-Scooter · '+first[1]});prototype.chassis.name='shared_scooter_chassis';prototype.wheels.forEach((w,i)=>{w.hub.name='shared_scooter_hub_'+i;w.axle.name='shared_scooter_axle_'+i;});
  let originalPaint;prototype.root.traverse(q=>{if(q.isMesh&&q.material.name==='h3_scooter_paint')originalPaint=q.material;});const paints=new Map([[first[2][3],originalPaint]]);
  for(let i=0;i<scooters.length;i++){
   const [id,name,position]=scooters[i],root=i?prototype.root.clone(true):prototype.root,brake=i?prototype.brakeLight.clone():prototype.brakeLight;
   if(!paints.has(position[3])){const material=originalPaint.clone();material.color.set(position[3]);paints.set(position[3],material);}
   root.traverse(q=>{if(!q.isMesh)return;if(q.material.name==='h3_scooter_paint')q.material=paints.get(position[3]);if(q.material===prototype.brakeLight)q.material=brake;});if(i)scene.add(root);root.position.set(position[0],-.09,position[1]);root.rotation.y=-position[2];
   const wheels=prototype.wheels.map((w,k)=>({front:w.front,hub:root.getObjectByName('shared_scooter_hub_'+k),axle:root.getObjectByName('shared_scooter_axle_'+k)}));
   list.push({...prototype,root,chassis:root.getObjectByName('shared_scooter_chassis'),wheels,brakeLight:brake,id,heading:position[2],home:position,spec:{...prototype.spec,name:'E-Scooter · '+name}});
  }

  return list;
 }
 return {create,scooter};
})();
