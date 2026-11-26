/* Original coastal courier illustration. All geometry is rendered locally. */
window.drawCover = function drawCover(canvas) {
  const box = canvas.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = box.width, h = box.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const c = canvas.getContext('2d');
  if (!c) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  let state = 28491;
  const r = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  function gradient(x, y, dx, dy, stops) {
    const g = c.createLinearGradient(x,y,dx,dy);
    stops.forEach(([p,col]) => g.addColorStop(p,col));
    return g;
  }
  function path(d, fill, stroke, lw=1) {
    const p = new Path2D(d);
    if (fill) { c.fillStyle = fill; c.fill(p); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(p); }
  }
  function poly(pts,fill) {
    c.beginPath(); c.moveTo(...pts[0]);
    for(let i=1;i<pts.length;i++) c.lineTo(...pts[i]);
    c.closePath(); c.fillStyle=fill; c.fill();
  }
  function line(pts,color,lw=1) {
    c.beginPath(); c.moveTo(...pts[0]);
    for(let i=1;i<pts.length;i++) c.lineTo(...pts[i]);
    c.strokeStyle=color; c.lineWidth=lw; c.stroke();
  }
  function ell(x,y,rx,ry,color,angle=0) {
    c.beginPath(); c.ellipse(x,y,rx,ry,angle,0,Math.PI*2); c.fillStyle=color; c.fill();
  }
  const portrait = w/h < .93;
  const wh = portrait ? .61*h : .54*h;
  const unit = Math.min(w/1050,h/580);
  const sky = gradient(0,0,0,wh,[[0,'#50518f'],[.36,'#9b75ae'],[.68,'#ed99aa'],[1,'#ffc493']]);
  c.fillStyle=sky; c.fillRect(0,0,w,h);
  const sx=w*(portrait?.70:.71), sy=wh*.65, sr=Math.min(w*.106,h*.173);
  const aureole=c.createRadialGradient(sx,sy,sr*.5,sx,sy,sr*2.5);
  aureole.addColorStop(0,'rgba(255,208,145,.55)'); aureole.addColorStop(1,'rgba(255,176,148,0)');
  c.fillStyle=aureole; c.fillRect(0,0,w,wh);
  ell(sx,sy,sr,sr,gradient(0,sy-sr,0,sy+sr,[[0,'#fff4c9'],[.58,'#ffddb1'],[1,'#ffbda7']]));
  for(let i=0;i<17;i++){
    const x=r()*w, y=(.06+r()*.72)*wh, width=(.038+r()*.13)*w, height=(.005+r()*.017)*wh;
    poly([[x-width,y],[x-width*.48,y-height*.16],[x-width*.30,y-height],[x+width*.05,y-height*.76],[x+width*.21,y-height*.43],[x+width*.43,y-height*.55],[x+width,y],[x+width*.19,y+height*.32]], i%3===1?'rgba(255,198,181,.35)':'rgba(145,113,159,.33)');
  }
  for(let i=0;i<5;i++){
    const y=sy+sr*(.13+i*.14);
    const x=Math.sqrt(Math.max(0,sr*sr-(sy-y)*(sy-y)));
    c.fillStyle='rgba(243,160,164,'+(.25+i*.09)+')';
    c.fillRect(sx-x,y,2*x,Math.max(.8,sr*(.011+i*.006)));
  }
  function palm(baseX,baseY,height,lean,color){
    c.save(); c.translate(baseX,baseY); c.scale(height/150,height/150);
    path('M-3.9 1 Q-1 -75 '+(lean-1.7)+' -147 L'+(lean+2)+' -147 Q4 -69 5 1 Z',color);
    c.translate(lean,-147);
    const fronds=[[-75,17,-25,-33],[-65,36,-30,-18],[-44,52,-34,-5],[-48,-24,-11,-35],[-14,-42,-4,-31],[21,-41,7,-31],[57,-18,24,-34],[73,1,34,-25],[74,25,36,-15],[41,41,30,-6],[15,45,17,-2]];
    for (const [ex,ey,cx,cy] of fronds) {
      path('M0 0 Q'+cx+' '+cy+' '+ex+' '+ey,null,color,1.3);
      const sign=ex<0?-1:1;
      for(let i=1;i<=15;i++){
        const t=i/16, f=1-t, x=2*f*t*cx+t*t*ex, y=2*f*t*cy+t*t*ey;
        const amp=2+13*Math.sin(Math.PI*t)*(.77+.23*r()), sweep=sign*(3+8*t);
        poly([[x-sign*.7,y],[x+sweep*.25,y+amp*.22],[x+sweep,y+amp],[x+sign*3.2,y+.5]],color);
        if(i%2===0)poly([[x,y],[x+sweep*1.1,y-amp*.55],[x+sign*3,y+1]],color);
      }
    }
    c.restore();
  }
  function city(base, scale, distant){
    let x=-.02*w;
    while(x<w){
      const bw=(12+r()*29)*scale;
      let bh=(10+Math.pow(r(),2)*80)*scale;
      if(!distant && x>w*.58 && x<w*.93) bh*=1.45;
      const y=base-bh, side=bw*.20, shape=r();
      const front=distant?'#987b97':['#665677','#655d80','#796381','#77607e'][Math.floor(r()*4)];
      c.fillStyle=front; c.fillRect(x,y,bw,bh);
      poly([[x+bw,y],[x+bw+side,y+side*.60],[x+bw+side,base],[x+bw,base]],distant?'#8e778e':'#514c6d');
      c.fillStyle=distant?'#ac899b':'#f5ae9d';
      c.fillRect(x,y,bw,Math.max(.65,scale*.85));
      if(shape>.49){
        c.fillStyle=front; c.fillRect(x+bw*.18,y-bh*.13,bw*.65,bh*.15);
        if(shape>.73)c.fillRect(x+bw*.28,y-bh*.2,bw*.45,bh*.1);
        if(shape>.92)line([[x+bw*.5,y-bh*.19],[x+bw*.5,y-bh*.41]],front,scale);
      }
      if(!distant){
        for(let j=0;j<Math.floor(bh/(6*scale));j++){
          for(let k=0;k<Math.floor(bw/(7*scale));k++){
            const wx=x+(3+k*7)*scale,wy=y+(4+j*6)*scale;
            c.fillStyle=r()>.68?'#ebad9f':'#867b96'; c.fillRect(wx,wy,scale*(shape>.75?3.5:2),scale);
          }
        }
        if(shape<.29)for(let a=0;a<3;a++)c.fillRect(x+(a+1)*bw/4,y+scale,scale*.75,bh-scale);
      }
      x+=bw+scale*(r()*10-3);
    }
  }
  const arch=Math.min(Math.max(w/1380,.49),h/580);
  city(wh-4*arch,arch*1.13,true);
  city(wh+2*arch,arch,false);
  const waterEnd=wh+h*.138;
  c.fillStyle=gradient(0,wh,0,waterEnd,[[0,'#b9a3aa'],[.16,'#8393aa'],[.43,'#66839a'],[1,'#455674']]);
  c.fillRect(0,wh,w,waterEnd-wh+2);
  for(let i=0;i<450;i++){
    const u=r(),y=wh+(waterEnd-wh)*u,x=r()*w;
    const lit=Math.abs(x-sx) < sr*(.2+1.3*u) && r()>.2;
    c.fillStyle=lit?'rgba(255,206,167,.7)':r()>.46?'rgba(231,178,183,.47)':'rgba(54,77,103,.38)';
    c.fillRect(x,y,(1+r()*16)*(unit+.25)*(u+.3),Math.max(.5,u*unit*1.5));
  }
  // Low bridge with an uninterrupted line of sunset lamps.
  const bridgeY=wh+3*arch;
  c.fillStyle='#625e79'; c.fillRect(0,bridgeY,w*.48,2.1*arch);
  for(let x=8*arch;x<w*.47;x+=54*arch){
    c.fillRect(x,bridgeY,2*arch,5*arch);
    line([[x,bridgeY],[x,bridgeY-6*arch],[x+3*arch,bridgeY-7*arch]],'#72647d',Math.max(.6,.8*arch));
    ell(x+3*arch,bridgeY-7*arch,1*arch,.7*arch,'#ffd8ae');
  }
  const roadY=x=>waterEnd+h*.053-(x/w)*h*.052;
  poly([[0,roadY(0)-h*.026],[w,roadY(w)-h*.026],[w,h],[0,h]],'#695776');
  poly([[0,roadY(0)],[w,roadY(w)],[w,h],[0,h]],gradient(0,waterEnd,0,h,[[0,'#655471'],[.24,'#42425e'],[.6,'#2b3148'],[1,'#181d35']]));
  line([[0,roadY(0)-h*.003],[w,roadY(w)-h*.003]],'#e29b97',Math.max(1,unit*3));
  line([[0,roadY(0)+h*.014],[w,roadY(w)+h*.014]],'#74657e',Math.max(1,unit*2));
  // Promenade with its slim steel handrail.
  for(let x=-8;x<w+10;x+=Math.max(26,49*arch)){
    const y=roadY(x)-h*.025;
    line([[x,y],[x,y-h*.033]],'#55495d',Math.max(1.3,arch*2.3));
  }
  [0.025,0.040,0.059].forEach((k,i)=>line([[0,roadY(0)-k*h],[w,roadY(w)-k*h]],i===2?'#544e62':'#756579',Math.max(.65,arch*(i===2?1.8:1))));
  for(let i=0;i<140;i++){
    const x=w*r(),y=roadY(x)+(h-roadY(x))*r();
    const len=(1+r()*38)*unit;
    line([[x,y],[x+len,y-len*.095]],r()>.76?'rgba(255,151,155,.21)':'rgba(140,168,184,.14)',Math.max(.5,r()*1.5*unit));
  }
  // Road paint slides away towards the right-hand vanishing point.
  for(let i=-1;i<7;i++){
    const x=i*w*.23,y=h*.99-(x/w)*h*.16;
    poly([[x,y],[x+w*.10,y-h*.016],[x+w*.13,y-h*.013],[x+w*.015,y+h*.005]],'rgba(218,170,151,.52)');
  }
  const tall=Math.min(h*.56,w*.37);
  palm(w*.975,roadY(w*.975)-h*.027,tall,-31,'#353347');
  palm(w*.485,roadY(w*.485)-h*.025,tall*.44,21,'#615268');
  palm(w*.444,roadY(w*.444)-h*.025,tall*.35,11,'#66566c');
  if(!portrait) palm(w*.063,roadY(w*.063)-h*.03,tall*.78,32,'#53455b');
  function wheel(x,y,rx,ry){
    c.save(); c.translate(x,y); c.transform(1,-.22,0,1,0,0);
    ell(0,0,rx,ry,'#101723');
    ell(1,-1,rx*.9,ry*.94,'#25313e');
    ell(2,-1,rx*.79,ry*.84,gradient(-rx,-ry,rx,ry,[[0,'#7797a4'],[.15,'#dbaeae'],[.40,'#4e707e'],[.72,'#142534'],[1,'#849eaa']]));
    ell(2,-1,rx*.67,ry*.74,'#172633');
    for(let i=0;i<9;i++){
      const a=i*Math.PI*2/9;
      const v=(f,off)=>[2+Math.cos(a+off)*rx*f,-1+Math.sin(a+off)*ry*f];
      poly([v(.16,-.24),v(.71,-.09),v(.73,.05),v(.28,.19)],i<4?'#b2b7bf':'#7b929d');
      line([v(.23,-.09),v(.65,.01)],'#d6d4cf',.66);
    }
    ell(2,-1,rx*.22,ry*.24,'#456474'); ell(2,-1,rx*.105,ry*.12,'#b7bcba');
    c.restore();
  }
  function courier(){
    const litmetal=gradient(100,55,360,197,[[0,'#c7ddd4'],[.16,'#8accc5'],[.36,'#50bbc0'],[.58,'#258493'],[.8,'#175564'],[1,'#2c626d']]);
    const flank=gradient(320,95,360,190,[[0,'#8adbd8'],[.21,'#4aa3a8'],[.32,'#27848b'],[.49,'#226571'],[.76,'#23465a'],[.88,'#426270'],[1,'#162c3b']]);
    const glass=gradient(100,26,145,107,[[0,'#b8a7b4'],[.24,'#afa8b4'],[.53,'#778896'],[1,'#3d5e70']]);
    const edge='#223c4a';
    // Contact shadow and a striated wet reflection below both axles.
    c.save(); c.translate(318,187); c.rotate(-.122); c.scale(321,27);
    const shadow=c.createRadialGradient(0,0,.15,0,0,1);
    shadow.addColorStop(0,'rgba(8,14,25,.86)'); shadow.addColorStop(1,'rgba(8,14,25,0)');
    ell(0,0,1,1,shadow); c.restore();
    for(let i=0;i<39;i++){
      const x=18+r()*574,y=213-.115*x+r()*20,len=3+r()*48;
      line([[x,y],[x+len,y-len*.10]],i%3===0?'rgba(109,185,185,.23)':'rgba(222,158,166,.16)',.5+r()*1.9);
    }
    wheel(65,165,25,32);
    path('M21 161 L44 174 L235 205 Q258 211 283 205 L591 138 Q616 132 621 119 L601 83 L547 82 L63 117Z','#17293a');
    wheel(291,166,34,41); wheel(564,117,26,31);
    // Full body outline follows the actual tyre cutouts.
    const outline='M15 141 Q20 119 47 110 L132 84 Q157 72 193 48 Q228 24 265 17 Q302 9 362 6 L455 4 Q477 4 500 14 L566 43 L597 52 Q610 56 617 73 L623 104 Q629 115 619 124 L600 131 L595 129 Q597 105 584 91 Q574 80 561 82 Q537 85 533 116 Q532 126 531 139 L336 187 Q337 163 329 145 Q318 122 300 122 Q275 122 264 144 Q257 157 257 177 L258 194 L240 199 Q160 197 56 182 L22 175 Q10 170 12 158 Z';
    path(outline,litmetal,edge,2.6);
    path('M249 124 Q264 114 276 110 L589 53 Q609 55 618 76 L624 105 Q628 117 616 126 L599 131 L594 129 Q598 96 580 85 Q557 71 541 91 Q529 105 531 138 L336 186 Q338 158 326 136 Q316 119 298 120 Q274 118 263 140 Q256 154 257 175 L257 194 L240 198 Q241 172 249 124Z',flank);
    path('M14 153 Q118 173 241 178 L240 198 Q117 198 26 177 Q10 173 12 158Z','#335263',edge,1.1);
    path('M31 162 Q123 180 235 182 L224 193 Q121 191 43 178Z','#152c39');
    path('M25 150 Q104 166 181 170 L169 181 Q95 178 33 163Z','#1c3b47');
    path('M43 151 Q127 165 171 166 L166 172 Q88 168 52 159Z','#142d3b');
    for(let i=0;i<16;i++)line([[50+i*7.1,156+i*.89],[56+i*7.1,161+i*.88]],'#587783',.7);
    // Low, deep grille opening and inset blank plate.
    path('M89 173 L140 177 L137 186 L87 181Z','#7d9396');
    path('M94 174 L136 178 L134 183 L93 180Z','#b5bbb4');
    // Near flank, sill, swage lines and rear bumper.
    path('M337 174 L532 131 L531 139 L336 186Z','#253948');
    path('M338 170 L531 127 L531 130 L337 175Z','#a7b0b1');
    path('M340 151 Q421 122 528 105 L523 112 L339 158Z','rgba(137,199,192,.31)');
    path('M343 128 L526 91 L526 93 L346 132Z','#a6d6cc');
    path('M597 119 L622 111 L621 124 L600 131Z','#345264');
    path('M600 64 L615 66 L620 78 L600 78Z','#a94d64');
    path('M603 66 L615 68 L616 70 L603 70Z','#f2ada2');
    // Rear canopy, roof edge and teal D-pillar.
    path('M137 85 Q166 65 205 40 Q237 19 269 16 Q350 5 439 4 L464 6 Q483 7 506 17 L572 47 L582 56 L292 114 Q260 107 224 101Z','#254757',edge,1.5);
    path('M211 42 Q237 20 273 17 Q359 4 446 6 Q455 6 470 10 L514 27 Q434 18 355 28 L285 39Z',gradient(260,4,335,40,[[0,'#fae3cd'],[.46,'#c2cec7'],[.85,'#84bbbd'],[1,'#5e9fa7']]));
    path('M147 84 L205 45 Q227 32 265 29 L321 30 Q304 53 281 83 L264 104 Q206 97 147 84Z',glass,'#375662',2);
    path('M153 84 L193 59 L211 53 Q203 69 194 85 L221 96Z','rgba(251,219,197,.34)');
    path('M205 46 Q247 24 318 31 L308 40 Q258 36 211 52Z','rgba(222,202,200,.49)');
    path('M258 99 L278 72 Q292 52 311 34','#77949e');
    // Dark front seats and cabin are only hinted at through the reflective glass.
    path('M204 93 Q206 83 216 82 Q227 82 228 96 L252 100 L256 103Z','rgba(41,68,80,.56)');
    path('M279 101 L324 33 Q351 26 388 23 L421 20 L402 77Z','#244d5b','#183944',2);
    path('M288 93 L328 37 L393 27 L365 74Z',gradient(330,27,354,90,[[0,'#b7a5b6'],[.25,'#8e94a4'],[.59,'#688392'],[1,'#365d6d']]));
    path('M331 37 L348 34 L314 86 L292 91Z','rgba(217,202,200,.45)');
    path('M372 70 L391 28 L413 25 L399 74 L374 79Z','#496774');
    path('M417 74 L432 21 L476 23 Q489 24 504 31 L505 57Z',gradient(425,23,471,75,[[0,'#bba9b4'],[.39,'#758290'],[1,'#345765']]),'#284951',2);
    path('M511 56 L507 32 L554 49Z','#506b77');
    path('M280 106 L575 47 L583 55 L279 115Z','#98c9c5');
    line([[281,109],[424,80],[562,51]],'#ede5d3',1.4);
    // Two satin roof rails taper with perspective.
    path('M271 17 L289 11 L403 1 Q421 0 437 4 L426 5 L404 4 L290 15Z','#425c69','#243d48',1);
    path('M391 15 L451 11 Q464 9 480 15 L485 18 L472 16 L452 14 L395 19Z','#3a5662');
    // Long hood with three planes and fine sunlit panel edges.
    path('M18 137 Q29 118 53 110 L136 85 Q207 90 263 105 L271 112 L253 125 L224 151 Q120 151 18 137Z',gradient(144,85,131,156,[[0,'#b0d2c8'],[.32,'#8fd3cb'],[.68,'#61bbc0'],[1,'#3797a3']]),'#406c74',1);
    path('M30 130 Q60 116 143 95 L222 104 Q137 103 87 118Z','rgba(224,226,204,.49)');
    path('M75 135 L172 102 L195 104 L99 136Z','rgba(203,230,215,.19)');
    path('M175 145 Q208 125 250 112 L256 112 Q223 131 208 148Z','#80c8c7');
    line([[35,126],[134,91],[173,95]],'#d1e5d6',1);
    // Parallel headlamp blades and sculpted light pockets.
    path('M21 136 L67 141 L82 150 L32 147 L18 143Z','#214450');
    path('M23 138 L65 142 L71 145 L29 142Z','#f8eee0');
    path('M157 149 L226 145 L250 128 L246 143 L228 157 L168 158Z','#234754','#316273',1.2);
    path('M164 150 L225 147 L245 133 L239 141 L226 151 L168 155Z','#e1f9ed');
    path('M166 155 L226 152 L237 146 L229 154 L170 158Z','#89cfc8');
    path('M40 150 Q106 161 156 159 L151 165 Q91 166 50 156Z','#387882');
    path('M18 170 Q109 190 239 192 L241 199 Q110 197 25 179Z','#2d4859');
    line([[28,178],[104,191],[204,197],[236,197]],'#aad1c8',1.7);
    // Arches, door shut lines, handles, mirror and courier livery.
    path('M256 178 Q253 152 264 135 Q279 114 301 116 Q326 115 337 140 Q343 153 343 167',null,'#a1c6bd',2);
    path('M531 128 Q525 102 539 85 Q553 69 572 76 Q591 81 596 104',null,'#81b7b4',1.5);
    path('M385 89 Q377 102 376 113 L372 156 Q372 163 382 162 L400 158 L411 84',null,'#345b66',1);
    path('M411 84 L401 153 Q401 157 410 154 L483 137 Q495 128 506 94 L514 65',null,'#365c68',1.2);
    path('M393 99 L409 96 L407 99 L392 102Z','#304e5b');
    path('M480 81 L494 78 L493 81 L480 84Z','#304e5b');
    path('M294 98 L289 100 L284 106 L275 109 L272 106 L282 96Z','#2e4453');
    path('M273 94 Q279 89 293 89 L306 91 L308 96 L293 101 L278 103 L271 101Z','#4b929c','#254754',1.45);
    line([[274,96],[283,92],[299,91]],'#d3e4d6',1.5);
    // An original pulse motif identifies the clinical courier.
    line([[430,116],[440,114],[445,109],[448,119],[453,101],[458,111],[472,108]],'#c8e6d8',2.2);
    path('M516 87 L523 85 L504 106 L497 108Z','#b9d6cb');
    path('M527 85 L530 84 L511 105 L508 105Z','#eeb4ac');
    // Small incidental specular highlights.
    line([[598,55],[610,60],[614,65]],'#e9c1b4',1.5);
    line([[348,168],[427,150],[493,135]],'#6cb6ba',.8);
  }
  const narrow=w/h<1.12;
  const scale=portrait?Math.min(w*.94/630,h*.30/215):narrow?Math.min(w*.71/630,h*.42/215):Math.min(w*.64/630,h*.505/215);
  const cx=portrait?w*.51:narrow?w*.634:w*.683;
  const carBottom=portrait?h*.83:h*.878;
  c.save();c.translate(cx-scale*318,carBottom-scale*217);c.scale(scale,scale);courier();c.restore();
  // A subtle print grain ties together the planes without covering the vehicle detail.
  const pattern=document.createElement('canvas');
  pattern.width=96; pattern.height=96;
  const pc=pattern.getContext('2d');
  if(pc){
    const pixels=pc.createImageData(96,96);
    for(let i=0;i<pixels.data.length;i+=4){
      const tone=r()>.49?255:0;
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=tone;
      pixels.data[i+3]=Math.floor(r()*21);
    }
    pc.putImageData(pixels,0,0);
    c.fillStyle=c.createPattern(pattern,'repeat');c.fillRect(0,0,w,h);
  }
  const falloff=gradient(0,0,w,0,[[0,'rgba(14,19,40,.48)'],[.26,'rgba(19,22,44,.22)'],[.56,'rgba(19,22,44,0)']]);
  c.fillStyle=falloff;c.fillRect(0,0,w,h);
};
