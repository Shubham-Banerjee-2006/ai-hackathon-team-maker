import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Centered, animated modal dialog rendered in a portal so it always sits
 * above app content regardless of stacking contexts in the page below.
 */
export default function Modal({ open, onClose, title, eyebrow, icon, width = "max-w-md", children }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${width} bg-panel border border-line rounded-xl2 shadow-2xl p-7 max-h-[88vh] overflow-y-auto`}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-5 right-5 text-muted hover:text-ink transition-colors focus-ring rounded-full p-1"
            >
              <X size={18} />
            </button>

            {(eyebrow || title) && (
              <div className="mb-6 pr-8">
                {icon && (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-moss to-gold flex items-center justify-center text-paper mb-4 shadow-glow">
                    {icon}
                  </div>
                )}
                {eyebrow && (
                  <p className="font-mono text-[11px] uppercase tracking-wider text-moss mb-1.5">
                    {eyebrow}
                  </p>
                )}
                {title && <h2 className="font-display text-2xl tracking-tight">{title}</h2>}
              </div>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
