import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Download, PencilLine, Search, Trash2, UserPlus, Users2 } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import Tag from "../components/Tag";
import { SkeletonGrid } from "../components/Skeleton";
import AnimatedNumber from "../components/AnimatedNumber";

export default function Roster() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const toast = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search/filter changes so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, unassignedOnly]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listParticipants({
        search: search || undefined,
        unassigned_only: unassignedOnly || undefined,
      });
      setParticipants(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!isAdmin) {
      toast.error("Admin login required to remove participants.");
      return;
    }
    try {
      await api.deleteParticipant(id);
      setParticipants((prev) => prev.filter((p) => p.id !== id));
      toast.success(`${name} removed.`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSaveEdit(id, patch) {
    try {
      const updated = await api.updateParticipant(id, patch);
      setParticipants((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
      toast.success("Updated.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleExport() {
    try {
      await api.exportParticipantsCsv();
      toast.success("Roster exported.");
    } catch (err) {
      toast.error(err.message);
    }
  }

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
            <Users2 size={12} /> Step 02 — Roster
          </p>
          <h1 className="font-display text-4xl tracking-tight">
            <AnimatedNumber value={participants.length} /> registered
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-ghost">
            <Download size={14} /> Export CSV
          </button>
          <Link to="/teams" className="btn-primary btn-shine">
            Generate teams →
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex flex-wrap items-center gap-4 mb-8"
      >
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-wide text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={unassignedOnly}
            onChange={(e) => setUnassignedOnly(e.target.checked)}
            className="accent-moss"
          />
          Unassigned only
        </label>
        {!isAdmin && (
          <span className="font-mono text-[11px] text-muted ml-auto">
            Log in as an organizer to edit or remove entries.
          </span>
        )}
      </motion.div>

      {loading && <SkeletonGrid count={4} />}

      {!loading && participants.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-dashed border-line rounded-card p-14 text-center text-muted"
        >
          <UserPlus className="mx-auto mb-3 text-line" size={28} />
          {search || unassignedOnly ? (
            "No one matches these filters."
          ) : (
            <>
              No one's registered yet.{" "}
              <Link to="/" className="text-moss underline-draw">Add the first participant</Link>.
            </>
          )}
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <AnimatePresence>
          {participants.map((p, i) =>
            editingId === p.id ? (
              <EditParticipantCard
                key={p.id}
                participant={p}
                onCancel={() => setEditingId(null)}
                onSave={(patch) => handleSaveEdit(p.id, patch)}
              />
            ) : (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
                className="card-surface card-surface-hover p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl">{p.name}</h3>
                    <p className="text-muted text-sm font-mono">{p.email}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingId(p.id)}
                        className="text-muted hover:text-moss text-xs font-mono transition-colors focus-ring flex items-center gap-1"
                      >
                        <PencilLine size={12} /> edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="text-muted hover:text-signal text-xs font-mono transition-colors focus-ring flex items-center gap-1"
                        aria-label={`Remove ${p.name}`}
                      >
                        <Trash2 size={12} /> remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.skills.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                  {p.domains.map((d) => (
                    <Tag key={d} tone="gold">{d}</Tag>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[13px] font-mono text-muted">
                  <span>Role: {p.preferred_role || "—"}</span>
                  <span>Level: {p.experience_level}</span>
                  <span>Avail: {p.availability}</span>
                  <span>
                    Team:{" "}
                    {p.team_id ? (
                      <span className="text-moss">#{p.team_id}</span>
                    ) : (
                      "unassigned"
                    )}
                  </span>
                </div>

                {p.bio && <p className="mt-4 text-sm text-ink/80 leading-relaxed">{p.bio}</p>}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EditParticipantCard({ participant, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: participant.name,
    email: participant.email,
    preferred_role: participant.preferred_role,
    experience_level: participant.experience_level,
    availability: participant.availability,
    bio: participant.bio,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-panel border-2 border-moss rounded-card p-6 shadow-glow"
    >
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
        <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input className="input" value={form.preferred_role} onChange={(e) => setForm({ ...form, preferred_role: e.target.value })} placeholder="Role" />
        <input className="input" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="Availability" />
      </div>
      <textarea className="input min-h-[72px] resize-none mb-3" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" />
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="text-muted text-xs font-mono hover:text-ink focus-ring">Cancel</button>
        <button
          onClick={() => onSave(form)}
          className="bg-moss text-paper px-4 py-2 rounded-card font-mono text-xs uppercase tracking-wide hover:bg-ink transition-colors focus-ring"
        >
          Save changes
        </button>
      </div>
    </motion.div>
  );
}
