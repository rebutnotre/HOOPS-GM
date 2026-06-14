export interface PlayerRatings {
  overall: number;
  scoring: number;
  shooting3: number;
  midRange: number;
  finishing: number;
  passing: number;
  ballHandling: number;
  defense: number;
  rebounding: number;
  athleticism: number;
  iq: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  minutes: number;
}

export interface Contract {
  salary: number; // in millions
  yearsLeft: number;
  twoWay?: boolean;
}

export type PlayerTendency = 'scorer' | 'playmaker' | 'defender' | 'rebounder' | '3pt-specialist' | 'interior' | '3-and-D' | 'utility' | 'stretch-big' | 'facilitator';

export type FreeAgencyPriority = 'money' | 'winning' | 'loyalty' | 'balanced';

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  teamId: string | null;
  ratings: PlayerRatings;
  seasonStats: PlayerStats;
  careerStats: PlayerStats;
  contract: Contract;
  photoSeed: number; // used to deterministically pick face image
  potential: number; // 40-99
  morale: number; // 0-100
  injuryGames: number; // games remaining on injury
  injuryType?: string; // e.g. "Sprained Ankle"
  previousOvr?: number; // OVR at season start, for Most Improved tracking
  tendency?: PlayerTendency;
  yearsWithTeam?: number;
  freeAgencyPriority?: FreeAgencyPriority;
  secondaryPosition?: Position;
  height?: number; // inches
  freshContract?: boolean; // signed this offseason — skip first contract decrement
  hadBreakoutSeason?: boolean; // for sophomore slump arc
  tradeRequest?: boolean; // player has requested a trade
}

export interface TeamStats {
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: number; // positive = win streak, negative = loss streak
}

export type TeamMode = 'contend' | 'rebuild' | 'balanced';

export interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  conference: 'East' | 'West';
  division: string;
  rosterIds: string[];
  stats: TeamStats;
  salary: number; // total current salary in millions
  capSpace: number; // remaining cap space
  mode: TeamMode;
  draftPicks: DraftPick[];
  championships?: number;
  coachId?: string;
  chemistry?: number;
  rivals?: string[];
  headToHead?: Record<string, { wins: number; losses: number }>;
  lineup?: string[]; // user-set starting 5 player IDs
  lineupPositions?: Record<string, Position>; // player ID → assigned depth-chart position
}

export interface Coach {
  id: string;
  name: string;
  offense: number;   // 40-99
  defense: number;   // 40-99
  development: number; // 40-99
  health: number;    // 40-99
  salary: number;    // in millions per year
  contractYears: number;
}

export interface DraftPick {
  year: number;
  round: 1 | 2;
  fromTeamId: string; // original team
  currentTeamId: string; // current owner
}

export interface GameResult {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  week: number;
  played: boolean;
}

export interface TradeOffer {
  fromTeamId: string;
  toTeamId: string;
  fromPlayerIds: string[];
  toPlayerIds: string[];
  fromPicks: DraftPick[];
  toPicks: DraftPick[];
}

export interface DraftProspect {
  id: string;
  name: string;
  age: number;
  position: Position;
  scoutedRating: number; // 40-99, with noise
  actualRating: PlayerRatings;
  potential: number; // true potential ceiling (hidden until scouted)
  photoSeed: number;
  revealed?: boolean; // true once scouted by user
}

export interface NewsItem {
  id: string;
  date: string;
  headline: string;
  type: 'trade' | 'injury' | 'sigining' | 'game' | 'draft' | 'general';
}

export interface PlayoffGameResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  played: boolean;
  gameNumber: number;
}

export interface PlayoffSeries {
  id: string;
  round: 1 | 2 | 3 | 4;
  conference: 'East' | 'West' | 'Finals';
  teamAId: string; // higher seed — home for games 1,2,5,7
  teamBId: string;
  teamAWins: number;
  teamBWins: number;
  winnerId?: string;
  games: PlayoffGameResult[];
}

export interface PlayinGame {
  id: string;
  conference: 'East' | 'West';
  matchup: '7v8' | '9v10' | 'final';
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  played: boolean;
  winnerId?: string;
}

export interface Notification {
  id: string;
  type: 'game' | 'trade' | 'injury' | 'contract' | 'championship' | 'general';
  title: string;
  body: string;
  date: string;
  read: boolean;
}

export interface LastGameSummary {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  userTeamId: string;
  events: string[];
  isChampionship?: boolean;
}

