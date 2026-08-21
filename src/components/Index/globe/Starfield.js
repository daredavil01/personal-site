import React, { useEffect, useRef } from "react";

// Decorative twinkling starfield rendered behind the globe in dark mode.
// Cheap: one canvas, ~140 points, a shooting star every 7-14s.
// With reduced motion the stars are drawn once, statically.
const Starfield = ({ reducedMotion }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    // Same null-context case as atlas/lib/confetti.js: without this, the
    // reduced-motion path throws synchronously on the first drawStatic().
    if (!ctx) return undefined;
    let stars = [];
    let raf = null;
    let shootingStar = null;
    let nextShootAt = performance.now() + 5000 + Math.random() * 7000;

    const seed = () => {
      const { width, height } = canvas;
      stars = Array.from({ length: 140 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.4 + Math.random() * 1.1,
        alpha: 0.25 + Math.random() * 0.55,
        speed: 0.5 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
      });
    };

    const draw = (now) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = now / 1000;
      stars.forEach((s) => {
        const twinkle = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(s.alpha * twinkle).toFixed(3)})`;
        ctx.fill();
      });

      if (!shootingStar && now > nextShootAt) {
        shootingStar = {
          x: Math.random() * canvas.width * 0.7,
          y: Math.random() * canvas.height * 0.35,
          vx: 6 + Math.random() * 4,
          vy: 2 + Math.random() * 2,
          life: 1,
        };
        nextShootAt = now + 7000 + Math.random() * 7000;
      }
      if (shootingStar) {
        const s = shootingStar;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
        ctx.strokeStyle = `rgba(255,255,255,${(0.7 * s.life).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.025;
        if (s.life <= 0) shootingStar = null;
      }
      raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      seed();
      if (reducedMotion) drawStatic();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement);
    if (!reducedMotion) raf = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default Starfield;
