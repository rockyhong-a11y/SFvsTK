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
// ---------- throw sequences ----------
// A throw has 3 clearly separated phases so it never appears to "skip":
//   1. reach  (startup+active, whiffable)              — attacker only, existing 'attack' timeline
//   2. catch+execute (throwCatch+throwLift, unblockable) — attacker+victim locked together, driven by Game
//   3. impact (instant) -> victim hands off to the normal hit/knockdown reaction
// attacker/victim clips below are normalized 0..1 over (throwCatch+throwLift).
const THROW_REACH = [ // whiffable reach-in, played during startup+active if the grab misses
  [0, ST],
  [0.6, { y: -0.08, tl: 0.18, tw: 0.1, sL: 1.1, eL: 0.9, sR: 1.0, eR: 1.0, hL: 0.4, kL: -0.6 }],
  [1, { y: -0.06, tl: 0.15, tw: 0.15, sL: 1.2, eL: 0.8, sR: 1.1, eR: 0.9, hL: 0.4, kL: -0.6 }],
];

function hipTossThrow() {
  const attacker = [
    [0, { y: -0.05, tl: 0.12, tw: -0.1, sL: 1.25, eL: 0.5, sR: 1.15, eR: 0.6, hL: 0.4, kL: -0.6, hR: -0.1, kR: -0.4 }],
    [0.32, { y: -0.04, tl: 0.05, tw: 0.35, sL: 1.55, eL: 0.2, sR: 1.4, eR: 0.3, hL: 0.5, kL: -0.7 }],
    [0.66, { y: -0.02, tl: -0.28, tw: 1.15, sL: 2.15, eL: 0.15, sR: 0.5, eR: 0.9, hL: 0.55, kL: -0.75, ry: 0.9 }],
    [1, { y: -0.05, tl: -0.12, tw: 0.75, sL: 1.8, eL: 0.3, sR: 0.4, eR: 1.0, ry: 1.15 }],
  ];
  const victim = [
    [0, { y: -0.02, tl: -0.15, tw: 0.1, sL: 0.6, eL: 1.6, sR: 0.6, eR: 1.6, hL: 0.35, kL: -0.5, hR: -0.15, kR: -0.4 }],
    [0.32, { y: 0.35, tl: 0.35, tw: -0.3, sL: -0.3, eL: 0.9, sR: -0.3, eR: 0.9, hL: 0.9, kL: -0.3, hR: 0.7, kR: -0.5, rz: 0.25 }],
    [0.66, { y: 0.78, tl: 0.15, tw: -0.6, rz: 0.95, sL: -0.6, eL: 0.5, sR: -0.6, eR: 0.5, hL: 1.1, kL: -0.15, hR: 1.0, kR: -0.2 }],
    [1, { y: 0.55, rz: 1.5, tl: 0, sL: -0.4, eL: 0.5, sR: -0.4, eR: 0.5, hL: 0.6, kL: -0.5, hR: 0.5, kR: -0.5 }],
  ];
  return { attacker, victim };
}

// belly-to-back suplex: lift the victim inverted overhead, bridge, slam behind.
function suplexThrow() {
  const attacker = [
    [0, { y: -0.1, tl: 0.2, tw: 0, sL: 1.3, eL: 1.0, sR: 1.3, eR: 1.0, hL: 0.5, kL: -0.7, hR: 0.3, kR: -0.5 }],
    [0.3, { y: -0.05, tl: -0.1, tw: 0, sL: 1.6, eL: 0.6, sR: 1.6, eR: 0.6, hL: 0.6, kL: -0.6, hR: 0.5, kR: -0.5 }],
    [0.65, { y: 0.2, tl: -0.55, tw: 0, sL: 2.05, eL: 0.3, sR: 2.05, eR: 0.3, hL: 0.7, kL: -0.4, hR: 0.6, kR: -0.3, rz: -0.35 }],
    [1, { y: -0.08, tl: -0.35, tw: 0, sL: 1.8, eL: 0.4, sR: 1.8, eR: 0.4, hL: 0.5, kL: -0.5, hR: 0.4, kR: -0.4, rz: -0.15 }],
  ];
  const victim = [
    [0, { y: -0.05, tl: 0, tw: 0, sL: 1.1, eL: 1.2, sR: 1.1, eR: 1.2, hL: 0.35, kL: -0.5, hR: 0.35, kR: -0.5 }],
    [0.3, { y: 0.5, tl: 0.1, tw: 0, rz: 2.6, sL: -0.5, eL: 0.6, sR: -0.5, eR: 0.6, hL: 0.6, kL: -0.3, hR: 0.6, kR: -0.3 }],
    [0.65, { y: 1.1, tl: 0.2, tw: 0, rz: 3.05, sL: -0.7, eL: 0.4, sR: -0.7, eR: 0.4, hL: 0.9, kL: -0.15, hR: 0.9, kR: -0.15 }],
    [1, { y: 0.88, tl: 0.15, tw: 0, rz: 3.05, sL: -0.6, eL: 0.5, sR: -0.6, eR: 0.5, hL: 0.75, kL: -0.2, hR: 0.75, kR: -0.2 }],
  ];
  return { attacker, victim };
}

// piledriver: flip the victim head-down and drive them straight into the mat.
function piledriverThrow() {
  const attacker = [
    [0, { y: -0.1, tl: 0.25, tw: 0, sL: 1.2, eL: 1.1, sR: 1.2, eR: 1.1, hL: 0.5, kL: -0.7 }],
    [0.35, { y: 0.2, tl: -0.3, tw: 0, sL: 1.7, eL: 0.5, sR: 1.7, eR: 0.5, hL: 0.7, kL: -0.35, rz: -0.15 }],
    [0.7, { y: 0.5, tl: -0.6, tw: 0, sL: 2.1, eL: 0.2, sR: 2.1, eR: 0.2, hL: 0.85, kL: -0.15, rz: -0.35 }],
    [1, { y: -0.18, tl: 0.08, tw: 0, sL: 1.9, eL: 0.3, sR: 1.9, eR: 0.3, hL: 0.6, kL: -0.5, rz: -0.1 }],
  ];
  const victim = [
    [0, { y: 0, tl: 0, tw: 0, sL: 1.0, eL: 1.3, sR: 1.0, eR: 1.3 }],
    [0.35, { y: 0.65, rz: 3.0, sL: -0.6, eL: 0.4, sR: -0.6, eR: 0.4, hL: 0.15, kL: -0.15, hR: 0.15, kR: -0.15 }],
    [0.7, { y: 1.18, rz: 3.14, sL: -0.7, eL: 0.35, sR: -0.7, eR: 0.35, hL: 0.05, kL: -0.1, hR: 0.05, kR: -0.1 }],
    [1, { y: 0.1, rz: 3.14, sL: -0.5, eL: 0.5, sR: -0.5, eR: 0.5, hL: 0.1, kL: -0.15, hR: 0.1, kR: -0.15 }],
  ];
  return { attacker, victim };
}

const THROW_STYLES = { hiptoss: hipTossThrow, suplex: suplexThrow, piledriver: piledriverThrow };

// bundles the whiff (reach) clip with the connect (catch+execute) clips + phase timing.
function throwMove({
  name, style = 'hiptoss', startup, active, recovery,
  catchT = 0.14, liftT = 0.32, damage, range, kb = 0, kbUp = 0, knockdown, isCommandThrow,
}) {
  const seq = THROW_STYLES[style]();
  return {
    name, isThrow: true, isSkill: !!isCommandThrow, startup, active, recovery,
    damage, range, kb, kbUp, knockdown, isCommandThrow,
    throwCatch: catchT, throwLift: liftT,
    anim: THROW_REACH, attackerAnim: seq.attacker, victimAnim: seq.victim,
    sound: 'whoosh',
  };
}

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

