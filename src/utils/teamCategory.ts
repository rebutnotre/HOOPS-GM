import type { Team, Player } from '../types';

export interface TeamCategory {
  label: string;
  color: string;
  bg: string;
  isOvr?: boolean; // true = showing OVR badge, not classification
}

export function getTeamCategory(
  team: Team,
  players: Record<string, Player>,
): TeamCategory {
  const gp = team.stats.wins + team.stats.losses;

  const roster = team.rosterIds.map(id => players[id]).filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);
  const top5 = roster.slice(0, 5);
  const starterOvr = top5.length
    ? Math.round(top5.reduce((s, p) => s + p.ratings.overall, 0) / top5.length)
    : 70;
  const avgAge = roster.length
    ? roster.reduce((s, p) => s + p.age, 0) / roster.length
    : 25;

  const fullRosterOvr = roster.length
    ? Math.round(roster.reduce((s, p) => s + p.ratings.overall, 0) / roster.length)
    : 70;

  // Before 20 games: show team OVR badge instead of classification
  if (gp < 20) {
    // Same color for every team in early season — only the number differs
    return { label: `${fullRosterOvr} OVR`, color: '#8b90a7', bg: '#8b90a722', isOvr: true };
  }

  const winPct = team.stats.wins / gp;
  const rosterPct = starterOvr >= 84 ? 0.72 : starterOvr >= 81 ? 0.62 : starterOvr >= 78 ? 0.52 : starterOvr >= 75 ? 0.44 : starterOvr >= 72 ? 0.38 : starterOvr >= 69 ? 0.32 : 0.26;
  const weight = Math.min(gp / 20, 0.9) - 0;
  const effectivePct = rosterPct * (1 - weight) + winPct * weight;

  if (effectivePct >= 0.72 && (team.championships ?? 0) >= 1) return { label: 'Dynasty', color: '#f59e0b', bg: '#f59e0b22' };
  if (effectivePct >= 0.57) return { label: 'Contender',    color: '#34d399', bg: '#34d39922' };
  if (effectivePct >= 0.48) return { label: 'Playoff Team', color: '#6c63ff', bg: '#6c63ff22' };
  if (effectivePct >= 0.40) return { label: 'Bubble',       color: '#60a5fa', bg: '#60a5fa22' };
  if (avgAge < 25 && starterOvr < 74) return { label: 'Rebuilding', color: '#f87171', bg: '#f8717122' };
  if (effectivePct < 0.34) return { label: 'Tanking',       color: '#ef4444', bg: '#ef444422' };
  return                           { label: 'Developing',   color: '#a78bfa', bg: '#a78bfa22' };
}
