import { useLeagueStore } from '../store/leagueStore';
import PlayerPhoto from '../components/PlayerPhoto';
import RatingBar from '../components/RatingBar';
import { useState, useEffect, useRef } from 'react';
import type { DraftProspect } from '../types';


function ProspectCard({ prospect, pickNumber, isUserPick, onDraft, onScout, scoutingPoints, disabled }: {
  prospect: DraftProspect;
  pickNumber: number;
  isUserPick: boolean;
  onDraft: () => void;
  onScout: () => void;
  scoutingPoints: number;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const canScout = !prospect.revealed && scoutingPoints > 0;

  // Grade from scouted rating
  const grade =
    prospect.scoutedRating >= 85 ? { label: 'A+', color: '#4ade80' } :
    prospect.scoutedRating >= 80 ? { label: 'A',  color: '#4ade80' } :
    prospect.scoutedRating >= 75 ? { label: 'B+', color: '#facc15' } :
    prospect.scoutedRating >= 70 ? { label: 'B',  color: '#facc15' } :
    prospect.scoutedRating >= 65 ? { label: 'C+', color: '#fb923c' } :
    prospect.scoutedRating >= 60 ? { label: 'C',  color: '#fb923c' } :
                                   { label: 'D',  color: '#f87171' };

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${isUserPick ? 'ring-2 ring-purple-500' : ''}`}
      style={{ background: '#12151e', border: `1px solid ${prospect.revealed ? '#6c63ff44' : '#1e2235'}` }}>

      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        {/* Pick number */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
          style={{ background: pickNumber <= 5 ? '#6c63ff22' : '#1e2235', color: pickNumber <= 5 ? '#6c63ff' : '#8b90a7' }}>
          {pickNumber}
        </div>

        <PlayerPhoto seed={prospect.photoSeed} size={44} name={prospect.name} />

        <div className="flex-1 min-w-0">
          <div className="font-bold text-white">{prospect.name}</div>
          <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: '#8b90a7' }}>
            <span>{prospect.position}</span>
            <span>·</span>
            <span>Age {prospect.age}</span>
            {prospect.revealed && (
              <span className="px-1 py-0 rounded text-xs font-bold" style={{ background: '#6c63ff22', color: '#6c63ff' }}>Scouted ✓</span>
            )}
          </div>
        </div>

        {/* Grade / OVR + Potential */}
        {prospect.revealed ? (
          <div className="flex items-center gap-3 mr-1 shrink-0">
            <div className="text-center">
              <div className="text-xs" style={{ color: '#6b7280' }}>OVR</div>
              <div className="text-lg font-black text-white">{prospect.actualRating.overall}</div>
            </div>
            <div className="text-center">
              <div className="text-xs" style={{ color: '#6b7280' }}>POT</div>
              <div className="text-lg font-black" style={{ color: prospect.potential >= 85 ? '#4ade80' : prospect.potential >= 75 ? '#facc15' : '#fb923c' }}>
                {prospect.potential}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mr-1 shrink-0">
            <div className="text-xs" style={{ color: '#6b7280' }}>Grade</div>
            <div className="text-lg font-black" style={{ color: grade.color }}>{grade.label}</div>
          </div>
        )}

        {/* Scout button */}
        {!prospect.revealed && (
          <button
            onClick={e => { e.stopPropagation(); onScout(); }}
            disabled={!canScout}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            style={{ background: '#1e2235', color: '#a78bfa', border: '1px solid #a78bfa44' }}>
            🔍 Scout {canScout ? `(${scoutingPoints})` : '(0)'}
          </button>
        )}

        {/* Draft button */}
        {isUserPick && !disabled && (
          <button
            onClick={e => { e.stopPropagation(); onDraft(); }}
            className="px-4 py-2 rounded-lg font-bold text-sm transition-all hover:opacity-90 shrink-0"
            style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
            Draft
          </button>
        )}
        {!isUserPick && (
          <div className="text-xs px-2 py-1 rounded shrink-0" style={{ background: '#1e2235', color: '#8b90a7' }}>Available</div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: '#1e2235' }}>
          <div className="grid grid-cols-2 gap-4 mt-3">
            {/* Ratings — revealed if scouted, blurred otherwise */}
            <div>
              <div className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#6c63ff' }}>
                {prospect.revealed ? 'True Ratings' : 'Projected Ratings'}
              </div>
              {prospect.revealed ? (
                <div className="space-y-1.5">
                  <RatingBar value={prospect.actualRating.scoring}     label="Scoring" />
                  <RatingBar value={prospect.actualRating.shooting3}   label="3-Point" />
                  <RatingBar value={prospect.actualRating.defense}     label="Defense" />
                  <RatingBar value={prospect.actualRating.rebounding}  label="Rebounding" />
                  <RatingBar value={prospect.actualRating.athleticism} label="Athleticism" />
                  <RatingBar value={prospect.actualRating.passing}     label="Passing" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {['Scoring', '3-Point', 'Defense', 'Rebounding', 'Athleticism', 'Passing'].map(label => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="text-xs w-20 shrink-0 text-right" style={{ color: '#8b90a7' }}>{label}</div>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2235' }}>
                        <div className="h-full rounded-full" style={{ width: '40%', background: '#2e3248' }} />
                      </div>
                      <div className="text-xs w-6 font-black text-right" style={{ color: '#4b5563' }}>?</div>
                    </div>
                  ))}
                  <div className="mt-2 text-xs rounded-lg p-2 text-center" style={{ background: '#1e2235', color: '#8b90a7' }}>
                    🔍 Scout this player to reveal true ratings ({scoutingPoints} pt{scoutingPoints !== 1 ? 's' : ''} remaining)
                  </div>
                </div>
              )}
            </div>

            {/* Scout report */}
            <div>
              <div className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#6c63ff' }}>Scout Report</div>
              <div className="text-sm space-y-1" style={{ color: '#c5c9d8' }}>
                <div>Scouted OVR: <span className="font-black" style={{ color: grade.color }}>{prospect.scoutedRating}</span></div>
                {prospect.revealed && (
                  <div>True OVR: <span className="font-black text-white">{prospect.actualRating.overall}</span>
                    <span className="text-xs ml-1" style={{ color: prospect.actualRating.overall >= prospect.scoutedRating ? '#4ade80' : '#f87171' }}>
                      ({prospect.actualRating.overall >= prospect.scoutedRating ? '+' : ''}{prospect.actualRating.overall - prospect.scoutedRating})
                    </span>
                  </div>
                )}
                <div>Position: <span className="font-bold text-white">{prospect.position}</span></div>
                <div>Age: <span className="font-bold text-white">{prospect.age}</span></div>
                <div className="mt-2 text-xs" style={{ color: '#8b90a7' }}>
                  {prospect.scoutedRating >= 80 ? '⭐ Franchise cornerstone. High-upside prospect with elite tools.' :
                   prospect.scoutedRating >= 70 ? '✓ Solid starter. Expected to contribute immediately.' :
                   prospect.scoutedRating >= 60 ? '→ Rotation player. May need development time.' :
                   '↓ Project player. Long-term developmental prospect.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Draft() {
  const league        = useLeagueStore(s => s.league);
  const draftPlayer   = useLeagueStore(s => s.draftPlayer);
  const simNextDraftPick = useLeagueStore(s => s.simNextDraftPick);
  const simToMyPick   = useLeagueStore(s => s.simToMyPick);
  const startNewSeason = useLeagueStore(s => s.startNewSeason);
  const scoutProspect = useLeagueStore(s => s.scoutProspect);
  const [expiringPlayers, setExpiringPlayers] = useState<Array<{ id: string; name: string; position: string; overall: number; yearsLeft: number }> | null>(null);
  const prevPhase = useRef(league?.phase);

  useEffect(() => {
    if (prevPhase.current === 'draft' && league?.phase === 'offseason') {
      const userTeam = league.teams[league.userTeamId];
      const expiring = userTeam?.rosterIds
        .map(id => league.players[id])
        .filter(p => p && p.ratings.overall >= 80 && (p.contract?.yearsLeft ?? 0) <= 1)
        .map(p => ({ id: p.id, name: p.name, position: p.position, overall: p.ratings.overall, yearsLeft: p.contract?.yearsLeft ?? 0 }))
        .sort((a, b) => b.overall - a.overall) ?? [];
      if (expiring.length > 0) setExpiringPlayers(expiring);
    }
    prevPhase.current = league?.phase;
  }, [league?.phase]);

  if (!league) return null;

  const scoutingPoints = league.scoutingPoints ?? 0;

  if (league.phase !== 'draft') {
    const weeksLeft = Math.max(0, 25 - league.week);
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-5xl mb-4">🏀</div>
        <h1 className="text-2xl font-black text-white mb-2">Draft</h1>
        {league.phase === 'offseason' ? (
          <>
            <p className="mb-6" style={{ color: '#8b90a7' }}>The {league.season} draft has concluded.</p>
            <button onClick={startNewSeason}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
              Start {league.season + 1} Season →
            </button>
          </>
        ) : (
          <div className="text-center">
            <p style={{ color: '#8b90a7' }}>The draft begins after the regular season. {weeksLeft} week(s) remaining.</p>
            {scoutingPoints > 0 && (
              <p className="mt-2 text-sm" style={{ color: '#a78bfa' }}>🔍 You have {scoutingPoints} scouting point{scoutingPoints !== 1 ? 's' : ''} saved up.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  const draftOrder: string[]  = league.draftOrder ?? [];
  const currentPickIndex      = league.draftPickIndex ?? 0;
  const currentTeamId         = draftOrder[currentPickIndex];
  const isUserTurn            = currentTeamId === league.userTeamId;
  const userNextPickIdx       = draftOrder.findIndex((id, i) => i >= currentPickIndex && id === league.userTeamId);
  const picksUntilUser        = userNextPickIdx - currentPickIndex;
  const prospects             = [...league.draftProspects];

  return (
    <div>
      {/* Expiring contract reminder modal */}
      {expiringPlayers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: '#0d0f17', border: '1px solid #f59e0b55' }}>
            <div className="px-6 py-5 text-center"
              style={{ background: 'linear-gradient(135deg,#78350f,#451a03)', borderBottom: '1px solid #f59e0b44' }}>
              <div className="text-3xl mb-1">⚠️</div>
              <div className="text-xl font-black text-white">Expiring Contracts</div>
              <div className="text-sm mt-0.5" style={{ color: '#fbbf24' }}>These stars are entering free agency soon</div>
            </div>
            <div className="p-5 space-y-2">
              {expiringPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: '#12151e', border: '1px solid #f59e0b33' }}>
                  <div className="flex-1">
                    <div className="font-black text-white">{p.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>{p.position}</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="text-xs" style={{ color: '#6b7280' }}>OVR</div>
                    <div className="text-lg font-black text-white">{p.overall}</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="text-xs" style={{ color: '#6b7280' }}>Years Left</div>
                    <div className="text-lg font-black" style={{ color: p.yearsLeft === 0 ? '#f87171' : '#facc15' }}>
                      {p.yearsLeft === 0 ? 'UFA' : p.yearsLeft}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => setExpiringPlayers(null)}
                className="w-full py-3 rounded-xl font-black text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#78350f,#92400e)', color: '#fbbf24' }}>
                Got it — manage my roster
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-white">{league.season} NBA Draft</h1>
          <p className="text-sm mt-1" style={{ color: '#8b90a7' }}>
            Pick #{currentPickIndex + 1} of {draftOrder.length}
            {currentTeamId && ` · On the clock: ${league.teams[currentTeamId]?.city} ${league.teams[currentTeamId]?.name}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Scouting points indicator */}
          <div className="rounded-xl px-4 py-2.5 text-center" style={{ background: '#12151e', border: '1px solid #a78bfa44' }}>
            <div className="text-xs font-semibold" style={{ color: '#a78bfa' }}>Scouting Points</div>
            <div className="text-xl font-black text-white">{scoutingPoints}</div>
          </div>

          {!isUserTurn && (
            <>
              <button onClick={simNextDraftPick}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-80"
                style={{ background: '#1e2235', color: '#c5c9d8', border: '1px solid #2e3248' }}>
                Sim 1 Pick
              </button>
              <button onClick={simToMyPick}
                className="px-4 py-2 rounded-lg font-bold text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
                Sim to My Pick →
              </button>
            </>
          )}

          <div className="rounded-xl px-5 py-3 text-center" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
            {isUserTurn ? (
              <>
                <div className="text-xs font-semibold" style={{ color: '#6c63ff' }}>YOUR PICK</div>
                <div className="text-lg font-black text-white">Select now</div>
              </>
            ) : (
              <>
                <div className="text-xs" style={{ color: '#8b90a7' }}>Your next pick</div>
                <div className="text-lg font-black text-white">{picksUntilUser > 0 ? `In ${picksUntilUser} pick${picksUntilUser > 1 ? 's' : ''}` : 'No more picks'}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scouting tip */}
      <div className="mb-4 rounded-xl px-4 py-3 text-sm flex items-center gap-3"
        style={{ background: '#12151e', border: '1px solid #a78bfa33' }}>
        <span className="text-lg">🔍</span>
        <span style={{ color: '#8b90a7' }}>
          Scout prospects to reveal their <strong style={{ color: '#a78bfa' }}>true OVR &amp; potential</strong>.
          Earn points via <strong style={{ color: '#fff' }}>win streaks</strong> (every 3 in a row) and <strong style={{ color: '#fff' }}>win milestones</strong> (20/30/40/50/60 wins).
          Worse teams also get a <strong style={{ color: '#fff' }}>draft position bonus</strong> at lottery time.
          You have <strong style={{ color: '#4ade80' }}>{scoutingPoints} point{scoutingPoints !== 1 ? 's' : ''}</strong> remaining.
        </span>
      </div>

      {/* Draft order strip */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-2">
        {draftOrder.slice(currentPickIndex, currentPickIndex + 15).map((teamId, i) => {
          const team = league.teams[teamId];
          const isUser = teamId === league.userTeamId;
          const isCurrent = i === 0;
          return (
            <div key={i} className="shrink-0 flex flex-col items-center px-2.5 py-2 rounded-lg text-center min-w-[52px]"
              style={{ background: isCurrent ? '#6c63ff' : isUser ? '#6c63ff22' : '#12151e', border: `1px solid ${isCurrent ? '#6c63ff' : isUser ? '#6c63ff44' : '#1e2235'}` }}>
              <div className="text-xs font-bold" style={{ color: isCurrent ? '#fff' : '#8b90a7' }}>#{currentPickIndex + i + 1}</div>
              <div className="text-xs font-black mt-0.5" style={{ color: isCurrent ? '#fff' : isUser ? '#6c63ff' : '#c5c9d8' }}>{team?.abbreviation}</div>
            </div>
          );
        })}
        {currentPickIndex + 15 < draftOrder.length && (
          <div className="shrink-0 flex items-center px-3 text-xs" style={{ color: '#8b90a7' }}>+{draftOrder.length - currentPickIndex - 15} more</div>
        )}
      </div>

      {/* Prospect list */}
      {prospects.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#8b90a7' }}>Draft complete! All prospects have been selected.</div>
      ) : (
        <div className="space-y-2">
          {prospects.slice(0, 30).map((prospect, i) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              pickNumber={currentPickIndex + i + 1}
              isUserPick={isUserTurn}
              disabled={!isUserTurn}
              scoutingPoints={scoutingPoints}
              onDraft={() => draftPlayer(prospect.id)}
              onScout={() => scoutProspect(prospect.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