// ---------- directional command normals (SF-style forward/back punch & kick) ----------
// Neutral/crouch/air punch & kick already exist (punch/cpunch/jpunch, kick/ckick/jkick).
// These add the classic SF-style forward/back command normals: holding toward or away
// from the opponent while pressing punch/kick gives a different, situational normal.
const CMD_PUNCH_F_WINDUP = { ...ST, tw: -0.55, sR: 0.1, eR: 1.95 };
const CMD_PUNCH_F_EXTEND = { y: -0.03, tl: 0.08, tw: 0.6, sR: 1.7, eR: 0.05, sL: 0.3, eL: 1.7, hL: 0.55, kL: -0.5, hR: 0.05, kR: -0.35 };
const CMD_PUNCH_B_WINDUP = { ...ST, tl: -0.15, tw: -0.4, sR: 0.7, eR: 1.3, sxR: 0.3 };
const CMD_PUNCH_B_EXTEND = { y: -0.02, tl: -0.25, tw: 0.15, sR: 1.55, eR: 0.55, sxR: 0.3, sL: 0.35, eL: 1.75, hL: 0.3, kL: -0.5 };
const CMD_KICK_F_WINDUP = { ...ST, tl: 0.15, tw: -0.55, hR: -0.55, kR: -1.35 };
const CMD_KICK_F_EXTEND = { y: -0.03, tl: -0.15, tw: 0.55, sL: 0.6, eL: 1.5, sR: -0.55, eR: 0.55, sxR: 0.4, hL: 0.2, kL: -0.4, hR: 1.7, kR: -0.1 };
const CMD_KICK_B_WINDUP = { ...ST, tl: 0.1, tw: 0.3, ry: 0.15, hR: -0.3, kR: -0.9 };
const CMD_KICK_B_EXTEND = { y: -0.02, tl: -0.1, tw: -0.3, ry: 1.15, sL: 0.5, eL: 1.5, sR: 0.4, eR: 1.4, hR: 1.75, kR: -0.05, hL: 0.15, kL: -0.4 };

const CMD_NORMAL_TABLE = {
  punchF: {
    name: '전진 강타', startup: 0.14, active: 0.08, recovery: 0.28, level: 'mid',
    dmgMul: 1.35, hitstun: 0.34, blockstun: 0.22, kb: 2.6,
    limbs: ['fistR'], radius: 0.32, fwdSpeed: 1.4, fwdWindow: [0, 0.14],
    windup: CMD_PUNCH_F_WINDUP, extend: CMD_PUNCH_F_EXTEND,
  },
  punchB: {
    name: '견제 엘보', startup: 0.08, active: 0.06, recovery: 0.18, level: 'mid',
    dmgMul: 0.9, hitstun: 0.26, blockstun: 0.17, kb: 1.6,
    limbs: ['fistR'], radius: 0.3,
    windup: CMD_PUNCH_B_WINDUP, extend: CMD_PUNCH_B_EXTEND,
  },
  kickF: {
    name: '전진 니킥', startup: 0.16, active: 0.09, recovery: 0.32, level: 'mid',
    dmgMul: 1.25, hitstun: 0.38, blockstun: 0.24, kb: 3.4,
    limbs: ['footR'], radius: 0.34, fwdSpeed: 1.6, fwdWindow: [0, 0.16],
    windup: CMD_KICK_F_WINDUP, extend: CMD_KICK_F_EXTEND,
  },
  kickB: {
    name: '백킥', startup: 0.22, active: 0.09, recovery: 0.34, level: 'mid',
    dmgMul: 1.3, hitstun: 0.4, blockstun: 0.24, kb: 4.4,
    limbs: ['footR'], radius: 0.34,
    windup: CMD_KICK_B_WINDUP, extend: CMD_KICK_B_EXTEND,
  },
};

function commandNormal(kind, baseDamage) {
  const { windup, extend, dmgMul, ...rest } = CMD_NORMAL_TABLE[kind];
  return {
    ...rest,
    damage: Math.round(baseDamage * dmgMul),
    sound: 'whoosh',
    anim: strike(rest.startup, rest.active, rest.recovery, windup, extend),
  };
}

// call once per finished character def: adds punchF/punchB/kickF/kickB from its
// existing neutral punch/kick damage so every character gets all 4 directions.
function attachCommandNormals(char) {
  const m = char.moves;
  m.punchF = commandNormal('punchF', m.punch.damage);
  m.punchB = commandNormal('punchB', m.punch.damage);
  m.kickF = commandNormal('kickF', m.kick.damage);
  m.kickB = commandNormal('kickB', m.kick.damage);
  return char;
}

// ---------- shared wakeup attacks (okizeme mixup options) ----------
// From knockdown: hold punch = rising mid kick, hold kick = rising low sweep.
// Both are invulnerable on startup but very punishable on block/whiff.
function wakeupMoves() {
  return {
    wakeupMid: {
      name: '기상 미들킥', startup: 0.18, active: 0.08, recovery: 0.52, isWakeup: true,
      damage: 55, level: 'mid', hitstun: 0.42, blockstun: 0.26, kb: 4.2,
      limbs: ['footR'], radius: 0.36, invuln: [0, 0.24], sound: 'whoosh',
      anim: [
        [0, KD],
        [0.2, { ...CR, rz: 0.5 }],
        [0.24, { y: -0.12, tl: -0.2, tw: 0.4, sL: 0.6, eL: 1.5, sR: -0.5, eR: 0.6, hR: 1.9, kR: -0.05, hL: 0.35, kL: -0.6 }],
        [0.42, { y: -0.1, tl: -0.2, tw: 0.4, sL: 0.6, eL: 1.5, sR: -0.5, eR: 0.6, hR: 1.8, kR: -0.1, hL: 0.35, kL: -0.6 }],
        [0.85, ST],
        [1, ST],
      ],
    },
    wakeupLow: {
      name: '기상 하단킥', startup: 0.2, active: 0.09, recovery: 0.56, isWakeup: true,
      damage: 48, level: 'low', hitstun: 0.55, blockstun: 0.26, kb: 2.6, knockdown: true,
      limbs: ['footR'], radius: 0.34, invuln: [0, 0.22], sound: 'whoosh',
      anim: [
        [0, KD],
        [0.2, { ...KD, rz: 0.9 }],
        [0.26, { ...CR, tl: 0.5, tw: 0.4, hR: 0.65, kR: 0, ry: 0.6 }],
        [0.44, { ...CR, tl: 0.5, tw: 0.4, hR: 0.65, kR: 0, ry: 2.2 }],
        [0.85, ST],
        [1, ST],
      ],
    },
  };
}