export interface IncomingTradeOffer {
  id: string;
  fromTeamId: string;
  offeredPlayerIds: string[];
  wantedPlayerIds: string[];
  offeredPicks: DraftPick[];
  wantedPicks: DraftPick[];
  createdDay: number;
  expiresDay: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface AwardWinner {
  playerId: string;
  teamId: string;
  value: string;
}

export interface SeasonAwards {
  season: number;
  mvp?: AwardWinner;
  scoringChamp?: AwardWinner;
  reboundsChamp?: AwardWinner;
  assistsChamp?: AwardWinner;
  mostImproved?: AwardWinner;
  bestRecord?: { teamId: string; wins: number; losses: number };
  dpoy?: AwardWinner;
  sixthMan?: AwardWinner;
  allNbaFirst?: string[];  // player IDs
  allNbaSecond?: string[];
  allNbaThird?: string[];
}

export interface GMRating {
  score: number;
  wins: number;
  losses: number;
  championships: number;
  tradeBalance: number;
  draftScore: number;
}

export interface SeasonRecord {
  season: number;
  wins: number;
  losses: number;
  champion: string;
  mvp?: string;
  userResult: string;
  topScorer?: string;
}

export interface GameBoxScore {
  gameId: string;
  day: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  homeStats: Record<string, Partial<PlayerStats>>;
  awayStats: Record<string, Partial<PlayerStats>>;
}

export interface FantasyDraftState {
  pool: string[];          // player IDs still available
  pickOrder: string[];     // team IDs in snake order (length = teams × rounds)
  currentPick: number;     // index into pickOrder
  rounds: number;
  completedPicks: { teamId: string; playerId: string }[];
  userPickSlot: number;    // which 1-indexed position in round 1 the user picks
}

export interface LeagueState {
  season: number;
  week: number; // game day 1-82 regular season
  phase: 'preseason' | 'regular' | 'playin' | 'playoffs' | 'offseason' | 'draft' | 'freeagency' | 'fantasy_draft';
  fantasyDraft?: FantasyDraftState;
  draftOrder?: string[];
  draftPickIndex?: number;
  playoffBracket?: PlayoffSeries[];
  playinGames?: PlayinGame[];
  userTeamId: string;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  schedule: GameResult[];
  freeAgents: string[];
  draftProspects: DraftProspect[];
  news: NewsItem[];
  salaryCap: number;
  mleUsed?: boolean; // Mid-Level Exception used this season
  notifications?: Notification[];
  champion?: string;
  incomingOffers?: IncomingTradeOffer[];
  seasonAwards?: SeasonAwards;
  coaches?: Record<string, Coach>;
  gmRating?: GMRating;
  seasonHistory?: SeasonRecord[];
  scoutingPoints?: number;
  gameBoxScores?: Record<string, GameBoxScore>;
  developmentLog?: DevelopmentEntry[];
  settings?: LeagueSettings;
  tradeHistory?: TradeHistoryEntry[];
}

export interface DevelopmentEntry {
  season: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  delta: number;
  reason: string;
}

export interface LeagueSettings {
  // Core toggles
  injuriesEnabled: boolean;
  salaryCapEnabled: boolean;
  chemistryEnabled: boolean;
  moraleSystem: boolean;
  playerRegression: boolean;
  draftLottery: boolean;
  contractEnforcement: boolean;

  // Difficulty — affects trade AI threshold, GM rating, morale volatility, AI consistency
  difficulty: 'easy' | 'normal' | 'hard' | 'legend';

  // Gameplay tuning
  tradeFrequency: 'low' | 'normal' | 'high';
  progressionSpeed: 'slow' | 'normal' | 'fast';
  rookieQuality: 'weak' | 'normal' | 'loaded';
  freeAgencyCompetitiveness: 'easy' | 'normal' | 'hard';
  // Simulation
  simSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  simPauseOnInjuries: boolean;
  simPauseOnMilestones: boolean;

  // Quality of life
  autoDeclineExpiredOffers: boolean;
  showRivalCallouts: boolean;
  newsVerbosity: 'minimal' | 'normal' | 'full';
}

export const DEFAULT_SETTINGS: LeagueSettings = {
  injuriesEnabled: true,
  salaryCapEnabled: true,
  chemistryEnabled: true,
  moraleSystem: true,
  playerRegression: true,
  draftLottery: true,
  contractEnforcement: true,
  difficulty: 'normal',
  tradeFrequency: 'normal',
  progressionSpeed: 'normal',
  rookieQuality: 'normal',
  freeAgencyCompetitiveness: 'normal',
  simSpeed: 'normal',
  simPauseOnInjuries: true,
  simPauseOnMilestones: true,
  autoDeclineExpiredOffers: false,
  showRivalCallouts: true,
  newsVerbosity: 'normal',
};

export interface TradeHistoryEntry {
  id: string;
  season: number;
  day: number;
  fromTeamId: string; // user team
  toTeamId: string;   // AI team
  fromPlayerIds: string[];
  toPlayerIds: string[];
  fromPicks: DraftPick[];
  toPicks: DraftPick[];
  fairnessPct: number; // positive = user won the trade
}

export interface MoraleTradeRequest {
  playerId: string;
  requestedAt: number; // day
}
