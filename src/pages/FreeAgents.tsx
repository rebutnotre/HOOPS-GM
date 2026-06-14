import { useLeagueStore } from '../store/leagueStore';
import PlayerPhoto from '../components/PlayerPhoto';
import { OverallBadge } from '../components/RatingBar';
import { SALARY_CAP, LUXURY_TAX_LINE, HARD_CAP, MLE_AMOUNT, TAXPAYER_MLE, VET_MIN } from '../engine/teamData';

function marketValue(ovr: number) {
  return parseFloat((Math.max(1.1, (ovr - 40) * 0.4 + 1.1)).toFixed(2));
}

type Exception = 'cap_space' | 'mle' | 'taxpayer_mle' | 'minimum' | null;

function getException(salary: number, currentTeamSalary: number, mleUsed: boolean): Exception {
  const overCap   = currentTeamSalary > SALARY_CAP;
  const overTax   = currentTeamSalary > LUXURY_TAX_LINE;
  const overApron = currentTeamSalary > HARD_CAP;
  // actual cap space (may be negative)
  const roomLeft  = SALARY_CAP - currentTeamSalary;

  if (overApron) {
    return salary <= VET_MIN ? 'minimum' : null;
  }
  if (!overCap && roomLeft >= salary) {
    return 'cap_space';
  }
  if (!mleUsed && !overTax && salary <= MLE_AMOUNT && currentTeamSalary + salary <= HARD_CAP) {
    return 'mle';
  }
  if (!mleUsed && overTax && salary <= TAXPAYER_MLE && currentTeamSalary + salary <= HARD_CAP) {
    return 'taxpayer_mle';
  }
  if (salary <= VET_MIN && currentTeamSalary + salary <= HARD_CAP) {
    return 'minimum';
  }
  return null;
}

const EXCEPTION_LABEL: Record<Exclude<Exception, null>, string> = {
  cap_space:    'Cap Space',
  mle:          'MLE',
  taxpayer_mle: 'Tax MLE',
  minimum:      'Vet Min',
};
const EXCEPTION_COLOR: Record<Exclude<Exception, null>, string> = {
  cap_space:    '#4ade80',
  mle:          '#818cf8',
  taxpayer_mle: '#fb923c',
  minimum:      '#6b7280',
};

const FA_PRIORITY_LABEL: Record<string, { label: string; icon: string; color: string }> = {
  money:    { label: 'Money',   icon: '💰', color: '#facc15' },
  winning:  { label: 'Winning', icon: '🏆', color: '#4ade80' },
  loyalty:  { label: 'Loyalty', icon: '❤️',  color: '#f472b6' },
  balanced: { label: 'Balanced',icon: '⚖️', color: '#818cf8' },
};

function interestLevel(priority: string | undefined, userWinPct: number, offeredSalary: number, marketVal: number, wasOnTeam: boolean): { label: string; color: string } {
  let score = 50;
  if (priority === 'money')   score = Math.min(100, 50 + (offeredSalary / marketVal - 1) * 120);
  if (priority === 'winning') score = Math.min(100, userWinPct * 100);
  if (priority === 'loyalty') score = wasOnTeam ? 85 : 30;
  if (priority === 'balanced') score = Math.min(100, (userWinPct * 50) + ((offeredSalary / marketVal) * 50));
  if (score >= 70) return { label: 'High Interest', color: '#4ade80' };
  if (score >= 45) return { label: 'Some Interest', color: '#facc15' };
  return { label: 'Low Interest', color: '#f87171' };
}

