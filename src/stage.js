// 3D dojo-style stage with left/right walls (wall-splat boundaries).
// Surfaces use procedural textures + bump maps (wood grain, plaster, woven
// fabric) so walls/floor catch the lantern light with real depth.
import * as THREE from 'three';
import { getTextureSet } from './textures.js';

export const WALL_X = 6.4; // gameplay wall plane

function texturedMat(kind, color, seed, opts = {}) {
  const { map, bumpMap } = getTextureSet(kind, color, seed);
  return new THREE.MeshStandardMaterial({
    map, bumpMap,
    bumpScale: opts.bumpScale ?? 1.6,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0,
    ...(opts.side ? { side: opts.side } : {}),
    ...(opts.emissive != null ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 1 } : {}),
  });
}

export function buildStage(scene) {
  scene.background = new THREE.Color(0x161226);
  scene.fog = new THREE.Fog(0x161226, 18, 42);

  // lights
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x3a2b22, 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffeedd, 1.6);
  key.position.set(4, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -10; key.shadow.camera.right = 10;
  key.shadow.camera.top = 10; key.shadow.camera.bottom = -3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7f9dff, 0.7);
  rim.position.set(-5, 6, -6);
  scene.add(rim);

  // floor — wooden planks (two grain seeds so alternating boards read distinct)
  const floorGroup = new THREE.Group();
  const plankMatA = texturedMat('wood', 0x8a6642, 101, { roughness: 0.8, bumpScale: 2.0 });
  const plankMatB = texturedMat('wood', 0x7a5738, 202, { roughness: 0.82, bumpScale: 2.0 });
  for (let i = 0; i < 16; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 7.6), i % 2 ? plankMatA : plankMatB);
    plank.position.set(-7.5 + i, -0.04, 0);
    plank.receiveShadow = true;
    floorGroup.add(plank);
  }
  scene.add(floorGroup);

  // center emblem — worn painted circle
  const emblem = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 40),
    texturedMat('plaster', 0xa03030, 303, { roughness: 0.75, bumpScale: 1.2 })
  );
  emblem.rotation.x = -Math.PI / 2;
  emblem.position.y = 0.005;
  emblem.receiveShadow = true;
  scene.add(emblem);

  // side walls — cracked plaster with gold trim
  const wallMat = texturedMat('plaster', 0x4a3b55, 404, { roughness: 0.88, bumpScale: 2.2 });
  const wallTrim = new THREE.MeshStandardMaterial({ color: 0xd8b56a, roughness: 0.45, metalness: 0.45 });
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.6, 7.6), wallMat);
    wall.position.set(s * (WALL_X + 0.45), 1.8, 0);
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 7.7), wallTrim);
    trim.position.set(s * (WALL_X + 0.45), 3.5, 0);
    scene.add(trim);
    // wall lanterns
    for (const z of [-2.4, 0, 2.4]) {
      const lampBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.42, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffa030, emissiveIntensity: 1.4 })
      );
      lampBody.position.set(s * (WALL_X + 0.12), 2.4, z);
      scene.add(lampBody);
    }
    const lampLight = new THREE.PointLight(0xffa860, 6, 8);
    lampLight.position.set(s * (WALL_X - 0.4), 2.4, 0);
    scene.add(lampLight);
  }

  // back platform edge + pillars for depth
  const backMat = texturedMat('plaster', 0x2c2440, 505, { roughness: 0.92, bumpScale: 1.8 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(15.4, 4.5, 0.4), backMat);
  backWall.position.set(0, 2.2, -4.0);
  backWall.receiveShadow = true;
  scene.add(backWall);
  const pillarMat = texturedMat('wood', 0x5a4a35, 606, { roughness: 0.78, bumpScale: 2.0 });
  for (const x of [-6, -3, 0, 3, 6]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 0.4), pillarMat);
    pillar.position.set(x, 2.2, -3.7);
    pillar.castShadow = true;
    scene.add(pillar);
  }
  // hanging banners — woven cloth with fold shading
  const bannerMat = texturedMat('fabric', 0x8f2038, 707, { roughness: 0.9, bumpScale: 1.0, side: THREE.DoubleSide });
  for (const x of [-4.5, 1.5]) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), bannerMat);
    banner.position.set(x, 2.6, -3.45);
    scene.add(banner);
  }
  // front floor edge glow (stage boundary feel)
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(15.4, 0.1, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xd8b56a, emissive: 0x654a10, emissiveIntensity: 0.6 })
  );
  edge.position.set(0, 0.02, 3.85);
  scene.add(edge);

  // faint moon disc in the sky
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 40),
    new THREE.MeshBasicMaterial({ color: 0xcfd8ff, fog: false })
  );
  moon.position.set(-8, 11, -26);
  scene.add(moon);
}
