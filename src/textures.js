// Procedural canvas textures — leather clothing, glossy skin, hair, and stage
// surfaces (wood / plaster / fabric). Everything is generated once per unique
// (kind, color, seed, params) key and cached, so fighters and stage rebuilds
// reuse the same GPU textures.
import * as THREE from 'three';

const cache = new Map();

// deterministic RNG — per-character seeds keep each fighter's grain unique but
// stable between rounds/rematches
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgbOf(hex) { return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]; }

// f > 0 → mix toward white, f < 0 → mix toward black
function shade(hex, f, alpha = 1) {
  const [r, g, b] = rgbOf(hex);
  const t = f < 0 ? 0 : 255, a = Math.abs(f);
  const m = (c) => Math.round(c + (t - c) * a);
  return `rgba(${m(r)},${m(g)},${m(b)},${alpha})`;
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, { srgb = true, repeatX = 1, repeatY = 1 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  // single-level linear filtering: software GL pays ~8 fetches/fragment for
  // trilinear mipmaps on the fullscreen floor/walls — this keeps it at 1-2
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

// random-walk polyline (creases, cracks)
function walkStroke(ctx, rnd, size, style, width, steps, jitter) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.beginPath();
  let x = rnd() * size, y = rnd() * size;
  let ang = rnd() * Math.PI * 2;
  ctx.moveTo(x, y);
  for (let i = 0; i < steps; i++) {
    ang += (rnd() - 0.5) * jitter;
    x += Math.cos(ang) * (size / steps) * 1.6;
    y += Math.sin(ang) * (size / steps) * 1.6;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ---------------- leather (clothes) ----------------
// pebbled grain + crease lines + soft wear patches. Returns { map, bumpMap }.
function drawLeather(color, seed, { grain = 1, creases = 12, wear = 0.5 }) {
  const size = 256;
  const rnd = mulberry32(seed);
  const [c, ctx] = makeCanvas(size);
  const [bc, bctx] = makeCanvas(size);

  ctx.fillStyle = shade(color, 0);
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, size, size);

  // pebble cells — little rounded outlines, denser with coarser grain
  const cells = Math.round(150 * grain);
  for (let i = 0; i < cells; i++) {
    const x = rnd() * size, y = rnd() * size;
    const r = (2 + rnd() * 4) * (0.8 + grain * 0.4);
    ctx.strokeStyle = shade(color, -0.32, 0.30);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, rnd() * Math.PI * 2, Math.PI * (1.1 + rnd() * 0.8));
    ctx.stroke();
    bctx.strokeStyle = 'rgba(70,70,70,0.35)';
    bctx.lineWidth = 1;
    bctx.beginPath();
    bctx.arc(x, y, r, rnd() * Math.PI * 2, Math.PI * (1.1 + rnd() * 0.8));
    bctx.stroke();
  }

  // fine speckle grain
  const specks = Math.round(2200 * grain);
  for (let i = 0; i < specks; i++) {
    const x = rnd() * size, y = rnd() * size, s = rnd() < 0.5 ? 1 : 2;
    const light = rnd() < 0.5;
    ctx.fillStyle = shade(color, light ? 0.22 : -0.26, 0.22);
    ctx.fillRect(x, y, s, s);
    bctx.fillStyle = light ? 'rgba(200,200,200,0.25)' : 'rgba(60,60,60,0.25)';
    bctx.fillRect(x, y, s, s);
  }

  // crease lines
  for (let i = 0; i < creases; i++) {
    const w = 1 + rnd() * 1.5;
    walkStroke(ctx, mulberry32(seed + 100 + i), size, shade(color, -0.38, 0.20), w, 22, 0.9);
    walkStroke(bctx, mulberry32(seed + 100 + i), size, 'rgba(50,50,50,0.45)', w, 22, 0.9);
  }

  // soft wear/sheen patches
  const patches = Math.round(4 * wear) + 2;
  for (let i = 0; i < patches; i++) {
    const x = rnd() * size, y = rnd() * size, r = 30 + rnd() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, shade(color, 0.20, 0.14));
    g.addColorStop(1, shade(color, 0, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  return { map: toTexture(c), bumpMap: toTexture(bc, { srgb: false }) };
}

// ---------------- skin ----------------
// soft mottling + faint pores; pairs with a glossy clearcoat material
function drawSkin(color, seed) {
  const size = 256;
  const rnd = mulberry32(seed);
  const [c, ctx] = makeCanvas(size);
  const [bc, bctx] = makeCanvas(size);

  ctx.fillStyle = shade(color, 0);
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, size, size);

  // warm mottle blobs (subtle blood-tone variation)
  for (let i = 0; i < 42; i++) {
    const x = rnd() * size, y = rnd() * size, r = 18 + rnd() * 42;
    const warm = rnd() < 0.55;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, warm ? 'rgba(215,120,105,0.05)' : shade(color, 0.12, 0.05));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // pores
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * size, y = rnd() * size;
    ctx.fillStyle = shade(color, -0.25, 0.05);
    ctx.fillRect(x, y, 1, 1);
    bctx.fillStyle = 'rgba(90,90,90,0.18)';
    bctx.fillRect(x, y, 1, 1);
  }

  return { map: toTexture(c), bumpMap: toTexture(bc, { srgb: false }) };
}

// ---------------- hair ----------------
// vertical strand streaks with a soft sheen band
function drawHair(color, seed) {
  const size = 128;
  const rnd = mulberry32(seed);
  const [c, ctx] = makeCanvas(size);
  const [bc, bctx] = makeCanvas(size);

  ctx.fillStyle = shade(color, 0);
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 240; i++) {
    const x = rnd() * size;
    const light = rnd() < 0.45;
    ctx.strokeStyle = shade(color, light ? 0.22 : -0.3, 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (rnd() - 0.5) * 8, size * 0.33, x + (rnd() - 0.5) * 8, size * 0.66, x + (rnd() - 0.5) * 6, size);
    ctx.stroke();
    bctx.strokeStyle = light ? 'rgba(190,190,190,0.3)' : 'rgba(70,70,70,0.3)';
    bctx.lineWidth = 1;
    bctx.beginPath();
    bctx.moveTo(x, 0);
    bctx.lineTo(x, size);
    bctx.stroke();
  }
  // sheen band
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0.35, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.65, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  return { map: toTexture(c), bumpMap: toTexture(bc, { srgb: false }) };
}

