# DGS AI
**Founder:** Dineshgopi Sunkara
**Controller:** DGS AI assistant

## Roles (priority order)
1. **Trading (most important)** — voice-first: market/crypto brief, quote any major stock or crypto, open chart, send chart to phone. Hard risk gates. Paper first. No live broker.
2. **Social** — drafts + checklists (approve before posting)
3. **Work** — priorities, emails, actions, SOPs

## Voice flow
Wake → brief / quote / asset pipeline → chart → send to phone. Dense data spoken + mini brief card. Risk & paper book stay in a drawer.

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

## Live brokers (stubs only)
Settings → Risk drawer → **Live brokers (optional)**:
- **Alpaca** — official paper/live API fields; key/secret in localStorage only; Connect validates format; **does not send orders** until an explicit future enable.
- **CoinSwitch** — same stub pattern.
- **Robinhood** — no official bot API. Label only: use Alpaca paper or TradingView alerts. **Never ask for Robinhood password.** No cookie/private API scrapers.
