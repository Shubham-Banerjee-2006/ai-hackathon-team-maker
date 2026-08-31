import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ActivitySquare, AlertTriangle, KeyRound, LayoutDashboard, Lock,
  LogIn as LogInIcon, ShieldAlert, ShieldCheck, ShieldPlus, Trash2,
  UploadCloud, UserCog, UserPlus2, Users,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Modal from "../components/Modal";
import AnimatedNumber from "../components/AnimatedNumber";
import { SkeletonStat } from "../components/Skeleton";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tools", label: "Team tools", icon: UploadCloud },
  { id: "accounts", label: "Organizer accounts", icon: UserCog, superOnly: true },
  { id: "activity", label: "Activity log", icon: ActivitySquare },
];

export default function AdminDashboard() {
  const { admin, isAdmin, isSuperAdmin, checking } = useAuth();
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsData, logData] = await Promise.all([api.getStats(), api.getAuditLog(50)]);
      setStats(statsData);
      setAuditLog(logData);
      if (isSuperAdmin) setAdmins(await api.listAdmins());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImportCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await api.importParticipantsCsv(file);
      toast.success(`Imported ${result.created} participant(s). ${result.skipped_duplicates} duplicate(s) skipped.`);
      if (result.errors?.length) toast.error(result.errors.slice(0, 2).join(" "));
      loadAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleResetTeams() {
    if (!window.confirm("Clear every team and un-assign all participants? This can't be undone.")) return;
    try {
      const result = await api.resetTeams();
      toast.success(`Cleared ${result.teams_cleared} team(s).`);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (checking) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-28 text-center relative overflow-hidden">
        <div className="absolute inset-0 -z-10 grid-backdrop opacity-60" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-signal/10 border border-signal/25 flex items-center justify-center text-signal animate-pulse-ring"
        >
          <ShieldAlert size={30} />
        </motion.div>
        <p className="font-mono text-[12px] uppercase tracking-wider text-signal mb-2">Admins only</p>
        <h1 className="font-display text-3xl tracking-tight mb-4">Log in to view the dashboard.</h1>
        <p className="text-muted mb-8">
          Use the "Admin login" button in the top-right corner to sign in with your organizer account.
        </p>
        <Link to="/" className="btn-primary btn-shine inline-flex">
          <LogInIcon size={15} /> Back home
        </Link>
      </div>
    );
  }

  const visibleTabs = TABS.filter((t) => !t.superOnly || isSuperAdmin);

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-end justify-between mb-8 flex-wrap gap-4"
      >
        <div>
          <p className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-moss mb-2 border border-moss/30 bg-moss/5 px-3 py-1.5 rounded-full">
            <ShieldCheck size={12} /> Organizer dashboard
          </p>
          <h1 className="font-display text-4xl tracking-tight">
            Welcome back, {admin.display_name || admin.username}.
          </h1>
          <p className="text-muted mt-2">
            Signed in as <span className="font-mono">{admin.username}</span> ·{" "}
            <span className="uppercase font-mono text-[12px]">{admin.role}</span>
          </p>
        </div>
        <ChangePasswordControl />
      </motion.div>

      {/* Tabs */}
      <div className="segmented mb-10 flex-wrap w-full sm:w-auto inline-flex">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 ${active ? "active" : ""}`}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab-pill"
                  className="absolute inset-0 bg-ink rounded-[9px] -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === "overview" && <OverviewTab stats={stats} loading={loading} />}
          {tab === "tools" && (
            <ToolsTab
              fileRef={fileRef}
              onImport={handleImportCsv}
              onResetTeams={handleResetTeams}
            />
          )}
          {tab === "accounts" && isSuperAdmin && (
            <AdminUsersPanel admins={admins} selfId={admin.id} onChange={loadAll} />
          )}
          {tab === "activity" && <ActivityTab auditLog={auditLog} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewTab({ stats, loading }) {
  if (loading || !stats) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
      </div>
    );
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Registered" value={stats.total_participants} accent="moss" icon={<Users size={14} />} delay={0} />
        <StatCard label="Unassigned" value={stats.unassigned_participants} accent="signal" icon={<AlertTriangle size={14} />} delay={0.06} />
        <StatCard label="Teams" value={stats.total_teams} accent="gold" icon={<LayoutDashboard size={14} />} delay={0.12} />
        <StatCard label="Admin accounts" value={stats.admin_count} accent="ink" icon={<ShieldCheck size={14} />} delay={0.18} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <ScoreCard label="Avg. skill coverage" value={stats.avg_skill_coverage} accent="moss" />
        <ScoreCard label="Avg. compatibility" value={stats.avg_compatibility} accent="gold" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <DistributionCard title="Top skills" entries={stats.top_skills} accent="moss" />
        <DistributionCard title="Preferred roles" entries={stats.role_distribution} accent="gold" />
        <DistributionCard title="Interest domains" entries={stats.domain_distribution} accent="signal" />
        <DistributionCard title="Experience level" entries={stats.experience_distribution} accent="ink" />
      </div>
    </>
  );
}

function StatCard({ label, value, accent, icon, delay = 0 }) {
  const accentText = { moss: "text-moss", signal: "text-signal", gold: "text-gold-500", ink: "text-ink" }[accent];
  const accentBg = { moss: "bg-moss/10", signal: "bg-signal/10", gold: "bg-gold/10", ink: "bg-ink/8" }[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="card-surface card-surface-hover p-5"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</p>
        <span className={`w-7 h-7 rounded-full ${accentBg} ${accentText} flex items-center justify-center`}>
          {icon}
        </span>
      </div>
      <p className={`font-display text-4xl ${accentText}`}>
        <AnimatedNumber value={value} />
      </p>
    </motion.div>
  );
}

function ScoreCard({ label, value, accent }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const bar = { moss: "bg-moss", gold: "bg-gold" }[accent];
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</p>
        <span className="font-mono text-sm tabular-nums"><AnimatedNumber value={pct} /></span>
      </div>
      <div className="h-2 rounded-full score-track overflow-hidden">
        <div className={`h-full ${bar} rounded-full transition-all duration-[900ms] ease-smooth`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function DistributionCard({ title, entries, accent }) {
  const bar = { moss: "bg-moss", gold: "bg-gold", signal: "bg-signal", ink: "bg-ink" }[accent];
  const max = Math.max(1, ...entries.map((e) => e.count));
  return (
    <div className="card-surface p-5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-3">{title}</p>
      {entries.length === 0 && <p className="text-muted text-sm">No data yet.</p>}
      <div className="space-y-2">
        {entries.map((e, i) => (
          <motion.div
            key={e.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3"
          >
            <span className="text-[13px] w-32 truncate">{e.label}</span>
            <div className="flex-1 h-2 rounded-full score-track overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(e.count / max) * 100}%` }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className={`h-full ${bar} rounded-full`}
              />
            </div>
            <span className="font-mono text-xs w-6 text-right">{e.count}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team tools                                                          */
