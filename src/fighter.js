import { buildRig, sampleClip, lerpPose } from './rig.js';
import { ST, CR, AIR, HIT_H, HIT_M, BLK_S, BLK_C, LAUNCHED, KD, WALLSPLAT, CRUMPLE_A, WIN } from './moves.js';
import { Sound } from './audio.js';

const DASH_TAP_WINDOW = 0.28; // max seconds between taps to count as a double-tap
const DASH_COOLDOWN = 0.45;

export const GRAV = 21;

let uid = 0;

export class Fighter {
  constructor(charDef, ctrl, scene) {
    this.id = uid++;
    this.char = charDef;
    this.ctrl = ctrl;
    this.rig = buildRig(charDef.rig);
    scene.add(this.rig.root);

    this.maxHealth = charDef.health;
    this.meter = 0; // super gauge 0..100, persists across rounds
    this.reset(0, 1);
  }

  addMeter(v) { this.meter = Math.min(100, Math.max(0, this.meter + v)); }

  reset(x, facing) {
    this.pos = { x, y: 0 };
    this.vx = 0; this.vy = 0;
    this.facing = facing;
    this.health = this.maxHealth;
    this.state = 'idle';
    this.stateT = 0;
    this.move = null;
    this.moveT = 0;
    this.nextHitTime = 0;
    this.hitsLanded = 0;
    this.moveConnected = false;
    this.moveBlocked = false;
    this.walkPhase = 0;
    this.stunDur = 0;
    this.lastHitLevel = 'mid';
    this.juggleHits = 0;
    this.wallSplatUsed = false;
    this.flash = 0;
    this.pendingThrowVictim = null;
    this.throwFired = false;
    this.crumpleNext = false;
    this.koFalling = false;
    this.inputLocked = false;
    this.landLagT = 0;
    this.throwClip = null;
    this.throwT = 0;
    this.throwDur = 0;
    this.dashTapT = { left: 999, right: 999 };
    this.prevDirHeld = { left: false, right: false };
    this.dashCooldown = 0;
    this.dashForward = true;
  }

  get grounded() { return this.pos.y <= 0.001 && this.vy <= 0; }
  get airborne() { return !this.grounded; }

  get crouching() {
    if (this.state === 'crouch') return true;
    if (this.state === 'attack' && this.move?.crouching) return true;
    if (this.state === 'blockstun' && this.blockCrouch) return true;
    return false;
  }

  // is this fighter actively holding guard (away from opponent)?
  holdingBack() {
    const awayAction = this.facing > 0 ? 'left' : 'right';
    return this.ctrl.held(awayAction);
  }
  holdingFwd() {
    const fwdAction = this.facing > 0 ? 'right' : 'left';
    return this.ctrl.held(fwdAction);
  }

  canAct() {
    return (this.state === 'idle' || this.state === 'walk' || this.state === 'crouch') && !this.inputLocked;
  }

  isThreatening() { // in attack startup or active — used by AI + counterhit detection
    if (this.state !== 'attack' || !this.move) return false;
    return this.moveT < this.move.startup + this.move.active;
  }

  isInvulnerable() {
    if (this.state === 'knockdown' || this.state === 'getup' || this.state === 'roll' ||
        this.state === 'thrown' || this.state === 'ko' || this.state === 'win' || this.state === 'intro') return true;
    if (this.state === 'dash' && this.dashInvuln) return true;
    if (this.state === 'attack' && this.move?.invuln) {
      const [a, b] = this.move.invuln;
      if (this.moveT >= a && this.moveT <= b) return true;
    }
    return false;
  }

  hurtSpheres() {
    const x = this.pos.x, y = this.pos.y;
    if (this.state === 'launched' || this.state === 'thrown') {
      return [{ x, y: y + 0.9, r: 0.5 }, { x, y: y + 0.4, r: 0.4 }];
    }
    if (this.state === 'wallsplat' || this.state === 'crumple') {
      return [{ x, y: y + 1.4, r: 0.26 }, { x, y: y + 0.9, r: 0.34 }, { x, y: y + 0.4, r: 0.3 }];
    }
    if (this.crouching) {
      return [{ x, y: y + 1.0, r: 0.24 }, { x, y: y + 0.6, r: 0.32 }, { x, y: y + 0.3, r: 0.28 }];
    }
    return [{ x, y: y + 1.5, r: 0.24 }, { x, y: y + 1.0, r: 0.32 }, { x, y: y + 0.45, r: 0.3 }];
  }

