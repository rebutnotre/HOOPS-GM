import { useLeagueStore } from '../store/leagueStore';
import { usePlayerModal } from '../contexts/PlayerModalContext';
import PlayerPhoto from './PlayerPhoto';
import { OverallBadge } from './RatingBar';
import { moraleLabel } from '../engine/progressionEngine';

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(((value - 40) / 59) * 100);
  const color = value >= 80 ? '#4ade80' : value >= 70 ? '#6c63ff' : value >= 60 ? '#f59e0b' : '#6b7280';
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs w-20 shrink-0 text-right" style={{ color: '#8b90a7' }}>{label}</div>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2235' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-xs w-6 font-black text-right" style={{ color }}>{value}</div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center rounded-lg py-2 px-1" style={{ background: '#12151e' }}>
      <div className="text-base font-black text-white">{value}</div>
      <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{label}</div>
    </div>
  );
}

export default function PlayerModal() {
  const { openPlayerId, closePlayer } = usePlayerModal();
  const league = useLeagueStore(s => s.league);

  if (!openPlayerId || !league) return null;

  const player = league.players[openPlayerId];
  if (!player) return null;

  const team = player.teamId ? league.teams[player.teamId] : null;
  const gp = player.seasonStats.gamesPlayed;
  const cgp = player.careerStats.gamesPlayed;
  const marketVal = Math.max(1.1, (player.ratings.overall - 40) * 0.4 + 1.1).toFixed(2);
  const r = player.ratings;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={closePlayer}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden fade-in-up"
        style={{ background: '#0d0f17', border: '1px solid #1e2235', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden px-5 pt-5 pb-4"
          style={{ background: team ? `linear-gradient(135deg, ${team.primaryColor}28, transparent)` : '#12151e',
                   borderBottom: '1px solid #1e2235' }}>
          {team && <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(circle at top right, ${team.primaryColor}, transparent)` }} />}
          <div className="flex items-center gap-4">
            <PlayerPhoto seed={player.photoSeed} size={64} name={player.name} teamColor={team?.primaryColor} />
            <div className="flex-1 min-w-0">
              <div className="text-xl font-black text-white leading-tight">{player.name}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm font-semibold" style={{ color: team?.primaryColor ?? '#8b90a7' }}>
                  {player.position}
                </span>
                <span className="text-sm" style={{ color: '#6b7280' }}>· Age {player.age}</span>
                {team && <span className="text-sm" style={{ color: '#6b7280' }}>· {team.city} {team.name}</span>}
                {player.injuryGames > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#7f1d1d', color: '#fca5a5' }}>
                    INJ {player.injuryGames}g
                  </span>
                )}
              </div>
            </div>
            <OverallBadge value={r.overall} />
          </div>

          {/* Contract */}
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="px-2 py-1 rounded-lg font-bold" style={{ background: '#1e2235', color: '#c5c9d8' }}>
              ${player.contract.salary.toFixed(2)}M/yr
            </span>
            <span style={{ color: '#6b7280' }}>{player.contract.yearsLeft} yr{player.contract.yearsLeft !== 1 ? 's' : ''} left</span>
            <span style={{ color: '#6b7280' }}>· Market ~${marketVal}M</span>
            {player.contract.yearsLeft <= 1 && (
              <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#92400e', color: '#fcd34d' }}>
                Expiring
              </span>
            )}
          </div>
        </div>

        {/* Season stats */}
        <div className="px-5 py-4 border-b" style={{ borderColor: '#1e2235' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: team?.primaryColor ?? '#6c63ff' }}>
            Season Averages {gp > 0 ? `(${gp} GP)` : ''}
          </div>
          {gp > 0 ? (
            <div className="grid grid-cols-5 gap-2">
              <StatPill label="PTS" value={(player.seasonStats.points / gp).toFixed(1)} />
              <StatPill label="REB" value={(player.seasonStats.rebounds / gp).toFixed(1)} />
              <StatPill label="AST" value={(player.seasonStats.assists / gp).toFixed(1)} />
              <StatPill label="STL" value={(player.seasonStats.steals / gp).toFixed(1)} />
              <StatPill label="BLK" value={(player.seasonStats.blocks / gp).toFixed(1)} />
            </div>
          ) : (
            <div className="text-xs text-center py-2" style={{ color: '#6b7280' }}>No games played this season</div>
          )}
          {gp > 0 && (
            <div className="mt-2 text-xs text-center" style={{ color: '#6b7280' }}>
              FG {player.seasonStats.fga > 0 ? ((player.seasonStats.fgm / player.seasonStats.fga) * 100).toFixed(0) : 0}%
              · 3P {player.seasonStats.fg3a > 0 ? ((player.seasonStats.fg3m / player.seasonStats.fg3a) * 100).toFixed(0) : 0}%
              · FT {player.seasonStats.fta > 0 ? ((player.seasonStats.ftm / player.seasonStats.fta) * 100).toFixed(0) : 0}%
            </div>
          )}
        </div>

        {/* Career stats */}
        {cgp > 0 && (
          <div className="px-5 py-3 border-b" style={{ borderColor: '#1e2235' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Career ({cgp} GP)</div>
            <div className="flex gap-4 text-xs" style={{ color: '#8b90a7' }}>
              <span>{(player.careerStats.points / cgp).toFixed(1)} PPG</span>
              <span>{(player.careerStats.rebounds / cgp).toFixed(1)} RPG</span>
              <span>{(player.careerStats.assists / cgp).toFixed(1)} APG</span>
            </div>
          </div>
        )}

        {/* Ratings breakdown */}
        <div className="px-5 py-4">
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: team?.primaryColor ?? '#6c63ff' }}>
            Ratings
          </div>
          <div className="space-y-2">
            <RatingBar label="Scoring"      value={r.scoring} />
            <RatingBar label="3-Pt Shot"    value={r.shooting3} />
            <RatingBar label="Mid Range"    value={r.midRange} />
            <RatingBar label="Finishing"    value={r.finishing} />
            <RatingBar label="Passing"      value={r.passing} />
            <RatingBar label="Ball Handling" value={r.ballHandling} />
            <RatingBar label="Defense"      value={r.defense} />
            <RatingBar label="Rebounding"   value={r.rebounding} />
            <RatingBar label="Athleticism"  value={r.athleticism} />
            <RatingBar label="IQ"           value={r.iq} />
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span style={{ color: '#6b7280' }}>Potential</span>
              <span className="font-black text-white">{player.potential}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: '#6b7280' }}>Morale</span>
              {(() => { const m = moraleLabel(player.morale ?? 75); return (
                <span className="font-black" style={{ color: m.color }}>{m.label} ({player.morale ?? 75})</span>
              ); })()}
            </div>
          </div>
          {player.tendency && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs" style={{ color: '#6b7280' }}>Tendency</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#818cf822', color: '#818cf8' }}>
                {player.tendency}
              </span>
            </div>
          )}
        </div>

        {/* Close */}
        <div className="px-5 pb-5">
          <button onClick={closePlayer}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: '#1e2235', color: '#8b90a7' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
