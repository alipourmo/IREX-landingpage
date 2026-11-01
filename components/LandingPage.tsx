'use client';

import { useCallback, useState } from 'react';
import Header from './Header';
import LineSidebar from './LineSidebar';
import ApplyModal from './ApplyModal';
import ScrollVideoScene from './ScrollVideoScene';
import SpotlightCard from './SpotlightCard';
import ShapeBlur from './ShapeBlur';
import Topography from './Topography';
import SpecularButton from './SpecularButton';

const auditItems = [
  ['1', 'TRACEABLE REASONING', 'Traceable reasoning behind every result'],
  ['2', 'EXPLICIT LINKS', 'Explicit links between data and conclusions'],
  ['3', 'JUSTIFIED DECISIONS', 'Clear justification for accepted and rejected hypotheses'],
  ['4', 'REPRODUCIBLE OUTCOMES', 'Consistent, reproducible outcomes'],
];

const controlItems = [
  ['1', 'INFRASTRUCTURE', 'Fully deployable within your infrastructure'],
  ['2', 'DATA OWNERSHIP', 'No sensitive data leaves your environment'],
  ['3', 'INDEPENDENCE', 'Personalised AI without external dependencies'],
  ['4', 'DETERMINISTIC', 'Deterministic, reproducible execution'],
  ['5', 'EXPERT CONTROL', 'Expert-in-the-loop control with override capability'],
  ['6', 'DOMAIN KNOWLEDGE', 'Domain expertise explicitly encoded into system reasoning'],
];

const valueItems = [
  ['1', 'Generate and evaluate multiple geological scenarios rapidly'],
  ['2', 'Test interpretations before committing to drilling'],
  ['3', 'Reject weak targets early'],
  ['4', 'Reduce false positives'],
];

const reasoningItems = [
  ['1', 'Generate', 'Construct multiple geological hypotheses using structured data and mineral-system topology.'],
  ['2', 'Test', 'Evaluate each hypothesis against evidence and system constraints.'],
  ['3', 'Reject', 'Eliminate interpretations that fail to satisfy invariant relationships.'],
];

