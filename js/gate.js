/**
 * DGS AI launch gate — Google / email auth + Starter/Pro paywall.
 * Owner allowlist (hashed) bypasses payment with full access.
 * Entitlement is client-side (localStorage) MVP.
 *
 * Plans: owner (private) | limited/starter | pro
 * Do NOT list free owner emails in UI or docs.
 */
import { FIREBASE_CONFIG, isFirebaseConfigured } from './firebase-config.js';
import {
  BILLING,
  isPayLinkReady,
  payLinkFor,
  planFromPayKind,
  payKindLabel,
} from './billing-config.js';

// Free-access emails stored as SHA-256 only (not listed in UI or plaintext).
const FREE_EMAIL_HASHES = new Set([
  'dde7cd1c31944a9e4da8f269097b17ae994c98a891e2758d458c8612077e3b33',
  'ce8ed17c471cdbdbaf43108f8e9e85f463d1375fb08fa8617c032b583ed2e479',
  '8e063abf8918468efd6cc3c66e343ad500259168af3701c41b8e155ec2092274',
  '82fc4b54ab93e2870c6d245c06138aafed8ce2aa5598a2e71d23d9c9dec4c321',
]);

const ENT_PREFIX = 'dgs-ai-pro';

/** Features available on Starter (limited). Everything else needs Pro/owner. */
const LIMITED_FEATURES = new Set([
  'signin',
  'orb',
  'voice',
  'brief',
  'quote',
  'chart',
  'sendPhone',
  'manualPaper',
  'riskBasic',
]);

/** Pro-only (also granted to owner). */
const PRO_FEATURES = new Set([
  'autopilot',
  'scan',
  'botCardFull',
  'coinswitch',
  'budget',
  'connectApps',
  'generateBot',
  'slTpManage',
]);

const unlockListeners = [];
let unlocked = false;
let auth = null;
let currentUser = null;
let paidConfirmArmed = false;
let ownerSession = false;
let cachedPlan = null;

export function onUnlocked(fn) {
  if (typeof fn !== 'function') return;
  if (unlocked) fn();
  else unlockListeners.push(fn);
}

export function isUnlocked() {
  return unlocked;
}

/** Current plan: 'owner' | 'pro' | 'limited' | null */
export function getPlan() {
  if (!unlocked) return null;
  if (ownerSession) return 'owner';
  if (cachedPlan === 'pro' || cachedPlan === 'limited') return cachedPlan;
  const ent = currentUser ? readEntitlement(currentUser) : null;
  if (ent && (ent.plan === 'pro' || ent.plan === 'limited')) return ent.plan;
  // Legacy entitlements (paid without plan) → treat as pro for backward compat
  if (ent && ent.paid === true) return 'pro';
  return null;
}

/**
 * Feature gate.
 * Owner & Pro: all features.
 * Limited/Starter: sign-in, orb, voice Q&A, chart, send-to-phone, manual paper.
 */
export function hasFeature(name) {
  const plan = getPlan();
  if (!plan) return false;
  if (plan === 'owner' || plan === 'pro') return true;
  if (plan === 'limited') {
    // Starter: everything except Pro-only features
    return !PRO_FEATURES.has(name);
  }
  return false;
}

export async function signOutUser() {
  try {
    if (auth) {
      const { signOut } = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js');
      await signOut(auth);
    }
  } catch (err) {
    console.warn('signOut', err);
  }
  location.reload();
}

function $(id) {
  return document.getElementById(id);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function hashEmail(email) {
  const data = new TextEncoder().encode(normalizeEmail(email));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function isFreeEmail(email) {
  if (!email) return false;
  const h = await hashEmail(email);
  return FREE_EMAIL_HASHES.has(h);
}

function entitlementKeys(user) {
  const keys = [];
  if (user && user.uid) keys.push(`${ENT_PREFIX}:uid:${user.uid}`);
  const email = normalizeEmail(user && user.email);
  if (email) keys.push(`${ENT_PREFIX}:email:${email}`);
  return keys;
}

function readEntitlement(user) {
  for (const key of entitlementKeys(user)) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (data && data.paid === true) return data;
    } catch (_) {}
  }
  return null;
}

