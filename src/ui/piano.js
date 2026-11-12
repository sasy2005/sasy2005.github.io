// "Piano" tab: choose an exam date per course, booking status, conflicts, calendar export.
import { el, btn, link, fmtDate, fmtShort, toast, scarica } from './dom.js';
import { conflitti, promemoria, appelliMancanti, aggiungiGiorni } from '../piano.js';
import { creaIcs } from '../ics.js';
import { votoEsito } from '../calc.js';

export const ESSE3 = 'https://s3w.si.unimib.it/esse3/auth/studente/Appelli/AppelliF.do';
const nome = (corsi, id) => (corsi.find((k) => k.id === id) || {}).materia || id;
const chiave = (a) => a.data + 'T' + a.ora;

export function eventiCalendario(corsi, doc) {
  const { anticipoPrenotazione } = doc.impostazioni;
  return Object.entries(doc.piano).map(([id, p]) => {
    const k = corsi.find((c) => c.id === id) || {};
    const a = (k.appelli || []).find((x) => x.data === p.data && x.ora === p.ora) || p;
    const allarmi = [{ giorniPrima: 2, testo: 'Esame tra 2 giorni: ' + (k.materia || id) }];
    if (!p.prenotato) allarmi.unshift({ giorniPrima: anticipoPrenotazione, testo: 'Prenotati su Esse3: ' + (k.materia || id) });
    return {
      uid: id + '-' + p.data.replace(/-/g, '') + '@libretto',
      titolo: 'Esame: ' + (k.materia || id),
      inizio: p.data + 'T' + (p.ora || '09:00'),
      durataMin: 120,
      luogo: a.aula || '',
      descrizione: [a.tipo, k.esame_dettaglio, 'Prenotazione: ' + ESSE3].filter(Boolean).join('\n'),
      allarmi,
    };
  });
}

function esportaCalendario(corsi, doc) {
  const ev = eventiCalendario(corsi, doc);
  if (!ev.length) { toast('Scegli prima almeno un appello.'); return; }
  const ics = creaIcs(ev);
  // iPhone: opening the calendar file directly shows the "Aggiungi tutti" sheet.
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); return; }
  scarica('libretto-appelli.ics', ics, 'text/calendar');
}

function avvisi(ctx) {
  const { corsi, doc, oggi } = ctx;
  const out = [];
  for (const c of conflitti(doc.piano, doc.impostazioni.giorniMinimi)) {
    out.push(['warn', nome(corsi, c.a) + ' e ' + nome(corsi, c.b) + (c.giorni === 0 ? ' sono lo stesso giorno.' : ' sono a ' + c.giorni + (c.giorni === 1 ? ' giorno' : ' giorni') + ' di distanza.')]);
  }
  for (const id of appelliMancanti(corsi, doc.piano)) {
    out.push(['warn', 'L\'appello scelto per ' + nome(corsi, id) + ' (' + fmtShort(doc.piano[id].data) + ') non è più nel calendario Unimib: controlla e scegline un altro.']);
  }
  for (const p of promemoria(doc.piano, doc.impostazioni.anticipoPrenotazione, oggi)) {
    if (p.urgente) out.push(['', 'Prenotati su Esse3 per ' + nome(corsi, p.id) + ' (esame il ' + fmtShort(doc.piano[p.id].data) + ').']);
  }
  return out;
}

export function bannerAvvisi(ctx) {
  const list = avvisi(ctx);
  if (!list.length) return null;
  const box = el('div', 'stack');
  for (const [tono, testo] of list) {
    const b = el('div', 'banner' + (tono ? ' ' + tono : ''));
    b.append(el('span', null, testo));
    if (!tono) { const a = link('Apri Esse3 ↗', ESSE3); b.append(a); }
    box.append(b);
  }
  return box;
}

