# DGS AI — free agent + optional Pro setup

Live GitHub Pages: https://sunkara1111.github.io/dgs-ai/

Do not add a root `CNAME` for `dgsai.sunkaraops.com` until DNS resolves — it 301s the live github.io site to a dead host. See [DOMAIN.md](../DOMAIN.md).

**Founder:** Dineshgopi Sunkara · Senior Controls Engineer · Automation Engineer

This GitHub Pages app ships a **free DGS Agent**. Anyone can talk to the bot without paying. Sign-in is optional. Checkout links stay placeholders until Razorpay / Stripe URLs are pasted. No secrets belong in this repo (no Admin SDK, no service-account JSON, no API signing keys).

Custom domain: [DOMAIN.md](../DOMAIN.md). Re-add a root `CNAME` from `docs/CNAME.example` only after `dgsai.sunkaraops.com` DNS exists.

## Plans

| Plan | Price | Access |
|------|-------|--------|
| Free forever | **$0** | DGS Agent chat, commands, work drafts, social drafts, paper desk, quote, technicals, chart, send-to-phone, manual paper |
| Owner | free (private hashed allowlist) | Full — never list owner emails in UI/docs |
| Starter (`limited`) | **$19/mo** or **₹1,499/mo** | Legacy checkout. New users do not need it — the agent is free. |
| Pro (`pro`) | **$49/mo** or **₹3,999/mo** | Optional — autopilot, live / CoinSwitch, CCXT connect, scanners, reports, IBKR paper tools |

Entitlement shape: `{ paid: true, plan: 'limited'|'pro', ... }` in `localStorage`. Feature gates: `getPlan()`, `hasFeature('autopilot'|…)`. The free agent path does **not** require entitlement.

Honest copy: no guaranteed profits; paper default; live brokers need official APIs; App Store / Play Store = future roadmap.

## Free owner access

A private owner allowlist is enforced in `js/gate.js` via hashed emails. Do not publish owner emails in UI or docs. Allowlisted accounts unlock automatically with full Pro-equivalent features.

## 1. Firebase Auth (`js/firebase-config.js`) — optional

The free agent works without an account. Firebase is only for people who want to save a signed-in profile.

1. Create a project at https://console.firebase.google.com
2. Add a **Web** app; copy the public client config into `FIREBASE_CONFIG` in `js/firebase-config.js`.
3. Authentication → Sign-in method → enable **Google** and **Email/Password**.
4. Authentication → Settings → Authorized domains → add `sunkara1111.github.io` (plus `localhost` if you preview locally). Add `dgsai.sunkaraops.com` only after DNS exists — see [DOMAIN.md](../DOMAIN.md).
5. Commit the public client config. Do **not** commit Admin SDK keys or service-account files.

When placeholders remain (`YOUR_FIREBASE_API_KEY`), the landing page still offers **Talk to DGS Agent — Free forever**.

## 2. Legacy Starter checkout (`js/billing-config.js`)

Kept for existing payment links. New users should use the free agent.

**Stripe $19 (USD):** Payment Link → amount **$19** → success `https://sunkara1111.github.io/dgs-ai/?paid=1` (or `https://dgsai.sunkaraops.com/?paid=1` after DNS) → paste into `STRIPE_PAYMENT_LINK_USD_STARTER`.

**Razorpay ₹1,499 (INR):** Payment Link → amount **₹1,499** → callback `https://sunkara1111.github.io/dgs-ai/?paid=1` (or `https://dgsai.sunkaraops.com/?paid=1` after DNS) → paste into `RAZORPAY_PAYMENT_LINK_INR_STARTER`.

## 3. Optional Pro checkout (`js/billing-config.js`)

Pro is **not** required for the agent.

**Stripe $49 (USD):** Payment Link → amount **$49** → success URL same as above → `STRIPE_PAYMENT_LINK_USD_PRO`.

**Razorpay ₹3,999 (INR):** Payment Link → amount **₹3,999** → callback same → `RAZORPAY_PAYMENT_LINK_INR_PRO`.

Pay $49 or ₹3,999 → plan `pro`.

## 4. How people use the app

1. Open the site → **Talk to DGS Agent — Free forever** (no account, no card).
2. Optional: Google or email sign-in to save a profile. Still free.
3. Optional: **Upgrade** for Pro autopilot / live.
4. After Pro checkout they return with `?paid=1`, or tap **I’ve paid Pro**.
5. The page stores `{ paid: true, plan: 'limited'|'pro', ... }` in `localStorage` keyed by Firebase uid / email (MVP).

**Honest limit:** client-side `?paid=1` / “I’ve paid” is not fraud-proof. Production needs Razorpay/Stripe webhooks plus server-side entitlement before this can be trusted.


## CCXT / FT bot (box)

```bash
.venv/bin/pip install -r tools/ft_bot/requirements.txt
.venv/bin/python -m tools.ft_bot test-connection -e kraken
.venv/bin/python -m tools.ft_bot run -e kraken --ticks 1   # dry-run default
```

Desk Connect panel stores CCXT keys in `localStorage` only. Real connectivity tests and dry-run loops run on the box. Live needs `--enable-live --i-understand-live`.

## After the free agent opens

1. **Talk** — chat, work drafts, social drafts. Never paywalled.
2. **Trading desk mode** — paper skill. Optional profile (name, country, experience, risk, budget, markets, paper-first agreement) stored as `dgs-ai-profile`. Not required to use the agent.
3. **Connect broker** — Settings → Connect: CoinSwitch (primary), Alpaca, Interactive Brokers (`127.0.0.1:7497`), TradingView charts. Keys stay on-device only. Live/connect is Pro.
4. **Start bot** (Pro) — managed autopilot. Default **paper**. Live badge only with valid keys + “Enable live orders” (OFF by default).

No guaranteed profits. Do not list free owner emails in UI or docs.

## Session

Guest use persists with a local `dgs-ai-guest` flag. Firebase Auth persists a signed-in session in the browser. Use **Sign out** if you signed in.


## Market skills CLI (box)

See `tools/market_skills/README.md`. Examples:

```bash
.venv/bin/python -m tools.market_skills quote AAPL
.venv/bin/python -m tools.market_skills technicals NVDA
.venv/bin/python -m tools.market_skills report MSFT
.venv/bin/python -m tools.market_skills ib-stop-loss   # dry-run default
```

Yahoo-style data may be delayed ~15 minutes. Not financial advice. No guaranteed profits.
MASSIVE/Polygon whales, CoinSwitch live, Stripe/Razorpay link creation, and IB `--execute` stay stubbed / opt-in until keys are intentionally wired.
