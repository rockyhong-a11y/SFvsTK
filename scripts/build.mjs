// Build the standalone single-file version (SFvsTK.html).
// - three.js sources are embedded as <script type="text/plain"> payloads
// - a bootstrap module turns them into blob: modules at runtime and imports THREE
// - GLTFLoader + its two utils are concatenated the same way, right after THREE
//   loads, with their `import {...} from 'three'` rewritten to destructure THREE
// - all game modules are concatenated (imports/exports stripped) into that scope
// - the Sakura GLB is inlined as a base64 data: URI so the model loads with no
//   network request
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// dependency order (main.js last — it bootstraps everything)
const SRC_ORDER = [
  'src/audio.js', 'src/input.js', 'src/rig.js', 'src/skinnedRig.js', 'src/moves.js',
  'src/fx.js', 'src/stage.js', 'src/ui.js', 'src/ai.js',
  'src/fighter.js', 'src/game.js', 'src/main.js',
];

// GLTFLoader + its two utils import named bindings from 'three' and each other.
// utils must come before the loader (which calls into them at load time).
const VENDOR_JSM_ORDER = [
  'vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
  'vendor/three/examples/jsm/utils/SkeletonUtils.js',
  'vendor/three/examples/jsm/loaders/GLTFLoader.js',
];

function stripModules(code) {
  return code
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '') // import ... from '...'
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')             // bare imports
    .replace(/^export\s+(const|let|class|function)/gm, '$1');
}

// three.js addon files use named imports (`import { Box3, ... } from 'three'`) and
// reference them as bare identifiers. Several addons import overlapping names, so a
// per-file `const {...} = THREE` would redeclare — instead strip the import lines
// here and emit ONE deduplicated destructure covering every addon (below). Also
// drop the trailing `export { ... };` and relative addon-to-addon imports (those
// addons are concatenated into the same scope, so the names are already there).
const threeAddonNames = new Set();
function rewriteThreeAddon(code) {
  return code
    .replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"]three['"];?/, (_, names) => {
      for (const n of names.split(',').map((s) => s.trim()).filter(Boolean)) threeAddonNames.add(n);
      return '';
    })
    .replace(/^import[\s\S]*?from\s+['"]\.\.?\/[^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '');
}

const gameCode = SRC_ORDER
  .map((p) => `// ===== ${p} =====\n${stripModules(read(p))}`)
  .join('\n');
const vendorJsmBody = VENDOR_JSM_ORDER
  .map((p) => `// ===== ${p} =====\n${rewriteThreeAddon(read(p))}`)
  .join('\n');
const vendorJsmCode = `const { ${[...threeAddonNames].join(', ')} } = THREE;\n${vendorJsmBody}`;

for (const banned of ['</script', 'import ', 'export ']) {
  for (const [label, code] of [['game', gameCode], ['vendor jsm', vendorJsmCode]]) {
    const idx = code.indexOf(banned);
    if (banned === '</script' && idx !== -1) throw new Error(`${label} code contains </script`);
    if (banned !== '</script' && idx !== -1) {
      const bad = code.split('\n').filter((l) => l.startsWith(banned.trim() + ' '));
      if (bad.length) throw new Error(`unstripped module syntax in ${label}: ${bad[0]}`);
    }
  }
}

const threeCore = read('vendor/three.core.min.js');
const threeWrap = read('vendor/three.module.min.js');
if (threeCore.includes('</script') || threeWrap.includes('</script')) {
  throw new Error('three.js source contains </script — cannot inline');
}

const sakuraGlbB64 = readFileSync(resolve(root, 'assets/models/sakura_juri.glb')).toString('base64');
const sakuraGlbDataUri = `data:model/gltf-binary;base64,${sakuraGlbB64}`;
const patchedGameCode = gameCode.replace(
  "'./assets/models/sakura_juri.glb'",
  () => JSON.stringify(sakuraGlbDataUri),
);
if (patchedGameCode === gameCode) throw new Error('sakura GLB path not found to inline — check skinnedRig.js');

let html = read('index.html');

// drop the import map and external module script
// NOTE: replacement is passed as a function — the payloads contain '$' sequences
// that String.replace would otherwise treat as substitution patterns.
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
html = html.replace(
  /<script type="module" src="\.\/src\/main\.js"><\/script>/,
  () => `<script type="text/plain" id="three-core-src">
${threeCore}
</script>
<script type="text/plain" id="three-wrap-src">
${threeWrap}
</script>
<script type="module">
// Bootstrap: assemble three.js from the embedded payloads, then run the game.
(async () => {
  const coreSrc = document.getElementById('three-core-src').textContent;
  const coreUrl = URL.createObjectURL(new Blob([coreSrc], { type: 'text/javascript' }));
  const wrapSrc = document.getElementById('three-wrap-src').textContent
    .replaceAll('./three.core.min.js', coreUrl);
  const wrapUrl = URL.createObjectURL(new Blob([wrapSrc], { type: 'text/javascript' }));
  const THREE = await import(wrapUrl);

${vendorJsmCode}

${patchedGameCode}
})().catch((e) => {
  document.body.insertAdjacentHTML('beforeend',
    '<pre style="position:absolute;top:0;left:0;color:#f66;background:#000;z-index:99;padding:12px">' +
    'BOOT ERROR: ' + (e && e.stack || e) + '</pre>');
  throw e;
});
</script>`
);

html = html.replace('<title>SF vs TK — Fighting Prototype</title>',
  '<title>SF vs TK — Fighting Prototype (Standalone)</title>');

writeFileSync(resolve(root, 'SFvsTK.html'), html);
console.log('built SFvsTK.html:', (html.length / 1024).toFixed(0) + 'KB');
