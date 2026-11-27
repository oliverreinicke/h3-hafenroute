/* Freie 3D-Stadtfahrt. Das Fahrwerk, die Spielfigur und der Wagen sind Originalmodelle. */
window.Drive = (() => {
  "use strict";
  const keys = {left:false,right:false,gas:false,brake:false,sprint:false};
  const taps={left:0,right:0,gas:0,brake:0},tapActions=Object.keys(taps);
  const TAU = 2*Math.PI;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const smooth=(dt,k)=>1-Math.exp(-dt*k);
  let T, canvas,renderer,scene,camera,city,person,car,marker, pieces;
  let active=false, raf, stage=0, arrived, report, last=null, clock=0, reportTime=0;
  let mode="walk", characterHeading=0, vehicleHeading=0, velocity=0, wheelSteer=0;
  let orbit=0, viewHeading=null, cameraYaw=null, cameraArm=0, pitch=.16, drag=null, idleOrbit=0, baseline=1, nearest=1;
  let gait=0, footSpeed=0, walkVelocityX=0, walkVelocityZ=0, walkingTurnVelocity=0, walkingTravelSpeed=0, fleet=[], onTalk=null;
  let sizeObserver, lost=false, nextShadow=0, portraitRaf, probeTarget, navigation, perf, shadowLight, shadowBasis, cameraEye, cameraForward, environmentReady=false;
  const FIXED_STEP=1/60;let accumulator=0,previousPose=null,qualityChoice='auto';
  const diagnosticFrames=typeof URLSearchParams!=='undefined'&&new URLSearchParams(window.location?.search||'').has('pruefung');
  const drawStats={mainCalls:0,shadowCalls:0,skinMainCalls:0,skinShadowCalls:0,mainTriangles:0,shadowTriangles:0,skinMainTriangles:0,skinShadowTriangles:0,physicsCpuMs:0,actorsCpuMs:0,renderCpuMs:0,telemetryCpuMs:0};
  let mission=null,target=null,patient=null,passengerPresent=false,delivered=false,collisionCount=0,travelDistance=0,lastCollision=-10,onAction=null,lastInfo=null,firstPerson=false;
  let traffic=null,pendingExit=null,pendingEnter=null,walkRunTime=0;const trafficBlockers=[];
  let pubCameraBlend=0,pubOrder=null;
  const pubFoodIds=new Set(['burger','flammkuchen','fries','salad']);
  const FLEET=[
    {id:'taxi',type:'taxi',name:'Taxi Lindenhafen',position:[-82.5,12.6,0,0xd9b557]},
    {id:'volunteer',type:'volunteer',name:'Freiwilliger Fahrdienst',position:[-75,-39,0,0x5d9b91]},
    {id:'wheelchair',type:'wheelchair',name:'Rollstuhlbus',position:[-29,-9,Math.PI,0x6598ad]},
    {id:'lying',type:'lying',name:'Liegendtransporter',position:[37,61,0,0xe5e8de]},
    {id:'ambulance',type:'ambulance',name:'Rettungswagen mit Team',position:[83,11,Math.PI,0xefede3]}
  ];
  function mesh(geometry,material,parent,x=0,y=0,z=0) {
    const m=new T.Mesh(geometry, material);m.position.set(x,y,z);parent.add(m);return m;
  }
  function group(parent,x=0,y=0,z=0) {
    const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;
  }
  function material(colour,rough=.72,metal=.02,emission=0,glow=0) {
    return new T.MeshStandardMaterial({color:colour,roughness:rough,metalness:metal,emissive:emission,emissiveIntensity:glow});
  }
  const box=(parent,mat,x,y,z,w,h,d)=>mesh(new T.BoxGeometry(w,h,d),mat,parent,x,y,z);
  function oval(parent,mat,x,y,z,w,h,d){
    const m=mesh(new T.SphereGeometry(1,16,12),mat,parent,x,y,z);m.scale.set(w,h,d);return m;
  }
  function rod(parent,mat,a,b,top,bottom=top,n=9){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),dir=end.clone().sub(start);
    const m=mesh(new T.CylinderGeometry(top,bottom,dir.length(),n),mat,parent);
    m.position.copy(start).lerp(end,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return m;
  }
  function contact(parent,w,d,opacity=.32) {
    const c=document.createElement("canvas");c.width=c.height=64;const cc=c.getContext("2d");
    const grad=cc.createRadialGradient(32,32,2,32,32,32);
    grad.addColorStop(0,"rgba(17,14,32,.9)");grad.addColorStop(.57,"rgba(18,19,32,.66)");grad.addColorStop(1,"rgba(18,19,32,0)");
    cc.fillStyle=grad;cc.fillRect(0,0,64,64);
    const shadow=mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),parent,0,.075,0);
    shadow.rotation.x=-Math.PI*.5;
  }
  function makePerson(){
    const root=group(scene);contact(root,1.08,1.05,.65);const footShadow=root.children[0];
    const hips=group(root,0,.91,0),upper=group(hips);
    const trousers=material(0x232d44),shoe=material(0xe6d8ca),sole=material(0x363844),jacket=material(0x4b9498),trim=material(0x183944);
    const skin=material(0xaa6d50),hair=material(0x2d2229), shirt=material(0xdacfad),reflect=material(0xf2d29b);
    oval(upper,jacket,0,.26,0,.253,.34,.15);
    oval(upper,trim,0,.032,.004,.209,.079,.138);
    box(upper,shirt,0,.33,-.141,.061,.30,.025);
    for(const side of [-1,1]){
      const lapel=box(upper,trim,side*.062,.425,-.131,.063,.171,.035);lapel.rotation.z=side*-.43;
      box(upper,reflect,side*.15,.42,.105,.108,.024,.032);
    }
    box(upper,reflect,0,.40,.145,.20,.028,.012);
    rod(upper,skin,[0,.48,0],[0,.626,0],.082);
    const head=group(upper,0,.678,-.006);
    oval(head,skin,0,0,0,.131,.174,.13);oval(head,hair,0,.077,.008,.137,.115,.133);
    oval(head,hair,0,.024,.069,.127,.12,.086);oval(head,hair,.005,.168,.065,.078,.068,.075);
    oval(head,skin,0,-.004,-.126,.031,.033,.031);
    for(const s of [-1,1]){
      oval(head,skin,s*.128,-.009,0,.025,.043,.025);
      oval(head,hair,s*.048,.038,-.12,.011,.009,.006);
    }
    const limbs=[];
    for(const side of [-1,1]){
      const hip=group(hips,side*.117,-.014,.005);
      rod(hip,trousers,[0,0,0],[0,-.42,.018],.09,.11);
      const knee=group(hip,0,-.42,.018);
      rod(knee,trousers,[0,0,0],[0,-.37,-.01],.065,.086);
      oval(knee,shoe,0,-.383,-.056,.084,.064,.137);
      box(knee,sole,0,-.43,-.053,.148,.026,.218);
      const shoulder=group(upper,side*.231,.414,.014);
      oval(shoulder,jacket,0,-.04,0,.091,.122,.093);
      rod(shoulder,jacket,[0,-.025,0],[side*.037,-.257,.021],.067,.085);
      const elbow=group(shoulder,side*.037,-.257,.021);
      rod(elbow,jacket,[0,0,0],[0,-.182,-.13],.052,.069);
      oval(elbow,skin,0,-.196,-.143,.049,.068,.043);
      limbs.push({hip,knee,shoulder,elbow,side});
    }
    const actor=window.People3D.attach(root,{sex:'female',height:1.72,shirt:0x407579,pants:0x37465b,hair:0x574235,skin:0xffe7d7,reverse:true},()=>{hips.visible=false;});
    return {root,hips,upper,head,limbs,actor,footShadow};
  }
  function meshPanels(parent,points,indices,mat){
    const geom=new T.BufferGeometry(),v=[];
    for(const i of indices)v.push(...points[i]);
    geom.setAttribute("position",new T.Float32BufferAttribute(v,3));geom.computeVertexNormals();
    const m=mat.clone();m.side=T.DoubleSide;return mesh(geom,m,parent);
  }
  function bodyHull(parent,rings,mat){
    const pts=[],indices=[];
    // Four cross-section corners for each slice along the chassis.
    for(const [z,lo,hi,bottom,top] of rings)pts.push([-lo,bottom,z],[lo,bottom,z],[hi,top,z],[-hi,top,z]);
    for(let r=0;r<rings.length-1;r++)for(let s=0;s<4;s++){
      const a=r*4+s,b=r*4+(s+1)%4,c=a+4,d=b+4;indices.push(a,c,b,b,c,d);
    }
    const n=pts.length-4;indices.push(0,1,2,0,2,3,n,n+2,n+1,n,n+3,n+2);
    return meshPanels(parent,pts,indices,mat);
  }
  const models=[
    {name:'Taxi Lindenhafen',type:'taxi',sx:1,sy:1,sz:1,cab:1,roof:1,top:13.8},
    {name:'Freiwilliger Fahrdienst',type:'volunteer',sx:1.03,sy:1.04,sz:1.06,cab:1.10,roof:1.06,top:13.8},
    {name:'Rollstuhlbus',type:'wheelchair',sx:1.12,sy:1,sz:1.20,top:12.5},
    {name:'Liegendtransporter',type:'lying',sx:1.12,sy:1,sz:1.25,top:12.5},
    {name:'Rettungswagen mit Team',type:'ambulance',sx:1.13,sy:1,sz:1.25,top:13.8},
    {name:'Sportwagen',type:'civil',sx:1,sy:1,sz:1,top:19.4}
  ];
  function batchParts(parent){
    const groups=new Map();
    for(const child of parent.children.slice()){
      if(!child.isMesh)continue;
      child.updateMatrix();
      const mat=child.material;
      const id=mat.map||[mat.color.getHex(),mat.roughness,mat.metalness,mat.emissive?.getHex()].join('/');
      if(!groups.has(id))groups.set(id,{mat,geos:[]});
      const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();
      g.applyMatrix4(child.matrix);
      if(!mat.map)g.deleteAttribute('uv');
      groups.get(id).geos.push(g);parent.remove(child);child.geometry.dispose();
    }
    for(const {mat,geos} of groups.values()){
      const joined=window.GeometryTools.mergeGeometries(geos);
      const part=new T.Mesh(joined,mat);part.castShadow=true;part.receiveShadow=true;parent.add(part);
      geos.forEach(g=>g.dispose());
    }
  }
  function makeCar(config,index){
    if(window.H3Vehicles)return window.H3Vehicles.make(T,scene,config,index,models[index],FLEET[index]);
    const [x,z,heading,colour]=config,kind=index%models.length,spec=models[kind];
    if(index>=2)return makeVan(config,index);
    const root=group(scene),chassis=group(root);
    contact(root,3.0,5.0,.85);
    const paint=new T.MeshPhysicalMaterial({color:colour,roughness:.24,metalness:.55,clearcoat:.93,clearcoatRoughness:.11}), dark=material(0x273747,.44,.26), chrome=material(0xabb9b9,.3,.6);
    const glass=material(0x304558,.2,.42,0x182638,.20), headlight=material(0xd0fded,.32,.03,0xbffbe8,1.6);
    const brakeLight=material(0xf45266,.26,.03,0xf74062,1.1), amber=material(0xffbc7c,.4,0,0xc97943,.6);
    glass.transparent=true;glass.opacity=.43;glass.depthWrite=false;
    const rubber=material(0x1d202a,.96,0),rim=material(0x879aa3,.30,.64);
    bodyHull(chassis,[[-2.18,.78,.84,.37,.68],[-1.98,.93,.92,.29,.78],[-1.41,.97,.94,.30,.89],[-.78,.99,.94,.30,.94],[.98,.99,.95,.30,.97],[1.79,.96,.92,.31,.93],[2.14,.89,.88,.36,.79]],paint);
    const cabin=group(chassis,0,.91*(1-spec.roof),kind===4?-.39:kind===1?-.13:0);
    cabin.scale.set(1,spec.roof,spec.cab);
    bodyHull(cabin,[[-1.02,.876,.69,.897,.998],[-.38,.926,.729,.925,1.46],[.82,.924,.748,.947,1.47],[1.58,.897,.746,.918,1.17],[1.71,.855,.77,.92,.978]],glass);
    bodyHull(cabin,[[-.38,.735,.708,1.451,1.486],[.85,.753,.714,1.453,1.499],[1.04,.733,.69,1.39,1.43]],paint);
    for(const side of [-1,1]){
      rod(cabin,paint,[side*.92,.93,-.99],[side*.723,1.465,-.38],.032,.041);
      rod(cabin,dark,[side*.924,.94,.22],[side*.748,1.465,.22],.045);
      rod(cabin,paint,[side*.909,.94,1.55],[side*.745,1.466,.84],.063,.077);
      rod(cabin,chrome,[side*.954,.933,-.87],[side*.955,.949,1.52],.017);
      rod(cabin,dark,[side*.718,1.505,-.27],[side*.721,1.506,.85],.021);
      rod(cabin,chrome,[side*.93,.96,-.56],[side*1.04,.969,-.58],.023);
      oval(cabin,paint,side*1.057,.991,-.59,.093,.055,.101);
      box(chassis,chrome,side*.964,.841,.40,.024,.031,.138);
      box(chassis,dark,side*.968,.40,0,.07,.095,3.45);
      box(chassis,headlight,side*.685,.655,-2.19,.36,.070,.026);
      box(chassis,amber,side*.869,.661,-2.15,.060,.073,.031);
      box(chassis,brakeLight,side*.675,.70,2.145,.365,.092,.032);
      box(chassis,chrome,side*.66,.361,2.12,.20,.075,.07);
    }
    box(chassis,dark,0,.47,-2.189,1.23,.13,.035);
    box(chassis,dark,0,.438,2.132,1.63,.125,.05);
    box(chassis,brakeLight,0,.722,2.145,1.05,.027,.019);
    if(kind===1){
      for(const side of [-1,1])box(cabin,chrome,side*.61,1.55,.18,.055,.065,1.45);
    }else if(kind===3){
      for(const side of [-1,1])box(cabin,chrome,side*.61,1.55,.18,.055,.065,1.45);
      for(const end of [-.36,.71])box(cabin,dark,0,1.59,end,1.32,.055,.093);
    }else if(kind===4){
      box(chassis,dark,0,1.002,1.27,1.62,.07,1.45);
      for(const side of [-1,1])box(chassis,paint,side*.86,1.079,1.27,.12,.29,1.46);
      box(chassis,paint,0,1.075,1.96,1.73,.23,.12);
      for(let i=-3;i<=3;i++)box(chassis,dark,i*.19,1.052,1.28,.043,.04,1.21);
    }
    for(const side of [-1,1])for(const end of [-.72,.55]){
      box(chassis,dark,side*.973,.68,end,.012,.41,.016);
    }
    for(let i=-2;i<=2;i++)box(chassis,chrome,i*.19,.49,-2.211,.044,.095,.018);
    
    const plateCanvas=document.createElement("canvas");plateCanvas.width=256;plateCanvas.height=64;
    const pc=plateCanvas.getContext("2d");pc.fillStyle="#e6e5d8";pc.fillRect(0,0,256,64);
    pc.fillStyle="#223348";pc.textAlign="center";pc.font="bold 46px monospace";pc.fillText("BL "+String(4170+index*53),128,48);
    const plateTexture=new T.CanvasTexture(plateCanvas);
    mesh(new T.PlaneGeometry(.46,.115),new T.MeshStandardMaterial({map:plateTexture,roughness:.72}),chassis,0,.584,2.143);
    const wheels=[];
    for(const side of [-1,1])for(const z of [-1.37,1.34]){
      const hub=group(chassis,side*.94,.354,z),axle=group(hub);
      const tyre=mesh(new T.CylinderGeometry(.343,.343,.182,24),rubber,axle);tyre.rotation.z=Math.PI/2;
      const face=mesh(new T.CylinderGeometry(.227,.227,.196,18),dark,axle);face.rotation.z=Math.PI/2;
      const disc=mesh(new T.CylinderGeometry(.09,.09,.216,16),rim,axle);disc.rotation.z=Math.PI/2;
      for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(axle,rim,[side*.104,.065*Math.cos(a),.065*Math.sin(a)],[side*.102,.206*Math.cos(a+.18),.206*Math.sin(a+.18)],.023,.026,6);}
      batchParts(axle);wheels.push({hub,axle,front:z<0});
    }
    const roofSign=placard(kind===0?'TAXI':'FAHRDIENST',kind===0?'#f0cf67':'#e5f0e7',.94,.25);
    roofSign.position.set(0,1.63,.20);chassis.add(roofSign);
    batchParts(cabin);batchParts(chassis);
    root.position.set(x,-.085,z);root.rotation.y=-heading;root.scale.set(spec.sx,spec.sy,spec.sz);
    return {root,chassis,wheels,brakeLight,heading,spec,index,id:FLEET[index].id,type:spec.type};
  }
  function placard(text,colour='#e9f0e7',w=1.6,h=.28){
    const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=colour;ctx.fillRect(0,0,768,128);ctx.fillStyle='#213745';ctx.font='bold 55px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,66,730);
    return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:new T.CanvasTexture(c),roughness:.65,side:T.DoubleSide}));
  }
  function makeVan(config,index){
    const [x,z,heading,colour]=config,spec=models[index],root=group(scene),chassis=group(root);
    const paint=new T.MeshPhysicalMaterial({color:colour,roughness:.3,metalness:.24,clearcoat:.75}),dark=material(0x253543),rubber=material(0x20262b),chrome=material(0xa6b4b9,.3,.7),glass=new T.MeshPhysicalMaterial({color:0x547b8b,roughness:.12,metalness:.12,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide});
    const stripe=material(index===4?0xe58b43:index===3?0x418e91:0x2f687e),lamp=material(0xe7fff2,.2,0,0xd7ffef,1.3),brakeLight=material(0xed6870,.2,0,0xee4855,1.1);
    contact(root,3.2,6.3,.8);
    bodyHull(chassis,[[-2.35,.82,.83,.34,.78],[-2.05,.95,.93,.32,1.03],[-1.35,.99,.96,.32,1.15],[1.95,.99,.96,.32,1.15],[2.35,.94,.93,.36,1.10]],paint);
    box(chassis,paint,0,2.16,.23,1.98,.16,4.16);box(chassis,paint,0,1.92,-1.65,1.75,.55,.12);
    const front=box(chassis,glass,0,1.58,-1.84,1.73,.70,.035);front.rotation.x=-.18;
    for(const side of [-1,1]){
      box(chassis,paint,side*.96,1.68,.3,.08,.96,3.72);
      // Glass is mounted in the side wall; it does not share a coplanar surface.
      box(chassis,glass,side*1.012,1.63,-.73,.025,.67,1.25);box(chassis,glass,side*1.012,1.67,.85,.025,.62,1.39);
      box(chassis,stripe,side*1.009,1.16,.23,.024,.20,3.98);box(chassis,chrome,side*1.027,1.30,-.29,.035,.04,.21);
      const badge=placard(index===2?'ROLLSTUHLBUS':index===3?'LIEGENDTRANSPORT':'RETTUNGSDIENST','#e5eae4',2.28,.25);badge.position.set(side*1.04,.85,.45);badge.rotation.y=side*Math.PI/2;chassis.add(badge);
      rod(chassis,dark,[side*.86,1.61,-1.56],[side*1.12,1.47,-1.46],.035);box(chassis,paint,side*1.14,1.48,-1.43,.15,.22,.28);
      box(chassis,lamp,side*.67,.77,-2.37,.39,.13,.04);box(chassis,brakeLight,side*.82,.93,2.39,.14,.35,.04);
      box(chassis,dark,side*.99,.52,.27,.03,.10,3.67);
    }
    // Translucent windows must not be hidden behind opaque wall faces.
    // Cut wall into pillars/sills instead of keeping a full wall behind glazing.
    for(const child of chassis.children.slice())if(child.isMesh&&child.geometry.parameters?.width===.08&&child.geometry.parameters?.height===.96){chassis.remove(child);child.geometry.dispose();}
    for(const side of [-1,1]){box(chassis,paint,side*.96,1.31,.3,.08,.20,3.72);box(chassis,paint,side*.96,2.02,.3,.08,.15,3.72);for(const zz of [-1.57,-.01,1.66,2.13])box(chassis,paint,side*.96,1.67,zz,.08,.59,.15);}
    box(chassis,paint,0,1.63,2.30,1.94,1.08,.09);box(chassis,glass,-.48,1.71,2.36,.74,.58,.025);box(chassis,glass,.48,1.71,2.36,.74,.58,.025);
    box(chassis,dark,0,.48,-2.39,1.65,.17,.09);box(chassis,dark,0,.42,2.37,1.75,.16,.12);box(chassis,chrome,0,.67,-2.4,.52,.13,.025);
    for(const side of [-1,1])box(chassis,dark,side*.48,.56,-2.41,.42,.05,.03);
    box(chassis,dark,0,2.30,-.57,1.38,.12,.38);
    if(index===4)for(const side of [-1,1])box(chassis,material(0x4da4de,.2,0,0x347fc4,.4),side*.44,2.39,-.57,.43,.11,.33);
    if(index===2){const ramp=box(chassis,chrome,0,.43,2.61,1.58,.05,.55);ramp.rotation.x=.18;}
    const wheels=[];
    for(const side of [-1,1])for(const zz of [-1.40,1.45]){const hub=group(chassis,side*.98,.37,zz),axle=group(hub);const tyre=mesh(new T.CylinderGeometry(.36,.36,.20,24),rubber,axle);tyre.rotation.z=Math.PI/2;const rim=mesh(new T.CylinderGeometry(.23,.23,.211,16),chrome,axle);rim.rotation.z=Math.PI/2;wheels.push({hub,axle,front:zz<0});}
    root.position.set(x,-.10,z);root.rotation.y=-heading;root.scale.set(spec.sx,spec.sy,spec.sz);
    return {root,chassis,wheels,brakeLight,heading,spec,index,id:FLEET[index].id,type:spec.type};
  }
  function makePatient(data){
    const root=group(scene),support=group(root),personGroup=group(root),mobility=data.mobility||'walk';
    const dark=material(0x293e49),metal=material(0xa9b7ba,.35,.6),fabric=material(0x5e8f91),rubber=material(0x242d31);
    let seat=null;
    if(mobility==='wheelchair'){
      box(support,dark,0,.52,0,.58,.12,.60);box(support,fabric,0,.87,-.27,.57,.63,.08);
      for(const side of [-1,1]){const ring=mesh(new T.TorusGeometry(.31,.034,10,32),rubber,support,side*.36,.34,-.11);ring.rotation.y=Math.PI/2;const rim=mesh(new T.TorusGeometry(.265,.014,8,28),metal,support,side*.405,.34,-.11);rim.rotation.y=Math.PI/2;for(let k=0;k<8;k++){const a=k*Math.PI/4;rod(support,metal,[side*.36,.34,-.11],[side*.36,.34+Math.cos(a)*.28,-.11+Math.sin(a)*.28],.006);}rod(support,metal,[side*.32,.16,.40],[side*.32,.67,.22],.025);rod(support,metal,[side*.31,.68,-.26],[side*.31,.68,.25],.025);rod(support,metal,[side*.3,.56,-.26],[side*.3,1.04,-.44],.024);}
      for(const side of [-1,1]){const caster=mesh(new T.CylinderGeometry(.075,.075,.04,12),rubber,support,side*.31,.09,.40);caster.rotation.z=Math.PI/2;}box(support,dark,0,.12,.53,.58,.035,.25);
    }else if(mobility==='lying'){
      box(support,metal,0,.83,0,.63,.10,1.91);box(support,fabric,0,.93,0,.61,.12,1.87);box(support,material(0xe9e5d6),0,1.04,-.68,.54,.13,.37);
      for(const side of [-1,1]){rod(support,metal,[side*.3,.89,-.83],[side*.3,.89,.83],.028);for(const end of [-.65,.65]){rod(support,metal,[side*.24,.20,end],[side*.24,.8,-end*.65],.025);const w=mesh(new T.CylinderGeometry(.075,.075,.05,12),rubber,support,side*.24,.075,end);w.rotation.z=Math.PI/2;}}
    }else if(mobility==='assisted'){
      seat=group(support);box(seat,fabric,0,.49,0,.61,.10,.59);box(seat,fabric,0,.84,-.26,.61,.63,.09);for(const side of [-1,1])for(const zz of [-.22,.22])rod(seat,metal,[side*.24,.05,zz],[side*.24,.46,zz],.025);
    }
    const actor=window.People3D.attach(personGroup,{sex:data.sex||'female',height:1.68,shirt:0x9c899d,pants:0x475565,hair:0x898784,skin:0xf3d5bf});
    const pose=mobility==='lying'?'lying':mobility==='wheelchair'||mobility==='assisted'?'seated':'standing';actor.setPose?.(pose);
    const sign=placard(data.name||'Patientin / Patient','#e5eee4',1.65,.25);sign.position.set(0,2.22,0);root.add(sign);
    let team=null,teamActor=null;
    if(mission?.vehicleType==='ambulance'){
      team=group(scene,mission.pickup.x+1.45,-.17,mission.pickup.z+.50);teamActor=window.People3D.attach(team,{sex:'male',height:1.78,shirt:0xc86b42,pants:0x304553,hair:0x59412f,skin:0xf5d4b5});const tag=placard('RETTUNGSTEAM','#ecf0e7',1.8,.24);tag.position.set(0,2.12,0);tag.name='teamSign';team.add(tag);
    }
    return {root,support,personGroup,actor,sign,seat,team,teamActor,mobility};
  }
  function makeMarker(){
    const root=group(scene),ringMat=new T.MeshBasicMaterial({color:0x78ffca,transparent:true,opacity:.89,depthWrite:false,side:T.DoubleSide});
    const ring=mesh(new T.RingGeometry(1.36,1.49,48),ringMat,root,0,.12,0);ring.rotation.x=-Math.PI/2;
    const outer=mesh(new T.RingGeometry(1.63,1.657,48),ringMat,root,0,.13,0);outer.rotation.x=-Math.PI/2;
    const diamond=group(root,0,3.26,0);
    const core=mesh(new T.OctahedronGeometry(.43,0),new T.MeshBasicMaterial({color:0x9effd8,wireframe:true}),diamond);
    core.scale.y=1.45;
    const solid=mesh(new T.OctahedronGeometry(.17,0),new T.MeshBasicMaterial({color:0xeeffe1}),diamond);solid.scale.y=1.65;
    return {root,diamond,ring};
  }
  function setupShadow(){
    scene.traverse(o=>{if(o.isDirectionalLight&&o.castShadow&&!shadowLight)shadowLight=o});if(!shadowLight)return;
    if(!shadowLight.target.parent)scene.add(shadowLight.target);
    const offset=shadowLight.position.clone().sub(shadowLight.target.position),forward=offset.clone().normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),forward).normalize(),up=new T.Vector3().crossVectors(forward,right).normalize();shadowBasis={offset,right,up,center:new T.Vector3(),delta:new T.Vector3()};
  }
  function applyProfile(value){
    if(!renderer)return;renderer.setPixelRatio(value.pixelRatio);
    if(shadowLight){const shadow=shadowLight.shadow,r=value.shadowRadius;Object.assign(shadow.camera,{left:-r,right:r,top:r,bottom:-r});shadow.camera.updateProjectionMatrix();if(shadow.mapSize.x!==value.shadowMapSize){shadow.map?.dispose();shadow.map=null;shadow.mapSize.set(value.shadowMapSize,value.shadowMapSize);}shadow.normalBias=.04;shadow.bias=-.00008;renderer.shadowMap.needsUpdate=true;}
  }
  function updateShadow(){
    if(!shadowLight||!pieces)return;const focus=mode==='car'?pieces.vehicle.position:pieces.char.position,b=shadowBasis,r=shadowLight.shadow.camera.right,texel=r*2/shadowLight.shadow.mapSize.x;
    b.center.set(focus.x,0,focus.z);const rx=b.center.dot(b.right),uy=b.center.dot(b.up);b.delta.copy(b.right).multiplyScalar(Math.round(rx/texel)*texel-rx).addScaledVector(b.up,Math.round(uy/texel)*texel-uy);b.center.add(b.delta);shadowLight.target.position.copy(b.center);shadowLight.position.copy(b.center).add(b.offset);shadowLight.target.updateMatrixWorld(true);renderer.shadowMap.needsUpdate=true;
  }
  function getPerformance(){return {...(perf?.snapshot()||{frameMs:0,fps:0,p95ms:0,calls:renderer?.info?.render?.calls||0,triangles:renderer?.info?.render?.triangles||0,geometries:renderer?.info?.memory?.geometries||0,textures:renderer?.info?.memory?.textures||0,quality:qualityChoice,renderScale:1}),active,...(diagnosticFrames?{diagnostics:{...drawStats}}:{})};}
  function setQuality(value){if(!['auto','high','smooth'].includes(value))return false;qualityChoice=value;return perf?perf.setQuality(value):true;}
  function installDrawDiagnostics(){
    if(!diagnosticFrames)return;
    const count=(object,geometry,material,group,shadow)=>{if(object.isInstancedMesh&&object.count===0)return;const passes=!shadow&&material.transparent&&material.side===T.DoubleSide&&!material.forceSinglePass?2:1,kind=shadow?'shadow':'main',n=Math.min(group?.count??geometry.index?.count??geometry.attributes?.position?.count??0,geometry.drawRange?.count??Infinity)*(object.isInstancedMesh?object.count:1)/3*passes;drawStats[kind+'Calls']+=passes;drawStats[kind+'Triangles']+=n;if(object.isSkinnedMesh){drawStats[shadow?'skinShadowCalls':'skinMainCalls']+=passes;drawStats[shadow?'skinShadowTriangles':'skinMainTriangles']+=n}};
    scene.traverse(object=>{if(!object.isMesh||object.userData.h3DrawDiagnostics)return;object.userData.h3DrawDiagnostics=true;const before=object.onBeforeRender,shadow=object.onBeforeShadow;object.onBeforeRender=function(renderer,scene,camera,geometry,material,group){count(this,geometry,material,group,false);before?.call(this,renderer,scene,camera,geometry,material,group)};object.onBeforeShadow=function(renderer,object,camera,shadowCamera,geometry,material,group){count(this,geometry,material,group,true);shadow?.call(this,renderer,object,camera,shadowCamera,geometry,material,group)}});
  }
  function resize(){
    if(!renderer || !canvas || lost)return;
    const {width,height}=canvas.getBoundingClientRect();
    const w=Math.max(2,Math.round(width || canvas.clientWidth || 800)),h=Math.max(2,Math.round(height || canvas.clientHeight || 480));
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  function pointerDown(event){
    if(!active||drag || event.button>0)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY};
    canvas.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event){
    if(!active||!drag||drag.id!==event.pointerId)return;
    orbit=wrap(orbit+(event.clientX-drag.x)*.006);pitch=clamp(pitch+(event.clientY-drag.y)*.004,.04,.83);
    drag.x=event.clientX;drag.y=event.clientY;idleOrbit=1.1;cameraStep(0);
  }
  function pointerEnd(event){if(drag?.id===event.pointerId){drag=null;idleOrbit=1.1;}}
  function handleLoss(event){
    event.preventDefault();lost=true;const fn=report;stop();
    fn?.({error:"Die 3D-Grafik wurde vom Browser unterbrochen. Öffnen Sie das Spiel erneut."});
  }
  function createWorld(el){
    T=window.THREE;cameraEye=new T.Vector3();cameraForward=new T.Vector3();
    if(!T||typeof window.makeCity!=="function")throw new Error("Die 3D-Stadt konnte nicht geladen werden.");
    canvas=el;
    try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});}
    catch(error){renderer=null;canvas=null;throw new Error("3D benötigt WebGL. Bitte das Spiel in einem Browser mit aktivierter Grafikbeschleunigung öffnen.");}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    if(T.SRGBColorSpace && "outputColorSpace" in renderer)renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate=false;
    renderer.shadowMap.needsUpdate=true;
    scene=new T.Scene();
    // Neutral daylight fallback while the actual waterfront reflections are being prepared.
    const envCanvas=document.createElement("canvas");envCanvas.width=512;envCanvas.height=256;
    const env=envCanvas.getContext("2d"), sky=env.createLinearGradient(0,0,0,256);
    [[0,"#6491b7"],[.32,"#a9c3d4"],[.49,"#d9e0df"],[.53,"#a2aaac"],[.75,"#687679"],[1,"#394449"]].forEach(([at,col])=>sky.addColorStop(at,col));
    env.fillStyle=sky;env.fillRect(0,0,512,256);
    for(let i=0;i<60;i++){const x=i*8.6,h=4+13*(.5+.5*Math.sin(i*8.17));env.fillStyle=i%3===0?"#64727a":"#7b8182";env.fillRect(x,133-h,7,h);env.fillStyle=i%4===0?"#d7d8c9":"#acc0c8";env.fillRect(x+1,130-h,5,1.5)}
    env.fillStyle="#fff6dd";env.beginPath();env.arc(114,80,7,0,Math.PI*2);env.fill();
    const reflection=new T.CanvasTexture(envCanvas);reflection.colorSpace=T.SRGBColorSpace;reflection.mapping=T.EquirectangularReflectionMapping;
    scene.environment=reflection;scene.environmentIntensity=.84;
    camera=new T.PerspectiveCamera(54,1,.11,440);
    city=window.makeCity(T,scene);navigation=window.H3Navigation?.create(T,scene,{groundArrows:false});
    setupShadow();perf=window.H3Performance?.create({devicePixelRatio:window.devicePixelRatio||1,onProfile:applyProfile});if(perf)perf.setQuality(qualityChoice);
    if(renderer.isWebGLRenderer){
      // Capture the actual waterfront for clear-coated paint and shop glazing.
      probeTarget=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
      environmentReady=false; // Capture only after decoded textures and avatars are ready.
    }
    person=makePerson();fleet=FLEET.map((f,i)=>makeCar(f.position,i));
    const makeCivil=(config,index,identity)=>window.H3Vehicles.make(T,scene,config,index,{...models[index],name:identity.name||(index===5?'Sportwagen':'Stadtwagen'),top:index===5?models[5].top:12.5},identity);
    const sports=window.H3Vehicles?.getStatus?.().sportsReady===true;
    if(window.H3Mobility&&window.H3Vehicles)fleet.push(...window.H3Mobility.create(T,scene,makeCivil,{sports}));
    traffic=window.H3Traffic?.create(T,scene,{makeVehicle:makeCivil,population:16,sports})||null;
    car=fleet[0];marker=makeMarker();pieces={char:person.root,vehicle:car.root};
    canvas.style.touchAction="none";
    canvas.addEventListener("pointerdown",pointerDown);canvas.addEventListener("pointermove",pointerMove);
    canvas.addEventListener("pointerup",pointerEnd);canvas.addEventListener("pointercancel",pointerEnd);
    canvas.addEventListener("lostpointercapture",pointerEnd);canvas.addEventListener("webglcontextlost",handleLoss);
    if(typeof ResizeObserver==="function"){sizeObserver=new ResizeObserver(resize);sizeObserver.observe(canvas);}
    resize();
  }
  function clearTaps(){for(const action of tapActions)taps[action]=0;}
  function clearControlState(){for(const action of Object.keys(keys))keys[action]=false;clearTaps();}
  function resetCameraRig(heading){
    cameraYaw=wrap(heading+orbit);cameraArm=0;viewHeading=cameraYaw;
    if(camera){camera.fov=54;camera.updateProjectionMatrix();}
  }
  function place(){
    cancelRequests();walkRunTime=0;
    for(let i=fleet.length-1;i>=0;i--)if(fleet[i].fromTraffic){disposeTransferred(fleet[i]);fleet.splice(i,1);}
    pieces.char.position.set(city.spawn.x,groundHeight(city.spawn.x,city.spawn.z),city.spawn.z);characterHeading=0;
    for(const item of fleet){const [x,z,h]=item.home||FLEET[item.index].position;item.root.position.set(x,item.baseY??(item.index<2?-.085:-.10),z);item.root.rotation.y=-h;item.heading=h;item.chassis.rotation.z=0;}
    traffic?.reset();car=fleet[0];pieces.vehicle=car.root;vehicleHeading=car.heading;mode='walk';pieces.char.visible=true;pieces.char.rotation.set(0,0,0);person.footShadow.visible=true;person.actor.setPose('standing');velocity=wheelSteer=footSpeed=walkVelocityX=walkVelocityZ=walkingTurnVelocity=walkingTravelSpeed=gait=orbit=0;pitch=.16;drag=null;idleOrbit=0;clearControlState();resetCameraRig(characterHeading);
  }

  function nearRoad(p){
    const ax=[-80,-24,32,88].reduce((a,b)=>Math.abs(a-p.x)<Math.abs(b-p.x)?a:b);
    const az=[-84,-28,28,84].reduce((a,b)=>Math.abs(a-p.z)<Math.abs(b-p.z)?a:b);
    return Math.abs(ax-p.x)<Math.abs(az-p.z)?{x:ax+1.6,z:p.z}:{x:p.x,z:az+1.6};
  }
  function inPub(x,z){return !!city?.pub?.contains(x,z);}
  function nearPubCounter(){const p=pieces?.char?.position,q=city?.pub?.counter;return mode==='walk'&&p&&q&&inPub(p.x,p.z)&&Math.hypot(p.x-q.x,p.z-q.z)<1.7;}
  function groundHeight(x,z){if(inPub(x,z))return city.pub.floorY??-.17;return [-80,-24,32,88].some(a=>Math.abs(a-x)<6)||[-84,-28,28,84].some(a=>Math.abs(a-z)<6)?-.09:-.17;}
  function clearAt(x,z,r,cameraProbe=false){
    const b=city.bounds;
    if(x<b.minX+r||x>b.maxX-r||z<b.minZ+r||z>b.maxZ-r)return false;
    for(const wall of city.blocks){
      if(cameraProbe&&wall.cameraBlocking===false)continue;
      const dx=x-clamp(x,wall.minX,wall.maxX), dz=z-clamp(z,wall.minZ,wall.maxZ);
      if(dx*dx+dz*dz<r*r)return false;
    }
    return true;
  }
  function clearOfCars(x,z,r,ignore){
    for(const item of fleet){
      if(item===ignore)continue;
      const pos=item.root.position,h=item.root.userData,c=Math.cos(item.heading),s=Math.sin(item.heading),dx=x-pos.x+s*(h.collisionCenterZ||0),dz=z-pos.z-c*(h.collisionCenterZ||0);
      const side=Math.max(0,Math.abs(dx*c+dz*s)-(h.collisionHalfWidth??item.spec.sx*.98));
      const end=Math.max(0,Math.abs(-dx*s+dz*c)-(h.collisionHalfLength??item.spec.sz*2.14));
      if(side*side+end*end<r*r)return false;
    }
    for(const item of traffic?.getObstacles()||[]){
      const c=Math.cos(item.heading),s=Math.sin(item.heading),dx=x-item.x,dz=z-item.z;
      const side=Math.max(0,Math.abs(dx*c+dz*s)-item.halfWidth),end=Math.max(0,Math.abs(-dx*s+dz*c)-item.halfLength);
      if(side*side+end*end<r*r)return false;
    }
    return true;
  }
  function closestCar(){
    const p=pieces.char.position;let nearby=null,best=3.95;
    for(const item of fleet){if(passengerPresent&&item!==car)continue;const at=item.root.position,d=Math.hypot(at.x-p.x,at.z-p.z);if(d<best){best=d;nearby=item;}}
    if(!passengerPresent)for(const item of traffic?.getVehicles?.()||[]){const d=Math.hypot(item.x-p.x,item.z-p.z);if(d<best){best=d;nearby=item;}}
    return nearby;
  }
  function closestCitizen(){if(mode!=='walk')return null;const p=pieces.char.position;let chosen=null,distance=3.8;for(const n of city.pedestrians){const d=Math.hypot(p.x-n.x,p.z-n.z);if(d<distance){chosen=n;distance=d}}return chosen?{id:chosen.id,sex:chosen.id%2?'female':'male',x:chosen.x,z:chosen.z}:null;}
  function closestPerson(){
    if(!patient||mode!=='walk')return null;const p=pieces.char.position,a=patient.root.getWorldPosition(new T.Vector3());return Math.hypot(p.x-a.x,p.z-a.z)<3.8?{id:'patient'}:null;
  }

  function vehicleWallsClear(x,z,angle){
    // Model metadata is already scaled to world metres. Preserve its off-centre rear overhang.
    const hull=car.root.userData,hw=(hull.collisionHalfWidth??car.spec.sx*1.16)+.08,hl=(hull.collisionHalfLength??car.spec.sz*2.45)+.04,offset=hull.collisionCenterZ||0,c=Math.cos(angle),s=Math.sin(angle),ac=Math.abs(c),as=Math.abs(s),cx=x-s*offset,cz=z+c*offset,ex=ac*hw+as*hl,ez=as*hw+ac*hl,b=city.bounds;
    if(cx-ex<b.minX||cx+ex>b.maxX||cz-ez<b.minZ||cz+ez>b.maxZ)return false;
    for(const wall of city.blocks){
      const wx=(wall.minX+wall.maxX)/2,wz=(wall.minZ+wall.maxZ)/2,aw=(wall.maxX-wall.minX)/2,al=(wall.maxZ-wall.minZ)/2,dx=wx-cx,dz=wz-cz;
      // Four separating axes: world X/Z, then the oriented car's side/forward axes.
      if(Math.abs(dx)>=aw+ex||Math.abs(dz)>=al+ez)continue;
      if(Math.abs(dx*c+dz*s)>=hw+aw*ac+al*as||Math.abs(-dx*s+dz*c)>=hl+aw*as+al*ac)continue;
      return false;
    }
    return true;
  }
  function vehicleClear(x,z,angle){
    if(!vehicleWallsClear(x,z,angle))return false;
    const h=car.root.userData,c=Math.cos(angle),s=Math.sin(angle),hw=(h.collisionHalfWidth??car.spec.sx*1.16)+.04,hl=(h.collisionHalfLength??car.spec.sz*2.45)+.04,off=h.collisionCenterZ||0,cx=x-s*off,cz=z+c*off;
    function overlaps(bx,bz,bh,bw,bl){
      const bc=Math.cos(bh),bs=Math.sin(bh),dx=bx-cx,dz=bz-cz,rr=c*bc+s*bs,rf=c*bs-s*bc;
      return Math.abs(dx*c+dz*s)<hw+Math.abs(rr)*bw+Math.abs(rf)*bl&&Math.abs(-dx*s+dz*c)<hl+Math.abs(rf)*bw+Math.abs(rr)*bl&&Math.abs(dx*bc+dz*bs)<bw+Math.abs(rr)*hw+Math.abs(rf)*hl&&Math.abs(-dx*bs+dz*bc)<bl+Math.abs(rf)*hw+Math.abs(rr)*hl;
    }
    for(const f of fleet){if(f===car)continue;const p=f.root.position,m=f.root.userData,o=m.collisionCenterZ||0;if(overlaps(p.x-Math.sin(f.heading)*o,p.z+Math.cos(f.heading)*o,f.heading,m.collisionHalfWidth??f.spec.sx*.98,m.collisionHalfLength??f.spec.sz*2.14))return false;}
    for(const f of traffic?.getObstacles()||[])if(overlaps(f.x,f.z,f.heading,f.halfWidth,f.halfLength))return false;
    function personClear(px,pz,r){const dx=px-cx,dz=pz-cz,a=Math.max(0,Math.abs(dx*c+dz*s)-hw),b=Math.max(0,Math.abs(-dx*s+dz*c)-hl);return a*a+b*b>r*r;}
    return city.pedestrians.every(p=>personClear(p.x,p.z,.34))&&(!patient||passengerPresent||personClear(patient.root.position.x,patient.root.position.z,.45));
  }

  function cancelRequests(){pendingExit=pendingEnter=null;traffic?.releaseHold?.();}
  function disposeTransferred(model){const geos=new Set(),mats=new Set(),textures=new Set();model.root.removeFromParent();model.root.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const mat of(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){mats.add(mat);for(const value of Object.values(mat))if(value?.isCanvasTexture)textures.add(value);}});for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const tx of textures)tx.dispose();}
  function switchMode(){if(mode==='car')return requestExit();const chosen=closestCar();if(chosen)onAction?.({kind:'vehicle',vehicleId:chosen.id,type:chosen.type});return false;}
  function enterVehicle(id){
    if(mode!=='walk')return false;const p=pieces.char.position;let chosen=fleet.find(v=>v.id===id);
    if(passengerPresent&&(!chosen||chosen!==car))return false;
    if(!chosen){chosen=traffic?.transfer?.(id,p);if(chosen)fleet.push(chosen);}
    if(!chosen||Math.hypot(chosen.root.position.x-p.x,chosen.root.position.z-p.z)>4.5)return false;
    cancelRequests();walkRunTime=0;car=chosen;pieces.vehicle=car.root;vehicleHeading=car.heading;mode='car';viewHeading=vehicleHeading;firstPerson=false;pieces.char.visible=car.kind==='scooter';person.footShadow.visible=false;person.actor.setPose(car.kind==='scooter'?'scooter':'standing');velocity=wheelSteer=footSpeed=walkVelocityX=walkVelocityZ=walkingTurnVelocity=walkingTravelSpeed=orbit=0;pitch=.16;drag=null;idleOrbit=0;clearControlState();resetCameraRig(vehicleHeading);syncPose();updateRider(0);cameraStep(0);broadcast();return true;
  }
  function exitVehicle(){
    if(mode!=='car'||Math.abs(velocity)>=.02)return false;
    const p=car.root.position,c=Math.cos(vehicleHeading),s=Math.sin(vehicleHeading),h=car.root.userData;let exit;
    const side=(h.collisionHalfWidth??car.spec.sx*1.16)+.48,end=(h.collisionHalfLength??car.spec.sz*2.45)+.52;
    const points=car.kind==='scooter'?[[-.76,0],[.76,0],[0,1.03],[0,-1.03],[-.72,.72],[.72,.72],[-.72,-.72],[.72,-.72]]:[[-side,-.1],[side,-.1],[0,end+(h.collisionCenterZ||0)],[0,-end+(h.collisionCenterZ||0)]];
    const peopleClear=(x,z)=>city.pedestrians.every(q=>Math.hypot(q.x-x,q.z-z)>.71)&&(!patient||passengerPresent||Math.hypot(patient.root.position.x-x,patient.root.position.z-z)>.82);
    for(const [x,z]of points){const px=p.x+x*c-z*s,pz=p.z+x*s+z*c;if(!clearAt(px,pz,.34)||!clearOfCars(px,pz,.34)||!peopleClear(px,pz))continue;let path=true;const n=Math.ceil(Math.hypot(x,z)/.18);for(let k=1;k<n;k++){const qx=p.x+(px-p.x)*k/n,qz=p.z+(pz-p.z)*k/n;if(!clearAt(qx,qz,.34)||!clearOfCars(qx,qz,.34,car)||!peopleClear(qx,qz)){path=false;break;}}if(path){exit=[px,pz];break;}}
    if(!exit)return false;cancelRequests();walkRunTime=0;mode='walk';velocity=footSpeed=walkVelocityX=walkVelocityZ=walkingTurnVelocity=walkingTravelSpeed=0;pieces.char.position.set(exit[0],groundHeight(exit[0],exit[1]),exit[1]);pieces.char.visible=true;person.footShadow.visible=true;person.actor.setPose('standing');characterHeading=vehicleHeading;viewHeading=characterHeading;pieces.char.rotation.set(0,-characterHeading,0);car.chassis.rotation.z=0;orbit=0;pitch=.16;drag=null;idleOrbit=0;clearControlState();resetCameraRig(characterHeading);syncPose();cameraStep(0);broadcast();return true;
  }
  function requestExit(){
    if(mode!=='car')return 'unavailable';if(pendingExit)return 'braking';cancelRequests();clearControlState();walkRunTime=0;
    if(Math.abs(velocity)<.02){velocity=0;if(exitVehicle())return 'exited';return 'blocked';}
    if(!active)return 'unavailable';pendingExit={id:car.id};broadcast();return 'braking';
  }
  function requestEnter(id){
    if(mode!=='walk')return 'unavailable';if(enterVehicle(id))return 'entered';const v=traffic?.getVehicles?.().find(v=>v.id===id),p=pieces.char.position;if(!v||passengerPresent||Math.hypot(v.x-p.x,v.z-p.z)>4.5||!active)return 'unavailable';
    cancelRequests();traffic.hold(id);pendingEnter={id};footSpeed=walkVelocityX=walkVelocityZ=walkingTravelSpeed=0;walkRunTime=0;clearControlState();broadcast();return 'waiting';
  }
  function processRequests(){
    if(pendingExit&&mode==='car'&&velocity===0){pendingExit=null;const ok=exitVehicle();onAction?.({kind:'exit',status:ok?'exited':'blocked'});if(!ok)broadcast();}
    if(pendingEnter&&mode==='walk'){const id=pendingEnter.id,v=traffic?.getVehicles?.().find(v=>v.id===id),p=pieces.char.position;if(!v||Math.hypot(v.x-p.x,v.z-p.z)>6){cancelRequests();onAction?.({kind:'enter',status:'far'});broadcast();}else if(Math.abs(v.speed)<.02){cancelRequests();const ok=enterVehicle(id);onAction?.({kind:'enter',status:ok?'entered':'far'});broadcast();}}
  }

  function targetDistance(){if(!target)return 0;const p=(mode==='walk'?pieces.char:pieces.vehicle).position;return Math.hypot(p.x-target.x,p.z-target.z);}
  function getInfo(){
    if(!pieces)return null;const p=(mode==='walk'?pieces.char:pieces.vehicle).position,n=mode==='walk'?closestCar():null;
    if(target?.id){const v=fleet.find(v=>v.id===target.id)||traffic?.getVehicles?.().find(v=>v.id===target.id);if(v){target.x=v.root?v.root.position.x:v.x;target.z=v.root?v.root.position.z:v.z;}}
    const point=car.root.position,pickupDistance=mission?Math.hypot(point.x-mission.pickup.x,point.z-mission.pickup.z):Infinity,dropoffDistance=mission?Math.hypot(point.x-mission.dropoff.x,point.z-mission.dropoff.z):Infinity;
    const info={exitPending:!!pendingExit,enterPending:!!pendingEnter,autoRunning:mode==='walk'&&!inPub(p.x,p.z)&&walkRunTime>=2,stationary:Math.abs(velocity)<.02,mode,x:p.x,z:p.z,heading:mode==='walk'?characterHeading:vehicleHeading,viewHeading:Number.isFinite(viewHeading)?viewHeading:wrap((mode==='walk'?characterHeading:vehicleHeading)+orbit),speed:Math.round(Math.abs(mode==='car'?velocity:footSpeed)*3.6),vehicleId:car.id,vehicleModelIndex:car.index,vehicleType:car.type,vehicleName:car.spec.name,vehicleKind:car.kind||'car',civilVehicle:!!car.civil,nearVehicle:n?{id:n.id,modelIndex:n.modelIndex??n.index,type:n.type,name:n.spec?.name||n.name,kind:n.kind||'car',civil:!!n.civil,traffic:!!n.traffic,speed:n.speed||0}:null,nearPatient:!!closestPerson(),nearCitizen:closestCitizen(),pickupDistance,dropoffDistance,passengerPresent,delivered,atTarget:!!target&&targetDistance()<(mode==='car'?12:3.8),distance:targetDistance(),targetX:target?.x,targetZ:target?.z,targetId:target?.id,cars:fleet.filter(f=>!f.civil).map(f=>({id:f.id,type:f.type,name:f.spec.name,x:f.root.position.x,z:f.root.position.z})),mobility:fleet.filter(f=>f.civil).map(f=>({id:f.id,modelIndex:f.index,type:f.type,kind:f.kind,civil:true,name:f.spec.name,x:f.root.position.x,z:f.root.position.z})).concat(traffic?.getVehicles?.()||[]),roads:{x:[-80,-24,32,88],z:[-84,-28,28,84]},collisionCount,travelDistance,firstPerson:mode==='car'&&firstPerson,missionId:mission?.id,pubLocation:inPub(p.x,p.z)?'inside':'outside',nearPubCounter:!!nearPubCounter(),pubOrderState:pubOrder?.state||'idle',pubOrderItem:pubOrder?.item||null};info.guidance=navigation?.getGuidance(info,target);info.performance=getPerformance();return info;
  }

  function broadcast(){lastInfo=getInfo();navigation?.update(lastInfo,target);report?.(lastInfo);}

  function interact(){
    if(mode==='walk'&&closestPerson()){onAction?.({kind:'patient'});return;}
    if(nearPubCounter()){onAction?.({kind:'pub-order'});return;}
    const i=getInfo();if(mission&&passengerPresent&&i.dropoffDistance<12&&Math.abs(velocity)<.02){onAction?.({kind:'destination'});return;}
    if(mission&&!passengerPresent&&!delivered&&mode==='car'&&i.pickupDistance<12&&Math.abs(velocity)<.02){onAction?.({kind:'patient'});return;}
    if(mode==='walk'){const v=closestCar();if(v)onAction?.({kind:'vehicle',vehicleId:v.id,type:v.type});}
  }

  function input(action,pressed){
    if(!active)return;if(pendingExit&&['gas','brake','left','right','sprint'].includes(action))return;if(pendingEnter&&pressed&&['gas','brake','left','right'].includes(action))cancelRequests();if(action==='camera'&&pressed){if(mode!=='car')return;firstPerson=false;pieces.char.visible=car.kind==='scooter';orbit=0;pitch=.16;drag=null;idleOrbit=0;clearTaps();resetCameraRig(vehicleHeading);cameraStep(0);broadcast();return;}
    if(action==='use'){if(pressed)switchMode();return;}if(action==='interact'||action==='talk'){if(pressed)interact();return;}
    if(Object.prototype.hasOwnProperty.call(keys,action)){
      const held=!!pressed;if(held&&!keys[action]&&Object.prototype.hasOwnProperty.call(taps,action))taps[action]=.085;keys[action]=held;
    }
  }

  // D4 steering profile copied from the user's preferred game; exact read-only
  // reference profile is recorded in tests/fixtures/d4-control-profile.json.
  // The short tap buffer is consumed only by this fixed60Hz physics path.
  const frameControls={turn:0,gas:false,brake:false};
  function controls(dt){
    frameControls.turn=Number(keys.right||taps.right>0)-Number(keys.left||taps.left>0);
    frameControls.gas=keys.gas||taps.gas>0;frameControls.brake=keys.brake||taps.brake>0;
    for(const action of tapActions)taps[action]=Math.max(0,taps[action]-dt);
    return frameControls;
  }
  function stepPerson(dt){
    const indoor=inPub(pieces.char.position.x,pieces.char.position.z);
    const {turn,gas,brake}=controls(dt),forward=Number(gas)-Number(brake),running=!indoor&&(keys.sprint||walkRunTime>=2),turnRate=turn*(running?2.65:2.32);
    characterHeading=wrap(characterHeading+turnRate*dt);
    // Keep the V7 recenter guard alive while the damped follow-camera settles.
    walkingTurnVelocity=turnRate||walkingTurnVelocity*(1-smooth(dt,11));
    if(!turn&&Math.abs(walkingTurnVelocity)<.005)walkingTurnVelocity=0;
    const targetSpeed=forward*(forward<0?1.45:running?5.55:indoor?1.65:2.23);
    footSpeed+=(targetSpeed-footSpeed)*smooth(dt,forward?7.5:11);
    if(!forward&&Math.abs(footSpeed)<.015)footSpeed=0;
    const p=pieces.char.position,nx=p.x+Math.sin(characterHeading)*footSpeed*dt,nz=p.z-Math.cos(characterHeading)*footSpeed*dt;
    const walkable=(x,z)=>clearAt(x,z,.32)&&clearOfCars(x,z,.29)
      &&city.pedestrians.every(n=>Math.hypot(n.x-x,n.z-z)>.45);
    const fromX=p.x,fromZ=p.z;
    if(walkable(nx,p.z))p.x=nx;
    if(walkable(p.x,nz))p.z=nz;
    walkVelocityX=dt>0?(p.x-fromX)/dt:0;walkVelocityZ=dt>0?(p.z-fromZ)/dt:0;
    walkingTravelSpeed=dt>0?Math.sign(footSpeed)*Math.hypot(p.x-fromX,p.z-fromZ)/dt:0;
    const movedForward=dt>0?((p.x-fromX)*Math.sin(characterHeading)-(p.z-fromZ)*Math.cos(characterHeading))/dt:0;
    walkRunTime=!indoor&&forward>0&&movedForward>.35?walkRunTime+dt:0;
    pieces.char.rotation.y=-characterHeading;p.y+=(groundHeight(p.x,p.z)-p.y)*smooth(dt,22);
    movedThisFrame ||= Math.hypot(p.x-fromX,p.z-fromZ)>.0001;
  }

  let movedThisFrame=false;
  function animatePerson(dt){
    person.actor.update(dt,walkingTravelSpeed);
    const amp=clamp(Math.abs(walkingTravelSpeed)/4,0,1);
    gait+=dt*(Math.abs(footSpeed)*2.05+.7);
    person.hips.position.y=.91+Math.abs(Math.sin(gait))*amp*.065;
    person.upper.rotation.z=Math.sin(gait)*amp*.045;
    person.upper.rotation.x=-amp*.11+Math.sin(clock*2)*.008;
    person.head.rotation.z=Math.sin(clock*1.75)*.018;
    for(const limb of person.limbs){
      const phase=Math.sin(gait)*limb.side*amp*Math.sign(footSpeed);
      limb.hip.rotation.x=phase*.82;limb.knee.rotation.x=-Math.max(0,-phase)*.79;
      limb.shoulder.rotation.x=-phase*.78;limb.elbow.rotation.x=.12+amp*.39;
    }
  }
  function stepCar(dt){
    const control=controls(dt),steer=pendingExit?0:control.turn,gas=!pendingExit&&control.gas,brake=!!pendingExit||control.brake;
    wheelSteer+=(steer-wheelSteer)*smooth(dt,9);
    const scooter=car.kind==='scooter';
    if(pendingExit)velocity=Math.sign(velocity)*Math.max(0,Math.abs(velocity)-(scooter?4.8:5.5)*dt);
    else if(gas)velocity=Math.min(car.spec.top,velocity+(scooter?2.2:velocity<0?13:car.spec.top*.35)*dt);
    else if(brake)velocity=Math.max(scooter?-.85:-5,velocity-(scooter?4.8:velocity>0?15:4.2)*dt);
    else velocity=Math.sign(velocity)*Math.max(0,Math.abs(velocity)-(1.55+Math.abs(velocity)*.09)*dt);
    const rate=wheelSteer*Math.sign(velocity)*Math.min(1.58,Math.abs(velocity)*.25)/(1+Math.abs(velocity)*.018);
    const p=pieces.vehicle.position, angle=wrap(vehicleHeading+rate*dt);
    const dx=Math.sin(angle)*velocity*dt,dz=-Math.cos(angle)*velocity*dt;
    if(vehicleClear(p.x+dx,p.z+dz,angle)){vehicleHeading=angle;p.x+=dx;p.z+=dz;}
    else {if(Math.abs(velocity)>1.2&&clock-lastCollision>1){lastCollision=clock;collisionCount++;onAction?.({kind:'collision',speed:Math.round(Math.abs(velocity)*3.6),collisionCount});}velocity=0;if(vehicleClear(p.x,p.z,angle))vehicleHeading=angle;}
    if(passengerPresent)travelDistance+=Math.hypot(dx,dz)*(velocity!==0?1:0);
    car.heading=vehicleHeading;pieces.vehicle.rotation.y=-vehicleHeading;
    car.chassis.rotation.z=wheelSteer*velocity*(scooter?.012:.0015);
    car.brakeLight.emissiveIntensity=brake?3.0:1.1;
    for(const wheel of car.wheels){if(wheel.front)wheel.hub.rotation.y=-wheelSteer*.37;wheel.axle.rotation.x-=velocity*dt/(car.wheelRadius||(.343*(car.root.scale.y||1)));}
  }
  function cameraStep(dt,renderHeading){
    const driving=mode==="car",base=(driving?pieces.vehicle:pieces.char).position,heading=renderHeading??(driving?vehicleHeading:characterHeading);
    const pubView=!driving&&inPub(base.x,base.z)?1:0;
    pubCameraBlend=dt>0?pubCameraBlend+(pubView-pubCameraBlend)*smooth(dt,8):pubView;
    if(Math.abs(pubCameraBlend-pubView)<.0005)pubCameraBlend=pubView;
    const desiredFov=54+8*pubCameraBlend;if(Math.abs(camera.fov-desiredFov)>.02||pubCameraBlend===pubView&&camera.fov!==desiredFov){camera.fov=desiredFov;camera.updateProjectionMatrix();}
    idleOrbit=Math.max(0,idleOrbit-dt);
    // Explicit keyboard turns own camera yaw, including their smoothed run-out.
    // Recentring a large opposite mouse offset here would reverse the requested turn.
    const turning=keys.left||keys.right||taps.left>0||taps.right>0||walkingTurnVelocity!==0;
    const walking=!turning&&(keys.gas||keys.brake||taps.gas>0||taps.brake>0||Math.abs(footSpeed)>.08);
    const steering=keys.left||keys.right||taps.left>0||taps.right>0||Math.abs(wheelSteer)>.005;
    if(!drag&&!idleOrbit&&(driving?!steering&&Math.abs(velocity)>2:walking)){
      const correction=orbit*smooth(dt,driving?1.45:2.8),limit=dt*(driving?2.4:1.8);
      orbit=wrap(orbit-clamp(correction,-limit,limit));if(Math.abs(orbit)<.0001)orbit=0;
    }
    const targetYaw=wrap(heading+orbit);
    if(!Number.isFinite(cameraYaw)||drag)cameraYaw=targetYaw;
    else if(dt>0)cameraYaw=wrap(cameraYaw+wrap(targetYaw-cameraYaw)*smooth(dt,driving?14:11));
    const scooting=driving&&car.kind==='scooter',yaw=cameraYaw,dist=driving&&!scooting?5.95+Math.abs(velocity)*.065:4.35-pubCameraBlend*2,lookY=base.y+(driving&&!scooting?1.04:1.40);
    let arm=dist,lastFree=0;
    const rayX=-Math.sin(yaw)*Math.cos(pitch),rayZ=Math.cos(yaw)*Math.cos(pitch);
    // Keep the last actually free camera point; a minimum boom length can put
    // the camera through a nearby wall even though the avatar itself is clear.
    for(let s=.14;s<dist+.28;s+=.28){
      const probe=Math.min(s,dist);
      if(!clearAt(base.x+rayX*probe,base.z+rayZ*probe,.15,true)){arm=lastFree;break;}
      lastFree=probe;if(probe===dist)break;
    }
    if(cameraArm>0&&arm>cameraArm)cameraArm=dt>0?cameraArm+(arm-cameraArm)*smooth(dt,8):cameraArm;else cameraArm=arm;
    // A smoothed point can differ from the ray samples after a camera turn.
    while(cameraArm>0&&!clearAt(base.x+rayX*cameraArm,base.z+rayZ*cameraArm,.15,true))cameraArm=Math.max(0,cameraArm-.1);
    arm=cameraArm;
    let eyeY=lookY+Math.sin(pitch)*arm+(driving?.48:.16),aimY=lookY+.08;
    if(!driving&&arm<1.8){
      // People3D fits this avatar to1.72m. A very short boom needs a raised forward
      // view, otherwise the camera sits inside its head or looks into its neck.
      const amount=clamp((1.8-arm)/.25,0,1),blend=amount*amount*(3-2*amount);
      const headClear=base.y+1.98,closeAim=base.y+1.90,horizontal=arm*Math.cos(pitch);
      const closeEye=headClear+(headClear-closeAim)*horizontal/.88;
      eyeY+=(Math.max(eyeY,closeEye)-eyeY)*blend;aimY+=(closeAim-aimY)*blend;
    }
    if(driving&&arm<dist-.01){
      const hull=car.root.userData,dx=rayX*arm,dz=rayZ*arm,c=Math.cos(heading),s=Math.sin(heading);
      const halfWidth=(hull.collisionHalfWidth??car.spec.sx*1.16)+.25,halfLength=(hull.collisionHalfLength??car.spec.sz*2.45)+.25;
      const side=dx*c+dz*s,end=-dx*s+dz*c-(hull.collisionCenterZ||0),outside=Math.max(Math.abs(side)-halfWidth,Math.abs(end)-halfLength);
      const amount=clamp((.85-outside)/.85,0,1),blend=amount*amount*(3-2*amount);
      if(blend>0){
        if(!Number.isFinite(hull.cameraRoofHeight)){car.root.updateWorldMatrix(true,true);hull.cameraRoofHeight=new T.Box3().setFromObject(car.chassis).max.y-base.y;}
        // A wall-shortened boom must stay above our own roof. The almost level
        // view keeps the road visible instead of looking through the rear door.
        const roofClear=base.y+hull.cameraRoofHeight+.32,closeEye=roofClear+.035*arm*Math.cos(pitch),closeAim=roofClear-.035*.88;
        eyeY+=(Math.max(eyeY,closeEye)-eyeY)*blend;aimY+=(closeAim-aimY)*blend;
      }
    }
    if(pubView)eyeY=Math.min(eyeY,(city.pub.floorY??-.17)+2.85);
    camera.position.set(base.x-Math.sin(yaw)*arm*Math.cos(pitch),eyeY,base.z+Math.cos(yaw)*arm*Math.cos(pitch));
    camera.lookAt(base.x+Math.sin(yaw)*.88,aimY,base.z-Math.cos(yaw)*.88);camera.getWorldDirection(cameraForward);viewHeading=Math.atan2(cameraForward.x,-cameraForward.z);
  }

  function updateRider(dt){
    if(mode!=='car'||car.kind!=='scooter')return;
    const p=car.root.position,h=-car.root.rotation.y;person.root.position.set(p.x-Math.sin(h)*.08,p.y+.17,p.z+Math.cos(h)*.08);person.root.rotation.set(0,-h,car.chassis.rotation.z*.55);person.root.visible=true;person.actor.update(dt,0);
  }
  function updateTraffic(dt){
    if(!traffic)return;let n=0;
    function add(x,z,heading,halfWidth,halfLength,kind){const o=trafficBlockers[n]||(trafficBlockers[n]={});Object.assign(o,{x,z,heading,halfWidth,halfLength,kind});n++;}
    for(const f of fleet){if(mode==='car'&&f===car)continue;const p=f.root.position,h=f.root.userData;const o=h.collisionCenterZ||0;add(p.x-Math.sin(f.heading)*o,p.z+Math.cos(f.heading)*o,f.heading,h.collisionHalfWidth??f.spec.sx*1.16,h.collisionHalfLength??f.spec.sz*2.45,'parked');}
    const p=(mode==='car'?car.root:person.root).position,h=car.root.userData;
    const o=mode==='car'?(h.collisionCenterZ||0):0;add(p.x-Math.sin(vehicleHeading)*o,p.z+Math.cos(vehicleHeading)*o,mode==='car'?vehicleHeading:characterHeading,mode==='car'?(h.collisionHalfWidth??car.spec.sx*1.16):.35,mode==='car'?(h.collisionHalfLength??car.spec.sz*2.45):.35,'player');
    for(const q of city.pedestrians)add(q.x,q.z,0,.35,.35,'pedestrian');
    if(patient&&!passengerPresent){const q=patient.root.position;add(q.x,q.z,0,.5,.5,'patient');}
    trafficBlockers.length=n;traffic.update(dt,trafficBlockers);
  }
  function syncPose(){accumulator=0;const root=mode==='car'?pieces.vehicle:pieces.char;previousPose={x:root.position.x,y:root.position.y,z:root.position.z,heading:mode==='car'?vehicleHeading:characterHeading};}
  function tick(ms){
    if(!active)return;
    const cpuStart=diagnosticFrames?performance.now():0;
    const frameMs=last===null?0:Math.max(0,ms-last),dt=Math.min(frameMs/1000,.25);last=ms;accumulator+=dt;movedThisFrame=false;
    let root=mode==='car'?pieces.vehicle:pieces.char;if(!previousPose)syncPose();
    while(accumulator+1e-10>=FIXED_STEP){previousPose.x=root.position.x;previousPose.y=root.position.y;previousPose.z=root.position.z;previousPose.heading=mode==='car'?vehicleHeading:characterHeading;if(mode==='walk')stepPerson(FIXED_STEP);else stepCar(FIXED_STEP);updateTraffic(FIXED_STEP);clock+=FIXED_STEP;accumulator-=FIXED_STEP;}
    processRequests();root=mode==='car'?pieces.vehicle:pieces.char;
    if(pubOrder?.state==='preparing'&&clock>=pubOrder.readyAt){city.pub?.setOrder(pubOrder.item);pubOrder.state='served';broadcast();}
    if(diagnosticFrames)drawStats.physicsCpuMs=performance.now()-cpuStart;const actorStart=diagnosticFrames?performance.now():0;
    const now=clock+accumulator;city.update?.(dt,now,root.position);if(mode==='walk')animatePerson(dt);patient?.actor.update(dt,0);patient?.teamActor?.update(dt,0);
    if(diagnosticFrames)drawStats.actorsCpuMs=performance.now()-actorStart;
    if(marker.root.visible){marker.diamond.rotation.y=now*1.23;marker.diamond.position.y=3.24+Math.sin(now*2.7)*.18;}
    const alpha=clamp(accumulator/FIXED_STEP,0,1),x=root.position.x,y=root.position.y,z=root.position.z,heading=mode==='car'?vehicleHeading:characterHeading;
    root.position.set(previousPose.x+(x-previousPose.x)*alpha,previousPose.y+(y-previousPose.y)*alpha,previousPose.z+(z-previousPose.z)*alpha);root.rotation.y=-(previousPose.heading+wrap(heading-previousPose.heading)*alpha);
    updateRider(dt);traffic?.render(alpha);cameraStep(dt,previousPose.heading+wrap(heading-previousPose.heading)*alpha);updateShadow();
    const renderStart=diagnosticFrames?performance.now():0;if(diagnosticFrames)for(const key of ['mainCalls','shadowCalls','skinMainCalls','skinShadowCalls','mainTriangles','shadowTriangles','skinMainTriangles','skinShadowTriangles'])drawStats[key]=0;
    renderer.render(scene,camera);if(diagnosticFrames)drawStats.renderCpuMs=performance.now()-renderStart;root.position.set(x,y,z);root.rotation.y=-heading;perf?.record(frameMs,renderer.info);
    if(now>=reportTime){reportTime=now+.10;const start=diagnosticFrames?performance.now():0;broadcast();if(diagnosticFrames)drawStats.telemetryCpuMs=performance.now()-start;}
    if(active)raf=requestAnimationFrame(tick);
  }
  function portrait(id){
    if(id!=='patient'||!patient)return;pause();const q=patient.root.getWorldPosition(new T.Vector3()),p=pieces.char.position,dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz)||1,ux=dx/d,uz=dz/d;
    const y=patient.mobility==='lying'?1.7:patient.mobility==='wheelchair'||patient.mobility==='assisted'?1.38:1.63;
    camera.position.set(q.x+ux*2.8,y,q.z+uz*2.8);camera.lookAt(q.x+uz*(camera.aspect>1.3?-.62:0),patient.mobility==='lying'?.95:y-.20,q.z-ux*(camera.aspect>1.3?-.62:0));
    let prior=null;const draw=ms=>{const dt=prior===null?0:Math.min(.10,(ms-prior)/1000);patient?.actor.update(dt,0);updateShadow();renderer.render(scene,camera);prior=ms;portraitRaf=requestAnimationFrame(draw)};draw(performance.now());
  }

  function pause(){
    cancelRequests();walkRunTime=0;
    if(portraitRaf!==undefined)cancelAnimationFrame(portraitRaf);portraitRaf=undefined;active=false;perf?.setActive(false);if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined;last=null;accumulator=0;previousPose=null;if(drag)idleOrbit=1.1;drag=null;footSpeed=walkVelocityX=walkVelocityZ=walkingTurnVelocity=walkingTravelSpeed=0;clearControlState();
  }
  function stop(){pause();}

  function disposePatient(){
    if(!patient)return;patient.actor?.dispose?.();patient.teamActor?.dispose?.();
    const geometries=new Set(),materials=new Set(),textures=new Set();
    for(const root of [patient.root,patient.team])if(root){root.removeFromParent();root.traverse(o=>{if(o.isSkinnedMesh)return;if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material])){materials.add(m);for(const value of Object.values(m))if(value?.isTexture&&value.isCanvasTexture)textures.add(value)}});}
    for(const r of [...geometries,...materials,...textures])r.dispose?.();patient=null;
  }
  async function ready(){
    if(!renderer)return;const current=renderer;const tasks=[city?.pub?.ready,person?.actor?.promise,patient?.actor?.promise,patient?.teamActor?.promise,...(city?.pedestrians||[]).map(n=>n.actor?.promise),...fleet.map(v=>v.ready||v.root.userData.readyPromise)].filter(Boolean);await Promise.allSettled(tasks);await window.cityTextureReady?.();if(renderer!==current)return;
    updateShadow();
    if(probeTarget&&!environmentReady){
      // A gameplay target is not part of the waterfront and must not tint paint or glass green.
      const dynamic=[marker?.root,person?.root,patient?.root,patient?.team,traffic?.root,...fleet.map(v=>v.root),...(city?.pedestrians||[]).map(n=>n.anchor)].filter(Boolean),visible=dynamic.map(o=>o.visible);dynamic.forEach(o=>o.visible=false);
      const previous=scene.environment,capture=new T.CubeCamera(.4,420,probeTarget);capture.position.set(-77,3.1,8);
      try{capture.update(renderer,scene);}finally{dynamic.forEach((o,i)=>o.visible=visible[i]);}
      scene.environment=probeTarget.texture;scene.environmentIntensity=.94;if(previous&&previous!==probeTarget.texture)previous.dispose();environmentReady=true;
    }
    installDrawDiagnostics();if(renderer.isWebGLRenderer&&renderer.compileAsync)await renderer.compileAsync(scene,camera);renderer.render(scene,camera);perf?.reset();
  }
  function reset(){
    stop();pubOrder=null;pubCameraBlend=0;navigation?.dispose();navigation=null;traffic?.dispose();traffic=null;trafficBlockers.length=0;if(!renderer)return;disposePatient();city?.pub?.dispose?.();person?.actor?.dispose?.();for(const npc of(city?.pedestrians||[]))npc.actor?.dispose?.();
    sizeObserver?.disconnect();sizeObserver=null;
    for(const [event,fn] of [["pointerdown",pointerDown],["pointermove",pointerMove],["pointerup",pointerEnd],["pointercancel",pointerEnd],["lostpointercapture",pointerEnd],["webglcontextlost",handleLoss]])canvas.removeEventListener(event,fn);
    const geometries=new Set(),materials=new Set(),textures=new Set();
    scene?.traverse(m=>{
      if(m.isSkinnedMesh)return;
      if(m.geometry)geometries.add(m.geometry);
      for(const mat of [m.material,m.customDepthMaterial,m.customDistanceMaterial].flat().filter(Boolean)){materials.add(mat);for(const val of Object.values(mat))if(val?.isTexture)textures.add(val);}
    });
    if(scene?.environment&&scene.environment!==probeTarget?.texture)textures.add(scene.environment);
    if(probeTarget){probeTarget.dispose();probeTarget=null;}
    for(const item of [...geometries,...materials,...textures])item.dispose();
    scene.clear();fleet=[];onTalk=null;patient=null;mission=target=null;passengerPresent=delivered=false;onAction=report=null;renderer.dispose();renderer=null;canvas=null;city=null;shadowLight=shadowBasis=perf=null;environmentReady=false;cameraYaw=null;cameraArm=0;cameraForward=null;clock=nextShadow=0;lost=false;
  }
  function init(el,onTelemetry,action){
    if(renderer&&(canvas!==el||lost))reset();if(!renderer)createWorld(el);report=onTelemetry;onAction=action;place();broadcast();resize();cameraStep(0);renderer.render(scene,camera);return getInfo();
  }
  function resume(){if(!renderer)return;pause();active=true;perf?.setActive(true);last=null;reportTime=clock;syncPose();cameraStep(0);broadcast();raf=requestAnimationFrame(tick);}
  function setTarget(value){target=value?{...value}:null;if(marker){marker.root.visible=!!target;if(target)marker.root.position.set(target.x,0,target.z);}broadcast();}
  function clearMission(){
    if(!renderer)return false;
    pause();disposePatient();mission=target=null;passengerPresent=delivered=false;collisionCount=travelDistance=0;lastCollision=-10;pubOrder=null;city.pub?.setOrder(null);perf?.reset();
    place();setTarget(null);cameraStep(0);updateShadow();renderer.render(scene,camera);broadcast();return true;
  }
  function setMission(value){
    pause();disposePatient();pubOrder=null;city.pub?.setOrder(null);perf?.reset();
    mission=value;passengerPresent=delivered=false;collisionCount=travelDistance=0;place();patient=makePatient(value.patient);patient.root.position.set(value.pickup.x,groundHeight(value.pickup.x,value.pickup.z),value.pickup.z);patient.root.rotation.y=Math.PI/2;setTarget(value.pickup);cameraStep(0);renderer.render(scene,camera);broadcast();
  }
  function loadPatient(){
    const i=getInfo();if(!mission||!patient||passengerPresent||delivered||mode!=='car'||Math.abs(velocity)>=.02||i.pickupDistance>12||(car.civil||car.type!==mission.vehicleType))return false;
    patient.root.removeFromParent();car.root.add(patient.root);patient.root.position.fromArray(car.root.userData.passengerSeat||[car.index<2?.38:0,car.index<2?.10:.32,car.index<2?.55:.52]);patient.root.rotation.y=car.root.userData.passengerRotationY??Math.PI;patient.sign.visible=false;if(patient.seat)patient.seat.visible=false;
    if(patient.mobility==='walk'||patient.mobility==='assisted')patient.actor.setPose('seated');
    if(patient.team){patient.team.removeFromParent();car.root.add(patient.team);patient.team.position.fromArray(car.root.userData.teamSeat||[.42,.20,-1.10]);patient.team.rotation.y=car.root.userData.teamRotationY??Math.PI;patient.teamActor.setPose('seated');patient.team.getObjectByName('teamSign').visible=false;}
    passengerPresent=true;travelDistance=0;setTarget(mission.dropoff);broadcast();return true;
  }
  function unloadPatient(){
    const i=getInfo();if(!passengerPresent||Math.abs(velocity)>=.02||i.dropoffDistance>12)return false;
    patient.root.removeFromParent();scene.add(patient.root);patient.root.position.set(mission.dropoff.x,groundHeight(mission.dropoff.x,mission.dropoff.z),mission.dropoff.z);patient.root.rotation.y=Math.PI/2;patient.sign.visible=true;if(patient.seat)patient.seat.visible=true;patient.actor.setPose(patient.mobility==='lying'?'lying':patient.mobility==='walk'?'standing':'seated');
    if(patient.team){patient.team.removeFromParent();scene.add(patient.team);patient.team.position.set(mission.dropoff.x+1.4,-.17,mission.dropoff.z+.5);patient.teamActor.setPose('standing');patient.team.getObjectByName('teamSign').visible=true;}
    patient.actor?.update?.(0,0);patient.teamActor?.update?.(0,0);
    passengerPresent=false;delivered=true;setTarget(null);cameraStep(0);updateShadow();renderer.render(scene,camera);broadcast();return true;
  }

  function previewPubView(view){
    if(window.GCB_PUB_DRAFT!==true||!city?.pub||mission||mode!=='walk'||!['outside','inside'].includes(view))return false;
    const q=view==='inside'?city.pub.interior:{x:city.pub.entrance.x+2.1,z:city.pub.entrance.z};
    if(!clearAt(q.x,q.z,.32)||!clearOfCars(q.x,q.z,.29))return false;
    pause();cancelRequests();walkRunTime=0;velocity=wheelSteer=gait=orbit=0;pitch=.16;characterHeading=-Math.PI/2;pieces.char.position.set(q.x,groundHeight(q.x,q.z),q.z);pieces.char.rotation.set(0,-characterHeading,0);pieces.char.visible=true;person.footShadow.visible=true;person.actor.setPose('standing');resetCameraRig(characterHeading);syncPose();cameraStep(0);updateShadow();renderer.render(scene,camera);broadcast();return true;
  }
  function orderPubFood(item){
    if(!renderer||!pubFoodIds.has(item)||!nearPubCounter()||pubOrder?.state==='preparing')return false;
    city.pub.setOrder(null);pubOrder={item,state:'preparing',readyAt:clock+1.5};broadcast();return true;
  }
  return {init,resume,pause,stop,input,resize,reset,portrait,getPerformance,setQuality,ready,setMission,clearMission,setTarget,enterVehicle,requestEnter,exitVehicle,requestExit,loadPatient,unloadPatient,getInfo,previewPubView,orderPubFood};
})();
