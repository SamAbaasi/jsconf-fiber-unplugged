import { useMemo } from 'react';

// Pixel stars, placed with a fixed seed so every render is the same.
export function Starfield({ count = 90, seed = 7 }) {
  const stars = useMemo(() => {
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, () => ({ x: r() * 1920, y: r() * 760, size: r() < 0.15 ? 6 : 3, a: 0.35 + r() * 0.65 }));
  }, [count, seed]);
  return (
    <svg className="starfield" width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden="true">
      {stars.map((st, i) => (
        <rect key={i} x={Math.round(st.x)} y={Math.round(st.y)} width={st.size} height={st.size} fill="#ffffff" opacity={st.a} />
      ))}
    </svg>
  );
}