function hasEntitlement(user) {
  return !!readEntitlement(user);
}

function markEntitlement(user, source, plan) {
  if (!user) return;
  const resolved = plan === 'pro' ? 'pro' : 'limited';
  const record = {
    paid: true,
    plan: resolved,
    email: normalizeEmail(user.email),
    uid: user.uid || '',
    source: source || 'unknown',
    at: Date.now(),
  };
  for (const key of entitlementKeys(user)) {
    localStorage.setItem(key, JSON.stringify(record));
  }
  cachedPlan = resolved;
}

function setGate(mode) {
  document.body.dataset.gate = mode;
  const login = $('gateLogin');
  const pay = $('gatePay');
  if (login) login.hidden = mode !== 'locked';
  if (pay) pay.hidden = mode !== 'paywall';
}

function setLoginMsg(text, kind) {
  const el = $('gateMsg');
  if (!el) return;
  el.textContent = text || '';
  el.dataset.kind = kind || '';
}

function setPayMsg(text, kind) {
  const el = $('payMsg');
  if (!el) return;
  el.textContent = text || '';
  el.dataset.kind = kind || '';
}

function consumePaidQuery() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get(BILLING.returnFlag) !== '1') return false;
    const planParam = (params.get('plan') || '').toLowerCase();
    if (planParam === 'pro' || planParam === 'limited' || planParam === 'starter') {
      const p = planParam === 'pro' ? 'pro' : 'limited';
      try { sessionStorage.setItem('dgs-pay-plan', p); } catch (_) {}
    }
    params.delete(BILLING.returnFlag);
    params.delete('plan');
    const q = params.toString();
    const next = `${location.pathname}${q ? `?${q}` : ''}${location.hash}`;
    history.replaceState({}, '', next);
    sessionStorage.setItem('dgs-paid-pending', '1');
    return true;
  } catch (_) {
    return false;
  }
}

function takePaidPending() {
  try {
    if (sessionStorage.getItem('dgs-paid-pending') === '1') {
      sessionStorage.removeItem('dgs-paid-pending');
      return true;
    }
  } catch (_) {}
  return false;
}

function resolvePendingPlan() {
  try {
    const stored = sessionStorage.getItem('dgs-pay-plan');
    if (stored === 'pro' || stored === 'limited') return stored;
    const kind = sessionStorage.getItem('dgs-pay-kind');
    if (kind) return planFromPayKind(kind);
  } catch (_) {}
  return 'limited';
}

async function fireUnlock() {
  if (unlocked) return;
  unlocked = true;
  setGate('open');
  const chip = $('accountChip');
  if (chip && currentUser) {
    chip.hidden = false;
    chip.textContent = normalizeEmail(currentUser.email) || 'Signed in';
    const plan = getPlan();
    if (plan === 'owner') chip.dataset.tier = 'owner';
    else if (plan === 'pro') chip.dataset.tier = 'pro';
    else if (plan === 'limited') chip.dataset.tier = 'limited';
    else chip.dataset.tier = '';
  }
  document.body.dataset.plan = getPlan() || '';
  unlockListeners.splice(0).forEach((fn) => {
    try { fn(); } catch (err) { console.error(err); }
  });
}

