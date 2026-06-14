interface Props {
  onBack: () => void;
  onSelect: (mode: 'classic' | 'fantasy', autoFantasy?: boolean) => void;
}

export default function DraftModeSelect({ onBack, onSelect }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: '#080a12' }}>

      {/* Ambient orbs */}
      <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none float-a"
        style={{ background: 'radial-gradient(circle, #f59e0b08, transparent 70%)' }} />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none float-b"
        style={{ background: 'radial-gradient(circle, #6c63ff08, transparent 70%)' }} />

      <div className="w-full max-w-lg relative z-10">

        {/* Header */}
        <div className="mb-10 relative">
          <button
            onClick={onBack}
            className="absolute left-0 top-0 text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#131628', color: '#8b90a7', border: '1px solid rgba(255,255,255,0.05)' }}>
            ← Back
          </button>
          <div className="text-center pt-1">
            <h1 className="text-4xl font-black tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
              Draft <span style={{ color: '#f59e0b' }}>Mode</span>
            </h1>
            <p className="text-sm mt-2" style={{ color: '#3d4262' }}>
              How should player rosters be determined?
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 fade-in-up">

          {/* Classic */}
          <button
            onClick={() => onSelect('classic')}
            className="w-full rounded-2xl p-5 text-left transition-all hover:opacity-95 active:scale-[0.99] relative overflow-hidden group"
            style={{ background: '#0e1020', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 24px #6c63ff15')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: '#6c63ff14', border: '1px solid #6c63ff28' }}>
                📋
              </div>
              <div className="flex-1">
                <div className="text-base font-black text-white mb-1">Classic Start</div>
                <div className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  Teams keep their existing rosters. Jump straight into the season with rosters as-is.
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {['Pre-built rosters', 'Instant start', 'Traditional'].map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: '#6c63ff15', color: '#a5b4fc', border: '1px solid #6c63ff25' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>

          {/* Fantasy Draft */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #f59e0b35', background: '#0e1020' }}>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: '#f59e0b14', border: '1px solid #f59e0b28' }}>
                  🏆
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-base font-black text-white">Fantasy Draft</div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: '#f59e0b18', color: '#f59e0b', border: '1px solid #f59e0b30' }}>
                      NEW
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed mb-4" style={{ color: '#6b7280' }}>
                    All players go into a pool. Every team drafts their roster from scratch in a {13}-round snake draft. You pick when it's your turn — CPU handles the rest.
                  </div>
                  <div className="mb-4 flex gap-2 flex-wrap">
                    {['Snake draft', '13 rounds', 'All players available', 'CPU auto-picks'].map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: '#f59e0b12', color: '#fcd34d', border: '1px solid #f59e0b25' }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Two sub-options */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSelect('fantasy', false)}
                      className="py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-[0.98] relative overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000' }}>
                      ✋ Manual Draft
                      <div className="text-xs font-normal opacity-70 mt-0.5">You pick live</div>
                    </button>
                    <button
                      onClick={() => onSelect('fantasy', true)}
                      className="py-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: '#1a1e35', color: '#c5c9d8', border: '1px solid #252840' }}>
                      ⚡ Auto Draft
                      <div className="text-xs font-normal opacity-60 mt-0.5">Simulate instantly</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <p className="text-xs text-center mt-6" style={{ color: '#252840' }}>
          Draft mode cannot be changed after starting your save.
        </p>
      </div>
    </div>
  );
}
