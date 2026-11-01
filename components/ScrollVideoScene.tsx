'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { narrativeMobileVideo, narrativeVideo, videoScenes } from '@/lib/content';
import SpecularButton from './SpecularButton';

gsap.registerPlugin(ScrollTrigger);

const NARRATIVE_DURATION = 25;

export default function ScrollVideoScene({ onApply }: { onApply?: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readyRef = useRef(false);
  const activeIndexRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const progressStops = useMemo(
    () => videoScenes.map((scene) => ({ start: scene.start / NARRATIVE_DURATION, end: scene.end / NARRATIVE_DURATION })),
    [],
  );

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    let targetProgress = 0;
    let raf = 0;

    const scrubToScroll = () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : NARRATIVE_DURATION;
      const targetTime = gsap.utils.clamp(0, duration, targetProgress * duration);

      if (readyRef.current && video.readyState >= 2 && Math.abs(targetTime - video.currentTime) > 0.018) {
        video.currentTime = targetTime;
      }

      raf = requestAnimationFrame(scrubToScroll);
    };

    raf = requestAnimationFrame(scrubToScroll);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=520%',
        pin: true,
        scrub: 0.72,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          targetProgress = self.progress;
          const nextIndex = progressStops.findIndex((stop, index) => {
            const isLast = index === progressStops.length - 1;
            return self.progress >= stop.start && (isLast ? self.progress <= 1 : self.progress < stop.end);
          });

          if (nextIndex >= 0 && activeIndexRef.current !== nextIndex) {
            activeIndexRef.current = nextIndex;
            setActiveIndex(nextIndex);
          }
        },
      });
    }, section);

    return () => {
      cancelAnimationFrame(raf);
      ctx.revert();
    };
  }, [progressStops]);

  return (
    <section id="hero" ref={sectionRef} className="video-scene video-scene--narrative">
      <div className="scene-media" aria-hidden="true">
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={() => setReady(true)}
          onLoadedData={() => setReady(true)}
          onCanPlayThrough={() => setReady(true)}
          className={ready ? 'is-ready' : ''}
        >
          <source src={narrativeMobileVideo} type="video/webm" media="(max-width: 600px)" />
          <source src={narrativeVideo} type="video/webm" />
        </video>
        <div className="scene-vignette" />
      </div>

      <div className="scene-copy-stack">
        {videoScenes.map((scene, index) => (
          <article
            key={scene.id}
            data-scene={scene.id}
            className={`scene-copy scene-copy--panel ${activeIndex === index ? 'is-active' : ''}`}
            aria-hidden={activeIndex !== index}
          >
            {scene.eyebrow && (
              <div className="scene-kicker">
                <span className="eyebrow">{scene.eyebrow}</span>
              </div>
            )}
            {scene.statements && scene.statements.length > 0 && (
              <div className="scene-intro">
                {scene.label && <span className="scene-intro__label">{scene.label}</span>}
                {scene.statements.map((line) => (
                  <p className="scene-intro__statement" key={line}>{line}</p>
                ))}
                {scene.preIntro && <p className="scene-intro__body">{scene.preIntro}</p>}
              </div>
            )}
            <h1>{scene.title}</h1>
            {scene.body && <p className="scene-lead">{scene.body}</p>}
            {scene.highlights
              ?.filter((line) => !scene.blocks?.some((block) => block.body?.includes(line)))
              .map((line) => <p className="scene-highlight" key={line}>{line}</p>)}

            {scene.blocks?.map((block, blockIndex) => (
              <div className="scene-text-block" key={`${scene.id}-${blockIndex}`}>
                {block.heading && <h2>{block.heading}</h2>}
                {block.body?.map((line) => (
                  <p className={scene.highlights?.includes(line) ? 'scene-highlight' : undefined} key={line}>
                    {line}
                  </p>
                ))}
              </div>
            ))}

            {scene.listIntro && <p className="scene-list-intro">{scene.listIntro}</p>}
            {scene.bullets && (
              <ul className="scene-bullets">
                {scene.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            )}
            {scene.closing && <p className="scene-closing">{scene.closing}</p>}
            {scene.coreLine && !scene.cta && <p className="scene-core-line">{scene.coreLine}</p>}

            {scene.cta && onApply && (
              <div className="hero-actions">
                <SpecularButton onClick={onApply}>
                  Apply to Join <span aria-hidden="true">↗</span>
                </SpecularButton>
                <SpecularButton
                  variant="secondary"
                  onClick={() => document.getElementById('method')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  How it works <span aria-hidden="true">↓</span>
                </SpecularButton>
              </div>
            )}
            {scene.cta && scene.coreLine && (
              <p className="hero-core-line" aria-label={scene.coreLine}>
                {scene.coreLine.replace(/\.$/, '').split('. ').map((word, i) => (
                  <span key={word} style={{ display: 'contents' }}>
                    {i > 0 && <i aria-hidden="true" />}
                    <span>{word}</span>
                  </span>
                ))}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
