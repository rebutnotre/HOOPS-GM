import { useEffect, useState } from 'react';
import { useLeagueStore } from '../store/leagueStore';
import PlayerPhoto from '../components/PlayerPhoto';
import type { Player, Position } from '../types';
import { formatHeight } from '../engine/playerGen';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
type Pos = typeof POSITIONS[number];

function ovrColor(ovr: number) {
  return ovr >= 85 ? '#a78bfa' : ovr >= 75 ? '#4ade80' : ovr >= 65 ? '#facc15' : '#8b90a7';
}

function PositionBadge({ primary, secondary, assigned }: { primary: Pos; secondary?: Pos; assigned: Pos }) {
  const isSecondary = assigned !== primary;
  const isOutOfPos = assigned !== primary && assigned !== secondary;
  return (
    <span
      className="text-xs font-black px-1.5 py-0.5 rounded shrink-0"
      style={{
        background: isOutOfPos ? '#7f1d1d33' : isSecondary ? '#92400e33' : '#1e2235',
        color: isOutOfPos ? '#f87171' : isSecondary ? '#fcd34d' : '#8b90a7',
      }}
      title={isOutOfPos ? 'Out of position' : isSecondary ? 'Playing secondary position' : 'Natural position'}
    >
      {primary}{secondary ? `/${secondary}` : ''}
    </span>
  );
}

