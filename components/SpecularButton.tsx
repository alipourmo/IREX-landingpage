'use client';

import { useEffect, useRef } from 'react';
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';

const PAD = 20;
const VERT = `#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}`;
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uCenter; uniform vec2 uHalfSize; uniform float uRadius; uniform float uAngle; uniform float uPx;
uniform vec3 uLineColor; uniform vec3 uBaseColor; uniform float uIntensity; uniform float uShineSize;
uniform float uShineFade; uniform float uThickness; uniform float uBaseWidth; out vec4 fragColor;
float sdRoundedRect(vec2 p, vec2 b, float r){vec2 q=abs(p)-b+r;return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;}
float gaussianLine(float d,float sigma){float x=d/(sigma+1e-6);float k=mix(1.0,1.6,smoothstep(0.0,1.5,x));return exp(-k*x*x);}
void main(){vec2 p=gl_FragCoord.xy-uCenter;float d=sdRoundedRect(p,uHalfSize,uRadius);vec2 L=vec2(cos(uAngle),sin(uAngle));
float base=(1.0-smoothstep(0.0,uBaseWidth,abs(d)))*0.45;vec2 nEll=normalize(p/(uHalfSize*uHalfSize)+1e-6);
float phi=acos(clamp(abs(dot(nEll,L)),0.0,1.0));float rim=1.0-smoothstep(uShineSize-uShineFade,uShineSize+uShineFade+1e-4,phi);
float line=gaussianLine(d,uThickness);float edgeClamp=1.0-smoothstep(0.5*uPx,3.0*uPx,abs(d));float hi=line*rim*edgeClamp*uIntensity;
vec3 col=uBaseColor*base+uLineColor*hi;float a=clamp(base+hi,0.0,1.0);fragColor=vec4(col,a);}`;

function hexColor(hex: string) {
  const c = new Color(hex);
  return [c.r, c.g, c.b] as [number, number, number];
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  /** Design system v2 hierarchy: one primary per view. */
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'm' | 'l';
};

const RADIUS = 12; // radius/md

export default function SpecularButton({ children, className = '', variant = 'primary', size = 'l', ...props }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const fxRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const btn = btnRef.current;
    const fx = fxRef.current;
    if (!btn || !fx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const geometry = new Triangle(gl);
    if ((geometry.attributes as unknown as Record<string, unknown>).uv) delete (geometry.attributes as unknown as Record<string, unknown>).uv;
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uCenter: { value: [0, 0] }, uHalfSize: { value: [1, 1] }, uRadius: { value: RADIUS * dpr }, uAngle: { value: 2.4 },
        uPx: { value: dpr }, uLineColor: { value: hexColor('#00B8C4') }, uBaseColor: { value: hexColor('#394451') },
        uIntensity: { value: 0 }, uShineSize: { value: 10 * Math.PI / 180 }, uShineFade: { value: 40 * Math.PI / 180 },
        uThickness: { value: 1 * dpr }, uBaseWidth: { value: dpr },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    fx.appendChild(gl.canvas);
    let w = 1, h = 1;
    const resize = () => {
      const rect = btn.getBoundingClientRect(); w = rect.width; h = rect.height;
      renderer.setSize(w + PAD * 2, h + PAD * 2);
      program.uniforms.uCenter.value = [(PAD + w / 2) * dpr, (PAD + h / 2) * dpr];
      program.uniforms.uHalfSize.value = [(w / 2) * dpr, (h / 2) * dpr];
    };
    const ro = new ResizeObserver(resize); ro.observe(btn); resize();

    let pointerAngle: number | null = null, proximity = 0, angle = 2.4, idle = 2.4, bright = 0, raf = 0, last = performance.now();
    const onMove = (e: PointerEvent) => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      const distance = Math.hypot(dx, dy);
      pointerAngle = Math.atan2(cy - e.clientY, e.clientX - cx);
      const t = Math.max(0, 1 - distance / 220); proximity = t * t * (3 - 2 * t);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    const update = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now; idle += 0.25 * dt;
      const target = pointerAngle ?? idle; const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += diff * (1 - Math.exp(-dt * 7)); bright += (proximity - bright) * (1 - Math.exp(-dt * 8));
      program.uniforms.uAngle.value = angle; program.uniforms.uRadius.value = Math.min(RADIUS, Math.min(w, h) / 2) * dpr;
      program.uniforms.uIntensity.value = 1.15 * bright; renderer.render({ scene: mesh }); raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', onMove); if (gl.canvas.parentNode === fx) fx.removeChild(gl.canvas); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  }, []);

  return (
    <button ref={btnRef} className={`specular-button specular-button--${variant} specular-button--${size} ${className}`} {...props}>
      <span ref={fxRef} className="specular-button__fx" aria-hidden="true" />
      <span className="specular-button__label">{children}</span>
    </button>
  );
}
