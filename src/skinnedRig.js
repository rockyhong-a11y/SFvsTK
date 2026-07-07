// Retargets the shared 16-key abstract pose (see rig.js) onto an imported, rigged
// glTF character (currently: the Juri fan-art model used for Sakura). Box characters
// bend literal box hierarchies; this bends real skeleton bones instead, using a
// world-space delta so it doesn't matter how twisted each bone's bind pose is:
//   Q_local_new = inverse(parentRestWorld) * R(worldAxis, angle) * parentRestWorld * Q_bindLocal
// Geometry: this rig's arms rest along world +/-X (T-pose) and legs hang along -Y,
// with the character facing +Z. Swinging a limb "forward" (toward +Z) always means
// rotating around the axis perpendicular to the limb and to +Z:
//   arms (rest along X)  -> swing forward/back = rotate around world Y
//   legs (rest along Y)  -> swing forward/back = rotate around world X
//   torso lean (also Y-aligned) -> world X ; torso twist -> world Y (matches box rig)
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from '../vendor/three/examples/jsm/utils/SkeletonUtils.js';

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);

const templates = new Map(); // id -> { scene, boneNames }

// Bone names for each rigged character model (see CREDITS.md). Only the bones our pose system drives.
const JURI_BONES = {
  torsoLean: 'Stomach_09', torsoTwist: 'Chest_010', head: 'Head_012',
  shoulderR: 'RArm1_097', elbowR: 'RArm2_098', shoulderL: 'LArm1_0133', elbowL: 'LArm2_0134',
  hipR: 'RLeg1_0183', kneeR: 'RLeg2_0184', hipL: 'LLeg1_0203', kneeL: 'LLeg2_0204',
  pelvis: 'Waist_08',
  handR: 'RHN_0122', handL: 'LHN_0153', footR: 'RFN_0189', footL: 'LFN_0209',
};

const CC_RIG_BONES = {
  // Character Creator rig (Hot Sports Girl)
  torsoLean: 'CC_Base_Spine02_035', torsoTwist: 'CC_Base_Spine01_034', head: 'CC_Base_Head_038',
  shoulderR: 'CC_Base_R_Upperarm_078', elbowR: 'CC_Base_R_Forearm_079',
  shoulderL: 'CC_Base_L_Upperarm_050', elbowL: 'CC_Base_L_Forearm_051',
  hipR: 'CC_Base_R_Thigh_018', kneeR: 'CC_Base_R_Calf_019',
  hipL: 'CC_Base_L_Thigh_04', kneeL: 'CC_Base_L_Calf_05',
  pelvis: 'CC_Base_Pelvis_03',
  handR: 'CC_Base_R_Hand_083', handL: 'CC_Base_L_Hand_055',
  footR: 'CC_Base_R_Foot_021', footL: 'CC_Base_L_Foot_06',
};

const MIXAMO_BONES = {
  // Mixamo rig (Tina 3)
  torsoLean: 'mixamorig:Spine2_04', torsoTwist: 'mixamorig:Spine1_03', head: 'mixamorig:Head_06',
  shoulderR: 'mixamorig:RightArm_033', elbowR: 'mixamorig:RightForeArm_034',
  shoulderL: 'mixamorig:LeftArm_09', elbowL: 'mixamorig:LeftForeArm_010',
  hipR: 'mixamorig:RightUpLeg_060', kneeR: 'mixamorig:RightLeg_061',
  hipL: 'mixamorig:LeftUpLeg_055', kneeL: 'mixamorig:LeftLeg_056',
  pelvis: 'mixamorig:Hips_01',
  handR: 'mixamorig:RightHand_035', handL: 'mixamorig:LeftHand_011',
  footR: 'mixamorig:RightFoot_062', footL: 'mixamorig:LeftFoot_057',
};

const MODEL_DEFS = {
  sakura: { url: './assets/models/sakura_juri.glb', bones: JURI_BONES, scale: 1.05 },
  sports_girl: { url: './assets/models/sports_girl.glb', bones: CC_RIG_BONES, scale: 0.95 },
  tina: { url: './assets/models/tina.glb', bones: MIXAMO_BONES, scale: 1.0 },
  chunli_variant: { url: './assets/models/chunli_variant.glb', bones: CC_RIG_BONES, scale: 1.0 },
  nina_variant: { url: './assets/models/nina_variant.glb', bones: CC_RIG_BONES, scale: 1.0 },
  cammy_variant: { url: './assets/models/cammy_variant.glb', bones: CC_RIG_BONES, scale: 1.0 },
};

