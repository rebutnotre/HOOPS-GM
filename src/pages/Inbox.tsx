import { useLeagueStore } from '../store/leagueStore';
import type { Notification } from '../types';
import PlayerTradeCard from '../components/PlayerTradeCard';

const TYPE_ICONS: Record<Notification['type'], string> = {
  game: '🏀', trade: '🔄', injury: '🩹', contract: '📝', championship: '🏆', general: '📢',
};
const TYPE_COLORS: Record<Notification['type'], string> = {
  game: '#6c63ff', trade: '#34d399', injury: '#f87171', contract: '#f59e0b', championship: '#fbbf24', general: '#8b90a7',
};

export default function Inbox() {
  const league = useLeagueStore(s => s.league);
  const markNotificationsRead = useLeagueStore(s => s.markNotificationsRead);
  const acceptIncomingOffer = useLeagueStore(s => s.acceptIncomingOffer);
  const declineIncomingOffer = useLeagueStore(s => s.declineIncomingOffer);

  if (!league) return null;

  const notifications = (league.notifications ?? []).slice().sort((a, b) => b.id.localeCompare(a.id));
  const unread = notifications.filter(n => !n.read).length;
  const pendingOffers = (league.incomingOffers ?? []).filter(o => o.status === 'pending');

  return (
    <div className="space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Inbox</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
            {unread > 0 ? `${unread} unread` : 'All caught up'}
            {pendingOffers.length > 0 && ` · ${pendingOffers.length} trade offer${pendingOffers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markNotificationsRead}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
            style={{ background: '#1e2235', color: '#8b90a7' }}>
            Mark all read
          </button>
        )}
      </div>

      {/* Incoming trade offers */}
      {pendingOffers.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-black uppercase tracking-widest" style={{ color: '#34d399' }}>
            🔄 Trade Offers ({pendingOffers.length})
          </div>
          {pendingOffers.map(offer => {
            const fromTeam = league.teams[offer.fromTeamId];
            const offeredPlayers = offer.offeredPlayerIds.map(id => league.players[id]).filter(Boolean);
            const wantedPlayers = offer.wantedPlayerIds.map(id => league.players[id]).filter(Boolean);
            const daysLeft = offer.expiresDay - league.week;

            return (
              <div key={offer.id} className="rounded-xl p-4 card-lift"
                style={{ background: '#0d1a14', border: '1px solid #34d39944' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                    style={{ background: (fromTeam?.primaryColor ?? '#34d399') + '22' }}>
                    🔄
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-black text-white">{fromTeam?.city} {fromTeam?.name}</div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#34d39922', color: '#34d399' }}>OFFER</span>
                </div>

                {/* Net OVR summary */}
                {(offeredPlayers.length > 0 || wantedPlayers.length > 0) && (() => {
                  const recOvr = offeredPlayers.reduce((s, p) => s + p.ratings.overall, 0);
                  const giveOvr = wantedPlayers.reduce((s, p) => s + p.ratings.overall, 0);
                  const delta = recOvr - giveOvr;
                  const sign = delta > 0 ? '+' : '';
                  return (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-2"
                      style={{ background: '#1e2235' }}>
                      <span className="text-xs font-semibold" style={{ color: '#8b90a7' }}>Net OVR change</span>
                      <span className="text-sm font-black" style={{ color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#facc15' }}>
                        {sign}{delta} OVR
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs font-bold mb-1.5" style={{ color: '#34d399' }}>You receive</div>
                    <div className="space-y-2">
                      {offeredPlayers.map((p, i) => (
                        <PlayerTradeCard key={p.id} player={p} side="receive"
                          comparePlayer={wantedPlayers[i] ?? wantedPlayers[0]} />
                      ))}
                      {offer.offeredPicks.map((pk, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs"
                          style={{ background: '#0f1e16', border: '1px solid #34d39922' }}>
                          <span>🎯</span>
                          <span className="text-white">{pk.year} R{pk.round}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold mb-1.5" style={{ color: '#f87171' }}>You give up</div>
                    <div className="space-y-2">
                      {wantedPlayers.map((p, i) => (
                        <PlayerTradeCard key={p.id} player={p} side="give"
                          comparePlayer={offeredPlayers[i] ?? offeredPlayers[0]} />
                      ))}
                      {offer.wantedPicks.map((pk, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs"
                          style={{ background: '#1a0f0f', border: '1px solid #f8717122' }}>
                          <span>🎯</span>
                          <span className="text-white">{pk.year} R{pk.round}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => acceptIncomingOffer(offer.id)}
                    className="flex-1 py-2 rounded-lg text-xs font-black transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#065f46,#047857)', color: '#34d399' }}>
                    Accept Trade
                  </button>
                  <button onClick={() => declineIncomingOffer(offer.id)}
                    className="flex-1 py-2 rounded-lg text-xs font-black transition-all hover:opacity-90 active:scale-95"
                    style={{ background: '#1e2235', color: '#8b90a7' }}>
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notifications */}
      {notifications.length === 0 && pendingOffers.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#0d0f17', border: '1px solid #1e2235' }}>
          <div className="text-4xl mb-3">📭</div>
          <div className="font-bold text-white">No notifications yet</div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Sim some games to see updates here</div>
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {pendingOffers.length > 0 && (
            <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#8b90a7' }}>
              Notifications
            </div>
          )}
          {notifications.map(n => {
            const color = TYPE_COLORS[n.type];
            const icon = TYPE_ICONS[n.type];
            return (
              <div key={n.id} className="rounded-xl p-4 card-lift transition-all"
                style={{
                  background: n.read ? '#0d0f17' : '#0f1220',
                  border: `1px solid ${n.read ? '#1e2235' : color + '44'}`,
                  opacity: n.read ? 0.75 : 1,
                }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                    style={{ background: color + '22' }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-white leading-tight">{n.title}</div>
                      {!n.read && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
                    </div>
                    <div className="text-xs mt-1 leading-relaxed" style={{ color: '#8b90a7' }}>{n.body}</div>
                    <div className="text-xs mt-1.5 font-medium" style={{ color: '#4b5563' }}>{n.date}</div>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0 uppercase"
                    style={{ background: color + '22', color }}>
                    {n.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
