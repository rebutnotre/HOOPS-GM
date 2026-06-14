import type { DraftProspect, LeagueState, Team, Player } from '../types';
import { generatePlayer } from './playerGen';
import { createRng, randBetween, randNormal, clamp } from './rng';


const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;

export function generateDraftClass(season: number, count = 60, rookieQuality: 'weak' | 'normal' | 'loaded' = 'normal'): DraftProspect[] {
  const rng = createRng(season * 77777);
  const prospects: DraftProspect[] = [];
  const qBonus = rookieQuality === 'loaded' ? 6 : rookieQuality === 'weak' ? -6 : 0;

  for (let i = 0; i < count; i++) {
    const seed = season * 1000 + i;
    const pos = POSITIONS[Math.floor(rng() * 5)];
    // Top picks are better; talent falls off after ~15
    const targetOverall = clamp(
      (i < 5 ? randBetween(78, 88, rng) : i < 15 ? randBetween(68, 80, rng) : i < 30 ? randBetween(58, 72, rng) : randBetween(45, 63, rng)) + qBonus,
      40, 98
    );

    const age = randBetween(18, 22, rng);
    const player = generatePlayer(seed, targetOverall, pos, age);
    // Scout noise: ±8 rating points off actual OVR (not target)
    const noise = Math.round(randNormal(0, 8, rng));
    const scoutedRating = clamp(player.ratings.overall + noise, 40, 99);
    // Potential: younger players can have higher ceilings
    const ageFactor = Math.max(0, 22 - age); // 0-4 extra points for being young
    const potential = clamp(targetOverall + randBetween(5, 20, rng) + ageFactor, targetOverall, 99);

    prospects.push({
      id: `prospect_${season}_${i}`,
      name: player.name,
      age,
      position: pos,
      scoutedRating,
      actualRating: player.ratings,
      potential,
      photoSeed: player.photoSeed,
    });
  }

  return prospects;
}

// Weighted lottery: worse records get more balls
// Returns ordered draft order (array of teamIds)
export function runDraftLottery(teams: Team[], season: number, useLottery = true): string[] {
  const rng = createRng(season * 54321);

  // Sort by record (worst first = most lottery balls)
  const sorted = [...teams].sort((a, b) => {
    const aWins = a.stats.wins;
    const bWins = b.stats.wins;
    return aWins - bWins; // worst record first
  });

  // Assign lottery balls: 1st gets 250, 2nd gets 199, etc. (simplified NBA weights)
  const weights = [250, 199, 156, 119, 88, 63, 43, 28, 17, 11, 8, 7, 6, 5];
  const ballPool: string[] = [];

  sorted.forEach((team, i) => {
    const numBalls = weights[i] ?? 4;
    for (let b = 0; b < numBalls; b++) {
      ballPool.push(team.id);
    }
  });

  // Pick top 4 lottery positions (or skip lottery and go straight by record)
  const lotteryOrder: string[] = [];
  const usedTeams = new Set<string>();
  const pool = [...ballPool];

  if (!useLottery) {
    // No lottery: worst record picks first (deterministic)
    return sorted.map(t => t.id);
  }

  for (let pick = 0; pick < Math.min(4, sorted.length); pick++) {
    let winner = '';
    while (!winner || usedTeams.has(winner)) {
      const idx = Math.floor(rng() * pool.length);
      winner = pool[idx];
    }
    lotteryOrder.push(winner);
    usedTeams.add(winner);
    // Remove all balls for winner
    pool.splice(0, pool.length, ...pool.filter(id => id !== winner));
  }

  // Rest of teams in reverse order of record (best record picks last)
  const remaining = sorted
    .map(t => t.id)
    .filter(id => !usedTeams.has(id))
    .reverse(); // best record picks last among remaining

  return [...lotteryOrder, ...remaining];
}

export function executeDraftPick(
  league: LeagueState,
  teamId: string,
  prospectId: string,
  pickIndex = 0,
): { newLeague: LeagueState; player: Player } {
  const prospect = league.draftProspects.find(p => p.id === prospectId);
  if (!prospect) throw new Error('Prospect not found');

  const seed = parseInt(prospectId.replace(/\D/g, '')) || Math.floor(Math.random() * 99999);
  const player = generatePlayer(seed, prospect.actualRating.overall, prospect.position, prospect.age);
  player.name = prospect.name;
  player.photoSeed = prospect.photoSeed;
  player.teamId = teamId;
  player.ratings = prospect.actualRating;
  // Round 1 (picks 0-29): 4-year rookie deal; Round 2+: 2-year deal
  const rookieYears = pickIndex < 30 ? 4 : 2;
  player.contract = { salary: parseFloat(Math.max(1.0, (prospect.actualRating.overall - 40) / 59 * 10).toFixed(2)), yearsLeft: rookieYears };

  const team = league.teams[teamId];
  const newTeams = {
    ...league.teams,
    [teamId]: {
      ...team,
      rosterIds: [...team.rosterIds, player.id],
      salary: parseFloat((team.salary + player.contract.salary).toFixed(2)),
      capSpace: parseFloat((team.capSpace - player.contract.salary).toFixed(2)),
    },
  };

  return {
    player,
    newLeague: {
      ...league,
      players: { ...league.players, [player.id]: player },
      teams: newTeams,
      draftProspects: league.draftProspects.filter(p => p.id !== prospectId),
    },
  };
}
