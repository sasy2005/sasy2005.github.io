// Export / import of the private document, with a summary to confirm before overwriting.
import { el, fmt, chiedi, scarica, toast, oggiISO } from './dom.js';
import { normalizza, riepilogo, uguali, vuoto } from '../userdoc.js';
import { corsiEffettivi } from '../calc.js';

export function esporta(doc) {
  scarica('libretto-backup-' + oggiISO() + '.json', JSON.stringify(doc, null, 2), 'application/json');
}

export function listaRiepilogo(r, corsiPub, doc) {
  const nome = (id) => (corsiPub.find((k) => k.id === id) || {}).materia || id;
  const ul = el('ul', 'summary');
  ul.append(el('li', null, 'Media: ' + fmt(r.media)));
  ul.append(el('li', null, r.riconosciuti + ' esami riconosciuti dal LIUC'));
  ul.append(el('li', null, r.esamiPassati + (r.esamiPassati === 1 ? ' esame passato' : ' esami passati') + (r.voti.length ? ': ' + r.voti.map((v) => nome(v.id) + ' ' + v.voto).join(', ') : '')));
  const extra = [];
  if (Object.keys(doc.piano).length) extra.push(Object.keys(doc.piano).length + ' appelli nel piano');
  if (doc.pratiche.length) extra.push(doc.pratiche.length + ' questioni in sospeso');
  if (extra.length) ul.append(el('li', null, extra.join(', ')));
  return ul;
}

/** Reads a file, shows the summary, and saves it only after confirmation. */
export async function importa(file, { corsiPub, attuale, salva }) {
  let nuovo;
  try { nuovo = normalizza(JSON.parse(await file.text())); }
  catch { toast('File non valido: scegli un backup del Libretto.'); return false; }
  const cur = attuale();
  if (uguali(nuovo, cur)) { toast('Questi dati sono già nell\'app.'); return false; }
  const body = el('div');
  body.append(el('p', null, 'Il file contiene:'));
  body.append(listaRiepilogo(riepilogo(nuovo, corsiEffettivi(corsiPub, nuovo.riconoscimenti)), corsiPub, nuovo));
  if (!vuoto(cur)) {
    const w = el('p', 'note', 'Sostituirà i dati che ci sono adesso nell\'app:');
    body.append(w, listaRiepilogo(riepilogo(cur, corsiEffettivi(corsiPub, cur.riconoscimenti)), corsiPub, cur));
  }
  const ok = await chiedi('Importare questo backup?', body, [
    { label: 'Annulla', value: false, cls: 'link' },
    { label: 'Importa', value: true, cls: 'primary' },
  ]);
  if (!ok) return false;
  salva(nuovo);
  toast('Backup importato');
  return true;
}
