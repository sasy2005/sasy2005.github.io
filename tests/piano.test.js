import { test, eq } from './runner.js';
import { conflitti, promemoria, appelliMancanti, prossimoEsame, aggiungiGiorni, giorniTra } from '../src/piano.js';

test('date: aggiungiGiorni e giorniTra', () => {
  eq(aggiungiGiorni('2027-01-12', -7), '2027-01-05');
  eq(aggiungiGiorni('2027-03-01', -1), '2027-02-28');
  eq(giorniTra('2027-01-12', '2027-01-14'), 2);
  eq(giorniTra('2027-03-27', '2027-03-29'), 2); // across the DST change
});

test('conflitti: esami troppo vicini', () => {
  const piano = { a: { data: '2027-01-12' }, b: { data: '2027-01-14' }, c: { data: '2027-02-01' } };
  eq(conflitti(piano, 3), [{ a: 'a', b: 'b', giorni: 2 }]);
  eq(conflitti(piano, 2), []);
});

test('conflitti: stesso giorno', () => {
  eq(conflitti({ x: { data: '2027-01-14' }, y: { data: '2027-01-14' } }, 3), [{ a: 'x', b: 'y', giorni: 0 }]);
});

test('promemoria prenotazione', () => {
  eq(promemoria({ a: { data: '2027-01-12', prenotato: false } }, 7, '2027-01-05'), [{ id: 'a', scadenza: '2027-01-05', urgente: true }]);
  eq(promemoria({ a: { data: '2027-01-12', prenotato: false } }, 7, '2027-01-04'), [{ id: 'a', scadenza: '2027-01-05', urgente: false }]);
  eq(promemoria({ a: { data: '2027-01-12', prenotato: true } }, 7, '2027-01-05'), []);
  eq(promemoria({ a: { data: '2027-01-02', prenotato: false } }, 7, '2027-01-05'), []); // exam already past
});

const CORSI = [
  { id: 'a', cfu_da_fare: 6, appelli: [{ data: '2027-01-12', ora: '08:30', aula: 'U1' }, { data: '2027-02-02', ora: '08:30', aula: 'U2', rimosso: true }] },
  { id: 'b', cfu_da_fare: 9, appelli: [{ data: '2027-01-10', ora: '09:00', aula: 'U3' }] },
  { id: 'c', cfu_da_fare: 6, appelli: [{ data: '2027-01-08', ora: '09:00', aula: 'U4' }] },
  { id: 'r', cfu_da_fare: 0, appelli: [] },
];

test('appelliMancanti: data sparita o rimossa', () => {
  eq(appelliMancanti(CORSI, { a: { data: '2027-01-12', ora: '08:30' } }), []);
  eq(appelliMancanti(CORSI, { a: { data: '2027-02-02', ora: '08:30' } }), ['a']);
  eq(appelliMancanti(CORSI, { b: { data: '2027-01-11', ora: '09:00' } }), ['b']);
  eq(appelliMancanti(CORSI, { zz: { data: '2027-01-11', ora: '09:00' } }), ['zz']);
});

test('prossimoEsame: preferisce quello scelto', () => {
  const r = prossimoEsame(CORSI, { a: { data: '2027-01-12', ora: '08:30' } }, {}, '2027-01-01');
  eq([r.id, r.appello.aula, r.giorni, r.scelto], ['a', 'U1', 11, true]);
});

test('prossimoEsame: senza piano il primo disponibile', () => {
  const r = prossimoEsame(CORSI, {}, {}, '2027-01-01');
  eq([r.id, r.scelto, r.giorni], ['c', false, 7]);
});

test('prossimoEsame: salta gli esami passati e le date passate', () => {
  const r = prossimoEsame(CORSI, {}, { c: { passato: true, voto: 25 } }, '2027-01-01');
  eq(r.id, 'b');
  eq(prossimoEsame(CORSI, {}, {}, '2027-03-01'), null);
});

import { eventiCalendario } from '../src/ui/piano.js';
import { docVuoto } from '../src/userdoc.js';

test('eventiCalendario: promemoria prenotazione solo se non prenotato', () => {
  const corsi = [{ id: 'a', materia: 'Statistica', appelli: [{ data: '2027-01-12', ora: '08:30', aula: 'U4-02', tipo: 'scritto' }] }];
  const doc = { ...docVuoto(), piano: { a: { data: '2027-01-12', ora: '08:30', prenotato: false } } };
  const [e] = eventiCalendario(corsi, doc);
  eq([e.inizio, e.luogo, e.titolo], ['2027-01-12T08:30', 'U4-02', 'Esame: Statistica']);
  eq(e.allarmi.map((a) => a.giorniPrima), [7, 2]);
  doc.piano.a.prenotato = true;
  eq(eventiCalendario(corsi, doc)[0].allarmi.map((a) => a.giorniPrima), [2]);
});

test('conflitti: ignora le date già passate', () => {
  const piano = { a: { data: '2027-01-12' }, b: { data: '2027-01-13' }, c: { data: '2027-02-01' }, d: { data: '2027-02-02' } };
  eq(conflitti(piano, 3, '2027-01-20', {}), [{ a: 'c', b: 'd', giorni: 1 }]);
});

test('conflitti: ignora gli esami già passati', () => {
  const piano = { a: { data: '2027-02-01' }, b: { data: '2027-02-02' } };
  eq(conflitti(piano, 3, '2027-01-01', { a: { passato: true, voto: 27 } }), []);
});

test('eventiCalendario: lo stesso esame tiene lo stesso UID anche se cambi data', () => {
  const corsi = [{ id: 'a', materia: 'Statistica', appelli: [] }];
  const d1 = { ...docVuoto(), piano: { a: { data: '2027-01-12', ora: '08:30' } } };
  const d2 = { ...docVuoto(), piano: { a: { data: '2027-02-02', ora: '08:30' } } };
  eq(eventiCalendario(corsi, d1)[0].uid, eventiCalendario(corsi, d2)[0].uid);
});
