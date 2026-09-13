# DGS AI
**Founder:** Dineshgopi Sunkara
**Controller:** DGS AI assistant

## Roles (priority order)
1. **Trading (most important)** — voice-first: market/crypto brief, quote any major stock or crypto, open chart, send chart to phone. Hard risk gates. Paper first. **CoinSwitch (India)** is the primary live-broker path when commanded (executed by DGS AI assistant server-side — not from this static page).
2. **Social** — drafts + checklists (approve before posting)
3. **Work** — priorities, emails, actions, SOPs

## Voice flow
Quiet by default. Wake/Talk listen silently. TTS only after user speaks, says **speak / talk / talk to me / you can speak** (`state.ttsEnabled`), or presses Brief/Scan/etc. Then: brief / quote / asset pipeline → chart → send to phone. Commands always work (find trade, enter, autopilot, chart, send to phone, coinswitch status). Dense data spoken + mini brief card. Risk & paper book stay in a drawer.

## Paper bot loop
Scan watchlist → propose setup (momentum + ATR-ish R:R) → hard risk gate → paper enter only if OPEN → mark-to-market book → voice close. Slim Bot glass card on home. PAPER ONLY. No broker. No guaranteed profit.

## Stage design
Apple / Siri aesthetic. Soft black void, frosted glass dock, SF system font stack. Center is a living abstract colorful fluid orb (pinks, purples, blues, teals) — **no humanoids, no robot lab hero, no CSS bust, no face**. Idle breathe + ripple; LISTENING / SPEAKING amplify via `state.status` / `#app[data-voice]`. Transcript as soft glass cards. Brand remains **DGS AI**.

## Branding
Use **DGS AI** only. Do not reuse demo-video product names.

## Autopilot (paper default)
Toggle on Bot card or voice: **start autopilot** / **stop autopilot**. While ON, every ~75s: scan watchlist → if gate OPEN and under max trades/day → paper-enter best setup → manage open marks (take profit at target / stop at stop). Respects force halt, daily loss, drawdown. Quiet UI/transcript updates (no TTS unless user asks status). Flag persisted in localStorage. **No guaranteed profit.**

## TradingView
In-app chart overlay + **Open in TradingView** deep link (`tradingview.com/chart/?symbol=…`).

### Webhook stub (future backend)
Static GitHub Pages **cannot** receive TradingView alert webhooks alone. Placeholder for a future server:
`https://YOUR-BACKEND/hooks/tv`
Documented in UI tip on the chart stage. Do not pretend Pages can ingest POSTs.

## CoinSwitch (PRIMARY live · India)
Bot card + Risk drawer surface CoinSwitch first — not buried.
- Status: **Not connected** / **Connected** (localStorage preference flag only).
- Honest copy: Live CoinSwitch orders are executed by **DGS AI assistant** with your API keys **server-side**. This GitHub Pages app must never embed Ed25519 secrets or ship real signed orders (insecure + CORS).
- Page stores a “connected” preference + last trade **intents** (transcript + local list).
- Voice: “coinswitch status”, “trade on coinswitch”, “buy BTC on coinswitch” → append intent + say DGS AI will execute when keys are linked in chat.

## Other live brokers (stubs)
- **Alpaca** — optional secondary; key/secret format check in localStorage; does not send orders from Pages.
- **Robinhood** — no official bot API. Label only. **Never ask for Robinhood password.**

## Gated launch
Unauthenticated visitors only see the DGS AI login landing (founder credit: Dineshgopi Sunkara). Google and/or email+password required. Owner access is a private hashed allowlist in `gate.js` (never list emails in UI or docs). Paid plans:

1. **Owner** — full access (private allowlist).
2. **Starter (limited)** — $19/mo or ₹1,499/mo — voice, quote, technicals, chart, send-to-phone, manual paper; no scanners/reports/options/IB/autopilot/CoinSwitch.
3. **Pro** — $49/mo or ₹3,999/mo — fundamentals, options/Greeks, bullish+PMCC scanners, PDF reports, IBKR paper portfolio + stop-loss dry-run, autopilot, budget, CoinSwitch intents, Connect AI panel. Meta-agent copy: “works like a mobile AI assistant for trading”; App Store / Play = roadmap only.

Entitlement: `localStorage` `{ paid: true, plan: 'limited'|'pro', ... }`. Feature gates via `getPlan()` / `hasFeature(...)`. Client-side MVP — production needs webhooks. No guaranteed profits. Paper default; live brokers need official APIs.