export default function LandingPage() {
  const [applyOpen, setApplyOpen] = useState(false);
  const openApply = useCallback(() => setApplyOpen(true), []);
  const closeApply = useCallback(() => setApplyOpen(false), []);

  return (
    <main>
      <Header />
      <LineSidebar />
      <ScrollVideoScene onApply={openApply} />

      <section className="reasoning-section" aria-labelledby="reasoning-title">
        <div className="section-shell reasoning-shell">
          <div className="reasoning-hero">
            <div>
              <span className="eyebrow">IREX Bridges the Gap</span>
              <h2 id="reasoning-title">Generate. Test. Reject.</h2>
              <p>At scale, before drilling decisions are made.</p>
              <p className="reasoning-intro">IREX applies a rigorous reasoning process:</p>
            </div>
          </div>
          <div className="reasoning-columns">
            {reasoningItems.map(([n, t, d]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="principle" className="manifesto-section">
        <div className="section-shell manifesto-shell">
          <span className="eyebrow">CORE PRINCIPLE</span>
          <h2 className="manifesto-title"><span className="coral">Every Deposit Is Individual</span> —<br />Systems Have Invariants.</h2>
          <p className="contrast-line"><span>DEPOSIT FOOTPRINTS</span> <strong>ARE NOISY.</strong> <span>MINERAL SYSTEMS</span> <strong>ARE NOT.</strong></p>
          <p className="manifesto-copy">While observations vary, the underlying geological processes follow invariant relationships. IREX identifies and reasons over these invariants — treating each target as a system to be understood, not a pattern to be matched.</p>
          <p className="manifesto-final">EXPLORATION IS A REASONING PROBLEM, NOT PREDICTION.</p>
        </div>
      </section>

      <section id="transparency" className="cards-section">
        <div className="section-shell">
          <span className="eyebrow">TRANSPARENCY</span><h2 className="section-title">Designed for Auditability</h2>
          <div className="card-grid card-grid--2">{auditItems.map(([n,t,d]) => <SpotlightCard key={n}><span className="card-index">{n}</span><h3>{t}</h3><p>{d}</p></SpotlightCard>)}</div>
          <p className="closing-line closing-line--spaced">Every decision can be inspected and challenged.<br />Every outcome can be examined and verified.</p>
        </div>
      </section>

      <section id="control" className="cards-section cards-section--control">
        <div className="section-shell">
          <span className="eyebrow">CONTROL</span><h2 className="section-title">Built for Control</h2>
          <p className="lead">Designed for environments where control, reliability, and data ownership are non-negotiable.</p>
          <div className="card-grid card-grid--3">{controlItems.map(([n,t,d]) => <SpotlightCard key={n} spotlightColor="rgba(201,122,50,.16)"><span className="card-index">{n}</span><h3>{t}</h3><p>{d}</p></SpotlightCard>)}</div>
          <p className="closing-line">The system operates fully within your control — technically, operationally, and decisively.</p>
        </div>
      </section>

      <section id="value" className="value-section">
        <div className="section-shell">
          <span className="eyebrow">ECONOMIC VALUE</span><h2 className="section-title">Reduce Risk Before It Becomes Capital</h2>
          <p className="value-lead">IREX fundamentally improves how high-stakes exploration decisions are made.</p>
          <ul className="value-list">
            {valueItems.map(([n, d]) => (
              <li key={n}>
                <span>{n}</span>
                <p>{d}</p>
              </li>
            ))}
          </ul>
          <div className="value-outcome">
            <p><span>Fewer costly errors.</span> Capital deployed with discipline.</p>
            <p className="value-decision-line">IREX optimizes for Decision Quality, Not Prediction Accuracy.</p>
          </div>
        </div>
      </section>

      <section id="positioning" className="positioning-section">
        <div className="positioning-card">
          <ShapeBlur className="positioning-card__effect" />
          <div className="positioning-card__content">
            <span className="eyebrow">Built for Reasoning</span><h2>IREX Is Not Another prediction model.</h2>
            <p>It is a reasoning system designed to identify invariants within noisy data — enabling decisions grounded in system understanding, not statistical patterns.</p>
          </div>
        </div>
      </section>

      <section id="cgr-definition" className="cgr-definition-section" aria-labelledby="cgr-definition-title">
        <div className="section-shell cgr-definition-shell">
          <SpotlightCard className="cgr-definition-card" spotlightColor="rgba(0,184,196,.14)">
            <span className="eyebrow">Computational Geological Reasoning™ (CGR™)</span>
            <p id="cgr-definition-title" className="cgr-definition-intro">Geological reasoning has guided mineral discovery for generations.</p>
            <div className="cgr-definition-copy">
              <p className="cgr-copper cgr-large">CGR™ extends geological reasoning into computational systems.</p>
              <p>CGR™ extends beyond prediction by transforming exploration data into structured geological knowledge, systematically generating, testing, and rejecting competing interpretations to converge on the most evidence-supported geological hypotheses under uncertainty.</p>
              <p className="cgr-coral"><strong>IREX<sup>®</sup> is developing, validating, and commercialising CGR™ as a new category of exploration intelligence for decision-making under uncertainty.</strong></p>
            </div>
          </SpotlightCard>
        </div>
      </section>

      <section id="apply" className="cta-section">
        <div className="cta-topography-layer">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Topography
              lowColor="#C97A32"
              midColor="#FF5860"
              highColor="#FFFFFF"
              speed={0.35}
              morphAmount={3}
              morphSpeed={0.05}
              bands={2}
              thickness={0.01}
              scale={2}
              pixelSize={1}
              glow={0.5}
              colorMode="elevation"
              contrast={3}
              brightness={1}
              fillBands={false}
              opacity={1}
              grain
              grainIntensity={0.05}
              mouseInteraction
              mouseRadius={0.3}
              mouseStrength={0.4}
            />
          </div>
        </div>
        <div className="cta-overlay" />
        <div className="cta-content">
          <h2>Early Adopter Program</h2>
          <p>For leaders responsible for exploration strategy, capital allocation, and high-stakes decisions under uncertainty.</p>
          <SpecularButton onClick={openApply}>Apply to Join <span aria-hidden="true">↗</span></SpecularButton>
          <span className="microcopy">Limited Foundation Partner Opportunities</span>
        </div>
      </section>

      <footer className="site-footer">
        <a href="#hero" className="footer-logo" aria-label="IREX home"><img src="/brand/irex-logo-dark.png" alt="IREX" /></a>
        <p className="footer-tagline">CGR™ is the next evolution of exploration intelligence.</p>
        <a href="https://www.linkedin.com/company/irex-pty-ltd/" target="_blank" rel="noreferrer" className="linkedin-link" aria-label="IREX on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8.4H3.2V21h3.3V8.4ZM4.85 3A1.95 1.95 0 1 0 4.85 6.9 1.95 1.95 0 0 0 4.85 3ZM21 13.8c0-3.8-2-5.6-4.7-5.6-2.17 0-3.14 1.2-3.68 2.04V8.4H9.3V21h3.32v-6.24c0-1.65.31-3.25 2.36-3.25 2.02 0 2.04 1.89 2.04 3.36V21H21v-7.2Z"/></svg></a>
      </footer>

      <ApplyModal open={applyOpen} onClose={closeApply} />
    </main>
  );
}
