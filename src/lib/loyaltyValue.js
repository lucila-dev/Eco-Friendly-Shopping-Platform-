import { RATES_FROM_GBP } from './shopMoney'

export const LOYALTY_POINTS_PER_DOLLAR = 200

export function loyaltyCreditsToMoney(credits) {
  const pts = Number(credits) || 0
  return pts / LOYALTY_POINTS_PER_DOLLAR
}

/**
 * Checkout totals are in GBP. Loyalty is stored as points where LOYALTY_POINTS_PER_DOLLAR pts = $1 USD.
 * Converts a basket total in GBP to the points to deduct (rounded up so cover is never short).
 */
export function gbpToLoyaltyPoints(amountGbp) {
  const gbp = Math.max(0, Number(amountGbp) || 0)
  if (gbp === 0) return 0
  const usd = gbp * RATES_FROM_GBP.USD
  return Math.ceil(usd * LOYALTY_POINTS_PER_DOLLAR - 1e-9)
}

export function formatMoneyUsd(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