  // ---------- move selection ----------
  pickSkill() {
    const m = this.char.moves;
    if (this.ctrl.held('down')) return m.skillD;
    if (this.holdingFwd()) return m.skillF;
    if (this.holdingBack()) return m.skillB;
    return m.skillN;
  }

  tryStartMoves() {
    const m = this.char.moves;
    const c = this.ctrl;
    if (this.airborne) {
      if (this.state === 'air') {
        if (c.pressed('punch')) { c.consume('punch'); this.startMove(m.jpunch); }
        else if (c.pressed('kick')) { c.consume('kick'); this.startMove(m.jkick); }
      }
      return;
    }
    if (!this.canAct()) return;
    if (this.trySuper()) return;
    if (c.pressed('grab')) { c.consume('grab'); this.startMove(m.grab); return; }
    if (c.pressed('skill')) { c.consume('skill'); this.startMove(this.pickSkill()); return; }
    if (c.pressed('punch')) { c.consume('punch'); this.startMove(this.pickPunch()); return; }
    if (c.pressed('kick')) { c.consume('kick'); this.startMove(this.pickKick()); return; }
  }

  // directional normals (SF-style): down = crouch, forward/back = command normal, else neutral.
  pickPunch() {
    const m = this.char.moves;
    if (this.ctrl.held('down')) return m.cpunch;
    if (this.holdingFwd() && m.punchF) return m.punchF;
    if (this.holdingBack() && m.punchB) return m.punchB;
    return m.punch;
  }
  pickKick() {
    const m = this.char.moves;
    if (this.ctrl.held('down')) return m.ckick;
    if (this.holdingFwd() && m.kickF) return m.kickF;
    if (this.holdingBack() && m.kickB) return m.kickB;
    return m.kick;
  }

  // super art: full gauge + (punch+kick simultaneously, or the super macro button)
  trySuper() {
    const c = this.ctrl;
    const m = this.char.moves;
    if (this.meter < 100 || !m.superN) return false;
    const combo = c.pressed('punch') && c.pressed('kick');
    if (!combo && !c.pressed('super')) return false;
    c.consume('punch'); c.consume('kick'); c.consume('super');
    this.meter = 0;
    this.startMove(m.superN);
    this.gameRef?.onSuper(this, m.superN);
    return true;
  }

  startMove(move) {
    const wasAir = this.airborne;
    this.state = 'attack';
    this.stateT = 0;
    this.move = move;
    this.moveT = 0;
    this.hitsLanded = 0;
    this.nextHitTime = move.startup;
    this.moveConnected = false;
    this.moveBlocked = false;
    this.throwFired = false;
    this.attackInAir = wasAir;
    this.whooshed = false;
    this.selfVyDone = false;
    if (!wasAir) this.vx = 0;
    this.onMoveStart?.(this, move);
  }

  moveDuration(move) { return move.startup + move.active + move.recovery; }

  // forward/backward dash: two quick taps of the same direction key
  startDash(isForward, game) {
    this.state = 'dash';
    this.stateT = 0;
    this.dashForward = isForward;
    this.dashCooldown = DASH_COOLDOWN;
    this.dashInvuln = false;
    game.fx.dust(this.pos.x, 0.05, 6);
    Sound.whoosh();
  }

  checkDashInput(dt, game) {
    const c = this.ctrl;
    this.dashTapT.left += dt;
    this.dashTapT.right += dt;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    const heldL = c.held('left'), heldR = c.held('right');
    const edgeL = heldL && !this.prevDirHeld.left;
    const edgeR = heldR && !this.prevDirHeld.right;
    this.prevDirHeld.left = heldL;
    this.prevDirHeld.right = heldR;
    if (!edgeL && !edgeR) return;

    const dir = edgeL ? 'left' : 'right';
    const canDash = this.canAct() && this.grounded && this.dashCooldown <= 0 && !this.inputLocked;
    if (canDash && this.dashTapT[dir] < DASH_TAP_WINDOW) {
      const worldDir = dir === 'left' ? -1 : 1;
      this.startDash(worldDir === this.facing, game);
    }
    this.dashTapT[dir] = 0;
  }

