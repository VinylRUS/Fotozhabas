'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStreamPostStore } from '@/lib/streampost-store';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

const COLORS = [
  '#10b981', // emerald-500
  '#34d399', // emerald-400
  '#6ee7b7', // emerald-300
  '#a855f7', // purple-500
  '#c084fc', // purple-400
  '#d8b4fe', // purple-300
  '#ef4444', // red-500
  '#f87171', // red-400
  '#fbbf24', // amber-400
  '#14b8a6', // teal-500
  '#5eead4', // teal-300
  '#ffffff', // white
];

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(0);
  const { showConfetti, hideConfetti } = useStreamPostStore();

  const createParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const count = 120;
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 4 + Math.random() * 8;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3 - Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    if (!showConfetti) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    particlesRef.current = createParticles(width, height);
    startTimeRef.current = Date.now();

    const DURATION = 2000; // 2 seconds
    const GRAVITY = 0.15;
    const DRAG = 0.98;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / DURATION, 1);

      ctx.clearRect(0, 0, width, height);

      // Fade out in last 30%
      const fadeStart = 0.7;
      const globalOpacity = progress > fadeStart ? 1 - (progress - fadeStart) / (1 - fadeStart) : 1;

      let allGone = true;

      for (const p of particlesRef.current) {
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.vy *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity = globalOpacity;

        if (p.opacity > 0.01 && p.y < height + 50) {
          allGone = false;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (progress >= 1 || allGone) {
        ctx.clearRect(0, 0, width, height);
        hideConfetti();
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [showConfetti, createParticles, hideConfetti]);

  if (!showConfetti) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
