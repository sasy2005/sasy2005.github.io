// iCalendar (.ics) export with reminders, for the phone's calendar. Pure.

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** "2027-01-12T08:30" → "20270112T083000" (floating local time). */
const dt = (s) => s.replace(/-/g, '').replace(':', '') + '00';

function piu(inizio, minuti) {
  const [d, t] = inizio.split('T');
  const tot = +t.slice(0, 2) * 60 + +t.slice(3, 5) + minuti;
  const p = (n) => String(n).padStart(2, '0');
  return d + 'T' + p(Math.floor(tot / 60) % 24) + ':' + p(tot % 60);
}

/** Fold a content line at 75 octets without splitting a UTF-8 character. */
function piega(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = '', size = 0, limite = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > limite) { out.push(cur); cur = ' '; size = 1; limite = 75; }
    cur += ch; size += n;
  }
  out.push(cur);
  return out.join('\r\n');
}

/**
 * eventi: [{uid, titolo, inizio: "YYYY-MM-DDTHH:MM", durataMin, luogo, descrizione, allarmi: [{giorniPrima, testo}]}]
 */
export function creaIcs(eventi, adesso = new Date()) {
  const stamp = adesso.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Libretto//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of eventi) {
    L.push('BEGIN:VEVENT', 'UID:' + esc(e.uid), 'DTSTAMP:' + stamp,
      'DTSTART:' + dt(e.inizio), 'DTEND:' + dt(piu(e.inizio, e.durataMin || 120)),
      'SUMMARY:' + esc(e.titolo));
    if (e.luogo) L.push('LOCATION:' + esc(e.luogo));
    if (e.descrizione) L.push('DESCRIPTION:' + esc(e.descrizione));
    for (const a of e.allarmi || []) {
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(a.testo), 'TRIGGER:-P' + a.giorniPrima + 'D', 'END:VALARM');
    }
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(piega).join('\r\n') + '\r\n';
}
