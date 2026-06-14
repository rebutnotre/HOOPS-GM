import type { Player, Team, PlayerStats, Coach, LeagueSettings } from '../types';
import { createRng, randNormal, clamp } from './rng';

function teamStrength(players: Player[]): number {
  const top8 = [...players]
    .sort((a, b) => b.ratings.overall - a.ratings.overall)
    .slice(0, 8);
  if (top8.length === 0) return 50;
  const avg = top8.reduce((s, p) => s + p.ratings.overall, 0) / top8.length;
  return avg;
}

function teamOffRating(players: Player[]): number {
  const top8 = [...players].sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 8);
  if (!top8.length) return 50;
  return top8.reduce((s, p) => s + (p.ratings.scoring + p.ratings.passing + p.ratings.ballHandling) / 3, 0) / top8.length;
}

function teamDefRating(players: Player[]): number {
  const top8 = [...players].sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 8);
  if (!top8.length) return 50;
  return top8.reduce((s, p) => s + (p.ratings.defense + p.ratings.rebounding) / 2, 0) / top8.length;
}

export function simulateGame(
  _homeTeam: Team,
  _awayTeam: Team,
  homePlayers: Player[],
  awayPlayers: Player[],
  seed: number,
  homeCoach?: Coach,
  awayCoach?: Coach,
  settings?: LeagueSettings,
  userTeamId?: string,
): { homeScore: number; awayScore: number; homeStats: Map<string, Partial<PlayerStats>>; awayStats: Map<string, Partial<PlayerStats>> } {
  const rng = createRng(seed);

  const homeOff = teamOffRating(homePlayers);
  const homeDef = teamDefRating(homePlayers);
  const awayOff = teamOffRating(awayPlayers);
  const awayDef = teamDefRating(awayPlayers);

  // Base scoring: league avg ~110 pts
  const homePace = 95 + rng() * 10;
  void homePace; // pace affects variance implicitly via rng consumption

// Difficulty: AI teams play more consistently (lower variance) on Hard/Legend.
  // The user team's variance is unchanged — they can still have great games —
  // but AI teams are less likely to have fluky bad nights.
  const diff = settings?.difficulty ?? 'normal';
  const userIsHome = userTeamId ? _homeTeam.id === userTeamId : null;
  const aiVarianceMult = diff === 'easy' ? 1.2 : diff === 'hard' ? 0.75 : diff === 'legend' ? 0.6 : 1.0;

  function scoreForTeam(off: number, def: number, isUserTeam: boolean | null): number {
    const effDiff = (off - def) / 50;
    const base = 105 + effDiff * 8;
    // AI teams play more consistently on harder difficulties (they "execute" better)
    const teamVariance = isUserTeam === false ? aiVarianceMult : 1.0;
    return Math.max(88, Math.round(randNormal(base, 9 * teamVariance, rng)));
  }

  let homeScore = scoreForTeam(homeOff, awayDef, userIsHome) + (rng() < 0.5 ? 1 : 2); // home court +1-2
  let awayScore = scoreForTeam(awayOff, homeDef, userIsHome === null ? null : !userIsHome);

  // Coach bonuses — scaled by rating vs avg 50: elite coach ~4pts, poor coach -2pts
  const homeOffBonus  = Math.round(((homeCoach?.offense  ?? 50) - 50) / 49 * 4);
  const homeDefBonus  = Math.round(((homeCoach?.defense  ?? 50) - 50) / 49 * 3);
  const awayOffBonus  = Math.round(((awayCoach?.offense  ?? 50) - 50) / 49 * 4);
  const awayDefBonus  = Math.round(((awayCoach?.defense  ?? 50) - 50) / 49 * 3);
  homeScore += homeOffBonus - awayDefBonus;
  awayScore += awayOffBonus - homeDefBonus;

  // Chemistry modifier: each point above/below 50 = ~0.08 pts (50 pts swing ≈ ±4)
  if (settings?.chemistryEnabled !== false) {
    const homeChem = _homeTeam.chemistry ?? 50;
    const awayChem = _awayTeam.chemistry ?? 50;
    homeScore += Math.round((homeChem - 50) * 0.08);
    awayScore += Math.round((awayChem - 50) * 0.08);
  }

  // Morale modifier (respects moraleSystem setting)
  if (settings?.moraleSystem !== false) {
    const activePlayers = (p: Player[]) => p.filter(pl => !pl.injuryGames);
    const avgMorale = (ps: Player[]) => ps.length
      ? ps.reduce((s, p) => s + (p.morale ?? 75), 0) / ps.length : 75;
    homeScore += Math.round((avgMorale(activePlayers(homePlayers)) - 75) * 0.06);
    awayScore += Math.round((avgMorale(activePlayers(awayPlayers)) - 75) * 0.06);
  }

  homeScore = Math.max(88, homeScore);
  awayScore = Math.max(88, awayScore);

  // Generate player box scores — pass user-set lineup so starters get starter minutes
  const homeStats = generateBoxScores(homePlayers, homeScore, rng, _homeTeam.lineup);
  const awayStats = generateBoxScores(awayPlayers, awayScore, rng, _awayTeam.lineup);

  // Derive final scores from actual player totals so box score always matches
  const homeFinal = [...homeStats.values()].reduce((s, p) => s + (p.points ?? 0), 0);
  const awayFinal = [...awayStats.values()].reduce((s, p) => s + (p.points ?? 0), 0);

  // Ensure no ties and scores stay realistic
  const resolvedHome = homeFinal !== awayFinal ? homeFinal : homeFinal + 1;
  const resolvedAway = homeFinal !== awayFinal ? awayFinal : awayFinal;

  return { homeScore: resolvedHome, awayScore: resolvedAway, homeStats, awayStats };
}

