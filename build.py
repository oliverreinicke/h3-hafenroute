"""Build web + standalone H3 city game from the local source, libraries and assets."""
from pathlib import Path
import re,base64,json,sys
root=Path(__file__).resolve().parent
src=root/'Entwicklung';dist=root/'dist'
def read(name):
 source=(src/name).read_text()
 if '--qa' not in sys.argv:source=re.sub(r'/\*QA-BEGIN\*/[\s\S]*?/\*QA-END\*/','',source)
 return source
def bindings(names,importing=False):
 out=[]
 for pair in names.split(','):
  parts=pair.split(' as ');source,target=parts[0],parts[-1];out.append(f'{source}:{target}' if importing else f'{target}:{source}')
 return ','.join(out)
def classic(source,core):
 source,n=re.subn(r'import\{([^}]+)\}from"\./three.core.min.js";',lambda m:'const {'+bindings(m[1],True)+'}=__core;',source);assert n==(0 if core else 1)
 source,n=re.subn(r'export\{([^}]+)\}from"\./three.core.min.js";','',source);assert n==(0 if core else 1)
 source,n=re.subn(r'export\{([^}]+)\};\s*$',lambda m:'return {'+('' if core else '...__core,')+bindings(m[1])+'};',source);assert n==1
 return '(function(){"use strict";'+source+'})()'
def addon(filename,name,exports):
 code=(root/'vendor'/filename).read_text()
 code=re.sub(r"import\s*\{([^}]+)\}\s*from './three.module.min.js';",r'const {\1}=window.THREE;',code)
 code=code.replace("import { toTrianglesDrawMode } from './BufferGeometryUtils.js';","const {toTrianglesDrawMode}=window.GeometryTools;")
 code,n=re.subn(r'export\s*\{[^}]+\};\s*$','return {'+exports+'};',code);assert n==1
 return 'window.'+name+'=(()=>{'+code+'})();'
core=classic((dist/'vendor/three.core.min.js').read_text(),True)
webgl=classic((dist/'vendor/three.module.min.js').read_text(),False)
engine='<script>window.THREE=(function(){const __core='+core+';return '+webgl+';})();</script>'
addons='\n'.join(addon(*args) for args in [('BufferGeometryUtils.js','GeometryTools','toTrianglesDrawMode,mergeGeometries'),('SkeletonUtils.js','SkeletonTools','clone'),('GLTFLoader.js','AssetLoader','GLTFLoader')])
licence=(dist/'vendor/LICENSE-Three.txt').read_text()+'\n'+(root/'ASSET-LICENSES.txt').read_text()+'\n'+(root/'vendor/LICENSE-Sketchbook.txt').read_text()
page=read('ui.html').replace('/*STYLES*/',read('style.css')).replace('<!--ENGINE-->',engine).replace('<!--CREDITS-->','<!--\n'+licence.replace('--','–')+'\n-->').replace('/*ADDONS*/',addons)
game='\n;\n'.join(read(f) for f in ['texturen.js','menschen.js','keyart.js','pub.js','stadt.js','fahrzeuge.js','mobilitaet.js','verkehr.js','leistung.js','fahrt.js','missions.js','rules.js','navigation.js','gespraeche.js','audio.js','app.js'])
page=page.replace('/*GAME*/',game)
(dist/'index.html').write_text(page.replace('/*ASSETS*/','window.cityAsset=name=>"assets/"+name;'))
assets={p.name:'data:'+({'.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.m4a':'audio/mp4','.wav':'audio/wav','.glb':'model/gltf-binary'}[p.suffix])+';base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted((dist/'assets').iterdir()) if p.suffix in ['.jpg','.png','.webp','.mp3','.m4a','.wav','.glb']}
standalone=page.replace('/*ASSETS*/','const cityAssets='+json.dumps(assets,separators=(',',':'))+';window.cityAsset=name=>cityAssets[name];')
out=root/'Hafenroute_H3.html';out.write_text(standalone)
print(f'Web: {len(page)//1024} KiB; Einzeldatei: {out.stat().st_size//1024} KiB; {len(assets)} lokale Assets.')
