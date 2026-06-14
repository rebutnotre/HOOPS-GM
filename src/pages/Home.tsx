import { useState } from 'react';
import { useLeagueStore } from '../store/leagueStore';
import { useRipple } from '../components/Ripple';

interface Props {
  onContinue: () => void;
  onNewGame: () => void;
}

function BasketballSVG({ size = 80, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="40" cy="40" r="38" fill="#c2440c" stroke="#a83a09" strokeWidth="2"/>
      <path d="M40 2 C40 2 40 78 40 78" stroke="#1a0a04" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M2 40 C2 40 78 40 78 40" stroke="#1a0a04" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M8 20 C22 32 22 48 8 60" stroke="#1a0a04" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M72 20 C58 32 58 48 72 60" stroke="#1a0a04" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <circle cx="40" cy="40" r="38" fill="none" stroke="#a83a09" strokeWidth="2"/>
    </svg>
  );
}

function CourtPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="court" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="none" stroke="#ffffff" strokeWidth="1"/>
          <circle cx="100" cy="100" r="30" fill="none" stroke="#ffffff" strokeWidth="1"/>
          <line x1="100" y1="0" x2="100" y2="200" stroke="#ffffff" strokeWidth="0.5"/>
          <rect x="60" y="0" width="80" height="60" fill="none" stroke="#ffffff" strokeWidth="1"/>
          <rect x="60" y="140" width="80" height="60" fill="none" stroke="#ffffff" strokeWidth="1"/>
          <circle cx="100" cy="0" r="20" fill="none" stroke="#ffffff" strokeWidth="0.5"/>
          <circle cx="100" cy="200" r="20" fill="none" stroke="#ffffff" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#court)"/>
    </svg>
  );
}

function visibleColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 60 ? '#a78bfa' : hex;
}

const PHASE_LABEL: Record<string, string> = {
  regular: 'Regular Season',
  playin: 'Play-In',
  playoffs: 'Playoffs',
  draft: 'NBA Draft',
  offseason: 'Offseason',
};

function phaseLabel(league: { phase: string; week: number }) {
  const base = PHASE_LABEL[league.phase] ?? '';
  return league.phase === 'regular' ? `${base} · Day ${league.week}/82` : base;
}

interface SaveCardProps {
  league: import('../types').LeagueState;
  isActive: boolean;
  onContinue: () => void;
  onDelete: () => void;
}

