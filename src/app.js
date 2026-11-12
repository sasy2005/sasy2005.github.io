// App bootstrap: loads public courses, the private document, renders the current tab.
import { $, el, btn, toast, oggiISO } from './ui/dom.js';
import { corsiEffettivi } from './calc.js';
import * as store from './store.js';
import { renderKpi } from './ui/kpi.js';
import { renderEsami } from './ui/corsi.js';
import { renderCalendario } from './ui/calendario.js';
import { renderSimulatore } from './ui/simulatore.js';
import { renderPiano } from './ui/piano.js';
import { renderProssimo } from './ui/home.js';
import { renderStudio } from './ui/studio.js';
import { renderPratiche, bannerPratiche } from './ui/pratiche.js';
import { esporta, importa, listaRiepilogo } from './ui/backup.js';
import { renderAccount, ricordato } from './ui/account.js';
import { firebaseConfig } from './firebase-config.js';
import { chiedi } from './ui/dom.js';

const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  esami: '<path d="M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 13h6"/>',
  simulatore: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  piano: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  studio: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  pratiche: '<path d="M4 4h16v12H8l-4 4z"/>',
};

const VIEWS = [
  { id: 'home', label: 'Home', render: (ctx) => {
    const v = el('div', 'view');
    v.append(...(app.homeExtra || []).map((f) => f(ctx)).filter(Boolean), renderKpi(ctx), renderCalendario(ctx));
    return v;
  } },
  { id: 'esami', label: 'Esami', render: renderEsami },
  { id: 'simulatore', label: 'Simula', render: renderSimulatore },
  { id: 'piano', label: 'Piano', render: renderPiano },
  { id: 'studio', label: 'Studio', render: renderStudio },
  { id: 'pratiche', label: 'Pratiche', render: renderPratiche },
];

const app = { corsiPub: [], homeExtra: [renderProssimo, bannerPratiche] };

/** Later modules register extra tabs and home widgets here. */
export function registraVista(v) { VIEWS.push(v); }
export function registraHome(f) { app.homeExtra.push(f); }

function vistaCorrente() {
  const id = location.hash.slice(1);
  return VIEWS.find((v) => v.id === id) || VIEWS[0];
}

function ctx() {
  const doc = store.attuale();
  return {
    corsiPub: app.corsiPub,
    corsi: corsiEffettivi(app.corsiPub, doc.riconoscimenti),
    doc,
    oggi: oggiISO(),
    aggiorna: store.aggiorna,
    rerender: render,
    vai: (id) => { location.hash = id; },
  };
}

function render() {
  const v = vistaCorrente();
  const main = $('main');
  main.replaceChildren(v.render(ctx()));
  for (const t of document.querySelectorAll('.tab')) {
    if (t.dataset.view === v.id) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  }
}

function renderTabbar() {
  const bar = $('tabbar-in');
  bar.replaceChildren(...VIEWS.map((v) => {
    const a = el('a', 'tab'); a.href = '#' + v.id; a.dataset.view = v.id;
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[v.id] || '') + '</svg>';
    a.append(el('span', null, v.label));
    return a;
  }));
}

function renderAzioni() {
  const box = $('azioni');
  const inp = el('input'); inp.type = 'file'; inp.accept = 'application/json,.json'; inp.hidden = true;
  inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0];
    if (f) await importa(f, { corsiPub: app.corsiPub, attuale: store.attuale, salva: store.salva });
    inp.value = '';
  });
  box.append(
    btn('Esporta backup', '', () => esporta(store.attuale())),
    btn('Importa backup', '', () => inp.click()),
    inp,
  );
}

export async function avvia() {
  store.carica();
  try {
    const r = await fetch('data/corsi.json');
    app.corsiPub = (await r.json()).sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
  } catch {
    $('main').replaceChildren(el('p', 'empty', 'Non riesco a caricare le materie. Controlla la connessione e riapri l\'app.'));
    return;
  }
  renderTabbar();
  renderAzioni();
  store.onCambio(() => render());
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  render();
  registraSW();
  avviaSync();
}

async function avviaSync() {
  if (!firebaseConfig) return;
  const host = $('account');
  const r = ricordato();
  renderAccount(host, { pronto: false, ricordato: r, online: navigator.onLine }, {});
  try {
    const sync = await import('./sync.js');
    await sync.avvia({
      store, corsiPub: () => app.corsiPub, chiedi, listaRiepilogo, el,
      onStato: (s) => renderAccount(host, s, sync),
    });
  } catch {
    host.replaceChildren(el('span', 'sync', r ? r.nome + ' · offline, salvato sul dispositivo' : 'Sincronizzazione non disponibile (offline?)'));
  }
}

function registraSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  // On localhost the SW is opt-in (localStorage 'sw-dev' = '1'), so edits and tests are never served stale.
  let dev = false;
  try { dev = location.hostname === 'localhost' && localStorage.getItem('sw-dev') !== '1'; } catch { /* ignore */ }
  if (dev) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    return;
  }
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ });
}

export const corsiPubblici = () => app.corsiPub;
export { toast };
