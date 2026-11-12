// Header widget: Google sign-in state and sync status.
import { el, btn, toast } from './dom.js';

const ERRORI = {
  'offline-primo-accesso': 'Per il primo accesso su questo dispositivo serve la connessione.',
  'permission-denied': 'Firebase ha rifiutato l\'accesso ai dati: controlla le regole di Firestore.',
  'auth/unauthorized-domain': 'Questo indirizzo non è autorizzato in Firebase (Authentication → Settings → Authorized domains).',
  'auth/popup-closed-by-user': null,
  'auth/cancelled-popup-request': null,
};

const UTENTE_KEY = 'libretto-utente';

/** Remembers who was signed in, so the header shows them at once on the next launch. */
export function ricorda(utente) {
  try {
    if (utente) localStorage.setItem(UTENTE_KEY, JSON.stringify({ nome: utente.nome || '', foto: utente.foto || null }));
    else localStorage.removeItem(UTENTE_KEY);
  } catch { /* ignore */ }
}

export function ricordato() {
  try { return JSON.parse(localStorage.getItem(UTENTE_KEY) || 'null'); } catch { return null; }
}

function avatar(host, foto) {
  if (!foto) return;
  const img = el('img', 'avatar'); img.src = foto; img.alt = ''; img.referrerPolicy = 'no-referrer';
  host.append(img);
}

export function renderAccount(host, stato, { accedi, esci }) {
  host.replaceChildren();
  if (!stato) return;
  if (stato.pronto === false) {
    // Firebase is still restoring the saved sign-in: never offer "Accedi" here.
    const r = stato.ricordato;
    if (r) { avatar(host, r.foto); host.append(el('span', 'sync', r.nome)); }
    host.append(el('span', 'sync', 'Accesso in corso…'));
    return;
  }
  if (stato.errore && ERRORI[stato.errore] !== null) {
    toast(ERRORI[stato.errore] || 'Problema con la sincronizzazione (' + stato.errore + ').');
  }
  if (!stato.utente) {
    host.append(btn('Accedi con Google', 'primary', () => accedi().catch((e) => {
      const m = ERRORI[e.code];
      if (m !== null) toast(m || 'Accesso non riuscito (' + (e.code || e.message) + ').');
    })));
    host.append(el('span', 'sync', 'Solo su questo dispositivo'));
    return;
  }
  avatar(host, stato.utente.foto);
  const testo = !stato.online ? 'Offline · salvato sul dispositivo'
    : stato.sincronizzato ? 'Sincronizzato' : 'Sincronizzazione…';
  host.append(el('span', 'sync', testo));
  host.append(btn('Esci', 'link', () => esci()));
}
