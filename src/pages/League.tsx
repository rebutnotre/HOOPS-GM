import { useLeagueStore } from '../store/leagueStore';
import PlayerPhoto from '../components/PlayerPhoto';
import { OverallBadge } from '../components/RatingBar';
import { getTeamCategory } from '../utils/teamCategory';

export default function League() {
  const league = useLeagueStore(s => s.league);
  if (!league) return null;

  // League leaders
  const allPlayers = Object.values(league.players).filter(p => p.teamId && p.seasonStats.gamesPlayed >= 3);
  const ppgLeaders = [...allPlayers].sort((a, b) => (b.seasonStats.points / b.seasonStats.gamesPlayed) - (a.seasonStats.points / a.seasonStats.gamesPlayed)).slice(0, 5);
  const rpgLeaders = [...allPlayers].sort((a, b) => (b.seasonStats.rebounds / b.seasonStats.gamesPlayed) - (a.seasonStats.rebounds / a.seasonStats.gamesPlayed)).slice(0, 5);
  const apgLeaders = [...allPlayers].sort((a, b) => (b.seasonStats.assists / b.seasonStats.gamesPlayed) - (a.seasonStats.assists / a.seasonStats.gamesPlayed)).slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6">League Overview</h1>

      {allPlayers.length < 5 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: '#12151e', border: '1px solid #1e2235' }}>
          <div className="text-3xl mb-2">📊</div>
          <div className="text-white font-bold">Advance a few weeks to see league leaders</div>
          <div className="text-sm mt-1" style={{ color: '#8b90a7' }}>Stats populate after games are played.</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {[
            { title: 'Points Per Game', players: ppgLeaders, stat: (p: typeof allPlayers[0]) => (p.seasonStats.points / p.seasonStats.gamesPlayed).toFixed(1), unit: 'PPG' },
            { title: 'Rebounds Per Game', players: rpgLeaders, stat: (p: typeof allPlayers[0]) => (p.seasonStats.rebounds / p.seasonStats.gamesPlayed).toFixed(1), unit: 'RPG' },
            { title: 'Assists Per Game', players: apgLeaders, stat: (p: typeof allPlayers[0]) => (p.seasonStats.assists / p.seasonStats.gamesPlayed).toFixed(1), unit: 'APG' },
          ].map(cat => (
            <div key={cat.title} className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2235' }}>
              <div className="px-4 py-3" style={{ background: '#12151e' }}>
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6c63ff' }}>{cat.title}</div>
              </div>
              <div>
                {cat.players.map((p, i) => {
                  const team = p.teamId ? league.teams[p.teamId] : null;
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#1e2235' }}>
                      <span className="text-xs w-4" style={{ color: '#8b90a7' }}>{i + 1}</span>
                      <PlayerPhoto seed={p.photoSeed} size={32} name={p.name} teamColor={team?.primaryColor} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                        <div className="text-xs" style={{ color: '#8b90a7' }}>{team?.abbreviation} • {p.position}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-white">{cat.stat(p)}</div>
                        <div className="text-xs" style={{ color: '#8b90a7' }}>{cat.unit}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All teams overview */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-4">All Teams</h2>
        <div className="grid grid-cols-3 gap-3">
          {Object.values(league.teams).sort((a, b) => b.stats.wins - a.stats.wins).map(team => {
            const stars = team.rosterIds.map(id => league.players[id]).filter(Boolean).sort((a, b) => b.ratings.overall - a.ratings.overall).slice(0, 2);
            const isUser = team.id === league.userTeamId;
            const cat = getTeamCategory(team, league.players);
            return (
              <div key={team.id} className="p-4 rounded-xl" style={{ background: '#12151e', border: `1px solid ${isUser ? '#6c63ff44' : '#1e2235'}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ background: team.primaryColor }} />
                  <div className="font-bold text-sm text-white truncate">{team.city} {team.name}</div>
                  {isUser && <span className="text-xs px-1 py-0.5 rounded shrink-0" style={{ background: '#6c63ff22', color: '#6c63ff' }}>YOU</span>}
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                    style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                  <div className="ml-auto text-xs font-mono" style={{ color: '#8b90a7' }}>{team.stats.wins}–{team.stats.losses}</div>
                </div>
                <div className="flex gap-2">
                  {stars.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <PlayerPhoto seed={p.photoSeed} size={24} name={p.name} teamColor={team.primaryColor} />
                      <span className="text-xs text-white">{p.name.split(' ')[1] ?? p.name}</span>
                      <OverallBadge value={p.ratings.overall} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
