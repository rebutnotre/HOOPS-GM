const DAY_TO_DAY = [
  'Sprained Ankle', 'Sore Knee', 'Back Tightness', 'Finger Sprain',
  'Shin Splints', 'Hip Flexor', 'Wrist Soreness', 'Neck Stiffness',
  'Quad Bruise', 'Elbow Irritation',
];

const WEEK_TO_WEEK = [
  'Hamstring Strain', 'Knee Contusion', 'Ankle Ligament Sprain',
  'Shoulder Soreness', 'Calf Strain', 'Groin Pull', 'Turf Toe',
  'Foot Sprain', 'Hip Flexor Strain', 'Back Spasm',
];

const EXTENDED = [
  'Hamstring Tear', 'Ankle Fracture', 'Knee Surgery', 'Stress Fracture',
  'Shoulder Dislocation', 'Broken Hand', 'Torn Meniscus',
];

const SEASON_ENDING = [
  'Torn ACL', 'Torn Achilles', 'Broken Leg', 'Fractured Vertebrae',
];

export function getInjuryName(games: number, seed: number): string {
  const roll = seed % 100;
  if (games >= 20) {
    return SEASON_ENDING[roll % SEASON_ENDING.length];
  } else if (games >= 8) {
    return EXTENDED[roll % EXTENDED.length];
  } else if (games >= 4) {
    return WEEK_TO_WEEK[roll % WEEK_TO_WEEK.length];
  }
  return DAY_TO_DAY[roll % DAY_TO_DAY.length];
}

export function injurySeverityLabel(games: number): { label: string; color: string; bg: string } {
  if (games >= 20) return { label: 'Season-Ending', color: '#f87171', bg: '#450a0a' };
  if (games >= 8)  return { label: 'Long-Term',     color: '#fb923c', bg: '#431407' };
  if (games >= 4)  return { label: 'Week-to-Week',  color: '#fbbf24', bg: '#422006' };
  return                  { label: 'Day-to-Day',    color: '#a3a3a3', bg: '#1e2235' };
}
