# DGS AI tools

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

# Explicit dry-run flag (same as default)
.venv/bin/python tools/coinswitch_client.py order --dry-run \
  --side sell --symbol BTC/INR --price 5000000 --quantity 0.0001 --exchange coinswitchx

# Live create/cancel ONLY with --live (requires keys; operator must opt in)
.venv/bin/python tools/coinswitch_client.py --live order \
  --side buy --symbol BTC/USDT --price 60000 --quantity 0.001 --exchange c2c1

.venv/bin/python tools/coinswitch_client.py --live cancel --order-id '<uuid>'

# List open orders (read-only)
.venv/bin/python tools/coinswitch_client.py list --open --exchanges coinswitchx,c2c1
```

### Python API (assistant)

```python
from tools.coinswitch_client import CoinSwitchClient

# dry_run=True by default for create/cancel
cs = CoinSwitchClient()  # or dry_run=False after keys + explicit live intent
cs.status()
cs.create_limit_order("buy", "BTC/USDT", 60000, 0.001, "c2c1")
cs.list_orders(open=True, exchanges="c2c1")
cs.cancel_order("<order_id>")
```

Mutating calls never hit the network unless `dry_run=False` / CLI `--live`.
