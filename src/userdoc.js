// The private user document (v2): grades, LIUC recognition, notes, plan, simulations…
import { stats, votoEsito } from './calc.js';

export function docVuoto() {
  return {
    v: 2,
    aggiornato: null,
    esami: {},
    riconoscimenti: {},
    note: {},
    piano: {},
    ipotesi: {},
    obiettivo: null,
    impostazioni: { giorniMinimi: 3, anticipoPrenotazione: 7 },
    checklist: {},
    pratiche: [],
  };
}

const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);

/** Accepts a v1 backup ({esami}) or a v2 document; returns a complete v2 document. */
export function normalizza(raw) {
  if (!isObj(raw) || (!isObj(raw.esami) && raw.v == null)) throw new Error('Backup non valido');
  const base = docVuoto();
  const d = { ...base };
  for (const k of ['esami', 'riconoscimenti', 'note', 'piano', 'ipotesi', 'checklist']) {
    d[k] = isObj(raw[k]) ? structuredClone(raw[k]) : base[k];
  }
  d.impostazioni = { ...base.impostazioni, ...(isObj(raw.impostazioni) ? raw.impostazioni : {}) };
  d.pratiche = Array.isArray(raw.pratiche) ? structuredClone(raw.pratiche) : [];
  d.obiettivo = Number.isFinite(+raw.obiettivo) && raw.obiettivo !== null && raw.obiettivo !== '' ? +raw.obiettivo : null;
  d.aggiornato = typeof raw.aggiornato === 'string' ? raw.aggiornato : null;
  return d;
}

/**
 * Document resulting from importing `raw` over `attuale`: an old v1 backup (grades only)
 * updates only the grades and keeps everything else; a v2 backup replaces the document.
 */
export function docDaImport(raw, attuale) {
  const nuovo = normalizza(raw);
  if (raw.v != null) return nuovo;
  return { ...normalizza(attuale), esami: nuovo.esami };
}

/** Summary shown before an import or a sync choice. */
export function riepilogo(doc, corsiEff) {
  const voti = Object.entries(doc.esami)
    .map(([id, e]) => ({ id, voto: votoEsito(e) }))
    .filter((x) => x.voto != null);
  return {
    esamiPassati: voti.length,
    voti,
    media: stats(corsiEff, doc.esami).media,
    riconosciuti: Object.values(doc.riconoscimenti).filter((r) => +r.cfu > 0).length,
  };
}

/** True if the user is starting from nothing (no data worth protecting). */
export function vuoto(doc) {
  return uguali(normalizza(doc), docVuoto());
}

function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (isObj(x)) return Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])]));
  return x;
}

/** Deep comparison ignoring `aggiornato`. */
export function uguali(a, b) {
  const strip = (d) => { const { aggiornato, ...rest } = d; return canon(rest); };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}
