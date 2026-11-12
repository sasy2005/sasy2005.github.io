import { test, eq } from './runner.js';
import { risolviPrimoAccesso } from '../src/sync-regole.js';
import { docVuoto } from '../src/userdoc.js';

const conVoto = (v) => ({ ...docVuoto(), esami: { B: { passato: true, voto: v } } });

test('primo accesso: niente online → carica i dati locali', () => {
  eq(risolviPrimoAccesso(conVoto(28), null, null, 'u1'), 'carica-locale');
});

test('primo accesso: dispositivo vuoto → usa i dati online', () => {
  eq(risolviPrimoAccesso(docVuoto(), conVoto(28), null, 'u1'), 'usa-remoto');
});

test('stesso utente già sincronizzato → sincronizzazione normale', () => {
  eq(risolviPrimoAccesso(conVoto(27), conVoto(28), 'u1', 'u1'), 'nessuna-azione');
});

test('dati uguali → nessuna domanda', () => {
  eq(risolviPrimoAccesso(conVoto(28), conVoto(28), null, 'u1'), 'nessuna-azione');
});

test('dati diversi su entrambi → chiedi', () => {
  eq(risolviPrimoAccesso(conVoto(27), conVoto(28), null, 'u1'), 'chiedi');
  eq(risolviPrimoAccesso(conVoto(27), conVoto(28), 'altro', 'u1'), 'chiedi');
});
