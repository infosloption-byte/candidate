import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SelectMenu } from '../../shared/components/SelectMenu';
import './marketing.css';

type Theme = 'light' | 'dark';
type IconType = 'folder' | 'table' | 'history' | 'alert' | 'roles' | 'mobile';

const Arrow = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3.5 10h11M10.5 5.5 15 10l-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const ThemeIcon = ({ dark }: { dark: boolean }) => dark ? (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v2.1M12 19.4v2.1M4.7 4.7l1.5 1.5M17.8 17.8l1.5 1.5M2.5 12h2.1M19.4 12h2.1M4.7 19.3l1.5-1.5M17.8 6.2l1.5-1.5" /></svg>
) : (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 15.2A8.2 8.2 0 0 1 8.8 4a8.1 8.1 0 1 0 11.2 11.2Z" /></svg>
);

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
);

const FeatureIcon = ({ type }: { type: IconType }) => {
  const common = { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const icons: Record<IconType, ReactNode> = {
    folder: <><path d="M4 6.5h6l1.7 2H20v9.5H4z" /></>,
    table: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16M10 10v9" /></>,
    history: <><path d="M4.7 7.5A8 8 0 1 1 4 12" /><path d="M4.5 4v4h4" /><path d="M12 8v4l3 2" /></>,
    alert: <><path d="M12 4 21 19H3z" /><path d="M12 9.5v4M12 16.8v.2" /></>,
    roles: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5" /><path d="M16 5.5a3 3 0 0 1 0 5.5M18 14.2c1.6.6 2.6 2.1 2.9 4.3" /></>,
    mobile: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  };
  return <svg {...common}>{icons[type]}</svg>;
};

const ActionButton = ({ children, onClick, variant = 'primary' }: { children: ReactNode; onClick: () => void; variant?: 'primary' | 'secondary' }) => (
  <button type="button" className={'bh-btn bh-btn-' + variant} onClick={onClick}>{children}</button>
);

const Eyebrow = ({ children }: { children: ReactNode }) => <p className="bh-eyebrow">{children}</p>;

// Public subscription price. Change it here and the pricing section updates.
const PLAN = { price: '$49', period: '/ month', trialDays: 7 };

const stages = [
  ['Intake', 'Capture the candidate once.'],
  ['Interview', 'Assign a panel and schedule it.'],
  ['Evaluation', 'Score the same criteria.'],
  ['Selection', 'Compare, decide and save the reason.'],
  ['Deployment', 'Keep documents and handoffs connected.'],
];

const features: [IconType, string, string][] = [
  ['folder', 'Add a candidate in 7 fields.', 'Keep intake focused on agency register no, identity, passport, birth date and requested profession.'],
  ['table', 'Hundreds of candidates in minutes.', 'Use the ready CSV template, validate before commit, and catch duplicate register numbers per agency.'],
  ['roles', 'Multiple interviewers. One comparison.', 'Panelists score the same candidate, then compare every submission in one table.'],
  ['history', 'Make the decision with the reason attached.', 'Role-based actions protect the workflow, while the audit trail records who changed the outcome, when and why.'],
  ['alert', 'Keep documents close to the candidate.', 'Passport information, document readiness and deployment follow-up stay connected to the same journey.'],
  ['mobile', 'Works on the device recruiters already carry.', 'Mobile-first screens keep candidate lookup, interview scoring and handoffs usable on phones, tablets and desktops.'],
];

const security: [IconType, string, string][] = [
  ['roles', 'Role-based access', 'Company admins, agencies, interviewers and candidates work from role-aware surfaces.'],
  ['folder', 'Workspace boundaries', 'Company and agency relationships stay explicit.'],
  ['history', 'Complete audit trail', 'Outcome changes keep a timeline entry and reason.'],
  ['alert', 'Passport and document control', 'Expiry signals stay close to the candidate profile.'],
  ['table', 'Structured evaluation', 'Reusable criteria and panel submissions give teams one evaluation surface.'],
  ['mobile', 'Works on any device', 'Responsive screens are built for laptops, tablets and phones.'],
];

const faqs: [string, string][] = [
  ['What CSV format should we use?', 'Use the ready BuildHire candidate template. The import flow validates expected fields before records are created.'],
  ['How are duplicate candidates handled?', 'Agency register numbers are checked within the agency context. Duplicate register numbers are flagged during import.'],
  ['Can different users have different permissions?', 'Yes. BuildHire is organized around role-aware workspaces and actions for company admins, agencies, interviewers and candidates.'],
  ['How do we keep track of passport expiry?', 'Passport number and expiry are part of the candidate intake record and stay on the profile.'],
  ['How is recruitment data controlled?', 'The product is structured around company and agency workspaces, role-based access, explicit relationships and connected history.'],
  ['Does BuildHire work on mobile?', 'Yes. The recruitment surfaces are responsive for phones, tablets and desktops.'],
  ['How long does onboarding take?', 'There is no honest one-size-fits-all number. Setup depends on your template, roles, agencies and interview criteria.'],
  ['How does the 7-day free trial work?', 'Create your company workspace and use every feature for 7 days. After the trial, the subscription is ' + PLAN.price + ' per month for your company workspace.'],
  ['What support is available?', 'Start with a company workspace and map your candidate intake and interview process into BuildHire.'],
];

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
    }), { threshold: 0.12, rootMargin: '0px 0px -40px' });
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
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <div ref={shellRef} className="marketing-site fixed inset-0 overflow-y-auto" data-theme={theme}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:bg-white focus:px-3 focus:py-2 focus:text-sm">Skip to content</a>

      <header className="bh-nav" aria-label="Primary navigation">
        <div className="bh-container bh-nav-inner">
          <button type="button" className="bh-brand" onClick={() => scrollTo('top')} aria-label="BuildHire home"><span className="bh-brand-mark">B</span><span>BuildHire</span></button>
          <nav className="bh-nav-links" aria-label="Desktop navigation">
            <button className="bh-nav-link" type="button" onClick={() => scrollTo('features')}>Features</button>
            <button className="bh-nav-link" type="button" onClick={() => scrollTo('workflow')}>How it works</button>
            <button className="bh-nav-link" type="button" onClick={() => scrollTo('pricing')}>Pricing</button>
            <button className="bh-nav-link" type="button" onClick={() => scrollTo('faq')}>FAQ</button>
          </nav>
          <div className="bh-nav-actions">
            <button type="button" className="bh-icon-btn" onClick={toggleTheme} aria-label="Toggle theme"><ThemeIcon dark={theme === 'light'} /></button>
            <SelectMenu size="sm" className="w-[4.5rem]" triggerClassName="bh-lang-toggle" ariaLabel="Language" value={language} onChange={(value) => setLanguage(value as 'en' | 'he')} options={[{ value: 'en', label: 'EN' }, { value: 'he', label: 'HE' }]} minPanelWidth={112} />
            <button type="button" className="bh-nav-action" onClick={login}>Login</button>
            <ActionButton onClick={start}>Start 7-day trial <Arrow /></ActionButton>
          </div>
          <button type="button" className="bh-mobile-menu-btn" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="buildhire-mobile-menu" aria-label="Open navigation"><MenuIcon open={false} /></button>
        </div>
      </header>

      {menuOpen && (
        <>
          <button type="button" className="bh-menu-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />
          <aside id="buildhire-mobile-menu" className="bh-menu-panel" aria-label="Mobile navigation">
            <button type="button" className="bh-menu-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><MenuIcon open /></button>
            <div className="bh-menu-nav">
              <button type="button" onClick={() => scrollTo('features')}>Features</button>
              <button type="button" onClick={() => scrollTo('workflow')}>How it works</button>
              <button type="button" onClick={() => scrollTo('pricing')}>Pricing</button>
              <button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
            </div>
            <div className="bh-menu-actions">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" className="bh-btn bh-btn-secondary" onClick={toggleTheme}><ThemeIcon dark={theme === 'light'} /> Theme</button>
                <SelectMenu className="w-full" triggerClassName="bh-btn bh-btn-secondary !w-full !justify-between" ariaLabel="Mobile language" value={language} onChange={(value) => setLanguage(value as 'en' | 'he')} options={[{ value: 'en', label: 'English' }, { value: 'he', label: 'עברית' }]} />
              </div>
              <ActionButton onClick={login} variant="secondary">Login</ActionButton>
              <ActionButton onClick={start}>Start 7-day free trial <Arrow /></ActionButton>
            </div>
          </aside>
        </>
      )}

      <main id="main-content">
        {/* Hero */}
        <section id="top" className="bh-hero">
          <div className="bh-container bh-hero-grid">
            <div>
              <Eyebrow>Purpose-built for construction recruitment</Eyebrow>
              <h1 className="bh-title bh-hero-title">Replace spreadsheet chaos with one <span className="bh-mark">hiring workspace.</span></h1>
              <p className="bh-lead">BuildHire takes candidates from bulk intake to panel interview, comparison, selection and deployment—with passport data, trade requests and agency records kept in one place.</p>
              <div className="bh-hero-actions">
                <ActionButton onClick={start}>Start 7-day free trial <Arrow /></ActionButton>
                <ActionButton onClick={() => scrollTo('workflow')} variant="secondary">See how it works</ActionButton>
              </div>
              <ul className="bh-checks">
                <li>Agency register numbers</li><li>Passport expiry</li><li>Trade-based requests</li><li>Panel decisions</li>
              </ul>
            </div>

            <div className="bh-card-demo bh-reveal" aria-label="Illustrative candidate record">
              <div className="bh-demo-head">
                <div className="bh-avatar">NP</div>
                <div><strong>Nimal Perera</strong><span>Steel fixer · REG-20481 · Illustrative</span></div>
                <span className="bh-badge">Panel interview</span>
              </div>
              <div className="bh-steps" aria-hidden="true">
                {stages.map(([name], index) => <div key={name} className={'bh-step' + (index < 2 ? ' done' : index === 2 ? ' now' : '')}>{name}</div>)}
              </div>
              <div className="bh-facts">
                {[['Agency', 'Atlas Manpower'], ['Job', 'Doha Tower Fit-out'], ['Profession', 'Steel fixer'], ['Status', 'Shortlist review'], ['Passport', 'N8••••32'], ['Expiry', '14 Nov 2027']].map(([label, value]) => (
                  <div className="bh-fact" key={label}><span>{label}</span><strong>{value}</strong></div>
                ))}
              </div>
              <div className="bh-demo-foot"><span>Panel score</span><strong>104 / 120</strong></div>
            </div>
          </div>
        </section>

        <div className="bh-trades"><div className="bh-container"><strong>Built for construction recruitment agencies.</strong> Masonry · Electrical · Welding · Plumbing · Steel fixing · More construction trades</div></div>

        {/* Problem */}
        <section className="bh-section" aria-labelledby="problem-title">
          <div className="bh-container">
            <div className="bh-section-head bh-reveal">
              <Eyebrow>Why BuildHire</Eyebrow>
              <h2 id="problem-title" className="bh-title">Your hiring should not depend on who has the latest spreadsheet.</h2>
              <p className="bh-lead">When candidate records sit across Excel, WhatsApp and email, every interview handoff creates another chance to miss context, duplicate work or lose the reason behind a decision.</p>
            </div>
            <div className="bh-compare">
              <article className="bh-panel bh-reveal">
                <h3>Before</h3>
                <div className="bh-row"><strong>Excel</strong><span>Candidate pool v14.xlsx</span></div>
                <div className="bh-row"><strong>WhatsApp</strong><span>Interview score screenshot</span></div>
                <div className="bh-row"><strong>Email</strong><span>Passport copy + selection note</span></div>
                <div className="bh-row"><strong>Memory</strong><span>“Who approved him?”</span></div>
              </article>
              <article className="bh-panel dark bh-reveal">
                <h3>After</h3>
                <div className="bh-row"><strong>Candidate record</strong><span>Intake, passport and documents stay together.</span></div>
                <div className="bh-row"><strong>Job pool</strong><span>Every candidate is tied to the opening being filled.</span></div>
                <div className="bh-row"><strong>Panel comparison</strong><span>Every interviewer score is visible side by side.</span></div>
                <div className="bh-row"><strong>Decision history</strong><span>Outcome changes keep a reason and timeline entry.</span></div>
              </article>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bh-section alt" aria-labelledby="features-title">
          <div className="bh-container">
            <div className="bh-section-head bh-reveal">
              <Eyebrow>Features</Eyebrow>
              <h2 id="features-title" className="bh-title">The details that make a construction recruiting workflow faster to run.</h2>
              <p className="bh-lead">Each surface is designed around an action recruiters actually take: import, search, assign, score, compare, decide and deploy.</p>
            </div>
            <div className="bh-cards">
              {features.map(([icon, title, text]) => (
                <article key={title} className="bh-feature bh-reveal">
                  <div className="bh-feature-icon"><FeatureIcon type={icon} /></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="bh-section" aria-labelledby="workflow-title">
          <div className="bh-container">
            <div className="bh-section-head bh-reveal">
              <Eyebrow>How it works</Eyebrow>
              <h2 id="workflow-title" className="bh-title">One candidate record. Five controlled handoffs.</h2>
              <p className="bh-lead">Bring people in, place them against an opening, interview with a panel, make a documented call, then keep the deployment trail moving.</p>
            </div>
            <div className="bh-flow">
              {stages.map(([title, text], index) => (
                <div key={title} className="bh-flow-item bh-reveal">
                  <div className="bh-flow-num">{String(index + 1).padStart(2, '0')}</div>
                  <div><strong>{title}</strong><span>{text}</span></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Decision spotlight */}
        <section id="import" className="bh-section bh-dark-band" aria-labelledby="decision-title">
          <div className="bh-container bh-spot">
            <div className="bh-reveal">
              <Eyebrow>Decision spotlight</Eyebrow>
              <h2 id="decision-title" className="bh-title">See every interviewer before you change the status.</h2>
              <p className="bh-lead">No more stitching together score sheets and a WhatsApp thread. BuildHire puts panel submissions into one comparison table, with the final decision and reason attached to the candidate record.</p>
            </div>
            <div className="bh-reveal">
              <div className="bh-table-wrap">
                <table className="bh-table">
                  <thead><tr><th>Criterion</th><th>Anna Silva</th><th>Mohamed Rahman</th><th>Panel</th></tr></thead>
                  <tbody>
                    <tr><td><strong>Trade skill</strong></td><td>18 / 20</td><td>16 / 20</td><td><span className="bh-score">34</span></td></tr>
                    <tr><td><strong>Safety</strong></td><td>17 / 20</td><td>19 / 20</td><td><span className="bh-score">36</span></td></tr>
                    <tr><td><strong>Site experience</strong></td><td>16 / 20</td><td>18 / 20</td><td>34</td></tr>
                  </tbody>
                </table>
                <div className="bh-decision">
                  <div><small>Decision reason</small>Selected for trade match and site-readiness.</div>
                  <span className="bh-badge good">SHORTLISTED</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="bh-section" aria-labelledby="security-title">
          <div className="bh-container">
            <div className="bh-section-head bh-reveal">
              <Eyebrow>Security and control</Eyebrow>
              <h2 id="security-title" className="bh-title">Clear roles. Clear ownership. A clear record of what changed.</h2>
              <p className="bh-lead">BuildHire uses role-aware workflows and connected history so operational access follows responsibility.</p>
            </div>
            <div className="bh-cards">
              {security.map(([icon, title, text]) => (
                <article key={title} className="bh-feature bh-reveal">
                  <div className="bh-feature-icon"><FeatureIcon type={icon} /></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bh-section alt" aria-label="Product structure at a glance">
          <div className="bh-container">
            <div className="bh-stats">
              <div className="bh-stat"><strong>7</strong><span>fields in the focused candidate intake flow.</span></div>
              <div className="bh-stat"><strong>5</strong><span>stages from intake through deployment.</span></div>
              <div className="bh-stat"><strong>1</strong><span>side-by-side panel comparison for the final call.</span></div>
              <div className="bh-stat"><strong>1</strong><span>audit timeline connected to the candidate record.</span></div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bh-section" aria-labelledby="pricing-title">
          <div className="bh-container">
            <div className="bh-section-head bh-center bh-reveal">
              <Eyebrow>Pricing</Eyebrow>
              <h2 id="pricing-title" className="bh-title">One plan. Everything included.</h2>
              <p className="bh-lead">Try BuildHire free for {PLAN.trialDays} days. After that, one simple monthly price for your whole company workspace.</p>
            </div>
            <article className="bh-plan bh-reveal">
              <span className="bh-badge">{PLAN.trialDays}-day free trial</span>
              <div className="bh-price"><strong>{PLAN.price}</strong><span>{PLAN.period}</span></div>
              <p className="bh-plan-sub">per company workspace · billed monthly</p>
              <ul>
                <li>Company workspace with role-based access</li>
                <li>Candidate intake and bulk CSV import</li>
                <li>Jobs, panel interviews and structured scoring</li>
                <li>Decisions with reasons and a full audit trail</li>
                <li>Passport, documents and deployment tracking</li>
              </ul>
              <ActionButton onClick={start}>Start {PLAN.trialDays}-day free trial <Arrow /></ActionButton>
              <p className="bh-plan-note">Then {PLAN.price}/month. Cancel anytime.</p>
            </article>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bh-section alt" aria-labelledby="faq-title">
          <div className="bh-container bh-faq-grid">
            <div className="bh-reveal">
              <Eyebrow>FAQ</Eyebrow>
              <h2 id="faq-title" className="bh-title">Practical answers for recruiters, coordinators and owners.</h2>
              <p className="bh-lead">Written for real construction recruitment workflows—not generic ATS language.</p>
            </div>
            <div className="bh-faq-list">
              {faqs.map(([q, a]) => (
                <details key={q} className="bh-faq-item bh-reveal"><summary>{q}</summary><div className="bh-faq-answer">{a}</div></details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bh-section bh-final" aria-labelledby="final-title">
          <div className="bh-container">
            <div className="bh-final-box bh-reveal">
              <Eyebrow>Next hiring cycle</Eyebrow>
              <h2 id="final-title" className="bh-title">Give your candidate pool one place to move.</h2>
              <p>Bring the spreadsheet, candidate records and interview panel into one workspace built for construction recruitment.</p>
              <div className="bh-hero-actions">
                <ActionButton onClick={start}>Start 7-day free trial <Arrow /></ActionButton>
                <ActionButton onClick={() => scrollTo('workflow')} variant="secondary">Watch the workflow <Arrow /></ActionButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bh-footer">
        <div className="bh-container bh-footer-main">
          <div className="bh-footer-brand">
            <button type="button" className="bh-brand" onClick={() => scrollTo('top')} aria-label="BuildHire home"><span className="bh-brand-mark">B</span><span>BuildHire</span></button>
            <p>A recruitment management platform for construction agencies handling candidate intake, interviews, selection and deployment.</p>
          </div>
          <div className="bh-footer-grid">
            <div className="bh-footer-col"><h3>Product</h3><button type="button" onClick={() => scrollTo('features')}>Features</button><button type="button" onClick={() => scrollTo('workflow')}>How it works</button><button type="button" onClick={() => scrollTo('pricing')}>Pricing</button></div>
            <div className="bh-footer-col"><h3>Trust</h3><button type="button" onClick={() => scrollTo('security')}>Security and control</button><button type="button" onClick={() => scrollTo('faq')}>FAQ</button><button type="button" onClick={login}>Login</button></div>
            <div className="bh-footer-col"><h3>Workspace</h3><button type="button" onClick={start}>Start 7-day free trial</button><button type="button" onClick={() => scrollTo('import')}>CSV intake</button><button type="button" onClick={() => scrollTo('workflow')}>Decision workflow</button></div>
          </div>
        </div>
        <div className="bh-container bh-footer-bottom">
          <span>© {new Date().getFullYear()} BuildHire · Recruitment operations for construction hiring</span>
          <span>Illustrative UI uses invented records and example data.</span>
        </div>
      </footer>

      <div className={'bh-mobile-cta' + (mobileCta ? ' visible' : '')} aria-label="Mobile primary action">
        <ActionButton onClick={start}>Start 7-day free trial <Arrow /></ActionButton>
        <ActionButton onClick={() => scrollTo('workflow')} variant="secondary">See workflow</ActionButton>
      </div>
    </div>
  );
};
