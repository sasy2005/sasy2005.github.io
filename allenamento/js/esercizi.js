// Illustrazioni degli esercizi: per ognuno le pose chiave (animate in loop) e l'attrezzatura.
// Si collegano agli esercizi della scheda per parole chiave nel nome (vedi illustrazione()).
import { FLOOR, ground, mat, INK, step, lerp, pt, f } from './figure.js';

const G = FLOOR;
const metal = '#5b6168';
const pad = '#3a3f45';

const quad = { t: 8, n: 0, fo: -90, a1: -90, e1: -90, a2: -90, e2: -90, l1: -90, k1: 180, f1: 180, l2: -90, k2: 180, f2: 180, x: 100 };
const supino = { t: 180, n: 180, fo: -90, x: 120 };
const noFace = { fo: 0, nf: 1 };

function cableMachine(x = 196) {
  return `<rect x="${x}" y="30" width="16" height="${G - 30}" rx="3" fill="#e8eaed" stroke="${INK}" stroke-width="1.6"/>` +
    `<rect x="${x + 3}" y="96" width="10" height="${G - 100}" fill="${metal}" opacity=".55"/>` +
    `<path d="M${x - 8} ${G} H${x + 24}" stroke="${INK}" stroke-width="3"/>`;
}
const pulley = (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`;
const cable = (a, b) => `<path d="M${pt(a)} L${pt(b)}" stroke="${INK}" stroke-width="1.2"/>`;
const handle = (p) => `<rect x="${f(p[0] - 2)}" y="${f(p[1] - 5)}" width="4" height="10" rx="2" fill="${metal}"/>`;
function dumbbell(p, ang = 0) {
  const a = step(p, ang, 7), b = step(p, ang + 180, 7);
  return `<path d="M${pt(a)} L${pt(b)}" stroke="${metal}" stroke-width="2.4"/>` +
    [a, b].map((q) => `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="4.5" fill="${pad}" stroke="${INK}" stroke-width="1.2"/>`).join('');
}
const bench = (x1, x2, top) =>
  `<rect x="${x1}" y="${top}" width="${x2 - x1}" height="7" rx="3" fill="${pad}" stroke="${INK}" stroke-width="1.4"/>` +
  `<path d="M${x1 + 8} ${top + 7} V${G} M${x2 - 8} ${top + 7} V${G}" stroke="${metal}" stroke-width="4"/>`;

export const SPEC = {
  'cat-cow': {
    alt: 'Quadrupedia: schiena tonda (gatto) e schiena inarcata (mucca)',
    scene: ground() + mat(40, 180),
    keys: [
      { p: { ...quad, c: 9, n: -40 }, hold: 600, move: 1300 },
      { p: { ...quad, c: -8, n: 30 }, hold: 600, move: 1300 },
    ],
  },
  '90-90': {
    alt: 'Seduto a terra con le gambe a 90-90, il busto si piega in avanti',
    scene: ground() + mat(40, 180),
    keys: [
      { p: { x: 100, t: 90, n: 90, l1: -5, k1: -150, f1: 190, l2: 195, k2: -120, f2: 180, a1: -70, e1: -60, a2: -110, e2: -100 }, hold: 700, move: 1300 },
      { p: { x: 100, t: 45, n: 30, c: 3, l1: -5, k1: -150, f1: 190, l2: 195, k2: -120, f2: 180, a1: -40, e1: -50, a2: -70, e2: -60 }, hold: 900, move: 1300 },
    ],
  },
  'hip-cars': {
    alt: 'Quadrupedia: il ginocchio disegna un cerchio ampio con l\'anca',
    scene: ground() + mat(40, 180),
    keys: [
      { p: { ...quad }, hold: 300, move: 900 },
      { p: { ...quad, l1: -40, k1: -150, f1: 180 }, hold: 300, move: 900 },
      { p: { ...quad, l1: -150, k1: 160, f1: 180 }, hold: 200, move: 900 },
      { p: { ...quad, l1: 170, k1: 95, f1: 180 }, hold: 400, move: 900 },
    ],
  },
  'cobra-mountain': {
    alt: 'Dal cobra (petto alto, anche a terra) alla montagna (anche in alto)',
    scene: ground() + mat(20, 200),
    keys: [
      { p: { x: 105, t: 32, n: 70, a1: -82, e1: -78, a2: -82, e2: -78, l1: 180, k1: 180, f1: 190, l2: 181, k2: 181, f2: 190 }, hold: 800, move: 1400 },
      { p: { x: 105, t: -42, n: -70, fo: -90, a1: -42, e1: -42, a2: -42, e2: -42, l1: -118, k1: -118, f1: -10, l2: -116, k2: -116, f2: -10 }, hold: 900, move: 1400 },
    ],
  },
  'ankle-cars': {
    alt: 'In piedi su una gamba, la caviglia disegna cerchi lenti',
    scene: ground() + `<rect x="168" y="20" width="10" height="${G - 20}" fill="#e8eaed" stroke="${INK}" stroke-width="1.4"/>`,
    keys: [
      { p: { x: 110, l1: 0, k1: -90, f1: 0, a1: 5, e1: 15, a2: 0, e2: 10 }, hold: 200, move: 700 },
      { p: { x: 110, l1: 0, k1: -90, f1: -55, a1: 5, e1: 15, a2: 0, e2: 10 }, hold: 200, move: 700 },
      { p: { x: 110, l1: 0, k1: -90, f1: -30, a1: 5, e1: 15, a2: 0, e2: 10 }, hold: 100, move: 700 },
      { p: { x: 110, l1: 0, k1: -90, f1: 30, a1: 5, e1: 15, a2: 0, e2: 10 }, hold: 200, move: 700 },
    ],
  },
  'curl-up': {
    alt: 'Supino, una gamba piegata, mani sotto la schiena: si stacca appena testa e spalle',
    scene: ground() + mat(20, 200),
    keys: [
      { p: { ...supino, l1: 0, k1: 0, f1: 85, l2: 50, k2: -60, f2: 0, a1: -3, e1: -2, a2: -3, e2: -2 }, hold: 700, move: 900 },
      { p: { ...supino, t: 168, n: 155, l1: 0, k1: 0, f1: 85, l2: 50, k2: -60, f2: 0, a1: -12, e1: -5, a2: -12, e2: -5 }, hold: 1100, move: 900 },
    ],
  },
  'bird-dog': {
    alt: 'Quadrupedia: braccio e gamba opposti si allungano, schiena ferma',
    scene: ground() + mat(30, 190),
    keys: [
      { p: { ...quad }, hold: 500, move: 1200 },
      { p: { ...quad, a2: 3, e2: 3, l1: 178, k1: 178, f1: 180 }, hold: 1100, move: 1200 },
    ],
  },
  deadbug: {
    alt: 'Supino a gambe e braccia in alto: braccio e gamba opposti scendono verso terra',
    scene: ground() + mat(20, 200),
    keys: [
      { p: { ...supino, x: 110, a1: 90, e1: 90, a2: 92, e2: 92, l1: 90, k1: 0, f1: 80, l2: 92, k2: 2, f2: 80 }, hold: 500, move: 1300 },
      { p: { ...supino, x: 110, a1: 90, e1: 90, a2: 165, e2: 168, l1: 8, k1: 6, f1: 80, l2: 92, k2: 2, f2: 80 }, hold: 900, move: 1300 },
    ],
  },
  'plank-laterale': {
    alt: 'Plank laterale sull\'avambraccio con le ginocchia piegate: le anche salgono e restano in linea',
    scene: ground() + mat(20, 200),
    keys: [
      { p: { ...noFace, an: 'el2', ax: 62, ay: G - 6, t: 152, c: -4, n: 150, a2: -90, e2: 180, a1: -30, e1: -150, l1: -4, k1: -8, f1: -10, l2: -6, k2: -10, f2: -10 }, hold: 700, move: 1100 },
      { p: { ...noFace, an: 'el2', ax: 62, ay: G - 6, t: 163, c: 0, n: 160, a2: -90, e2: 180, a1: -40, e1: -160, l1: -11, k1: -8, f1: -10, l2: -12, k2: -9, f2: -10 }, hold: 1800, move: 1100 },
    ],
  },
  'rotary-stability': {
    alt: 'Quadrupedia con ginocchia sollevate da terra: braccio e gamba opposti si allungano senza ruotare il bacino',
    scene: ground() + mat(30, 190),
    keys: [
      { p: { ...quad, l1: -95, k1: 195, f1: -120, l2: -95, k2: 195, f2: -120 }, hold: 600, move: 1100 },
      { p: { ...quad, a2: 8, e2: 8, l1: 175, k1: 175, f1: 180, l2: -95, k2: 195, f2: -120 }, hold: 1000, move: 1100 },
    ],
  },
  'leg-extension': {
    alt: 'Leg extension: sali con due gambe, tieni esteso con una gamba sola, scendi con due',
    scene: ground() + `<rect x="58" y="44" width="9" height="58" rx="4" fill="${pad}" stroke="${INK}" stroke-width="1.4"/>` +
      `<rect x="62" y="100" width="66" height="9" rx="4" fill="${pad}" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M70 109 V${G} M120 109 V${G} M58 ${G} H138" stroke="${metal}" stroke-width="4"/>`,
    props: (j) => {
      const c = j.an1;
      return { front: `<circle cx="${f(c[0] + 2)}" cy="${f(c[1] - 1)}" r="5.5" fill="${pad}" stroke="${INK}" stroke-width="1.4"/>` +
        `<path d="M${pt(j.kn1)} L${f(c[0] + 2)} ${f(c[1] - 1)}" stroke="${metal}" stroke-width="1.5" opacity=".0"/>` };
    },
    keys: [
      { p: { an: 'hip', ax: 72, ay: 92, t: 98, n: 95, a1: -95, e1: -10, a2: -95, e2: -10, l1: 0, k1: -88, f1: 0, l2: 2, k2: -86, f2: 0 }, hold: 500, move: 900 },
      { p: { an: 'hip', ax: 72, ay: 92, t: 98, n: 95, a1: -95, e1: -10, a2: -95, e2: -10, l1: 0, k1: 0, f1: 85, l2: 2, k2: 2, f2: 87 }, hold: 300, move: 600 },
      { p: { an: 'hip', ax: 72, ay: 92, t: 98, n: 95, a1: -95, e1: -10, a2: -95, e2: -10, l1: 0, k1: 0, f1: 85, l2: 2, k2: -86, f2: 0 }, hold: 1900, move: 600 },
      { p: { an: 'hip', ax: 72, ay: 92, t: 98, n: 95, a1: -95, e1: -10, a2: -95, e2: -10, l1: 0, k1: 0, f1: 85, l2: 2, k2: 2, f2: 87 }, hold: 200, move: 900 },
    ],
  },
  'straight-leg-bridge': {
    alt: 'Supino con i talloni sul foam roller e gambe tese: spingi e solleva il bacino',
    scene: ground() + mat(20, 150) + `<circle cx="176" cy="${G - 8}" r="8" fill="#f2a65a" stroke="${INK}" stroke-width="1.5"/>`,
    keys: [
      { p: { ...supino, an: 'an1', ax: 174, ay: G - 20, l1: 12, k1: 12, f1: 70, l2: 13, k2: 13, f2: 70, a1: -2, e1: -2, a2: -2, e2: -2 }, hold: 600, move: 1100 },
      { p: { ...supino, an: 'an1', ax: 174, ay: G - 20, t: 203, n: 197, l1: -8, k1: -8, f1: 60, l2: -7, k2: -7, f2: 60, a1: -18, e1: -12, a2: -18, e2: -12 }, hold: 1500, move: 1100 },
    ],
  },
  'knee-extension-band': {
    alt: 'In piedi con l\'elastico dietro al ginocchio: distendi il ginocchio contro l\'elastico e tieni 3 secondi',
    scene: ground() + `<rect x="190" y="70" width="12" height="${G - 70}" fill="#e8eaed" stroke="${INK}" stroke-width="1.4"/>`,
    props: (j) => {
      const k = [j.kn1[0] - 4, j.kn1[1]];
      return { front: `<path d="M190 ${f(j.kn1[1] - 3)} L${pt(k)} L190 ${f(j.kn1[1] + 3)}" stroke="#e5484d" stroke-width="2.2"/>` };
    },
    keys: [
      { p: { x: 108, t: 92, l1: -68, k1: -112, f1: 0, l2: -100, k2: -100, f2: 0, a1: -60, e1: -150, a2: -60, e2: -150 }, hold: 500, move: 900 },
      { p: { x: 106, t: 90, l1: -90, k1: -90, f1: 0, l2: -100, k2: -100, f2: 0, a1: -60, e1: -150, a2: -60, e2: -150 }, hold: 1300, move: 900 },
    ],
  },
  'glute-bridge-heels-up': {
    alt: 'Ponte glutei con i talloni sollevati: resta sulle punte e solleva il bacino',
    scene: ground() + mat(20, 200),
    keys: [
      { p: { ...supino, an: 'sh', ax: 70, ay: G - 8, l1: 42, k1: -40, f1: -42, l2: 44, k2: -42, f2: -42, a1: 0, e1: 0, a2: 0, e2: 0 }, hold: 500, move: 1000 },
      { p: { ...supino, an: 'sh', ax: 70, ay: G - 8, t: 210, n: 182, l1: 12, k1: -70, f1: -42, l2: 14, k2: -68, f2: -42, a1: -18, e1: -8, a2: -18, e2: -8 }, hold: 900, move: 1000 },
    ],
  },
  'clam-shell': {
    alt: 'Sul fianco con la schiena al muro e le ginocchia piegate: apri il ginocchio di sopra tenendo i piedi uniti',
    scene: `<rect x="10" y="40" width="200" height="${G - 40}" fill="#eef0f2"/>` + ground() + mat(20, 200),
    keys: [
      { p: { ...noFace, x: 110, t: 180, n: 172, c: 0, a2: 110, e2: 20, a1: -10, e1: -60, l1: -28, k1: -150, f1: 180, l2: -32, k2: -152, f2: 180 }, hold: 500, move: 900 },
      { p: { ...noFace, x: 110, t: 180, n: 172, c: 0, a2: 110, e2: 20, a1: -10, e1: -60, l1: 18, k1: -118, f1: 200, l2: -32, k2: -152, f2: 180 }, hold: 900, move: 900 },
    ],
  },
  'adductor-plank': {
    alt: 'Plank laterale adduttori: gamba di sopra sulla panca, avambraccio a terra, solleva le anche',
    scene: ground() + mat(20, 150) + bench(150, 212, G - 26),
    keys: [
      { p: { ...noFace, an: 'an1', ax: 175, ay: G - 31, t: 160, n: 158, a2: -90, e2: 180, a1: -20, e1: -160, l1: 23.7, k1: 23.7, f1: 10, l2: -10, k2: -5, f2: 0 }, hold: 600, move: 1100 },
      { p: { ...noFace, an: 'an1', ax: 175, ay: G - 31, t: 184, n: 182, a2: -90, e2: 180, a1: -40, e1: -170, l1: 4, k1: 4, f1: 0, l2: -50, k2: -10, f2: 0 }, hold: 1800, move: 1100 },
    ],
  },
  'hk-cable-row': {
    alt: 'In ginocchio su una gamba davanti al cavo: abbassa la spalla e tira il cavo verso di te',
    scene: ground() + cableMachine() + pulley(196, 82),
    props: (j) => ({ front: cable([196, 82], j.wr1) + handle(j.wr1) }),
    keys: [
      { p: { x: 92, t: 92, n: 90, l1: 0, k1: -90, f1: 0, l2: -90, k2: 180, f2: 182, a1: 12, e1: 8, a2: 12, e2: 8 }, hold: 500, move: 1000 },
      { p: { x: 92, t: 92, n: 90, l1: 0, k1: -90, f1: 0, l2: -90, k2: 180, f2: 182, a1: -140, e1: 5, a2: -140, e2: 5 }, hold: 800, move: 1000 },
    ],
  },
  'external-rotation-walkout': {
    alt: 'Fianco al cavo, gomito attaccato al busto e avambraccio in fuori: allontanati di lato e torna',
    scene: ground() + `<rect x="8" y="30" width="16" height="${G - 30}" rx="3" fill="#e8eaed" stroke="${INK}" stroke-width="1.6"/>` + pulley(24, 96),
    props: (j) => ({ front: cable([24, 96], j.wr2) + handle(j.wr2) }),
    keys: [
      { p: { ...noFace, x: 85, sw: 10, hw: 5, tw: 24, a2: -92, e2: 175, a1: -88, e1: -80, l1: -88, k1: -90, f1: 0, l2: -92, k2: -90, f2: 180 }, hold: 400, move: 1200 },
      { p: { ...noFace, x: 140, sw: 10, hw: 5, tw: 24, a2: -92, e2: 175, a1: -88, e1: -80, l1: -88, k1: -90, f1: 0, l2: -92, k2: -90, f2: 180 }, hold: 1100, move: 1200 },
    ],
  },
  'rematore-manubrio': {
    alt: 'Rematore con manubrio in tre appoggi: mano e ginocchio sulla panca, tira il manubrio verso il fianco',
    scene: ground() + bench(70, 160, 104),
    props: (j) => ({ front: dumbbell(j.wr1, 0) }),
    keys: [
      { p: { x: 92, t: 8, n: 0, a2: -90, e2: -90, l2: -92, k2: 180, f2: 180, l1: -98, k1: -94, f1: 0, a1: -90, e1: -90 }, hold: 500, move: 900 },
      { p: { x: 92, t: 8, n: 0, a2: -90, e2: -90, l2: -92, k2: 180, f2: 180, l1: -98, k1: -94, f1: 0, a1: 175, e1: -88 }, hold: 700, move: 900 },
    ],
  },
  't-raise': {
    alt: 'T raise: busto piegato in avanti, braccia aperte a T con i pollici in su, tieni la posizione',
    scene: ground(),
    keys: [
      { p: { ...noFace, x: 110, sw: 10, hw: 5, tw: 24, a1: -95, e1: -95, a2: -85, e2: -85, l1: -88, k1: -90, f1: 0, l2: -92, k2: -90, f2: 180 }, hold: 500, move: 1100 },
      { p: { ...noFace, x: 110, sw: 10, hw: 5, tw: 24, a1: -2, e1: 0, a2: 182, e2: 180, l1: -88, k1: -90, f1: 0, l2: -92, k2: -90, f2: 180 }, hold: 1800, move: 1100 },
    ],
  },
};

