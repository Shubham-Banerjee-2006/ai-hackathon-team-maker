import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-28 text-center relative overflow-hidden">
      <div className="absolute inset-0 -z-10 grid-backdrop opacity-60" />
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-moss to-gold flex items-center justify-center text-paper shadow-glow animate-float"
      >
        <Compass size={30} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="font-mono text-[12px] uppercase tracking-wider text-moss mb-2"
      >
        404 — Off the map
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="font-display text-4xl tracking-tight mb-4"
      >
        This page doesn't exist.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="text-muted mb-8"
      >
        Double-check the URL, or head back to registration.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
        <Link to="/" className="btn-primary btn-shine inline-flex">
          <ArrowLeft size={15} /> Back home
        </Link>
      </motion.div>
    </div>
  );
}
