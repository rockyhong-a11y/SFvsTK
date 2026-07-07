// Character definitions: stylized homage movesets (Chun-Li / Nina style).
// All poses are original procedural keyframes for the box rig.
// Move timing in seconds. level: 'high' (whiffs vs crouch), 'mid' (hits crouch),
// 'low' (must crouch-block), 'sm' (special mid: blockable standing or crouching).

// ---------- shared poses ----------
export const ST = { // fighting stance
  y: -0.06, tl: 0.08, tw: -0.35,
  sL: 0.5, eL: 1.9, sR: 0.32, eR: 1.6, sxL: 0.15, sxR: 0.1,
  hL: 0.3, kL: -0.5, hR: -0.2, kR: -0.35,
};
export const CR = { // crouch
  y: -0.36, tl: 0.32, tw: -0.3,
  sL: 0.5, eL: 1.9, sR: 0.35, eR: 1.7,
  hL: 1.2, kL: -2.1, hR: 1.0, kR: -2.0,
};
export const AIR = { // neutral jump
  tl: 0.1, sL: 0.7, eL: 1.6, sR: 0.5, eR: 1.5,
  hL: 0.9, kL: -1.5, hR: 0.4, kR: -0.9,
};
export const HIT_H = { y: -0.04, tl: -0.32, tw: -0.2, sL: 0.9, eL: 1.2, sR: -0.5, eR: 0.8, hL: 0.35, kL: -0.4, hR: -0.3, kR: -0.3 };
export const HIT_M = { y: -0.14, tl: 0.5, tw: -0.3, sL: 0.2, eL: 1.4, sR: 0.1, eR: 1.5, hL: 0.5, kL: -0.8, hR: -0.1, kR: -0.5 };
export const BLK_S = { y: -0.1, tl: 0.14, tw: -0.4, sL: 0.9, eL: 2.2, sR: 0.7, eR: 2.1, hL: 0.3, kL: -0.5, hR: -0.2, kR: -0.4 };
export const BLK_C = { ...CR, sL: 0.9, eL: 2.2, sR: 0.7, eR: 2.1 };
export const LAUNCHED = { rz: 0.7, y: 0, tl: 0.2, sL: -0.8, eL: 0.6, sR: -1.0, eR: 0.5, sxL: 0.6, sxR: 0.6, hL: 0.7, kL: -1.2, hR: 0.3, kR: -0.8 };
export const KD = { rz: 1.5, y: -0.72, tl: 0, sL: -0.3, eL: 0.3, sR: -0.4, eR: 0.2, sxL: 0.5, sxR: 0.4, hL: 0.15, kL: -0.35, hR: 0.05, kR: -0.2 };
export const WALLSPLAT = { y: -0.02, rz: -0.18, tl: -0.15, sL: 1.4, eL: 0.6, sR: 1.2, eR: 0.5, sxL: 1.0, sxR: 1.0, hL: 0.4, kL: -0.3, hR: -0.1, kR: -0.2 };
export const CRUMPLE_A = { y: -0.3, tl: 0.55, sL: 0.3, eL: 0.9, sR: 0.2, eR: 0.8, hL: 1.1, kL: -1.9, hR: 0.9, kR: -1.8 };
export const WIN = { y: 0, tl: -0.1, sL: 2.6, eL: 0.2, sR: 2.4, eR: 0.3, sxL: 0.4, sxR: 0.4, hL: 0.1, kL: -0.2, hR: -0.1, kR: -0.1 };
export const THROW_A = [ // attacker throw anim (duration set by move)
  [0, ST],
  [0.25, { y: -0.1, tl: 0.3, tw: 0.2, sL: 1.4, eL: 0.5, sR: 1.3, eR: 0.4, hL: 0.4, kL: -0.6, hR: -0.2, kR: -0.4 }],
  [0.55, { y: -0.2, tl: -0.4, tw: 1.2, sL: 2.2, eL: 0.3, sR: 0.4, eR: 0.9, hL: 0.5, kL: -0.8, hR: -0.3, kR: -0.4 }],
  [1, ST],
];

