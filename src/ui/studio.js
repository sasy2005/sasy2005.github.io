// "Studio" tab: per-course checklist of chapters/topics with progress and days to the chosen exam.
import { el, btn, toast } from './dom.js';
import { avanzamento, checklistIniziale } from '../studio.js';
import { giorniTra } from '../piano.js';
import { votoEsito } from '../calc.js';

const ui = { aperti: new Set(), modifica: null };

const lista = (doc, k) => doc.checklist[k.id] ?? checklistIniziale(k);

function salvaLista(ctx, k, fn) {
  ctx.aggiorna((d) => {
    const l = structuredClone(d.checklist[k.id] ?? checklistIniziale(k));
    fn(l);
    d.checklist[k.id] = l;
  });
}

function voce(ctx, k, item, i) {
  const row = el('li', 'check-row');
  if (ui.modifica && ui.modifica.id === k.id && ui.modifica.i === i) {
    const inp = el('input'); inp.type = 'text'; inp.value = item.testo; inp.setAttribute('aria-label', 'Testo');
    const ok = () => {
      const t = inp.value.trim();
      ui.modifica = null;
      if (!t) { ctx.rerender(); return; }
      salvaLista(ctx, k, (l) => { l[i].testo = t; });
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') { ui.modifica = null; ctx.rerender(); } });
    row.append(inp, btn('OK', 'primary', ok));
    queueMicrotask(() => inp.focus());
    return row;
  }
  const lab = el('label', 'row');
  const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!item.fatto;
  cb.addEventListener('change', () => salvaLista(ctx, k, (l) => { l[i].fatto = cb.checked; }));
  lab.append(cb, el('span', item.fatto ? 'muted' : null, item.testo));
  row.append(lab, el('span', 'spacer'));
  row.append(btn('Modifica', 'link', () => { ui.modifica = { id: k.id, i }; ctx.rerender(); }, { 'aria-label': 'Modifica ' + item.testo }));
  row.append(btn('×', 'link', () => salvaLista(ctx, k, (l) => { l.splice(i, 1); }), { 'aria-label': 'Elimina ' + item.testo }));
  return row;
}

function scheda(ctx, k) {
  const { doc, oggi } = ctx;
  const l = lista(doc, k);
  const a = avanzamento(l);
  const card = el('details', 'card study');
  card.open = ui.aperti.has(k.id);
  card.addEventListener('toggle', () => { if (card.open) ui.aperti.add(k.id); else ui.aperti.delete(k.id); });

  const sum = el('summary');
  const top = el('div', 'top');
  top.append(el('h3', null, k.materia));
  const pc = el('div', 'cfu'); pc.append(el('b', null, a.percentuale + '%'), document.createTextNode(a.totale ? a.fatti + ' di ' + a.totale : 'nessuna voce'));
  top.append(pc);
  sum.append(top);
  const bar = el('div', 'bar'); const fill = el('span'); fill.style.width = a.percentuale + '%'; bar.append(fill);
  sum.append(bar);
  const p = doc.piano[k.id];
  if (p && p.data >= oggi) {
    const g = giorniTra(oggi, p.data);
    sum.append(el('span', 'est', 'Appello scelto tra ' + g + (g === 1 ? ' giorno' : ' giorni')));
  } else sum.append(el('span', 'est', 'Nessun appello scelto'));
  card.append(sum);

  const ul = el('ul', 'checklist');
  l.forEach((item, i) => ul.append(voce(ctx, k, item, i)));
  card.append(ul);
  if (!l.length) card.append(el('p', 'muted', 'Aggiungi i capitoli o gli argomenti da studiare.'));

  const add = el('div', 'row');
  const inp = el('input'); inp.type = 'text'; inp.placeholder = 'Nuovo capitolo o argomento'; inp.setAttribute('aria-label', 'Nuova voce per ' + k.materia);
  const aggiungi = () => {
    const t = inp.value.trim();
    if (!t) { toast('Scrivi il nome della voce.'); return; }
    salvaLista(ctx, k, (lst) => { lst.push({ testo: t, fatto: false }); });
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') aggiungi(); });
  add.append(inp, btn('Aggiungi', '', aggiungi));
  card.append(add);
  return card;
}

export function renderStudio(ctx) {
  const { corsi, doc } = ctx;
  const v = el('div', 'view');
  const head = el('div', 'stack');
  head.append(el('h2', 'section-title', 'Avanzamento dello studio'));
  head.append(el('p', 'foot', 'Per ogni materia segna i capitoli o gli argomenti che hai finito. Per Diritto pubblico la lista parte dai capitoli concordati.'));
  v.append(head);
  const daFare = corsi.filter((k) => +k.cfu_da_fare > 0 && votoEsito(doc.esami[k.id] || {}) == null)
    .sort((x, y) => ((doc.piano[x.id] || {}).data || '9999').localeCompare((doc.piano[y.id] || {}).data || '9999') || (x.ordine || 0) - (y.ordine || 0));
  const list = el('div', 'stack');
  list.append(...daFare.map((k) => scheda(ctx, k)));
  v.append(list);
  return v;
}