// Parole chiave -> illustrazione. Il primo che corrisponde vince.
const REGOLE = [
  [/cat.?cow|gatto/, 'cat-cow'],
  [/90.?90/, '90-90'],
  [/hip.?cars?/, 'hip-cars'],
  [/cobra|mountain/, 'cobra-mountain'],
  [/ankle|caviglia/, 'ankle-cars'],
  [/curl.?up/, 'curl-up'],
  [/bird.?dog/, 'bird-dog'],
  [/dead.?bug/, 'deadbug'],
  [/plank.*lat|side.?plank|plank laterale/, 'plank-laterale'],
  [/rotary/, 'rotary-stability'],
  [/leg.?extension/, 'leg-extension'],
  [/straight.*bridge|bridge.*roller/, 'straight-leg-bridge'],
  [/knee.?extension|band.*knee/, 'knee-extension-band'],
  [/glute.?bridge|ponte/, 'glute-bridge-heels-up'],
  [/clam/, 'clam-shell'],
  [/adductor|adduttor|copenhagen/, 'adductor-plank'],
  [/row|rematore/, null], // decided below
  [/external.?rotation|extrarotazion/, 'external-rotation-walkout'],
  [/t.?raise/, 't-raise'],
];

export function illustrazione(nome) {
  const n = String(nome).toLowerCase();
  if (/rematore|dumbbell row|manubri/.test(n)) return SPEC['rematore-manubrio'];
  if (/cable.?s? row|hk.*row/.test(n)) return SPEC['hk-cable-row'];
  for (const [re, key] of REGOLE) if (key && re.test(n)) return SPEC[key];
  return null;
}
