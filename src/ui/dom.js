// Small DOM helpers shared by all views.
export const $ = (id) => document.getElementById(id);

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function btn(label, cls, onClick, attrs = {}) {
  const b = el('button', 'btn' + (cls ? ' ' + cls : ''), label);
  b.type = 'button';
  for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

export function link(label, href, cls) {
  const a = el('a', cls, label);
  a.href = href; a.target = '_blank'; a.rel = 'noopener';
  return a;
}

export const fmt = (x, d = 2) => (x == null || !Number.isFinite(x)) ? '—'
  : x.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });

export function toast(msg) {
  let t = $('toast');
  if (!t) { t = el('div', 'toast'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}

export const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
export const MESI_L = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

/** "2027-01-14" → "gio 14 gen" */
export function fmtDate(s) {
  const d = new Date(s + 'T12:00:00');
  return GG[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()];
}

/** "2027-01-14" → "14/01" */
export const fmtShort = (s) => s.slice(8, 10) + '/' + s.slice(5, 7);

/** Local date as YYYY-MM-DD. */
export function oggiISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/**
 * Modal dialog. body: Node; actions: [{label, value, cls}]. Resolves to the chosen value
 * (or null when dismissed with Esc).
 */
export function chiedi(titolo, body, actions) {
  return new Promise((resolve) => {
    const d = el('dialog');
    d.append(el('h2', null, titolo));
    if (body) d.append(body);
    const row = el('div', 'row');
    for (const a of actions) row.append(btn(a.label, a.cls, () => { d.close(); resolve(a.value); }));
    d.append(row);
    d.addEventListener('cancel', () => resolve(null));
    d.addEventListener('close', () => d.remove());
    document.body.append(d);
    d.showModal();
  });
}

/** Trigger a download of text content. */
export function scarica(nome, testo, tipo) {
  const blob = new Blob([testo], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