// ---------------- wood (stage floor / pillars) ----------------
function drawWood(color, seed) {
  const size = 256;
  const rnd = mulberry32(seed);
  const [c, ctx] = makeCanvas(size);
  const [bc, bctx] = makeCanvas(size);

  ctx.fillStyle = shade(color, 0);
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, size, size);

  // long grain streaks (v axis = plank length)
  for (let i = 0; i < 46; i++) {
    const x = rnd() * size;
    const light = rnd() < 0.4;
    ctx.strokeStyle = shade(color, light ? 0.12 : -0.25, 0.25);
    ctx.lineWidth = 1 + rnd() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (rnd() - 0.5) * 14, size * 0.3, x + (rnd() - 0.5) * 14, size * 0.7, x + (rnd() - 0.5) * 10, size);
    ctx.stroke();
    bctx.strokeStyle = light ? 'rgba(180,180,180,0.35)' : 'rgba(60,60,60,0.4)';
    bctx.lineWidth = 1 + rnd() * 2;
    bctx.beginPath();
    bctx.moveTo(x, 0);
    bctx.lineTo(x + (rnd() - 0.5) * 8, size);
    bctx.stroke();
  }

  // knots
  for (let i = 0; i < 3; i++) {
    const x = rnd() * size, y = rnd() * size;
    for (let r = 8; r > 0; r -= 2) {
      ctx.strokeStyle = shade(color, -0.3, 0.3);
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 1.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      bctx.strokeStyle = 'rgba(50,50,50,0.4)';
      bctx.beginPath();
      bctx.ellipse(x, y, r, r * 1.6, 0, 0, Math.PI * 2);
      bctx.stroke();
    }
  }

  return { map: toTexture(c, { repeatX: 1, repeatY: 4 }), bumpMap: toTexture(bc, { srgb: false, repeatX: 1, repeatY: 4 }) };
}

