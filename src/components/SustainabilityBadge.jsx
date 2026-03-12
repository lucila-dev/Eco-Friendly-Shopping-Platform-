export default function SustainabilityBadge({ product }) {
  const score = product.sustainability_score ?? 0
  const maxScore = 10
  const materials = product.materials || 'Not specified'
  const carbonSaving = product.carbon_footprint_saving_kg ?? 0

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
      <h3 className="font-semibold text-stone-800">Sustainability</h3>
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-stone-600">Score</span>
          <span className="font-medium text-emerald-700">{score}/{maxScore}</span>
        </div>
        <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(score / maxScore) * 100}%` }}
          />
        </div>
      </div>
      <div>
        <p className="text-sm text-stone-600 mb-0.5">Materials</p>
        <p className="text-stone-800 text-sm">{materials}</p>
      </div>
      <div>
        <p className="text-sm text-stone-600 mb-0.5">Carbon footprint saving</p>
        <p className="text-emerald-700 font-medium">
          ~{Number(carbonSaving).toFixed(1)} kg CO₂ saved per unit
        </p>
      </div>
    </div>
  )
}
