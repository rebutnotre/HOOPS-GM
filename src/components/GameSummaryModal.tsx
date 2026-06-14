import type { LastGameSummary } from '../types';
import { useRipple } from './Ripple';

interface Props {
  summary: LastGameSummary;
  teams: Record<string, import('../types').Team>;
  onClose: () => void;
}

export default function GameSummaryModal({ summary, teams, onClose }: Props) {
  const { addRipple, rippleEls } = useRipple();
  const { homeTeamId, awayTeamId, homeScore, awayScore, userTeamId, events } = summary;

  const homeTeam = teams[homeTeamId];
  const awayTeam = teams[awayTeamId];
  const userIsHome = homeTeamId === userTeamId;
  const userScore = userIsHome ? homeScore : awayScore;
  const oppScore  = userIsHome ? awayScore : homeScore;
  const won       = userScore > oppScore;
  const oppTeam   = userIsHome ? awayTeam : homeTeam;
  const userTeam  = userIsHome ? homeTeam : awayTeam;
  const margin    = Math.abs(userScore - oppScore);

  const headerBg = won
    ? 'linear-gradient(135deg, #14532d, #166534)'
    : 'linear-gradient(135deg, #450a0a, #7f1d1d)';
  const headerColor = won ? '#4ade80' : '#f87171';
  const resultText  = won ? 'WIN' : 'LOSS';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden fade-in-up"
        style={{ background: '#0d0f17', border: `1px solid ${won ? '#4ade8044' : '#f8717144'}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 text-center relative overflow-hidden" style={{ background: headerBg }}>
          <div className="absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.1), transparent 70%)' }} />
          <div className="text-xs font-black uppercase tracking-[0.2em] mb-1" style={{ color: headerColor }}>
            {resultText}
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="text-right">
              <div className="text-xs font-bold text-white/70">{userTeam?.abbreviation}</div>
              <div className="text-5xl font-black text-white">{userScore}</div>
            </div>
            <div className="text-white/40 text-lg font-bold">–</div>
            <div className="text-left">
              <div className="text-xs font-bold text-white/70">{oppTeam?.abbreviation}</div>
              <div className="text-5xl font-black text-white/70">{oppScore}</div>
            </div>
          </div>
          <div className="text-xs mt-2" style={{ color: headerColor + 'cc' }}>
            {won
              ? margin >= 15 ? 'Dominant victory' : margin <= 5 ? 'Hard-fought win' : 'Solid win'
              : margin >= 15 ? 'Tough loss' : margin <= 5 ? 'Heartbreaker' : 'Tough night'}
          </div>
        </div>

        {/* Events */}
        <div className="px-5 py-4 space-y-2.5">
          {events.map((ev, i) => (
            <div key={i} className="flex gap-2.5 text-sm fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="mt-0.5 shrink-0" style={{ color: won ? '#4ade80' : '#f87171' }}>
                {i === 0 ? '📋' : i === 1 ? '⭐' : i === 2 ? '💪' : i === 3 ? '🛡️' : '⚡'}
              </span>
              <span style={{ color: '#c5c9d8', lineHeight: 1.5 }}>{ev}</span>
            </div>
          ))}
        </div>

        {/* Button */}
        <div className="px-5 pb-5">
          <button
            onClick={(e) => { addRipple(e); onClose(); }}
            className="w-full py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95 relative overflow-hidden"
            style={{ background: won ? 'linear-gradient(135deg,#16532d,#166534)' : 'linear-gradient(135deg,#1e2235,#2e3248)', color: won ? '#4ade80' : '#c5c9d8' }}
          >
            {rippleEls}
            {won ? '🏀 Keep Rolling!' : '📊 Back to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
