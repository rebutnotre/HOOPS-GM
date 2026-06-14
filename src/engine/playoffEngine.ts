import type { Team, PlayinGame, PlayoffSeries } from '../types';

export const TRADE_DEADLINE_DAY = 58;
export const REGULAR_SEASON_DAYS = 82;

export function getConferenceStandings(teams: Record<string, Team>, conference: 'East' | 'West'): Team[] {
  return Object.values(teams)
    .filter(t => t.conference === conference)
    .sort((a, b) => {
      const diff = b.stats.wins - a.stats.wins;
      if (diff !== 0) return diff;
      return (b.stats.pointsFor - b.stats.pointsAgainst) - (a.stats.pointsFor - a.stats.pointsAgainst);
    });
}

export function setupPlayin(teams: Record<string, Team>): PlayinGame[] {
  const games: PlayinGame[] = [];
  for (const conf of ['East', 'West'] as const) {
    const s = getConferenceStandings(teams, conf);
    if (s.length < 10) continue;
    games.push(
      { id: `playin-${conf}-7v8`, conference: conf, matchup: '7v8', homeTeamId: s[6].id, awayTeamId: s[7].id, homeScore: 0, awayScore: 0, played: false },
      { id: `playin-${conf}-9v10`, conference: conf, matchup: '9v10', homeTeamId: s[8].id, awayTeamId: s[9].id, homeScore: 0, awayScore: 0, played: false },
    );
  }
  return games;
}

export function addPlayinFinalGames(games: PlayinGame[]): PlayinGame[] {
  const result = [...games];
  for (const conf of ['East', 'West'] as const) {
    if (result.find(g => g.conference === conf && g.matchup === 'final')) continue;
    const g7v8 = result.find(g => g.conference === conf && g.matchup === '7v8');
    const g9v10 = result.find(g => g.conference === conf && g.matchup === '9v10');
    if (!g7v8?.played || !g9v10?.played || !g7v8.winnerId || !g9v10.winnerId) continue;
    const loser7v8 = g7v8.winnerId === g7v8.homeTeamId ? g7v8.awayTeamId : g7v8.homeTeamId;
    result.push({
      id: `playin-${conf}-final`,
      conference: conf,
      matchup: 'final',
      homeTeamId: loser7v8,
      awayTeamId: g9v10.winnerId,
      homeScore: 0,
      awayScore: 0,
      played: false,
    });
  }
  return result;
}

export function setupPlayoffBracket(teams: Record<string, Team>, playinGames: PlayinGame[]): PlayoffSeries[] {
  const series: PlayoffSeries[] = [];
  for (const conf of ['East', 'West'] as const) {
    const standings = getConferenceStandings(teams, conf);
    const g7v8 = playinGames.find(g => g.conference === conf && g.matchup === '7v8');
    const gFinal = playinGames.find(g => g.conference === conf && g.matchup === 'final');
    const seeds = standings.slice(0, 6).map(t => t.id);
    seeds.push(g7v8?.winnerId ?? standings[6]?.id ?? '');
    seeds.push(gFinal?.winnerId ?? standings[7]?.id ?? '');
    // Round 1: 1v8, 2v7, 3v6, 4v5
    ([
      [0, 7], [1, 6], [2, 5], [3, 4],
    ] as [number, number][]).forEach(([a, b], i) => {
      series.push({
        id: `${conf[0]}-R1-${i + 1}`,
        round: 1,
        conference: conf,
        teamAId: seeds[a],
        teamBId: seeds[b],
        teamAWins: 0,
        teamBWins: 0,
        games: [],
      });
    });
  }
  return series;
}

export function getNextPlayoffRound(
  bracket: PlayoffSeries[],
  round: 1 | 2 | 3,
  teams: Record<string, Team>,
): PlayoffSeries[] {
  const roundSeries = bracket.filter(s => s.round === round);
  if (!roundSeries.every(s => s.winnerId)) return [];
  const nextRound = (round + 1) as 2 | 3 | 4;
  const newSeries: PlayoffSeries[] = [];

  if (round < 3) {
    for (const conf of ['East', 'West'] as const) {
      const confR = roundSeries.filter(s => s.conference === conf);
      for (let i = 0; i < confR.length; i += 2) {
        const s1 = confR[i];
        const s2 = confR[i + 1];
        if (!s1?.winnerId || !s2?.winnerId) continue;
        const w1 = teams[s1.winnerId]?.stats.wins ?? 0;
        const w2 = teams[s2.winnerId]?.stats.wins ?? 0;
        const [teamA, teamB] = w1 >= w2 ? [s1.winnerId, s2.winnerId] : [s2.winnerId, s1.winnerId];
        newSeries.push({ id: `${conf[0]}-R${nextRound}-${i / 2 + 1}`, round: nextRound, conference: conf, teamAId: teamA, teamBId: teamB, teamAWins: 0, teamBWins: 0, games: [] });
      }
    }
  } else {
    const east = roundSeries.find(s => s.conference === 'East');
    const west = roundSeries.find(s => s.conference === 'West');
    if (!east?.winnerId || !west?.winnerId) return [];
    const ew = teams[east.winnerId]?.stats.wins ?? 0;
    const ww = teams[west.winnerId]?.stats.wins ?? 0;
    const [teamA, teamB] = ew >= ww ? [east.winnerId, west.winnerId] : [west.winnerId, east.winnerId];
    newSeries.push({ id: 'Finals', round: 4, conference: 'Finals', teamAId: teamA, teamBId: teamB, teamAWins: 0, teamBWins: 0, games: [] });
  }

  return newSeries;
}

export function getPlayoffHomeAway(series: PlayoffSeries, gameNum: number): { homeTeamId: string; awayTeamId: string } {
  const homeIsA = [1, 2, 5, 7].includes(gameNum);
  return {
    homeTeamId: homeIsA ? series.teamAId : series.teamBId,
    awayTeamId: homeIsA ? series.teamBId : series.teamAId,
  };
}
