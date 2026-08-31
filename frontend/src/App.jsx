import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import NavBar from "./components/NavBar";
import ErrorBoundary from "./components/ErrorBoundary";
import PageTransition from "./components/PageTransition";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import Register from "./pages/Register";
import Roster from "./pages/Roster";
import Teams from "./pages/Teams";
import FindTeammates from "./pages/FindTeammates";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/roster" element={<PageTransition><Roster /></PageTransition>} />
        <Route path="/teams" element={<PageTransition><Teams /></PageTransition>} />
        <Route path="/find-teammates" element={<PageTransition><FindTeammates /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen flex flex-col">
          <NavBar />
          <ErrorBoundary>
            <div className="flex-1">
              <AnimatedRoutes />
            </div>
          </ErrorBoundary>
          <footer className="max-w-6xl mx-auto px-6 py-10 mt-10 border-t border-line text-muted text-xs font-mono w-full text-center sm:text-left">
            AI Hackathon Team Maker — NLP embeddings · skill-complementarity scoring · team optimizer · AI explanations · admin login
          </footer>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
