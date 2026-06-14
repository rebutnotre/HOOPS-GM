import type { Player, Team, TradeOffer, DraftPick, LeagueSettings } from '../types';

// ── Value helpers ──────────────────────────────────────────────────────────

export function playerValue(p: Player): number {
  const overall = p.ratings.overall;
  const baseValue = Math.pow((overall - 40) / 59, 2.5) * 100;
  const ageMult = p.age <= 23 ? 1.1 + (0.2 * ((p.potential - overall) / 30))
    : p.age <= 28 ? 1.0
    : p.age <= 31 ? 0.85
    : p.age <= 33 ? 0.65
    : 0.40;
  const salaryPenalty = Math.max(0, p.contract.salary - baseValue * 0.45) * 0.5;
  return Math.max(0, baseValue * ageMult - salaryPenalty);
}

export function pickValue(pick: DraftPick): number {
  return pick.round === 1 ? 8 : 2.4;
}

export function tradeValue(playerIds: string[], players: Record<string, Player>, picks: DraftPick[] = []): number {
  const playerVal = playerIds.reduce((sum, id) => sum + (players[id] ? playerValue(players[id]) : 0), 0);
  const pickVal = picks.reduce((sum, pk) => sum + pickValue(pk), 0);
  return playerVal + pickVal;
}

// ── Team disposition ───────────────────────────────────────────────────────
// Mirrors getTeamCategory but returns a richer enum used in trade logic.

type Disposition = 'tanking' | 'rebuilding' | 'developing' | 'bubble' | 'playoff' | 'contender' | 'dynasty';

function teamDisposition(team: Team, players: Record<string, Player>): Disposition {
  const gp = team.stats.wins + team.stats.losses;
  const roster = team.rosterIds.map(id => players[id]).filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);
  const top5 = roster.slice(0, 5);
  const starterOvr = top5.length ? top5.reduce((s, p) => s + p.ratings.overall, 0) / top5.length : 70;
  const avgAge = roster.length ? roster.reduce((s, p) => s + p.age, 0) / roster.length : 25;

  const winPct = gp > 0 ? team.stats.wins / gp : 0.5;
  const rosterPct = starterOvr >= 84 ? 0.72 : starterOvr >= 81 ? 0.62 : starterOvr >= 78 ? 0.52 : starterOvr >= 75 ? 0.44 : starterOvr >= 72 ? 0.38 : starterOvr >= 69 ? 0.32 : 0.26;
  const weight = Math.min(gp / 20, 0.9);
  const effectivePct = gp === 0 ? rosterPct : rosterPct * (1 - weight) + winPct * weight;

  if (effectivePct >= 0.72 && (team.championships ?? 0) >= 1) return 'dynasty';
  if (effectivePct >= 0.57) return 'contender';
  if (effectivePct >= 0.48) return 'playoff';
  if (effectivePct >= 0.40) return 'bubble';
  if (avgAge < 25 && starterOvr < 74) return 'rebuilding';
  if (effectivePct < 0.34) return 'tanking';
  return 'developing';
}

// Per-disposition config: how teams evaluate incoming assets
interface DispoConfig {
  threshold: number;       // minimum fairness % to accept (e.g. -20 = accept if within 20% of fair)
  pickBonus: number;       // extra fairness points per incoming R1 pick (picks are currency for rebuilders)
  pickPenalty: number;     // penalty per outgoing R1 pick (contenders hate losing picks they don't value)
  youngBonus: number;      // extra fairness per incoming player age <=23
  oldPenalty: number;      // penalty per incoming player age >=32 (rebuilders don't want old guys)
  starProtect: number;     // min fairness required to trade away a player with OVR >= 80
  wantsPlayers: boolean;   // true = prefers player returns, false = prefers pick returns
}

