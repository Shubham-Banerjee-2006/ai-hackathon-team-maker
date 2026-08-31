import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, SearchCheck, UserSearch } from "lucide-react";
import { api } from "../api/client";
import ScoreMeter from "../components/ScoreMeter";
import Tag from "../components/Tag";
import { SkeletonGrid } from "../components/Skeleton";

export default function FindTeammates() {
  const [participants, setParticipants] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState({ state: "idle", message: "" });

  useEffect(() => {
    api.listParticipants().then(setParticipants).catch(() => {});
  }, []);

  async function handleFind() {
    if (!selectedId) return;
    setStatus({ state: "loading", message: "" });
    try {
      const data = await api.findTeammates(selectedId, 6);
      setMatches(data);
      setStatus({ state: "idle", message: "" });
    } catch (err) {
      setStatus({ state: "error", message: err.message });
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-moss mb-2 border border-moss/30 bg-moss/5 px-3 py-1.5 rounded-full">
          <Compass size={12} /> Individual lookup
        </p>
        <h1 className="font-display text-4xl tracking-tight mb-2">Find my teammates.</h1>
        <p className="text-muted mb-8 max-w-xl leading-relaxed">
          Pick yourself from the roster and see who ranks best against your
          skills, interests, and gaps — with a plain-language reason for each.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="card-surface p-5 flex flex-wrap items-end gap-3 mb-10"
      >
        <label className="block flex-1 min-w-[220px]">
          <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
            I am
          </span>
          <select
            className="input"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Select your name</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <button
          onClick={handleFind}
          disabled={!selectedId || status.state === "loading"}
          className="btn-primary btn-shine"
        >
          {status.state === "loading" ? (
            <span className="flex items-center gap-2">
              Searching
              <span className="dot-pulse"><span /><span /><span /></span>
            </span>
          ) : (
            <>
              <SearchCheck size={14} /> Find teammates
            </>
          )}
        </button>
      </motion.div>

      {status.state === "error" && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-signal font-mono text-sm mb-6 bg-signal/5 border border-signal/20 rounded-card px-4 py-2.5"
        >
          {status.message}
        </motion.p>
      )}

      {status.state === "loading" && <SkeletonGrid count={3} />}

      {!status.state === "loading" && matches.length === 0 && status.state === "idle" && selectedId === "" && (
        <div className="border border-dashed border-line rounded-card p-14 text-center text-muted">
          <UserSearch className="mx-auto mb-3 text-line" size={28} />
          Select your name above to see your best-matched teammates.
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence>
          {status.state !== "loading" &&
            matches.map((m, i) => (
              <motion.div
                key={m.participant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="card-surface card-surface-hover p-6 flex gap-5"
              >
                <span
                  className={`font-mono text-2xl font-semibold w-10 shrink-0 ${
                    i === 0 ? "text-gold-500" : "text-line"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-display text-xl">{m.participant.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.participant.skills.map((s) => <Tag key={s}>{s}</Tag>)}
                      </div>
                    </div>
                    <div className="w-40">
                      <ScoreMeter label="Match" value={m.compatibility_score} accent="gold" delay={i * 80} />
                    </div>
                  </div>
                  <p className="text-sm text-ink/80 mt-3 leading-relaxed">{m.reason}</p>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
