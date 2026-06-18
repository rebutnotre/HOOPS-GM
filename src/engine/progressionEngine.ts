import type { Player, PlayerRatings, Position } from '../types';
import { clamp } from './rng';

// Per-position OVR weights — skills that matter most at each spot.
// A PG moved to C will score much lower because finishing/rebounding dominate there.
const POSITION_OVR_WEIGHTS: Record<Position, Partial<Record<keyof PlayerRatings, number>>> = {
  PG: { ballHandling: 0.22, passing: 0.20, scoring: 0.18, defense: 0.15, athleticism: 0.13, iq: 0.12 },
  SG: { scoring: 0.25, athleticism: 0.18, defense: 0.17, ballHandling: 0.15, shooting3: 0.13, iq: 0.12 },
  SF: { scoring: 0.22, athleticism: 0.20, defense: 0.20, finishing: 0.15, iq: 0.12, rebounding: 0.11 },
  PF: { finishing: 0.25, rebounding: 0.22, defense: 0.20, athleticism: 0.18, scoring: 0.08, iq: 0.07 },
  C:  { finishing: 0.27, rebounding: 0.27, defense: 0.23, athleticism: 0.15, iq: 0.08 },
};

export function calcOvrForPosition(r: PlayerRatings, position: Position): number {
  const weights = POSITION_OVR_WEIGHTS[position];
  let ovr = 0;
  for (const [key, w] of Object.entries(weights)) {
    ovr += (r[key as keyof PlayerRatings] as number) * (w ?? 0);
  }
  return Math.round(ovr);
}

function recalcOverall(r: PlayerRatings, position?: Position): number {
  if (position) return calcOvrForPosition(r, position);
  return Math.round(
    r.scoring * 0.25 + r.defense * 0.2 + r.athleticism * 0.15 +
    r.passing * 0.1 + r.rebounding * 0.1 + r.ballHandling * 0.1 + r.iq * 0.1
  );
}

// Maximum OVR a player can reach at a given age (regardless of potential)
function ageCeiling(age: number): number {
  if (age <= 25) return 99;
  if (age <= 27) return 97;
  if (age <= 29) return 94;
  if (age <= 31) return 89;
  if (age <= 33) return 83;
  if (age <= 35) return 76;
  if (age <= 37) return 68;
  return 58; // 38+: twilight years
}

function updatedPotential(player: Player, rng: () => number): number {
  const { age, potential, ratings, seasonStats } = player;
  // Only young players can raise their ceiling
  if (age > 26) return potential;
  const gp = seasonStats?.gamesPlayed ?? 0;
  if (gp < 20) return potential;
  const ppg = (seasonStats?.points ?? 0) / gp;
  const rpg = (seasonStats?.rebounds ?? 0) / gp;
  const apg = (seasonStats?.assists ?? 0) / gp;
  // Performance score — star-level production raises ceiling
  const perfScore = ppg * 0.5 + rpg * 0.3 + apg * 0.3;
  // Base chance: elite production (25+ equiv) = ~30% chance to raise pot by 1-3
  const chance = age <= 21 ? 0.30 : age <= 23 ? 0.20 : 0.12;
  if (perfScore >= 12 && rng() < chance) {
    const bump = perfScore >= 20 ? (rng() < 0.4 ? 3 : 2) : 1;
    return clamp(potential + bump, potential, 99);
  }
  return potential;
}

