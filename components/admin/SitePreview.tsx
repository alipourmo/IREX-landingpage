'use client';

import { ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { textAppearance, type Appearance } from './model';
import { sections, type Content, type SectionDefinition } from './sections';

export type PreviewDevice = 'desktop' | 'mobile';

export function SitePreview({
  content,
  appearance,
  section,
  device,
  large = false,
}: {
  content: Content;
  appearance: Appearance;
  section: SectionDefinition;
  device: PreviewDevice;
  large?: boolean;
}) {
  const values = content[section.id];
  const scale = large ? 0.8 : 0.54;
  const style = (key: string) => textAppearance(appearance, section.id, key, scale);
  const siteStyle = (key: string) => textAppearance(appearance, 'site', key, scale);
  const sectionIdx = sections.findIndex((item) => item.id === section.id);

  function renderBody() {
    switch (section.id) {
      case 'hero':
        return (
          <>
            <span className="ad-pv-tag ad-pv-tag--copper" style={style('eyebrow')}>
              {values.eyebrow}
            </span>
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-lead" style={style('body')}>{values.body}</p>
            <div className="ad-pv-actions">
              <span className="ad-pv-btn" style={style('button')}>
                {values.button} <ArrowUpRight size={11} />
              </span>
              <span className="ad-pv-note" style={style('note')}>{values.note}</span>
            </div>
          </>
        );

      case 'prediction':
        return (
          <>
            <span className="ad-pv-tag" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1" style={style('body')}>{values.body}</h4>
            <p className="ad-pv-h1 ad-pv-italic-copper" style={style('supporting')}>
              {values.supporting}
            </p>
          </>
        );

      case 'firstPrinciples':
        return (
          <>
            <span className="ad-pv-tag" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-lead" style={style('body')}>{values.body}</p>
            <p className="ad-pv-copy" style={style('paragraphOne')}>{values.paragraphOne}</p>
            <p className="ad-pv-copy" style={style('paragraphTwo')}>{values.paragraphTwo}</p>
            <p className="ad-pv-highlight" style={style('paragraphThree')}>{values.paragraphThree}</p>
          </>
        );

      case 'problem':
        return (
          <>
            <span className="ad-pv-tag" style={style('label')}>{values.label}</span>
            <p className="ad-pv-statement" style={style('statements')}>{values.statements}</p>
            <p className="ad-pv-copy" style={style('preIntro')}>{values.preIntro}</p>
            <h4 className="ad-pv-subhead" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-copy" style={style('body')}>{values.body}</p>
            <p className="ad-pv-list-intro" style={style('listIntro')}>{values.listIntro}</p>
            <ul className="ad-pv-bullets">
              {(['bulletOne', 'bulletTwo', 'bulletThree', 'bulletFour'] as const).map((k) => (
                <li key={k} style={style(k)}>{values[k]}</li>
              ))}
            </ul>
          </>
        );

      case 'limitations':
        return (
          <>
            <span className="ad-pv-tag" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-copy" style={style('paragraphOne')}>{values.paragraphOne}</p>
            <p className="ad-pv-copy" style={style('paragraphTwo')}>{values.paragraphTwo}</p>
            <p className="ad-pv-list-intro" style={style('listIntro')}>{values.listIntro}</p>
            <ul className="ad-pv-bullets">
              {(['bulletOne', 'bulletTwo', 'bulletThree'] as const).map((k) => (
                <li key={k} style={style(k)}>{values[k]}</li>
              ))}
            </ul>
            <p className="ad-pv-closing-mono" style={style('closing')}>{values.closing}</p>
          </>
        );

      case 'reasoning':
        return (
          <>
            <span className="ad-pv-tag" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-lead" style={style('body')}>{values.body}</p>
            <p className="ad-pv-copy" style={style('intro')}>{values.intro}</p>
            <div className="ad-pv-steps">
              {(
                [
                  ['01', 'stepOneTitle', 'stepOneBody'],
                  ['02', 'stepTwoTitle', 'stepTwoBody'],
                  ['03', 'stepThreeTitle', 'stepThreeBody'],
                ] as const
              ).map(([num, titleKey, bodyKey]) => (
                <div className="ad-pv-step" key={num}>
                  <span>{num}</span>
                  <strong style={style(titleKey)}>{values[titleKey]}</strong>
                  <p style={style(bodyKey)}>{values[bodyKey]}</p>
                </div>
              ))}
            </div>
          </>
        );

      case 'principle':
        return (
          <div className="ad-pv-centered">
            <span className="ad-pv-tag" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1">
              <span className="ad-pv-copper" style={style('headingFirst')}>{values.headingFirst}</span>
              {' \u2014 '}
              <span style={style('headingSecond')}>{values.headingSecond}</span>
            </h4>
            <p className="ad-pv-contrast">
              <span style={style('contrastFirst')}>{values.contrastFirst}</span>{' '}
              <strong style={style('contrastFirstEmphasis')}>{values.contrastFirstEmphasis}</strong>{' '}
              <span className="ad-pv-divider">|</span>{' '}
              <span style={style('contrastSecond')}>{values.contrastSecond}</span>{' '}
              <strong style={style('contrastSecondEmphasis')}>{values.contrastSecondEmphasis}</strong>
            </p>
            <p className="ad-pv-copy" style={style('body')}>{values.body}</p>
            <p className="ad-pv-copper-label" style={style('closing')}>{values.closing}</p>
          </div>
        );

      case 'transparency':
        return (
          <>
            <span className="ad-pv-tag" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <div className="ad-pv-card-grid">
              {(
                [
                  ['01', 'itemOneTitle', 'itemOneBody'],
                  ['02', 'itemTwoTitle', 'itemTwoBody'],
                  ['03', 'itemThreeTitle', 'itemThreeBody'],
                  ['04', 'itemFourTitle', 'itemFourBody'],
                ] as const
              ).map(([num, titleKey, bodyKey]) => (
                <div className="ad-pv-feature-card" key={num}>
                  <span className="ad-pv-card-idx">{num}</span>
                  <strong style={style(titleKey)}>{values[titleKey]}</strong>
                  <p style={style(bodyKey)}>{values[bodyKey]}</p>
                </div>
              ))}
            </div>
            <p className="ad-pv-serif-closing">
              <span style={style('closingFirst')}>{values.closingFirst}</span>
              <br />
              <span style={style('closingSecond')}>{values.closingSecond}</span>
            </p>
          </>
        );

      case 'control':
        return (
          <>
            <span className="ad-pv-tag ad-pv-tag--copper" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-lead" style={style('body')}>{values.body}</p>
            <div className="ad-pv-card-grid ad-pv-card-grid--3">
              {(
                [
                  ['01', 'itemOneTitle', 'itemOneBody'],
                  ['02', 'itemTwoTitle', 'itemTwoBody'],
                  ['03', 'itemThreeTitle', 'itemThreeBody'],
                  ['04', 'itemFourTitle', 'itemFourBody'],
                  ['05', 'itemFiveTitle', 'itemFiveBody'],
                  ['06', 'itemSixTitle', 'itemSixBody'],
                ] as const
              ).map(([num, titleKey, bodyKey]) => (
                <div className="ad-pv-feature-card ad-pv-feature-card--copper" key={num}>
                  <span className="ad-pv-card-idx">{num}</span>
                  <strong style={style(titleKey)}>{values[titleKey]}</strong>
                  <p style={style(bodyKey)}>{values[bodyKey]}</p>
                </div>
              ))}
            </div>
            <p className="ad-pv-serif-closing" style={style('closing')}>{values.closing}</p>
          </>
        );

      case 'value':
        return (
          <>
            <span className="ad-pv-tag ad-pv-tag--copper" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-lead" style={style('body')}>{values.body}</p>
            <ul className="ad-pv-value-rows">
              {(['itemOne', 'itemTwo', 'itemThree', 'itemFour'] as const).map((k, idx) => (
                <li key={k}>
                  <span>0{idx + 1}</span>
                  <p style={style(k)}>{values[k]}</p>
                </li>
              ))}
            </ul>
            <div className="ad-pv-outcome-box">
              <p>
                <span className="ad-pv-copper" style={style('outcomeLead')}>{values.outcomeLead}</span>{' '}
                <span style={style('outcomeBody')}>{values.outcomeBody}</span>
              </p>
              <p className="ad-pv-outcome-sub" style={style('closing')}>{values.closing}</p>
            </div>
          </>
        );

      case 'positioning':
        return (
          <div className="ad-pv-glass-box">
            <span className="ad-pv-tag" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-lead" style={style('body')}>{values.body}</p>
          </div>
        );

      case 'cgr':
        return (
          <div className="ad-pv-glass-box">
            <span className="ad-pv-tag" style={style('eyebrow')}>{values.eyebrow}</span>
            <p className="ad-pv-highlight" style={style('intro')}>{values.intro}</p>
            <p className="ad-pv-statement ad-pv-copper" style={style('standout')}>{values.standout}</p>
            <p className="ad-pv-copy" style={style('body')}>{values.body}</p>
            <p className="ad-pv-copy ad-pv-strong" style={style('closing')}>{values.closing}</p>
          </div>
        );

      case 'apply':
        return (
          <div className="ad-pv-centered">
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-lead" style={style('body')}>{values.body}</p>
            <span className="ad-pv-btn" style={style('button')}>
              {values.button} <ArrowUpRight size={11} />
            </span>
            <span className="ad-pv-note" style={style('note')}>{values.note}</span>
          </div>
        );

      case 'site':
        return (
          <div className="ad-pv-site-chrome">
            <div className="ad-pv-chrome-card">
              <span className="ad-pv-tag ad-pv-tag--copper">HEADER STATEMENT</span>
              <p className="ad-pv-copper-label" style={style('headerStatement')}>{values.headerStatement}</p>
            </div>
            <div className="ad-pv-chrome-card">
              <span className="ad-pv-tag ad-pv-tag--copper">FOOTER TAGLINE</span>
              <p className="ad-pv-copy" style={style('footerTagline')}>{values.footerTagline}</p>
            </div>
          </div>
        );

      case 'application':
        return (
          <div className="ad-pv-glass-box">
            <span className="ad-pv-tag" style={style('eyebrow')}>{values.eyebrow}</span>
            <h4 className="ad-pv-h1" style={style('heading')}>{values.heading}</h4>
            <p className="ad-pv-copy" style={style('body')}>{values.body}</p>
            <div className="ad-pv-form-mock">
              <div><span style={style('nameLabel')}>{values.nameLabel}</span><i /></div>
              <div><span style={style('companyLabel')}>{values.companyLabel}</span><i /></div>
              <div><span style={style('emailLabel')}>{values.emailLabel}</span><i /></div>
              <div><span style={style('messageLabel')}>{values.messageLabel}</span><i /></div>
            </div>
            <span className="ad-pv-btn" style={style('submitButton')}>
              {values.submitButton} <ArrowUpRight size={11} />
            </span>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className={`ad-browser ${large ? 'ad-browser--large' : ''} ${device === 'mobile' ? 'ad-browser--mobile' : ''}`}>
      <div className="ad-browser-bar">
        <div className="ad-browser-dots"><i /><i /><i /></div>
        <div className="ad-browser-address">
          <span className="ad-address-lock" />
          irex-landing / #{section.id}
        </div>
        <MoreHorizontal size={14} />
      </div>
      <div className={`ad-site-preview ${section.id === 'hero' || section.id === 'prediction' || section.id === 'firstPrinciples' || section.id === 'problem' || section.id === 'limitations' ? 'is-hero-bg' : ''}`}>
        <div className="ad-preview-site-header">
          <img src="/brand/irex-logo-dark.png" alt="IREX" />
          <span style={siteStyle('headerStatement')}>{content.site.headerStatement}</span>
        </div>
        <div className="ad-preview-content">{renderBody()}</div>
        <div className="ad-preview-rail" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <div className="ad-preview-counter">
          {String(sectionIdx + 1).padStart(2, '0')} <span>/</span> {String(sections.length).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}