export function preloadSkinnedModels(ids) {
  const loader = new GLTFLoader();
  return Promise.all(ids.map((id) => {
    if (templates.has(id)) return Promise.resolve();
    const def = MODEL_DEFS[id];
    return new Promise((resolve, reject) => {
      loader.load(def.url, (gltf) => {
        templates.set(id, { scene: gltf.scene, def });
        resolve();
      }, undefined, reject);
    });
  }));
}

export function isSkinnedModelReady(id) {
  return templates.has(id);
}

function cacheRest(root) {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.isBone) {
      o.userData.restLocal = o.quaternion.clone();
      const pq = new THREE.Quaternion();
      if (o.parent) o.parent.getWorldQuaternion(pq);
      o.userData.parentRestWorld = pq;
      o.userData.restWorld = pq.clone().multiply(o.userData.restLocal);
    }
  });
}

// sets `bone`'s local quaternion so its WORLD orientation is R(worldAxis,angle) * itsRestWorld
function bendWorld(bone, worldAxis, angle) {
  if (!bone || !angle) { if (bone) bone.quaternion.copy(bone.userData.restLocal); return; }
  const delta = new THREE.Quaternion().setFromAxisAngle(worldAxis, angle);
  const newWorld = delta.multiply(bone.userData.restWorld);
  const invParent = bone.userData.parentRestWorld.clone().invert();
  bone.quaternion.copy(invParent.multiply(newWorld));
}

export function buildSkinnedRig(id) {
  const tpl = templates.get(id);
  if (!tpl) throw new Error(`skinned model "${id}" not preloaded`);
  const { def } = tpl;
  const scene = clone(tpl.scene);
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });

  const bones = {};
  for (const [key, name] of Object.entries(def.bones)) {
    scene.traverse((o) => { if (o.name === name) bones[key] = o; });
  }
  cacheRest(scene);

  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const body = new THREE.Group(); // carries the pose's small y/x creep offset
  body.add(scene);
  spin.add(body);
  scene.scale.setScalar(def.scale || 1);

  // The source rig's root nodes carry an export-time offset, so the feet don't
  // land at local y=0 by default — measure and cancel it out so `body.position.y`
  // (crouch/lift creep) and the fighter's ground plane line up like the box rig.
  scene.updateMatrixWorld(true);
  const footY = Math.min(
    bones.footR ? bones.footR.getWorldPosition(new THREE.Vector3()).y : Infinity,
    bones.footL ? bones.footL.getWorldPosition(new THREE.Vector3()).y : Infinity,
  );
  if (Number.isFinite(footY)) scene.position.y -= footY;

  const materials = [];
  scene.traverse((o) => { if (o.isMesh && o.material) materials.push(...[].concat(o.material)); });

  const baseY = 0;
  const rig = { root, spin, body, bones, materials, baseY };

  rig.applyPose = (p) => {
    body.position.set(p.x || 0, baseY + (p.y || 0), 0);
    spin.rotation.y = p.ry || 0;
    spin.rotation.z = p.rz || 0;

    bendWorld(bones.torsoLean, AXIS_X, -(p.tl || 0));
    bendWorld(bones.torsoTwist, AXIS_Y, p.tw || 0);
    bendWorld(bones.shoulderR, AXIS_Y, -(p.sR || 0));
    bendWorld(bones.elbowR, AXIS_Y, -(p.eR || 0));
    bendWorld(bones.shoulderL, AXIS_Y, p.sL || 0);
    bendWorld(bones.elbowL, AXIS_Y, p.eL || 0);
    bendWorld(bones.hipR, AXIS_X, -(p.hR || 0));
    bendWorld(bones.kneeR, AXIS_X, -(p.kR || 0));
    bendWorld(bones.hipL, AXIS_X, -(p.hL || 0));
    bendWorld(bones.kneeL, AXIS_X, -(p.kL || 0));
  };

  const _v = new THREE.Vector3();
  rig.tipPos = (name) => {
    const map = { fistL: 'handL', fistR: 'handR', footL: 'footL', footR: 'footR' };
    const bone = bones[map[name]];
    return bone ? bone.getWorldPosition(_v).clone() : new THREE.Vector3();
  };

  rig.setFlash = (v) => {
    for (const m of materials) {
      if (!m.emissive) continue;
      m.emissive.setRGB(v, v, v * 0.85);
      m.emissiveIntensity = 1;
    }
  };

  return rig;
}
