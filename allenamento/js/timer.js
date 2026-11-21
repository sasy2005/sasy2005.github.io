// Timer di tenuta (con 3 secondi per mettersi in posizione) e di recupero, con suono e vibrazione.
// Una sola barra in basso: un timer nuovo sostituisce quello in corso.

let ctx = null;
export function sbloccaAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* niente audio: resta la vibrazione */ }
}
export function beep(freq = 880, dur = 0.12, vol = 0.25) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = freq; o.type = 'sine';
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g).connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + dur);
}
const vibra = (p) => { try { navigator.vibrate?.(p); } catch { /* */ } };
const fine = () => { beep(660, 0.18); setTimeout(() => beep(990, 0.35), 200); vibra([200, 80, 200]); };

let wake = null;
export async function schermoAcceso(on) {
  try {
    if (on && !wake && 'wakeLock' in navigator) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    } else if (!on && wake) { await wake.release(); wake = null; }
  } catch { /* non supportato */ }
}

export const mmss = (s) => {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

let attivo = null;
const bar = () => document.getElementById('timer');

function disegna() {
  const el = bar();
  if (!attivo) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('con-timer'); return; }
  el.hidden = false;
  document.body.classList.add('con-timer');
  const { tipo, resto, totale, titolo, prep } = attivo;
  el.dataset.tipo = prep ? 'prep' : tipo;
  const pct = prep ? 0 : 100 * (1 - resto / totale);
  const label = prep ? 'Mettiti in posizione' : tipo === 'tenuta' ? 'Tenuta' : 'Recupero';
  el.innerHTML = `
    <div class="timer-prog" style="width:${pct}%"></div>
    <div class="timer-txt"><span class="timer-label">${label}</span><span class="timer-nome">${titolo}</span></div>
    <div class="timer-num" aria-live="off">${prep ? Math.ceil(attivo.prepResto) : mmss(resto)}</div>
    <div class="timer-act">
      ${tipo === 'recupero' ? '<button class="tbtn" data-t="-15" aria-label="Meno 15 secondi">−15</button><button class="tbtn" data-t="+15" aria-label="Più 15 secondi">+15</button><button class="tbtn main" data-t="skip">Salta</button>'
        : '<button class="tbtn main" data-t="stop">Stop</button>'}
    </div>`;
}

function tick() {
  if (!attivo) return;
  const now = performance.now();
  const dt = (now - attivo.last) / 1000;
  attivo.last = now;
  if (attivo.prep) {
    const prima = Math.ceil(attivo.prepResto);
    attivo.prepResto -= dt;
    if (Math.ceil(attivo.prepResto) !== prima && attivo.prepResto > 0) beep(520, 0.08);
    if (attivo.prepResto <= 0) { attivo.prep = false; beep(880, 0.2); vibra(80); }
  } else {
    const prima = Math.ceil(attivo.resto);
    attivo.resto -= dt;
    const ora = Math.ceil(attivo.resto);
    if (ora !== prima && ora <= 3 && ora > 0) beep(700, 0.08);
    if (attivo.resto <= 0) {
      const a = attivo; attivo = null; fine(); disegna(); a.alla?.(a.totale, true);
      return;
    }
  }
  disegna();
  attivo.raf = setTimeout(tick, 200);
}

function avvia(t) {
  ferma(false);
  sbloccaAudio();
  attivo = { ...t, resto: t.totale, last: performance.now() };
  disegna();
  attivo.raf = setTimeout(tick, 200);
}

/** Stop: per la tenuta registra i secondi fatti finora. */
export function ferma(registra = true) {
  if (!attivo) return;
  clearTimeout(attivo.raf);
  const a = attivo; attivo = null; disegna();
  if (registra && a.tipo === 'tenuta' && !a.prep) a.alla?.(Math.round(a.totale - a.resto), false);
}

export const tenuta = (sec, titolo, alla) => avvia({ tipo: 'tenuta', totale: sec, titolo, alla, prep: true, prepResto: 3 });
export const recupero = (sec, titolo, onCambia) => avvia({ tipo: 'recupero', totale: sec, titolo, onCambia });

export function installa() {
  bar().addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b || !attivo) return;
    const t = b.dataset.t;
    if (t === 'skip' || t === 'stop') { ferma(true); return; }
    const d = Number(t);
    attivo.totale = Math.max(15, attivo.totale + d);
    attivo.resto = Math.max(1, attivo.resto + d);
    attivo.onCambia?.(attivo.totale);
    disegna();
  });
}
