import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLeagueStore } from '../store/leagueStore';
import type { SimType } from '../store/leagueStore';
import { TRADE_DEADLINE_DAY, REGULAR_SEASON_DAYS } from '../engine/playoffEngine';
import { useRipple } from './Ripple';

// ── SVG Icon set ──────────────────────────────────────────────────────────────
function Icon({ d, size = 16, viewBox = '0 0 24 24' }: { d: string | string[]; size?: number; viewBox?: string }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}
const ICONS: Record<string, ReactElement> = {
  dashboard: <Icon d={['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10']} />,
  roster:    <Icon d={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']} />,
  lineup:    <Icon d={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} />,
  standings: <Icon d={['M18 20V10', 'M12 20V4', 'M6 20v-6']} />,
  schedule:  <Icon d={['M8 2v4', 'M16 2v4', 'M3 10h18', 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z']} />,
  trade:     <Icon d={['M7 16V4m0 0L3 8m4-4 4 4', 'M17 8v12m0 0 4-4m-4 4-4-4']} />,
  playoffs:  <Icon d={['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2z']} />,
  draft:     <Icon d={['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z']} />,
  freeagents:<Icon d={['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M16 11l2 2 4-4']} />,
  coaching:  <Icon d={['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z']} />,
  league:    <Icon d={['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z']} />,
  inbox:     <Icon d={['M22 12h-4l-3 9L9 3l-3 9H2']} />,
  history:   <Icon d={['M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z', 'M12 7v5l3 3']} />,
  settings:  <Icon d={['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']} />,
  home:      <Icon d={['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z']} />,
};

const NAV_BASE = [
  { path: '/',           label: 'Dashboard',   icon: 'dashboard' },
  { path: '/roster',     label: 'Roster',      icon: 'roster' },
  { path: '/lineup',     label: 'Lineup',      icon: 'lineup' },
  { path: '/standings',  label: 'Standings',   icon: 'standings' },
  { path: '/schedule',   label: 'Schedule',    icon: 'schedule' },
  { path: '/trade',      label: 'Trade',       icon: 'trade' },
  { path: '/playoffs',   label: 'Playoffs',    icon: 'playoffs' },
  { path: '/draft',      label: 'Draft',       icon: 'draft' },
  { path: '/freeagents', label: 'Free Agents', icon: 'freeagents' },
  { path: '/coaching',   label: 'Coaching',    icon: 'coaching' },
  { path: '/league',     label: 'League',      icon: 'league' },
  { path: '/inbox',      label: 'Inbox',       icon: 'inbox' },
  { path: '/history',    label: 'History',     icon: 'history' },
  { path: '/settings',   label: 'Settings',    icon: 'settings' },
];

// Dividers between nav groups
const NAV_DIVIDERS_AFTER = new Set(['/schedule', '/draft', '/coaching', '/inbox']);

function SimButton({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  const { addRipple, rippleEls } = useRipple();
  return (
    <button
      onClick={(e) => { addRipple(e); onClick(); }}
      disabled={disabled}
      className="py-1.5 text-xs font-semibold rounded-lg transition-all hover:opacity-80 disabled:opacity-25 disabled:cursor-not-allowed relative overflow-hidden"
      style={{ background: '#131628', color: '#9ba0b8', border: '1px solid #252840' }}>
      {rippleEls}
      {label}
    </button>
  );
}

export default function Layout({ children, onHome }: { children: React.ReactNode; onHome: () => void }) {
  const location = useLocation();
  const league = useLeagueStore(s => s.league);
  const advanceSim = useLeagueStore(s => s.advanceSim);
  const { addRipple: addHomeRipple, rippleEls: homeRipples } = useRipple();

  if (!league) return <>{children}</>;

  const userTeam = league.teams[league.userTeamId];
  const rawTc = userTeam?.primaryColor ?? '#6c63ff';
  const tc = (() => {
    const c = rawTc.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b < 60 ? '#a78bfa' : rawTc;
  })();
  const teamRecord = `${userTeam?.stats.wins}–${userTeam?.stats.losses}`;
  const isDraft = league.phase === 'draft';
  const isOffseason = league.phase === 'offseason';
  const isPlayin = league.phase === 'playin';
  const isPlayoffs = league.phase === 'playoffs';
  const isPostseason = isPlayin || isPlayoffs;
  const isRegular = league.phase === 'regular';
  const isUserDraftTurn = isDraft && (league.draftOrder ?? [])[league.draftPickIndex ?? 0] === league.userTeamId;
  const picks = userTeam?.draftPicks ?? [];
  const unreadCount = (league.notifications ?? []).filter(n => !n.read).length;

  const pastDeadline = isRegular && league.week > TRADE_DEADLINE_DAY;
  const daysLeft = Math.max(0, REGULAR_SEASON_DAYS - league.week + 1);
  const seasonProgress = Math.round(((league.week - 1) / REGULAR_SEASON_DAYS) * 100);

  const bracket = league.playoffBracket ?? [];
  let maxRound = 0;
  bracket.forEach(s => { if (s.round > maxRound) maxRound = s.round; });
  const roundNames = ['', 'Round 1', 'Conf. Semis', 'Conf. Finals', 'NBA Finals'];

  let phaseLabel = '';
  if (isRegular) phaseLabel = `Day ${league.week} / 82`;
  else if (isPlayin) phaseLabel = 'Play-In';
  else if (isPlayoffs) phaseLabel = roundNames[maxRound] ?? 'Playoffs';
  else if (isDraft) phaseLabel = 'Draft Day';
  else if (isOffseason) phaseLabel = 'Offseason';

  function advBtn(type: SimType, label: string, disabled = false) {
    return <SimButton label={label} onClick={() => advanceSim(type)} disabled={disabled} />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080a12' }}>

      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col h-screen overflow-hidden" style={{
        background: '#0d0f1c',
        borderRight: '1px solid #1a1e35',
      }}>

        {/* Logo */}
        <div className="relative px-4 py-4 overflow-hidden shrink-0">
          {/* Team color accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, ${tc}00, ${tc}, ${tc}00)` }} />
          {/* Ambient glow */}
          <div className="absolute top-0 left-0 w-full h-20 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 30% 0%, ${tc}18, transparent 70%)` }} />

          <div className="relative">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${tc}22`, border: `1px solid ${tc}44` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill={tc} opacity="0.9"/>
                  <path d="M12 2C12 2 12 22 12 22" stroke="#00000066" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M2 12C2 12 22 12 22 12" stroke="#00000066" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M4.5 6C9 9 9 15 4.5 18" stroke="#00000066" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <path d="M19.5 6C15 9 15 15 19.5 18" stroke="#00000066" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <div className="text-sm font-black tracking-widest uppercase" style={{ color: tc, letterSpacing: '0.12em' }}>
                Hoops GM
              </div>
            </div>
            <div className="text-xs ml-8" style={{ color: '#7a8099' }}>Season {league.season}</div>
          </div>
        </div>

        {/* Team card */}
        <div className="mx-3 mb-2 rounded-xl p-3 shrink-0 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${tc}18, ${tc}08)`, border: `1px solid ${tc}28` }}>
          <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
            style={{ background: `radial-gradient(circle at top right, ${tc}20, transparent 70%)` }} />
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
              style={{ background: `${tc}28`, border: `1.5px solid ${tc}50`, color: tc }}>
              {userTeam?.abbreviation}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-white leading-tight truncate">
                {userTeam?.city} {userTeam?.name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>{phaseLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-lg font-black leading-none text-white">{teamRecord}</div>
              <div className="text-xs mt-0.5" style={{ color: '#7a8099' }}>W–L</div>
            </div>
            {isRegular && (
              <div className="flex-1">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1a1d2e' }}>
                  <div className="h-full rounded-full" style={{ width: `${seasonProgress}%`, background: tc }} />
                </div>
                <div className="text-xs mt-1" style={{ color: '#7a8099' }}>{seasonProgress}% done</div>
              </div>
            )}
          </div>
          {picks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {picks.slice(0, 4).map((pk, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: `${tc}18`, color: `${tc}cc`, border: `1px solid ${tc}28` }}>
                  {pk.year} R{pk.round}
                </span>
              ))}
              {picks.length > 4 && <span className="text-xs self-center" style={{ color: '#7a8099' }}>+{picks.length - 4}</span>}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5">
          {NAV_BASE.map(item => {
            const active = location.pathname === item.path;
            const isDraftAlert = item.path === '/draft' && isUserDraftTurn;
            const isPlayoffAlert = item.path === '/playoffs' && isPostseason;
            const hasUnread = item.path === '/inbox' && unreadCount > 0;

            return (
              <div key={item.path}>
                <Link
                  to={item.path}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all relative group"
                  style={{
                    color: active ? '#fff' : isDraftAlert ? '#facc15' : isPlayoffAlert ? '#34d399' : '#8b90a7',
                    background: active ? `${tc}18` : 'transparent',
                  }}
                >
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute left-0 top-[20%] bottom-[20%] w-[2px] rounded-r-full"
                      style={{ background: tc }} />
                  )}

                  {/* Icon */}
                  <span className="shrink-0 transition-colors"
                    style={{ color: active ? tc : isDraftAlert ? '#facc15' : isPlayoffAlert ? '#34d399' : '#6b7280' }}>
                    {ICONS[item.icon]}
                  </span>

                  <span className="font-medium text-xs flex-1">{item.label}</span>

                  {/* Badges */}
                  {isDraftAlert && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-black badge-pulse"
                      style={{ background: '#facc1520', color: '#facc15', fontSize: '9px' }}>PICK</span>
                  )}
                  {isPlayoffAlert && !isDraftAlert && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-black badge-pulse"
                      style={{ background: '#34d39920', color: '#34d399', fontSize: '9px' }}>LIVE</span>
                  )}
                  {hasUnread && !isDraftAlert && (
                    <span className="min-w-[16px] h-4 rounded-full text-xs font-black flex items-center justify-center px-1"
                      style={{ background: '#f87171', color: '#fff', fontSize: '9px' }}>{unreadCount}</span>
                  )}
                </Link>

                {NAV_DIVIDERS_AFTER.has(item.path) && (
                  <div className="mx-3 my-1.5" style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />
                )}
              </div>
            );
          })}
        </nav>

        {/* Home button */}
        <div className="px-2 pb-2 shrink-0">
          <button
            onClick={(e) => { addHomeRipple(e); onHome(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 relative overflow-hidden"
            style={{ background: '#131628', color: '#7a8099', border: '1px solid rgba(255,255,255,0.04)' }}>
            {homeRipples}
            <span style={{ color: '#7a8099' }}>{ICONS.home}</span>
            Main Menu
          </button>
        </div>

        {/* Sim controls */}
        <div className="px-2 pb-3 shrink-0 space-y-1.5">
          <div className="h-px mx-1 mb-2" style={{ background: 'rgba(255,255,255,0.04)' }} />

          {isOffseason ? (
            <div className="text-xs text-center py-2.5 rounded-lg font-semibold" style={{ background: '#131628', color: '#7a8099' }}>
              Season Complete
            </div>
          ) : isDraft ? (
            <Link to="/draft"
              className="block w-full text-center py-2.5 rounded-lg text-sm font-black transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: isUserDraftTurn ? `linear-gradient(135deg,#facc15,#f59e0b)` : `linear-gradient(135deg,${tc},${tc}cc)`, color: isUserDraftTurn ? '#000' : '#fff' }}>
              {isUserDraftTurn ? '★ Your Pick!' : 'Go to Draft →'}
            </Link>
          ) : isPlayin ? (
            <button onClick={() => advanceSim()}
              className="w-full py-2.5 rounded-lg text-sm font-black transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#34d399,#059669)', color: '#fff' }}>
              Sim Play-In →
            </button>
          ) : isPlayoffs ? (
            <button onClick={() => advanceSim()}
              className="w-full py-2.5 rounded-lg text-sm font-black transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff' }}>
              Sim Playoffs →
            </button>
          ) : (
            <>
              <button onClick={() => advanceSim('game')}
                className="w-full py-2.5 rounded-lg text-sm font-black transition-all hover:opacity-90 active:scale-[0.98] relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${tc}, ${tc}cc)`, color: '#fff',
                         boxShadow: daysLeft > 0 ? `0 4px 16px ${tc}44` : 'none' }}>
                ▶ Next Game
              </button>
              <div className="grid grid-cols-2 gap-1">
                {advBtn('week', '+7 Days')}
                {advBtn('month', '+14 Days')}
                {advBtn('deadline', '→ Deadline', pastDeadline || daysLeft === 0)}
                {advBtn('season', '→ End', daysLeft === 0)}
              </div>
              <div className="text-xs text-center" style={{ color: pastDeadline ? '#f87171aa' : '#6b7280' }}>
                {pastDeadline
                  ? 'Deadline passed'
                  : daysLeft > 0
                    ? `${daysLeft}g left · TDL in ${TRADE_DEADLINE_DAY - league.week + 1}`
                    : 'Season complete'}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6" style={{ background: '#090b14' }}>
        {children}
      </main>
    </div>
  );
}
