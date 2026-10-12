import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import * as catalogModule from './catalog.js';
import * as motifsModule from './motifs.js';
import * as booksModule from './books.js';
import * as shelvesModule from './shelves.js';
import * as foliageModule from './foliage.js';
import * as hatTilesModule from './hat-tiles.js';
import * as mathShelvesModule from './math-shelves.js';
import * as artModule from './art.js';
import * as sceneModule from './scene.js';

const { W, H, definitions, tileMarkup } = artModule;
const run = promisify(execFile);
const read = name => readFile(new URL(`./${name}`, import.meta.url), 'utf8');

// These editable sources use declaration exports and static relative imports.
function stripModule(source) {
  const stripped = source
    .replace(/^\s*import\s+[\s\S]*?\sfrom\s+(['"])[^'"]+\1\s*;[ \t]*$/gm, '')
    .replace(/^export\s+/gm, '');
  if (/^\s*(?:import|export)\s/m.test(stripped)) {
    throw new Error('An unsupported module statement needs attention before bundling.');
  }
  return stripped;
}

function inlineModule(name, source, namespace) {
  const names = Object.keys(namespace).join(', ');
  // Preserve private scopes, including the motif helper named window().
  return `// ${name}\nconst { ${names} } = (() => {\n${stripModule(source)}\nreturn { ${names} };\n})();`;
}

const [htmlSource, cssSource, catalogSource, motifsSource, booksSource, shelvesSource, foliageSource, hatTilesSource, mathShelvesSource, artSource, sceneSource, appSource, faviconSource] = await Promise.all([
  read('index.html'), read('styles.css'), read('catalog.js'),
  read('motifs.js'), read('books.js'), read('shelves.js'), read('foliage.js'), read('hat-tiles.js'), read('math-shelves.js'), read('art.js'), read('scene.js'), read('app.js'), read('favicon.svg')
]);
const script = [
  inlineModule('catalog.js', catalogSource, catalogModule),
  inlineModule('motifs.js', motifsSource, motifsModule),
  inlineModule('books.js', booksSource, booksModule),
  inlineModule('shelves.js', shelvesSource, shelvesModule),
  inlineModule('foliage.js', foliageSource, foliageModule),
  inlineModule('hat-tiles.js', hatTilesSource, hatTilesModule),
  inlineModule('math-shelves.js', mathShelvesSource, mathShelvesModule),
  inlineModule('art.js', artSource, artModule),
  inlineModule('scene.js', sceneSource, sceneModule),
  `// app.js\n${stripModule(appSource)}`
].join('\n\n');

// Check the actual concatenated JavaScript before creating either output.
const temporary = await mkdtemp(join(tmpdir(), 'bookshelf-inline-'));
try {
  const checkFile = join(temporary, 'library.mjs');
  await writeFile(checkFile, script, 'utf8');
  await run(process.execPath, ['--check', checkFile]);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const cssTag = '<link rel="stylesheet" href="styles.css" />';
const scriptTag = '<script type="module" src="app.js"></script>';
const faviconTag = '<link rel="icon" type="image/svg+xml" sizes="any" href="favicon.svg" />';
if (!htmlSource.includes(cssTag) || !htmlSource.includes(scriptTag) || !htmlSource.includes(faviconTag)) {
  throw new Error('The stylesheet, module entry, or favicon tag changed; update the bundler markers.');
}
const bundledHTML = htmlSource
  .replace(faviconTag, () => `<link rel="icon" type="image/svg+xml" sizes="any" href="data:image/svg+xml,${encodeURIComponent(faviconSource.trim())}" />`)
  .replace(cssTag, () => `<style>\n${cssSource.replace(/<\/style/gi, '<\\/style')}\n</style>`)
  .replace(scriptTag, () => `<script type="module">\n${script.replace(/<\/script/gi, '<\\/script')}\n</script>`);
if (/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\brel\s*=\s*['"]stylesheet['"]/i.test(bundledHTML)) {
  throw new Error('The standalone page still references an external stylesheet or script.');
}

const seed = 17;
const width = W * 2;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-labelledby="library-title library-description">
  <title id="library-title">The Unfinished Library — two shelves of possibility</title>
  <desc id="library-description">An illustrated bookshelf with dark wooden boards and alcoves, vivid covers, 200 literary pun titles, closely packed and deliberately leaning books, curved and folding shelves joined to the case, Penrose and Hat tiling compartments, impossible triangles, cubes and tridents, stairways connected to shelf boards and miniature libraries inside archways. Potted ferns, flowers and trailing vines grow among tiny mice, toadstools, owls, toy houses, rocking horses, fishbowls and pendulum clocks. A finite, still vector keepsake from a webpage where fish swim, pendulums swing, toy horses rock, occasional leaves drift down and a few winged books wander through the shelves. Illustrative inspiration: Colin Thompson. https://en.wikipedia.org/wiki/Colin_Thompson_(writer) Hat geometry: David Smith, Joseph Samuel Myers, Craig S. Kaplan and Chaim Goodman-Strauss. https://cs.uwaterloo.ca/~csk/hat/</desc>
  ${definitions}
  <rect width="${width}" height="${H}" fill="#e5c49a"/>
  ${tileMarkup(0, 0, seed, true, true)}
  ${tileMarkup(1, 0, seed, true, true)}
</svg>
`.replace(/[ \t]+$/gm,'');

if (process.argv.includes('--check')) {
  console.log(`Standalone script passed node --check (${Buffer.byteLength(bundledHTML)} HTML bytes). No outputs written.`);
} else {
  await writeFile(new URL('./bookshelf.svg', import.meta.url), svg, 'utf8');
  await writeFile(new URL('./library.html', import.meta.url), bundledHTML, 'utf8');
  console.log(`Wrote bookshelf.svg (${width} × ${H}, seed ${seed}, ${Buffer.byteLength(svg)} bytes).`);
  console.log(`Wrote library.html (${Buffer.byteLength(bundledHTML)} bytes, standalone interactive page).`);
}