function SaveCard({ league, isActive, onContinue, onDelete }: SaveCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const userTeam = league.teams[league.userTeamId];
  if (!userTeam) return null;

  const gp = userTeam.stats.wins + userTeam.stats.losses;
  const winPct = gp > 0 ? ((userTeam.stats.wins / gp) * 100).toFixed(0) : null;
  const roster = userTeam.rosterIds.map(id => league.players[id]).filter(Boolean);
  const avgOvr = roster.length > 0
    ? Math.round(roster.reduce((s, p) => s + p.ratings.overall, 0) / roster.length)
    : null;
  const tc = visibleColor(userTeam.primaryColor);

  return (
    <div className="rounded-2xl overflow-hidden card-lift"
      style={{ border: `1px solid ${tc}55`, boxShadow: `0 0 30px ${tc}18` }}>

      <div className="px-5 py-4 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${tc}33 0%, ${tc}18 50%, transparent 100%)`,
                 borderBottom: `1px solid ${tc}33` }}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20"
          style={{ background: `radial-gradient(circle at top right, ${tc}, transparent)` }} />

        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: tc }}>
            {isActive ? 'Active Save' : 'Saved Game'} · Season {league.season}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-black shrink-0"
            style={{ background: tc + '33', border: `2px solid ${tc}66`, color: tc }}>
            {userTeam.abbreviation}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-white text-lg leading-tight">{userTeam.city} {userTeam.name}</div>
            <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>{phaseLabel(league)}</div>
          </div>
        </div>

        <div className="mt-3 flex gap-3">
          <div className="text-center">
            <div className="text-xl font-black text-white">{userTeam.stats.wins}–{userTeam.stats.losses}</div>
            <div className="text-xs" style={{ color: '#8b90a7' }}>Record</div>
          </div>
          {winPct && (
            <div className="text-center">
              <div className="text-xl font-black" style={{ color: tc }}>{winPct}%</div>
              <div className="text-xs" style={{ color: '#8b90a7' }}>Win%</div>
            </div>
          )}
          {avgOvr && (
            <div className="text-center">
              <div className="text-xl font-black text-white">{avgOvr}</div>
              <div className="text-xs" style={{ color: '#8b90a7' }}>Avg OVR</div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2" style={{ background: '#0d0f17' }}>
        <button
          onClick={onContinue}
          className="w-full py-3 rounded-xl font-black text-base transition-all hover:opacity-90 active:scale-95"
          style={{ background: `linear-gradient(135deg, ${tc}, ${tc}cc)`, color: '#fff' }}>
          {isActive ? 'Continue →' : 'Load Save →'}
        </button>

        {confirmDelete ? (
          <div className="rounded-xl p-3" style={{ background: '#1c0a0a', border: '1px solid #f8717133' }}>
            <p className="text-sm text-center mb-3" style={{ color: '#fca5a5' }}>
              Delete save? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: '#1e2235', color: '#8b90a7' }}>
                Cancel
              </button>
              <button onClick={onDelete}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80"
                style={{ background: '#7f1d1d', color: '#fca5a5' }}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: '#12151e', color: '#4b5563' }}>
            Delete Save
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home({ onContinue, onNewGame }: Props) {
  const league      = useLeagueStore(s => s.league);
  const savedSlots  = useLeagueStore(s => s.savedSlots);
  const resetLeague = useLeagueStore(s => s.resetLeague);
  const loadSave    = useLeagueStore(s => s.loadSave);
  const deleteSave  = useLeagueStore(s => s.deleteSave);
  const { addRipple: addNewRipple, rippleEls: newRipples } = useRipple();

  const hasSaves = league || savedSlots.length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: '#080a12' }}>

      <CourtPattern />

      {/* Ambient orbs */}
      <div className="absolute top-16 left-12 w-72 h-72 rounded-full opacity-[0.07] float-a pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6c63ff 0%, transparent 65%)', filter: 'blur(2px)' }} />
      <div className="absolute bottom-20 right-12 w-80 h-80 rounded-full opacity-[0.05] float-b pointer-events-none"
        style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 65%)', filter: 'blur(3px)' }} />
      <div className="absolute top-1/2 left-1/4 w-56 h-56 rounded-full opacity-[0.04] float-a pointer-events-none"
        style={{ background: 'radial-gradient(circle, #c2440c 0%, transparent 65%)', animationDelay: '-3s' }} />

      {/* Logo */}
      <div className="mb-10 text-center relative fade-in-up z-10">
        <div className="flex items-center justify-center gap-4 mb-4">
          <BasketballSVG size={60} className="spin-slow" />
          <div>
            <div className="text-6xl font-black tracking-tight text-white leading-none" style={{ letterSpacing: '-0.02em' }}>
              HOOPS <span className="gradient-text">GM</span>
            </div>
          </div>
        </div>
        <p className="text-sm tracking-wide" style={{ color: '#3d4262' }}>
          Build your dynasty. Make the moves. Win the chip.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3 z-10">

        {/* Active save */}
        {league ? (
          <SaveCard
            league={league}
            isActive
            onContinue={onContinue}
            onDelete={() => { resetLeague(); }}
          />
        ) : !hasSaves ? (
          <div className="rounded-2xl p-8 text-center fade-in-up fade-in-up-delay-1"
            style={{ background: '#12151e', border: '1px solid #1e2235' }}>
            <BasketballSVG size={48} className="mx-auto mb-3 opacity-40" />
            <div className="text-sm font-semibold text-white mb-1">No saves found</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>Start a new game below to begin your dynasty.</div>
          </div>
        ) : null}

        {/* Saved slots */}
        {savedSlots.length > 0 && (
          <div className="space-y-3">
            {league && (
              <div className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: '#4b5563' }}>
                Other Saves
              </div>
            )}
            {[...savedSlots].reverse().map(slot => (
              <SaveCard
                key={slot.id}
                league={slot.league}
                isActive={false}
                onContinue={() => { loadSave(slot.id); onContinue(); }}
                onDelete={() => deleteSave(slot.id)}
              />
            ))}
          </div>
        )}

        {/* New Game */}
        <button
          onClick={(e) => { addNewRipple(e); onNewGame(); }}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 relative overflow-hidden fade-in-up fade-in-up-delay-2"
          style={{ background: '#141720', color: '#c5c9d8', border: '1px solid #2e3248' }}>
          {newRipples}
          + New Game
        </button>


      </div>

      <p className="mt-10 text-xs z-10 fade-in-up fade-in-up-delay-3" style={{ color: '#2a2e3e' }}>
        HOOPS GM · Built with Claude
      </p>
    </div>
  );
}
