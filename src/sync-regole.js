// Pure rules for the first sign-in on a device (no Firebase imports, so it is testable).
import { uguali, vuoto } from './userdoc.js';

/**
 * What to do when a user signs in.
 * @returns {"carica-locale"|"usa-remoto"|"nessuna-azione"|"chiedi"}
 */
export function risolviPrimoAccesso(locale, remoto, syncUidPrecedente, uid, localeModificato = false) {
  if (!remoto) return 'carica-locale';
  if (vuoto(locale)) return 'usa-remoto';
  if (uguali(locale, remoto)) return 'nessuna-azione';
  // Same account and no edit made while disconnected: the online copy is current.
  if (syncUidPrecedente && syncUidPrecedente === uid && !localeModificato) return 'nessuna-azione';
  return 'chiedi';
}

const SEZIONI = ['esami', 'riconoscimenti', 'note', 'piano', 'ipotesi', 'obiettivo', 'impostazioni', 'checklist', 'pratiche', 'v'];

/** Top-level sections that differ between two documents (prima null → all). Sorted. */
export function campiCambiati(prima, dopo) {
  if (!prima) return [...SEZIONI].sort();
  return SEZIONI.filter((k) => JSON.stringify(canon(prima[k])) !== JSON.stringify(canon(dopo[k]))).sort();
}

function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])]));
  return x ?? null;
}
