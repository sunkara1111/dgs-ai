# DGS AI
**Founder:** Dineshgopi Sunkara · Senior Controls Engineer · Automation Engineer
**Controller:** DGS AI assistant

## Roles (priority order)
1. **Trading (most important)** — text-first desk: market/crypto brief, quote any major stock or crypto, TradingView chart, send chart to phone. Hard risk gates. Paper first. **CoinSwitch (India)** is the primary live-broker path when commanded (executed by DGS AI assistant server-side — not from this static page).
2. **Social** — drafts + checklists (approve before posting)
3. **Work** — priorities, emails, actions, SOPs

## Desk
Bloomberg-lite / TradingView terminal. No voice, mic, TTS, SpeechRecognition, Siri orb, or pinch camera.

- **Top bar:** brand + live tape + plan chip + account + Risk / Settings
- **Command bar:** typed commands (`NVDA technicals`, `scan AAPL,MSFT`, `quote BTC`, `fundamentals MSFT`, `report NVDA`) plus skill buttons
- **Left:** watchlist + results feed
- **Center:** always-on TradingView chart + send-to-phone
- **Right:** Paper / Bot (scan, autopilot, book, CoinSwitch) — Pro for autopilot/scan
- **Risk drawer:** session, gates, proposed setup
- **Settings drawer:** market-skill buttons, Connect AI (Pro), CoinSwitch intents, broker stubs, social/work

## Paper bot loop
Scan watchlist → propose setup (momentum + ATR-ish R:R) → hard risk gate → paper enter only if OPEN → mark-to-market book. PAPER ONLY. No broker. No guaranteed profit.

## Autopilot (paper default, Pro)
Toggle on Paper/Bot panel or command `start autopilot` / `stop autopilot`. While ON, every ~75s: scan → enter if gate OPEN → manage marks. Respects force halt, daily loss, drawdown. Flag persisted in localStorage. **No guaranteed profit.**

## TradingView
Always-on chart panel + **Open TV** deep link (`tradingview.com/chart/?symbol=…`).

### Webhook stub (future backend)
Static GitHub Pages **cannot** receive TradingView alert webhooks alone. Placeholder:
`https://YOUR-BACKEND/hooks/tv`

## CoinSwitch (PRIMARY live · India)
Paper/Bot panel + Settings surface CoinSwitch first.
- Status: **Not connected** / **Connected** (localStorage preference only).
- Live orders executed by **DGS AI assistant** with keys **server-side**.
- Page stores preference + last trade **intents**.

## Other live brokers (stubs)
- **Alpaca** — format check in localStorage; does not send orders from Pages.
- **Robinhood** — no official bot API. **Never ask for Robinhood password.**

## Gated launch
Unauthenticated visitors only see the login landing (founder credit: Dineshgopi Sunkara). Google and/or email+password required. Owner access is a private hashed allowlist in `gate.js` (never list emails in UI or docs). Paid plans:

1. **Owner** — full access (private allowlist).
2. **Starter (limited)** — $19/mo or ₹1,499/mo — command bar, quote, technicals, chart, send-to-phone, manual paper.
3. **Pro** — $49/mo or ₹3,999/mo — fundamentals, options/Greeks, scanners, PDF reports, IBKR paper portfolio + stop-loss dry-run, autopilot, budget, CoinSwitch intents, Connect AI panel.

Entitlement: `localStorage` `{ paid: true, plan: 'limited'|'pro', ... }`. Feature gates via `getPlan()` / `hasFeature(...)`. Client-side MVP — production needs webhooks. No guaranteed profits. Paper default; live brokers need official APIs.

## Branding
Use **DGS AI** only.