// ---------------- plaster / stone (stage walls) ----------------
function drawPlaster(color, seed) {
  const size = 256;
  const rnd = mulberry32(seed);
  const [c, ctx] = makeCanvas(size);
  const [bc, bctx] = makeCanvas(size);

  ctx.fillStyle = shade(color, 0);
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, size, size);

  // mottled blotches
  for (let i = 0; i < 60; i++) {
    const x = rnd() * size, y = rnd() * size, r = 12 + rnd() * 36;
    const light = rnd() < 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, shade(color, light ? 0.1 : -0.14, 0.09));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // speckle
  for (let i = 0; i < 1600; i++) {
    const x = rnd() * size, y = rnd() * size;
    ctx.fillStyle = shade(color, rnd() < 0.5 ? 0.14 : -0.18, 0.10);
    ctx.fillRect(x, y, 1, 1);
    bctx.fillStyle = rnd() < 0.5 ? 'rgba(180,180,180,0.2)' : 'rgba(70,70,70,0.2)';
    bctx.fillRect(x, y, 1, 1);
  }
  // hairline cracks
  for (let i = 0; i < 5; i++) {
    walkStroke(ctx, mulberry32(seed + 40 + i), size, shade(color, -0.4, 0.18), 1, 30, 1.3);
    walkStroke(bctx, mulberry32(seed + 40 + i), size, 'rgba(40,40,40,0.5)', 1, 30, 1.3);
  }

  return { map: toTexture(c), bumpMap: toTexture(bc, { srgb: false }) };
}

// ---------------- woven fabric (stage banners) ----------------
function drawFabric(color, seed) {
  const size = 128;
  const rnd = mulberry32(seed);
  const [c, ctx] = makeCanvas(size);
  const [bc, bctx] = makeCanvas(size);

  ctx.fillStyle = shade(color, 0);
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, size, size);

  // weave: alternating warp/weft lines
  for (let i = 0; i < size; i += 3) {
    ctx.fillStyle = shade(color, (i / 3) % 2 ? -0.12 : 0.08, 0.16);
    ctx.fillRect(i, 0, 1, size);
    ctx.fillRect(0, i, size, 1);
    bctx.fillStyle = (i / 3) % 2 ? 'rgba(80,80,80,0.3)' : 'rgba(180,180,180,0.3)';
    bctx.fillRect(i, 0, 1, size);
    bctx.fillRect(0, i, size, 1);
  }
  // cloth shading folds
  for (let i = 0; i < 4; i++) {
    const x = rnd() * size;
    const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, shade(color, -0.2, 0.16));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 14, 0, 28, size);
  }

  return { map: toTexture(c), bumpMap: toTexture(bc, { srgb: false }) };
}


