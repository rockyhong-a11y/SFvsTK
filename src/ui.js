// HUD bindings (health bars with lag chunk, combo counters, announcements, damage numbers).
const $ = (id) => document.getElementById(id);

export const UI = {
  els: null,
  lagHp: [1, 1],
  shownHp: [1, 1],
  comboTimer: [0, 0],

  init() {
    this.els = {
      hud: $('hud'),
      hp: [$('hp0'), $('hp1')],
      lag: [$('lag0'), $('lag1')],
      names: [$('name0'), $('name1')],
      moves: [$('move0'), $('move1')],
      combos: [$('combo0'), $('combo1')],
      timer: $('timer'),
      pips: [$('pips0'), $('pips1')],
      announce: $('announce'),
      sub: $('subAnnounce'),
      title: $('title'),
      result: $('result'),
      resultText: $('resultText'),
      pause: $('pauseOverlay'),
    };
    this.moveNameT = [0, 0];
  },

  showHud(on) { this.els.hud.classList.toggle('on', on); },
  showTitle(on) { this.els.title.classList.toggle('on', on); },
  showResult(on, text) {
    this.els.result.classList.toggle('on', on);
    if (text) this.els.resultText.textContent = text;
  },
  showPause(on) { this.els.pause.classList.toggle('on', on); },

  setNames(a, b) {
    this.els.names[0].textContent = a;
    this.els.names[1].textContent = b;
  },

  setRounds(w0, w1) {
    for (const [i, w] of [[0, w0], [1, w1]]) {
      const pips = this.els.pips[i].children;
      for (let p = 0; p < pips.length; p++) pips[p].classList.toggle('won', p < w);
    }
  },

  setTimer(t) {
    this.els.timer.textContent = Math.max(0, Math.ceil(t));
  },

  moveName(i, name) {
    const el = this.els.moves[i];
    el.textContent = name;
    el.classList.add('on');
    this.moveNameT[i] = 1.1;
  },

  combo(i, hits, dmg) {
    if (hits < 2) return;
    const el = this.els.combos[i];
    el.innerHTML = `${hits} HITS<small>${Math.round(dmg)} DMG</small>`;
    el.classList.add('on');
    this.comboTimer[i] = 1.2;
  },

  announce(text, dur = 1.2, ko = false) {
    const el = this.els.announce;
    el.textContent = text;
    el.classList.toggle('ko', ko);
    el.classList.add('on');
    this.announceT = dur;
  },
  subAnnounce(text, dur = 1.4) {
    this.els.sub.textContent = text;
    this.els.sub.classList.add('on');
    this.subT = dur;
  },

  damageNumber(screenX, screenY, dmg, counter = false) {
    const d = document.createElement('div');
    d.className = 'dmgNum' + (counter ? ' counter' : '');
    d.textContent = (counter ? 'COUNTER ' : '') + Math.round(dmg);
    d.style.left = `${screenX}px`;
    d.style.top = `${screenY}px`;
    this.els.hud.appendChild(d);
    setTimeout(() => d.remove(), 850);
  },

  update(dt, fighters) {
    for (let i = 0; i < 2; i++) {
      const f = fighters[i];
      const target = Math.max(0, f.health / f.maxHealth);
      this.shownHp[i] += (target - this.shownHp[i]) * Math.min(1, dt * 18);
      if (this.lagHp[i] > this.shownHp[i]) {
        this.lagHp[i] = Math.max(this.shownHp[i], this.lagHp[i] - dt * 0.22);
      } else this.lagHp[i] = this.shownHp[i];
      this.els.hp[i].style.width = `${this.shownHp[i] * 100}%`;
      this.els.lag[i].style.width = `${this.lagHp[i] * 100}%`;

      if (this.moveNameT[i] > 0) {
        this.moveNameT[i] -= dt;
        if (this.moveNameT[i] <= 0) this.els.moves[i].classList.remove('on');
      }
      if (this.comboTimer[i] > 0) {
        this.comboTimer[i] -= dt;
        if (this.comboTimer[i] <= 0) this.els.combos[i].classList.remove('on');
      }
    }
    if (this.announceT > 0) {
      this.announceT -= dt;
      if (this.announceT <= 0) this.els.announce.classList.remove('on');
    }
    if (this.subT > 0) {
      this.subT -= dt;
      if (this.subT <= 0) this.els.sub.classList.remove('on');
    }
  },

  resetBars() {
    this.lagHp = [1, 1];
    this.shownHp = [1, 1];
  },
};
