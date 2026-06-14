import { useState } from 'react';
import { useLeagueStore } from '../store/leagueStore';
import type { Team, Player } from '../types';
import { getTeamCategory } from '../utils/teamCategory';
import { usePlayerModal } from '../contexts/PlayerModalContext';
import PlayerPhoto from '../components/PlayerPhoto';
import { OverallBadge } from '../components/RatingBar';
import { injurySeverityLabel } from '../engine/injuryEngine';
import { moraleLabel } from '../engine/progressionEngine';

// ── Team detail panel ────────────────────────────────────────────────────────

function TeamPanel({ team, players, teams, userTeamId, schedule, onClose }: {
  team: Team;
  players: Record<string, Player>;
  teams: Record<string, Team>;
  userTeamId: string;
  schedule: import('../types').GameResult[];
  onClose: () => void;
}) {
  const { openPlayer } = usePlayerModal();
  const roster = team.rosterIds.map(id => players[id]).filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);
  const cat = getTeamCategory(team, players);
  const gp = team.stats.wins + team.stats.losses;
  const ppg  = gp > 0 ? (team.stats.pointsFor / gp).toFixed(1) : '—';
  const opp  = gp > 0 ? (team.stats.pointsAgainst / gp).toFixed(1) : '—';
  const diff = gp > 0 ? ((team.stats.pointsFor - team.stats.pointsAgainst) / gp).toFixed(1) : '—';
  const avgOvr = roster.length ? Math.round(roster.reduce((s, p) => s + p.ratings.overall, 0) / roster.length) : 0;
  const tc = team.primaryColor;
  const isUser = team.id === userTeamId;

  const last5 = schedule
    .filter(g => (g.homeTeamId === team.id || g.awayTeamId === team.id) && g.played)
    .slice(-5)
    .reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden fade-in-up"
        style={{ background: '#0d0f17', border: `1px solid ${tc}44`, maxHeight: '88vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative overflow-hidden px-5 py-4"
          style={{ background: `linear-gradient(135deg, ${tc}28, #12151e)`, borderBottom: `1px solid ${tc}33` }}>
          <div className="absolute top-0 right-0 w-40 h-full opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at right, ${tc}, transparent)` }} />
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ background: tc, boxShadow: `0 0 8px ${tc}88` }} />
                <span className="text-lg font-black text-white">{team.city} {team.name}</span>
                {isUser && <span className="text-xs px-1.5 py-0.5 rounded font-black" style={{ background: tc + '33', color: tc }}>YOU</span>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-black text-white">{team.stats.wins}–{team.stats.losses}</span>
                <span style={{ color: '#6b7280' }}>{team.conference} · {team.division}</span>
                <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-xl leading-none hover:opacity-60 transition-opacity" style={{ color: '#6b7280' }}>✕</button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-px" style={{ background: '#1e2235' }}>
          {[
            { label: 'Team OVR', value: avgOvr },
            { label: 'PPG', value: ppg },
            { label: 'OPP PPG', value: opp },
            { label: 'DIFF', value: gp > 0 ? (Number(diff) >= 0 ? `+${diff}` : diff) : '—' },
          ].map(s => (
            <div key={s.label} className="py-3 text-center" style={{ background: '#0d0f17' }}>
              <div className="text-base font-black text-white">{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Last 5 games */}
        {last5.length > 0 && (
          <div className="px-5 py-3 border-b" style={{ borderColor: '#1e2235' }}>
            <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Last {last5.length}</div>
            <div className="space-y-1">
              {last5.map(g => {
                const isHome = g.homeTeamId === team.id;
                const teamScore = isHome ? g.homeScore : g.awayScore;
                const oppScore = isHome ? g.awayScore : g.homeScore;
                const oppId = isHome ? g.awayTeamId : g.homeTeamId;
                const won = teamScore > oppScore;
                return (
                  <div key={g.id} className="flex items-center gap-3 text-xs">
                    <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: won ? '#14532d' : '#450a0a', color: won ? '#4ade80' : '#f87171' }}>
                      {won ? 'W' : 'L'}
                    </span>
                    <span className="font-mono font-bold text-white">{teamScore}–{oppScore}</span>
                    <span style={{ color: '#6b7280' }}>{isHome ? 'vs' : '@'} {teams[oppId]?.abbreviation ?? oppId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Salary info */}
        <div className="px-5 py-3 flex items-center gap-4 text-xs border-b" style={{ borderColor: '#1e2235' }}>
          <span style={{ color: '#6b7280' }}>Salary</span>
          <span className="font-bold text-white">${team.salary.toFixed(2)}M</span>
          <span style={{ color: '#6b7280' }}>Cap Space</span>
          <span className="font-bold" style={{ color: team.capSpace > 0 ? '#4ade80' : '#f87171' }}>${team.capSpace.toFixed(2)}M</span>
          <span style={{ color: '#6b7280' }}>Avg OVR</span>
          <span className="font-bold text-white">{avgOvr}</span>
        </div>

        {/* Roster */}
        <div className="px-5 py-4">
          <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: tc }}>
            Roster ({roster.length})
          </div>
          <div className="space-y-1.5">
            {roster.map((p, i) => {
              const inj = p.injuryGames > 0 ? injurySeverityLabel(p.injuryGames) : null;
              const mor = moraleLabel(p.morale ?? 75);
              const isExpiring = p.contract.yearsLeft <= 1;
              return (
                <button key={p.id} onClick={() => openPlayer(p.id)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-all hover:opacity-80 active:scale-99"
                  style={{ background: i < 5 ? '#12151e' : '#0d0f17', border: '1px solid #1e2235' }}>
                  <span className="text-xs w-4 shrink-0 font-bold" style={{ color: '#4b5563' }}>{i + 1}</span>
                  <PlayerPhoto seed={p.photoSeed} size={32} name={p.name} teamColor={tc} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">{p.name}</span>
                      {inj && <span className="text-xs px-1 py-0 rounded font-bold" style={{ background: inj.bg, color: inj.color }}>{inj.label}</span>}
                      {isExpiring && !inj && <span className="text-xs px-1 py-0 rounded font-bold" style={{ background: '#92400e22', color: '#fcd34d' }}>EXP</span>}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: '#6b7280' }}>
                      <span>{p.position}</span>
                      <span>·</span>
                      <span>Age {p.age}</span>
                      <span>·</span>
                      <span>${p.contract.salary.toFixed(1)}M</span>
                      <span style={{ color: mor.color }}>{mor.label}</span>
                    </div>
                  </div>
                  <OverallBadge value={p.ratings.overall} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Standings table ──────────────────────────────────────────────────────────

function StandingsTable({ teams, userTeamId, title, players, onSelectTeam }: {
  teams: Team[];
  userTeamId: string;
  title: string;
  players: Record<string, Player>;
  onSelectTeam: (team: Team) => void;
}) {
  const sorted = [...teams].sort((a, b) => {
    if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
    return (b.stats.pointsFor - b.stats.pointsAgainst) - (a.stats.pointsFor - a.stats.pointsAgainst);
  });

  const leaderWins = sorted[0]?.stats.wins ?? 0;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2235' }}>
      <div className="px-5 py-3" style={{ background: '#12151e' }}>
        <div className="font-bold text-white">{title}</div>
      </div>
      <table className="w-full">
        <thead>
          <tr style={{ background: '#0d1018' }}>
            {['#', 'Team', 'W', 'L', 'W%', 'GB', 'PPG', 'OPP', 'STK'].map(h => (
              <th key={h} className="text-left text-xs font-semibold py-2 px-3 uppercase tracking-wider" style={{ color: '#8b90a7' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, i) => {
            const cat = getTeamCategory(team, players);
            const gp = team.stats.wins + team.stats.losses;
            const winPct = gp > 0 ? (team.stats.wins / gp).toFixed(3) : '.000';
            const gb = i === 0 ? '—' : ((leaderWins - team.stats.wins) / 1).toFixed(1);
            const ppg = gp > 0 ? (team.stats.pointsFor / gp).toFixed(1) : '—';
            const opp = gp > 0 ? (team.stats.pointsAgainst / gp).toFixed(1) : '—';
            const streak = team.stats.streak;
            const streakStr = streak === 0 ? '—' : streak > 0 ? `W${streak}` : `L${Math.abs(streak)}`;
            const isUser = team.id === userTeamId;
            const isPlayoff = i < 8;

            return (
              <tr key={team.id} className="border-b cursor-pointer transition-colors hover:bg-white/5"
                style={{ borderColor: '#1e2235', background: isUser ? '#1a1d2e' : 'transparent' }}
                onClick={() => onSelectTeam(team)}>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs" style={{ color: isPlayoff ? '#6c63ff' : '#8b90a7' }}>{i + 1}</span>
                    {isPlayoff && <span className="text-xs" style={{ color: '#6c63ff' }}>•</span>}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: team.primaryColor }} />
                    <span className={`text-sm ${isUser ? 'font-bold text-white' : 'text-gray-300'}`}>{team.abbreviation}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold hidden xl:inline"
                      style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    {isUser && <span className="text-xs px-1 rounded" style={{ background: '#6c63ff22', color: '#6c63ff' }}>YOU</span>}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-sm font-bold text-white">{team.stats.wins}</td>
                <td className="py-2.5 px-3 text-sm text-white">{team.stats.losses}</td>
                <td className="py-2.5 px-3 text-sm" style={{ color: '#8b90a7' }}>{winPct}</td>
                <td className="py-2.5 px-3 text-sm" style={{ color: '#8b90a7' }}>{gb}</td>
                <td className="py-2.5 px-3 text-sm text-white">{ppg}</td>
                <td className="py-2.5 px-3 text-sm" style={{ color: '#8b90a7' }}>{opp}</td>
                <td className="py-2.5 px-3">
                  <span className="text-xs font-bold" style={{ color: streak > 0 ? '#4ade80' : streak < 0 ? '#f87171' : '#8b90a7' }}>
                    {streakStr}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-5 py-2" style={{ background: '#0d1018' }}>
        <span className="text-xs" style={{ color: '#6c63ff' }}>• Playoff position · Click any row to view team</span>
      </div>
    </div>
  );
}

// ── Playoff Picture ───────────────────────────────────────────────────────────

function PlayoffPicture({ teams, conf, userTeamId, onSelectTeam }: {
  teams: Team[];
  conf: string;
  userTeamId: string;
  players?: Record<string, Player>;
  onSelectTeam: (t: Team) => void;
}) {
  const sorted = [...teams].sort((a, b) => {
    if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
    return (b.stats.pointsFor - b.stats.pointsAgainst) - (a.stats.pointsFor - a.stats.pointsAgainst);
  });

  const gamesLeft = (t: Team) => 82 - t.stats.wins - t.stats.losses;
  const leaderWins = sorted[0]?.stats.wins ?? 0;

  function getStatus(team: Team, rank: number): { label: string; color: string; bg: string } {
    if (rank <= 6) return { label: 'Clinched', color: '#4ade80', bg: '#14532d22' };
    if (rank === 7 || rank === 8) return { label: 'Play-In', color: '#facc15', bg: '#78350f22' };
    if (rank === 9 || rank === 10) return { label: 'Play-In', color: '#fb923c', bg: '#78350f11' };
    // Check if they can still make it
    const behindEighth = leaderWins - (sorted[7]?.stats.wins ?? 0);
    const gl = gamesLeft(team);
    return behindEighth > gl
      ? { label: 'Eliminated', color: '#f87171', bg: '#450a0a22' }
      : { label: 'Bubble', color: '#a78bfa', bg: '#4c1d9511' };
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2235' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#12151e' }}>
        <div className="font-bold text-white">{conf} Conference</div>
        <div className="text-xs" style={{ color: '#6b7280' }}>Top 6 clinch · 7–10 play-in</div>
      </div>
      <div className="divide-y" style={{ borderColor: '#1e2235' }}>
        {sorted.map((team, i) => {
          const gp = team.stats.wins + team.stats.losses;
          const gb = i === 0 ? '—' : (((sorted[0].stats.wins - team.stats.wins) + (team.stats.losses - sorted[0].stats.losses)) / 2).toFixed(1);
          const isUser = team.id === userTeamId;
          const status = getStatus(team, i + 1);
          const divider = i === 5 || i === 9;
          return (
            <div key={team.id}>
              {divider && (
                <div className="px-5 py-1 text-xs font-bold" style={{ background: '#0d0f17', color: '#6b7280', borderTop: '2px dashed #2e3248' }}>
                  {i === 5 ? '— Play-In Tournament —' : '— Eliminated Zone —'}
                </div>
              )}
              <button
                onClick={() => onSelectTeam(team)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5"
                style={{ background: isUser ? '#1a1d2e' : 'transparent' }}
              >
                <span className="text-sm font-black w-6 shrink-0" style={{ color: i < 6 ? '#6c63ff' : '#6b7280' }}>{i + 1}</span>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: team.primaryColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${isUser ? 'text-white' : 'text-gray-300'}`}>{team.city} {team.name}</span>
                    {isUser && <span className="text-xs px-1 rounded" style={{ background: '#6c63ff22', color: '#6c63ff' }}>YOU</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{team.stats.wins}–{team.stats.losses} · {gp > 0 ? (team.stats.wins / gp * 100).toFixed(0) : 0}% · GB: {gb} · GL: {82 - gp}</div>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ color: status.color, background: status.bg }}>{status.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type StandingsTab = 'conference' | 'playoff' | 'division';

export default function Standings() {
  const league = useLeagueStore(s => s.league);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [tab, setTab] = useState<StandingsTab>('conference');
  if (!league) return null;

  const allTeams = Object.values(league.teams);
  const eastTeams = allTeams.filter(t => t.conference === 'East');
  const westTeams = allTeams.filter(t => t.conference === 'West');

  // Division groupings
  const divisionMap: Record<string, Team[]> = {};
  allTeams.forEach(t => {
    if (!divisionMap[t.division]) divisionMap[t.division] = [];
    divisionMap[t.division].push(t);
  });

  const tabs: { key: StandingsTab; label: string }[] = [
    { key: 'conference', label: 'Conference' },
    { key: 'playoff',    label: 'Playoff Picture' },
    { key: 'division',   label: 'Division' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Standings</h1>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#2e3248' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-sm font-bold transition-colors"
              style={{ background: tab === t.key ? '#6c63ff' : '#12151e', color: tab === t.key ? '#fff' : '#8b90a7' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'conference' && (
        <div className="grid grid-cols-2 gap-6">
          <StandingsTable teams={eastTeams} userTeamId={league.userTeamId} title="Eastern Conference" players={league.players} onSelectTeam={setSelectedTeam} />
          <StandingsTable teams={westTeams} userTeamId={league.userTeamId} title="Western Conference" players={league.players} onSelectTeam={setSelectedTeam} />
        </div>
      )}

      {tab === 'playoff' && (
        <div className="grid grid-cols-2 gap-6">
          <PlayoffPicture teams={eastTeams} conf="Eastern" userTeamId={league.userTeamId} players={league.players} onSelectTeam={setSelectedTeam} />
          <PlayoffPicture teams={westTeams} conf="Western" userTeamId={league.userTeamId} players={league.players} onSelectTeam={setSelectedTeam} />
        </div>
      )}

      {tab === 'division' && (
        <div className="grid grid-cols-2 gap-6">
          {Object.entries(divisionMap).sort().map(([div, divTeams]) => (
            <StandingsTable key={div} teams={divTeams} userTeamId={league.userTeamId} title={div} players={league.players} onSelectTeam={setSelectedTeam} />
          ))}
        </div>
      )}

      {selectedTeam && (
        <TeamPanel
          team={selectedTeam}
          players={league.players}
          teams={league.teams}
          userTeamId={league.userTeamId}
          schedule={league.schedule ?? []}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}
