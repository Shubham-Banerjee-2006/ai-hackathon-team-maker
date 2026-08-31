import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

/**
 * Chip/tag input that supports BOTH clicking a predefined suggestion AND
 * typing a completely custom value (comma or Enter to commit). Values are
 * trimmed and de-duplicated case-insensitively so "python" and "Python"
 * don't both end up on a profile, but the first-typed casing is kept.
 *
 * This is what makes skills/interests "custom, not just a fixed list" --
 * every value (suggested or typed) ends up in the same flat string[].
 */
export default function TagInput({
  values,
  onChange,
  suggestions = [],
  placeholder = "Type a value and press Enter…",
  tone = "moss",
}) {
  const [query, setQuery] = useState("");

  const normalized = useMemo(() => new Set(values.map((v) => v.toLowerCase())), [values]);

  const filteredSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suggestions
      .filter((s) => !normalized.has(s.toLowerCase()))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [suggestions, normalized, query]);

  function commit(raw) {
    const value = raw.trim().replace(/,+$/, "");
    if (!value) return;
    if (normalized.has(value.toLowerCase())) {
      setQuery("");
      return; // silently ignore accidental duplicates
    }
    onChange([...values, value]);
    setQuery("");
  }

  function remove(value) {
    onChange(values.filter((v) => v !== value));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(query);
    } else if (e.key === "Backspace" && !query && values.length > 0) {
      remove(values[values.length - 1]);
    }
  }

  const activeClass =
    tone === "gold" ? "bg-gold text-ink border-gold" : "bg-moss text-paper border-moss";

  return (
    <div className="space-y-2.5">
      {/* Selected chips (suggested or custom -- rendered identically) */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {values.map((v) => (
              <motion.button
                key={v}
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                onClick={() => remove(v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] font-mono focus-ring ${activeClass}`}
                title="Remove"
              >
                {v}
                <X size={12} className="opacity-70" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Free-text entry -- this is the "custom skill" affordance */}
      <div className="relative">
        <div className="flex items-center gap-2 input py-2">
          <input
            className="flex-1 bg-transparent outline-none text-[13px]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          {query.trim() && (
            <button
              type="button"
              onClick={() => commit(query)}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-moss hover:text-moss/80 focus-ring px-2 py-1 rounded-full border border-moss/30 bg-moss/5"
            >
              <Plus size={11} /> Add "{query.trim()}"
            </button>
          )}
        </div>

        {/* Suggestion dropdown -- only ever a shortcut, never a limit */}
        {filteredSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => commit(s)}
                className="px-2.5 py-1 rounded-full border border-line text-muted text-[12px] font-mono hover:border-ink hover:text-ink transition-colors focus-ring"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
