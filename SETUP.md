# DGS AI — gated launch setup

Live: https://sunkara1111.github.io/dgs-ai/

**Founder:** Dineshgopi Sunkara

This GitHub Pages app ships a working login + paywall UI. It stays locked until Firebase Auth is configured. Checkout links stay placeholders until Razorpay / Stripe URLs are pasted. No secrets belong in this repo (no Admin SDK, no service-account JSON, no API signing keys).

## Free access

A private owner allowlist is enforced in `js/gate.js` via hashed emails. Do not publish owner emails in UI or docs.

## 1. Firebase Auth (`js/firebase-config.js`)

Firebase CLI was not logged in on the build box, so no project was created automatically.

1. Create a project at https://console.firebase.google.com
2. Add a **Web** app; copy the public client config into `FIREBASE_CONFIG` in `js/firebase-config.js`.
3. Authentication → Sign-in method → enable **Google** and **Email/Password**.
4. Authentication → Settings → Authorized domains → add `sunkara1111.github.io` (and `localhost` if you preview locally).
5. Commit the public client config. Do **not** commit Admin SDK keys or service-account files.

When placeholders remain (`YOUR_FIREBASE_API_KEY`), the landing page still renders and explains that sign-in is inactive.

## 2. Razorpay ₹499 (`js/billing-config.js`)

1. Razorpay Dashboard → Payment Links or Payment Button, amount **₹499**.
2. Success / callback URL: `https://sunkara1111.github.io/dgs-ai/?paid=1`
3. Paste the hosted URL into `RAZORPAY_PAYMENT_LINK_INR`.

## 3. Stripe $9 (`js/billing-config.js`)

1. Stripe Dashboard → Payment Links, amount **$9**.
2. Success URL: `https://sunkara1111.github.io/dgs-ai/?paid=1`
3. Cancel URL: `https://sunkara1111.github.io/dgs-ai/`
4. Paste the hosted URL into `STRIPE_PAYMENT_LINK_USD`.

## 4. How customers pay

1. Open the site → **Continue with Google** or **Create account** / **Sign in** with email + password.
2. If their email is not on the free list, they see **DGS AI Pro — ₹499/mo or $9/mo**.
3. **Pay ₹499** opens the Razorpay link; **Pay $9** opens the Stripe link.
4. After checkout they return with `?paid=1`, or they tap **I’ve paid** → **Confirm — I’ve paid**.
5. The page stores a client-side entitlement in `localStorage` keyed by Firebase uid / email (MVP).

**Honest limit:** client-side `?paid=1` / “I’ve paid” is not fraud-proof. Production needs Razorpay/Stripe webhooks plus server-side entitlement before this can be trusted.

## 5. How owners get in free

Sign in with Google or email+password Owner accounts unlock automatically. The paywall never shows for allowlisted accounts.

## Session

Firebase Auth persists the session in the browser. Use **Sign out** on the paywall or in the app top bar.
