import React, { useState } from 'react';
import { useLeagueStore } from '../store/leagueStore';
import type { PlayoffSeries, PlayinGame, GameBoxScore } from '../types';
import BoxScoreModal from '../components/BoxScoreModal';

// ── Sim Button ────────────────────────────────────────────────────────────────

function SimButton({ label, onClick, small }: { label: string; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`font-bold rounded-lg transition-colors ${small ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'}`}
      style={{ background: '#1e2235', color: '#a5b4fc', border: '1px solid #2a2e45' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#2a2e45')}
      onMouseLeave={e => (e.currentTarget.style.background = '#1e2235')}
    >
      {label}
    </button>
  );
}

// ── Bracket layout constants ──────────────────────────────────────────────────

const BRACKET_H = 320;
const CARD_W = 152;
const CONN_W = 20;
const SLOT_H = BRACKET_H / 4;

function pad<T>(arr: T[], count: number): (T | null)[] {
  const out: (T | null)[] = [...arr];
  while (out.length < count) out.push(null);
  return out;
}

// ── Play-in card ──────────────────────────────────────────────────────────────

function PlayinCard({ game, teams, boxScore, onShowBox }: {
  game: PlayinGame;
  teams: Record<string, import('../types').Team>;
  boxScore?: GameBoxScore;
  onShowBox?: (box: GameBoxScore) => void;
}) {
  const home = teams[game.homeTeamId];
  const away = teams[game.awayTeamId];
  const matchupLabel = game.matchup === '7v8' ? '7 vs 8 Seed' : game.matchup === '9v10' ? '9 vs 10 Seed' : 'Play-In Final';

  return (
    <div className="rounded-lg p-3" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: '#8b90a7' }}>{matchupLabel}</span>
        {game.played && boxScore && onShowBox && (
          <button onClick={() => onShowBox(boxScore)}
            className="text-xs px-2 py-0.5 rounded font-semibold transition-all hover:opacity-80"
            style={{ background: '#1a1e35', color: '#a78bfa', border: '1px solid #6c63ff33' }}>
            Box Score
          </button>
        )}
      </div>
      {game.played ? (
        <div>
          {[{ team: home, score: game.homeScore, id: game.homeTeamId }, { team: away, score: game.awayScore, id: game.awayTeamId }].map(side => (
            <div key={side.id} className="flex items-center justify-between mb-1 last:mb-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: side.team?.primaryColor }} />
                <span className={`text-sm font-bold ${game.winnerId === side.id ? 'text-white' : 'text-gray-500'}`}>{side.team?.abbreviation}</span>
              </div>
              <span className={`font-mono font-bold text-sm ${game.winnerId === side.id ? 'text-white' : 'text-gray-500'}`}>{side.score}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: home?.primaryColor }} />
            <span className="text-sm font-semibold text-white">{home?.abbreviation}</span>
          </div>
          <span className="text-xs" style={{ color: '#8b90a7' }}>vs</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: away?.primaryColor }} />
            <span className="text-sm font-semibold text-white">{away?.abbreviation}</span>
          </div>
        </div>
      )}
      {game.winnerId && (
        <div className="mt-1.5 text-xs" style={{ color: '#34d399' }}>
          {teams[game.winnerId]?.abbreviation} advance
        </div>
      )}
    </div>
  );
}

// ── Bracket card ──────────────────────────────────────────────────────────────

