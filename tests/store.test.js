import { test, eq } from './runner.js';
import * as store from '../src/store.js';

// The store uses localStorage['libretto-v2']; tests run on the test page's own origin path
// and restore the previous value afterwards.
const prev = localStorage.getItem(store.KEY);

test('store: salva e ricarica', () => {
  store.salva({ esami: { B: { passato: true, voto: 28 } } });
  const d = store.carica();
  eq(d.esami.B.voto, 28);
  eq(typeof d.aggiornato, 'string');
});

test('store: aggiorna non modifica il documento precedente', () => {
  const prima = store.attuale();
  store.aggiorna((d) => { d.obiettivo = 27; });
  eq(prima.obiettivo, null);
  eq(store.attuale().obiettivo, 27);
});

test('store: i listener ricevono l\'origine', () => {
  const seen = [];
  const off = store.onCambio((_, o) => seen.push(o));
  store.aggiorna((d) => { d.obiettivo = 26; });
  store.salva(store.attuale(), 'remoto');
  off();
  eq(seen, ['locale', 'remoto']);
});

test('store: scrive sul remoto solo per modifiche locali', () => {
  const scritti = [];
  store.setRemoto({ scrivi: (d) => scritti.push(d.obiettivo) });
  store.aggiorna((d) => { d.obiettivo = 25; });
  store.salva({ ...store.attuale(), obiettivo: 24 }, 'remoto');
  store.setRemoto(null);
  eq(scritti, [25]);
});

test('store: dati corrotti → documento vuoto', () => {
  localStorage.setItem(store.KEY, '{rotto');
  eq(store.carica().esami, {});
  if (prev == null) localStorage.removeItem(store.KEY); else localStorage.setItem(store.KEY, prev);
});

test('store: modifiche senza remoto segnano "da inviare"', () => {
  store.pulisciSporco();
  store.setRemoto(null);
  store.aggiorna((d) => { d.obiettivo = 23; });
  eq(store.sporco(), true);
  store.pulisciSporco();
  eq(store.sporco(), false);
  store.salva(store.attuale(), 'remoto');
  eq(store.sporco(), false);
  if (prev == null) localStorage.removeItem(store.KEY); else localStorage.setItem(store.KEY, prev);
});
