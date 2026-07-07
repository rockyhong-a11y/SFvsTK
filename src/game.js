// Match orchestration: hit resolution, guard rules, throws, juggles, wall splats,
// projectiles, rounds/timer, and all the hit-feel triggers.
import * as THREE from 'three';
import { Fighter } from './fighter.js';
import { WALL_X } from './stage.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import { AI } from './ai.js';

const ROUND_TIME = 60;
const ROUNDS_TO_WIN = 2;

export class Game {
  constructor(scene, fx, charA, charB, ctrlA, ctrlB, opts = {}) {
    this.scene = scene;
    this.fx = fx;
    this.fighters = [
      new Fighter(charA, ctrlA, scene),
      new Fighter(charB, ctrlB, scene),
    ];
    this.fighters[0].opponent = this.fighters[1];
    this.fighters[1].opponent = this.fighters[0];
    for (const f of this.fighters) {
      f.gameRef = this;
      f.onMoveStart = (fighter, move) => {
        if (move.isSkill) UI.moveName(this.fighters.indexOf(fighter), move.name);
      };
    }

    this.projectiles = [];
    this.combo = [{ hits: 0, dmg: 0 }, { hits: 0, dmg: 0 }];
    this.roundWins = [0, 0];
    this.phase = 'roundIntro'; // roundIntro | fight | koSlow | roundEnd | matchEnd | practice
    this.phaseT = 0;
    this.round = 1;
    this.timer = ROUND_TIME;
    this.onMatchEnd = null;

    this.practiceMode = !!opts.practice;
    this.dummyMode = 'stand'; // stand | guard | crouchguard | cpu
    this.dummyAI = null;
    this.forceGaugeMax = false;

    if (this.practiceMode) this.startPractice(); else this.startRound();
  }

