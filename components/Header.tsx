'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { textAppearance } from './admin/model';
import { useSiteContent } from './LiveContentProvider';

gsap.registerPlugin(ScrollTrigger);

export default function Header() {
  const { copy, appearance } = useSiteContent();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 80,
        onEnter: () => el.classList.add('is-floating'),
        onLeaveBack: () => el.classList.remove('is-floating'),
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <header ref={ref} className="site-header">
      <a href="#hero" className="brand" aria-label="IREX home"><Image src="/brand/irex-logo-dark.png" alt="IREX" width={150} height={48} priority /></a>
      <span className="header-statement" style={textAppearance(appearance, 'site', 'headerStatement')}>{copy.site.headerStatement}</span>
    </header>
  );
}
