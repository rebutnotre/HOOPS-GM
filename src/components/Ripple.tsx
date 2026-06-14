import { useState, useCallback } from 'react';

interface RippleItem { id: number; x: number; y: number; size: number; }

export function useRipple() {
  const [ripples, setRipples] = useState<RippleItem[]>([]);

  const addRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now() + Math.random();
    setRipples(r => [...r, { id, x, y, size }]);
    setTimeout(() => setRipples(r => r.filter(item => item.id !== id)), 600);
  }, []);

  const rippleEls = ripples.map(r => (
    <span
      key={r.id}
      className="ripple-span"
      style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
    />
  ));

  return { addRipple, rippleEls };
}
