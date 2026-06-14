import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLeagueStore } from './store/leagueStore';
import { tradeValue, evaluateTrade } from './engine/tradeEngine';
import type { Player } from './types';
import { PlayerModalProvider } from './contexts/PlayerModalContext';
import Layout from './components/Layout';
import PlayerModal from './components/PlayerModal';
import GameSummaryModal from './components/GameSummaryModal';
import SeasonAwardsModal from './components/SeasonAwardsModal';
import Confetti from './components/Confetti';
import Home from './pages/Home';
import TeamSelect from './pages/TeamSelect';
import NewGameSettings from './pages/NewGameSettings';
import Dashboard from './pages/Dashboard';
import Roster from './pages/Roster';
import Standings from './pages/Standings';
import Schedule from './pages/Schedule';
import Trade from './pages/Trade';
import FreeAgents from './pages/FreeAgents';
import League from './pages/League';
import Draft from './pages/Draft';
import Playoffs from './pages/Playoffs';
import Inbox from './pages/Inbox';
import Coaching from './pages/Coaching';
import SeasonHistory from './pages/SeasonHistory';
import Lineup from './pages/Lineup';
import GameSettings from './pages/GameSettings';
import RosterModeSelect from './pages/RosterModeSelect';
import DraftModeSelect from './pages/DraftModeSelect';
import FantasyDraft from './pages/FantasyDraft';
import type { LeagueSettings } from './types';
import { DEFAULT_SETTINGS } from './types';
import type { RosterMode } from './engine/leagueInit';

type Screen = 'home' | 'select' | 'rosterMode' | 'draftMode' | 'settings' | 'game' | 'fantasyDraft';

