
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import './marketing.css';

type Theme = 'light' | 'dark';

const Arrow = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3.5 10h11M10.5 5.5 15 10l-4.5 4.5" strokeLinecap="square" /></svg>
);

const ThemeIcon = ({ dark }: { dark: boolean }) => dark ? (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v2.1M12 19.4v2.1M4.7 4.7l1.5 1.5M17.8 17.8l1.5 1.5M2.5 12h2.1M19.4 12h2.1M4.7 19.3l1.5-1.5M17.8 6.2l1.5-1.5" /></svg>
) : (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 15.2A8.2 8.2 0 0 1 8.8 4a8.1 8.1 0 1 0 11.2 11.2Z" /></svg>
);

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">{open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
);

const ActionButton = ({ children, onClick, variant = 'primary' }: { children: ReactNode; onClick: () => void; variant?: 'primary' | 'secondary' | 'dark' }) => (
  <button type="button" className={'bh-btn bh-btn-' + variant} onClick={onClick}>{children}</button>
);

const Eyebrow = ({ children }: { children: ReactNode }) => <p className="bh-eyebrow">{children}</p>;

const Icon = ({ type }: { type: 'folder' | 'table' | 'history' | 'alert' | 'roles' | 'mobile' }) => {
  const common = { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const;
  const icons: Record<string, ReactNode> = {
    folder: <><path d="M4 6.5h6l1.7 2H20v9.5H4z" /><path d="M4 9h16" /></>,
    table: <><rect x="4" y="5" width="16" height="14" rx="1" /><path d="M4 10h16M10 10v9M15 10v9" /></>,
    history: <><path d="M4.7 7.5A8 8 0 1 1 4 12" /><path d="M4.5 4v4h4" /><path d="M12 8v4l3 2" /></>,
    alert: <><path d="M12 4 21 19H3z" /><path d="M12 9v5M12 17.5v.2" /></>,
    roles: <><rect x="4" y="5" width="7" height="5" /><rect x="13" y="5" width="7" height="5" /><rect x="4" y="14" width="7" height="5" /><rect x="13" y="14" width="7" height="5" /></>,
    mobile: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M10 6h4M11 18h2" /></>,
  };
  return <svg {...common}>{icons[type]}</svg>;
};

const Tile = ({ n, title, text, wide, children }: { n: string; title: string; text: string; wide?: boolean; children: ReactNode }) => (
  <article className={'bh-tile bh-reveal' + (wide ? ' wide' : '')}>
    <div className="bh-tile-copy"><span className="bh-tile-index">{n}</span><h3>{title}</h3><p>{text}</p></div>
    <div className="bh-tile-ui">{children}</div>
  </article>
);

const MiniTable = ({ full = false }: { full?: boolean }) => (
  <div className="bh-scroll-x">
    <table className={full ? 'bh-full-table' : 'bh-mini-table'}>
      <thead><tr><th>Criterion</th><th>Anna Silva</th><th>Mohamed Rahman</th><th>Panel</th>{full && <th>Notes</th>}</tr></thead>
      <tbody>
        <tr><td><strong>Trade skill</strong></td><td>18 / 20</td><td>16 / 20</td><td><span className="bh-score best">34</span></td>{full && <td>Strong site exposure</td>}</tr>
        <tr><td><strong>Safety</strong></td><td>17 / 20</td><td>19 / 20</td><td><span className="bh-score best">36</span></td>{full && <td>Good permit knowledge</td>}</tr>
        <tr><td><strong>Site experience</strong></td><td>16 / 20</td><td>18 / 20</td><td>34</td>{full && <td>Overseas fit</td>}</tr>
      </tbody>
    </table>
  </div>
);

const PipelineVisual = () => {
  const [active, setActive] = useState(0);
  const names = ['Intake', 'Interview', 'Evaluation', 'Selection', 'Deployment'];
  const positions = [7, 27, 47, 67, 82];

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.marketing-site');
    const section = document.getElementById('workflow');
    if (!shell || !section) return;

    const update = () => {
      const rect = section.getBoundingClientRect();
      const viewport = shell.clientHeight;
      const start = viewport * 0.82;
      const end = -section.clientHeight * 0.18;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
      setActive(Math.min(names.length - 1, Math.floor(progress * names.length)));
    };

    shell.addEventListener('scroll', update, { passive: true });
    update();
    return () => shell.removeEventListener('scroll', update);
  }, []);

  return (
    <div className="bh-pipeline-visual bh-reveal">
      <div className="bh-stage-readout"><span>PIPELINE / <strong>CONSTRUCTION RECRUITMENT</strong></span><span>{String(active + 1).padStart(2, '0')} / 05</span></div>
      <div className="bh-pipeline-axis" />
      <div className="bh-pipeline-tick t1" /><div className="bh-pipeline-tick t2" /><div className="bh-pipeline-tick t3" /><div className="bh-pipeline-tick t4" /><div className="bh-pipeline-tick t5" />
      {names.map((name, index) => <div key={name} ref={(node) => { refs.current[index] = node; }} style={{ position: 'absolute', left: positions[index] + '%', top: 'calc(50% + 25px)', transform: 'translateX(-50%)', color: index === active ? 'var(--bh-orange)' : 'var(--bh-steel)', font: '600 0.52rem/1 var(--bh-font-mono)', textTransform: 'uppercase' }}>{name}</div>)}
      <div className="bh-moving-candidate" style={{ left: positions[active] + '%', transform: active === 0 ? 'translateX(0)' : active === positions.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }} aria-live="polite">
        <div className="row"><div><strong>Nimal Perera</strong><div className="meta">REG-20481 · Steel fixer</div></div><span className="bh-tag orange">{String(active + 1).padStart(2, '0')}</span></div>
        <div className="passport"><span>Passport N8••••32</span><span>14 NOV 2027</span></div>
        <div style={{ marginTop: 9, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="bh-ui-kicker">Current stage</span><strong style={{ color: 'var(--bh-orange)', fontSize: '0.68rem', fontFamily: 'var(--bh-font-mono)' }}>{names[active]}</strong></div>
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--bh-steel-2)', font: '600 0.52rem/1 var(--bh-font-mono)' }}><span>INTAKE → INTERVIEW → EVALUATION → SELECTION → DEPLOYMENT</span><span>SCROLL-SYNC</span></div>
    </div>
  );
};

