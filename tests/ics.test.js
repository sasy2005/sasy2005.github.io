import { test, eq } from './runner.js';
import { creaIcs } from '../src/ics.js';

const ev = {
  uid: 'stat-20270112@libretto', titolo: 'Esame: Statistica', inizio: '2027-01-12T08:30', durataMin: 120,
  luogo: 'U3-01, U3-05', descrizione: 'Scritto; porta il libretto\nPrenota su Esse3',
  allarmi: [{ giorniPrima: 7, testo: 'Prenotati su Esse3' }, { giorniPrima: 2, testo: 'Esame tra 2 giorni' }],
};

test('ics: struttura e date locali', () => {
  const s = creaIcs([ev]);
  eq(s.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Libretto//IT'), true);
  eq(s.includes('BEGIN:VEVENT'), true);
  eq(s.includes('DTSTART:20270112T083000\r\n'), true);
  eq(s.includes('DTEND:20270112T103000\r\n'), true);
  eq(s.trimEnd().endsWith('END:VCALENDAR'), true);
});

test('ics: allarmi', () => {
  const s = creaIcs([ev]);
  eq(s.includes('TRIGGER:-P7D'), true);
  eq(s.includes('TRIGGER:-P2D'), true);
  eq((s.match(/BEGIN:VALARM/g) || []).length, 2);
  eq(s.includes('ACTION:DISPLAY'), true);
});

test('ics: caratteri speciali escapati', () => {
  const s = creaIcs([ev]);
  eq(s.includes('LOCATION:U3-01\\, U3-05\r\n'), true);
  eq(s.includes('DESCRIPTION:Scritto\\; porta il libretto\\nPrenota su Esse3'), true);
});

test('ics: CRLF e righe al massimo 75 byte', () => {
  const lungo = { ...ev, descrizione: 'à'.repeat(120) };
  const s = creaIcs([lungo]);
  eq(s.endsWith('\r\n'), true);
  const righe = s.split('\r\n').slice(0, -1);
  eq(righe.every((r) => new TextEncoder().encode(r).length <= 75), true);
  eq(s.includes('\n') && !/[^\r]\n/.test(s), true);
  // unfolding gives the original text back
  const unfolded = s.replace(/\r\n /g, '');
  eq(unfolded.includes('DESCRIPTION:' + 'à'.repeat(120)), true);
});
