import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Module-level sim generation counter — incremented on every new sim start or stop.
// Each async step captures its generation at birth and bails if it no longer matches.
// This is immune to Zustand state-timing issues that plagued the isSimming check.
let _simGen = 0;
let _newsVerbosity: 'minimal' | 'normal' | 'full' = 'normal';
export const cancelSim = () => { _simGen++; };
import type { LeagueState, TradeOffer, NewsItem, PlayerStats, DraftPick, PlayinGame, PlayoffSeries, LastGameSummary, Notification, IncomingTradeOffer, SeasonAwards, GMRating, SeasonRecord, LeagueSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { initLeague, generateSchedule } from '../engine/leagueInit';
import { simulateGame } from '../engine/gameEngine';
import { generateGameNarrative } from '../engine/narrativeEngine';
import { getInjuryName } from '../engine/injuryEngine';
import { developPlayer, calcOvrForPosition } from '../engine/progressionEngine';
import { deriveTendency, deriveSecondaryPosition, generateHeight } from '../engine/playerGen';
import { createRng, clamp } from '../engine/rng';
import { evaluateTrade, playerValue, tradeValue as tradeVal } from '../engine/tradeEngine';
import { SALARY_CAP, LUXURY_TAX_LINE, HARD_CAP, MLE_AMOUNT, TAXPAYER_MLE, VET_MIN } from '../engine/teamData';
import { generateDraftClass, runDraftLottery, executeDraftPick } from '../engine/draftEngine';
import {
  TRADE_DEADLINE_DAY, REGULAR_SEASON_DAYS,
  setupPlayin, addPlayinFinalGames, setupPlayoffBracket,
  getNextPlayoffRound, getPlayoffHomeAway,
} from '../engine/playoffEngine';

export type SimType = 'game' | 'week' | 'month' | 'deadline' | 'season';

export interface SaveSlot {
  id: string;
  createdAt: number;
  updatedAt: number;
  league: LeagueState;
}

interface LeagueStore {
  league: LeagueState | null;
  savedSlots: SaveSlot[];
  lastGame: LastGameSummary | null;
  pendingAwards: SeasonAwards | null;
  pendingTradeOffer: import('../types').IncomingTradeOffer | null;
  isSimming: boolean;
  clearPendingTradeOffer: () => void;
  clearLastGame: () => void;
  clearAwards: () => void;
  markNotificationsRead: () => void;
  migratePlayerTendencies: () => void;
  acceptIncomingOffer: (offerId: string) => { accepted: boolean; reason: string };
  declineIncomingOffer: (offerId: string) => void;
  initNewLeague: (userTeamId: string, settings?: import('../types').LeagueSettings, rosterMode?: import('../engine/leagueInit').RosterMode, draftMode?: 'classic' | 'fantasy') => void;
  fantasyDraftPick: (playerId: string) => void;
  fantasyDraftAuto: () => void;
  updateSettings: (s: Partial<import('../types').LeagueSettings>) => void;
  advanceSim: (type?: SimType) => void;
  simPlayoffSeries: (seriesId: string) => void;
  simPlayoffRound: () => void;
  simPlayoffs: () => void;
  proposeTrade: (offer: TradeOffer) => { accepted: boolean; reason: string };
  signFreeAgent: (playerId: string) => boolean;
  signTwoWay: (playerId: string) => boolean;
  releasePLayer: (playerId: string) => void;
  draftPlayer: (prospectId: string) => void;
  simNextDraftPick: () => void;
  simToMyPick: () => void;
  scoutProspect: (prospectId: string) => void;
  startNewSeason: () => void;
  reSignPlayer: (playerId: string, salary: number, years: number) => { accepted: boolean; reason: string };
  resetLeague: () => void;
  loadSave: (id: string) => void;
  deleteSave: (id: string) => void;
  fireCoach: () => void;
  hireCoach: (coachId: string) => void;
  setLineup: (starterIds: string[]) => void;
  setLineupPosition: (playerId: string, position: import('../types').Position | null) => void;
  setPlayerPosition: (playerId: string, primary: import('../types').Position, secondary?: import('../types').Position) => void;
}

// ── Pure helpers ────────────────────────────────────────────────────────────
import type { Player, FantasyDraftState } from '../types';

const ROSTER_SIZE = 13; // players per team in fantasy draft

function buildSnakeOrder(teamIds: string[], rounds: number): string[] {
  const order: string[] = [];
  for (let r = 0; r < rounds; r++) {
    const round = r % 2 === 0 ? teamIds : [...teamIds].reverse();
    order.push(...round);
  }
  return order;
}

function setupFantasyDraft(league: LeagueState, _seed: number): LeagueState {
  // Collect all rostered players, strip them from teams
  const allPlayerIds = Object.values(league.teams)
    .flatMap(t => t.rosterIds)
    .filter(id => league.players[id]);

  // Sort by OVR descending so pool is in roughly draft-quality order
  allPlayerIds.sort((a, b) => (league.players[b]?.ratings.overall ?? 0) - (league.players[a]?.ratings.overall ?? 0));

  // Clear all rosters
  const teams = Object.fromEntries(
    Object.entries(league.teams).map(([id, t]) => [id, { ...t, rosterIds: [], salary: 0, capSpace: SALARY_CAP }])
  );

  // Build randomized draft order for round 1
  const teamIds = Object.keys(teams);
  const rng = () => Math.random();
  const shuffled = [...teamIds].sort(() => rng() - 0.5);
  // Put user team at a random slot (already randomized)
  const userSlot = shuffled.indexOf(league.userTeamId) + 1;

  const pickOrder = buildSnakeOrder(shuffled, ROSTER_SIZE);

  const fantasyDraft: FantasyDraftState = {
    pool: allPlayerIds,
    pickOrder,
    currentPick: 0,
    rounds: ROSTER_SIZE,
    completedPicks: [],
    userPickSlot: userSlot,
  };

  // Reset player teamIds
  const players = Object.fromEntries(
    Object.entries(league.players).map(([id, p]) => [id, allPlayerIds.includes(id) ? { ...p, teamId: null } : p])
  );

  return { ...league, phase: 'fantasy_draft', fantasyDraft, teams, players };
}

function autoPick(teamId: string, pool: string[], league: LeagueState): string | null {
  if (pool.length === 0) return null;
  const team = league.teams[teamId];
  const roster = team.rosterIds.map(id => league.players[id]).filter(Boolean);
  const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
  const posCount: Record<string, number> = {};
  POSITIONS.forEach(p => { posCount[p] = roster.filter(pl => pl.position === p).length; });

  // Find most needed position (fewest filled, weighted by need)
  const neededPos = [...POSITIONS].sort((a, b) => posCount[a] - posCount[b])[0];
  const neededCount = posCount[neededPos];

  let candidates = pool.filter(id => league.players[id]?.position === neededPos);
  if (neededCount >= 3 || candidates.length === 0) {
    // Position filled enough — just pick best available
    candidates = pool;
  }

  // Pick highest OVR from candidates
  return candidates.sort((a, b) => (league.players[b]?.ratings.overall ?? 0) - (league.players[a]?.ratings.overall ?? 0))[0] ?? null;
}

function applyFantasyPick(league: LeagueState, playerId: string, teamId: string): LeagueState {
  const fd = league.fantasyDraft!;
  const player = league.players[playerId];
  if (!player) return league;

  const updatedPool = fd.pool.filter(id => id !== playerId);
  const newPick = fd.currentPick + 1;
  const isDone = newPick >= fd.pickOrder.length || updatedPool.length === 0;

  const updatedPicks = [...fd.completedPicks, { teamId, playerId }];
  const team = league.teams[teamId];
  const newRosterIds = [...team.rosterIds, playerId];
  const newSalary = parseFloat((team.salary + player.contract.salary).toFixed(2));

  const updatedTeams = {
    ...league.teams,
    [teamId]: { ...team, rosterIds: newRosterIds, salary: newSalary, capSpace: parseFloat((SALARY_CAP - newSalary).toFixed(2)) },
  };
  const updatedPlayers = { ...league.players, [playerId]: { ...player, teamId } };

  const updatedFd: FantasyDraftState = {
    ...fd,
    pool: updatedPool,
    currentPick: newPick,
    completedPicks: updatedPicks,
  };

  return {
    ...league,
    phase: isDone ? 'regular' : 'fantasy_draft',
    fantasyDraft: isDone ? undefined : updatedFd,
    teams: updatedTeams,
    players: updatedPlayers,
  };
}

function calcChemistryTarget(roster: Player[]): number {
  // Baseline 55; veterans (+3 each up to 8), fresh faces penalised beyond 3 new arrivals
  let target = 55;
  let vetCount = 0;
  let newCount = 0;
  roster.forEach(p => {
    const yrs = p.yearsWithTeam ?? 0;
    if (yrs >= 2 && vetCount < 8) { target += 3; vetCount++; }
    else if (yrs === 0) newCount++;
  });
  target -= Math.max(0, newCount - 3) * 3;
  return clamp(target, 20, 100);
}

function calcGMScore(gm: GMRating, seasonsCompleted = 0, difficulty: string = 'normal'): number {
  const diffMult = difficulty === 'legend' ? 1.45 : difficulty === 'hard' ? 1.2 : difficulty === 'easy' ? 0.8 : 1.0;
  const raw = (gm.wins * 1.2 - gm.losses * 0.8 + gm.championships * 30 + gm.tradeBalance * 4 + gm.draftScore * 3) / diffMult;
  if (seasonsCompleted === 0) {
    return Math.min(100, Math.max(0, Math.round(raw / 3)));
  }
  return Math.min(100, Math.max(0, Math.round(50 + raw / 9)));
}

export function calcGMTier(score: number): string {
  if (score < 20) return 'Struggling';
  if (score < 40) return 'Developing';
  if (score < 60) return 'Solid GM';
  if (score < 78) return 'Elite GM';
  return 'Hall of Fame';
}

function addStats(a: PlayerStats, b: Partial<PlayerStats>): PlayerStats {
  return {
    gamesPlayed: a.gamesPlayed + (b.gamesPlayed ?? 0),
    points: a.points + (b.points ?? 0),
    assists: a.assists + (b.assists ?? 0),
    rebounds: a.rebounds + (b.rebounds ?? 0),
    steals: a.steals + (b.steals ?? 0),
    blocks: a.blocks + (b.blocks ?? 0),
    turnovers: a.turnovers + (b.turnovers ?? 0),
    fgm: a.fgm + (b.fgm ?? 0),
    fga: a.fga + (b.fga ?? 0),
    fg3m: a.fg3m + (b.fg3m ?? 0),
    fg3a: a.fg3a + (b.fg3a ?? 0),
    ftm: a.ftm + (b.ftm ?? 0),
    fta: a.fta + (b.fta ?? 0),
    minutes: a.minutes + (b.minutes ?? 0),
  };
}

// verbosityTag: 'low' items are suppressed on 'minimal' setting; 'high' items always shown
function addNews(news: NewsItem[], item: Omit<NewsItem, 'id'>, verbosityTag: 'low' | 'normal' | 'high' = 'normal'): NewsItem[] {
  if (_newsVerbosity === 'minimal' && verbosityTag === 'low') return news;
  if (_newsVerbosity === 'normal' && verbosityTag === 'low') return news;
  const id = `n${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return [{ id, ...item }, ...news].slice(0, 80);
}

function addNotif(notifs: Notification[] = [], item: Omit<Notification, 'id' | 'read'>): Notification[] {
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return [{ id, read: false, ...item }, ...notifs].slice(0, 60);
}

function executePicks(
  newTeams: LeagueState['teams'],
  fromTeamId: string,
  toTeamId: string,
  picks: DraftPick[]
) {
  picks.forEach(pick => {
    newTeams[fromTeamId] = {
      ...newTeams[fromTeamId],
      draftPicks: newTeams[fromTeamId].draftPicks.filter(
        p => !(p.year === pick.year && p.round === pick.round && p.fromTeamId === pick.fromTeamId)
      ),
    };
    newTeams[toTeamId] = {
      ...newTeams[toTeamId],
      draftPicks: [...newTeams[toTeamId].draftPicks, { ...pick, currentTeamId: toTeamId }],
    };
  });
}

// ── Pure helper: simulate one regular-season game day ──────────────────────
function simulateRegularDay(league: LeagueState): { league: LeagueState; lastGame?: LastGameSummary } {
  const { week, schedule, teams, players } = league;
  const dayGames = schedule.filter(g => g.week === week && !g.played);
  const newPlayers = { ...players };
  const newTeams = { ...teams };
  const newSchedule = [...schedule];
  let news = [...league.news];
  let notifications = [...(league.notifications ?? [])];
  let capturedLastGame: LastGameSummary | undefined;
  let scoutingPointsEarned = 0;
  const timeSalt = Date.now() % 1_000_000;
  const rng = createRng(week * 31337 + timeSalt);
  const newBoxScores: Record<string, import('../types').GameBoxScore> = { ...(league.gameBoxScores ?? {}) };

  dayGames.forEach(game => {
    const homeTeam = newTeams[game.homeTeamId];
    const awayTeam = newTeams[game.awayTeamId];
    if (!homeTeam || !awayTeam) return;

    const homePlayers = homeTeam.rosterIds.map(id => newPlayers[id]).filter(Boolean);
    const awayPlayers = awayTeam.rosterIds.map(id => newPlayers[id]).filter(Boolean);
    const seed = week * 10000 + parseInt(game.id.replace('g', '')) + timeSalt;
    const homeCoach = homeTeam.coachId ? league.coaches?.[homeTeam.coachId] : undefined;
    const awayCoach = awayTeam.coachId ? league.coaches?.[awayTeam.coachId] : undefined;
    const result = simulateGame(homeTeam, awayTeam, homePlayers, awayPlayers, seed, homeCoach, awayCoach, league.settings, league.userTeamId);

    const idx = newSchedule.findIndex(g => g.id === game.id);
    if (idx !== -1) newSchedule[idx] = { ...game, homeScore: result.homeScore, awayScore: result.awayScore, played: true };

    // Save box score (convert Maps to plain objects)
    newBoxScores[game.id] = {
      gameId: game.id,
      day: week,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      homeStats: Object.fromEntries(result.homeStats),
      awayStats: Object.fromEntries(result.awayStats),
    };

    const homeWin = result.homeScore > result.awayScore;
    newTeams[game.homeTeamId] = {
      ...homeTeam,
      stats: {
        wins: homeTeam.stats.wins + (homeWin ? 1 : 0),
        losses: homeTeam.stats.losses + (homeWin ? 0 : 1),
        pointsFor: homeTeam.stats.pointsFor + result.homeScore,
        pointsAgainst: homeTeam.stats.pointsAgainst + result.awayScore,
        streak: homeWin ? Math.max(1, homeTeam.stats.streak + 1) : Math.min(-1, homeTeam.stats.streak - 1),
      },
    };
    newTeams[game.awayTeamId] = {
      ...awayTeam,
      stats: {
        wins: awayTeam.stats.wins + (homeWin ? 0 : 1),
        losses: awayTeam.stats.losses + (homeWin ? 1 : 0),
        pointsFor: awayTeam.stats.pointsFor + result.awayScore,
        pointsAgainst: awayTeam.stats.pointsAgainst + result.homeScore,
        streak: homeWin ? Math.min(-1, awayTeam.stats.streak - 1) : Math.max(1, awayTeam.stats.streak + 1),
      },
    };

    result.homeStats.forEach((stats, playerId) => {
      if (newPlayers[playerId]) newPlayers[playerId] = { ...newPlayers[playerId], seasonStats: addStats(newPlayers[playerId].seasonStats, stats) };
    });
    result.awayStats.forEach((stats, playerId) => {
      if (newPlayers[playerId]) newPlayers[playerId] = { ...newPlayers[playerId], seasonStats: addStats(newPlayers[playerId].seasonStats, stats) };
    });

    // Generate narrative for user's game
    const isUserGame = game.homeTeamId === league.userTeamId || game.awayTeamId === league.userTeamId;
    if (isUserGame) {
      const userIsHome = game.homeTeamId === league.userTeamId;
      const oppTeamId = userIsHome ? game.awayTeamId : game.homeTeamId;
      const userTeamObj = newTeams[league.userTeamId];
      const isRivalry = (userTeamObj?.rivals ?? []).includes(oppTeamId);
      const events = generateGameNarrative({
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        userIsHome,
        homeStats: result.homeStats,
        awayStats: result.awayStats,
        homePlayers,
        awayPlayers,
        isRivalry,
      });
      capturedLastGame = {
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        homeTeamName: `${homeTeam.city} ${homeTeam.name}`,
        awayTeamName: `${awayTeam.city} ${awayTeam.name}`,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        userTeamId: league.userTeamId,
        events,
      };
      const userWon = userIsHome ? homeWin : !homeWin;
      const userScore = userIsHome ? result.homeScore : result.awayScore;
      const oppScore2  = userIsHome ? result.awayScore : result.homeScore;
      const margin = Math.abs(userScore - oppScore2);

      // Scouting point milestones
      if (userWon) {
        const userTeamAfter = newTeams[league.userTeamId];
        const newStreak = userTeamAfter?.stats.streak ?? 0;
        const newWins = userTeamAfter?.stats.wins ?? 0;
        // +1 for every 3-game win streak (3, 6, 9, ...)
        if (newStreak > 0 && newStreak % 3 === 0) {
          scoutingPointsEarned += 1;
          notifications = addNotif(notifications, {
            type: 'general',
            title: `🔍 Scouting Point Earned`,
            body: `${newStreak}-game win streak! Your scouts are inspired. +1 scouting point.`,
            date: `Day ${week}`,
          });
        }
        // +1 for win milestones (20, 30, 40, 50, 60 wins)
        if ([20, 30, 40, 50, 60].includes(newWins)) {
          scoutingPointsEarned += 1;
          notifications = addNotif(notifications, {
            type: 'general',
            title: `🔍 Scouting Point Earned`,
            body: `${newWins}-win season milestone! Your scouting network grows. +1 scouting point.`,
            date: `Day ${week}`,
          });
        }
      }
      if (margin >= 20) {
        const oppName = userIsHome ? `${awayTeam.city} ${awayTeam.name}` : `${homeTeam.city} ${homeTeam.name}`;
        notifications = addNotif(notifications, {
          type: 'game',
          title: userWon ? `Blowout win vs ${oppName}` : `Rough night vs ${oppName}`,
          body: userWon
            ? `Dominant ${margin}-point victory. The team is clicking on all cylinders.`
            : `Lost by ${margin}. Time to regroup and look at the film.`,
          date: `Day ${week}`,
        });
      }
    }

    [...homePlayers, ...awayPlayers].forEach(p => {
      const teamForInjury = newTeams[p.teamId ?? ''];
      const coachForInjury = teamForInjury?.coachId ? league.coaches?.[teamForInjury.coachId] : undefined;
      const healthReduction = coachForInjury ? 1 - (coachForInjury.health / 400) : 1;
      if (league.settings?.injuriesEnabled === false) {
        // Still decrement existing injuries even when disabled (allow natural recovery)
        if (p.injuryGames > 0) {
          const healed = p.injuryGames === 1;
          newPlayers[p.id] = { ...newPlayers[p.id], injuryGames: Math.max(0, p.injuryGames - 1), ...(healed ? { injuryType: undefined } : {}) };
        }
        return;
      }
      if (rng() < 0.012 * healthReduction && p.injuryGames === 0) {
        // Injury probability scales slightly with age
        const ageFactor = p.age >= 33 ? 1.3 : p.age >= 30 ? 1.1 : 1.0;
        const rawRoll = rng();
        const games = rawRoll < (0.55 * ageFactor) ? Math.floor(rng() * 3) + 1    // day-to-day
                    : rawRoll < (0.82 * ageFactor) ? Math.floor(rng() * 5) + 4    // week-to-week
                    : rawRoll < (0.96 * ageFactor) ? Math.floor(rng() * 12) + 8   // long-term
                    : Math.floor(rng() * 10) + 20;                                  // season-ending
        const seed = parseInt(p.id.replace(/\D/g, '').slice(-4) || '0', 10) + week;
        const injuryType = getInjuryName(games, seed);
        newPlayers[p.id] = { ...newPlayers[p.id], injuryGames: games, injuryType };
        if (p.teamId === league.userTeamId) {
          news = addNews(news, {
            date: `Day ${week}`,
            headline: `${p.name} (${injuryType}) will miss ${games} game${games !== 1 ? 's' : ''}.`,
            type: 'injury',
          });
          notifications = addNotif(notifications, {
            type: 'injury',
            title: `${p.name} — ${injuryType}`,
            body: `Out ${games} game${games !== 1 ? 's' : ''}. ${games >= 20 ? 'Season-ending injury.' : games >= 8 ? 'Long-term absence.' : games >= 4 ? 'Week-to-week.' : 'Day-to-day.'}`,
            date: `Day ${week}`,
          });
        }
      } else if (p.injuryGames > 0) {
        const healed = p.injuryGames === 1;
        newPlayers[p.id] = { ...newPlayers[p.id], injuryGames: Math.max(0, p.injuryGames - 1), ...(healed ? { injuryType: undefined } : {}) };
      }
    });
  });

  // ── Morale-based trade requests ───────────────────────────────────────────
  // Miserable players on user's team may request trades
  const userRosterFull = (newTeams[league.userTeamId]?.rosterIds ?? []).map(id => newPlayers[id]).filter(Boolean);
  userRosterFull.forEach(p => {
    if ((p.morale ?? 75) < 35 && !p.tradeRequest && rng() < 0.06) {
      newPlayers[p.id] = { ...newPlayers[p.id], tradeRequest: true };
      notifications = addNotif(notifications, {
        type: 'general',
        title: `${p.name} has requested a trade`,
        body: `${p.name} is miserable (morale: ${Math.round(p.morale ?? 0)}) and wants out. Address his situation or expect declining performance.`,
        date: `Day ${week}`,
      });
      news = addNews(news, {
        date: `Day ${week}`,
        headline: `${p.name} requests trade from ${newTeams[league.userTeamId]?.city ?? ''}.`,
        type: 'general',
      });
    }
    // Clear trade request if morale recovers
    if (p.tradeRequest && (p.morale ?? 75) >= 60) {
      newPlayers[p.id] = { ...newPlayers[p.id], tradeRequest: false };
    }
  });

  // ── Morale updates for user's players ────────────────────────────────────
  const userGame = dayGames.find(g => g.homeTeamId === league.userTeamId || g.awayTeamId === league.userTeamId);
  if (userGame && league.settings?.moraleSystem !== false) {
    const isHome2  = userGame.homeTeamId === league.userTeamId;
    const gameIdx  = newSchedule.findIndex(g => g.id === userGame.id);
    const played   = newSchedule[gameIdx];
    const userWon2 = played ? (isHome2 ? played.homeScore > played.awayScore : played.awayScore > played.homeScore) : false;
    const userRoster = [...(newTeams[league.userTeamId]?.rosterIds ?? [])]
      .map(id => newPlayers[id]).filter(Boolean)
      .sort((a, b) => b.ratings.overall - a.ratings.overall);
    const moraleVolatility = league.settings?.difficulty === 'legend' ? 1.6
                           : league.settings?.difficulty === 'hard'   ? 1.25
                           : league.settings?.difficulty === 'easy'   ? 0.7
                           : 1.0;
    userRoster.forEach((p, i) => {
      const isStarter = i < 5;
      const baseDelta = isStarter ? (userWon2 ? 1.5 : -1.0) : (userWon2 ? 0 : -0.5);
      const moraleDelta = baseDelta * moraleVolatility;
      const cur = newPlayers[p.id].morale ?? 75;
      const next = clamp(Math.round(cur + moraleDelta + (75 - cur) * 0.02), 20, 100);
      newPlayers[p.id] = { ...newPlayers[p.id], morale: next };
    });
  }

  // ── headToHead / rivals / chemistry / gmRating for user game ─────────────
  let gmRating = { ...(league.gmRating ?? { score: 0, wins: 0, losses: 0, championships: 0, tradeBalance: 0, draftScore: 0 }) };
  if (userGame) {
    const isHome3 = userGame.homeTeamId === league.userTeamId;
    const oppId = isHome3 ? userGame.awayTeamId : userGame.homeTeamId;
    const gameIdx2 = newSchedule.findIndex(g => g.id === userGame.id);
    const played2 = newSchedule[gameIdx2];
    const userWon3 = played2 ? (isHome3 ? played2.homeScore > played2.awayScore : played2.awayScore > played2.homeScore) : false;

    // GM rating wins/losses
    if (userWon3) gmRating.wins += 1; else gmRating.losses += 1;
    gmRating.score = calcGMScore(gmRating, league.seasonHistory?.length ?? 0, league.settings?.difficulty ?? 'normal');

    // Update headToHead
    const userT = { ...newTeams[league.userTeamId] };
    const h2h = { ...(userT.headToHead ?? {}) };
    const prev = h2h[oppId] ?? { wins: 0, losses: 0 };
    h2h[oppId] = userWon3 ? { wins: prev.wins + 1, losses: prev.losses } : { wins: prev.wins, losses: prev.losses + 1 };

    // Check rivals
    const rivals = [...(userT.rivals ?? [])];
    const oppRec = h2h[oppId];
    if (!rivals.includes(oppId) && oppRec.losses >= 3 && oppRec.losses > oppRec.wins) {
      rivals.push(oppId);
      const oppTeamObj = newTeams[oppId];
      notifications = addNotif(notifications, {
        type: 'general',
        title: `Rivalry formed with ${oppTeamObj?.city} ${oppTeamObj?.name}!`,
        body: `After repeated losses, ${oppTeamObj?.city} ${oppTeamObj?.name} is now your rival. Time to settle the score.`,
        date: `Day ${week}`,
      });
    }

    // Chemistry — nudge current value toward roster-stability target, boosted by wins
    const userRosterForChem = newTeams[league.userTeamId].rosterIds.map(id => newPlayers[id]).filter(Boolean);
    const chemTarget = calcChemistryTarget(userRosterForChem);
    const curChem = newTeams[league.userTeamId].chemistry ?? 55;
    // Wins pull chemistry up toward target; losses pull it down slightly
    const chemWinDelta = userWon3 ? 1.5 : -0.5;
    // Drift toward target (roster stability)
    const chemDrift = (chemTarget - curChem) * 0.05;
    const newChem = clamp(Math.round(curChem + chemWinDelta + chemDrift), 20, 100);

    let moraleBonusForChem = 0;
    if (newChem > 70) moraleBonusForChem = 0.5;
    else if (newChem < 50) moraleBonusForChem = -0.5;

    if (moraleBonusForChem !== 0) {
      userRosterForChem.forEach(p => {
        const cur = newPlayers[p.id].morale ?? 75;
        newPlayers[p.id] = { ...newPlayers[p.id], morale: clamp(Math.round(cur + moraleBonusForChem), 20, 100) };
      });
    }

    newTeams[league.userTeamId] = { ...newTeams[league.userTeamId], headToHead: h2h, rivals, chemistry: newChem };
  }

  // ── AI incoming trade offers to user ─────────────────────────────────────
  let incomingOffers = [...(league.incomingOffers ?? [])];
  // Expire stale offers
  incomingOffers = incomingOffers.map(o =>
    o.status === 'pending' && o.expiresDay <= week ? { ...o, status: 'expired' as const } : o
  );

  // Trade frequency setting + deadline urgency
  const freqBase = league.settings?.tradeFrequency === 'low' ? 0.07
                 : league.settings?.tradeFrequency === 'high' ? 0.20
                 : 0.12;
  const daysToDeadline = TRADE_DEADLINE_DAY - week;
  const offerRate = daysToDeadline <= 8 && daysToDeadline >= 0 ? freqBase * 1.8 : freqBase;
  if (week <= TRADE_DEADLINE_DAY && rng() < offerRate) {
    const aiTeams = Object.values(newTeams).filter(t => t.id !== league.userTeamId);
    const offeringTeam = aiTeams[Math.floor(rng() * aiTeams.length)];
    const userTeamNow = newTeams[league.userTeamId];
    const userRoster2 = userTeamNow.rosterIds
      .map(id => newPlayers[id]).filter(Boolean)
      .sort((a, b) => b.ratings.overall - a.ratings.overall);
    const aiRoster = offeringTeam.rosterIds
      .map(id => newPlayers[id]).filter(Boolean)
      .sort((a, b) => a.ratings.overall - b.ratings.overall);

    // Pick a user player the AI wants (3rd–8th, avoid stars)
    const targets = userRoster2.slice(2, 8);
    const wantedPlayer = targets[Math.floor(rng() * targets.length)];
    if (wantedPlayer && !incomingOffers.some(o => o.status === 'pending' && o.fromTeamId === offeringTeam.id)) {
      // Try candidates in random order, pick first one that passes both sides of evaluateTrade
      const wantedVal = playerValue(wantedPlayer);
      const candidates = aiRoster
        .filter(p => {
          const v = playerValue(p);
          // AI offer must be worth at least 90% of what they're asking for (fair-to-user-favored)
          return v >= wantedVal * 0.90 && v <= wantedVal * 1.35 && p.id !== wantedPlayer.id;
        })
        .sort(() => rng() - 0.5); // shuffle

      let chosenPlayer: typeof candidates[number] | undefined;
      for (const candidate of candidates) {
        // Build hypothetical offer: AI gives candidate, AI wants wantedPlayer
        const hypothetical: import('../types').TradeOffer = {
          fromTeamId: league.userTeamId,
          toTeamId: offeringTeam.id,
          fromPlayerIds: [wantedPlayer.id],
          toPlayerIds: [candidate.id],
          fromPicks: [],
          toPicks: [],
        };
        // The AI must accept this if the user made it (same logic, same rules)
        const aiEval = evaluateTrade(hypothetical, offeringTeam, newPlayers, newTeams, league.settings);
        if (aiEval.accepted) {
          chosenPlayer = candidate;
          break;
        }
      }

      if (chosenPlayer) {
        const newOffer: IncomingTradeOffer = {
          id: `offer_${Date.now()}_${Math.floor(rng() * 9999)}`,
          fromTeamId: offeringTeam.id,
          offeredPlayerIds: [chosenPlayer.id],
          wantedPlayerIds: [wantedPlayer.id],
          offeredPicks: [],
          wantedPicks: [],
          createdDay: week,
          expiresDay: week + 7,
          status: 'pending',
        };
        incomingOffers.push(newOffer);
        notifications = addNotif(notifications, {
          type: 'trade',
          title: `Trade offer from ${offeringTeam.city}`,
          body: `${offeringTeam.city} ${offeringTeam.name} want ${wantedPlayer.name} and offer ${chosenPlayer.name} in return. Expires in 7 days.`,
          date: `Day ${week}`,
        });
      }
    }
  }

  // ── AI trades (only before deadline) ─────────────────────────────────────
  if (week <= TRADE_DEADLINE_DAY) {
    Object.values(newTeams).forEach(team => {
      if (team.id === league.userTeamId) return;
      if (rng() > 0.02) return;
      const otherTeams = Object.values(newTeams).filter(t => t.id !== team.id);
      const target = otherTeams[Math.floor(rng() * otherTeams.length)];
      if (!target) return;
      const teamPl = team.rosterIds.map(id => newPlayers[id]).filter(Boolean).sort((a, b) => a.ratings.overall - b.ratings.overall);
      const targetPl = target.rosterIds.map(id => newPlayers[id]).filter(Boolean).sort((a, b) => a.ratings.overall - b.ratings.overall);
      const give = teamPl[Math.floor(rng() * Math.min(5, teamPl.length))];
      const receive = targetPl[Math.floor(rng() * Math.min(5, targetPl.length))];
      if (!give || !receive) return;
      if (Math.abs(playerValue(give) - playerValue(receive)) < 5) {
        newTeams[team.id] = { ...newTeams[team.id], rosterIds: [...newTeams[team.id].rosterIds.filter(id => id !== give.id), receive.id] };
        newTeams[target.id] = { ...newTeams[target.id], rosterIds: [...newTeams[target.id].rosterIds.filter(id => id !== receive.id), give.id] };
        newPlayers[give.id] = { ...newPlayers[give.id], teamId: target.id };
        newPlayers[receive.id] = { ...newPlayers[receive.id], teamId: team.id };
        news = addNews(news, { date: `Day ${week}`, headline: `TRADE: ${team.city} ${team.name} acquire ${receive.name} from ${target.city} ${target.name}.`, type: 'trade' });
      }
    });
  }

  const nextDay = week + 1;
  let newPhase: LeagueState['phase'] = league.phase;
  let playinGames: PlayinGame[] | undefined;

  if (week === TRADE_DEADLINE_DAY) {
    news = addNews(news, { date: `Day ${week}`, headline: 'Trade Deadline has passed — no more trades until next season.', type: 'general' });
  }

  let seasonAwards: SeasonAwards | undefined;
  if (week >= REGULAR_SEASON_DAYS && league.phase === 'regular') {
    newPhase = 'playin';
    playinGames = setupPlayin(newTeams);
    news = addNews(news, { date: `Day ${week}`, headline: 'Regular season complete! The Play-In Tournament begins.', type: 'general' });

    // ── Calculate season awards ────────────────────────────────────────────
    const allPlayersList = Object.values(newPlayers).filter(p => p.teamId && p.seasonStats.gamesPlayed >= 20);
    const avg = (p: typeof allPlayersList[0]) => ({
      pts: p.seasonStats.gamesPlayed ? p.seasonStats.points / p.seasonStats.gamesPlayed : 0,
      reb: p.seasonStats.gamesPlayed ? p.seasonStats.rebounds / p.seasonStats.gamesPlayed : 0,
      ast: p.seasonStats.gamesPlayed ? p.seasonStats.assists / p.seasonStats.gamesPlayed : 0,
    });

    const topScorer  = [...allPlayersList].sort((a, b) => avg(b).pts - avg(a).pts)[0];
    const topRebounder = [...allPlayersList].sort((a, b) => avg(b).reb - avg(a).reb)[0];
    const topAssist  = [...allPlayersList].sort((a, b) => avg(b).ast - avg(a).ast)[0];

    // MVP: composite score (pts*0.4 + reb*0.2 + ast*0.2 + ovr*0.2) — must be on team with winning record
    const teamWins = (p: typeof allPlayersList[0]) => newTeams[p.teamId!]?.stats.wins ?? 0;
    const mvpScore = (p: typeof allPlayersList[0]) =>
      avg(p).pts * 0.4 + avg(p).reb * 0.2 + avg(p).ast * 0.2 + p.ratings.overall * 0.2 + (teamWins(p) >= 41 ? 5 : 0);
    const mvp = [...allPlayersList].sort((a, b) => mvpScore(b) - mvpScore(a))[0];

    // DPOY: best defensive rating (defense + blocks + steals weighted)
    const dpoyScore = (p: typeof allPlayersList[0]) => {
      const gp = p.seasonStats.gamesPlayed;
      return p.ratings.defense * 0.6 + (p.seasonStats.blocks / gp) * 8 + (p.seasonStats.steals / gp) * 6;
    };
    const dpoy = [...allPlayersList].sort((a, b) => dpoyScore(b) - dpoyScore(a))[0];

    // 6th Man: best among bench players (avg < starter minutes)
    const avgMinutes = allPlayersList.reduce((s, p) => s + p.seasonStats.minutes / p.seasonStats.gamesPlayed, 0) / allPlayersList.length;
    const benchPlayers = allPlayersList.filter(p => (p.seasonStats.minutes / p.seasonStats.gamesPlayed) < avgMinutes * 0.85);
    const sixthMan = [...benchPlayers].sort((a, b) => avg(b).pts - avg(a).pts)[0];

    // Most Improved: biggest OVR gain
    const mostImproved = [...Object.values(newPlayers)]
      .filter(p => p.teamId && p.previousOvr !== undefined)
      .sort((a, b) => (b.ratings.overall - (b.previousOvr ?? b.ratings.overall)) - (a.ratings.overall - (a.previousOvr ?? a.ratings.overall)))[0];

    // All-NBA Teams: top 15 players by mvpScore (5 per team)
    const allNbaPool = [...allPlayersList].sort((a, b) => mvpScore(b) - mvpScore(a));
    const allNbaFirst  = allNbaPool.slice(0, 5).map(p => p.id);
    const allNbaSecond = allNbaPool.slice(5, 10).map(p => p.id);
    const allNbaThird  = allNbaPool.slice(10, 15).map(p => p.id);

    // Best record
    const bestTeam = Object.values(newTeams).sort((a, b) => b.stats.wins - a.stats.wins)[0];

    seasonAwards = {
      season: league.season,
      mvp: mvp ? { playerId: mvp.id, teamId: mvp.teamId!, value: `${avg(mvp).pts.toFixed(1)} PPG` } : undefined,
      scoringChamp: topScorer ? { playerId: topScorer.id, teamId: topScorer.teamId!, value: `${avg(topScorer).pts.toFixed(1)} PPG` } : undefined,
      reboundsChamp: topRebounder ? { playerId: topRebounder.id, teamId: topRebounder.teamId!, value: `${avg(topRebounder).reb.toFixed(1)} RPG` } : undefined,
      assistsChamp: topAssist ? { playerId: topAssist.id, teamId: topAssist.teamId!, value: `${avg(topAssist).ast.toFixed(1)} APG` } : undefined,
      mostImproved: mostImproved ? { playerId: mostImproved.id, teamId: mostImproved.teamId!, value: `+${mostImproved.ratings.overall - (mostImproved.previousOvr ?? mostImproved.ratings.overall)} OVR` } : undefined,
      dpoy: dpoy ? { playerId: dpoy.id, teamId: dpoy.teamId!, value: `${dpoy.ratings.defense} DEF` } : undefined,
      sixthMan: sixthMan ? { playerId: sixthMan.id, teamId: sixthMan.teamId!, value: `${avg(sixthMan).pts.toFixed(1)} PPG off bench` } : undefined,
      allNbaFirst,
      allNbaSecond,
      allNbaThird,
      bestRecord: bestTeam ? { teamId: bestTeam.id, wins: bestTeam.stats.wins, losses: bestTeam.stats.losses } : undefined,
    };
  }

  return {
    league: {
      ...league,
      week: nextDay,
      phase: newPhase,
      teams: newTeams,
      players: newPlayers,
      schedule: newSchedule,
      news,
      notifications,
      incomingOffers,
      gmRating,
      scoutingPoints: (league.scoutingPoints ?? 0) + scoutingPointsEarned,
      ...(playinGames ? { playinGames } : {}),
      ...(seasonAwards ? { seasonAwards } : {}),
      gameBoxScores: newBoxScores,
    },
    lastGame: capturedLastGame,
  };
}

// ── Pure helper: simulate one play-in step ─────────────────────────────────
function simulatePlayinStep(league: LeagueState): LeagueState {
  const games = league.playinGames ?? [];
  const { teams, players } = league;
  let news = [...league.news];
  const newBoxScores: Record<string, import('../types').GameBoxScore> = { ...(league.gameBoxScores ?? {}) };

  // Step 1: simulate initial round (7v8, 9v10) if not all done
  const initialUnplayed = games.filter(g => (g.matchup === '7v8' || g.matchup === '9v10') && !g.played);
  if (initialUnplayed.length > 0) {
    let newGames = [...games];
    initialUnplayed.forEach(g => {
      const homeTeam = teams[g.homeTeamId];
      const awayTeam = teams[g.awayTeamId];
      if (!homeTeam || !awayTeam) return;
      const homePlayers = homeTeam.rosterIds.map(id => players[id]).filter(Boolean);
      const awayPlayers = awayTeam.rosterIds.map(id => players[id]).filter(Boolean);
      const seed = g.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) + (Date.now() % 1_000_000);
      const result = simulateGame(homeTeam, awayTeam, homePlayers, awayPlayers, seed);
      const homeWin = result.homeScore > result.awayScore;
      const winnerId = homeWin ? g.homeTeamId : g.awayTeamId;
      const loserId = homeWin ? g.awayTeamId : g.homeTeamId;
      const winner = teams[winnerId];
      const loser = teams[loserId];
      const idx = newGames.findIndex(x => x.id === g.id);
      newGames[idx] = { ...g, homeScore: result.homeScore, awayScore: result.awayScore, played: true, winnerId };
      newBoxScores[`pi_${g.id}`] = {
        gameId: `pi_${g.id}`, day: league.week,
        homeTeamId: g.homeTeamId, awayTeamId: g.awayTeamId,
        homeScore: result.homeScore, awayScore: result.awayScore,
        homeStats: Object.fromEntries(result.homeStats),
        awayStats: Object.fromEntries(result.awayStats),
      };
      const eliminated = g.matchup === '9v10' ? ` — ${loser.city} ${loser.name} eliminated` : '';
      news = addNews(news, {
        date: 'Play-In',
        headline: `Play-In (${g.conference} ${g.matchup}): ${winner.city} ${winner.name} def. ${loser.city} ${loser.name} ${result.homeScore}–${result.awayScore}${eliminated}`,
        type: 'game',
      });
    });
    // Add final games once both conferences' initial games are done
    newGames = addPlayinFinalGames(newGames);
    return { ...league, playinGames: newGames, news, gameBoxScores: newBoxScores };
  }

  // Step 2: simulate final games
  const finalUnplayed = games.filter(g => g.matchup === 'final' && !g.played);
  if (finalUnplayed.length > 0) {
    let newGames = [...games];
    finalUnplayed.forEach(g => {
      const homeTeam = teams[g.homeTeamId];
      const awayTeam = teams[g.awayTeamId];
      if (!homeTeam || !awayTeam) return;
      const homePlayers = homeTeam.rosterIds.map(id => players[id]).filter(Boolean);
      const awayPlayers = awayTeam.rosterIds.map(id => players[id]).filter(Boolean);
      const seed = g.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) + 999;
      const result = simulateGame(homeTeam, awayTeam, homePlayers, awayPlayers, seed);
      const homeWin = result.homeScore > result.awayScore;
      const winnerId = homeWin ? g.homeTeamId : g.awayTeamId;
      const winner = teams[winnerId];
      const idx = newGames.findIndex(x => x.id === g.id);
      newGames[idx] = { ...g, homeScore: result.homeScore, awayScore: result.awayScore, played: true, winnerId };
      newBoxScores[`pi_${g.id}`] = {
        gameId: `pi_${g.id}`, day: league.week,
        homeTeamId: g.homeTeamId, awayTeamId: g.awayTeamId,
        homeScore: result.homeScore, awayScore: result.awayScore,
        homeStats: Object.fromEntries(result.homeStats),
        awayStats: Object.fromEntries(result.awayStats),
      };
      news = addNews(news, {
        date: 'Play-In',
        headline: `Play-In Final (${g.conference}): ${winner.city} ${winner.name} clinch the 8th seed! ${result.homeScore}–${result.awayScore}`,
        type: 'game',
      });
    });

    // Check if all play-in done → set up playoffs
    if (newGames.every(g => g.played)) {
      const bracket = setupPlayoffBracket(teams, newGames);
      news = addNews(news, { date: 'Playoffs', headline: 'NBA Playoffs bracket is set! The quest for the championship begins.', type: 'general' });
      return { ...league, playinGames: newGames, playoffBracket: bracket, phase: 'playoffs', news, gameBoxScores: newBoxScores };
    }
    return { ...league, playinGames: newGames, news, gameBoxScores: newBoxScores };
  }

  return league;
}

// ── Pure helper: simulate one round of playoff games ───────────────────────
function simulatePlayoffStep(league: LeagueState): LeagueState {
  const bracket = league.playoffBracket ?? [];
  const { teams, players } = league;
  let news = [...league.news];
  let newPlayers = { ...players };

  const incompleteRounds = bracket.filter(s => !s.winnerId).map(s => s.round);
  if (incompleteRounds.length === 0) return league;
  const activeRound = Math.min(...incompleteRounds) as 1 | 2 | 3 | 4;
  const activeSeries = bracket.filter(s => s.round === activeRound && !s.winnerId);

  if (activeSeries.length === 0) return league;

  let newBracket = [...bracket];
  const newBoxScores: Record<string, import('../types').GameBoxScore> = { ...(league.gameBoxScores ?? {}) };

  activeSeries.forEach(series => {
    const gameNum = series.games.length + 1;
    const { homeTeamId, awayTeamId } = getPlayoffHomeAway(series, gameNum);
    const homeTeam = teams[homeTeamId];
    const awayTeam = teams[awayTeamId];
    if (!homeTeam || !awayTeam) return;

    const homePlayers = homeTeam.rosterIds.map(id => players[id]).filter(Boolean);
    const awayPlayers = awayTeam.rosterIds.map(id => players[id]).filter(Boolean);
    const seed = (series.id + gameNum).split('').reduce((s, c) => s + c.charCodeAt(0), 0) * 997 + league.week * 101 + (Date.now() % 1_000_000);
    const result = simulateGame(homeTeam, awayTeam, homePlayers, awayPlayers, seed);

    result.homeStats.forEach((stats, pid) => {
      if (newPlayers[pid]) newPlayers[pid] = { ...newPlayers[pid], seasonStats: addStats(newPlayers[pid].seasonStats, stats) };
    });
    result.awayStats.forEach((stats, pid) => {
      if (newPlayers[pid]) newPlayers[pid] = { ...newPlayers[pid], seasonStats: addStats(newPlayers[pid].seasonStats, stats) };
    });

    const boxId = `po_${series.id}_g${gameNum}`;
    newBoxScores[boxId] = {
      gameId: boxId, day: league.week,
      homeTeamId, awayTeamId,
      homeScore: result.homeScore, awayScore: result.awayScore,
      homeStats: Object.fromEntries(result.homeStats),
      awayStats: Object.fromEntries(result.awayStats),
    };

    const homeWin = result.homeScore > result.awayScore;
    const teamAWon = (homeTeamId === series.teamAId) === homeWin;
    const newAWins = series.teamAWins + (teamAWon ? 1 : 0);
    const newBWins = series.teamBWins + (teamAWon ? 0 : 1);
    const winnerId = newAWins === 4 ? series.teamAId : newBWins === 4 ? series.teamBId : undefined;

    const updated: PlayoffSeries = {
      ...series,
      teamAWins: newAWins,
      teamBWins: newBWins,
      winnerId,
      games: [...series.games, { homeTeamId, awayTeamId, homeScore: result.homeScore, awayScore: result.awayScore, played: true, gameNumber: gameNum }],
    };

    const idx = newBracket.findIndex(s => s.id === series.id);
    newBracket[idx] = updated;

    if (winnerId) {
      const winTeam = teams[winnerId];
      const loseId = winnerId === series.teamAId ? series.teamBId : series.teamAId;
      const loseTeam = teams[loseId];
      const roundName = ['', 'First Round', 'Conference Semifinals', 'Conference Finals', 'NBA Finals'][series.round];
      const champ = series.round === 4 ? ' — NBA CHAMPIONS! 🏆' : '';
      news = addNews(news, {
        date: `Playoffs R${series.round}`,
        headline: `${roundName}: ${winTeam.city} ${winTeam.name} win series ${Math.max(newAWins, newBWins)}–${Math.min(newAWins, newBWins)} over ${loseTeam.city} ${loseTeam.name}${champ}`,
        type: 'game',
      });
    }
  });

  // Check if the active round is now fully complete
  const roundDone = newBracket.filter(s => s.round === activeRound).every(s => s.winnerId);
  if (roundDone) {
    if (activeRound === 4) {
      // NBA Finals over → detect champion → draft phase
      const finalsSeries = newBracket.find(s => s.round === 4);
      const champId = finalsSeries?.winnerId;
      const champTeam = champId ? teams[champId] : null;
      const draftProspects = generateDraftClass(league.season, 60, league.settings?.rookieQuality ?? 'normal');
      const draftOrder = runDraftLottery(Object.values(teams), league.season, league.settings?.draftLottery !== false);
      news = addNews(news, { date: 'Offseason', headline: 'The Draft Lottery is complete. The NBA Draft begins!', type: 'draft' });
      let notifications = [...(league.notifications ?? [])];
      if (champId === league.userTeamId && champTeam) {
        notifications = addNotif(notifications, {
          type: 'championship',
          title: `🏆 NBA Champions!`,
          body: `The ${champTeam.city} ${champTeam.name} are NBA Champions! An incredible season culminating in the ultimate prize.`,
          date: `${league.season} Finals`,
        });
      }
      // Award scouting points based on draft position (worse teams = better picks = more scouting points)
      const userDraftPos = draftOrder.indexOf(league.userTeamId) + 1; // 1-indexed
      const draftScoutBonus = userDraftPos <= 3 ? 5
        : userDraftPos <= 6 ? 4
        : userDraftPos <= 10 ? 3
        : userDraftPos <= 16 ? 2
        : 1;
      notifications = addNotif(notifications, {
        type: 'general',
        title: `🔍 Draft Scouting Budget`,
        body: `You have the #${userDraftPos} pick. Your scouting budget: +${draftScoutBonus} point${draftScoutBonus !== 1 ? 's' : ''} for draft prep.`,
        date: `${league.season} Draft`,
      });
      const newTeamsWithChamp = { ...league.teams };
      if (champId) {
        newTeamsWithChamp[champId] = {
          ...newTeamsWithChamp[champId],
          championships: (newTeamsWithChamp[champId]?.championships ?? 0) + 1,
        };
      }
      return {
        ...league,
        playoffBracket: newBracket,
        players: newPlayers,
        teams: newTeamsWithChamp,
        news,
        notifications,
        champion: champId ?? league.champion,
        phase: 'draft',
        draftProspects,
        draftOrder,
        scoutingPoints: (league.scoutingPoints ?? 0) + draftScoutBonus,
        gameBoxScores: newBoxScores,
      };
    } else {
      const nextRound = getNextPlayoffRound(newBracket, activeRound as 1 | 2 | 3, teams);
      newBracket = [...newBracket, ...nextRound];
      const roundNames = ['', 'First Round', 'Conference Semifinals', 'Conference Finals', 'NBA Finals'];
      news = addNews(news, { date: 'Playoffs', headline: `${roundNames[activeRound + 1]} is set!`, type: 'general' });
    }
  }

  return { ...league, playoffBracket: newBracket, players: newPlayers, news, gameBoxScores: newBoxScores };
}

