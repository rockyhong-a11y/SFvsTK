// Procedural humanoid rig built from boxes. Built facing +x; root rotation.y flips facing.
// Pose keys (all default 0):
//   y, x        : root offset (x = forward in facing space)
//   tl, tw      : torso lean forward(+) / twist
//   sL, sR      : shoulder swing (+ = arm forward)
//   sxL, sxR    : shoulder spread (+ = arm out to the side)
//   eL, eR      : elbow bend (+ = forearm forward)
//   hL, hR      : hip swing (+ = leg forward)
//   kL, kR      : knee bend (- = heel back)
//   ry          : whole-body extra yaw (spins)
//   rz          : whole-body pitch (+ = fall on back), for knockdown/launch
import * as THREE from 'three';

const POSE_KEYS = ['y','x','tl','tw','sL','sR','sxL','sxR','eL','eR','hL','hR','kL','kR','ry','rz'];

export function lerpPose(a, b, t) {
  const out = {};
  for (const k of POSE_KEYS) {
    const av = a[k] || 0, bv = b[k] || 0;
    out[k] = av + (bv - av) * t;
  }
  return out;
}

// clip: array of [tNorm(0..1), pose]; sample with ease between keys
export function sampleClip(frames, t) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, p0] = frames[i], [t1, p1] = frames[i + 1];
    if (t <= t1) {
      const u = (t - t0) / Math.max(1e-6, t1 - t0);
      const e = u * u * (3 - 2 * u); // smoothstep
      return lerpPose(p0, p1, e);
    }
  }
  return frames[frames.length - 1][1];
}

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

