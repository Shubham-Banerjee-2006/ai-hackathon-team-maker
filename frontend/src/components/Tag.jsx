export default function Tag({ children, tone = "default" }) {
  const tones = {
    default: "bg-ink/5 text-ink border-line hover:bg-ink/10",
    moss: "bg-moss/10 text-moss border-moss/30 hover:bg-moss/20",
    gold: "bg-gold/10 text-gold-500 border-gold/30 hover:bg-gold/20",
    signal: "bg-signal/10 text-signal border-signal/30 hover:bg-signal/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[12px] font-mono transition-colors duration-200 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
