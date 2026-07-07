// Build the standalone single-file version (SFvsTK.html).
// - three.js sources are embedded as <script type="text/plain"> payloads
// - a bootstrap module turns them into blob: modules at runtime and imports THREE
// - all game modules are concatenated (imports/exports stripped) into that scope
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// dependency order (main.js last — it bootstraps everything)
const SRC_ORDER = [
  'src/audio.js', 'src/input.js', 'src/textures.js', 'src/rig.js', 'src/moves.js',
  'src/fx.js', 'src/stage.js', 'src/ui.js', 'src/ai.js',
  'src/fighter.js', 'src/game.js', 'src/main.js',
];

function stripModules(code) {
  return code
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '') // import ... from '...'
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')             // bare imports
    .replace(/^export\s+(const|let|class|function)/gm, '$1');
}

const gameCode = SRC_ORDER
  .map((p) => `// ===== ${p} =====\n${stripModules(read(p))}`)
  .join('\n');

for (const banned of ['</script', 'import ', 'export ']) {
  const idx = gameCode.indexOf(banned);
  if (banned === '</script' && idx !== -1) throw new Error('game code contains </script');
  if (banned !== '</script' && idx !== -1) {
    const bad = gameCode.split('\n').filter((l) => l.startsWith(banned.trim() + ' '));
    if (bad.length) throw new Error(`unstripped module syntax in game code: ${bad[0]}`);
  }
}

const threeCore = read('vendor/three.core.min.js');
const threeWrap = read('vendor/three.module.min.js');
if (threeCore.includes('</script') || threeWrap.includes('</script')) {
  throw new Error('three.js source contains </script — cannot inline');
}

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

${gameCode}
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