export function buildRig(cfg) {
  const mats = {
    skin: new THREE.MeshStandardMaterial({ color: cfg.skin, roughness: 0.75 }),
    top: new THREE.MeshStandardMaterial({ color: cfg.top, roughness: 0.85 }),
    pants: new THREE.MeshStandardMaterial({ color: cfg.pants, roughness: 0.85 }),
    glove: new THREE.MeshStandardMaterial({ color: cfg.glove, roughness: 0.6 }),
    hair: new THREE.MeshStandardMaterial({ color: cfg.hair, roughness: 0.9 }),
    accent: new THREE.MeshStandardMaterial({ color: cfg.accent, roughness: 0.6 }),
  };
  const materials = Object.values(mats);

  const root = new THREE.Group();
  const spin = new THREE.Group(); // for ry spins
  root.add(spin);

  const pelvis = new THREE.Group();
  pelvis.position.y = 0.95;
  spin.add(pelvis);
  const pelvisMesh = box(0.3, 0.22, 0.34, mats.pants);
  pelvis.add(pelvisMesh);
  // belt
  const belt = box(0.32, 0.07, 0.36, mats.accent);
  belt.position.y = 0.12;
  pelvis.add(belt);

  const torso = new THREE.Group();
  torso.position.y = 0.14;
  pelvis.add(torso);
  const torsoMesh = box(0.3, 0.52, 0.38, mats.top);
  torsoMesh.position.y = 0.3;
  torso.add(torsoMesh);
  if (cfg.skirt) {
    // qipao side-slit panels (front & back in facing space)
    for (const s of [-1, 1]) {
      const panel = box(0.1, 0.34, 0.3, mats.top);
      panel.position.set(s * 0.16, -0.2, 0);
      pelvis.add(panel);
    }
  }

  const head = new THREE.Group();
  head.position.y = 0.62;
  torso.add(head);
  const headMesh = box(0.24, 0.26, 0.22, mats.skin);
  headMesh.position.y = 0.13;
  head.add(headMesh);
  const hairMesh = box(0.26, 0.12, 0.24, mats.hair);
  hairMesh.position.set(-0.02, 0.26, 0);
  head.add(hairMesh);
  if (cfg.hairstyle === 'buns') {
    // ox-horn double buns + gold ribbons
    for (const s of [-1, 1]) {
      const bun = box(0.11, 0.11, 0.11, mats.hair);
      bun.position.set(-0.02, 0.28, s * 0.14);
      head.add(bun);
      const ribbon = box(0.12, 0.03, 0.12, mats.accent);
      ribbon.position.set(-0.02, 0.225, s * 0.14);
      head.add(ribbon);
    }
    const bang = box(0.05, 0.1, 0.22, mats.hair);
    bang.position.set(0.1, 0.2, 0);
    head.add(bang);
  } else if (cfg.hairstyle === 'ponytail') {
    const tailTop = box(0.1, 0.16, 0.1, mats.hair);
    tailTop.position.set(-0.15, 0.2, 0);
    tailTop.rotation.z = 0.5;
    head.add(tailTop);
    const tail = box(0.07, 0.42, 0.08, mats.hair);
    tail.position.set(-0.22, -0.05, 0);
    tail.rotation.z = 0.18;
    head.add(tail);
    const bang = box(0.05, 0.12, 0.2, mats.hair);
    bang.position.set(0.1, 0.19, 0);
    head.add(bang);
  } else if (cfg.hairstyle === 'braids') {
    // twin long braids hanging at the front sides
    for (const s of [-1, 1]) {
      const braid = box(0.07, 0.46, 0.07, mats.hair);
      braid.position.set(0.04, -0.1, s * 0.13);
      braid.rotation.x = s * 0.12;
      head.add(braid);
      const knot = box(0.09, 0.09, 0.09, mats.hair);
      knot.position.set(0.02, 0.14, s * 0.12);
      head.add(knot);
    }
    const bang = box(0.05, 0.1, 0.2, mats.hair);
    bang.position.set(0.1, 0.2, 0);
    head.add(bang);
  } else if (cfg.hairstyle === 'short') {
    // bob cut: side + back volume
    const side = box(0.2, 0.2, 0.28, mats.hair);
    side.position.set(-0.05, 0.12, 0);
    head.add(side);
    const bang = box(0.05, 0.09, 0.22, mats.hair);
    bang.position.set(0.11, 0.21, 0);
    head.add(bang);
  }
  if (cfg.beret) {
    const beret = box(0.3, 0.07, 0.28, mats.accent);
    beret.position.set(-0.03, 0.3, 0.02);
    beret.rotation.x = 0.12;
    head.add(beret);
  }

  function buildArm(side) { // side: +1 near(z+), -1 far
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 0.5, side * 0.27);
    torso.add(shoulder);
    const upper = box(0.12, 0.3, 0.12, cfg.sleeves ? mats.top : mats.skin);
    upper.position.y = -0.14;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    const fore = box(0.1, 0.26, 0.1, cfg.sleeves ? mats.top : mats.skin);
    fore.position.y = -0.13;
    elbow.add(fore);
    if (cfg.bracelets) {
      const brace = box(0.14, 0.09, 0.14, mats.accent);
      brace.position.y = -0.22;
      elbow.add(brace);
    }
    const fist = box(0.14, 0.14, 0.14, mats.glove);
    fist.position.y = -0.32;
    elbow.add(fist);
    const tip = new THREE.Object3D();
    tip.position.y = -0.36;
    elbow.add(tip);
    return { shoulder, elbow, tip };
  }
  const armL = buildArm(+1);
  const armR = buildArm(-1);

  function buildLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(0, -0.1, side * 0.11);
    pelvis.add(hip);
    const thigh = box(0.16, 0.4, 0.16, mats.pants);
    thigh.position.y = -0.2;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);
    const shin = box(0.13, 0.38, 0.13, mats.pants);
    shin.position.y = -0.19;
    knee.add(shin);
    const foot = box(0.24, 0.09, 0.13, mats.glove);
    foot.position.set(0.05, -0.42, 0);
    knee.add(foot);
    const tip = new THREE.Object3D();
    tip.position.set(0.1, -0.44, 0);
    knee.add(tip);
    return { hip, knee, tip };
  }
  const legL = buildLeg(+1);
  const legR = buildLeg(-1);

  const rig = {
    root, spin, pelvis, torso, head,
    armL, armR, legL, legR,
    materials,
    tips: { fistL: armL.tip, fistR: armR.tip, footL: legL.tip, footR: legR.tip },
    baseY: 0.95,
  };

  rig.applyPose = (p) => {
    pelvis.position.y = rig.baseY + (p.y || 0);
    pelvis.position.x = p.x || 0;
    spin.rotation.y = p.ry || 0;
    spin.rotation.z = p.rz || 0;
    torso.rotation.z = -(p.tl || 0);
    torso.rotation.y = p.tw || 0;
    armL.shoulder.rotation.z = p.sL || 0;
    armL.shoulder.rotation.x = p.sxL || 0;
    armL.elbow.rotation.z = p.eL || 0;
    armR.shoulder.rotation.z = p.sR || 0;
    armR.shoulder.rotation.x = -(p.sxR || 0);
    armR.elbow.rotation.z = p.eR || 0;
    legL.hip.rotation.z = p.hL || 0;
    legL.knee.rotation.z = p.kL || 0;
    legR.hip.rotation.z = p.hR || 0;
    legR.knee.rotation.z = p.kR || 0;
  };

  // world position helper for limb tips
  const _v = new THREE.Vector3();
  rig.tipPos = (name) => rig.tips[name].getWorldPosition(_v).clone();

  rig.setFlash = (v) => {
    for (const m of materials) {
      m.emissive.setRGB(v, v, v * 0.85);
      m.emissiveIntensity = 1;
    }
  };

  return rig;
}
