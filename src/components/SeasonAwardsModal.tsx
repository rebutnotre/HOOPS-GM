import type { SeasonAwards, LeagueState } from '../types';
import PlayerPhoto from './PlayerPhoto';
import { OverallBadge } from './RatingBar';
import { useRipple } from './Ripple';

interface Props {
  awards: SeasonAwards;
  league: LeagueState;
  onClose: () => void;
}

function AwardCard({ icon, title, playerId, teamId, value, league, isUser }: {
  icon: string;
  title: string;
  playerId?: string;
  teamId?: string;
  value: string;
  league: LeagueState;
  isUser?: boolean;
}) {
  const player = playerId ? league.players[playerId] : null;
  const team   = teamId   ? league.teams[teamId]     : null;

  return (
    <div className={`rounded-xl p-3 card-lift ${isUser ? 'pulse-glow' : ''}`}
      style={{
        background: isUser ? `${team?.primaryColor ?? '#6c63ff'}22` : '#12151e',
        border: `1px solid ${isUser ? (team?.primaryColor ?? '#6c63ff') + '66' : '#1e2235'}`,
        '--glow-color': (team?.primaryColor ?? '#6c63ff') + '44',
      } as React.CSSProperties}>
      <div className="flex items-center gap-1.5 mb-2">
        <span>{icon}</span>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: isUser ? (team?.primaryColor ?? '#6c63ff') : '#8b90a7' }}>
          {title}
        </span>
        {isUser && <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-black" style={{ background: '#6c63ff33', color: '#a78bfa' }}>YOU</span>}
      </div>
      {player ? (
        <div className="flex items-center gap-2">
          <PlayerPhoto seed={player.photoSeed} size={36} name={player.name} teamColor={team?.primaryColor} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white truncate">{player.name}</div>
            <div className="text-xs" style={{ color: '#8b90a7' }}>{team?.abbreviation} · {player.position}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-black text-white">{value}</div>
            <OverallBadge value={player.ratings.overall} />
          </div>
        </div>
      ) : (
        <div className="text-sm font-bold text-white">{team ? `${team.city} ${team.name}` : '—'} <span style={{ color: '#8b90a7' }}>· {value}</span></div>
      )}
    </div>
  );
}

export default function SeasonAwardsModal({ awards, league, onClose }: Props) {
  const { addRipple, rippleEls } = useRipple();
  const userTeamId = league.userTeamId;

  function isUserPlayer(playerId?: string) {
    return !!playerId && league.players[playerId]?.teamId === userTeamId;
  }
  function isUserTeam(teamId?: string) {
    return teamId === userTeamId;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden fade-in-up"
        style={{ background: '#0d0f17', border: '1px solid #f59e0b55', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#78350f,#451a03)', borderBottom: '1px solid #f59e0b44' }}>
          <div className="absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.2), transparent 70%)' }} />
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-xl font-black text-white">{awards.season} Season Awards</div>
          <div className="text-sm mt-0.5" style={{ color: '#fbbf24' }}>Regular season complete — here are the winners</div>
        </div>

        {/* Awards grid */}
        <div className="p-5 space-y-3">
          {/* Main awards */}
          <div className="grid grid-cols-2 gap-3">
            {awards.mvp && (
              <div className="col-span-2">
                <AwardCard icon="⭐" title="Most Valuable Player" playerId={awards.mvp.playerId}
                  teamId={awards.mvp.teamId} value={awards.mvp.value} league={league}
                  isUser={isUserPlayer(awards.mvp.playerId)} />
              </div>
            )}
            {awards.dpoy && (
              <AwardCard icon="🛡️" title="Defensive Player of the Year" playerId={awards.dpoy.playerId}
                teamId={awards.dpoy.teamId} value={awards.dpoy.value} league={league}
                isUser={isUserPlayer(awards.dpoy.playerId)} />
            )}
            {awards.sixthMan && (
              <AwardCard icon="⚡" title="6th Man of the Year" playerId={awards.sixthMan.playerId}
                teamId={awards.sixthMan.teamId} value={awards.sixthMan.value} league={league}
                isUser={isUserPlayer(awards.sixthMan.playerId)} />
            )}
            {awards.scoringChamp && (
              <AwardCard icon="🏀" title="Scoring Champion" playerId={awards.scoringChamp.playerId}
                teamId={awards.scoringChamp.teamId} value={awards.scoringChamp.value} league={league}
                isUser={isUserPlayer(awards.scoringChamp.playerId)} />
            )}
            {awards.reboundsChamp && (
              <AwardCard icon="💪" title="Rebounds Leader" playerId={awards.reboundsChamp.playerId}
                teamId={awards.reboundsChamp.teamId} value={awards.reboundsChamp.value} league={league}
                isUser={isUserPlayer(awards.reboundsChamp.playerId)} />
            )}
            {awards.assistsChamp && (
              <AwardCard icon="🎯" title="Assists Leader" playerId={awards.assistsChamp.playerId}
                teamId={awards.assistsChamp.teamId} value={awards.assistsChamp.value} league={league}
                isUser={isUserPlayer(awards.assistsChamp.playerId)} />
            )}
            {awards.mostImproved && (
              <AwardCard icon="📈" title="Most Improved" playerId={awards.mostImproved.playerId}
                teamId={awards.mostImproved.teamId} value={awards.mostImproved.value} league={league}
                isUser={isUserPlayer(awards.mostImproved.playerId)} />
            )}
            {awards.bestRecord && (
              <AwardCard icon="👑" title="Best Record" teamId={awards.bestRecord.teamId}
                value={`${awards.bestRecord.wins}–${awards.bestRecord.losses}`} league={league}
                isUser={isUserTeam(awards.bestRecord.teamId)} />
            )}
          </div>

          {/* All-NBA Teams */}
          {awards.allNbaFirst && awards.allNbaFirst.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2235' }}>
              <div className="px-4 py-2 text-xs font-black uppercase tracking-widest" style={{ background: '#12151e', color: '#f59e0b' }}>
                All-NBA Teams
              </div>
              {[
                { label: '1st Team', ids: awards.allNbaFirst ?? [], color: '#f59e0b' },
                { label: '2nd Team', ids: awards.allNbaSecond ?? [], color: '#9ca3af' },
                { label: '3rd Team', ids: awards.allNbaThird ?? [], color: '#92400e' },
              ].map(({ label, ids, color }) => ids.length > 0 && (
                <div key={label} className="px-4 py-2 border-t" style={{ borderColor: '#1e2235' }}>
                  <div className="text-xs font-bold mb-1.5" style={{ color }}>{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {ids.map(id => {
                      const p = league.players[id];
                      if (!p) return null;
                      const isMe = p.teamId === userTeamId;
                      return (
                        <div key={id} className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                          style={{ background: isMe ? `${color}22` : '#1e2235', border: isMe ? `1px solid ${color}55` : 'none' }}>
                          <span className="text-xs font-bold text-white">{p.name}</span>
                          <span className="text-xs" style={{ color: '#6b7280' }}>{p.ratings.overall}</span>
                          {isMe && <span className="text-xs font-black" style={{ color }}>★</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button onClick={(e) => { addRipple(e); onClose(); }}
            className="w-full py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#78350f,#92400e)', color: '#fbbf24' }}>
            {rippleEls}
            On to the Playoffs! 🏆
          </button>
        </div>
      </div>
    </div>
  );
}
