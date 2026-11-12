// "Simulatore" tab: target average → grade needed; hypothetical grades → simulated average.
import { el, btn, fmt } from './dom.js';
import { votoNecessario, simula } from '../simulatore.js';
import { baseLaurea, votoEsito } from '../calc.js';

const VOTI = Array.from({ length: 13 }, (_, i) => 18 + i);
const num = (s) => parseFloat(String(s).replace(',', '.'));

function messaggio(r, obiettivo) {
  const x = fmt(obiettivo, obiettivo % 1 ? 1 : 0);
  if (r.stato === 'nessun-esame') return ['Non ci sono esami da simulare.', ''];
  if (r.stato === 'irraggiungibile') return ['Con i voti fissati non arrivi a ' + x + ': servirebbe più di 30 di media.', 'warn'];
  if (r.stato === 'garantito') return ['Arrivi a ' + x + ' anche col 18 in tutti gli esami rimasti.', 'ok'];
  return ['Ti serve in media ' + fmt(r.voto, 1) + ' negli esami che restano (' + r.cfuRimasti + ' CFU).', ''];
}

export function renderSimulatore(ctx) {
  const { corsi, doc } = ctx;
  const v = el('div', 'view');
  const intro = el('div', 'stack');
  intro.append(el('h2', 'section-title', 'Cosa mi serve'));
  intro.append(el('p', 'foot', 'Simulazione: i voti che metti qui non cambiano mai la media vera. Contano i riconosciuti LIUC, gli esami passati e i voti ipotetici; per le integrazioni il voto pesa solo sui CFU da integrare.'));
  v.append(intro);

  // 1. Target → grade needed
  const p1 = el('section', 'panel');
  p1.append(el('h3', null, 'Dove vuoi arrivare'));
  const row = el('div', 'row');
  const lab = el('label', 'row sim-target', 'Media obiettivo');
  const inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.size = 5; inp.placeholder = 'es. 27';
  inp.value = doc.obiettivo != null ? String(doc.obiettivo).replace('.', ',') : '';
  inp.setAttribute('aria-label', 'Media obiettivo');
  const salvaObiettivo = () => {
    const x = num(inp.value);
    const val = inp.value.trim() === '' ? null : (x >= 18 && x <= 30 ? Math.round(x * 2) / 2 : undefined);
    if (val === undefined) { ris.replaceChildren(el('p', 'note', 'Scrivi una media tra 18 e 30.')); return; }
    ctx.aggiorna((d) => { d.obiettivo = val; });
  };
  inp.addEventListener('change', salvaObiettivo);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
  lab.append(inp); row.append(lab);
  p1.append(row);
  const ris = el('div', 'stack');
  if (doc.obiettivo != null) {
    const r = votoNecessario(corsi, doc.esami, doc.ipotesi, doc.obiettivo);
    const [testo, tono] = messaggio(r, doc.obiettivo);
    const b = el('div', 'banner' + (tono === 'warn' ? ' warn' : ''));
    if (r.stato === 'ok') { b.append(el('b', 'big', fmt(r.voto, 1))); }
    b.append(el('span', null, testo));
    b.append(el('span', 'muted', 'Con una media di ' + fmt(doc.obiettivo, doc.obiettivo % 1 ? 1 : 0) + ' la base di laurea è ' + fmt(baseLaurea(doc.obiettivo), 1) + ' su 110.'));
    ris.append(b);
  } else {
    ris.append(el('p', 'muted', 'Scrivi la media a cui vuoi arrivare: ti dico che voto serve negli esami che restano e che base di laurea avresti.'));
  }
  p1.append(ris);
  v.append(p1);

  // 2. Hypothetical grades → simulated average
  const p2 = el('section', 'panel');
  p2.append(el('h3', null, 'Prova dei voti'));
  const daFare = corsi.filter((k) => +k.cfu_da_fare > 0 && votoEsito(doc.esami[k.id] || {}) == null);
  if (!daFare.length) p2.append(el('p', 'muted', 'Hai già un voto in tutti gli esami.'));
  const list = el('div', 'stack');
  for (const k of daFare) {
    const r = el('label', 'sim-row');
    const nome = el('span', null, k.materia);
    nome.append(el('small', 'muted', ' · ' + k.cfu_da_fare + ' CFU'));
    const sel = el('select'); sel.setAttribute('aria-label', 'Voto ipotetico ' + k.materia);
    sel.append(new Option('—', ''));
    for (const x of VOTI) { const o = new Option(String(x), String(x)); o.selected = +doc.ipotesi[k.id] === x; sel.append(o); }
    sel.addEventListener('change', () => ctx.aggiorna((d) => {
      if (sel.value) d.ipotesi[k.id] = +sel.value; else delete d.ipotesi[k.id];
    }));
    r.append(nome, sel);
    list.append(r);
  }
  p2.append(list);
  const s = simula(corsi, doc.esami, doc.ipotesi);
  const res = el('div', 'kpis');
  const k1 = el('div', 'kpi main'); k1.append(el('span', 'kpi-label', 'Media simulata'), el('span', 'kpi-value', fmt(s.media)), el('span', 'kpi-sub', 'su ' + s.cfu + ' CFU'));
  const k2 = el('div', 'kpi'); k2.append(el('span', 'kpi-label', 'Base di laurea'), el('span', 'kpi-value', s.media == null ? '—' : fmt(s.base, 1)), el('span', 'kpi-sub', 'media × 110 / 30'));
  res.append(k1, k2);
  p2.append(res);
  if (Object.keys(doc.ipotesi).length) p2.append(btn('Azzera i voti ipotetici', 'link', () => ctx.aggiorna((d) => { d.ipotesi = {}; })));
  v.append(p2);
  return v;
}