export const MarketingSite = () => {
  const { language, setLanguage } = useLanguage();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileCta, setMobileCta] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem('buildhire-marketing-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const scrollTo = useCallback((id: string) => {
    setMenuOpen(false);
    window.history.pushState({}, '', '/#' + id);
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.marketingTheme = theme;
    window.localStorage.setItem('buildhire-marketing-theme', theme);
  }, [theme]);

  useEffect(() => {
    const path = window.location.pathname;
    const target = path === '/features' ? 'features' : path === '/security' ? 'security' : '';
    if (!target) return;
    const timer = window.setTimeout(() => {
      window.history.replaceState({}, '', '/#' + target);
      document.getElementById(target)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const onScroll = () => setMobileCta(shell.scrollTop > 430);
    shell.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => shell.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.bh-reveal'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12, rootMargin: '0px 0px -50px' });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const start = () => { setMenuOpen(false); window.history.pushState({}, '', '/login?mode=company-register'); window.dispatchEvent(new PopStateEvent('popstate')); };
  const login = () => { setMenuOpen(false); window.history.pushState({}, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate')); };

  return (
    <div ref={shellRef} className="marketing-site fixed inset-0 overflow-y-auto" data-theme={theme}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:bg-white focus:px-3 focus:py-2 focus:text-sm">Skip to content</a>

      <header className="bh-nav" aria-label="Primary navigation">
        <div className="bh-container-wide bh-nav-inner">
          <button type="button" className="bh-brand" onClick={() => scrollTo('top')} aria-label="BuildHire home"><span className="bh-brand-mark">B</span><span>BuildHire</span></button>
          <nav className="bh-nav-links" aria-label="Desktop navigation">
            <button className="bh-nav-link" type="button" onClick={() => scrollTo('features')}>Features</button>
            <button className="bh-nav-link" type="button" onClick={() => scrollTo('workflow')}>How it works</button>
            <button className="bh-nav-link" type="button" onClick={() => scrollTo('pricing')}>Pricing</button>
            <button className="bh-nav-link" type="button" onClick={() => scrollTo('faq')}>FAQ</button>
          </nav>
          <div className="bh-nav-actions">
            <button type="button" className="bh-theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme"><ThemeIcon dark={theme === 'light'} /></button>
            <select className="bh-lang-toggle" aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'he')}><option value="en">EN</option><option value="he">HE</option></select>
            <button type="button" className="bh-nav-action" onClick={login}>Login</button>
            <ActionButton onClick={start}>Start free trial <Arrow /></ActionButton>
          </div>
          <button type="button" className="bh-mobile-menu-btn" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="buildhire-mobile-menu" aria-label="Open navigation"><MenuIcon open={false} /></button>
        </div>
      </header>

      {menuOpen && (
        <>
          <button type="button" className="bh-menu-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />
          <aside id="buildhire-mobile-menu" className="bh-menu-panel" aria-label="Mobile navigation">
            <div className="bh-menu-panel-inner">
              <button type="button" className="bh-menu-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><MenuIcon open /></button>
              <div className="bh-menu-nav">
                <button type="button" onClick={() => scrollTo('features')}>Features</button><button type="button" onClick={() => scrollTo('workflow')}>How it works</button><button type="button" onClick={() => scrollTo('pricing')}>Pricing</button><button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
              </div>
              <div className="bh-menu-actions">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button" className="bh-btn bh-btn-secondary" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><ThemeIcon dark={theme === 'light'} /> Theme</button>
                  <label className="bh-btn bh-btn-secondary" style={{ position: 'relative' }}><span>{language === 'en' ? 'English' : 'עברית'}</span><select aria-label="Mobile language" value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'he')} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}><option value="en">English</option><option value="he">עברית</option></select></label>
                </div>
                <ActionButton onClick={login} variant="secondary">Login</ActionButton><ActionButton onClick={start}>Start free trial <Arrow /></ActionButton>
              </div>
            </div>
          </aside>
        </>
      )}

      <main id="main-content">
        <section id="top" className="bh-hero bh-grid">
          <div className="bh-container-wide bh-hero-grid">
            <div className="bh-hero-copy">
              <Eyebrow>Purpose-built for construction recruitment</Eyebrow>
              <h1 className="bh-title bh-hero-title">Replace spreadsheet chaos with one <span className="accent">hiring workspace.</span></h1>
              <p className="bh-hero-sub">BuildHire takes candidates from bulk intake to panel interview, comparison, selection and deployment—with passport data, trade requests and agency records kept in one place.</p>
              <div className="bh-hero-actions"><ActionButton onClick={start}>Start free trial <Arrow /></ActionButton><ActionButton onClick={() => scrollTo('workflow')} variant="secondary">See how it works</ActionButton></div>
              <div className="bh-trust-micro"><span>Agency register numbers</span><span>Passport expiry</span><span>Trade-based requests</span><span>Panel decisions</span></div>
            </div>

            <div className="bh-hero-visual bh-reveal">
              <div className="bh-product-frame">
                <div className="bh-window-bar"><div className="bh-window-dots" aria-hidden="true"><span /><span /><span /></div><span className="bh-window-name">Illustrative candidate workspace</span></div>
                <div className="bh-product-main">
                  <aside className="bh-product-sidebar" aria-hidden="true"><div className="label">Workspace</div><div className="bh-product-sidebar-item active">Candidates</div><div className="bh-product-sidebar-item">Jobs</div><div className="bh-product-sidebar-item">Interviews</div><div className="bh-product-sidebar-item">Criteria</div><div className="bh-product-sidebar-item">Reports</div></aside>
                  <div className="bh-product-content">
                    <div className="bh-ui-topline"><div><div className="bh-ui-kicker">Candidate profile / construction trade</div><div className="bh-ui-title">Candidate workspace</div></div><span className="bh-live-dot" aria-label="Active record" /></div>
                    <div className="bh-profile-grid">
                      <article className="bh-profile-card">
                        <div className="bh-profile-head"><div className="bh-avatar">NP</div><div><div className="bh-profile-name">Nimal Perera</div><div className="bh-profile-meta">Steel fixer · REG-20481 · Illustrative</div></div></div>
                        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}><span className="bh-tag orange">Panel interview</span><span className="bh-tag good">Documents ready</span></div>
                        <div className="bh-profile-fields">
                          {[
                            ['Birth date','18 Feb 1991'],['Agency','Atlas Manpower'],['Passport','N8••••32'],['Expiry','14 Nov 2027'],['Job','Doha Tower Fit-out'],['Requested profession','Steel fixer'],['Status','Shortlist review'],
                          ].map(([label,value]) => <div className="bh-field-meta" key={label}><span>{label}</span><strong>{value}</strong></div>)}
                        </div>
                      </article>
                      <article className="bh-comparison-card"><div className="bh-comparison-head"><div className="bh-ui-kicker">Panel comparison</div><div className="bh-ui-title">Same candidate, full picture</div></div><MiniTable /><div style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><span className="bh-tag warn">Passport expires 14 Nov 2027</span><span className="bh-score best">104 / 120</span></div></article>
                    </div>
                    <div className="bh-hero-dimensions"><span>role: PANELIST</span><span>view: DECISION</span><span>record: CONTROLLED</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bh-trust-strip"><div className="bh-container bh-trust-strip-grid"><div><div className="bh-eyebrow">Built for construction recruitment agencies</div><div className="bh-trust-title">The workflow is shaped around the records recruiters actually handle.</div></div><div className="bh-trade-list">Masonry · Electrical · Welding · Plumbing · Steel fixing · More construction trades</div></div></section>

        <section className="bh-section bh-problem" aria-labelledby="problem-title">
          <div className="bh-container">
            <div className="bh-section-head bh-reveal"><Eyebrow>Why BuildHire</Eyebrow><h2 id="problem-title" className="bh-title">Your hiring should not depend on who has the latest spreadsheet.</h2><p className="bh-body-lg">When candidate records sit across Excel, WhatsApp and email, every interview handoff creates another chance to miss context, duplicate work or lose the reason behind a decision.</p></div>
            <div className="bh-problem-grid">
              <article className="bh-before-after bh-reveal"><div className="bh-before-after-head"><span className="bh-mono" style={{ color: '#A8BAC8', fontSize: '0.62rem' }}>BEFORE</span><span className="bh-tag" style={{ color: '#A8BAC8', borderColor: 'rgba(244,241,234,0.15)' }}>Scattered</span></div><div className="bh-before-after-body"><div className="bh-chaos-stack"><div className="bh-chaos-row"><strong>Excel</strong><span>Candidate pool v14.xlsx</span></div><div className="bh-chaos-row"><strong>WhatsApp</strong><span>Interview score screenshot</span></div><div className="bh-chaos-row"><strong>Email</strong><span>Passport copy + selection note</span></div><div className="bh-chaos-row"><strong>Memory</strong><span>“Who approved him?”</span></div></div></div></article>
              <article className="bh-before-after bh-reveal"><div className="bh-before-after-head"><span className="bh-mono" style={{ color: '#A8BAC8', fontSize: '0.62rem' }}>AFTER</span><span className="bh-tag orange">One workspace</span></div><div className="bh-before-after-body"><div className="bh-after-stack"><div className="bh-after-row"><span className="bh-after-index">01</span><div><strong>Candidate record</strong><span>Intake, passport and documents stay together.</span></div></div><div className="bh-after-row"><span className="bh-after-index">02</span><div><strong>Job pool</strong><span>Every candidate is tied to the opening being filled.</span></div></div><div className="bh-after-row"><span className="bh-after-index">03</span><div><strong>Panel comparison</strong><span>Every interviewer score is visible side by side.</span></div></div><div className="bh-after-row"><span className="bh-after-index">04</span><div><strong>Decision history</strong><span>Outcome changes keep a reason and timeline entry.</span></div></div></div></div></article>
            </div>
          </div>
        </section>

        <section id="features" className="bh-section bh-grid" aria-labelledby="features-title">
          <div className="bh-container">
            <div className="bh-section-head bh-reveal"><Eyebrow>Features</Eyebrow><h2 id="features-title" className="bh-title">The details that make a construction recruiting workflow faster to run.</h2><p className="bh-body-lg">Each surface is designed around an action recruiters actually take: import, search, assign, score, compare, decide and deploy.</p></div>
            <div className="bh-bento">
              <Tile n="01 / INTAKE" title="Add a candidate in 7 fields." text="Keep intake focused on agency register no, identity, passport, birth date and requested profession." wide>
                <div className="bh-profile-card"><div className="bh-ui-kicker">Fast candidate intake</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 9 }}>{[['Agency register no','REG-20481'],['Name','Nimal Perera'],['Birth date','18 Feb 1991'],['Passport no','N8••••32'],['Passport expiry','14 Nov 2027'],['Requested profession','Steel fixer'],['Agency','Atlas Manpower']].map(([a,b]) => <div className="bh-field-meta" key={a}><span>{a}</span><strong>{b}</strong></div>)}</div></div>
              </Tile>

              <Tile n="02 / IMPORT" title="Hundreds of candidates in minutes." text="Use the ready CSV template, validate before commit, and catch duplicate register numbers per agency.">
                <div className="bh-import-ui"><div className="bh-import-row"><span className="bh-import-file">candidate_pool_2026.csv</span><span className="bh-import-ok">VALIDATING</span></div><div className="bh-progress"><span /></div><div className="bh-import-meta"><span>186 / 238 rows checked</span><span>78%</span></div><div className="bh-import-duplicate">Duplicate register no. flagged: REG-18422 · row 187</div></div>
              </Tile>

              <Tile n="03 / DIRECTORY + JOBS" title="Search the directory and work from the right job." text="Open a profile directly, filter the pool, and add or import candidates into a specific opening.">
                <div className="bh-directory-ui"><div className="bh-directory-filter"><span>steel fixer</span><span>FILTER</span></div><div className="bh-directory-row"><strong>Nimal Perera</strong><span>REG-20481 · Ready</span></div><div className="bh-directory-row"><strong>Ruwan Silva</strong><span>REG-18732 · Interview</span></div><div className="bh-directory-row"><strong>Doha Tower Fit-out</strong><span>JOB-042 · 21 ready</span></div></div>
              </Tile>

              <Tile n="04 / PANEL" title="Multiple interviewers. One comparison." text="Panelists score the same candidate, then compare every submission in one table.">
                <MiniTable />
              </Tile>

              <Tile n="05 / CONTROL + HISTORY" title="Make the decision with the reason attached." text="Role-based actions protect the workflow, while the audit trail records who changed the outcome, when and why." wide>
                <div className="bh-audit-ui"><div className="bh-audit-line"><strong>Shortlisted</strong><span>09:42 · panel comparison complete</span></div><div className="bh-audit-line"><strong>Decision reason saved</strong><span>09:44 · selected for trade match</span></div><div className="bh-audit-line"><strong>Job pool updated</strong><span>09:45 · Doha Tower Fit-out</span></div></div>
              </Tile>

              <Tile n="06 / DOCUMENTS" title="Keep documents close to the candidate." text="Passport information, document readiness and deployment follow-up stay connected to the same journey.">
                <div className="bh-expiry-ui"><div className="bh-expiry-alert"><div className="bh-alert-box">!</div><div><strong>Passport expiry to watch</strong><span>N8••••32 · 14 Nov 2027 · review window open</span></div></div><div className="bh-directory-row"><strong>Medical certificate</strong><span>Uploaded</span></div><div className="bh-directory-row"><strong>Passport scan</strong><span>Verified</span></div></div>
              </Tile>

              <Tile n="07 / MOBILE" title="Works on the device recruiters already carry." text="Mobile-first screens keep candidate lookup, interview scoring and handoffs usable on phones, tablets and desktops.">
                <div style={{ display: 'grid', placeItems: 'center', minHeight: 155 }}><div style={{ width: 104, border: '6px solid var(--bh-ink)', borderRadius: 19, background: 'var(--bh-paper)', padding: 6 }}><div style={{ height: 145, border: '1px solid var(--bh-line)', padding: 7, background: 'var(--bh-card)' }}><div className="bh-ui-kicker">Interview</div><div style={{ marginTop: 8, fontFamily: 'var(--bh-font-display)', fontSize: '0.67rem', fontWeight: 700 }}>Nimal Perera</div><div className="bh-directory-row"><span>Trade skill</span><strong>18/20</strong></div><div className="bh-directory-row"><span>Safety</span><strong>19/20</strong></div><div className="bh-directory-row"><span>Experience</span><strong>18/20</strong></div></div></div></div>
              </Tile>
            </div>
          </div>
        </section>

        <section id="workflow" className="bh-section bh-pipeline" aria-labelledby="workflow-title">
          <div className="bh-container"><div className="bh-pipeline-layout"><div className="bh-pipeline-copy bh-reveal"><Eyebrow>How it works</Eyebrow><h2 id="workflow-title" className="bh-title">One candidate record. Five controlled handoffs.</h2><p className="bh-body-lg">Bring people in, place them against an opening, interview with a panel, make a documented call, then keep the deployment trail moving.</p><div className="bh-pipeline-stage-list"><div className="bh-pipeline-stage"><div className="bh-pipeline-stage-number">01</div><div><strong>Intake</strong><span>Capture the candidate once.</span></div></div><div className="bh-pipeline-stage"><div className="bh-pipeline-stage-number">02</div><div><strong>Interview</strong><span>Assign a panel and schedule it.</span></div></div><div className="bh-pipeline-stage"><div className="bh-pipeline-stage-number">03</div><div><strong>Evaluation</strong><span>Score the same criteria.</span></div></div><div className="bh-pipeline-stage"><div className="bh-pipeline-stage-number">04</div><div><strong>Selection</strong><span>Compare, decide and save the reason.</span></div></div><div className="bh-pipeline-stage"><div className="bh-pipeline-stage-number">05</div><div><strong>Deployment</strong><span>Keep documents and handoffs connected.</span></div></div></div></div><PipelineVisual /></div></div>
        </section>

        <section className="bh-section bh-spotlight" aria-labelledby="decision-title">
          <div className="bh-container"><div className="bh-spotlight-grid"><div className="bh-spotlight-copy bh-reveal"><Eyebrow>Decision spotlight</Eyebrow><h2 id="decision-title" className="bh-title">See every interviewer before you change the status.</h2><p className="bh-body-lg">No more stitching together score sheets and a WhatsApp thread. BuildHire puts panel submissions into one comparison table, with the final decision and reason attached to the candidate record.</p><div className="bh-trust-micro" style={{ marginTop: 24, color: '#A8BAC8' }}><span>Multiple interviewers</span><span>Same candidate</span><span>One comparison</span><span>Reason captured</span></div></div><div className="bh-spotlight-panel bh-reveal"><div className="bh-spotlight-panel-head"><div><div className="bh-ui-kicker" style={{ color: '#7F94A6' }}>Illustrative panel review</div><div className="bh-ui-title" style={{ color: '#F7F3EA' }}>Nimal Perera · Steel fixer</div></div><span className="bh-tag orange">104 / 120</span></div><div className="bh-spotlight-panel-body"><MiniTable full /></div><div className="bh-decision-bar"><div><div className="bh-decision-label">Decision reason</div><div className="bh-decision-reason">Selected for trade match and site-readiness.</div></div><span className="bh-tag good">SHORTLISTED</span></div></div></div></div>
        </section>

        <section id="import" className="bh-section-tight bh-grid" aria-labelledby="import-title">
          <div className="bh-container"><div className="bh-import-spotlight-grid"><div className="bh-reveal"><Eyebrow>Bulk intake</Eyebrow><h2 id="import-title" className="bh-title" style={{ fontSize: 'clamp(2.1rem, 5.6vw, 4rem)', marginTop: 10 }}>Drop the CSV. Fix the exceptions. Keep moving.</h2><p className="bh-body-lg" style={{ marginTop: 16 }}>Start from the ready template, validate rows before they become records, and catch duplicate agency register numbers per agency.</p><div className="bh-divider-note">Illustrative validation flow · duplicate rows remain flagged for review</div></div><div className="bh-import-board bh-reveal"><div className="bh-import-board-top"><strong>candidate_intake_template.csv</strong><span>238 ROWS · 3 FLAGS</span></div><div className="bh-progress"><span style={{ width: '82%' }} /></div><div className="bh-import-meta"><span>195 valid · 40 checked · 3 flagged</span><span>82%</span></div><div className="bh-import-grid"><div className="bh-import-grid-row"><span>register no</span><span>profession</span><span>validation</span></div><div className="bh-import-grid-row"><span>REG-20481</span><span>steel fixer</span><span className="pass">Pass</span></div><div className="bh-import-grid-row"><span>REG-20482</span><span>electrician</span><span className="pass">Pass</span></div><div className="bh-import-grid-row"><span>REG-18422</span><span>welder</span><span className="dup">Duplicate</span></div><div className="bh-import-grid-row"><span>REG-20484</span><span>plumber</span><span className="pass">Pass</span></div></div><div className="bh-import-callout">Valid rows and exceptions stay visibly separate so the candidate pool is not silently changed by a bad import.</div></div></div></div>
        </section>

        <section id="security" className="bh-section bh-security" aria-labelledby="security-title">
          <div className="bh-container"><div className="bh-section-head bh-reveal"><Eyebrow>Security and control</Eyebrow><h2 id="security-title" className="bh-title">Clear roles. Clear ownership. A clear record of what changed.</h2><p className="bh-body-lg">BuildHire uses role-aware workflows and connected history so operational access follows responsibility.</p></div><div className="bh-security-grid" style={{ marginTop: 32 }}>
            {[
              ['roles','Role-based access','Company admins, agencies, interviewers and candidates work from role-aware surfaces.'],
              ['folder','Workspace boundaries','Company and agency relationships stay explicit.'],
              ['history','Complete audit trail','Outcome changes keep a timeline entry and reason.'],
              ['alert','Passport and document control','Expiry signals stay close to the candidate profile.'],
              ['table','Structured evaluation','Reusable criteria and panel submissions give teams one evaluation surface.'],
              ['mobile','Works on any device','Responsive screens are built for laptops, tablets and phones.'],
            ].map(([icon,title,text]) => <article key={title} className="bh-security-card bh-reveal"><div className="bh-security-icon"><Icon type={icon as 'folder' | 'table' | 'history' | 'alert' | 'roles' | 'mobile'} /></div><h3>{title}</h3><p>{text}</p></article>)}
          </div></div>
        </section>

        <section className="bh-results-band" aria-label="Product structure at a glance"><div className="bh-container-wide bh-results-grid">
          <div className="bh-result"><strong>7</strong><span>fields in the focused candidate intake flow. Structural product fact.</span></div>
          <div className="bh-result"><strong>5</strong><span>stages from intake through deployment. Structural product fact.</span></div>
          <div className="bh-result"><strong>1</strong><span>side-by-side panel comparison for the final call. Structural product fact.</span></div>
          <div className="bh-result"><strong>1</strong><span>audit timeline connected to the candidate record. Structural product fact.</span></div>
        </div></section>

        <section id="pricing" className="bh-section bh-pricing" aria-labelledby="pricing-title"><div className="bh-container"><div className="bh-section-head bh-reveal"><Eyebrow>Pricing and rollout</Eyebrow><h2 id="pricing-title" className="bh-title">Start with the workflow. Talk about scale when you know it.</h2><p className="bh-body-lg">BuildHire pricing can be aligned to your recruitment operation, candidate volume and team structure. No invented public plan numbers on this page.</p></div><div className="bh-pricing-grid">
          <article className="bh-pricing-card accent bh-reveal"><h3>Start free</h3><div className="price">Build your workspace</div><p>Use the existing company registration flow to set up jobs, candidate pools and interviews.</p><div className="bh-price-lines"><span>Company workspace</span><span>Candidate intake and import</span><span>Jobs and panel interviews</span><span>Structured scoring and decisions</span></div><div style={{ marginTop: 20 }}><ActionButton onClick={start}>Create a company workspace <Arrow /></ActionButton></div></article>
          <article className="bh-pricing-card bh-reveal"><h3>Need a walkthrough?</h3><div className="price">See the workflow</div><p>Bring your current spreadsheet process, CSV format and interview panel flow. Map the product around the operation you already run.</p><div className="bh-price-lines"><span>Candidate CSV structure</span><span>Agency and role boundaries</span><span>Interview panel setup</span><span>Decision and deployment workflow</span></div><div style={{ marginTop: 20 }}><ActionButton onClick={() => scrollTo('workflow')} variant="secondary">See how BuildHire works <Arrow /></ActionButton></div></article>
        </div></div></section>

        <section id="faq" className="bh-section" aria-labelledby="faq-title"><div className="bh-container"><div className="bh-faq-grid"><div className="bh-reveal"><Eyebrow>FAQ</Eyebrow><h2 id="faq-title" className="bh-title" style={{ fontSize: 'clamp(2.1rem, 5.5vw, 3.8rem)', marginTop: 10 }}>Practical answers for recruiters, coordinators and owners.</h2><p className="bh-body-lg" style={{ marginTop: 15 }}>Written for real construction recruitment workflows—not generic ATS language.</p></div>
          <div className="bh-faq-list">{[
            ['What CSV format should we use?','Use the ready BuildHire candidate template. The import flow validates expected fields before records are created.'],
            ['How are duplicate candidates handled?','Agency register numbers are checked within the agency context. Duplicate register numbers are flagged during import.'],
            ['Can different users have different permissions?','Yes. BuildHire is organized around role-aware workspaces and actions for company admins, agencies, interviewers and candidates.'],
            ['How do we keep track of passport expiry?','Passport number and expiry are part of the candidate intake record and stay on the profile.'],
            ['How is recruitment data controlled?','The product is structured around company and agency workspaces, role-based access, explicit relationships and connected history.'],
            ['Does BuildHire work on mobile?','Yes. The recruitment surfaces are responsive for phones, tablets and desktops.'],
            ['How long does onboarding take?','There is no honest one-size-fits-all number. Setup depends on your template, roles, agencies and interview criteria.'],
            ['What support is available?','Start with a company workspace and map your candidate intake and interview process into BuildHire.'],
          ].map(([q,a]) => <details key={q} className="bh-faq-item bh-reveal"><summary>{q}</summary><div className="bh-faq-answer">{a}</div></details>)}</div>
        </div></div></section>

        <section className="bh-final bh-grid" aria-labelledby="final-title"><div className="bh-container"><div className="bh-final-box bh-reveal"><Eyebrow>Next hiring cycle</Eyebrow><h2 id="final-title" className="bh-title">Give your candidate pool one place to move.</h2><p>Bring the spreadsheet, candidate records and interview panel into one workspace built for construction recruitment.</p><div className="bh-hero-actions"><ActionButton onClick={start}>Start free trial <Arrow /></ActionButton><ActionButton onClick={() => scrollTo('workflow')} variant="secondary">Watch the workflow <Arrow /></ActionButton></div></div></div></section>
      </main>

      <footer className="bh-footer"><div className="bh-container-wide bh-footer-main"><div className="bh-footer-brand"><button type="button" className="bh-brand" onClick={() => scrollTo('top')} aria-label="BuildHire home"><span className="bh-brand-mark">B</span><span>BuildHire</span></button><p>A recruitment management platform for construction agencies handling candidate intake, interviews, selection and deployment.</p></div><div className="bh-footer-grid"><div className="bh-footer-col"><h3>Product</h3><button type="button" onClick={() => scrollTo('features')}>Features</button><button type="button" onClick={() => scrollTo('workflow')}>How it works</button><button type="button" onClick={() => scrollTo('pricing')}>Pricing</button></div><div className="bh-footer-col"><h3>Trust</h3><button type="button" onClick={() => scrollTo('security')}>Security and control</button><button type="button" onClick={() => scrollTo('faq')}>FAQ</button><button type="button" onClick={login}>Login</button></div><div className="bh-footer-col"><h3>Workspace</h3><button type="button" onClick={start}>Start free trial</button><button type="button" onClick={() => scrollTo('import')}>CSV intake</button><button type="button" onClick={() => scrollTo('workflow')}>Decision workflow</button></div></div></div><div className="bh-container-wide bh-footer-bottom"><span>© {new Date().getFullYear()} BuildHire · Recruitment operations for construction hiring</span><span>Illustrative UI uses invented records and example data.</span></div></footer>

      <div className={'bh-mobile-cta' + (mobileCta ? ' visible' : '')} aria-label="Mobile primary action"><ActionButton onClick={start}>Start free trial <Arrow /></ActionButton><ActionButton onClick={() => scrollTo('workflow')} variant="secondary">See workflow</ActionButton></div>
    </div>
  );
};
