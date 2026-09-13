# DGS AI tools

## Market skills (`market_skills/`)

Box CLI for quotes, technicals, fundamentals, options/Greeks, bullish+PMCC scans,
risk compare, markdown/PDF reports, IBKR paper portfolio / rolls / stop-loss dry-run.

See [`market_skills/README.md`](market_skills/README.md).

```bash
cd /workspace/dinesh-ai-fund
.venv/bin/python -m tools.market_skills quote AAPL
.venv/bin/python -m tools.market_skills report NVDA
.venv/bin/python -m tools.market_skills ib-stop-loss   # dry-run default
```

Yahoo-style data may be delayed ~15 minutes. Not financial advice. No guaranteed profits.

## `coinswitch_client.py`

CoinSwitch PRO Spot helper using Ed25519 (`X-AUTH-APIKEY`, `X-AUTH-SIGNATURE`, `X-AUTH-EPOCH`).

Docs: https://api-trading.coinswitch.co  
Base URL: `https://coinswitch.co`

### Secrets (env only — never commit)

```bash
export COINSWITCH_API_KEY='...'    # hex public key
export COINSWITCH_SECRET_KEY='...' # hex Ed25519 seed
```

### Setup

```bash
cd /workspace/dinesh-ai-fund
python3 -m venv .venv
.venv/bin/pip install cryptography requests
```

### CLI

```bash
# Fails clearly if keys missing; validates signature when keys are set
.venv/bin/python tools/coinswitch_client.py status

# Dry-run (default) — prints the payload that WOULD be sent; no order placed
.venv/bin/python tools/coinswitch_client.py order \
  --side buy --symbol BTC/USDT --price 60000 --quantity 0.001 --exchange c2c1

# Live create/cancel ONLY with --live (requires keys; operator must opt in)
.venv/bin/python tools/coinswitch_client.py --live order \
  --side buy --symbol BTC/USDT --price 60000 --quantity 0.001 --exchange c2c1
```

Mutating calls never hit the network unless `dry_run=False` / CLI `--live`.
