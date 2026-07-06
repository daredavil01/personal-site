// Tiny dependency-free confetti burst, used when all six worlds have been
// explored. Draws on a temporary canvas overlaid on `host`, then removes it.
const launchConfetti = (host, colors) => {
  if (!host) return;
  const canvas = document.createElement("canvas");
  canvas.className = "absolute inset-0 w-full h-full pointer-events-none z-40";
  canvas.width = host.clientWidth;
  canvas.height = host.clientHeight;
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const particles = Array.from({ length: 130 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
    y: canvas.height * 0.45,
    vx: (Math.random() - 0.5) * 9,
    vy: -4 - Math.random() * 7,
    size: 4 + Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.3,
  }));

  const start = performance.now();
  const DURATION = 2400;

  const tick = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fade = Math.max(0, 1 - elapsed / DURATION);
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      particles[i] = {
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.18,
        rotation: p.rotation + p.spin,
      };
      ctx.save();
      ctx.translate(particles[i].x, particles[i].y);
      ctx.rotate(particles[i].rotation);
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (elapsed < DURATION) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };
  requestAnimationFrame(tick);
};

export default launchConfetti;
