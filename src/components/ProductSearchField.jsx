export default function ProductSearchField({
  id = 'ecoshop-product-search',
  name = 'q',
  value,
  defaultValue,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = 'Search products…',
  className = '',
  autoComplete = 'off',
  inputClassName = '',
  disabled = false,
  variant = 'default',
  role,
  ariaExpanded,
  ariaAutocomplete,
  ariaControls,
  ariaActivedescendant,
  list,
  'aria-label': ariaLabel = 'Search products',
}) {
  const controlled = value !== undefined
  const iconClass =
    variant === 'glass'
      ? 'text-emerald-900/50 dark:text-emerald-100/50'
      : 'text-stone-400 dark:text-stone-500'
  const inputVariantClass =
    variant === 'glass'
      ? 'border border-white/55 bg-white/25 py-3 pl-10 pr-3 text-base text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] outline-none ring-emerald-600/20 backdrop-blur-md transition-[box-shadow,border-color,background-color] placeholder:text-emerald-950/50 focus:border-emerald-700/45 focus:bg-white/35 focus:ring-2 disabled:opacity-60 dark:border-white/15 dark:bg-stone-950/35 dark:text-emerald-50 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:placeholder:text-emerald-100/45 dark:focus:border-emerald-400/40 dark:focus:bg-stone-950/45 dark:focus:ring-emerald-400/25'
      : 'border border-stone-200/90 bg-white py-3 pl-10 pr-3 text-base text-stone-900 shadow-sm outline-none ring-emerald-500/30 transition-[box-shadow,border-color] placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-emerald-400'
  return (
    <div className={`relative ${className}`}>
      <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${iconClass}`} aria-hidden>
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </span>
      <input
        id={id}
        name={name}
        type="search"
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role={role}
        aria-expanded={ariaExpanded}
        aria-autocomplete={ariaAutocomplete}
        aria-controls={ariaControls}
        aria-activedescendant={ariaActivedescendant}
        list={list}
        className={`w-full rounded-xl ${inputVariantClass} ${inputClassName}`}
        {...(controlled ? { value, onChange, onKeyDown, onFocus, onBlur } : { defaultValue, onChange, onKeyDown, onFocus, onBlur })}
      />
    </div>
  )
}
