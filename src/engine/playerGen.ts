import type { Player, PlayerRatings, Position, PlayerTendency } from '../types';
import { createRng, randBetween, randNormal, clamp } from './rng';
import { calcOvrForPosition } from './progressionEngine';
import { randomName } from './names';

let playerCounter = Date.now();

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

const POSITION_HEIGHT: Record<Position, [number, number, number]> = {
  // [mean, min, max] in inches
  PG: [74, 72, 78], // 6'2" avg, 6'0"–6'6"
  SG: [77, 74, 80], // 6'5" avg, 6'2"–6'8"
  SF: [79, 77, 83], // 6'7" avg, 6'5"–6'11"
  PF: [81, 79, 85], // 6'9" avg, 6'7"–7'1"
  C:  [84, 81, 88], // 7'0" avg, 6'9"–7'4"
};

export function generateHeight(pos: Position, rng: () => number): number {
  const [mean, min, max] = POSITION_HEIGHT[pos];
  return Math.round(clamp(randNormal(mean, 1.5, rng), min, max));
}

export function formatHeight(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function emptyStats() {
  return { gamesPlayed: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0,
    turnovers: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, minutes: 0 };
}

function positionBias(pos: Position): Partial<PlayerRatings> {
  switch (pos) {
    case 'PG': return { passing: 15, ballHandling: 15, shooting3: 5, defense: -5 };
    case 'SG': return { scoring: 10, shooting3: 10, finishing: 5 };
    case 'SF': return { scoring: 5, athleticism: 10, defense: 5 };
    case 'PF': return { rebounding: 10, finishing: 10, defense: 5, shooting3: -10 };
    case 'C':  return { rebounding: 20, finishing: 15, defense: 15, passing: -15, shooting3: -20 };
    default: return {};
  }
}

// Score how well a player fits each position (higher = better fit)
function positionFitScore(ratings: PlayerRatings, pos: Position): number {
  const { ballHandling: bh, passing, scoring, defense, athleticism, finishing, rebounding, shooting3 } = ratings;
  switch (pos) {
    case 'PG': return bh * 0.30 + passing * 0.28 + scoring * 0.20 + defense * 0.12 + athleticism * 0.10;
    case 'SG': return scoring * 0.28 + athleticism * 0.22 + shooting3 * 0.18 + defense * 0.18 + bh * 0.14;
    case 'SF': return scoring * 0.24 + athleticism * 0.24 + defense * 0.22 + finishing * 0.18 + rebounding * 0.12;
    case 'PF': return finishing * 0.28 + rebounding * 0.26 + defense * 0.24 + athleticism * 0.14 + scoring * 0.08;
    case 'C':  return finishing * 0.30 + rebounding * 0.30 + defense * 0.26 + athleticism * 0.14;
  }
}

// Only adjacent positions are valid secondaries — no PG/C, no C/PG, etc.
const ADJACENT: Record<Position, Position[]> = {
  PG: ['SG'],
  SG: ['PG', 'SF'],
  SF: ['SG', 'PF'],
  PF: ['SF', 'C'],
  C:  ['PF'],
};

export function deriveSecondaryPosition(position: Position, ratings: PlayerRatings): Position | undefined {
  const candidates = ADJACENT[position];
  const ranked = candidates
    .map(p => ({ pos: p, score: positionFitScore(ratings, p) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const primaryScore = positionFitScore(ratings, position);
  if (best && best.score >= primaryScore * 0.88) return best.pos;
  return undefined;
}

export function deriveTendency(ratings: PlayerRatings, position?: Position, height?: number): PlayerTendency {
  const { shooting3: s3, defense: def, rebounding: reb, passing: pass, ballHandling: bh, finishing: fin, scoring: scr } = ratings;
  // "Big" means PF/C or at least 6'7" — gates stretch-big and rebounder archetypes
  const isBig = position === 'PF' || position === 'C' || (height ?? 0) >= 79;

  if (s3 > 75 && def > 68)                          return '3-and-D';
  if (s3 > 75)                                       return '3pt-specialist';
  if (fin > 75 && s3 < 55)                           return 'interior';       // elite finisher at any size
  if (isBig && fin > 68 && s3 > 60 && reb > 65)     return 'stretch-big';    // bigs only
  if (pass > 72 && bh > 72)                          return 'facilitator';
  if (pass > 65 && bh > 65 && scr > 65 && def > 65) return 'utility';
  if (def > 72 || (def > reb && def > pass))         return 'defender';
  if (isBig && reb > 72)                             return 'rebounder';      // bigs only
  if (pass + bh > scr + fin)                         return 'playmaker';
  return 'scorer';
}

export function generatePlayer(seed: number, overallTarget?: number, position?: Position, age?: number): Player {
  const rng = createRng(seed);
  const pos = position ?? POSITIONS[Math.floor(rng() * 5)];
  const overall = overallTarget ?? clamp(Math.round(randNormal(55, 12, rng)), 40, 95);
  const potential = clamp(overall + randBetween(5, 25, rng), 50, 99);
  const playerAge = age ?? randBetween(19, 35, rng);
  const bias = positionBias(pos);

  function genRating(base: number, biasVal = 0): number {
    return clamp(Math.round(randNormal(overall + biasVal, 8, rng) + base - overall), 30, 99);
  }

  const ratings: PlayerRatings = {
    overall,
    scoring: genRating(overall, bias.scoring ?? 0),
    shooting3: genRating(overall, bias.shooting3 ?? 0),
    midRange: genRating(overall),
    finishing: genRating(overall, bias.finishing ?? 0),
    passing: genRating(overall, bias.passing ?? 0),
    ballHandling: genRating(overall, bias.ballHandling ?? 0),
    defense: genRating(overall, bias.defense ?? 0),
    rebounding: genRating(overall, bias.rebounding ?? 0),
    athleticism: genRating(overall, bias.athleticism ?? 0),
    iq: genRating(overall),
  };
  ratings.overall = calcOvrForPosition(ratings, pos);

  const secondaryPosition = deriveSecondaryPosition(pos, ratings);
  const height = generateHeight(pos, rng);
  const tendency = deriveTendency(ratings, pos, height);
  const priorityRoll = rng();
  const freeAgencyPriority: import('../types').FreeAgencyPriority =
    priorityRoll < 0.28 ? 'money' :
    priorityRoll < 0.56 ? 'winning' :
    priorityRoll < 0.75 ? 'loyalty' : 'balanced';

  // Salary: $1.1M min up to ~$22M for elite players, cap-friendly scale
  const salaryBase = Math.max(1.1, (overall - 40) * 0.4 + 1.1);
  const salary = parseFloat((salaryBase * (0.88 + rng() * 0.24)).toFixed(2));
  const yearsLeft = randBetween(1, 4, rng);

  const id = `player_${playerCounter++}`;

  return {
    id,
    name: randomName(rng),
    age: playerAge,
    position: pos,
    secondaryPosition,
    height,
    teamId: null,
    ratings,
    seasonStats: emptyStats(),
    careerStats: emptyStats(),
    contract: { salary, yearsLeft },
    photoSeed: Math.floor(rng() * 100000),
    potential,
    morale: randBetween(60, 100, rng),
    injuryGames: 0,
    tendency,
    freeAgencyPriority,
  };
}

export function generateRoster(teamSeed: number): Player[] {
  const rng = createRng(teamSeed);
  const roster: Player[] = [];
  const positions: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

  // 1 star (85+), 2 starters (75-84), 3 rotation (65-74), rest bench
  const overalls = [
    randBetween(82, 92, rng),
    randBetween(75, 84, rng),
    randBetween(72, 80, rng),
    randBetween(68, 76, rng),
    randBetween(65, 74, rng),
    randBetween(60, 70, rng),
    randBetween(58, 68, rng),
    randBetween(55, 65, rng),
    randBetween(50, 62, rng),
    randBetween(45, 58, rng),
    randBetween(42, 55, rng),
    randBetween(40, 52, rng),
    randBetween(40, 50, rng),
  ];

  for (let i = 0; i < overalls.length; i++) {
    const pos = positions[i % 5];
    const seed = Math.floor(rng() * 999999) + teamSeed * 100 + i;
    const p = generatePlayer(seed, overalls[i], pos, randBetween(19, 34, rng));
    roster.push(p);
  }
  return roster;
}
