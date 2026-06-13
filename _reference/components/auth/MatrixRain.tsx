"use client";

import { useEffect, useRef } from "react";

// Mix of binary, Latin, and katakana - classic matrix feel
const CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ0110100101ヲン";

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Alias so TypeScript sees it as non-null inside nested functions
    const c = ctx;

    const fontSize = 13;
    let columns: number[] = [];
    let raf: number;
    let last = 0;
    const frameInterval = 52; // slightly faster than default ~60ms

    function resize() {
      if (!canvas) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      const colCount = Math.floor(w / fontSize);
      // Stagger starting positions so it doesn't all drop at once
      columns = Array.from({ length: colCount }, () =>
        Math.floor(Math.random() * -(h / fontSize))
      );
      // Clear on resize
      c.fillStyle = "#1a1414";
      c.fillRect(0, 0, w, h);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw(now: number) {
      raf = requestAnimationFrame(draw);
      if (now - last < frameInterval) return;
      last = now;
      if (!canvas) return;

      // Fade overlay - matches app background #1a1414
      c.fillStyle = "rgba(26, 20, 20, 0.055)";
      c.fillRect(0, 0, canvas.width, canvas.height);

      c.font = `${fontSize}px 'Courier New', monospace`;

      for (let i = 0; i < columns.length; i++) {
        const y = columns[i] * fontSize;
        if (y < 0) { columns[i]++; continue; }

        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * fontSize;

        // Head character - warmest/brightest
        c.fillStyle = "rgba(190, 85, 75, 0.9)";
        c.fillText(char, x, y);

        // One step behind - slightly dimmer for depth
        if (columns[i] > 1) {
          const prevChar = CHARS[Math.floor(Math.random() * CHARS.length)];
          c.fillStyle = "rgba(150, 60, 55, 0.5)";
          c.fillText(prevChar, x, y - fontSize);
        }

        if (y > canvas.height && Math.random() > 0.972) {
          columns[i] = Math.floor(Math.random() * -15);
        }
        columns[i]++;
      }
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.14,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