const DISPO_CONFIG: Record<Disposition, DispoConfig> = {
  dynasty:    { threshold: -8,  pickBonus: 0,  pickPenalty: 8,  youngBonus: 5,  oldPenalty: 0,  starProtect: 20,  wantsPlayers: true  },
  contender:  { threshold: -15, pickBonus: 0,  pickPenalty: 5,  youngBonus: 5,  oldPenalty: 0,  starProtect: 10,  wantsPlayers: true  },
  playoff:    { threshold: -20, pickBonus: 4,  pickPenalty: 0,  youngBonus: 6,  oldPenalty: 2,  starProtect: 5,   wantsPlayers: false },
  bubble:     { threshold: -22, pickBonus: 7,  pickPenalty: 0,  youngBonus: 8,  oldPenalty: 4,  starProtect: 0,   wantsPlayers: false },
  developing: { threshold: -25, pickBonus: 10, pickPenalty: 0,  youngBonus: 10, oldPenalty: 6,  starProtect: 0,   wantsPlayers: false },
  rebuilding: { threshold: -30, pickBonus: 15, pickPenalty: 0,  youngBonus: 14, oldPenalty: 10, starProtect: 0,   wantsPlayers: false },
  tanking:    { threshold: -40, pickBonus: 22, pickPenalty: 0,  youngBonus: 18, oldPenalty: 16, starProtect: 0,   wantsPlayers: false },
};

// ── Core evaluation ────────────────────────────────────────────────────────

export function evaluateTrade(
  offer: TradeOffer,
  team: Team,
  players: Record<string, Player>,
  _allTeams: Record<string, Team>,
  settings?: LeagueSettings,
): { accepted: boolean; reason: string; fairness: number } {
  // "team" is the team receiving fromPlayerIds/fromPicks and giving toPlayerIds/toPicks
  // i.e. team is the AI counterpart; they give offer.toPlayerIds and receive offer.fromPlayerIds
  const receiving = tradeValue(offer.fromPlayerIds, players, offer.fromPicks);   // they receive these
  const giving    = tradeValue(offer.toPlayerIds,   players, offer.toPicks);     // they give these

  const baseFairness = ((receiving - giving) / Math.max(giving, 1)) * 100;

  const dispo = teamDisposition(team, players);
  const cfg   = DISPO_CONFIG[dispo];

  // Difficulty tightens AI's minimum acceptable fairness — harder = AI demands more value
  const difficultyPenalty = settings?.difficulty === 'easy'   ? +8
                          : settings?.difficulty === 'hard'   ? -6
                          : settings?.difficulty === 'legend' ? -12
                          : 0;

  // Low-value deals (bench depth / scrub moves) use a more lenient threshold.
  const isLowValueDeal  = receiving < 12 && giving < 12;
  const isScrubDeal     = receiving < 3  && giving < 3;
  // Scrub deals: accept basically anything — both sides just want to avoid a release
  const effectiveThreshold = (isScrubDeal     ? cfg.threshold - 50
                           : isLowValueDeal  ? cfg.threshold - 20
                           : cfg.threshold) + difficultyPenalty;

  // ── Asset-type adjustments ──
  let bonus = 0;

  // Incoming picks (team receives picks)
  const incomingR1Picks = offer.fromPicks.filter(p => p.round === 1).length;
  bonus += incomingR1Picks * cfg.pickBonus;

  // Incoming young players
  const incomingPlayers = offer.fromPlayerIds.map(id => players[id]).filter(Boolean);
  const outgoingPlayers = offer.toPlayerIds.map(id => players[id]).filter(Boolean);

  // Outgoing picks penalty — only applies when giving picks WITHOUT receiving a player back.
  // Contenders happily give picks FOR veterans (that's the whole point); they just don't
  // want to bleed picks in pick-for-pick swaps or for free.
  const outgoingR1Picks = offer.toPicks.filter(p => p.round === 1).length;
  if (incomingPlayers.length === 0) {
    bonus -= outgoingR1Picks * cfg.pickPenalty;
  }

  incomingPlayers.forEach(p => {
    if (p.age <= 23) bonus += cfg.youngBonus;
    if (p.age >= 32) bonus -= cfg.oldPenalty;
    // Contenders/dynasty get a bonus for prime-age veterans (28–32) with solid OVR — win-now pieces
    if ((dispo === 'contender' || dispo === 'dynasty') && p.age >= 28 && p.age <= 33 && p.ratings.overall >= 74) {
      bonus += 8;
    }
  });

  const adjustedFairness = baseFairness + bonus;

  // ── Hard blocks ──

  // Contenders/dynasty: protect stars
  if (cfg.starProtect > 0) {
    const givingStars = outgoingPlayers.filter(p => p.ratings.overall >= 80);
    if (givingStars.length > 0 && adjustedFairness < cfg.starProtect) {
      return { accepted: false, reason: `We are not willing to trade away ${givingStars[0].name} for this offer.`, fairness: adjustedFairness };
    }
  }

  // Rebuilding/tanking: refuse old players as primary return
  if (dispo === 'tanking' || dispo === 'rebuilding') {
    const oldIncoming = incomingPlayers.filter(p => p.age >= 31 && p.ratings.overall < 80);
    if (oldIncoming.length > 0 && incomingR1Picks === 0 && incomingPlayers.every(p => p.age >= 30)) {
      return { accepted: false, reason: "We're rebuilding — we want picks or young players, not veterans.", fairness: adjustedFairness };
    }
  }

  // Contenders: cap check
  if (dispo === 'contender' || dispo === 'dynasty') {
    if (team.salary - 120 > 10) {
      const incomingSal = incomingPlayers.reduce((s, p) => s + p.contract.salary, 0);
      const outgoingSal = outgoingPlayers.reduce((s, p) => s + p.contract.salary, 0);
      if (incomingSal > outgoingSal + 5) {
        return { accepted: false, reason: 'We are over the cap and cannot take on additional salary.', fairness: adjustedFairness };
      }
    }
    // Contenders don't want picks as the primary return when giving away players
    if (outgoingPlayers.length > 0 && offer.fromPlayerIds.length === 0 && incomingR1Picks <= 1) {
      return { accepted: false, reason: "We need a player back, not just picks — we're competing now.", fairness: adjustedFairness };
    }
  }

  // ── Accept / reject ──
  if (adjustedFairness >= effectiveThreshold) {
    const reason = isLowValueDeal
      ? `Works for us as a depth move.`
      : dispo === 'tanking' || dispo === 'rebuilding'
      ? incomingR1Picks > 0
        ? `Draft capital is exactly what we need for our rebuild.`
        : `This deal fits our rebuild timeline.`
      : dispo === 'contender' || dispo === 'dynasty'
      ? `This deal improves our championship window.`
      : `This trade provides fair value.`;
    return { accepted: true, reason, fairness: adjustedFairness };
  }

  // Position need: slight loosening
  if (getPositionNeed(team, offer.fromPlayerIds, offer.toPlayerIds, players) && adjustedFairness >= effectiveThreshold - 10) {
    return { accepted: true, reason: 'We need help at that position.', fairness: adjustedFairness };
  }

  const gap = Math.abs(Math.round(adjustedFairness - effectiveThreshold));
  const hint = dispo === 'tanking' || dispo === 'rebuilding'
    ? `Add a first-round pick to make this work.`
    : dispo === 'contender' || dispo === 'dynasty'
    ? `We need a better player back — value gap is ${gap}%.`
    : `We need more value — gap is ${gap}%.`;

  return { accepted: false, reason: hint, fairness: adjustedFairness };
}