// ---------------- brushed armor metal (HAR robots / arena deck) ----------------
// panel seams + rivets + brushed streaks + scratches. Returns { map, bumpMap }.
function drawMetal(color, seed, { panels = 3, wear = 0.5 } = {}) {
  const size = 256;
  const rnd = mulberry32(seed);
  const [c, ctx] = makeCanvas(size);
  const [bc, bctx] = makeCanvas(size);

  ctx.fillStyle = shade(color, 0);
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, size, size);

  // brushed streaks
  for (let i = 0; i < 260; i++) {
    const y = rnd() * size, x0 = rnd() * size, len = 24 + rnd() * 90;
    const light = rnd() < 0.5;
    ctx.strokeStyle = shade(color, light ? 0.16 : -0.16, 0.11);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len, y); ctx.stroke();
  }

  // panel seams (jittered grid) + rivets at intersections
  const cell = size / panels;
  const jit = () => (rnd() - 0.5) * 8;
  for (let i = 0; i <= panels; i++) {
    const v = Math.min(size - 1, i * cell + (i === 0 || i === panels ? 0 : jit()));
    for (const [sx, sy, ex, ey] of [[v, 0, v, size], [0, v, size, v]]) {
      ctx.strokeStyle = shade(color, -0.42, 0.5); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = shade(color, 0.25, 0.25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx + 2, sy + 2); ctx.lineTo(ex + 2, ey + 2); ctx.stroke();
      bctx.strokeStyle = 'rgba(40,40,40,0.8)'; bctx.lineWidth = 2;
      bctx.beginPath(); bctx.moveTo(sx, sy); bctx.lineTo(ex, ey); bctx.stroke();
    }
    for (let j = 0; j <= panels; j++) {
      const rx = Math.min(size - 6, Math.max(6, j * cell + 6)), ry = Math.min(size - 6, Math.max(6, v + 6));
      ctx.fillStyle = shade(color, -0.3, 0.7);
      ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(color, 0.35, 0.5);
      ctx.beginPath(); ctx.arc(rx - 0.7, ry - 0.7, 0.9, 0, Math.PI * 2); ctx.fill();
      bctx.fillStyle = 'rgba(220,220,220,0.7)';
      bctx.beginPath(); bctx.arc(rx, ry, 2.2, 0, Math.PI * 2); bctx.fill();
    }
  }

  // battle scratches
  const scr = Math.round(8 * wear);
  for (let i = 0; i < scr; i++) {
    walkStroke(ctx, mulberry32(seed + 300 + i), size, shade(color, 0.3, 0.22), 1, 10, 0.5);
    walkStroke(bctx, mulberry32(seed + 300 + i), size, 'rgba(200,200,200,0.4)', 1, 10, 0.5);
  }
  // scorch smudges
  for (let i = 0; i < Math.round(4 * wear); i++) {
    const x = rnd() * size, y = rnd() * size, r = 12 + rnd() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(20,16,12,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  return { map: toTexture(c), bumpMap: toTexture(bc, { srgb: false }) };
}

// ---------------- Jupiter disc (2097 Ganymede arena sky) ----------------
function drawJupiter(color, seed) {
  const size = 256;
  const rnd = mulberry32(seed);
  const [c, ctx] = makeCanvas(size);
  const bands = [0xd8b090, 0xc09a78, 0xe8cbaa, 0xb08a68, 0xd8ac88, 0xc8a077, 0xe0c09a];
  let y = 0;
  let bi = 0;
  while (y < size) {
    const h = 12 + rnd() * 26;
    ctx.fillStyle = shade(bands[bi % bands.length], (rnd() - 0.5) * 0.12);
    ctx.fillRect(0, y, size, h + 2);
    // wavy band edge streaks
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = shade(bands[(bi + 1) % bands.length], -0.08, 0.35);
      ctx.lineWidth = 1 + rnd() * 2;
      const yy = y + rnd() * h;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.bezierCurveTo(size * 0.3, yy + (rnd() - 0.5) * 8, size * 0.7, yy + (rnd() - 0.5) * 8, size, yy);
      ctx.stroke();
    }
    y += h; bi++;
  }
  // great red spot
  ctx.fillStyle = 'rgba(178,72,48,0.85)';
  ctx.beginPath(); ctx.ellipse(size * 0.62, size * 0.64, 30, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(230,180,150,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(size * 0.62, size * 0.64, 34, 20, 0, 0, Math.PI * 2); ctx.stroke();
  const tex = toTexture(c);
  return { map: tex, bumpMap: tex };
}

const DRAWERS = { leather: drawLeather, skin: drawSkin, hair: drawHair, wood: drawWood, plaster: drawPlaster, fabric: drawFabric, metal: drawMetal, jupiter: drawJupiter };

export function getTextureSet(kind, color, seed, params = {}) {
  const key = `${kind}:${color}:${seed}:${JSON.stringify(params)}`;
  if (!cache.has(key)) cache.set(key, DRAWERS[kind](color, seed, params));
  return cache.get(key);
}

// ---------------- character material factories ----------------

// character body parts are small boxes, so sample a sub-window of the texture
// (repeat < 1) — panel/grain features stay chunky enough to read at fight distance
function zoom(set, k) {
  set.map.repeat.set(k, k);
  set.bumpMap.repeat.set(k, k);
  return set;
}

// HAR armor plating — pass z (sub-window zoom) in params so each zoom level
// gets its own cached texture instead of mutating a shared one.
// NOTE: no bumpMap — software GL (SwiftShader) drops from 60fps to 4fps with
// per-fragment bump sampling; the maps bake seam highlight/shadow lines instead
export function metalMaterial(color, seed, { panels = 3, wear = 0.5, rough = 0.38, metal = 0.8, z = 1 } = {}) {
  const set = getTextureSet('metal', color, seed, { panels, wear, z });
  if (z !== 1) zoom(set, z);
  return new THREE.MeshStandardMaterial({
    map: set.map,
    roughness: rough, metalness: metal,
  });
}

export function jupiterMaterial() {
  const { map } = getTextureSet('jupiter', 0xd8b090, 7);
  return new THREE.MeshBasicMaterial({ map, fog: false });
}