/* ------------------------------------------------------------------ */

function ToolsTab({ fileRef, onImport, onResetTeams }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-surface p-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-3">Bulk import</p>
        <h3 className="font-display text-xl mb-2">Import roster from CSV</h3>
        <p className="text-sm text-ink/75 mb-4 leading-relaxed">
          Columns: <code className="font-mono text-[12px] bg-ink/5 px-1 py-0.5 rounded">name, email, skills, domains, preferred_role,
          experience_level, working_style, availability, bio</code>. Use{" "}
          <code className="font-mono text-[12px] bg-ink/5 px-1 py-0.5 rounded">|</code> to separate multiple skills/domains in one cell.
          Duplicate emails are skipped automatically.
        </p>
        <input ref={fileRef} type="file" accept=".csv" onChange={onImport} className="hidden" id="csv-import" />
        <label
          htmlFor="csv-import"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file && fileRef.current) {
              const dt = new DataTransfer();
              dt.items.add(file);
              fileRef.current.files = dt.files;
              onImport({ target: fileRef.current });
            }
          }}
          className={`flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-card px-6 py-8 text-center transition-colors ${
            dragOver ? "border-moss bg-moss/5" : "border-line hover:border-moss/50"
          }`}
        >
          <UploadCloud className={dragOver ? "text-moss" : "text-muted"} size={22} />
          <span className="font-mono text-sm uppercase tracking-wide text-ink">Choose or drop a CSV file</span>
          <span className="text-muted text-xs">.csv up to a few MB</span>
        </label>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="bg-panel border border-signal/30 rounded-card p-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-wider text-signal mb-3 flex items-center gap-1.5">
          <AlertTriangle size={12} /> Danger zone
        </p>
        <h3 className="font-display text-xl mb-2">Reset all teams</h3>
        <p className="text-sm text-ink/75 mb-4 leading-relaxed">
          Clears every generated team and un-assigns all participants, without deleting the roster itself.
          Useful before re-running the optimizer with a different team size.
        </p>
        <button
          onClick={onResetTeams}
          className="border border-signal text-signal px-5 py-2.5 rounded-card font-mono text-sm uppercase tracking-wide hover:bg-signal hover:text-paper transition-colors focus-ring"
        >
          Reset teams
        </button>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity                                                             */
