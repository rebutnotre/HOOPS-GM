import type { LeagueState, Team, Player, GameResult, Position } from '../types';
import { TEAM_TEMPLATES, SALARY_CAP } from './teamData';
import { generateRoster, generatePlayer, deriveTendency, deriveSecondaryPosition, generateHeight } from './playerGen';
import { generateCoachPool } from './coachEngine';
import { createRng, randBetween, randNormal, clamp } from './rng';
import { REAL_ROSTERS } from './realRosters';
import { calcOvrForPosition } from './progressionEngine';

export type RosterMode = 'real' | 'generated';

let _playerCounter = Date.now() + 50000;
function nextId() { return `player_${_playerCounter++}`; }

function buildRealPlayer(rp: import('./realRosters').RealPlayer, teamId: string, seed: number): Player {
  const rng = createRng(seed);
  const base = generatePlayer(seed, rp.ovr, rp.pos as Position, rp.age);
  // Scale sub-ratings so calcOvrForPosition produces exactly rp.ovr
  const rawOvr = calcOvrForPosition(base.ratings, rp.pos as Position);
  const scale = rawOvr > 0 ? rp.ovr / rawOvr : 1;
  const scaledRatings = { ...base.ratings } as Record<string, number>;
  for (const key of Object.keys(scaledRatings)) {
    if (key !== 'overall') scaledRatings[key] = clamp(Math.round(scaledRatings[key] * scale), 25, 99);
  }
  const ratings = { ...(scaledRatings as unknown as typeof base.ratings), overall: rp.ovr };
  const height = generateHeight(rp.pos as Position, rng);
  const tendency = deriveTendency(ratings, rp.pos as Position, height);
  const secondaryPosition = deriveSecondaryPosition(rp.pos as Position, ratings);
  const priorityRoll = rng();
  const freeAgencyPriority: import('../types').FreeAgencyPriority =
    priorityRoll < 0.28 ? 'money' : priorityRoll < 0.56 ? 'winning' : priorityRoll < 0.75 ? 'loyalty' : 'balanced';

  return {
    id: nextId(),
    name: rp.name,
    age: rp.age,
    position: rp.pos as Position,
    secondaryPosition,
    height,
    teamId,
    ratings,
    seasonStats: { gamesPlayed: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0,
      turnovers: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, minutes: 0 },
    careerStats: { gamesPlayed: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0,
      turnovers: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, minutes: 0 },
    contract: { salary: rp.salary, yearsLeft: rp.years },
    photoSeed: Math.floor(rng() * 100000),
    potential: clamp(rp.pot, rp.ovr, 99),
    morale: randBetween(60, 100, rng),
    injuryGames: 0,
    tendency,
    freeAgencyPriority,
  };
}

export function initLeague(userTeamId: string, seed = 42, rosterMode: RosterMode = 'generated'): LeagueState {
  const rng = createRng(seed);
  const players: Record<string, Player> = {};
  const teams: Record<string, Team> = {};
  const coachPool = generateCoachPool(seed + 100);
  const coachesRecord: LeagueState['coaches'] = {};
  coachPool.forEach(c => { coachesRecord[c.id] = c; });

  let coachIdx = 0;
  TEAM_TEMPLATES.forEach((tmpl, i) => {
    let roster: Player[];

    if (rosterMode === 'real' && REAL_ROSTERS[tmpl.id]) {
      roster = REAL_ROSTERS[tmpl.id].map((rp, j) =>
        buildRealPlayer(rp, tmpl.id, seed * 100 + i * 37 + j * 13)
      );
    } else {
      roster = generateRoster(seed * 100 + i * 7);
    }

    roster.forEach(p => {
      p.teamId = tmpl.id;
      players[p.id] = p;
    });

    const totalSalary = roster.reduce((s, p) => s + p.contract.salary, 0);
    const modes = ['contend', 'rebuild', 'balanced'] as const;
    const mode = modes[Math.floor(rng() * 3)];

    const assignedCoach = coachPool[coachIdx % coachPool.length];
    coachIdx++;
    const team: Team = {
      ...tmpl,
      rosterIds: roster.map(p => p.id),
      stats: { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, streak: 0 },
      salary: parseFloat(totalSalary.toFixed(2)),
      capSpace: parseFloat((SALARY_CAP - totalSalary).toFixed(2)),
      mode,
      draftPicks: [
        { year: 2025, round: 1, fromTeamId: tmpl.id, currentTeamId: tmpl.id },
        { year: 2025, round: 2, fromTeamId: tmpl.id, currentTeamId: tmpl.id },
      ],
      coachId: assignedCoach.id,
      chemistry: 55,
    };
    teams[tmpl.id] = team;
  });

  // Force user team to contend mode
  if (teams[userTeamId]) teams[userTeamId].mode = 'contend';

  // Generate initial free agent pool: mix of vets (60-82 OVR) and fringe players (50-65)
  const faRng = createRng(seed + 777);
  const POSITIONS_LIST = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
  const faIds: string[] = [];
  const FA_COUNT = 30;
  for (let i = 0; i < FA_COUNT; i++) {
    const tier = Math.floor(i / 10);
    const ovr = tier === 0
      ? clamp(Math.round(randNormal(74, 4, faRng)), 68, 82)
      : tier === 1
      ? clamp(Math.round(randNormal(65, 3, faRng)), 60, 70)
      : clamp(Math.round(randNormal(57, 4, faRng)), 50, 63);
    const pos = POSITIONS_LIST[i % 5];
    const age = randBetween(22, 34, faRng);
    const fa = generatePlayer(seed + 9000 + i, ovr, pos, age);
    fa.contract = { salary: Math.max(1.1, parseFloat(((ovr - 40) * 0.35 + 1.0).toFixed(2))), yearsLeft: 1 };
    players[fa.id] = fa;
    faIds.push(fa.id);
  }

  const schedule = generateSchedule(Object.values(teams), seed);

  return {
    season: 2025,
    week: 1,
    phase: 'regular',
    userTeamId,
    teams,
    players,
    schedule,
    freeAgents: faIds,
    draftProspects: [],
    news: [{ id: 'n1', date: 'Oct 21, 2025', headline: 'The 2025-26 NBA season tips off tonight!', type: 'general' }],
    salaryCap: SALARY_CAP,
    coaches: coachesRecord,
    gmRating: { score: 0, wins: 0, losses: 0, championships: 0, tradeBalance: 0, draftScore: 0 },
    seasonHistory: [],
  };
}

export function generateSchedule(teams: Team[], seed: number): GameResult[] {
  const rng = createRng(seed + 9999);
  const games: GameResult[] = [];
  let gameId = 1;
  const teamIds = teams.map(t => t.id);

  for (let day = 1; day <= 82; day++) {
    const shuffled = [...teamIds].sort(() => rng() - 0.5);
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      games.push({
        id: `g${gameId++}`,
        homeTeamId: shuffled[i],
        awayTeamId: shuffled[i + 1],
        homeScore: 0,
        awayScore: 0,
        week: day,
        played: false,
      });
    }
  }

  return games;
}
