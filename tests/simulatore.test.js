import { test, eq, near } from './runner.js';
import { votoNecessario, simula } from '../src/simulatore.js';
import { corsiEffettivi, stats } from '../src/calc.js';
import { CORSI_TEST, RIC_TEST } from './fixtures.js';

// A: 6 CFU to do (3 recognised at 22) · B: 6 CFU to do · C: 9 recognised at 24.
// Recognised weighted sum 282 on 12 CFU; total 24 CFU.
const eff = () => corsiEffettivi(CORSI_TEST, RIC_TEST);

test('votoNecessario: obiettivo 26 → 28,5 sugli esami rimasti', () => {
  const r = votoNecessario(eff(), {}, {}, 26);
  eq([r.stato, r.cfuRimasti], ['ok', 12]);
  near(r.voto, 28.5);
});

test('votoNecessario: con un voto ipotetico fissato', () => {
  const r = votoNecessario(eff(), {}, { A: 30 }, 26);
  eq([r.stato, r.cfuRimasti], ['ok', 6]);
  near(r.voto, 27);
});

test('votoNecessario: un esame già passato conta col suo voto', () => {
  const r = votoNecessario(eff(), { A: { passato: true, voto: 30 } }, {}, 26);
  near(r.voto, 27);
});

test('votoNecessario: irraggiungibile', () => {
  eq(votoNecessario(eff(), {}, {}, 29).stato, 'irraggiungibile');
});

test('votoNecessario: garantito', () => {
  eq(votoNecessario(eff(), {}, {}, 18).stato, 'garantito');
});

test('votoNecessario: nessun esame rimasto → dice se l’obiettivo è raggiunto', () => {
  const r = votoNecessario(eff(), { A: { passato: true, voto: 25 }, B: { passato: true, voto: 25 } }, {}, 26);
  eq([r.stato, r.voto, r.cfuRimasti], ['non-raggiunto', null, 0]);
  near(r.media, (282 + 300) / 24);
  eq(votoNecessario(eff(), { A: { passato: true, voto: 25 }, B: { passato: true, voto: 25 } }, {}, 24).stato, 'raggiunto');
});

test('votoNecessario: tutti gli esami rimasti con voto ipotetico', () => {
  const r = votoNecessario(eff(), {}, { A: 30, B: 30 }, 26);
  eq(r.stato, 'raggiunto');
  near(r.media, (282 + 360) / 24);
});

test('simula: media e base con voti ipotetici', () => {
  const r = simula(eff(), {}, { A: 30, B: 24 });
  near(r.media, (282 + 180 + 144) / 24);
  near(r.base, r.media * 110 / 30);
  eq(r.cfu, 24);
});

test('simula: non cambia la media vera né gli input', () => {
  const esami = { B: { parziali: [{ voto: 20 }] } };
  const ipotesi = { A: 30 };
  const prima = stats(eff(), esami).media;
  simula(eff(), esami, ipotesi);
  near(stats(eff(), esami).media, prima);
  eq(esami, { B: { parziali: [{ voto: 20 }] } });
  eq(ipotesi, { A: 30 });
});

test('simula: un voto ipotetico non sostituisce un esame passato', () => {
  const r = simula(eff(), { B: { passato: true, voto: 28 } }, { B: 18 });
  near(r.media, 25);
});
