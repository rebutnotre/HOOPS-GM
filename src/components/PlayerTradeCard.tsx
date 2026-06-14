import type { Player } from '../types';
import { injurySeverityLabel } from '../engine/injuryEngine';
import { moraleLabel } from '../engine/progressionEngine';
import { formatHeight } from '../engine/playerGen';

const TENDENCY_LABELS: Record<string, string> = {
  scorer: '⚡ Scorer', playmaker: '🎯 Playmaker', defender: '🛡 Defender',
  rebounder: '💪 Rebounder', '3pt-specialist': '🎳 3PT Spec.', interior: '🏗 Interior',
  '3-and-D': '🔒 3&D', utility: '🔧 Utility', 'stretch-big': '📐 Stretch', facilitator: '🧠 Facilitator',
};

function OvrDelta({ a, b }: { a: number; b: number }) {
  const d = a - b;
  if (d === 0) return null;
  return (
    <span className="text-xs font-bold ml-1" style={{ color: d > 0 ? '#4ade80' : '#f87171' }}>
      ({d > 0 ? '+' : ''}{d})
    </span>
  );
}

interface Props {
  player: Player;
  side: 'give' | 'receive';
  comparePlayer?: Player; // player being swapped the other way for delta
  teamColor?: string;
  onClick?: () => void;
}

export default function PlayerTradeCard({ player, side, comparePlayer, teamColor: _tc, onClick }: Props) {
  const gp   = player.seasonStats.gamesPlayed;
  const pts  = gp > 0 ? (player.seasonStats.points   / gp).toFixed(1) : '—';
  const reb  = gp > 0 ? (player.seasonStats.rebounds / gp).toFixed(1) : '—';
  const ast  = gp > 0 ? (player.seasonStats.assists  / gp).toFixed(1) : '—';
  const fgPct = gp > 0 && player.seasonStats.fga > 0
    ? Math.round((player.seasonStats.fgm / player.seasonStats.fga) * 100) : null;

  const inj  = player.injuryGames > 0 ? injurySeverityLabel(player.injuryGames) : null;
  const mor  = moraleLabel(player.morale ?? 75);
  // Show expiring only once the season is underway — not right after signing a 1-year deal
  const isExpiring = player.contract.yearsLeft <= 1 && player.seasonStats.gamesPlayed > 0;
  const marketVal  = Math.max(1.1, (player.ratings.overall - 40) * 0.4 + 1.1);
  const isUnderPaid = player.contract.salary < marketVal * 0.85;
  const isOverPaid  = player.contract.salary > marketVal * 1.2;

  const accentColor = side === 'receive' ? '#34d399' : '#f87171';
  const bgColor     = side === 'receive' ? '#0f1e16' : '#1a0f0f';
  const borderColor = side === 'receive' ? '#34d39933' : '#f8717133';

  const ovr = player.ratings.overall;
  const ovrColor = ovr >= 80 ? '#4ade80' : ovr >= 72 ? '#6c63ff' : ovr >= 65 ? '#f59e0b' : '#8b90a7';

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-all hover:opacity-90 active:scale-99"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}>

      {/* Name row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
            style={{ background: ovrColor + '22', color: ovrColor }}>
            {ovr}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-white truncate leading-tight">{player.name}</div>
            <div className="text-xs flex items-center gap-1" style={{ color: '#6b7280' }}>
              <span>{player.position}{player.secondaryPosition ? `/${player.secondaryPosition}` : ''}</span>
              {player.height && <><span>·</span><span>{formatHeight(player.height)}</span></>}
              <span>·</span>
              <span>Age {player.age}</span>
              {comparePlayer && <OvrDelta a={ovr} b={comparePlayer.ratings.overall} />}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="text-xs font-black" style={{ color: accentColor }}>{side === 'receive' ? '↓ IN' : '↑ OUT'}</div>
        </div>
      </div>

      {/* Season stats */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {[
          { label: 'PTS', value: pts },
          { label: 'REB', value: reb },
          { label: 'AST', value: ast },
          { label: 'FG%', value: fgPct !== null ? `${fgPct}%` : '—' },
        ].map(s => (
          <div key={s.label} className="rounded-lg py-1.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-sm font-black text-white leading-none">{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Contract + flags row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs px-1.5 py-0.5 rounded font-bold"
          style={{ background: '#1e2235', color: '#c5c9d8' }}>
          ${player.contract.salary.toFixed(1)}M · {player.contract.yearsLeft}yr
        </span>
        {isUnderPaid && (
          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#065f4633', color: '#34d399' }}>
            💰 Value deal
          </span>
        )}
        {isOverPaid && (
          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#7f1d1d33', color: '#f87171' }}>
            ⚠️ Overpaid
          </span>
        )}
        {isExpiring && (
          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#92400e22', color: '#fcd34d' }}>
            Expiring
          </span>
        )}
        {inj && (
          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: inj.bg, color: inj.color }}>
            {inj.label}
          </span>
        )}
        {player.tendency && (
          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#1e2235', color: '#a78bfa' }}>
            {TENDENCY_LABELS[player.tendency] ?? player.tendency}
          </span>
        )}
        <span className="text-xs px-1.5 py-0.5 rounded font-bold ml-auto" style={{ background: mor.color + '22', color: mor.color }}>
          {mor.label}
        </span>
      </div>
    </button>
  );
}
