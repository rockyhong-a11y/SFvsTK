// Keyboard state + per-player virtual controllers with a small input buffer.
const down = new Set();
const pressedAt = new Map(); // code -> performance-ish game time of press

let gameTime = 0;
export function tickInputClock(dt) { gameTime += dt; }

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  down.add(e.code);
  pressedAt.set(e.code, gameTime);
});
window.addEventListener('keyup', (e) => down.delete(e.code));
window.addEventListener('blur', () => down.clear());

export function keyDown(code) { return down.has(code); }

const BUFFER = 0.14; // seconds of input buffer for button presses

// A controller exposes: held(action), pressed(action) [buffered], consume(action)
export class KeyboardController {
  constructor(map) { this.map = map; } // action -> [codes]
  held(action) {
    return (this.map[action] || []).some((c) => down.has(c));
  }
  pressed(action) {
    return (this.map[action] || []).some((c) => {
      const t = pressedAt.get(c);
      return t !== undefined && gameTime - t <= BUFFER;
    });
  }
  consume(action) {
    for (const c of this.map[action] || []) pressedAt.delete(c);
  }
  update() {}
}

// Virtual controller driven by AI: set .buttons / .taps programmatically.
export class VirtualController {
  constructor() {
    this.helds = new Set();
    this.taps = new Map(); // action -> expiry time
  }
  hold(action, on = true) { on ? this.helds.add(action) : this.helds.delete(action); }
  clearHolds() { this.helds.clear(); }
  tap(action) { this.taps.set(action, gameTime + BUFFER); }
  held(action) { return this.helds.has(action); }
  pressed(action) {
    const t = this.taps.get(action);
    return t !== undefined && gameTime <= t;
  }
  consume(action) { this.taps.delete(action); }
  update() {}
}

export const P1_KEYS = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
  punch: ['KeyJ'], kick: ['KeyK'], skill: ['KeyL'], grab: ['KeyI'],
};
export const P2_KEYS = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
  punch: ['Numpad1', 'KeyN'], kick: ['Numpad2', 'KeyM'], skill: ['Numpad3', 'Comma'], grab: ['Numpad5', 'KeyB'],
};
