import type { Player, PlayerStats } from '../types';

interface NarrativeInput {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  userIsHome: boolean;
  homeStats: Map<string, Partial<PlayerStats>>;
  awayStats: Map<string, Partial<PlayerStats>>;
  homePlayers: Player[];
  awayPlayers: Player[];
  isRivalry?: boolean;
}

function lastName(name: string) {
  return name.split(' ').slice(-1)[0];
}

function fgPct(fgm: number, fga: number) {
  return fga > 0 ? Math.round((fgm / fga) * 100) : 0;
}

export function generateGameNarrative(input: NarrativeInput): string[] {
  const {
    homeTeamName, awayTeamName, homeScore, awayScore,
    userIsHome, homeStats, awayStats, homePlayers, awayPlayers,
  } = input;

  const userScore   = userIsHome ? homeScore : awayScore;
  const oppScore    = userIsHome ? awayScore : homeScore;
  const userStats   = userIsHome ? homeStats : awayStats;
  const oppStats    = userIsHome ? awayStats : homeStats;
  const userPlayers = userIsHome ? homePlayers : awayPlayers;
  const oppPlayers  = userIsHome ? awayPlayers : homePlayers;
  const userTeam    = userIsHome ? homeTeamName : awayTeamName;
  const oppTeam     = userIsHome ? awayTeamName : homeTeamName;
  const won         = userScore > oppScore;
  const margin      = Math.abs(userScore - oppScore);

  const events: string[] = [];

  if (input.isRivalry) {
    events.push(`⚔️ RIVALRY GAME — ${userTeam} vs ${oppTeam}`);
  }

  // Sort user players by points
  const userPerfs = userPlayers
    .map(p => ({ player: p, stats: userStats.get(p.id) ?? {} }))
    .filter(x => (x.stats.points ?? 0) > 0)
    .sort((a, b) => (b.stats.points ?? 0) - (a.stats.points ?? 0));

  const oppPerfs = oppPlayers
    .map(p => ({ player: p, stats: oppStats.get(p.id) ?? {} }))
    .filter(x => (x.stats.points ?? 0) > 0)
    .sort((a, b) => (b.stats.points ?? 0) - (a.stats.points ?? 0));

  // 1. Opening line based on how decisive the result was
  if (margin >= 20) {
    events.push(won
      ? `Dominant performance — ${userTeam} controlled this one from start to finish, winning by ${margin}.`
      : `It was never close. ${oppTeam} ran away with this one, winning by ${margin}.`
    );
  } else if (margin <= 5) {
    events.push(won
      ? `Nail-biter. ${userTeam} held on to win ${userScore}–${oppScore} in a tense finish.`
      : `Heartbreaker. Lost by ${margin} in a game that could've gone either way.`
    );
  } else {
    events.push(won
      ? `Solid road/home ${margin > 10 ? 'statement win' : 'victory'} — ${userScore}–${oppScore}.`
      : `Fell short ${userScore}–${oppScore}. ${oppTeam} made the key plays down the stretch.`
    );
  }

  // 2. Top scorer highlight
  if (userPerfs.length > 0) {
    const top = userPerfs[0];
    const pts  = top.stats.points  ?? 0;
    const fgm_ = top.stats.fgm    ?? 0;
    const fga_ = top.stats.fga    ?? 0;
    const reb  = top.stats.rebounds ?? 0;
    const ast  = top.stats.assists  ?? 0;
    const fg3m = top.stats.fg3m   ?? 0;
    const pct  = fgPct(fgm_, fga_);
    const name = lastName(top.player.name);

    const fg3a = top.stats.fg3a ?? 0;
    const fg3pct = fg3a > 0 ? Math.round((fg3m / fg3a) * 100) : 0;

    if (fg3m >= 4) {
      events.push(`${name} was on fire from deep — ${fg3m}/${fg3a} from three (${fg3pct}%) for ${pts} pts.`);
    } else if (reb >= 10 && ast >= 8) {
      events.push(`${name} stuffed the stat sheet: ${pts}/${reb}/${ast} in a complete performance.`);
    } else if (reb >= 10) {
      events.push(`${name} dominated the glass and the score sheet — ${pts} pts, ${reb} rebounds.`);
    } else if (ast >= 10) {
      events.push(`${name} ran the offense brilliantly: ${pts} pts and ${ast} assists on ${pct}% shooting.`);
    } else if (pts >= 30) {
      events.push(`${name} was unstoppable — ${pts} points on ${fgm_}/${fga_} shooting (${pct}%). Vintage performance.`);
    } else {
      events.push(`${name} led the scoring with ${pts} pts (${fgm_}/${fga_} FG, ${pct}%).`);
    }
  }

  // 3. Second contributor (if significant)
  if (userPerfs.length > 1) {
    const sec = userPerfs[1];
    const pts  = sec.stats.points ?? 0;
    const ast  = sec.stats.assists ?? 0;
    const reb  = sec.stats.rebounds ?? 0;
    const name = lastName(sec.player.name);
    if (pts >= 18 || ast >= 8 || reb >= 10) {
      events.push(`${name} provided a major boost off the bench/in support — ${pts} pts${ast >= 7 ? `, ${ast} ast` : ''}${reb >= 8 ? `, ${reb} reb` : ''}.`);
    }
  }

  // 4. Defense vs opponent star
  if (oppPerfs.length > 0) {
    const oppStar = oppPerfs[0];
    const pts = oppStar.stats.points ?? 0;
    const fgm_ = oppStar.stats.fgm ?? 0;
    const fga_ = oppStar.stats.fga ?? 1;
    const pct = fgPct(fgm_, fga_);
    const name = lastName(oppStar.player.name);
    if (won && pts <= 16 && fga_ >= 10) {
      events.push(`Defensively, the team held ${oppTeam}'s ${name} to just ${pts} pts on ${pct}% shooting.`);
    } else if (!won && pts >= 28) {
      events.push(`${name} was the difference for ${oppTeam} — ${pts} points on ${pct}% shooting.`);
    }
  }

  // 5. Clutch or momentum event based on score differential pattern
  if (won && margin <= 8) {
    const topName = userPerfs[0] ? lastName(userPerfs[0].player.name) : 'the team';
    events.push(`${topName} hit the key shots in the final minutes to seal the win.`);
  } else if (!won && margin <= 6) {
    events.push(`A late run wasn't enough — turnovers in the 4th quarter proved costly.`);
  } else if (won && margin >= 15) {
    events.push(`A dominant 3rd quarter swing opened up the lead and never looked back.`);
  }

  return events.slice(0, 5);
}
