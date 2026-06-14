interface Props {
  seed: number;
  size?: number;
  className?: string;
  name?: string;
  teamColor?: string;
  number?: number;
}

// Returns a readable text color (white or near-black) based on background luminance
function contrastColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#111' : '#fff';
}

// Jersey number derived from seed (1–99)
function jerseyNum(seed: number): number {
  return (seed % 99) + 1;
}

export default function PlayerPhoto({
  seed,
  size = 64,
  className = '',
  name = 'P',
  teamColor = '#6c63ff',
  number,
}: Props) {
  const num = number ?? jerseyNum(seed);
  const fill = teamColor;
  const text = contrastColor(fill);

  // Darker shade for jersey details (collar, side panels)
  const r = parseInt(fill.replace('#','').slice(0,2),16);
  const g = parseInt(fill.replace('#','').slice(2,4),16);
  const b = parseInt(fill.replace('#','').slice(4,6),16);
  const dark = `rgb(${Math.max(0,r-40)},${Math.max(0,g-40)},${Math.max(0,b-40)})`;

  const fontSize = num >= 10 ? 28 : 32;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 ${className}`}
      style={{ borderRadius: '50%' }}
      aria-label={name}
    >
      {/* Background circle */}
      <circle cx="50" cy="50" r="50" fill="#1e2235" />

      {/* Jersey body — basketball tank top shape */}
      <path
        d="M28,18 L14,18 L6,42 L22,48 L22,82 L78,82 L78,48 L94,42 L86,18 L72,18 Q60,28 50,28 Q40,28 28,18 Z"
        fill={fill}
      />

      {/* Collar (darker accent) */}
      <path
        d="M28,18 Q40,28 50,28 Q60,28 72,18"
        fill="none"
        stroke={dark}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Side panels (darker stripe) */}
      <path d="M22,48 L22,82 L30,82 L30,50 Z" fill={dark} opacity="0.4" />
      <path d="M78,48 L78,82 L70,82 L70,50 Z" fill={dark} opacity="0.4" />

      {/* Jersey number */}
      <text
        x="50"
        y="66"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={text}
        fontSize={fontSize}
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
        letterSpacing="-1"
      >
        {num}
      </text>
    </svg>
  );
}
