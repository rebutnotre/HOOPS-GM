import type { Team } from '../types';

export const SALARY_CAP      = 185;   // soft cap
export const LUXURY_TAX_LINE = 215;   // luxury tax threshold
export const HARD_CAP        = 230;   // absolute ceiling (apron)
export const MLE_AMOUNT      = 13.5;  // non-taxpayer mid-level exception
export const TAXPAYER_MLE    = 5.7;   // taxpayer mid-level exception
export const VET_MIN         = 1.8;   // veteran minimum salary

export const TEAM_TEMPLATES: Omit<Team, 'rosterIds' | 'stats' | 'salary' | 'capSpace' | 'mode' | 'draftPicks'>[] = [
  { id: 't1',  name: 'Celtics',      city: 'Boston',        abbreviation: 'BOS', primaryColor: '#007A33', secondaryColor: '#BA9653', conference: 'East', division: 'Atlantic' },
  { id: 't2',  name: 'Nets',         city: 'Brooklyn',      abbreviation: 'BKN', primaryColor: '#000000', secondaryColor: '#FFFFFF', conference: 'East', division: 'Atlantic' },
  { id: 't3',  name: 'Knicks',       city: 'New York',      abbreviation: 'NYK', primaryColor: '#F58426', secondaryColor: '#006BB6', conference: 'East', division: 'Atlantic' },
  { id: 't4',  name: '76ers',        city: 'Philadelphia',  abbreviation: 'PHI', primaryColor: '#006BB6', secondaryColor: '#ED174C', conference: 'East', division: 'Atlantic' },
  { id: 't5',  name: 'Raptors',      city: 'Toronto',       abbreviation: 'TOR', primaryColor: '#CE1141', secondaryColor: '#000000', conference: 'East', division: 'Atlantic' },
  { id: 't6',  name: 'Bulls',        city: 'Chicago',       abbreviation: 'CHI', primaryColor: '#CE1141', secondaryColor: '#000000', conference: 'East', division: 'Central' },
  { id: 't7',  name: 'Cavaliers',    city: 'Cleveland',     abbreviation: 'CLE', primaryColor: '#860038', secondaryColor: '#FDBB30', conference: 'East', division: 'Central' },
  { id: 't8',  name: 'Pistons',      city: 'Detroit',       abbreviation: 'DET', primaryColor: '#C8102E', secondaryColor: '#006BB6', conference: 'East', division: 'Central' },
  { id: 't9',  name: 'Pacers',       city: 'Indiana',       abbreviation: 'IND', primaryColor: '#002D62', secondaryColor: '#FDBB30', conference: 'East', division: 'Central' },
  { id: 't10', name: 'Bucks',        city: 'Milwaukee',     abbreviation: 'MIL', primaryColor: '#00471B', secondaryColor: '#EEE1C6', conference: 'East', division: 'Central' },
  { id: 't11', name: 'Hawks',        city: 'Atlanta',       abbreviation: 'ATL', primaryColor: '#C1272D', secondaryColor: '#FDB927', conference: 'East', division: 'Southeast' },
  { id: 't12', name: 'Hornets',      city: 'Charlotte',     abbreviation: 'CHA', primaryColor: '#1D1160', secondaryColor: '#00788C', conference: 'East', division: 'Southeast' },
  { id: 't13', name: 'Heat',         city: 'Miami',         abbreviation: 'MIA', primaryColor: '#98002E', secondaryColor: '#F9A01B', conference: 'East', division: 'Southeast' },
  { id: 't14', name: 'Magic',        city: 'Orlando',       abbreviation: 'ORL', primaryColor: '#0077C0', secondaryColor: '#C4CED4', conference: 'East', division: 'Southeast' },
  { id: 't15', name: 'Wizards',      city: 'Washington',    abbreviation: 'WAS', primaryColor: '#002B5C', secondaryColor: '#E31837', conference: 'East', division: 'Southeast' },
  { id: 't16', name: 'Nuggets',      city: 'Denver',        abbreviation: 'DEN', primaryColor: '#0E2240', secondaryColor: '#FEC524', conference: 'West', division: 'Northwest' },
  { id: 't17', name: 'Timberwolves', city: 'Minnesota',     abbreviation: 'MIN', primaryColor: '#0C2340', secondaryColor: '#236192', conference: 'West', division: 'Northwest' },
  { id: 't18', name: 'Thunder',      city: 'Oklahoma City', abbreviation: 'OKC', primaryColor: '#007AC1', secondaryColor: '#EF3B24', conference: 'West', division: 'Northwest' },
  { id: 't19', name: 'Trail Blazers',city: 'Portland',      abbreviation: 'POR', primaryColor: '#E03A3E', secondaryColor: '#000000', conference: 'West', division: 'Northwest' },
  { id: 't20', name: 'Jazz',         city: 'Utah',          abbreviation: 'UTA', primaryColor: '#002B5C', secondaryColor: '#F9A01B', conference: 'West', division: 'Northwest' },
  { id: 't21', name: 'Warriors',     city: 'Golden State',  abbreviation: 'GSW', primaryColor: '#1D428A', secondaryColor: '#FFC72C', conference: 'West', division: 'Pacific' },
  { id: 't22', name: 'Clippers',     city: 'Los Angeles',   abbreviation: 'LAC', primaryColor: '#C8102E', secondaryColor: '#1D428A', conference: 'West', division: 'Pacific' },
  { id: 't23', name: 'Lakers',       city: 'Los Angeles',   abbreviation: 'LAL', primaryColor: '#552583', secondaryColor: '#FDB927', conference: 'West', division: 'Pacific' },
  { id: 't24', name: 'Suns',         city: 'Phoenix',       abbreviation: 'PHX', primaryColor: '#1D1160', secondaryColor: '#E56020', conference: 'West', division: 'Pacific' },
  { id: 't25', name: 'Kings',        city: 'Sacramento',    abbreviation: 'SAC', primaryColor: '#5A2D81', secondaryColor: '#63727A', conference: 'West', division: 'Pacific' },
  { id: 't26', name: 'Mavericks',    city: 'Dallas',        abbreviation: 'DAL', primaryColor: '#00538C', secondaryColor: '#002B5E', conference: 'West', division: 'Southwest' },
  { id: 't27', name: 'Rockets',      city: 'Houston',       abbreviation: 'HOU', primaryColor: '#CE1141', secondaryColor: '#000000', conference: 'West', division: 'Southwest' },
  { id: 't28', name: 'Grizzlies',    city: 'Memphis',       abbreviation: 'MEM', primaryColor: '#5D76A9', secondaryColor: '#12173F', conference: 'West', division: 'Southwest' },
  { id: 't29', name: 'Pelicans',     city: 'New Orleans',   abbreviation: 'NOP', primaryColor: '#0C2340', secondaryColor: '#C8102E', conference: 'West', division: 'Southwest' },
  { id: 't30', name: 'Spurs',        city: 'San Antonio',   abbreviation: 'SAS', primaryColor: '#C4CED4', secondaryColor: '#000000', conference: 'West', division: 'Southwest' },
];
