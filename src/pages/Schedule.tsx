import { useState } from 'react';
import { useLeagueStore } from '../store/leagueStore';
import BoxScoreModal from '../components/BoxScoreModal';
import type { GameBoxScore } from '../types';

type Filter = 'all' | 'upcoming' | 'played' | 'home' | 'away';

export default function Schedule() {
  const league = useLeagueStore(s => s.league);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedBoxScore, setSelectedBoxScore] = useState<GameBoxScore | null>(null);
  if (!league) return null;

  const userGames = league.schedule
    .filter(g => g.homeTeamId === league.userTeamId || g.awayTeamId === league.userTeamId)
    .sort((a, b) => b.week - a.week);

  const played = userGames.filter(g => g.played);
  const wins = played.filter(g => {
    const myScore = g.homeTeamId === league.userTeamId ? g.homeScore : g.awayScore;
    const oppScore = g.homeTeamId === league.userTeamId ? g.awayScore : g.homeScore;
    return myScore > oppScore;
  });
  const losses = played.length - wins.length;
  const homeGames = played.filter(g => g.homeTeamId === league.userTeamId);
  const homeWins = homeGames.filter(g => g.homeScore > g.awayScore).length;
  const awayGames = played.filter(g => g.awayTeamId === league.userTeamId);
  const awayWins = awayGames.filter(g => g.awayScore > g.homeScore).length;
  const last10 = played.slice(-10);

  // Filter games
  const visible = userGames.filter(g => {
    if (filter === 'upcoming') return !g.played;
    if (filter === 'played') return g.played;
    if (filter === 'home') return g.homeTeamId === league.userTeamId;
    if (filter === 'away') return g.awayTeamId === league.userTeamId;
    return true;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'played', label: 'Played' },
    { key: 'home', label: 'Home' },
    { key: 'away', label: 'Away' },
  ];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white mb-1">Schedule</h1>

        {/* Summary row */}
        <div className="rounded-xl p-4 mb-4 flex flex-wrap gap-4 items-center" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
          <div>
            <span className="text-xs font-semibold" style={{ color: '#8b90a7' }}>Overall </span>
            <span className="font-black text-white">{wins.length}–{losses}</span>
          </div>
          <div>
            <span className="text-xs font-semibold" style={{ color: '#8b90a7' }}>Home </span>
            <span className="font-bold text-white">{homeWins}–{homeGames.length - homeWins}</span>
          </div>
          <div>
            <span className="text-xs font-semibold" style={{ color: '#8b90a7' }}>Away </span>
            <span className="font-bold text-white">{awayWins}–{awayGames.length - awayWins}</span>
          </div>
          {last10.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs font-semibold mr-1" style={{ color: '#8b90a7' }}>L10</span>
              {last10.map(g => {
                const isHome = g.homeTeamId === league.userTeamId;
                const won = isHome ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
                return (
                  <span key={g.id} className="w-4 h-4 rounded-sm text-xs font-bold flex items-center justify-center"
                    style={{ background: won ? '#16532d' : '#450a0a', color: won ? '#4ade80' : '#f87171', fontSize: '9px' }}>
                    {won ? 'W' : 'L'}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filter === f.key ? '#6c63ff' : '#12151e',
                color: filter === f.key ? '#fff' : '#8b90a7',
                border: `1px solid ${filter === f.key ? '#6c63ff' : '#1e2235'}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {visible.map(g => {
          const isHome = g.homeTeamId === league.userTeamId;
          const oppId = isHome ? g.awayTeamId : g.homeTeamId;
          const opp = league.teams[oppId];
          const myScore = isHome ? g.homeScore : g.awayScore;
          const oppScore = isHome ? g.awayScore : g.homeScore;
          const won = g.played && myScore > oppScore;
          const isCurrent = g.week === league.week;

          // Opponent top-8 avg OVR
          const oppRoster = (opp?.rosterIds ?? []).map(id => league.players[id]).filter(Boolean);
          const top8 = [...oppRoster].sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 8);
          const oppStrength = top8.length > 0 ? Math.round(top8.reduce((s, p) => s + p.ratings.overall, 0) / top8.length) : 0;
          const strengthColor = oppStrength >= 75 ? '#f87171' : oppStrength >= 68 ? '#facc15' : '#4ade80';

          const boxScore = g.played ? (league.gameBoxScores ?? {})[g.id] : undefined;
          const hasBoxScore = !!boxScore;

          return (
            <div key={g.id}
              onClick={() => hasBoxScore && setSelectedBoxScore(boxScore!)}
              className="flex items-center gap-3 rounded-lg px-4 py-3 transition-all"
              style={{
                background: '#12151e',
                border: `1px solid ${isCurrent ? '#2e3248' : '#1e2235'}`,
                cursor: hasBoxScore ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { if (hasBoxScore) (e.currentTarget as HTMLElement).style.borderColor = '#2e3248'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isCurrent ? '#2e3248' : '#1e2235'; }}>
              {/* Home/Away pill */}
              <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
                style={{ background: isHome ? '#6c63ff22' : '#1e2235', color: isHome ? '#818cf8' : '#8b90a7', minWidth: '36px', textAlign: 'center' }}>
                {isHome ? 'HOME' : 'AWAY'}
              </span>

              {/* Opponent info */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: opp?.primaryColor ?? '#6b7280' }} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{opp?.city} {opp?.name}</div>
                  <div className="text-xs" style={{ color: '#8b90a7' }}>
                    {opp?.stats.wins ?? 0}–{opp?.stats.losses ?? 0}
                    {!g.played && <span className="ml-2">Day {g.week}</span>}
                  </div>
                </div>
              </div>

              {/* Opponent strength */}
              {oppStrength > 0 && (
                <div className="text-xs font-bold shrink-0" style={{ color: strengthColor }}>
                  {oppStrength} OVR
                </div>
              )}

              {/* Result */}
              {g.played ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-6 h-6 rounded text-xs font-black flex items-center justify-center"
                    style={{ background: won ? '#16532d' : '#450a0a', color: won ? '#4ade80' : '#f87171' }}>
                    {won ? 'W' : 'L'}
                  </span>
                  <span className="font-mono font-bold text-white text-sm">{myScore}–{oppScore}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded transition-all"
                    style={{ background: hasBoxScore ? '#1e2235' : 'transparent', color: hasBoxScore ? '#a78bfa' : '#2e3248' }}
                    title={hasBoxScore ? 'View box score' : 'Box score not available (simmed before this feature)'}>
                    📊
                  </span>
                </div>
              ) : (
                <span className="text-xs shrink-0" style={{ color: isCurrent ? '#6c63ff' : '#8b90a7' }}>
                  {isCurrent ? 'TODAY' : 'Upcoming'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-12" style={{ color: '#8b90a7' }}>No games to display.</div>
      )}

      {selectedBoxScore && (
        <BoxScoreModal
          boxScore={selectedBoxScore}
          league={league}
          onClose={() => setSelectedBoxScore(null)}
        />
      )}
    </div>
  );
}
