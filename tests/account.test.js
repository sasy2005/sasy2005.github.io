import { test, eq } from './runner.js';
import { renderAccount } from '../src/ui/account.js';

const fake = { accedi: async () => {}, esci: async () => {} };
const testo = (stato) => { const h = document.createElement('div'); renderAccount(h, stato, fake); return h.textContent; };

test('account: non configurato → vuoto', () => eq(testo(null), ''));
test('account: disconnesso', () => eq(testo({ utente: null, online: true }), 'Accedi con GoogleSolo su questo dispositivo'));
test('account: sincronizzato', () => eq(testo({ utente: { nome: 'X' }, online: true, sincronizzato: true }), 'SincronizzatoEsci'));
test('account: offline', () => eq(testo({ utente: { nome: 'X' }, online: false }), 'Offline · salvato sul dispositivoEsci'));
