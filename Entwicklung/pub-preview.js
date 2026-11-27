/* Local, reviewable Pub draft. The ordinary mission UI is deliberately not booted here. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id),drive=window.Drive,canvas=$('city');
  const outside=$('outsideBtn'),inside=$('insideBtn'),pauseButton=$('pauseBtn'),orderButton=$('orderTrigger');
  const menu=$('menuOverlay'),dialog=$('foodMenu'),foodButtons=[...document.querySelectorAll('[data-food]')],closeButton=$('closeMenu');
  const mealNames={burger:'Pub-Burger',flammkuchen:'Flammkuchen',fries:'Pommes',salad:'Salatteller'};
  const keyActions={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'gas',ArrowDown:'brake',a:'left',d:'right',w:'gas',s:'brake',Shift:'sprint'};
  let ready=false,menuOpen=false,manualPaused=false,lastInfo=null,orderTransition='',disposed=false;

  function focusCanvas(){canvas.focus({preventScroll:true});}
  function resumeWorld(){if(ready&&!manualPaused&&!menuOpen&&!document.hidden&&!disposed)drive.resume();}
  function say(text){$('waiterLine').textContent=text;}
  function telemetry(info){
    if(!info)return;if(info.error){showError(info.error);return;}lastInfo=info;
    const indoor=info.pubLocation==='inside';
    $('locationName').textContent=indoor?'Im GCB Pub':'Vor dem GCB Pub';
    $('locationHint').textContent=indoor?'Willkommen am Quai.':'Die Eingangstür steht offen.';
    orderButton.hidden=!info.nearPubCounter;
    orderButton.disabled=info.pubOrderState==='preparing';
    orderButton.innerHTML=info.pubOrderState==='preparing'?'Dein Gericht wird zubereitet …':'<kbd>Enter</kbd> Beim Kellner bestellen';
    const state=info.pubOrderState+':'+(info.pubOrderItem||'');
    if(state!==orderTransition){
      orderTransition=state;
      if(info.pubOrderState==='preparing')say('Kellner: «Sehr gern! '+mealNames[info.pubOrderItem]+' kommt gleich.»');
      else if(info.pubOrderState==='served')say('Kellner: «Bitte sehr! '+mealNames[info.pubOrderItem]+' steht auf dem Tresen. Guten Appetit!»');
    }
  }
  function showError(message){
    ready=false;drive?.pause?.();$('loading').hidden=false;$('loadingText').textContent=message;
    const spin=$('loading').querySelector('.spinner');if(spin)spin.hidden=true;
    $('loading').querySelector('strong').textContent='Die Vorschau konnte nicht starten.';
    outside.disabled=inside.disabled=pauseButton.disabled=true;
  }
  function setView(view){
    if(!ready||menuOpen)return;
    if(!drive.previewPubView(view)){say('Diese Stelle ist gerade belegt. Versuche es in einem Moment nochmals.');return;}
    outside.classList.toggle('active',view==='outside');inside.classList.toggle('active',view==='inside');
    resumeWorld();focusCanvas();
  }
  function togglePause(){
    if(!ready||menuOpen)return;manualPaused=!manualPaused;
    pauseButton.textContent=manualPaused?'Fortsetzen':'Pause';pauseButton.setAttribute('aria-pressed',String(manualPaused));$('pauseNote').hidden=!manualPaused;
    if(manualPaused)drive.pause();else resumeWorld();focusCanvas();
  }
  function openMenu(){
    if(!ready||menuOpen||!lastInfo?.nearPubCounter)return;
    if(lastInfo.pubOrderState==='preparing'){say('Kellner: «Dein Gericht ist gleich fertig.»');return;}
    menuOpen=true;drive.pause();menu.hidden=false;
    $('menuGreeting').textContent='Kellner: «Schön, dass du da bist. Such dir etwas aus!»';
    foodButtons.forEach(b=>b.disabled=false);foodButtons[0].focus({preventScroll:true});
  }
  function closeMenu(){if(!menuOpen)return;menuOpen=false;menu.hidden=true;resumeWorld();focusCanvas();}
  function selectFood(button){
    if(!menuOpen||button.disabled)return;
    foodButtons.forEach(b=>b.disabled=true);
    if(!drive.orderPubFood(button.dataset.food)){
      foodButtons.forEach(b=>b.disabled=false);$('menuGreeting').textContent='Kellner: «Komm bitte etwas näher an den Tresen.»';return;
    }
    closeMenu();
  }
  function action(event){if(event.kind==='pub-order')openMenu();}
  function onKeyDown(event){
    if(menuOpen){
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu();return;}
      if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
        event.preventDefault();const at=foodButtons.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?foodButtons.length-1:(at+(event.key==='ArrowDown'?1:-1)+foodButtons.length)%foodButtons.length;foodButtons[next].focus();return;
      }
      if(event.key==='Tab'){
        const list=[...foodButtons,closeButton],index=list.indexOf(document.activeElement);event.preventDefault();list[(index+(event.shiftKey?-1:1)+list.length)%list.length].focus();return;
      }
      if(event.key==='Enter'&&event.repeat)event.preventDefault();
      return;
    }
    if(event.key==='Escape'){event.preventDefault();if(!event.repeat)togglePause();return;}
    const action=keyActions[event.key]||keyActions[event.key.toLowerCase?.()];
    if(action){event.preventDefault();if(ready&&!manualPaused)drive.input(action,true);return;}
    if(event.key==='Enter'&&!event.target.closest?.('button')){event.preventDefault();if(ready&&!event.repeat&&!manualPaused)drive.input('interact',true);}
  }
  function onKeyUp(event){const action=keyActions[event.key]||keyActions[event.key.toLowerCase?.()];if(action){event.preventDefault();drive.input(action,false);}}
  const touches=[];
  for(const button of document.querySelectorAll('[data-move]')){
    const down=e=>{e.preventDefault();if(!ready||manualPaused||menuOpen)return;button.setPointerCapture?.(e.pointerId);drive.input(button.dataset.move,true);};
    const up=e=>{e.preventDefault();drive.input(button.dataset.move,false);};
    button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);touches.push({button,down,up});
  }
  outside.addEventListener('click',()=>setView('outside'));inside.addEventListener('click',()=>setView('inside'));pauseButton.addEventListener('click',togglePause);orderButton.addEventListener('click',openMenu);closeButton.addEventListener('click',closeMenu);
  foodButtons.forEach(b=>b.addEventListener('click',()=>selectFood(b)));
  menu.addEventListener('click',e=>{if(e.target===menu)closeMenu();});
  document.addEventListener('keydown',onKeyDown);document.addEventListener('keyup',onKeyUp);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)drive.pause();else resumeWorld();});
  window.addEventListener('blur',()=>drive.pause());window.addEventListener('focus',resumeWorld);
  window.addEventListener('pagehide',()=>{disposed=true;ready=false;drive.reset();});
  async function boot(){
    try{
      if(!drive)throw new Error('Die 3D-Spielwelt fehlt. Bitte die Vorschau erneut öffnen.');
      drive.init(canvas,telemetry,action);
      if(!drive.previewPubView('outside'))throw new Error('Der Eingang des GCB Pub konnte nicht vorbereitet werden.');
      await drive.ready();if(disposed)return;
      ready=true;outside.disabled=inside.disabled=pauseButton.disabled=false;$('loading').hidden=true;
      outside.classList.add('active');resumeWorld();focusCanvas();
    }catch(error){showError(error.message||'Bitte öffne die Vorschau in einem Browser mit WebGL.');}
  }
  boot();
})();
