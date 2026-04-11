import { getOrderTrackingTimeline } from '../lib/orderTracking'

export default function OrderTrackingTimeline({ order }) {
  const { steps, summary } = getOrderTrackingTimeline(order)

  return (
    <div className="rounded-lg border border-emerald-200/90 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/35 px-3 py-3 sm:px-4 sm:py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300 mb-2">
        Shipment progress
      </p>
      <p className="text-xs text-emerald-900/90 dark:text-emerald-200/90 mb-3 leading-snug">{summary}</p>
      <ol className="space-y-0" aria-label="Order tracking steps">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          const connectorClass =
            step.status === 'complete'
              ? 'bg-emerald-500 dark:bg-emerald-500'
              : 'bg-stone-200 dark:bg-stone-600'
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex w-5 shrink-0 flex-col items-center">
                <div
                  className={`relative z-[1] flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white dark:bg-stone-900 ${
                    step.status === 'complete'
                      ? 'border-emerald-500 dark:border-emerald-500'
                      : step.status === 'current'
                        ? 'border-emerald-500 dark:border-emerald-400'
                        : 'border-stone-300 dark:border-stone-600'
                  }`}
                >
                  {step.status === 'complete' && (
                    <span className="text-[0.65rem] font-bold leading-none text-emerald-600 dark:text-emerald-400" aria-hidden>
                      {'\u2713'}
                    </span>
                  )}
                  {step.status === 'current' && (
                    <span
                      className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"
                      aria-current="step"
                    />
                  )}
                  {step.status === 'pending' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300 dark:bg-stone-600" aria-hidden />
                  )}
                </div>
                {!isLast && <div className={`mt-0.5 w-px min-h-[1.25rem] grow ${connectorClass}`} aria-hidden />}
              </div>
              <div className="min-w-0 pb-4">
                <p
                  className={`text-sm font-semibold leading-tight ${
                    step.status === 'pending'
                      ? 'text-stone-500 dark:text-stone-500'
                      : 'text-emerald-950 dark:text-emerald-100'
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`text-xs mt-0.5 leading-relaxed ${
                    step.status === 'pending'
                      ? 'text-stone-500 dark:text-stone-600'
                      : 'text-emerald-800/90 dark:text-emerald-300/85'
                  }`}
                >
                  {step.detail}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
