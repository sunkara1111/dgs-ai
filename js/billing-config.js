/**
 * DGS AI — checkout placeholders (client-side entitlement MVP)
 *
 * PLANS
 *   Free forever:      $0 — DGS Agent chat, work/social drafts, paper desk
 *   Starter (legacy):  $19/mo or ₹1,499/mo — kept for existing checkout links
 *   Pro:               $49/mo or ₹3,999/mo — advanced trading autopilot / live
 *
 * SETUP
 * Razorpay (India):
 *   Create Payment Links for ₹1,499 (Starter) and ₹3,999 (Pro).
 *   Success / callback URL:
 *     https://sunkara1111.github.io/dgs-ai/?paid=1
 *   Paste into RAZORPAY_PAYMENT_LINK_INR_STARTER / _PRO.
 *
 * Stripe (USD):
 *   Payment Links for $19 (Starter) and $49 (Pro).
 *   Success URL: https://sunkara1111.github.io/dgs-ai/?paid=1
 *   Cancel URL:  https://sunkara1111.github.io/dgs-ai/
 *   Paste into STRIPE_PAYMENT_LINK_USD_STARTER / _PRO.
 *
 * Production must verify payment with a webhook + server-side entitlement.
 * This static GitHub Pages app cannot do that alone — see SETUP.md.
 */
export const BILLING = {
  starterUsdLabel: '$19',
  starterInrLabel: '₹1,499',
  proUsdLabel: '$49',
  proInrLabel: '₹3,999',
  period: 'mo',
  STRIPE_PAYMENT_LINK_USD_STARTER: 'YOUR_STRIPE_PAYMENT_LINK_USD_STARTER',
  RAZORPAY_PAYMENT_LINK_INR_STARTER: 'YOUR_RAZORPAY_PAYMENT_LINK_INR_STARTER',
  STRIPE_PAYMENT_LINK_USD_PRO: 'YOUR_STRIPE_PAYMENT_LINK_USD_PRO',
  RAZORPAY_PAYMENT_LINK_INR_PRO: 'YOUR_RAZORPAY_PAYMENT_LINK_INR_PRO',
  returnFlag: 'paid',
};

export function isPayLinkReady(url) {
  const u = String(url || '').trim();
  if (!u) return false;
  if (u.startsWith('YOUR_') || u === '#') return false;
  return /^https:\/\//i.test(u);
}

/** kind: 'starter-usd' | 'starter-inr' | 'pro-usd' | 'pro-inr' */
export function payLinkFor(kind) {
  switch (kind) {
    case 'starter-usd': return BILLING.STRIPE_PAYMENT_LINK_USD_STARTER;
    case 'starter-inr': return BILLING.RAZORPAY_PAYMENT_LINK_INR_STARTER;
    case 'pro-usd': return BILLING.STRIPE_PAYMENT_LINK_USD_PRO;
    case 'pro-inr': return BILLING.RAZORPAY_PAYMENT_LINK_INR_PRO;
    default: return '';
  }
}

export function planFromPayKind(kind) {
  if (kind === 'pro-usd' || kind === 'pro-inr' || kind === 'pro' || kind === 'inr') return 'pro';
  if (kind === 'starter-usd' || kind === 'starter-inr' || kind === 'limited' || kind === 'usd') return 'limited';
  return 'limited';
}

export function payKindLabel(kind) {
  switch (kind) {
    case 'starter-usd': return `${BILLING.starterUsdLabel} Stripe · Starter`;
    case 'starter-inr': return `${BILLING.starterInrLabel} Razorpay · Starter`;
    case 'pro-usd': return `${BILLING.proUsdLabel} Stripe · Pro`;
    case 'pro-inr': return `${BILLING.proInrLabel} Razorpay · Pro`;
    default: return 'checkout';
  }
}
