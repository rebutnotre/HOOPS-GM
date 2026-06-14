import { useState, useMemo } from 'react';
import { useLeagueStore } from '../store/leagueStore';
import { OverallBadge } from '../components/RatingBar';
import PlayerPhoto from '../components/PlayerPhoto';
import type { Position } from '../types';

const POS_ORDER: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];
const ALL_POS = ['ALL', ...POS_ORDER];

function visibleColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 60 ? '#a78bfa' : hex;
}

export default function FantasyDraft() {
  const league = useLeagueStore(s => s.league);
  const fantasyDraftPick = useLeagueStore(s => s.fantasyDraftPick);
  const fantasyDraftAuto = useLeagueStore(s => s.fantasyDraftAuto);
  const [posFilter, setPosFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'ovr' | 'age' | 'salary'>('ovr');

  if (!league || !league.fantasyDraft) return null;
  const fd = league.fantasyDraft;

  const currentTeamId = fd.pickOrder[fd.currentPick];
  const isUserTurn = currentTeamId === league.userTeamId;
  const currentTeam = league.teams[currentTeamId];
  const userTeam = league.teams[league.userTeamId];
  const tc = visibleColor(userTeam.primaryColor);

  const round = Math.floor(fd.currentPick / 30) + 1;
  const pickInRound = (fd.currentPick % 30) + 1;
  const totalPicks = fd.pickOrder.length;
  const progress = (fd.currentPick / totalPicks) * 100;

  // Pool of available players
  const poolPlayers = useMemo(() => {
    return fd.pool
      .map(id => league.players[id])
      .filter(Boolean)
      .filter(p => posFilter === 'ALL' || p.position === posFilter)
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'ovr') return b.ratings.overall - a.ratings.overall;
        if (sortBy === 'age') return a.age - b.age;
        return a.contract.salary - b.contract.salary;
      });
  }, [fd.pool, league.players, posFilter, search, sortBy]);

  // User's current roster
  const myRoster = userTeam.rosterIds
    .map(id => league.players[id])
    .filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);

  // Recent picks (last 5)
  const recentPicks = [...fd.completedPicks].reverse().slice(0, 8);

  // Up-next picks after current
  const upNext = fd.pickOrder.slice(fd.currentPick, fd.currentPick + 5).map((tid, i) => ({
    teamId: tid,
    team: league.teams[tid],
    pickNum: fd.currentPick + i + 1,
    isUser: tid === league.userTeamId,
  }));

  const ovrColor = (ovr: number) =>
    ovr >= 90 ? '#f59e0b' : ovr >= 80 ? '#4ade80' : ovr >= 70 ? '#60a5fa' : '#8b90a7';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080a12' }}>

      {/* Top bar */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-4"
        style={{ background: '#0d0f1c', borderBottom: '1px solid #1a1e35' }}>

        {/* Draft status */}
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full" style={{ background: isUserTurn ? tc : '#4b5563' }} />
          <div>
            <div className="text-xs" style={{ color: '#6b7280' }}>Round {round} · Pick {pickInRound} of 30</div>
            <div className="text-sm font-black" style={{ color: isUserTurn ? tc : '#fff' }}>
              {isUserTurn ? '⭐ Your Pick!' : `${currentTeam?.abbreviation} on the clock`}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1e35' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${tc}88, ${tc})` }} />
          </div>
          <div className="flex justify-between mt-1 text-xs" style={{ color: '#4b5563' }}>
            <span>Pick {fd.currentPick + 1}</span>
            <span>{fd.pool.length} players left</span>
            <span>Pick {totalPicks}</span>
          </div>
        </div>

        {/* Up next */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs mr-1" style={{ color: '#4b5563' }}>Next:</span>
          {upNext.map((n, i) => (
            <div key={n.pickNum} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
              style={{
                background: n.isUser ? `${tc}25` : i === 0 ? '#1e2235' : '#131628',
                color: n.isUser ? tc : '#6b7280',
                border: n.isUser ? `1px solid ${tc}40` : '1px solid transparent',
                fontSize: '9px',
              }}>
              {n.team?.abbreviation}
            </div>
          ))}
        </div>

        {/* Auto-draft rest */}
        {isUserTurn && (
          <button
            onClick={fantasyDraftAuto}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80 shrink-0"
            style={{ background: '#131628', color: '#8b90a7', border: '1px solid #1e2540' }}>
            Auto-Draft All
          </button>
        )}
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: My Roster */}
        <div className="w-52 shrink-0 flex flex-col border-r overflow-y-auto" style={{ borderColor: '#1a1e35', background: '#0d0f1c' }}>
          <div className="px-3 py-2.5 border-b" style={{ borderColor: '#1a1e35' }}>
            <div className="text-xs font-black uppercase tracking-widest" style={{ color: tc }}>My Roster</div>
            <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{myRoster.length} / 13 players</div>
          </div>
          <div className="flex-1 p-2 space-y-1">
            {myRoster.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{ background: '#131628' }}>
                <PlayerPhoto seed={p.photoSeed} size={24} name={p.name} teamColor={userTeam.primaryColor} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                  <div className="text-xs" style={{ color: '#4b5563' }}>{p.position}</div>
                </div>
                <div className="text-xs font-black shrink-0" style={{ color: ovrColor(p.ratings.overall) }}>
                  {p.ratings.overall}
                </div>
              </div>
            ))}
            {myRoster.length === 0 && (
              <div className="text-xs text-center py-6" style={{ color: '#4b5563' }}>No picks yet</div>
            )}
            {/* Positional gaps */}
            {myRoster.length > 0 && (
              <div className="mt-3 pt-2 border-t" style={{ borderColor: '#1a1e35' }}>
                <div className="text-xs mb-1.5" style={{ color: '#4b5563' }}>Positions</div>
                {POS_ORDER.map(pos => {
                  const count = myRoster.filter(p => p.position === pos).length;
                  return (
                    <div key={pos} className="flex items-center gap-2 mb-1">
                      <span className="text-xs w-6" style={{ color: '#6b7280' }}>{pos}</span>
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-sm"
                            style={{ background: i < count ? tc : '#1a1e35' }} />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: count > 0 ? '#8b90a7' : '#4b5563' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center: Available Players */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Filters */}
          <div className="px-4 py-2.5 border-b flex items-center gap-3" style={{ borderColor: '#1a1e35', background: '#0a0c14' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players…"
              className="px-3 py-1.5 rounded-lg text-sm flex-1 outline-none"
              style={{ background: '#131628', border: '1px solid #1e2540', color: '#e8eaf0' }}
            />
            {/* Position filter */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #1e2540' }}>
              {ALL_POS.map(p => (
                <button key={p} onClick={() => setPosFilter(p)}
                  className="px-2.5 py-1.5 text-xs font-bold transition-all"
                  style={{
                    background: posFilter === p ? '#1e2540' : 'transparent',
                    color: posFilter === p ? '#e8eaf0' : '#4b5563',
                  }}>
                  {p}
                </button>
              ))}
            </div>
            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: '#131628', border: '1px solid #1e2540', color: '#8b90a7' }}>
              <option value="ovr">By OVR</option>
              <option value="age">By Age</option>
              <option value="salary">By Salary</option>
            </select>
          </div>

          {/* Player list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">

            {/* On-the-clock banner */}
            {isUserTurn && (
              <div className="rounded-xl p-3 mb-2 text-center fade-in-up"
                style={{ background: `${tc}18`, border: `1px solid ${tc}35` }}>
                <div className="text-sm font-black" style={{ color: tc }}>⭐ You're on the clock — pick a player</div>
              </div>
            )}
            {!isUserTurn && (
              <div className="rounded-lg px-3 py-2 mb-2 flex items-center gap-2"
                style={{ background: '#131628' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                <div className="text-xs font-semibold flex-1" style={{ color: '#6b7280' }}>
                  {currentTeam?.abbreviation} is picking…
                </div>
                <button onClick={() => {
                  // Pick best available for the current CPU team
                  const best = fd.pool.slice().sort((a, b) =>
                    (league.players[b]?.ratings.overall ?? 0) - (league.players[a]?.ratings.overall ?? 0)
                  )[0];
                  if (best) fantasyDraftPick(best);
                }} className="text-xs underline hover:opacity-80" style={{ color: tc }}>
                  Skip
                </button>
              </div>
            )}

            {poolPlayers.map((p, i) => {
              const canPick = isUserTurn;
              return (
                <div key={p.id}
                  onClick={() => canPick && fantasyDraftPick(p.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: '#0f1120',
                    border: '1px solid #1a1e35',
                    cursor: canPick ? 'pointer' : 'default',
                    opacity: canPick ? 1 : 0.75,
                  }}
                  onMouseEnter={e => { if (canPick) (e.currentTarget as HTMLElement).style.background = '#151830'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0f1120'; }}>

                  <div className="w-6 text-center text-xs font-bold" style={{ color: '#4b5563' }}>{i + 1}</div>
                  <PlayerPhoto seed={p.photoSeed} size={32} name={p.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{p.name}</div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      {p.position} · Age {p.age} · ${p.contract.salary.toFixed(1)}M
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: '#1a1e35', color: '#6b7280' }}>
                      {p.tendency ?? '—'}
                    </div>
                    <OverallBadge value={p.ratings.overall} />
                    {canPick && (
                      <div className="text-xs px-2 py-1 rounded-lg font-bold"
                        style={{ background: `${tc}25`, color: tc }}>
                        Draft
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {poolPlayers.length === 0 && (
              <div className="text-center py-12" style={{ color: '#4b5563' }}>
                No players match your filter
              </div>
            )}
          </div>
        </div>

        {/* Right: Draft Board / Recent Picks */}
        <div className="w-56 shrink-0 flex flex-col border-l overflow-y-auto" style={{ borderColor: '#1a1e35', background: '#0d0f1c' }}>
          <div className="px-3 py-2.5 border-b" style={{ borderColor: '#1a1e35' }}>
            <div className="text-xs font-black uppercase tracking-widest" style={{ color: '#6b7280' }}>Recent Picks</div>
          </div>
          <div className="flex-1 p-2 space-y-1">
            {recentPicks.map((pick, i) => {
              const player = league.players[pick.playerId];
              const team = league.teams[pick.teamId];
              const col = visibleColor(team?.primaryColor ?? '#6c63ff');
              const isMyPick = pick.teamId === league.userTeamId;
              return (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{ background: isMyPick ? `${tc}12` : '#131628', border: isMyPick ? `1px solid ${tc}25` : '1px solid transparent' }}>
                  <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background: col + '25', color: col }}>
                    {team?.abbreviation?.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{player?.name ?? '—'}</div>
                    <div className="text-xs" style={{ color: '#4b5563' }}>{player?.position} · {player?.ratings.overall}</div>
                  </div>
                </div>
              );
            })}
            {recentPicks.length === 0 && (
              <div className="text-xs text-center py-4" style={{ color: '#4b5563' }}>Draft just started</div>
            )}
          </div>

          {/* Team pick counts */}
          <div className="border-t p-2" style={{ borderColor: '#1a1e35' }}>
            <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#4b5563' }}>Roster Sizes</div>
            <div className="space-y-1">
              {Object.values(league.teams)
                .sort((a, b) => b.rosterIds.length - a.rosterIds.length)
                .slice(0, 10)
                .map(t => {
                  const col = visibleColor(t.primaryColor);
                  const isUser = t.id === league.userTeamId;
                  return (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
                      <span className="text-xs flex-1 font-semibold" style={{ color: isUser ? tc : '#6b7280' }}>
                        {t.abbreviation}
                      </span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(t.rosterIds.length, 13) }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: isUser ? tc : col + '88' }} />
                        ))}
                      </div>
                      <span className="text-xs w-4 text-right" style={{ color: '#4b5563' }}>{t.rosterIds.length}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
