import { useState, useEffect, useRef } from 'react';
import type { DevelopmentEntry } from '../types';
import { useLeagueStore, calcGMTier, cancelSim } from '../store/leagueStore';
import type { SimType } from '../store/leagueStore';
import PlayerPhoto from '../components/PlayerPhoto';
import { OverallBadge } from '../components/RatingBar';
import { getTeamCategory } from '../utils/teamCategory';
import { useRipple } from '../components/Ripple';
import { usePlayerModal } from '../contexts/PlayerModalContext';
import { injurySeverityLabel } from '../engine/injuryEngine';
import type { GameBoxScore, LeagueState } from '../types';
import { TRADE_DEADLINE_DAY, REGULAR_SEASON_DAYS } from '../engine/playoffEngine';
import BoxScoreModal from '../components/BoxScoreModal';

// ── Helpers ────────────────────────────────────────────────────────────────────
function visibleColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 60 ? '#a78bfa' : hex;
}

// ── Scout report engine ────────────────────────────────────────────────────────
const SCOUTS = ['Ray Holloway', 'Marcus Bell', 'Dee Santos', 'Kat Okafor', 'Jim Reyes'];

interface ScoutTip {
  type: 'trade' | 'draft' | 'warning' | 'info';
  scout: string;
  headline: string;
  body: string;
  accentColor: string;
  player?: { name: string; photoSeed: number; overall: number; age?: number; position?: string; secondaryPosition?: string; teamColor?: string };
}