function generateBoxScores(players: Player[], teamPoints: number, rng: () => number, lineup?: string[]): Map<string, Partial<PlayerStats>> {
  const starterSet = new Set(lineup ?? []);
  const active = players
    .filter(p => p.injuryGames === 0)
    .sort((a, b) => {
      const aS = starterSet.has(a.id) ? 1 : 0;
      const bS = starterSet.has(b.id) ? 1 : 0;
      return bS - aS || b.ratings.overall - a.ratings.overall;
    })
    .slice(0, 12);
  if (!active.length) return new Map();

  // ── Minutes ────────────────────────────────────────────────────────────────
  const rawMins = active.map((p, i) => {
    const ratingBonus = (p.ratings.overall - 60) * 0.15;
    if (i < 5) return clamp(Math.round(randNormal(clamp(33 + ratingBonus + (i === 0 ? 2 : 0), 28, 40), 2.5, rng)), 24, 42);
    if (i < 9) return clamp(Math.round(randNormal(clamp(18 + ratingBonus * 0.6, 10, 24), 3, rng)), 6, 28);
    return clamp(Math.round(randNormal(clamp(4 + ratingBonus * 0.3, 0, 10), 2, rng)), 0, 12);
  });
  const rawTotal = rawMins.reduce((s, m) => s + m, 0);
  const scaledMins = rawMins.map(m => Math.max(0, Math.round(m * 240 / rawTotal)));
  scaledMins[0] = Math.max(0, scaledMins[0] + (240 - scaledMins.reduce((s, m) => s + m, 0)));
  const minFactors = scaledMins.map(m => clamp(m / 30, 0, 1.3));

  // ── Scoring opportunities (positional ability²  × minutes) ─────────────────
  const scoringOpps = scaledMins.map((mins, i) => {
    const p = active[i];
    const sr =
      p.position === 'C'  ? Math.max(p.ratings.scoring, p.ratings.finishing) :
      p.position === 'PF' ? Math.max(p.ratings.scoring, p.ratings.finishing * 0.9) :
      p.position === 'SF' ? (p.ratings.scoring * 0.6 + p.ratings.finishing * 0.4) :
      p.ratings.scoring;
    return sr * sr * mins;
  });
  const totalScoringOpp = scoringOpps.reduce((s, o) => s + o, 0);

  // ── Step 1: Assists — how many each player dishes, split into 2s and 3s ───
  const astCounts = active.map((p, i) => {
    const astBase = p.position === 'PG' ? 5.5 : p.position === 'SG' ? 3 : p.position === 'SF' ? 2.5 : p.position === 'PF' ? 2 : 3;
    return clamp(Math.round(randNormal((p.ratings.passing / 99) * astBase, 2, rng) * minFactors[i]), 0, 20);
  });

  // ── Step 2: Each assist becomes a made FG assigned to a weighted recipient ─
  // rcvFg2/rcvFg3 track how many assisted makes each player received
  const rcvFg2 = new Array(active.length).fill(0);
  const rcvFg3 = new Array(active.length).fill(0);

  active.forEach((assister, i) => {
    const ast = astCounts[i];
    if (!ast) return;

    // PGs kick out for more 3s; bigs tend to feed the post for 2s
    const threeRate = assister.position === 'PG' ? 0.45 : assister.position === 'SG' ? 0.38 : assister.position === 'SF' ? 0.30 : 0.22;
    const fg3ast = clamp(Math.round(ast * (threeRate + (rng() - 0.5) * 0.15)), 0, ast);
    const fg2ast = ast - fg3ast;

    // Recipients weighted by scoring opportunity, excluding the assister
    const weights = scoringOpps.map((w, j) => j === i ? 0 : w);
    const totalW = weights.reduce((s, w) => s + w, 0);
    if (totalW === 0) return;

    const pickRecipient = () => {
      let r = rng() * totalW;
      for (let j = 0; j < weights.length; j++) { r -= weights[j]; if (r <= 0) return j; }
      return weights.findIndex((w, j) => j !== i && w > 0);
    };

    for (let k = 0; k < fg2ast; k++) rcvFg2[pickRecipient()]++;
    for (let k = 0; k < fg3ast; k++) {
      const rec = pickRecipient();
      // Downgrade to a 2 if the recipient is a poor 3pt shooter
      if (active[rec].ratings.shooting3 >= 50 || rng() < 0.25) rcvFg3[rec]++;
      else rcvFg2[rec]++;
    }
  });

  // ── Step 3: Each player generates their own unassisted scoring ─────────────
  const map = new Map<string, Partial<PlayerStats>>();

  active.forEach((p, i) => {
    const minutes  = scaledMins[i];
    const minFactor = minFactors[i];

    // Points already locked in by received assists
    const assistedPts = rcvFg2[i] * 2 + rcvFg3[i] * 3;

    // Target from scoring share, then subtract what assists already gave
    const scoringShare = totalScoringOpp > 0 ? scoringOpps[i] / totalScoringOpp : 1 / active.length;
    const totalTarget  = Math.round(clamp(Math.round(randNormal(teamPoints * scoringShare, 4, rng)), 0, 70) * minFactor);
    const ownTarget    = Math.max(0, totalTarget - assistedPts);

    // Unassisted FGA — lower divisor = more attempts
    const ownFga  = ownTarget > 0 ? Math.max(1, Math.round(ownTarget / clamp(randNormal(1.05, 0.06, rng), 0.9, 1.2))) : 0;
    const shooting3Rate = clamp((p.ratings.shooting3 - 40) / 60 + randNormal(0, 0.07, rng), 0, 0.62);
    const ownFg3a = Math.round(ownFga * shooting3Rate);
    const ownFg2a = Math.max(ownFga - ownFg3a, 0);

    // Real NBA: league-avg 3PT% ~36%, elite shooters ~42%. rating 30→27%, 99→44%
    const tend3Pct  = clamp(0.27 + (p.ratings.shooting3 - 30) / 69 * 0.17, 0.22, 0.44);
    const game3Pct  = clamp(randNormal(tend3Pct, 0.05, rng), 0.15, 0.52);
    // Real NBA: 2PT% ~52% league avg (mix of paint & mid). rating 30→38%, 99→58%
    const base2Pct  = clamp(0.38 + ((p.ratings.finishing + p.ratings.midRange) / 2 - 30) / 69 * 0.20, 0.34, 0.60);
    const game2Pct  = clamp(randNormal(base2Pct, 0.12, rng), 0.20, 0.75);
    const ownFg3m   = ownFg3a <= 1 ? (rng() < game3Pct ? 1 : 0) : Math.min(Math.round(ownFg3a * game3Pct), ownFg3a - 1);
    const ownFg2m   = ownFg2a <= 1 ? (rng() < game2Pct ? 1 : 0) : Math.min(Math.round(ownFg2a * game2Pct), ownFg2a - 1);

    // Combine own makes with assisted makes received
    const totalFg3m = ownFg3m + rcvFg3[i];
    const totalFg2m = ownFg2m + rcvFg2[i];
    const _totalFgm  = totalFg3m + totalFg2m; void _totalFgm;
    const totalFga  = Math.max(ownFga + rcvFg2[i] + rcvFg3[i], totalFg3m + totalFg2m + 1);
    const totalFg3a = Math.max(ownFg3a + rcvFg3[i], totalFg3m + (totalFg3m > 0 ? 1 : 0));

    // Free throws: only own FGAs generate trips to the line
    const ftRate    = clamp((p.ratings.finishing - 40) / 120 + 0.06, 0.04, 0.28);
    const fta       = Math.round(ownFga * ftRate);
    const gameFtPct = clamp(randNormal(clamp((p.ratings.finishing - 30) / 100 + 0.45, 0.55, 0.95), 0.05, rng), 0.40, 1.0);
    const ftm       = Math.round(fta * gameFtPct);

    const pts = totalFg3m * 3 + totalFg2m * 2 + ftm;

    // Rebounds / steals / blocks
    const rebBase = p.position === 'C' ? 10 : p.position === 'PF' ? 7.5 : p.position === 'SF' ? 5 : p.position === 'SG' ? 3.5 : 2.5;
    const reb = clamp(Math.round(randNormal((p.ratings.rebounding / 99) * rebBase, 2.5, rng) * minFactor), 0, 25);
    const stl = clamp(Math.round(randNormal((p.ratings.defense / 99) * 2.5, 0.8, rng) * minFactor), 0, 5);
    const blkBase   = p.position === 'C' ? 2.5 : p.position === 'PF' ? 1.5 : p.position === 'SF' ? 0.8 : 0.3;
    const blkRating = (p.ratings.finishing + p.ratings.athleticism) / 2;
    const blk = clamp(Math.round(randNormal((blkRating / 99) * blkBase, 0.6, rng) * minFactor), 0, 6);
    const tov = clamp(Math.round(randNormal(pts / 15, 0.8, rng)), 0, 7);

    // Tendency multipliers — scale the underlying makes, not just pts, so they stay consistent
    let finalAst = astCounts[i], finalReb = reb, finalStl = stl, finalBlk = blk;
    let finalFga = totalFga, finalFg3a = totalFg3a;
    let finalFg3m = totalFg3m, finalFg2m = totalFg2m, finalFtm = ftm;
    const t3p = clamp((p.ratings.shooting3 - 30) / 100, 0.22, 0.45);

    const scaleMakes = (s: number) => {
      finalFg3m = Math.round(finalFg3m * s);
      finalFg2m = Math.round(finalFg2m * s);
      finalFtm  = Math.round(finalFtm  * s);
    };

    switch (p.tendency) {
      case 'scorer':         scaleMakes(1.08); finalFga = Math.round(totalFga * 1.06); break;
      case 'playmaker':      finalAst = Math.round(astCounts[i] * 1.25); scaleMakes(0.92); break;
      case 'defender':       finalStl = Math.round(stl * 1.3); finalBlk = Math.round(blk * 1.2); scaleMakes(0.88); break;
      case 'rebounder':      finalReb = Math.round(reb * 1.3); scaleMakes(0.88); break;
      case '3pt-specialist': finalFg3a = Math.round(totalFg3a * 1.2); finalFg3m = Math.round(finalFg3a * t3p); scaleMakes(0.95); break;
      case 'interior':       finalFg3a = Math.round(totalFg3a * 0.4); finalFg3m = Math.round(finalFg3a * t3p); finalReb = Math.round(reb * 1.2); scaleMakes(1.04); break;
      case '3-and-D':        finalFg3a = Math.round(totalFg3a * 1.1); finalFg3m = Math.round(finalFg3a * t3p); finalStl = Math.round(stl * 1.2); finalBlk = Math.round(blk * 1.1); break;
      case 'stretch-big':    finalFg3a = Math.round(totalFg3a * 1.1); finalFg3m = Math.round(finalFg3a * t3p); finalReb = Math.round(reb * 1.1); break;
      case 'facilitator':    finalAst = Math.round(astCounts[i] * 1.2); scaleMakes(0.95); break;
      case 'utility':        scaleMakes(1.03); finalAst = Math.round(astCounts[i] * 1.05); finalReb = Math.round(reb * 1.05); break;
    }

    finalFg3m = clamp(finalFg3m, 0, finalFg3a);
    finalFg2m = Math.max(finalFg2m, 0);
    const finalFgm  = clamp(finalFg3m + finalFg2m, 0, 40);
    finalFg3a = clamp(finalFg3a, 0, 20);
    finalFga  = clamp(Math.max(finalFga, finalFgm), 0, 40);
    finalFtm  = Math.max(finalFtm, 0);
    const finalFta  = Math.round(finalFtm / 0.78);
    finalAst  = clamp(finalAst, 0, 20);
    finalReb  = clamp(finalReb, 0, 25);
    finalStl  = clamp(finalStl, 0, 8);
    finalBlk  = clamp(finalBlk, 0, 10);

    // Points derived entirely from makes — always internally consistent
    const finalPts = clamp(finalFg3m * 3 + finalFg2m * 2 + finalFtm, 0, 60);

    map.set(p.id, { points: finalPts, assists: finalAst, rebounds: finalReb, steals: finalStl, blocks: finalBlk,
      turnovers: tov, fgm: finalFgm, fga: finalFga, fg3m: finalFg3m, fg3a: finalFg3a, ftm: finalFtm, fta: finalFta, minutes, gamesPlayed: 1 });
  });

  // Normalize so player points always sum to teamPoints — scale makes proportionally
  const ptsTotal = [...map.values()].reduce((s, p) => s + (p.points ?? 0), 0);
  if (ptsTotal > 0 && ptsTotal !== teamPoints) {
    const scale = teamPoints / ptsTotal;
    for (const [id, stats] of map.entries()) {
      const newFg3m = Math.round((stats.fg3m ?? 0) * scale);
      const newFg2m = Math.round(((stats.fgm ?? 0) - (stats.fg3m ?? 0)) * scale);
      const newFtm  = Math.round((stats.ftm  ?? 0) * scale);
      const newFg3a = Math.max(Math.round((stats.fg3a ?? 0) * scale), newFg3m);
      const newFga  = Math.max(Math.round((stats.fga  ?? 0) * scale), newFg3m + newFg2m);
      map.set(id, {
        ...stats,
        points: clamp(newFg3m * 3 + newFg2m * 2 + newFtm, 0, 60),
        fgm:    newFg3m + newFg2m,
        fg3m:   newFg3m,
        fg3a:   newFg3a,
        fga:    newFga,
        ftm:    newFtm,
        fta:    Math.max(Math.round((stats.fta ?? 0) * scale), newFtm),
      });
    }
  }

  return map;
}

export function calculateStrengthOfSchedule(team: Team, allTeams: Team[], players: Record<string, Player>): number {
  const others = Object.values(allTeams).filter(t => t.id !== team.id);
  const strengths = others.map(t => {
    const tp = t.rosterIds.map(id => players[id]).filter(Boolean);
    return teamStrength(tp);
  });
  return strengths.reduce((a, b) => a + b, 0) / strengths.length;
}