function BracketCard({ series, teams, userTeamId, onSimSeries, onShowSeries }: {
  series: PlayoffSeries | null;
  teams: Record<string, import('../types').Team>;
  userTeamId: string;
  onSimSeries?: (id: string) => void;
  onShowSeries?: (series: PlayoffSeries) => void;
}) {
  if (!series) {
    return (
      <div style={{ width: CARD_W, background: '#0d1018', border: '1px solid #1a1d2e', borderRadius: 10, padding: '8px 10px', opacity: 0.5 }}>
        <div className="text-xs text-center" style={{ color: '#3d4463' }}>TBD</div>
        <div className="text-xs text-center mt-1" style={{ color: '#3d4463' }}>vs TBD</div>
      </div>
    );
  }

  const isUser = series.teamAId === userTeamId || series.teamBId === userTeamId;
  const done = !!series.winnerId;
  const hasGames = series.games.length > 0;

  const sides = [
    { id: series.teamAId, wins: series.teamAWins },
    { id: series.teamBId, wins: series.teamBWins },
  ];

  return (
    <div style={{
      width: CARD_W,
      background: '#12151e',
      border: `1px solid ${isUser ? '#6c63ff55' : done ? '#1e2235' : '#2a2e45'}`,
      borderRadius: 10,
      padding: '8px 10px',
      boxShadow: isUser ? '0 0 0 1px #6c63ff22' : undefined,
    }}>
      {isUser && <div style={{ fontSize: 9, color: '#6c63ff', fontWeight: 700, marginBottom: 4, letterSpacing: '0.08em' }}>★ YOUR TEAM</div>}
      {sides.map(side => {
        const team = teams[side.id];
        const isWinner = series.winnerId === side.id;
        const isLoser = done && !isWinner;
        return (
          <div key={side.id} className="flex items-center justify-between" style={{ opacity: isLoser ? 0.35 : 1, marginBottom: 3 }}>
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: team?.primaryColor ?? '#555' }} />
              <span className="text-xs font-bold text-white truncate">{team?.abbreviation ?? '???'}</span>
              {isWinner && <span style={{ fontSize: 10, color: '#4ade80', marginLeft: 2 }}>✓</span>}
            </div>
            <span className="text-sm font-black ml-2 shrink-0" style={{ color: isWinner ? '#fff' : '#6b7280' }}>{side.wins}</span>
          </div>
        );
      })}
      {!done && hasGames && (
        <div className="flex gap-0.5 mt-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const game = series.games[i];
            let bg = '#1e2235';
            if (game) {
              const aWon = (game.homeTeamId === series.teamAId) === (game.homeScore > game.awayScore);
              bg = aWon ? (teams[series.teamAId]?.primaryColor ?? '#6c63ff') : (teams[series.teamBId]?.primaryColor ?? '#9c63ff');
            }
            return <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: bg }} />;
          })}
        </div>
      )}
      <div className="flex gap-1 mt-2">
        {hasGames && onShowSeries && (
          <button
            onClick={() => onShowSeries(series)}
            className="flex-1 text-xs font-bold rounded py-0.5 transition-colors"
            style={{ background: '#0d0f1a', color: '#a78bfa', border: '1px solid #6c63ff33' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.borderColor = '#6c63ff66'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = '#6c63ff33'; }}
          >
            Games
          </button>
        )}
        {!done && onSimSeries && (
          <button
            onClick={() => onSimSeries(series.id)}
            className="flex-1 text-xs font-bold rounded py-0.5 transition-colors"
            style={{ background: '#12151e', color: '#6b7280', border: '1px solid #1e2235' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.borderColor = '#2a2e45'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#1e2235'; }}
          >
            Sim
          </button>
        )}
      </div>
    </div>
  );
}

// ── Series game list modal ────────────────────────────────────────────────────

