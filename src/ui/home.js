// Home widgets: next exam banner and urgent warnings.
import { el, btn, fmtShort } from './dom.js';
import { prossimoEsame } from '../piano.js';
import { bannerAvvisi } from './piano.js';

export function renderProssimo(ctx) {
  const { corsi, doc, oggi } = ctx;
  const box = el('div', 'stack');
  const r = prossimoEsame(corsi, doc.piano, doc.esami, oggi);
  if (r) {
    const k = corsi.find((c) => c.id === r.id);
    const b = el('div', 'banner');
    const quando = r.giorni === 0 ? 'oggi' : r.giorni === 1 ? 'domani' : 'tra ' + r.giorni + ' giorni';
    b.append(el('span', 'eyebrow', r.scelto ? 'Prossimo esame' : 'Prossimo appello disponibile'));
    b.append(el('b', 'big', k.materia + ' ' + quando));
    b.append(el('span', 'muted', [fmtShort(r.appello.data), r.appello.ora && 'ore ' + r.appello.ora, r.appello.aula].filter(Boolean).join(' · ')));
    if (r.scelto) b.append(el('span', null, doc.piano[r.id].prenotato ? 'Prenotato su Esse3 ✓' : 'Non ancora prenotato su Esse3'));
    else { const row = el('div', 'row'); row.append(btn('Scegli i tuoi appelli', '', () => ctx.vai('piano'))); b.append(row); }
    box.append(b);
  }
  const a = bannerAvvisi(ctx);
  if (a) box.append(a);
  return box.childNodes.length ? box : null;
}
