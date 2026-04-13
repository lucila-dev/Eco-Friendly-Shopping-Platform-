import { hashString } from './productMetrics'

export const ORDER_TRACKING_STEPS = [
  {
    key: 'confirmed',
    label: 'Order confirmed',
    detail: 'Payment received. We are getting your eco friendly items ready.',
  },
  {
    key: 'processing',
    label: 'Being processed',
    detail: 'Picking and packing at our sustainable fulfilment centre.',
  },
  {
    key: 'hub',
    label: 'Arrived at sorting hub',
    detail: 'Scanned at the regional distribution centre.',
  },
  {
    key: 'transit',
    label: 'In transit',
    detail: 'On the way to your local delivery station.',
  },
  {
    key: 'out_for_delivery',
    label: 'Out for delivery',
    detail: 'Courier is on route to your address today.',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    detail: 'Parcel handed off. Thank you for shopping sustainably.',
  },
]

export function getOrderTrackingTimeline(order) {
  const created = new Date(order.created_at).getTime()
  const now = Date.now()
  const hoursSince = Math.max(0, (now - created) / (1000 * 60 * 60))

  const idHash = hashString(String(order.id ?? ''))
  const hoursPerStage = 4 + (idHash % 41) / 20
  const jitter = (idHash % 47) / 100
  const progress = hoursSince / hoursPerStage + jitter

  const n = ORDER_TRACKING_STEPS.length
  const allDelivered = progress >= n

  const steps = ORDER_TRACKING_STEPS.map((step, i) => {
    if (allDelivered) {
      return { ...step, status: 'complete' }
    }
    const completedThrough = Math.floor(progress)
    if (i < completedThrough) {
      return { ...step, status: 'complete' }
    }
    if (i === completedThrough) {
      return { ...step, status: 'current' }
    }
    return { ...step, status: 'pending' }
  })

  const current = steps.find((s) => s.status === 'current')
  const summary = allDelivered
    ? 'Delivered. All milestones complete.'
    : current
      ? `${current.label}: ${current.detail}`
      : 'Tracking will update as your parcel moves.'

  return { steps, summary }
}
