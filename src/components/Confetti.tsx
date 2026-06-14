import { useEffect, useState } from 'react';

const COLORS = ['#6c63ff','#f59e0b','#4ade80','#f472b6','#60a5fa','#fb923c','#a78bfa','#34d399','#fbbf24'];

interface Piece {
  id: number; x: number; delay: number; dur: number; color: string; size: number; rot: number;
}

interface Props {
  teamColor?: string;
  onDone?: () => void;
}

export default function Confetti({ teamColor, onDone }: Props) {
  const [pieces] = useState<Piece[]>(() => {
    const colors = teamColor ? [teamColor, '#fff', '#fbbf24', ...COLORS.slice(0, 5)] : COLORS;
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2.5,
      dur: 2.5 + Math.random() * 2,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      rot: Math.random() * 360,
    }));
  });

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 5500);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-20px',
            width: p.size,
            height: p.size * (Math.random() > 0.5 ? 1 : 2.5),
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            opacity: 0.9,
            animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
