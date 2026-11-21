// Accesso Google e sincronizzazione su Firestore, con lo stesso progetto Firebase di Libretto.
// allenamento/{uid}: schede, scheda attiva, impostazioni. allenamento/{uid}/sedute/{id}: una seduta per documento.
// Unione per data di modifica: vince la versione più recente, così il telefono offline non perde nulla.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
  indexedDBLocalPersistence, browserLocalPersistence, initializeAuth, browserPopupRedirectResolver,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, onSnapshot, collection,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from '../../src/firebase-config.js';
import * as store from './store.js';

let auth, db, uid = null, unsubs = [], timer = null;
let stato = { pronto: false, utente: null, sincronizzato: false, errore: null };
let notifica = () => {};
const set = (p) => { stato = { ...stato, ...p }; notifica(stato); };
const pulito = (d) => JSON.parse(JSON.stringify(d));
const errore = (e) => set({ errore: e?.code === 'permission-denied' ? 'permessi' : (e?.code || String(e)) });

let mainRicevuto = false, seduteRicevute = false;

async function invia() {
  if (!uid || !mainRicevuto || !seduteRicevute) return;
  const keys = store.sporco();
  if (!keys.length) return;
  const s = store.get();
  try {
    await Promise.all(keys.map((k) => {
      if (k === 'main') {
        return setDoc(doc(db, 'allenamento', uid), pulito({ schede: s.schede, attiva: s.attiva, impostazioni: s.impostazioni, agg: s.agg }));
      }
      const sed = s.sedute[k];
      return sed ? setDoc(doc(db, 'allenamento', uid, 'sedute', k), pulito(sed)) : null;
    }));
    store.pulito(keys);
    set({ errore: null });
  } catch (e) { errore(e); }
}
const programma = () => { clearTimeout(timer); timer = setTimeout(invia, 800); };

function collega(user) {
  uid = user.uid;
  mainRicevuto = seduteRicevute = false;
  const ref = doc(db, 'allenamento', uid);
  unsubs.push(onSnapshot(ref, { includeMetadataChanges: true }, (snap) => {
    set({ sincronizzato: !snap.metadata.fromCache && !snap.metadata.hasPendingWrites });
    if (snap.metadata.hasPendingWrites) return;
    const r = snap.exists() ? snap.data() : null;
    const locale = store.get();
    if (r) {
      // Le schede si sommano sempre (nessuna si perde); attiva e impostazioni dal lato più recente.
      const nuoveSchede = Object.keys(r.schede || {}).some((id) => !locale.schede[id]);
      if (nuoveSchede || (r.agg || 0) > (locale.agg || 0)) {
        store.daRemoto((s) => {
          s.schede = { ...s.schede, ...(r.schede || {}) };
          if ((r.agg || 0) > (s.agg || 0)) { s.attiva = r.attiva || s.attiva; s.impostazioni = { ...s.impostazioni, ...r.impostazioni }; s.agg = r.agg; }
        });
      }
      const schedeLocaliMancanti = Object.keys(locale.schede).some((id) => !r.schede?.[id]);
      if ((locale.agg || 0) > (r.agg || 0) || schedeLocaliMancanti) store.aggiorna(() => {}, ['main']);
    } else store.aggiorna(() => {}, ['main']);
    mainRicevuto = true;
    programma();
  }, errore));
  unsubs.push(onSnapshot(collection(ref, 'sedute'), (snap) => {
    if (snap.metadata.hasPendingWrites) return;
    const remote = new Map(snap.docs.map((d) => [d.id, d.data()]));
    const locale = store.get().sedute;
    const daPrendere = [...remote.values()].filter((r) => !locale[r.id] || (r.agg || 0) > (locale[r.id].agg || 0));
    if (daPrendere.length) store.daRemoto((s) => { for (const r of daPrendere) s.sedute[r.id] = r; });
    if (!seduteRicevute) {
      // Primo collegamento: carica le sedute fatte su questo telefono che online non ci sono ancora.
      const mancanti = Object.values(locale).filter((l) => !remote.has(l.id) || (l.agg || 0) > (remote.get(l.id).agg || 0)).map((l) => l.id);
      if (mancanti.length) store.aggiorna(() => {}, mancanti);
    }
    seduteRicevute = true;
    programma();
  }, errore));
}

export function avvia(onStato) {
  notifica = onStato;
  const app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  store.setRemoto(programma);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') invia(); });
  window.addEventListener('online', programma);
  getRedirectResult(auth).catch(errore);
  onAuthStateChanged(auth, (user) => {
    unsubs.forEach((u) => u()); unsubs = []; uid = null;
    set({ pronto: true, utente: user ? { nome: user.displayName, email: user.email, foto: user.photoURL } : null, sincronizzato: false, errore: null });
    if (user) collega(user);
  });
  notifica(stato);
}

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export async function accedi() {
  const provider = new GoogleAuthProvider();
  if (standalone()) return signInWithRedirect(auth, provider);
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return signInWithRedirect(auth, provider);
    throw e;
  }
}

export async function esci() {
  await invia();
  await signOut(auth);
}
