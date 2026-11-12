// Study checklist and open issues. Pure.

export function avanzamento(lista = []) {
  const totale = (lista || []).length;
  const fatti = (lista || []).filter((x) => x.fatto).length;
  return { fatti, totale, percentuale: totale ? Math.round(100 * fatti / totale) : 0 };
}

/** Starting checklist from the course programme ("Capitoli concordati: 3, 5, …"), else empty. */
export function checklistIniziale(corso) {
  const m = /Capitoli concordati:\s*([\d,\s]+)/i.exec(corso.programma || '');
  if (!m) return [];
  return m[1].split(',').map((s) => s.trim()).filter(Boolean).map((n) => ({ testo: 'Capitolo ' + n, fatto: false }));
}

/** Open issues whose "check again" date has arrived. */
export function praticheDaRicontrollare(pratiche, oggi) {
  return (pratiche || []).filter((p) => p.stato !== 'chiusa' && p.ricontrolla && p.ricontrolla <= oggi);
}
