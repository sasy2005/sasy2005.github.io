// Scheda del preparatore: dalle righe dell'Excel (ESERCIZIO, SERIE, REPS, LINK, NOTE) alla struttura dell'app.
// Le righe con solo il nome in colonna A sono i blocchi (MOBILITA', CORE, LOWER, UPPER);
// la prima riga sopra l'intestazione è il nome della scheda. Serie vuota = come l'esercizio prima (circuito).

const pulisci = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

export function slug(nome) {
  return pulisci(nome).replace(/^[A-Z]\d+\)\s*/i, '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const titolo = (s) => {
  const t = pulisci(s).toLowerCase().replace(/a'$/, 'à');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Secondi di tenuta se le ripetizioni sono a tempo (10", 25-30" ...), altrimenti null. */
export function tenuta(reps) {
  const m = pulisci(reps).match(/^(\d+)\s*(?:[-/]\s*\d+\s*)?(?:"|''|”|sec|s\b)/i);
  return m ? Number(m[1]) : null;
}

export function videoId(url) {
  const m = String(url || '').match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** rows: array di [A, B, C, D, E, link] */
export function daRighe(rows, meta = {}) {
  let nome = '';
  const blocchi = [];
  let blocco = null, prec = null;
  let header = false;
  for (const r of rows) {
    const [a, b, c, d, e, link] = r.map ? r : [];
    const A = pulisci(a);
    if (!A) continue;
    if (/^esercizi/i.test(A) && /serie/i.test(pulisci(b))) { header = true; continue; }
    const vuote = !pulisci(b) && !pulisci(c) && !pulisci(d) && !pulisci(e);
    if (vuote) {
      if (!header) { nome = A; continue; }
      blocco = { nome: titolo(A), esercizi: [] };
      blocchi.push(blocco);
      prec = null;
      continue;
    }
    if (!header) continue;
    if (!blocco) { blocco = { nome: 'Esercizi', esercizi: [] }; blocchi.push(blocco); }
    const m = A.match(/^([A-Z]\d+)\)\s*(.*)$/i);
    const serieTxt = pulisci(b);
    const circuito = /circuit/i.test(serieTxt) || (!serieTxt && prec?.circuito);
    const serie = serieTxt ? Number((serieTxt.match(/\d+/) || [1])[0]) : (prec?.serie ?? 1);
    const reps = pulisci(c);
    const es = {
      id: slug(A),
      etichetta: m ? m[1].toUpperCase() : '',
      nome: m ? pulisci(m[2]) : A,
      serie,
      circuito: !!circuito,
      reps,
      tenuta: tenuta(reps),
      video: pulisci(link) || pulisci(d),
      note: pulisci(e),
    };
    blocco.esercizi.push(es);
    prec = es;
  }
  const oggi = new Date().toISOString().slice(0, 10);
  return {
    id: meta.id || 'scheda-' + Date.now().toString(36),
    nome: nome ? titolo(nome) : 'Scheda',
    file: meta.file || '',
    dal: meta.dal || oggi,
    blocchi: blocchi.filter((x) => x.esercizi.length),
  };
}

/** Legge un file .xlsx con SheetJS (caricato solo quando serve). */
export async function daExcel(file) {
  const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1:E1');
  const rows = [];
  for (let R = ref.s.r; R <= ref.e.r; R++) {
    const row = [];
    let link = '';
    for (let C = 0; C < 5; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      row.push(cell ? cell.v : '');
      if (C === 3 && cell?.l?.Target) link = cell.l.Target;
    }
    rows.push([...row, link]);
  }
  const s = daRighe(rows, { file: file.name });
  if (!s.blocchi.length) throw new Error('Non ho trovato esercizi: il file deve avere le colonne ESERCIZIO, SERIE, REPS, LINK, NOTE.');
  return s;
}

const NOVEMBRE = [["FORZA ADATTAMENTO", "", "", "", "", ""], ["ESERCIZIO", "SERIE", "REPS", "LINK", "NOTE", ""], ["MOBILITA'", "", "", "", "", ""], ["Segmentazione colonna cat-cow", 1, 10, "https://youtube.com/shorts/DByuIK2ihlQ?si=k27F-B4mFhjrA79s", "", "https://youtube.com/shorts/DByuIK2ihlQ?si=k27F-B4mFhjrA79s"], ["90-90 rotazione esterna", 1, 8, "https://youtube.com/shorts/BtGlpX9JL2o?si=OQjCM71SjlSO0qT5", "", "https://youtube.com/shorts/BtGlpX9JL2o?si=OQjCM71SjlSO0qT5"], ["Quadruped hip cars", "1", "10 totali", "https://youtube.com/shorts/jBPplx8S0no?si=Zp8tZO3p_kD3pYJb", "", "https://youtube.com/shorts/jBPplx8S0no?si=Zp8tZO3p_kD3pYJb"], ["Cobra-mountain", 1, 10, "https://youtube.com/shorts/omeyRRGBWaw?si=Xu8fCi_jcPl4TewR", "", "https://youtube.com/shorts/omeyRRGBWaw?si=Xu8fCi_jcPl4TewR"], ["Ankle cars", 1, "5 per senso", "https://youtube.com/shorts/UiiVhXeyz9U?si=Vq7xknmc2ZNA_saU", "", "https://youtube.com/shorts/UiiVhXeyz9U?si=Vq7xknmc2ZNA_saU"], ["CORE", "", "", "", "", ""], ["Curl up", "2 (circuito)", "8 per lato", "https://youtube.com/shorts/BH5toeuGdfQ?si=waPidWRQKLWwjxxZ", "Schiaccia la mano attivando l'addome", "https://youtube.com/shorts/BH5toeuGdfQ?si=waPidWRQKLWwjxxZ"], ["Bird dog", "", "8 per lato", "https://youtu.be/ZdAHe9_HeEw?si=bBm7Ek5GVC15MZfT", "Schiena bassa rimane bloccata, inspiro eseguendo il movimento, espiro quando torno", "https://youtu.be/ZdAHe9_HeEw?si=bBm7Ek5GVC15MZfT"], ["Deadbug ", "", "8 per lato", "https://youtube.com/shorts/yseUasj00sE?si=mCMP9Ji120OWg0S-", "Tengo l'aria in pancia durante tutto il movimento, espiro alla fine", "https://youtube.com/shorts/yseUasj00sE?si=mCMP9Ji120OWg0S-"], ["Plank lat knee bent", "", "25/30\" tenuta", "https://youtube.com/shorts/O1wBvsF1sIs?si=NZcKAxAC0MF5ghHs", "Glutei e addominali attivi, schiena rimane neutra", "https://youtube.com/shorts/O1wBvsF1sIs?si=NZcKAxAC0MF5ghHs"], ["Rotary stability", "", "10 reps totali", "https://youtube.com/shorts/jL18vr44h0g?si=f0aZ1cu0D8nz5LRC", "Spalle rimangono a terra, non tocco mai il terreno con le ginocchia", "https://youtube.com/shorts/jL18vr44h0g?si=f0aZ1cu0D8nz5LRC"], [" LOWER", "", "", "", "", ""], ["A1)Leg extension one leg isometrico", 2, "10\" tengo il ginocchio esteso e scendo con 2 gambe x 3 volte", "https://youtube.com/shorts/6gAFspvet_8?si=qCHNKYmbnwUX8kH1", "Concentrati sulla parte interna del quadricipite", "https://youtube.com/shorts/6gAFspvet_8?si=qCHNKYmbnwUX8kH1"], ["A2)Straight legs bridge w/ foam roller", 2, "30\"", "https://youtube.com/shorts/U8Ff8z3MgbU?si=vvUrkFjkfCfHlOmk", "Spingi attivamente con l'avampiede", "https://youtube.com/shorts/U8Ff8z3MgbU?si=vvUrkFjkfCfHlOmk"], ["B1)Standing knee extension w/ loop band ", "2", "8 (3\" tenuta alla fine del movimento)", "https://youtube.com/shorts/CU7Fn11YMTw?si=weL3Cxc7wp6YRTvp", "Concentrati sulla parte interna del quadricipite", "https://youtube.com/shorts/CU7Fn11YMTw?si=weL3Cxc7wp6YRTvp"], ["B2)Glute bridge with heels up", "2", 10, "https://youtube.com/shorts/gUSPnTkU7Xg?si=rQCOVzc2Yuffe9m_", "I talloni rimangono su durante tutto il movimento", "https://youtube.com/shorts/gUSPnTkU7Xg?si=rQCOVzc2Yuffe9m_"], ["C1)Clam shell wall reference", "2", "8", "https://youtube.com/shorts/bBtjEl0an38?si=3KcO5df1s-Z4TrXI", "Piede tutto a contatto, addome attivo", "https://youtube.com/shorts/bBtjEl0an38?si=3KcO5df1s-Z4TrXI"], ["C2)Adductors plank", "2", "25\"", "https://youtube.com/shorts/rET-aVGyqPY?si=YdR_NHUFfMuyX9Xz", "", "https://youtube.com/shorts/rET-aVGyqPY?si=YdR_NHUFfMuyX9Xz"], ["UPPER", "", "", "", "", ""], ["A1)HK cables row", "2", "10", "https://youtube.com/shorts/t-x13H1dC0w?si=loJKJSblgQaQ1Spm", "Prima abbassa la spalla poi tiri il cavo", "https://youtube.com/shorts/t-x13H1dC0w?si=loJKJSblgQaQ1Spm"], ["A2)Cables external rotation walk out", 2, 8, "https://youtube.com/shorts/-ppEbx-lZxI?si=F9nq-7Hn-_HNLOaS", "Quando torni nella posizione di partenza è 1 ripetizione", "https://youtube.com/shorts/-ppEbx-lZxI?si=F9nq-7Hn-_HNLOaS"], ["B1)Rematore manubri 3 appoggi", 2, 8, "https://youtu.be/1e-Ks7gpp44?si=luyDam52EYAW54IZ", "", "https://youtu.be/1e-Ks7gpp44?si=luyDam52EYAW54IZ"], ["B2)T raise isometrico", 2, "25-30\"", "https://youtube.com/shorts/N4qQce_fasI?si=MnX8QK6UtKQ_ok2e", "", "https://youtube.com/shorts/N4qQce_fasI?si=MnX8QK6UtKQ_ok2e"]];

export const SCHEDA_INIZIALE = daRighe(NOVEMBRE, { id: 'novembre-2026', file: 'Salva_scheda_Novembre_2026.xlsx', dal: '2026-11-01' });
