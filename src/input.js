// Keyboard + Gamepad state, per-player virtual controllers with a small input buffer.
const down = new Set();
const pressedAt = new Map(); // code -> { t: game time, f: frame no } of press

let gameTime = 0;
let frameNo = 0;
export function tickInputClock(dt) { gameTime += dt; frameNo++; }

// a press is buffered for BUFFER seconds of game time, but never expires before
// the loop has processed at least one frame after it landed — on slow renderers
// (software GL) a frame gap can exceed BUFFER and quick taps would vanish
function freshPress(rec) {
  return rec !== undefined && (gameTime - rec.t <= BUFFER || frameNo <= rec.f + 1);
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  down.add(e.code);
  pressedAt.set(e.code, { t: gameTime, f: frameNo });
});
window.addEventListener('keyup', (e) => down.delete(e.code));
window.addEventListener('blur', () => down.clear());

export function keyDown(code) { return down.has(code); }

const BUFFER = 0.14; // seconds of input buffer for button presses

// ---------------- gamepad ----------------
// Standard mapping: 0=A(skill) 1=B(grab) 2=X(punch) 3=Y(kick) 4/5=LB/RB(super macro)
const PAD_BTN = { 0: 'skill', 1: 'grab', 2: 'punch', 3: 'kick', 4: 'super', 5: 'super' };
const padState = [null, null].map(() => ({
  connected: false,
  held: new Set(),
  pressedAt: new Map(), // action -> { t, f }
  prevBtns: [],
  prevDirs: {},
}));

export function pollGamepads() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < 2; i++) {
    const st = padState[i];
    const gp = pads[i];
    st.held.clear();
    st.connected = !!gp;
    if (!gp) continue;

    const dirs = {
      left: (gp.axes[0] ?? 0) < -0.42 || gp.buttons[14]?.pressed,
      right: (gp.axes[0] ?? 0) > 0.42 || gp.buttons[15]?.pressed,
      up: (gp.axes[1] ?? 0) < -0.55 || gp.buttons[12]?.pressed,
      down: (gp.axes[1] ?? 0) > 0.55 || gp.buttons[13]?.pressed,
    };
    for (const [act, on] of Object.entries(dirs)) {
      if (on) st.held.add(act);
      if (on && !st.prevDirs[act]) st.pressedAt.set(act, { t: gameTime, f: frameNo });
    }
    st.prevDirs = dirs;

    for (const [btn, act] of Object.entries(PAD_BTN)) {
      const b = gp.buttons[btn];
      const on = !!(b && b.pressed);
      if (on) st.held.add(act);
      if (on && !st.prevBtns[btn]) st.pressedAt.set(act, { t: gameTime, f: frameNo });
      st.prevBtns[btn] = on;
    }
  }
}

export function padConnected(i) { return padState[i]?.connected; }

// one-shot edge reads for menu navigation (consumes the press)
export function padMenuEdges(i) {
  const st = padState[i];
  const out = { left: false, right: false, up: false, down: false, confirm: false };
  if (!st) return out;
  for (const act of ['left', 'right', 'up', 'down']) {
    if (freshPress(st.pressedAt.get(act))) { out[act] = true; st.pressedAt.delete(act); }
  }
  for (const act of ['skill', 'punch', 'grab', 'kick']) {
    if (freshPress(st.pressedAt.get(act))) { out.confirm = true; st.pressedAt.delete(act); }
  }
  return out;
}

// A controller exposes: held(action), pressed(action) [buffered], consume(action)
export class KeyboardController {
  constructor(map) { this.map = map; } // action -> [codes]
  held(action) {
    return (this.map[action] || []).some((c) => down.has(c));
  }
  pressed(action) {
    return (this.map[action] || []).some((c) => freshPress(pressedAt.get(c)));
  }
  consume(action) {
    for (const c of this.map[action] || []) pressedAt.delete(c);
  }
  update() {}
}

export class PadController {
  constructor(index) { this.index = index; }
  held(action) { return padState[this.index].held.has(action); }
  pressed(action) {
    return freshPress(padState[this.index].pressedAt.get(action));
  }
  consume(action) { padState[this.index].pressedAt.delete(action); }
  update() {}
}

// keyboard OR gamepad — both drive the same fighter
export class CompositeController {
  constructor(...ctrls) { this.ctrls = ctrls; }
  held(action) { return this.ctrls.some((c) => c.held(action)); }
  pressed(action) { return this.ctrls.some((c) => c.pressed(action)); }
  consume(action) { for (const c of this.ctrls) c.consume(action); }
  update() {}
}

// Virtual controller driven by AI: set holds / taps programmatically.
export class VirtualController {
  constructor() {
    this.helds = new Set();
    this.taps = new Map(); // action -> expiry time
  }
  hold(action, on = true) { on ? this.helds.add(action) : this.helds.delete(action); }
  clearHolds() { this.helds.clear(); }
  tap(action) { this.taps.set(action, { t: gameTime, f: frameNo }); }
  held(action) { return this.helds.has(action); }
  pressed(action) {
    return freshPress(this.taps.get(action));
  }
  consume(action) { this.taps.delete(action); }
  update() {}
}

export const P1_KEYS = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
  punch: ['KeyJ'], kick: ['KeyK'], skill: ['KeyL'], grab: ['KeyI'], super: ['KeyU'],
};
export const P2_KEYS = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
  punch: ['Numpad1', 'KeyN'], kick: ['Numpad2', 'KeyM'], skill: ['Numpad3', 'Comma'], grab: ['Numpad5', 'KeyB'],
  super: ['Numpad6', 'Period'],
};
