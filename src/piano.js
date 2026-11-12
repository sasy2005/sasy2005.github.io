// Exam plan logic: chosen dates, conflicts, booking reminders, next exam. Pure.
import { votoEsito } from './calc.js';

const ms = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

/** "YYYY-MM-DD" + n days */
export function aggiungiGiorni(d, n) {
  return new Date(ms(d) + n * 86400000).toISOString().slice(0, 10);
}

/** Whole days from a to b (b − a). */
export function giorniTra(a, b) {
  return Math.round((ms(b) - ms(a)) / 86400000);
}

/** Pairs of chosen exams closer than `giorniMinimi` days (only upcoming exams not yet passed). */
export function conflitti(piano, giorniMinimi, oggi = '', esami = {}) {
  const voci = Object.entries(piano)
    .filter(([id, p]) => p && p.data && p.data >= oggi && votoEsito(esami[id] || {}) == null)
    .sort(([ia, a], [ib, b]) => a.data.localeCompare(b.data) || ia.localeCompare(ib));
  const out = [];
  for (let i = 0; i < voci.length; i++) {
    for (let j = i + 1; j < voci.length; j++) {
      const g = giorniTra(voci[i][1].data, voci[j][1].data);
      if (g >= giorniMinimi) break;
      out.push({ a: voci[i][0], b: voci[j][0], giorni: g });
    }
  }
  return out;
}

/** Booking reminders for chosen exams not yet booked. */
export function promemoria(piano, anticipo, oggi) {
  return Object.entries(piano)
    .filter(([, p]) => p && p.data && !p.prenotato && p.data >= oggi)
    .map(([id, p]) => {
      const scadenza = aggiungiGiorni(p.data, -anticipo);
      return { id, scadenza, urgente: oggi >= scadenza };
    })
    .sort((a, b) => a.scadenza.localeCompare(b.scadenza));
}

const trova = (k, p) => (k && (k.appelli || []).find((a) => a.data === p.data && a.ora === p.ora)) || null;

/** Course ids whose chosen date no longer exists (or is marked removed). */
export function appelliMancanti(corsiEff, piano) {
  return Object.entries(piano)
    .filter(([id, p]) => { const a = trova(corsiEff.find((k) => k.id === id), p); return !a || a.rimosso; })
    .map(([id]) => id);
}

/** Next exam: earliest chosen future date of a course still to pass, else earliest available date. */
export function prossimoEsame(corsiEff, piano, esami, oggi) {
  const daFare = corsiEff.filter((k) => +k.cfu_da_fare > 0 && votoEsito(esami[k.id] || {}) == null);
  const pick = (list) => list.sort((x, y) => (x.appello.data + x.appello.ora).localeCompare(y.appello.data + y.appello.ora))[0] || null;

  const scelti = daFare
    .filter((k) => piano[k.id] && piano[k.id].data >= oggi)
    .map((k) => ({ id: k.id, appello: trova(k, piano[k.id]) || { data: piano[k.id].data, ora: piano[k.id].ora }, scelto: true }));
  let r = pick(scelti);
  if (!r) {
    const liberi = [];
    for (const k of daFare) for (const a of k.appelli || []) if (!a.rimosso && a.data >= oggi) liberi.push({ id: k.id, appello: a, scelto: false });
    r = pick(liberi);
  }
  return r ? { ...r, giorni: giorniTra(oggi, r.appello.data) } : null;
}
