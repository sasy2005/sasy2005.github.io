// Exam dates from the Unimib calendar → corsi.json. Pure: used by the nightly script (Node) and by tests.

const chiave = (a) => a.data + 'T' + a.ora;

/** "U3-01 con Podio, U3-05 con Podio" → "U3-01, U3-05" */
export function normalizzaAula(s) {
  return String(s || '').split(',').map((x) => x.replace(/\s+con Podio\s*$/i, '').trim()).filter(Boolean).join(', ');
}

/** "12-01-2027" → "2027-01-12" */
const isoData = (s) => { const [d, m, y] = String(s).split('-'); return y + '-' + m + '-' + d; };

/**
 * Picks each course's dates out of the calendar response.
 * mappa: { [courseId]: { nome: "STATISTICA", turno: "A-Lh" } } (calendar name without turno, exact, case-insensitive).
 * Returns { appelli: { [courseId]: Appello[] }, nonTrovati: courseId[] }.
 */
export function estraiAppelli(risposta, mappa) {
  const ins = Object.values((risposta && risposta.Insegnamenti) || {});
  const appelli = {}, nonTrovati = [];
  for (const [id, m] of Object.entries(mappa)) {
    const atteso = (m.nome + ' ' + m.turno).toUpperCase();
    const hit = ins.filter((x) => String(x.DatiInsegnamento && x.DatiInsegnamento.Nome || '').replace(/^Parte di\s+/i, '').trim().toUpperCase() === atteso);
    if (!hit.length) { nonTrovati.push(id); continue; }
    const visti = new Map();
    for (const x of hit) {
      for (const a of x.Appelli || []) {
        if (String(a.event_Annullato) === '1' || (a.Tipo && a.Tipo !== 'Esame')) continue;
        const ap = { data: isoData(a.Data), ora: a.OraInizio, tipo: a.TipoEsame || '', aula: normalizzaAula(a.Aula) };
        visti.set(chiave(ap), ap);
      }
    }
    appelli[id] = [...visti.values()].sort((p, q) => chiave(p).localeCompare(chiave(q)));
  }
  return { appelli, nonTrovati };
}

/**
 * Merges fresh dates into the existing list. Never deletes: a date missing from the calendar
 * inside the queried window gets `rimosso: true`; dates outside the window are left untouched.
 */
export function mergeAppelli(esistenti, nuovi, finestra) {
  const out = new Map();
  for (const a of esistenti || []) out.set(chiave(a), { ...a });
  const freschi = new Set();
  for (const n of nuovi || []) {
    const k = chiave(n);
    freschi.add(k);
    const { rimosso, ...prima } = out.get(k) || {};
    out.set(k, { ...prima, ...n });
  }
  for (const [k, a] of out) {
    if (!freschi.has(k) && a.data >= finestra.da && a.data <= finestra.a) out.set(k, { ...a, rimosso: true });
  }
  return [...out.values()].sort((p, q) => chiave(p).localeCompare(chiave(q)));
}
