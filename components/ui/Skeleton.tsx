// Loading placeholders in the shape of the content that is about to appear.
// Purely visual: callers keep their own loading conditions.

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`bg-raised rounded-lg animate-pulse ${className}`} />
}

type Variant = 'dashboard' | 'list' | 'calendar' | 'detail' | 'block'

export function PageSkeleton({ label, variant = 'list' }: { label: string; variant?: Variant }) {
  const wrap = variant === 'block' ? 'py-6' : 'min-h-screen max-w-5xl mx-auto px-4 py-6'
  return (
    <div role="status" aria-live="polite" className={wrap} dir="rtl">
      {variant !== 'block' && <Skeleton className="h-8 w-56 mb-6" />}

      {variant === 'dashboard' && (
        <>
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 md:h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 rounded-xl mb-6" />
          <Skeleton className="h-72 rounded-xl" />
        </>
      )}

      {variant === 'list' && (
        <>
          <Skeleton className="h-11 w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        </>
      )}

      {variant === 'calendar' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => <Skeleton key={i} className="h-16 md:h-24 rounded-md" />)}
          </div>
        </>
      )}

      {variant === 'detail' && (
        <>
          <Skeleton className="h-24 rounded-xl mb-6" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </>
      )}

      {variant === 'block' && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-3/5" />
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted">{label}</p>
    </div>
  )
}