/* ------------------------------------------------------------------ */

function ActivityTab({ auditLog }) {
  return (
    <div className="card-surface p-6">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-4">Recent activity</p>
      {auditLog.length === 0 && <p className="text-muted text-sm">No activity yet.</p>}
      <ul className="divide-y divide-line">
        {auditLog.map((entry, i) => (
          <motion.li
            key={entry.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.4) }}
            className="py-3 flex items-start justify-between gap-4"
          >
            <div>
              <p className="text-sm text-ink/85">{entry.detail || entry.action}</p>
              <p className="font-mono text-[11px] text-muted mt-0.5">{entry.action}</p>
            </div>
            <span className="font-mono text-[11px] text-muted whitespace-nowrap">
              {new Date(entry.created_at).toLocaleString()}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Change password (modal)                                             */
/* ------------------------------------------------------------------ */

function ChangePasswordControl() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.changePassword(current, next);
      toast.success("Password updated.");
      setOpen(false);
      setCurrent("");
      setNext("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost">
        <KeyRound size={14} /> Change password
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Account security"
        title="Change your password"
        icon={<Lock size={18} />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">Current password</span>
            <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className="block">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">New password (min 6 chars)</span>
            <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="text-muted text-xs font-mono hover:text-ink focus-ring">
              Cancel
            </button>
            <button type="submit" disabled={loading || !current || next.length < 6} className="btn-primary btn-shine">
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Organizer accounts (superadmin)                                     */
/* ------------------------------------------------------------------ */

function AdminUsersPanel({ admins, selfId, onChange }) {
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", display_name: "", role: "admin" });
  const [creating, setCreating] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createAdmin(form);
      toast.success(`Admin '${form.username}' created.`);
      setForm({ username: "", password: "", display_name: "", role: "admin" });
      setCreateOpen(false);
      onChange();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(a) {
    try {
      await api.updateAdmin(a.id, { is_active: !a.is_active });
      onChange();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRoleChange(a, role) {
    try {
      await api.updateAdmin(a.id, { role });
      onChange();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(a) {
    if (!window.confirm(`Delete admin account '${a.username}'? This can't be undone.`)) return;
    try {
      await api.deleteAdmin(a.id);
      toast.success(`Deleted '${a.username}'.`);
      onChange();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="card-surface p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
          Organizer accounts <span className="text-moss">(superadmin)</span>
        </p>
        <button onClick={() => setCreateOpen(true)} className="btn-primary btn-shine">
          <UserPlus2 size={14} /> New admin
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-muted border-b border-line">
              <th className="py-2 pr-4">Username</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Last login</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {admins.map((a) => (
                <motion.tr
                  key={a.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-line/60"
                >
                  <td className="py-2.5 pr-4 font-mono">{a.username}{a.id === selfId && " (you)"}</td>
                  <td className="py-2.5 pr-4">
                    <select
                      className="input py-1 px-2 text-xs"
                      value={a.role}
                      onChange={(e) => handleRoleChange(a, e.target.value)}
                      disabled={a.id === selfId}
                    >
                      <option value="admin">admin</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                  </td>
                  <td className="py-2.5 pr-4">
                    <button
                      onClick={() => handleToggleActive(a)}
                      disabled={a.id === selfId}
                      className={`font-mono text-[11px] px-2 py-1 rounded-full border transition-colors ${
                        a.is_active ? "border-moss text-moss" : "border-signal text-signal"
                      } disabled:opacity-40`}
                    >
                      {a.is_active ? "active" : "disabled"}
                    </button>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted">
                    {a.last_login_at ? new Date(a.last_login_at).toLocaleString() : "never"}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(a)}
                      disabled={a.id === selfId}
                      className="text-muted hover:text-signal text-xs font-mono transition-colors focus-ring disabled:opacity-30 inline-flex items-center gap-1"
                    >
                      <Trash2 size={12} /> delete
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        eyebrow="Organizer accounts"
        title="Create a new admin"
        icon={<ShieldPlus size={18} />}
        width="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">Username</span>
              <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </label>
            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">Display name</span>
              <input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">Password</span>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </label>
            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">Role</span>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setCreateOpen(false)} className="text-muted text-xs font-mono hover:text-ink focus-ring">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary btn-shine">
              {creating ? "Adding…" : "Add admin"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
