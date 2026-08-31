import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles, Users, Wand2 } from "lucide-react";
import { api } from "../api/client";
import TagInput from "../components/TagInput";

// These are only *starting suggestions* -- every field below also accepts
// a fully custom, user-typed value via TagInput (skills/domains) or the
// "Other" role option (preferred_role).
const SKILL_OPTIONS = [
  "Python", "Machine Learning", "Computer Vision", "NLP", "React", "TypeScript",
  "JavaScript", "UI/UX", "Figma", "Backend", "FastAPI", "SQL", "Cloud", "AWS",
  "DevOps", "Data Science", "Product Management", "Node", "Blockchain",
  "Cybersecurity", "Video Editing", "Prompt Engineering", "Public Speaking",
  "Marketing",
];
const DOMAIN_OPTIONS = [
  "Healthcare", "FinTech", "Education", "Climate Technology", "Gaming",
  "Robotics", "AI for Agriculture", "Web Development", "Accessibility",
];
const ROLE_OPTIONS = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "ML Engineer", "Data Scientist", "UI/UX Designer", "Product Designer",
  "DevOps Engineer", "Mobile Developer", "Cybersecurity", "Product Manager",
  "Researcher", "Marketing", "Content", "Business", "Other",
];
const EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const AVAILABILITY_OPTIONS = ["Full-time", "Part-time", "Evenings"];

const initialForm = {
  name: "",
  email: "",
  skills: [],
  domains: [],
  preferred_role: "",
  custom_role: "",
  experience_level: "Intermediate",
  working_style: "",
  availability: "Full-time",
  bio: "",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || form.skills.length === 0) {
      setStatus({ state: "error", message: "Name, email, and at least one skill are required." });
      return;
    }
    if (form.preferred_role === "Other" && !form.custom_role.trim()) {
      setStatus({ state: "error", message: "Tell us your role, or pick one from the list." });
      return;
    }
    setStatus({ state: "loading", message: "" });
    const { custom_role, ...rest } = form;
    const payload = {
      ...rest,
      preferred_role: form.preferred_role === "Other" ? custom_role.trim() : form.preferred_role,
    };
    try {
      await api.createParticipant(payload);
      setStatus({ state: "success", message: `${form.name} is registered.` });
      setForm(initialForm);
    } catch (err) {
      setStatus({ state: "error", message: err.message });
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Decorative backdrop */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-[420px] grid-backdrop opacity-70" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-moss/10 blur-3xl animate-float-slow" />
        <div className="absolute top-40 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl animate-float" />
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-16 pb-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <p className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-moss mb-4 border border-moss/30 bg-moss/5 px-3 py-1.5 rounded-full">
            <Sparkles size={12} /> Step 01 — Registration
          </p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight">
            Tell us who you are,
            <br />
            we'll find <span className="text-gradient">who you need.</span>
          </h1>
          <p className="text-muted mt-5 max-w-xl leading-relaxed">
            Your profile feeds the matching engine directly — skills, interests and bio
            become the raw material the optimizer uses to build balanced teams.
          </p>

          <div className="flex flex-wrap gap-4 mt-6">
            <MiniStat icon={<Users size={14} />} label="Live roster matching" />
            <MiniStat icon={<Wand2 size={14} />} label="AI-scored team fit" />
          </div>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          variants={container}
          initial="hidden"
          animate="show"
          className="card-surface p-8 space-y-8"
        >
          <motion.div variants={item} className="grid md:grid-cols-2 gap-6">
            <Field label="Full name">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ada Lovelace"
              />
            </Field>
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ada@example.com"
              />
            </Field>
          </motion.div>

          <motion.div variants={item}>
            <Field label="Technical skills" hint="Pick a suggestion or type your own — no limit.">
              <TagInput
                values={form.skills}
                onChange={(skills) => setForm({ ...form, skills })}
                suggestions={SKILL_OPTIONS}
                placeholder='e.g. "Drone Programming" — type and press Enter'
                tone="moss"
              />
            </Field>
          </motion.div>

          <motion.div variants={item}>
            <Field label="Interests / domains" hint="Anything you're excited to build in.">
              <TagInput
                values={form.domains}
                onChange={(domains) => setForm({ ...form, domains })}
                suggestions={DOMAIN_OPTIONS}
                placeholder='e.g. "Climate Technology" — type and press Enter'
                tone="gold"
              />
            </Field>
          </motion.div>

          <motion.div variants={item} className="grid md:grid-cols-3 gap-6">
            <Field label="Preferred role">
              <select
                className="input"
                value={form.preferred_role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    preferred_role: e.target.value,
                    custom_role: e.target.value === "Other" ? form.custom_role : "",
                  })
                }
              >
                <option value="">Select role</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {form.preferred_role === "Other" && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="input mt-2"
                  value={form.custom_role}
                  onChange={(e) => setForm({ ...form, custom_role: e.target.value })}
                  placeholder="Type your role, e.g. Hardware Engineer"
                />
              )}
            </Field>
            <Field label="Experience level">
              <select
                className="input"
                value={form.experience_level}
                onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
              >
                {EXPERIENCE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Availability">
              <select
                className="input"
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value })}
              >
                {AVAILABILITY_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </motion.div>

          <motion.div variants={item}>
            <Field label="Working style">
              <input
                className="input"
                value={form.working_style}
                onChange={(e) => setForm({ ...form, working_style: e.target.value })}
                placeholder="e.g. Morning person, likes daily check-ins"
              />
            </Field>
          </motion.div>

          <motion.div variants={item}>
            <Field label="Short bio">
              <textarea
                className="input min-h-[96px] resize-none"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="What do you like building? What kind of teammate are you?"
              />
            </Field>
          </motion.div>

          <motion.div variants={item} className="flex items-center justify-between pt-2 flex-wrap gap-4">
            <button
              type="submit"
              disabled={status.state === "loading"}
              className="btn-primary btn-shine"
            >
              {status.state === "loading" ? (
                <span className="flex items-center gap-2">
                  Saving
                  <span className="dot-pulse"><span /><span /><span /></span>
                </span>
              ) : (
                <>
                  Register <ArrowRight size={15} />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate("/roster")}
              className="text-muted text-sm hover:text-ink transition-colors focus-ring underline-draw"
            >
              View roster →
            </button>
          </motion.div>

          {status.state === "error" && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-signal text-sm font-mono bg-signal/5 border border-signal/20 rounded-card px-4 py-2.5"
            >
              {status.message}
            </motion.p>
          )}
          {status.state === "success" && (
            <motion.p
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-moss text-sm font-mono bg-moss/5 border border-moss/20 rounded-card px-4 py-2.5"
            >
              <CheckCircle2 size={15} /> {status.message}
            </motion.p>
          )}
        </motion.form>
      </div>
    </div>
  );
}

function MiniStat({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted font-mono text-[11px] uppercase tracking-wide border border-line bg-panel/60 px-3 py-1.5 rounded-full">
      <span className="text-moss">{icon}</span>
      {label}
    </span>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[12px] text-muted/80 mt-1.5">{hint}</span>}
    </label>
  );
}
