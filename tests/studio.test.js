import { test, eq } from './runner.js';
import { avanzamento, checklistIniziale, praticheDaRicontrollare } from '../src/studio.js';

test('avanzamento: lista vuota', () => {
  eq(avanzamento([]), { fatti: 0, totale: 0, percentuale: 0 });
  eq(avanzamento(undefined), { fatti: 0, totale: 0, percentuale: 0 });
});

test('avanzamento: 3 su 10', () => {
  const l = Array.from({ length: 10 }, (_, i) => ({ testo: 'x' + i, fatto: i < 3 }));
  eq(avanzamento(l), { fatti: 3, totale: 10, percentuale: 30 });
});

test('checklistIniziale: capitoli concordati', () => {
  const l = checklistIniziale({ programma: 'Capitoli concordati: 3, 5, 6, 8, 9, 10, 11, 12, 14, 15' });
  eq(l.length, 10);
  eq(l[0], { testo: 'Capitolo 3', fatto: false });
  eq(l[9].testo, 'Capitolo 15');
});

test('checklistIniziale: programma generico → lista vuota', () => {
  eq(checklistIniziale({ programma: 'Funzioni, limiti, serie' }), []);
  eq(checklistIniziale({}), []);
});

test('praticheDaRicontrollare', () => {
  const p = [
    { id: '1', titolo: 'Mail', ricontrolla: '2026-11-26', stato: 'aperta' },
    { id: '2', titolo: 'Chiusa', ricontrolla: '2026-11-01', stato: 'chiusa' },
    { id: '3', titolo: 'Senza data', stato: 'aperta' },
  ];
  eq(praticheDaRicontrollare(p, '2026-11-26').map((x) => x.id), ['1']);
  eq(praticheDaRicontrollare(p, '2026-11-25'), []);
});
