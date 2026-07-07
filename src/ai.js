// CPU opponent: drives a VirtualController with simple distance-band tactics,
// reaction blocking, anti-air and okizeme pressure.
import { VirtualController } from './input.js';

export class AI {
  constructor(fighter, opponent) {
    this.me = fighter;
    this.opp = opponent;
    this.ctrl = new VirtualController();
    fighter.ctrl = this.ctrl;
    this.thinkT = 0;
    this.plan = 'approach';
    this.planT = 0;
    this.blockReact = 0.62; // probability of reacting to attacks with guard
    this.aggression = 0.5;
  }

  update(dt) {
    const me = this.me, opp = this.opp, c = this.ctrl;
    this.thinkT -= dt;
    this.planT -= dt;

    if (me.state === 'ko' || me.state === 'win' || me.inputLocked) {
      c.clearHolds();
      return;
    }

    const dist = Math.abs(opp.pos.x - me.pos.x);
    const fwdKey = me.facing > 0 ? 'right' : 'left';
    const backKey = me.facing > 0 ? 'left' : 'right';

    // --- continuous reactions (every frame) ---
    // guard reaction: opponent attack incoming and close
    if (opp.isThreatening() && dist < 2.6 && me.canAct()) {
      if (Math.random() < this.blockReact * dt * 30) {
        c.clearHolds();
        c.hold(backKey);
        const lvl = opp.move?.level;
        if (lvl === 'low') c.hold('down');
        this.plan = 'guard';
        this.planT = 0.35 + Math.random() * 0.25;
        return;
      }
    }
    // incoming projectile: jump or block
    const proj = opp.gameRef?.projectiles?.find((p) => p.owner === opp && Math.abs(p.x - me.pos.x) < 2.4);
    if (proj && me.canAct() && this.plan !== 'jumpProj') {
      if (Math.random() < 0.5) {
        c.tap('up');
        this.plan = 'jumpProj'; this.planT = 0.4;
      } else {
        c.clearHolds(); c.hold(backKey);
        this.plan = 'guard'; this.planT = 0.4;
      }
      return;
    }
    // anti-air
    if (opp.airborne && opp.pos.y > 0.5 && dist < 2.2 && me.canAct() && Math.random() < dt * 6) {
      c.clearHolds(); c.hold(fwdKey);
      c.tap('skill');
      this.plan = 'antiair'; this.planT = 0.3;
      return;
    }

    if (this.plan === 'guard' && this.planT > 0) return; // keep holding guard

    // --- discrete decisions ---
    if (this.thinkT > 0) return;
    this.thinkT = 0.14 + Math.random() * 0.12;

    if (!me.canAct()) return;
    c.clearHolds();

    const oppDown = (opp.state === 'knockdown' || opp.state === 'getup');
    const desperate = me.health < me.maxHealth * 0.3;
    const aggro = this.aggression + (desperate ? 0.25 : 0);

    if (oppDown) {
      // okizeme: step in, time a meaty low/mid
      if (dist > 1.4) { c.hold(fwdKey); this.holdWalk(c, fwdKey, 0.2); }
      else if (Math.random() < 0.5) {
        c.hold('down'); c.tap('skill'); // meaty low
      } else if (Math.random() < 0.5) {
        c.tap('kick');
      } else {
        c.hold(backKey); // back off a touch
      }
      return;
    }

    if (dist > 4.2) {
      // far: approach, occasional projectile/jump-in
      const r = Math.random();
      if (r < 0.28 && me.char.moves.skillN.proj) { c.tap('skill'); }
      else if (r < 0.4) { c.hold(fwdKey); c.tap('up'); } // jump-in
      else c.hold(fwdKey);
      return;
    }

    if (dist > 2.2) {
      // mid range: walk in, poke with advancing skills
      const r = Math.random();
      if (r < 0.18 * (1 + aggro)) { c.hold(backKey); c.tap('skill'); } // advancing special (b+skill)
      else if (r < 0.3) { c.hold(fwdKey); c.tap('skill'); }
      else if (r < 0.42) { c.hold(fwdKey); c.tap('up'); }
      else if (r < 0.52) c.hold(backKey);
      else c.hold(fwdKey);
      return;
    }

    // close range mixup
    const r = Math.random();
    if (r < 0.2) c.tap('punch');
    else if (r < 0.36) c.tap('kick');
    else if (r < 0.48) { c.hold('down'); c.tap('skill'); } // low
    else if (r < 0.6) { c.hold(fwdKey); c.tap('skill'); } // launcher
    else if (r < 0.7) c.tap('grab');
    else if (r < 0.78) { c.hold('down'); c.tap(Math.random() < 0.5 ? 'punch' : 'kick'); }
    else if (r < 0.9) c.hold(backKey); // shimmy back
    else c.hold(fwdKey);
  }

  holdWalk() {} // walking is just held keys; placeholder for future pathing
}
