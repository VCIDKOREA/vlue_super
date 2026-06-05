import { useEffect, useRef } from 'react';

interface CloudBlob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  phase: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<CloudBlob[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    blobsRef.current = Array.from({ length: 9 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.09,
      vy: (Math.random() - 0.5) * 0.09,
      radius: Math.random() * 260 + 180,
      hue: i % 3 === 0 ? 200 : i % 3 === 1 ? 210 : 190,
      phase: Math.random() * Math.PI * 2,
    }));

    const DAMPING = 0.9995;
    const MAX_SPEED = 0.14;
    let t = 0;

    const draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.003;

      for (const blob of blobsRef.current) {
        blob.vx += Math.sin(t + blob.phase) * 0.0004;
        blob.vy += Math.cos(t + blob.phase * 1.3) * 0.0004;

        blob.vx *= DAMPING;
        blob.vy *= DAMPING;

        const speed = Math.sqrt(blob.vx ** 2 + blob.vy ** 2);
        if (speed > MAX_SPEED) {
          blob.vx = (blob.vx / speed) * MAX_SPEED;
          blob.vy = (blob.vy / speed) * MAX_SPEED;
        }

        blob.x += blob.vx;
        blob.y += blob.vy;

        const r = blob.radius;
        if (blob.x < -r) blob.x = canvas.width + r;
        if (blob.x > canvas.width + r) blob.x = -r;
        if (blob.y < -r) blob.y = canvas.height + r;
        if (blob.y > canvas.height + r) blob.y = -r;
      }

      for (const blob of blobsRef.current) {
        const grad = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, blob.radius
        );
        grad.addColorStop(0, `hsla(${blob.hue}, 70%, 88%, 0.042)`);
        grad.addColorStop(0.4, `hsla(${blob.hue}, 60%, 93%, 0.024)`);
        grad.addColorStop(0.75, `hsla(${blob.hue}, 50%, 97%, 0.010)`);
        grad.addColorStop(1, `hsla(${blob.hue}, 40%, 99%, 0)`);

        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none select-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
