import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>

      {/* ── MINIMAL NAV ── */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--social-bg)',
        backdropFilter: 'blur(14px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.55rem',
          fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-h)',
        }}>
          <Calendar size={28} color="var(--accent)" />
          Hopin
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
      }}>
        {/* Gradient orb */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -60%)',
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(170,59,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ scale: 1.06, boxShadow: '0 20px 40px rgba(170,59,255,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="btn btn-primary"
            style={{
              fontSize: '1.1rem',
              paddingInline: '2.5rem',
              paddingBlock: '1rem',
              borderRadius: 'var(--radius-lg)',
              gap: '0.5rem',
            }}
          >
            Get Started <ArrowRight size={18} />
          </motion.button>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '1.25rem 2rem',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        fontSize: '0.82rem',
        color: 'var(--text)',
      }}>
        © {new Date().getFullYear()} Hopin · All rights reserved
      </footer>
    </div>
  );
}
