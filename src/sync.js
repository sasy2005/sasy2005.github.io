// Google sign-in + Firestore sync of the private document (utenti/{uid}).
// Loaded lazily by app.js only when firebase-config.js is filled in.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, indexedDBLocalPersistence, browserLocalPersistence, initializeAuth,
  browserPopupRedirectResolver,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { normalizza, uguali, riepilogo } from './userdoc.js';
import { corsiEffettivi } from './calc.js';
import { risolviPrimoAccesso } from './sync-regole.js';

const UID_KEY = 'libretto-sync-uid';
let auth, db, unsub = null, timer = null, pending = null;
let stato = { utente: null, online: navigator.onLine, sincronizzato: false, errore: null };
let notifica = () => {};
let store, corsiPub, chiedi, listaRiepilogo, el;

const setStato = (patch) => { stato = { ...stato, ...patch }; notifica(stato); };
const pulito = (d) => JSON.parse(JSON.stringify(d));

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function flush() {
  if (!pending) return;
  clearTimeout(timer);
  const { ref, d } = pending; pending = null;
  setDoc(ref, pulito(d)).catch((e) => setStato({ errore: e.code || String(e) }));
}

function scriviDebounced(ref) {
  return {
    scrivi(d) {
      pending = { ref, d };
      clearTimeout(timer);
      timer = setTimeout(flush, 500);
    },
  };
}

async function scegli(locale, remoto) {
  const c = (d) => listaRiepilogo(riepilogo(d, corsiEffettivi(corsiPub(), d.riconoscimenti)), corsiPub(), d);
  const body = el('div');
  body.append(el('p', null, 'Su questo dispositivo e online ci sono dati diversi. Quali vuoi tenere?'));
  body.append(el('p', null, 'Su questo dispositivo:'), c(locale), el('p', null, 'Online:'), c(remoto));
  return chiedi('Quali dati tenere?', body, [
    { label: 'Tieni questo dispositivo', value: 'locale', cls: '' },
    { label: 'Tieni quelli online', value: 'remoto', cls: 'primary' },
  ]);
}

async function collega(user) {
  const ref = doc(db, 'utenti', user.uid);
  let remoto;
  try {
    const snap = await getDoc(ref);
    remoto = snap.exists() ? normalizza(snap.data()) : null;
  } catch {
    // Offline with nothing cached: only safe if this device already synced with this account.
    if (localStorage.getItem(UID_KEY) !== user.uid) {
      setStato({ errore: 'offline-primo-accesso' });
      return;
    }
    remoto = undefined;
  }

  if (remoto !== undefined) {
    const scelta = risolviPrimoAccesso(store.attuale(), remoto, localStorage.getItem(UID_KEY), user.uid);
    if (scelta === 'carica-locale') await setDoc(ref, pulito(store.attuale()));
    else if (scelta === 'usa-remoto') store.salva(remoto, 'remoto');
    else if (scelta === 'chiedi') {
      const r = await scegli(store.attuale(), remoto);
      if (r === 'locale') await setDoc(ref, pulito(store.attuale()));
      else if (r === 'remoto') store.salva(remoto, 'remoto');
      else { await signOut(auth); return; } // dismissed: change nothing
    }
  }
  localStorage.setItem(UID_KEY, user.uid);
  store.setRemoto(scriviDebounced(ref));
  unsub = onSnapshot(ref, { includeMetadataChanges: true }, (s) => {
    setStato({ sincronizzato: !s.metadata.fromCache && !s.metadata.hasPendingWrites });
    if (!s.exists() || s.metadata.hasPendingWrites || pending) return;
    const r = normalizza(s.data());
    if (!uguali(r, store.attuale())) store.salva(r, 'remoto');
  }, (e) => setStato({ errore: e.code || String(e) }));
}

/** deps: { store, corsiPub: () => Corso[], chiedi, listaRiepilogo, el, onStato(stato) } */
export async function avvia(deps) {
  ({ store, corsiPub, chiedi, listaRiepilogo, el } = deps);
  notifica = deps.onStato || notifica;
  const app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  window.addEventListener('online', () => setStato({ online: true }));
  window.addEventListener('offline', () => setStato({ online: false }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  getRedirectResult(auth).catch((e) => setStato({ errore: e.code || String(e) }));
  onAuthStateChanged(auth, async (user) => {
    if (unsub) { unsub(); unsub = null; }
    store.setRemoto(null);
    setStato({ utente: user ? { nome: user.displayName, email: user.email, foto: user.photoURL } : null, sincronizzato: false, errore: null });
    if (user) {
      try { await collega(user); } catch (e) { setStato({ errore: e.code || String(e) }); }
    }
  });
  notifica(stato);
}

export async function accedi() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // In the installed iPhone app popups are unreliable: use a redirect on the same domain.
  if (standalone()) return signInWithRedirect(auth, provider);
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return signInWithRedirect(auth, provider);
    throw e;
  }
}

export async function esci() {
  flush();
  localStorage.removeItem(UID_KEY); // next sign-in compares again instead of overwriting local edits
  await signOut(auth);
}