function impostazioni(ctx) {
  const { doc } = ctx;
  const det = el('details');
  det.append(el('summary', null, 'Impostazioni avvisi'));
  const f = el('div', 'stack'); f.style.marginTop = '10px';
  const campo = (label, key, min, max) => {
    const l = el('label', 'row', label);
    const i = el('input'); i.type = 'number'; i.min = String(min); i.max = String(max); i.value = doc.impostazioni[key]; i.inputMode = 'numeric';
    i.addEventListener('change', () => {
      const v = Math.round(+i.value);
      if (!(v >= min && v <= max)) { toast('Valore tra ' + min + ' e ' + max + '.'); return; }
      ctx.aggiorna((d) => { d.impostazioni[key] = v; });
    });
    l.append(i); l.append(el('span', 'muted', 'giorni'));
    return l;
  };
  f.append(campo('Avvisami se due esami sono a meno di', 'giorniMinimi', 1, 30));
  f.append(campo('Ricordami di prenotare', 'anticipoPrenotazione', 1, 30));
  f.append(el('p', 'foot', 'Non conosco la data di chiusura delle iscrizioni su Esse3: il promemoria scatta questo numero di giorni prima dell\'appello.'));
  det.append(f);
  return det;
}

function riga(ctx, k) {
  const { doc, oggi } = ctx;
  const p = doc.piano[k.id];
  const card = el('article', 'card');
  const top = el('div', 'top');
  top.append(el('h3', null, k.materia));
  const c = el('div', 'cfu'); c.append(el('b', null, String(k.cfu_da_fare)), document.createTextNode('CFU'));
  top.append(c); card.append(top);

  const futuri = (k.appelli || []).filter((a) => !a.rimosso && a.data >= oggi);
  if (!futuri.length && !p) { card.append(el('p', 'muted', 'Date non ancora pubblicate.')); return card; }

  const sel = el('select'); sel.setAttribute('aria-label', 'Appello scelto per ' + k.materia);
  sel.append(new Option('Nessun appello scelto', ''));
  const opzioni = [...futuri];
  if (p && !opzioni.some((a) => a.data === p.data && a.ora === p.ora)) opzioni.unshift({ ...p, mancante: true });
  for (const a of opzioni) {
    const o = new Option(fmtDate(a.data) + ' · ' + (a.ora || '') + (a.aula ? ' · ' + a.aula : '') + (a.mancante ? ' (non più in calendario)' : ''), chiave(a));
    o.selected = !!p && p.data === a.data && p.ora === a.ora;
    sel.append(o);
  }
  sel.addEventListener('change', () => ctx.aggiorna((d) => {
    if (!sel.value) { delete d.piano[k.id]; return; }
    const [data, ora] = sel.value.split('T');
    d.piano[k.id] = { data, ora, prenotato: false };
  }));
  card.append(sel);

  if (p) {
    const row = el('div', 'row');
    const l = el('label', 'row'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!p.prenotato;
    cb.addEventListener('change', () => ctx.aggiorna((d) => { d.piano[k.id].prenotato = cb.checked; }));
    l.append(cb, document.createTextNode('Prenotato su Esse3'));
    row.append(l);
    if (!p.prenotato) {
      const scad = aggiungiGiorni(p.data, -doc.impostazioni.anticipoPrenotazione);
      row.append(el('span', 'muted', 'promemoria dal ' + fmtShort(scad)));
      row.append(link('Esse3 ↗', ESSE3));
    }
    card.append(row);
  }
  return card;
}

export function renderPiano(ctx) {
  const { corsi, doc } = ctx;
  const v = el('div', 'view');
  const head = el('div', 'stack');
  head.append(el('h2', 'section-title', 'Il mio piano appelli'));
  head.append(el('p', 'foot', 'Scegli l\'appello che vuoi fare per ogni materia. Con "Aggiungi al calendario" gli appelli scelti finiscono nel calendario del telefono, con i promemoria per prenotarti e per l\'esame.'));
  const azioni = el('div', 'row');
  azioni.append(btn('Aggiungi al calendario', 'primary', () => esportaCalendario(corsi, doc)));
  head.append(azioni);
  v.append(head);
  const a = bannerAvvisi(ctx);
  if (a) v.append(a);
  const daFare = corsi.filter((k) => +k.cfu_da_fare > 0 && votoEsito(doc.esami[k.id] || {}) == null)
    .sort((x, y) => {
      const dx = (doc.piano[x.id] || {}).data || '9999', dy = (doc.piano[y.id] || {}).data || '9999';
      return dx.localeCompare(dy) || (x.ordine || 0) - (y.ordine || 0);
    });
  const list = el('div', 'stack');
  list.append(...daFare.map((k) => riga(ctx, k)));
  v.append(list, impostazioni(ctx));
  return v;
}
