import { useLeagueStore } from '../store/leagueStore';
import type { Coach } from '../types';

function RatingBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#4ade80' : value >= 65 ? '#facc15' : '#f87171';
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: '#8b90a7' }}>{label}</span>
        <span className="font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2235' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function CoachCard({ coach, onHire, isCurrent }: { coach: Coach; onHire?: () => void; isCurrent?: boolean }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#12151e', border: `1px solid ${isCurrent ? '#6c63ff55' : '#1e2235'}` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-black text-white">{coach.name}</div>
          <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>
            ${coach.salary}M/yr · {coach.contractYears} yr{coach.contractYears !== 1 ? 's' : ''}
          </div>
        </div>
        {isCurrent && (
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#6c63ff22', color: '#6c63ff' }}>Current</span>
        )}
        {onHire && (
          <button
            onClick={onHire}
            className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#6c63ff', color: '#fff' }}>
            Hire
          </button>
        )}
      </div>
      <RatingBar label="Offense" value={coach.offense} />
      <RatingBar label="Defense" value={coach.defense} />
      <RatingBar label="Development" value={coach.development} />
      <RatingBar label="Health" value={coach.health} />
    </div>
  );
}

export default function Coaching() {
  const league = useLeagueStore(s => s.league);
  const hireCoach = useLeagueStore(s => s.hireCoach);
  const fireCoach = useLeagueStore(s => s.fireCoach);
  if (!league) return null;

  const userTeam = league.teams[league.userTeamId];
  const currentCoach = userTeam?.coachId ? league.coaches?.[userTeam.coachId] : undefined;

  const assignedCoachIds = new Set(Object.values(league.teams).map(t => t.coachId).filter(Boolean));
  const availableCoaches = Object.values(league.coaches ?? {})
    .filter(c => !assignedCoachIds.has(c.id))
    .sort((a, b) => (b.offense + b.defense + b.development + b.health) - (a.offense + a.defense + a.development + a.health))
    .slice(0, 8);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Coaching Staff</h1>
        <p className="text-sm mt-1" style={{ color: '#8b90a7' }}>Manage your head coach. Better coaches improve performance and player development.</p>
      </div>

      {/* Current coach */}
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6c63ff' }}>Your Head Coach</div>
        {currentCoach ? (
          <div className="max-w-sm">
            <CoachCard coach={currentCoach} isCurrent />
            <p className="text-xs mt-2" style={{ color: '#8b90a7' }}>
              Offense bonus: +{Math.round(currentCoach.offense / 99 * 4)} pts/game · Defense bonus: -{Math.round(currentCoach.defense / 99 * 3)} opp pts/game
            </p>
            <button
              onClick={fireCoach}
              className="mt-3 text-xs px-3 py-1.5 rounded-lg font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: '#2a1a1a', color: '#f87171', border: '1px solid #f8717144' }}>
              Fire Coach
            </button>
          </div>
        ) : (
          <div className="rounded-xl p-6 text-center" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
            <div className="text-white font-bold">No head coach assigned</div>
            <div className="text-sm mt-1" style={{ color: '#8b90a7' }}>Hire a coach from the list below.</div>
          </div>
        )}
      </div>

      {/* Available coaches */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6c63ff' }}>
          Available Coaches
        </div>
        {availableCoaches.length === 0 ? (
          <div className="text-center py-8 rounded-xl" style={{ background: '#12151e', border: '1px solid #1e2235', color: '#8b90a7' }}>
            No available coaches at this time.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {availableCoaches.map(coach => (
              <CoachCard
                key={coach.id}
                coach={coach}
                onHire={() => hireCoach(coach.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
