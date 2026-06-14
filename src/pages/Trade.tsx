import { useState } from 'react';
import { useLeagueStore } from '../store/leagueStore';
import type { Player, TradeOffer, DraftPick, Team } from '../types';
import PlayerPhoto from '../components/PlayerPhoto';
import { OverallBadge } from '../components/RatingBar';
import { pickValue, tradeValue, playerValue, evaluateTrade, findTradesForPackage, generateCounterOffer } from '../engine/tradeEngine';
import { formatHeight } from '../engine/playerGen';
import { getTeamCategory } from '../utils/teamCategory';
import PlayerTradeCard from '../components/PlayerTradeCard';
import PlayerDetailModal from '../components/PlayerDetailModal';

// ── helpers ────────────────────────────────────────────────────────────────

function pickKey(p: DraftPick) { return `${p.year}_${p.round}_${p.fromTeamId}`; }

function pickLabel(pick: DraftPick, teams: Record<string, Team>) {
  const from = teams[pick.fromTeamId]?.abbreviation ?? '?';
  return `${pick.year} R${pick.round} (${from})`;
}

function valueLabel(v: number) {
  if (v > 10) return { label: `+${Math.round(v)}%`, color: '#4ade80', tip: `You gain ${Math.round(v)}% more value than you give` };
  if (v < -10) return { label: `${Math.round(v)}%`, color: '#f87171', tip: `You give ${Math.abs(Math.round(v))}% more value than you get` };
  return { label: '~Fair', color: '#facc15', tip: 'Roughly equal value' };
}

function statLine(p: Player): string {
  const gp = p.seasonStats.gamesPlayed;
  if (!gp) return 'No stats yet';
  return `${(p.seasonStats.points / gp).toFixed(1)} / ${(p.seasonStats.rebounds / gp).toFixed(1)} / ${(p.seasonStats.assists / gp).toFixed(1)}`;
}

// ── shared selectable components ──────────────────────────────────────────

function PlayerSelectRow({
  player, selected, onToggle, onInfo, teamColor, accent = '#6c63ff', checkColor = '#fff',
}: {
  player: Player; selected: boolean; onToggle: () => void; onInfo: () => void;
  teamColor?: string; accent?: string; checkColor?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg flex-1 text-left transition-all min-w-0"
        style={{ background: selected ? accent + '18' : '#12151e', border: `1px solid ${selected ? accent : '#1e2235'}` }}
      >
        <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center text-xs font-black"
          style={{ background: selected ? accent : '#1e2235', color: checkColor }}>
          {selected && '✓'}
        </div>
        <PlayerPhoto seed={player.photoSeed} size={28} name={player.name} teamColor={teamColor} />
        <div className="flex-1 min-w-0">
          <button
            onClick={e => { e.stopPropagation(); onInfo(); }}
            className="text-xs font-semibold text-white truncate block hover:underline text-left w-full"
          >{player.name}</button>
          <div className="text-xs" style={{ color: '#8b90a7' }}>
            {player.position}{player.secondaryPosition ? `/${player.secondaryPosition}` : ''}{player.height ? ` · ${formatHeight(player.height)}` : ''} · {player.ratings.overall} OVR · Age {player.age} · ${player.contract.salary.toFixed(2)}M
          </div>
          <div className="text-xs" style={{ color: '#6b7280' }}>{statLine(player)}</div>
        </div>
        <OverallBadge value={player.ratings.overall} />
      </button>
    </div>
  );
}

function PickSelectRow({
  pick, selected, onToggle, teams, accent = '#6c63ff',
}: {
  pick: DraftPick; selected: boolean; onToggle: () => void; teams: Record<string, Team>; accent?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left transition-all text-xs"
      style={{ background: selected ? accent + '18' : '#12151e', border: `1px solid ${selected ? accent : '#1e2235'}` }}
    >
      <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center text-xs font-black"
        style={{ background: selected ? accent : '#1e2235', color: '#fff' }}>
        {selected && '✓'}
      </div>
      <span className="text-base leading-none">🎯</span>
      <span className="text-white flex-1">{pickLabel(pick, teams)}</span>
      <span style={{ color: '#8b90a7' }}>~{pickValue(pick).toFixed(0)} val</span>
    </button>
  );
}

// ── Find Trade tab ─────────────────────────────────────────────────────────

