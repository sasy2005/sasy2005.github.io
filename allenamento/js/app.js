// App "Allenamento": scheda del preparatore, registrazione della seduta, dolore al ginocchio, statistiche.
import * as store from './store.js';
import * as timer from './timer.js';
import { illustrazione } from './esercizi.js';
import { anima, svg, poseAt } from './figure.js';
import { daExcel, videoId } from './scheda.js';
import { lineChart, legenda } from './grafici.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oggiISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const dataBreve = (iso) => new Date(iso + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const dataLunga = (iso) => new Date(iso + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const giorniTra = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
const numero = (s) => { const m = String(s ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };

let tab = 'oggi';
const aperti = new Set();
const animazioni = new Map();
let syncStato = { pronto: false, utente: null };
let sync = null;
let anteprimaScheda = null;

// ---------- dati di comodo ----------
const corrente = () => { const s = store.get(); return s.corrente ? s.sedute[s.corrente] : null; };
const senzaCarico = (blocco) => /mobilit|core/i.test(blocco.nome);
const unita = (es) => (es.tenuta ? 'sec' : 'rip');

function datiEs(sed, id) {
  return sed?.es?.[id] || { serie: [], dolore: null, rpe: null, nota: '' };
}
function fatte(sed, es) {
  return datiEs(sed, es.id).serie.filter((x) => x?.ok).length;
}
/** Ultima seduta conclusa (o diversa da quella in corso) con dati per l'esercizio. */
function ultimaVolta(id, escludi) {
  const lista = store.seduteOrdinate().filter((s) => s.id !== escludi && s.es?.[id]?.serie?.some((x) => x?.ok));
  const s = lista.pop();
  return s ? { data: s.data, ...s.es[id] } : null;
}
const obiettivo = (es) => es.tenuta || numero(es.reps) || '';
function testoSerie(x, es) {
  const v = x.val !== '' && x.val != null ? x.val + (es.tenuta ? '"' : '') : '';
  return [x.carico, v].filter(Boolean).join(' × ') || '✓';
}
function recuperoDi(id) {
  const imp = store.get().impostazioni;
  return imp.recupero[id] || imp.recuperoBase || 60;
}

// ---------- render generale ----------
function render() {
  for (const stop of animazioni.values()) stop();
  animazioni.clear();
  $$('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  const main = $('#main');
  if (tab === 'oggi') main.innerHTML = vistaOggi();
  else if (tab === 'stats') main.innerHTML = vistaStats();
  else main.innerHTML = vistaScheda();
  if (tab === 'stats') disegnaGrafici();
  avviaAnimazioni();
  renderAccount();
}

function avviaAnimazioni() {
  for (const box of $$('[data-fig]')) {
    const spec = illustrazione(box.dataset.fig);
    if (!spec) continue;
    if (box.dataset.anim === '1') animazioni.set(box, anima(box, spec));
    else box.innerHTML = svg(spec, poseAt(spec, spec.keys[0].hold ?? 0));
  }
}

// ---------- vista Oggi ----------
function cardMattina() {
  const s = store.seduteOrdinate().filter((x) => x.fine && !x.mattina).pop();
  if (!s) return '';
  const g = giorniTra(s.data, oggiISO());
  if (g < 1 || g > 2) return '';
  return `<section class="card mattina" data-seduta="${s.id}">
    <div><span class="eyebrow">Controllo del giorno dopo</span>
    <h2>Com'è il ginocchio sinistro stamattina?</h2>
    <p class="muted">Dopo l'allenamento di ${esc(dataLunga(s.data))}. 0 = nessun dolore, 10 = dolore fortissimo.</p></div>
    ${scala('mattina', null, 0)}
    <textarea class="input" data-mattina-nota rows="2" placeholder="Nota (rigidità, gonfiore, scale...)"></textarea>
    <div class="row"><button class="btn primary" data-act="salva-mattina">Salva</button><button class="btn ghost" data-act="salta-mattina">Salta</button></div>
  </section>`;
}

function scala(campo, valore, da = 0) {
  const a = [];
  for (let v = da; v <= 10; v++) a.push(`<button type="button" class="sc${v >= 7 ? ' alto' : v >= 4 ? ' medio' : ''}" data-scala="${campo}" data-v="${v}" aria-pressed="${valore === v}">${v}</button>`);
  return `<div class="scala" role="group">${a.join('')}</div>`;
}

function vistaOggi() {
  const scheda = store.schedaAttiva();
  const sed = corrente();
  const tutti = scheda.blocchi.flatMap((b) => b.esercizi);
  let h = cardMattina();
  if (!sed) {
    const ultima = store.seduteOrdinate().filter((s) => s.fine).pop();
    h += `<section class="hero">
      <span class="eyebrow">Scheda attiva</span>
      <h1>${esc(scheda.nome)}</h1>
      <p class="muted">${tutti.length} esercizi · ${scheda.blocchi.map((b) => esc(b.nome)).join(' · ')}</p>
      <button class="btn primary big" data-act="inizia">Inizia allenamento</button>
      <p class="muted small">${ultima ? `Ultimo allenamento: ${esc(dataLunga(ultima.data))}` : 'Nessun allenamento registrato finora.'}</p>
    </section>
    <p class="hint">Tocca un esercizio per vedere come si fa. Per segnare pesi, tempi e dolore inizia l'allenamento.</p>`;
  } else {
    const fattiN = tutti.filter((e) => fatte(sed, e) >= e.serie).length;
    const min = Math.floor((Date.now() - sed.inizio) / 60000);
    h += `<section class="live">
      <div class="live-top"><span class="eyebrow">Allenamento in corso · <span data-durata>${min} min</span></span>
      <strong>${fattiN}/${tutti.length} esercizi</strong></div>
      <div class="bar"><span style="width:${(100 * fattiN) / tutti.length}%"></span></div>
    </section>`;
  }
  for (const b of scheda.blocchi) {
    const circ = b.esercizi.some((e) => e.circuito);
    h += `<section class="blocco"><h2>${esc(b.nome)}${circ ? ` <small>circuito · ${b.esercizi[0].serie} giri</small>` : ''}</h2>`;
    if (circ) h += `<p class="hint">Circuito: fai un giro di tutti gli esercizi del blocco uno dopo l'altro, poi ripeti.</p>`;
    for (const es of b.esercizi) h += cardEsercizio(es, b, sed);
    h += '</section>';
  }
  if (sed) h += `<div class="fine-seduta"><button class="btn primary big" data-act="termina">Termina allenamento</button>
    <button class="btn ghost" data-act="annulla">Annulla seduta</button></div>`;
  return h;
}

function cardEsercizio(es, blocco, sed) {
  const d = datiEs(sed, es.id);
  const n = fatte(sed, es);
  const fatto = sed && n >= es.serie;
  const aperto = aperti.has(es.id);
  const vid = videoId(es.video);
  const ultima = ultimaVolta(es.id, sed?.id);
  const spec = illustrazione(es.nome);
  let h = `<article class="es${fatto ? ' fatto' : ''}${aperto ? ' aperto' : ''}" data-id="${es.id}">
    <button class="es-head" data-act="toggle" aria-expanded="${aperto}">
      <span class="fig-mini" data-fig="${esc(es.nome)}" aria-hidden="true"></span>
      <span class="es-title">${es.etichetta ? `<span class="tag">${esc(es.etichetta)}</span>` : ''}${esc(es.nome)}
        <small>${es.serie} × ${esc(es.reps)}</small></span>
      <span class="es-stato">${sed ? (fatto ? '<span class="ok-badge">✓</span>' : `${n}/${es.serie}`) : ''}</span>
    </button>`;
  if (!aperto) return h + '</article>';
  h += `<div class="es-body">
    <div class="fig-box">${spec ? `<div class="fig" data-fig="${esc(es.nome)}" data-anim="1"></div>` : '<div class="fig vuota">Disegno non ancora disponibile: guarda il video.</div>'}</div>
    ${es.note ? `<div class="nota-prep"><span class="eyebrow">Nota del preparatore</span><p>${esc(es.note)}</p></div>` : ''}
    <div class="media">
      ${vid ? `<button class="btn" data-act="video">▶ Guarda il video qui</button>` : ''}
      ${es.video ? `<a class="btn ghost" href="${esc(es.video)}" target="_blank" rel="noopener">Apri su YouTube ↗</a>` : ''}
    </div>
    <div class="video" hidden></div>`;
  if (sed) {
    const nascondiCarico = senzaCarico(blocco);
    h += `<div class="serie">`;
    for (let i = 0; i < es.serie; i++) {
      const x = d.serie[i] || {};
      const prev = ultima?.serie?.[i];
      h += `<div class="riga${x.ok ? ' ok' : ''}" data-i="${i}">
        <span class="n">${blocco.esercizi.some((e) => e.circuito) ? 'Giro' : 'Serie'} ${i + 1}</span>
        ${nascondiCarico ? '' : `<label class="campo"><span>Carico</span><input data-k="carico" value="${esc(x.carico)}" placeholder="${esc(prev?.carico || 'es. 10 kg')}" autocomplete="off"></label>`}
        <label class="campo"><span>${es.tenuta ? 'Secondi' : 'Ripetizioni'}</span><input data-k="val" inputmode="decimal" value="${esc(x.val)}" placeholder="${esc(prev?.val || obiettivo(es))}" autocomplete="off"></label>
        ${es.tenuta ? `<button class="btn hold" data-act="hold" aria-label="Avvia timer di tenuta">⏱ ${es.tenuta}"</button>` : ''}
        <button class="check" data-act="ok" aria-pressed="${!!x.ok}" aria-label="Serie fatta">✓</button>
      </div>`;
    }
    h += `</div>
      <div class="campo-scala"><span class="lbl">Dolore al ginocchio sinistro durante l'esercizio</span>${scala('dolore', d.dolore)}</div>
      <div class="campo-scala"><span class="lbl">Fatica (RPE)</span>${scala('rpe', d.rpe, 1)}</div>
      <textarea class="input" data-k="nota" rows="2" placeholder="Nota: sensazioni, dove fa male, cosa dire al preparatore...">${esc(d.nota)}</textarea>`;
  }
  if (ultima) {
    h += `<p class="ultima"><span class="eyebrow">Ultima volta · ${esc(dataBreve(ultima.data))}</span>
      ${ultima.serie.filter((x) => x?.ok).map((x) => esc(testoSerie(x, es))).join(' · ')}${ultima.dolore != null ? ` · dolore ${ultima.dolore}/10` : ''}${ultima.rpe ? ` · RPE ${ultima.rpe}` : ''}
      ${ultima.nota ? `<br><em>${esc(ultima.nota)}</em>` : ''}</p>`;
  }
  return h + '</div></article>';
}

// ---------- azioni seduta ----------
function trovaEs(id) {
  for (const b of store.schedaAttiva().blocchi) for (const e of b.esercizi) if (e.id === id) return { es: e, blocco: b };
  return {};
}
function modificaEs(id, fn) {
  const sed = corrente();
  if (!sed) return;
  store.aggiorna((s) => {
    const x = s.sedute[sed.id];
    x.es = x.es || {};
    x.es[id] = x.es[id] || { serie: [], dolore: null, rpe: null, nota: '' };
    fn(x.es[id]);
  }, [sed.id]);
}

function inizia() {
  const id = 'sed-' + Date.now().toString(36);
  const scheda = store.schedaAttiva();
  store.aggiorna((s) => {
    s.sedute[id] = { id, data: oggiISO(), inizio: Date.now(), fine: null, scheda: scheda.id, es: {}, chiusura: null, mattina: null };
    s.corrente = id;
  }, [id]);
  timer.sbloccaAudio();
  timer.schermoAcceso(true);
  aperti.clear();
  aperti.add(scheda.blocchi[0].esercizi[0].id);
  render();
  scrollA(scheda.blocchi[0].esercizi[0].id);
}

function prossimo(id) {
  const tutti = store.schedaAttiva().blocchi.flatMap((b) => b.esercizi);
  const sed = corrente();
  const i = tutti.findIndex((e) => e.id === id);
  return tutti.slice(i + 1).concat(tutti.slice(0, i)).find((e) => fatte(sed, e) < e.serie);
}

function scrollA(id) {
  requestAnimationFrame(() => $(`.es[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function segnaSerie(id, i, valore) {
  const { es } = trovaEs(id);
  const riga = $(`.es[data-id="${id}"] .riga[data-i="${i}"]`);
  const car = riga?.querySelector('[data-k="carico"]');
  const val = riga?.querySelector('[data-k="val"]');
  let giaOk = false;
  modificaEs(id, (d) => {
    const x = d.serie[i] || {};
    giaOk = !!x.ok && valore == null;
    if (giaOk) { x.ok = false; d.serie[i] = x; return; }
    x.carico = car ? (car.value || car.placeholder.replace('es. 10 kg', '')) : '';
    x.val = valore != null ? String(valore) : (val.value || val.placeholder);
    x.ok = true;
    d.serie[i] = x;
  });
  if (giaOk) { render(); return; }
  const sed = corrente();
  const tuttoFatto = fatte(sed, es) >= es.serie;
  const nx = tuttoFatto ? prossimo(id) : null;
  if (tuttoFatto) {
    aperti.delete(id);
    if (nx) aperti.add(nx.id);
  }
  render();
  if (nx) scrollA(nx.id);
  if (!tuttoFatto || nx) {
    timer.recupero(recuperoDi(id), es.nome, (sec) => store.aggiorna((s) => { s.impostazioni.recupero[id] = sec; }, ['main']));
  }
}

function termina() {
  const sed = corrente();
  const dlg = $('#dialog');
  dlg.innerHTML = `<form method="dialog" class="dlg">
    <h2>Com'è andato l'allenamento?</h2>
    <div class="campo-scala"><span class="lbl">Fatica generale (RPE)</span>${scala('fine-rpe', null, 1)}</div>
    <textarea class="input" name="nota" rows="3" placeholder="Note sull'allenamento per te o per il preparatore"></textarea>
    <div class="row"><button class="btn primary" value="ok">Salva e chiudi</button><button class="btn ghost" value="no">Continua ad allenarti</button></div>
  </form>`;
  let rpe = null;
  dlg.onclick = (e) => {
    const b = e.target.closest('[data-scala]');
    if (!b) return;
    rpe = Number(b.dataset.v);
    $$('[data-scala]', dlg).forEach((x) => x.setAttribute('aria-pressed', x === b));
  };
  dlg.onclose = () => {
    if (dlg.returnValue !== 'ok') return;
    const nota = dlg.querySelector('[name=nota]').value.trim();
    store.aggiorna((s) => {
      s.sedute[sed.id].fine = Date.now();
      s.sedute[sed.id].chiusura = { rpe, nota };
      s.corrente = null;
    }, [sed.id]);
    timer.ferma(false);
    timer.schermoAcceso(false);
    aperti.clear();
    render();
    toast('Allenamento salvato. Domani ti chiedo com\'è il ginocchio.');
  };
  dlg.showModal();
}

function annulla() {
  const sed = corrente();
  if (!confirm('Annullare questo allenamento? I dati segnati oggi verranno cancellati.')) return;
  store.aggiorna((s) => { s.sedute[sed.id].del = true; s.corrente = null; }, [sed.id]);
  timer.ferma(false);
  timer.schermoAcceso(false);
  aperti.clear();
  render();
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, 3500);
}

// ---------- vista Statistiche ----------
let esScelto = null;

function dolorePerSeduta(s) {
  const v = Object.values(s.es || {}).map((x) => x.dolore).filter((x) => x != null);
  return v.length ? Math.max(...v) : null;
}

function inizioSettimana(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function vistaStats() {
  const sedute = store.seduteOrdinate().filter((s) => s.fine);
  const sett = sedute.filter((s) => new Date(s.inizio) >= inizioSettimana()).length;
  const conDolore = sedute.filter((s) => dolorePerSeduta(s) != null);
  const ultD = conDolore.at(-1), penD = conDolore.at(-2);
  const conMattina = sedute.filter((s) => s.mattina?.dolore != null);
  const ultM = conMattina.at(-1);
  const delta = ultD && penD ? dolorePerSeduta(ultD) - dolorePerSeduta(penD) : null;
  let streak = 0;
  for (let w = inizioSettimana(); ; w = new Date(w.getTime() - 7 * 86400000)) {
    const fine = new Date(w.getTime() + 7 * 86400000);
    if (sedute.some((s) => s.inizio >= w.getTime() && s.inizio < fine.getTime())) streak++;
    else if (w < inizioSettimana()) break;
    else continue;
  }
  let h = `<section class="kpis">
    <div class="kpi"><span class="kpi-label">Allenamenti fatti</span><span class="kpi-value">${sedute.length}</span><span class="kpi-sub">${sett} questa settimana</span></div>
    <div class="kpi"><span class="kpi-label">Settimane di fila</span><span class="kpi-value">${streak}</span><span class="kpi-sub">con almeno un allenamento</span></div>
    <div class="kpi"><span class="kpi-label">Dolore durante · ultimo</span><span class="kpi-value">${ultD ? dolorePerSeduta(ultD) : '–'}<small>/10</small></span><span class="kpi-sub">${delta == null ? 'il più alto tra gli esercizi' : delta === 0 ? 'uguale alla volta prima' : (delta < 0 ? '▼ ' : '▲ ') + Math.abs(delta) + ' rispetto alla volta prima'}</span></div>
    <div class="kpi"><span class="kpi-label">Mattina dopo · ultimo</span><span class="kpi-value">${ultM ? ultM.mattina.dolore : '–'}<small>/10</small></span><span class="kpi-sub">${ultM ? esc(dataBreve(ultM.data)) : 'si compila il giorno dopo'}</span></div>
  </section>`;
  if (!sedute.length) {
    return h + `<section class="card vuoto"><h2>Ancora nessun dato</h2><p class="muted">Dopo il primo allenamento qui trovi l'andamento del dolore al ginocchio, i carichi e le tenute di ogni esercizio.</p></section>`;
  }
  const serieD = [{ nome: 'Durante', cls: 's1' }, { nome: 'Mattina dopo', cls: 's2' }];
  h += `<section class="card">
    <h2>Dolore al ginocchio sinistro</h2>
    <p class="muted small">Durante = il valore più alto segnato negli esercizi di quella seduta. Linea tratteggiata: 3/10, il limite di dolore spesso considerato accettabile con la tendinopatia (confermalo con il preparatore).</p>
    ${legenda(serieD)}
    <div class="chart-box" id="g-dolore"></div>
  </section>`;
  const visti = new Map();
  for (const b of store.schedaAttiva().blocchi) for (const e of b.esercizi) visti.set(e.id, e);
  for (const sc of Object.values(store.get().schede)) for (const b of sc.blocchi) for (const e of b.esercizi) if (!visti.has(e.id)) visti.set(e.id, e);
  const conDati = [...visti.values()].filter((e) => sedute.some((s) => s.es?.[e.id]?.serie?.some((x) => x?.ok)));
  if (!esScelto || !conDati.some((e) => e.id === esScelto)) esScelto = conDati[0]?.id;
  if (conDati.length) {
    h += `<section class="card">
      <div class="row spread"><h2>Progressi per esercizio</h2>
      <select class="input sel" data-act="scegli-es">${conDati.map((e) => `<option value="${e.id}"${e.id === esScelto ? ' selected' : ''}>${esc(e.nome)}</option>`).join('')}</select></div>
      <div id="es-dettaglio"></div>
    </section>`;
  }
  h += `<section class="card"><h2>Storico allenamenti</h2><div class="storico">${sedute.slice().reverse().map(rigaStorico).join('')}</div></section>`;
  return h;
}

function rigaStorico(s) {
  const n = Object.values(s.es || {}).filter((x) => x.serie?.some((y) => y?.ok)).length;
  const dur = s.fine ? Math.round((s.fine - s.inizio) / 60000) : null;
  const dol = dolorePerSeduta(s);
  const sc = store.get().schede[s.scheda];
  const righe = [];
  if (sc) for (const b of sc.blocchi) for (const e of b.esercizi) {
    const d = s.es?.[e.id];
    if (!d || !d.serie?.some((x) => x?.ok)) continue;
    righe.push(`<li><b>${esc(e.nome)}</b> — ${d.serie.filter((x) => x?.ok).map((x) => esc(testoSerie(x, e))).join(' · ')}${d.dolore != null ? ` · dolore ${d.dolore}` : ''}${d.rpe ? ` · RPE ${d.rpe}` : ''}${d.nota ? `<br><em>${esc(d.nota)}</em>` : ''}</li>`);
  }
  return `<details class="sed">
    <summary><span class="sed-data">${esc(dataLunga(s.data))}</span>
      <span class="sed-info">${n} esercizi${dur != null ? ` · ${dur} min` : ''}${dol != null ? ` · dolore ${dol}` : ''}${s.mattina?.dolore != null ? ` · mattina ${s.mattina.dolore}` : ''}${s.chiusura?.rpe ? ` · RPE ${s.chiusura.rpe}` : ''}</span></summary>
    ${s.chiusura?.nota ? `<p><em>${esc(s.chiusura.nota)}</em></p>` : ''}
    ${s.mattina?.nota ? `<p class="muted">Mattina dopo: <em>${esc(s.mattina.nota)}</em></p>` : ''}
    <ul>${righe.join('')}</ul>
    <button class="btn ghost small" data-act="elimina-seduta" data-seduta="${s.id}">Elimina</button>
  </details>`;
}

function disegnaGrafici() {
  const sedute = store.seduteOrdinate().filter((s) => s.fine);
  const box = $('#g-dolore');
  if (box) {
    lineChart(box, {
      x: sedute.map((s) => dataBreve(s.data)),
      series: [
        { nome: 'Durante', cls: 's1', punti: sedute.map(dolorePerSeduta) },
        { nome: 'Mattina dopo', cls: 's2', punti: sedute.map((s) => s.mattina?.dolore ?? null) },
      ],
      yMax: 10, rif: { y: 3, label: 'limite 3/10' }, unita: '/10',
    });
  }
  const det = $('#es-dettaglio');
  if (det && esScelto) {
    const e = [...Object.values(store.get().schede)].flatMap((sc) => sc.blocchi.flatMap((b) => b.esercizi)).find((x) => x.id === esScelto);
    const conEs = sedute.filter((s) => s.es?.[esScelto]?.serie?.some((x) => x?.ok));
    const fatte = (s) => s.es[esScelto].serie.filter((x) => x?.ok);
    const kg = conEs.map((s) => { const v = fatte(s).map((x) => numero(x.carico)).filter((x) => x != null); return v.length ? Math.max(...v) : null; });
    const usaKg = kg.some((v) => v != null);
    const val = conEs.map((s) => { const v = fatte(s).map((x) => numero(x.val)).filter((x) => x != null); return v.length ? Math.max(...v) : null; });
    const punti = usaKg ? kg : val;
    const titolo = usaKg ? 'Carico più alto (kg)' : e?.tenuta ? 'Tenuta più lunga (secondi)' : 'Ripetizioni (serie migliore)';
    const vals = punti.filter((v) => v != null);
    const record = vals.length ? Math.max(...vals) : null;
    const dolori = conEs.map((s) => s.es[esScelto].dolore);
    det.innerHTML = `<p class="muted small">${titolo}${record != null ? ` · record <b>${record}${usaKg ? ' kg' : e?.tenuta ? '"' : ''}</b>` : ''}</p>
      <div class="chart-box" id="g-es"></div>
      <table class="tab"><thead><tr><th>Data</th><th>Serie</th><th>Dolore</th><th>RPE</th></tr></thead><tbody>
      ${conEs.slice().reverse().map((s) => { const d = s.es[esScelto]; return `<tr><td>${esc(dataBreve(s.data))}</td><td>${fatte(s).map((x) => esc(testoSerie(x, e || {}))).join(' · ')}${d.nota ? `<br><em class="muted">${esc(d.nota)}</em>` : ''}</td><td>${d.dolore ?? '–'}</td><td>${d.rpe ?? '–'}</td></tr>`; }).join('')}
      </tbody></table>`;
    const max = Math.max(1, ...vals);
    lineChart($('#g-es'), {
      x: conEs.map((s) => dataBreve(s.data)),
      series: [{ nome: titolo, cls: 's1', punti }],
      yMax: Math.ceil(max * 1.15), unita: usaKg ? ' kg' : e?.tenuta ? '"' : '',
      dettagli: (i) => (dolori[i] != null ? `<div class="muted">Dolore ${dolori[i]}/10</div>` : ''),
    });
  }
}

// ---------- vista Scheda ----------
function vistaScheda() {
  const st = store.get();
  const att = store.schedaAttiva();
  const altre = Object.values(st.schede).filter((s) => s.id !== att.id).sort((a, b) => b.dal.localeCompare(a.dal));
  let h = `<section class="card">
    <span class="eyebrow">Scheda attiva</span>
    <h2>${esc(att.nome)}</h2>
    <p class="muted small">Dal ${esc(dataLunga(att.dal))}${att.file ? ` · ${esc(att.file)}` : ''}</p>
    ${att.blocchi.map((b) => `<h3>${esc(b.nome)}</h3><ul class="lista-es">${b.esercizi.map((e) => `<li><span>${e.etichetta ? `<span class="tag">${esc(e.etichetta)}</span>` : ''}${esc(e.nome)}</span><span class="muted">${e.serie} × ${esc(e.reps)}</span></li>`).join('')}</ul>`).join('')}
  </section>
  <section class="card">
    <h2>Nuova scheda dal preparatore</h2>
    <p class="muted">Carica il file Excel (stesse colonne: ESERCIZIO, SERIE, REPS, LINK, NOTE). La scheda vecchia resta in archivio e lo storico degli esercizi che si ripetono continua.</p>
    <label class="btn primary file"><input type="file" accept=".xlsx,.xls" data-act="file" hidden>Carica file Excel</label>
    <div id="anteprima">${anteprimaScheda ? htmlAnteprima(anteprimaScheda) : ''}</div>
  </section>`;
  if (altre.length) {
    h += `<section class="card"><h2>Schede precedenti</h2><ul class="lista-es">${altre.map((s) => `<li><span>${esc(s.nome)} <span class="muted small">dal ${esc(dataBreve(s.dal))}</span></span><button class="btn ghost small" data-act="riattiva" data-scheda="${s.id}">Usa di nuovo</button></li>`).join('')}</ul></section>`;
  }
  h += `<section class="card">
    <h2>Impostazioni</h2>
    <label class="riga-imp">Recupero di base tra le serie
      <select class="input sel" data-act="recupero-base">${[30, 45, 60, 75, 90, 120, 150, 180].map((v) => `<option value="${v}"${v === st.impostazioni.recuperoBase ? ' selected' : ''}>${timer.mmss(v)}</option>`).join('')}</select></label>
    <p class="muted small">Durante il recupero puoi usare −15 / +15: il tempo nuovo resta salvato per quell'esercizio.</p>
    <div class="row"><button class="btn ghost" data-act="backup">Scarica backup dei dati</button></div>
  </section>`;
  return h;
}

function htmlAnteprima(s) {
  const n = s.blocchi.reduce((a, b) => a + b.esercizi.length, 0);
  const nuovi = s.blocchi.flatMap((b) => b.esercizi).filter((e) => !illustrazione(e.nome));
  return `<div class="anteprima">
    <p><b>${esc(s.nome)}</b>: ${n} esercizi in ${s.blocchi.length} blocchi (${s.blocchi.map((b) => esc(b.nome)).join(', ')}).</p>
    ${nuovi.length ? `<p class="muted small">Esercizi senza disegno (resta il video): ${nuovi.map((e) => esc(e.nome)).join(', ')}.</p>` : ''}
    <div class="row"><button class="btn primary" data-act="usa-scheda">Usa questa scheda</button><button class="btn ghost" data-act="scarta-scheda">Annulla</button></div>
  </div>`;
}

// ---------- account ----------
function renderAccount() {
  const box = $('#account');
  const s = syncStato;
  let h = '';
  if (!s.pronto) h = '<span class="muted small">…</span>';
  else if (!s.utente) h = '<button class="btn small" data-act="accedi">Accedi con Google</button>';
  else {
    const stato = s.errore ? 'err' : s.sincronizzato ? 'ok' : 'wait';
    const tit = s.errore ? 'Non sincronizzato' : s.sincronizzato ? 'Salvato online' : 'In attesa di connessione';
    h = `<button class="account-btn" data-act="account" title="${tit}">${s.utente.foto ? `<img src="${esc(s.utente.foto)}" alt="" referrerpolicy="no-referrer">` : ''}<span class="dot ${stato}"></span></button>`;
  }
  box.innerHTML = h;
  const banner = $('#banner');
  if (s.errore === 'permessi') {
    banner.hidden = false;
    banner.innerHTML = `<b>I dati sono salvati su questo telefono ma non ancora online.</b>
      Va aggiunta una regola nel progetto Firebase (una volta sola).
      <button class="btn small" data-act="regole">Come fare</button>`;
  } else banner.hidden = true;
}

const REGOLE = `    match /allenamento/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /sedute/{id} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }`;

function mostraRegole() {
  const dlg = $('#dialog');
  dlg.innerHTML = `<form method="dialog" class="dlg">
    <h2>Attiva il salvataggio online</h2>
    <ol><li>Apri la <a href="https://console.firebase.google.com/project/libretto-6183b/firestore/rules" target="_blank" rel="noopener">console Firebase → Firestore → Regole</a>.</li>
    <li>Incolla queste righe subito sotto il blocco <code>match /utenti/{uid} { ... }</code>.</li>
    <li>Premi <b>Pubblica</b> e ricarica questa pagina.</li></ol>
    <pre class="codice">${esc(REGOLE)}</pre>
    <div class="row"><button class="btn" type="button" data-copia>Copia</button><button class="btn primary" value="ok">Chiudi</button></div>
  </form>`;
  dlg.querySelector('[data-copia]').onclick = async (e) => {
    try { await navigator.clipboard.writeText(REGOLE); e.target.textContent = 'Copiato ✓'; } catch { /* */ }
  };
  dlg.showModal();
}

function menuAccount() {
  const s = syncStato;
  const dlg = $('#dialog');
  dlg.innerHTML = `<form method="dialog" class="dlg">
    <h2>${esc(s.utente?.nome || 'Account')}</h2>
    <p class="muted">${esc(s.utente?.email || '')}</p>
    <p>${s.errore ? 'Sincronizzazione non attiva: i dati restano su questo dispositivo.' : s.sincronizzato ? 'Tutti i dati sono salvati online.' : 'Le modifiche verranno salvate online appena c\'è connessione.'}</p>
    <div class="row"><button class="btn ghost" value="esci">Esci</button><button class="btn primary" value="ok">Chiudi</button></div>
  </form>`;
  dlg.onclose = () => { if (dlg.returnValue === 'esci') sync?.esci(); };
  dlg.showModal();
}

// ---------- eventi ----------
function onClick(e) {
  const b = e.target.closest('[data-act], [data-scala], [data-tab]');
  if (!b) return;
  if (b.dataset.tab) { tab = b.dataset.tab; render(); scrollTo(0, 0); return; }
  const es = b.closest('.es')?.dataset.id;
  if (b.dataset.scala) {
    const v = Number(b.dataset.v);
    const campo = b.dataset.scala;
    if (campo === 'mattina') {
      $$('[data-scala="mattina"]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      return;
    }
    if (!es) return;
    modificaEs(es, (d) => { d[campo] = d[campo] === v ? null : v; });
    const grp = b.parentElement;
    const nuovo = datiEs(corrente(), es)[campo];
    $$('[data-scala]', grp).forEach((x) => x.setAttribute('aria-pressed', Number(x.dataset.v) === nuovo));
    return;
  }
  const act = b.dataset.act;
  switch (act) {
    case 'toggle': {
      if (aperti.has(es)) aperti.delete(es); else aperti.add(es);
      const art = b.closest('.es');
      const { es: eso, blocco } = trovaEs(es);
      art.outerHTML = cardEsercizio(eso, blocco, corrente());
      const nuovo = $(`.es[data-id="${es}"]`);
      for (const [box, stop] of animazioni) if (!box.isConnected) { stop(); animazioni.delete(box); }
      for (const box of $$('[data-fig]', nuovo)) {
        const spec = illustrazione(box.dataset.fig);
        if (!spec) continue;
        if (box.dataset.anim === '1') animazioni.set(box, anima(box, spec));
        else box.innerHTML = svg(spec, poseAt(spec, spec.keys[0].hold ?? 0));
      }
      break;
    }
    case 'video': {
      const { es: eso } = trovaEs(es);
      const v = b.closest('.es').querySelector('.video');
      const id = videoId(eso.video);
      if (v.hidden) {
        v.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0" title="Video: ${esc(eso.nome)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
        v.hidden = false; b.textContent = '✕ Chiudi video';
      } else { v.innerHTML = ''; v.hidden = true; b.textContent = '▶ Guarda il video qui'; }
      break;
    }
    case 'inizia': inizia(); break;
    case 'termina': termina(); break;
    case 'annulla': annulla(); break;
    case 'ok': segnaSerie(es, Number(b.closest('.riga').dataset.i)); break;
    case 'hold': {
      const { es: eso } = trovaEs(es);
      const i = Number(b.closest('.riga').dataset.i);
      const val = b.closest('.riga').querySelector('[data-k="val"]');
      const sec = numero(val.value) || eso.tenuta;
      timer.tenuta(sec, eso.nome, (fatti) => segnaSerie(es, i, fatti));
      break;
    }
    case 'salva-mattina': {
      const card = b.closest('.mattina');
      const sel = $('[data-scala="mattina"][aria-pressed="true"]', card);
      if (!sel) { toast('Scegli un valore da 0 a 10'); return; }
      const nota = $('[data-mattina-nota]', card).value.trim();
      store.aggiorna((s) => { s.sedute[card.dataset.seduta].mattina = { dolore: Number(sel.dataset.v), nota, ts: Date.now() }; }, [card.dataset.seduta]);
      render(); toast('Salvato');
      break;
    }
    case 'salta-mattina': {
      const id = b.closest('.mattina').dataset.seduta;
      store.aggiorna((s) => { s.sedute[id].mattina = { dolore: null, nota: '', ts: Date.now() }; }, [id]);
      render();
      break;
    }
    case 'elimina-seduta':
      if (confirm('Eliminare questo allenamento dallo storico?')) {
        store.aggiorna((s) => { s.sedute[b.dataset.seduta].del = true; }, [b.dataset.seduta]);
        render();
      }
      break;
    case 'usa-scheda':
      store.aggiorna((s) => { s.schede[anteprimaScheda.id] = anteprimaScheda; s.attiva = anteprimaScheda.id; }, ['main']);
      anteprimaScheda = null; tab = 'oggi'; render(); toast('Nuova scheda attiva');
      break;
    case 'scarta-scheda': anteprimaScheda = null; render(); break;
    case 'riattiva':
      store.aggiorna((s) => { s.attiva = b.dataset.scheda; }, ['main']);
      render(); toast('Scheda attivata');
      break;
    case 'backup': {
      const blob = new Blob([JSON.stringify(store.get(), null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `allenamento-backup-${oggiISO()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      break;
    }
    case 'accedi': sync?.accedi().catch((err) => toast('Accesso non riuscito: ' + (err.code || err.message))); break;
    case 'account': menuAccount(); break;
    case 'regole': mostraRegole(); break;
    default: break;
  }
}

function onInput(e) {
  const t = e.target;
  const es = t.closest('.es')?.dataset.id;
  if (!es || !t.dataset.k) return;
  if (t.dataset.k === 'nota') { modificaEs(es, (d) => { d.nota = t.value; }); return; }
  const i = Number(t.closest('.riga').dataset.i);
  modificaEs(es, (d) => { d.serie[i] = { ...(d.serie[i] || {}), [t.dataset.k]: t.value }; });
}

async function onChange(e) {
  const t = e.target;
  if (t.dataset.act === 'scegli-es') { esScelto = t.value; disegnaGrafici(); return; }
  if (t.dataset.act === 'recupero-base') { store.aggiorna((s) => { s.impostazioni.recuperoBase = Number(t.value); }, ['main']); return; }
  if (t.dataset.act === 'file' && t.files[0]) {
    try {
      anteprimaScheda = await daExcel(t.files[0]);
      $('#anteprima').innerHTML = htmlAnteprima(anteprimaScheda);
    } catch (err) {
      $('#anteprima').innerHTML = `<p class="errore">Non sono riuscito a leggere il file: ${esc(err.message)}</p>`;
    }
  }
}

// ---------- avvio ----------
export function avvia() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  timer.installa();
  store.ascolta((_, tocca) => {
    // Cambi arrivati dal cloud: ridisegna solo se non stai scrivendo.
    if (!tocca.length && !document.activeElement?.matches('input, textarea')) render();
  });
  if (corrente()) {
    const sed = corrente();
    const tutti = store.schedaAttiva().blocchi.flatMap((b) => b.esercizi);
    const nx = tutti.find((x) => fatte(sed, x) < x.serie);
    if (nx) aperti.add(nx.id);
    timer.schermoAcceso(true);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && corrente()) timer.schermoAcceso(true); });
  setInterval(() => {
    const d = $('[data-durata]'), sed = corrente();
    if (d && sed) d.textContent = Math.floor((Date.now() - sed.inizio) / 60000) + ' min';
  }, 30000);
  let w = innerWidth;
  addEventListener('resize', () => { if (tab === 'stats' && Math.abs(innerWidth - w) > 30) { w = innerWidth; disegnaGrafici(); } });
  render();
  import('./sync.js').then((m) => {
    sync = m;
    m.avvia((st) => { syncStato = st; renderAccount(); });
  }).catch(() => { syncStato = { pronto: true, utente: null, offline: true }; renderAccount(); });
}