// ---------- super arts (cost: full gauge, activated with punch+kick / super button) ----------
function superArt(name, limbs, anim, opts = {}) {
  return {
    name, isSuper: true, isSkill: true,
    startup: 0.3, active: 0.5, recovery: 0.55,
    hits: 5, hitInterval: 0.1,
    damage: 42, level: 'mid', hitstun: 0.32, blockstun: 0.2, kb: 1.2,
    lastHit: { kb: 7.5, kbUp: 6.5, knockdown: true, hitstun: 0.7 },
    limbs, radius: 0.42, fwdSpeed: 3.8, fwdWindow: [0.3, 0.8],
    invuln: [0, 0.55], chip: 0.3, sound: 'whoosh', afterimage: true,
    anim,
    ...opts,
  };
}

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
    grab: throwMove({
      name: '용성락', startup: 0.13, active: 0.06, recovery: 0.5,
      catchT: 0.14, liftT: 0.32, damage: 110, range: 1.0, kb: 5.5, kbUp: 4.5,
    }),
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
    superN: superArt('봉익선', ['footR', 'footL'], [
      [0, ST],
      [0.18, { ...ST, y: -0.16, tl: 0.25, sxL: 0.5, sxR: 0.5 }],
      [0.3, { ...ST, tl: -0.1, hR: 1.6, kR: -0.05, sxL: 0.5, sxR: 0.5 }],
      [0.42, { ...ST, tl: -0.1, hL: 1.7, kL: -0.05, hR: -0.2, kR: -0.5, sxL: 0.5, sxR: 0.5 }],
      [0.54, { ...ST, tl: -0.1, hR: 1.8, kR: 0, hL: 0.3, kL: -0.5, sxL: 0.5, sxR: 0.5 }],
      [0.64, { ...ST, tl: -0.15, hL: 1.8, kL: 0, hR: -0.2, kR: -0.5, sxL: 0.5, sxR: 0.5 }],
      [0.74, { y: 0.08, tl: -0.3, tw: 0.4, sL: -0.6, eL: 0.8, sR: -0.8, eR: 0.5, hR: 2.4, kR: -0.1, hL: 0.9, kL: -1.6 }],
      [1, ST],
    ]),
    ...wakeupMoves(),
  },
};
attachCommandNormals(CHUNLI);

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
    grab: throwMove({
      name: '암 브레이커', startup: 0.13, active: 0.06, recovery: 0.5,
      catchT: 0.14, liftT: 0.32, damage: 125, range: 1.0, kb: 6.0, kbUp: 4.0,
    }),
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
    superN: superArt('사일런트 어썰트', ['fistL', 'fistR'], [
      [0, ST],
      [0.18, { ...ST, y: -0.15, tl: 0.2, tw: -0.7, sL: -0.5, eL: 1.2, sR: -0.4, eR: 1.1 }],
      [0.3, { y: -0.08, tl: 0.2, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.3, eR: 1.7, hL: 0.4, kL: -0.6 }],
      [0.42, { y: -0.08, tl: 0.2, tw: -0.2, sR: 1.55, eR: 0.1, sL: 0.3, eL: 1.7, hL: 0.4, kL: -0.6 }],
      [0.54, { y: -0.08, tl: 0.2, tw: 0.35, sL: 1.6, eL: 0.05, sR: 0.4, eR: 1.6, hL: 0.4, kL: -0.6 }],
      [0.64, { y: -0.08, tl: 0.25, tw: -0.2, sR: 1.6, eR: 0.05, sL: 0.4, eL: 1.6 }],
      [0.76, { y: -0.1, x: 0.3, tl: 0.35, tw: 0.4, sL: 1.4, eL: 0.15, sR: 1.35, eR: 0.2, hL: 0.6, kL: -0.7 }],
      [1, ST],
    ], { damage: 45 }),
    ...wakeupMoves(),
  },
};
attachCommandNormals(NINA);

// ============================================================
// CAMMY — rushdown: dives, drills, relentless forward pressure
// ============================================================
const CAMMY = {
  id: 'cammy',
  displayName: 'CAMMY',
  nameKo: '캐미',
  health: 950,
  walkF: 2.75, walkB: 2.0,
  jumpVy: 7.5,
  rig: {
    skin: 0xf2c9a0, top: 0x2e8b3a, pants: 0xf2c9a0, glove: 0xc03030,
    hair: 0xe8c96a, accent: 0xc03030, hairstyle: 'braids', beret: true,
  },
  moves: {
    punch: {
      name: '잽', startup: 0.07, active: 0.06, recovery: 0.15,
      damage: 25, level: 'high', hitstun: 0.27, blockstun: 0.17, kb: 1.4,
      limbs: ['fistL'], radius: RAD, cancelable: true, sound: 'whoosh',
      anim: strike(0.07, 0.06, 0.15,
        { ...ST, tw: -0.5, sL: 0.7, eL: 2.1 },
        { y: -0.06, tl: 0.14, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.4, eR: 1.8, hL: 0.35, kL: -0.5, hR: -0.2, kR: -0.35 }),
    },
    kick: {
      name: '니 스트라이크', startup: 0.13, active: 0.07, recovery: 0.26,
      damage: 58, level: 'mid', hitstun: 0.36, blockstun: 0.23, kb: 3.0,
      limbs: ['footR'], radius: 0.32, sound: 'whoosh',
      anim: strike(0.13, 0.07, 0.26,
        { ...ST, tl: 0.2, tw: -0.5, hR: -0.4, kR: -1.2 },
        { y: -0.02, tl: -0.1, tw: 0.4, sL: 0.6, eL: 1.5, sR: -0.5, eR: 0.6, hR: 1.5, kR: -1.3, hL: 0.25, kL: -0.45 }),
    },
    cpunch: {
      name: '앉아 잽', startup: 0.07, active: 0.05, recovery: 0.15, crouching: true,
      damage: 20, level: 'sm', hitstun: 0.24, blockstun: 0.16, kb: 1.1,
      limbs: ['fistL'], radius: 0.26, cancelable: true, sound: 'whoosh',
      anim: strike(0.07, 0.05, 0.15, CR, { ...CR, tw: 0.2, sL: 1.35, eL: 0.1 }, CR),
    },
    ckick: {
      name: '앉아 킥', startup: 0.13, active: 0.07, recovery: 0.28, crouching: true,
      damage: 40, level: 'low', hitstun: 0.33, blockstun: 0.21, kb: 1.9,
      limbs: ['footR'], radius: 0.3, sound: 'whoosh',
      anim: strike(0.13, 0.07, 0.28, CR, { ...CR, tl: 0.4, hR: 0.55, kR: -0.05 }, CR),
    },
    jpunch: {
      name: '점프 펀치', startup: 0.09, active: 0.3, recovery: 0.1, air: true,
      damage: 48, level: 'mid', hitstun: 0.33, blockstun: 0.22, kb: 2.0,
      limbs: ['fistR'], radius: 0.3, sound: 'whoosh',
      anim: [[0, AIR], [0.25, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }], [1, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }]],
    },
    jkick: {
      name: '점프 킥', startup: 0.11, active: 0.3, recovery: 0.1, air: true,
      damage: 60, level: 'mid', hitstun: 0.4, blockstun: 0.26, kb: 2.8,
      limbs: ['footR'], radius: 0.34, sound: 'whoosh',
      anim: [[0, AIR], [0.3, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1, hL: 1.2, kL: -2.0 }], [1, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1 }]],
    },
    grab: throwMove({
      name: '프랑켄슈타이너', startup: 0.13, active: 0.06, recovery: 0.5,
      catchT: 0.14, liftT: 0.32, damage: 115, range: 1.0, kb: 6.5, kbUp: 5.0,
    }),
    skillN: {
      name: '스핀 너클', startup: 0.26, active: 0.08, recovery: 0.42, isSkill: true,
      damage: 78, level: 'mid', hitstun: 0.6, blockstun: 0.3, kb: 1.2, crumple: true,
      limbs: ['fistR'], radius: 0.36, fwdSpeed: 2.8, fwdWindow: [0.05, 0.34],
      chip: 0.12, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.2, { y: -0.1, tl: 0.15, tw: -1.1, sR: -0.9, eR: 0.5, sL: 0.5, eL: 1.6, ry: -0.9 }],
        [0.36, { y: -0.06, tl: 0.2, tw: 0.6, sR: 1.5, eR: 0.1, sL: 0.4, eL: 1.6, sxR: 0.4, ry: 0.4, hL: 0.4, kL: -0.6 }],
        [0.62, { y: -0.06, tl: 0.2, tw: 0.6, sR: 1.5, eR: 0.1, sxR: 0.4, ry: 0.4 }],
        [1, ST],
      ],
    },
    skillF: {
      name: '캐논 스파이크', startup: 0.08, active: 0.3, recovery: 0.5, isSkill: true,
      damage: 95, level: 'mid', hitstun: 0.5, blockstun: 0.3, kb: 1.8, kbUp: 8.2,
      limbs: ['footR'], radius: 0.36, invuln: [0, 0.2], selfVy: 7.8, fwdSpeed: 1.2,
      chip: 0.15, sound: 'whoosh', afterimage: true, landingLag: true,
      anim: [
        [0, { ...ST, y: -0.2, tl: 0.3 }],
        [0.18, { y: 0.1, tl: -0.35, tw: 0.3, sL: -0.7, eL: 0.7, sR: -0.9, eR: 0.4, hR: 2.5, kR: -0.05, hL: 0.9, kL: -1.7 }],
        [0.6, { y: 0.05, tl: -0.4, tw: 0.3, sL: -0.7, eL: 0.7, sR: -0.9, eR: 0.4, hR: 2.3, kR: -0.2, hL: 0.9, kL: -1.7 }],
        [1, ST],
      ],
    },
    skillB: {
      name: '스파이럴 애로우', startup: 0.17, active: 0.3, recovery: 0.4, isSkill: true,
      damage: 90, level: 'mid', hitstun: 0.55, blockstun: 0.28, kb: 6.0, knockdown: true,
      limbs: ['footR', 'footL'], radius: 0.36, fwdSpeed: 6.0, fwdWindow: [0.17, 0.47],
      chip: 0.15, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.16, { ...ST, y: -0.25, tl: 0.45 }],
        [0.26, { y: -0.5, rz: 1.2, tl: 0, sL: -0.8, eL: 0.4, sR: -0.8, eR: 0.4, hL: 0.15, kL: -0.15, hR: 0.05, kR: -0.1, ry: 1.5 }],
        [0.55, { y: -0.5, rz: 1.2, tl: 0, sL: -0.8, eL: 0.4, sR: -0.8, eR: 0.4, hL: 0.15, kL: -0.15, hR: 0.05, kR: -0.1, ry: 5.5 }],
        [0.75, { ...CR, ry: 6.28 }],
        [1, ST],
      ],
    },
    skillD: {
      name: '슬라이딩', startup: 0.19, active: 0.12, recovery: 0.45, isSkill: true, crouching: true,
      damage: 60, level: 'low', hitstun: 0.55, blockstun: 0.26, kb: 3.0, knockdown: true,
      limbs: ['footR'], radius: 0.34, fwdSpeed: 3.5, fwdWindow: [0.05, 0.31],
      chip: 0.1, sound: 'whoosh',
      anim: [
        [0, { ...ST, y: -0.2 }],
        [0.22, { ...CR, tl: 0.2, rz: 0.5, hR: 0.8, kR: 0, hL: 1.2, kL: -2.0 }],
        [0.5, { ...CR, tl: 0.2, rz: 0.6, hR: 0.85, kR: 0, hL: 1.2, kL: -2.0 }],
        [0.85, CR],
        [1, ST],
      ],
    },
    superN: superArt('스핀 드라이브 스매셔', ['footR', 'footL'], [
      [0, ST],
      [0.18, { ...ST, y: -0.22, tl: 0.4 }],
      [0.3, { y: -0.45, rz: 1.25, sL: -0.8, eL: 0.4, sR: -0.8, eR: 0.4, hL: 0.1, kL: -0.1, hR: 0, kR: -0.05, ry: 1.5 }],
      [0.62, { y: -0.45, rz: 1.25, sL: -0.8, eL: 0.4, sR: -0.8, eR: 0.4, hL: 0.1, kL: -0.1, hR: 0, kR: -0.05, ry: 8 }],
      [0.74, { y: 0.1, tl: -0.35, tw: 0.3, sL: -0.7, eL: 0.7, sR: -0.9, eR: 0.4, hR: 2.5, kR: -0.05, hL: 0.9, kL: -1.7 }],
      [1, ST],
    ], { fwdSpeed: 5.2 }),
    ...wakeupMoves(),
  },
};
attachCommandNormals(CAMMY);

