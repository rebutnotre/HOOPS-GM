import type { GameBoxScore, LeagueState, PlayerStats } from '../types';
import { usePlayerModal } from '../contexts/PlayerModalContext';

interface Props {
  boxScore: GameBoxScore;
  league: LeagueState;
  onClose: () => void;
}

const STAT_COLS: { key: keyof PlayerStats; label: string }[] = [
  { key: 'minutes',    label: 'MIN' },
  { key: 'points',     label: 'PTS' },
  { key: 'rebounds',   label: 'REB' },
  { key: 'assists',    label: 'AST' },
  { key: 'steals',     label: 'STL' },
  { key: 'blocks',     label: 'BLK' },
  { key: 'turnovers',  label: 'TO' },
  { key: 'fgm',        label: 'FGM' },
  { key: 'fga',        label: 'FGA' },
  { key: 'fg3m',       label: '3PM' },
  { key: 'fg3a',       label: '3PA' },
  { key: 'ftm',        label: 'FTM' },
  { key: 'fta',        label: 'FTA' },
];

function TeamTable({
  teamId,
  stats,
  league,
  teamColor,
  onPlayerClick,
}: {
  teamId: string;
  stats: Record<string, Partial<PlayerStats>>;
  league: LeagueState;
  teamColor: string;
  onPlayerClick: (playerId: string) => void;
}) {
  const team = league.teams[teamId];
  const rows = Object.entries(stats)
    .map(([pid, s]) => ({ player: league.players[pid], stats: s }))
    .filter(r => r.player)
    .sort((a, b) => (b.stats.minutes ?? 0) - (a.stats.minutes ?? 0));

  const fgPct = (s: Partial<PlayerStats>) =>
    s.fga ? Math.round(((s.fgm ?? 0) / s.fga) * 100) : 0;
  const fg3Pct = (s: Partial<PlayerStats>) =>
    s.fg3a ? Math.round(((s.fg3m ?? 0) / s.fg3a) * 100) : 0;
  const ftPct = (s: Partial<PlayerStats>) =>
    s.fta ? Math.round(((s.ftm ?? 0) / s.fta) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ background: teamColor }} />
        <span className="font-black text-white">{team?.city} {team?.name}</span>
      </div>
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #1e2235' }}>
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr style={{ background: '#12151e' }}>
              <th className="text-left px-3 py-2 font-bold sticky left-0" style={{ color: '#8b90a7', background: '#12151e' }}>PLAYER</th>
              {STAT_COLS.map(c => (
                <th key={c.key} className="px-2 py-2 font-bold text-center" style={{ color: '#8b90a7' }}>{c.label}</th>
              ))}
              <th className="px-2 py-2 font-bold text-center" style={{ color: '#8b90a7' }}>FG%</th>
              <th className="px-2 py-2 font-bold text-center" style={{ color: '#8b90a7' }}>3P%</th>
              <th className="px-2 py-2 font-bold text-center" style={{ color: '#8b90a7' }}>FT%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, stats: s }, i) => {
              const isTop = (s.points ?? 0) === Math.max(...rows.map(r => r.stats.points ?? 0));
              return (
                <tr key={player.id}
                  onClick={() => onPlayerClick(player.id)}
                  className="cursor-pointer transition-colors"
                  style={{ background: i % 2 === 0 ? '#0d0f17' : '#0f1117', borderTop: '1px solid #1e223544' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e2235'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#0d0f17' : '#0f1117'}>
                  <td className="px-3 py-2 sticky left-0" style={{ background: 'inherit' }}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white truncate max-w-[120px] hover:underline">{player.name}</span>
                      <span style={{ color: '#6b7280' }}>{player.position}</span>
                      {isTop && <span className="text-yellow-400">★</span>}
                    </div>
                  </td>
                  {STAT_COLS.map(c => (
                    <td key={c.key} className="px-2 py-2 text-center font-mono"
                      style={{ color: c.key === 'points' ? '#fff' : c.key === 'turnovers' ? '#f87171' : '#c5c9d8', fontWeight: c.key === 'points' ? 'bold' : 'normal' }}>
                      {s[c.key] ?? 0}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-mono" style={{ color: '#c5c9d8' }}>
                    {s.fga ? `${fgPct(s)}%` : '—'}
                  </td>
                  <td className="px-2 py-2 text-center font-mono" style={{ color: '#c5c9d8' }}>
                    {s.fg3a ? `${fg3Pct(s)}%` : '—'}
                  </td>
                  <td className="px-2 py-2 text-center font-mono" style={{ color: '#c5c9d8' }}>
                    {s.fta ? `${ftPct(s)}%` : '—'}
                  </td>
                </tr>
              );
            })}
            {/* Totals row */}
            {rows.length > 0 && (() => {
              const tot = rows.reduce((acc, { stats: s }) => {
                STAT_COLS.forEach(c => { acc[c.key] = (acc[c.key] ?? 0) + (s[c.key] ?? 0); });
                return acc;
              }, {} as Record<string, number>);
              const totFgPct = tot.fga ? Math.round((tot.fgm / tot.fga) * 100) : 0;
              const tot3Pct  = tot.fg3a ? Math.round((tot.fg3m / tot.fg3a) * 100) : 0;
              const totFtPct = tot.fta ? Math.round((tot.ftm / tot.fta) * 100) : 0;
              return (
                <tr style={{ background: teamColor + '18', borderTop: `2px solid ${teamColor}44` }}>
                  <td className="px-3 py-2 font-black text-white sticky left-0" style={{ background: teamColor + '18' }}>TOTALS</td>
                  {STAT_COLS.map(c => (
                    <td key={c.key} className="px-2 py-2 text-center font-black font-mono"
                      style={{ color: c.key === 'points' ? teamColor : '#fff' }}>
                      {tot[c.key] ?? 0}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-bold font-mono" style={{ color: '#fff' }}>{totFgPct}%</td>
                  <td className="px-2 py-2 text-center font-bold font-mono" style={{ color: '#fff' }}>{tot3Pct}%</td>
                  <td className="px-2 py-2 text-center font-bold font-mono" style={{ color: '#fff' }}>{totFtPct}%</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BoxScoreModal({ boxScore, league, onClose }: Props) {
  const homeTeam = league.teams[boxScore.homeTeamId];
  const awayTeam = league.teams[boxScore.awayTeamId];
  const homeWon  = boxScore.homeScore > boxScore.awayScore;
  const { openPlayer } = usePlayerModal();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#0d0f17', border: '1px solid #2e3248' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b sticky top-0 z-10"
          style={{ borderColor: '#1e2235', background: '#0d0f17' }}>
          {/* Away team */}
          <div className="flex-1 text-right">
            <div className="font-black text-white text-lg">{awayTeam?.city} {awayTeam?.name}</div>
            <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>Away</div>
          </div>
          {/* Score */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-4xl font-black" style={{ color: homeWon ? '#8b90a7' : '#fff' }}>
              {boxScore.awayScore}
            </div>
            <div className="text-sm font-bold" style={{ color: '#4b5563' }}>–</div>
            <div className="text-4xl font-black" style={{ color: homeWon ? '#fff' : '#8b90a7' }}>
              {boxScore.homeScore}
            </div>
          </div>
          {/* Home team */}
          <div className="flex-1">
            <div className="font-black text-white text-lg">{homeTeam?.city} {homeTeam?.name}</div>
            <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>Home · Day {boxScore.day}</div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all hover:opacity-80"
            style={{ background: '#1e2235', color: '#8b90a7' }}>
            ✕
          </button>
        </div>

        {/* Box scores */}
        <div className="p-6 space-y-6">
          <TeamTable teamId={boxScore.awayTeamId} stats={boxScore.awayStats} league={league}
            teamColor={awayTeam?.primaryColor ?? '#6c63ff'} onPlayerClick={openPlayer} />
          <TeamTable teamId={boxScore.homeTeamId} stats={boxScore.homeStats} league={league}
            teamColor={homeTeam?.primaryColor ?? '#6c63ff'} onPlayerClick={openPlayer} />
        </div>
      </div>
    </div>
  );
}
