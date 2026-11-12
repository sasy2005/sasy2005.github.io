// "Cosa mi serve": target average simulator. Pure; never touches the real average.
import { votoEsito, baseLaurea } from './calc.js';

/** Weighted sum and CFU of everything already fixed: recognised, passed, hypothetical. */
function fissati(corsiEff, esami, ipotesi) {
  let somma = 0, cfu = 0, tot = 0, rimasti = 0;
  for (const k of corsiEff) {
    const ric = +k.ric_cfu || 0, fare = +k.cfu_da_fare || 0;
    tot += ric + fare;
    if (ric) { somma += ric * k.ric_voto; cfu += ric; }
    if (!fare) continue;
    const v = votoEsito(esami[k.id] || {});
    const ip = +ipotesi[k.id];
    if (v != null) { somma += fare * v; cfu += fare; }
    else if (Number.isFinite(ip) && ip > 0) { somma += fare * ip; cfu += fare; }
    else rimasti += fare;
  }
  return { somma, cfu, tot, rimasti };
}

/**
 * Average grade needed on the exams with no grade yet (real or hypothetical)
 * to reach `obiettivo` over all CFU of the plan.
 */
export function votoNecessario(corsiEff, esami, ipotesi, obiettivo) {
  const f = fissati(corsiEff, esami, ipotesi);
  if (f.rimasti === 0) return { stato: 'nessun-esame', voto: null, cfuRimasti: 0 };
  const voto = (obiettivo * f.tot - f.somma) / f.rimasti;
  const stato = voto > 30 ? 'irraggiungibile' : voto < 18 ? 'garantito' : 'ok';
  return { stato, voto, cfuRimasti: f.rimasti };
}

/** Average and graduation base counting real grades plus hypothetical ones. */
export function simula(corsiEff, esami, ipotesi) {
  const f = fissati(corsiEff, esami, ipotesi);
  const media = f.cfu ? f.somma / f.cfu : null;
  return { media, base: baseLaurea(media), cfu: f.cfu };
}
