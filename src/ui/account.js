// Header widget: Google sign-in state and sync status.
import { el, btn, toast } from './dom.js';

const ERRORI = {
  'offline-primo-accesso': 'Per il primo accesso su questo dispositivo serve la connessione.',
  'permission-denied': 'Firebase ha rifiutato l\'accesso ai dati: controlla le regole di Firestore.',
  'auth/unauthorized-domain': 'Questo indirizzo non è autorizzato in Firebase (Authentication → Settings → Authorized domains).',
  'auth/popup-closed-by-user': null,
  'auth/cancelled-popup-request': null,
};

export function renderAccount(host, stato, { accedi, esci }) {
  host.replaceChildren();
  if (!stato) return;
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
  if (stato.utente.foto) {
    const img = el('img', 'avatar'); img.src = stato.utente.foto; img.alt = ''; img.referrerPolicy = 'no-referrer';
    host.append(img);
  }
  const testo = !stato.online ? 'Offline · salvato sul dispositivo'
    : stato.sincronizzato ? 'Sincronizzato' : 'Sincronizzazione…';
  host.append(el('span', 'sync', testo));
  host.append(btn('Esci', 'link', () => esci()));
}
