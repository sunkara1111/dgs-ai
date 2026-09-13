"""MASSIVE/Polygon whale skill stub — requires MASSIVE_API_KEY (not shipped)."""
from __future__ import annotations

import os


class WhaleKeyMissing(RuntimeError):
    pass


def whales_hunter(*_args, **_kwargs) -> dict:
    """Stub: live whale calls need MASSIVE_API_KEY. Errors clearly if missing."""
    key = os.environ.get("MASSIVE_API_KEY", "").strip()
    if not key:
        raise WhaleKeyMissing(
            "MASSIVE_API_KEY is not set. Whale / Polygon live option-flow is stubbed "
            "until a key is provided in the environment. DGS AI will not call live "
            "Massive/Polygon APIs without that key."
        )
    # Key present but this DGS build still stubs live calls (no live credential wiring).
    raise WhaleKeyMissing(
        "MASSIVE_API_KEY is set, but DGS AI whale live calls remain stubbed in this "
        "build (keys intentionally not wired for CoinSwitch/Polygon/Stripe/Razorpay/IB live). "
        "Remove stub only when product owners enable live Massive integration."
    )
