import { getOrderTrackingTimeline } from '../lib/orderTracking'

export default function OrderTrackingTimeline({ order }) {
  const { steps, summary } = getOrderTrackingTimeline(order)
  const currentStep = steps.find((s) => s.status === 'current')
  const allComplete = steps.every((s) => s.status === 'complete')
  const collapsedHint = allComplete ? 'Delivered' : currentStep?.label ?? 'Preparing'

  return (
    <details className="group rounded-lg border border-emerald-200/90 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/35 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-3 select-none [&::-webkit-details-marker]:hidden">
        <span className="text-base font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300 shrink-0">
          Shipment progress
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-base font-medium text-emerald-900 dark:text-emerald-200">
          {collapsedHint}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400 transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="border-t border-emerald-200/80 dark:border-emerald-800/60 px-3 pb-3 pt-2 sm:px-4">
        <p className="text-base text-emerald-900/90 dark:text-emerald-200/90 mb-3 leading-snug">{summary}</p>
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
                    className={`text-base font-semibold leading-tight ${
                      step.status === 'pending'
                        ? 'text-stone-500 dark:text-stone-500'
                        : 'text-emerald-950 dark:text-emerald-100'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-base mt-0.5 leading-relaxed ${
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
    </details>
  )
}
