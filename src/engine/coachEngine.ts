import type { Coach } from '../types';
import { createRng, clamp } from './rng';

const FIRST_NAMES = ['James', 'Mike', 'Tony', 'Stan', 'Doc', 'Gregg', 'Erik', 'Tom', 'Monty', 'Nick',
  'Quin', 'Billy', 'Frank', 'Terry', 'Nate', 'Steve', 'Rick', 'Larry', 'Dwane', 'Ty'];
const LAST_NAMES  = ['Rivers', 'Brown', 'Popovich', 'Van Gundy', 'Spoelstra', 'Snyder', 'Stevens',
  'Thibs', 'Udoka', 'Kerr', 'Johnson', 'Donovan', 'Vogel', 'Carlisle', 'Budenholzer',
  'Stotts', 'Jenkins', 'Hardy', 'Pierce', 'Clifford'];

function randNormalCoach(mean: number, std: number, rng: () => number): number {
  // Box-Muller
  const u1 = rng();
  const u2 = rng();
  const z  = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-9))) * Math.cos(2 * Math.PI * u2);
  return clamp(Math.round(mean + z * std), 40, 99);
}

export function generateCoachPool(seed = 777): Coach[] {
  const rng = createRng(seed);
  const coaches: Coach[] = [];

  for (let i = 0; i < 60; i++) {
    const firstName = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const lastName  = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    const offense     = randNormalCoach(65, 12, rng);
    const defense     = randNormalCoach(65, 12, rng);
    const development = randNormalCoach(65, 12, rng);
    const health      = randNormalCoach(65, 12, rng);
    const avgRating   = (offense + defense + development + health) / 4;
    const salary      = parseFloat((2 + (avgRating - 40) / 59 * 12).toFixed(1)); // $2M–$14M
    const contractYears = Math.floor(rng() * 4) + 1;

    coaches.push({
      id: `coach_${i + 1}`,
      name: `${firstName} ${lastName}`,
      offense,
      defense,
      development,
      health,
      salary,
      contractYears,
    });
  }

  return coaches;
}
