// Grafici a linee in SVG, disegnati sulla larghezza reale del contenitore, con mirino e tooltip.
// series: [{ nome, cls, punti: [y|null per ogni x] }], x: etichette (date), yMax, rif: { y, label }

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function lineChart(box, { series, x, yMax, yMin = 0, unita = '', rif = null, dettagli = null }) {
  const W = Math.max(280, box.clientWidth || 320), H = 210;
  const m = { l: 34, r: series.length > 1 ? 74 : 16, t: 14, b: 26 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const n = x.length;
  const X = (i) => m.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const Y = (v) => m.t + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;
  const ticks = niceTicks(yMin, yMax);

  let s = `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">`;
  for (const t of ticks) {
    s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/>` +
      `<text class="tick" x="${m.l - 6}" y="${Y(t) + 4}" text-anchor="end">${t}</text>`;
  }
  if (rif) {
    s += `<line class="rif" x1="${m.l}" x2="${W - m.r}" y1="${Y(rif.y)}" y2="${Y(rif.y)}"/>` +
      `<text class="rif-label" x="${W - m.r}" y="${Y(rif.y) - 5}" text-anchor="end">${esc(rif.label)}</text>`;
  }
  const passo = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 56))));
  x.forEach((lab, i) => {
    if (i % passo === 0 || i === n - 1) s += `<text class="tick" x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(lab)}</text>`;
  });
  const endLabels = [];
  for (const se of series) {
    let d = '', open = false;
    se.punti.forEach((v, i) => {
      if (v == null) { open = false; return; }
      d += (open ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1);
      open = true;
    });
    s += `<path class="line ${se.cls}" d="${d}"/>`;
    se.punti.forEach((v, i) => {
      if (v != null) s += `<circle class="dot ${se.cls}" cx="${X(i)}" cy="${Y(v)}" r="${n > 30 ? 2.5 : 4}"/>`;
    });
    const last = se.punti.map((v, i) => [v, i]).filter(([v]) => v != null).pop();
    if (last && series.length > 1) endLabels.push({ y: Y(last[0]), x: X(last[1]), nome: se.nome });
  }
  // Etichette dirette a fine linea, distanziate se si sovrappongono.
  endLabels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i++) if (endLabels[i].y - endLabels[i - 1].y < 14) endLabels[i].y = endLabels[i - 1].y + 14;
  for (const l of endLabels) s += `<text class="end-label" x="${l.x + 8}" y="${l.y + 4}">${esc(l.nome)}</text>`;
  s += `<line class="cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>`;
  s += `<rect class="hit" x="${m.l - 10}" y="0" width="${iw + 20}" height="${H}" fill="transparent"/></svg>`;
  box.innerHTML = s + '<div class="tip" hidden></div>';

  const svg = box.querySelector('svg'), tip = box.querySelector('.tip'), cross = box.querySelector('.cross');
  const mostra = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ev.clientX - r.left;
    let i = n <= 1 ? 0 : Math.round(((px - m.l) / iw) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
    const righe = series.map((se) => `<div><i class="sw ${se.cls}"></i>${esc(se.nome)}: <b>${se.punti[i] == null ? '–' : se.punti[i] + unita}</b></div>`).join('');
    tip.innerHTML = `<div class="tip-x">${esc(x[i])}</div>${righe}${dettagli ? dettagli(i) : ''}`;
    tip.hidden = false;
    const left = Math.min(Math.max(0, X(i) - tip.offsetWidth / 2), W - tip.offsetWidth);
    tip.style.left = left + 'px';
  };
  svg.addEventListener('pointermove', mostra);
  svg.addEventListener('pointerdown', mostra);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
}

function niceTicks(a, b) {
  const span = b - a || 1;
  const raw = span / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(2));
  return out;
}

export function legenda(series) {
  return `<div class="legend">${series.map((s) => `<span><i class="sw ${s.cls}"></i>${esc(s.nome)}</span>`).join('')}</div>`;
}
export { NS };