export default function App() {
  const league                  = useLeagueStore(s => s.league);
  const lastGame                = useLeagueStore(s => s.lastGame);
  const clearLastGame           = useLeagueStore(s => s.clearLastGame);
  const migratePlayerTendencies = useLeagueStore(s => s.migratePlayerTendencies);
  const initNewLeague           = useLeagueStore(s => s.initNewLeague);
  const pendingTradeOffer       = useLeagueStore(s => s.pendingTradeOffer);
  const clearPendingTradeOffer  = useLeagueStore(s => s.clearPendingTradeOffer);
  const acceptIncomingOffer     = useLeagueStore(s => s.acceptIncomingOffer);
  const declineIncomingOffer    = useLeagueStore(s => s.declineIncomingOffer);

  const pendingAwards = useLeagueStore(s => s.pendingAwards);
  const clearAwards   = useLeagueStore(s => s.clearAwards);
  const [screen, setScreen] = useState<Screen>('home');
  const [showConfetti, setShowConfetti] = useState(false);
  const fantasyDraftAuto = useLeagueStore(s => s.fantasyDraftAuto);

  // One-time migration: re-derive tendencies for all players using updated logic
  useEffect(() => {
    if (league) migratePlayerTendencies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!league]);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [pendingSettings, setPendingSettings] = useState<LeagueSettings>(DEFAULT_SETTINGS);
  const [pendingRosterMode, setPendingRosterMode] = useState<RosterMode>('generated');
  const [pendingDraftMode, setPendingDraftMode] = useState<'classic' | 'fantasy'>('classic');

  if (!league && screen === 'game') setScreen('home');


  const isChampGame = lastGame?.isChampionship;

  if (screen === 'home') {
    return (
      <BrowserRouter>
        <Home
          onContinue={() => { if (league) setScreen('game'); }}
          onNewGame={() => setScreen('select')}
        />
      </BrowserRouter>
    );
  }

  if (screen === 'select') {
    return (
      <BrowserRouter>
        <TeamSelect
          onBack={() => setScreen('home')}
          onStart={(teamId) => {
            setPendingTeamId(teamId);
            setPendingSettings(DEFAULT_SETTINGS);
            setScreen('rosterMode');
          }}
        />
      </BrowserRouter>
    );
  }

  if (screen === 'rosterMode') {
    return (
      <BrowserRouter>
        <RosterModeSelect
          onBack={() => setScreen('select')}
          onSelect={(mode) => {
            setPendingRosterMode(mode);
            setScreen('draftMode');
          }}
        />
      </BrowserRouter>
    );
  }

  if (screen === 'draftMode') {
    return (
      <BrowserRouter>
        <DraftModeSelect
          onBack={() => setScreen('rosterMode')}
          onSelect={(mode, autoFantasy) => {
            setPendingDraftMode(mode);
            if (mode === 'fantasy' && autoFantasy) {
              // Start league with fantasy draft then auto-draft instantly
              if (pendingTeamId) {
                initNewLeague(pendingTeamId, pendingSettings, pendingRosterMode, 'fantasy');
                // Auto-draft runs after state is set
                setTimeout(() => {
                  fantasyDraftAuto();
                  setScreen('game');
                }, 50);
              }
            } else {
              setScreen('settings');
            }
          }}
        />
      </BrowserRouter>
    );
  }

  if (screen === 'settings') {
    return (
      <BrowserRouter>
        <NewGameSettings
          settings={pendingSettings}
          onChange={(s) => setPendingSettings(prev => ({ ...prev, ...s }))}
          onBack={() => setScreen('draftMode')}
          onStart={() => {
            if (pendingTeamId) {
              initNewLeague(pendingTeamId, pendingSettings, pendingRosterMode, pendingDraftMode);
            }
            setScreen(pendingDraftMode === 'fantasy' ? 'fantasyDraft' : 'game');
          }}
        />
      </BrowserRouter>
    );
  }

  // Fantasy draft room (manual pick mode)
  if (screen === 'fantasyDraft' || (league?.phase === 'fantasy_draft' && screen === 'game')) {
    return (
      <BrowserRouter>
        <FantasyDraft />
      </BrowserRouter>
    );
  }

  return (
    <PlayerModalProvider>
      <BrowserRouter>
        <Layout onHome={() => setScreen('home')}>
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/roster"     element={<Roster />} />
            <Route path="/standings"  element={<Standings />} />
            <Route path="/schedule"   element={<Schedule />} />
            <Route path="/trade"      element={<Trade />} />
            <Route path="/playoffs"   element={<Playoffs />} />
            <Route path="/draft"      element={<Draft />} />
            <Route path="/freeagents" element={<FreeAgents />} />
            <Route path="/league"     element={<League />} />
            <Route path="/inbox"      element={<Inbox />} />
            <Route path="/coaching"   element={<Coaching />} />
            <Route path="/lineup"     element={<Lineup />} />
            <Route path="/history"    element={<SeasonHistory />} />
            <Route path="/settings"   element={<GameSettings />} />
            <Route path="*"           element={<Navigate to="/" />} />
          </Routes>
        </Layout>

        {/* Player detail modal (global) */}
        <PlayerModal />

        {/* Post-game summary modal */}
        {lastGame && !isChampGame && league && (
          <GameSummaryModal
            summary={lastGame}
            teams={league.teams}
            onClose={clearLastGame}
          />
        )}

        {/* Championship modal */}
        {lastGame && isChampGame && league && (
          <>
            <Confetti
              teamColor={league.teams[league.userTeamId]?.primaryColor}
              onDone={() => {
                
                clearLastGame();
              }}
            />
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
              onClick={() => {  clearLastGame(); }}
            >
              <div className="text-center max-w-sm fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="text-7xl mb-4 score-pop">🏆</div>
                <div className="text-4xl font-black text-white mb-2">CHAMPIONS!</div>
                <div className="text-lg font-bold mb-4" style={{ color: league.teams[league.userTeamId]?.primaryColor ?? '#6c63ff' }}>
                  {league.teams[league.userTeamId]?.city} {league.teams[league.userTeamId]?.name}
                </div>
                {lastGame.events.map((e, i) => (
                  <p key={i} className="text-sm mb-1" style={{ color: '#c5c9d8' }}>{e}</p>
                ))}
                <button
                  className="mt-6 px-8 py-3 rounded-xl font-black text-lg transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff' }}
                  onClick={() => {  clearLastGame(); }}>
                  Celebrate! 🎉
                </button>
              </div>
            </div>
          </>
        )}

        {/* Season awards modal */}
        {pendingAwards && league && (
          <SeasonAwardsModal awards={pendingAwards} league={league} onClose={clearAwards} />
        )}

        {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

        {/* Incoming trade offer interrupt modal */}
        {pendingTradeOffer && league && (() => {
          const offer = pendingTradeOffer;
          const fromTeam = league.teams[offer.fromTeamId];
          const offered = offer.offeredPlayerIds.map(id => league.players[id]).filter(Boolean);
          const wanted  = offer.wantedPlayerIds.map(id => league.players[id]).filter(Boolean);
          const tc = fromTeam?.primaryColor ?? '#6c63ff';

          // Fairness: from user's POV — they receive offeredPlayerIds, give up wantedPlayerIds
          const receiveVal = tradeValue(offer.offeredPlayerIds, league.players, offer.offeredPicks);
          const giveVal    = tradeValue(offer.wantedPlayerIds,  league.players, offer.wantedPicks);
          const fairnessPct = Math.max(receiveVal, giveVal) > 0
            ? ((receiveVal - giveVal) / Math.max(giveVal, 1)) * 100 : 0;
          const vl = fairnessPct > 10
            ? { label: `+${Math.round(fairnessPct)}%`, color: '#4ade80', tip: 'Great deal for you' }
            : fairnessPct < -10
            ? { label: `${Math.round(fairnessPct)}%`, color: '#f87171', tip: 'You give more than you get' }
            : { label: '~Fair', color: '#facc15', tip: 'Roughly equal value' };

          // AI team's willingness
          const aiEval = evaluateTrade(
            { fromTeamId: league.userTeamId, toTeamId: offer.fromTeamId,
              fromPlayerIds: offer.wantedPlayerIds, toPlayerIds: offer.offeredPlayerIds,
              fromPicks: offer.wantedPicks, toPicks: offer.offeredPicks },
            fromTeam!, league.players, league.teams, league.settings
          );

          function statLine(p: Player) {
            const gp = p.seasonStats.gamesPlayed;
            if (!gp) return 'No stats yet';
            return `${(p.seasonStats.points / gp).toFixed(1)} / ${(p.seasonStats.rebounds / gp).toFixed(1)} / ${(p.seasonStats.assists / gp).toFixed(1)} PPG/RPG/APG`;
          }

          function PlayerCard({ p, accent }: { p: Player; accent: string }) {
            return (
              <div className="rounded-xl px-3 py-2.5 mb-1.5" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-sm font-bold text-white">{p.name}</div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>{p.position} · Age {p.age}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black" style={{ color: accent }}>{p.ratings.overall}</div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>OVR</div>
                  </div>
                </div>
                <div className="text-xs font-mono" style={{ color: '#9ca3af' }}>{statLine(p)}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>${p.contract.salary.toFixed(1)}M · {p.contract.yearsLeft}yr left</div>
              </div>
            );
          }

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}>
              <div className="w-full max-w-lg rounded-2xl overflow-hidden fade-in-up"
                style={{ background: '#0d0f17', border: `1px solid ${tc}55`, maxHeight: '90vh', overflowY: 'auto' }}>

                {/* Header */}
                <div className="px-5 py-4 flex items-center gap-3"
                  style={{ background: `linear-gradient(135deg, ${tc}22, #12151e)`, borderBottom: `1px solid ${tc}33` }}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: tc, boxShadow: `0 0 8px ${tc}88` }} />
                  <div className="flex-1">
                    <div className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: tc }}>Trade Offer — Sim Paused</div>
                    <div className="text-base font-black text-white">{fromTeam?.city} {fromTeam?.name} want to make a deal</div>
                  </div>
                  {/* Fairness badge */}
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black" style={{ color: vl.color }}>{vl.label}</div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>{vl.tip}</div>
                  </div>
                </div>

                {/* AI willingness */}
                <div className="px-5 pt-3 pb-1 flex items-center gap-2">
                  <div className="text-xs px-2 py-1 rounded-full font-bold"
                    style={{ background: aiEval.accepted ? '#14532d' : '#450a0a', color: aiEval.accepted ? '#4ade80' : '#f87171' }}>
                    {aiEval.accepted ? '✓ They would accept' : '✗ They would decline'}
                  </div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>{aiEval.reason}</div>
                </div>

                {/* Trade details */}
                <div className="px-5 py-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#4ade80' }}>You Receive</div>
                    {offered.map(p => <PlayerCard key={p.id} p={p} accent="#4ade80" />)}
                    {!offered.length && <div className="text-sm mb-1.5" style={{ color: '#6b7280' }}>No players</div>}
                    {offer.offeredPicks.map((pk, i) => (
                      <div key={i} className="rounded-xl px-3 py-2 mb-1.5 text-sm font-bold"
                        style={{ background: '#12151e', border: '1px solid #1e2235', color: '#facc15' }}>
                        {pk.year} R{pk.round} Pick
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#f87171' }}>You Give Up</div>
                    {wanted.map(p => <PlayerCard key={p.id} p={p} accent="#f87171" />)}
                    {!wanted.length && <div className="text-sm mb-1.5" style={{ color: '#6b7280' }}>No players</div>}
                    {offer.wantedPicks.map((pk, i) => (
                      <div key={i} className="rounded-xl px-3 py-2 mb-1.5 text-sm font-bold"
                        style={{ background: '#12151e', border: '1px solid #1e2235', color: '#facc15' }}>
                        {pk.year} R{pk.round} Pick
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-5 pb-2 text-xs" style={{ color: '#6b7280' }}>
                  Expires Day {offer.expiresDay} · You can also respond later from your Inbox
                </div>

                {/* Buttons */}
                <div className="px-5 pb-5 flex gap-3 mt-1">
                  <button
                    className="flex-1 py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#14532d,#166534)', color: '#4ade80', border: '1px solid #16a34a55' }}
                    onClick={() => acceptIncomingOffer(offer.id)}>
                    Accept Trade
                  </button>
                  <button
                    className="flex-1 py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95"
                    style={{ background: '#1e2235', color: '#f87171', border: '1px solid #f8717133' }}
                    onClick={() => declineIncomingOffer(offer.id)}>
                    Decline
                  </button>
                  <button
                    className="px-4 py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95"
                    style={{ background: '#12151e', color: '#6b7280', border: '1px solid #1e2235' }}
                    onClick={clearPendingTradeOffer}>
                    Later
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </BrowserRouter>
    </PlayerModalProvider>
  );
}