// ============================================================
// ASUKA — counters and heavy strikes: the defensive specialist
// ============================================================
const ASUKA = {
  id: 'asuka',
  displayName: 'ASUKA',
  nameKo: '아스카',
  health: 1050,
  walkF: 2.2, walkB: 1.75,
  jumpVy: 6.9,
  rig: {
    skin: 0xf2cba6, top: 0x3f6fd0, pants: 0xf3f3f0, glove: 0xd6e4ff,
    hair: 0x33261e, accent: 0xd04a20, hairstyle: 'short', sleeves: false,
  },
  moves: {
    punch: {
      name: '잽', startup: 0.08, active: 0.06, recovery: 0.18,
      damage: 30, level: 'high', hitstun: 0.28, blockstun: 0.18, kb: 1.7,
      limbs: ['fistL'], radius: RAD, cancelable: true, sound: 'whoosh',
      anim: strike(0.08, 0.06, 0.18,
        { ...ST, tw: -0.5, sL: 0.7, eL: 2.1 },
        { y: -0.06, tl: 0.14, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.4, eR: 1.8, hL: 0.35, kL: -0.5, hR: -0.2, kR: -0.35 }),
    },
    kick: {
      name: '미들 킥', startup: 0.17, active: 0.08, recovery: 0.32,
      damage: 78, level: 'mid', hitstun: 0.42, blockstun: 0.27, kb: 4.4,
      limbs: ['footR'], radius: 0.34, sound: 'whoosh',
      anim: strike(0.17, 0.08, 0.32,
        { ...ST, tl: 0.25, tw: -0.6, hR: -0.6, kR: -1.4 },
        { y: -0.04, tl: -0.2, tw: 0.5, sL: 0.6, eL: 1.5, sR: -0.7, eR: 0.5, sxR: 0.5, hL: 0.2, kL: -0.4, hR: 1.85, kR: -0.08 }),
    },
    cpunch: {
      name: '앉아 잽', startup: 0.08, active: 0.05, recovery: 0.17, crouching: true,
      damage: 26, level: 'sm', hitstun: 0.24, blockstun: 0.16, kb: 1.2,
      limbs: ['fistL'], radius: 0.26, cancelable: true, sound: 'whoosh',
      anim: strike(0.08, 0.05, 0.17, CR, { ...CR, tw: 0.2, sL: 1.35, eL: 0.1 }, CR),
    },
    ckick: {
      name: '앉아 킥', startup: 0.15, active: 0.07, recovery: 0.32, crouching: true,
      damage: 48, level: 'low', hitstun: 0.35, blockstun: 0.22, kb: 2.2,
      limbs: ['footR'], radius: 0.3, sound: 'whoosh',
      anim: strike(0.15, 0.07, 0.32, CR, { ...CR, tl: 0.4, hR: 0.55, kR: -0.05 }, CR),
    },
    jpunch: {
      name: '점프 펀치', startup: 0.09, active: 0.3, recovery: 0.1, air: true,
      damage: 56, level: 'mid', hitstun: 0.35, blockstun: 0.22, kb: 2.2,
      limbs: ['fistR'], radius: 0.3, sound: 'whoosh',
      anim: [[0, AIR], [0.25, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }], [1, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }]],
    },
    jkick: {
      name: '점프 킥', startup: 0.11, active: 0.3, recovery: 0.1, air: true,
      damage: 70, level: 'mid', hitstun: 0.42, blockstun: 0.26, kb: 3.2,
      limbs: ['footR'], radius: 0.34, sound: 'whoosh',
      anim: [[0, AIR], [0.3, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1, hL: 1.2, kL: -2.0 }], [1, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1 }]],
    },
    grab: throwMove({
      name: '어깨 메치기', startup: 0.14, active: 0.06, recovery: 0.5,
      catchT: 0.14, liftT: 0.32, damage: 130, range: 1.05, kb: 5.0, kbUp: 5.5,
    }),
    // 반격기: catches high/mid strikes during the window, then auto-counters.
    skillN: {
      name: '백로 반격', startup: 0.06, active: 0.42, recovery: 0.5, isSkill: true,
      parry: true, counterDamage: 95,
      damage: 0, level: 'mid', hitstun: 0, blockstun: 0, kb: 0,
      limbs: [], radius: 0, sound: 'whoosh',
      anim: [
        [0, ST],
        [0.1, { y: -0.1, tl: 0.12, tw: -0.2, sL: 1.15, eL: 1.5, sR: 1.0, eR: 1.6, sxL: 0.3, sxR: 0.25, hL: 0.35, kL: -0.55, hR: -0.2, kR: -0.4 }],
        [0.55, { y: -0.1, tl: 0.12, tw: -0.2, sL: 1.15, eL: 1.5, sR: 1.0, eR: 1.6, sxL: 0.3, sxR: 0.25, hL: 0.35, kL: -0.55, hR: -0.2, kR: -0.4 }],
        [1, ST],
      ],
    },
    parryCounter: {
      name: '반격', startup: 0.1, active: 0.05, recovery: 0.4,
      damage: 0, level: 'mid', hitstun: 0, blockstun: 0, kb: 0,
      limbs: [], radius: 0, sound: 'whoosh',
      anim: [
        [0, { y: -0.1, tl: 0.12, sL: 1.15, eL: 1.5, sR: 1.0, eR: 1.6 }],
        [0.3, { y: -0.15, tl: -0.3, tw: 1.0, sL: 2.2, eL: 0.3, sR: 0.5, eR: 0.9, hL: 0.5, kL: -0.7 }],
        [0.6, { y: -0.1, tl: -0.2, tw: 0.8, sL: 2.0, eL: 0.4, sR: 0.5, eR: 0.9 }],
        [1, ST],
      ],
    },
    skillF: {
      name: '귀신무', startup: 0.14, active: 0.07, recovery: 0.42, isSkill: true,
      damage: 92, level: 'mid', hitstun: 0.5, blockstun: 0.28, kb: 1.8, kbUp: 8.8,
      limbs: ['footL'], radius: 0.36, fwdSpeed: 2.0, fwdWindow: [0, 0.21],
      chip: 0.15, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.18, { ...ST, y: -0.18, tl: 0.35, hL: -0.4, kL: -1.4 }],
        [0.3, { y: 0.05, tl: -0.35, tw: -0.3, sR: 0.3, eR: 1.3, sL: -0.9, eL: 0.4, hL: 2.4, kL: -0.1, hR: 0.5, kR: -0.7 }],
        [0.55, { y: 0.02, tl: -0.3, tw: -0.3, sR: 0.3, eR: 1.3, sL: -0.9, eL: 0.4, hL: 2.2, kL: -0.2 }],
        [1, ST],
      ],
    },
    skillB: {
      name: '선풍연각', startup: 0.16, active: 0.36, recovery: 0.38, isSkill: true,
      damage: 45, level: 'mid', hitstun: 0.26, blockstun: 0.18, kb: 1.0,
      hits: 2, hitInterval: 0.17,
      lastHit: { kb: 6.0, kbUp: 3.0, knockdown: true, hitstun: 0.6 },
      limbs: ['footR', 'footL'], radius: 0.36, fwdSpeed: 2.6, fwdWindow: [0.16, 0.52],
      chip: 0.12, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.15, { ...ST, tl: -0.1, hR: 1.6, kR: -0.1, sxL: 0.4, sxR: 0.4, ry: 0.5 }],
        [0.38, { ...ST, tl: -0.1, hL: 1.7, kL: -0.05, hR: -0.2, kR: -0.5, sxL: 0.4, sxR: 0.4, ry: 3.2 }],
        [0.6, { ...ST, tl: -0.15, hL: 1.7, kL: 0, sxL: 0.4, sxR: 0.4, ry: 5.5 }],
        [1, { ...ST, ry: 6.28 }],
      ],
    },
    skillD: {
      name: '낙엽쓸기', startup: 0.22, active: 0.1, recovery: 0.46, isSkill: true, crouching: true,
      damage: 72, level: 'low', hitstun: 0.6, blockstun: 0.28, kb: 3.2, knockdown: true,
      limbs: ['footR'], radius: 0.34, fwdSpeed: 1.4, fwdWindow: [0, 0.32],
      chip: 0.1, sound: 'whoosh',
      anim: [
        [0, { ...ST, y: -0.2 }],
        [0.26, { ...CR, tw: -0.7, hR: -0.4, kR: -1.5 }],
        [0.36, { ...CR, tl: 0.5, tw: 0.4, hR: 0.7, kR: 0, ry: 0.8 }],
        [0.52, { ...CR, tl: 0.5, tw: 0.4, hR: 0.7, kR: 0, ry: 2.6 }],
        [0.86, { ...CR, ry: 6.28 }],
        [1, ST],
      ],
    },
    superN: superArt('귀신 연무', ['fistL', 'footR'], [
      [0, ST],
      [0.18, { ...ST, y: -0.15, tl: 0.2, tw: -0.6, sL: -0.5, eL: 1.2 }],
      [0.3, { y: -0.08, tl: 0.2, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.3, eR: 1.7, hL: 0.4, kL: -0.6 }],
      [0.42, { y: -0.05, tl: -0.1, tw: 0.4, sL: 0.6, eL: 1.5, hR: 1.7, kR: -0.08, sxR: 0.4 }],
      [0.54, { y: -0.08, tl: 0.25, tw: -0.2, sR: 1.6, eR: 0.05, sL: 0.4, eL: 1.6 }],
      [0.64, { y: -0.05, tl: -0.15, tw: 0.4, hR: 1.85, kR: 0, sxL: 0.4, sxR: 0.4 }],
      [0.76, { y: -0.15, tl: -0.3, tw: 1.0, sL: 2.2, eL: 0.3, sR: 0.5, eR: 0.9, hL: 0.5, kL: -0.7 }],
      [1, ST],
    ], { damage: 44 }),
    ...wakeupMoves(),
  },
};
attachCommandNormals(ASUKA);

