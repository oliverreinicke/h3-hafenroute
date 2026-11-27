/* Original local-only GCB Pub interior and food props. No external requests beyond retained city assets. */
window.GCBPub=(()=>{
  function create(T,parent,{x=-95,z=-15,w=6.2,d=8}={}){
    const PI=Math.PI,hx=w/2,hz=d/2,floorY=-.15,root=new T.Group();root.name='gcb_pub';root.position.set(x,0,z);parent.add(root);
    const blocks=[],actors=[],buckets=new Map(),textures=[],lights=[],orders=new Map();
    let seed=91432,disposed=false;
    const random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
    function canvasTexture(width,height,paint){
      const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'),width,height);
      const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;textures.push(tx);return tx;
    }
    function surface(name,normal=false,rx=1,ry=1){
      const tx=window.cityTexture?window.cityTexture(T,name):new T.TextureLoader().load(window.cityAsset(name));
      tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(rx,ry);tx.anisotropy=4;tx.colorSpace=normal?T.NoColorSpace:T.SRGBColorSpace;textures.push(tx);return tx;
    }
    const timber=canvasTexture(256,512,(c,tw,th)=>{
      c.fillStyle='#88613e';c.fillRect(0,0,tw,th);
      for(let plank=0;plank<5;plank++){
        const sx=plank*tw/5;c.fillStyle=['#8a6541','#795838','#916b45','#805c3b','#89603d'][plank];c.fillRect(sx+1,0,tw/5-2,th);
        c.fillStyle='#433c2c';c.fillRect(sx,0,1.5,th);
        for(let j=0;j<18;j++){const a=sx+2+random()*(tw/5-4);c.strokeStyle='rgba(42,27,15,'+(.045+random()*.07)+')';c.lineWidth=.4+random()*.65;c.beginPath();c.moveTo(a,0);c.bezierCurveTo(a-3,th*.32,a+4,th*.66,a,th);c.stroke();}
      }
      for(let i=0;i<850;i++){c.fillStyle=random()>.5?'rgba(255,235,188,.05)':'rgba(28,22,15,.05)';c.fillRect(random()*tw,random()*th,.7,1.6);}
    });timber.wrapS=timber.wrapT=T.RepeatWrapping;
    const floorMap=timber.clone();floorMap.repeat.set(4,2);textures.push(floorMap);
    const greenGrain=canvasTexture(128,256,(c,tw,th)=>{
      c.fillStyle='#24483d';c.fillRect(0,0,tw,th);
      for(let i=0;i<180;i++){c.strokeStyle=i%2?'rgba(8,19,13,.07)':'rgba(190,204,162,.035)';const a=random()*tw;c.beginPath();c.moveTo(a,0);c.bezierCurveTo(a-3,th*.25,a+4,th*.8,a,th);c.stroke();}
    });greenGrain.wrapS=greenGrain.wrapT=T.RepeatWrapping;greenGrain.repeat.set(2,1);
    const brickMap=surface('h3-v6-klinker.jpg',false,2.4,1.15),brickNormal=surface('h3-v6-klinker-n.jpg',true,2.4,1.15);
    const fabricNormal=surface('fabric_pattern_07_nor_gl_1k.jpg',true,5,5);
    const standard=p=>new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,...p});
    const mats={
      timber:standard({map:timber,roughness:.52,metalness:.015}),
      floor:standard({map:floorMap,roughness:.72,metalness:0}),
      green:standard({map:greenGrain,roughness:.49,metalness:.015}),
      brick:standard({map:brickMap,normalMap:brickNormal,normalScale:new T.Vector2(.35,.35),roughness:.92}),
      plaster:standard({color:0xc5b79d,roughness:.94}),
      dark:standard({color:0x202a25,roughness:.66,metalness:.11}),
      leather:standard({color:0x683b35,normalMap:fabricNormal,normalScale:new T.Vector2(.075,.075),roughness:.78}),
      brass:standard({color:0xbb9653,roughness:.28,metalness:.82}),
      glass:new T.MeshPhysicalMaterial({color:0xc7d4cb,vertexColors:true,roughness:.15,metalness:.015,transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,clearcoat:.5,envMapIntensity:.5}),
      bottle:standard({roughness:.23,metalness:.03}),
      ceramic:standard({color:0xe9e5d8,roughness:.25,metalness:.015}),
      food:standard({roughness:.82,metalness:0}),
      glow:new T.MeshStandardMaterial({color:0xffd795,emissive:0xffbc62,emissiveIntensity:1.45,roughness:.5,vertexColors:true}),
      menu:new T.MeshBasicMaterial({color:0xffffff,vertexColors:true})
    };
    const cube=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,10),sphere=new T.SphereGeometry(1,12,8);
    const transform=new T.Matrix4(),rotation=new T.Quaternion(),euler=new T.Euler(),position=new T.Vector3(),scale=new T.Vector3(),color=new T.Color();
    function add(bucket,key,g,px=0,py=0,pz=0,sx=1,sy=1,sz=1,col=0xffffff,rx=0,ry=0,rz=0){
      position.set(px,py,pz);scale.set(sx,sy,sz);euler.set(rx,ry,rz);rotation.setFromEuler(euler);transform.compose(position,rotation,scale);g.applyMatrix4(transform);
      const colors=new Float32Array(g.attributes.position.count*3);color.set(col);for(let at=0;at<colors.length;at+=3){colors[at]=color.r;colors[at+1]=color.g;colors[at+2]=color.b;}g.setAttribute('color',new T.BufferAttribute(colors,3));
      if(!bucket.has(key))bucket.set(key,[]);bucket.get(key).push(g);
    }
    const box=(key,px,py,pz,sx,sy,sz,col=0xffffff,ry=0,bucket=buckets)=>add(bucket,key,cube.clone(),px,py,pz,sx,sy,sz,col,0,ry,0);
    const cyl=(key,px,py,pz,r,h,col=0xffffff,bucket=buckets)=>add(bucket,key,cylinder.clone(),px,py,pz,r,h,r,col);
    const ball=(key,px,py,pz,sx,sy,sz,col=0xffffff,bucket=buckets)=>add(bucket,key,sphere.clone(),px,py,pz,sx,sy,sz,col);
    function rod(key,a,b,r,col=0xffffff,bucket=buckets){
      const delta=new T.Vector3().subVectors(b,a),mid=new T.Vector3().addVectors(a,b).multiplyScalar(.5),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
      const g=cylinder.clone();g.scale(r,delta.length(),r);g.applyQuaternion(q);g.translate(mid.x,mid.y,mid.z);add(bucket,key,g,0,0,0,1,1,1,col);
    }
    function merge(parts){
      const gs=parts.map(g=>{if(!g.index)return g;const flat=g.toNonIndexed();g.dispose();return flat;}),count=gs.reduce((a,g)=>a+g.attributes.position.count,0),out=new T.BufferGeometry();
      for(const [key,size]of[['position',3],['normal',3],['uv',2],['color',3]]){
        const values=new Float32Array(count*size);let at=0;for(const g of gs){values.set(g.attributes[key].array,at);at+=g.attributes.position.count*size;}out.setAttribute(key,new T.BufferAttribute(values,size));
      }
      for(const g of gs)g.dispose();out.computeBoundingBox();out.computeBoundingSphere();return out;
    }
    function flush(bucket,group,name){
      for(const [key,parts]of bucket){const mesh=new T.Mesh(merge(parts),mats[key]);mesh.name='gcb_'+name+'_'+key;mesh.receiveShadow=key!=='glass'&&key!=='glow';mesh.castShadow=false;group.add(mesh);}
    }
    function block(px,pz,sx,sz,name){
      const b={minX:x+px-sx/2,maxX:x+px+sx/2,minZ:z+pz-sz/2,maxZ:z+pz+sz/2,name:'gcb_'+name};
      if(['counter','table','stool'].includes(name))b.cameraBlocking=false;
      blocks.push(b);return b;
    }
    function planeTexture(name,text,sub,bg,fg,width,height,px,py,pz,ry=PI/2){
      const map=canvasTexture(name==='sign'?1024:512,name==='sign'?192:512,(c,cw,ch)=>{
        c.fillStyle=bg;c.fillRect(0,0,cw,ch);c.strokeStyle=fg;c.lineWidth=3;c.strokeRect(12,12,cw-24,ch-24);c.textAlign='center';c.textBaseline='middle';c.fillStyle=fg;
        if(name==='sign'){
          c.font='bold 105px Georgia';c.fillText(text,cw/2,78,cw-80);c.font='22px Georgia';c.fillText(sub,cw/2,146,cw-80);
        }else{
          c.font='bold 43px Georgia';c.fillText(text,cw/2,62,cw-56);c.strokeStyle='#bba878';c.lineWidth=1;c.beginPath();c.moveTo(58,105);c.lineTo(cw-58,105);c.stroke();
          c.font='30px Georgia';for(const [i,line]of sub.split('|').entries())c.fillText(line,cw/2,158+i*70,cw-60);c.font='italic 22px Georgia';c.fillText('Frisch aus unserer Küche',cw/2,458,cw-50);
        }
      });
      const material=new T.MeshBasicMaterial({map,toneMapped:false}),mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.name='gcb_'+name;mesh.position.set(px,py,pz);mesh.rotation.y=ry;root.add(mesh);return mesh;
    }

    // Walls enclose a real room; the east doorway is genuinely open.
    box('floor',0,floorY-.055,0,w-.03,.11,d-.03);
    box('brick',-hx+.1,1.61,0,.2,3.56,d);
    box('brick',0,1.61,-hz+.1,w-.2,3.56,.2);
    box('brick',0,1.61,hz-.1,w-.2,3.56,.2);
    block(-hx+.1,0,.2,d,'west_wall');block(0,-hz+.1,w-.2,.2,'north_wall');block(0,hz-.1,w-.2,.2,'south_wall');
    box('plaster',0,3.43,0,w-.2,.15,d-.2);
    // Timber dado and skirting follow the interior faces.
    box('green',-hx+.225,.34,0,.075,1.02,d-.35);
    for(const side of[-1,1]){box('green',0,.34,side*(hz-.225),w-.35,1.02,.075);box('timber',0,.88,side*(hz-.28),w-.38,.075,.08);box('timber',0,-.095,side*(hz-.26),w-.38,.15,.11);}
    box('timber',-hx+.28,.88,0,.08,.075,d-.4);box('timber',-hx+.26,-.095,0,.11,.15,d-.4);
    for(let n=-3;n<=3;n++){for(const side of[-1,1])box('green',n*.7,.36,side*(hz-.275),.045,.8,.04,0xe6e7d9);}
    // Header, oak sill and split glazed bays, never a pane across the portal.
    const doorHalf=.94,sideWidth=hz-doorHalf;
    for(const side of[-1,1]){
      const sz=side*(doorHalf+sideWidth/2);
      box('green',hx,.22,sz,.25,.78,sideWidth);
      box('green',hx,3.07,sz,.25,1.05,sideWidth);
      add(buckets,'glass',new T.PlaneGeometry(sideWidth-.18,1.90),hx+.018,1.6,sz,1,1,1,0xffffff,0,PI/2,0);
      block(hx,sz,.25,sideWidth,'front_bay');
      for(const zz of[side*doorHalf,side*(hz-.04),sz]){
        box('green',hx+.06,1.61,zz,.17,2.05,.09);
        box('brass',hx+.16,1.61,zz,.018,1.85,.025);
      }
      box('timber',hx+.05,.61,sz,.2,.10,sideWidth);
      box('timber',hx+.05,2.58,sz,.2,.11,sideWidth);
    }
    box('green',hx,3.10,0,.25,1.0,doorHalf*2);
    for(const side of[-1,1]){box('green',hx+.035,1.15,side*doorHalf,.28,2.68,.12);box('brass',hx+.184,1.15,side*doorHalf,.016,2.54,.025);}
    box('timber',hx+.02,-.135,0,.28,.065,doorHalf*2-.08);
    // A framed solid timber door rests open against the inner north jamb.
    const leafX=hx-.89,leafZ=-doorHalf;
    box('green',leafX,.34,leafZ,1.72,1.02,.075);box('green',leafX,2.20,leafZ,1.72,.32,.075);
    for(const side of[-1,1])box('green',leafX+side*.77,1.10,leafZ,.18,2.52,.075);
    add(buckets,'glass',new T.PlaneGeometry(1.30,1.06),leafX,1.53,leafZ-.044);
    for(const xx of[leafX-.72,leafX+.72])box('timber',xx,1.10,leafZ-.048,.075,2.35,.035);
    for(const yy of[.08,.91,2.26])box('timber',leafX,yy,leafZ-.048,1.49,.075,.035);
    rod('brass',new T.Vector3(leafX-.57,.92,leafZ-.10),new T.Vector3(leafX-.57,1.20,leafZ-.10),.019);
    block(leafX,leafZ,1.72,.10,'open_door');
    // Framed fascia, cornice and a readable gold serif sign.
    box('green',hx+.15,3.08,0,.12,.87,d+.16);
    box('timber',hx+.14,3.57,0,.37,.13,d+.42);
    box('brass',hx+.218,2.64,0,.025,.032,d+.12);
    for(const side of[-1,1])box('green',hx+.065,1.71,side*(hz-.07),.25,3.78,.19);
    planeTexture('sign','GCB Pub','AM QUAI · KÜCHE & GUTE GESELLSCHAFT','#193a2f','#e2c98b',d-.45,.76,hx+.217,3.08,0);

    // Upholstered alcoves leave the central walk/ordering route clear.
    function booth(side){
      const bz=side*(hz-.63),tx=1.23,tz=side*(hz-1.64);
      box('timber',tx,.16,bz,2.64,.54,.80);
      box('leather',tx,.46,bz,2.54,.18,.73);
      box('leather',tx,.88,side*(hz-.25),2.64,1.02,.18);
      for(const end of[-1,1])box('leather',tx+end*1.32,.70,bz,.16,.65,.84);
      for(let n=-4;n<=4;n++)ball('brass',tx+n*.25,.91,side*(hz-.355),.016,.016,.009,0x998653);
      box('timber',tx,.68,tz,1.72,.105,.87);
      cyl('dark',tx,.23,tz,.085,.78);cyl('dark',tx,-.10,tz,.36,.07);
      block(tx,bz,2.80,.98,'booth');block(tx,tz,1.74,.89,'table');
      // Coaster and small ceramic vase with a few leaves.
      cyl('ceramic',tx+.51,.77,tz,.065,.13);rod('bottle',new T.Vector3(tx+.51,.83,tz),new T.Vector3(tx+.54,1.00,tz),.008,0x52633c);
      for(let j=0;j<3;j++)ball('bottle',tx+.53+(j-1)*.045,.91+j*.03,tz,.07,.02,.035,0x556743);
    }
    booth(-1);booth(1);
    // Tongue-and-groove counter, rounded oak edge and brass foot rail.
    const barX=-1.85,barLength=d-1.75,topY=.99;
    box('green',barX,.36,0,.78,1.06,barLength);
    box('timber',barX,.96,0,.96,.16,barLength+.18);
    box('timber',barX+.51,.97,0,.07,.11,barLength+.22);
    for(let n=-3;n<=3;n++){box('timber',barX+.40,.34,n*.83,.035,.83,.045,0xb3a17b);box('green',barX+.425,.35,n*.83+.39,.022,.67,.65,0xced4c5);}
    rod('brass',new T.Vector3(barX+.75,.13,-barLength*.46),new T.Vector3(barX+.75,.13,barLength*.46),.031);
    for(const zz of[-2,0,2])rod('brass',new T.Vector3(barX+.43,.13,zz),new T.Vector3(barX+.75,.13,zz),.025);
    block(barX,0,.99,barLength+.2,'counter');
    function stool(zz){
      const sx=-.8;
      cyl('dark',sx,.19,zz,.045,.64);cyl('dark',sx,-.105,zz,.24,.065);
      cyl('brass',sx,.18,zz,.20,.025);
      cyl('timber',sx,.57,zz,.28,.11);cyl('leather',sx,.65,zz,.27,.09);
      box('leather',sx+.20,.89,zz,.10,.50,.45);
      block(sx,zz,.58,.58,'stool');
    }
    for(const zz of[-2.25,-1.2,2.25])stool(zz);

    // Back-bar mirror, shelves, bottles and tap handles are real geometry.
    box('timber',-hx+.27,1.95,-.72,.16,1.90,3.70);
    box('glass',-hx+.365,1.98,-.72,.015,1.62,3.42,0x879688);
    for(const yy of[1.29,1.97,2.66])box('timber',-hx+.48,yy,-.72,.48,.08,3.70);
    for(let row=0;row<2;row++)for(let i=0;i<12;i++){
      const zz=-2.25+i*.285,bx=-hx+.48,yy=1.36+row*.68;
      cyl('bottle',bx,yy+.15,zz,.054,.25,[0x3c6145,0x73553a,0x7c6b42,0x455c56][i%4]);
      cyl('bottle',bx,yy+.315,zz,.022,.10,[0x3c6145,0x73553a,0x7c6b42,0x455c56][i%4]);
      box('ceramic',bx+.057,yy+.15,zz,.005,.09,.085,0xd6c6a2);
    }
    for(const zz of[-1.92,-1.61,-1.30]){
      cyl('brass',barX+.05,1.18,zz,.036,.37);
      rod('brass',new T.Vector3(barX+.05,1.35,zz),new T.Vector3(barX+.28,1.35,zz),.032);
      box('dark',barX+.24,1.48,zz,.08,.21,.07);
    }
    for(const zz of[1.72,1.98,2.24])cyl('glass',barX+.12,1.13,zz,.063,.18);
    planeTexture('menu_board','GCB Küche','Pub-Burger|Flammkuchen|Pommes frites|Frischer Salat','#172b25','#dfd4b3',1.37,1.43,-hx+.25,2.12,2.75);
    // Timber ceiling beams, pendants and frosted exterior lanterns.
    for(const zz of[-2.8,0,2.8])box('timber',0,3.27,zz,w-.25,.18,.18,0xa58c65);
    for(const zz of[-1.82,1.82]){
      rod('dark',new T.Vector3(.1,3.31,zz),new T.Vector3(.1,2.85,zz),.012);
      const cone=new T.ConeGeometry(.31,.25,16,1,true);add(buckets,'brass',cone,.1,2.80,zz);
      ball('glow',.1,2.68,zz,.11,.09,.11);
      const light=new T.PointLight(0xffc28a,15,6.9,2);light.name='gcb_warm_light';light.position.set(.1,2.54,zz);light.castShadow=false;root.add(light);lights.push(light);
    }
    for(const side of[-1,1]){
      const zz=side*1.16;
      box('dark',hx+.22,1.91,zz,.14,.32,.12);rod('dark',new T.Vector3(hx+.22,2.05,zz),new T.Vector3(hx+.49,2.05,zz),.025);
      box('glow',hx+.46,1.87,zz,.24,.36,.24);
      for(const dy of[-1,1])box('dark',hx+.46,1.87+dy*.21,zz,.32,.07,.32);
      for(const dx of[-1,1])for(const dz of[-1,1])box('dark',hx+.46+dx*.13,1.87,zz+dz*.13,.025,.40,.025);
      add(buckets,'dark',new T.ConeGeometry(.25,.18,4),hx+.46,2.17,zz,1,1,1,0xffffff,0,PI/4,0);
    }
    // A small welcome mat has flat edges, never a raised step.
    box('dark',hx+.45,floorY+.004,0,.90,.008,1.55,0x62654e);
    flush(buckets,root,'furnishing');

    function food(id){
      const group=new T.Group();group.name='gcb_order_'+id;group.position.set(barX,1.035,.25);group.visible=false;root.add(group);const b=new Map();
      cyl('ceramic',0,.022,0,.31,.034,0xffffff,b);
      add(b,'ceramic',new T.TorusGeometry(.279,.018,6,32),0,.042,0,1,1,1,0xffffff,PI/2,0,0);
      if(id==='burger'){
        ball('food',0,.10,0,.185,.060,.175,0xbd793a,b);cyl('food',0,.15,0,.17,.045,0x633924,b);
        for(let i=0;i<7;i++){const a=i*PI/3.5;ball('food',Math.cos(a)*.13,.177,Math.sin(a)*.12,.078,.015,.058,0x4c7839,b);}
        cyl('food',0,.199,0,.17,.018,0xb94f36,b);box('food',0,.215,0,.29,.018,.28,0xe5b84e,.18,b);
        ball('food',0,.266,0,.19,.064,.18,0xd4934b,b);
        for(let i=0;i<19;i++){const a=i*2.399,r=.15*Math.sqrt((i+.5)/19),sx=Math.cos(a)*r,sz=Math.sin(a)*r;ball('food',sx,.297+.026*(1-r/.15),sz,.009,.004,.004,0xead4a1,b);}
      }else if(id==='flammkuchen'){
        cyl('food',0,.059,0,.25,.036,0xbd8849,b);cyl('food',0,.082,0,.229,.012,0xe8d7ad,b);
        for(let i=0;i<23;i++){const a=i*2.399,r=.205*Math.sqrt((i+.5)/23),sx=Math.cos(a)*r,sz=Math.sin(a)*r;
          if(i%3)box('food',sx,.098,sz,.045,.023,.017,i%2?0xb77156:0xd2bc91,a,b);
          else add(b,'food',new T.TorusGeometry(.028,.007,4,10),sx,.099,sz,1,1,1,0x80734d,PI/2,0,a);
        }
      }else if(id==='fries'){
        for(let i=0;i<30;i++){const a=i*2.399,r=.18*Math.sqrt((i+.5)/30);box('food',Math.cos(a)*r,.06+(i%4)*.018,Math.sin(a)*r,.029,.029,.15+(i%3)*.025,i%4?0xd6aa4f:0xba8b38,a,b);}
        ball('food',.22,.062,-.09,.052,.022,.058,0xaf3e2d,b);
      }else{
        cyl('ceramic',0,.05,0,.235,.055,0xf6f2df,b);
        for(let i=0;i<23;i++){const a=i*2.399,r=.19*Math.sqrt((i+.5)/23);ball('food',Math.cos(a)*r,.10+(i%4)*.012,Math.sin(a)*r,.073,.029,.044,[0x6c8942,0x4b7138,0x859b4d][i%3],b);}
        for(let i=0;i<6;i++){const a=i*PI/3;ball('food',Math.cos(a)*.15,.143,Math.sin(a)*.15,.037,.026,.037,0xc84e35,b);}
        for(let i=0;i<4;i++){const a=i*1.8;add(b,'food',new T.CylinderGeometry(.043,.043,.015,12),Math.cos(a)*.12,.155,Math.sin(a)*.12,1,1,1,0x9bb66b,.10,0,a);}
      }
      flush(b,group,'dish_'+id);orders.set(id,group);return group;
    }
    for(const id of['burger','flammkuchen','fries','salad'])food(id);
    cube.dispose();cylinder.dispose();sphere.dispose();
    // Reuse the game's already retained rigged character assets.
    function actor(px,pz,heading,spec,pose='standing'){
      const anchor=new T.Group();anchor.name='gcb_'+(pose==='seated'?'guest':'waiter');anchor.position.set(px,floorY+(pose==='seated'?.30:0),pz);anchor.rotation.y=heading;root.add(anchor);
      if(pose==='standing'){const apron=new T.Mesh(new T.BoxGeometry(.42,.55,.018),mats.dark);apron.name='gcb_waiter_apron';apron.position.set(0,.70,.17);anchor.add(apron);}
      const person=window.People3D?.attach(anchor,spec);
      if(person){person.setPose(pose);actors.push(person);}return person;
    }
    const waiter=actor(-2.53,1.65,PI/2,{sex:'male',height:1.76,shirt:0xe9e5d9,pants:0x29352c,hair:0x493d32,skin:0xffebdc,phase:.23});
    const guest=actor(1.52,hz-.63,PI,{sex:'female',height:1.64,shirt:0x79764d,pants:0x333c3c,hair:0x614739,skin:0xffedd6,phase:.64},'seated');
    const ready=Promise.allSettled(actors.map(a=>a.promise));
    let lastOrder=null;
    return {
      root,blocks,contains(px,pz){return px>x-hx+.20&&px<x+hx-.20&&pz>z-hz+.20&&pz<z+hz-.20;},
      floorY,entrance:{x:x+hx,z},interior:{x:x+.7,z},counter:{x:x-.3,z},
      ready,
      update(dt,time,viewerPosition){
        if(disposed)return;
        const near=!viewerPosition||Math.hypot(viewerPosition.x-x,viewerPosition.z-z)<19;
        for(const light of lights)light.visible=near;
        for(const a of actors)a.update(dt,0);
      },
      setOrder(item){
        const id=item===null?null:typeof item==='string'?item:item?.id;
        if(disposed)return false;
        if(id!==null&&!orders.has(id))return false;
        if(id===lastOrder)return true;
        for(const [name,group]of orders)group.visible=name===id;
        lastOrder=id;return true;
      },
      dispose(){if(disposed)return;disposed=true;for(const a of actors)a.dispose?.();for(const light of lights)light.visible=false;}
    };
  }
  return {create};
})();