function generateScoutTips(league: LeagueState): ScoutTip[] {
  const tips: ScoutTip[] = [];
  const userTeam = league.teams[league.userTeamId];
  const roster = userTeam.rosterIds.map(id => league.players[id]).filter(Boolean);
  const otherPlayers = Object.values(league.players).filter(p => p.teamId && p.teamId !== league.userTeamId);

  const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
  const posAvg: Record<string, number> = {};
  for (const pos of POSITIONS) {
    const atPos = roster.filter(p => p.position === pos);
    posAvg[pos] = atPos.length ? atPos.reduce((s, p) => s + p.ratings.overall, 0) / atPos.length : 40;
  }
  const posRanked = [...POSITIONS].sort((a, b) => posAvg[a] - posAvg[b]);
  const weakestPos = posRanked[0];
  const secondPos = posRanked[1];

  const posTargets = otherPlayers
    .filter(p => p.position === weakestPos)
    .filter(p => {
      const t = league.teams[p.teamId!];
      const best = t.rosterIds.map(id => league.players[id]).filter(Boolean)
        .sort((a, b) => b.ratings.overall - a.ratings.overall)[0];
      return best?.id !== p.id;
    })
    .sort((a, b) => b.ratings.overall - a.ratings.overall);

  if (posTargets.length > 0) {
    const target = posTargets[0];
    const tTeam = league.teams[target.teamId!];
    const tCat = getTeamCategory(tTeam, league.players);
    tips.push({
      type: 'trade', scout: SCOUTS[0],
      headline: `${target.name} fills your ${weakestPos} need`,
      body: `Your ${weakestPos} depth is your weakest unit (avg ${posAvg[weakestPos].toFixed(0)} OVR). ${target.name} (${target.ratings.overall} OVR, Age ${target.age}) is one of the better available ${weakestPos}s. ${tTeam.city} is a ${tCat.label} squad.`,
      accentColor: '#6c63ff',
      player: { name: target.name, photoSeed: target.photoSeed, overall: target.ratings.overall, age: target.age, position: target.position, secondaryPosition: target.secondaryPosition, teamColor: tTeam.primaryColor },
    });
  }

  const valueTargets = otherPlayers
    .filter(p => p.ratings.overall >= 74 && p.contract.salary <= 9 && p.age <= 28)
    .sort((a, b) => (b.ratings.overall / b.contract.salary) - (a.ratings.overall / a.contract.salary));
  if (valueTargets.length > 0) {
    const vp = valueTargets[0];
    const vpTeam = league.teams[vp.teamId!];
    tips.push({
      type: 'trade', scout: SCOUTS[1],
      headline: `${vp.name} is severely underpaid — buy low`,
      body: `${vp.name} ($${vp.contract.salary.toFixed(2)}M / ${vp.contract.yearsLeft}yr) is producing at a ${vp.ratings.overall} OVR level for below-market money. His contract makes him one of the best value acquisitions available.`,
      accentColor: '#34d399',
      player: { name: vp.name, photoSeed: vp.photoSeed, overall: vp.ratings.overall, age: vp.age, position: vp.position, secondaryPosition: vp.secondaryPosition, teamColor: vpTeam.primaryColor },
    });
  }

  const youngStars = otherPlayers.filter(p => p.age <= 23 && p.ratings.overall >= 71).sort((a, b) => b.ratings.overall - a.ratings.overall);
  if (youngStars.length > 0) {
    const ys = youngStars[0];
    const ysTeam = league.teams[ys.teamId!];
    const ysCat = getTeamCategory(ysTeam, league.players);
    tips.push({
      type: 'trade', scout: SCOUTS[2],
      headline: `${ys.name} could be a franchise cornerstone`,
      body: `At just ${ys.age} with a ${ys.ratings.overall} OVR, ${ys.name} has legitimate star ceiling. ${ysTeam.city} is a ${ysCat.label} squad${ysCat.label === 'Rebuilding' || ysCat.label === 'Tanking' ? ' — they may part with him for picks or an expiring deal' : ', but roster changes could make him available'}.`,
      accentColor: '#f59e0b',
      player: { name: ys.name, photoSeed: ys.photoSeed, overall: ys.ratings.overall, age: ys.age, position: ys.position, secondaryPosition: ys.secondaryPosition, teamColor: ysTeam.primaryColor },
    });
  }

  if (tips.length >= 3 && secondPos !== weakestPos) {
    const sec = otherPlayers.filter(p => p.position === secondPos && p.ratings.overall >= 72).sort((a, b) => b.ratings.overall - a.ratings.overall);
    if (sec.length > 0) {
      const sp = sec[0];
      const spTeam = league.teams[sp.teamId!];
      tips.push({
        type: 'trade', scout: SCOUTS[3],
        headline: `Watch ${sp.name} — ${secondPos} upgrade available`,
        body: `Your ${secondPos} corps (avg ${posAvg[secondPos].toFixed(0)} OVR) is another soft spot. ${sp.name} on ${spTeam.city} is averaging well above contract value.`,
        accentColor: '#60a5fa',
        player: { name: sp.name, photoSeed: sp.photoSeed, overall: sp.ratings.overall, age: sp.age, position: sp.position, secondaryPosition: sp.secondaryPosition, teamColor: spTeam.primaryColor },
      });
    }
  }

  const agingStars = roster.filter(p => p.age >= 32 && p.ratings.overall >= 74).sort((a, b) => b.age - a.age);
  if (agingStars.length > 0) {
    const ap = agingStars[0];
    tips.push({
      type: 'warning', scout: SCOUTS[4],
      headline: `${ap.name}'s trade value peaks now`,
      body: `${ap.name} is ${ap.age} years old with ${ap.contract.yearsLeft}yr remaining. Players at this age typically decline over the next 2 seasons. Selling high now may be the smart play.`,
      accentColor: '#f87171',
      player: { name: ap.name, photoSeed: ap.photoSeed, overall: ap.ratings.overall, age: ap.age, position: ap.position, secondaryPosition: ap.secondaryPosition, teamColor: userTeam.primaryColor },
    });
  }

  const allTeamsByRecord = Object.values(league.teams).sort((a, b) => a.stats.wins - b.stats.wins);
  const projectedPick = allTeamsByRecord.findIndex(t => t.id === league.userTeamId) + 1;
  if (league.draftProspects && league.draftProspects.length > 0) {
    const topN = league.draftProspects.slice(0, Math.min(projectedPick + 2, league.draftProspects.length));
    const bestNearPick = topN[topN.length - 1] ?? topN[0];
    if (bestNearPick) {
      tips.push({
        type: 'draft', scout: SCOUTS[0],
        headline: `Draft target: ${bestNearPick.name} (near your pick)`,
        body: `${bestNearPick.name} — ${bestNearPick.position}, Age ${bestNearPick.age}, scouted at ${bestNearPick.scoutedRating} OVR. ${bestNearPick.scoutedRating >= 80 ? 'Elite upside — potential franchise cornerstone.' : bestNearPick.scoutedRating >= 70 ? 'Starter-caliber prospect.' : 'Rotation player with upside.'} Strong fit for your ${weakestPos} need.`,
        accentColor: '#6c63ff',
        player: { name: bestNearPick.name, photoSeed: bestNearPick.photoSeed, overall: bestNearPick.scoutedRating, age: bestNearPick.age, position: bestNearPick.position },
      });
    }
  } else {
    tips.push({
      type: 'draft', scout: SCOUTS[3],
      headline: `Draft outlook: Projected at pick #${projectedPick}`,
      body: `Current standings put you at the #${projectedPick} lottery position. ${projectedPick <= 4 ? 'A top-4 pick is franchise-altering.' : projectedPick <= 10 ? 'Mid-lottery range — expect quality starters.' : projectedPick <= 20 ? 'Late lottery — scout for upside over readiness.' : 'Late first round — focus on value picks.'}`,
      accentColor: '#6c63ff',
    });
  }

  return tips.slice(0, 5);
}

