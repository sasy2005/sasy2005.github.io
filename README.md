# Libretto

App personale (PWA) per organizzare esami, voti e media del corso di laurea.

- Sviluppo locale: `powershell -ExecutionPolicy Bypass -File scripts/serve.ps1` poi apri http://localhost:8765/
- Test: `bash scripts/test.sh` (Chrome headless) oppure apri http://localhost:8765/tests/
- Rilascio: i file dell'app arrivano sempre dalla rete quando c'è connessione; aumenta `CACHE` in `sw.js` quando aggiungi o togli file, così la copia offline si rinnova.

## Allenamento (`/allenamento/`)

App separata per la scheda del preparatore atletico: esercizi con disegno animato, video, note, serie con carico/tenuta, timer di tenuta e recupero, dolore al ginocchio e statistiche.

- Apri http://localhost:8765/allenamento/ (stesso server di sviluppo).
- Disegni degli esercizi: `allenamento/js/esercizi.js` (pose) e `allenamento/js/figure.js` (omino). Anteprima di tutte le pose: `allenamento/dev/anteprima.html`.
- Nuova scheda: si carica l'Excel dalla sezione Scheda dell'app (colonne ESERCIZIO, SERIE, REPS, LINK, NOTE).
- Dati online: `allenamento/{uid}` e `allenamento/{uid}/sedute/{id}` nello stesso progetto Firebase (regole in `firestore.rules`).
- Aumenta `CACHE` in `allenamento/sw.js` quando aggiungi o togli file.
