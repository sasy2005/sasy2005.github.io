// Disegno degli esercizi: un omino in SVG (maglia verde, pantaloncini grigi, contorno scuro)
// definito da angoli dei segmenti. Due o più pose per esercizio, animate in loop come una GIF.
//
// Angoli in gradi, convenzione matematica: 0 = verso destra, 90 = verso l'alto.
// Posa: t tronco (anca -> spalle), c curvatura schiena (+ = schiena tonda), n collo/testa,
// a1/e1 braccio/avambraccio vicino, a2/e2 lontano, l1/k1/f1 coscia/tibia/piede vicini, l2/k2/f2 lontani,
// fo verso del viso rispetto al collo (-90 = guarda avanti se rivolto a destra),
// sw/hw mezza larghezza spalle/anche (viste frontali), tw spessore tronco.
// Posizione: an = articolazione da fissare in (ax, ay); altrimenti (x, y) è l'anca e
// la figura viene appoggiata al pavimento (gy) col punto più basso.

export const FLOOR = 142;
const L = { t: 40, neck: 5, head: 8.5, ua: 19, fa: 18, th: 25, sh: 24, ft: 9 };
const INK = '#26282b';
const SHIRT = '#7cb342';
const SHIRT_FAR = '#5f8f2f';
const SHORTS = '#8b8f94';
const SHORTS_FAR = '#6d7176';
const SKIN = '#ffffff';
const SKIN_FAR = '#e3e5e8';

export const BASE = {
  x: 100, y: 90, t: 90, c: 0, n: 90, fo: -90,
  a1: -90, e1: -90, a2: -90, e2: -90,
  l1: -90, k1: -90, f1: 0, l2: -90, k2: -90, f2: 0,
  sw: 0, hw: 0, tw: 17,
};

const rad = (d) => (d * Math.PI) / 180;
const step = (p, ang, len) => [p[0] + Math.cos(rad(ang)) * len, p[1] - Math.sin(rad(ang)) * len];
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];

/** Joint positions for a pose (unanchored, hip at x,y). */
function joints(P) {
  const hip = [P.x, P.y];
  const sh = step(hip, P.t, L.t);
  const dir = [Math.cos(rad(P.t)), -Math.sin(rad(P.t))];
  const perp = [-dir[1], dir[0]]; // 90° in svg space
  // Spine control point: bulge on the back side (left of the hip->shoulder direction).
  const mid = [(hip[0] + sh[0]) / 2, (hip[1] + sh[1]) / 2];
  const left = [dir[1], -dir[0]];
  const ctrl = [mid[0] + left[0] * P.c, mid[1] + left[1] * P.c];
  const shN = add(sh, [perp[0] * P.sw, perp[1] * P.sw]);
  const shF = add(sh, [-perp[0] * P.sw, -perp[1] * P.sw]);
  const hipN = add(hip, [perp[0] * P.hw, perp[1] * P.hw]);
  const hipF = add(hip, [-perp[0] * P.hw, -perp[1] * P.hw]);
  const neck = step(sh, P.n, L.neck);
  const head = step(neck, P.n, L.head + 1);
  const el1 = step(shN, P.a1, L.ua), wr1 = step(el1, P.e1, L.fa);
  const el2 = step(shF, P.a2, L.ua), wr2 = step(el2, P.e2, L.fa);
  const kn1 = step(hipN, P.l1, L.th), an1 = step(kn1, P.k1, L.sh), to1 = step(an1, P.f1, L.ft);
  const kn2 = step(hipF, P.l2, L.th), an2 = step(kn2, P.k2, L.sh), to2 = step(an2, P.f2, L.ft);
  return { hip, sh, ctrl, shN, shF, hipN, hipF, neck, head, el1, wr1, el2, wr2, kn1, an1, to1, kn2, an2, to2 };
}

const POINTS = ['hip', 'sh', 'shN', 'shF', 'head', 'el1', 'wr1', 'el2', 'wr2', 'kn1', 'an1', 'to1', 'kn2', 'an2', 'to2'];
const RADIUS = { head: L.head + 1, sh: 8, shN: 7, shF: 7, hip: 8 };

export function posa(P) {
  P = { ...BASE, ...P };
  const j = joints(P);
  let dx = 0, dy = 0;
  if (P.an) {
    dx = P.ax - j[P.an][0];
    dy = P.ay - j[P.an][1];
  } else {
    let low = -Infinity;
    for (const k of POINTS) low = Math.max(low, j[k][1] + (RADIUS[k] ?? 4.5));
    dy = (P.gy ?? FLOOR) - low;
  }
  for (const k of Object.keys(j)) j[k] = [j[k][0] + dx, j[k][1] + dy];
  return { j, P };
}

