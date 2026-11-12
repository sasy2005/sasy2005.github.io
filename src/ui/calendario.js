// Exam calendar grouped by month (all published dates of the year).
import { el, fmtDate, link, MESI_L } from './dom.js';

const ESSE3 = 'https://s3w.si.unimib.it/esse3/auth/studente/Appelli/AppelliF.do';

export function renderCalendario({ corsi, doc }) {
  const sec = el('section', 'stack');
  sec.append(el('h2', 'section-title', 'Calendario appelli'));
  const p = el('p', 'foot');
  p.style.margin = '0';
  p.append(document.createTextNode('Appelli del turno A-L (per Diritto pubblico quelli di Benedetti), aggiornati ogni notte dal calendario esami Unimib. Ci si iscrive su '));
  const a = link('Segreterie online → Esami → Appelli', ESSE3); a.style.color = 'var(--fg)';
  p.append(a, document.createTextNode('.'));
  sec.append(p);

  const passato = (id) => !!(doc.esami[id] || {}).passato;
  const rows = [];
  for (const k of corsi) for (const ap of k.appelli || []) if (!ap.rimosso) rows.push({ k, ...ap });
  rows.sort((x, y) => (x.data + x.ora).localeCompare(y.data + y.ora));
  if (!rows.length) { sec.append(el('p', 'empty', 'Nessun appello pubblicato.')); return sec; }
  const byDay = {};
  for (const r of rows) if (!passato(r.k.id)) byDay[r.data] = (byDay[r.data] || 0) + 1;
  const months = {};
  for (const r of rows) (months[r.data.slice(0, 7)] ||= []).push(r);

  const cal = el('div', 'cal');
  for (const key of Object.keys(months)) {
    const m = el('div', 'cal-month');
    const [y, mm] = key.split('-');
    m.append(el('h3', null, MESI_L[+mm - 1] + ' ' + y));
    for (const r of months[key]) {
      const done = passato(r.k.id), clash = !done && byDay[r.data] > 1;
      const row = el('div', 'cal-row' + (clash ? ' clash' : '') + (done ? ' done' : ''));
      row.append(el('span', 'd', fmtDate(r.data) + ' ' + r.ora));
      const mid = el('span'); mid.append(el('b', null, r.k.materia));
      if (clash) { mid.append(document.createElement('br'), el('span', 'clash-note', 'Stesso giorno di un altro esame')); }
      row.append(mid, el('span', 'm', [r.tipo, r.aula].filter(Boolean).join(' · ')));
      m.append(row);
    }
    cal.append(m);
  }
  sec.append(cal);
  return sec;
}
