/* One animation skeleton drives the body, clothes and hair of each resident. */
window.People3D=(()=>{
  const sets=new Map();
  const parts=['body','top','pants','shoes','hair'];
  function template(sex){
    if(sets.has(sex))return sets.get(sex);
    const loader=new window.AssetLoader.GLTFLoader();
    const pending=Promise.all(parts.map(async part=>{
      const url=window.cityAsset(sex+'-'+part+'.glb');
      return loader.parseAsync(await (await fetch(url)).arrayBuffer(),'');
    })).then(([base,...outfit])=>{
      const model=base.scene,bones=new Map();
      model.traverse(node=>{if(node.isBone)bones.set(node.name,node);if(node.isMesh)node.userData.part='body';});
      for(const [index,item] of outfit.entries()){
        const meshes=[];item.scene.traverse(node=>{if(node.isSkinnedMesh)meshes.push(node);});
        for(const mesh of meshes){
          const rig=mesh.skeleton,bind=mesh.bindMatrix.clone();
          const mapped=rig.bones.map(b=>bones.get(b.name));
          model.add(mesh);mesh.bind(new THREE.Skeleton(mapped,rig.boneInverses),bind);
          mesh.userData.part=parts[index+1];
        }
      }
      model.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(model);
      const clips={};
      for(const a of base.animations.filter(clip=>['walk','idle_breathe'].includes(clip.name))){
        const clip=a.clone();
        for(const tr of clip.tracks.filter(t=>/(?:^|[./])Root\.position$/.test(t.name))){
          const v=tr.values;for(let i=3;i<v.length;i+=3){v[i]=v[0];v[i+2]=v[2];}
        }
        clips[a.name]=clip;
      }
      return {model,bounds,clips};
    });
    sets.set(sex,pending);pending.catch(()=>sets.delete(sex));return pending;
  }
  // Reuse a skeleton only when joint identity, order and inverse bind matrices agree.
  function shareSkeletons(figure){
    const rigs=[];
    figure.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const own=mesh.skeleton;
      const shared=rigs.find(r=>r.bones.length===own.bones.length&&r.bones.every((b,i)=>b===own.bones[i]&&r.boneInverses[i].equals(own.boneInverses[i])));
      if(shared){if(shared!==own){mesh.skeleton=shared;own.dispose()}}else rigs.push(own);
    });
  }
  let fabric,clothRoughness;
  function clothSurface(){
    if(clothRoughness)return clothRoughness;
    const pixels=new Uint8Array(64*64*4);
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){
      const i=(y*64+x)*4,v=226+((x*17+y*31)&7)+((x+y)%2?8:0);
      pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;
    }
    clothRoughness=new THREE.DataTexture(pixels,64,64,THREE.RGBAFormat);
    clothRoughness.wrapS=clothRoughness.wrapT=THREE.RepeatWrapping;clothRoughness.repeat.set(7,7);
    clothRoughness.generateMipmaps=true;clothRoughness.minFilter=THREE.LinearMipmapLinearFilter;
    clothRoughness.colorSpace=THREE.NoColorSpace;clothRoughness.flipY=false;clothRoughness.needsUpdate=true;
    return clothRoughness;
  }
  function attach(parent,person,onReady){
    const {sex,height,shirt,pants,hair,skin}=person;
    let disposed=false;
    const state={ready:false,figure:null,dispose(){disposed=true;this.ready=false;if(!this.figure)return;const mats=new Set(),rigs=new Set();this.figure.traverse(o=>{if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))mats.add(m);if(o.skeleton)rigs.add(o.skeleton)});this.figure.removeFromParent();for(const m of mats)m.dispose();for(const r of rigs)r.dispose();this.figure=null;this.update=()=>{}},pose:"standing",setPose(pose){this.pose=pose;this.update(0,0)},update(){}};
    state.promise=template(sex).then(({model,bounds,clips})=>{
      if(disposed||!parent.parent)return;
      const figure=window.SkeletonTools.clone(model);shareSkeletons(figure);
      const scale=height/(bounds.max.y-bounds.min.y);figure.scale.setScalar(scale);figure.position.y=-bounds.min.y*scale;
      if(!fabric){fabric=(window.cityTexture?window.cityTexture(THREE,'fabric_pattern_07_nor_gl_1k.jpg'):new THREE.TextureLoader().load(window.cityAsset('fabric_pattern_07_nor_gl_1k.jpg')));fabric.wrapS=fabric.wrapT=THREE.RepeatWrapping;fabric.repeat.set(7,7);fabric.flipY=false;fabric.colorSpace=THREE.NoColorSpace;}
      figure.traverse(mesh=>{
        if(!mesh.isMesh)return;
        mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=true;
        if(mesh.isSkinnedMesh){if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();mesh.boundingSphere=mesh.geometry.boundingSphere.clone();mesh.boundingSphere.radius=mesh.boundingSphere.radius*1.8+.65/scale;}
        const part=mesh.userData.part,m=mesh.material.clone();
        if(part==='top'||part==='pants'){m.color.set(part==='top'?shirt:pants);m.normalMap=fabric;m.normalScale.set(.085,.085);m.roughnessMap=clothSurface();m.roughness=.94;m.envMapIntensity=.18;}
        if(part==='hair'){m.color.set(hair);m.roughness=.86;m.envMapIntensity=.14;}
        if(part==='shoes'){m.color.set(0x45403a);m.roughness=.76;m.envMapIntensity=.20;}
        if(part==='body'&&m.name==='Skin'){m.color.set(skin);m.roughness=.58;m.envMapIntensity=.32;if(m.normalMap)m.normalScale.set(.45,.45);}
        if(part==='body'&&['Eye','Iris'].includes(m.name)){m.roughness=m.name==='Eye'?.38:.46;m.envMapIntensity=.35;}
        if(part==='body'&&m.name==='Cornea'){m.roughness=.035;m.depthWrite=false;m.side=THREE.FrontSide;m.forceSinglePass=true;m.envMapIntensity=.8;}
        if(m.alphaTest>0)m.alphaToCoverage=true;
        for(const map of [m.map,m.normalMap])if(map)map.anisotropy=4;
        mesh.material=m;
      });
      figure.rotation.y=person.reverse?Math.PI:0;parent.add(figure);
      const mixer=new THREE.AnimationMixer(figure);
      const walk=mixer.clipAction(clips.walk),idle=mixer.clipAction(clips.idle_breathe);let walkWeight=0;
      idle.play();walk.play();walk.time=walk.getClip().duration*(person.phase||0);
      state.figure=figure;const baseY=figure.position.y;
      const joints=[];for(const side of ['l','r']){const thigh=figure.getObjectByName('thigh_'+side),calf=figure.getObjectByName('calf_'+side),foot=figure.getObjectByName('foot_'+side);if(thigh&&calf&&foot)joints.push({bone:thigh,child:calf,down:false,saved:new THREE.Quaternion(),target:new THREE.Quaternion()},{bone:calf,child:foot,down:true,saved:new THREE.Quaternion(),target:new THREE.Quaternion()})}
      const forward=new THREE.Vector3(),down=new THREE.Vector3(),from=new THREE.Vector3(),actual=new THREE.Vector3(),world=new THREE.Quaternion(),delta=new THREE.Quaternion(),parentQ=new THREE.Quaternion();let wasSeated=false,seatedCached=false,wasScooter=false,scooterCached=false;
      const armPairs=['l','r'].map((side,i)=>({side:i===0?1:-1,upper:figure.getObjectByName('upperarm_'+side),lower:figure.getObjectByName('lowerarm_'+side),hand:figure.getObjectByName('hand_'+side)})).filter(a=>a.upper&&a.lower&&a.hand);
      const feet=['l','r'].map(side=>({bone:figure.getObjectByName('foot_'+side),world:new THREE.Quaternion()})).filter(f=>f.bone);
      const spine=figure.getObjectByName('spine_02'),chest=figure.getObjectByName('spine_03');
      const scooterBones=[...new Set([...joints.map(j=>j.bone),...feet.map(f=>f.bone),...armPairs.flatMap(a=>[a.upper,a.lower,a.hand]),spine].filter(Boolean))].map(bone=>({bone,saved:new THREE.Quaternion(),target:new THREE.Quaternion()}));
      const right=new THREE.Vector3(),up=new THREE.Vector3(),direction=new THREE.Vector3(),target=new THREE.Vector3(),elbow=new THREE.Vector3(),bend=new THREE.Vector3(),shoulder=new THREE.Vector3(),lowerPos=new THREE.Vector3(),handPos=new THREE.Vector3();
      function aim(bone,child,toward){
        figure.updateMatrixWorld(true);bone.getWorldPosition(from);child.getWorldPosition(actual).sub(from).normalize();
        bone.getWorldQuaternion(world);delta.setFromUnitVectors(actual,toward.normalize());bone.parent.getWorldQuaternion(parentQ).invert();bone.quaternion.copy(parentQ.multiply(delta.multiply(world)));
      }
      function scooterPose(){
        figure.updateMatrixWorld(true);forward.set(0,0,1).transformDirection(figure.matrixWorld);down.set(0,-1,0).transformDirection(figure.matrixWorld);right.set(1,0,0).transformDirection(figure.matrixWorld);up.copy(down).negate();
        for(const f of feet)f.bone.getWorldQuaternion(f.world);
        if(spine&&chest)aim(spine,chest,direction.copy(up).addScaledVector(forward,.05));
        for(let i=0;i<joints.length;i++){const j=joints[i],front=i<2,lean=j.down?(front ? .08 : -.30):(front ? .24 : .10);aim(j.bone,j.child,direction.copy(down).addScaledVector(forward,lean));}
        for(const f of feet){figure.updateMatrixWorld(true);f.bone.parent.getWorldQuaternion(parentQ).invert();f.bone.quaternion.copy(parentQ.multiply(f.world));}
        for(const a of armPairs){
          figure.updateMatrixWorld(true);a.upper.getWorldPosition(shoulder);a.lower.getWorldPosition(lowerPos);a.hand.getWorldPosition(handPos);
          const l1=shoulder.distanceTo(lowerPos),l2=lowerPos.distanceTo(handPos);
          target.set(a.side*height*.14/scale,bounds.min.y+height*.66/scale,height*.255/scale).applyMatrix4(figure.matrixWorld);
          direction.copy(target).sub(shoulder);const distance=Math.max(.001,Math.min(direction.length(),l1+l2-.001));direction.normalize();
          const along=(l1*l1-l2*l2+distance*distance)/(2*distance),lift=Math.sqrt(Math.max(0,l1*l1-along*along));
          bend.copy(down).addScaledVector(right,a.side*.5);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
          elbow.copy(shoulder).addScaledVector(direction,along).addScaledVector(bend,lift);aim(a.upper,a.lower,direction.copy(elbow).sub(shoulder));
          figure.updateMatrixWorld(true);a.lower.getWorldPosition(lowerPos);aim(a.lower,a.hand,direction.copy(target).sub(lowerPos));
        }
        for(const j of scooterBones)j.target.copy(j.bone.quaternion);
      }
      state.update=(dt,speed)=>{
        if(disposed)return;
        if(wasSeated)for(const j of joints)j.bone.quaternion.copy(j.saved);
        if(wasScooter)for(const j of scooterBones)j.bone.quaternion.copy(j.saved);
        const seconds=Math.min(.25,Math.max(0,Number(dt)||0)),weight=state.pose==='standing'?Math.min(1,Math.abs(speed)/.85):0;
        walkWeight=state.pose==='standing'?walkWeight+(weight-walkWeight)*(1-Math.exp(-seconds*10)):0;
        walk.setEffectiveWeight(walkWeight);idle.setEffectiveWeight(1-walkWeight);
        walk.timeScale=Math.sign(speed||1)*Math.min(2.3,Math.max(.65,Math.abs(speed)/1.35));mixer.update(seconds);
        figure.rotation.x=0;figure.position.set(0,baseY,0);
        if(state.pose==='seated'){
          wasScooter=false;
          for(const j of joints)j.saved.copy(j.bone.quaternion);
          if(!seatedCached){
            figure.updateMatrixWorld(true);forward.set(0,0,1).transformDirection(figure.matrixWorld);down.set(0,-1,0).transformDirection(figure.matrixWorld);
            for(const j of joints){j.bone.getWorldPosition(from);j.child.getWorldPosition(actual).sub(from).normalize();j.bone.getWorldQuaternion(world);delta.setFromUnitVectors(actual,j.down?down:forward);j.bone.parent.getWorldQuaternion(parentQ).invert();j.bone.quaternion.copy(parentQ.multiply(delta.multiply(world)));j.target.copy(j.bone.quaternion);figure.updateMatrixWorld(true)}
            seatedCached=true;
          }else for(const j of joints)j.bone.quaternion.copy(j.target);
          figure.position.y=baseY-.42;wasSeated=true;
        }else if(state.pose==='scooter'){
          wasSeated=false;for(const j of scooterBones)j.saved.copy(j.bone.quaternion);
          if(!scooterCached){scooterPose();scooterCached=true;}else for(const j of scooterBones)j.bone.quaternion.copy(j.target);
          figure.position.y=baseY-.018;wasScooter=true;
        }else{wasSeated=false;wasScooter=false;if(state.pose==='lying'){figure.rotation.x=-Math.PI/2;figure.position.set(0,.98,.82+baseY);}}
      };
      state.update(0,0);state.ready=true;onReady?.();
    }).catch(error=>console.warn('Figur in vereinfachter Darstellung',error.message));
    return state;
  }
  return {attach};
})();
