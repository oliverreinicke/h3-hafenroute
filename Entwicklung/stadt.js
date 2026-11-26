/* Lindenhafen. Neutral daylight, physically shaded architectural shells, modelled in metres. */
window.makeCity = function makeCity(T, scene) {
  let seed = 76103;
  const rand = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  const between = (a,b) => a+(b-a)*rand();
  const pick = a => a[Math.floor(rand()*a.length)];
  const PI=Math.PI, TAU=2*PI, blocks=[], dynamic=[];
  const root=new T.Group(); scene.add(root);
  const roadX=[-80,-24,32,88], roadZ=[-84,-28,28,84];
  const targets=[{x:-88,z:-52},{x:24,z:-46},{x:77,z:54},{x:-31,z:54},{x:-31,z:-52}];
  const bounds={minX:-99,maxX:100,minZ:-100,maxZ:100};
  const spawn={x:-85.2,z:15}, carSpawn={x:-82.5,z:12.6};
  const ink=0x303b40, peach=0x9caaa7, gold=0xc6bea7, aqua=0x74938b, orchid=0x96999c;
  const temp=new T.Object3D(), batches=new Map(), shadowShells=[];
  const paneGeom=new T.PlaneGeometry(1,1),boxGeom=new T.BoxGeometry(1,1,1), cylinder=new T.CylinderGeometry(.5,.5,1,12), taper=new T.CylinderGeometry(.37,.5,1,10);
  const oval=new T.SphereGeometry(.5,10,7);
  const clay=new T.MeshStandardMaterial({color:0xffffff,roughness:.74,metalness:.035});
  const lampmat=new T.MeshBasicMaterial({color:0xffffff});
  const glassmat=new T.MeshPhysicalMaterial({color:0x8fa9af,metalness:.01,roughness:.11,transparent:true,opacity:.14,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,clearcoat:.38,clearcoatRoughness:.12,envMapIntensity:.6});
  function instance(g,m,x,y,z,sx,sy,sz,c,rx=0,ry=0,rz=0){
    let byMat=batches.get(g);if(!byMat){byMat=new Map();batches.set(g,byMat);}
    let items=byMat.get(m);if(!items){items=[];byMat.set(m,items);}
    temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz);temp.scale.set(sx,sy,sz);temp.updateMatrix();
    items.push([temp.matrix.clone(),c]);
  }
  function box(x,y,z,w,h,d,c,angle=0,mat=clay){
    // A glazing sheet has one surface: a thin transparent box applied opacity four times and looked milky.
    if(mat===glassmat&&d<.10&&w>.4&&h>.05){instance(paneGeom,mat,x,y,z,w,h,1,c,0,angle,0);return;}
    if(mat===glassmat&&w<.10&&d>.4&&h>.05){instance(paneGeom,mat,x,y,z,d,h,1,c,0,angle+PI/2,0);return;}
    instance(boxGeom,mat,x,y,z,w,h,d,c,0,angle,0);
  }
  function cyl(x,y,z,w,h,d,c,mat=clay){instance(cylinder,mat,x,y,z,w,h,d,c);}
  function beam(a,b,width,col,mat=clay,depth=width){
    const v=new T.Vector3().subVectors(b,a), mid=new T.Vector3().addVectors(a,b).multiplyScalar(.5);
    const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());
    const e=new T.Euler().setFromQuaternion(q);
    instance(boxGeom,mat,mid.x,mid.y,mid.z,width,v.length(),depth,col,e.x,e.y,e.z);
  }
  function block(x,z,w,d){blocks.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
  function canvasTexture(w,h,paint,repeat=false){
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');paint(ctx,w,h);
    const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;
    if(repeat){tx.wrapS=tx.wrapT=T.RepeatWrapping;}
    return tx;
  }
  // Snapshot-local photographic/procedural surfaces; all decoding joins the loading barrier.
  const surfaceCache=new Map();
  function surface(name,normal=false){
    const key=name+'/'+normal;if(surfaceCache.has(key))return surfaceCache.get(key);
    const file='h3-v6-'+name;
    const tex=window.cityTexture?window.cityTexture(T,file):new T.TextureLoader().load(window.cityAsset(file));
    tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;
    tex.colorSpace=normal?T.NoColorSpace:T.SRGBColorSpace;surfaceCache.set(key,tex);return tex;
  }
  scene.background=new T.Color(0xb8c9d4);
  scene.fog=new T.FogExp2(0xc3cfd4,.0023);
  scene.add(new T.HemisphereLight(0xc9def1,0x837a67,.92));
  const sunLight=new T.DirectionalLight(0xffecd5,2.50);sunLight.position.set(-110,78,-63);scene.add(sunLight);
  sunLight.castShadow=true;
  Object.assign(sunLight.shadow.camera,{left:-134,right:134,top:126,bottom:-126,near:1,far:342});
  sunLight.shadow.camera.updateProjectionMatrix();
  sunLight.shadow.mapSize.set(2048,2048);sunLight.shadow.normalBias=.08;sunLight.shadow.bias=-.00015;
  const rim=new T.DirectionalLight(0xa6c6db,.25);rim.position.set(70,34,42);scene.add(rim);
  const sky=new T.Mesh(new T.SphereGeometry(1,32,16),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,depthTest:false,
    vertexShader:`varying vec3 ray;void main(){ray=position;vec4 p=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0);gl_Position=p.xyww;}`,
    fragmentShader:`varying vec3 ray;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec3 r=normalize(ray),s=normalize(vec3(-110.,78.,-63.));
        float h=max(r.y,0.),align=max(dot(r,s),0.);
        vec3 horizon=mix(vec3(.75,.81,.85),vec3(.89,.88,.82),pow(align,9.));
        vec3 c=mix(horizon,vec3(.57,.72,.85),smoothstep(.02,.34,h));
        c=mix(c,vec3(.23,.46,.72),smoothstep(.2,.95,h));
        vec2 p=r.xz/max(h+.13,.03);
        float cloud=noise(p*vec2(1.2,3.7))*.57+noise(p*vec2(3.,9.))*.3+noise(p*vec2(8.,22.))*.13;
        c=mix(c,mix(vec3(.74,.74,.77),vec3(.98,.98,.96),pow(align,4.)),smoothstep(.53,.72,cloud)*smoothstep(.015,.18,h)*.78);
        float d=length(r-s);
        c+=vec3(.16,.13,.06)*exp(-d*6.);
        c=mix(c,vec3(1.,.99,.94),1.-smoothstep(.0135,.0147,d));
        gl_FragColor=vec4(c,1.);
      }`
  }));sky.frustumCulled=false;sky.renderOrder=-100;root.add(sky);

  const waterMat=new T.ShaderMaterial({
    uniforms:{t:{value:0}},
    vertexShader:`varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,
    fragmentShader:`uniform float t;varying vec3 wp;
      float wave(vec2 p){return sin(p.x*2.2+p.y*.31+t*1.2+sin(p.y*.64+t*.43)*1.4)*.44+sin(p.x*.65-p.y*.27+t*.65)*.33+sin(p.x*5.4+p.y*.74-t*.44)*.23;}
      void main(){
        vec2 p=wp.xz;vec3 view=normalize(cameraPosition-wp);float dist=length(cameraPosition.xz-p);
        float w=wave(p),f=pow(1.-clamp(view.y,0.,1.),2.);
        vec3 c=mix(vec3(.12,.40,.48),vec3(.49,.57,.66),f);
        c+=vec3(.06,.11,.12)*w;
        vec3 n=normalize(vec3(w*.105+.015,1.,wave(p.yx*.83)*.096));
        float sparkle=dot(reflect(-normalize(vec3(-110.,78.,-63.)),n),view);
        c+=vec3(1.,.54,.19)*pow(max(0.,sparkle),128.)*.89;
        c=mix(c,vec3(.91,.67,.69),smoothstep(70.,620.,dist)*.88);
        gl_FragColor=vec4(c,1.);
      }`
  });
  const water=new T.Mesh(new T.PlaneGeometry(1100,1200),waterMat);water.rotation.x=-PI/2;water.position.set(-652,-1.03,0);root.add(water);

  const asphalt=canvasTexture(256,256,(c,w,h)=>{
    c.fillStyle='#434849';c.fillRect(0,0,w,h);
    for(let i=0;i<12500;i++){let k=rand()>.46?'255,232,208':'15,14,22';c.fillStyle='rgba('+k+','+between(.025,.11)+')';c.fillRect(rand()*w,rand()*h,between(.3,1.7),between(.3,1.7));}
    for(let i=0;i<5;i++){let x=rand()*w,y=rand()*h;c.beginPath();c.moveTo(x,y);for(let n=0;n<5;n++){x+=between(-3,4);y+=between(3,8);c.lineTo(x,y);}c.strokeStyle='rgba(32,28,40,.24)';c.lineWidth=.65;c.stroke();}
  },true);
  const pavement=canvasTexture(256,256,(c,w,h)=>{
    c.fillStyle='#adaeaa';c.fillRect(0,0,w,h);
    for(let r=0;r<4;r++)for(let col=-1;col<4;col++){
      const x=col*84+(r%2)*42,y=r*64;const v=Math.floor(between(166,188));
      c.fillStyle='rgb('+v+','+(v-9)+','+(v-10)+')';c.fillRect(x+1,y+1,82,62);
      c.fillStyle='rgba(255,235,214,.3)';c.fillRect(x+1,y+1,82,1);
    }
  },true);
  const surfaceLoader=new T.TextureLoader();
  const relief=(window.cityTexture?window.cityTexture(T,'beige_wall_001_nor_gl_1k.jpg'):surfaceLoader.load(window.cityAsset('beige_wall_001_nor_gl_1k.jpg')));
  relief.wrapS=relief.wrapT=T.RepeatWrapping;relief.anisotropy=4;
  const stucco=new Image();stucco.src=window.cityAsset('beige_wall_001_diff_1k.jpg');
  function ground(x,z,w,d,y,tex,meter,colour=0xffffff){
    const road=tex===asphalt,name=road?'belag':'quaistein';
    const actualMeter=road?14:2.85;
    const t=surface(name+'.jpg').clone();t.needsUpdate=true;t.repeat.set(w/actualMeter,d/actualMeter);
    const n=surface(name+'-n.jpg',true).clone(),r=surface(name+'-r.jpg',true).clone();
    n.repeat.copy(t.repeat);r.repeat.copy(t.repeat);n.needsUpdate=r.needsUpdate=true;
    const mat=new T.MeshStandardMaterial({map:t,normalMap:n,roughnessMap:r,color:road?0xb9b8b6:0xefefea,roughness:1,metalness:0});
    mat.normalScale.setScalar(road?.55:.62);
    const m=new T.Mesh(new T.PlaneGeometry(w,d),mat);m.rotation.x=-PI/2;m.position.set(x,y,z);m.receiveShadow=true;root.add(m);
  }
  ground(24,0,250,254,-.17,pavement,4);
  box(-101.7,-.65,0,2.2,1.45,254,0xb2a09b);
  for(const x of roadX)ground(x,0,12,253,-.1,asphalt,7);
  for(const z of roadZ)ground(23,z,249,12,-.09,asphalt,7);
  for(const x of roadX)for(let z=-122;z<123;z+=6){
    if(roadZ.some(i=>Math.abs(z-i)<10))continue;
    box(x,-.071,z,.12,.022,2.8,0xd9ded9,0,clay);
  }
  for(const z of roadZ)for(let x=-98;x<145;x+=6){
    if(roadX.some(i=>Math.abs(x-i)<10))continue;
    box(x,-.067,z,2.8,.025,.12,0xd9ded9,0,clay);
  }
  function zebra(x,z,crossX){
    for(let i=-4;i<=4;i++){
      const d=i*1.12;
      box(x+(crossX?0:d),-.058,z+(crossX?d:0),crossX?2.5:.55,.035,crossX?.55:2.5,0xe4bd45);
    }
  }
  for(const x of roadX)for(const z of roadZ){
    if(x===-80||z===-28||x===88){zebra(x,z+8,false);zebra(x+8,z,true);}
    for(const s of [-1,1])for(const d of [-1,1]){
      box(x+s*7,-.02,z+d*9,.22,.25,3,0xe2d0c1);
      box(x+s*9,-.02,z+d*7,3,.25,.22,0xe2d0c1);
    }
  }
  // Storm drains, individually jointed kerbs and repaired utility covers.
  const drainMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.71,metalness:.32});
  for(const x of roadX)for(let z=-94;z<97;z+=2.1){
    if(roadZ.some(a=>Math.abs(a-z)<8))continue;
    for(const side of [-1,1])box(x+side*6.08,-.06,z,.23,.24,2.069,(Math.round(z*10)%3)?0xa99e8c:0xb9ad99);
  }
  for(const z of roadZ)for(let x=-94;x<98;x+=2.1){
    if(roadX.some(a=>Math.abs(a-x)<8))continue;
    for(const side of [-1,1])box(x,-.06,z+side*6.08,2.069,.24,.23,0xaea494);
  }
  for(const x of roadX)for(const z of [-69,-43,9,49,73]){
    box(x+5.53,-.069,z,.60,.035,.91,0x514e48,0,drainMat);
    for(let n=-3;n<=3;n++)box(x+5.53,-.043,z+n*.105,.49,.018,.048,0x252b2c);
    cyl(x-1.85,-.072,z+3,.72,.032,.72,0x41454a,drainMat);
    for(let n=-2;n<=2;n++)box(x-1.85,-.049,z+3+n*.09,.45,.01,.017,0x727477,.10);
  }
  // Distant towers occupy the inland horizon and the north side of the bay.
  for(let i=0;i<148;i++){
    const side=i%3;
    const x=side===0?between(-130,240):side===1?between(132,240):between(-90,225);
    const z=side===0?between(-230,-135):side===1?between(-170,190):between(140,255);
    const w=between(6,16),d=between(6,16),h=between(11,53)+(side===1?10:0);
    const col=pick([0x8b9496,0xa3a6a2,0x90989b,0x7b878d,0xaba9a0]);
    box(x,h/2-.5,z,w,h,d,col);
    if(i%3===0)box(x,h+1.8,z,w*.72,4,d*.78,col);
    if(i%5===0)box(x,h+5,z,.16,9,.16,ink);
    if(i%2===0)for(let y=5;y<h-2;y+=4.2){
      box(x-w/2-.08,y,z,.13,.13,d*.84,0xa7b1ae);
      if(i%4===0)box(x,y,z-d/2-.08,w*.85,.13,.13,0xabb7ba);
    }
    // Economical background LOD: individual panes rather than blank tower slabs.
    for(let y=3;y<h-1.8;y+=3.35){
      for(let col=-w/2+1.2;col<w/2-.6;col+=2.1)box(x+col,y,z-d/2-.025,.83,1.44,.035,0x596f7a,0,glassmat);
      for(let col=-d/2+1.2;col<d/2-.6;col+=2.1)box(x-w/2-.025,y,z+col,.035,1.44,.83,0x63767b,0,glassmat);
    }
  }
  const facePalettes=[
    ['#c4c1b8','#e1dfd6','#827f76','#33434c','#a0aaa9'],
    ['#b9b3aa','#dedbd1','#857e74','#394b52','#a2a8a5'],
    ['#b5bcb5','#d7ddd7','#7d8c85','#354a52','#95aba9'],
    ['#aeb4b6','#d4d9da','#778287','#334b58','#98a8ae'],
    ['#c6bfae','#e7e0d3','#938a79','#3c4b50','#aab1ac'],
    ['#a1adb2','#d1d9d8','#72828a','#344b57','#8c9da4']
  ];
  const facadeMats=facePalettes.map(p=>{
    const tex=canvasTexture(512,256,(c,w,h)=>{
      c.fillStyle=p[0];c.fillRect(0,0,w,h);
      for(let i=0;i<5000;i++){c.fillStyle=rand()>.5?'rgba(255,239,215,.08)':'rgba(53,43,59,.06)';c.fillRect(rand()*w,rand()*h,1.7,1);}
      for(let n=0;n<4;n++){
        const x=n*128;
        c.fillStyle=p[1];c.fillRect(x+8,35,111,159);
        c.fillStyle=p[2];c.fillRect(x+13,39,101,148);
        const grad=c.createLinearGradient(x+15,40,x+100,180);
        grad.addColorStop(0,p[4]);grad.addColorStop(.43,p[3]);grad.addColorStop(.75,p[3]);grad.addColorStop(1,p[2]);
        c.fillStyle=grad;c.fillRect(x+18,44,91,135);
        if(rand()>.72){c.fillStyle='#d9b58b';c.fillRect(x+20,47,41,128);c.fillStyle='#b88f75';c.fillRect(x+22,50,8,121);}
        c.fillStyle='rgba(201,223,219,.15)';c.fillRect(x+22,48,4,125);
        c.fillStyle='rgba(37,45,59,.36)';c.fillRect(x+18,44,91,14);
        c.fillStyle=p[1];c.fillRect(x+61,43,4,134);c.fillRect(x+18,86,91,3);
        if(n===2){c.fillStyle=p[2];c.fillRect(x+18,44,91,35);c.strokeStyle=p[1];for(let k=47;k<80;k+=5){c.beginPath();c.moveTo(x+18,k);c.lineTo(x+108,k);c.stroke();}}
        c.fillStyle=p[2];c.fillRect(x+10,185,108,7);
        c.fillStyle=p[1];c.fillRect(x+7,181,114,5);
      }
      c.fillStyle=p[2];c.fillRect(0,242,w,7);c.fillStyle=p[1];c.fillRect(0,237,w,6);
    },true);
    tex.dispose();
    const file=['kalk','shutter','office','loft','ocker','kalk'][facePalettes.indexOf(p)];
    return new T.MeshStandardMaterial({map:surface(file+'.jpg'),color:0xffffff,roughness:file==='office'?.48:.82,metalness:file==='office'?.12:.015,envMapIntensity:.30});
  });
  const glazingStart=facadeMats.length;
  for(const file of ['kalk','shutter','office','loft','ocker','kalk'])facadeMats.push(new T.MeshPhysicalMaterial({map:surface(file+'.jpg'),color:0xdde4e2,roughness:.32,metalness:.045,clearcoat:.38,clearcoatRoughness:.24,envMapIntensity:.52}));
  const faceGroups=facadeMats.map(()=>({p:[],uv:[],indices:[]}));
  // Genuine recessed photographic window bays: the masonry and glazing never share a plane.
  const frameMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.38,metalness:.48});
  const revealMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.88});
  const wallMat=new T.MeshStandardMaterial({color:0xffffff,map:surface('klinker.jpg'),normalMap:surface('klinker-n.jpg',true),normalScale:new T.Vector2(.22,.22),roughness:.88});
  const roomMats=[0,1,2,3].map(k=>new T.MeshBasicMaterial({map:surface('innen-'+k+'.jpg'),color:0xc3bcac}));
  const windowRanges=[
    [.145,.38,.635,.871,.18,.71],[.14,.36,.618,.862,.18,.71],[.034,.477,.531,.954,.185,.795],
    [.068,.454,.554,.937,.215,.886],[.108,.383,.604,.89,.250,.729],[.145,.38,.635,.871,.18,.71]
  ];
  function quad(group,points,coords){
    const q=faceGroups[group],n=q.p.length/3;
    for(const p of points)q.p.push(...p);q.uv.push(...coords);q.indices.push(n,n+1,n+2,n,n+2,n+3);
  }
  function facade(x,y,z,dx,h,dz,theme){
    const len=Math.hypot(dx,dz),columns=Math.max(1,Math.round(len/5.1)),rows=Math.max(1,Math.round(h/3.15));
    const [left1,right1,left2,right2,sill,lintel]=windowRanges[theme],depth=theme===2?.13:.205;
    const ox=-dz/len,oz=dx/len;
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const pt=(u,v,d=0)=>[x+(col+u)*dx/columns+ox*d,y+(row+v)*h/rows,z+(col+u)*dz/columns+oz*d];
      const panel=(a,b,c,d,group=theme,inset=0)=>quad(group,[pt(a,b,inset),pt(c,b,inset),pt(c,d,inset),pt(a,d,inset)],[a,b,c,b,c,d,a,d]);
      panel(0,0,1,sill);panel(0,lintel,1,1);
      panel(0,sill,left1,lintel);panel(right1,sill,left2,lintel);panel(right2,sill,1,lintel);
      for(const [l,r] of [[left1,right1],[left2,right2]]){
        panel(l,sill,r,lintel,glazingStart+theme,-depth);
        for(const [a,b,c,d] of [[l,sill,r,sill],[r,sill,r,lintel],[r,lintel,l,lintel],[l,lintel,l,sill]])quad(theme,[pt(a,b),pt(c,d),pt(c,d,-depth),pt(a,b,-depth)],[a,b,c,d,c,d,a,b]);
        if(theme!==2&&theme!==3)quad(theme,[pt(l-.035,sill,.14),pt(r+.035,sill,.14),pt(r+.035,sill),pt(l-.035,sill)],[l-.035,sill-.025,r+.035,sill-.025,r+.035,sill,l-.035,sill]);
      }
    }
  }
  function addFacades(x,z,w,d,base,h,theme){
    const q=.016;
    facade(x-w/2,base,z+d/2+q,w,h,0,theme);
    facade(x+w/2,base,z-d/2-q,-w,h,0,theme);
    facade(x+w/2+q,base,z+d/2,0,h,-d,theme);
    facade(x-w/2-q,base,z-d/2,0,h,d,theme);
  }
  function label(text,sub,bg,fg,w,h,x,y,z,a,type='normal'){
    const tex=canvasTexture(1024,192,(c,cw,ch)=>{
      c.fillStyle=bg;c.fillRect(0,0,cw,ch);c.strokeStyle=fg;c.globalAlpha=.72;c.lineWidth=3;c.strokeRect(10,10,cw-20,ch-20);c.globalAlpha=1;
      c.textAlign='center';c.textBaseline='middle';c.fillStyle=fg;
      c.font='bold '+(sub?77:97)+'px '+(type==='serif'?'Georgia':'Arial');
      c.shadowColor=fg;c.shadowBlur=3;c.fillText(text,cw/2,sub?79:94,924);c.shadowBlur=0;
      if(sub){c.font='bold 24px Arial';c.fillText(sub,cw/2,145,880);}
    });
    const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
    m.rotation.y=a;m.position.set(x,y,z);root.add(m);
  }
  const shopNames=['LIDO','CAFÉ SEL','MARÉE','RIVAGE','CINÉ ASTRA','ORION','ATELIER 8','FLORA','LES DUNES','HOTEL IRIS','ARCADE','TERRASSE','AZUR','BAY CLUB'];
  let shopNo=0;
  function shop(x,z,w,d,levels,theme,a,opts={}){
    const h=3.7+levels*3.04, col=new T.Color(facePalettes[theme][0]).getHex();
    const trim=pick([0xd8d8cf,0xe2ded2,0xc9d4ce]),accent=opts.accent||pick([aqua,peach,orchid,gold]);
    const nx=Math.sin(a),nz=Math.cos(a),tx=Math.cos(a),tz=-Math.sin(a);
    const depth=(Math.abs(nx)>.5?w:d)/2, width=Math.abs(nx)>.5?d:w;
    const u=(along,out,y)=>[x+tx*along+nx*(depth+out),y,z+tz*along+nz*(depth+out)];
    const b=(along,out,y,sw,sh,sd,c,mat=clay)=>box(...u(along,out,y),sw,sh,sd,c,a,mat);
    box(x,h/2,z,w-2.4,h,d-2.4,0x59625e);block(x,z,w,d);shadowShells.push([x,h/2,z,w,h,d]);
    addFacades(x,z,w,d,3.65,h-3.65,theme);
    box(x,h-.08,z,w+.42,.35,d+.42,trim);
    box(x,h+.19,z,w+.68,.13,d+.68,0xaeb5b1);
    box(x,h+.38,z,w+.41,.27,d+.41,col);
    for(let i=0;i<2;i++){
      const cx=x+between(-w*.24,w*.24),cz=z+between(-d*.2,d*.2);
      box(cx,h+.65,cz,1.7,1,1.25,0x849298);
      for(let l=-.5;l<.6;l+=.23)box(cx+l,h+1.17,cz,.07,.04,1,0x4a5b66);
    }
    if(levels>3){
      const sw=w*.72,sd=d*.66;
      box(x,h+1.75,z,sw-1.52,3.5,sd-1.52,0x6b7473);shadowShells.push([x,h+1.75,z,sw,3.5,sd]);
      addFacades(x,z,sw,sd,h,3.3,theme);
      box(x,h+3.53,z,sw+.48,.25,sd+.48,trim);
      if(levels>5){
        box(x,h+4.95,z,w*.48,2.8,d*.4,col);
        for(let f=-1;f<=1;f++)box(x+f*.57,h+6.2,z,w*.035,2.5,d*.3,trim);
      }
    }
    const title=opts.name||shopNames[shopNo++%shopNames.length];
    const doorW=width*.19;
    b(0,-.98,1.48,width-.5,2.89,.04,0xffffff,roomMats[theme%4]);
    // Small shop interiors sit behind the glazing and in front of the recessed shell.
    for(let k=-1;k<=1;k++){
      const along=k*width*.27,wood=[0x625647,0x6b6655,0x56615d,0x656167][theme%4];
      b(along,-.52,.64,width*.17,.11,.54,wood);b(along,-.52,.35,.08,.54,.08,0x3b423e);
      b(along-width*.05,-.53,.82,width*.035,.28,.18,0xc4bcaa);
      b(along+width*.03,-.55,.91,width*.047,.45,.13,0x53645c);
    }
    // Leave a genuine door opening: two overlapping transparent sheets changed ordering with the view.
    const frontW=width-.5,sideW=(frontW-doorW)/2,doorTop=2.585,glassTop=2.925;
    for(const side of [-1,1])b(side*(doorW/2+sideW/2),.035,1.48,sideW,2.89,.025,0xc4d2d3,glassmat);
    b(0,.035,(doorTop+glassTop)/2,doorW,glassTop-doorTop,.025,0xc4d2d3,glassmat);
    for(let i=-2;i<=2;i++){
      const along=i*width/5;
      b(along,.09,1.4,.14,2.78,.09,trim);
      if(i!==0&&theme%2===0){b(along+width*.046,-.16,2.07,width*.064,.25,.025,0x6d756c);}
    }
    b(0,.055,1.31,doorW,2.55,.025,0x55717b,glassmat);b(0,.10,.10,doorW,.10,.10,0x778078);
    b(0,.10,1.29,.09,2.53,.08,trim);
    for(const side of [-1,1])b(side*doorW/2,.10,1.31,.08,2.64,.09,trim);
    b(0,.10,2.59,doorW+.08,.08,.09,trim);
    b(-doorW*.22,.17,1.1,.075,.57,.06,gold,lampmat);
    b(0,.41,3.07,width+.4,.3,1.12,trim);b(0,1,3.09,width+.46,.11,.08,0x939f9c);
    const signW=Math.min(width*.81,15.7);
    b(0,.08,3.78,signW+.28,1.06,.16,ink);
    label(title,opts.sub||'',opts.bg||'#344650',opts.fg||'#eef1eb',signW,1.0,...u(0,.215,3.78),a,opts.serif?'serif':'normal');
    if(opts.landmark){
      // Projecting fin and rows of polished Art Deco ribs make the mission buildings distinct from every approach.
      for(let f=-1;f<=1;f++)b(-width*.37+f*.48,.3,h*.56,.31,h+1.2-Math.abs(f)*.7,.6,trim);
      b(-width*.37,.68,h*.57,.12,h+.85,.14,0x7b9490);
      b(width*.39,1.8,3.34,1.3,.2,3.4,0x91aaa7);
      b(width*.39,3.25,1.58,.18,3.13,.18,trim);
    }else if(levels<4){
      const stripe=pick([0xb46671,0x719d97,0xc3906e]);
      for(let i=0;i<10;i++)b(width*(-.45+i*.1),.67,2.85,width*.1,.13,1.23,i%2?trim:stripe);
    }else{
      for(let f=-1;f<=1;f++)b(f*.44,.12,h*.62,.21,h*.7+.36*(1-Math.abs(f)),.34,trim);
    }
  }
  // Three independent landmarks share a continuous, navigable district.
  shop(-95.5,-53,10,18,2,2,PI/2,{name:'PFLEGEZENTRUM',sub:'AM QUAI',accent:aqua,bg:'#224654',fg:'#bcfff0',landmark:true});
  cyl(-96,12.6,-59,3.3,5.8,3.3,0xf7cfaf);
  cyl(-96,15.35,-59,3.9,.42,3.9,ink);
  cyl(-96,16.22,-59,2.88,1.57,2.88,0xffc484,lampmat);
  cyl(-96,17.13,-59,3.7,.28,3.7,ink);
  shop(13,-48,18.4,22.8,4,2,PI/2,{name:'GESUNDHEITSZENTRUM',sub:'AM PARK',accent:aqua,bg:'#284753',fg:'#b0ffed',landmark:true});
  shop(65.5,54,20,28,5,0,PI/2,{name:'SPITAL LINDENHAFEN',sub:'PATIENTENEMPFANG',accent:peach,bg:'#4e3c54',fg:'#ffdfa9',landmark:true});
  // The clinic has its own set-back ward tower and sheltered public entrance.
  shop(46,57,11.5,17,7,4,-PI/2,{name:'WESTFLÜGEL',bg:'#504751',fg:'#ffdcc2'});
  for(const [xi,cx] of [-52,4,60].entries())for(const [zi,cz] of [-56,0,56].entries()){
    if(xi===1&&zi===1)continue; // Central square
    if(xi===2&&zi===2)continue;
    for(let ix=-1;ix<=1;ix+=2)for(let iz=-1;iz<=1;iz+=2){
      if(xi===1&&zi===0&&ix===1)continue;
      const x=cx+ix*10.3,z=cz+iz*10.2;
      const w=between(14,17.4),d=between(13,17.2);
      const floor=xi===0?Math.floor(between(1,4)):Math.floor(between(2,7));
      shop(x,z,w,d,floor,(xi+zi+(ix+iz+2)/2+6)%6,ix===1?PI/2:-PI/2);
    }
  }
  for(const z of [-90,-15,33,83]){
    if(Math.abs(z+53)<17)continue;
    // Small kiosks leave a generous space for the waterfront promenade.
    shop(-95,z,6.2,8,1,pick([0,1,2]),PI/2);
  }
  for(const [i,z] of [-69,-36,-2,34,75].entries())shop(112,z,15,between(16,24),4+i%3,(i+2)%6,-PI/2);
  for(const sign of [-1,1])for(const [i,x] of [-52,-8,17,57,88].entries())shop(x,sign*109,between(14,22),15,2+i%3,(i+3)%6,sign===1?PI:0);

  for(let i=0;i<faceGroups.length;i++){
    const q=faceGroups[i];if(!q.indices.length)continue;
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(q.p,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(q.uv,2));g.setIndex(q.indices);g.computeVertexNormals();
    const mesh=new T.Mesh(g,facadeMats[i]);mesh.receiveShadow=true;root.add(mesh);
  }
  /* Each frond is a rib with individually modelled, tapered leaflets. All palms
     use one geometry and one instanced draw, including their curved bark. */
  function makePalm(){
    const pos=[],colors=[];
    function tri(a,b,c,colour){pos.push(...a,...b,...c);const cc=new T.Color(colour);for(let n=0;n<3;n++)colors.push(cc.r,cc.g,cc.b);}
    const leafs=[0x517f69,0x658b67,0x466e60,0x809363,0x547d5b,0x818b5c];
    function ring(y,r,phi){return [.5*(y/8)**2+r*Math.cos(phi),y,.23*Math.sin(y*.37)+r*Math.sin(phi)];}
    for(let i=0;i<24;i++){
      const y=i*.33,dy=.33,r=.26-.105*i/24,shade=i%3===0?0x917968:0x776b61;
      for(let j=0;j<8;j++){const a=j*TAU/8,b=(j+1)*TAU/8;const v=[ring(y,r+.027,a),ring(y,r+.027,b),ring(y+dy,r-.009,b),ring(y+dy,r-.009,a)];tri(v[0],v[2],v[1],shade);tri(v[0],v[3],v[2],shade);}
    }
    for(let i=0;i<13;i++){
      const ang=i*2.39996,dx=Math.cos(ang),dz=Math.sin(ang),sx=-dz,sz=dx;
      const spread=i%3===0?3.65:4.6, lift=i%3===0?2.8:1.35, drop=i%3===0?1.65:1.95;
      const p=(t,l=0,dy=0)=>[.49+dx*spread*t+sx*l,7.78+lift*Math.sin(t*2.48)-drop*t*t+dy,.05+dz*spread*t+sz*l];
      for(let k=0;k<13;k++){
        let t=k/13,next=(k+1)/13,c=leafs[i%leafs.length];
        tri(p(t,-.035),p(next,0),p(t,.035),0x849270);
        const width=.11+.57*Math.sin(Math.PI*(t*.92+.035));
        for(const side of [-1,1]){
          const base=p(t,0),near=p(t+.075,0),tip=p(Math.min(1.1,t+.094),side*width,-.27-width*.37);
          tri(base,near,tip,c);
        }
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  }
  const palmGeo=makePalm(),palmMat=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.9});
  const sprigImage=surface('platane-zweig.webp');sprigImage.wrapS=sprigImage.wrapT=T.ClampToEdgeWrapping;
  const deciduousBark=new T.MeshStandardMaterial({map:surface('platanenrinde.jpg'),normalMap:surface('platanenrinde-n.jpg',true),normalScale:new T.Vector2(.42,.42),roughness:.92});
  const foliage=new T.MeshStandardMaterial({map:sprigImage,alphaTest:.33,alphaToCoverage:true,side:T.DoubleSide,vertexColors:true,roughness:.86,metalness:0,emissive:0x879962,emissiveMap:sprigImage,emissiveIntensity:.095});
  const foliageDepth=new T.MeshDepthMaterial({map:sprigImage,alphaTest:.33,depthPacking:T.RGBADepthPacking,side:T.DoubleSide});
  const breeze={value:0};
  foliage.onBeforeCompile=program=>{
    program.uniforms.harborBreeze=breeze;
    program.vertexShader='uniform float harborBreeze;\n'+program.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vec2 anchor=instanceMatrix[3].xz;
      float gust=sin(harborBreeze*1.18+dot(anchor,vec2(.19,.13))+transformed.y*.67);
      float flutter=sin(harborBreeze*2.56+dot(transformed.xz,vec2(2.6,1.1)));
      transformed.xz+=vec2(1.,.36)*uv.y*uv.y*(.035*gust+.009*flutter);`);
    program.fragmentShader=program.fragmentShader.replace('#include <normal_fragment_begin>',`
      #include <normal_fragment_begin>
      #ifdef DOUBLE_SIDED
        normal*=faceDirection;
      #endif`);
  };
  dynamic.push(t=>{breeze.value=t;});
  function makePlaneTree(seed,slender,coarse=false){
    let state=seed;
    const random=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
    const vec=(x,y,z)=>new T.Vector3(x,y,z);
    const wood={p:[],uv:[],i:[]},leaves={p:[],uv:[],i:[],n:[],c:[]};
    function limb(points,radii,sides){
      if(coarse&&radii[0]<.045)return;
      if(coarse)sides=Math.min(sides,7);
      if(!coarse&&sides>=7){
        // Interpolate only the scaffold wood. Twigs retain short, straight segments.
        const smooth=new T.CatmullRomCurve3(points),steps=(points.length-1)*3,oldRadii=radii;
        points=smooth.getPoints(steps);
        radii=points.map((_,i)=>T.MathUtils.lerp(oldRadii[Math.floor(i/3)],oldRadii[Math.min(Math.floor(i/3)+1,oldRadii.length-1)],(i%3)/3));
      }
      const base=wood.p.length/3;
      let length=0;
      for(let row=0;row<points.length;row++){
        if(row)length+=points[row].distanceTo(points[row-1]);
        const axis=points[Math.min(points.length-1,row+1)].clone().sub(points[Math.max(0,row-1)]).normalize();
        const left=vec(0,0,1).cross(axis).normalize(),front=axis.clone().cross(left);
        for(let v=0;v<=sides;v++){
          const theta=v/sides*TAU,rad=radii[row]*(1+.047*Math.sin(3*theta+row*.19));
          const p=points[row].clone().addScaledVector(left,Math.cos(theta)*rad).addScaledVector(front,Math.sin(theta)*rad);
          wood.p.push(...p.toArray());wood.uv.push(v/sides,length*.67);
          if(row<points.length-1&&v<sides){
            const i=base+row*(sides+1)+v,j=i+sides+1;
            wood.i.push(i,i+1,j,j,i+1,j+1);
          }
        }
      }
    }
    function spray(root,out,span,roll,shade){
      const base=leaves.p.length/3;
      const normal=vec(root.x,Math.max(.28,(root.y-5.55)*.41),root.z).normalize();
      const side=vec(out.z,0,-out.x).normalize().applyAxisAngle(out,roll);
      const face=side.clone().cross(out).normalize();
      const colour=new T.Color().setRGB(shade*.94,shade,shade*.85);
      const steps=coarse?1:2;
      for(let v=0;v<=steps;v++)for(let u=0;u<=steps;u++){
        const x=u/steps-.5,y=v/steps;
        const p=root.clone().addScaledVector(out,span*y).addScaledVector(side,x*span*.95)
             .addScaledVector(face,span*(.22*x*x-.13*y*y));
        leaves.p.push(...p.toArray());leaves.uv.push(u/steps,y);leaves.n.push(...normal.toArray());leaves.c.push(colour.r,colour.g,colour.b);
        if(u<steps&&v<steps){
          const i=base+v*(steps+1)+u,j=i+steps+1;leaves.i.push(i,i+1,j,i+1,j+1,j);
        }
      }
    }
    const crownWidth=slender?.80:1.03,crownHeight=slender?1.18:1;
    const trunk=[vec(0,-.1,0),vec(.05,.40,-.025),vec(-.035,1.41,-.025),vec(.09,2.45,.055),vec(.19,3.45,.01),vec(.06,4.60,.13),vec(-.16,5.52,.14),vec(-.30,6.15,.16)];
    limb(trunk,[.22,.174,.151,.143,.125,.092,.054,.026],13);
    for(let j=0;j<10;j++){
      const yaw=j*2.39996+random()*.42,dx=Math.cos(yaw),dz=Math.sin(yaw),dir=vec(dx,0,dz),side=vec(-dz,0,dx);
      const origin=j<3?trunk[3]:j<6?trunk[4]:trunk[5];
      const lift=(j<5?2.00:2.64)*crownHeight,reach=(j<6?2.10:1.63)*crownWidth;
      const m=origin.clone().addScaledVector(dir,reach*.29).add(vec(0,lift*.47,0));
      const elbow=origin.clone().addScaledVector(dir,reach*.76).addScaledVector(side,(random()-.5)*.47).add(vec(0,lift*.73,0));
      const tip=origin.clone().addScaledVector(dir,reach).addScaledVector(side,(random()-.5)*.69).add(vec(0,lift,0));
      limb([origin,m,elbow,tip],[j<6?.095:.062,.064,.038,.014],7);
      // Leafy inward shoots fill the heart of the crown, which is visible from the pavement.
      for(let infill=0;infill<3;infill++){
        const phase=(infill-1)*.83,from=m.clone().lerp(elbow,.3+infill*.22);
        const ray=dir.clone().multiplyScalar(.30+random()*.38).addScaledVector(side,phase);
        ray.y=.74+random()*.29;ray.normalize();
        const stem=from.clone().addScaledVector(ray,.68);
        limb([from,stem],[.022,.008],5);
        for(const slant of [-1,1]){
          const r=ray.clone().addScaledVector(side,slant*.46).normalize();
          spray(stem,r,1.12+random()*.36,(random()-.5)*1.4,.69+random()*.23);
        }
      }
      for(let k=0;k<4;k++){
        const s=k%2===0?-1:1,start=k<2?elbow:tip;
        const twigDir=dir.clone().multiplyScalar(.62).addScaledVector(side,s*(.58+random()*.50));
        twigDir.y=.40+random()*.66;twigDir.normalize();
        const a=start.clone().addScaledVector(twigDir,.42),b=a.clone().addScaledVector(twigDir,.39).add(vec(0,.15,0));
        limb([start,a,b],[.031,.015,.005],5);
        const shade=.72+random()*.24;
        for(const lean of [-1,1]){
          const ray=twigDir.clone().multiplyScalar(.87).addScaledVector(side,lean*.46);
          ray.y+=(random()-.48)*.8;ray.normalize();
          spray(lean<0?a:b,ray,(1.05+random()*.50)*crownWidth,(random()-.5)*1.60,shade);
        }
      }
    }
    function geometry(data){
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(data.p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));geo.setIndex(data.i);
      if(data.n){geo.setAttribute('normal',new T.Float32BufferAttribute(data.n,3));geo.setAttribute('color',new T.Float32BufferAttribute(data.c,3));}
      else geo.computeVertexNormals();
      geo.computeBoundingSphere();return geo;
    }
    return {wood:geometry(wood),sprays:geometry(leaves)};
  }
  const planeTrees=[makePlaneTree(1426,false),makePlaneTree(58548,true)];
  const treeGeometries=new Set(planeTrees.flatMap(t=>[t.wood,t.sprays]));
  const shadowTex=canvasTexture(64,64,(c)=>{const g=c.createRadialGradient(32,32,1,32,32,32);g.addColorStop(0,'rgba(41,31,53,.29)');g.addColorStop(.52,'rgba(41,31,53,.15)');g.addColorStop(1,'rgba(41,31,53,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});
  const shadowMat=new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false});
  const shadowPlane=new T.PlaneGeometry(1,1);
  function softShadow(x,z,w,d,y=.009){instance(shadowPlane,shadowMat,x,y,z,w,d,1,0xffffff,-PI/2,0,0);}
  function palm(x,z,scale,collision=true){
    // Keep the original random stream and collider footprint; only the visible botany changes.
    const rotation=between(0,TAU),deciduous=Math.abs(Math.round(x*3+z*7))%5!==0;
    if(deciduous){
      const type=Math.abs(Math.round((x+z)*.63))%2,tree=planeTrees[type],tint=[0xf9f8ea,0xedf4e2,0xfff7de][Math.abs(Math.round(z))%3];
      instance(tree.wood,deciduousBark,x,0,z,scale,scale,scale,0xffffff,0,rotation,0);
      instance(tree.sprays,foliage,x,0,z,scale,scale,scale,tint,0,rotation,0);
    }else instance(palmGeo,palmMat,x,0,z,scale,scale,scale,0xffffff,0,rotation,0);
    softShadow(x+1.75*scale,z+.9*scale,6.4*scale,4.6*scale);
    if(collision){block(x,z,.48,.48);cyl(x,-.05,z,1.06,.12,1.06,0x847c74);}
  }
  for(let z=-94;z<=96;z+=11){
    if(Math.abs(z+52)>4)palm(-88.7,z,between(.84,1.25));
    if(Math.abs(z+52)>12&&z%4===0)palm(-99,z+.8,between(.84,1.15));
  }
  for(const x of roadX.slice(1))for(const z of [-96,-71,-48,-15,10,42,67,95]){
    if(targets.some(p=>Math.hypot(x-8.2-p.x,z-p.z)<5))continue;
    palm(x-8,z,between(.74,1.05));
  }
  for(const z of [-76,-20,35,92])for(const x of [-67,-42,-10,16,47,71])palm(x,z,between(.74,1));
  // Central civic garden: terracotta paving, stepped fountain and sculptural silver fins.
  box(4,-.045,0,37,.23,36,0xc19d8d);
  for(const [x,z] of [[-8,-11],[16,-10],[-8,11],[16,11]]){
    box(x,.11,z,7,.3,7,0xd9bfb0);box(x,.3,z,6.3,.13,6.3,0x76916f);palm(x,z,.97);
  }
  for(let y=0;y<3;y++)cyl(4,.18+y*.22,0,9-y*.65,.25,9-y*.65,0xc9aba4);
  cyl(4,.68,0,7.4,.15,7.4,0x74bbb8,glassmat);
  for(let i=0;i<3;i++)instance(taper,clay,3+i*.65,2.3,0,.55,3.6+i*.42,.91,[0x8caeb5,0xe0b085,0x8298a0][i],0,i*.5,-.2+i*.14);
  block(4,0,7.1,7.1);
  const benchWoodMap=canvasTexture(512,128,(c,w,h)=>{
    c.fillStyle='#99734e';c.fillRect(0,0,w,h);
    for(let i=0;i<320;i++){
      const y=(i*71.37)%h,bend=Math.sin(i*2.17)*1.8;
      c.strokeStyle=i%4===0?'rgba(54,35,19,.23)':'rgba(229,196,143,.13)';c.lineWidth=i%5===0?1.2:.48;
      c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.32,y+bend,w*.67,y-bend,w,y+.4*bend);c.stroke();
    }
  },true);benchWoodMap.anisotropy=8;
  const benchWood=new T.MeshStandardMaterial({color:0xdac9ad,map:benchWoodMap,roughness:.86,metalness:0,envMapIntensity:.22});
  const benchMetal=new T.MeshStandardMaterial({color:0x34464b,roughness:.66,metalness:.63});
  // One rounded board is reused across all seats; its rotated copy forms the back slats.
  const bw=2.03,bd=.085,br=.018,shape=new T.Shape();
  shape.moveTo(-bw/2+br,-bd/2);shape.lineTo(bw/2-br,-bd/2);shape.quadraticCurveTo(bw/2,-bd/2,bw/2,-bd/2+br);
  shape.lineTo(bw/2,bd/2-br);shape.quadraticCurveTo(bw/2,bd/2,bw/2-br,bd/2);shape.lineTo(-bw/2+br,bd/2);
  shape.quadraticCurveTo(-bw/2,bd/2,-bw/2,bd/2-br);shape.lineTo(-bw/2,-bd/2+br);shape.quadraticCurveTo(-bw/2,-bd/2,-bw/2+br,-bd/2);
  const benchSeatGeo=new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.006,bevelThickness:.006,curveSegments:3});
  benchSeatGeo.rotateX(-PI/2);benchSeatGeo.center();
  const uv=benchSeatGeo.attributes.uv,pos=benchSeatGeo.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/bw+.5,pos.getZ(i)/bd+.5);
  uv.needsUpdate=true;const benchBackGeo=benchSeatGeo.clone().rotateX(PI/2);
  function bench(x,z,ang){
    const ox=Math.sin(ang),oz=Math.cos(ang),tx=oz,tz=-ox;
    const floor=x>-14.5&&x<22.5&&z>-18&&z<18?.07:-.17;
    const point=(along,out,y)=>[x+along*tx+out*ox,floor+y,z+along*tz+out*oz];
    const frame=(along,out,y,w,h,d)=>box(...point(along,out,y),w,h,d,0xffffff,ang,benchMetal);
    for(let row=-2;row<=2;row++)instance(benchSeatGeo,benchWood,...point(0,row*.105,.43),1,1,1,0xffffff,0,ang,0);
    for(let row=0;row<3;row++)instance(benchBackGeo,benchWood,...point(0,.235,.63+row*.115),1,1,1,row===1?0xf3e8d4:0xffffff,0,ang,0);
    for(const side of [-1,1]){
      frame(side*.76,0,.385,.065,.055,.49);
      for(const out of [-.19,.19]){frame(side*.76,out,.205,.055,.385,.055);frame(side*.76,out,.0125,.10,.025,.12);}
      frame(side*.79,.235,.65,.055,.58,.055);
      frame(side*.93,0,.64,.055,.045,.43);frame(side*.93,-.18,.535,.055,.20,.055);
    }
    softShadow(x,z,2.7,1.05,floor+.009);
  }
  function lamp(x,z,ang=0){
    const nx=Math.sin(ang),nz=Math.cos(ang);
    cyl(x,.24,z,.39,.49,.39,0x686779);
    instance(taper,clay,x,2.75,z,.14,5.5,.14,0x68747f);
    beam(new T.Vector3(x,5.3,z),new T.Vector3(x+nx*1.13,5.64,z+nz*1.13),.09,0x697784);
    box(x+nx*1.06,5.58,z+nz*1.06,.43,.16,.72,0x5d636e,ang);
    box(x+nx*1.06,5.48,z+nz*1.06,.32,.04,.55,0xffe7bc,ang,lampmat);
  }
  for(const x of roadX)for(const z of [-97,-71,-44,-15,12,44,71,97]){
    lamp(x+7.35,z,-PI/2);
  }
  for(const z of [-91,-70,-40,-9,11,39,69,90]){bench(-99,z,-PI/2);lamp(-100,z,PI/2);}
  bench(-5,-4,PI/2);bench(13,4,-PI/2);bench(1,11,0);
  // Quayside rail and bollards, piers, boats, cranes.
  for(let z=-124;z<124;z+=4){
    if(Math.abs(z+51)<5||Math.abs(z-38)<5)continue;
    cyl(-101.35,.52,z,.14,1.18,.14,ink);
    box(-101.35,.96,z+2,.085,.075,4.07,0xb6a8a0);
    box(-101.35,.53,z+2,.048,.055,4.07,0x77828a);
  }
  for(const z of [-51,38]){
    box(-111,-.13,z,17.8,.53,3.4,0x957866);
    for(let x=-119;x<-102;x+=.6)box(x,.147,z,.045,.021,3.39,0x6c5c5e);
    for(let x=-119;x<=-102;x+=5.5)for(const q of [-1,1]){
      cyl(x,-.35,z+q*1.5,.37,2.85,.37,0x79665c);cyl(x,1.1,z+q*1.5,.42,.1,.42,0xdfae81);
    }
  }
  function sailboat(x,z,size,a,accent){
    const group=new T.Group();group.position.set(x,-.93,z);group.rotation.y=a;group.scale.setScalar(size);root.add(group);
    const hull=new T.Mesh(new T.SphereGeometry(1,12,7),new T.MeshStandardMaterial({color:0xedddc9,roughness:.48}));hull.scale.set(1.08,.51,3.05);group.add(hull);
    const deck=new T.Mesh(new T.BoxGeometry(1.45,.29,3.2),new T.MeshStandardMaterial({color:0x946c53}));deck.position.y=.29;group.add(deck);
    const mast=new T.Mesh(new T.CylinderGeometry(.046,.065,6.5,6),clay);mast.position.y=3.49;group.add(mast);
    const sails=new T.BufferGeometry();sails.setAttribute('position',new T.Float32BufferAttribute([0,.91,-.14,0,6.61,-.14,.18,1.32,-2.3, 0,.92,.14,0,5.88,.14,-.16,.96,1.79],3));sails.computeVertexNormals();
    const cloth=new T.Mesh(sails,new T.MeshStandardMaterial({color:accent,side:T.DoubleSide}));group.add(cloth);
    const ph=rand()*TAU;dynamic.push(t=>{group.position.y=-.92+.09*Math.sin(t*.6+ph);group.rotation.z=.025*Math.sin(t*.49+ph);});
  }
  sailboat(-121,-45,1.13,.54,0xffdbc2);sailboat(-129,35,1.45,-.24,0xefb790);sailboat(-148,-5,1.9,1.1,0xf1d8bd);
  // Port across the water. Latticework and containers give the bay a recognisable silhouette.
  box(-159,-.47,-133,97,.82,43,0xab9095);
  for(let i=0;i<38;i++){
    const x=-193+(i%10)*7.1,z=-133+Math.floor(i/10)*4.4;
    box(x,1.1,z,6.4,2.3,2.85,pick([0xb3777d,0x758b91,0xafa080,0x817b8e]));
  }
  for(const x of [-182,-153,-128]){
    const z=-126;
    for(const dx of [-3.2,3.2])for(const dz of [-2.5,2.5])box(x+dx,8,z+dz,.45,16,.45,0xac7876);
    for(let y=2;y<16;y+=4){beam(new T.Vector3(x-3.2,y,z+2.5),new T.Vector3(x+3.2,y+4,z+2.5),.18,0xad7b79);}
    box(x,16.1,z,7.4,.74,6,0xa77979);
    beam(new T.Vector3(x,16.5,z),new T.Vector3(x,22,z+20),.52,0xb7827c);
    beam(new T.Vector3(x,24,z-2),new T.Vector3(x,21.7,z+20),.14,0x826876);
    box(x,20,z,.48,8,.48,0xa16f77);box(x,17.15,z+19,.08,9,.08,0x8a737c);
  }
  const parkedCars=[[-75,-67,0,0xc98a73],[-75,-39,0,0x83a59d],[-75,42,0,0xc9b695],[-29,-9,PI,0xc99396],[27,3,PI,0x8297ad],[37,61,0,0xeaac8b],[83,11,PI,0x84918d],[-48,23,PI/2,0x9b94aa],[8,-33,PI/2,0xe5b190],[61,-23,-PI/2,0x9bafad]];
  // Detailed signal heads, pedestrian signs and bins at the busier junctions.
  for(const [x,z] of [[-80,-28],[-24,-28],[32,-28],[32,28],[88,28],[-24,84]]){
    const px=x+6.8,pz=z-6.9;cyl(px,1.72,pz,.12,3.5,.12,ink);
    box(px,3.72,pz,.4,1.02,.37,0x393e49);
    for(let i=0;i<3;i++){instance(oval,i===2?lampmat:clay,px,4.02-i*.29,pz+.189,.235,.235,.065,i===2?0x9deed1:i===0?0x8b575e:0x8d7c60);}
  }
  for(const [x,z] of [[-91,-39],[21,-61],[76,42],[-11,-17],[17,13]]){
    cyl(x,.49,z,.72,1.03,.72,0x667e7f);cyl(x,1.04,z,.77,.12,.77,0x394c57);
  }
  // Distinct moving silhouettes lift the bay view without impacting navigation.
  const birds=new T.Group();root.add(birds);
  const verts=[];
  for(let i=0;i<7;i++){
    const x=between(-8,8),y=between(-2.4,2.4),z=between(-7,7);
    verts.push(x-.95,y+.23,z,x-.41,y+.36,z,x,y,z+.12,x,y,z+.12,x+.43,y+.38,z,x+.98,y+.19,z);
  }
  const birdGeo=new T.BufferGeometry();birdGeo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
  birds.add(new T.Mesh(birdGeo,new T.MeshBasicMaterial({color:0x655c72,side:T.DoubleSide})));
  dynamic.push(t=>{birds.position.set(-126+Math.sin(t*.033)*8,15+Math.sin(t*.11),Math.sin(t*.029)*33);birds.rotation.y=t*.039;});

  // Sidewalk routes stay off the carriageways and avoid the objective markers.
  const walkers=[
    [-87.15,16,-87.15,-8,0xcd8869,0x738c8d,0x3b414f,0x4a3532],
    [-71.15,-68,-71.15,-39,0x966a50,0xe7c68e,0x4e6578,0x352b32],
    [-30.76,16,-30.76,-17,0xdcb095,0xb67186,0x45686d,0x795347],
    [39.9,-65,39.9,-38,0xba8a69,0x5f9294,0xc1aa86,0x3c3032],
    [80.6,65,80.6,44,0xcd9874,0xac8ea4,0x475569,0x4c3b36],
    [-97.8,-25,-97.8,-39,0x936747,0xd4aa8e,0x444c68,0x302b32],
    [-14,-20.85,16,-20.85,0xdca684,0x74869f,0x736956,0x655344],
    [15,20.9,-13,20.9,0xab7d5b,0xc6c2ae,0x4d6665,0x554038],
    [-87.5,37,-87.5,75,0xd4ac8c,0x677f91,0x414b57,0x524339],
    [-72.5,-19,-72.5,19,0x9c725a,0x9b7d69,0x374a56,0x352b27],
    [-31.5,-70,-31.5,-57,0xe2b69a,0x6e8a7d,0x525264,0x6a5140],
    [-16.5,37,-16.5,75,0xbb8d70,0xb3a68a,0x455a62,0x40332e],
    [24.5,-70,24.5,-51,0xd7ab8e,0x798caa,0x4b4d55,0x77614c],
    [39.5,-19,39.5,19,0x997154,0xb4867f,0x455e64,0x332927],
    [80.5,-70,80.5,-49,0xd9b396,0x8e9b87,0x4d4a57,0x6e5647],
    [95.5,37,95.5,75,0xba8b70,0x8d819a,0x4c5b64,0x46362e],
    [-66,-76.5,-43,-76.5,0xdbaf92,0xb5a58b,0x3d5361,0x5e4939],
    [48,35.5,70,35.5,0x9e765d,0x79998c,0x4d4b5b,0x382d29],
    [-87.6,-75,-87.6,-60,0xc99476,0x777e91,0x4d5361,0x5a4338],
    [-72.6,38,-72.6,69,0xb38a69,0xa18e78,0x42515d,0x3d322d],
    [-16.8,-70,-16.8,-42,0xd1a082,0x657d92,0x4e525b,0x695247],
    [24.7,36,24.7,70,0xc49b81,0x849c88,0x3b4d58,0x4b3931],
    [39.7,38,39.7,67,0x99745a,0xb0917b,0x3d5367,0x40342e],
    [95.6,-70,95.6,-42,0xd6ae90,0x8d7c99,0x45505b,0x74564a],
    [-12,-35.6,12,-35.6,0xa87d62,0x7d8c72,0x4a4f60,0x3e302c],
    [-7,76.4,14,76.4,0xc99d7e,0x9c8594,0x4a5c64,0x5a4336]
  ];
  const observer={x:spawn.x,z:spawn.z};
  const pedestrians=walkers.map(([x,z],id)=>({x,z,id}));
  function makeWalkers(routes){
    const shapes=[new T.SphereGeometry(.5,10,8),new T.CylinderGeometry(.43,.5,1,9)];
    const counts=[0,0],units=[],orient=new T.Object3D(),pigment=new T.Color();
    const makePart=(type,col)=>({type,idx:counts[type]++,col});
    for(let i=0;i<routes.length;i++){
      const [x,z,ex,ez,skin,shirt,trousers,hair]=routes[i];
      const parts={core:makePart(0,shirt),hips:makePart(0,trousers),neck:makePart(1,skin),
        head:makePart(0,skin),hair:makePart(0,hair),nose:makePart(0,skin)};
      const legs=[],arms=[];
      for(const side of [-1,1]){
        legs.push({side,thigh:makePart(1,trousers),shin:makePart(1,trousers),shoe:makePart(0,i%3===0?0xb3a391:0x373d47)});
        arms.push({side,upper:makePart(1,shirt),fore:makePart(1,skin),hand:makePart(0,skin)});
      }
      const bag=i%3===0?makePart(0,0x735543):null;
      const tail=i%3===2?makePart(0,hair):null;
      const length=Math.hypot(ex-x,ez-z);
      const anchor=new T.Group();root.add(anchor);
      const actor=window.People3D.attach(anchor,{sex:i%2?'female':'male',height:1.65+(i%4)*.065,
        shirt,pants:trousers,hair,skin:[0xffe4d2,0xab765a,0xfff9ed,0xd5a689][i%4],phase:i*.11});
      pedestrians[i].anchor=anchor;pedestrians[i].actor=actor;
      units.push({anchor,actor,id:i,x,z,ex,ez,length,parts,legs,arms,bag,tail,size:.93+(i%5)*.027,
        animationDt:0,shadowActive:null,pace:.85+(i%4)*.09,offset:(i*.173%1)*length,axis:Math.atan2(ex-x,ez-z)});
    }
    const meshes=shapes.map((geo,type)=>{
      const m=new T.InstancedMesh(geo,clay,counts[type]);m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.castShadow=true;m.frustumCulled=false;root.add(m);return m;
    });
    // Colours are fixed; only the small matrix buffers move.
    units.forEach(u=>{
      const parts=[...Object.values(u.parts),u.bag,u.tail];
      u.legs.forEach(l=>parts.push(l.thigh,l.shin,l.shoe));u.arms.forEach(a=>parts.push(a.upper,a.fore,a.hand));
      parts.filter(Boolean).forEach(p=>meshes[p.type].setColorAt(p.idx,pigment.set(p.col)));
    });
    let previous=0;
    function draw(t){
      const dt=Math.min(.06,Math.max(0,t-previous));previous=t;
      let x,z,yaw,size,cos,sin;
      function translate(l,y,f){return [x+size*(l*cos+f*sin),y*size,z+size*(-l*sin+f*cos)];}
      function part(p,l,y,f,w,h,d,rx=0){
        orient.position.set(...translate(l,y,f));orient.rotation.set(rx,yaw,0,'YXZ');
        orient.scale.set(w*size,h*size,d*size);orient.updateMatrix();meshes[p.type].setMatrixAt(p.idx,orient.matrix);
      }
      function limb(p,l,y,f,r,length,axis){
        const ang=axis,dy=-Math.cos(ang)*length,dz=Math.sin(ang)*length;
        part(p,l,y+dy/2,f+dz/2,r,length,r,-ang);
        return [y+dy,f+dz];
      }
      for(const u of units){
        const s=(u.offset+t*u.pace)%(u.length*2),back=s>u.length;
        const along=(back?2*u.length-s:s)/u.length;
        x=u.x+(u.ex-u.x)*along;z=u.z+(u.ez-u.z)*along;
        const toEnd=Math.min(s,2*u.length-s,Math.abs(u.length-s));
        yaw=u.axis+(back?PI:0);
        // Faces gently round rather than snapping at a waypoint.
        if(toEnd<.38){
          const dir=s<u.length*.5||s>1.5*u.length?-1:1;
          yaw+=(back?-1:1)*dir*(1-toEnd/.38)*PI*.5;
        }
        const npc=pedestrians[u.id];npc.x=x;npc.z=z;
        u.anchor.position.set(x,-.17,z);u.anchor.rotation.y=yaw;
        if(u.actor.ready){
          const distance2=(x-observer.x)**2+(z-observer.z)**2,interval=distance2<55*55?0:distance2<105*105?.05:.125;
          u.animationDt+=dt;
          if(u.animationDt+1e-7>=interval){u.actor.update(u.animationDt,u.pace);u.animationDt=0;}
          const shadow=distance2<65*65;
          if(u.shadowActive!==shadow&&u.actor.figure){u.actor.figure.traverse(o=>{if(o.isMesh)o.castShadow=shadow;});u.shadowActive=shadow;}
          if(!u.hidden){
            const all=[...Object.values(u.parts),u.bag,u.tail,...u.legs.flatMap(l=>[l.thigh,l.shin,l.shoe]),...u.arms.flatMap(a=>[a.upper,a.fore,a.hand])];
            const empty=new T.Matrix4().makeScale(0,0,0);
            all.filter(Boolean).forEach(p=>meshes[p.type].setMatrixAt(p.idx,empty));u.hidden=true;
          }
          continue;
        }
        size=u.size;cos=Math.cos(yaw);sin=Math.sin(yaw);
        const gait=t*u.pace*6.4+u.offset;
        const wave=Math.sin(gait),lift=Math.abs(Math.cos(gait))*.023;
        const hip=.81+lift,shoulder=1.37+lift,p=u.parts;
        part(p.core,0,1.125+lift,.013,.39,.56,.259,-.04);part(p.hips,0,hip+.04,0,.335,.24,.25);
        part(p.neck,0,1.433+lift,.02,.126,.112,.125);
        part(p.head,0,1.58+lift,.033,.226,.283,.217);
        part(p.hair,0,1.681+lift,.014,.229,.139,.223);
        part(p.nose,0,1.57+lift,.14,.063,.078,.062);
        if(u.bag)part(u.bag,0,1.13+lift,-.132,.28,.36,.17);
        if(u.tail)part(u.tail,0,1.52+lift,-.09,.123,.245,.105,-.22);
        for(const l of u.legs){
          const swing=wave*l.side,thigh=.38*swing,knee=thigh-.22*(1-swing);
          const [ky,kf]=limb(l.thigh,l.side*.086,hip,0,.143,.385,thigh);
          const [ay,af]=limb(l.shin,l.side*.09,ky,kf,.114,.368,knee);
          part(l.shoe,l.side*.09,Math.max(.055,ay-.017),af+.045,.141,.108,.233);
        }
        for(const a of u.arms){
          const swing=-wave*a.side*.37;
          const [ey,ef]=limb(a.upper,a.side*.177,shoulder,.005,.117,.241,swing);
          const [hy,hf]=limb(a.fore,a.side*.188,ey,ef,.089,.203,swing+.22);
          part(a.hand,a.side*.19,hy-.045,hf,.091,.135,.084);
        }
      }
      const needsFallback=units.some(u=>!u.hidden);for(const m of meshes){m.visible=needsFallback;if(needsFallback)m.instanceMatrix.needsUpdate=true;}
    }
    draw(0);dynamic.push(draw);
  }
  makeWalkers(walkers);
  // Simplified casters keep the small mouldings and distant skyline out of the shadow pass.
  const shellMaterial=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  const shells=new T.InstancedMesh(boxGeom,shellMaterial,shadowShells.length);
  shadowShells.forEach(([x,y,z,w,h,d],i)=>{
    temp.position.set(x,y,z);temp.rotation.set(0,0,0);temp.scale.set(w,h,d);temp.updateMatrix();shells.setMatrixAt(i,temp.matrix);
  });
  shells.instanceMatrix.needsUpdate=true;shells.castShadow=true;root.add(shells);

  // Spatially bounded GPU batches let the frustum reject hidden city districts.
  // Preserve every original instance transform, colour, material and collider.
  const pc=new T.Color();
  for(const [geom,byMat] of batches)for(const [mat,list] of byMat){
    const cells=new Map();
    for(const item of list){const m=item[0].elements,key=(list.length>512||treeGeometries.has(geom))?Math.floor(m[12]/64)+'/'+Math.floor(m[14]/64):'all';if(!cells.has(key))cells.set(key,[]);cells.get(key).push(item);}
    for(const [key,items] of cells){
      const mesh=new T.InstancedMesh(geom,mat,items.length);mesh.name='city_batch_'+key;
      items.forEach(([matrix,col],i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,pc.set(col));});
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      if(geom===boxGeom&&(mat===clay||mat===wallMat||mat===revealMat||mat===frameMat))mesh.receiveShadow=true;
      if(geom===benchSeatGeo||geom===benchBackGeo||mat===benchMetal){mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='city_bench_'+key;}
      if(mat===palmMat||treeGeometries.has(geom)){mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='city_tree_'+key;}
      if(mat===foliage)mesh.customDepthMaterial=foliageDepth;
      if(mat===shadowMat)mesh.renderOrder=1;
      mesh.computeBoundingSphere();root.add(mesh);
    }
  }
  label('WOHNEN AM PARK','ABHOLZONE','#26484e','#ddfff0',7.2,.8,-37,3.6,54,Math.PI/2);
  label('REHA UFERBLICK','PATIENTENEMPFANG','#3b415b','#fff0cf',7.2,.8,-37,3.6,-52,Math.PI/2);
  return {blocks,targets,spawn,carSpawn,bounds,parkedCars,pedestrians,
    update(dt,time,viewerPosition){if(viewerPosition&&Number.isFinite(viewerPosition.x)&&Number.isFinite(viewerPosition.z)){observer.x=viewerPosition.x;observer.z=viewerPosition.z;}const t=Number.isFinite(time)?time:0;waterMat.uniforms.t.value=t;for(const f of dynamic)f(t);}
  };
};
