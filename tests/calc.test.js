import { test, eq, near } from './runner.js';
import { corsiEffettivi, stats, stima, votoEsito, baseLaurea } from '../src/calc.js';
import { CORSI_TEST, RIC_TEST } from './fixtures.js';

const eff = () => corsiEffettivi(CORSI_TEST, RIC_TEST);
const byId = (list, id) => list.find((k) => k.id === id);

test('corsiEffettivi: integrazione, intero, riconosciuto', () => {
  const k = eff();
  eq([byId(k, 'A').cfu_da_fare, byId(k, 'A').tipo], [6, 'Integrazione']);
  eq([byId(k, 'B').cfu_da_fare, byId(k, 'B').tipo, byId(k, 'B').ric_cfu], [6, 'Esame intero', 0]);
  eq([byId(k, 'C').cfu_da_fare, byId(k, 'C').tipo], [0, 'Riconosciuto']);
  eq(byId(k, 'A').ric_voto, 22);
});

test('corsiEffettivi non modifica i corsi pubblici', () => {
  eff();
  eq(CORSI_TEST[0].ric_cfu, undefined);
});

test('stats: solo riconosciuti', () => {
  const s = stats(eff(), {});
  near(s.media, 23.5);
  eq(s.cfuMedia, 12);
  eq(s.tot, 24);
});

test('stats: B passato con 28', () => {
  const s = stats(eff(), { B: { passato: true, voto: 28 } });
  near(s.media, 25);
  eq(s.acq, 18);
  eq(s.nDone, 1);
  eq(s.nTodo, 2);
});

test('stats: parziali entrano solo nella media con stime', () => {
  const s = stats(eff(), { B: { parziali: [{ voto: 24 }, { voto: 26 }] } });
  near(s.media, 23.5);
  near(s.mediaStima, 24);
});

test('stats: 30 e lode vale 30', () => {
  const s = stats(eff(), { B: { passato: true, voto: 30, lode: true } });
  near(s.media, (282 + 180) / 18);
});

test('stima e votoEsito', () => {
  eq(stima({ parziali: [{ voto: 20 }, { voto: 'x' }, { voto: 24 }] }), 22);
  eq(stima({}), null);
  eq(votoEsito({ passato: true, voto: 30, lode: true }), 30);
  eq(votoEsito({ passato: false, voto: 25 }), null);
});

test('baseLaurea', () => {
  near(baseLaurea(27), 99);
  eq(baseLaurea(null), null);
});