// ============================================================
// ZANGIEF — grapple specialist: colossal command-throw damage
// ============================================================
const ZANGIEF = {
  id: 'zangief',
  displayName: 'ZANGIEF',
  nameKo: '장기에프',
  health: 1200,
  walkF: 1.9, walkB: 1.5,
  jumpVy: 6.3,
  rig: {
    skin: 0xe8b48a, top: 0xb31d1d, pants: 0x1a1a1a, glove: 0x7a2a1a,
    hair: 0x2a2a2a, accent: 0xd8b53a, sleeves: false, scale: 1.17,
  },
  moves: {
    punch: {
      name: '잽', startup: 0.1, active: 0.07, recovery: 0.22,
      damage: 34, level: 'high', hitstun: 0.3, blockstun: 0.2, kb: 1.8,
      limbs: ['fistL'], radius: RAD, cancelable: true, sound: 'whoosh',
      anim: strike(0.1, 0.07, 0.22,
        { ...ST, tw: -0.5, sL: 0.7, eL: 2.1 },
        { y: -0.06, tl: 0.14, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.4, eR: 1.8, hL: 0.35, kL: -0.5, hR: -0.2, kR: -0.35 }),
    },
    kick: {
      name: '헤비 킥', startup: 0.2, active: 0.09, recovery: 0.36,
      damage: 82, level: 'mid', hitstun: 0.44, blockstun: 0.28, kb: 4.6,
      limbs: ['footR'], radius: 0.34, sound: 'whoosh',
      anim: strike(0.2, 0.09, 0.36,
        { ...ST, tl: 0.25, tw: -0.6, hR: -0.6, kR: -1.4 },
        { y: -0.02, tl: -0.1, tw: 0.4, sL: 0.6, eL: 1.5, sR: -0.5, eR: 0.6, hR: 1.5, kR: -1.3, hL: 0.25, kL: -0.45 }),
    },
    cpunch: {
      name: '앉아 잽', startup: 0.1, active: 0.06, recovery: 0.2, crouching: true,
      damage: 28, level: 'sm', hitstun: 0.25, blockstun: 0.17, kb: 1.3,
      limbs: ['fistL'], radius: 0.26, cancelable: true, sound: 'whoosh',
      anim: strike(0.1, 0.06, 0.2, CR, { ...CR, tw: 0.2, sL: 1.35, eL: 0.1 }, CR),
    },
    ckick: {
      name: '앉아 킥', startup: 0.17, active: 0.08, recovery: 0.34, crouching: true,
      damage: 50, level: 'low', hitstun: 0.36, blockstun: 0.23, kb: 2.2,
      limbs: ['footR'], radius: 0.3, sound: 'whoosh',
      anim: strike(0.17, 0.08, 0.34, CR, { ...CR, tl: 0.4, hR: 0.55, kR: -0.05 }, CR),
    },
    jpunch: {
      name: '점프 펀치', startup: 0.1, active: 0.32, recovery: 0.12, air: true,
      damage: 58, level: 'mid', hitstun: 0.36, blockstun: 0.23, kb: 2.2,
      limbs: ['fistR'], radius: 0.32, sound: 'whoosh',
      anim: [[0, AIR], [0.25, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }], [1, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }]],
    },
    jkick: {
      name: '점프 킥', startup: 0.12, active: 0.32, recovery: 0.12, air: true,
      damage: 66, level: 'mid', hitstun: 0.42, blockstun: 0.27, kb: 3.0,
      limbs: ['footR'], radius: 0.36, sound: 'whoosh',
      anim: [[0, AIR], [0.3, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1, hL: 1.2, kL: -2.0 }], [1, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1 }]],
    },
    grab: throwMove({
      name: '바디 슬램', startup: 0.14, active: 0.07, recovery: 0.5,
      catchT: 0.14, liftT: 0.32, damage: 120, range: 1.15, kb: 5.0, kbUp: 4.0,
    }),
    // 커맨드 그랩: 장기에프의 시그니처 스크류 파일드라이버.
    skillN: throwMove({
      name: '스크류 파일드라이버', style: 'piledriver', isCommandThrow: true,
      startup: 0.2, active: 0.09, recovery: 0.55,
      catchT: 0.18, liftT: 0.42, damage: 175, range: 1.2, knockdown: true,
    }),
    skillF: {
      name: '배니싱 플랫', startup: 0.22, active: 0.1, recovery: 0.4, isSkill: true,
      damage: 70, level: 'mid', hitstun: 0.4, blockstun: 0.26, kb: 3.0,
      limbs: ['fistR'], radius: 0.36, fwdSpeed: 2.0, fwdWindow: [0, 0.28],
      chip: 0.12, sound: 'whoosh',
      anim: [
        [0, ST],
        [0.35, { y: -0.08, tl: 0.15, tw: -0.6, sR: -0.6, eR: 1.0, sL: 0.5, eL: 1.6 }],
        [0.55, { y: -0.04, tl: 0.1, tw: 0.5, sR: 1.7, eR: 0.15, sL: 0.4, eL: 1.6 }],
        [0.8, { y: -0.04, tl: 0.1, tw: 0.5, sR: 1.7, eR: 0.15 }],
        [1, ST],
      ],
    },
    skillB: {
      name: '더블 라리아트', startup: 0.18, active: 0.4, recovery: 0.38, isSkill: true,
      damage: 32, level: 'mid', hitstun: 0.24, blockstun: 0.17, kb: 1.2,
      hits: 2, hitInterval: 0.18,
      lastHit: { kb: 5.0, kbUp: 3.0, knockdown: true, hitstun: 0.55 },
      limbs: ['fistL', 'fistR'], radius: 0.4, invuln: [0.02, 0.12],
      fwdSpeed: 1.0, fwdWindow: [0.18, 0.56], chip: 0.12, sound: 'whoosh',
      anim: [
        [0, ST],
        [0.16, { ...ST, tw: -0.2, sL: 1.5, eL: 0.15, sR: 1.5, eR: 0.15, sxL: 0.7, sxR: 0.7 }],
        [0.35, { ...ST, tw: 1.3, sL: 1.5, eL: 0.15, sR: 1.5, eR: 0.15, sxL: 0.7, sxR: 0.7, ry: 2.2 }],
        [0.6, { ...ST, tw: 1.3, sL: 1.5, eL: 0.15, sR: 1.5, eR: 0.15, sxL: 0.7, sxR: 0.7, ry: 5.0 }],
        [1, { ...ST, ry: 6.28 }],
      ],
    },
    skillD: {
      name: '더블 니 프레스', startup: 0.2, active: 0.1, recovery: 0.42, isSkill: true, crouching: true,
      damage: 55, level: 'low', hitstun: 0.5, blockstun: 0.26, kb: 2.5, knockdown: true,
      limbs: ['footR'], radius: 0.32, fwdSpeed: 0.8, fwdWindow: [0, 0.28],
      chip: 0.1, sound: 'whoosh',
      anim: [
        [0, CR],
        [0.22, { ...CR, tw: -0.5, hR: -0.2, kR: -1.3 }],
        [0.34, { ...CR, tl: 0.5, tw: 0.3, hR: 0.6, kR: -0.05 }],
        [0.7, { ...CR, tl: 0.5, tw: 0.3, hR: 0.6, kR: -0.05 }],
        [1, ST],
      ],
    },
    superN: superArt('레드 사이클론', ['fistL', 'fistR'], [
      [0, ST],
      [0.18, { ...ST, tw: -0.3, sL: 1.4, eL: 0.2, sR: 1.4, eR: 0.2, sxL: 0.6, sxR: 0.6 }],
      [0.3, { ...ST, tw: 1.5, sL: 1.4, eL: 0.2, sR: 1.4, eR: 0.2, sxL: 0.6, sxR: 0.6, ry: 2.5 }],
      [0.45, { ...ST, tw: 1.5, sL: 1.4, eL: 0.2, sR: 1.4, eR: 0.2, sxL: 0.6, sxR: 0.6, ry: 6.0 }],
      [0.6, { ...ST, tw: 1.5, sL: 1.4, eL: 0.2, sR: 1.4, eR: 0.2, sxL: 0.6, sxR: 0.6, ry: 10.5 }],
      [0.76, { y: 0.1, tl: -0.3, tw: 0.4, sL: -0.6, eL: 0.8, sR: -0.8, eR: 0.5, hR: 2.4, kR: -0.1, hL: 0.9, kL: -1.6, ry: 11.5 }],
      [1, { ...ST, ry: 12.5 }],
    ], { damage: 46, fwdSpeed: 1.6 }),
    ...wakeupMoves(),
  },
};
attachCommandNormals(ZANGIEF);

