/**
 * DGS AI — Firebase Auth (client SDK)
 *
 * SETUP
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Authentication → Sign-in method:
 *      - Google
 *      - Email/Password
 * 3. Authentication → Settings → Authorized domains: add
 *      sunkara1111.github.io
 *      localhost   (optional, for local preview)
 *      dgsai.sunkaraops.com  (only after DNS exists — see DOMAIN.md)
 * 4. Project settings → Your apps → Web app → copy the config object
 *    into FIREBASE_CONFIG below (public client keys — not Admin / service-account).
 * 5. Commit the filled values. Never commit Admin SDK keys, .env secrets, or
 *    service-account JSON. Those do not belong in this static Pages repo.
 *
 * Until placeholders are replaced, the login landing renders but sign-in
 * stays inactive (see the on-page note).
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCVwRbMMQO7qwDxBgvH9qwFuYEd22MXzYQ',
  authDomain: 'dgs-ai-web.firebaseapp.com',
  projectId: 'dgs-ai-web',
  storageBucket: 'dgs-ai-web.firebasestorage.app',
  messagingSenderId: '645823654756',
  appId: '1:645823654756:web:e585caad52712e398c6871',
};

export function isFirebaseConfigured() {
  const key = String(FIREBASE_CONFIG.apiKey || '').trim();
  const project = String(FIREBASE_CONFIG.projectId || '').trim();
  if (!key || !project) return false;
  if (key.startsWith('YOUR_') || project.startsWith('YOUR_')) return false;
  return true;
}
