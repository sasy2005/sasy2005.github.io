# Libretto

App personale (PWA) per organizzare esami, voti e media del corso di laurea.

- Sviluppo locale: `powershell -ExecutionPolicy Bypass -File scripts/serve.ps1` poi apri http://localhost:8765/
- Test: `bash scripts/test.sh` (Chrome headless) oppure apri http://localhost:8765/tests/
- Rilascio: aumenta `CACHE` in `sw.js` a ogni modifica pubblicata.