function DepthCard({
  player,
  isStarter,
  canPromote,
  assignedPos,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  player: Player;
  isStarter: boolean;
  canPromote: boolean;
  assignedPos: Pos;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const injured = player.injuryGames > 0;
  const primaryPos = player.position as Pos;
  const secondaryPos = player.secondaryPosition as Pos | undefined;
  const isSecondary = assignedPos !== primaryPos;
  const isOutOfPos = assignedPos !== primaryPos && assignedPos !== secondaryPos;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="flex items-center gap-2 p-2.5 rounded-lg transition-all cursor-grab active:cursor-grabbing"
      style={{
        background: isStarter ? '#1a1730' : '#12151e',
        border: `1px solid ${isOutOfPos ? '#f8717133' : isStarter ? '#6c63ff55' : '#1e2235'}`,
        opacity: isDragging ? 0.4 : injured && !isStarter ? 0.6 : 1,
        userSelect: 'none',
      }}
    >
      <PlayerPhoto seed={player.photoSeed} size={32} name={player.name} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-white truncate leading-tight">{player.name}</div>
        <div className="text-xs leading-tight flex items-center gap-1 mt-0.5">
          <span style={{ color: ovrColor(player.ratings.overall) }} className="font-black">{player.ratings.overall}</span>
          {player.height && <span style={{ color: '#6b7280' }}>{formatHeight(player.height)}</span>}
          {isOutOfPos && <span className="font-semibold" style={{ color: '#f87171' }}>⚠ OOP</span>}
          {isSecondary && !isOutOfPos && <span className="font-semibold" style={{ color: '#fcd34d' }}>2nd pos</span>}
          {injured && <span className="font-semibold" style={{ color: '#f87171' }}>OUT {player.injuryGames}g</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <PositionBadge primary={primaryPos} secondary={secondaryPos} assigned={assignedPos} />
        {isStarter ? (
          <div className="text-xs font-black px-1.5 py-0.5 rounded" style={{ background: '#6c63ff33', color: '#6c63ff' }}>S</div>
        ) : canPromote ? (
          <div className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#1a2a1a', color: '#4ade80' }}>▲</div>
        ) : null}
      </div>
    </div>
  );
}

export default function Lineup() {
  const league = useLeagueStore(s => s.league);
  const setLineup = useLeagueStore(s => s.setLineup);
  const setLineupPosition = useLeagueStore(s => s.setLineupPosition);
  if (!league) return null;

  const userTeam = league.teams[league.userTeamId];
  const rosterIdSet = new Set(userTeam.rosterIds);
  const storedLineup: string[] = userTeam.lineup ?? [];
  const currentLineup = storedLineup.filter(id => rosterIdSet.has(id));
  const lineupPositions: Record<string, Position> = userTeam.lineupPositions ?? {};

  // Remove lineupPositions for players no longer on roster
  useEffect(() => {
    if (currentLineup.length !== storedLineup.length) {
      setLineup(currentLineup);
    }
  }, [currentLineup.length, storedLineup.length]);

  const allPlayers = userTeam.rosterIds
    .map(id => league.players[id])
    .filter(Boolean);

  // Each player's display position (assigned > primary)
  function playerDisplayPos(p: Player): Pos {
    return ((lineupPositions[p.id] ?? p.position) as Pos);
  }

  // Group players by display position, sorted by OVR desc
  const byPosition: Record<Pos, Player[]> = { PG: [], SG: [], SF: [], PF: [], C: [] };
  for (const p of allPlayers) {
    const pos = playerDisplayPos(p);
    if (byPosition[pos]) byPosition[pos].push(p);
  }
  for (const pos of POSITIONS) {
    byPosition[pos].sort((a, b) => b.ratings.overall - a.ratings.overall);
  }

  const starterSet = new Set(currentLineup);
  const injuredStarters = currentLineup.filter(id => (league.players[id]?.injuryGames ?? 0) > 0).length;

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Pos | null>(null);

  function handleDragStart(e: React.DragEvent, playerId: string) {
    setDraggedId(playerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', playerId);
  }

  function handleDrop(targetPos: Pos) {
    if (!draggedId || !league) return;
    const player = league.players[draggedId];
    if (!player) return;
    // If dropping on their primary position, clear the assignment
    if (targetPos === player.position) {
      setLineupPosition(draggedId, null);
    } else {
      setLineupPosition(draggedId, targetPos);
    }
    setDraggedId(null);
    setDropTarget(null);
  }

  function toggleStarter(playerId: string) {
    if (starterSet.has(playerId)) {
      setLineup(currentLineup.filter(id => id !== playerId));
    } else if (currentLineup.length < 5) {
      setLineup([...currentLineup, playerId]);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Lineup & Depth Chart</h1>
          <p className="text-sm mt-1" style={{ color: '#8b90a7' }}>
            Click to set starters · Drag players between columns to assign positions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-bold" style={{ color: currentLineup.length === 5 ? '#4ade80' : '#facc15' }}>
            {currentLineup.length}/5 starters set
          </div>
          {currentLineup.length > 0 && (
            <button
              onClick={() => setLineup([])}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
              style={{ background: '#1e2235', color: '#8b90a7' }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {injuredStarters > 0 && (
        <div className="rounded-lg px-3 py-2 mb-4 text-xs font-semibold" style={{ background: '#2a1500', color: '#fb923c', border: '1px solid #fb923c33' }}>
          ⚠ {injuredStarters} starter{injuredStarters > 1 ? 's are' : ' is'} injured — bench players will fill in automatically during games.
        </div>
      )}

      {/* Depth chart grid — one column per position */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {POSITIONS.map(pos => {
          const players = byPosition[pos];
          const isDropTarget = dropTarget === pos;
          return (
            <div
              key={pos}
              onDragOver={e => { e.preventDefault(); setDropTarget(pos); }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={e => { e.preventDefault(); handleDrop(pos); }}
            >
              {/* Position header */}
              <div
                className="text-center text-xs font-black uppercase tracking-widest py-1.5 mb-2 rounded-lg transition-all"
                style={{
                  background: isDropTarget ? '#6c63ff44' : '#1e2235',
                  color: isDropTarget ? '#a78bfa' : '#6c63ff',
                  border: `1px solid ${isDropTarget ? '#6c63ff88' : 'transparent'}`,
                }}>
                {pos}
                {isDropTarget && draggedId && (() => {
                  const p = league.players[draggedId];
                  if (!p) return null;
                  const isPrimary = p.position === pos;
                  const isSecondary = p.secondaryPosition === pos;
                  return (
                    <span className="ml-1 text-xs font-normal">
                      {isPrimary ? '(primary)' : isSecondary ? '(secondary)' : '(out of pos)'}
                    </span>
                  );
                })()}
              </div>

              <div className="flex flex-col gap-1.5">
                {players.length === 0 && !isDropTarget ? (
                  <div className="rounded-lg p-3 text-center text-xs" style={{ background: '#0d0f17', border: `1px dashed ${isDropTarget ? '#6c63ff55' : '#2a2d3e'}`, color: '#3a3d4e' }}>
                    No {pos}
                  </div>
                ) : (
                  players.map((p, i) => {
                    const isStarter = starterSet.has(p.id);
                    const canPromote = !isStarter && currentLineup.length < 5;
                    const assignedPos = playerDisplayPos(p);
                    return (
                      <div key={p.id}>
                        {i === 1 && (
                          <div className="flex items-center gap-1 my-1">
                            <div className="flex-1 h-px" style={{ background: '#1e2235' }} />
                            <span className="text-xs" style={{ color: '#3a3d4e' }}>bench</span>
                            <div className="flex-1 h-px" style={{ background: '#1e2235' }} />
                          </div>
                        )}
                        <DepthCard
                          player={p}
                          isStarter={isStarter}
                          canPromote={canPromote}
                          assignedPos={assignedPos}
                          onClick={() => toggleStarter(p.id)}
                          onDragStart={e => handleDragStart(e, p.id)}
                          onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                          isDragging={draggedId === p.id}
                        />
                      </div>
                    );
                  })
                )}
                {isDropTarget && players.length === 0 && (
                  <div className="rounded-lg p-3 text-center text-xs" style={{ background: '#6c63ff11', border: '1px dashed #6c63ff55', color: '#6c63ff' }}>
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs flex-wrap" style={{ color: '#8b90a7' }}>
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded font-black" style={{ background: '#6c63ff33', color: '#6c63ff' }}>S</span>
          Starter
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: '#1a2a1a', color: '#4ade80' }}>▲</span>
          Click to promote
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: '#92400e33', color: '#fcd34d' }}>PG/SG</span>
          Playing 2nd position
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: '#7f1d1d33', color: '#f87171' }}>⚠ OOP</span>
          Out of position
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: '#8b90a7' }}>☰ Drag</span>
          Move to another column
        </div>
      </div>
    </div>
  );
}
