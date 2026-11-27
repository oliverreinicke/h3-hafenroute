/* Local texture families start with a neutral placeholder and receive fresh GPU storage after decode. */
window.cityTexturePending=[];
window.cityTextureReady=()=>Promise.all(window.cityTexturePending);
window.cityTexture=(T,name)=>{
 const normal=/_nor_|[-_]n\./.test(name),roughness=/_rough_|[-_]r\./.test(name);
 const family=[],surface=document.createElement('canvas');surface.width=surface.height=2;
 const c=surface.getContext('2d');c.fillStyle=normal?'#8080ff':roughness?'#d4d4d4':'#b5b1a7';c.fillRect(0,0,2,2);
 const tex=new T.Texture(surface);tex.name=name;tex.colorSpace=normal||roughness?T.NoColorSpace:T.SRGBColorSpace;tex.needsUpdate=true;
 tex.userData.surfaceRole=normal?'normal':roughness?'roughness':'colour';
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
