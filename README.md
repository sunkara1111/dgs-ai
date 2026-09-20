# DGS AI

**Live:** https://sunkara1111.github.io/dgs-ai/

Free AI agent bot. Talk to **DGS Agent** for chat, commands, work drafts, and social drafts. The paper trading desk is a free skill. Optional Pro is only for advanced trading autopilot and live.

**Founder:** Dineshgopi Sunkara · Senior Controls Engineer · Automation Engineer

This GitHub Pages site is **live** (not a coming-soon page). The app is free forever — no account required. Default mode is paper / dry-run. Delayed Yahoo-style data is possible. Not financial advice. No guaranteed profit.

## Public pages

| Path | Purpose |
|------|---------|
| https://sunkara1111.github.io/dgs-ai/ | DGS Agent (free) + optional trading desk |
| https://sunkara1111.github.io/dgs-ai/robots.txt | Crawl rules |
| https://sunkara1111.github.io/dgs-ai/sitemap.xml | Sitemap |
| [DOMAIN.md](DOMAIN.md) | Custom-domain checklist (no invented hostname) |

## Honest limits

- No invented users, rankings, AUM, returns, or patent numbers.
- Live broker orders are not placed from this static page. CoinSwitch intents and CCXT keys stay on-device; live HTTP needs an operator box.
- Pro checkout links stay placeholders until Stripe / Razorpay URLs are pasted in `js/billing-config.js`.
- Interactive Brokers tools need TWS / IB Gateway on the operator box (`127.0.0.1:7497` paper).

## Local tools (operator box)

```bash
python3 -m venv .venv
.venv/bin/pip install -r tools/ft_bot/requirements.txt
.venv/bin/python -m tools.market_skills quote AAPL
.venv/bin/python -m tools.ft_bot test-connection -e kraken
```

See `docs/SETUP.md`, `tools/README.md`, `DESIGN-BRIEF.md`, and `DOMAIN.md`.