function getPositionNeed(team: Team, incomingIds: string[], outgoingIds: string[], players: Record<string, Player>): boolean {
  const incoming = incomingIds.map(id => players[id]).filter(Boolean);
  if (!incoming.length) return false;
  const rosterPlayers = team.rosterIds.map(id => players[id]).filter(Boolean);
  const positionCounts: Record<string, number> = {};
  rosterPlayers.forEach(p => { positionCounts[p.position] = (positionCounts[p.position] || 0) + 1; });
  // silence unused var warning
  void outgoingIds;
  return incoming.some(p => (positionCounts[p.position] || 0) < 3);
}

// ── findTradeForPlayer ─────────────────────────────────────────────────────

export function findTradeForPlayer(
  targetPlayerId: string,
  userTeamId: string,
  teams: Record<string, Team>,
  players: Record<string, Player>,
): TradeOffer | null {
  const target = players[targetPlayerId];
  if (!target || !target.teamId || target.teamId === userTeamId) return null;

  const userTeam = teams[userTeamId];
  const targetTeam = teams[target.teamId];
  if (!userTeam || !targetTeam) return null;

  const targetVal = playerValue(target);
  const myPlayers = userTeam.rosterIds
    .map(id => players[id])
    .filter(Boolean)
    .sort((a, b) => playerValue(b) - playerValue(a));

  let bestOffer: TradeOffer | null = null;

  for (let i = 0; i < myPlayers.length; i++) {
    const offerIds = [myPlayers[i].id];
    let offerVal = playerValue(myPlayers[i]);
    const picksToAdd: DraftPick[] = [];

    if (offerVal < targetVal * 0.85) {
      for (const pick of userTeam.draftPicks) {
        if (offerVal >= targetVal * 0.9) break;
        picksToAdd.push(pick);
        offerVal += pickValue(pick);
      }
    }

    if (offerVal < targetVal * 0.85) {
      for (let j = i + 1; j < myPlayers.length; j++) {
        const p2 = myPlayers[j];
        if (p2.ratings.overall < 55) continue;
        offerIds.push(p2.id);
        offerVal += playerValue(p2);
        if (offerVal >= targetVal * 0.85) break;
      }
    }

    if (offerVal >= targetVal * 0.85 && offerVal <= targetVal * 1.3) {
      bestOffer = {
        fromTeamId: userTeamId,
        toTeamId: target.teamId,
        fromPlayerIds: offerIds,
        toPlayerIds: [targetPlayerId],
        fromPicks: picksToAdd,
        toPicks: [],
      };
      break;
    }
  }

  return bestOffer;
}