  // ---------- per-frame update ----------
  update(dt, game) {
    this.stateT += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    const c = this.ctrl;

    this.checkDashInput(dt, game);

    switch (this.state) {
      case 'intro':
      case 'win':
      case 'ko':
        break;

      case 'idle':
      case 'walk': {
        this.vx = 0;
        if (!this.inputLocked) {
          if (c.held('down')) { this.state = 'crouch'; this.stateT = 0; break; }
          let dir = 0;
          if (c.held('right')) dir += 1;
          if (c.held('left')) dir -= 1;
          if (dir !== 0) {
            const towards = (dir === this.facing);
            this.vx = dir * (towards ? this.char.walkF : this.char.walkB);
            this.state = 'walk';
          } else this.state = 'idle';
          if (c.pressed('up')) {
            c.consume('up');
            this.state = 'prejump'; this.stateT = 0;
            this.jumpDir = dir;
            break;
          }
          this.tryStartMoves();
        }
        break;
      }

      case 'crouch': {
        this.vx = 0;
        if (!c.held('down')) { this.state = 'idle'; this.stateT = 0; break; }
        if (!this.inputLocked) this.tryStartMoves();
        break;
      }

      case 'dash': {
        const dur = this.dashForward ? 0.26 : 0.24;
        this.dashInvuln = !this.dashForward && this.stateT < 0.12;
        const speed = this.dashForward ? this.char.walkF * 2.5 : this.char.walkB * 2.3;
        const u = Math.min(1, this.stateT / dur);
        const speedMul = u < 0.55 ? 1 : Math.max(0, 1 - (u - 0.55) / 0.45);
        this.vx = this.facing * (this.dashForward ? 1 : -1) * speed * speedMul;
        // late-dash cancel: let an attack button interrupt the tail of the dash
        if (!this.inputLocked && u > 0.65 &&
            (c.pressed('punch') || c.pressed('kick') || c.pressed('skill') || c.pressed('grab'))) {
          this.state = 'idle'; this.stateT = 0;
          this.tryStartMoves();
          break;
        }
        if (this.stateT >= dur) {
          this.state = c.held('down') ? 'crouch' : 'idle';
          this.stateT = 0;
        }
        break;
      }

      case 'prejump': {
        if (this.stateT >= 0.07) {
          this.state = 'air'; this.stateT = 0;
          this.vy = this.char.jumpVy;
          this.vx = this.jumpDir * this.char.walkF * 1.05;
          game.fx.dust(this.pos.x, 0.05);
        }
        break;
      }

      case 'air': {
        if (!this.inputLocked) this.tryStartMoves();
        break;
      }

      case 'attack': {
        this.moveT += dt;
        const mv = this.move;
        const T = this.moveDuration(mv);

        // whoosh at active start
        if (!this.whooshed && this.moveT >= mv.startup) {
          this.whooshed = true;
          game.onWhoosh(this, mv);
        }
        // self vertical launch (rising skills)
        if ((mv.selfVy || mv.selfHop) && !this.selfVyDone && this.moveT >= mv.startup * 0.5) {
          this.selfVyDone = true;
          this.vy = mv.selfVy || mv.selfHop;
        }
        // forward drive
        if (mv.fwdSpeed) {
          const [w0, w1] = mv.fwdWindow || [0, mv.startup + mv.active];
          if (this.moveT >= w0 && this.moveT <= w1) this.vx = this.facing * mv.fwdSpeed;
          else this.vx = 0;
        } else if (!this.attackInAir && this.grounded) this.vx = 0;

        // hit attempts
        if (mv.isThrow) {
          if (!this.throwFired && this.moveT >= mv.startup && this.moveT <= mv.startup + mv.active) {
            this.throwFired = true;
            game.tryThrow(this, mv);
          }
        } else if (mv.proj) {
          if (!this.throwFired && this.moveT >= mv.startup) {
            this.throwFired = true;
            game.spawnProjectile(this, mv.proj);
          }
        } else {
          const total = mv.hits || 1;
          if (this.hitsLanded < total && this.moveT >= this.nextHitTime) {
            const sliceEnd = this.nextHitTime + (mv.hits ? (mv.hitInterval * 0.7) : mv.active);
            if (this.moveT <= sliceEnd) {
              const landed = game.tryHit(this, mv, this.hitsLanded === (total - 1));
              if (landed) {
                this.hitsLanded++;
                this.nextHitTime += mv.hitInterval || 999;
              }
            } else { // slice expired: advance to next hit window
              this.hitsLanded++;
              this.nextHitTime += mv.hitInterval || 999;
            }
          }
        }

        // skill-cancel on connect (jabs into skills / super)
        if (mv.cancelable && (this.moveConnected || this.moveBlocked) &&
            this.moveT >= mv.startup && this.moveT <= mv.startup + mv.active + 0.14) {
          if (this.trySuper()) break;
          if (c.pressed('skill')) {
            c.consume('skill');
            this.startMove(this.pickSkill());
            break;
          }
        }

        // air attack: ends on landing
        if (this.attackInAir) {
          if (this.grounded && this.moveT > 0.05) {
            this.state = 'idle'; this.stateT = 0; this.move = null;
            game.fx.dust(this.pos.x, 0.05);
          }
          break;
        }
        // rising skill: wait for landing, then landing lag
        if (mv.landingLag) {
          if (this.selfVyDone && this.grounded && this.moveT > mv.startup + 0.1) {
            this.state = 'landlag'; this.stateT = 0; this.move = null;
            this.landLagT = 0.38;
            game.fx.dust(this.pos.x, 0.05);
          }
          break;
        }
        if (this.moveT >= T) {
          this.state = c.held('down') ? 'crouch' : 'idle';
          this.stateT = 0; this.move = null;
        }
        break;
      }

      case 'landlag': {
        this.vx = 0;
        if (this.stateT >= this.landLagT) { this.state = 'idle'; this.stateT = 0; }
        break;
      }

      case 'hitstun': {
        this.vx *= Math.pow(0.0008, dt); // strong friction on pushback
        if (this.stateT >= this.stunDur) { this.state = 'idle'; this.stateT = 0; this.juggleHits = 0; this.wallSplatUsed = false; }
        break;
      }

      case 'blockstun': {
        this.vx *= Math.pow(0.0008, dt);
        if (this.stateT >= this.stunDur) {
          this.state = this.blockCrouch ? 'crouch' : 'idle';
          this.stateT = 0;
        }
        break;
      }

      case 'crumple': {
        this.vx = 0;
        if (this.stateT >= 1.15) {
          this.state = 'knockdown'; this.stateT = 0;
          game.fx.dust(this.pos.x, 0.05);
        }
        break;
      }

      case 'launched': {
        this.vx *= Math.pow(0.35, dt);
        if (this.grounded && this.stateT > 0.05) {
          if (Math.abs(this.vy) < 0.01 && this.pos.y === 0) {
            // landed
            game.onBodyDrop(this);
            this.state = this.health <= 0 ? 'ko' : 'knockdown';
            this.stateT = 0;
            this.vx = 0;
          }
        }
        break;
      }

      case 'knockdown': {
        this.vx = 0;
        // okizeme mixup options: hold ↓ to stay down, back to roll away,
        // punch = rising mid attack, kick = rising low attack
        const stayDown = c.held('down') && this.stateT < 1.9;
        if (this.stateT >= 0.9 && !stayDown) {
          this.juggleHits = 0;
          this.wallSplatUsed = false;
          const backKey = this.facing > 0 ? 'left' : 'right';
          const m = this.char.moves;
          if (c.held(backKey)) {
            this.state = 'roll'; this.stateT = 0;
            this.vx = -this.facing * 4.2;
          } else if ((c.held('punch') || c.pressed('punch')) && m.wakeupMid) {
            c.consume('punch');
            this.startMove(m.wakeupMid);
          } else if ((c.held('kick') || c.pressed('kick')) && m.wakeupLow) {
            c.consume('kick');
            this.startMove(m.wakeupLow);
          } else {
            this.state = 'getup'; this.stateT = 0;
          }
        } else if (this.stateT >= 1.9) {
          this.state = 'getup'; this.stateT = 0;
          this.juggleHits = 0; this.wallSplatUsed = false;
        }
        break;
      }

      case 'roll': {
        this.vx *= Math.pow(0.05, dt);
        if (this.stateT >= 0.38) { this.state = 'getup'; this.stateT = 0; this.vx = 0; }
        break;
      }

      case 'getup': {
        if (this.stateT >= 0.35) { this.state = 'idle'; this.stateT = 0; }
        break;
      }

      case 'wallsplat': {
        this.vx = 0;
        if (this.stateT >= 0.75) {
          this.state = 'launched'; this.stateT = 0.06;
          this.vy = 2.0; this.vx = -this.facing * 0.8;
          this.pos.y = Math.max(this.pos.y, 0.02);
        }
        break;
      }

      case 'thrown': {
        // held by opponent; game moves us
        break;
      }
    }

    // physics
    const inAirPhysics = this.pos.y > 0 || this.vy > 0;
    if (inAirPhysics) {
      this.vy -= GRAV * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= 0) {
        this.pos.y = 0;
        const impact = -this.vy;
        this.vy = 0;
        if (this.state === 'air') {
          this.state = 'idle'; this.stateT = 0;
          game.fx.dust(this.pos.x, 0.05);
        } else if (this.state === 'launched') {
          if (impact > 7 && !this.bounced) {
            this.bounced = true;
            this.vy = impact * 0.28;
            this.pos.y = 0.01;
            game.onGroundBounce(this, impact);
          } else {
            game.onBodyDrop(this);
            this.state = this.health <= 0 ? 'ko' : 'knockdown';
            this.stateT = 0; this.vx = 0; this.bounced = false;
          }
        }
      }
    }
    this.pos.x += this.vx * dt;