// standard strike anim builder: windup -> extend during active -> recover
function strike(su, act, rec, windup, extend, recover = ST) {
  const T = su + act + rec;
  return [
    [0, ST],
    [su * 0.6 / T, windup],
    [su / T, extend],
    [(su + act + rec * 0.3) / T, extend],
    [(su + act + rec * 0.9) / T, recover],
    [1, ST],
  ];
}

const RAD = 0.3; // default hit sphere radius

// ============================================================
// CHUN-LI — speed, multi-hits, projectile zoning
// ============================================================
const CHUNLI = {
  id: 'chunli',
  displayName: 'CHUN-LI',
  nameKo: '춘리',
  health: 1000,
  walkF: 2.5, walkB: 1.9,
  jumpVy: 7.2,
  rig: {
    skin: 0xf2c9a0, top: 0x1d4fd7, pants: 0x1d4fd7, glove: 0xf5f0e6,
    hair: 0x241a12, accent: 0xe8b83a, hairstyle: 'buns', skirt: true, bracelets: true,
  },
  moves: {
    punch: {
      name: '잽', startup: 0.08, active: 0.06, recovery: 0.17,
      damage: 28, level: 'high', hitstun: 0.28, blockstun: 0.18, kb: 1.6,
      limbs: ['fistL'], radius: RAD, cancelable: true, sound: 'whoosh',
      anim: strike(0.08, 0.06, 0.17,
        { ...ST, tw: -0.5, sL: 0.7, eL: 2.1 },
        { y: -0.06, tl: 0.14, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.4, eR: 1.8, hL: 0.35, kL: -0.5, hR: -0.2, kR: -0.35 }),
    },
    kick: {
      name: '회축각', startup: 0.15, active: 0.07, recovery: 0.28,
      damage: 62, level: 'mid', hitstun: 0.38, blockstun: 0.24, kb: 3.6,
      limbs: ['footR'], radius: 0.32, sound: 'whoosh',
      anim: strike(0.15, 0.07, 0.28,
        { ...ST, tl: 0.2, tw: -0.6, hR: -0.5, kR: -1.2 },
        { y: -0.05, tl: -0.18, tw: 0.5, sL: 0.7, eL: 1.5, sR: -0.6, eR: 0.6, sxR: 0.5, hL: 0.2, kL: -0.4, hR: 1.75, kR: -0.1 }),
    },
    cpunch: {
      name: '앉아 잽', startup: 0.08, active: 0.05, recovery: 0.16, crouching: true,
      damage: 22, level: 'sm', hitstun: 0.24, blockstun: 0.16, kb: 1.2,
      limbs: ['fistL'], radius: 0.26, cancelable: true, sound: 'whoosh',
      anim: strike(0.08, 0.05, 0.16, CR,
        { ...CR, tw: 0.2, sL: 1.35, eL: 0.1 }, CR),
    },
    ckick: {
      name: '앉아 킥', startup: 0.14, active: 0.07, recovery: 0.3, crouching: true,
      damage: 42, level: 'low', hitstun: 0.34, blockstun: 0.22, kb: 2.0,
      limbs: ['footR'], radius: 0.3, sound: 'whoosh',
      anim: strike(0.14, 0.07, 0.3, CR,
        { ...CR, tl: 0.4, hR: 0.55, kR: -0.05 }, CR),
    },
    jpunch: {
      name: '점프 펀치', startup: 0.09, active: 0.3, recovery: 0.1, air: true,
      damage: 50, level: 'mid', hitstun: 0.34, blockstun: 0.22, kb: 2.0,
      limbs: ['fistR'], radius: 0.3, sound: 'whoosh',
      anim: [[0, AIR], [0.25, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }], [1, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }]],
    },
    jkick: {
      name: '점프 킥', startup: 0.11, active: 0.3, recovery: 0.1, air: true,
      damage: 62, level: 'mid', hitstun: 0.4, blockstun: 0.26, kb: 3.0,
      limbs: ['footR'], radius: 0.34, sound: 'whoosh',
      anim: [[0, AIR], [0.3, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1, hL: 1.2, kL: -2.0 }], [1, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1 }]],
    },
    grab: {
      name: '용성락', startup: 0.13, active: 0.06, recovery: 0.5, isThrow: true,
      damage: 110, range: 1.0, kb: 5.5, kbUp: 4.5, sound: 'whoosh',
      anim: THROW_A, throwDur: 0.55,
    },
    skillN: {
      name: '기공권', startup: 0.24, active: 0.02, recovery: 0.38, isSkill: true,
      damage: 0, level: 'sm', sound: 'fireball',
      proj: { kind: 'fireball', speed: 7.2, damage: 60, level: 'sm', hitstun: 0.42, blockstun: 0.3, kb: 3.0, chip: 0.15, color: 0x66aaff, y: 1.15, radius: 0.3 },
      anim: [
        [0, ST],
        [0.28, { y: -0.12, tl: 0.1, tw: -0.7, sL: -0.6, eL: 0.9, sR: -0.5, eR: 0.8 }],
        [0.42, { y: -0.1, x: 0.12, tl: 0.22, tw: 0.35, sL: 1.35, eL: 0.25, sR: 1.3, eR: 0.3 }],
        [0.75, { y: -0.1, x: 0.12, tl: 0.22, tw: 0.35, sL: 1.35, eL: 0.25, sR: 1.3, eR: 0.3 }],
        [1, ST],
      ],
    },
    skillF: {
      name: '천승각', startup: 0.07, active: 0.32, recovery: 0.5, isSkill: true,
      damage: 100, level: 'mid', hitstun: 0.5, blockstun: 0.3, kb: 1.5, kbUp: 8.5,
      limbs: ['footR'], radius: 0.36, invuln: [0, 0.2], selfVy: 7.5, fwdSpeed: 1.5,
      chip: 0.15, sound: 'whoosh', afterimage: true, landingLag: true,
      anim: [
        [0, { ...ST, y: -0.2, tl: 0.3 }],
        [0.15, { y: 0.1, tl: -0.25, tw: 0.4, sL: -0.6, eL: 0.8, sR: -0.8, eR: 0.5, hR: 2.3, kR: -0.15, hL: 0.9, kL: -1.6, ry: 0 }],
        [0.6, { y: 0.1, tl: -0.3, tw: 0.4, sL: -0.6, eL: 0.8, sR: -0.8, eR: 0.5, hR: 2.4, kR: -0.1, hL: 0.9, kL: -1.6, ry: 5.5 }],
        [1, { ...ST, ry: 6.28 }],
      ],
    },
    skillB: {
      name: '백열각', startup: 0.14, active: 0.48, recovery: 0.34, isSkill: true,
      damage: 22, level: 'mid', hitstun: 0.22, blockstun: 0.16, kb: 0.8,
      hits: 4, hitInterval: 0.12,
      lastHit: { kb: 5.5, kbUp: 3.2, knockdown: true, hitstun: 0.6 },
      limbs: ['footR', 'footL'], radius: 0.36, fwdSpeed: 2.8, fwdWindow: [0.14, 0.62],
      chip: 0.1, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.13, { ...ST, tl: -0.1, hR: 1.5, kR: -0.1, sxL: 0.4, sxR: 0.4 }],
        [0.26, { ...ST, tl: -0.1, hL: 1.6, kL: -0.1, hR: -0.2, kR: -0.5, sxL: 0.4, sxR: 0.4 }],
        [0.39, { ...ST, tl: -0.1, hR: 1.7, kR: -0.05, hL: 0.3, kL: -0.5, sxL: 0.4, sxR: 0.4 }],
        [0.52, { ...ST, tl: -0.1, hL: 1.5, kL: -0.1, hR: -0.2, kR: -0.5, sxL: 0.4, sxR: 0.4 }],
        [0.66, { ...ST, tl: -0.15, hR: 1.8, kR: 0, sxL: 0.4, sxR: 0.4 }],
        [1, ST],
      ],
    },
    skillD: {
      name: '회전각', startup: 0.18, active: 0.09, recovery: 0.42, isSkill: true, crouching: true,
      damage: 60, level: 'low', hitstun: 0.6, blockstun: 0.26, kb: 3.0, knockdown: true,
      limbs: ['footR'], radius: 0.34, chip: 0.1, sound: 'whoosh',
      anim: [
        [0, CR],
        [0.2, { ...CR, tw: -0.8, hR: -0.3, kR: -1.4 }],
        [0.28, { ...CR, tl: 0.45, tw: 0.4, hR: 0.6, kR: -0.05, ry: 1.2 }],
        [0.42, { ...CR, tl: 0.45, tw: 0.4, hR: 0.6, kR: -0.05, ry: 3.5 }],
        [0.8, { ...CR, ry: 6.28 }],
        [1, ST],
      ],
    },
  },
};