// ── findTradesForMyPlayer ──────────────────────────────────────────────────

export function findTradesForMyPlayer(
  myPlayerId: string,
  userTeamId: string,
  teams: Record<string, Team>,
  players: Record<string, Player>,
): TradeOffer[] {
  const myPlayer = players[myPlayerId];
  if (!myPlayer || myPlayer.teamId !== userTeamId) return [];

  const myVal = playerValue(myPlayer);
  const results: TradeOffer[] = [];

  Object.values(teams).forEach(team => {
    if (team.id === userTeamId) return;

    const theirPlayers = team.rosterIds
      .map(id => players[id])
      .filter(Boolean)
      .sort((a, b) => Math.abs(playerValue(a) - myVal) - Math.abs(playerValue(b) - myVal));

    const best = theirPlayers[0];
    if (!best) return;

    if (Math.abs(playerValue(best) - myVal) > myVal * 0.4) return;

    results.push({
      fromTeamId: userTeamId,
      toTeamId: team.id,
      fromPlayerIds: [myPlayerId],
      toPlayerIds: [best.id],
      fromPicks: [],
      toPicks: [],
    });
  });

  return results.slice(0, 6);
}

// ── findTradeForPick ───────────────────────────────────────────────────────

export function findTradeForPick(
  pick: DraftPick,
  userTeamId: string,
  teams: Record<string, Team>,
  players: Record<string, Player>,
): TradeOffer[] {
  const userTeam = teams[userTeamId];
  if (!userTeam) return [];

  const pickVal = pickValue(pick);
  const results: TradeOffer[] = [];

  Object.values(teams).forEach(team => {
    if (team.id === userTeamId) return;

    const candidates = team.rosterIds
      .map(id => players[id])
      .filter(Boolean)
      .filter(p => { const pv = playerValue(p); return pv >= pickVal * 0.6 && pv <= pickVal * 1.6; })
      .sort((a, b) => playerValue(b) - playerValue(a))
      .slice(0, 2);

    candidates.forEach(candidate => {
      const cv = playerValue(candidate);
      const fromPicksNeeded: DraftPick[] = [pick];
      let totalOffer = pickVal;

      for (const p2 of userTeam.draftPicks) {
        if (p2.year === pick.year && p2.round === pick.round && p2.fromTeamId === pick.fromTeamId) continue;
        if (totalOffer >= cv * 0.88) break;
        fromPicksNeeded.push(p2);
        totalOffer += pickValue(p2);
      }

      if (totalOffer > cv * 1.4) {
        results.push({ fromTeamId: userTeamId, toTeamId: team.id, fromPlayerIds: [], toPlayerIds: [candidate.id], fromPicks: [pick], toPicks: [] });
      } else if (totalOffer >= cv * 0.75) {
        results.push({ fromTeamId: userTeamId, toTeamId: team.id, fromPlayerIds: [], toPlayerIds: [candidate.id], fromPicks: fromPicksNeeded, toPicks: [] });
      }
    });
  });

  return results.slice(0, 5);
}

// ── findTradesForMyPickOffer ───────────────────────────────────────────────

