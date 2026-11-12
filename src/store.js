// Local-first store for the private user document. Task 6 plugs the remote side in via setRemoto().
import { docVuoto, normalizza } from './userdoc.js';

export const KEY = 'libretto-v2';
const SPORCO = 'libretto-sporco'; // local edits not yet sent online
let doc = null;
const listeners = new Set();
let remoto = null; // { scrivi(doc) } when signed in

export function carica() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    doc = raw ? normalizza(raw) : docVuoto();
  } catch { doc = docVuoto(); }
  return doc;
}

export const attuale = () => doc || carica();

/** Replace the whole document (import, sync). origine 'remoto' avoids writing back. */
export function salva(nuovo, origine = 'locale') {
  doc = normalizza(nuovo);
  if (origine === 'locale') doc.aggiornato = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(doc)); }
  catch { /* storage full or blocked: the remote copy (if any) still gets it */ }
  if (origine === 'locale') {
    if (remoto) remoto.scrivi(doc);
    else try { localStorage.setItem(SPORCO, '1'); } catch { /* ignore */ }
  }
  for (const fn of listeners) fn(doc, origine);
  return doc;
}

/** Mutate a copy of the document and save it. */
export function aggiorna(mutator) {
  const copia = structuredClone(attuale());
  mutator(copia);
  return salva(copia);
}

export function onCambio(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function setRemoto(r) { remoto = r; }

/** True if something was edited while not connected to the online copy. */
export function sporco() { try { return localStorage.getItem(SPORCO) === '1'; } catch { return false; } }
export function pulisciSporco() { try { localStorage.removeItem(SPORCO); } catch { /* ignore */ } }