const f = (n) => n.toFixed(1);
const pt = (p) => `${f(p[0])} ${f(p[1])}`;
function seg(pts, color, w, cls = '') {
  const d = 'M' + pts.map(pt).join(' L');
  return `<path d="${d}" stroke="${INK}" stroke-width="${w + 3}" ${cls}/>` +
    `<path d="${d}" stroke="${color}" stroke-width="${w}"/>`;
}
function curve(a, c, b, color, w) {
  const d = `M${pt(a)} Q${pt(c)} ${pt(b)}`;
  return `<path d="${d}" stroke="${INK}" stroke-width="${w + 3}"/><path d="${d}" stroke="${color}" stroke-width="${w}"/>`;
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function leg(j, n, far) {
  const hip = far ? j.hipF : j.hipN;
  const kn = j['kn' + n], an = j['an' + n], to = j['to' + n];
  const skin = far ? SKIN_FAR : SKIN;
  const shorts = far ? SHORTS_FAR : SHORTS;
  return seg([hip, kn, an], skin, 9) +
    seg([hip, lerp(hip, kn, 0.55)], shorts, 11) +
    seg([lerp(an, to, -0.15), to], far ? '#d5d8dc' : '#f4f5f6', 6);
}
function arm(j, n, far) {
  const sh = far ? j.shF : j.shN;
  const el = j['el' + n], wr = j['wr' + n];
  return seg([sh, el, wr], far ? SHIRT_FAR : SHIRT, 8) +
    `<circle cx="${f(wr[0])}" cy="${f(wr[1])}" r="3.6" fill="${far ? SKIN_FAR : SKIN}" stroke="${INK}" stroke-width="1.5"/>`;
}
function head(j, P) {
  const face = P.n + P.fo;
  const nose = step(j.head, face, L.head + 0.6);
  const back = step(j.head, face + 180, L.head * 0.25);
  const ball = seg([j.sh, j.neck], SKIN, 6) +
    `<circle cx="${f(j.head[0])}" cy="${f(j.head[1])}" r="${L.head}" fill="${SKIN}" stroke="${INK}" stroke-width="1.5"/>`;
  if (P.nf) return ball; // vista frontale: niente naso
  return ball +
    `<circle cx="${f(nose[0])}" cy="${f(nose[1])}" r="1.6" fill="${SKIN}" stroke="${INK}" stroke-width="1.2"/>` +
    `<path d="M${pt(step(back, face + 90, 3))} A3 3 0 0 1 ${pt(step(back, face - 90, 3))}" stroke="${INK}" stroke-width="1" opacity=".5"/>`;
}

/** SVG markup for one frame. props: (j, P) => { back, front } */
export function frame(P, props) {
  const { j, P: Q } = posa(P);
  const pr = props ? props(j, Q) : {};
  const w = Q.tw;
  const torso = curve(j.hip, j.ctrl, j.sh, SHIRT, w);
  const waist = seg([j.hip, step(j.hip, Q.t, 6)], SHORTS, w + 1);
  const hips = Q.hw ? seg([j.hipN, j.hipF], SHORTS, 12) : '';
  const order = Q.order || 'normal';
  const parts = [
    pr.back || '',
    leg(j, 2, true), arm(j, 2, true),
    torso, waist, hips,
    pr.mid || '',
    order === 'armsBehind' ? arm(j, 1, false) + leg(j, 1, false) : leg(j, 1, false),
    head(j, Q),
    order === 'armsBehind' ? '' : arm(j, 1, false),
    pr.front || '',
  ];
  return parts.join('');
}

export const ground = (x1 = 6, x2 = 214, y = FLOOR) =>
  `<path d="M${x1} ${y} H${x2}" stroke="#c9cdd2" stroke-width="2"/>`;
export const mat = (x1, x2, y = FLOOR) =>
  `<rect x="${x1}" y="${y - 3}" width="${x2 - x1}" height="4" rx="2" fill="#b9d3e8" stroke="${INK}" stroke-width="1.2"/>`;
export { INK, SHIRT, step, lerp, pt, f };

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function mix(A, B, t) {
  const out = { ...A };
  for (const k of Object.keys(B)) {
    if (typeof B[k] === 'number' && typeof A[k] === 'number') out[k] = A[k] + (B[k] - A[k]) * t;
    else out[k] = t < 0.5 ? A[k] : B[k];
  }
  return out;
}

/** Fill every keyframe with the same keys so tweening never jumps. */
function normalizza(keys) {
  const all = new Set();
  for (const k of keys) for (const p of Object.keys(k.p)) all.add(p);
  return keys.map((k) => {
    const p = { ...BASE, ...k.p };
    for (const name of all) if (!(name in p)) p[name] = keys[0].p[name];
    return { ...k, p };
  });
}

/** Pose at time ms in a looping animation. Keyframe: { p, hold, move } */
export function poseAt(spec, ms) {
  const keys = normalizza(spec.keys);
  const dur = keys.map((k) => (k.hold ?? 700) + (k.move ?? 900));
  const tot = dur.reduce((a, b) => a + b, 0);
  let t = ms % tot;
  for (let i = 0; i < keys.length; i++) {
    const hold = keys[i].hold ?? 700;
    if (t < hold) return keys[i].p;
    t -= hold;
    const move = keys[i].move ?? 900;
    if (t < move) return mix(keys[i].p, keys[(i + 1) % keys.length].p, ease(t / move));
    t -= move;
  }
  return keys[0].p;
}

export function svg(spec, P, extra = '') {
  return `<svg viewBox="0 16 220 132" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${spec.alt || ''}">` +
    (spec.scene || ground()) + frame(P, spec.props) + extra + '</svg>';
}

/** Animate spec into element el. Returns stop(). */
export function anima(el, spec) {
  let raf = 0;
  const t0 = performance.now();
  const stilla = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = (now) => {
    el.innerHTML = svg(spec, poseAt(spec, now - t0));
    if (!stilla) raf = requestAnimationFrame(tick);
  };
  tick(t0);
  return () => cancelAnimationFrame(raf);
}
