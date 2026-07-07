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
  t.anisotropy = 4;
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

const DRAWERS = { leather: drawLeather, skin: drawSkin, hair: drawHair, wood: drawWood, plaster: drawPlaster, fabric: drawFabric };

export function getTextureSet(kind, color, seed, params = {}) {
  const key = `${kind}:${color}:${seed}:${JSON.stringify(params)}`;
  if (!cache.has(key)) cache.set(key, DRAWERS[kind](color, seed, params));
  return cache.get(key);
}

// ---------------- character material factories ----------------

// character body parts are small boxes, so sample a sub-window of the texture
// (repeat < 1) — grain features stay chunky enough to read at fight distance
function zoom(set, k) {
  set.map.repeat.set(k, k);
  set.bumpMap.repeat.set(k, k);
  return set;
}

// glossy skin: clearcoat gives the highlight sheen without turning metallic
export function skinMaterial(color, seed) {
  const { map, bumpMap } = zoom(getTextureSet('skin', color, seed), 0.6);
  return new THREE.MeshPhysicalMaterial({
    map, bumpMap, bumpScale: 0.5,
    roughness: 0.34, metalness: 0,
    clearcoat: 0.55, clearcoatRoughness: 0.35,
  });
}

// leather clothes: grain/creases/gloss vary per finish so each fighter keeps
// their identity while everyone reads as leather
export function leatherMaterial(color, seed, { grain = 1, creases = 12, wear = 0.5, gloss = 0.62, metal = 0.05 } = {}) {
  const { map, bumpMap } = zoom(getTextureSet('leather', color, seed, { grain, creases, wear }), 0.45);
  return new THREE.MeshStandardMaterial({
    map, bumpMap, bumpScale: 2.2,
    roughness: gloss, metalness: metal,
  });
}

export function hairMaterial(color, seed) {
  const { map, bumpMap } = zoom(getTextureSet('hair', color, seed), 0.7);
  return new THREE.MeshStandardMaterial({
    map, bumpMap, bumpScale: 0.9,
    roughness: 0.5, metalness: 0.05,
  });
}