async function applyUser(user) {
  currentUser = user;
  ownerSession = false;
  cachedPlan = null;
  if (!user) {
    unlocked = false;
    setGate('locked');
    const chip = $('accountChip');
    if (chip) {
      chip.hidden = true;
      chip.textContent = '';
      delete chip.dataset.tier;
    }
    document.body.dataset.plan = '';
    return;
  }

  const email = normalizeEmail(user.email);
  const payAccount = $('payAccount');
  if (payAccount) payAccount.textContent = email ? `Signed in as ${email}` : 'Signed in';

  if (await isFreeEmail(email)) {
    ownerSession = true;
    cachedPlan = 'owner';
    fireUnlock();
    return;
  }

  if (takePaidPending()) {
    markEntitlement(user, 'return-url', resolvePendingPlan());
  }

  if (hasEntitlement(user)) {
    const ent = readEntitlement(user);
    cachedPlan = (ent && ent.plan === 'limited') ? 'limited' : (ent && ent.plan === 'pro') ? 'pro' : 'pro';
    fireUnlock();
    return;
  }

  unlocked = false;
  setGate('paywall');
  setPayMsg('Choose Starter or Pro to unlock DGS AI. Paper default · no guaranteed profit.', '');
}

function authErrorMessage(err) {
  const code = err && err.code ? String(err.code) : '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Sign-in cancelled.';
  }
  if (code === 'auth/popup-blocked') return 'Popup blocked — retry, or allow popups for this site.';
  if (code === 'auth/email-already-in-use') return 'That email already has an account. Use Sign in.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment and try again.';
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is disabled in Firebase. Enable Google and Email/Password in the console.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Add sunkara1111.github.io as an authorized domain in Firebase Auth settings.';
  }
  return (err && err.message) ? err.message : 'Sign-in failed.';
}

async function loadFirebase() {
  if (!isFirebaseConfigured()) return null;
  const appMod = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js');
  const authMod = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js');
  const app = appMod.initializeApp(FIREBASE_CONFIG);
  const instance = authMod.getAuth(app);
  await authMod.setPersistence(instance, authMod.browserLocalPersistence);
  return { authMod, instance };
}

async function googleSignIn() {
  if (!auth) {
    setLoginMsg('Firebase is not configured yet. Add keys in js/firebase-config.js — see SETUP.md.', 'warn');
    return;
  }
  setLoginMsg('Opening Google…', '');
  try {
    const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import(
      'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js'
    );
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  } catch (err) {
    setLoginMsg(authErrorMessage(err), 'err');
  }
}

function readEmailForm() {
  const email = normalizeEmail($('authEmail') && $('authEmail').value);
  const password = String(($('authPassword') && $('authPassword').value) || '');
  return { email, password };
}

async function emailCreate(ev) {
  if (ev) ev.preventDefault();
  if (!auth) {
    setLoginMsg('Firebase is not configured yet. Add keys in js/firebase-config.js — see SETUP.md.', 'warn');
    return;
  }
  const { email, password } = readEmailForm();
  if (!email || !password) {
    setLoginMsg('Enter email and a password (6+ characters).', 'err');
    return;
  }
  setLoginMsg('Creating account…', '');
  try {
    const { createUserWithEmailAndPassword } = await import(
      'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js'
    );
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    setLoginMsg(authErrorMessage(err), 'err');
  }
}

async function emailSignIn(ev) {
  if (ev) ev.preventDefault();
  if (!auth) {
    setLoginMsg('Firebase is not configured yet. Add keys in js/firebase-config.js — see SETUP.md.', 'warn');
    return;
  }
  const { email, password } = readEmailForm();
  if (!email || !password) {
    setLoginMsg('Enter email and password to sign in.', 'err');
    return;
  }
  setLoginMsg('Signing in…', '');
  try {
    const { signInWithEmailAndPassword } = await import(
      'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js'
    );
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    setLoginMsg(authErrorMessage(err), 'err');
  }
}

function startCheckout(kind) {
  const url = payLinkFor(kind);
  const label = payKindLabel(kind);
  const plan = planFromPayKind(kind);
  if (!isPayLinkReady(url)) {
    setPayMsg(
      `${label} link is not configured yet. Set the URL in js/billing-config.js. If you already completed checkout, tap I’ve paid.`,
      'warn'
    );
    try {
      sessionStorage.setItem('dgs-pay-kind', kind);
      sessionStorage.setItem('dgs-pay-plan', plan);
    } catch (_) {}
    return;
  }
  try {
    sessionStorage.setItem('dgs-pay-kind', kind);
    sessionStorage.setItem('dgs-pay-plan', plan);
  } catch (_) {}
  setPayMsg(`Opening ${label}…`, '');
  location.href = url;
}