function SeriesModal({ series, league, boxScores, onClose }: {
  series: PlayoffSeries;
  league: import('../types').LeagueState;
  boxScores: Record<string, GameBoxScore>;
  onClose: () => void;
}) {
  const [selectedBox, setSelectedBox] = useState<GameBoxScore | null>(null);
  const { teams } = league;
  const teamA = teams[series.teamAId];
  const teamB = teams[series.teamBId];
  const tcA = teamA?.primaryColor ?? '#6c63ff';
  const tcB = teamB?.primaryColor ?? '#9c63ff';
  const roundName = ['', 'First Round', 'Conference Semifinals', 'Conference Finals', 'NBA Finals'][series.round];

  if (selectedBox) {
    return <BoxScoreModal boxScore={selectedBox} league={league} onClose={() => setSelectedBox(null)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden fade-in-up"
        style={{ background: '#0d0f17', border: '1px solid #1e2235' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #1e2235', background: '#0a0c14' }}>
          <div>
            <div className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: '#6b7280' }}>{roundName}</div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white">{teamA?.abbreviation}</span>
              <span className="text-xl font-black" style={{ color: tcA }}>{series.teamAWins}</span>
              <span style={{ color: '#4b5563' }}>–</span>
              <span className="text-xl font-black" style={{ color: tcB }}>{series.teamBWins}</span>
              <span className="font-black text-white">{teamB?.abbreviation}</span>
              {series.winnerId && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold ml-1"
                  style={{ background: '#14532d', color: '#4ade80' }}>
                  {teams[series.winnerId]?.abbreviation} win
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#131628', color: '#8b90a7', border: '1px solid #1e2440' }}>
            Close
          </button>
        </div>

        <div className="p-4 space-y-2">
          {series.games.length === 0 && (
            <div className="text-center py-6 text-sm" style={{ color: '#6b7280' }}>Series hasn't started yet.</div>
          )}
          {series.games.map((game, i) => {
            const boxId = `po_${series.id}_g${i + 1}`;
            const box = boxScores[boxId];
            const homeTeam = teams[game.homeTeamId];
            const awayTeam = teams[game.awayTeamId];
            const homeWin = game.homeScore > game.awayScore;
            return (
              <div key={i} className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: '#12151e', border: '1px solid #1e2235' }}>
                <div className="text-xs font-black uppercase tracking-wide" style={{ color: '#6b7280' }}>
                  Game {i + 1}
                </div>
                <div className="flex items-center gap-3 flex-1 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: awayTeam?.primaryColor }} />
                    <span className="text-sm font-bold" style={{ color: !homeWin ? '#fff' : '#6b7280' }}>{awayTeam?.abbreviation}</span>
                    <span className="font-mono font-black text-sm" style={{ color: !homeWin ? '#fff' : '#6b7280' }}>{game.awayScore}</span>
                  </div>
                  <span style={{ color: '#3d4262', fontSize: 10 }}>@</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-sm" style={{ color: homeWin ? '#fff' : '#6b7280' }}>{game.homeScore}</span>
                    <span className="text-sm font-bold" style={{ color: homeWin ? '#fff' : '#6b7280' }}>{homeTeam?.abbreviation}</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: homeTeam?.primaryColor }} />
                  </div>
                </div>
                {box ? (
                  <button onClick={() => setSelectedBox(box)}
                    className="text-xs px-2 py-1 rounded font-semibold transition-all hover:opacity-80"
                    style={{ background: '#1a1e35', color: '#a78bfa', border: '1px solid #6c63ff33' }}>
                    Box Score
                  </button>
                ) : (
                  <div className="text-xs w-16" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Bracket layout ────────────────────────────────────────────────────────────

function BracketColumn({ entries, slotsEach, teams, userTeamId, onSimSeries, onShowSeries }: {
  entries: (PlayoffSeries | null)[];
  slotsEach: number;
  teams: Record<string, import('../types').Team>;
  userTeamId: string;
  onSimSeries?: (id: string) => void;
  onShowSeries?: (s: PlayoffSeries) => void;
}) {
  return (
    <div style={{ width: CARD_W, height: BRACKET_H, display: 'flex', flexDirection: 'column' }}>
      {entries.map((s, i) => (
        <div key={i} style={{ flex: slotsEach, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BracketCard series={s} teams={teams} userTeamId={userTeamId} onSimSeries={onSimSeries} onShowSeries={onShowSeries} />
        </div>
      ))}
    </div>
  );
}

function ConnectorR1R2({ side }: { side: 'east' | 'west' }) {
  const H = BRACKET_H, W = CONN_W, mid = W / 2;
  const xIn = side === 'east' ? 0 : W;
  const xOut = side === 'east' ? W : 0;
  const pairs = [
    { in1: SLOT_H * 0.5, in2: SLOT_H * 1.5, out: SLOT_H },
    { in1: SLOT_H * 2.5, in2: SLOT_H * 3.5, out: SLOT_H * 3 },
  ];
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      {pairs.map((p, i) => (
        <g key={i} stroke="#2e3248" strokeWidth="1" fill="none">
          <polyline points={`${xIn},${p.in1} ${mid},${p.in1} ${mid},${p.out} ${xOut},${p.out}`} />
          <polyline points={`${xIn},${p.in2} ${mid},${p.in2} ${mid},${p.out}`} />
        </g>
      ))}
    </svg>
  );
}

function ConnectorR2CF({ side }: { side: 'east' | 'west' }) {
  const H = BRACKET_H, W = CONN_W, mid = W / 2;
  const xIn = side === 'east' ? 0 : W;
  const xOut = side === 'east' ? W : 0;
  const in1 = SLOT_H, in2 = SLOT_H * 3, out = SLOT_H * 2;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <g stroke="#2e3248" strokeWidth="1" fill="none">
        <polyline points={`${xIn},${in1} ${mid},${in1} ${mid},${out} ${xOut},${out}`} />
        <polyline points={`${xIn},${in2} ${mid},${in2} ${mid},${out}`} />
      </g>
    </svg>
  );
}

function ConnectorLine() {
  const H = BRACKET_H, W = CONN_W, y = H / 2;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <line x1="0" y1={y} x2={W} y2={y} stroke="#2e3248" strokeWidth="1" />
    </svg>
  );
}

function ColWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ height: 24, textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, paddingBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Playoffs() {
  const league = useLeagueStore(s => s.league);
  const simPlayoffSeries = useLeagueStore(s => s.simPlayoffSeries);
  const simPlayoffRound  = useLeagueStore(s => s.simPlayoffRound);
  const simPlayoffs      = useLeagueStore(s => s.simPlayoffs);

  const [selectedSeries, setSelectedSeries] = useState<PlayoffSeries | null>(null);
  const [selectedBox, setSelectedBox] = useState<GameBoxScore | null>(null);

  if (!league) return null;

  const { playinGames, playoffBracket, teams, userTeamId, phase, gameBoxScores = {} } = league;
  const noData = !playinGames && !playoffBracket;

  if (noData || (phase !== 'playin' && phase !== 'playoffs' && phase !== 'draft' && phase !== 'offseason')) {
    return (
      <div>
        <h1 className="text-2xl font-black text-white mb-6">Playoffs</h1>
        <div className="rounded-xl p-12 text-center" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-white font-bold text-lg">Playoffs haven't started yet</div>
          <div className="text-sm mt-2" style={{ color: '#8b90a7' }}>Complete the 82-game regular season and Play-In tournament first.</div>
        </div>
      </div>
    );
  }

  const bracket = playoffBracket ?? [];
  const userInPlayoffs = bracket.some(s => s.teamAId === userTeamId || s.teamBId === userTeamId);
  const finalist = bracket.find(s => s.round === 4);
  const champion = finalist?.winnerId ? teams[finalist.winnerId] : null;
  const playoffsInProgress = phase === 'playoffs' && !champion;
  const activeRound = bracket.length
    ? Math.min(...bracket.filter(s => !s.winnerId).map(s => s.round).filter(n => isFinite(n)))
    : 0;
  const activeRoundName = ['', 'First Round', 'Conference Semis', 'Conference Finals', 'NBA Finals'][activeRound] ?? '';

  const eastR1 = pad(bracket.filter(s => s.round === 1 && s.conference === 'East'), 4);
  const eastR2 = pad(bracket.filter(s => s.round === 2 && s.conference === 'East'), 2);
  const eastCF = pad(bracket.filter(s => s.round === 3 && s.conference === 'East'), 1);
  const finals  = pad(bracket.filter(s => s.round === 4), 1);
  const westCF  = pad(bracket.filter(s => s.round === 3 && s.conference === 'West'), 1);
  const westR2  = pad(bracket.filter(s => s.round === 2 && s.conference === 'West'), 2);
  const westR1  = pad(bracket.filter(s => s.round === 1 && s.conference === 'West'), 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Playoffs</h1>
        {playoffsInProgress && (
          <div className="flex items-center gap-2">
            <SimButton label={`Sim ${activeRoundName}`} onClick={simPlayoffRound} />
            <SimButton label="Sim Entire Playoffs" onClick={simPlayoffs} />
          </div>
        )}
      </div>

      {champion && (
        <div className="rounded-xl p-6 mb-8 text-center" style={{ background: 'linear-gradient(135deg,#78350f,#92400e)', border: '2px solid #f59e0b' }}>
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-2xl font-black text-white">{champion.city} {champion.name}</div>
          <div className="text-lg font-bold mt-1" style={{ color: '#fcd34d' }}>NBA Champions!</div>
        </div>
      )}

      {/* Play-In */}
      {playinGames && playinGames.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Play-In Tournament</h2>
          <div className="grid grid-cols-2 gap-6">
            {(['East', 'West'] as const).map(conf => (
              <div key={conf}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6c63ff' }}>{conf}ern Conference</div>
                <div className="space-y-2">
                  {playinGames.filter(g => g.conference === conf).map(g => (
                    <PlayinCard
                      key={g.id}
                      game={g}
                      teams={teams}
                      boxScore={gameBoxScores[`pi_${g.id}`]}
                      onShowBox={setSelectedBox}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bracket */}
      {bracket.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Bracket</h2>
          <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', width: 'max-content', gap: 0 }}>

              <ColWrap label="East R1">
                <BracketColumn entries={eastR1} slotsEach={1} teams={teams} userTeamId={userTeamId}
                  onSimSeries={playoffsInProgress ? simPlayoffSeries : undefined}
                  onShowSeries={setSelectedSeries} />
              </ColWrap>
              <ColWrap label=""><ConnectorR1R2 side="east" /></ColWrap>
              <ColWrap label="Semis">
                <BracketColumn entries={eastR2} slotsEach={2} teams={teams} userTeamId={userTeamId}
                  onSimSeries={playoffsInProgress ? simPlayoffSeries : undefined}
                  onShowSeries={setSelectedSeries} />
              </ColWrap>
              <ColWrap label=""><ConnectorR2CF side="east" /></ColWrap>
              <ColWrap label="E. Finals">
                <BracketColumn entries={eastCF} slotsEach={4} teams={teams} userTeamId={userTeamId}
                  onSimSeries={playoffsInProgress ? simPlayoffSeries : undefined}
                  onShowSeries={setSelectedSeries} />
              </ColWrap>
              <ColWrap label=""><ConnectorLine /></ColWrap>

              <ColWrap label="Finals">
                <BracketColumn entries={finals} slotsEach={4} teams={teams} userTeamId={userTeamId}
                  onSimSeries={playoffsInProgress ? simPlayoffSeries : undefined}
                  onShowSeries={setSelectedSeries} />
              </ColWrap>

              <ColWrap label=""><ConnectorLine /></ColWrap>
              <ColWrap label="W. Finals">
                <BracketColumn entries={westCF} slotsEach={4} teams={teams} userTeamId={userTeamId}
                  onSimSeries={playoffsInProgress ? simPlayoffSeries : undefined}
                  onShowSeries={setSelectedSeries} />
              </ColWrap>
              <ColWrap label=""><ConnectorR2CF side="west" /></ColWrap>
              <ColWrap label="Semis">
                <BracketColumn entries={westR2} slotsEach={2} teams={teams} userTeamId={userTeamId}
                  onSimSeries={playoffsInProgress ? simPlayoffSeries : undefined}
                  onShowSeries={setSelectedSeries} />
              </ColWrap>
              <ColWrap label=""><ConnectorR1R2 side="west" /></ColWrap>
              <ColWrap label="West R1">
                <BracketColumn entries={westR1} slotsEach={1} teams={teams} userTeamId={userTeamId}
                  onSimSeries={playoffsInProgress ? simPlayoffSeries : undefined}
                  onShowSeries={setSelectedSeries} />
              </ColWrap>
            </div>
          </div>
        </div>
      )}

      {!userInPlayoffs && phase === 'playoffs' && (
        <div className="mt-4 p-4 rounded-lg text-center" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
          <span className="text-sm" style={{ color: '#8b90a7' }}>Your team did not make the playoffs.</span>
        </div>
      )}

      {/* Modals */}
      {selectedSeries && (
        <SeriesModal
          series={selectedSeries}
          league={league}
          boxScores={gameBoxScores}
          onClose={() => setSelectedSeries(null)}
        />
      )}
      {selectedBox && (
        <BoxScoreModal
          boxScore={selectedBox}
          league={league}
          onClose={() => setSelectedBox(null)}
        />
      )}
    </div>
  );
}
