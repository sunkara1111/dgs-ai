# DGS AI — gated launch setup

Live: https://sunkara1111.github.io/dgs-ai/

**Founder:** Dineshgopi Sunkara

This GitHub Pages app ships a working login + paywall UI. It stays locked until Firebase Auth is configured. Checkout links stay placeholders until Razorpay / Stripe URLs are pasted. No secrets belong in this repo (no Admin SDK, no service-account JSON, no API signing keys).

## Plans

| Plan | Price | Access |
|------|-------|--------|
| Owner | free (private hashed allowlist) | Full — never list owner emails in UI/docs |
| Starter (`limited`) | **$19/mo** or **₹1,499/mo** | Sign-in, desk, command bar, quote, technicals, chart, send-to-phone, manual paper |
| Pro (`pro`) | **$49/mo** or **₹3,999/mo** | Everything Starter + fundamentals, options/Greeks, scanners, PDF reports, IBKR paper portfolio + stop-loss dry-run, autopilot, budget, CoinSwitch intents, Connect AI panel |

Entitlement shape: `{ paid: true, plan: 'limited'|'pro', ... }` in `localStorage`. Feature gates: `getPlan()`, `hasFeature('autopilot'|…)`.

Honest copy: no guaranteed profits; paper default; live brokers need official APIs; App Store / Play Store = future roadmap.

## Free owner access

A private owner allowlist is enforced in `js/gate.js` via hashed emails. Do not publish owner emails in UI or docs. Allowlisted accounts unlock automatically with full Pro-equivalent features.

## 1. Firebase Auth (`js/firebase-config.js`)

Firebase CLI was not logged in on the build box, so no project was created automatically.

1. Create a project at https://console.firebase.google.com
2. Add a **Web** app; copy the public client config into `FIREBASE_CONFIG` in `js/firebase-config.js`.
3. Authentication → Sign-in method → enable **Google** and **Email/Password**.
4. Authentication → Settings → Authorized domains → add `sunkara1111.github.io` (and `localhost` if you preview locally).
5. Commit the public client config. Do **not** commit Admin SDK keys or service-account files.

When placeholders remain (`YOUR_FIREBASE_API_KEY`), the landing page still renders and explains that sign-in is inactive.

## 2. Starter checkout (`js/billing-config.js`)

**Stripe $19 (USD):** Payment Link → amount **$19** → success `https://sunkara1111.github.io/dgs-ai/?paid=1` → paste into `STRIPE_PAYMENT_LINK_USD_STARTER`.

**Razorpay ₹1,499 (INR):** Payment Link → amount **₹1,499** → callback `https://sunkara1111.github.io/dgs-ai/?paid=1` → paste into `RAZORPAY_PAYMENT_LINK_INR_STARTER`.

Pay $19 or ₹1,499 → plan `limited`.

## 3. Pro checkout (`js/billing-config.js`)

**Stripe $49 (USD):** Payment Link → amount **$49** → success URL same as above → `STRIPE_PAYMENT_LINK_USD_PRO`.

**Razorpay ₹3,999 (INR):** Payment Link → amount **₹3,999** → callback same → `RAZORPAY_PAYMENT_LINK_INR_PRO`.

Pay $49 or ₹3,999 → plan `pro`.

## 4. How customers pay

1. Open the site → **Continue with Google** or **Create account** / **Sign in** with email + password.
2. Non-owner accounts see two cards: **Starter** ($19 / ₹1,499) and **Pro** ($49 / ₹3,999).
3. Pay buttons open the matching Stripe / Razorpay link.
4. After checkout they return with `?paid=1`, or tap **I’ve paid Starter** / **I’ve paid Pro**.
5. The page stores `{ paid: true, plan: 'limited'|'pro', ... }` in `localStorage` keyed by Firebase uid / email (MVP).

**Honest limit:** client-side `?paid=1` / “I’ve paid” is not fraud-proof. Production needs Razorpay/Stripe webhooks plus server-side entitlement before this can be trusted.

## Session

Firebase Auth persists the session in the browser. Use **Sign out** on the paywall or in the app top bar.


## Market skills CLI (box)

See `tools/market_skills/README.md`. Examples:

```bash
cd /workspace/dinesh-ai-fund
.venv/bin/python -m tools.market_skills quote AAPL
.venv/bin/python -m tools.market_skills technicals NVDA
.venv/bin/python -m tools.market_skills report MSFT
.venv/bin/python -m tools.market_skills ib-stop-loss   # dry-run default
```

Yahoo-style data may be delayed ~15 minutes. Not financial advice. No guaranteed profits.
MASSIVE/Polygon whales, CoinSwitch live, Stripe/Razorpay link creation, and IB `--execute` stay stubbed / opt-in until keys are intentionally wired.
