// Average calculation. Pure functions, no DOM.

/** Merge public courses with the private LIUC recognition data. */
export function corsiEffettivi(corsiPubblici, riconoscimenti = {}) {
  return corsiPubblici.map((k) => {
    const r = riconoscimenti[k.id] || {};
    const ric = Math.min(+r.cfu || 0, +k.cfu || 0);
    const tipo = ric === 0 ? 'Esame intero' : ric >= k.cfu ? 'Riconosciuto' : 'Integrazione';
    return {
      ...k,
      ric_cfu: ric,
      ric_voto: ric ? +r.voto : null,
      ric_nome: r.nome || '',
      cfu_da_fare: (+k.cfu || 0) - ric,
      tipo,
    };
  });
}

/** Simple mean of the partial grades, or null. */
export function stima(esito = {}) {
  const p = (esito.parziali || []).map((x) => +x.voto).filter((v) => Number.isFinite(v) && v >= 0);
  return p.length ? p.reduce((a, b) => a + b, 0) / p.length : null;
}

/** Grade of a passed exam (lode = 30), or null. */
export function votoEsito(esito = {}) {
  if (!esito.passato) return null;
  if (esito.lode) return 30;
  const v = +esito.voto;
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** CFU-weighted average over registered CFU, plus the estimate including partials. */
export function stats(corsiEff, esami = {}) {
  let w = 0, c = 0, we = 0, ce = 0, tot = 0, acq = 0, nDone = 0, nTodo = 0;
  for (const k of corsiEff) {
    const ric = +k.ric_cfu || 0, fare = +k.cfu_da_fare || 0;
    tot += ric + fare;
    if (ric) { w += ric * k.ric_voto; c += ric; we += ric * k.ric_voto; ce += ric; acq += ric; }
    if (fare) {
      nTodo++;
      const e = esami[k.id] || {};
      const v = votoEsito(e);
      if (v != null) { w += fare * v; c += fare; we += fare * v; ce += fare; acq += fare; nDone++; }
      else { const s = stima(e); if (s != null) { we += fare * s; ce += fare; } }
    }
  }
  return { media: c ? w / c : null, mediaStima: ce ? we / ce : null, cfuMedia: c, cfuStima: ce, tot, acq, nDone, nTodo };
}

/** Graduation base out of 110. */
export function baseLaurea(media) {
  return media == null || !Number.isFinite(media) ? null : media * 110 / 30;
}
