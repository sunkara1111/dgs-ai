"""Minimal strategy hooks (Freqtrade-style entry/exit concepts, not a fork)."""
from __future__ import annotations

from typing import Any


def sma(closes: list[float], n: int) -> float | None:
    if not closes or len(closes) < n:
        return None
    return sum(closes[-n:]) / n


def rsi(closes: list[float], period: int = 14) -> float | None:
    if not closes or len(closes) < period + 1:
        return None
    gains = losses = 0.0
    for i in range(len(closes) - period, len(closes)):
        d = closes[i] - closes[i - 1]
        if d >= 0:
            gains += d
        else:
            losses -= d
    avg_gain = gains / period
    avg_loss = losses / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def decide(ohlcv: list[list[float]], *, stoploss: float = -0.05) -> dict[str, Any]:
    """
    Simple momentum: long when SMA-fast > SMA-slow and RSI not overbought.
    Exit when SMA-fast < SMA-slow or RSI overbought.
    stoploss is negative fraction (Freqtrade style), e.g. -0.05 = -5%.
    """
    closes = [c[4] for c in ohlcv if c and len(c) > 4]
    if len(closes) < 30:
        return {"signal": "hold", "reason": "not enough candles", "rsi": None, "sma_fast": None, "sma_slow": None}
    fast = sma(closes, 9)
    slow = sma(closes, 21)
    r = rsi(closes, 14)
    last = closes[-1]
    out = {"signal": "hold", "reason": "no edge", "rsi": r, "sma_fast": fast, "sma_slow": slow, "last": last, "stoploss": stoploss}
    if fast is None or slow is None or r is None:
        return out
    if fast > slow and r < 70:
        out["signal"] = "enter_long"
        out["reason"] = "SMA9>SMA21 and RSI<70"
    elif fast < slow or r > 75:
        out["signal"] = "exit_long"
        out["reason"] = "SMA9<SMA21 or RSI>75"
    return out
