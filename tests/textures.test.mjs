import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from '../dist/vendor/three.module.min.js';
const images=[],warnings=[],window={cityAsset:n=>'assets/'+n};
const context=vm.createContext({window,console:{warn:(...args)=>warnings.push(args)},document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){}})})},Image:class{constructor(){images.push(this)}}});
vm.runInContext(fs.readFileSync(new URL('../Entwicklung/texturen.js',import.meta.url),'utf8'),context);
const a=window.cityTexture(T,'beige_wall_001_nor_gl_1k.jpg'),b=a.clone(),c=b.clone();
const oldSource=a.source,version=b.version,retired=[];
for(const texture of[a,b,c])texture.addEventListener('dispose',()=>retired.push({texture,source:texture.source,image:texture.image}));
assert.equal(a.image.width,2);assert.equal(a.source,b.source);assert.equal(b.source,c.source);assert.equal(images[0].src,'assets/beige_wall_001_nor_gl_1k.jpg');
let ready=false;const barrier=window.cityTextureReady().then(()=>ready=true);await Promise.resolve();assert(!ready);
images[0].width=512;images[0].height=512;images[0].onload();await barrier;
assert.equal(retired.length,3);for(const item of retired){assert.equal(item.source,oldSource);assert.equal(item.image.width,2)}
assert.notEqual(a.source,oldSource);assert.equal(a.source,b.source);assert.equal(b.source,c.source);assert.equal(a.image,images[0]);assert.equal(b.image,images[0]);assert.equal(c.image,images[0]);assert(b.version>version);assert(ready);
console.log('PASS placeholder allocation retired before every original/clone/nested-clone moves to a fresh shared 512px source.');
const d=c.clone();assert.equal(d.source,a.source);assert.equal(d.image.width,512);assert.equal(d.image,images[0]);
console.log('PASS clone made after decode shares the decoded image and fresh source.');
const fallback=window.cityTexture(T,'missing.jpg'),fallbackClone=fallback.clone(),failedSource=fallback.source;
images[1].onerror();await window.cityTextureReady();assert.equal(warnings.length,1);assert.equal(fallback.source,failedSource);assert.equal(fallbackClone.source,failedSource);assert.equal(fallback.image.width,2);
console.log('PASS missing image resolves the barrier with a valid shared fallback without premature retirement.');
console.log('Three-source lifecycle checks do not replace the real GPU upload regression check.');
