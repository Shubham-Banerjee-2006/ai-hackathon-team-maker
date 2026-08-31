export function SkeletonLine({ className = "" }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-panel border border-line rounded-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonLine className="w-1/2" />
          <SkeletonLine className="w-1/3 h-3" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <SkeletonLine className="w-16 h-6 rounded-full" />
        <SkeletonLine className="w-20 h-6 rounded-full" />
        <SkeletonLine className="w-14 h-6 rounded-full" />
      </div>
      <SkeletonLine className="w-full h-3" />
      <SkeletonLine className="w-4/5 h-3" />
    </div>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-panel border border-line rounded-card p-5 space-y-3">
      <SkeletonLine className="w-2/3 h-3" />
      <SkeletonLine className="w-1/3 h-8" />
    </div>
  );
}