function OfferCard({ offer, league, onPropose, proposedResult }: {
  offer: TradeOffer;
  league: import('../types').LeagueState;
  onPropose: (offer: TradeOffer) => void;
  proposedResult: { accepted: boolean; reason: string } | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editFromIds, setEditFromIds] = useState<string[]>(offer.fromPlayerIds);
  const [editToIds, setEditToIds] = useState<string[]>(offer.toPlayerIds);
  const [editFromPickKeys, setEditFromPickKeys] = useState<string[]>(offer.fromPicks.map(p => pickKey(p)));
  const [editToPickKeys, setEditToPickKeys] = useState<string[]>(offer.toPicks.map(p => pickKey(p)));
  const [counterOffer, setCounterOffer] = useState<TradeOffer | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  const toTeam = league.teams[offer.toTeamId];
  const userTeam = league.teams[offer.fromTeamId];
  const cat = toTeam ? getTeamCategory(toTeam, league.players) : null;

  const curFromIds = isEditing ? editFromIds : offer.fromPlayerIds;
  const curToIds   = isEditing ? editToIds   : offer.toPlayerIds;
  const userPicks  = userTeam?.draftPicks ?? [];
  const theirPicks = toTeam?.draftPicks ?? [];
  const curFromPicks = isEditing ? userPicks.filter(p => editFromPickKeys.includes(pickKey(p))) : offer.fromPicks;
  const curToPicks   = isEditing ? theirPicks.filter(p => editToPickKeys.includes(pickKey(p))) : offer.toPicks;

  const giving    = curFromIds.map(id => league.players[id]).filter(Boolean);
  const receiving = curToIds.map(id => league.players[id]).filter(Boolean);

  const myVal    = tradeValue(curFromIds, league.players, curFromPicks);
  const theirVal = tradeValue(curToIds,   league.players, curToPicks);
  const fairness = Math.max(myVal, theirVal) > 0 ? ((theirVal - myVal) / Math.max(myVal, 1)) * 100 : 0;
  const vl = valueLabel(fairness);

  const editedOffer: TradeOffer = {
    ...offer,
    fromPlayerIds: curFromIds,
    toPlayerIds: curToIds,
    fromPicks: curFromPicks,
    toPicks: curToPicks,
  };
  const eval_ = evaluateTrade(editedOffer, toTeam, league.players, league.teams, league.settings);

  function handleGetCounter() {
    if (!toTeam) return;
    const userTeam = league.teams[offer.fromTeamId];
    const counter = generateCounterOffer(editedOffer, toTeam, userTeam, league.players, league.teams);
    setCounterOffer(counter);
  }

  function applyCounter() {
    if (!counterOffer) return;
    setEditFromIds(counterOffer.fromPlayerIds);
    setEditToIds(counterOffer.toPlayerIds);
    setEditFromPickKeys(counterOffer.fromPicks.map(p => pickKey(p)));
    setEditToPickKeys(counterOffer.toPicks.map(p => pickKey(p)));
    setCounterOffer(null);
    setIsEditing(true);
  }

  const userRoster  = (userTeam?.rosterIds ?? []).map(id => league.players[id]).filter(Boolean).sort((a, b) => b.ratings.overall - a.ratings.overall);
  const theirRoster = (toTeam?.rosterIds ?? []).map(id => league.players[id]).filter(Boolean).sort((a, b) => b.ratings.overall - a.ratings.overall);

  function toggleId(id: string, list: string[], set: (l: string[]) => void) {
    set(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }
  function togglePk(pick: DraftPick, list: string[], set: (l: string[]) => void) {
    const k = pickKey(pick);
    set(list.includes(k) ? list.filter(x => x !== k) : [...list, k]);
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ border: `1px solid ${isEditing ? (toTeam?.primaryColor ?? '#6c63ff') + '55' : '#2e3248'}`, background: '#0d1018' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: toTeam?.primaryColor }} />
          <span className="text-sm font-semibold text-white">{toTeam?.city} {toTeam?.name}</span>
          {cat && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: eval_.accepted ? '#16532d' : '#450a0a', color: eval_.accepted ? '#4ade80' : '#f87171' }}>
            {eval_.accepted ? '✓ Likely accepted' : '✗ May reject'}
          </span>
          <span className="text-xs font-bold" style={{ color: vl.color }}>{vl.label}</span>
          {(!proposedResult || (proposedResult && !proposedResult.accepted)) && !eval_.accepted && (
            <button onClick={handleGetCounter}
              className="text-xs px-2 py-0.5 rounded font-bold transition-all hover:opacity-80"
              style={{ background: '#2a1d00', color: '#facc15', border: '1px solid #facc1533' }}>
              ↩ Counter
            </button>
          )}
          {!proposedResult && (
            <button onClick={() => { setIsEditing(e => !e); setCounterOffer(null); }}
              className="text-xs px-2 py-0.5 rounded font-bold transition-all hover:opacity-80"
              style={{ background: isEditing ? (toTeam?.primaryColor ?? '#6c63ff') + '33' : '#1e2235', color: isEditing ? (toTeam?.primaryColor ?? '#6c63ff') : '#8b90a7', border: `1px solid ${isEditing ? (toTeam?.primaryColor ?? '#6c63ff') + '55' : '#2e3248'}` }}>
              {isEditing ? '✕ Done' : '✎ Edit'}
            </button>
          )}
        </div>
      </div>

      {/* Edit panels */}
      {isEditing && (
        <div className="grid grid-cols-2 gap-3 rounded-xl p-3" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
          <div>
            <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#f87171' }}>You Give (edit)</div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {userRoster.map(p => (
                <PlayerSelectRow key={p.id} player={p}
                  selected={editFromIds.includes(p.id)}
                  onToggle={() => toggleId(p.id, editFromIds, setEditFromIds)}
                  onInfo={() => setViewingPlayer(p)}
                  teamColor={userTeam?.primaryColor} accent="#f87171" checkColor="#fff" />
              ))}
            </div>
            {userPicks.length > 0 && (
              <div className="mt-2 space-y-1">
                {userPicks.map(pk => (
                  <PickSelectRow key={pickKey(pk)} pick={pk}
                    selected={editFromPickKeys.includes(pickKey(pk))}
                    onToggle={() => togglePk(pk, editFromPickKeys, setEditFromPickKeys)}
                    teams={league.teams} accent="#f87171" />
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#34d399' }}>You Receive (edit)</div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {theirRoster.map(p => (
                <PlayerSelectRow key={p.id} player={p}
                  selected={editToIds.includes(p.id)}
                  onToggle={() => toggleId(p.id, editToIds, setEditToIds)}
                  onInfo={() => setViewingPlayer(p)}
                  teamColor={toTeam?.primaryColor} accent="#34d399" checkColor="#000" />
              ))}
            </div>
            {theirPicks.length > 0 && (
              <div className="mt-2 space-y-1">
                {theirPicks.map(pk => (
                  <PickSelectRow key={pickKey(pk)} pick={pk}
                    selected={editToPickKeys.includes(pickKey(pk))}
                    onToggle={() => togglePk(pk, editToPickKeys, setEditToPickKeys)}
                    teams={league.teams} accent="#34d399" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trade preview */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs mb-1.5 font-semibold" style={{ color: '#f87171' }}>You give</div>
          <div className="space-y-2">
            {giving.map((p, i) => (
              <PlayerTradeCard key={p.id} player={p} side="give"
                comparePlayer={receiving[i] ?? receiving[0]} teamColor={userTeam?.primaryColor}
                onClick={() => setViewingPlayer(p)} />
            ))}
            {curFromPicks.map((pk, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs" style={{ background: '#1a0f0f', border: '1px solid #f8717122' }}>
                <span>🎯</span><span className="text-white">{pickLabel(pk, league.teams)}</span>
              </div>
            ))}
            {!giving.length && !curFromPicks.length && <div className="text-xs" style={{ color: '#8b90a7' }}>Nothing selected</div>}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1.5 font-semibold" style={{ color: '#34d399' }}>You receive</div>
          <div className="space-y-2">
            {receiving.map((p, i) => (
              <PlayerTradeCard key={p.id} player={p} side="receive"
                comparePlayer={giving[i] ?? giving[0]} teamColor={toTeam?.primaryColor}
                onClick={() => setViewingPlayer(p)} />
            ))}
            {curToPicks.map((pk, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs" style={{ background: '#0f1e16', border: '1px solid #34d39922' }}>
                <span>🎯</span><span className="text-white">{pickLabel(pk, league.teams)}</span>
              </div>
            ))}
            {!receiving.length && !curToPicks.length && <div className="text-xs" style={{ color: '#8b90a7' }}>—</div>}
          </div>
        </div>
      </div>

      {/* Counter-offer panel */}
      {counterOffer && (() => {
        const cFromPlayers = counterOffer.fromPlayerIds.map(id => league.players[id]).filter(Boolean);
        const cToPlayers   = counterOffer.toPlayerIds.map(id => league.players[id]).filter(Boolean);
        const tc = toTeam?.primaryColor ?? '#facc15';
        return (
          <div className="rounded-xl p-3 space-y-2" style={{ background: '#1a1500', border: `1px solid ${tc}44` }}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-widest" style={{ color: tc }}>
                ↩ {toTeam?.city} {toTeam?.name} Counter
              </div>
              <button onClick={() => setCounterOffer(null)} className="text-xs" style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-semibold mb-1" style={{ color: '#f87171' }}>You give</div>
                {cFromPlayers.map(p => <div key={p.id} className="text-white truncate">{p.name} <span style={{ color: '#6b7280' }}>({p.ratings.overall})</span></div>)}
                {counterOffer.fromPicks.map((pk, i) => <div key={i} className="text-white">🎯 R{pk.round}</div>)}
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: '#34d399' }}>You receive</div>
                {cToPlayers.map(p => <div key={p.id} className="text-white truncate">{p.name} <span style={{ color: '#6b7280' }}>({p.ratings.overall})</span></div>)}
                {counterOffer.toPicks.map((pk, i) => <div key={i} className="text-white">🎯 R{pk.round}</div>)}
                {!cToPlayers.length && !counterOffer.toPicks.length && <div style={{ color: '#6b7280' }}>Nothing</div>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={applyCounter}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-90"
                style={{ background: tc + '33', color: tc, border: `1px solid ${tc}55` }}>
                Apply Counter & Edit
              </button>
              <button onClick={() => onPropose(counterOffer)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
                Accept & Propose
              </button>
            </div>
          </div>
        );
      })()}

      {proposedResult?.accepted ? (
        <div className="px-3 py-2 rounded-lg text-sm font-semibold text-center"
          style={{ background: '#16532d', color: '#4ade80' }}>
          ✓ Trade Accepted!
        </div>
      ) : (
        <>
          {proposedResult && (
            <div className="px-3 py-2 rounded-lg text-sm font-semibold text-center"
              style={{ background: '#450a0a', color: '#f87171' }}>
              {'✗ ' + proposedResult.reason}
            </div>
          )}
          <button
            onClick={() => { setCounterOffer(null); onPropose(editedOffer); }}
            disabled={!curFromIds.length && !curFromPicks.length}
            className="w-full py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
            {proposedResult ? 'Propose Again' : 'Propose This Trade'}
          </button>
        </>
      )}
      {viewingPlayer && (
        <PlayerDetailModal
          player={viewingPlayer}
          teamColor={viewingPlayer.teamId ? league.teams[viewingPlayer.teamId]?.primaryColor : undefined}
          onClose={() => setViewingPlayer(null)}
        />
      )}
    </div>
  );
}

function FindTradeTab() {
  const league = useLeagueStore(s => s.league);
  const proposeTrade = useLeagueStore(s => s.proposeTrade);

  const [myPlayerIds, setMyPlayerIds] = useState<string[]>([]);
  const [myPickKeys, setMyPickKeys] = useState<string[]>([]);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);
  const [wantPlayerIds, setWantPlayerIds] = useState<string[]>([]);
  const [wantPickKeys, setWantPickKeys] = useState<string[]>([]);
  const [foundOffers, setFoundOffers] = useState<TradeOffer[] | null>(null);
  const [proposedResults, setProposedResults] = useState<Record<number, { accepted: boolean; reason: string }>>({});
  const [directCounter, setDirectCounter] = useState<TradeOffer | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  if (!league) return null;

  const userTeam = league.teams[league.userTeamId];
  const myRoster = userTeam.rosterIds.map(id => league.players[id]).filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);
  const myPicks = userTeam.draftPicks;

  const targetTeam = targetTeamId ? league.teams[targetTeamId] : null;
  const theirPicks = targetTeam?.draftPicks ?? [];

  const selectedMyPicks = myPicks.filter(p => myPickKeys.includes(pickKey(p)));
  const selectedTheirPicks = theirPicks.filter(p => wantPickKeys.includes(pickKey(p)));

  const myVal = tradeValue(myPlayerIds, league.players, selectedMyPicks);
  const theirVal = tradeValue(wantPlayerIds, league.players, selectedTheirPicks);
  const fairness = Math.max(myVal, theirVal) > 0 ? ((theirVal - myVal) / Math.max(myVal, 1)) * 100 : 0;
  const vl = valueLabel(fairness);

  const hasOffer = myPlayerIds.length > 0 || selectedMyPicks.length > 0;
  const hasWant = wantPlayerIds.length > 0 || selectedTheirPicks.length > 0;

  const otherTeams = Object.values(league.teams)
    .filter(t => t.id !== league.userTeamId)
    .sort((a, b) => `${a.conference}${a.city}`.localeCompare(`${b.conference}${b.city}`));

  function toggle(id: string, list: string[], setList: (l: string[]) => void) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    setFoundOffers(null); setProposedResults({}); setDirectCounter(null);
  }
  function togglePick(pick: DraftPick, list: string[], setList: (l: string[]) => void) {
    const k = pickKey(pick);
    setList(list.includes(k) ? list.filter(x => x !== k) : [...list, k]);
    setFoundOffers(null); setProposedResults({}); setDirectCounter(null);
  }

  function selectTeam(id: string) {
    if (targetTeamId === id) { setTargetTeamId(null); return; }
    setTargetTeamId(id);
    setWantPlayerIds([]);
    setWantPickKeys([]);
    setFoundOffers(null); setProposedResults({}); setDirectCounter(null);
  }

  function handleFindTrade() {
    if (!hasOffer || !league) return;
    const offers = findTradesForPackage(myPlayerIds, selectedMyPicks, league.userTeamId, league.teams, league.players);
    setFoundOffers(offers);
    setTargetTeamId(null);
    setWantPlayerIds([]);
    setWantPickKeys([]);
    setProposedResults({});
  }

  function autoFillOffer() {
    const needed = theirVal;
    const currentVal = myVal;
    if (currentVal >= needed * 0.9) return;
    const candidates = myRoster.filter(p => !myPlayerIds.includes(p.id))
      .sort((a, b) => playerValue(b) - playerValue(a));
    const newIds = [...myPlayerIds];
    const newKeys = [...myPickKeys];
    let addedVal = currentVal;
    for (const p of candidates) {
      if (addedVal >= needed * 0.9) break;
      newIds.push(p.id);
      addedVal += playerValue(p);
    }
    for (const pick of myPicks) {
      if (addedVal >= needed * 0.9) break;
      const k = pickKey(pick);
      if (newKeys.includes(k)) continue;
      newKeys.push(k);
      addedVal += pickValue(pick);
    }
    setMyPlayerIds(newIds);
    setMyPickKeys(newKeys);
  }

  function handleProposeDirect() {
    if (!league || !targetTeamId || !hasOffer || !hasWant) return;
    const offer: TradeOffer = {
      fromTeamId: league.userTeamId,
      toTeamId: targetTeamId,
      fromPlayerIds: myPlayerIds,
      toPlayerIds: wantPlayerIds,
      fromPicks: selectedMyPicks,
      toPicks: selectedTheirPicks,
    };
    const res = proposeTrade(offer);
    setProposedResults({ 0: res });
    if (res.accepted) {
      setMyPlayerIds([]); setMyPickKeys([]);
      setWantPlayerIds([]); setWantPickKeys([]);
      setTargetTeamId(null);
    }
  }

  function handleProposeFound(offer: TradeOffer, idx: number) {
    const res = proposeTrade(offer);
    setProposedResults(prev => ({ ...prev, [idx]: res }));
    if (res.accepted) { setMyPlayerIds([]); setMyPickKeys([]); setFoundOffers(null); }
  }

  const canProposeDirect = hasOffer && hasWant && !!targetTeamId;
  const evalDirect = canProposeDirect
    ? evaluateTrade(
        { fromTeamId: league.userTeamId, toTeamId: targetTeamId!, fromPlayerIds: myPlayerIds, toPlayerIds: wantPlayerIds, fromPicks: selectedMyPicks, toPicks: selectedTheirPicks },
        targetTeam!,
        league.players,
        league.teams,
        league.settings,
      )
    : null;

  const teamBrowser = (
    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
      {(['East', 'West'] as const).map(conf => (
        <div key={conf}>
          <div className="text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: '#8b90a7' }}>{conf}ern</div>
          <div className="space-y-1">
            {otherTeams.filter(t => t.conference === conf).map(team => {
              const isExpanded = targetTeamId === team.id;
              const stars = team.rosterIds.map(id => league.players[id]).filter(Boolean)
                .sort((a, b) => b.ratings.overall - a.ratings.overall);
              const wantCount = wantPlayerIds.filter(id => team.rosterIds.includes(id)).length
                + team.draftPicks.filter(p => wantPickKeys.includes(pickKey(p))).length;
              const cat = getTeamCategory(team, league.players);
              return (
                <div key={team.id} className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${isExpanded ? team.primaryColor + '55' : '#1e2235'}` }}>
                  <button onClick={() => selectTeam(team.id)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors"
                    style={{ background: isExpanded ? '#1a1d2e' : '#12151e' }}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: team.primaryColor }} />
                    <span className="text-sm font-bold text-white flex-1">{team.city} {team.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold mr-1"
                      style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    <span className="text-xs mr-1" style={{ color: '#8b90a7' }}>{team.stats.wins}–{team.stats.losses}</span>
                    {wantCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold mr-1"
                        style={{ background: '#34d39922', color: '#34d399' }}>{wantCount}✓</span>
                    )}
                    <div className="flex gap-0.5 mr-1">
                      {stars.slice(0, 2).map(p => (
                        <PlayerPhoto key={p.id} seed={p.photoSeed} size={18} name={p.name} teamColor={team.primaryColor} />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: '#8b90a7' }}>{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1.5 border-t space-y-2" style={{ borderColor: '#1e2235', background: '#0d1018' }}>
                      <div className="space-y-1">
                        {stars.slice(0, 10).map(p => (
                          <PlayerSelectRow key={p.id} player={p}
                            selected={wantPlayerIds.includes(p.id)}
                            onToggle={() => toggle(p.id, wantPlayerIds, setWantPlayerIds)}
                            onInfo={() => setViewingPlayer(p)}
                            teamColor={team.primaryColor} accent="#34d399" checkColor="#000"
                          />
                        ))}
                      </div>
                      {team.draftPicks.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-1" style={{ color: '#8b90a7' }}>Draft Picks</div>
                          <div className="space-y-1">
                            {team.draftPicks.map(pick => (
                              <PickSelectRow key={pickKey(pick)} pick={pick}
                                selected={wantPickKeys.includes(pickKey(pick))}
                                onToggle={() => togglePick(pick, wantPickKeys, setWantPickKeys)}
                                teams={league.teams} accent="#34d399"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-5 gap-5">
      {/* ── Left: your offer ── */}
      <div className="col-span-2 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#6c63ff' }}>
              Your Offer
              {hasOffer && <span className="ml-2 font-normal normal-case" style={{ color: '#8b90a7' }}>
                {myPlayerIds.length + selectedMyPicks.length} · {myVal.toFixed(1)} val
              </span>}
            </div>
            <div className="text-xs" style={{ color: '#6b7280' }}>Select players / picks, then Find Trade</div>
          </div>
          {hasOffer && (
            <button onClick={handleFindTrade}
              className="text-xs px-3 py-1.5 rounded-lg font-bold hover:opacity-90 transition-all shrink-0"
              style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
              Find Trade →
            </button>
          )}
        </div>

        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {myRoster.map(p => (
            <PlayerSelectRow key={p.id} player={p}
              selected={myPlayerIds.includes(p.id)}
              onToggle={() => toggle(p.id, myPlayerIds, setMyPlayerIds)}
              onInfo={() => setViewingPlayer(p)}
              teamColor={userTeam.primaryColor} accent="#6c63ff"
            />
          ))}
        </div>

        {myPicks.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: '#8b90a7' }}>Your Draft Picks</div>
            <div className="space-y-1">
              {myPicks.map(pick => (
                <PickSelectRow key={pickKey(pick)} pick={pick}
                  selected={myPickKeys.includes(pickKey(pick))}
                  onToggle={() => togglePick(pick, myPickKeys, setMyPickKeys)}
                  teams={league.teams} accent="#6c63ff"
                />
              ))}
            </div>
          </div>
        )}

        {!hasOffer && (
          <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#1e2235', color: '#8b90a7' }}>
            Select players/picks above, then click <strong className="text-white">Find Trade →</strong>. Or browse a team on the right to build a specific deal.
          </div>
        )}
      </div>

      {/* ── Right: AI results or team browser ── */}
      <div className="col-span-3 flex flex-col gap-3">
        {foundOffers !== null ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#6c63ff' }}>
                  {foundOffers.length} offer{foundOffers.length !== 1 ? 's' : ''} found
                </div>
                <div className="text-xs" style={{ color: '#6b7280' }}>AI-matched returns for your package</div>
              </div>
              <button onClick={() => setFoundOffers(null)}
                className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                style={{ background: '#1e2235', color: '#8b90a7' }}>
                ← Browse Teams
              </button>
            </div>
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {foundOffers.length === 0 ? (
                <div className="text-center py-12 rounded-xl" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
                  <div className="text-2xl mb-2">🤔</div>
                  <div className="text-white font-semibold">No viable offers found</div>
                  <div className="text-xs mt-1" style={{ color: '#8b90a7' }}>Try a different player or pick combination</div>
                </div>
              ) : (
                foundOffers.map((offer, i) => (
                  <OfferCard key={i} offer={offer} league={league}
                    onPropose={(o) => handleProposeFound(o, i)}
                    proposedResult={proposedResults[i] ?? null}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#34d399' }}>
                Browse Teams
                {hasWant && <span className="ml-2 font-normal normal-case" style={{ color: '#8b90a7' }}>
                  {wantPlayerIds.length + selectedTheirPicks.length} selected · {theirVal.toFixed(1)} val
                </span>}
              </div>
              <div className="text-xs" style={{ color: '#6b7280' }}>Expand a team to handpick what you want from them</div>
            </div>
            {teamBrowser}
            {/* Direct counter-offer panel */}
            {directCounter && targetTeamId && (() => {
              const tc = league.teams[targetTeamId]?.primaryColor ?? '#facc15';
              const tName = `${league.teams[targetTeamId]?.city} ${league.teams[targetTeamId]?.name}`;
              const cFromPlayers = directCounter.fromPlayerIds.map(id => league.players[id]).filter(Boolean);
              const cToPlayers   = directCounter.toPlayerIds.map(id => league.players[id]).filter(Boolean);
              return (
                <div className="rounded-xl p-3 space-y-2" style={{ background: '#1a1500', border: `1px solid ${tc}44` }}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black uppercase tracking-widest" style={{ color: tc }}>↩ {tName} Counter</div>
                    <button onClick={() => setDirectCounter(null)} className="text-xs" style={{ color: '#6b7280' }}>✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="font-semibold mb-1" style={{ color: '#f87171' }}>You give</div>
                      {cFromPlayers.map(p => <div key={p.id} className="text-white truncate">{p.name} <span style={{ color: '#6b7280' }}>({p.ratings.overall})</span></div>)}
                      {directCounter.fromPicks.map((pk, i) => <div key={i} className="text-white">🎯 R{pk.round}</div>)}
                    </div>
                    <div>
                      <div className="font-semibold mb-1" style={{ color: '#34d399' }}>You receive</div>
                      {cToPlayers.map(p => <div key={p.id} className="text-white truncate">{p.name} <span style={{ color: '#6b7280' }}>({p.ratings.overall})</span></div>)}
                      {directCounter.toPicks.map((pk, i) => <div key={i} className="text-white">🎯 R{pk.round}</div>)}
                      {!cToPlayers.length && !directCounter.toPicks.length && <div style={{ color: '#6b7280' }}>Nothing</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setMyPlayerIds(directCounter.fromPlayerIds);
                        setMyPickKeys(directCounter.fromPicks.map(p => pickKey(p)));
                        setWantPlayerIds(directCounter.toPlayerIds);
                        setWantPickKeys(directCounter.toPicks.map(p => pickKey(p)));
                        setDirectCounter(null); setProposedResults({});
                      }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-90"
                      style={{ background: tc + '33', color: tc, border: `1px solid ${tc}55` }}>
                      Apply & Edit
                    </button>
                    <button
                      onClick={() => { const r = proposeTrade(directCounter); setProposedResults({ 0: r }); setDirectCounter(null); if (r.accepted) { setMyPlayerIds([]); setMyPickKeys([]); setWantPlayerIds([]); setWantPickKeys([]); setTargetTeamId(null); } }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
                      Accept & Propose
                    </button>
                  </div>
                </div>
              );
            })()}
            {(hasOffer || hasWant) && (
              <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#12151e', border: '1px solid #2e3248' }}>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {myPlayerIds.map(id => { const p = league.players[id]; return p ? <span key={id} className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ background: userTeam.primaryColor + '44' }}>{p.name}</span> : null; })}
                    {selectedMyPicks.map((pk, i) => <span key={i} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#1e2235', color: '#facc15' }}>🎯 R{pk.round}</span>)}
                    {!hasOffer && <span className="text-xs" style={{ color: '#4b5563' }}>No offer selected</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wantPlayerIds.map(id => { const p = league.players[id]; const tc = targetTeam?.primaryColor ?? '#666'; return p ? <span key={id} className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ background: tc + '44' }}>{p.name}</span> : null; })}
                    {selectedTheirPicks.map((pk, i) => <span key={i} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#1e2235', color: '#facc15' }}>🎯 R{pk.round}</span>)}
                    {!hasWant && <span className="text-xs" style={{ color: '#4b5563' }}>Nothing wanted yet</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0 min-w-[140px]">
                  {hasOffer && hasWant && (
                    <div className="w-full">
                      {/* Value comparison bar */}
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: '#8b90a7' }}>Give <span className="font-bold text-white">{myVal.toFixed(1)}</span></span>
                        <span style={{ color: vl.color }} className="font-black">{vl.label}</span>
                        <span style={{ color: '#8b90a7' }}>Get <span className="font-bold text-white">{theirVal.toFixed(1)}</span></span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: '#1e2235' }}>
                        {(() => {
                          const total = myVal + theirVal;
                          const myPct = total > 0 ? (myVal / total) * 100 : 50;
                          return <>
                            <div style={{ width: `${myPct}%`, background: '#6c63ff', borderRadius: '9999px 0 0 9999px' }} />
                            <div style={{ width: `${100 - myPct}%`, background: '#34d399', borderRadius: '0 9999px 9999px 0' }} />
                          </>;
                        })()}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {hasWant && (
                      <button onClick={autoFillOffer}
                        className="text-xs px-2 py-1.5 rounded font-semibold hover:opacity-80"
                        style={{ background: '#1e2235', color: '#6c63ff' }}>
                        Auto-fill
                      </button>
                    )}
                    <button onClick={() => { setDirectCounter(null); handleProposeDirect(); }} disabled={!canProposeDirect}
                      className="text-xs px-3 py-1.5 rounded font-bold hover:opacity-90 disabled:opacity-30"
                      style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
                      Propose
                    </button>
                  </div>
                  {/* Status + counter button */}
                  {(evalDirect || proposedResults[0]) && canProposeDirect && (() => {
                    const rejected = proposedResults[0] ? !proposedResults[0].accepted : (evalDirect ? !evalDirect.accepted : false);
                    const statusLabel = proposedResults[0]
                      ? (proposedResults[0].accepted ? '✓ Accepted!' : '✗ ' + proposedResults[0].reason)
                      : (evalDirect!.accepted ? '✓ Likely accepted' : '✗ May reject');
                    const statusColor = proposedResults[0]
                      ? (proposedResults[0].accepted ? '#4ade80' : '#f87171')
                      : (evalDirect!.accepted ? '#4ade80' : '#f87171');
                    const statusBg = proposedResults[0]
                      ? (proposedResults[0].accepted ? '#16532d' : '#450a0a')
                      : (evalDirect!.accepted ? '#16532d' : '#450a0a');
                    return (
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: statusBg, color: statusColor }}>
                          {statusLabel}
                        </div>
                        {rejected && (
                          <button
                            onClick={() => {
                              if (!targetTeamId) return;
                              const offer: TradeOffer = {
                                fromTeamId: league.userTeamId,
                                toTeamId: targetTeamId,
                                fromPlayerIds: myPlayerIds,
                                toPlayerIds: wantPlayerIds,
                                fromPicks: selectedMyPicks,
                                toPicks: selectedTheirPicks,
                              };
                              const counter = generateCounterOffer(offer, league.teams[targetTeamId], userTeam, league.players, league.teams);
                              setDirectCounter(counter);
                            }}
                            className="text-xs px-2 py-0.5 rounded font-bold hover:opacity-80"
                            style={{ background: '#2a1d00', color: '#facc15', border: '1px solid #facc1533' }}>
                            ↩ Counter
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {viewingPlayer && (
        <PlayerDetailModal
          player={viewingPlayer}
          teamColor={viewingPlayer.teamId ? league.teams[viewingPlayer.teamId]?.primaryColor : undefined}
          onClose={() => setViewingPlayer(null)}
        />
      )}
    </div>
  );
}

// ── Build Trade tab ────────────────────────────────────────────────────────

function PlayerSelectable({ player, selected, onToggle, onInfo, teamColor }: { player: Player; selected: boolean; onToggle: () => void; onInfo: () => void; teamColor?: string }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onToggle} className="flex items-center gap-3 p-2.5 rounded-lg flex-1 transition-all text-left min-w-0"
        style={{ background: selected ? '#6c63ff22' : '#12151e', border: `1px solid ${selected ? '#6c63ff' : '#1e2235'}` }}>
        <PlayerPhoto seed={player.photoSeed} size={32} name={player.name} teamColor={teamColor} />
        <div className="flex-1 min-w-0">
          <button onClick={e => { e.stopPropagation(); onInfo(); }} className="text-sm font-semibold text-white truncate block hover:underline text-left w-full">{player.name}</button>
          <div className="text-xs" style={{ color: '#8b90a7' }}>{player.position}{player.secondaryPosition ? `/${player.secondaryPosition}` : ''} · ${player.contract.salary.toFixed(2)}M · Age {player.age}</div>
        </div>
        <OverallBadge value={player.ratings.overall} />
      </button>
      <button onClick={onInfo}
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 transition-colors hover:opacity-80"
        style={{ background: '#1e2235', color: '#6b7280' }}
        title="View player details">ℹ</button>
    </div>
  );
}

function PickSelectable({ pick, selected, onToggle, teams }: { pick: DraftPick; selected: boolean; onToggle: () => void; teams: Record<string, Team> }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2 px-3 py-2 rounded-lg w-full transition-all text-left text-sm"
      style={{ background: selected ? '#6c63ff22' : '#12151e', border: `1px solid ${selected ? '#6c63ff' : '#1e2235'}` }}>
      <span className="text-base">🎯</span>
      <span className="text-white flex-1">{pickLabel(pick, teams)}</span>
      <span className="text-xs" style={{ color: '#8b90a7' }}>~{pickValue(pick).toFixed(0)} val</span>
    </button>
  );
}

// ── Main Trade page ────────────────────────────────────────────────────────

export default function Trade() {
  const league = useLeagueStore(s => s.league);
  const proposeTrade = useLeagueStore(s => s.proposeTrade);

  const [tab, setTab] = useState<'find' | 'manual' | 'history'>('find');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [myPlayerIds, setMyPlayerIds] = useState<string[]>([]);
  const [theirPlayerIds, setTheirPlayerIds] = useState<string[]>([]);
  const [myPickIds, setMyPickIds] = useState<string[]>([]);
  const [theirPickIds, setTheirPickIds] = useState<string[]>([]);
  const [result, setResult] = useState<{ accepted: boolean; reason: string } | null>(null);
  const [manualCounter, setManualCounter] = useState<TradeOffer | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  if (!league) return null;

  const userTeam = league.teams[league.userTeamId];
  const myRoster = userTeam.rosterIds.map(id => league.players[id]).filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);
  const myPicks = userTeam.draftPicks;

  const otherTeams = Object.values(league.teams).filter(t => t.id !== league.userTeamId);
  const targetTeam = selectedTeamId ? league.teams[selectedTeamId] : null;
  const theirRoster = targetTeam
    ? targetTeam.rosterIds.map(id => league.players[id]).filter(Boolean).sort((a, b) => b.ratings.overall - a.ratings.overall)
    : [];
  const theirPicks = targetTeam?.draftPicks ?? [];

  function pKey(p: DraftPick) { return `${p.year}_${p.round}_${p.fromTeamId}`; }
  function togglePick(pick: DraftPick, list: string[], setList: (l: string[]) => void) {
    const k = pKey(pick);
    setList(list.includes(k) ? list.filter(x => x !== k) : [...list, k]);
    setResult(null); setManualCounter(null);
  }
  function toggle(id: string, list: string[], setList: (l: string[]) => void) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    setResult(null); setManualCounter(null);
  }

  const selectedMyPicks = myPicks.filter(p => myPickIds.includes(pKey(p)));
  const selectedTheirPicks = theirPicks.filter(p => theirPickIds.includes(pKey(p)));
  const myVal = tradeValue(myPlayerIds, league.players, selectedMyPicks);
  const theirVal = tradeValue(theirPlayerIds, league.players, selectedTheirPicks);
  const fairness = Math.max(myVal, theirVal) > 0 ? ((theirVal - myVal) / Math.max(myVal, 1)) * 100 : 0;
  const vLabel = valueLabel(fairness);
  const hasSelection = myPlayerIds.length > 0 || theirPlayerIds.length > 0 || selectedMyPicks.length > 0 || selectedTheirPicks.length > 0;

  function buildManualOffer(): TradeOffer {
    return {
      fromTeamId: league!.userTeamId,
      toTeamId: selectedTeamId,
      fromPlayerIds: myPlayerIds,
      toPlayerIds: theirPlayerIds,
      fromPicks: selectedMyPicks,
      toPicks: selectedTheirPicks,
    };
  }

  function handlePropose() {
    if (!league || !selectedTeamId) return;
    if (!myPlayerIds.length && !selectedMyPicks.length) return;
    if (!theirPlayerIds.length && !selectedTheirPicks.length) return;
    const offer = buildManualOffer();
    const res = proposeTrade(offer);
    setResult(res);
    setManualCounter(null);
    if (res.accepted) {
      setMyPlayerIds([]); setTheirPlayerIds([]);
      setMyPickIds([]); setTheirPickIds([]);
    }
  }

  function handleGetManualCounter() {
    if (!selectedTeamId || !league) return;
    const offer = buildManualOffer();
    const aiTeam = league.teams[selectedTeamId];
    const userTeam = league.teams[league.userTeamId];
    const counter = generateCounterOffer(offer, aiTeam, userTeam, league.players, league.teams);
    setManualCounter(counter);
  }

  function applyManualCounter() {
    if (!manualCounter) return;
    setMyPlayerIds(manualCounter.fromPlayerIds);
    setTheirPlayerIds(manualCounter.toPlayerIds);
    setMyPickIds(manualCounter.fromPicks.map(p => pKey(p)));
    setTheirPickIds(manualCounter.toPicks.map(p => pKey(p)));
    setManualCounter(null);
    setResult(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Trade Center</h1>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #2e3248' }}>
          {([['find', 'Find Trade'], ['manual', 'Build Trade'], ['history', 'History']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 text-sm font-bold transition-colors"
              style={{ background: tab === t ? '#6c63ff' : '#12151e', color: tab === t ? '#fff' : '#8b90a7' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {viewingPlayer && (
        <PlayerDetailModal
          player={viewingPlayer}
          teamColor={viewingPlayer.teamId ? league.teams[viewingPlayer.teamId]?.primaryColor : undefined}
          onClose={() => setViewingPlayer(null)}
        />
      )}

      {tab === 'find' && <FindTradeTab />}

      {tab === 'manual' && (
        <>
          <div className="mb-5">
            <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: '#8b90a7' }}>Select Trade Partner</label>
            <div className="grid grid-cols-6 gap-2">
              {otherTeams.map(t => (
                <button key={t.id}
                  onClick={() => { setSelectedTeamId(t.id); setTheirPlayerIds([]); setTheirPickIds([]); setResult(null); }}
                  className="py-2 px-3 rounded-lg text-xs font-bold transition-all"
                  style={{ background: selectedTeamId === t.id ? t.primaryColor + '33' : '#12151e', border: `1px solid ${selectedTeamId === t.id ? t.primaryColor : '#1e2235'}`, color: selectedTeamId === t.id ? '#fff' : '#8b90a7' }}>
                  {t.abbreviation}
                </button>
              ))}
            </div>
          </div>

          {selectedTeamId && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6c63ff' }}>Your Players</div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {myRoster.map(p => <PlayerSelectable key={p.id} player={p} selected={myPlayerIds.includes(p.id)} onToggle={() => toggle(p.id, myPlayerIds, setMyPlayerIds)} onInfo={() => setViewingPlayer(p)} teamColor={userTeam.primaryColor} />)}
                  </div>
                </div>
                {myPicks.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6c63ff' }}>Your Draft Picks</div>
                    <div className="space-y-1.5">
                      {myPicks.map(pick => <PickSelectable key={pKey(pick)} pick={pick} selected={myPickIds.includes(pKey(pick))} onToggle={() => togglePick(pick, myPickIds, setMyPickIds)} teams={league.teams} />)}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6c63ff' }}>{targetTeam?.city} {targetTeam?.name} Players</div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {theirRoster.map(p => <PlayerSelectable key={p.id} player={p} selected={theirPlayerIds.includes(p.id)} onToggle={() => toggle(p.id, theirPlayerIds, setTheirPlayerIds)} onInfo={() => setViewingPlayer(p)} teamColor={targetTeam?.primaryColor} />)}
                  </div>
                </div>
                {theirPicks.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6c63ff' }}>Their Draft Picks</div>
                    <div className="space-y-1.5">
                      {theirPicks.map(pick => <PickSelectable key={pKey(pick)} pick={pick} selected={theirPickIds.includes(pKey(pick))} onToggle={() => togglePick(pick, theirPickIds, setTheirPickIds)} teams={league.teams} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasSelection && selectedTeamId && (
            <div className="mt-6 rounded-xl p-5" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-white">Trade Summary</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#8b90a7' }}>Value:</span>
                  <span className="text-sm font-bold" style={{ color: vLabel.color }}>{vLabel.label}</span>
                </div>
              </div>
              {/* Net OVR delta */}
              {(myPlayerIds.length > 0 || theirPlayerIds.length > 0) && (() => {
                const giveOvr = myPlayerIds.reduce((s, id) => s + (league.players[id]?.ratings.overall ?? 0), 0);
                const recOvr  = theirPlayerIds.reduce((s, id) => s + (league.players[id]?.ratings.overall ?? 0), 0);
                const delta = recOvr - giveOvr;
                const sign = delta > 0 ? '+' : '';
                return (
                  <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg"
                    style={{ background: '#1a1d2e' }}>
                    <span className="text-xs font-semibold" style={{ color: '#8b90a7' }}>Net OVR change</span>
                    <span className="text-sm font-black" style={{ color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#facc15' }}>
                      {sign}{delta} OVR
                    </span>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="text-xs mb-2 font-semibold" style={{ color: '#f87171' }}>You give:</div>
                  <div className="space-y-2">
                    {myPlayerIds.map((id, i) => { const p = league.players[id]; const recv = theirPlayerIds[i] ? league.players[theirPlayerIds[i]] : undefined; return p ? <PlayerTradeCard key={id} player={p} side="give" comparePlayer={recv} teamColor={userTeam.primaryColor} onClick={() => setViewingPlayer(p)} /> : null; })}
                    {selectedMyPicks.map((pk, i) => <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs" style={{ background: '#1a0f0f', border: '1px solid #f8717122' }}><span>🎯</span><span className="text-white">{pickLabel(pk, league.teams)}</span></div>)}
                    {!myPlayerIds.length && !selectedMyPicks.length && <div className="text-xs" style={{ color: '#8b90a7' }}>Nothing selected</div>}
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-2 font-semibold" style={{ color: '#34d399' }}>You receive:</div>
                  <div className="space-y-2">
                    {theirPlayerIds.map((id, i) => { const p = league.players[id]; const give = myPlayerIds[i] ? league.players[myPlayerIds[i]] : undefined; return p ? <PlayerTradeCard key={id} player={p} side="receive" comparePlayer={give} teamColor={targetTeam?.primaryColor} onClick={() => setViewingPlayer(p)} /> : null; })}
                    {selectedTheirPicks.map((pk, i) => <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs" style={{ background: '#0f1e16', border: '1px solid #34d39922' }}><span>🎯</span><span className="text-white">{pickLabel(pk, league.teams)}</span></div>)}
                    {!theirPlayerIds.length && !selectedTheirPicks.length && <div className="text-xs" style={{ color: '#8b90a7' }}>Nothing selected</div>}
                  </div>
                </div>
              </div>
              {result && (
                <div className="mb-4 px-4 py-3 rounded-lg text-sm font-semibold"
                  style={{ background: result.accepted ? '#16532d' : '#450a0a', color: result.accepted ? '#4ade80' : '#f87171' }}>
                  {result.accepted ? '✓ Trade Accepted! ' : '✗ Rejected: '}{result.reason}
                </div>
              )}

              {/* Counter-offer panel (manual tab) */}
              {manualCounter && !result && (() => {
                const tc = targetTeam?.primaryColor ?? '#facc15';
                const cFromPlayers = manualCounter.fromPlayerIds.map(id => league.players[id]).filter(Boolean);
                const cToPlayers   = manualCounter.toPlayerIds.map(id => league.players[id]).filter(Boolean);
                return (
                  <div className="mb-4 rounded-xl p-3 space-y-2" style={{ background: '#1a1500', border: `1px solid ${tc}44` }}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-widest" style={{ color: tc }}>
                        ↩ {targetTeam?.city} {targetTeam?.name} Counter Offer
                      </div>
                      <button onClick={() => setManualCounter(null)} className="text-xs" style={{ color: '#6b7280' }}>✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="font-semibold mb-1" style={{ color: '#f87171' }}>You give</div>
                        {cFromPlayers.map(p => <div key={p.id} className="text-white truncate">{p.name} <span style={{ color: '#6b7280' }}>({p.ratings.overall})</span></div>)}
                        {manualCounter.fromPicks.map((pk, i) => <div key={i} className="text-white">🎯 R{pk.round}</div>)}
                      </div>
                      <div>
                        <div className="font-semibold mb-1" style={{ color: '#34d399' }}>You receive</div>
                        {cToPlayers.map(p => <div key={p.id} className="text-white truncate">{p.name} <span style={{ color: '#6b7280' }}>({p.ratings.overall})</span></div>)}
                        {manualCounter.toPicks.map((pk, i) => <div key={i} className="text-white">🎯 R{pk.round}</div>)}
                        {!cToPlayers.length && !manualCounter.toPicks.length && <div style={{ color: '#6b7280' }}>Nothing</div>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={applyManualCounter}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-90"
                        style={{ background: tc + '33', color: tc, border: `1px solid ${tc}55` }}>
                        Apply & Edit
                      </button>
                      <button onClick={() => { const r = proposeTrade(manualCounter); setResult(r); setManualCounter(null); }}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
                        Accept & Propose
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                {hasSelection && selectedTeamId && !result && (() => {
                  const evalManual = evaluateTrade(buildManualOffer(), targetTeam!, league.players, league.teams, league.settings);
                  return !evalManual.accepted ? (
                    <button onClick={handleGetManualCounter}
                      className="py-3 px-4 rounded-lg font-bold text-sm transition-all hover:opacity-90 active:scale-95"
                      style={{ background: '#2a1d00', color: '#facc15', border: '1px solid #facc1533' }}>
                      ↩ Counter
                    </button>
                  ) : null;
                })()}
                <button onClick={handlePropose}
                  disabled={(!myPlayerIds.length && !selectedMyPicks.length) || (!theirPlayerIds.length && !selectedTheirPicks.length)}
                  className="flex-1 py-3 rounded-lg font-bold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#6c63ff,#9c63ff)', color: '#fff' }}>
                  Propose Trade
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (() => {
        const history = league.tradeHistory ?? [];
        if (!history.length) {
          return (
            <div className="text-center py-20" style={{ color: '#6b7280' }}>
              <div className="text-4xl mb-3">📋</div>
              <div className="font-bold text-white mb-1">No trade history yet</div>
              <div className="text-sm">Completed trades will appear here.</div>
            </div>
          );
        }
        return (
          <div className="space-y-3">
            {history.map(entry => {
              const toTeam = league.teams[entry.toTeamId];
              const tc = toTeam?.primaryColor ?? '#6c63ff';
              const received = entry.toPlayerIds.map(id => league.players[id]?.name).filter(Boolean);
              const gave = entry.fromPlayerIds.map(id => league.players[id]?.name).filter(Boolean);
              const fp = entry.fairnessPct;
              const fairColor = fp > 10 ? '#4ade80' : fp < -10 ? '#f87171' : '#facc15';
              const fairLabel = fp > 10 ? `+${fp}% (You Won)` : fp < -10 ? `${fp}% (You Lost)` : '~Fair';
              return (
                <div key={entry.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${tc}33` }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: `${tc}11` }}>
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest" style={{ color: tc }}>
                        Season {entry.season} · Day {entry.day}
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        Trade with {toTeam?.city} {toTeam?.name}
                      </div>
                    </div>
                    <div className="text-sm font-black" style={{ color: fairColor }}>{fairLabel}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-px" style={{ background: '#1e2235' }}>
                    <div className="px-4 py-3" style={{ background: '#0d0f17' }}>
                      <div className="text-xs font-bold mb-1.5" style={{ color: '#4ade80' }}>You Received</div>
                      {received.length ? received.map(n => <div key={n} className="text-sm text-white">{n}</div>) : <div className="text-sm" style={{ color: '#6b7280' }}>No players</div>}
                      {entry.toPicks.map((pk, i) => <div key={i} className="text-sm font-bold" style={{ color: '#facc15' }}>{pk.year} R{pk.round} Pick</div>)}
                    </div>
                    <div className="px-4 py-3" style={{ background: '#0d0f17' }}>
                      <div className="text-xs font-bold mb-1.5" style={{ color: '#f87171' }}>You Gave Up</div>
                      {gave.length ? gave.map(n => <div key={n} className="text-sm text-white">{n}</div>) : <div className="text-sm" style={{ color: '#6b7280' }}>No players</div>}
                      {entry.fromPicks.map((pk, i) => <div key={i} className="text-sm font-bold" style={{ color: '#facc15' }}>{pk.year} R{pk.round} Pick</div>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