    this.updatePose(dt);
  }

  // ---------- reactions (called by game) ----------
  applyBlock(atk, crouch, pushback) {
    this.state = 'blockstun';
    this.stateT = 0;
    this.stunDur = atk.blockstun || 0.2;
    this.blockCrouch = crouch;
    this.vx = pushback;
    this.move = null;
  }

  applyHit(atk, dir, opts = {}) {
    const dmg = opts.damage ?? atk.damage;
    const floor = this.gameRef?.practiceMode ? 1 : 0;
    this.health = Math.max(floor, this.health - dmg);
    this.lastHitLevel = atk.level;
    this.flash = 1;
    const dead = this.health <= 0;

    const kb = (opts.kb ?? atk.kb ?? 2) * dir;
    const kbUp = opts.kbUp ?? atk.kbUp ?? 0;
    const knockdown = opts.knockdown ?? atk.knockdown;
    const crumple = opts.crumple ?? atk.crumple;

    this.move = null;
    this.bounced = false;

    if (this.airborne || this.state === 'launched' || kbUp > 0 || dead || knockdown) {
      // launch / knockdown arc
      this.state = 'launched';
      this.stateT = 0;
      this.juggleHits++;
      let vy = kbUp > 0 ? kbUp : 3.2;
      if (this.juggleHits > 1) vy = Math.max(3.5, vy * Math.pow(0.85, this.juggleHits - 1));
      if (dead) vy = Math.max(vy, 4.5);
      this.vy = vy;
      this.vx = kb;
      this.pos.y = Math.max(this.pos.y, 0.02);
    } else if (crumple) {
      this.state = 'crumple';
      this.stateT = 0;
      this.vx = kb * 0.3;
    } else {
      this.state = 'hitstun';
      this.stateT = 0;
      this.stunDur = (atk.hitstun || 0.3) * (opts.counter ? 1.4 : 1);
      this.vx = kb;
    }
  }

  // ---------- posing ----------
  updatePose(dt) {
    let pose;
    const t = this.stateT;
    switch (this.state) {
      case 'idle':
      case 'intro': {
        const b = Math.sin(performance.now() * 0.0022) * 0.02;
        pose = { ...ST, y: ST.y + b, sL: ST.sL + b * 1.5, sR: ST.sR - b * 1.2 };
        break;
      }
      case 'walk': {
        this.walkPhase += dt * Math.abs(this.vx) * 3.4;
        const s = Math.sin(this.walkPhase);
        pose = {
          ...ST,
          hL: 0.25 + s * 0.45, kL: -0.5 - Math.max(0, -s) * 0.5,
          hR: -0.15 - s * 0.45, kR: -0.35 - Math.max(0, s) * 0.5,
          sL: ST.sL - s * 0.12, sR: ST.sR + s * 0.12,
          y: ST.y + Math.abs(Math.cos(this.walkPhase)) * 0.02,
        };
        break;
      }
      case 'crouch': pose = CR; break;
      case 'dash': {
        const dur = this.dashForward ? 0.26 : 0.24;
        const u = Math.min(1, t / dur);
        const lean = this.dashForward ? 0.4 : -0.32;
        const fold = 1 - Math.max(0, u - 0.55) / 0.45 * 0.6;
        pose = {
          ...ST, y: ST.y - 0.06, tl: ST.tl + lean * fold,
          hL: 0.65 * fold, kL: -0.25 - 0.3 * fold, hR: 0.55 * fold, kR: -0.25 - 0.3 * fold,
          sL: ST.sL - (this.dashForward ? 0.25 : -0.2) * fold, sR: ST.sR + (this.dashForward ? 0.25 : -0.2) * fold,
        };
        break;
      }
      case 'prejump': pose = { ...ST, y: -0.22, tl: 0.25, kL: -0.9, kR: -0.8, hL: 0.5, hR: 0.3 }; break;
      case 'air': {
        const k = Math.max(-0.3, Math.min(0.3, -this.vy * 0.04));
        pose = { ...AIR, tl: AIR.tl + k };
        break;
      }
      case 'attack':
      case 'throwing': {
        const mv = this.move;
        if (mv) pose = sampleClip(mv.anim, Math.min(1, this.moveT / this.moveDuration(mv)));
        else pose = ST;
        break;
      }
      case 'landlag': pose = lerpPose({ ...ST, y: -0.25, tl: 0.35 }, ST, Math.min(1, t / this.landLagT)); break;
      case 'hitstun': {
        const base = this.lastHitLevel === 'high' ? HIT_H : HIT_M;
        const back = Math.min(1, t / Math.max(0.01, this.stunDur));
        pose = lerpPose(base, ST, back * back);
        break;
      }
      case 'blockstun': {
        const base = this.blockCrouch ? BLK_C : BLK_S;
        pose = { ...base, tl: (base.tl || 0) + Math.max(0, 0.15 - t) };
        break;
      }
      case 'launched': {
        const tumble = Math.min(1.9, 0.5 + t * 1.6);
        pose = { ...LAUNCHED, rz: tumble, y: 0 };
        break;
      }
      case 'crumple': {
        const u = Math.min(1, t / 1.0);
        pose = lerpPose(HIT_M, CRUMPLE_A, u);
        break;
      }
      case 'knockdown': case 'ko': pose = KD; break;
      case 'roll': {
        const u = Math.min(1, t / 0.38);
        pose = { ...KD, ry: u * 5.2, y: KD.y + Math.sin(u * Math.PI) * 0.1 };
        break;
      }
      case 'getup': pose = lerpPose(KD, ST, Math.min(1, t / 0.35)); break;
      case 'wallsplat': pose = WALLSPLAT; break;
      case 'thrown': {
        if (this.throwClip) {
          const u = this.throwDur > 0 ? Math.min(1, this.throwT / this.throwDur) : 1;
          pose = sampleClip(this.throwClip, u);
        } else {
          pose = HIT_M;
        }
        break;
      }
      case 'win': {
        const b = Math.sin(t * 3) * 0.03;
        pose = { ...WIN, y: b };
        break;
      }
      default: pose = ST;
    }
    this.rig.applyPose(pose);
    this.rig.root.position.set(this.pos.x, this.pos.y, 0);
    this.rig.root.rotation.y = this.facing > 0 ? 0 : Math.PI;
    let glow = this.flash * 0.9;
    if (this.state === 'attack' && this.move?.isSuper) {
      glow = Math.max(glow, 0.25 + Math.sin(performance.now() * 0.03) * 0.12);
    } else if (this.meter >= 100) {
      glow = Math.max(glow, 0.06 + Math.sin(performance.now() * 0.008) * 0.05);
    }
    this.rig.setFlash(glow);
  }
}
