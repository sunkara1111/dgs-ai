/**
 * DGS AI Pro — checkout placeholders (client-side entitlement MVP)
 *
 * SETUP
 * Razorpay (₹499 / month, India):
 *   Dashboard → Payment Links or Payment Button.
 *   Amount: ₹499. Success / callback URL:
 *     https://sunkara1111.github.io/dgs-ai/?paid=1
 *   Paste the hosted link into RAZORPAY_PAYMENT_LINK_INR.
 *
 * Stripe ($9 / month, USD):
 *   Dashboard → Payment Links. Amount: $9.
 *   Success URL: https://sunkara1111.github.io/dgs-ai/?paid=1
 *   Cancel URL:  https://sunkara1111.github.io/dgs-ai/
 *   Paste the link into STRIPE_PAYMENT_LINK_USD.
 *
 * Production must verify payment with a webhook + server-side entitlement.
 * This static GitHub Pages app cannot do that alone — see SETUP.md.
 */
export const BILLING = {
  priceInrLabel: '₹499',
  priceUsdLabel: '$9',
  period: 'mo',
  RAZORPAY_PAYMENT_LINK_INR: 'YOUR_RAZORPAY_PAYMENT_LINK_INR',
  STRIPE_PAYMENT_LINK_USD: 'YOUR_STRIPE_PAYMENT_LINK_USD',
  returnFlag: 'paid',
};

export function isPayLinkReady(url) {
  const u = String(url || '').trim();
  if (!u) return false;
  if (u.startsWith('YOUR_') || u === '#') return false;
  return /^https:\/\//i.test(u);
}