  startRound() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    const [a, b] = this.fighters;
    a.reset(-2.2, 1);
    b.reset(2.2, -1);
    a.state = 'intro'; b.state = 'intro';
    a.inputLocked = b.inputLocked = true;
    this.timer = ROUND_TIME;
    this.phase = 'roundIntro';
    this.phaseT = 0;
    this.combo = [{ hits: 0, dmg: 0 }, { hits: 0, dmg: 0 }];
    UI.resetBars();
    UI.setRounds(this.roundWins[0], this.roundWins[1]);
    UI.announce(`ROUND ${this.round}`, 1.1);
    Sound.announce();
  }

  // ------------------------------------------------------------------
  // Practice mode: free play, no KO/round flow, togglable dummy behavior + gauge.
  startPractice() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    const [a, b] = this.fighters;
    a.reset(-1.6, 1);
    b.reset(1.6, -1);
    a.inputLocked = b.inputLocked = false;
    this.phase = 'practice';
    this.phaseT = 0;
    this.combo = [{ hits: 0, dmg: 0 }, { hits: 0, dmg: 0 }];
    UI.resetBars();
  }

  resetPracticePositions() {
    const [a, b] = this.fighters;
    const keepA = a.meter, keepB = b.meter;
    a.reset(-1.6, 1);
    b.reset(1.6, -1);
    a.meter = this.forceGaugeMax ? 100 : keepA;
    b.meter = this.forceGaugeMax ? 100 : keepB;
    this.combo = [{ hits: 0, dmg: 0 }, { hits: 0, dmg: 0 }];
  }

  cycleDummyMode() {
    const order = ['stand', 'guard', 'crouchguard', 'cpu'];
    this.dummyMode = order[(order.indexOf(this.dummyMode) + 1) % order.length];
    if (this.dummyMode === 'cpu' && !this.dummyAI) {
      this.dummyAI = new AI(this.fighters[1], this.fighters[0]);
    }
    return this.dummyMode;
  }

  applyDummyBehavior(dt) {
    const dummy = this.fighters[1];
    const c = dummy.ctrl;
    if (!c.clearHolds) return; // not a virtual controller — skip (human P2)
    if (this.dummyMode === 'cpu') {
      this.dummyAI?.update(dt);
      return;
    }
    c.clearHolds();
    if (this.dummyMode === 'guard') {
      c.hold(dummy.facing > 0 ? 'left' : 'right');
    } else if (this.dummyMode === 'crouchguard') {
      c.hold(dummy.facing > 0 ? 'left' : 'right');
      c.hold('down');
    }
  }

  updatePracticeStep(dt) {
    const [a, b] = this.fighters;
    for (const f of this.fighters) {
      if (f.canAct() && f.grounded) f.facing = f.opponent.pos.x >= f.pos.x ? 1 : -1;
    }
    if (this.forceGaugeMax) { a.meter = 100; b.meter = 100; }
    this.applyDummyBehavior(dt);

    a.update(dt, this);
    b.update(dt, this);

    this.updateThrows(dt);
    this.resolveBodyPush(a, b);
    this.applyWalls(a);
    this.applyWalls(b);
    this.updateProjectiles(dt);

    for (let i = 0; i < 2; i++) {
      const victim = this.fighters[1 - i];
      if (this.combo[i].hits > 0 && !this.isComboState(victim)) this.combo[i] = { hits: 0, dmg: 0 };
    }
  }

  // ------------------------------------------------------------------
  update(dt) {
    if (this.practiceMode) { this.updatePracticeStep(dt); return; }
    this.phaseT += dt;

    switch (this.phase) {
      case 'roundIntro':
        if (this.phaseT >= 1.3) {
          this.phase = 'fight';
          this.phaseT = 0;
          for (const f of this.fighters) { f.state = 'idle'; f.inputLocked = false; }
          UI.announce('FIGHT!', 0.7);
          Sound.bell();
        }
        break;

      case 'fight':
        this.timer -= dt;
        UI.setTimer(this.timer);
        if (this.timer <= 0) this.timeOver();
        break;

      case 'koSlow':
        if (this.phaseT >= 1.6) this.endRound();
        break;

      case 'roundEnd':
        if (this.phaseT >= 2.2) {
          this.round++;
          this.startRound();
        }
        break;

      case 'matchEnd':
        break;
    }

    const [a, b] = this.fighters;

    // facing (only when free)
    for (const f of this.fighters) {
      if (f.canAct() && f.grounded) {
        f.facing = f.opponent.pos.x >= f.pos.x ? 1 : -1;
      }
    }

    a.update(dt, this);
    b.update(dt, this);

    this.updateThrows(dt);
    this.resolveBodyPush(a, b);
    this.applyWalls(a);
    this.applyWalls(b);
    this.updateProjectiles(dt);

    // combo bookkeeping: reset when victim recovers
    for (let i = 0; i < 2; i++) {
      const victim = this.fighters[1 - i];
      if (this.combo[i].hits > 0 && !this.isComboState(victim)) {
        this.combo[i] = { hits: 0, dmg: 0 };
      }
    }
  }

  isComboState(f) {
    return ['hitstun', 'launched', 'crumple', 'wallsplat', 'thrown', 'ko'].includes(f.state) ||
      (f.state === 'knockdown' && f.stateT < 0.3);
  }

  // ------------------------------------------------------------------
  resolveBodyPush(a, b) {
    const passthrough = (f) => ['knockdown', 'getup', 'ko', 'launched', 'thrown'].includes(f.state);
    if (passthrough(a) || passthrough(b)) return;
    const minDist = 0.62;
    const dx = b.pos.x - a.pos.x;
    const overlap = minDist - Math.abs(dx);
    if (overlap > 0) {
      const dir = dx >= 0 ? 1 : -1;
      a.pos.x -= dir * overlap * 0.5;
      b.pos.x += dir * overlap * 0.5;
    }
  }

  applyWalls(f) {
    const limit = WALL_X - 0.28;
    if (f.pos.x > limit || f.pos.x < -limit) {
      const wallDir = f.pos.x > 0 ? 1 : -1;
      f.pos.x = wallDir * limit;

      // wall splat: flying into the wall hard
      if (f.state === 'launched' && Math.abs(f.vx) > 3.2 && !f.wallSplatUsed && f.health > 0) {
        f.wallSplatUsed = true;
        f.state = 'wallsplat';
        f.stateT = 0;
        f.vx = 0; f.vy = 0;
        f.pos.y = Math.max(f.pos.y * 0.4, 0);
        f.facing = -wallDir; // back against the wall
        this.fx.shake(0.34);
        this.fx.hitstop(0.1);
        this.fx.dust(f.pos.x, f.pos.y + 1.0, 14);
        this.fx.ring(f.pos.x, f.pos.y + 1.1, 0xffd27f);
        Sound.slam();
        UI.subAnnounce('WALL SPLAT!');
      } else if (f.state === 'launched') {
        f.vx *= -0.25; // soft bounce off wall
      } else if (f.state === 'hitstun' || f.state === 'blockstun') {
        f.vx = 0;
      }
    }
  }

  // ------------------------------------------------------------------
  onWhoosh(f, mv) {
    if (mv.sound === 'fireball') Sound.fireball();
    else Sound.whoosh();
    if (mv.afterimage) this.startAfterimages(f, mv);
  }

  startAfterimages(f, mv) {
    // spawn a few ghost frames over the active window
    const color = f.char.rig.accent;
    let n = 0;
    const spawn = () => {
      if (f.move !== mv || n > 6) return;
      this.fx.afterimage(f.rig, color);
      n++;
      setTimeout(spawn, 55);
    };
    spawn();
  }

  // strike hit test; lastHit indicates final hit of a multi-hit move
  tryHit(attacker, mv, isLastHit) {
    const victim = attacker.opponent;
    if (victim.isInvulnerable()) return false;

    // level whiff rules
    if (mv.level === 'high' && victim.crouching) return false;

    // sphere test: limb tips vs victim hurt spheres
    const spheres = victim.hurtSpheres();
    let contact = null;
    for (const limb of mv.limbs) {
      const p = attacker.rig.tipPos(limb);
      for (const s of spheres) {
        const dx = p.x - s.x, dy = p.y - s.y;
        if (dx * dx + dy * dy <= (mv.radius + s.r) * (mv.radius + s.r)) {
          contact = { x: (p.x + s.x) / 2, y: (p.y + s.y) / 2 };
          break;
        }
      }
      if (contact) break;
    }
    if (!contact) return false;

    this.resolveContact(attacker, victim, mv, contact, isLastHit);
    return true;
  }

  resolveContact(attacker, victim, atk, contact, isLastHit = true, owner = attacker) {
    const dir = attacker ? attacker.facing : (victim.pos.x >= contact.x ? 1 : -1);
    const ai = this.fighters.indexOf(owner ?? victim.opponent);

    // reversal check: victim is mid-parry and the strike is parryable
    // (lows and projectiles beat the parry; attacker==null means projectile)
    if (attacker && victim.state === 'attack' && victim.move?.parry && atk.level !== 'low') {
      const pm = victim.move;
      if (victim.moveT >= pm.startup && victim.moveT <= pm.startup + pm.active) {
        this.triggerReversal(victim, attacker, pm, contact);
        return;
      }
    }

    // guard check
    const canGuard = (victim.canAct() || victim.state === 'blockstun') && victim.grounded;
    if (canGuard && victim.holdingBack()) {
      const crouchGuard = victim.crouching || victim.ctrl.held('down');
      const blocked =
        atk.level === 'sm' ? true :
        atk.level === 'low' ? crouchGuard :
        atk.level === 'mid' ? !crouchGuard :
        atk.level === 'high' ? !crouchGuard : true;
      if (blocked) {
        // chip damage on skills
        if (atk.chip) {
          const chip = Math.max(1, atk.damage * atk.chip);
          victim.health = Math.max(1, victim.health - chip);
        }
        const push = dir * Math.max(1.6, (atk.kb || 2) * 0.55);
        victim.applyBlock(atk, crouchGuard, push);
        if (attacker && Math.abs(victim.pos.x) > WALL_X - 0.8) {
          attacker.vx = -dir * 2.5; // attacker pushback at the wall
        }
        this.fx.blockSpark(contact.x, contact.y);
        this.fx.hitstop(0.045);
        this.fx.shake(0.05);
        Sound.block();
        if (attacker) attacker.moveBlocked = true;
        // guard builds a little meter on both sides
        victim.addMeter(2);
        owner?.addMeter?.(1.5);
        return;
      }
    }

    // counter hit?
    const counter = victim.isThreatening();

    // juggle damage scaling
    let dmg = atk.damage;
    if (victim.state === 'launched') dmg *= Math.pow(0.82, Math.max(0, victim.juggleHits));
    if (counter) dmg *= 1.2;

    // final hit of multihit carries the big knockback
    const opts = { damage: dmg, counter };
    if (atk.lastHit && isLastHit) {
      opts.kb = atk.lastHit.kb;
      opts.kbUp = atk.lastHit.kbUp;
      opts.knockdown = atk.lastHit.knockdown;
    }
    // hits during crumple/wallsplat float the victim for juggles
    if (victim.state === 'wallsplat' || victim.state === 'crumple') {
      opts.kbUp = Math.max(atk.kbUp || 0, 4.2);
    }

    victim.applyHit(atk, dir, opts);
    if (attacker) attacker.moveConnected = true;

    // super gauge: dealing and taking damage both build meter
    owner?.addMeter?.(dmg * 0.055);
    victim.addMeter(dmg * 0.045);

    // combo tracking
    this.combo[ai].hits++;
    this.combo[ai].dmg += dmg;
    UI.combo(ai, this.combo[ai].hits, this.combo[ai].dmg);

    // hit feel
    const heavy = Math.min(1, dmg / 110);
    this.fx.spark(contact.x, contact.y, counter ? 0xff5964 : 0xffb347, 10 + heavy * 14, 3.5 + heavy * 3);
    this.fx.hitstop(0.05 + heavy * 0.1 + (counter ? 0.04 : 0));
    this.fx.shake(0.07 + heavy * 0.3);
    if (heavy > 0.5 || atk.kbUp) this.fx.ring(contact.x, contact.y);
    Sound.thud(0.35 + heavy * 0.65);
    if (counter) {
      UI.subAnnounce('COUNTER!');
      Sound.beep();
    }
    this.spawnDamageNumber(contact, dmg, counter);

    if (victim.health <= 0 && this.phase === 'fight') this.ko(victim);
  }

  spawnDamageNumber(contact, dmg, counter) {
    const v = new THREE.Vector3(contact.x, contact.y + 0.25, 0);
    v.project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    UI.damageNumber(x, y, dmg, counter);
  }

  // ------------------------------------------------------------------
  // 아스카 반격기: intercepts the strike and auto-counters
  triggerReversal(parrier, attacker, pm, contact) {
    const dir = parrier.facing;
    const idx = this.fighters.indexOf(parrier);
    attacker.applyHit(
      { damage: pm.counterDamage, level: 'mid', kb: 5.5, kbUp: 5.5, hitstun: 0.5, knockdown: true },
      dir, {}
    );
    parrier.addMeter(18);
    const m = parrier.char.moves;
    if (m.parryCounter) parrier.startMove(m.parryCounter);
    this.combo[idx] = { hits: 1, dmg: pm.counterDamage };

    this.fx.spark(contact.x, contact.y, 0x7fd0ff, 22, 5.5);
    this.fx.ring(contact.x, contact.y, 0x9fd8ff);
    this.fx.hitstop(0.14);
    this.fx.shake(0.32);
    Sound.slam();
    Sound.beep();
    UI.subAnnounce('REVERSAL!');
    UI.moveName(idx, pm.name);
    this.spawnDamageNumber(contact, pm.counterDamage, true);
    if (attacker.health <= 0 && this.phase === 'fight') this.ko(attacker);
  }

  // super art activation: freeze + flash + announcement
  onSuper(f, mv) {
    const idx = this.fighters.indexOf(f);
    UI.moveName(idx, mv.name);
    UI.announce(mv.name, 0.9);
    UI.superFlash();
    Sound.ko(); // big impact swell
    Sound.laser();
    this.fx.hitstop(0.42); // super freeze
    this.fx.shake(0.2);
    this.fx.ring(f.pos.x, f.pos.y + 1.1, 0xfff2b0);
    // ghost burst
    for (let i = 0; i < 3; i++) this.fx.afterimage(f.rig, 0xffe08a);
  }

  // ------------------------------------------------------------------
  // Throws run in two clearly separated stages so nothing ever looks skipped:
  //  1. catch+execute (throwCatch+throwLift): both fighters locked into a shared,
  //     fully-keyframed clip (see moves.js hipTossThrow/suplexThrow/piledriverThrow).
  //  2. impact: victim hands off to the normal hit/knockdown reaction.
  // The attacker's own move is swapped for a scripted "follow-through" so its pose
  // timeline (attackerAnim) is driven independently of the whiffable reach-in clip.
  tryThrow(attacker, mv) {
    const victim = attacker.opponent;
    if (victim.isInvulnerable() || victim.airborne) return;
    if (!(victim.canAct() || victim.state === 'blockstun')) return;
    const dist = Math.abs(victim.pos.x - attacker.pos.x);
    if (dist > mv.range) return;

    const dir = attacker.facing;
    const ai = this.fighters.indexOf(attacker);
    const catchT = mv.throwCatch ?? 0.14;
    const liftT = mv.throwLift ?? 0.3;
    const holdDur = catchT + liftT;

    victim.state = 'thrown';
    victim.stateT = 0;
    victim.move = null;
    victim.pos.y = 0;
    victim.facing = -dir;
    victim.throwClip = mv.victimAnim || null;
    victim.throwT = 0;
    victim.throwDur = holdDur;

    // attacker: swap into a scripted, non-hitting follow-through so its own pose
    // timeline is decoupled from the (already-finished) whiffable reach clip.
    attacker.startMove({
      name: mv.name, anim: mv.attackerAnim || mv.anim, limbs: [], radius: 0,
      startup: 0, active: 0, recovery: holdDur + (mv.recovery ?? 0.4),
    });
    attacker.moveConnected = true;

    Sound.beep();
    this.fx.hitstop(0.05); // sell the catch
    this.fx.spark(victim.pos.x, victim.pos.y + 1.0, 0xffe27a, 8, 2);

    const release = () => {
      if (victim.state !== 'thrown') return;
      victim.throwClip = null;
      const contact = { x: victim.pos.x, y: victim.pos.y + 1.1 };
      victim.applyHit({ damage: mv.damage, level: 'mid', kb: mv.kb, kbUp: mv.kbUp, hitstun: 0.5, knockdown: mv.knockdown }, dir, {});
      attacker.addMeter(8);
      victim.addMeter(mv.damage * 0.045);
      this.combo[ai] = { hits: 1, dmg: mv.damage };
      this.fx.spark(contact.x, contact.y, 0xffcf6e, 18, 5.5);
      this.fx.ring(contact.x, contact.y, 0xffe08a);
      this.fx.hitstop(mv.isCommandThrow ? 0.16 : 0.09);
      this.fx.shake(mv.isCommandThrow ? 0.42 : 0.3);
      Sound.slam();
      this.spawnDamageNumber(contact, mv.damage, false);
      if (victim.health <= 0 && this.phase === 'fight') this.ko(victim);
    };

    this.activeThrow = { attacker, victim, t: 0, dur: holdDur, release, dir, fired: false };
  }

  updateThrows(dt) {
    const th = this.activeThrow;
    if (!th) return;
    th.t += dt;
    const { attacker, victim } = th;
    if (victim.state === 'thrown') {
      victim.throwT = Math.min(th.t, th.dur);
      victim.pos.x = attacker.pos.x + th.dir * 0.55;
      victim.pos.y = 0;
      victim.facing = -th.dir;
    }
    if (th.t >= th.dur && !th.fired) {
      th.fired = true;
      th.release();
      this.activeThrow = null;
    }
  }

  // ------------------------------------------------------------------
  spawnProjectile(owner, def) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.55 })
    );
    const light = new THREE.PointLight(def.color, 8, 5);
    group.add(core, shell, light);
    const dir = owner.facing;
    group.position.set(owner.pos.x + dir * 0.7, def.y, 0);
    this.scene.add(group);
    this.projectiles.push({
      mesh: group, shell, owner, def,
      x: group.position.x, y: def.y, vx: dir * def.speed, t: 0,
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.mesh.position.x = p.x;
      p.shell.scale.setScalar(1 + Math.sin(p.t * 24) * 0.15);

      let dead = false;
      // wall
      if (Math.abs(p.x) > WALL_X + 0.1) {
        this.fx.spark(p.x, p.y, p.def.color, 10, 3);
        dead = true;
      } else {
        // fighter hit
        const victim = p.owner.opponent;
        if (!victim.isInvulnerable()) {
          const spheres = victim.hurtSpheres();
          for (const s of spheres) {
            const dx = p.x - s.x, dy = p.y - s.y;
            if (dx * dx + dy * dy <= (p.def.radius + s.r) * (p.def.radius + s.r)) {
              this.resolveContact(null, victim, p.def, { x: p.x, y: p.y }, true, p.owner);
              dead = true;
              break;
            }
          }
        }
        // clash with other projectiles
        if (!dead) {
          for (const q of this.projectiles) {
            if (q !== p && q.owner !== p.owner && Math.abs(q.x - p.x) < 0.5 && Math.abs(q.y - p.y) < 0.5) {
              this.fx.spark((p.x + q.x) / 2, (p.y + q.y) / 2, 0xffffff, 20, 5);
              Sound.block();
              q.dead = true;
              dead = true;
              break;
            }
          }
        }
      }
      if (dead || p.dead) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------
  onGroundBounce(f, impact) {
    this.fx.dust(f.pos.x, 0.05, 10);
    this.fx.shake(Math.min(0.3, impact * 0.03));
    Sound.thud(0.4);
  }

  onBodyDrop(f) {
    this.fx.dust(f.pos.x, 0.05, 12);
    this.fx.shake(0.16);
    Sound.slam();
  }

  ko(victim) {
    this.phase = 'koSlow';
    this.phaseT = 0;
    UI.announce('K.O.', 1.8, true);
    Sound.ko();
    this.fx.slowmo(1.5, 0.22);
    this.fx.shake(0.5);
    const winner = victim.opponent;
    winner.inputLocked = true;
    victim.inputLocked = true;
  }

  timeOver() {
    this.phase = 'koSlow';
    this.phaseT = 0.6; // shorter pause
    UI.announce('TIME OVER', 1.4);
    Sound.announce();
    const [a, b] = this.fighters;
    const loser = a.health === b.health ? null : (a.health < b.health ? a : b);
    this.timeOverLoser = loser;
    for (const f of this.fighters) f.inputLocked = true;
  }

  endRound() {
    const [a, b] = this.fighters;
    let winnerIdx;
    if (this.timeOverLoser !== undefined) {
      winnerIdx = this.timeOverLoser === null ? -1 : (this.timeOverLoser === a ? 1 : 0);
      this.timeOverLoser = undefined;
    } else {
      winnerIdx = a.health <= 0 ? 1 : 0;
    }
    if (winnerIdx >= 0) {
      this.roundWins[winnerIdx]++;
      const w = this.fighters[winnerIdx];
      if (w.state !== 'ko') { w.state = 'win'; w.stateT = 0; }
      UI.subAnnounce(`${w.char.displayName} WINS ROUND`);
    } else {
      UI.subAnnounce('DRAW');
    }
    UI.setRounds(this.roundWins[0], this.roundWins[1]);

    if (this.roundWins[0] >= ROUNDS_TO_WIN || this.roundWins[1] >= ROUNDS_TO_WIN) {
      this.phase = 'matchEnd';
      this.phaseT = 0;
      const champ = this.roundWins[0] > this.roundWins[1] ? this.fighters[0] : this.fighters[1];
      setTimeout(() => this.onMatchEnd?.(champ), 1400);
    } else {
      this.phase = 'roundEnd';
      this.phaseT = 0;
    }
  }

  dispose() {
    for (const f of this.fighters) this.scene.remove(f.rig.root);
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
  }
}