// Pick the best available prospect for an AI team, preferring positional needs
function aiDraftPick(league: LeagueState, teamId: string): import('../types').DraftProspect {
  const team = league.teams[teamId];
  const roster = (team?.rosterIds ?? []).map(id => league.players[id]).filter(Boolean);
  const posCounts: Record<string, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  roster.forEach(p => { posCounts[p.position] = (posCounts[p.position] ?? 0) + 1; });
  const minCount = Math.min(...Object.values(posCounts));
  const neededPositions = Object.entries(posCounts)
    .filter(([, c]) => c <= minCount + 1)
    .map(([pos]) => pos);
  // Look at top 5 prospects; prefer someone filling a positional need
  const top5 = league.draftProspects.slice(0, Math.min(5, league.draftProspects.length));
  return top5.find(p => neededPositions.includes(p.position)) ?? league.draftProspects[0];
}

// Rescales all player salaries to the current formula and recomputes team totals.
// Runs automatically on save-load when old inflated contracts are detected.
function migrateSalaries(league: LeagueState): LeagueState {
  const needsMigration = Object.values(league.players).some(p => p.contract.salary > 28);
  if (!needsMigration && league.salaryCap >= SALARY_CAP) return league;

  const newPlayers = { ...league.players };
  for (const [id, p] of Object.entries(newPlayers)) {
    const base = Math.max(1.1, (p.ratings.overall - 40) * 0.4 + 1.1);
    // Use a stable pseudo-random variance seeded from player id so it's consistent
    const variance = 0.88 + ((parseInt(id.replace(/\D/g, '').slice(-4) || '0', 10) % 100) / 100) * 0.24;
    const newSalary = parseFloat((base * variance).toFixed(2));
    newPlayers[id] = { ...p, contract: { ...p.contract, salary: newSalary } };
  }

  const newTeams = { ...league.teams };
  for (const [tid, team] of Object.entries(newTeams)) {
    const totalSal = team.rosterIds.reduce((s, id) => {
      const p = newPlayers[id];
      if (!p || p.contract.twoWay) return s;
      return s + p.contract.salary;
    }, 0);
    newTeams[tid] = {
      ...team,
      salary: parseFloat(totalSal.toFixed(2)),
      capSpace: parseFloat((SALARY_CAP - totalSal).toFixed(2)),
    };
  }

  return { ...league, players: newPlayers, teams: newTeams, salaryCap: SALARY_CAP };
}

