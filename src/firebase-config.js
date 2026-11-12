// Firebase web config (not secret: access is protected by firestore.rules).
// On the published site the sign-in runs on the same domain (self-hosted /__/auth helper),
// which the installed iPhone app needs; elsewhere (localhost) it uses Firebase's own domain.
const SITO = 'sasy2005.github.io';

export const firebaseConfig = {
  apiKey: 'AIzaSyB5cymiJCf191t5RsYhC3zaBQnsnFa9A5E',
  authDomain: location.hostname === SITO ? SITO : 'libretto-6183b.firebaseapp.com',
  projectId: 'libretto-6183b',
  storageBucket: 'libretto-6183b.firebasestorage.app',
  messagingSenderId: '816218029645',
  appId: '1:816218029645:web:99daf457d46a9ea4dda604',
};
