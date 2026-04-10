/** EcoShop loyalty: points redeem at checkout (rate similar to typical grocery programmes). */
export const LOYALTY_POINTS_PER_DOLLAR = 200

export function loyaltyCreditsToMoney(credits) {
  const pts = Number(credits) || 0
  return pts / LOYALTY_POINTS_PER_DOLLAR
}

export function formatMoneyUsd(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