export const useLeagueStore = create<LeagueStore>()(
  persist(
    (set, get) => ({
      league: null,
      savedSlots: [],
      lastGame: null,
      pendingAwards: null,
      pendingTradeOffer: null,
      isSimming: false,

      clearLastGame: () => set({ lastGame: null }),
      clearAwards: () => set({ pendingAwards: null }),
      clearPendingTradeOffer: () => set({ pendingTradeOffer: null }),

      markNotificationsRead: () => {
        const { league } = get();
        if (!league) return;
        const notifications = (league.notifications ?? []).map(n => ({ ...n, read: true }));
        set({ league: { ...league, notifications } });
      },

      migratePlayerTendencies: () => {
        const { league } = get();
        if (!league) return;
        const players = { ...league.players };
        Object.values(players).forEach(p => {
          players[p.id] = { ...p, tendency: deriveTendency(p.ratings, p.position, p.height) };
        });
        // Recalculate GM rating score with current formula
        const gm = league.gmRating;
        const gmRating = gm ? { ...gm, score: calcGMScore(gm, league.seasonHistory?.length ?? 0) } : league.gmRating;
        set({ league: { ...league, players, gmRating } });
      },

      acceptIncomingOffer: (offerId) => {
        const { league } = get();
        if (!league) return { accepted: false, reason: 'No league.' };
        const offer = (league.incomingOffers ?? []).find(o => o.id === offerId);
        if (!offer || offer.status !== 'pending') return { accepted: false, reason: 'Offer not found.' };

        const fromTeam = league.teams[offer.fromTeamId];
        const userTeam = league.teams[league.userTeamId];
        if (!fromTeam || !userTeam) return { accepted: false, reason: 'Team not found.' };

        const newPlayers = { ...league.players };
        const newTeams   = { ...league.teams };

        // Move players
        offer.offeredPlayerIds.forEach(id => {
          newPlayers[id] = { ...newPlayers[id], teamId: league.userTeamId };
          newTeams[league.userTeamId] = { ...newTeams[league.userTeamId], rosterIds: [...newTeams[league.userTeamId].rosterIds, id] };
          newTeams[offer.fromTeamId]  = { ...newTeams[offer.fromTeamId],  rosterIds: newTeams[offer.fromTeamId].rosterIds.filter(r => r !== id) };
        });
        offer.wantedPlayerIds.forEach(id => {
          newPlayers[id] = { ...newPlayers[id], teamId: offer.fromTeamId };
          newTeams[offer.fromTeamId]  = { ...newTeams[offer.fromTeamId],  rosterIds: [...newTeams[offer.fromTeamId].rosterIds, id] };
          newTeams[league.userTeamId] = { ...newTeams[league.userTeamId], rosterIds: newTeams[league.userTeamId].rosterIds.filter(r => r !== id) };
        });

        // Recalculate salaries (exclude two-way)
        [league.userTeamId, offer.fromTeamId].forEach(tid => {
          const sal = newTeams[tid].rosterIds.reduce((s, id) => {
            const pl = newPlayers[id];
            if (!pl || pl.contract.twoWay) return s;
            return s + pl.contract.salary;
          }, 0);
          newTeams[tid] = { ...newTeams[tid], salary: parseFloat(sal.toFixed(2)), capSpace: parseFloat((league.salaryCap - sal).toFixed(2)) };
        });

        // Recalculate chemistry
        const userRosterAft = newTeams[league.userTeamId].rosterIds.map(id => newPlayers[id]).filter(Boolean);
        newTeams[league.userTeamId] = { ...newTeams[league.userTeamId], chemistry: calcChemistryTarget(userRosterAft) };

        const received = offer.offeredPlayerIds.map(id => newPlayers[id]?.name).filter(Boolean).join(', ');
        const news = addNews(league.news, {
          date: `Day ${league.week}`,
          headline: `TRADE ACCEPTED: You acquire ${received || 'picks'} from ${fromTeam.city} ${fromTeam.name}.`,
          type: 'trade',
        });
        const incomingOffers = (league.incomingOffers ?? []).map(o => o.id === offerId ? { ...o, status: 'accepted' as const } : o);
        set({ league: { ...league, players: newPlayers, teams: newTeams, news, incomingOffers }, pendingTradeOffer: null });
        return { accepted: true, reason: 'Trade completed!' };
      },

      declineIncomingOffer: (offerId) => {
        const { league } = get();
        if (!league) return;
        const incomingOffers = (league.incomingOffers ?? []).map(o => o.id === offerId ? { ...o, status: 'declined' as const } : o);
        set({ league: { ...league, incomingOffers }, pendingTradeOffer: null });
      },

      initNewLeague: (userTeamId, settings, rosterMode = 'generated', draftMode = 'classic') => {
        const { league, savedSlots } = get();
        const now = Date.now();
        // Archive the current save before replacing it (max 10 slots, drop oldest)
        let newSlots = savedSlots;
        if (league) {
          const existing = savedSlots.find(s => s.id === (league as any)._saveId);
          if (existing) {
            newSlots = savedSlots.map(s => s.id === existing.id
              ? { ...s, updatedAt: now, league }
              : s);
          } else {
            const slot: SaveSlot = { id: String(now), createdAt: now, updatedAt: now, league };
            newSlots = [...savedSlots, slot].slice(-10);
          }
        }
        let newLeague = { ...initLeague(userTeamId, now, rosterMode), scoutingPoints: 0, settings: settings ?? DEFAULT_SETTINGS } as LeagueState;
        (newLeague as any)._saveId = String(now + 1);

        if (draftMode === 'fantasy') {
          newLeague = setupFantasyDraft(newLeague, now);
        }

        set({ league: newLeague, savedSlots: newSlots, lastGame: null, pendingAwards: null, pendingTradeOffer: null });
      },

      fantasyDraftPick: (playerId) => {
        const { league } = get();
        if (!league || !league.fantasyDraft || league.phase !== 'fantasy_draft') return;
        const fd = league.fantasyDraft;
        const currentTeamId = fd.pickOrder[fd.currentPick];
        if (!currentTeamId || !fd.pool.includes(playerId)) return;

        const updated = applyFantasyPick(league, playerId, currentTeamId);
        set({ league: updated });
      },

      fantasyDraftAuto: () => {
        const { league } = get();
        if (!league || !league.fantasyDraft || league.phase !== 'fantasy_draft') return;
        let current = league;
        while (current.fantasyDraft && current.fantasyDraft.currentPick < current.fantasyDraft.pickOrder.length) {
          const fd = current.fantasyDraft;
          const teamId = fd.pickOrder[fd.currentPick];
          const best = autoPick(teamId, fd.pool, current);
          if (!best) break;
          current = applyFantasyPick(current, best, teamId);
        }
        set({ league: current });
      },

      updateSettings: (s) => {
        const { league } = get();
        if (!league) return;
        const current: LeagueSettings = league.settings ?? DEFAULT_SETTINGS;
        set({ league: { ...league, settings: { ...current, ...s } } });
      },

      advanceSim: (type = 'game') => {
        const { league } = get();
        if (!league) return;

        // Cancel any in-progress sim and clear stuck state
        _simGen++;
        set({ isSimming: false });

        if (league.phase === 'draft' || league.phase === 'offseason') return;

        if (league.phase === 'playin') {
          set({ league: simulatePlayinStep(league) });
          return;
        }

        if (league.phase === 'playoffs') {
          const newLeague = simulatePlayoffStep(league);
          const isChampion = newLeague.champion === league.userTeamId && league.champion !== league.userTeamId;
          if (isChampion) {
            const champTeam = newLeague.teams[league.userTeamId];
            set({
              league: newLeague,
              lastGame: {
                homeTeamId: league.userTeamId,
                awayTeamId: league.userTeamId,
                homeTeamName: `${champTeam?.city} ${champTeam?.name}`,
                awayTeamName: '',
                homeScore: 0,
                awayScore: 0,
                userTeamId: league.userTeamId,
                events: [
                  `The ${champTeam?.city} ${champTeam?.name} are NBA CHAMPIONS!`,
                  `An unforgettable season ends with the ultimate prize — the Larry O'Brien Trophy.`,
                  `The city is celebrating. The dynasty is real.`,
                ],
                isChampionship: true,
              },
            });
          } else {
            set({ league: newLeague });
          }
          return;
        }

        // Regular season: compute how many days to simulate
        const daysLeft = Math.max(0, REGULAR_SEASON_DAYS - league.week + 1);
        const count =
          type === 'game' ? 1
          : type === 'week' ? Math.min(7, daysLeft)
          : type === 'month' ? Math.min(14, daysLeft)
          : type === 'deadline' ? Math.max(1, Math.min(TRADE_DEADLINE_DAY - league.week + 1, daysLeft))
          : Math.max(1, daysLeft); // 'season'

        // For a single game just run synchronously (no animation needed)
        if (count === 1) {
          const prevOfferIds = new Set((league.incomingOffers ?? []).map(o => o.id));
          const result = simulateRegularDay(league);
          const freshOffer = (result.league.incomingOffers ?? []).find(
            o => o.status === 'pending' && !prevOfferIds.has(o.id)
          );
          const awards = result.league.seasonAwards && result.league.seasonAwards.season === result.league.season && result.league.phase !== 'regular'
            ? result.league.seasonAwards : null;
          set({ league: result.league, lastGame: result.lastGame ?? null, ...(awards ? { pendingAwards: awards } : {}), ...(freshOffer ? { pendingTradeOffer: freshOffer } : {}) });
          return;
        }

        // Multi-day: step asynchronously so UI updates between each day.
        // Uses a module-level generation counter for cancellation — immune to
        // Zustand state-timing races that the isSimming flag was prone to.
        const myGen = ++_simGen;
        _newsVerbosity = league.settings?.newsVerbosity ?? 'normal';
        set({ isSimming: true });
        const simSpd = league.settings?.simSpeed ?? 'normal';
        const delay = simSpd === 'instant' ? 0 : simSpd === 'fast' ? (count <= 7 ? 150 : 60) : simSpd === 'slow' ? (count <= 7 ? 900 : 600) : (count <= 7 ? 400 : count <= 14 ? 250 : 120);
        let stepsRun = 0;
        console.log(`[sim start] type=${type} count=${count} week=${league.week} gen=${myGen}`);
        const step = () => {
          try {
            console.log(`[sim step] stepsRun=${stepsRun} gen=${myGen} _simGen=${_simGen} week=${get().league?.week} phase=${get().league?.phase}`);
            if (myGen !== _simGen) { console.log('[sim] cancelled by new sim/stop'); set({ isSimming: false }); return; }
            const current_pre = get().league;
            if (!current_pre || current_pre.phase !== 'regular') {
              console.log('[sim] stopping: phase=', current_pre?.phase);
              set({ isSimming: false }); return;
            }
            const prevOfferIds = new Set((current_pre.incomingOffers ?? []).map(o => o.id));
            const result = simulateRegularDay(current_pre);
            const current = result.league;
            stepsRun++;
            const freshOffer = (current.incomingOffers ?? []).find(
              o => o.status === 'pending' && !prevOfferIds.has(o.id)
            );
            const awards = current.seasonAwards && current.seasonAwards.season === current.season && current.phase !== 'regular'
              ? current.seasonAwards : null;
            // Pause on user-team injuries if setting enabled
            const pauseOnInj = current.settings?.simPauseOnInjuries !== false;
            const userRoster = new Set(current.teams[current.userTeamId]?.rosterIds ?? []);
            const newInjury = pauseOnInj && Object.values(current.players).some(p =>
              userRoster.has(p.id) && p.injuryGames > 0 &&
              (current_pre.players[p.id]?.injuryGames ?? 0) === 0
            );
            console.log(`[sim step done] week now=${current.week} phase=${current.phase} freshOffer=${!!freshOffer} awards=${!!awards} stepsRun=${stepsRun}/${count}`);
            if (freshOffer || awards || current.phase !== 'regular' || newInjury) {
              set({ league: current, isSimming: false, lastGame: null, ...(awards ? { pendingAwards: awards } : {}), ...(freshOffer ? { pendingTradeOffer: freshOffer } : {}) });
              return;
            }
            set({ league: current });
            if (stepsRun >= count) { console.log('[sim] done - reached count'); set({ isSimming: false }); return; }
            setTimeout(step, delay);
          } catch (e) {
            console.error('[sim step error]', e);
            set({ isSimming: false });
          }
        };
        setTimeout(step, 0);
      },

      simPlayoffSeries: (seriesId) => {
        if (get().isSimming) return;
        const myGen = ++_simGen;
        set({ isSimming: true });
        const step = () => {
          if (myGen !== _simGen) { set({ isSimming: false }); return; }
          const current = get().league;
          if (!current || current.phase !== 'playoffs') { set({ isSimming: false }); return; }
          const series = current.playoffBracket?.find(s => s.id === seriesId);
          if (!series || series.winnerId) { set({ isSimming: false }); return; }
          const next = simulatePlayoffStep(current);
          set({ league: next });
          setTimeout(step, 300);
        };
        setTimeout(step, 0);
      },

      simPlayoffRound: () => {
        if (get().isSimming) return;
        const { league } = get();
        if (!league || league.phase !== 'playoffs') return;
        const bracket = league.playoffBracket ?? [];
        const incompleteRounds = bracket.filter(s => !s.winnerId).map(s => s.round);
        if (!incompleteRounds.length) return;
        const activeRound = Math.min(...incompleteRounds);
        const myGen = ++_simGen;
        set({ isSimming: true });
        const step = () => {
          if (myGen !== _simGen) { set({ isSimming: false }); return; }
          const current = get().league;
          if (!current || current.phase !== 'playoffs') { set({ isSimming: false }); return; }
          const remaining = (current.playoffBracket ?? []).filter(s => s.round === activeRound && !s.winnerId);
          if (remaining.length === 0) { set({ isSimming: false }); return; }
          set({ league: simulatePlayoffStep(current) });
          setTimeout(step, 300);
        };
        setTimeout(step, 0);
      },

      simPlayoffs: () => {
        if (get().isSimming) return;
        if (!get().league || get().league?.phase !== 'playoffs') return;
        const myGen = ++_simGen;
        set({ isSimming: true });
        const step = () => {
          if (myGen !== _simGen) { set({ isSimming: false }); return; }
          const current = get().league;
          if (!current || current.phase !== 'playoffs') { set({ isSimming: false }); return; }
          const next = simulatePlayoffStep(current);
          const isChampion = next.champion === current.userTeamId && !current.champion;
          if (isChampion) {
            const champTeam = next.teams[current.userTeamId];
            set({
              league: next,
              isSimming: false,
              lastGame: {
                homeTeamId: current.userTeamId,
                awayTeamId: current.userTeamId,
                homeTeamName: `${champTeam?.city} ${champTeam?.name}`,
                awayTeamName: '',
                homeScore: 0,
                awayScore: 0,
                userTeamId: current.userTeamId,
                events: [
                  `The ${champTeam?.city} ${champTeam?.name} are NBA CHAMPIONS!`,
                  `An unforgettable season ends with the ultimate prize — the Larry O'Brien Trophy.`,
                  `The city is celebrating. The dynasty is real.`,
                ],
                isChampionship: true,
              },
            });
            return;
          }
          set({ league: next });
          setTimeout(step, 300);
        };
        setTimeout(step, 0);
      },

      proposeTrade: (offer) => {
        const { league } = get();
        if (!league) return { accepted: false, reason: 'No active league.' };

        const tradeAllowed =
          (league.phase === 'regular' && league.week <= TRADE_DEADLINE_DAY) ||
          league.phase === 'offseason' ||
          league.phase === 'freeagency';

        if (!tradeAllowed) {
          const reason = league.phase === 'regular'
            ? 'The trade deadline has passed.'
            : 'Trades are not permitted right now.';
          return { accepted: false, reason };
        }

        const toTeam = league.teams[offer.toTeamId];
        if (!toTeam) return { accepted: false, reason: 'Team not found.' };

        const result = evaluateTrade(offer, toTeam, league.players, league.teams, league.settings);

        if (result.accepted) {
          const newPlayers = { ...league.players };
          const newTeams = { ...league.teams };

          offer.fromPlayerIds.forEach(id => {
            newPlayers[id] = { ...newPlayers[id], teamId: offer.toTeamId };
            newTeams[offer.toTeamId] = { ...newTeams[offer.toTeamId], rosterIds: [...newTeams[offer.toTeamId].rosterIds, id] };
            newTeams[offer.fromTeamId] = { ...newTeams[offer.fromTeamId], rosterIds: newTeams[offer.fromTeamId].rosterIds.filter(r => r !== id) };
          });
          offer.toPlayerIds.forEach(id => {
            newPlayers[id] = { ...newPlayers[id], teamId: offer.fromTeamId };
            newTeams[offer.fromTeamId] = { ...newTeams[offer.fromTeamId], rosterIds: [...newTeams[offer.fromTeamId].rosterIds, id] };
            newTeams[offer.toTeamId] = { ...newTeams[offer.toTeamId], rosterIds: newTeams[offer.toTeamId].rosterIds.filter(r => r !== id) };
          });

          executePicks(newTeams, offer.fromTeamId, offer.toTeamId, offer.fromPicks);
          executePicks(newTeams, offer.toTeamId, offer.fromTeamId, offer.toPicks);

          const receivedNames = offer.toPlayerIds.map(id => newPlayers[id]?.name).filter(Boolean).join(', ');
          const news = addNews(league.news, {
            date: `Day ${league.week}`,
            headline: `TRADE: You acquire ${receivedNames || 'draft picks'} from ${toTeam.city} ${toTeam.name}.`,
            type: 'trade',
          });

          // Update gmRating tradeBalance
          const ovrReceived = offer.toPlayerIds.reduce((s, id) => s + (league.players[id]?.ratings.overall ?? 0), 0);
          const ovrGiven = offer.fromPlayerIds.reduce((s, id) => s + (league.players[id]?.ratings.overall ?? 0), 0);
          const gmRatingUpd = { ...(league.gmRating ?? { score: 0, wins: 0, losses: 0, championships: 0, tradeBalance: 0, draftScore: 0 }) };
          gmRatingUpd.tradeBalance += ovrReceived - ovrGiven;
          gmRatingUpd.score = calcGMScore(gmRatingUpd, league.seasonHistory?.length ?? 0);

          // Recalculate salaries (exclude two-way)
          [offer.fromTeamId, offer.toTeamId].forEach(tid => {
            const sal = newTeams[tid].rosterIds.reduce((s, id) => {
              const pl = newPlayers[id];
              if (!pl || pl.contract.twoWay) return s;
              return s + pl.contract.salary;
            }, 0);
            newTeams[tid] = { ...newTeams[tid], salary: parseFloat(sal.toFixed(2)), capSpace: parseFloat((league.salaryCap - sal).toFixed(2)) };
          });

          // Recalculate chemistry for user team
          const userRosterAfterTrade = newTeams[league.userTeamId].rosterIds.map(id => newPlayers[id]).filter(Boolean);
          const newChem = calcChemistryTarget(userRosterAfterTrade);
          newTeams[league.userTeamId] = { ...newTeams[league.userTeamId], chemistry: newChem };

          // Record trade history
          {
            const receiveVal = tradeVal(offer.toPlayerIds, league.players, offer.toPicks);
            const giveVal = tradeVal(offer.fromPlayerIds, league.players, offer.fromPicks);
            const fairnessPct = Math.max(receiveVal, giveVal) > 0
              ? Math.round(((receiveVal - giveVal) / Math.max(giveVal, 1)) * 100) : 0;
            const historyEntry: import('../types').TradeHistoryEntry = {
              id: `trade_${Date.now()}`,
              season: league.season,
              day: league.week,
              fromTeamId: offer.fromTeamId,
              toTeamId: offer.toTeamId,
              fromPlayerIds: [...offer.fromPlayerIds],
              toPlayerIds: [...offer.toPlayerIds],
              fromPicks: [...offer.fromPicks],
              toPicks: [...offer.toPicks],
              fairnessPct,
            };
            // Append to history after state update below via updater form
            const prevHistory = league.tradeHistory ?? [];
            Object.assign(league, { tradeHistory: [historyEntry, ...prevHistory].slice(0, 50) });
          }

          set({ league: { ...league, players: newPlayers, teams: newTeams, news, gmRating: gmRatingUpd } });
        }

        return { accepted: result.accepted, reason: result.reason };
      },

      signFreeAgent: (playerId) => {
        const { league } = get();
        if (!league) return false;
        const player = league.players[playerId];
        const userTeam = league.teams[league.userTeamId];
        if (!player || !userTeam) return false;

        const mv = parseFloat((Math.max(1.1, (player.ratings.overall - 40) * 0.4 + 1.1)).toFixed(2));
        const currentSalary = userTeam.salary;
        const capEnabled = league.settings?.salaryCapEnabled !== false;
        const overCap    = capEnabled && currentSalary > SALARY_CAP;
        const overTax    = capEnabled && currentSalary > LUXURY_TAX_LINE;
        const overApron  = capEnabled && currentSalary > HARD_CAP;
        const mleUsed    = league.mleUsed ?? false;

        let newSalary: number;
        let newYears: number;
        let exceptionUsed: 'cap_space' | 'mle' | 'taxpayer_mle' | 'minimum' | null = null;

        if (!overCap && userTeam.capSpace >= mv) {
          // Under cap — sign normally at market value
          newSalary = mv;
          newYears = player.age >= 32 ? 2 : player.age >= 29 ? 3 : 4;
          exceptionUsed = 'cap_space';
        } else if (!overApron && !mleUsed && !overTax && mv <= MLE_AMOUNT) {
          // Non-taxpayer MLE — up to $13.5M, once per season
          newSalary = mv;
          newYears = Math.min(4, player.age >= 32 ? 2 : 4);
          exceptionUsed = 'mle';
        } else if (!overApron && !mleUsed && overTax && mv <= TAXPAYER_MLE) {
          // Taxpayer MLE — up to $5.7M, once per season
          newSalary = mv;
          newYears = Math.min(3, player.age >= 32 ? 2 : 3);
          exceptionUsed = 'taxpayer_mle';
        } else if (mv <= VET_MIN) {
          // Veteran minimum — always available
          newSalary = VET_MIN;
          newYears = player.age >= 32 ? 1 : 2;
          exceptionUsed = 'minimum';
        } else {
          return false; // no valid exception
        }

        // Hard cap check — result salary must not push team over $189M (bypassed if cap disabled)
        if (capEnabled && currentSalary + newSalary > HARD_CAP) return false;

        const newPlayers = { ...league.players, [playerId]: { ...player, teamId: league.userTeamId, freshContract: true, contract: { salary: newSalary, yearsLeft: newYears } } };
        const newTeams = {
          ...league.teams,
          [league.userTeamId]: {
            ...userTeam,
            rosterIds: [...userTeam.rosterIds, playerId],
            salary: parseFloat((currentSalary + newSalary).toFixed(2)),
            capSpace: parseFloat((userTeam.capSpace - newSalary).toFixed(2)),
          },
        };
        const exLabel = exceptionUsed === 'mle' ? ' (MLE)' : exceptionUsed === 'taxpayer_mle' ? ' (Tax MLE)' : exceptionUsed === 'minimum' ? ' (Vet Min)' : '';
        const news = addNews(league.news, {
          date: `Day ${league.week}`,
          headline: `You signed ${player.name}${exLabel} to a ${newYears}-year, $${newSalary.toFixed(2)}M/yr deal.`,
          type: 'sigining',
        });
        set({ league: { ...league, players: newPlayers, teams: newTeams, freeAgents: league.freeAgents.filter(id => id !== playerId), news, mleUsed: exceptionUsed === 'mle' || exceptionUsed === 'taxpayer_mle' ? true : mleUsed } });
        return true;
      },

      releasePLayer: (playerId) => {
        const { league } = get();
        if (!league) return;
        const player = league.players[playerId];
        if (!player || !player.teamId) return;
        const team = league.teams[player.teamId];
        if (!team) return;

        const newPlayers = { ...league.players, [playerId]: { ...player, teamId: null } };
        const salaryAdjust = player.contract.twoWay ? 0 : player.contract.salary;
        const newTeams = {
          ...league.teams,
          [team.id]: {
            ...team,
            rosterIds: team.rosterIds.filter(id => id !== playerId),
            salary: parseFloat((team.salary - salaryAdjust).toFixed(2)),
            capSpace: parseFloat((team.capSpace + salaryAdjust).toFixed(2)),
          },
        };
        const news = addNews(league.news, { date: `Day ${league.week}`, headline: `${player.name} has been waived.`, type: 'sigining' });
        set({ league: { ...league, players: newPlayers, teams: newTeams, freeAgents: [...league.freeAgents, playerId], news } });
      },

      draftPlayer: (prospectId) => {
        const { league } = get();
        if (!league) return;
        const draftOrder: string[] = league.draftOrder ?? [];
        const pickIndex: number = league.draftPickIndex ?? 0;

        const currentTeamId = draftOrder[pickIndex];
        if (!currentTeamId) return;

        try {
          const { newLeague, player } = executeDraftPick(league, currentTeamId, prospectId, pickIndex);
          let updatedLeague: LeagueState = { ...newLeague, draftPickIndex: pickIndex + 1 };
          // Update gmRating draftScore if user drafted
          if (currentTeamId === league.userTeamId) {
            const gmR = { ...(updatedLeague.gmRating ?? { score: 0, wins: 0, losses: 0, championships: 0, tradeBalance: 0, draftScore: 0 }) };
            gmR.draftScore += player.ratings.overall;
            gmR.score = calcGMScore(gmR, updatedLeague.seasonHistory?.length ?? 0);
            updatedLeague = { ...updatedLeague, gmRating: gmR };
          }

          const news = addNews(updatedLeague.news, {
            date: `${league.season} Draft`,
            headline: `Pick #${pickIndex + 1}: ${currentTeamId === league.userTeamId ? 'You select' : `${league.teams[currentTeamId]?.abbreviation} selects`} ${player.name} (${player.position}, ${player.ratings.overall} OVR)`,
            type: 'draft',
          });
          updatedLeague = { ...updatedLeague, news };

          while (true) {
            const nextIdx = updatedLeague.draftPickIndex ?? 0;
            const nextTeamId = draftOrder[nextIdx];
            if (!nextTeamId) break;
            if (nextTeamId === league.userTeamId) break;

            const prospects = updatedLeague.draftProspects;
            if (!prospects.length) break;

            const aiPick = aiDraftPick(updatedLeague, nextTeamId);
            const { newLeague: next, player: aiPlayer } = executeDraftPick(updatedLeague as LeagueState, nextTeamId, aiPick.id, nextIdx);
            const aiNews = addNews(next.news, {
              date: `${league.season} Draft`,
              headline: `Pick #${nextIdx + 1}: ${league.teams[nextTeamId]?.abbreviation} selects ${aiPlayer.name} (${aiPlayer.position}, ${aiPlayer.ratings.overall} OVR)`,
              type: 'draft',
            });
            updatedLeague = { ...next, draftPickIndex: nextIdx + 1, news: aiNews, draftOrder };
          }

          const finalIdx = updatedLeague.draftPickIndex ?? 0;
          if (finalIdx >= draftOrder.length || !updatedLeague.draftProspects.length) {
            updatedLeague = { ...updatedLeague, phase: 'offseason' };
          }

          set({ league: updatedLeague });
        } catch (e) {
          console.error(e);
        }
      },

      simNextDraftPick: () => {
        const { league } = get();
        if (!league) return;
        const draftOrder: string[] = league.draftOrder ?? [];
        const pickIndex: number = league.draftPickIndex ?? 0;
        const currentTeamId = draftOrder[pickIndex];
        if (!currentTeamId || currentTeamId === league.userTeamId) return;
        if (!league.draftProspects.length) return;
        try {
          const aiPick = aiDraftPick(league, currentTeamId);
          const { newLeague, player } = executeDraftPick(league, currentTeamId, aiPick.id, pickIndex);
          const news = addNews(newLeague.news, {
            date: `${league.season} Draft`,
            headline: `Pick #${pickIndex + 1}: ${league.teams[currentTeamId]?.abbreviation} selects ${player.name} (${player.position}, ${player.ratings.overall} OVR)`,
            type: 'draft',
          });
          let updatedLeague: LeagueState = { ...newLeague, draftPickIndex: pickIndex + 1, news, draftOrder };
          if ((updatedLeague.draftPickIndex ?? 0) >= draftOrder.length || !updatedLeague.draftProspects.length) {
            updatedLeague = { ...updatedLeague, phase: 'offseason' };
          }
          set({ league: updatedLeague });
        } catch (e) { console.error(e); }
      },

      simToMyPick: () => {
        const { league } = get();
        if (!league) return;
        const draftOrder: string[] = league.draftOrder ?? [];
        let updatedLeague: LeagueState = { ...league };
        try {
          while (true) {
            const nextIdx = updatedLeague.draftPickIndex ?? 0;
            const nextTeamId = draftOrder[nextIdx];
            if (!nextTeamId || nextTeamId === league.userTeamId) break;
            if (!updatedLeague.draftProspects.length) break;
            const aiPick = aiDraftPick(updatedLeague, nextTeamId);
            const { newLeague, player } = executeDraftPick(updatedLeague, nextTeamId, aiPick.id, nextIdx);
            const news = addNews(newLeague.news, {
              date: `${league.season} Draft`,
              headline: `Pick #${nextIdx + 1}: ${league.teams[nextTeamId]?.abbreviation} selects ${player.name} (${player.position}, ${player.ratings.overall} OVR)`,
              type: 'draft',
            });
            updatedLeague = { ...newLeague, draftPickIndex: nextIdx + 1, news, draftOrder };
          }
          if ((updatedLeague.draftPickIndex ?? 0) >= draftOrder.length || !updatedLeague.draftProspects.length) {
            updatedLeague = { ...updatedLeague, phase: 'offseason' };
          }
          set({ league: updatedLeague });
        } catch (e) { console.error(e); }
      },

      scoutProspect: (prospectId: string) => {
        const { league } = get();
        if (!league) return;
        const points = league.scoutingPoints ?? 0;
        if (points < 1) return;
        const prospect = league.draftProspects.find(p => p.id === prospectId);
        if (!prospect || prospect.revealed) return;
        const newProspects = league.draftProspects.map(p =>
          p.id === prospectId ? { ...p, revealed: true } : p
        );
        set({ league: { ...league, draftProspects: newProspects, scoutingPoints: points - 1 } });
      },

      startNewSeason: () => {
        const { league } = get();
        if (!league || league.phase !== 'offseason') return;

        const newSeason = league.season + 1;
        const newPlayers: typeof league.players = {};
        const expiredIds: string[] = [];

        // Build seasonHistory record before reset
        const userTeamSnap = league.teams[league.userTeamId];
        const champTeamName = league.champion ? (league.teams[league.champion] ? `${league.teams[league.champion].city} ${league.teams[league.champion].name}` : league.champion) : 'Unknown';
        const mvpPlayer = league.seasonAwards?.mvp ? league.players[league.seasonAwards.mvp.playerId] : undefined;
        const topScorerPlayer = league.seasonAwards?.scoringChamp ? league.players[league.seasonAwards.scoringChamp.playerId] : undefined;
        let userResult = 'Missed Playoffs';
        if (league.champion === league.userTeamId) {
          userResult = '🏆 Champions';
        } else if (league.playoffBracket) {
          const userSeries = league.playoffBracket.filter(s => s.teamAId === league.userTeamId || s.teamBId === league.userTeamId);
          if (userSeries.length > 0) {
            const maxRound = Math.max(...userSeries.map(s => s.round));
            const roundLabels = ['', 'First Round', 'Conf. Semis', 'Conf. Finals', 'Finals Runner-Up'];
            userResult = `Eliminated (${roundLabels[maxRound] ?? 'Playoffs'})`;
          }
        }
        const seasonRecord: SeasonRecord = {
          season: league.season,
          wins: userTeamSnap?.stats.wins ?? 0,
          losses: userTeamSnap?.stats.losses ?? 0,
          champion: champTeamName,
          mvp: mvpPlayer?.name,
          userResult,
          topScorer: topScorerPlayer?.name,
        };

        // Age + develop players, decrement contracts, collect expirations
        let news = [...league.news];
        const developmentLog: import('../types').DevelopmentEntry[] = [];
        for (const [id, p] of Object.entries(league.players)) {
          // freshContract = signed this offseason; skip decrement so 1-year deals survive their first season
          const yearsLeft = p.freshContract ? (p.contract.yearsLeft ?? 1) : (p.contract.yearsLeft ?? 1) - 1;
          const coachId = p.teamId ? league.teams[p.teamId]?.coachId : undefined;
          const coach = coachId ? league.coaches?.[coachId] : undefined;
          // Per-player RNG seeded by player identity + season — prevents all players getting same luck in the same year
          const devRng = createRng(p.photoSeed * 31 + league.season * 997);
          const progSpeed = league.settings?.progressionSpeed ?? 'normal';
          const progressionMult = progSpeed === 'fast' ? 1.4 : progSpeed === 'slow' ? 0.65 : 1.0;
          const { player: developed, ovrDelta, reason } = developPlayer({ ...p, age: p.age + 1 }, devRng, coach?.development, progressionMult);
          // Increment yearsWithTeam for players still on same team
          const newYearsWithTeam = p.teamId ? (p.yearsWithTeam ?? 0) + 1 : 0;
          const aged = { ...developed, freshContract: undefined, contract: { ...p.contract, yearsLeft }, seasonStats: { gamesPlayed: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0, turnovers: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, minutes: 0 }, yearsWithTeam: newYearsWithTeam };
          newPlayers[id] = aged;
          if (yearsLeft <= 0 && p.teamId) expiredIds.push(id);
          if (ovrDelta !== 0) {
            developmentLog.push({ season: league.season, playerId: id, playerName: p.name, teamId: p.teamId ?? null, delta: ovrDelta, reason });
          }
          if (ovrDelta >= 3 && p.teamId) {
            const team = league.teams[p.teamId];
            news = addNews(news, { date: `${newSeason} Offseason`, headline: `${p.name} (${team?.abbreviation ?? 'FA'}) improved by ${ovrDelta} overall during the offseason (now ${aged.ratings.overall} OVR).`, type: 'general' }, 'low');
          }
        }

        // Move expired contracts to free agency, remove from rosters
        const newTeams: typeof league.teams = {};
        for (const [tid, team] of Object.entries(league.teams)) {
          const rosterIds = team.rosterIds.filter(id => !expiredIds.includes(id));
          const totalSal = rosterIds.reduce((s, id) => {
            const pl = newPlayers[id];
            if (!pl || pl.contract.twoWay) return s;
            return s + pl.contract.salary;
          }, 0);
          newTeams[tid] = {
            ...team,
            rosterIds,
            salary: parseFloat(totalSal.toFixed(2)),
            capSpace: parseFloat((league.salaryCap - totalSal).toFixed(2)),
            stats: { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, streak: 0 },
          };
        }
        for (const id of expiredIds) {
          newPlayers[id] = { ...newPlayers[id], teamId: null };
        }

        // Decay GM rating components each season (recent form matters more than distant past)
        const DECAY = 0.75;
        let gmRating = { ...(league.gmRating ?? { score: 0, wins: 0, losses: 0, championships: 0, tradeBalance: 0, draftScore: 0 }) };
        gmRating = {
          ...gmRating,
          wins:         Math.round(gmRating.wins * DECAY),
          losses:       Math.round(gmRating.losses * DECAY),
          championships: gmRating.championships * DECAY,
          tradeBalance:  gmRating.tradeBalance * DECAY,
          draftScore:    gmRating.draftScore * DECAY,
        };
        if (league.champion === league.userTeamId) {
          gmRating.championships += 1;
        }
        // seasonHistory will include the just-completed season, so this is now season 2+
        gmRating.score = calcGMScore(gmRating, (league.seasonHistory?.length ?? 0) + 1);

        let allFreeAgents = [...new Set([...league.freeAgents, ...expiredIds])];
        news = addNews(news, { date: `${newSeason} Season`, headline: `The ${newSeason} NBA season is underway! ${expiredIds.length} player${expiredIds.length !== 1 ? 's' : ''} entered free agency.`, type: 'general' });

        // ── AI teams sign free agents ──────────────────────────────────────────
        // Sort FAs by OVR desc; AI teams take turns picking the best available
        const faRng = createRng(newSeason * 54321);
        const sortedFAs = [...allFreeAgents].sort((a, b) => (newPlayers[b]?.ratings.overall ?? 0) - (newPlayers[a]?.ratings.overall ?? 0));
        const aiTeamIds = Object.keys(newTeams).filter(tid => tid !== league.userTeamId);
        // Pre-pass: release weakest player from full rosters so teams can sign better FAs
        for (const tid of aiTeamIds) {
          const team = newTeams[tid];
          if (!team || team.rosterIds.length < 13) continue;
          const worst = team.rosterIds
            .map(id => newPlayers[id]).filter(Boolean)
            .sort((a, b) => a.ratings.overall - b.ratings.overall)[0];
          if (worst && worst.ratings.overall < 65) {
            newTeams[tid] = { ...team, rosterIds: team.rosterIds.filter(id => id !== worst.id) };
            newPlayers[worst.id] = { ...worst, teamId: null };
            allFreeAgents.push(worst.id);
          }
        }
        // Shuffle AI teams so signing order varies each season
        const shuffledAI = [...aiTeamIds].sort(() => faRng() - 0.5);
        const signedByAI = new Set<string>();
        for (const faId of sortedFAs) {
          const fa = newPlayers[faId];
          if (!fa) continue;
          // Find an AI team that needs players and can fit the salary
          for (const tid of shuffledAI) {
            const team = newTeams[tid];
            if (!team) continue;
            if (team.rosterIds.length >= 13) continue; // AI fills to 13, leaving FAs for user market
            const teamSalary = team.rosterIds.reduce((s, id) => s + (newPlayers[id]?.contract.salary ?? 0), 0);
            const marketVal = Math.max(1.1, (fa.ratings.overall - 40) * 0.4 + 1.1);
            const capEnabled = league.settings?.salaryCapEnabled !== false;
            const hardCap = capEnabled ? HARD_CAP : Infinity;
            // AI only pursues FAs they can afford or fit on min
            if (teamSalary + marketVal > hardCap && marketVal > VET_MIN) continue;
            // Luxury tax enforcement on Legend: AI teams refuse to go significantly over tax line
            if (capEnabled && league.settings?.difficulty === 'legend' && teamSalary > LUXURY_TAX_LINE + 20 && team.rosterIds.length >= 12) continue;
            const signSalary = (teamSalary + marketVal <= hardCap) ? marketVal : VET_MIN;
            const signYears = fa.ratings.overall >= 75 ? Math.round(faRng() * 2 + 2) : Math.round(faRng() * 2 + 1);
            newPlayers[faId] = { ...fa, teamId: tid, freshContract: true, contract: { salary: parseFloat(signSalary.toFixed(2)), yearsLeft: signYears } };
            newTeams[tid] = { ...team, rosterIds: [...team.rosterIds, faId], salary: parseFloat((teamSalary + signSalary).toFixed(2)), capSpace: parseFloat((SALARY_CAP - teamSalary - signSalary).toFixed(2)) };
            signedByAI.add(faId);
            if (fa.ratings.overall >= 78) {
              news = addNews(news, { date: `${newSeason} Offseason`, headline: `${fa.name} signs with ${newTeams[tid].city} ${newTeams[tid].name} (${signYears} yr, $${signSalary.toFixed(1)}M/yr).`, type: 'sigining' }, fa.ratings.overall >= 82 ? 'high' : 'low');
            }
            break;
          }
        }
        const newFreeAgents = allFreeAgents.filter(id => !signedByAI.has(id));

        const seasonHistory = [...(league.seasonHistory ?? []), seasonRecord];

        const newSchedule = generateSchedule(Object.values(newTeams), newSeason * 12345);

        set({
          league: {
            ...league,
            season: newSeason,
            week: 1,
            phase: 'regular',
            players: newPlayers,
            teams: newTeams,
            freeAgents: newFreeAgents,
            schedule: newSchedule,
            playoffBracket: undefined,
            playinGames: undefined,
            draftOrder: undefined,
            draftPickIndex: undefined,
            draftProspects: [],
            salaryCap: SALARY_CAP,
            mleUsed: false,
            scoutingPoints: 0,
            gameBoxScores: {},
            news,
            gmRating,
            seasonHistory,
            developmentLog,
          },
        });
      },

      reSignPlayer: (playerId, salary, years) => {
        const { league } = get();
        if (!league) return { accepted: false, reason: 'No active league.' };
        const player = league.players[playerId];
        const userTeam = league.teams[league.userTeamId];
        if (!player || !userTeam) return { accepted: false, reason: 'Player not found.' };
        if (player.teamId !== league.userTeamId) return { accepted: false, reason: 'Player is not on your roster.' };

        // Market value: what they could get on open market
        const marketSalary = Math.max(1.1, (player.ratings.overall - 40) * 0.4 + 1.1);
        const offerRatio = salary / marketSalary;

        // Age affects willingness: older players (31+) take less to stay on a contender
        const ageFlex = player.age >= 32 ? 1.15 : player.age >= 29 ? 1.05 : 1.0;
        // Morale factor: high morale players more likely to stay
        const moraleFlex = (player.morale ?? 80) >= 80 ? 1.1 : (player.morale ?? 80) >= 60 ? 1.0 : 0.85;

        const effectiveRatio = offerRatio * ageFlex * moraleFlex;

        let accepted = false;
        let reason = '';
        if (effectiveRatio >= 0.95) {
          accepted = true;
          reason = `${player.name} is happy to stay and signed the extension.`;
        } else if (effectiveRatio >= 0.82) {
          accepted = Math.random() < 0.72;
          reason = accepted
            ? `${player.name} accepted after some consideration.`
            : `${player.name} feels the offer is below his market value and declined.`;
        } else if (effectiveRatio >= 0.68) {
          accepted = Math.random() < 0.35;
          reason = accepted
            ? `${player.name} surprised everyone by accepting the below-market offer.`
            : `${player.name} wants significantly more and rejected the offer.`;
        } else {
          accepted = false;
          reason = `${player.name} rejected the lowball offer. His market value is ~$${marketSalary.toFixed(2)}M/yr.`;
        }

        if (accepted) {
          const salaryDiff = salary - player.contract.salary;
          const newSalary = parseFloat((userTeam.salary + salaryDiff).toFixed(2));
          const newCap = parseFloat((userTeam.capSpace - salaryDiff).toFixed(2));
          const newPlayers = { ...league.players, [playerId]: { ...player, freshContract: true, contract: { salary, yearsLeft: years } } };
          const newTeams = { ...league.teams, [league.userTeamId]: { ...userTeam, salary: newSalary, capSpace: newCap } };
          const news = addNews(league.news, {
            date: `Day ${league.week}`,
            headline: `${player.name} signed a ${years}-year, $${salary.toFixed(2)}M/yr extension.`,
            type: 'sigining',
          });
          set({ league: { ...league, players: newPlayers, teams: newTeams, news } });
        }

        return { accepted, reason };
      },

      resetLeague: () => set({ league: null }),

      loadSave: (id) => {
        const { league, savedSlots } = get();
        const slot = savedSlots.find(s => s.id === id);
        if (!slot) return;
        const now = Date.now();
        // Archive current active league back to its slot (or a new slot)
        let newSlots = savedSlots.filter(s => s.id !== id);
        if (league) {
          const existingId = (league as any)._saveId;
          const existing = newSlots.find(s => s.id === existingId);
          if (existing) {
            newSlots = newSlots.map(s => s.id === existingId ? { ...s, updatedAt: now, league } : s);
          } else {
            newSlots = [...newSlots, { id: existingId ?? String(now), createdAt: now, updatedAt: now, league }].slice(-10);
          }
        }
        set({ league: { ...slot.league, _saveId: id } as any, savedSlots: newSlots, lastGame: null, pendingAwards: null, pendingTradeOffer: null });
      },

      deleteSave: (id) => {
        set(s => ({ savedSlots: s.savedSlots.filter(sl => sl.id !== id) }));
      },

      signTwoWay: (playerId) => {
        const { league } = get();
        if (!league) return false;
        const player = league.players[playerId];
        const userTeam = league.teams[league.userTeamId];
        if (!player || !userTeam) return false;
        if (player.ratings.overall >= 70) return false;
        // Max 2 two-way players
        const currentTwoWay = userTeam.rosterIds.filter(id => league.players[id]?.contract.twoWay).length;
        if (currentTwoWay >= 2) return false;

        const newPlayers = { ...league.players, [playerId]: { ...player, teamId: league.userTeamId, freshContract: true, contract: { salary: 0.85, yearsLeft: 1, twoWay: true } } };
        const newTeams = {
          ...league.teams,
          [league.userTeamId]: {
            ...userTeam,
            rosterIds: [...userTeam.rosterIds, playerId],
            // salary unchanged (two-way doesn't count against cap)
          },
        };
        const news = addNews(league.news, {
          date: `Day ${league.week}`,
          headline: `You signed ${player.name} to a two-way contract.`,
          type: 'sigining',
        });
        set({ league: { ...league, players: newPlayers, teams: newTeams, freeAgents: league.freeAgents.filter(id => id !== playerId), news } });
        return true;
      },

      fireCoach: () => {
        const { league } = get();
        if (!league) return;
        const userTeam = league.teams[league.userTeamId];
        if (!userTeam?.coachId) return;
        const firedCoach = league.coaches?.[userTeam.coachId];
        const newTeams = { ...league.teams, [league.userTeamId]: { ...userTeam, coachId: undefined } };
        const news = addNews(league.news, {
          date: `Day ${league.week}`,
          headline: `You fired head coach ${firedCoach?.name ?? 'your coach'}.`,
          type: 'general',
        });
        set({ league: { ...league, teams: newTeams, news } });
      },

      hireCoach: (coachId) => {
        const { league } = get();
        if (!league) return;
        const newCoach = league.coaches?.[coachId];
        if (!newCoach) return;
        const userTeam = league.teams[league.userTeamId];
        const newTeams = { ...league.teams, [league.userTeamId]: { ...userTeam, coachId } };
        const news = addNews(league.news, {
          date: `Day ${league.week}`,
          headline: `You hired ${newCoach.name} as head coach.`,
          type: 'general',
        });
        set({ league: { ...league, teams: newTeams, news } });
      },

      setLineup: (starterIds) => {
        const { league } = get();
        if (!league) return;
        const userTeam = league.teams[league.userTeamId];
        const newTeams = { ...league.teams, [league.userTeamId]: { ...userTeam, lineup: starterIds.slice(0, 5) } };
        set({ league: { ...league, teams: newTeams } });
      },

      setLineupPosition: (playerId, position) => {
        const { league } = get();
        if (!league) return;
        const userTeam = league.teams[league.userTeamId];
        const prev = { ...(userTeam.lineupPositions ?? {}) };
        if (position === null) {
          delete prev[playerId];
        } else {
          prev[playerId] = position;
        }
        const newTeams = { ...league.teams, [league.userTeamId]: { ...userTeam, lineupPositions: prev } };
        set({ league: { ...league, teams: newTeams } });
      },

      setPlayerPosition: (playerId, primary, secondary) => {
        const { league } = get();
        if (!league) return;
        const player = league.players[playerId];
        if (!player) return;
        const newRatings = { ...player.ratings, overall: calcOvrForPosition(player.ratings, primary) };
        const updated: typeof player = {
          ...player,
          position: primary,
          secondaryPosition: secondary ?? undefined,
          ratings: newRatings,
        };
        set({ league: { ...league, players: { ...league.players, [playerId]: updated } } });
      },
    }),
    {
      name: 'basketball-gm-league-v2',
      partialize: (state) => ({
        league: state.league ? {
          ...state.league,
          gameBoxScores: {},
          news: state.league.news?.slice(-60) ?? [],
        } : null,
        savedSlots: state.savedSlots.map(s => ({
          ...s,
          league: { ...s.league, gameBoxScores: {}, news: s.league.news?.slice(-20) ?? [] },
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.savedSlots) state.savedSlots = [];
        if (state?.league) {
          state.league = migrateSalaries(state.league);
          // Recalculate every player's OVR using position-specific weights
          // and auto-assign secondary positions if not already set
          const updatedPlayers = { ...state.league.players };
          for (const id of Object.keys(updatedPlayers)) {
            const p = updatedPlayers[id];
            if (p) {
              const newOvr = calcOvrForPosition(p.ratings, p.position);
              const secondary = deriveSecondaryPosition(p.position, p.ratings);
              const height = generateHeight(p.position, createRng(p.photoSeed + 777));
              const ovrChanged = newOvr !== p.ratings.overall;
              const secondaryChanged = secondary !== p.secondaryPosition;
              const heightChanged = height !== p.height;
              const tendency = deriveTendency(p.ratings, p.position, height);
              if (ovrChanged || secondaryChanged || heightChanged || tendency !== p.tendency) {
                updatedPlayers[id] = {
                  ...p,
                  secondaryPosition: secondary,
                  height,
                  tendency,
                  ratings: ovrChanged ? { ...p.ratings, overall: newOvr } : p.ratings,
                };
              }
            }
          }
          state.league = { ...state.league, players: updatedPlayers };

          // Recovery: if stuck in draft phase with no prospects (game 7 crash left save broken)
          if (state.league.phase === 'draft' && (!state.league.draftProspects || state.league.draftProspects.length === 0)) {
            const draftProspects = generateDraftClass(state.league.season);
            const draftOrder = state.league.draftOrder?.length
              ? state.league.draftOrder
              : runDraftLottery(Object.values(state.league.teams), state.league.season);
            state.league = { ...state.league, draftProspects, draftOrder, draftPickIndex: 0 };
          }
        }
      },
    }
  )
);
