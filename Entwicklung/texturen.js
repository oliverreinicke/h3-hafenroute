/* Local texture families start with a neutral placeholder and receive fresh GPU storage after decode. */
window.cityTexturePending=[];
window.cityTextureReady=()=>Promise.all(window.cityTexturePending);
window.cityTexture=(T,name)=>{
 const family=[],surface=document.createElement('canvas');surface.width=surface.height=2;
 const c=surface.getContext('2d');c.fillStyle=(/_nor_|[-_]n\./.test(name))?'#8080ff':'#b5b1a7';c.fillRect(0,0,2,2);
 const tex=new T.Texture(surface);tex.needsUpdate=true;
 function track(texture){
  family.push(texture);
  const clone=texture.clone.bind(texture);
  texture.clone=()=>{const member=clone();track(member);return member;};
  return texture;
 }
 track(tex);
 const image=new Image();let done;
 const pending=new Promise(resolve=>done=resolve);window.cityTexturePending.push(pending);tex.userData.readyPromise=pending;
 image.onload=()=>{
  // Canvas 2x2 -> decoded Image changes dimensions and source type. A version bump
  // alone can retain the immutable 2px WebGL allocation. Retire that allocation
  // while every clone still points to the old source, then create a new family source.
  for(const member of family)member.dispose();
  const source=new T.Source(image);
  for(const member of family){member.source=source;member.needsUpdate=true;}
  done();
 };
 image.onerror=()=>{console.warn('Lokale Textur nicht verfügbar:',name);done();};
 image.src=window.cityAsset(name);return tex;
};
