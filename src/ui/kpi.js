import { el, fmt } from './dom.js';
import { stats, baseLaurea } from '../calc.js';

function kpi(label, value, sub, main) {
  const k = el('div', 'kpi' + (main ? ' main' : ''));
  k.append(el('span', 'kpi-label', label), el('span', 'kpi-value', value), el('span', 'kpi-sub', sub));
  return k;
}

export function renderKpi({ corsi, doc }) {
  const s = stats(corsi, doc.esami);
  const sec = el('section', 'kpis');
  sec.setAttribute('aria-label', 'Riepilogo');
  sec.append(
    kpi('Media ponderata', fmt(s.media), s.cfuMedia ? 'su ' + s.cfuMedia + ' CFU registrati' : 'su CFU registrati', true),
    kpi('Con le stime dei parziali', fmt(s.mediaStima),
      s.cfuStima > s.cfuMedia ? 'include ' + (s.cfuStima - s.cfuMedia) + ' CFU stimati' : 'nessun parziale inserito'),
    kpi('Base di laurea', s.media == null ? '—' : fmt(baseLaurea(s.media), 1), 'media × 110 / 30'),
  );
  const c = kpi('CFU acquisiti', s.acq + ' / ' + s.tot, s.nDone + ' di ' + s.nTodo + ' esami passati');
  const bar = el('div', 'bar'); const fill = el('span');
  fill.style.width = s.tot ? Math.round(100 * s.acq / s.tot) + '%' : '0';
  bar.append(fill); c.append(bar);
  sec.append(c);
  return sec;
}
