import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createLuminaryPresence, PRESENCE_SCREEN_OFFSET } from './luminaryPresence';
import { gltfModelCache } from '../utils/gltfLoaderService';
test('Luminary keeps its screen anchor with the camera offsets used in Element environments',()=>{
 const presence=createLuminaryPresence();
 const camera=new THREE.PerspectiveCamera(55,1618/900,0.1,1000);
 for(const position of [new THREE.Vector3(0,1.5,12),new THREE.Vector3(4,3,18)]){
  camera.position.copy(position);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  presence.update(1,0.016,false,false,camera,1618,900);
  const ndc=presence.root.position.clone().project(camera);
  assert.ok(Math.abs(ndc.x-(1-2*PRESENCE_SCREEN_OFFSET.right/1618))<1e-6);
  assert.ok(Math.abs(ndc.y-(-1+2*PRESENCE_SCREEN_OFFSET.bottom/900))<1e-6);
 }
 presence.dispose();
});
test('disposing an environment Luminary leaves shared cached model resources intact',()=>{
 const geometry=new THREE.BoxGeometry(1,2,1);const material=new THREE.MeshStandardMaterial();
 let geometryDisposed=false,materialDisposed=false;
 geometry.addEventListener('dispose',()=>{geometryDisposed=true;});material.addEventListener('dispose',()=>{materialDisposed=true;});
 const source=new THREE.Group();source.add(new THREE.Mesh(geometry,material));
 const prior=gltfModelCache.get('luminary');gltfModelCache.set('luminary',source);
 try {const presence=createLuminaryPresence();presence.applyModel();presence.dispose();assert.equal(geometryDisposed,false);assert.equal(materialDisposed,false);}
 finally {if(prior)gltfModelCache.set('luminary',prior);else gltfModelCache.delete('luminary');geometry.dispose();material.dispose();}
});
