import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, HeartPulse, ScanLine, ShieldCheck } from 'lucide-react';

export default function AuthFrame({ children, mode }: { children: ReactNode; mode: 'login' | 'register' }) {
  return <main className="auth-shell">
    <div className="auth-topbar"><Link to="/" className="brand-lockup"><span className="brand-mark"><HeartPulse size={20} /></span><span><strong>TB Detect</strong><small>AI-assisted screening</small></span></Link><Link to="/" className="auth-back"><ArrowLeft size={15} /> Back to home</Link></div>
    <div className="auth-layout">
      <section className="auth-form-side">
        <div className="auth-form-card">
          <div className="auth-kicker">{mode === 'login' ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}</div>
          {children}
        </div>
        <p className="auth-legal"><ShieldCheck size={14} /> Your account and scan history are protected by server-managed sessions.</p>
      </section>
      <aside className="auth-aside" aria-label="TB Detect screening workspace">
        <div className="auth-aside-glow" /><div className="auth-aside-inner">
          <div className="aside-pulse"><Activity size={27} strokeWidth={1.5} /></div>
          <span className="aside-label">A THOUGHTFUL SCREENING WORKFLOW</span>
          <h2>Clarity for every<br /><span>step in the review.</span></h2>
          <p>Bring scan upload, AI-assisted screening, and history together in a private workspace.</p>
          <div className="auth-aside-graphic"><div className="auth-grid" /><div className="auth-circle circle-1" /><div className="auth-circle circle-2" /><div className="auth-circle circle-3" /><ScanLine size={28} /></div>
          <div className="auth-aside-foot"><span>SCREENING SUPPORT</span><span>RESEARCH · EDUCATION</span></div>
        </div>
      </aside>
    </div>
    <footer className="auth-footer"><span>© {new Date().getFullYear()} TB Detect</span><span>AI screening is not a medical diagnosis.</span></footer>
  </main>;
}
