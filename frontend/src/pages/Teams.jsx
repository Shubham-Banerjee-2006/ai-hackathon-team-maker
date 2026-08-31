import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, RotateCcw, Sparkles, Users, Wand2 } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import ScoreMeter from "../components/ScoreMeter";
import { SkeletonGrid } from "../components/Skeleton";

const TEAM_SIZE_OPTIONS = [3, 4, 5, 6];

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [participantCount, setParticipantCount] = useState(null);
  const [mode, setMode] = useState("size"); // "size" | "count"
  const [teamSize, setTeamSize] = useState(4);
  const [numberOfTeams, setNumberOfTeams] = useState(2);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [initialLoad, setInitialLoad] = useState(true);
  const toast = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadExisting();
    api.listParticipants().then((data) => setParticipantCount(data.length)).catch(() => {});
  }, []);

  async function loadExisting() {
    try {
      const data = await api.listTeams();
      if (data.length) setTeams(data);
    } catch (_) {
      /* ignore on first load */
    } finally {
      setInitialLoad(false);
    }
  }

  // The backend's /teams/generate endpoint only accepts a fixed team_size.
  // "Number of teams" mode computes the equivalent size client-side so the
  // organizer can plan around a target team count (e.g. "I need exactly 2
  // teams") without any backend changes.
  const effectiveTeamSize = useMemo(() => {
    if (mode === "size") return teamSize;
    if (!participantCount || numberOfTeams < 1) return teamSize;
    return Math.max(1, Math.ceil(participantCount / numberOfTeams));
  }, [mode, teamSize, numberOfTeams, participantCount]);

  const estimatedTeams = useMemo(() => {
    if (!participantCount || !effectiveTeamSize) return null;
    return Math.max(1, Math.round(participantCount / effectiveTeamSize));
  }, [participantCount, effectiveTeamSize]);

  async function handleGenerate() {
    if (!isAdmin) {
      toast.error("Admin login required to generate teams.");
      return;
    }
    setStatus({ state: "loading", message: "" });
    try {
      const data = await api.generateTeams(effectiveTeamSize);
      setTeams(data);
      setStatus({ state: "idle", message: "" });
      toast.success(`Generated ${data.length} team${data.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setStatus({ state: "error", message: err.message });
    }
  }

  async function handleReset() {
    if (!isAdmin) {
      toast.error("Admin login required to reset teams.");
      return;
    }
    if (!window.confirm("Clear all generated teams?")) return;
    try {
      await api.resetTeams();
      setTeams([]);
      toast.success("Teams cleared.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleExport() {
    try {
      await api.exportTeamsCsv();
      toast.success("Teams exported.");
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
        className="flex items-start justify-between mb-8 flex-wrap gap-8"
      >
        <div className="max-w-lg">
          <p className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-moss mb-2 border border-moss/30 bg-moss/5 px-3 py-1.5 rounded-full">
            <Wand2 size={12} /> Step 03 — Optimizer
          </p>
          <h1 className="font-display text-4xl tracking-tight">Run the matcher.</h1>
          <p className="text-muted mt-2 leading-relaxed">
            The optimizer evaluates thousands of candidate groupings and
            settles on the split with the best skill coverage, complementarity,
            and shared interest.
          </p>
          {participantCount !== null && (
            <p className="font-mono text-[12px] text-muted mt-3 flex items-center gap-1.5">
              <Users size={12} /> {participantCount} participant{participantCount === 1 ? "" : "s"} registered
            </p>
          )}
        </div>

        <div className="card-surface p-5 w-full sm:w-auto min-w-[300px]">
          <div className="segmented mb-4 w-full">
            <button
              type="button"
              onClick={() => setMode("size")}
              className={`flex-1 relative ${mode === "size" ? "active" : ""}`}
            >
              {mode === "size" && (
                <motion.span layoutId="mode-pill" className="absolute inset-0 bg-ink rounded-[9px] -z-10" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              Team size
            </button>
            <button
              type="button"
              onClick={() => setMode("count")}
              className={`flex-1 relative ${mode === "count" ? "active" : ""}`}
            >
              {mode === "count" && (
                <motion.span layoutId="mode-pill" className="absolute inset-0 bg-ink rounded-[9px] -z-10" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              Number of teams
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === "size" ? (
              <motion.label
                key="size"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="block mb-4"
              >
                <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
                  People per team
                </span>
                <select
                  className="input"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                >
                  {TEAM_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} people</option>
                  ))}
                </select>
              </motion.label>
            ) : (
              <motion.label
                key="count"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="block mb-4"
              >
                <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
                  Number of teams to create
                </span>
                <select
                  className="input"
                  value={numberOfTeams}
                  onChange={(e) => setNumberOfTeams(Number(e.target.value))}
                >
                  {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>{n} teams</option>
                  ))}
                </select>
                {participantCount !== null && (
                  <p className="font-mono text-[11px] text-muted mt-2">
                    ≈ {effectiveTeamSize} people per team
                    {estimatedTeams ? ` · about ${estimatedTeams} team${estimatedTeams === 1 ? "" : "s"} formed` : ""}
                  </p>
                )}
              </motion.label>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleGenerate}
              disabled={status.state === "loading"}
              className="btn-primary btn-shine flex-1"
            >
              {status.state === "loading" ? (
                <span className="flex items-center gap-2">
                  Optimizing
                  <span className="dot-pulse"><span /><span /><span /></span>
                </span>
              ) : (
                <>
                  <Sparkles size={14} /> Generate teams
                </>
              )}
            </button>
            {teams.length > 0 && (
              <button onClick={handleExport} className="btn-ghost">
                <Download size={14} />
              </button>
            )}
            {teams.length > 0 && isAdmin && (
              <button
                onClick={handleReset}
                className="border border-signal text-signal px-4 py-3 rounded-card font-mono text-sm uppercase tracking-wide hover:bg-signal hover:text-paper transition-colors focus-ring"
                aria-label="Reset teams"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          {!isAdmin && (
            <p className="font-mono text-[11px] text-muted mt-3">
              Log in as an organizer to generate or reset teams.
            </p>
          )}
        </div>
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

      {initialLoad && <SkeletonGrid count={4} />}

      {!initialLoad && teams.length === 0 && status.state !== "loading" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-dashed border-line rounded-card p-14 text-center text-muted"
        >
          <Wand2 className="mx-auto mb-3 text-line" size={28} />
          No teams generated yet. Register enough participants, then hit "Generate teams."
        </motion.div>
      )}

      {status.state === "loading" && (
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card-surface p-7 h-64 relative overflow-hidden">
              <div className="skeleton absolute inset-0 opacity-40" />
              <div className="relative flex flex-col items-center justify-center h-full gap-3 text-muted">
                <Sparkles className="animate-spin-slow text-moss" size={22} />
                <span className="font-mono text-[12px] uppercase tracking-wide">Optimizing team {i + 1}…</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <AnimatePresence>
          {status.state !== "loading" &&
            teams.map((team, idx) => <TeamCard key={team.id} team={team} index={idx + 1} delay={idx * 0.08} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TeamCard({ team, index, delay = 0 }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="card-surface card-surface-hover p-7"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[11px] uppercase tracking-wider text-gold-500 bg-gold/10 border border-gold/25 px-2.5 py-1 rounded-full">
          Team {String(index).padStart(2, "0")}
        </span>
        <span className="text-muted text-xs font-mono">{team.members.length} members</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {team.members.map((m) => (
          <span key={m.id} className="font-display text-lg">
            {m.name}
            {m !== team.members[team.members.length - 1] && (
              <span className="text-line mx-1.5">·</span>
            )}
          </span>
        ))}
      </div>

      <div className="space-y-3 mb-5">
        <ScoreMeter label="Skill coverage" value={team.skill_coverage_score} accent="moss" delay={delay * 1000} />
        <ScoreMeter label="Compatibility" value={team.compatibility_score} accent="gold" delay={delay * 1000 + 100} />
      </div>

      <p className="text-sm leading-relaxed text-ink/85 mb-4">{team.explanation}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-moss mb-1.5">Strengths</p>
          <ul className="space-y-1">
            {team.strengths.map((s, i) => (
              <li key={i} className="text-[13px] text-ink/75 leading-snug">• {s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-signal mb-1.5">Watch for</p>
          <ul className="space-y-1">
            {team.weaknesses.map((w, i) => (
              <li key={i} className="text-[13px] text-ink/75 leading-snug">• {w}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
          Suggested project
        </p>
        <p className="text-sm leading-relaxed text-ink/85">{team.suggested_project}</p>
      </div>
    </motion.div>
  );
}
