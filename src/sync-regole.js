// Pure rules for the first sign-in on a device (no Firebase imports, so it is testable).
import { uguali, vuoto } from './userdoc.js';

/**
 * What to do when a user signs in.
 * @returns {"carica-locale"|"usa-remoto"|"nessuna-azione"|"chiedi"}
 */
export function risolviPrimoAccesso(locale, remoto, syncUidPrecedente, uid) {
  if (!remoto) return 'carica-locale';
  if (vuoto(locale)) return 'usa-remoto';
  if (syncUidPrecedente && syncUidPrecedente === uid) return 'nessuna-azione';
  if (uguali(locale, remoto)) return 'nessuna-azione';
  return 'chiedi';
}
