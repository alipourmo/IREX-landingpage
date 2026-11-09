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
import SmartPreloader from './SmartPreloader';
import { textAppearance } from './admin/model';
import { useSiteContent } from './LiveContentProvider';

const auditItems = [
  ['1', 'itemOneTitle', 'itemOneBody'],
  ['2', 'itemTwoTitle', 'itemTwoBody'],
  ['3', 'itemThreeTitle', 'itemThreeBody'],
  ['4', 'itemFourTitle', 'itemFourBody'],
] as const;

const controlItems = [
  ['1', 'itemOneTitle', 'itemOneBody'],
  ['2', 'itemTwoTitle', 'itemTwoBody'],
  ['3', 'itemThreeTitle', 'itemThreeBody'],
  ['4', 'itemFourTitle', 'itemFourBody'],
  ['5', 'itemFiveTitle', 'itemFiveBody'],
  ['6', 'itemSixTitle', 'itemSixBody'],
] as const;

const valueItems = [
  ['1', 'itemOne'],
  ['2', 'itemTwo'],
  ['3', 'itemThree'],
  ['4', 'itemFour'],
] as const;

const reasoningItems = [
  ['1', 'stepOneTitle', 'stepOneBody'],
  ['2', 'stepTwoTitle', 'stepTwoBody'],
  ['3', 'stepThreeTitle', 'stepThreeBody'],
] as const;