function ScoutCard({ tip, delay = 0, tc: _tc }: { tip: ScoutTip; delay?: number; tc: string }) {
  const typeLabel = tip.type === 'trade' ? 'Trade' : tip.type === 'draft' ? 'Draft' : tip.type === 'warning' ? 'Alert' : 'Info';
  return (
    <div className="rounded-xl p-4 fade-in-up" style={{ background: '#0f1120', border: `1px solid #1e2540`, animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white leading-snug">{tip.headline}</div>
          <div className="text-xs mt-0.5" style={{ color: tip.accentColor }}>Scout: {tip.scout}</div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-bold"
          style={{ background: tip.accentColor + '18', color: tip.accentColor, border: `1px solid ${tip.accentColor}30` }}>
          {typeLabel}
        </span>
      </div>
      {tip.player && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3" style={{ background: '#131628' }}>
          <PlayerPhoto seed={tip.player.photoSeed} size={28} name={tip.player.name} teamColor={tip.player.teamColor} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{tip.player.name}</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>
              {tip.player.position}{tip.player.secondaryPosition ? `/${tip.player.secondaryPosition}` : ''}{tip.player.age ? ` · Age ${tip.player.age}` : ''}
            </div>
          </div>
          <OverallBadge value={tip.player.overall} />
        </div>
      )}
      <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{tip.body}</p>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const league = useLeagueStore(s => s.league);
  const startNewSeason = useLeagueStore(s => s.startNewSeason);
  const advanceSim = useLeagueStore(s => s.advanceSim);
  const isSimming = useLeagueStore(s => s.isSimming);
  const stopSim = () => { cancelSim(); useLeagueStore.setState({ isSimming: false }); };
  const { addRipple, rippleEls } = useRipple();
  const { addRipple: addSimRipple, rippleEls: simRippleEls } = useRipple();
  const { openPlayer } = usePlayerModal();
  const [selectedBoxScore, setSelectedBoxScore] = useState<GameBoxScore | null>(null);
  const [devReport, setDevReport] = useState<DevelopmentEntry[] | null>(null);
  const prevPhase = useRef(league?.phase);
  useEffect(() => {
    if (prevPhase.current === 'offseason' && league?.phase === 'regular' && league.developmentLog?.length) {
      setDevReport(league.developmentLog);
    }
    prevPhase.current = league?.phase;
  }, [league?.phase, league?.developmentLog]);
  if (!league) return null;

  const userTeam = league.teams[league.userTeamId];
  const tc = visibleColor(userTeam.primaryColor);
  const roster = userTeam.rosterIds.map(id => league.players[id]).filter(Boolean).sort((a, b) => b.ratings.overall - a.ratings.overall);
  const star = roster.filter(p => p.seasonStats.gamesPlayed > 0).sort((a, b) =>
    (b.seasonStats.points / b.seasonStats.gamesPlayed) - (a.seasonStats.points / a.seasonStats.gamesPlayed)
  )[0] ?? roster[0];
  const recentGames = league.schedule
    .filter(g => (g.homeTeamId === league.userTeamId || g.awayTeamId === league.userTeamId) && g.played)
    .slice(-5).reverse();

  const gp = userTeam.stats.wins + userTeam.stats.losses;
  const ppg = gp > 0 ? (userTeam.stats.pointsFor / gp).toFixed(1) : '—';
  const oppg = gp > 0 ? (userTeam.stats.pointsAgainst / gp).toFixed(1) : '—';
  const streak = userTeam.stats.streak;
  const streakStr = streak === 0 ? '—' : streak > 0 ? `W${streak}` : `L${Math.abs(streak)}`;
  const streakColor = streak > 0 ? '#4ade80' : streak < 0 ? '#f87171' : '#6b7280';

  const daysLeft = Math.max(0, REGULAR_SEASON_DAYS - league.week + 1);
  const pastDeadline = league.week > TRADE_DEADLINE_DAY;
  const seasonProgress = Math.round(((league.week - 1) / REGULAR_SEASON_DAYS) * 100);

  const eastStandings = Object.values(league.teams).filter(t => t.conference === 'East').sort((a, b) => b.stats.wins - a.stats.wins).slice(0, 5);
  const westStandings = Object.values(league.teams).filter(t => t.conference === 'West').sort((a, b) => b.stats.wins - a.stats.wins).slice(0, 5);
  const scoutTips = generateScoutTips(league);

  const chem = userTeam.chemistry ?? 70;
  const chemColor = chem >= 75 ? '#4ade80' : chem >= 55 ? '#facc15' : '#f87171';
  const gm = league.gmRating;
  const gmTierLabel = gm ? calcGMTier(gm.score) : 'Struggling';
  const gmTierColor = gm ? (gm.score >= 78 ? '#fcd34d' : gm.score >= 60 ? '#f59e0b' : gm.score >= 40 ? '#a78bfa' : gm.score >= 20 ? '#60a5fa' : '#6b7280') : '#6b7280';

  // Next game
  const nextGame = league.phase === 'regular'
    ? league.schedule.find(g => !g.played && (g.homeTeamId === league.userTeamId || g.awayTeamId === league.userTeamId))
    : null;
  const nextOppTeam = nextGame ? league.teams[nextGame.homeTeamId === league.userTeamId ? nextGame.awayTeamId : nextGame.homeTeamId] : null;
  const nextOppRoster = nextOppTeam ? nextOppTeam.rosterIds.map(id => league.players[id]).filter(Boolean) : [];
  const userOvr = roster.length ? Math.round(roster.slice(0, 8).reduce((s, p) => s + p.ratings.overall, 0) / Math.min(8, roster.length)) : 0;
  const oppOvr = nextOppRoster.length ? Math.round(nextOppRoster.slice(0, 8).reduce((s, p) => s + p.ratings.overall, 0) / Math.min(8, nextOppRoster.length)) : 0;

  return (
    <div className="space-y-4">

      {/* ── Offseason banner ── */}
      {league.phase === 'offseason' && (
        <div className="rounded-2xl p-5 flex items-center justify-between fade-in-up relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${tc}20, #0f1120)`, border: `1px solid ${tc}35` }}>
          <div className="absolute right-0 top-0 w-48 h-full pointer-events-none"
            style={{ background: `radial-gradient(ellipse at right, ${tc}18, transparent)` }} />
          <div>
            <div className="text-base font-bold text-white">Offseason · {league.season} Season Complete</div>
            <div className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Contracts expire, players age, free agents hit the market.</div>
          </div>
          <button
            onClick={(e) => { addRipple(e); startNewSeason(); }}
            className="px-5 py-2.5 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95 shrink-0 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${tc}, ${tc}cc)`, color: '#fff' }}>
            {rippleEls}
            Start {league.season + 1} Season →
          </button>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="rounded-2xl overflow-hidden relative fade-in-up"
        style={{ background: `linear-gradient(135deg, ${tc}22 0%, ${tc}0a 45%, #0f1120 100%)`,
                 border: `1px solid ${tc}30` }}>
        <div className="absolute top-0 right-0 w-72 h-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse at right, ${tc}20 0%, transparent 70%)` }} />

        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-6 rounded-full" style={{ background: tc }} />
                <h1 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>
                  {userTeam.city} {userTeam.name}
                </h1>
              </div>
              <div className="ml-3 text-xs" style={{ color: '#6b7280' }}>
                Season {league.season} ·{' '}
                {league.phase === 'regular' ? `Day ${league.week} of 82` : league.phase}
              </div>
            </div>

            <div className="text-right">
              <div className="text-5xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
                {userTeam.stats.wins}–{userTeam.stats.losses}
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <span className="text-sm font-bold" style={{ color: streakColor }}>{streakStr}</span>
                {gp > 0 && <span className="text-xs" style={{ color: '#4b5563' }}>· {((userTeam.stats.wins / gp) * 100).toFixed(0)}% win</span>}
              </div>
            </div>
          </div>

          {/* Recent game pills */}
          {recentGames.length > 0 && (
            <div className="flex items-center gap-1.5 mt-4">
              <span className="text-xs mr-1" style={{ color: '#4b5563' }}>Last 5</span>
              {recentGames.slice(0, 5).map(g => {
                const isHome = g.homeTeamId === league.userTeamId;
                const myScore = isHome ? g.homeScore : g.awayScore;
                const oppScore = isHome ? g.awayScore : g.homeScore;
                const won = myScore > oppScore;
                const boxScore = (league.gameBoxScores ?? {})[g.id];
                const oppId = isHome ? g.awayTeamId : g.homeTeamId;
                const opp = league.teams[oppId];
                return (
                  <button key={g.id} onClick={() => boxScore && setSelectedBoxScore(boxScore)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                    style={{ background: won ? '#16532d' : '#450a0a', color: won ? '#4ade80' : '#f87171' }}
                    title={`${won ? 'W' : 'L'} ${myScore}-${oppScore} vs ${opp?.abbreviation}`}>
                    {won ? 'W' : 'L'}
                    <span className="font-normal opacity-70">{opp?.abbreviation}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Season progress */}
          {league.phase === 'regular' && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#1a1e35' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${seasonProgress}%`, background: `linear-gradient(90deg, ${tc}88, ${tc})` }} />
              </div>
              <div className="text-xs shrink-0" style={{ color: '#4b5563' }}>
                {daysLeft}g left
                {!pastDeadline && league.week <= TRADE_DEADLINE_DAY && (
                  <span style={{ color: '#facc1588' }}> · TDL {TRADE_DEADLINE_DAY - league.week + 1}g</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sim controls ── */}
      {league.phase === 'regular' && (
        <div className="flex items-center gap-2 fade-in-up">
          <button
            onClick={(e) => { addSimRipple(e); stopSim(); setTimeout(() => advanceSim('game'), 0); }}
            disabled={daysLeft === 0}
            className="flex-[2] py-2.5 rounded-xl text-sm font-black transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30 relative overflow-hidden"
            style={{ background: daysLeft > 0 ? `linear-gradient(135deg, ${tc}, ${tc}cc)` : '#1a1e35',
                     color: '#fff', boxShadow: daysLeft > 0 ? `0 4px 16px ${tc}40` : 'none' }}>
            {simRippleEls}
            {isSimming ? `Simulating…` : '▶ Next Game'}
          </button>
          {isSimming
            ? <button onClick={stopSim}
                className="px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-80"
                style={{ background: '#450a0a', color: '#f87171' }}>Stop</button>
            : <>
                {([['week', '+7d'], ['month', '+14d'], ['deadline', 'Deadline'], ['season', 'End']] as [SimType, string][]).map(([type, label]) => {
                  const disabled = (type === 'deadline' && (pastDeadline || daysLeft === 0)) || (type !== 'deadline' && daysLeft === 0);
                  return (
                    <button key={type}
                      onClick={(e) => { addSimRipple(e); advanceSim(type); }}
                      disabled={disabled}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-25"
                      style={{ background: '#131628', color: '#8b90a7', border: '1px solid #1e2540' }}>
                      {label}
                    </button>
                  );
                })}
              </>
          }
        </div>
      )}
      {(league.phase === 'playin' || league.phase === 'playoffs') && (
        <button onClick={(e) => { addSimRipple(e); advanceSim(); }}
          className="w-full py-2.5 rounded-xl text-sm font-black transition-all hover:opacity-90 active:scale-[0.98] fade-in-up"
          style={{ background: league.phase === 'playoffs' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#34d399,#059669)', color: '#fff' }}>
          {simRippleEls}
          {league.phase === 'playoffs' ? 'Sim Playoffs →' : 'Sim Play-In →'}
        </button>
      )}

      {/* ── Quick stats strip ── */}
      <div className="grid grid-cols-4 gap-3 fade-in-up">
        {[
          { label: 'Off PPG', value: ppg, color: tc },
          { label: 'Def PPG', value: oppg, color: '#6b7280' },
          { label: 'Win %', value: gp > 0 ? `${((userTeam.stats.wins / gp) * 100).toFixed(0)}%` : '—', color: '#6b7280' },
          { label: 'Cap Space', value: `$${userTeam.capSpace.toFixed(0)}M`, color: '#6b7280' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: '#0f1120', border: '1px solid #1a1e35' }}>
            <div className="text-xs mb-1" style={{ color: '#4b5563' }}>{s.label}</div>
            <div className="text-xl font-black" style={{ color: s.value === '—' ? '#4b5563' : s.color === tc ? tc : '#e8eaf0' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Main 2-column grid ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Left col: Team Leader + Next Game + Injury */}
        <div className="space-y-4">

          {/* Team Leader */}
          {star && (
            <div className="rounded-xl overflow-hidden fade-in-up" style={{ background: '#0f1120', border: '1px solid #1a1e35' }}>
              <div className="px-4 pt-3 pb-1">
                <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: tc }}>Team Leader</div>
                <button className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity" onClick={() => openPlayer(star.id)}>
                  <PlayerPhoto seed={star.photoSeed} size={44} name={star.name} teamColor={userTeam.primaryColor} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{star.name}</div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>{star.position} · Age {star.age}</div>
                  </div>
                  <OverallBadge value={star.ratings.overall} />
                </button>
              </div>
              {star.seasonStats.gamesPlayed > 0 ? (
                <div className="grid grid-cols-3 gap-px mt-3 border-t" style={{ borderColor: '#1a1e35' }}>
                  {[
                    { v: (star.seasonStats.points / star.seasonStats.gamesPlayed).toFixed(1), l: 'PPG' },
                    { v: (star.seasonStats.rebounds / star.seasonStats.gamesPlayed).toFixed(1), l: 'RPG' },
                    { v: (star.seasonStats.assists / star.seasonStats.gamesPlayed).toFixed(1), l: 'APG' },
                  ].map(s => (
                    <div key={s.l} className="text-center py-2.5">
                      <div className="text-base font-black text-white">{s.v}</div>
                      <div className="text-xs" style={{ color: '#4b5563' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-center pb-3 pt-2" style={{ color: '#4b5563' }}>No stats yet</div>
              )}
            </div>
          )}

          {/* Next Game */}
          {nextGame && nextOppTeam && (
            <div className="rounded-xl p-4 fade-in-up" style={{ background: '#0f1120', border: '1px solid #1a1e35' }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: tc }}>
                Next · Day {nextGame.week}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 text-center">
                  <div className="text-base font-black text-white">{userTeam.abbreviation}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>OVR {userOvr}</div>
                </div>
                <div className="text-center">
                  {(() => {
                    const edge = userOvr - oppOvr;
                    const isHome = nextGame.homeTeamId === league.userTeamId;
                    const lbl = edge >= 5 ? 'Favored' : edge >= 2 ? 'Slight Fav' : edge <= -5 ? 'Underdog' : edge <= -2 ? 'Slight UD' : 'Even';
                    const col = edge >= 2 ? '#4ade80' : edge <= -2 ? '#f87171' : '#f59e0b';
                    return (
                      <>
                        <div className="text-xs font-bold px-2 py-0.5 rounded-full mb-1"
                          style={{ background: col + '18', color: col }}>{lbl}</div>
                        <div className="text-xs" style={{ color: '#4b5563' }}>{isHome ? 'HOME' : 'AWAY'}</div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex-1 text-center">
                  <div className="text-base font-black text-white">{nextOppTeam.abbreviation}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>OVR {oppOvr}</div>
                </div>
              </div>
              {(() => {
                const oppStar = nextOppRoster.sort((a, b) => b.ratings.overall - a.ratings.overall)[0];
                return oppStar ? (
                  <div className="text-xs pt-2 border-t" style={{ borderColor: '#1a1e35', color: '#4b5563' }}>
                    Watch: <button onClick={() => openPlayer(oppStar.id)} className="font-bold text-white hover:underline">{oppStar.name}</button>
                    <span className="ml-1">({oppStar.ratings.overall} OVR)</span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Injury report */}
          {(() => {
            const injured = roster.filter(p => p.injuryGames > 0).sort((a, b) => b.injuryGames - a.injuryGames);
            if (injured.length === 0) return null;
            return (
              <div className="rounded-xl p-4 fade-in-up" style={{ background: '#0f1120', border: '1px solid #f8717125' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f87171' }}>Injury Report</div>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#450a0a', color: '#f87171' }}>{injured.length}</span>
                </div>
                <div className="space-y-1.5">
                  {injured.slice(0, 3).map(p => {
                    const sev = injurySeverityLabel(p.injuryGames);
                    return (
                      <button key={p.id} onClick={() => openPlayer(p.id)}
                        className="flex items-center gap-2 w-full text-left rounded-lg px-2 py-1.5 hover:opacity-80"
                        style={{ background: '#131628' }}>
                        <PlayerPhoto seed={p.photoSeed} size={28} name={p.name} teamColor={userTeam.primaryColor} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                          <div className="text-xs" style={{ color: sev.color }}>{p.injuryType ?? 'Injury'}</div>
                        </div>
                        <div className="text-xs font-black shrink-0" style={{ color: sev.color }}>{p.injuryGames}g</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Middle col: Recent Games + News */}
        <div className="space-y-4">
          {/* Recent Games */}
          <div className="rounded-xl p-4 fade-in-up" style={{ background: '#0f1120', border: '1px solid #1a1e35' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: tc }}>Recent Games</div>
            {recentGames.length === 0 ? (
              <div className="text-sm text-center py-8" style={{ color: '#4b5563' }}>No games played yet</div>
            ) : (
              <div className="space-y-1">
                {recentGames.map(g => {
                  const isHome = g.homeTeamId === league.userTeamId;
                  const oppId = isHome ? g.awayTeamId : g.homeTeamId;
                  const opp = league.teams[oppId];
                  const myScore = isHome ? g.homeScore : g.awayScore;
                  const oppScore = isHome ? g.awayScore : g.homeScore;
                  const won = myScore > oppScore;
                  const boxScore = (league.gameBoxScores ?? {})[g.id];
                  return (
                    <div key={g.id}
                      onClick={() => boxScore && setSelectedBoxScore(boxScore)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 transition-all"
                      style={{ background: '#131628', cursor: boxScore ? 'pointer' : 'default' }}
                      onMouseEnter={e => { if (boxScore) (e.currentTarget as HTMLElement).style.background = '#1a1e35'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#131628'; }}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded text-xs font-black flex items-center justify-center"
                          style={{ background: won ? '#16532d' : '#450a0a', color: won ? '#4ade80' : '#f87171' }}>
                          {won ? 'W' : 'L'}
                        </span>
                        <span className="text-sm" style={{ color: '#c5c9d8' }}>
                          {isHome ? 'vs' : '@'} <span className="font-bold">{opp?.abbreviation}</span>
                        </span>
                      </div>
                      <span className="font-black text-sm text-white">{myScore}–{oppScore}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* League News */}
          <div className="rounded-xl p-4 fade-in-up" style={{ background: '#0f1120', border: '1px solid #1a1e35' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: tc }}>League News</div>
            <div className="space-y-2.5">
              {league.news.slice(0, 5).map(item => (
                <div key={item.id} className="text-xs border-b pb-2 last:border-0 last:pb-0" style={{ borderColor: '#1a1e35' }}>
                  <div className="text-white leading-snug mb-0.5">{item.headline}</div>
                  <div style={{ color: '#4b5563' }}>{item.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col: GM stuff + Standings */}
        <div className="space-y-4">

          {/* Team vitals */}
          <div className="rounded-xl p-4 fade-in-up" style={{ background: '#0f1120', border: '1px solid #1a1e35' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: tc }}>Team Vitals</div>
            <div className="space-y-3">
              {/* Chemistry */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#6b7280' }}>Chemistry</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: '#1a1e35' }}>
                    <div className="h-full rounded-full" style={{ width: `${chem}%`, background: chemColor }} />
                  </div>
                  <span className="text-xs font-bold w-6 text-right" style={{ color: chemColor }}>{chem}</span>
                </div>
              </div>
              {/* GM Rating */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#6b7280' }}>GM Rating</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: gmTierColor + '18', color: gmTierColor }}>{gmTierLabel}</span>
                  <span className="text-xs font-black" style={{ color: gmTierColor }}>{gm?.score ?? 0}</span>
                </div>
              </div>
              {/* Rivals */}
              {(userTeam.rivals ?? []).length > 0 && (
                <div>
                  <div className="text-xs mb-1.5" style={{ color: '#6b7280' }}>Rivalries</div>
                  {(userTeam.rivals ?? []).slice(0, 2).map(rid => {
                    const rt = league.teams[rid];
                    const rec = (userTeam.headToHead ?? {})[rid] ?? { wins: 0, losses: 0 };
                    return rt ? (
                      <div key={rid} className="flex items-center gap-2 text-xs mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: rt.primaryColor }} />
                        <span className="font-semibold text-white">{rt.abbreviation}</span>
                        <span className="ml-auto font-mono" style={{ color: rec.wins >= rec.losses ? '#4ade80' : '#f87171' }}>
                          {rec.wins}–{rec.losses}
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Standings */}
          {[{ label: 'East', teams: eastStandings }, { label: 'West', teams: westStandings }].map((conf, ci) => (
            <div key={conf.label} className="rounded-xl p-4 fade-in-up" style={{ background: '#0f1120', border: '1px solid #1a1e35', animationDelay: `${ci * 40}ms` }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: tc }}>{conf.label} Top 5</div>
              <div className="space-y-1">
                {conf.teams.map((t, i) => {
                  const isUser = t.id === league.userTeamId;
                  return (
                    <div key={t.id} className="flex items-center text-xs rounded-lg px-2 py-1.5"
                      style={{ background: isUser ? `${tc}15` : 'transparent', border: isUser ? `1px solid ${tc}25` : '1px solid transparent' }}>
                      <span className="w-4 font-bold shrink-0" style={{ color: i === 0 ? '#f59e0b' : '#4b5563' }}>{i + 1}</span>
                      <span className="font-bold flex-1" style={{ color: isUser ? '#fff' : '#c5c9d8' }}>{t.abbreviation}</span>
                      {isUser && <span className="text-xs px-1 rounded font-bold mr-1" style={{ background: `${tc}25`, color: tc }}>YOU</span>}
                      <span className="font-mono" style={{ color: isUser ? '#fff' : '#6b7280' }}>{t.stats.wins}–{t.stats.losses}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scout Reports ── */}
      {scoutTips.length > 0 && (
        <div className="fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Scout Reports</h2>
            <div className="flex-1 h-px" style={{ background: '#1a1e35' }} />
            <div className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: `${tc}18`, color: tc }}>
              {scoutTips.length} tips
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {scoutTips.map((tip, i) => <ScoutCard key={i} tip={tip} delay={i * 40} tc={tc} />)}
          </div>
        </div>
      )}

      {selectedBoxScore && (
        <BoxScoreModal boxScore={selectedBoxScore} league={league} onClose={() => setSelectedBoxScore(null)} />
      )}

      {devReport && (() => {
        const myEntries = devReport
          .filter(e => e.teamId === league.userTeamId)
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        const improved = myEntries.filter(e => e.delta > 0);
        const regressed = myEntries.filter(e => e.delta < 0);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setDevReport(null)}>
            <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl" style={{ background: '#0d0f17', border: '1px solid #2e3248' }} onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 border-b sticky top-0 z-10 flex items-center justify-between" style={{ borderColor: '#1e2235', background: '#0d0f17' }}>
                <div>
                  <div className="font-black text-white text-lg">Player Development</div>
                  <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>End of {league.season - 1} Season</div>
                </div>
                <button onClick={() => setDevReport(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:opacity-80 transition-all" style={{ background: '#1e2235', color: '#8b90a7' }}>✕</button>
              </div>
              <div className="p-6 space-y-5">
                {improved.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase mb-2" style={{ color: '#4ade80' }}>Improved</div>
                    <div className="space-y-2">
                      {improved.map(e => {
                        const p = league.players[e.playerId];
                        const newOvr = p?.ratings.overall ?? (e.delta + 0);
                        const oldOvr = newOvr - e.delta;
                        return (
                          <div key={e.playerId} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white text-sm truncate">{e.playerName}</div>
                              <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>{e.reason}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-mono" style={{ color: '#6b7280' }}>{oldOvr}</span>
                              <span style={{ color: '#374151' }}>→</span>
                              <span className="text-sm font-black text-white">{newOvr}</span>
                              <span className="text-sm font-black px-2 py-0.5 rounded-lg" style={{ background: '#14532d', color: '#4ade80' }}>+{e.delta}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {regressed.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase mb-2" style={{ color: '#f87171' }}>Regressed</div>
                    <div className="space-y-2">
                      {regressed.map(e => {
                        const p = league.players[e.playerId];
                        const newOvr = p?.ratings.overall ?? 0;
                        const oldOvr = newOvr - e.delta;
                        return (
                          <div key={e.playerId} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white text-sm truncate">{e.playerName}</div>
                              <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>{e.reason}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-mono" style={{ color: '#6b7280' }}>{oldOvr}</span>
                              <span style={{ color: '#374151' }}>→</span>
                              <span className="text-sm font-black text-white">{newOvr}</span>
                              <span className="text-sm font-black px-2 py-0.5 rounded-lg" style={{ background: '#450a0a', color: '#f87171' }}>{e.delta}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {myEntries.length === 0 && (
                  <div className="text-center py-6" style={{ color: '#6b7280' }}>No development changes recorded.</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
