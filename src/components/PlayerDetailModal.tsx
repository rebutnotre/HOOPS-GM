import type { Player } from '../types';
import PlayerPhoto from './PlayerPhoto';
import { formatHeight } from '../engine/playerGen';
import { moraleLabel } from '../engine/progressionEngine';

const RATING_LABELS: { key: keyof Player['ratings']; label: string }[] = [
  { key: 'scoring',      label: 'Scoring'      },
  { key: 'finishing',    label: 'Finishing'     },
  { key: 'shooting3',   label: '3PT Shooting'  },
  { key: 'midRange',    label: 'Mid-Range'     },
  { key: 'passing',     label: 'Passing'       },
  { key: 'ballHandling',label: 'Ball Handling' },
  { key: 'defense',     label: 'Defense'       },
  { key: 'rebounding',  label: 'Rebounding'    },
  { key: 'athleticism', label: 'Athleticism'   },
  { key: 'iq',          label: 'IQ'            },
];

function RatingBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#4ade80' : value >= 70 ? '#6c63ff' : value >= 60 ? '#f59e0b' : '#8b90a7';
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs w-28 shrink-0" style={{ color: '#8b90a7' }}>{label}</div>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2235' }}>
        <div style={{ width: `${value}%`, background: color, height: '100%', borderRadius: 9999 }} />
      </div>
      <div className="text-xs font-bold w-7 text-right" style={{ color }}>{value}</div>
    </div>
  );
}

interface Props {
  player: Player;
  teamColor?: string;
  onClose: () => void;
}

export default function PlayerDetailModal({ player, teamColor, onClose }: Props) {
  const ovr = player.ratings.overall;
  const pot = player.potential ?? ovr;
  const ovrColor = ovr >= 80 ? '#4ade80' : ovr >= 72 ? '#6c63ff' : ovr >= 65 ? '#f59e0b' : '#8b90a7';
  const potColor = pot >= 85 ? '#4ade80' : pot >= 75 ? '#6c63ff' : pot >= 65 ? '#f59e0b' : '#8b90a7';
  const gp = player.seasonStats.gamesPlayed;
  const mor = moraleLabel(player.morale ?? 75);

  const potGap = pot - ovr;
  const potLabel = potGap >= 10 ? 'High upside' : potGap >= 5 ? 'Some upside' : potGap >= 1 ? 'Near ceiling' : 'At ceiling';
  const potLabelColor = potGap >= 10 ? '#4ade80' : potGap >= 5 ? '#a78bfa' : potGap >= 1 ? '#f59e0b' : '#6b7280';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background: '#0d1018', border: `1px solid ${teamColor ?? '#2e3248'}55` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <PlayerPhoto seed={player.photoSeed} size={52} name={player.name} teamColor={teamColor} />
          <div className="flex-1 min-w-0">
            <div className="text-lg font-black text-white leading-tight truncate">{player.name}</div>
            <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>
              {player.position}{player.secondaryPosition ? `/${player.secondaryPosition}` : ''}
              {player.height ? ` · ${formatHeight(player.height)}` : ''}
              {' · Age '}{player.age}
            </div>
            <div className="text-xs mt-0.5 font-semibold" style={{ color: mor.color }}>{mor.label}</div>
          </div>
          <button onClick={onClose} className="text-lg leading-none mt-0.5" style={{ color: '#4b5563' }}>✕</button>
        </div>

        {/* OVR + Potential */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-3 text-center" style={{ background: '#12151e', border: `1px solid ${ovrColor}33` }}>
            <div className="text-3xl font-black" style={{ color: ovrColor }}>{ovr}</div>
            <div className="text-xs mt-0.5 font-semibold" style={{ color: '#6b7280' }}>OVR</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: '#12151e', border: `1px solid ${potColor}33` }}>
            <div className="text-3xl font-black" style={{ color: potColor }}>{pot}</div>
            <div className="text-xs mt-0.5 font-semibold" style={{ color: '#6b7280' }}>Potential</div>
            <div className="text-xs mt-0.5 font-bold" style={{ color: potLabelColor }}>{potLabel}</div>
          </div>
        </div>

        {/* Contract */}
        <div className="rounded-xl px-3 py-2.5 mb-4 flex items-center justify-between" style={{ background: '#12151e' }}>
          <div>
            <div className="text-xs font-semibold" style={{ color: '#8b90a7' }}>Contract</div>
            <div className="text-sm font-black text-white">${player.contract.salary.toFixed(2)}M / yr</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold" style={{ color: '#8b90a7' }}>Years left</div>
            <div className="text-sm font-black text-white">{player.contract.yearsLeft} yr{player.contract.yearsLeft !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Season stats */}
        {gp > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>This Season ({gp} GP)</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'PTS', value: (player.seasonStats.points / gp).toFixed(1) },
                { label: 'REB', value: (player.seasonStats.rebounds / gp).toFixed(1) },
                { label: 'AST', value: (player.seasonStats.assists / gp).toFixed(1) },
                { label: 'FG%', value: player.seasonStats.fga > 0 ? `${Math.round(player.seasonStats.fgm / player.seasonStats.fga * 100)}%` : '—' },
              ].map(s => (
                <div key={s.label} className="rounded-lg py-2 text-center" style={{ background: '#12151e' }}>
                  <div className="text-sm font-black text-white">{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ratings breakdown */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Ratings</div>
          <div className="space-y-1.5">
            {RATING_LABELS.map(({ key, label }) => (
              <RatingBar key={key} label={label} value={player.ratings[key] as number} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