export function findTradesForMyPickOffer(
  myPlayerId: string,
  userTeamId: string,
  teams: Record<string, Team>,
  players: Record<string, Player>,
): TradeOffer[] {
  const myPlayer = players[myPlayerId];
  if (!myPlayer || myPlayer.teamId !== userTeamId) return [];

  const myVal = playerValue(myPlayer);
  const results: TradeOffer[] = [];

  Object.values(teams).forEach(team => {
    if (team.id === userTeamId) return;

    const pickBundle = team.draftPicks.filter(pk => pk.round === 1).slice(0, 2);
    if (!pickBundle.length) return;

    const pickBundleVal = pickBundle.reduce((s, pk) => s + pickValue(pk), 0);
    if (pickBundleVal >= myVal * 0.75 && pickBundleVal <= myVal * 1.5) {
      results.push({
        fromTeamId: userTeamId,
        toTeamId: team.id,
        fromPlayerIds: [myPlayerId],
        toPlayerIds: [],
        fromPicks: [],
        toPicks: pickBundle,
      });
    }
  });

  return results.slice(0, 4);
}

// ── findTradesForPackage ───────────────────────────────────────────────────

export function findTradesForPackage(
  offerPlayerIds: string[],
  offerPicks: DraftPick[],
  userTeamId: string,
  teams: Record<string, Team>,
  players: Record<string, Player>,
): TradeOffer[] {
  const packageVal = tradeValue(offerPlayerIds, players, offerPicks);
  if (packageVal <= 0) return [];

  const lo = packageVal * 0.80;
  const hi = packageVal * 1.32;
  // For low-value offers (bench vets, role players) be much more lenient on return floor —
  // the user just wants something back rather than a release.
  const isLowValue = packageVal < 12;
  const effectiveLo = isLowValue ? packageVal * 0.30 : lo;

  const offerPlayers = offerPlayerIds.map(id => players[id]).filter(Boolean);
  // Any aged player (27+) qualifies — OVR floor dropped so sub-60 bench bodies are tradeable
  const isVeteranOffer = offerPlayers.some(p => p.age >= 27 && p.ratings.overall >= 50);
  // True scrubs (OVR < 55 or value < 3) — only a narrow set of teams will absorb them,
  // and only for token consideration (or nothing at all as a pure roster move)
  const isScrubOffer = packageVal < 3 || offerPlayers.every(p => p.ratings.overall < 55);

  const results: TradeOffer[] = [];

  Object.values(teams).forEach(team => {
    if (team.id === userTeamId) return;

    const dispo = teamDisposition(team, players);
    const wantsPlayers = DISPO_CONFIG[dispo].wantsPlayers;

    // Not every team engages on every package — varies by disposition.
    // Scrub/low-value offers get an extra penalty on top of this.
    const baseChance = dispo === 'dynasty' || dispo === 'contender' ? 0.80
                     : dispo === 'playoff'  || dispo === 'bubble'    ? 0.75
                     : dispo === 'developing'                         ? 0.70
                     : /* rebuilding / tanking */                       0.65;
    const chance = isScrubOffer ? baseChance * 0.6 : isLowValue ? baseChance * 0.85 : baseChance;
    if (Math.random() > chance) return;

    const theirPlayers = team.rosterIds
      .map(id => players[id])
      .filter(Boolean)
      .sort((a, b) => playerValue(b) - playerValue(a));

    // ① single player in value range (use effectiveLo so low-vets can match role players back)
    const singleMatch = theirPlayers.find(p => {
      const v = playerValue(p);
      return v >= effectiveLo && v <= hi * (isLowValue ? 1.8 : 1.0);
    });
    if (singleMatch) {
      results.push({ fromTeamId: userTeamId, toTeamId: team.id, fromPlayerIds: offerPlayerIds, toPlayerIds: [singleMatch.id], fromPicks: offerPicks, toPicks: [] });
      return;
    }

    // ② rebuilding/tanking: player + picks or picks-only
    if (!wantsPlayers) {
      for (const p of theirPlayers) {
        const pv = playerValue(p);
        if (pv > hi) continue;
        const need = packageVal - pv;
        if (need <= 0) continue;
        const picksNeeded: DraftPick[] = [];
        let pickTotal = 0;
        for (const pick of team.draftPicks) {
          if (pickTotal >= need * 0.9) break;
          picksNeeded.push(pick);
          pickTotal += pickValue(pick);
        }
        const total = pv + pickTotal;
        if (total >= lo && total <= hi * 1.1) {
          results.push({ fromTeamId: userTeamId, toTeamId: team.id, fromPlayerIds: offerPlayerIds, toPlayerIds: [p.id], fromPicks: offerPicks, toPicks: picksNeeded });
          return;
        }
      }
      if (packageVal <= 30) {
        const pickBundle = team.draftPicks.filter(p => p.round === 1);
        const bval = pickBundle.reduce((s, p) => s + pickValue(p), 0);
        if (bval >= lo) {
          results.push({ fromTeamId: userTeamId, toTeamId: team.id, fromPlayerIds: offerPlayerIds, toPlayerIds: [], fromPicks: offerPicks, toPicks: pickBundle.slice(0, 2) });
          return;
        }
      }
    }

    // ③ multi-player bundle (all teams)
    const bundle: string[] = [];
    let bundleVal = 0;
    for (const p of theirPlayers) {
      if (bundleVal >= lo) break;
      if (bundleVal + playerValue(p) > hi * 1.15) continue;
      bundle.push(p.id);
      bundleVal += playerValue(p);
    }
    if (bundle.length > 1 && bundleVal >= lo && bundleVal <= hi * 1.15) {
      results.push({ fromTeamId: userTeamId, toTeamId: team.id, fromPlayerIds: offerPlayerIds, toPlayerIds: bundle, fromPicks: offerPicks, toPicks: [] });
      return;
    }

    // ④ depth / scrub acquisition
    if (isVeteranOffer) {
      const r1Picks = team.draftPicks.filter(p => p.round === 1);
      const r2Picks = team.draftPicks.filter(p => p.round === 2);

      if (isScrubOffer) {
        // True scrubs (OVR < 55): only developing or tanking teams absorb them.
        // Return is a lone R2 if available, otherwise nothing (pure roster-slot trade).
        if (dispo === 'developing' || dispo === 'tanking') {
          const token = r2Picks[0]; // may be undefined — that's fine
          results.push({
            fromTeamId: userTeamId, toTeamId: team.id,
            fromPlayerIds: offerPlayerIds, toPlayerIds: [],
            fromPicks: offerPicks, toPicks: token ? [token] : [],
          });
          return;
        }
        // All other team types decline scrubs entirely
        return;
      }

      if (isLowValue) {
        // 55–60 OVR bench body: contending/playoff/bubble/developing teams pay a R2 pick
        if (dispo !== 'tanking' && dispo !== 'rebuilding') {
          const r2 = r2Picks[0] ?? r1Picks[0];
          if (r2) {
            results.push({ fromTeamId: userTeamId, toTeamId: team.id, fromPlayerIds: offerPlayerIds, toPlayerIds: [], fromPicks: offerPicks, toPicks: [r2] });
            return;
          }
        }
      } else if (wantsPlayers) {
        // 60+ OVR veteran: contending/playoff teams fill with R1s then R2s
        const pickBundle: DraftPick[] = [];
        let pickTotal = 0;
        for (const pk of [...r1Picks, ...r2Picks]) {
          if (pickTotal >= lo) break;
          pickBundle.push(pk);
          pickTotal += pickValue(pk);
        }
        if (pickTotal >= lo * 0.85 && pickBundle.length > 0) {
          results.push({ fromTeamId: userTeamId, toTeamId: team.id, fromPlayerIds: offerPlayerIds, toPlayerIds: [], fromPicks: offerPicks, toPicks: pickBundle });
          return;
        }
      }

      // Fallback for any vet: single player return if value lines up
      for (const p of theirPlayers) {
        const pv = playerValue(p);
        if (pv >= effectiveLo && pv <= hi * (isLowValue ? 2.0 : 1.0)) {
          results.push({ fromTeamId: userTeamId, toTeamId: team.id, fromPlayerIds: offerPlayerIds, toPlayerIds: [p.id], fromPicks: offerPicks, toPicks: [] });
          return;
        }
      }
    }
  });

  return results
    .sort((a, b) => {
      const da = Math.abs(tradeValue(a.toPlayerIds, players, a.toPicks) - packageVal);
      const db = Math.abs(tradeValue(b.toPlayerIds, players, b.toPicks) - packageVal);
      return da - db;
    })
    .slice(0, 8);
}

