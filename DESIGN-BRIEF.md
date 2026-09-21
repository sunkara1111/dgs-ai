# DGS AI
**Founder:** Dineshgopi Sunkara · Senior Controls Engineer · Automation Engineer
**Controller:** DGS AI assistant

## Roles (priority order)
1. **Agent (front door)** — DGS Agent is a free chat/command bot. Anyone can use it without paying. Work drafts and social drafts are first-class and never paywalled.
2. **Trading desk (skill / mode)** — text-first paper desk: market/crypto brief, quote any major stock or crypto, TradingView chart, send chart to phone. Hard risk gates. Paper first. **CoinSwitch (India)** is the primary live-broker path when commanded (executed by DGS AI assistant server-side — not from this static page).
3. **Social** — drafts + checklists (approve before posting) — free
4. **Work** — priorities, emails, actions, SOPs — free

## Agent
Talk-to-the-bot panel, not only a Bloomberg terminal.

- **Top bar:** brand + live tape + Free chip + optional Upgrade + account
- **Mode switch:** DGS Agent (default) · Trading desk
- **Composer:** “Message DGS Agent…” plus skill chips (help, social, work, quote, chart…)
- **Agent panel:** transcript that feels like a bot conversation
- **Work & social:** free draft tools beside the chat
- **Desk mode:** watchlist, news, TradingView, paper bot card

## Desk
Bloomberg-lite / TradingView terminal. No voice, mic, TTS, SpeechRecognition, Siri orb, or pinch camera.

- **Command / composer:** typed commands (`NVDA technicals`, `quote BTC`, `draft a LinkedIn post`, `daily priorities`)
- **Left (desk):** watchlist + news; agent transcript stays available
- **Center:** always-on TradingView chart + send-to-phone
- **Right:** Paper desk skill (scan, autopilot, book, CoinSwitch) — Pro for autopilot/live
- **Risk drawer:** session, gates, proposed setup
- **Settings drawer:** market-skill buttons, Connect (Pro), CoinSwitch intents, broker stubs

## Paper bot loop
Scan watchlist → propose setup (momentum + ATR-ish R:R) → hard risk gate → paper enter only if OPEN → mark-to-market book. PAPER ONLY. No broker. No guaranteed profit.

## Autopilot (paper default, optional Pro)
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

## Plans
Unauthenticated visitors see an agent-first landing with **Talk to DGS Agent — Free forever**. Account is optional. Owner access is a private hashed allowlist in `gate.js` (never list emails in UI or docs).

1. **Free forever** — agent chat, commands, work drafts, social drafts, paper desk, quote, technicals, chart, send-to-phone, manual paper. No payment.
2. **Owner** — full access (private allowlist).
3. **Starter (`limited`)** — legacy checkout only. New users do not need it.
4. **Pro** — $49/mo or ₹3,999/mo — optional advanced trading: autopilot, live / CoinSwitch, CCXT connect, scanners, reports, IBKR paper tools.

Entitlement: `localStorage` `{ paid: true, plan: 'limited'|'pro', ... }`. Feature gates via `getPlan()` / `hasFeature(...)`. Client-side MVP — production needs webhooks. No guaranteed profits. Paper default; live brokers need official APIs.

## Branding
Use **DGS AI** / **DGS Agent** only. No “Powered by” platform badges on the public app.