// ============================================================
// R. MIKA — grapple specialist: mobile suplex pressure
// ============================================================
const RMIKA = {
  id: 'rmika',
  displayName: 'R. MIKA',
  nameKo: 'R. 미카',
  health: 1020,
  walkF: 2.35, walkB: 1.85,
  jumpVy: 6.8,
  rig: {
    skin: 0xf2c9a0, top: 0xe83f8f, pants: 0xffffff, glove: 0xffffff,
    hair: 0xe8c96a, accent: 0xffd93d, hairstyle: 'buns', sleeves: false,
  },
  moves: {
    punch: {
      name: '잽', startup: 0.08, active: 0.06, recovery: 0.17,
      damage: 27, level: 'high', hitstun: 0.28, blockstun: 0.18, kb: 1.5,
      limbs: ['fistL'], radius: RAD, cancelable: true, sound: 'whoosh',
      anim: strike(0.08, 0.06, 0.17,
        { ...ST, tw: -0.5, sL: 0.7, eL: 2.1 },
        { y: -0.06, tl: 0.14, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.4, eR: 1.8, hL: 0.35, kL: -0.5, hR: -0.2, kR: -0.35 }),
    },
    kick: {
      name: '드롭킥', startup: 0.15, active: 0.08, recovery: 0.3,
      damage: 64, level: 'mid', hitstun: 0.38, blockstun: 0.24, kb: 3.6,
      limbs: ['footR'], radius: 0.32, sound: 'whoosh',
      anim: strike(0.15, 0.08, 0.3,
        { ...ST, tl: 0.2, tw: -0.5, hR: -0.4, kR: -1.2 },
        { y: -0.02, tl: -0.1, tw: 0.4, sL: 0.6, eL: 1.5, sR: -0.5, eR: 0.6, hR: 1.5, kR: -1.3, hL: 0.25, kL: -0.45 }),
    },
    cpunch: {
      name: '앉아 잽', startup: 0.08, active: 0.05, recovery: 0.16, crouching: true,
      damage: 22, level: 'sm', hitstun: 0.24, blockstun: 0.16, kb: 1.2,
      limbs: ['fistL'], radius: 0.26, cancelable: true, sound: 'whoosh',
      anim: strike(0.08, 0.05, 0.16, CR, { ...CR, tw: 0.2, sL: 1.35, eL: 0.1 }, CR),
    },
    ckick: {
      name: '앉아 킥', startup: 0.14, active: 0.07, recovery: 0.3, crouching: true,
      damage: 42, level: 'low', hitstun: 0.34, blockstun: 0.22, kb: 2.0,
      limbs: ['footR'], radius: 0.3, sound: 'whoosh',
      anim: strike(0.14, 0.07, 0.3, CR, { ...CR, tl: 0.4, hR: 0.55, kR: -0.05 }, CR),
    },
    jpunch: {
      name: '점프 펀치', startup: 0.09, active: 0.3, recovery: 0.1, air: true,
      damage: 52, level: 'mid', hitstun: 0.34, blockstun: 0.22, kb: 2.0,
      limbs: ['fistR'], radius: 0.3, sound: 'whoosh',
      anim: [[0, AIR], [0.25, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }], [1, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }]],
    },
    jkick: {
      name: '점프 킥', startup: 0.11, active: 0.3, recovery: 0.1, air: true,
      damage: 64, level: 'mid', hitstun: 0.4, blockstun: 0.26, kb: 2.8,
      limbs: ['footR'], radius: 0.34, sound: 'whoosh',
      anim: [[0, AIR], [0.3, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1, hL: 1.2, kL: -2.0 }], [1, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1 }]],
    },
    grab: throwMove({
      name: '몽키 플립', startup: 0.13, active: 0.06, recovery: 0.48,
      catchT: 0.13, liftT: 0.3, damage: 115, range: 1.05, kb: 5.5, kbUp: 4.2,
    }),
    // 커맨드 그랩: 미카의 시그니처 수플렉스.
    skillN: throwMove({
      name: '슈팅 피치 수플렉스', style: 'suplex', isCommandThrow: true,
      startup: 0.19, active: 0.08, recovery: 0.5,
      catchT: 0.16, liftT: 0.4, damage: 160, range: 1.15, kb: 1.0, knockdown: true,
    }),
    skillF: {
      name: '러닝 바디 프레스', startup: 0.16, active: 0.14, recovery: 0.4, isSkill: true,
      damage: 68, level: 'mid', hitstun: 0.42, blockstun: 0.26, kb: 3.4,
      limbs: ['fistL', 'fistR'], radius: 0.4, fwdSpeed: 3.4, fwdWindow: [0, 0.3],
      chip: 0.13, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.14, { ...ST, tl: 0.3, sL: 0.2, eL: 0.5, sR: 0.2, eR: 0.5 }],
        [0.34, { y: 0.02, tl: 0.15, tw: 0.1, sL: 1.4, eL: 0.2, sR: 1.4, eR: 0.2, hL: 0.5, kL: -0.6, hR: 0.4, kR: -0.5 }],
        [0.6, { y: 0.02, tl: 0.15, tw: 0.1, sL: 1.4, eL: 0.2, sR: 1.4, eR: 0.2, hL: 0.5, kL: -0.6, hR: 0.4, kR: -0.5 }],
        [1, ST],
      ],
    },
    skillB: {
      name: '피치 캔 캔', startup: 0.15, active: 0.36, recovery: 0.36, isSkill: true,
      damage: 28, level: 'mid', hitstun: 0.24, blockstun: 0.17, kb: 1.0,
      hits: 2, hitInterval: 0.16,
      lastHit: { kb: 5.0, kbUp: 3.0, knockdown: true, hitstun: 0.55 },
      limbs: ['footR', 'footL'], radius: 0.34, fwdSpeed: 2.2, fwdWindow: [0.15, 0.48],
      chip: 0.1, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.15, { ...ST, tl: -0.1, hR: 1.6, kR: -0.1, sxL: 0.4, sxR: 0.4, ry: 0.5 }],
        [0.38, { ...ST, tl: -0.1, hL: 1.7, kL: -0.05, hR: -0.2, kR: -0.5, sxL: 0.4, sxR: 0.4, ry: 3.2 }],
        [0.6, { ...ST, tl: -0.15, hL: 1.7, kL: 0, sxL: 0.4, sxR: 0.4, ry: 5.5 }],
        [1, { ...ST, ry: 6.28 }],
      ],
    },
    skillD: {
      name: '로우 슬라이드', startup: 0.18, active: 0.11, recovery: 0.44, isSkill: true, crouching: true,
      damage: 58, level: 'low', hitstun: 0.55, blockstun: 0.26, kb: 3.0, knockdown: true,
      limbs: ['footR'], radius: 0.34, fwdSpeed: 3.0, fwdWindow: [0.05, 0.3],
      chip: 0.1, sound: 'whoosh',
      anim: [
        [0, { ...ST, y: -0.2 }],
        [0.2, { ...CR, tl: 0.2, rz: 0.5, hR: 0.8, kR: 0, hL: 1.2, kL: -2.0 }],
        [0.46, { ...CR, tl: 0.2, rz: 0.6, hR: 0.85, kR: 0, hL: 1.2, kL: -2.0 }],
        [0.8, CR],
        [1, ST],
      ],
    },
    superN: superArt('미카 익스프레스', ['fistL', 'footR'], [
      [0, ST],
      [0.18, { ...ST, y: -0.15, tl: 0.2, tw: -0.6, sL: -0.5, eL: 1.2 }],
      [0.3, { y: -0.08, tl: 0.2, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.3, eR: 1.7, hL: 0.4, kL: -0.6 }],
      [0.42, { y: -0.05, tl: -0.1, tw: 0.4, sL: 0.6, eL: 1.5, hR: 1.7, kR: -0.08, sxR: 0.4 }],
      [0.54, { y: -0.08, tl: 0.25, tw: -0.2, sR: 1.6, eR: 0.05, sL: 0.4, eL: 1.6 }],
      [0.64, { y: -0.05, tl: -0.15, tw: 0.4, hR: 1.85, kR: 0, sxL: 0.4, sxR: 0.4 }],
      [0.76, { y: -0.15, tl: -0.3, tw: 1.0, sL: 2.2, eL: 0.3, sR: 0.5, eR: 0.9, hL: 0.5, kL: -0.7 }],
      [1, ST],
    ], { damage: 44 }),
    ...wakeupMoves(),
  },
};
attachCommandNormals(RMIKA);

