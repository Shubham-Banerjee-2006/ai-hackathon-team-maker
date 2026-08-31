import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let idCounter = 0;

const TONE_STYLES = {
  success: {
    wrap: "bg-moss text-paper border-moss",
    icon: CheckCircle2,
  },
  error: {
    wrap: "bg-signal text-paper border-signal",
    icon: XCircle,
  },
  default: {
    wrap: "bg-ink text-paper border-ink",
    icon: Info,
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (message, tone = "default", duration = 4200) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, tone }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = {
    success: (msg, duration) => push(msg, "success", duration),
    error: (msg, duration) => push(msg, "error", duration),
    info: (msg, duration) => push(msg, "default", duration),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const style = TONE_STYLES[t.tone] || TONE_STYLES.default;
            const Icon = style.icon;
            return (
              <motion.div
                key={t.id}
                role="status"
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.95, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className={`pointer-events-auto flex items-start gap-2.5 rounded-card border px-4 py-3 text-sm font-mono shadow-lg cursor-pointer ${style.wrap}`}
                onClick={() => dismiss(t.id)}
              >
                <Icon size={16} className="mt-0.5 shrink-0" />
                <span className="flex-1 leading-snug">{t.message}</span>
                <X size={14} className="mt-0.5 shrink-0 opacity-60" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
