import { test, eq, near, throws } from './runner.js';
import { docVuoto, normalizza, riepilogo, uguali, vuoto } from '../src/userdoc.js';
import { corsiEffettivi } from '../src/calc.js';
import { CORSI_TEST, RIC_TEST } from './fixtures.js';

test('docVuoto: valori predefiniti', () => {
  const d = docVuoto();
  eq([d.v, d.impostazioni.giorniMinimi, d.impostazioni.anticipoPrenotazione, d.obiettivo], [2, 3, 7, null]);
  eq(d.pratiche, []);
});

test('normalizza: backup v1 (solo esami)', () => {
  const d = normalizza({ esami: { B: { passato: true, voto: 28 } } });
  eq(d.v, 2);
  eq(d.esami.B.voto, 28);
  eq(d.impostazioni.giorniMinimi, 3);
  eq(d.riconoscimenti, {});
});

test('normalizza: id sconosciuti conservati', () => {
  const d = normalizza({ esami: { Z: { passato: true, voto: 25 } } });
  eq(d.esami.Z.voto, 25);
});

test('normalizza: rifiuta un oggetto senza esami né versione', () => {
  throws(() => normalizza({}), 'Backup non valido');
  throws(() => normalizza(null), 'Backup non valido');
});

test('normalizza: v2 resta uguale', () => {
  const d = { ...docVuoto(), riconoscimenti: RIC_TEST, piano: { A: { data: '2027-01-12', ora: '08:30', prenotato: false } } };
  eq(uguali(normalizza(d), d), true);
});

test('normalizza: impostazioni parziali completate', () => {
  const d = normalizza({ v: 2, impostazioni: { giorniMinimi: 5 } });
  eq([d.impostazioni.giorniMinimi, d.impostazioni.anticipoPrenotazione], [5, 7]);
});

test('uguali ignora aggiornato', () => {
  const a = { ...docVuoto(), aggiornato: '2026-01-01T00:00:00Z' };
  const b = { ...docVuoto(), aggiornato: '2026-02-01T00:00:00Z' };
  eq(uguali(a, b), true);
  eq(uguali(a, { ...b, obiettivo: 27 }), false);
});

test('riepilogo', () => {
  const d = normalizza({ v: 2, riconoscimenti: RIC_TEST, esami: { B: { passato: true, voto: 28 } } });
  const r = riepilogo(d, corsiEffettivi(CORSI_TEST, d.riconoscimenti));
  eq(r.esamiPassati, 1);
  eq(r.voti, [{ id: 'B', voto: 28 }]);
  eq(r.riconosciuti, 2);
  near(r.media, 25);
});

test('vuoto: documento senza dati', () => {
  eq(vuoto(docVuoto()), true);
  eq(vuoto({ esami: {} }), true);
  eq(vuoto({ esami: { B: { passato: true, voto: 28 } } }), false);
});

import { docDaImport } from '../src/userdoc.js';

test('import v1 sopra un documento esistente aggiorna solo i voti', () => {
  const cur = normalizza({ v: 2, riconoscimenti: RIC_TEST, piano: { A: { data: '2027-01-12', ora: '08:30' } }, pratiche: [{ id: 'p', titolo: 'Mail' }], esami: { A: { passato: true, voto: 20 } } });
  const d = docDaImport({ esami: { B: { passato: true, voto: 28 } } }, cur);
  eq(d.esami, { B: { passato: true, voto: 28 } });
  eq(d.riconoscimenti, RIC_TEST);
  eq(d.piano.A.data, '2027-01-12');
  eq(d.pratiche.length, 1);
});

test('import v2 sostituisce tutto', () => {
  const cur = normalizza({ v: 2, riconoscimenti: RIC_TEST });
  eq(docDaImport({ v: 2, esami: {} }, cur).riconoscimenti, {});
});
