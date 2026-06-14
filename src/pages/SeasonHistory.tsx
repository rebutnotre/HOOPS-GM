import { useLeagueStore } from '../store/leagueStore';

export default function SeasonHistory() {
  const league = useLeagueStore(s => s.league);
  if (!league) return null;

  const history = [...(league.seasonHistory ?? [])].reverse();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Season History</h1>
        <p className="text-sm mt-1" style={{ color: '#8b90a7' }}>A record of every season you've managed.</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
          <div className="text-4xl mb-3">📜</div>
          <div className="text-white font-bold">No history yet</div>
          <div className="text-sm mt-1" style={{ color: '#8b90a7' }}>Complete a season to see your history here.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(record => {
            const isChamp = record.userResult === '🏆 Champions';
            const winPct = record.wins + record.losses > 0 ? (record.wins / (record.wins + record.losses) * 100).toFixed(0) : '0';
            const resultColor = isChamp ? '#f59e0b' : record.userResult.includes('Finals') ? '#6c63ff' : record.userResult.includes('Conf.') ? '#34d399' : record.userResult.includes('Eliminated') ? '#facc15' : '#6b7280';

            return (
              <div
                key={record.season}
                className="rounded-xl p-5"
                style={{
                  background: '#12151e',
                  border: `1px solid ${isChamp ? '#f59e0b55' : '#1e2235'}`,
                  boxShadow: isChamp ? '0 0 20px #f59e0b22' : undefined,
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {isChamp && <span className="text-2xl">🏆</span>}
                    <div>
                      <div className="text-lg font-black text-white">{record.season} Season</div>
                      <div className="text-sm font-bold" style={{ color: '#8b90a7' }}>
                        {record.wins}–{record.losses} · {winPct}%
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: resultColor + '22', color: resultColor }}>
                    {record.userResult}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div style={{ color: '#8b90a7' }} className="mb-0.5">Champion</div>
                    <div className="font-semibold text-white">{record.champion}</div>
                  </div>
                  {record.mvp && (
                    <div>
                      <div style={{ color: '#8b90a7' }} className="mb-0.5">MVP</div>
                      <div className="font-semibold text-white">{record.mvp}</div>
                    </div>
                  )}
                  {record.topScorer && (
                    <div>
                      <div style={{ color: '#8b90a7' }} className="mb-0.5">Scoring Champ</div>
                      <div className="font-semibold text-white">{record.topScorer}</div>
                    </div>
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
