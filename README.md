# DGS AI

**Live:** https://sunkara1111.github.io/dgs-ai/

Paper trading desk with risk gates, TradingView charts, and market analysis.

**Founder:** Dineshgopi Sunkara · Senior Controls Engineer · Automation Engineer

This GitHub Pages site is **live** (not a coming-soon page). Sign-in unlocks the desk. Default mode is paper / dry-run. Delayed Yahoo-style data is possible. Not financial advice. No guaranteed profit.

## Public pages

| Path | Purpose |
|------|---------|
| https://sunkara1111.github.io/dgs-ai/ | Live desk (gated login) |
| https://sunkara1111.github.io/dgs-ai/robots.txt | Crawl rules |
| https://sunkara1111.github.io/dgs-ai/sitemap.xml | Sitemap |

## Honest limits

- No invented users, rankings, AUM, returns, or patent numbers.
- Live broker orders are not placed from this static page. CoinSwitch intents and CCXT keys stay on-device; live HTTP needs an operator box.
- Starter / Pro checkout links stay placeholders until Stripe / Razorpay URLs are pasted in `js/billing-config.js`.
- Interactive Brokers tools need TWS / IB Gateway on the operator box (`127.0.0.1:7497` paper).

## Local tools (operator box)

```bash
python3 -m venv .venv
.venv/bin/pip install -r tools/ft_bot/requirements.txt
.venv/bin/python -m tools.market_skills quote AAPL
.venv/bin/python -m tools.ft_bot test-connection -e kraken
```

See `docs/SETUP.md`, `tools/README.md`, and `DESIGN-BRIEF.md`.
