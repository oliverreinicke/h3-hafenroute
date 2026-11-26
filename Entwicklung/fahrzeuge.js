/* H3 vehicle adaptation: detailed CC0 models by tevy.dev (pinned v1), locally decoded. Original procedural fallback retained. */
window.H3Vehicles=(()=>{
 // Fictional, stable Swiss registrations. No owner or real registration lookup.
 function plateNumber(identity){let h=2166136261;for(const ch of String(identity?.id||'h3-vehicle')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return 'BL '+String(100000+h%900000);}
 function shieldPath(q,x,y,w,h){q.beginPath();q.moveTo(x,y);q.lineTo(x+w,y);q.lineTo(x+w,y+h*.52);q.quadraticCurveTo(x+w,y+h*.84,x+w*.5,y+h);q.quadraticCurveTo(x,y+h*.84,x,y+h*.52);q.closePath();}
 function coat(q,x,y,w,h,baselland){
  shieldPath(q,x,y,w,h);q.fillStyle=baselland?'#fff':'#da291c';q.fill();q.strokeStyle='#171717';q.lineWidth=.8;q.stroke();q.save();q.translate(x,y);q.scale(w,h);
  if(!baselland){const ratio=w/h;q.fillStyle='#fff';q.fillRect(.18,.39-.09*ratio,.64,.18*ratio);q.fillRect(.41,.39-.32*ratio,.18,.64*ratio);}
  else{
   // Basel-Landschaft: red crozier facing the viewer's right, with seven crockets.
   q.fillStyle='#cf1f29';q.beginPath();q.moveTo(.34,.87);q.lineTo(.34,.42);q.bezierCurveTo(.30,.18,.42,.075,.60,.075);q.bezierCurveTo(.84,.075,.91,.24,.80,.37);q.bezierCurveTo(.75,.43,.64,.42,.61,.36);q.lineTo(.64,.29);q.bezierCurveTo(.70,.34,.76,.30,.75,.24);q.bezierCurveTo(.74,.16,.64,.14,.57,.17);q.bezierCurveTo(.49,.20,.48,.30,.49,.42);q.lineTo(.49,.87);q.lineTo(.60,.87);q.lineTo(.60,.94);q.lineTo(.23,.94);q.lineTo(.23,.87);q.closePath();q.fill();
   for(const [cx,cy]of[[.32,.35],[.31,.26],[.34,.17],[.40,.10],[.49,.055],[.60,.045],[.70,.07]]){q.beginPath();q.arc(cx,cy,.037,0,Math.PI*2);q.fill();}
  }
  q.restore();
 }
 function plateTexture(T,number){
  const c=document.createElement('canvas');c.width=512;c.height=256;const q=c.getContext('2d');
  function panel(y,w,h,rear){
   q.setTransform(512/w,0,0,128/h,0,y);q.fillStyle='#fbfcf8';q.fillRect(0,0,w,h);q.strokeStyle='#202323';q.lineWidth=1.6;q.strokeRect(1,1,w-2,h-2);
   q.fillStyle='#101214';q.font=(rear?'100':'78')+'px "Arial Narrow",Arial,sans-serif';q.textAlign='center';q.textBaseline='middle';q.fillText(number,w/2,h*.53,rear?358:278);
   if(rear){coat(q,15,24,48,61,false);coat(q,w-63,24,48,61,true);}
   q.fillStyle='#6c7375';for(const x of[7,w-7]){q.beginPath();q.arc(x,h/2,1.4,0,Math.PI*2);q.fill();}
  }
  panel(0,300,80,false);panel(128,500,110,true);q.setTransform(1,0,0,1,0,0);
  const texture=new T.CanvasTexture(c);texture.name='h3_fictional_'+number.replace(' ','_');texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return texture;
 }
 function plateRotation(T,normal){const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),normal).normalize(),up=new T.Vector3().crossVectors(normal,right).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,normal));}
 function makePlates(T,identity,slots,spec={sx:1,sy:1,sz:1}){
  const group=new T.Group(),number=plateNumber(identity),texture=plateTexture(T,number),mat=new T.MeshStandardMaterial({name:'h3_swiss_plate',map:texture,color:0xffffff,roughness:.51,metalness:.12});group.name='Swiss_registration_'+String(identity.id);group.userData.h3Plates=true;group.userData.registration=number;group.userData.fictional=true;
  const scale=new T.Vector3(spec.sx||1,spec.sy||1,spec.sz||1);
  for(const slot of slots){
   const normal=new T.Vector3(...slot.normal).normalize(),rotation=plateRotation(T,normal),u=new T.Vector3(1,0,0).applyQuaternion(rotation).multiply(scale),v=new T.Vector3(0,1,0).applyQuaternion(rotation).multiply(scale),g=new T.PlaneGeometry(slot.width/u.length(),slot.height/v.length()),uv=g.attributes.uv;
   for(let k=0;k<uv.count;k++)uv.setY(k,(slot.end==='front' ? .5 : 0)+.002+uv.getY(k)*.496);
   const plate=new T.Mesh(g,mat);plate.name='BL_'+slot.end;plate.position.set(...slot.position);plate.quaternion.copy(rotation);plate.castShadow=false;plate.receiveShadow=true;plate.userData.h3Plate=true;plate.userData.registration=number;plate.userData.mount=slot;group.add(plate);
  }
  return group;
 }
 function mountingSlots(T,chassis,index,spec,fallback=false){
  // Heights are chosen on the actual blank/fascia locations. Ambulance rear
  // registration sits on the right rear door rather than across its open seam.
  const heights=fallback?[.49,index>=2?.42:.44]:[[.40,.76],[.451,.72],[.451,.72],[.458,.535],[.34,.81]][index],slots=[];
  chassis.updateWorldMatrix(true,true);const origin=new T.Vector3(),direction=new T.Vector3(),normalMatrix=new T.Matrix3();
  for(let side=0;side<2;side++){
   const end=side?1:-1,width=side?.50:.30,height=side?.11:.08,x=!fallback&&index===4&&side?.44:0,y=heights[side];origin.set(x,y,end*8);direction.set(0,0,-end);
   const hit=new T.Raycaster(origin,direction).intersectObject(chassis,true)[0];if(!hit)throw Error('Kennzeichenfläche am Fahrzeug fehlt.');
   const n=hit.face.normal.clone().applyMatrix3(normalMatrix.getNormalMatrix(hit.object.matrixWorld)).normalize();if(n.z*end<0)n.negate();if(n.z*end<.80)n.set(0,0,end);
   const rotation=plateRotation(T,n),u=new T.Vector3(1,0,0).applyQuaternion(rotation),v=new T.Vector3(0,1,0).applyQuaternion(rotation),point=hit.point.clone();let lift=.004,backingSpread=0;
   for(const a of[-.5,0,.5])for(const b of[-.5,0,.5]){
    origin.copy(point).addScaledVector(u,a*width/(spec.sx||1)).addScaledVector(v,b*height/(spec.sy||1)).addScaledVector(n,1);direction.copy(n).negate();const sample=new T.Raycaster(origin,direction).intersectObject(chassis,true)[0];if(!sample)continue;const d=sample.point.clone().sub(point).dot(n);lift=Math.max(lift,d+.004);backingSpread=Math.max(backingSpread,Math.abs(d));
   }
   point.addScaledVector(n,lift);slots.push({end:side?'rear':'front',position:point.toArray(),normal:n.toArray(),width,height,lift,backingSpread});
  }
  return slots;
 }
 function attachPlates(T,root,chassis,index,spec,identity,fallback=false){
  const slots=mountingSlots(T,chassis,index,spec,fallback);root.userData.plateSlots=slots;root.userData.registration=plateNumber(identity);root.userData.registrationFictional=true;
  // Added after the body's collision/roof measurements and after fallback
  // batching: registrations follow the chassis' small suspension roll as well.
  if(!identity.noPlates)chassis.add(makePlates(T,identity,slots,spec));
 }
 function makeFallback(T,scene,config,index,spec,identity){
  const [x,z,heading,colour]=config,van=index>=2;
  const root=new T.Group(),chassis=new T.Group();root.add(chassis);scene.add(root);
  const material=(color,roughness=.65,metalness=.02)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const paint=new T.MeshPhysicalMaterial({color:colour,metalness:.48,roughness:.25,clearcoat:.92,clearcoatRoughness:.17});
  const trim=material(0x13191c,.7,.05),rubber=material(0x15191b,.95),chrome=material(0xb5babc,.24,.85),alloy=material(0x929caa,.31,.82);
  const leather=material(0x293138,.88),seam=material(0x10161c,.95),dashboard=material(0x242a2f,.89),lens=material(0xe2eff0,.16,.18);
  const headliner=leather.clone();headliner.side=T.BackSide;headliner.color.set(0x8b8a80);
  const glass=new T.MeshPhysicalMaterial({color:0x6b929e,roughness:.075,metalness:.02,transparent:true,opacity:.14,depthWrite:false,side:T.DoubleSide,clearcoat:1});
  const headlight=new T.MeshStandardMaterial({color:0xf8fff7,emissive:0xd9e5de,emissiveIntensity:.55,roughness:.18});
  const brakeLight=new T.MeshStandardMaterial({color:0x98090c,emissive:0xe21915,emissiveIntensity:1.1,roughness:.2});
  const amber=new T.MeshStandardMaterial({color:0xcf6620,emissive:0xff8714,emissiveIntensity:.22,roughness:.25});
  const stripe=material(index===4?0xf35c14:index===3?0x217a8b:0x225065,.45,.18);
  function mesh(g,m,p=chassis,px=0,py=0,pz=0){const v=new T.Mesh(g,m);v.position.set(px,py,pz);v.castShadow=!m.transparent;v.receiveShadow=true;p.add(v);return v;}
  function box(w,h,d,m,px,py,pz,p=chassis){return mesh(new T.BoxGeometry(w,h,d),m,p,px,py,pz)}
  function rounded(w,h,d,r,m,px,py,pz,p=chassis){
   r=Math.min(r,w*.49,h*.49,d*.49);const s=new T.Shape(),hw=w/2-r,hh=h/2-r;
   s.moveTo(-hw,-h/2);s.lineTo(hw,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-hh);s.lineTo(w/2,hh);s.quadraticCurveTo(w/2,h/2,hw,h/2);s.lineTo(-hw,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,hh);s.lineTo(-w/2,-hh);s.quadraticCurveTo(-w/2,-h/2,-hw,-h/2);
   const g=new T.ExtrudeGeometry(s,{depth:Math.max(.001,d-r*2),steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:r*.33,bevelThickness:r,curveSegments:7});g.translate(0,0,-(d-r*2)/2);g.computeVertexNormals();return mesh(g,m,p,px,py,pz);
  }
  function line(a,b,r,m,p=chassis){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const n=mesh(new T.CylinderGeometry(r,r,v.length(),10),m,p);n.position.copy(av).add(bv).multiplyScalar(.5);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return n;}
  function quad(points,m,p=chassis){const g=new T.BufferGeometry(),verts=[];for(const k of [0,1,2,0,2,3])verts.push(...points[k]);g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.computeVertexNormals();return mesh(g,m,p);}
  function crownedPanel(z0,z1,width0,width1,y0,y1,crown,material,camber=0,steps=22){
   const points=[],uv=[],indices=[],across=18;
   for(let j=0;j<=steps;j++){const t=j/steps,z=z0+(z1-z0)*t,edge=y0+(y1-y0)*t+camber*Math.sin(Math.PI*t),half=(width0+(width1-width0)*t)/2;
    for(let k=0;k<=across;k++){const u=k/across*2-1;points.push(u*half,edge+crown*(1-u*u),z);uv.push(k/across,t);}
   }
   for(let j=0;j<steps;j++)for(let k=0;k<across;k++){const a=j*(across+1)+k,b=a+across+1;indices.push(a,b,a+1,a+1,b,b+1)}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const o=mesh(g,material);o.userData.crownedPanel=true;return o;
  }
  function shoulder(side,z0,z1,y0,y1,width){
   const p=[],uv=[],indices=[],rows=9,cols=32;
   for(let j=0;j<=cols;j++){const t=j/cols,z=z0+(z1-z0)*t,taper=Math.sin(Math.PI*t)*.022;
    for(let k=0;k<=rows;k++){const v=k/rows,y=y0+(y1-y0)*v;const round=.045*Math.sin(Math.PI*v),end=.012*(1-Math.sin(Math.PI*t));p.push(side*(width/2+round+taper-end),y,z);uv.push(t,v)}
   }
   for(let j=0;j<cols;j++)for(let k=0;k<rows;k++){const a=j*(rows+1)+k,b=a+rows+1;if(side<0)indices.push(a,b,a+1,a+1,b,b+1);else indices.push(a,a+1,b,a+1,b+1,b)}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(g,paint);
  }
  function label(text,w,h,colour='#f2f4ed',ink='#14232d'){
   const c=document.createElement('canvas');c.width=768;c.height=160;const q=c.getContext('2d');q.fillStyle=colour;q.fillRect(0,0,768,160);q.fillStyle=ink;q.font='600 75px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText(text,384,83,730);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tx,roughness:.48,side:T.DoubleSide}));
  }
  function sideBody(){
   // Extruded side outline contains genuine wheel-well openings rather than dark discs on solid panels.
   const shape=new T.Shape(),length=van?2.36:2.19,upper=van?1.13:.92;
   const point=(z,y)=>[-z,y],move=(z,y)=>shape.moveTo(...point(z,y)),to=(z,y)=>shape.lineTo(...point(z,y));
   move(-length,.46);to(-length+.08,van?.80:.68);shape.quadraticCurveTo(...point(-length+.16,van?.96:.77),...point(-1.54,van?1.08:.86));
   to(-.72,upper);to(1.65,upper);shape.quadraticCurveTo(...point(length,upper-.01),...point(length,.78));to(length,.43);
   const wheelbase=van?1.43:1.37,rad=van?.43:.412;
   to(wheelbase+rad,.39);
   for(let j=0;j<=24;j++){const a=j*Math.PI/24;to(wheelbase+Math.cos(a)*rad,.39+Math.sin(a)*rad)}
   to(-wheelbase+rad,.39);
   for(let j=0;j<=24;j++){const a=j*Math.PI/24;to(-wheelbase+Math.cos(a)*rad,.39+Math.sin(a)*rad)}
   to(-length,.46);shape.closePath();
   const depth=van?1.89:1.84,g=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:4,bevelSize:.027,bevelThickness:.027,curveSegments:12});
   const a=g.attributes.position;for(let i=0;i<a.count;i++){const xx=a.getX(i),yy=a.getY(i),zz=a.getZ(i);a.setXYZ(i,zz-depth/2,yy,-xx)}g.computeVertexNormals();mesh(g,paint);
   // Small mouldings follow the arches; car panel remains clear of the tyres.
   for(const side of [-1,1])for(const zz of [-wheelbase,wheelbase]){
    const arc=new T.CatmullRomCurve3(Array.from({length:25},(_,j)=>new T.Vector3(side*(depth/2+.032),.39+Math.sin(j*Math.PI/24)*(rad+.012),zz+Math.cos(j*Math.PI/24)*(rad+.012))));mesh(new T.TubeGeometry(arc,24,.018,6,false),trim);
   }
  }
  sideBody();
  // Bonnet and rear deck are compound-curved sheet metal. Lower body still preserves the wheel openings.
  if(!van){
   crownedPanel(-2.17,-.94,1.57,1.74,.79,.947,.065,paint,.025);
   crownedPanel(1.50,2.17,1.72,1.59,.969,.802,.037,paint,.016);
   for(const side of [-1,1]){shoulder(side,-1.13,1.22,.83,.947,1.80);line([side*.69,.855,-2.01],[side*.69,.965,-1.02],.004,trim);}
  }else{
   crownedPanel(-2.31,-1.94,1.60,1.76,.89,1.12,.055,paint,.018);
   for(const side of [-1,1])shoulder(side,-1.15,1.22,.88,1.13,1.87);
  }
  // Subfloor and door sill give the interior a physical surface without filling the glazed cabin.
  rounded(van?1.76:1.70,.10,van?3.85:3.5,.025,trim,0,.39,0);
  if(!van){
   // Estate cabin: gently arched roof, separate A/B/C pillars and unobstructed glazing.
   crownedPanel(-.43,1.34,1.40,1.43,1.478,1.478,.065,paint,.025);
   crownedPanel(-.40,1.31,1.36,1.39,1.448,1.448,.065,headliner,.025);
   for(const side of [-1,1])line([side*.705,1.484,-.40],[side*.720,1.484,1.30],.021,paint);
   const front=[[-.858,.925,-.96],[.858,.925,-.96],[.705,1.455,-.40],[-.705,1.455,-.40]];
   const rear=[[-.867,.96,1.69],[-.714,1.455,1.29],[.714,1.455,1.29],[.867,.96,1.69]];
   quad(front,glass);quad(rear,glass);
   for(const side of [-1,1]){
    const low=side*.873,high=side*.725;
    for(const [lo,hi]of [[-.91,-.39],[1.67,1.29]])line([low,.938,lo],[high,1.47,hi],.032,paint);
    line([low,.942,.25],[high,1.47,.25],.036,trim);
    line([low,.943,-.91],[low,.963,1.67],.018,chrome);
    line([high,1.47,-.39],[high,1.47,1.29],.015,chrome);
    quad([[low,.95,-.88],[low,.955,.21],[high,1.448,.21],[high,1.448,-.35]],glass);
    quad([[low,.955,.29],[low,.965,1.59],[high,1.448,1.25],[high,1.448,.29]],glass);
    line([side*.93,.92,-.72],[side*1.02,.99,-.71],.021,trim);
    rounded(.16,.105,.22,.035,paint,side*1.04,1.01,-.70);
    const reflect=box(.014,.062,.15,chrome,side*1.12,1.01,-.68);reflect.rotation.y=side*.1;
    for(const zz of [.15,1.10])rounded(.023,.035,.16,.009,chrome,side*.945,.85,zz);
    for(const zz of [.27,1.64])line([side*.945,.46,zz],[side*.945,.935,zz-.01],.006,trim);
    line([side*.937,.55,-.83],[side*.937,.55,.82],.008,trim);
    const light=rounded(.48,.10,.10,.028,lens,side*.65,.68,-2.17);light.rotation.y=side*-.15;
    rounded(.40,.025,.112,.008,headlight,side*.65,.697,-2.18);
    rounded(.04,.075,.08,.013,amber,side*.87,.665,-2.15);
    rounded(.36,.13,.08,.025,brakeLight,side*.68,.78,2.17);
    rounded(.21,.033,.08,.011,lens,side*.67,.735,2.18);
   }
   rounded(1.42,.16,.09,.035,trim,0,.49,-2.18);
   for(let i=-3;i<=3;i++)box(.035,.11,.015,chrome,i*.17,.49,-2.235);
   rounded(1.59,.12,.10,.025,trim,0,.44,2.19);
   line([-.63,.92,-.78],[.63,.92,-.78],.012,trim);
   for(const side of [-1,1])line([side*.34,.94,-.94],[side*.60,1.04,-.84],.012,trim);
   if(index===0&&!identity.civil){const sign=rounded(.65,.17,.25,.035,material(0xf3d462,.38),0,1.63,.25);const tag=label('TAXI',.56,.12,'#f3d462','#25313a');tag.position.set(0,1.64,.386);chassis.add(tag);}
   else for(const side of [-1,1])line([side*.59,1.55,-.32],[side*.59,1.55,1.14],.023,chrome);
  }else{
   // High roof van: glazed apertures are bounded by pillars, with no opaque panel behind the glass.
   crownedPanel(-1.60,2.20,1.80,1.86,2.18,2.18,.112,paint,.024);
   crownedPanel(-1.55,2.15,1.75,1.81,2.145,2.145,.108,headliner,.024);
   for(const side of [-1,1])line([side*.905,2.19,-1.55],[side*.935,2.19,2.15],.035,paint);
   quad([[-.85,1.12,-1.96],[.85,1.12,-1.96],[.81,2.08,-1.47],[-.81,2.08,-1.47]],glass);
   for(const side of [-1,1]){
    line([side*.90,1.11,-1.96],[side*.86,2.11,-1.47],.05,paint);
    rounded(.10,.98,.14,.024,paint,side*.94,1.65,-.17);
    rounded(.10,.98,.15,.025,paint,side*.94,1.65,2.12);
    rounded(.10,.96,.12,.024,paint,side*.94,1.65,1.60);
    rounded(.10,.11,3.8,.025,paint,side*.94,1.20,.29);
    quad([[side*.946,1.27,-1.75],[side*.946,1.27,-.25],[side*.894,2.08,-.25],[side*.85,2.08,-1.43]],glass);
    quad([[side*.955,1.30,-.07],[side*.955,1.30,1.49],[side*.955,2.08,1.49],[side*.955,2.08,-.07]],glass);
    rounded(.08,.18,4.05,.018,stripe,side*.967,1.045,.25);
    rounded(.08,.035,3.97,.01,material(0xe8ecdc,.5),side*.977,1.18,.24);
    line([side*.91,1.61,-1.68],[side*1.075,1.45,-1.60],.033,trim);
    rounded(.16,.29,.22,.04,paint,side*1.1,1.48,-1.58);
    box(.012,.22,.15,chrome,side*1.19,1.48,-1.57);
    rounded(.03,.04,.20,.01,trim,side*.988,1.27,-.50);
    line([side*.98,.50,-.18],[side*.98,1.21,-.18],.006,trim);
    line([side*.98,.50,1.62],[side*.98,1.19,1.62],.006,trim);
    const tag=label(index===4?'RETTUNGSDIENST':index===3?'LIEGENDTRANSPORT':'ROLLSTUHLTRANSPORT',2.85,.22,'#e9eeec','#17303d');tag.position.set(side*.988,.80,.36);tag.rotation.y=side*Math.PI/2;chassis.add(tag);
    rounded(.43,.13,.10,.025,lens,side*.67,.84,-2.34);
    rounded(.35,.027,.11,.01,headlight,side*.67,.865,-2.35);
    rounded(.13,.36,.09,.025,brakeLight,side*.84,1.0,2.37);
    rounded(.13,.10,.10,.018,lens,side*.84,.96,2.38);
    rounded(.09,.035,.08,.008,amber,side*.966,.64,0);
    box(.05,.11,3.62,trim,side*.96,.46,.27);
   }
   // Rear doors stop below the separate rear windows.
   rounded(1.89,.24,.10,.025,paint,0,1.28,2.30);
   rounded(1.89,.13,.10,.02,paint,0,2.07,2.30);
   for(const side of [-1,1]){rounded(.10,.77,.10,.025,paint,side*.91,1.69,2.30);quad([[side*.05,1.42,2.36],[side*.83,1.42,2.36],[side*.83,1.98,2.36],[side*.05,1.98,2.36]],glass);}
   rounded(.08,.75,.10,.02,paint,0,1.70,2.30);line([0,.54,2.37],[0,1.31,2.37],.008,trim);
   rounded(1.72,.19,.12,.03,trim,0,.49,-2.36);rounded(1.83,.15,.16,.03,trim,0,.42,2.38);
   for(let i=0;i<4;i++)rounded(1.03,.027,.035,.007,chrome,0,.67+i*.07,-2.38);
   for(const side of [-1,1])line([side*.3,1.15,-1.95],[side*.62,1.24,-1.87],.013,trim);
   if(index===4){
    const blue=new T.MeshStandardMaterial({color:0x0955b0,emissive:0x0967df,emissiveIntensity:.4,roughness:.18});
    rounded(1.40,.09,.35,.025,trim,0,2.32,-.84);
    for(const side of [-1,1])rounded(.45,.14,.31,.04,blue,side*.46,2.42,-.84);
    for(const side of [-1,1])for(let k=0;k<4;k++){const chevron=box(.27,.11,.018,stripe,side*(.18+k*.20),.64,2.39);chevron.rotation.z=side*.35;}
   }else if(index===2){rounded(1.44,.05,.35,.01,chrome,0,.42,2.42);}
  }
  // Credible interior. The passenger remains owned and positioned by the main simulation.
  const seatZ=van?-.82:.12,seatY=van?.73:.51;
  for(const side of [-1,1]){
   rounded(.56,.13,.58,.045,leather,side*.42,seatY,seatZ);
   const back=rounded(.55,.56,.14,.038,leather,side*.42,seatY+.31,seatZ+.21);back.rotation.x=-.10;
   rounded(.30,.18,.12,.028,leather,side*.42,seatY+.65,seatZ+.20);
   line([side*.42-.10,seatY+.48,seatZ+.20],[side*.42-.10,seatY+.62,seatZ+.20],.012,chrome);
   line([side*.42+.10,seatY+.48,seatZ+.20],[side*.42+.10,seatY+.62,seatZ+.20],.012,chrome);
   line([side*.42-.23,seatY+.10,seatZ-.24],[side*.42+.23,seatY+.10,seatZ-.24],.005,seam);
  }
  if(!van){rounded(1.45,.14,.53,.04,leather,0,.55,.98);rounded(1.45,.46,.15,.035,leather,0,.81,1.19);}
  else{rounded(1.68,.065,2.4,.01,material(0x6c7070,.92),0,.48,.87);for(const side of [-1,1])line([side*.63,.54,-.18],[side*.63,.54,2.05],.018,chrome);}
  rounded(van?1.66:1.53,.20,.43,.04,dashboard,0,van?1.22:.95,van?-1.40:-.76);
  const wheel=mesh(new T.TorusGeometry(.165,.022,10,32),trim,chassis,-.42,van?1.37:1.03,van?-1.13:-.56);wheel.rotation.x=-.38;
  line([-.42,van?1.37:1.03,van?-1.13:-.56],[-.42,van?1.19:.87,van?-1.39:-.77],.032,trim);
  rounded(.20,.11,.04,.012,trim,-.42,van?1.37:1.03,van?-1.13:-.56);
  rounded(.25,.14,.035,.01,material(0x111a20,.33),.03,van?1.27:.98,van?-1.17:-.52);
  for(let k=0;k<3;k++)box(.10,.015,.025,alloy,-.35+k*.35,van?1.24:.98,van?-1.17:-.52);
  const wheels=[];
  for(const side of [-1,1])for(const zz of [van?-1.43:-1.37,van?1.43:1.37]){
   const hub=new T.Group(),axle=new T.Group();hub.position.set(side*(van?.94:.91),.37,zz);hub.add(axle);chassis.add(hub);
   const tyre=mesh(new T.TorusGeometry(.269,.083,12,36),rubber,axle);tyre.rotation.y=Math.PI/2;
   const wall=mesh(new T.CylinderGeometry(.285,.285,.16,32),rubber,axle);wall.rotation.z=Math.PI/2;
   const disc=mesh(new T.CylinderGeometry(.205,.205,.174,32),trim,axle);disc.rotation.z=Math.PI/2;
   const metalDisc=mesh(new T.CylinderGeometry(.185,.185,.13,28),alloy,axle);metalDisc.rotation.z=Math.PI/2;
   const ring=mesh(new T.TorusGeometry(.223,.014,8,32),chrome,axle,side*.093,0,0);ring.rotation.y=Math.PI/2;
   for(let j=0;j<7;j++){
    const a=j*Math.PI*2/7;line([side*.104,Math.sin(a)*.065,Math.cos(a)*.065],[side*.103,Math.sin(a+.13)*.212,Math.cos(a+.13)*.212],.021,alloy,axle);
    const bolt=mesh(new T.CylinderGeometry(.014,.014,.013,8),chrome,axle,side*.119,Math.sin(a)*.063,Math.cos(a)*.063);bolt.rotation.z=Math.PI/2;
   }
   const cap=mesh(new T.CylinderGeometry(.059,.059,.225,24),chrome,axle);cap.rotation.z=Math.PI/2;
   batch(axle);wheels.push({hub,axle,front:zz<0});
  }
  // Tiny amber side reflectors and door shut-lines are geometry; no raster game assets required.
  function batch(parent){
   const entries=new Map();for(const child of parent.children.slice()){
    if(!child.isMesh||child.material.map)continue;child.updateMatrix();
    const key=child.material.uuid;if(!entries.has(key))entries.set(key,{material:child.material,geometries:[]});
    const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrix);g.deleteAttribute('uv');entries.get(key).geometries.push(g);parent.remove(child);child.geometry.dispose();
   }
   for(const {material,geometries}of entries.values()){
    const g=window.GeometryTools.mergeGeometries(geometries),o=new T.Mesh(g,material);o.castShadow=!material.transparent;o.receiveShadow=true;parent.add(o);geometries.forEach(q=>q.dispose());
   }
  }
  batch(chassis);attachPlates(T,root,chassis,index,spec,identity,true);root.position.set(x,van?-.10:-.085,z);root.rotation.y=-heading;root.scale.set(spec.sx,spec.sy,spec.sz);
  root.userData.vehicleDetail='compound-curved-shell-v3';root.userData.driverEye=van?[-.42,1.78,-1.03]:[-.42,1.28,-.04];
  return {root,chassis,wheels,brakeLight,heading,spec,index,id:identity.id,type:identity.type};
 }
 const templates=new Map();let loading=null;
 const files=['estate','minivan','minivan','highvan','ambulance'];
 const fit={estate:{scale:[.96,1.02,.96],wheelY:.33,radius:.33,eye:[.37,1.245,-.31],seat:[-.37,.015,-.34]},minivan:{scale:[.90,.96,.88],wheelY:.368,radius:.368,eye:[.40,1.34,-.12],seat:[-.42,.19,-.01]},highvan:{scale:[.84,.92,.80],wheelY:.352,radius:.352,eye:[.45,1.67,1.05],seat:[-.45,.35,1.05]},ambulance:{scale:[.80,.80,.66],wheelY:.36,radius:.372,eye:[.45,1.63,1.53],seat:[-.45,.25,1.80]}};
 async function preload(){
  if(templates.size===4)return;if(loading)return loading;
  loading=Promise.all([...new Set(files)].map(async key=>{const name='h3-v4-'+key+'.glb',response=await fetch(window.cityAsset(name));if(!response.ok)throw Error('Fahrzeugmodell fehlt: '+name);const gltf=await new window.AssetLoader.GLTFLoader().parseAsync(await response.arrayBuffer(),'');templates.set(key,gltf.scene)})).catch(e=>{loading=null;throw e});
  return loading;
 }
 function make(T,scene,config,index,spec,identity){
  const key=files[index];if(!templates.has(key))return makeFallback(T,scene,config,index,spec,identity);
  const [x,z,heading,colour]=config,params=fit[key],root=new T.Group(),chassis=new T.Group();root.add(chassis);scene.add(root);
  const normal=new T.Group();normal.scale.set(...params.scale);normal.rotation.y=Math.PI;
  const radialScale=Math.min(params.scale[1],params.scale[2]),groundShift=params.radius*radialScale-params.wheelY*params.scale[1];normal.position.y=groundShift;
  const source=templates.get(key).clone(true);normal.add(source);chassis.add(normal);root.updateMatrixWorld(true);
  const materials=new Map(),shared=new Map();
  const brakeLight=new T.MeshStandardMaterial({name:'v4_tail_lamp',color:0x9e1020,emissive:0xf32b2c,emissiveIntensity:.48,roughness:.23});
  const wheelMetal=new T.MeshStandardMaterial({name:'v4_wheel_alloy',color:0xffffff,vertexColors:true,roughness:.29,metalness:.82});
  function material(original){
   if(/lamp_red|light_rear|lens_red|^red$/.test(original.name))return brakeLight;
   if(materials.has(original.uuid))return materials.get(original.uuid);const m=original.clone();m.envMapIntensity=.8;
   if(/paint/.test(m.name)){m.color.set(colour);m.roughness=.245;m.metalness=.58;if('clearcoat'in m){m.clearcoat=.88;m.clearcoatRoughness=.15;}}
   if(/glass|lens_clear|frosted/.test(m.name)){if('transmission'in m)m.transmission=0;m.transparent=true;m.opacity=/privacy/.test(m.name)?.25:.19;m.depthWrite=false;m.side=T.DoubleSide;m.roughness=.095;m.color.set(0x91a7ae);if('clearcoat'in m)m.clearcoat=.35;}
   if('transmission'in m&&m.transmission>0)m.transmission=0;
   materials.set(original.uuid,m);return m;
  }
  function add(group,g,m){
   const k=m.uuid;if(!group.has(k))group.set(k,{material:m,geometries:[]});
   if(!m.map&&!m.normalMap&&!m.roughnessMap&&!m.aoMap)g.deleteAttribute('uv');
   g.deleteAttribute('uv1');g.deleteAttribute('tangent');group.get(k).geometries.push(g);
  }
  const warpy=y=>index===2?y+Math.min(1,Math.max(0,(y-.83)/.72))*.20:y;
  function geometry(mesh){const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();for(const[name,a]of Object.entries(g.attributes)){if(!(a.array instanceof Float32Array)||a.normalized){const values=new Float32Array(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)values[i*a.itemSize+k]=a.getComponent(i,k);g.setAttribute(name,new T.BufferAttribute(values,a.itemSize));}}g.applyMatrix4(mesh.matrixWorld);const p=g.attributes.position;
   if(index===2){for(let i=0;i<p.count;i++)p.setY(i,warpy(p.getY(i)));g.computeVertexNormals();}
   return g;
  }
  function removeRearSeats(g){
   const p=g.attributes.position,keep=[];for(let i=0;i<p.count;i+=3){const z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;if(z<.45)keep.push(i,i+1,i+2)}
   if(keep.length===p.count)return g;const h=new T.BufferGeometry();for(const[name,a]of Object.entries(g.attributes)){const arr=new a.array.constructor(keep.length*a.itemSize);keep.forEach((v,k)=>{for(let c=0;c<a.itemSize;c++)arr[k*a.itemSize+c]=a.array[v*a.itemSize+c]});h.setAttribute(name,new T.BufferAttribute(arr,a.itemSize,a.normalized));}g.dispose();return h;
  }
  function build(groups,parent,wheel=false){
   for(const{material:m,geometries}of groups.values()){
    if(!geometries.length)continue;const joined=window.GeometryTools.mergeGeometries(geometries);if(!joined)throw Error('Fahrzeug-Geometrie konnte nicht verbunden werden.');
    const mesh=new T.Mesh(joined,m);mesh.castShadow=!m.transparent&&!wheel&&!/interior|carpet|fabric|headliner|screen|dash|seat|leather/.test(m.name);mesh.receiveShadow=true;parent.add(mesh);geometries.forEach(g=>g.dispose());
   }
  }
  const moving=new Set(),wheels=[],wheelSpace=new T.Group();wheelSpace.name='v4_unscaled_running_gear';wheelSpace.scale.set(1/spec.sx,1/spec.sy,1/spec.sz);root.add(wheelSpace);
  for(const name of ['wheel_FL','wheel_FR','wheel_RL','wheel_RR']){
   const node=source.getObjectByName(name);if(!node)throw Error('Fahrzeugrad fehlt: '+key+'/'+name);
   node.traverse(q=>moving.add(q));const pivot=node.getWorldPosition(new T.Vector3()),hub=new T.Group(),axle=new T.Group();hub.position.copy(pivot).multiply(new T.Vector3(spec.sx,spec.sy,spec.sz));hub.add(axle);wheelSpace.add(hub);const groups=new Map();
   node.traverse(q=>{if(!q.isMesh)return;const g=geometry(q);g.translate(-pivot.x,-pivot.y,-pivot.z);g.applyMatrix4(new T.Matrix4().makeScale(spec.sx,spec.sy*radialScale/params.scale[1],spec.sy*radialScale/params.scale[2]));let m;
    if(/tire|tyre|rubber/.test(q.material.name))m=material(q.material);else{m=wheelMetal;const colour=q.material.color||new T.Color(0x989da4),arr=new Float32Array(g.attributes.position.count*3);for(let k=0;k<arr.length;k+=3){arr[k]=colour.r;arr[k+1]=colour.g;arr[k+2]=colour.b}g.setAttribute('color',new T.BufferAttribute(arr,3));}add(groups,g,m);
   });build(groups,axle,true);wheels.push({hub,axle,front:name.includes('_F')});
  }
  const staticGroups=new Map();source.traverse(q=>{if(!q.isMesh||moving.has(q))return;let g=geometry(q);if(index===2&&q.name.startsWith('seats'))g=removeRearSeats(g);add(staticGroups,g,material(q.material));});
  normal.removeFromParent();build(staticGroups,chassis);
  const matte=new T.MeshStandardMaterial({color:0x273740,roughness:.7}),bright=new T.MeshStandardMaterial({color:0xc9d3d6,metalness:.75,roughness:.33});
  function box(w,h,d,m,x,y,z){const q=new T.Mesh(new T.BoxGeometry(w,h,d),m);q.position.set(x,y,z);chassis.add(q);return q;}
  function label(text,w,h,bg='#f0f2ed',fg='#18313e'){const c=document.createElement('canvas');c.width=768;c.height=128;const a=c.getContext('2d');a.fillStyle=bg;a.fillRect(0,0,768,128);a.fillStyle=fg;a.textAlign='center';a.textBaseline='middle';a.font='bold 60px Arial';a.fillText(text,384,66,738);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.MeshStandardMaterial({map:tx,roughness:.63,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});return new T.Mesh(new T.PlaneGeometry(w,h),m);}
  if(index===0&&!identity.civil){const sign=new T.MeshStandardMaterial({color:0xf5d573,roughness:.5});box(.58,.15,.22,sign,0,1.62,.15);for(const side of [-1,1]){const tag=label('TAXI',.52,.12,'#f5d573');tag.position.set(0,1.62,.15+side*.112);chassis.add(tag);}}
  if(!identity.civil&&(index===1||index===2||index===3)){for(const side of [-1,1]){
   const text=index===1?'FAHRDIENST':index===2?'ROLLSTUHLTRANSPORT':'LIEGENDTRANSPORT',tag=label(text,index===1?1.25:index===3?2.0:2.25,.17);tag.position.set(side*(index===3?.858:.88),index===1?.68:.90,index===1?.75:index===3?.82:.68);tag.rotation.y=side*Math.PI/2;chassis.add(tag);
  }}
  if(index===2){box(1.40,.035,.35,bright,0,.32,2.31);for(const side of [-1,1])box(.035,.027,1.68,bright,side*.36,.31,1.13);}
  if(index===3){const stripe=new T.MeshStandardMaterial({color:0x317d8c,roughness:.5});for(const side of [-1,1])box(.012,.13,2.30,stripe,side*.854,1.12,.90);}
  const anchor=point=>[-point[0]*params.scale[0],warpy(point[1]*params.scale[1]+groundShift),-point[2]*params.scale[2]];
  root.userData.vehicleDetail='tevy-cc0-pbr-v4';root.userData.vehicleSource='https://tevy.dev/models/'+({estate:'estate-car',minivan:'family-minivan',highvan:'delivery-van',ambulance:'ambulance'}[key]);root.userData.driverEye=anchor(params.eye);
  root.userData.passengerSeat=index===2?[0,.28,.61]:index===3?[0,.32,.57]:index===4?[0,.56,.46]:anchor(params.seat);root.userData.passengerRotationY=Math.PI;
  root.userData.teamSeat=index===4?[.35,.15,-1.18]:null;
  chassis.updateMatrixWorld(true);const bodyBounds=new T.Box3().setFromObject(chassis);root.userData.collisionHalfLength=(bodyBounds.max.z-bodyBounds.min.z)*.5*spec.sz;root.userData.collisionHalfWidth=Math.max(Math.abs(bodyBounds.min.x),Math.abs(bodyBounds.max.x))*spec.sx;root.userData.collisionCenterZ=(bodyBounds.min.z+bodyBounds.max.z)*.5*spec.sz;root.userData.cameraRoofHeight=bodyBounds.max.y*spec.sy;
  attachPlates(T,root,chassis,index,spec,identity);
  root.position.set(x,index>=2?-.10:-.085,z);root.rotation.y=-heading;root.scale.set(spec.sx,spec.sy,spec.sz);root.updateMatrixWorld(true);
  return {root,chassis,wheels,brakeLight,heading,spec,index,id:identity.id,type:identity.type,wheelRadius:params.radius*radialScale*spec.sy};
 }

 return {make,preload,makePlates,plateNumber,getStatus:()=>({loaded:templates.size,ready:templates.size===4})};
})();