async function ivePaid(forcedPlan) {
  if (!currentUser) {
    setPayMsg('Sign in first, then confirm payment.', 'err');
    return;
  }
  if (await isFreeEmail(currentUser.email)) {
    ownerSession = true;
    cachedPlan = 'owner';
    fireUnlock();
    return;
  }
  const plan = forcedPlan || resolvePendingPlan();
  if (!paidConfirmArmed) {
    paidConfirmArmed = true;
    const label = plan === 'pro' ? 'Pro' : 'Starter';
    setPayMsg(
      `This marks ${label} on this browser for your signed-in account (MVP). Production needs a webhook. Tap Confirm — I’ve paid if checkout succeeded.`,
      'warn'
    );
    const btn = $('ivePaidBtn');
    if (btn) btn.textContent = 'Confirm — I’ve paid';
    return;
  }
  markEntitlement(currentUser, 'self-verify', plan);
  fireUnlock();
}

function bindGateUi() {
  const google = $('googleSignInBtn');
  if (google) google.onclick = () => { googleSignIn(); };

  const form = $('emailAuthForm');
  if (form) form.addEventListener('submit', emailCreate);

  const signIn = $('emailSignInBtn');
  if (signIn) signIn.onclick = emailSignIn;

  const map = [
    ['payStarterUsdBtn', 'starter-usd'],
    ['payStarterInrBtn', 'starter-inr'],
    ['payProUsdBtn', 'pro-usd'],
    ['payProInrBtn', 'pro-inr'],
    // legacy ids if present
    ['payUsdBtn', 'starter-usd'],
    ['payInrBtn', 'pro-inr'],
  ];
  for (const [id, kind] of map) {
    const el = $(id);
    if (el) el.onclick = () => { startCheckout(kind); };
  }

  const paid = $('ivePaidBtn');
  if (paid) paid.onclick = () => { ivePaid(); };

  const paidStarter = $('ivePaidStarterBtn');
  if (paidStarter) {
    paidStarter.onclick = () => {
      try { sessionStorage.setItem('dgs-pay-plan', 'limited'); } catch (_) {}
      paidConfirmArmed = false;
      ivePaid('limited');
    };
  }
  const paidPro = $('ivePaidProBtn');
  if (paidPro) {
    paidPro.onclick = () => {
      try { sessionStorage.setItem('dgs-pay-plan', 'pro'); } catch (_) {}
      paidConfirmArmed = false;
      ivePaid('pro');
    };
  }

  const payOut = $('paySignOutBtn');
  if (payOut) payOut.onclick = () => { signOutUser(); };

  const appOut = $('signOutBtn');
  if (appOut) appOut.onclick = () => { signOutUser(); };
}

async function initGate() {
  setGate('locked');
  consumePaidQuery();
  bindGateUi();

  if (!isFirebaseConfigured()) {
    setLoginMsg(
      'Sign-in activates when Firebase keys are added in js/firebase-config.js. See SETUP.md.',
      'warn'
    );
    return;
  }

  try {
    const loaded = await loadFirebase();
    if (!loaded) {
      setLoginMsg('Firebase config is incomplete. See SETUP.md.', 'warn');
      return;
    }
    auth = loaded.instance;
    try {
      const { getRedirectResult } = loaded.authMod;
      await getRedirectResult(auth);
    } catch (err) {
      setLoginMsg(authErrorMessage(err), 'err');
    }
    loaded.authMod.onAuthStateChanged(auth, (user) => {
      applyUser(user || null);
    });
  } catch (err) {
    console.error(err);
    setLoginMsg('Could not load Firebase Auth. Check network and js/firebase-config.js.', 'err');
  }
}

initGate();