// ── generateCounterOffer ──────────────────────────────────────────────────
// When the user proposes a deal the AI doesn't like, the AI generates a counter.
// Two variants are produced: one where the user adds more, one where the AI gives less.
// We return the one that's closer to a fair deal.

export function generateCounterOffer(
  offer: TradeOffer,
  aiTeam: Team,       // team receiving offer.fromPlayerIds / giving offer.toPlayerIds
  userTeam: Team,
  players: Record<string, Player>,
  _allTeams: Record<string, Team>,
): TradeOffer | null {
  if (!aiTeam || !userTeam) return null;

  const myVal    = tradeValue(offer.fromPlayerIds, players, offer.fromPicks);   // user gives
  const theirVal = tradeValue(offer.toPlayerIds,   players, offer.toPicks);     // user wants

  // ── Counter A: AI gives less (proportionally matched to what user offers) ──
  // Build a fresh AI package from their full roster worth ~myVal.
  let counterA: TradeOffer | null = null;
  {
    const target = myVal; // AI wants to give roughly what they receive
    const aiRoster = aiTeam.rosterIds
      .map(id => players[id])
      .filter(Boolean)
      .sort((a, b) => playerValue(b) - playerValue(a));

    // Greedy: add AI players until we hit target value
    const newToIds: string[] = [];
    let acc = 0;
    for (const p of aiRoster) {
      if (acc >= target * 0.9) break;
      newToIds.push(p.id);
      acc += playerValue(p);
      if (acc >= target * 0.9 && acc <= target * 1.4) break;
    }

    // Also consider sweetening with AI picks if needed
    const newToPicks: DraftPick[] = [];
    if (acc < target * 0.8) {
      for (const pk of aiTeam.draftPicks) {
        if (acc >= target * 0.9) break;
        newToPicks.push(pk);
        acc += pickValue(pk);
      }
    }

    if (newToIds.length > 0 || newToPicks.length > 0) {
      counterA = {
        ...offer,
        toPlayerIds: newToIds,
        toPicks: newToPicks,
      };
    }
  }

  // ── Counter B: User gives more to match what they want ────────────────────
  // Keep AI's original side; add cheapest user assets until value gap closes.
  let counterB: TradeOffer | null = null;
  {
    const gap = theirVal - myVal;
    if (gap > 0.5) {
      const userPlayers = userTeam.rosterIds
        .map(id => players[id])
        .filter(Boolean)
        .filter(p => !offer.fromPlayerIds.includes(p.id))
        .sort((a, b) => playerValue(a) - playerValue(b)); // cheapest first

      const userPicks = userTeam.draftPicks
        .filter(pk => !offer.fromPicks.some(
          op => op.year === pk.year && op.round === pk.round && op.fromTeamId === pk.fromTeamId
        ));

      let addedVal = 0;
      const addPlayers: string[] = [];
      const addPicks: DraftPick[] = [];

      // Prefer picks first (less painful for user), then cheapest players
      for (const pk of userPicks) {
        if (addedVal >= gap * 0.85) break;
        addPicks.push(pk);
        addedVal += pickValue(pk);
      }
      for (const p of userPlayers) {
        if (addedVal >= gap * 0.85) break;
        if (p.ratings.overall < 55) continue;
        addPlayers.push(p.id);
        addedVal += playerValue(p);
      }

      if (addedVal >= gap * 0.6 && (addPlayers.length > 0 || addPicks.length > 0)) {
        counterB = {
          ...offer,
          fromPlayerIds: [...offer.fromPlayerIds, ...addPlayers],
          fromPicks: [...offer.fromPicks, ...addPicks],
        };
      }
    }
  }

  // Prefer Counter A (AI gives less) if the original offer has the user overpaying,
  // otherwise prefer Counter B (user gives more). Fall back to whichever exists.
  if (counterA && counterB) {
    // If AI was already giving more than user, Counter A is more natural
    return theirVal > myVal ? counterB : counterA;
  }
  return counterA ?? counterB ?? null;
}

