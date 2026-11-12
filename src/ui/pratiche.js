// "Pratiche" tab: open issues (emails to the office, answers to wait for) with a "check again" date.
import { el, btn, fmtShort, toast, oggiISO } from './dom.js';
import { praticheDaRicontrollare } from '../studio.js';
import { aggiungiGiorni } from '../piano.js';

const ui = { modifica: null }; // id being edited, or 'nuova'

function form(ctx, p) {
  const box = el('div', 'panel');
  box.append(el('h3', null, p ? 'Modifica questione' : 'Nuova questione'));
  const campo = (label, type, value, ph) => {
    const l = el('label', 'stack'); l.style.gap = '4px';
    l.append(el('span', 'muted', label));
    const i = type === 'textarea' ? el('textarea') : el('input');
    if (type !== 'textarea') i.type = type;
    i.value = value || ''; if (ph) i.placeholder = ph;
    l.append(i);
    box.append(l);
    return i;
  };
  const oggi = oggiISO();
  const titolo = campo('Di cosa si tratta', 'text', p && p.titolo, 'es. Mail alla Segreteria su…');
  const dest = campo('A chi hai scritto', 'text', p && p.destinatario, 'es. segreteria, docente');
  const inviata = campo('Inviata il', 'date', p ? p.inviata : oggi);
  const ric = campo('Ricontrolla il', 'date', p ? p.ricontrolla : aggiungiGiorni(oggi, 14));
  const nota = campo('Nota', 'textarea', p && p.nota);
  const row = el('div', 'row');
  row.append(
    btn('Salva', 'primary', () => {
      const t = titolo.value.trim();
      if (!t) { toast('Scrivi di cosa si tratta.'); return; }
      const v = { titolo: t, destinatario: dest.value.trim(), inviata: inviata.value, ricontrolla: ric.value, nota: nota.value.trim() };
      ui.modifica = null;
      ctx.aggiorna((d) => {
        if (p) Object.assign(d.pratiche.find((x) => x.id === p.id), v);
        else d.pratiche.unshift({ id: 'p-' + Date.now().toString(36), stato: 'aperta', ...v });
      });
      toast('Salvato');
    }),
    btn('Annulla', 'link', () => { ui.modifica = null; ctx.rerender(); }),
  );
  box.append(row);
  return box;
}

function card(ctx, p) {
  if (ui.modifica === p.id) return form(ctx, p);
  const chiusa = p.stato === 'chiusa';
  const c = el('article', 'card' + (chiusa ? ' done' : ''));
  const top = el('div', 'top');
  top.append(el('h3', null, p.titolo));
  top.append(el('span', 'tag' + (chiusa ? ' ok' : ' wait'), chiusa ? 'Chiusa' : 'Aperta'));
  c.append(top);
  const meta = [p.destinatario, p.inviata && 'inviata il ' + fmtShort(p.inviata), !chiusa && p.ricontrolla && 'ricontrolla il ' + fmtShort(p.ricontrolla)].filter(Boolean);
  if (meta.length) c.append(el('div', 'prof', meta.join(' · ')));
  if (p.nota) c.append(el('p', 'est', p.nota));
  if (!chiusa && praticheDaRicontrollare([p], ctx.oggi).length) c.append(el('div', 'note', 'È ora di ricontrollare: è arrivata una risposta?'));
  const act = el('div', 'actions');
  act.append(
    btn(chiusa ? 'Riapri' : 'Segna come chiusa', chiusa ? '' : 'pass', () => ctx.aggiorna((d) => {
      d.pratiche.find((x) => x.id === p.id).stato = chiusa ? 'aperta' : 'chiusa';
    })),
    btn('Modifica', '', () => { ui.modifica = p.id; ctx.rerender(); }),
    btn('Elimina', 'link', () => ctx.aggiorna((d) => { d.pratiche = d.pratiche.filter((x) => x.id !== p.id); })),
  );
  c.append(act);
  return c;
}

export function renderPratiche(ctx) {
  const { doc } = ctx;
  const v = el('div', 'view');
  const head = el('div', 'stack');
  head.append(el('h2', 'section-title', 'Questioni in sospeso'));
  head.append(el('p', 'foot', 'Mail inviate e risposte da aspettare. Quando arriva la data "ricontrolla", te lo ricordo in Home.'));
  const row = el('div', 'row');
  if (ui.modifica !== 'nuova') row.append(btn('+ Nuova questione', 'primary', () => { ui.modifica = 'nuova'; ctx.rerender(); }));
  head.append(row);
  v.append(head);
  if (ui.modifica === 'nuova') v.append(form(ctx, null));
  const aperte = doc.pratiche.filter((p) => p.stato !== 'chiusa');
  const chiuse = doc.pratiche.filter((p) => p.stato === 'chiusa');
  if (!doc.pratiche.length) v.append(el('p', 'empty', 'Nessuna questione in sospeso.'));
  if (aperte.length) { const s = el('div', 'stack'); s.append(...aperte.map((p) => card(ctx, p))); v.append(s); }
  if (chiuse.length) {
    const s = el('div', 'stack'); s.append(el('h3', 'eyebrow', 'Chiuse'), ...chiuse.map((p) => card(ctx, p))); v.append(s);
  }
  return v;
}

/** Home banner for issues whose check date has arrived. */
export function bannerPratiche(ctx) {
  const da = praticheDaRicontrollare(ctx.doc.pratiche, ctx.oggi);
  if (!da.length) return null;
  const b = el('div', 'banner warn');
  b.append(el('span', null, da.length === 1 ? 'Da ricontrollare: ' + da[0].titolo : da.length + ' questioni da ricontrollare.'));
  const r = el('div', 'row'); r.append(btn('Apri', '', () => ctx.vai('pratiche'))); b.append(r);
  return b;
}
