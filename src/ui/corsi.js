// "Esami" view: filters, course cards per semester, grade and partial entry, notes, LIUC table.
import { el, btn, link, fmt, fmtDate, toast, oggiISO } from './dom.js';
import { stima } from '../calc.js';

const ESSE3 = 'https://s3w.si.unimib.it/esse3/auth/studente/Appelli/AppelliF.do';
const VOTI = Array.from({ length: 13 }, (_, i) => 18 + i);
const ui = { filter: 'all', edit: null, draft: {} };

const esito = (doc, id) => doc.esami[id] || {};
const gradeLabel = (e) => (e.lode ? '30 e lode' : e.voto + '/30');

function setEsito(ctx, id, patch) {
  ctx.aggiorna((d) => { d.esami[id] = { ...(d.esami[id] || {}), ...patch }; });
}

function passa(k, doc) {
  const e = esito(doc, k.id);
  if (!(+k.cfu_da_fare > 0)) return false;
  if (ui.filter === 'todo') return !e.passato;
  if (ui.filter === 'done') return !!e.passato;
  if (ui.filter === 'int') return k.tipo === 'Integrazione';
  return true;
}

function card(ctx, k) {
  const { doc } = ctx;
  const e = esito(doc, k.id), isInt = k.tipo === 'Integrazione';
  const nota = doc.note[k.id] || {};
  const c = el('article', 'card' + (isInt ? ' int' : '') + (e.passato ? ' done' : ''));
  c.id = 'esame-' + k.id;

  const top = el('div', 'top');
  top.append(el('h3', null, k.materia));
  const cfu = el('div', 'cfu');
  cfu.append(el('b', null, String(k.cfu_da_fare)), document.createTextNode(isInt ? 'CFU da integrare' : 'CFU'));
  top.append(cfu); c.append(top);

  const tags = el('div', 'tags');
  tags.append(el('span', 'tag' + (isInt ? ' int' : ''), isInt ? 'Integrazione · ' + k.ric_cfu + ' CFU già con ' + k.ric_voto : 'Esame intero'));
  tags.append(el('span', 'tag', k.anno + '° anno'));
  if (k.esame) tags.append(el('span', 'tag', k.esame));
  if (e.passato) tags.append(el('span', 'tag ok', 'Passato'));
  else if (nota.stato) tags.append(el('span', 'tag' + (/ricevuta|confermato/i.test(nota.stato) ? ' ok' : ' wait'), nota.stato));
  c.append(tags);

  const prof = el('div', 'prof');
  if (k.docente) prof.append(el('span', null, k.docente));
  String(k.email || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((m) => prof.append(el('span', 'mail', m)));
  c.append(prof);
  if (nota.nota && !e.passato) c.append(el('div', 'note', nota.nota));

  const oggi = oggiISO();
  const appelli = (k.appelli || []).filter((a) => !a.rimosso);
  if (appelli.length && !e.passato) {
    const apps = el('div', 'apps');
    let marked = false;
    for (const a of appelli) {
      const fut = a.data >= oggi;
      apps.append(el('span', 'app' + (fut && !marked ? ' next' : ''), fmtDate(a.data) + ' · ' + a.ora));
      if (fut) marked = true;
    }
    const pren = link('Prenota ↗', ESSE3, 'app');
    pren.style.cssText = 'text-decoration:none;color:var(--fg);font-weight:500';
    apps.append(pren);
    c.append(apps);
  }

  const det = el('details'); det.append(el('summary', null, 'Libro, programma ed esame'));
  const dl = el('dl');
  for (const [a, b] of [['Esame', k.esame_dettaglio], ['Libro', k.libro], ['Programma', k.programma]]) {
    if (b) dl.append(el('dt', null, a), el('dd', null, b));
  }
  if (typeof k.link === 'string' && k.link.startsWith('https://elearning.unimib.it/')) {
    const dd = el('dd'); dd.append(link('Pagina e-learning ↗', k.link));
    dl.append(el('dt', null, 'Materiale'), dd);
  }
  det.append(dl);
  det.append(noteEditor(ctx, k, nota));
  c.append(det);

  c.append(gradeBox(ctx, k, e));
  return c;
}

function noteEditor(ctx, k, nota) {
  const box = el('div', 'stack'); box.style.marginTop = '10px';
  if (!(ui.edit && ui.edit.id === k.id && ui.edit.mode === 'note')) {
    box.append(btn(nota.stato || nota.nota ? 'Modifica stato e nota' : 'Aggiungi stato o nota', 'link', () => { ui.edit = { id: k.id, mode: 'note' }; ctx.rerender(); }));
    return box;
  }
  const st = el('input'); st.type = 'text'; st.placeholder = 'Stato (es. In attesa, Risposta ricevuta)'; st.value = nota.stato || '';
  const nt = el('textarea'); nt.placeholder = 'Nota'; nt.value = nota.nota || '';
  const row = el('div', 'row');
  row.append(
    btn('Salva', 'primary', () => {
      ctx.aggiorna((d) => {
        const v = { stato: st.value.trim(), nota: nt.value.trim() };
        if (v.stato || v.nota) d.note[k.id] = v; else delete d.note[k.id];
      });
      ui.edit = null; toast('Salvato');
    }),
    btn('Annulla', 'link', () => { ui.edit = null; ctx.rerender(); }),
  );
  box.append(st, nt, row);
  return box;
}

function gradeBox(ctx, k, e) {
  const box = el('div', 'grade');
  const editing = ui.edit && ui.edit.id === k.id ? ui.edit.mode : null;

  if (editing === 'pass') {
    const form = el('div', 'form');
    const d = ui.draft[k.id];
    const lab = el('label', null, 'Voto');
    const sel = el('select'); sel.setAttribute('aria-label', 'Voto ' + k.materia);
    for (const v of VOTI) { const o = new Option(String(v), String(v)); o.selected = v === +d.voto; sel.append(o); }
    lab.append(sel); form.append(lab);
    const ll = el('label'); const cb = el('input'); cb.type = 'checkbox';
    cb.checked = !!d.lode && +d.voto === 30; cb.disabled = +d.voto !== 30;
    ll.append(cb, document.createTextNode('lode')); form.append(ll);
    sel.addEventListener('change', () => { d.voto = +sel.value; if (d.voto !== 30) { d.lode = false; cb.checked = false; } cb.disabled = d.voto !== 30; });
    cb.addEventListener('change', () => { d.lode = cb.checked; });
    form.append(
      btn('Salva voto', 'pass', () => {
        ui.edit = null;
        setEsito(ctx, k.id, { passato: true, voto: d.voto, lode: d.voto === 30 && !!d.lode, data: oggiISO() });
        toast('Salvato');
      }),
      btn('Annulla', 'link', () => { ui.edit = null; ctx.rerender(); }),
    );
    box.append(form);
    return box;
  }

  const left = el('div');
  if (e.passato) {
    const v = el('div', 'voto'); v.append(document.createTextNode(gradeLabel(e) + ' '));
    v.append(el('small', null, '· ' + k.cfu_da_fare + ' CFU'));
    left.append(v);
  } else {
    const s = stima(e);
    const est = el('div', 'est');
    if (s != null) { est.append(document.createTextNode('Voto stimato dai parziali: '), el('b', null, fmt(s, 1))); }
    else est.textContent = 'Non ancora sostenuto';
    left.append(est);
  }
  box.append(left);

  const act = el('div', 'actions');
  const apri = () => {
    let v = e.voto || Math.round(stima(e) || 27);
    v = Math.min(30, Math.max(18, v));
    ui.draft[k.id] = { voto: v, lode: !!e.lode };
    ui.edit = { id: k.id, mode: 'pass' }; ctx.rerender();
  };
  if (e.passato) {
    act.append(btn('Modifica voto', '', apri),
      btn('Togli', 'link', () => { setEsito(ctx, k.id, { passato: false, voto: null, lode: false }); toast('Salvato'); }));
  } else {
    act.append(btn('Segna come passato', 'pass', apri),
      btn('+ Parziale', '', () => { ui.edit = { id: k.id, mode: 'par' }; ctx.rerender(); }));
  }
  box.append(act);

  const pars = e.parziali || [];
  if ((pars.length && !e.passato) || editing === 'par') {
    const row = el('div', 'pars');
    if (pars.length) row.append(el('span', 'est', 'Parziali:'));
    pars.forEach((p, i) => {
      const chip = el('span', 'par', p.voto + '/30');
      const x = el('button', null, '×'); x.type = 'button'; x.setAttribute('aria-label', 'Rimuovi parziale ' + p.voto);
      x.addEventListener('click', () => { const np = [...pars]; np.splice(i, 1); setEsito(ctx, k.id, { parziali: np }); toast('Salvato'); });
      chip.append(x); row.append(chip);
    });
    if (editing === 'par') {
      const inp = el('input'); inp.type = 'text'; inp.placeholder = 'voto'; inp.size = 5; inp.autocomplete = 'off';
      inp.inputMode = 'decimal'; inp.setAttribute('aria-label', 'Voto del parziale');
      const add = () => {
        const v = parseFloat(String(inp.value).replace(',', '.'));
        if (!(v >= 0 && v <= 33)) { toast('Scrivi un voto tra 0 e 33.'); return; }
        ui.edit = null; setEsito(ctx, k.id, { parziali: [...pars, { voto: v }] }); toast('Salvato');
      };
      inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') add(); });
      row.append(inp, btn('Aggiungi', 'primary', add), btn('Annulla', 'link', () => { ui.edit = null; ctx.rerender(); }));
      queueMicrotask(() => inp.focus());
    }
    box.append(row);
  }
  return box;
}

function riconosciuti(ctx) {
  const sec = el('section', 'stack');
  sec.append(el('h2', 'section-title', 'Già riconosciuti dal LIUC'));
  const ric = ctx.corsi.filter((k) => +k.ric_cfu > 0);
  if (!ric.length) {
    sec.append(el('p', 'empty', 'Nessun riconoscimento: importa il file "Esporta per la nuova app" del vecchio Libretto (menu Backup in alto).'));
    return sec;
  }
  const wrap = el('div', 'ric'); const t = el('table');
  const th = el('thead'); const hr = el('tr');
  [['Insegnamento Bicocca'], ['CFU', 'n'], ['Voto', 'n'], ['Stato'], ['']].forEach(([l, c]) => hr.append(el('th', c || null, l)));
  th.append(hr); t.append(th);
  const body = el('tbody');
  for (const k of ric) {
    const tr = el('tr');
    if (ui.edit && ui.edit.id === k.id && ui.edit.mode === 'ric') {
      const c = el('input'); c.type = 'number'; c.min = '0'; c.max = String(k.cfu); c.value = k.ric_cfu; c.setAttribute('aria-label', 'CFU riconosciuti');
      const v = el('input'); v.type = 'number'; v.min = '18'; v.max = '30'; v.value = k.ric_voto; v.setAttribute('aria-label', 'Voto riconosciuto');
      const tdc = el('td', 'n'); tdc.append(c); const tdv = el('td', 'n'); tdv.append(v);
      const act = el('td'); act.append(
        btn('Salva', 'primary', () => {
          const cfu = Math.round(+c.value), voto = Math.round(+v.value);
          if (!(cfu >= 0 && cfu <= k.cfu)) { toast('CFU tra 0 e ' + k.cfu + '.'); return; }
          if (cfu > 0 && !(voto >= 18 && voto <= 30)) { toast('Voto tra 18 e 30.'); return; }
          ui.edit = null;
          ctx.aggiorna((d) => {
            if (cfu === 0) delete d.riconoscimenti[k.id];
            else d.riconoscimenti[k.id] = { ...(d.riconoscimenti[k.id] || {}), cfu, voto };
          });
          toast('Salvato');
        }),
        btn('Annulla', 'link', () => { ui.edit = null; ctx.rerender(); }));
      tr.append(el('td', null, k.ric_nome || k.materia), tdc, tdv, el('td', 'muted', 'max ' + k.cfu + ' CFU'), act);
    } else {
      const act = el('td'); act.append(btn('Modifica', 'link', () => { ui.edit = { id: k.id, mode: 'ric' }; ctx.rerender(); }));
      tr.append(el('td', null, k.ric_nome || k.materia), el('td', 'n', String(k.ric_cfu)), el('td', 'n', String(k.ric_voto)),
        el('td', 'muted', +k.cfu_da_fare > 0 ? 'Parziale: mancano ' + k.cfu_da_fare + ' CFU' : 'Riconosciuto per intero'), act);
    }
    body.append(tr);
  }
  t.append(body); wrap.append(t); sec.append(wrap);
  sec.append(el('p', 'foot', 'Per le integrazioni il voto che prendi vale solo sui CFU da integrare; i CFU riconosciuti restano col voto LIUC. Il 30 e lode conta come 30. Il voto stimato è la media semplice dei parziali: conta nella media vera solo quando segni l\'esame come passato.'));
  return sec;
}

export function renderEsami(ctx) {
  const v = el('div', 'view');
  const bar = el('div', 'toolbar'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Filtra');
  for (const [f, l] of [['all', 'Tutte'], ['todo', 'Da fare'], ['done', 'Passati'], ['int', 'Integrazioni']]) {
    const b = el('button', 'chip', l); b.type = 'button'; b.setAttribute('aria-pressed', String(ui.filter === f));
    b.addEventListener('click', () => { ui.filter = f; ctx.rerender(); });
    bar.append(b);
  }
  v.append(bar);

  const cols = el('div', 'cols');
  for (const [sem, sub] of [[1, 'settembre – gennaio'], [2, 'febbraio – giugno']]) {
    const col = el('section', 'col');
    const h = el('h2', null, sem + '° semestre '); h.append(el('small', null, sub));
    col.append(h);
    const rows = ctx.corsi.filter((k) => +k.semestre === sem && passa(k, ctx.doc));
    rows.sort((a, b) => (a.tipo === 'Integrazione' ? 0 : 1) - (b.tipo === 'Integrazione' ? 0 : 1) || (a.ordine || 0) - (b.ordine || 0));
    if (!rows.length) col.append(el('p', 'empty', 'Nessuna materia con questo filtro.'));
    else col.append(...rows.map((k) => card(ctx, k)));
    cols.append(col);
  }
  v.append(cols, riconosciuti(ctx));
  return v;
}
