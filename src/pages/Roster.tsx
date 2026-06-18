import { useState } from 'react';
import { useLeagueStore } from '../store/leagueStore';
import PlayerPhoto from '../components/PlayerPhoto';
import RatingBar, { OverallBadge } from '../components/RatingBar';
import { usePlayerModal } from '../contexts/PlayerModalContext';
import type { Player, Team, LeagueState, Position } from '../types';
import { SALARY_CAP, LUXURY_TAX_LINE, HARD_CAP } from '../engine/teamData';
import { injurySeverityLabel } from '../engine/injuryEngine';
import { calcOvrForPosition } from '../engine/progressionEngine';
import { formatHeight } from '../engine/playerGen';

const ALL_POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

function DevelopmentReport({ league, roster }: { league: LeagueState; roster: Player[] }) {
  const log = league.developmentLog ?? [];
  // Show anyone who was on the user's team at offseason time (even if since traded/released)
  const myEntries = log
    .filter(e => e.teamId === league.userTeamId)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  void roster;

  if (myEntries.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
        <div className="text-white font-bold mb-1">No development data yet</div>
        <div className="text-sm" style={{ color: '#8b90a7' }}>
          Finish the season and start a new one — each player's OVR change and reason will appear here after the offseason development runs.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs mb-2" style={{ color: '#8b90a7' }}>
        Season {league.season - 1} development results for your current roster players.
      </div>
      {myEntries.map(entry => {
        const player = league.players[entry.playerId];
        const deltaColor = entry.delta > 0 ? '#4ade80' : entry.delta < 0 ? '#f87171' : '#8b90a7';
        const deltaText = entry.delta > 0 ? `+${entry.delta}` : `${entry.delta}`;
        return (
          <div key={entry.playerId} className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: '#12151e', border: '1px solid #1e2235' }}>
            {player && <PlayerPhoto seed={player.photoSeed} size={36} name={player.name} />}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white">{entry.playerName}</div>
              <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>{entry.reason}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-black text-sm" style={{ color: deltaColor }}>{deltaText} OVR</div>
              {player && <div className="text-xs" style={{ color: '#8b90a7' }}>{player.ratings.overall} overall</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function statPer(stat: number, games: number) {
  if (!games) return '—';
  return (stat / games).toFixed(1);
}

function marketValue(ovr: number) {
  return Math.max(1.1, (ovr - 40) * 0.4 + 1.1);
}

// ── Re-Sign Modal ─────────────────────────────────────────────────────────────
function ReSignModal({ player, onClose, onSubmit }: {
  player: Player;
  onClose: () => void;
  onSubmit: (salary: number, years: number) => void;
}) {
  const mv = marketValue(player.ratings.overall);
  const [salary, setSalary] = useState(parseFloat(mv.toFixed(2)));
  const [years, setYears] = useState(3);

  const ratio = salary / mv;
  const vibeColor = ratio >= 0.95 ? '#4ade80' : ratio >= 0.82 ? '#facc15' : ratio >= 0.68 ? '#fb923c' : '#f87171';
  const vibeLabel = ratio >= 0.95 ? 'Likely to accept' : ratio >= 0.82 ? 'Might accept' : ratio >= 0.68 ? 'Probably declines' : 'Will decline';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#12151e', border: '1px solid #2e3248' }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <PlayerPhoto seed={player.photoSeed} size={52} name={player.name} />
          <div>
            <div className="text-lg font-black text-white">{player.name}</div>
            <div className="text-sm" style={{ color: '#8b90a7' }}>{player.position}{player.secondaryPosition ? `/${player.secondaryPosition}` : ''}{player.height ? ` · ${formatHeight(player.height)}` : ''} · Age {player.age} · {player.ratings.overall} OVR</div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              Current: ${player.contract.salary.toFixed(2)}M / {player.contract.yearsLeft}yr remaining
            </div>
          </div>
        </div>

        {/* Market value reference */}
        <div className="rounded-lg px-4 py-2.5 mb-5 flex items-center justify-between" style={{ background: '#0d1018', border: '1px solid #1e2235' }}>
          <span className="text-xs" style={{ color: '#8b90a7' }}>Market value</span>
          <span className="text-sm font-bold text-white">${mv.toFixed(2)}M / yr</span>
        </div>

        {/* Salary slider */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8b90a7' }}>Annual Salary</label>
            <span className="text-base font-black text-white">${salary.toFixed(2)}M</span>
          </div>
          <input
            type="range"
            min={1.1}
            max={Math.max(mv * 1.4, 35)}
            step={0.1}
            value={salary}
            onChange={e => setSalary(parseFloat(parseFloat(e.target.value).toFixed(2)))}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: '#3d4463' }}>
            <span>$1.10M</span>
            <span>${Math.max(mv * 1.4, 35).toFixed(0)}M</span>
          </div>
        </div>

        {/* Years selector */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8b90a7' }}>Extension Length</label>
            <span className="text-xs" style={{ color: '#6b7280' }}>{player.contract.yearsLeft}yr left → <span className="font-bold text-white">{player.contract.yearsLeft + years}yr total</span></span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(y => (
              <button
                key={y}
                onClick={() => setYears(y)}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: years === y ? '#6c63ff' : '#1e2235',
                  color: years === y ? '#fff' : '#8b90a7',
                  border: `1px solid ${years === y ? '#6c63ff' : '#2e3248'}`,
                }}>
                +{y}yr
              </button>
            ))}
          </div>
        </div>

        {/* Acceptance vibe */}
        <div className="rounded-lg px-4 py-2.5 mb-5 flex items-center gap-2" style={{ background: '#0d1018', border: `1px solid ${vibeColor}33` }}>
          <div className="w-2 h-2 rounded-full" style={{ background: vibeColor }} />
          <span className="text-xs font-semibold" style={{ color: vibeColor }}>{vibeLabel}</span>
          <span className="text-xs ml-auto" style={{ color: '#6b7280' }}>
            {(ratio * 100).toFixed(0)}% of market
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#1e2235', color: '#8b90a7' }}>
            Cancel
          </button>
          <button
            onClick={() => onSubmit(salary, years)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
            Offer Extension
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Result Toast ──────────────────────────────────────────────────────────────
function ResultToast({ result, onClose }: { result: { accepted: boolean; reason: string }; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-xl px-5 py-4 max-w-sm shadow-2xl"
      style={{
        background: result.accepted ? '#052e16' : '#1c0a0a',
        border: `1px solid ${result.accepted ? '#4ade80' : '#f87171'}`,
      }}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{result.accepted ? '✅' : '❌'}</span>
        <div>
          <div className="font-bold text-sm" style={{ color: result.accepted ? '#4ade80' : '#f87171' }}>
            {result.accepted ? 'Extension Signed' : 'Offer Rejected'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#c5c9d8' }}>{result.reason}</div>
        </div>
        <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white text-xs">✕</button>
      </div>
    </div>
  );
}

// ── Player Row ────────────────────────────────────────────────────────────────
function PlayerRow({ player, team, onRelease, onReSign, onOpenModal, onSetPosition }: {
  player: Player;
  team?: Team;
  onRelease: (id: string) => void;
  onReSign: (player: Player) => void;
  onOpenModal: (id: string) => void;
  onSetPosition: (playerId: string, primary: Position, secondary?: Position) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingPos, setEditingPos] = useState(false);
  const gp = player.seasonStats.gamesPlayed;
  const fgPct = player.seasonStats.fga > 0 ? ((player.seasonStats.fgm / player.seasonStats.fga) * 100).toFixed(0) + '%' : '—';
  const expiring = player.contract.yearsLeft <= 1 && player.seasonStats.gamesPlayed > 0;

  return (
    <>
      <tr
        className="border-b cursor-pointer hover:bg-white/5 transition-colors"
        style={{ borderColor: '#1e2235' }}
        onClick={() => setExpanded(e => !e)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <button onClick={e => { e.stopPropagation(); onOpenModal(player.id); }} className="shrink-0 hover:opacity-80 transition-opacity">
              <PlayerPhoto seed={player.photoSeed} size={40} name={player.name} teamColor={team?.primaryColor} />
            </button>
            <div>
              <button onClick={e => { e.stopPropagation(); onOpenModal(player.id); }}
                className="font-semibold text-white text-sm hover:underline text-left">
                {player.name}
              </button>
              <div className="flex items-center gap-1 text-xs" style={{ color: '#8b90a7' }}>
                {player.position}{player.secondaryPosition ? `/${player.secondaryPosition}` : ''}{player.height ? ` · ${formatHeight(player.height)}` : ''} • Age {player.age}
                {player.tendency && (
                  <span className="px-1 py-0.5 rounded text-xs font-bold" style={{ background: '#1e2235', color: '#818cf8', fontSize: '10px' }}>
                    {player.tendency}
                  </span>
                )}
                {player.contract.twoWay && (
                  <span className="px-1 py-0.5 rounded font-black text-xs" style={{ background: '#0e4a2a', color: '#4ade80', fontSize: '10px' }}>2W</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="py-3 px-4"><OverallBadge value={player.ratings.overall} /></td>
        <td className="py-3 px-4 text-sm text-white">{statPer(player.seasonStats.points, gp)}</td>
        <td className="py-3 px-4 text-sm text-white">{statPer(player.seasonStats.rebounds, gp)}</td>
        <td className="py-3 px-4 text-sm text-white">{statPer(player.seasonStats.assists, gp)}</td>
        <td className="py-3 px-4 text-sm" style={{ color: '#8b90a7' }}>{fgPct}</td>
        <td className="py-3 px-4">
          <div>
            {player.contract.twoWay ? (
              <span className="text-xs font-bold" style={{ color: '#4ade80' }}>Two-Way</span>
            ) : (
              <>
                <span className="text-sm" style={{ color: '#c5c9d8' }}>${player.contract.salary.toFixed(2)}M</span>
                <span className="text-xs ml-1" style={{ color: '#8b90a7' }}>/ {player.contract.yearsLeft}yr</span>
              </>
            )}
          </div>
          {expiring && !player.contract.twoWay && (
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: '#422006', color: '#fb923c' }}>
              Expiring
            </span>
          )}
        </td>
        <td className="py-3 px-4">
          {player.injuryGames > 0 ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold" style={{ color: injurySeverityLabel(player.injuryGames).color }}>
                {player.injuryType ?? 'Injury'}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full w-fit font-bold"
                style={{ background: injurySeverityLabel(player.injuryGames).bg, color: injurySeverityLabel(player.injuryGames).color }}>
                OUT {player.injuryGames}g · {injurySeverityLabel(player.injuryGames).label}
              </span>
            </div>
          ) : (
            <span className="text-xs" style={{ color: '#4ade80' }}>Active</span>
          )}
        </td>
        <td className="py-3 px-4">
          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onReSign(player)}
              className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity font-semibold"
              style={{ background: expiring ? '#6c63ff22' : '#1e2235', color: expiring ? '#a78bfa' : '#6b7280', border: `1px solid ${expiring ? '#6c63ff44' : '#2e3248'}` }}>
              Re-Sign
            </button>
            <button
              onClick={() => onRelease(player.id)}
              className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
              style={{ background: '#1e2235', color: '#f87171' }}>
              Release
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: '#0d1018' }}>
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#6c63ff' }}>Ratings</div>
                <div className="space-y-1.5">
                  <RatingBar value={player.ratings.scoring} label="Scoring" />
                  <RatingBar value={player.ratings.shooting3} label="3-Point" />
                  <RatingBar value={player.ratings.finishing} label="Finishing" />
                  <RatingBar value={player.ratings.passing} label="Passing" />
                  <RatingBar value={player.ratings.ballHandling} label="Ball Hdl" />
                  <RatingBar value={player.ratings.defense} label="Defense" />
                  <RatingBar value={player.ratings.rebounding} label="Rebounding" />
                  <RatingBar value={player.ratings.athleticism} label="Athleticism" />
                  <RatingBar value={player.ratings.iq} label="IQ" />
                </div>

                {/* Position editor */}
                <div className="mt-3 rounded-lg p-3" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6c63ff' }}>Position</div>
                    <button onClick={() => setEditingPos(e => !e)}
                      className="text-xs px-2 py-0.5 rounded font-semibold hover:opacity-80"
                      style={{ background: editingPos ? '#6c63ff33' : '#1e2235', color: editingPos ? '#a78bfa' : '#8b90a7' }}>
                      {editingPos ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  {!editingPos ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full font-black" style={{ background: '#6c63ff33', color: '#a78bfa' }}>
                        {player.position}
                      </span>
                      <span style={{ color: '#6b7280' }}>primary</span>
                      {player.secondaryPosition && <>
                        <span className="px-2 py-1 rounded-full font-semibold" style={{ background: '#1e2235', color: '#8b90a7' }}>
                          {player.secondaryPosition}
                        </span>
                        <span style={{ color: '#6b7280' }}>secondary</span>
                      </>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs mb-1.5" style={{ color: '#8b90a7' }}>Primary — affects OVR</div>
                        <div className="flex gap-1.5">
                          {ALL_POSITIONS.map(pos => {
                            const posOvr = calcOvrForPosition(player.ratings, pos);
                            const delta = posOvr - calcOvrForPosition(player.ratings, player.position);
                            const isCurrent = pos === player.position;
                            return (
                              <button key={pos}
                                onClick={() => onSetPosition(player.id, pos, player.secondaryPosition)}
                                className="flex-1 rounded-lg py-1.5 text-center transition-all hover:opacity-90"
                                style={{ background: isCurrent ? '#6c63ff33' : '#0d1018', border: `1px solid ${isCurrent ? '#6c63ff' : '#2e3248'}` }}>
                                <div className="text-xs font-black" style={{ color: isCurrent ? '#a78bfa' : '#fff' }}>{pos}</div>
                                <div className="text-xs font-bold" style={{ color: isCurrent ? '#a78bfa' : delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#8b90a7' }}>
                                  {isCurrent ? posOvr : (delta >= 0 ? '+' : '') + delta}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs mb-1.5" style={{ color: '#8b90a7' }}>Secondary — shown in lineup, no OVR change</div>
                        <div className="flex gap-1.5">
                          {ALL_POSITIONS.filter(pos => pos !== player.position).map(pos => {
                            const isCurrent = pos === player.secondaryPosition;
                            const posOvr = calcOvrForPosition(player.ratings, pos);
                            return (
                              <button key={pos}
                                onClick={() => onSetPosition(player.id, player.position, isCurrent ? undefined : pos)}
                                className="flex-1 rounded-lg py-1.5 text-center transition-all hover:opacity-90"
                                style={{ background: isCurrent ? '#1a2a1a' : '#0d1018', border: `1px solid ${isCurrent ? '#34d399' : '#2e3248'}` }}>
                                <div className="text-xs font-black" style={{ color: isCurrent ? '#34d399' : '#8b90a7' }}>{pos}</div>
                                <div className="text-xs" style={{ color: '#6b7280' }}>{posOvr}</div>
                              </button>
                            );
                          })}
                          {player.secondaryPosition && (
                            <button onClick={() => onSetPosition(player.id, player.position, undefined)}
                              className="px-2 rounded-lg text-xs hover:opacity-80"
                              style={{ background: '#1e2235', color: '#f87171' }}>✕</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#6c63ff' }}>Season Stats</div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    ['PPG', statPer(player.seasonStats.points, gp)],
                    ['RPG', statPer(player.seasonStats.rebounds, gp)],
                    ['APG', statPer(player.seasonStats.assists, gp)],
                    ['SPG', statPer(player.seasonStats.steals, gp)],
                    ['BPG', statPer(player.seasonStats.blocks, gp)],
                    ['TOV', statPer(player.seasonStats.turnovers, gp)],
                    ['FG%', fgPct],
                    ['3P%', player.seasonStats.fg3a > 0 ? ((player.seasonStats.fg3m / player.seasonStats.fg3a) * 100).toFixed(0) + '%' : '—'],
                    ['GP', String(gp)],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-lg p-2 text-center" style={{ background: '#12151e' }}>
                      <div className="text-sm font-bold text-white">{v}</div>
                      <div className="text-xs" style={{ color: '#8b90a7' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg p-3" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#6c63ff' }}>Contract Details</div>
                  <div className="text-sm text-white">${player.contract.salary.toFixed(2)}M / year · {player.contract.yearsLeft} year{player.contract.yearsLeft !== 1 ? 's' : ''} left</div>
                  <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>
                    Market value: ~${marketValue(player.ratings.overall).toFixed(2)}M/yr · Potential: {player.potential}
                  </div>
                  {expiring && <div className="text-xs mt-1 font-semibold" style={{ color: '#fb923c' }}>⚠ Contract expires at season end — re-sign now or lose them to FA</div>}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Roster() {
  const league = useLeagueStore(s => s.league);
  const releasePlayer = useLeagueStore(s => s.releasePLayer);
  const reSignPlayer = useLeagueStore(s => s.reSignPlayer);
  const setPlayerPosition = useLeagueStore(s => s.setPlayerPosition);
  const { openPlayer } = usePlayerModal();
  const [reSignTarget, setReSignTarget] = useState<Player | null>(null);
  const [result, setResult] = useState<{ accepted: boolean; reason: string } | null>(null);
  const [tab, setTab] = useState<'roster' | 'development'>('roster');

  if (!league) return null;

  const userTeam = league.teams[league.userTeamId];
  const roster = userTeam.rosterIds
    .map(id => league.players[id])
    .filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);

  const expiringCount = roster.filter(p => p.contract.yearsLeft <= 1 && p.seasonStats.gamesPlayed > 0).length;
  const overCap   = userTeam.salary > SALARY_CAP;
  const overTax   = userTeam.salary > LUXURY_TAX_LINE;
  const overApron = userTeam.salary > HARD_CAP;

  function handleReSign(salary: number, years: number) {
    if (!reSignTarget) return;
    const res = reSignPlayer(reSignTarget.id, salary, years);
    setReSignTarget(null);
    setResult(res);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-white">{userTeam.city} {userTeam.name} Roster</h1>
          <p className="text-sm mt-1" style={{ color: '#8b90a7' }}>
            {roster.length} players •{' '}
            <span style={{ color: overApron ? '#f87171' : overTax ? '#fb923c' : overCap ? '#facc15' : '#4ade80' }}>
              ${userTeam.salary.toFixed(2)}M
              {overApron ? ' · OVER APRON' : overTax ? ' · LUXURY TAX' : overCap ? ' · OVER CAP' : ` · $${userTeam.capSpace.toFixed(2)}M space`}
            </span>
            {' '}· Cap ${SALARY_CAP}M · Tax ${LUXURY_TAX_LINE}M · Apron ${HARD_CAP}M
          </p>
        </div>
      </div>

      {/* Warnings */}
      {overApron && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#1c0a0a', border: '1px solid #f8717133' }}>
          <span style={{ color: '#f87171' }}>🚫</span>
          <span className="text-sm" style={{ color: '#fca5a5' }}>Over the hard cap (${HARD_CAP}M apron) — only veteran minimum signings allowed. Release players to get under.</span>
        </div>
      )}
      {!overApron && overTax && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#1c0a00', border: '1px solid #fb923c33' }}>
          <span style={{ color: '#fb923c' }}>💸</span>
          <span className="text-sm" style={{ color: '#fdba74' }}>In luxury tax territory (${LUXURY_TAX_LINE}M+) — Tax MLE ($5.7M) and vet minimum available. Stars need Bird Rights re-sign.</span>
        </div>
      )}
      {!overTax && overCap && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#1c1000', border: '1px solid #facc1533' }}>
          <span style={{ color: '#facc15' }}>⚠</span>
          <span className="text-sm" style={{ color: '#fef08a' }}>Over the soft cap — Mid-Level Exception ($13.5M, once) and vet minimum available. Use Bird Rights to keep your own stars.</span>
        </div>
      )}
      {expiringCount > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#1c1000', border: '1px solid #fb923c33' }}>
          <span style={{ color: '#fb923c' }}>⏳</span>
          <span className="text-sm" style={{ color: '#fdba74' }}>
            {expiringCount} player{expiringCount > 1 ? 's have' : ' has'} expiring contract{expiringCount > 1 ? 's' : ''} — re-sign before the offseason or they enter free agency.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['roster', 'development'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
            style={{ background: tab === t ? '#6c63ff' : '#1e2235', color: tab === t ? '#fff' : '#8b90a7' }}>
            {t === 'development' ? `Development${league.developmentLog?.length ? ` (${league.developmentLog.length})` : ''}` : 'Roster'}
          </button>
        ))}
      </div>

      {tab === 'development' ? (
        <DevelopmentReport league={league} roster={roster} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2235' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#12151e' }}>
                {['Player', 'OVR', 'PPG', 'RPG', 'APG', 'FG%', 'Contract', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold py-2.5 px-4 uppercase tracking-wider" style={{ color: '#8b90a7' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map(p => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  team={userTeam}
                  onRelease={releasePlayer}
                  onReSign={setReSignTarget}
                  onOpenModal={openPlayer}
                  onSetPosition={setPlayerPosition}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reSignTarget && (
        <ReSignModal
          player={reSignTarget}
          onClose={() => setReSignTarget(null)}
          onSubmit={handleReSign}
        />
      )}
      {result && <ResultToast result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