// ============================================================
// NINA — damage, throws, wall carry
// ============================================================
const NINA = {
  id: 'nina',
  displayName: 'NINA',
  nameKo: '니나',
  health: 1000,
  walkF: 2.3, walkB: 1.8,
  jumpVy: 7.0,
  rig: {
    skin: 0xf5d3b3, top: 0x6a2f8f, pants: 0x5a2680, glove: 0x2a1a35,
    hair: 0xe8c96a, accent: 0xb98fd6, hairstyle: 'ponytail', sleeves: true,
  },
  moves: {
    punch: {
      name: '잽', startup: 0.07, active: 0.06, recovery: 0.16,
      damage: 26, level: 'high', hitstun: 0.27, blockstun: 0.17, kb: 1.5,
      limbs: ['fistL'], radius: RAD, cancelable: true, sound: 'whoosh',
      anim: strike(0.07, 0.06, 0.16,
        { ...ST, tw: -0.5, sL: 0.7, eL: 2.1 },
        { y: -0.06, tl: 0.14, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.4, eR: 1.8, hL: 0.35, kL: -0.5, hR: -0.2, kR: -0.35 }),
    },
    kick: {
      name: '하이킥', startup: 0.16, active: 0.08, recovery: 0.3,
      damage: 72, level: 'mid', hitstun: 0.4, blockstun: 0.26, kb: 4.2,
      limbs: ['footR'], radius: 0.34, sound: 'whoosh',
      anim: strike(0.16, 0.08, 0.3,
        { ...ST, tl: 0.25, tw: -0.6, hR: -0.6, kR: -1.4 },
        { y: -0.04, tl: -0.22, tw: 0.5, sL: 0.6, eL: 1.5, sR: -0.7, eR: 0.5, sxR: 0.5, hL: 0.2, kL: -0.4, hR: 2.0, kR: -0.05 }),
    },
    cpunch: {
      name: '앉아 잽', startup: 0.08, active: 0.05, recovery: 0.16, crouching: true,
      damage: 24, level: 'sm', hitstun: 0.24, blockstun: 0.16, kb: 1.2,
      limbs: ['fistL'], radius: 0.26, cancelable: true, sound: 'whoosh',
      anim: strike(0.08, 0.05, 0.16, CR, { ...CR, tw: 0.2, sL: 1.35, eL: 0.1 }, CR),
    },
    ckick: {
      name: '앉아 킥', startup: 0.15, active: 0.07, recovery: 0.32, crouching: true,
      damage: 46, level: 'low', hitstun: 0.34, blockstun: 0.22, kb: 2.2,
      limbs: ['footR'], radius: 0.3, sound: 'whoosh',
      anim: strike(0.15, 0.07, 0.32, CR, { ...CR, tl: 0.4, hR: 0.55, kR: -0.05 }, CR),
    },
    jpunch: {
      name: '점프 펀치', startup: 0.09, active: 0.3, recovery: 0.1, air: true,
      damage: 55, level: 'mid', hitstun: 0.34, blockstun: 0.22, kb: 2.2,
      limbs: ['fistR'], radius: 0.3, sound: 'whoosh',
      anim: [[0, AIR], [0.25, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }], [1, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }]],
    },
    jkick: {
      name: '점프 킥', startup: 0.11, active: 0.3, recovery: 0.1, air: true,
      damage: 68, level: 'mid', hitstun: 0.42, blockstun: 0.26, kb: 3.2,
      limbs: ['footR'], radius: 0.34, sound: 'whoosh',
      anim: [[0, AIR], [0.3, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1, hL: 1.2, kL: -2.0 }], [1, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1 }]],
    },
    grab: {
      name: '암 브레이커', startup: 0.13, active: 0.06, recovery: 0.5, isThrow: true,
      damage: 125, range: 1.0, kb: 6.0, kbUp: 4.0, sound: 'whoosh',
      anim: THROW_A, throwDur: 0.55,
    },
    skillN: {
      name: '블론드 밤', startup: 0.2, active: 0.08, recovery: 0.44, isSkill: true,
      damage: 85, level: 'mid', hitstun: 0.55, blockstun: 0.32, kb: 10.0, knockdown: true,
      limbs: ['fistL', 'fistR'], radius: 0.38, fwdSpeed: 2.2, fwdWindow: [0, 0.28],
      chip: 0.15, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.22, { y: -0.14, tl: 0.15, tw: -0.75, sL: -0.5, eL: 1.2, sR: -0.4, eR: 1.1, hL: 0.5, kL: -0.8 }],
        [0.32, { y: -0.1, x: 0.3, tl: 0.35, tw: 0.4, sL: 1.4, eL: 0.15, sR: 1.35, eR: 0.2, hL: 0.6, kL: -0.7, hR: -0.4, kR: -0.3 }],
        [0.6, { y: -0.1, x: 0.3, tl: 0.35, tw: 0.4, sL: 1.4, eL: 0.15, sR: 1.35, eR: 0.2 }],
        [1, ST],
      ],
    },
    skillF: {
      name: '디바인 캐논', startup: 0.13, active: 0.07, recovery: 0.4, isSkill: true,
      damage: 88, level: 'mid', hitstun: 0.5, blockstun: 0.28, kb: 2.0, kbUp: 9.0,
      limbs: ['footR'], radius: 0.36, fwdSpeed: 2.5, fwdWindow: [0, 0.2],
      chip: 0.15, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.18, { ...ST, y: -0.18, tl: 0.35, hR: -0.5, kR: -1.5 }],
        [0.3, { y: 0.05, tl: -0.35, tw: 0.3, sL: 0.3, eL: 1.3, sR: -0.9, eR: 0.4, hR: 2.4, kR: -0.1, hL: 0.5, kL: -0.7 }],
        [0.55, { y: 0.02, tl: -0.3, tw: 0.3, sL: 0.3, eL: 1.3, sR: -0.9, eR: 0.4, hR: 2.2, kR: -0.2 }],
        [1, ST],
      ],
    },
    skillB: {
      name: '아이보리 커터', startup: 0.16, active: 0.1, recovery: 0.4, isSkill: true,
      damage: 75, level: 'mid', hitstun: 0.5, blockstun: 0.26, kb: 2.5, kbUp: 7.5,
      limbs: ['footL'], radius: 0.36, invuln: [0, 0.18],
      fwdSpeed: -2.8, fwdWindow: [0, 0.3], selfHop: 3.5,
      chip: 0.12, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.18, { ...ST, y: -0.2, tl: 0.4 }],
        [0.32, { y: 0.15, rz: -0.5, tl: -0.3, sL: -0.9, eL: 0.4, sR: -0.7, eR: 0.5, hL: 2.6, kL: -0.1, hR: 1.0, kR: -1.6 }],
        [0.6, { y: 0.05, rz: -0.25, tl: -0.2, sL: -0.6, eL: 0.6, sR: -0.5, eR: 0.6, hL: 2.0, kL: -0.4, hR: 0.6, kR: -1.0 }],
        [1, ST],
      ],
    },
    skillD: {
      name: '스위핑 로우', startup: 0.2, active: 0.1, recovery: 0.45, isSkill: true, crouching: true,
      damage: 68, level: 'low', hitstun: 0.6, blockstun: 0.28, kb: 3.2, knockdown: true,
      limbs: ['footR'], radius: 0.34, fwdSpeed: 1.8, fwdWindow: [0, 0.3],
      chip: 0.1, sound: 'whoosh',
      anim: [
        [0, { ...ST, y: -0.2 }],
        [0.24, { ...CR, tw: -0.7, hR: -0.4, kR: -1.5 }],
        [0.34, { ...CR, tl: 0.5, tw: 0.4, hR: 0.7, kR: 0, ry: 0.8 }],
        [0.5, { ...CR, tl: 0.5, tw: 0.4, hR: 0.7, kR: 0, ry: 2.6 }],
        [0.85, { ...CR, ry: 6.28 }],
        [1, ST],
      ],
    },
  },
};

export const CHARACTERS = { chunli: CHUNLI, nina: NINA };
