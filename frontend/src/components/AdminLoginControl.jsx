import { useState } from "react";
import { Link } from "react-router-dom";
import { LogIn, LogOut, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Modal from "./Modal";

export default function AdminLoginControl({ compact = false }) {
  const { admin, isAdmin, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      setOpen(false);
      setUsername("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/admin"
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide px-2.5 py-1.5 rounded-card border border-moss text-moss hover:bg-moss/10 transition-colors focus-ring"
          title={`Logged in as ${admin.username} (${admin.role})`}
        >
          <ShieldCheck size={13} />
          {!compact && admin.username}
        </Link>
        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide px-2 py-1.5 rounded-card text-muted hover:text-signal transition-colors focus-ring"
        >
          <LogOut size={13} />
          {!compact && "Log out"}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide px-2.5 py-1.5 rounded-card border border-line text-muted hover:text-ink hover:border-ink transition-colors focus-ring"
      >
        <LogIn size={13} />
        {!compact && "Admin login"}
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError("");
        }}
        eyebrow="Organizer access"
        title="Sign in to the dashboard"
        icon={<ShieldCheck size={18} />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
              Username
            </span>
            <input
              autoFocus
              className="input"
              placeholder="organizer"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
              Password
            </span>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="text-signal text-[12px] font-mono bg-signal/5 border border-signal/20 rounded-card px-3 py-2 animate-fadein">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted text-xs font-mono hover:text-ink focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="btn-primary btn-shine"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  Signing in
                  <span className="dot-pulse"><span /><span /><span /></span>
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
