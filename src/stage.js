// 2097 Ganymede arena — metal fight deck between energy barriers, holo ad
// panels, floodlights, and Jupiter hanging huge in the black sky. Surfaces use
// procedural metal textures; left/right walls remain the wall-splat boundaries.
import * as THREE from 'three';
import { getTextureSet, metalMaterial, jupiterMaterial } from './textures.js';

export const WALL_X = 6.4; // gameplay wall plane

export function buildStage(scene) {
  scene.background = new THREE.Color(0x05060e);
  scene.fog = new THREE.Fog(0x05060e, 18, 46);

  // lights — cold arena floods + warm accent
  const hemi = new THREE.HemisphereLight(0x9fb8ff, 0x1a1410, 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xeef2ff, 1.7);
  key.position.set(4, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -10; key.shadow.camera.right = 10;
  key.shadow.camera.top = 10; key.shadow.camera.bottom = -3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6f8dff, 0.8);
  rim.position.set(-5, 6, -6);
  scene.add(rim);

  // fight deck — armored floor plates (two seeds so alternating plates read distinct)
  const floorGroup = new THREE.Group();
  const plateMatA = metalMaterial(0x3a4150, 111, { panels: 2, wear: 0.7, rough: 0.5 });
  const plateMatB = metalMaterial(0x2e3542, 222, { panels: 2, wear: 0.9, rough: 0.55 });
  for (let i = 0; i < 16; i++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 7.6), i % 2 ? plateMatA : plateMatB);
    plate.position.set(-7.5 + i, -0.04, 0);
    plate.receiveShadow = true;
    floorGroup.add(plate);
  }
  scene.add(floorGroup);

  // center ring — glowing WAR broadcast circle
  const emblem = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a2a3a, emissive: 0x2fd8ff, emissiveIntensity: 0.9, side: THREE.DoubleSide })
  );
  emblem.rotation.x = -Math.PI / 2;
  emblem.position.y = 0.006;
  scene.add(emblem);
  const emblemCore = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 48),
    metalMaterial(0x232833, 333, { panels: 3, wear: 0.6, rough: 0.45 })
  );
  emblemCore.rotation.x = -Math.PI / 2;
  emblemCore.position.y = 0.005;
  emblemCore.receiveShadow = true;
  scene.add(emblemCore);

  // side walls — armored barriers with hazard stripes + energy trim
  const wallMat = metalMaterial(0x2a2f3d, 444, { panels: 3, wear: 1.0, rough: 0.5 });
  const hazardMat = new THREE.MeshStandardMaterial({ color: 0xd8b53a, emissive: 0x9a7410, emissiveIntensity: 0.35, roughness: 0.5, metalness: 0.4 });
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.6, 7.6), wallMat);
    wall.position.set(s * (WALL_X + 0.45), 1.8, 0);
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 7.65), hazardMat);
    stripe.position.set(s * (WALL_X + 0.45), 0.6, 0);
    scene.add(stripe);
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.14, 7.7),
      new THREE.MeshStandardMaterial({ color: 0x66e0ff, emissive: 0x2fd8ff, emissiveIntensity: 1.2, roughness: 0.3 })
    );
    trim.position.set(s * (WALL_X + 0.45), 3.5, 0);
    scene.add(trim);
    // barrier floodlights (emissive only — point lights are costly on software GL)
    for (const z of [-2.4, 0, 2.4]) {
      const lampBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.36, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x8fd0ff, emissiveIntensity: 1.6 })
      );
      lampBody.position.set(s * (WALL_X + 0.12), 2.5, z);
      scene.add(lampBody);
    }
  }

  // back gantry — plated wall, support struts, holo ad panels
  const backMat = metalMaterial(0x1a1e2a, 555, { panels: 4, wear: 0.8, rough: 0.6 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(15.4, 4.5, 0.4), backMat);
  backWall.position.set(0, 2.2, -4.0);
  backWall.receiveShadow = true;
  scene.add(backWall);
  const strutMat = metalMaterial(0x3a3f4c, 666, { panels: 2, wear: 0.6, rough: 0.45 });
  for (const x of [-6, -3, 0, 3, 6]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 0.4), strutMat);
    strut.position.set(x, 2.2, -3.7);
    strut.castShadow = true;
    scene.add(strut);
  }
  // holo ad panels (fabric-weave texture tinted neon, emissive so they read as screens)
  const adColors = [[0x8f2038, 0xff3a6a], [0x0f3a5c, 0x2fd8ff]];
  [-4.5, 1.5].forEach((x, i) => {
    const { map } = getTextureSet('fabric', adColors[i][0], 707 + i);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 2.2),
      new THREE.MeshStandardMaterial({ map, emissive: adColors[i][1], emissiveIntensity: 0.4, roughness: 0.7, side: THREE.DoubleSide })
    );
    panel.position.set(x, 2.6, -3.45);
    scene.add(panel);
  });
  // front deck edge — energy boundary strip
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(15.4, 0.1, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x66e0ff, emissive: 0x1a9ac0, emissiveIntensity: 0.9 })
  );
  edge.position.set(0, 0.02, 3.85);
  scene.add(edge);

  // Jupiter, huge over the Ganymede horizon
  const jupiter = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), jupiterMaterial());
  jupiter.position.set(-13, 9.5, -34);
  scene.add(jupiter);

  // star field
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  let sSeed = 12345;
  const srnd = () => { sSeed = (sSeed * 16807) % 2147483647; return sSeed / 2147483647; };
  for (let i = 0; i < 220; i++) {
    starPos.push((srnd() - 0.5) * 90, 4 + srnd() * 30, -34 - srnd() * 6);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 0.09, fog: false }));
  scene.add(stars);
}
