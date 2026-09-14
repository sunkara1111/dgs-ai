# DGS AI FT bot (CCXT + Freqtrade concepts)

Inspired by [Freqtrade](https://github.com/freqtrade/freqtrade) patterns and powered by [CCXT](https://github.com/ccxt/ccxt).
**Not a Freqtrade fork** — dry-run first, strategy entries/exits, stake/budget, stoploss, whitelist, Start/Stop, persistence.

## Setup

```bash
cd /workspace/dinesh-ai-fund
.venv/bin/pip install -r tools/ft_bot/requirements.txt
```

## Commands

```bash
.venv/bin/python -m tools.ft_bot exchanges
.venv/bin/python -m tools.ft_bot test-connection -e kraken
.venv/bin/python -m tools.ft_bot test-connection -e okx --private   # needs CCXT_API_KEY / CCXT_SECRET
.venv/bin/python -m tools.ft_bot run -e kraken --stake 100 --stoploss -0.05 --whitelist BTC/USDT,ETH/USDT --ticks 1
.venv/bin/python -m tools.ft_bot status
.venv/bin/python -m tools.ft_bot stop
```

Live orders require **both** `--enable-live` and `--i-understand-live`. Default is dry-run.

## CoinSwitch

Not in CCXT. Use `tools/coinswitch_client.py` or the desk CoinSwitch panel (India primary).

## Honesty

No guaranteed profits. Not financial advice. Keys never belong in git.
