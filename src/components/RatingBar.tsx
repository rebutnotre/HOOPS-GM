interface Props {
  value: number; // 0-99
  label?: string;
  showValue?: boolean;
  color?: string;
}

function ratingColor(v: number) {
  if (v >= 85) return '#4ade80'; // green
  if (v >= 75) return '#a3e635';
  if (v >= 65) return '#facc15'; // yellow
  if (v >= 55) return '#fb923c';
  return '#f87171'; // red
}

export default function RatingBar({ value, label, showValue = true, color }: Props) {
  const c = color ?? ratingColor(value);
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>}
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${value}%`, backgroundColor: c }} />
      </div>
      {showValue && <span className="text-xs font-bold w-6 text-right" style={{ color: c }}>{value}</span>}
    </div>
  );
}

export function OverallBadge({ value }: { value: number }) {
  const c = ratingColor(value);
  return (
    <div className="flex items-center justify-center rounded font-black text-sm w-9 h-9 shrink-0" style={{ backgroundColor: c + '22', color: c, border: `1px solid ${c}44` }}>
      {value}
    </div>
  );
}
