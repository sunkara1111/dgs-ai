# DGS AI market skills (box CLI)

Yahoo-style quotes, technicals, fundamentals, option chains + Black-Scholes Greeks,
bullish / PMCC scans, correlation risk compare, markdown/PDF reports, and optional
IBKR paper portfolio helpers.

**Brand:** DGS AI only.  
**Data:** free Yahoo-style sources where possible — **~15 minute delay** common.  
**Disclaimer:** Not financial advice. No guaranteed profits. IB stop-loss is **dry-run by default**.

## Setup

```bash
cd /workspace/dinesh-ai-fund
python3 -m venv .venv
.venv/bin/pip install -e /workspace/trading_skills
# or: .venv/bin/pip install yfinance pandas numpy scipy pandas-ta ib-async reportlab mistune requests python-dotenv
```

Reference library lives at `/workspace/trading_skills` (capabilities comparable to the
open `trading_skills` project). User-facing brand remains **DGS AI**.

## Commands

```bash
cd /workspace/dinesh-ai-fund

.venv/bin/python -m tools.market_skills quote AAPL
.venv/bin/python -m tools.market_skills technicals NVDA
.venv/bin/python -m tools.market_skills fundamentals MSFT
.venv/bin/python -m tools.market_skills options SPY
.venv/bin/python -m tools.market_skills scan AAPL,MSFT,NVDA,GOOGL --pmcc
.venv/bin/python -m tools.market_skills risk-compare AAPL TSLA
.venv/bin/python -m tools.market_skills report AAPL
# → markdown + PDF under tools/out/

.venv/bin/python -m tools.market_skills whales SPY   # stub — needs MASSIVE_API_KEY

.venv/bin/python -m tools.market_skills ib-status
.venv/bin/python -m tools.market_skills ib-positions --rolls
.venv/bin/python -m tools.market_skills ib-stop-loss            # DRY-RUN (default)
.venv/bin/python -m tools.market_skills ib-stop-loss --execute  # explicit only
```

IBKR defaults to `127.0.0.1:7497` (paper). If TWS is not running you get a graceful message.
Do **not** use live port `7496` unless you intentionally pass `--port 7496`.

## Stubbed pending keys

| Skill | Status |
|-------|--------|
| MASSIVE / Polygon whales | Stub — clear error unless/until `MASSIVE_API_KEY` and live wiring |
| CoinSwitch live orders | Not in this package (see `tools/coinswitch_client.py`; dry-run default) |
| Stripe / Razorpay payment links | Web config placeholders only — no key creation here |
| IB live `--execute` | Opt-in flag only; dry-run is default |

## Assistant / site

Voice intents on the DGS AI web app map to these capabilities. Full scanners,
PDF reports, and IBKR reads run from this CLI (or the DGS AI assistant on the box).
