import { test, eq } from './runner.js';

// Every module reachable from src/app.js must be precached, or the app breaks offline.
async function grafo(entry) {
  const seen = new Set();
  const todo = [entry];
  while (todo.length) {
    const path = todo.pop();
    if (seen.has(path)) continue;
    seen.add(path);
    const src = await (await fetch('/' + path)).text();
    for (const m of src.matchAll(/(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
      const rel = m[1] || m[2];
      todo.push(new URL(rel, 'http://x/' + path).pathname.slice(1));
    }
  }
  return [...seen];
}

test('sw: la lista offline contiene tutti i moduli dell\'app', async () => {
  const sw = await (await fetch('/sw.js')).text();
  const shell = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const mancanti = (await grafo('src/app.js')).filter((p) => !shell.includes(p));
  eq(mancanti, []);
});

test('sw: icone e manifest in lista', async () => {
  const sw = await (await fetch('/sw.js')).text();
  for (const f of ['index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon-192.png']) eq(sw.includes(`'${f}'`), true, f);
});

test('tutti i moduli dell\'app si caricano senza errori di sintassi', async () => {
  const m = await import('../src/app.js');
  eq(typeof m.avvia, 'function');
});

test('sync.js (caricato a parte) si carica con l\'SDK Firebase', async () => {
  const m = await import('../src/sync.js');
  eq(['accedi', 'avvia', 'esci'].every((k) => typeof m[k] === 'function'), true);
});
