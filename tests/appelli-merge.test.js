import { test, eq } from './runner.js';
import { mergeAppelli, estraiAppelli, normalizzaAula } from '../src/appelli-merge.js';

const F = { da: '2027-01-01', a: '2027-04-30' };
const A = (data, ora, aula, extra = {}) => ({ data, ora, tipo: 'esame scritto', aula, ...extra });

test('merge: aggiorna l\'aula sulla stessa data e ora', () => {
  eq(mergeAppelli([A('2027-01-12', '08:30', 'U1')], [A('2027-01-12', '08:30', 'U2')], F), [A('2027-01-12', '08:30', 'U2')]);
});

test('merge: aggiunge le nuove date in ordine', () => {
  eq(mergeAppelli([A('2027-02-01', '08:30', 'U1')], [A('2027-02-01', '08:30', 'U1'), A('2027-01-10', '09:00', 'U3')], F),
    [A('2027-01-10', '09:00', 'U3'), A('2027-02-01', '08:30', 'U1')]);
});

test('merge: una data sparita nella finestra viene marcata, non cancellata', () => {
  eq(mergeAppelli([A('2027-01-12', '08:30', 'U1')], [], F), [A('2027-01-12', '08:30', 'U1', { rimosso: true })]);
});

test('merge: date fuori finestra o passate restano com\'erano', () => {
  const vecchie = [A('2026-09-10', '09:00', 'U1'), A('2027-06-15', '09:00', 'U2')];
  eq(mergeAppelli(vecchie, [], F), vecchie);
});

test('merge: una data ricomparsa perde "rimosso"', () => {
  eq(mergeAppelli([A('2027-01-12', '08:30', 'U1', { rimosso: true })], [A('2027-01-12', '08:30', 'U1')], F), [A('2027-01-12', '08:30', 'U1')]);
});

test('merge: non modifica gli input', () => {
  const es = [A('2027-01-12', '08:30', 'U1')];
  mergeAppelli(es, [], F);
  eq(es, [A('2027-01-12', '08:30', 'U1')]);
});

test('normalizzaAula', () => {
  eq(normalizzaAula('U3-01 con Podio, U3-05 con Podio'), 'U3-01, U3-05');
  eq(normalizzaAula('LAB14A1 (U14)'), 'LAB14A1 (U14)');
  eq(normalizzaAula(''), '');
});

const MAPPA = {
  stat: { nome: 'STATISTICA', turno: 'A-Lh' },
  'met-stat': { nome: 'METODI STATISTICI', turno: 'A-Lh' },
  'dir-pub': { nome: "DIRITTO PUBBLICO E DELL'ECONOMIA", turno: 'Li-Z' },
  'mat-fin': { nome: 'MATEMATICA FINANZIARIA', turno: 'A-Lh' },
  macro: { nome: 'MACROECONOMIA E POLITICHE ECONOMICHE', turno: 'A-Lh' },
};

test('estraiAppelli: campione reale del calendario Unimib', async () => {
  const risposta = await (await fetch('/tests/fixtures/calendario-sample.json')).json();
  const { appelli, nonTrovati } = estraiAppelli(risposta, MAPPA);
  eq(appelli.stat[0], { data: '2027-01-12', ora: '08:30', tipo: 'esame scritto-orale', aula: 'U4-02' });
  eq(appelli.stat.length, 3);
  eq(appelli['dir-pub'][0], { data: '2027-01-14', ora: '09:00', tipo: 'esame orale', aula: 'U1-11' });
  eq(appelli['mat-fin'][0].data, '2027-01-07');
  eq(appelli['met-stat'].length, 3);
  eq(nonTrovati, ['macro']);
});

test('estraiAppelli: scarta gli appelli annullati', () => {
  const r = { Insegnamenti: { 1: { DatiInsegnamento: { Nome: 'STATISTICA A-Lh' }, Appelli: [
    { Data: '12-01-2027', OraInizio: '08:30', TipoEsame: 'x', Aula: 'U1', event_Annullato: '1' },
    { Data: '13-01-2027', OraInizio: '08:30', TipoEsame: 'x', Aula: 'U1', event_Annullato: '0' },
  ] } } };
  eq(estraiAppelli(r, { stat: MAPPA.stat }).appelli.stat.map((a) => a.data), ['2027-01-13']);
});
