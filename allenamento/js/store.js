// Stato dell'app salvato sul telefono (localStorage). Ogni modifica segna cosa va sincronizzato:
// 'main' (schede, scheda attiva, impostazioni) oppure una seduta per id.
import { SCHEDA_INIZIALE } from './scheda.js';

const KEY = 'allenamento-v1';
const ascoltatori = new Set();
let remoto = null;

function vuoto() {
  return {
    v: 1,
    schede: { [SCHEDA_INIZIALE.id]: SCHEDA_INIZIALE },
    attiva: SCHEDA_INIZIALE.id,
    impostazioni: { recuperoBase: 60, recupero: {} },
    sedute: {},
    corrente: null,
    agg: 0,
  };
}

function carica() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) {
      const base = vuoto();
      return { ...base, ...s, impostazioni: { ...base.impostazioni, ...s.impostazioni }, schede: { ...base.schede, ...s.schede } };
    }
  } catch { /* storage non disponibile o corrotto: si riparte */ }
  return vuoto();
}

let stato = carica();
let sporchi = new Set(JSON.parse(localStorage.getItem(KEY + '-sporchi') || '[]'));

function salva() {
  try {
    localStorage.setItem(KEY, JSON.stringify(stato));
    localStorage.setItem(KEY + '-sporchi', JSON.stringify([...sporchi]));
  } catch { /* quota piena: resta in memoria */ }
}

export const get = () => stato;

/** Modifica lo stato. tocca: 'main' e/o id di sedute. locale: non va sincronizzato (es. seduta corrente). */
export function aggiorna(fn, tocca = [], { locale = false } = {}) {
  fn(stato);
  const ora = Date.now();
  for (const k of tocca) {
    if (k === 'main') stato.agg = ora;
    else if (stato.sedute[k]) stato.sedute[k].agg = ora;
    if (!locale) sporchi.add(k);
  }
  salva();
  for (const f of ascoltatori) f(stato, tocca);
  if (remoto && tocca.length && !locale) remoto(tocca);
}

/** Dati arrivati dal cloud: non vanno rimandati indietro. */
export function daRemoto(fn) {
  fn(stato);
  salva();
  for (const f of ascoltatori) f(stato, []);
}

export const ascolta = (f) => { ascoltatori.add(f); return () => ascoltatori.delete(f); };
export const setRemoto = (f) => { remoto = f; };
export const sporco = () => [...sporchi];
export function pulito(keys) { for (const k of keys) sporchi.delete(k); salva(); }

export const schedaAttiva = () => stato.schede[stato.attiva] || SCHEDA_INIZIALE;
export const seduteOrdinate = () =>
  Object.values(stato.sedute).filter((s) => !s.del).sort((a, b) => a.inizio - b.inizio);
