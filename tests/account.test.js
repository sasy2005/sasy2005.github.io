import { test, eq } from './runner.js';
import { renderAccount } from '../src/ui/account.js';

const fake = { accedi: async () => {}, esci: async () => {} };
const testo = (stato) => { const h = document.createElement('div'); renderAccount(h, stato, fake); return h.textContent; };

test('account: non configurato → vuoto', () => eq(testo(null), ''));
test('account: disconnesso', () => eq(testo({ utente: null, online: true }), 'Accedi con GoogleSolo su questo dispositivo'));
test('account: sincronizzato', () => eq(testo({ utente: { nome: 'X' }, online: true, sincronizzato: true }), 'SincronizzatoEsci'));
test('account: offline', () => eq(testo({ utente: { nome: 'X' }, online: false }), 'Offline · salvato sul dispositivoEsci'));

import { ricorda, ricordato } from '../src/ui/account.js';

test('account: all\'avvio, finché Firebase non risponde, niente pulsante di accesso', () => {
  const h = document.createElement('div');
  renderAccount(h, { pronto: false, utente: null, online: true }, fake);
  eq(h.querySelectorAll('button').length, 0);
  eq(h.textContent.includes('Accesso in corso'), true);
});

test('account: l\'utente ricordato compare subito all\'avvio', () => {
  const h = document.createElement('div');
  renderAccount(h, { pronto: false, utente: null, ricordato: { nome: 'Mario Rossi' }, online: true }, fake);
  eq(h.textContent.includes('Mario Rossi'), true);
  eq(h.querySelectorAll('button').length, 0);
});

test('account: ricorda e dimentica l\'utente', () => {
  const prima = localStorage.getItem('libretto-utente');
  ricorda({ nome: 'Mario Rossi', foto: null });
  eq(ricordato().nome, 'Mario Rossi');
  ricorda(null);
  eq(ricordato(), null);
  if (prima != null) localStorage.setItem('libretto-utente', prima);
});