// ============================================================
// SAKURA — shoto rushdown, rendered on a real rigged model (see skinnedRig.js)
// instead of the box rig. rig.type:'skinned' tells Fighter to load it that way.
// ============================================================
const SAKURA = {
  id: 'sakura',
  displayName: 'SAKURA',
  nameKo: '사쿠라',
  health: 980,
  walkF: 2.6, walkB: 1.95,
  jumpVy: 7.3,
  rig: { type: 'skinned', modelId: 'sakura' },
  moves: {
    punch: {
      name: '잽', startup: 0.08, active: 0.06, recovery: 0.17,
      damage: 27, level: 'high', hitstun: 0.28, blockstun: 0.18, kb: 1.6,
      limbs: ['fistL'], radius: RAD, cancelable: true, sound: 'whoosh',
      anim: strike(0.08, 0.06, 0.17,
        { ...ST, tw: -0.5, sL: 0.7, eL: 2.1 },
        { y: -0.06, tl: 0.14, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.4, eR: 1.8, hL: 0.35, kL: -0.5, hR: -0.2, kR: -0.35 }),
    },
    kick: {
      name: '킥', startup: 0.15, active: 0.07, recovery: 0.28,
      damage: 60, level: 'mid', hitstun: 0.38, blockstun: 0.24, kb: 3.4,
      limbs: ['footR'], radius: 0.32, sound: 'whoosh',
      anim: strike(0.15, 0.07, 0.28,
        { ...ST, tl: 0.2, tw: -0.6, hR: -0.5, kR: -1.2 },
        { y: -0.05, tl: -0.18, tw: 0.5, sL: 0.7, eL: 1.5, sR: -0.6, eR: 0.6, hL: 0.2, kL: -0.4, hR: 1.75, kR: -0.1 }),
    },
    cpunch: {
      name: '앉아 잽', startup: 0.08, active: 0.05, recovery: 0.16, crouching: true,
      damage: 22, level: 'sm', hitstun: 0.24, blockstun: 0.16, kb: 1.2,
      limbs: ['fistL'], radius: 0.26, cancelable: true, sound: 'whoosh',
      anim: strike(0.08, 0.05, 0.16, CR, { ...CR, tw: 0.2, sL: 1.35, eL: 0.1 }, CR),
    },
    ckick: {
      name: '앉아 킥', startup: 0.14, active: 0.07, recovery: 0.3, crouching: true,
      damage: 40, level: 'low', hitstun: 0.34, blockstun: 0.22, kb: 2.0,
      limbs: ['footR'], radius: 0.3, sound: 'whoosh',
      anim: strike(0.14, 0.07, 0.3, CR, { ...CR, tl: 0.4, hR: 0.55, kR: -0.05 }, CR),
    },
    jpunch: {
      name: '점프 펀치', startup: 0.09, active: 0.3, recovery: 0.1, air: true,
      damage: 48, level: 'mid', hitstun: 0.34, blockstun: 0.22, kb: 2.0,
      limbs: ['fistR'], radius: 0.3, sound: 'whoosh',
      anim: [[0, AIR], [0.25, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }], [1, { ...AIR, tl: 0.35, sR: 1.1, eR: 0.15 }]],
    },
    jkick: {
      name: '점프 킥', startup: 0.11, active: 0.3, recovery: 0.1, air: true,
      damage: 60, level: 'mid', hitstun: 0.4, blockstun: 0.26, kb: 2.8,
      limbs: ['footR'], radius: 0.34, sound: 'whoosh',
      anim: [[0, AIR], [0.3, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1, hL: 1.2, kL: -2.0 }], [1, { ...AIR, tl: 0.3, hR: 1.3, kR: -0.1 }]],
    },
    grab: throwMove({
      name: '헤드 스크류', startup: 0.13, active: 0.06, recovery: 0.48,
      catchT: 0.13, liftT: 0.3, damage: 112, range: 1.0, kb: 5.5, kbUp: 4.2,
    }),
    skillN: {
      name: '하도켄', startup: 0.24, active: 0.02, recovery: 0.38, isSkill: true,
      damage: 0, level: 'sm', sound: 'fireball',
      proj: { kind: 'fireball', speed: 7.4, damage: 55, level: 'sm', hitstun: 0.4, blockstun: 0.28, kb: 2.8, chip: 0.15, color: 0xff8a3d, y: 1.1, radius: 0.3 },
      anim: [
        [0, ST],
        [0.28, { y: -0.12, tl: 0.1, tw: -0.7, sL: -0.6, eL: 0.9, sR: -0.5, eR: 0.8 }],
        [0.42, { y: -0.1, x: 0.12, tl: 0.22, tw: 0.35, sL: 1.35, eL: 0.25, sR: 1.3, eR: 0.3 }],
        [0.75, { y: -0.1, x: 0.12, tl: 0.22, tw: 0.35, sL: 1.35, eL: 0.25, sR: 1.3, eR: 0.3 }],
        [1, ST],
      ],
    },
    skillF: {
      name: '쇼오켄', startup: 0.08, active: 0.28, recovery: 0.48, isSkill: true,
      damage: 92, level: 'mid', hitstun: 0.5, blockstun: 0.3, kb: 1.4, kbUp: 8.2,
      limbs: ['fistR'], radius: 0.36, invuln: [0, 0.22], selfVy: 7.2, fwdSpeed: 1.2,
      chip: 0.15, sound: 'whoosh', afterimage: true, landingLag: true,
      anim: [
        [0, { ...ST, y: -0.15, tl: 0.25 }],
        [0.14, { y: 0.1, tl: -0.3, tw: 0.3, sR: 2.2, eR: 0.15, sL: 0.4, eL: 1.5, hR: 0.6, kR: -0.5, hL: 0.9, kL: -1.5 }],
        [0.55, { y: 0.1, tl: -0.35, tw: 0.3, sR: 2.3, eR: 0.1, sL: 0.4, eL: 1.5, hR: 0.6, kR: -0.5, hL: 0.9, kL: -1.5 }],
        [1, ST],
      ],
    },
    skillB: {
      name: '슌푸카큐쿠', startup: 0.15, active: 0.4, recovery: 0.36, isSkill: true,
      damage: 26, level: 'mid', hitstun: 0.24, blockstun: 0.17, kb: 1.0,
      hits: 3, hitInterval: 0.15,
      lastHit: { kb: 5.5, kbUp: 3.2, knockdown: true, hitstun: 0.6 },
      limbs: ['footR', 'footL'], radius: 0.36, fwdSpeed: 3.0, fwdWindow: [0.15, 0.5],
      chip: 0.1, sound: 'whoosh', afterimage: true,
      anim: [
        [0, ST],
        [0.14, { ...ST, tl: -0.1, hR: 1.6, kR: -0.1, ry: 0.4 }],
        [0.32, { ...ST, tl: -0.1, hL: 1.6, kL: -0.1, hR: -0.2, kR: -0.5, ry: 2.5 }],
        [0.5, { ...ST, tl: -0.15, hR: 1.7, kR: -0.05, ry: 5.0 }],
        [1, { ...ST, ry: 6.28 }],
      ],
    },
    skillD: {
      name: '낮은 스윕', startup: 0.18, active: 0.09, recovery: 0.42, isSkill: true, crouching: true,
      damage: 55, level: 'low', hitstun: 0.6, blockstun: 0.26, kb: 3.0, knockdown: true,
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
    superN: superArt('하루이치방', ['fistR', 'footR'], [
      [0, ST],
      [0.18, { ...ST, y: -0.15, tl: 0.2, tw: -0.6, sL: -0.5, eL: 1.2 }],
      [0.3, { y: -0.08, tl: 0.2, tw: 0.35, sL: 1.55, eL: 0.1, sR: 0.3, eR: 1.7, hL: 0.4, kL: -0.6 }],
      [0.42, { y: -0.05, tl: -0.1, tw: 0.4, sL: 0.6, eL: 1.5, hR: 1.7, kR: -0.08 }],
      [0.54, { y: -0.08, tl: 0.25, tw: -0.2, sR: 1.6, eR: 0.05, sL: 0.4, eL: 1.6 }],
      [0.64, { y: -0.05, tl: -0.15, tw: 0.4, hR: 1.85, kR: 0 }],
      [0.76, { y: 0.1, tl: -0.3, tw: 0.3, sR: 2.3, eR: 0.1, sL: 0.4, eL: 1.5, hR: 0.6, kR: -0.5 }],
      [1, ST],
    ], { damage: 44 }),
    ...wakeupMoves(),
  },
};
attachCommandNormals(SAKURA);

// Helper: wrap character rig into variants array for model selection support
function makeVariants(charDef) {
  const baseRig = charDef.rig || { type: 'box' };
  if (charDef.variants) return charDef; // already wrapped
  return {
    ...charDef,
    variants: [{ name: 'Box', rig: baseRig }],
    defaultVariant: 0,
  };
}

// Characters with multiple rendering variants
const withVariants = {
  sakura: {
    ...SAKURA,
    variants: [
      { name: 'Juri', rig: SAKURA.rig },
      { name: 'Athletic', rig: { type: 'skinned', modelId: 'sports_girl' } },
      { name: 'Tina', rig: { type: 'skinned', modelId: 'tina' } },
    ],
    defaultVariant: 0,
  },
};

export const CHARACTERS = {
  chunli: makeVariants(CHUNLI),
  nina: makeVariants(NINA),
  cammy: makeVariants(CAMMY),
  asuka: makeVariants(ASUKA),
  zangief: makeVariants(ZANGIEF),
  rmika: makeVariants(RMIKA),
  sakura: withVariants.sakura,
};