export function developPlayer(player: Player, rng: () => number, developmentRating?: number, progressionMult = 1.0): { player: Player; ovrDelta: number; reason: string; hadBreakout?: boolean } {
  const { age } = player;
  const potential = updatedPotential(player, rng);
  const { ratings } = player;

  // Base rate by age — positive = growth, negative = decline
  const baseDev =
    age <= 19 ? 4.0 :
    age <= 21 ? 3.0 :
    age <= 23 ? 2.0 :
    age <= 25 ? 1.0 :
    age <= 27 ? 0.0 :
    age <= 29 ? -0.8 :
    age <= 31 ? -1.8 :
    age <= 33 ? -2.8 :
    age <= 35 ? -3.8 : -5.0;

  // ── Development arcs ─────────────────────────────────────────────
  // Sophomore slump: players who had a breakout season often regress slightly
  if (player.hadBreakoutSeason && age <= 25 && rng() < 0.45) {
    const slumpDelta = -(Math.round(rng() * 3) + 1); // -1 to -4
    const r2 = { ...ratings };
    const sd = Math.abs(slumpDelta);
    r2.scoring     = clamp(r2.scoring     - Math.round(sd * 0.9), 30, 99);
    r2.athleticism = clamp(r2.athleticism - Math.round(sd * 0.6), 30, 99);
    r2.finishing   = clamp(r2.finishing   - Math.round(sd * 0.5), 30, 99);
    r2.overall = recalcOverall(r2, player.position);
    const actualDelta = r2.overall - ratings.overall;
    return {
      player: { ...player, potential, ratings: r2, previousOvr: ratings.overall, hadBreakoutSeason: false },
      ovrDelta: actualDelta,
      reason: ['Sophomore slump', 'Struggled to replicate breakout year', 'Defenses adjusted'][Math.floor(rng() * 3)],
    };
  }

  // Breakout season: young players with room to grow can explode
  const gapToPotential = potential - ratings.overall;
  const breakoutChance = age <= 23 ? 0.18 : age <= 25 ? 0.10 : 0;
  const isBreakout = gapToPotential >= 8 && rng() < breakoutChance;

  // High-potential players develop faster and decline slower
  const potFactor = (potential - 60) / 39 * 2.0;
  // Variance: ±2 for young players, ±1.5 for older
  const varianceScale = age >= 30 ? 0.75 : 1.0;
  const variance = (rng() - 0.5) * 4 * varianceScale;
  const devMultiplier = developmentRating !== undefined ? 1 + (developmentRating - 50) / 150 : 1;
  // Raw delta (float) — do NOT round yet
  let rawDelta = (baseDev + potFactor + variance) * devMultiplier;

  // Breakout: force large positive delta
  if (isBreakout) rawDelta = Math.max(rawDelta, 4 + rng() * 4); // +4 to +8

  // Apply progression speed multiplier
  rawDelta *= progressionMult;

  // 30+: cap improvement at +1 (late-career breakouts are rare but possible)
  if (age >= 30 && rawDelta > 1) rawDelta = 1;

  const delta = Math.round(rawDelta);

  const pick = (arr: string[]) => arr[Math.floor(rng() * arr.length)];
  let reason = '';
  if (delta === 0) {
    reason = pick(['Held steady', 'Consistent year', 'No significant change']);
    return { player: { ...player, potential, previousOvr: ratings.overall }, ovrDelta: 0, reason };
  }

  const r = { ...ratings };

  if (delta > 0) {
    // Apply growth to each rating proportionally — use delta directly (not scaled down)
    // so small deltas actually move the needle
    r.scoring      = clamp(r.scoring      + delta,                        30, 99);
    r.athleticism  = clamp(r.athleticism  + Math.max(1, Math.round(delta * 0.8)), 30, 99);
    r.finishing    = clamp(r.finishing    + Math.max(1, Math.round(delta * 0.7)), 30, 99);
    r.midRange     = clamp(r.midRange     + Math.max(1, Math.round(delta * 0.6)), 30, 99);
    r.shooting3    = clamp(r.shooting3    + Math.max(1, Math.round(delta * 0.6)), 30, 99);
    r.defense      = clamp(r.defense      + Math.max(1, Math.round(delta * 0.5)), 30, 99);
    r.passing      = clamp(r.passing      + Math.max(1, Math.round(delta * 0.5)), 30, 99);
    r.rebounding   = clamp(r.rebounding   + Math.max(1, Math.round(delta * 0.4)), 30, 99);
    r.ballHandling = clamp(r.ballHandling + Math.max(1, Math.round(delta * 0.4)), 30, 99);
    r.iq           = clamp(r.iq           + Math.max(1, Math.round(delta * 0.4)), 30, 99);
    // Clamp to potential ceiling — never let the correction push ratings below their pre-growth values
    const ceiling = Math.min(potential, ageCeiling(age));
    const newOvr = recalcOverall(r, player.position);
    if (newOvr > ceiling) {
      const overshoot = newOvr - ceiling;
      const keys = ['scoring','athleticism','finishing','midRange','shooting3','defense','passing','rebounding','ballHandling','iq'] as const;
      for (const k of keys) {
        const original = (ratings as unknown as Record<string, number>)[k];
        (r as Record<string, number>)[k] = Math.max(original, (r as Record<string, number>)[k] - overshoot);
      }
    }
  } else {
    const d = Math.abs(delta);
    // Athletics erode fastest; IQ and shooting hold up longest
    r.athleticism  = clamp(r.athleticism  - Math.round(d * 1.3), 30, 99);
    r.scoring      = clamp(r.scoring      - Math.round(d * 0.9), 30, 99);
    r.finishing    = clamp(r.finishing    - Math.round(d * 0.8), 30, 99);
    r.defense      = clamp(r.defense      - Math.round(d * 0.7), 30, 99);
    r.rebounding   = clamp(r.rebounding   - Math.round(d * 0.6), 30, 99);
    r.midRange     = clamp(r.midRange     - Math.round(d * 0.4), 30, 99);
    r.shooting3    = clamp(r.shooting3    - Math.round(d * 0.3), 30, 99);
    r.passing      = clamp(r.passing      - Math.round(d * 0.3), 30, 99);
    r.ballHandling = clamp(r.ballHandling - Math.round(d * 0.2), 30, 99);
    r.iq           = clamp(r.iq           - Math.round(d * 0.1), 30, 99);
    // Hard cap: age ceiling overrides everything
    const ceiling = Math.min(potential, ageCeiling(age));
    const newOvr  = recalcOverall(r, player.position);
    if (newOvr > ceiling) {
      const excess = newOvr - ceiling;
      r.athleticism = Math.max(30, r.athleticism - excess);
      r.scoring     = Math.max(30, r.scoring     - Math.round(excess * 0.5));
    }
  }

  r.overall = recalcOverall(r, player.position);
  const ovrDelta = r.overall - ratings.overall;

  const hadBreakout = isBreakout && ovrDelta >= 4;

  if (ovrDelta > 0) {
    reason = isBreakout && ovrDelta >= 4
      ? pick(['Breakout season!', 'Erupted onto the scene', 'Emerged as a star', 'Made a massive leap'])
      : ovrDelta >= 4
      ? pick(['Huge leap forward', 'Took his game to another level', 'Elevated his play significantly'])
      : ovrDelta >= 2
      ? pick(['Shot improvements paying off', 'Added strength', 'Refined his offensive game', 'Elevated his game', 'Hard work in the off-season showing'])
      : pick(['Steady growth', 'Small improvements', 'Putting in the work', 'Gradual development']);
  } else {
    const d = Math.abs(ovrDelta);
    reason = d >= 4
      ? pick(['Sharp decline', 'Age taking its toll', 'Lost significant ability', 'Clear step back'])
      : d >= 2
      ? pick(['Lost a step athletically', 'Wear and tear showing', 'Skills slowly fading', 'Father time catching up'])
      : pick(['Slight regression', 'Minor step back', 'Small dip in performance']);
  }

  return {
    player: { ...player, potential, ratings: r, previousOvr: ratings.overall, hadBreakoutSeason: hadBreakout ? true : false },
    ovrDelta,
    reason,
    hadBreakout,
  };
}

export function moraleLabel(morale: number): { label: string; color: string } {
  if (morale >= 85) return { label: 'Happy',   color: '#4ade80' };
  if (morale >= 70) return { label: 'Content',  color: '#86efac' };
  if (morale >= 55) return { label: 'Neutral',  color: '#9ca3af' };
  if (morale >= 40) return { label: 'Unhappy',  color: '#fb923c' };
  return                    { label: 'Miserable', color: '#f87171' };
}