// ── generateAITradeOffer ───────────────────────────────────────────────────

export function generateAITradeOffer(
  fromTeam: Team,
  toTeam: Team,
  players: Record<string, Player>,
): TradeOffer | null {
  const dispo = teamDisposition(fromTeam, players);
  const fromPlayers = fromTeam.rosterIds.map(id => players[id]).filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);
  const toPlayers = toTeam.rosterIds.map(id => players[id]).filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);

  if (!fromPlayers.length || !toPlayers.length) return null;

  // ── Tanking / Rebuilding: try to dump a veteran for picks ──
  if (dispo === 'tanking' || dispo === 'rebuilding') {
    // Find a veteran (age 28+, OVR 72–88) they'd be willing to move
    const dumpCandidate = fromPlayers.find(p => p.age >= 28 && p.ratings.overall >= 72 && p.ratings.overall <= 88);
    if (dumpCandidate) {
      const targetVal = playerValue(dumpCandidate);
      // Offer: we give our veteran; we want picks from them
      const wantedPicks = toTeam.draftPicks.filter(pk => pk.round === 1).slice(0, 2);
      const pickVal = wantedPicks.reduce((s, pk) => s + pickValue(pk), 0);
      if (wantedPicks.length > 0 && pickVal >= targetVal * 0.6) {
        return {
          fromTeamId: fromTeam.id,
          toTeamId: toTeam.id,
          fromPlayerIds: [dumpCandidate.id],
          toPlayerIds: [],
          fromPicks: [],
          toPicks: wantedPicks,
        };
      }
      // Fallback: ask for a young player instead
      const youngTarget = toPlayers.find(p => p.age <= 24 && playerValue(p) >= targetVal * 0.7 && playerValue(p) <= targetVal * 1.3);
      if (youngTarget) {
        return {
          fromTeamId: fromTeam.id,
          toTeamId: toTeam.id,
          fromPlayerIds: [dumpCandidate.id],
          toPlayerIds: [youngTarget.id],
          fromPicks: [],
          toPicks: [],
        };
      }
    }
  }

  // ── Contending / Dynasty: try to acquire a win-now player ──
  if (dispo === 'contender' || dispo === 'dynasty') {
    // Target a good player from the other team
    const target = toPlayers.find(p => p.ratings.overall >= 75 && p.ratings.overall <= 88);
    if (!target) return null;

    const targetVal = playerValue(target);
    let offerVal = 0;
    const offerPlayerIds: string[] = [];

    for (const p of fromPlayers) {
      if (p.ratings.overall < 65) continue;
      if (offerVal >= targetVal * 0.88) break;
      offerPlayerIds.push(p.id);
      offerVal += playerValue(p);
    }

    if (!offerPlayerIds.length || offerVal < targetVal * 0.6) return null;

    // Contenders prefer not to give picks — use players only
    return {
      fromTeamId: fromTeam.id,
      toTeamId: toTeam.id,
      fromPlayerIds: offerPlayerIds,
      toPlayerIds: [target.id],
      fromPicks: [],
      toPicks: [],
    };
  }

  // ── Developing / Bubble / Playoff: standard player swap ──
  const target = toPlayers.find(p => p.ratings.overall >= 74 && p.ratings.overall <= 88);
  if (!target) return null;

  const targetVal = playerValue(target);
  let offerVal = 0;
  const offerPlayerIds: string[] = [];

  for (const p of fromPlayers) {
    if (p.ratings.overall < 60) continue;
    if (offerVal >= targetVal * 0.88) break;
    offerPlayerIds.push(p.id);
    offerVal += playerValue(p);
    if (offerVal >= targetVal * 0.85) break;
  }

  if (!offerPlayerIds.length) return null;

  // Mid-tier teams may sweeten with a pick
  const picksToAdd: DraftPick[] = [];
  if (offerVal < targetVal * 0.75 && fromTeam.draftPicks.length > 0) {
    picksToAdd.push(fromTeam.draftPicks[0]);
    offerVal += pickValue(fromTeam.draftPicks[0]);
  }

  if (offerVal < targetVal * 0.6) return null;

  return {
    fromTeamId: fromTeam.id,
    toTeamId: toTeam.id,
    fromPlayerIds: offerPlayerIds,
    toPlayerIds: [target.id],
    fromPicks: picksToAdd,
    toPicks: [],
  };
}