export default function FreeAgents() {
  const league = useLeagueStore(s => s.league);
  const signFreeAgent = useLeagueStore(s => s.signFreeAgent);
  const signTwoWay = useLeagueStore(s => s.signTwoWay);
  if (!league) return null;

  const userTeam = league.teams[league.userTeamId];
  const salary   = userTeam.salary;
  const mleUsed  = league.mleUsed ?? false;
  const twoWayCount = userTeam.rosterIds.filter(id => league.players[id]?.contract.twoWay).length;

  const overCap   = salary > SALARY_CAP;
  const overTax   = salary > LUXURY_TAX_LINE;
  const overApron = salary > HARD_CAP;

  const userTeamWins = userTeam.stats.wins;
  const userTeamLosses = userTeam.stats.losses;
  const userWinPct = (userTeamWins + userTeamLosses) > 0 ? userTeamWins / (userTeamWins + userTeamLosses) : 0.5;

  const freeAgents = league.freeAgents
    .map(id => league.players[id])
    .filter(Boolean)
    .sort((a, b) => b.ratings.overall - a.ratings.overall);

  // Cap status pill
  const capStatus = overApron
    ? { label: 'Over Hard Cap', color: '#f87171', bg: '#450a0a', note: 'Only veteran minimum signings allowed.' }
    : overTax
    ? { label: 'Luxury Tax', color: '#fb923c', bg: '#431407', note: `Tax MLE: $${TAXPAYER_MLE}M (${mleUsed ? 'used' : 'available'}) · Vet Min always available.` }
    : overCap
    ? { label: 'Over Soft Cap', color: '#facc15', bg: '#422006', note: `MLE: $${MLE_AMOUNT}M (${mleUsed ? 'used' : 'available'}) · Vet Min always available.` }
    : { label: 'Under Cap', color: '#4ade80', bg: '#052e16', note: `$${(SALARY_CAP - salary).toFixed(2)}M cap space to spend freely.` };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Free Agents</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8b90a7' }}>
            Payroll ${salary.toFixed(2)}M · Cap ${SALARY_CAP}M · Tax ${LUXURY_TAX_LINE}M · Apron ${HARD_CAP}M
          </p>
        </div>
      </div>

      {/* Cap status banner */}
      <div className="rounded-xl px-4 py-3 mb-5 flex items-start gap-3" style={{ background: capStatus.bg, border: `1px solid ${capStatus.color}33` }}>
        <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: capStatus.color }} />
        <div>
          <span className="text-sm font-bold" style={{ color: capStatus.color }}>{capStatus.label}</span>
          <span className="text-sm ml-2" style={{ color: '#c5c9d8' }}>{capStatus.note}</span>
        </div>
      </div>

      {/* Exceptions legend */}
      <div className="rounded-xl p-4 mb-5" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6c63ff' }}>How to Sign Players When Over the Cap</div>
        <div className="grid grid-cols-2 gap-3 text-xs" style={{ color: '#c5c9d8' }}>
          <div><span className="font-bold" style={{ color: '#4ade80' }}>Cap Space</span> — free signings when under ${SALARY_CAP}M payroll</div>
          <div><span className="font-bold" style={{ color: '#818cf8' }}>MLE (${MLE_AMOUNT}M)</span> — one signing/yr, up to ${MLE_AMOUNT}M salary {mleUsed ? '· ✗ used this season' : '· ✓ available'}</div>
          <div><span className="font-bold" style={{ color: '#fb923c' }}>Tax MLE (${TAXPAYER_MLE}M)</span> — if over tax line, one signing up to ${TAXPAYER_MLE}M {mleUsed ? '· ✗ used' : ''}</div>
          <div><span className="font-bold" style={{ color: '#6b7280' }}>Vet Min (${VET_MIN}M)</span> — always available, any number of signings</div>
        </div>
        <div className="mt-3 text-xs" style={{ color: '#8b90a7' }}>
          💡 To sign stars when over the cap: use <span className="text-white font-semibold">Re-Sign</span> (Bird Rights) on your own players before they expire, or <span className="text-white font-semibold">release</span> players to create cap room.
        </div>
      </div>

      {freeAgents.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
          <div className="text-4xl mb-3">🏀</div>
          <div className="text-white font-bold">No free agents available</div>
          <div className="text-sm mt-1" style={{ color: '#8b90a7' }}>Release players to see them here, or wait for the offseason.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {freeAgents.map(p => {
            const mv  = marketValue(p.ratings.overall);
            const exc = getException(mv, salary, mleUsed);
            const canSign = exc !== null;
            const excColor = exc ? EXCEPTION_COLOR[exc] : '#6b7280';
            const excLabel = exc ? EXCEPTION_LABEL[exc] : 'No Exception';
            const canSignTwoWay = p.ratings.overall < 70 && twoWayCount < 2;
            const priority = p.freeAgencyPriority ?? 'balanced';
            const priorityInfo = FA_PRIORITY_LABEL[priority];
            const wasOnTeam = p.teamId === league.userTeamId;
            const interest = interestLevel(priority, userWinPct, mv, mv, wasOnTeam);

            return (
              <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#12151e', border: `1px solid #1e2235` }}>
                <PlayerPhoto seed={p.photoSeed} size={48} name={p.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{p.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#8b90a7' }}>
                    {p.position} • Age {p.age} • Market: ${mv.toFixed(2)}M/yr
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: excColor + '22', color: excColor }}>
                      {excLabel}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: priorityInfo.color + '22', color: priorityInfo.color }}>
                      {priorityInfo.icon} {priorityInfo.label}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: interest.color + '22', color: interest.color }}>
                      {interest.label}
                    </span>
                    {!canSign && (
                      <span className="text-xs" style={{ color: '#6b7280' }}>
                        {overApron ? 'Over hard cap' : mleUsed && mv > VET_MIN ? 'MLE already used' : 'No cap room'}
                      </span>
                    )}
                  </div>
                  {canSignTwoWay && (
                    <div className="text-xs mt-1" style={{ color: '#8b90a7' }}>
                      Does not count against cap · Max 2 per team ({twoWayCount}/2 used)
                    </div>
                  )}
                </div>
                <OverallBadge value={p.ratings.overall} />
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => signFreeAgent(p.id)}
                    disabled={!canSign}
                    className="px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: canSign ? excColor : '#1e2235', color: canSign ? '#0a0a0a' : '#6b7280' }}>
                    {canSign ? 'Sign' : 'Blocked'}
                  </button>
                  {canSignTwoWay && (
                    <button
                      onClick={() => signTwoWay(p.id)}
                      className="px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                      style={{ background: '#0e4a2a', color: '#4ade80', border: '1px solid #4ade8044' }}>
                      2-Way
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
