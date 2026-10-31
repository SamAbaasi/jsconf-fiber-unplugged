import { useEffect, useMemo, useState } from 'react';

const pathCache = new WeakMap();

// One SVG path per color. Crisp at any scale.
function framePaths(frame, palette) {
  let cached = pathCache.get(frame);
  if (cached) return cached;
  const byColor = {};
  frame.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '.' || !palette[c]) continue;
      (byColor[c] ||= []).push(`M${x} ${y}h1v1h-1z`);
    }
  });
  cached = Object.entries(byColor).map(([c, d]) => ({ fill: palette[c], d: d.join('') }));
  pathCache.set(frame, cached);
  return cached;
}

export function Sprite({ frame, palette, scale = 8, className = '', style, flip = false }) {
  const w = frame[0].length;
  const h = frame.length;
  const paths = framePaths(frame, palette);
  return (
    <svg
      className={className}
      style={{ ...style, transform: flip ? 'scaleX(-1)' : undefined }}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {paths.map((p) => (
        <path key={p.fill} fill={p.fill} d={p.d} />
      ))}
    </svg>
  );
}

// Cycles through frames. Not used in live demos (those draw on canvas).
export function AnimatedSprite({ frames, fps = 3, paused = false, ...rest }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (paused || frames.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % frames.length), 1000 / fps);
    return () => clearInterval(id);
  }, [frames, fps, paused]);
  return <Sprite frame={frames[i % frames.length]} {...rest} />;
}

// Pre-renders a frame to a canvas once, for fast drawing in canvas scenes.
const canvasCache = new Map();
export function spriteCanvas(frame, palette, scale) {
  const key = frame;
  let perScale = canvasCache.get(key);
  if (!perScale) canvasCache.set(key, (perScale = new Map()));
  let c = perScale.get(scale);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = frame[0].length * scale;
  c.height = frame.length * scale;
  const ctx = c.getContext('2d');
  frame.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = palette[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  perScale.set(scale, c);
  return c;
}

export function useStableFrames(frames) {
  return useMemo(() => frames, [frames]);
}