export default function LandingPage() {
  const { copy, appearance } = useSiteContent();
  const style = (section: string, field: string) => textAppearance(appearance, section, field);
  const [applyOpen, setApplyOpen] = useState(false);
  const openApply = useCallback(() => setApplyOpen(true), []);
  const closeApply = useCallback(() => setApplyOpen(false), []);

  return (
    <main>
      <SmartPreloader />
      <Header />
      <LineSidebar />
      <ScrollVideoScene onApply={openApply} />

      <section className="reasoning-section" aria-labelledby="reasoning-title">
        <div className="section-shell reasoning-shell">
          <div className="reasoning-hero">
            <div>
              <span className="eyebrow" style={style('reasoning', 'eyebrow')}>{copy.reasoning.eyebrow}</span>
              <h2 id="reasoning-title" style={style('reasoning', 'heading')}>{copy.reasoning.heading}</h2>
              <p style={style('reasoning', 'body')}>{copy.reasoning.body}</p>
              <p className="reasoning-intro" style={style('reasoning', 'intro')}>{copy.reasoning.intro}</p>
            </div>
          </div>
          <div className="reasoning-columns">
            {reasoningItems.map(([n, t, d]) => (
              <article key={n}>
                <span>{n}</span>
                <h3 style={style('reasoning', t)}>{copy.reasoning[t]}</h3>
                <p style={style('reasoning', d)}>{copy.reasoning[d]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="principle" className="manifesto-section">
        <div className="section-shell manifesto-shell">
          <span className="eyebrow" style={style('principle', 'eyebrow')}>{copy.principle.eyebrow}</span>
          <h2 className="manifesto-title"><span className="coral" style={style('principle', 'headingFirst')}>{copy.principle.headingFirst}</span> {'\u2014'}<br /><span style={style('principle', 'headingSecond')}>{copy.principle.headingSecond}</span></h2>
          <p className="contrast-line"><span style={style('principle', 'contrastFirst')}>{copy.principle.contrastFirst}</span> <strong style={style('principle', 'contrastFirstEmphasis')}>{copy.principle.contrastFirstEmphasis}</strong> <span style={style('principle', 'contrastSecond')}>{copy.principle.contrastSecond}</span> <strong style={style('principle', 'contrastSecondEmphasis')}>{copy.principle.contrastSecondEmphasis}</strong></p>
          <p className="manifesto-copy" style={style('principle', 'body')}>{copy.principle.body}</p>
          <p className="manifesto-final" style={style('principle', 'closing')}>{copy.principle.closing}</p>
        </div>
      </section>

      <section id="transparency" className="cards-section">
        <div className="section-shell">
          <span className="eyebrow" style={style('transparency', 'eyebrow')}>{copy.transparency.eyebrow}</span><h2 className="section-title" style={style('transparency', 'heading')}>{copy.transparency.heading}</h2>
          <div className="card-grid card-grid--2">{auditItems.map(([n,t,d]) => <SpotlightCard key={n}><span className="card-index">{n}</span><h3 style={style('transparency', t)}>{copy.transparency[t]}</h3><p style={style('transparency', d)}>{copy.transparency[d]}</p></SpotlightCard>)}</div>
          <p className="closing-line closing-line--spaced"><span style={style('transparency', 'closingFirst')}>{copy.transparency.closingFirst}</span><br /><span style={style('transparency', 'closingSecond')}>{copy.transparency.closingSecond}</span></p>
        </div>
      </section>

      <section id="control" className="cards-section cards-section--control">
        <div className="section-shell">
          <span className="eyebrow" style={style('control', 'eyebrow')}>{copy.control.eyebrow}</span><h2 className="section-title" style={style('control', 'heading')}>{copy.control.heading}</h2>
          <p className="lead" style={style('control', 'body')}>{copy.control.body}</p>
          <div className="card-grid card-grid--3">{controlItems.map(([n,t,d]) => <SpotlightCard key={n} spotlightColor="rgba(201,122,50,.16)"><span className="card-index">{n}</span><h3 style={style('control', t)}>{copy.control[t]}</h3><p style={style('control', d)}>{copy.control[d]}</p></SpotlightCard>)}</div>
          <p className="closing-line" style={style('control', 'closing')}>{copy.control.closing}</p>
        </div>
      </section>

      <section id="value" className="value-section">
        <div className="section-shell">
          <span className="eyebrow" style={style('value', 'eyebrow')}>{copy.value.eyebrow}</span><h2 className="section-title" style={style('value', 'heading')}>{copy.value.heading}</h2>
          <p className="value-lead" style={style('value', 'body')}>{copy.value.body}</p>
          <ul className="value-list">
            {valueItems.map(([n, d]) => (
              <li key={n}>
                <span>{n}</span>
                <p style={style('value', d)}>{copy.value[d]}</p>
              </li>
            ))}
          </ul>
          <div className="value-outcome">
            <p><span style={style('value', 'outcomeLead')}>{copy.value.outcomeLead}</span> <span className="value-outcome-body" style={style('value', 'outcomeBody')}>{copy.value.outcomeBody}</span></p>
            <p className="value-decision-line" style={style('value', 'closing')}>{copy.value.closing}</p>
          </div>
        </div>
      </section>

      <section id="positioning" className="positioning-section">
        <div className="positioning-card">
          <ShapeBlur className="positioning-card__effect" />
          <div className="positioning-card__content">
            <span className="eyebrow" style={style('positioning', 'eyebrow')}>{copy.positioning.eyebrow}</span><h2 style={style('positioning', 'heading')}>{copy.positioning.heading}</h2>
            <p style={style('positioning', 'body')}>{copy.positioning.body}</p>
          </div>
        </div>
      </section>

      <section id="cgr-definition" className="cgr-definition-section" aria-labelledby="cgr-definition-title">
        <div className="section-shell cgr-definition-shell">
          <SpotlightCard className="cgr-definition-card" spotlightColor="rgba(0,184,196,.14)">
            <span className="eyebrow" style={style('cgr', 'eyebrow')}>{copy.cgr.eyebrow}</span>
            <p id="cgr-definition-title" className="cgr-definition-intro" style={style('cgr', 'intro')}>{copy.cgr.intro}</p>
            <div className="cgr-definition-copy">
              <p className="cgr-copper cgr-large" style={style('cgr', 'standout')}>{copy.cgr.standout}</p>
              <p style={style('cgr', 'body')}>{copy.cgr.body}</p>
              <p className="cgr-coral"><strong style={style('cgr', 'closing')}>{copy.cgr.closing}</strong></p>
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
          <h2 style={style('apply', 'heading')}>{copy.apply.heading}</h2>
          <p style={style('apply', 'body')}>{copy.apply.body}</p>
          <SpecularButton onClick={openApply} style={style('apply', 'button')}>{copy.apply.button} <span aria-hidden="true">↗</span></SpecularButton>
          <span className="microcopy" style={style('apply', 'note')}>{copy.apply.note}</span>
        </div>
      </section>

      <footer className="site-footer">
        <a href="#hero" className="footer-logo" aria-label="IREX home"><img src="/brand/irex-logo-dark.png" alt="IREX" /></a>
        <p className="footer-tagline" style={style('site', 'footerTagline')}>{copy.site.footerTagline}</p>
        <a href="https://www.linkedin.com/company/irex-pty-ltd/" target="_blank" rel="noreferrer" className="linkedin-link" aria-label="IREX on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8.4H3.2V21h3.3V8.4ZM4.85 3A1.95 1.95 0 1 0 4.85 6.9 1.95 1.95 0 0 0 4.85 3ZM21 13.8c0-3.8-2-5.6-4.7-5.6-2.17 0-3.14 1.2-3.68 2.04V8.4H9.3V21h3.32v-6.24c0-1.65.31-3.25 2.36-3.25 2.02 0 2.04 1.89 2.04 3.36V21H21v-7.2Z"/></svg></a>
      </footer>

      <ApplyModal open={applyOpen} onClose={closeApply} />
    </main>
  );
}
