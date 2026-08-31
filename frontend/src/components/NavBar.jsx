import { useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import AdminLoginControl from "./AdminLoginControl";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Register", end: true },
  { to: "/roster", label: "Roster" },
  { to: "/teams", label: "Teams" },
  { to: "/find-teammates", label: "Find My Teammates" },
];

export default function NavBar() {
  const { isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-line/80 glass sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-moss to-gold text-paper flex items-center justify-center font-mono text-xs font-semibold shadow-glow">
            <span className="absolute inset-0 rounded-full animate-pulse-ring" />
            <Sparkles size={15} strokeWidth={2.25} />
          </div>
          <span className="font-display text-lg tracking-tight">
            Hackathon Team Maker
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 font-mono text-[13px] uppercase tracking-wide">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `relative px-3 py-2 rounded-card transition-colors duration-200 focus-ring ${
                  isActive ? "text-paper" : "text-muted hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-ink rounded-card -z-10"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {l.label}
                </>
              )}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `relative px-3 py-2 rounded-card transition-colors duration-200 focus-ring ${
                  isActive ? "text-paper" : "text-moss hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-moss rounded-card -z-10"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  Dashboard
                </>
              )}
            </NavLink>
          )}
          <span className="ml-2">
            <AdminLoginControl />
          </span>
        </nav>

        {/* Mobile toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <AdminLoginControl compact />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation"
            className="p-2 rounded-card border border-line text-ink hover:border-ink transition-colors focus-ring"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden overflow-hidden border-t border-line bg-panel/95"
          >
            <div className="px-6 py-3 flex flex-col gap-1 font-mono text-[13px] uppercase tracking-wide">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-card transition-colors focus-ring ${
                      isActive ? "bg-ink text-paper" : "text-muted hover:text-ink"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-card transition-colors focus-ring ${
                      isActive ? "bg-moss text-paper" : "text-moss hover:text-ink"
                    }`
                  }
                >
                  Dashboard
                </NavLink>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
