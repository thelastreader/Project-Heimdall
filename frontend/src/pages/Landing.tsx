import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowDown, ArrowRight, FileCheck2, HeartPulse, Menu, ScanLine, ShieldCheck, Stethoscope, X } from 'lucide-react';

const steps = [
  { icon: ScanLine, n: '01', title: 'Add a chest X-ray', body: 'Choose a supported chest image and enter the patient context used by the current screening workflow.' },
  { icon: Activity, n: '02', title: 'Run the screening model', body: 'The application sends the image to its existing inference service and records the returned model output.' },
  { icon: FileCheck2, n: '03', title: 'Review the result', body: 'See the screening summary, return to previous scans, and generate a report for clinical review.' },
];

const features = [
  { icon: ScanLine, title: 'A considered scan workflow', body: 'A guided upload and patient-context flow built around the project’s existing chest X-ray screening process.' },
  { icon: FileCheck2, title: 'Reports when you need them', body: 'Generate a PDF report from persisted patient and scan information in the application.' },
  { icon: ShieldCheck, title: 'Private account history', body: 'Review scans associated with your account. Authorized administrators can inspect the broader testing history.' },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuToggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [menuOpen]);

  return <div className="landing-shell">
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link to="/" className="brand-lockup" aria-label="TB Detect home" onClick={closeMenu}>
          <span className="brand-mark"><HeartPulse size={20} /></span><span><strong>TB Detect</strong><small>AI-assisted screening</small></span>
        </Link>
        <button ref={menuToggleRef} className="landing-menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <nav className={`landing-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <a href="#home" onClick={closeMenu}>Home</a><a href="#about" onClick={closeMenu}>About</a><a href="#how-it-works" onClick={closeMenu}>How it works</a><a href="#responsible-use" onClick={closeMenu}>Responsible use</a>
          <div className="landing-nav-actions"><Link to="/login" className="landing-login" onClick={closeMenu}>Log in</Link><Link to="/register" className="btn btn-primary landing-signup" onClick={closeMenu}>Create account <ArrowRight size={15} /></Link></div>
        </nav>
      </div>
    </header>

    <main>
      <section id="home" className="landing-hero">
        <div className="landing-hero-grid" />
        <div className="landing-hero-inner">
          <div className="landing-copy animate-fadeUp">
            <div className="eyebrow"><span className="eyebrow-dot" /> RESPIRATORY SCREENING WORKSPACE</div>
            <h1>Earlier insight.<br /><span>More thoughtful care.</span></h1>
            <p className="landing-lede">An AI-assisted tuberculosis screening tool that brings chest X-ray analysis, patient context, and scan history into one considered workflow.</p>
            <div className="landing-actions">
              <Link to="/login" className="btn btn-primary landing-cta">Let's check your health <ArrowRight size={17} /></Link>
              <a className="landing-secondary" href="#how-it-works"><span className="play-dot"><ArrowDown size={15} /></span> See how it works</a>
            </div>
            <div className="landing-assurance"><ShieldCheck size={16} /><span>For research and educational screening workflows</span></div>
          </div>

          <div className="visual-stage animate-fadeUp delay-2" aria-label="Illustrative medical imaging workflow graphic">
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
            <div className="visual-panel">
              <div className="visual-panel-top"><span className="visual-brand-dot"><HeartPulse size={14} /></span><span>SCREENING WORKFLOW</span><span className="visual-status"><i /> READY</span></div>
              <div className="visual-illustration">
                <div className="visual-crosshair crosshair-a" /><div className="visual-crosshair crosshair-b" />
                <div className="scan-ring ring-a" /><div className="scan-ring ring-b" /><div className="scan-ring ring-c" />
                <div className="scan-core"><Activity size={35} strokeWidth={1.3} /></div>
                <div className="scan-axis axis-x" /><div className="scan-axis axis-y" />
                <span className="scan-coordinate coord-a">01 / IMAGE</span><span className="scan-coordinate coord-b">AI ASSIST</span>
              </div>
              <div className="visual-panel-bottom"><span><i className="legend-blue" /> Imaging input</span><span><i className="legend-teal" /> Model review</span></div>
            </div>
            <div className="visual-caption"><span className="caption-icon"><Stethoscope size={15} /></span><span><strong>Built for careful review</strong><small>Illustrative interface graphic · not a patient image</small></span></div>
            <div className="visual-spark spark-a" /><div className="visual-spark spark-b" />
          </div>
        </div>
        <div className="hero-bottom-rule"><span>SCREENING · REVIEW · FOLLOW-UP</span><span>SCROLL TO EXPLORE ↓</span></div>
      </section>

      <section id="about" className="landing-about section-wrap">
        <div className="section-kicker">A CLEARER WORKFLOW</div>
        <div className="about-grid"><h2>Technology that supports<br /><span>the people behind care.</span></h2><div><p>TB Detect is an AI-assisted screening and research application for exploring chest X-ray findings alongside relevant patient information.</p><p>It keeps the process legible—from image upload through model output and report review—while leaving clinical interpretation where it belongs: with qualified professionals.</p></div></div>
        <div className="about-note"><span className="about-note-icon"><HeartPulse size={19} /></span><span><strong>Designed for responsible use</strong><small>Screening support, presented with context and care.</small></span><span className="note-mark">TB<span>·</span></span></div>
      </section>

      <section id="how-it-works" className="landing-process">
        <div className="section-wrap">
          <div className="section-kicker">THREE SIMPLE STEPS</div><div className="section-heading-row"><h2>From image to<br /><span>informed review.</span></h2><p>A guided experience that follows the application’s existing scan-analysis process.</p></div>
          <div className="process-grid">{steps.map(step => <article className="process-item" key={step.n}><div className="process-meta"><span>{step.n}</span><step.icon size={20} /></div><h3>{step.title}</h3><p>{step.body}</p><div className="process-line" /></article>)}</div>
        </div>
      </section>

      <section className="landing-features section-wrap">
        <div className="section-kicker">ONE CONNECTED WORKSPACE</div><div className="section-heading-row"><h2>Every step,<br /><span>in one place.</span></h2><p>Practical tools for the screening workflow—without overstating what the model can tell you.</p></div>
        <div className="feature-grid">{features.map((feature, i) => <article className="feature-item" key={feature.title}><div className={`feature-icon feature-tone-${i}`}><feature.icon size={20} /></div><h3>{feature.title}</h3><p>{feature.body}</p><span className="feature-index">0{i + 1}</span></article>)}</div>
      </section>

      <section id="responsible-use" className="responsible-section">
        <div className="section-wrap responsible-inner"><div className="responsible-icon"><ShieldCheck size={22} /></div><div><div className="section-kicker">RESPONSIBLE USE</div><h2>Screening insight is<br /><span>one part of the picture.</span></h2><p>AI-generated outputs are not a diagnosis. This research and educational prototype has not been clinically validated. Results require appropriate interpretation by a qualified healthcare professional and should not guide care on their own.</p></div><div className="responsible-aside"><span>01</span><p>AI-assisted<br />screening output</p><div /></div></div>
      </section>

      <section className="landing-final-cta"><div className="final-cta-pattern" /><div className="section-kicker">BEGIN WITH CARE</div><h2>Ready to explore<br /><span>the screening workflow?</span></h2><p>Sign in to continue to your private workspace.</p><Link to="/login" className="btn btn-primary landing-cta">Let's check your health <ArrowRight size={17} /></Link></section>
    </main>

    <footer id="contact" className="landing-footer"><div className="footer-main"><Link to="/" className="brand-lockup"><span className="brand-mark"><HeartPulse size={18} /></span><span><strong>TB Detect</strong><small>AI-assisted screening</small></span></Link><p>Research and education, supported by thoughtful technology.</p><nav aria-label="Footer navigation"><a href="#about">About</a><a href="#how-it-works">How it works</a><a href="#responsible-use">Responsible use</a><Link to="/login">Log in</Link></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} TB Detect</span><span className="team-credit">Made with love by Jatin, Khyati, Arjun, Ujjwal</span><span>For research use · Not a diagnostic device</span></div></footer>
  </div>;
}
