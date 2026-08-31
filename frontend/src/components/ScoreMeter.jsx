import { useEffect, useState } from "react";

export default function ScoreMeter({ label, value, accent = "moss", delay = 0 }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const [width, setWidth] = useState(0);
  const accentClass = accent === "moss" ? "bg-moss" : accent === "gold" ? "bg-gold" : "bg-signal";

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 60 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="flex items-center gap-3 group">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted w-28 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full score-track overflow-hidden relative">
        <div
          className={`h-full ${accentClass} rounded-full transition-all duration-[900ms] ease-smooth relative overflow-hidden`}
          style={{ width: `${width}%` }}
        >
          <span className="absolute inset-0 bg-white/25 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-700 ease-smooth" />
        </div>
      </div>
      <span className="font-mono text-sm tabular-nums w-10 text-right">{pct}</span>
    </div>
  );
}
