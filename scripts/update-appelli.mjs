// Nightly update of exam dates in data/corsi.json from the Unimib exam calendar (Node 20+).
// Usage: node scripts/update-appelli.mjs   — exit 0 (changed or not), 1 on error (file untouched).
import { readFile, writeFile } from 'node:fs/promises';
import { estraiAppelli, mergeAppelli } from '../src/appelli-merge.js';

const URL_CAL = 'https://gestioneorari.didattica.unimib.it/PortaleStudentiUnimib/test_call.php';
const FILE = new URL('../data/corsi.json', import.meta.url);
const MAPPA = new URL('../data/mappa-calendario.json', import.meta.url);

const iso = (d) => d.toISOString().slice(0, 10);
const ddmmyyyy = (s) => s.slice(8, 10) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4);

async function main() {
  const oggi = new Date();
  const finestra = { da: iso(oggi), a: iso(new Date(oggi.getTime() + 365 * 86400000)) };
  const body = new URLSearchParams([
    ['view', 'easytest'], ['form-type', 'et_cdl'], ['include', 'et_cdl'], ['et_er', '1'], ['esami_cdl', 'E3305M'],
    ['anno2[]', '1'], ['anno2[]', '2'], ['datefrom', ddmmyyyy(finestra.da)], ['dateto', ddmmyyyy(finestra.a)], ['_lang', 'it'],
  ]);
  const r = await fetch(URL_CAL, { method: 'POST', body, headers: { 'User-Agent': 'libretto-appelli-bot' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const risposta = await r.json();
  if (!risposta || typeof risposta.Insegnamenti !== 'object') throw new Error('Risposta senza Insegnamenti');

  const mappa = JSON.parse(await readFile(MAPPA, 'utf8'));
  const testo = await readFile(FILE, 'utf8');
  const corsi = JSON.parse(testo);
  const { appelli, nonTrovati } = estraiAppelli(risposta, mappa);

  const righe = [];
  for (const k of corsi) {
    if (!appelli[k.id]) continue;
    const nuovi = mergeAppelli(k.appelli || [], appelli[k.id], finestra);
    const prima = new Set((k.appelli || []).map((a) => JSON.stringify(a)));
    const diff = nuovi.filter((a) => !prima.has(JSON.stringify(a)));
    if (diff.length) righe.push(k.id + ': ' + diff.map((a) => a.data + ' ' + a.ora + (a.rimosso ? ' (rimosso)' : '')).join(', '));
    k.appelli = nuovi;
  }
  if (nonTrovati.length) console.log('Senza date nel calendario: ' + nonTrovati.join(', '));
  const out = JSON.stringify(corsi, null, 2) + '\n';
  if (out === testo.replace(/\r\n/g, '\n')) { console.log('Nessuna novità (' + finestra.da + ' → ' + finestra.a + ').'); return; }
  await writeFile(FILE, out);
  console.log('Appelli aggiornati:\n' + righe.join('\n'));
}

main().catch((e) => { console.error('Errore: ' + e.message); process.exit(1); });
