import type { RosterMode } from '../engine/leagueInit';

interface Props {
  onBack: () => void;
  onSelect: (mode: RosterMode) => void;
}

export default function RosterModeSelect({ onBack, onSelect }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: '#080a12' }}>

      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full pointer-events-none float-a"
        style={{ background: 'radial-gradient(circle, #6c63ff08, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none float-b"
        style={{ background: 'radial-gradient(circle, #4ade8008, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10">

        {/* Header */}
        <div className="mb-10 relative">
          <button
            onClick={onBack}
            className="absolute left-0 top-0 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#11131e', color: '#5a6080', border: '1px solid rgba(255,255,255,0.05)' }}>
            ← Back
          </button>
          <div className="text-center pt-1">
            <h1 className="text-4xl font-black tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
              Choose <span style={{ color: '#7c6eff' }}>Rosters</span>
            </h1>
            <p className="text-sm mt-2" style={{ color: '#3d4262' }}>
              Real NBA teams or a fictional generated league — your call.
            </p>
          </div>
        </div>

        {/* Mode cards */}
        <div className="flex flex-col gap-3 fade-in-up">

          {/* Real Rosters */}
          <button
            onClick={() => onSelect('real')}
            className="w-full rounded-2xl p-5 text-left transition-all hover:opacity-95 active:scale-[0.99] relative overflow-hidden group"
            style={{ background: '#0e1020', border: '1px solid #6c63ff33',
                     boxShadow: '0 0 0 0 #6c63ff' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 24px #6c63ff22')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'radial-gradient(circle at top right, #6c63ff12, transparent 70%)' }} />

            <div className="flex items-start gap-4 relative">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: '#6c63ff14', border: '1px solid #6c63ff30' }}>
                🏀
              </div>
              <div className="flex-1">
                <div className="text-base font-black text-white mb-1">Real Rosters</div>
                <div className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  All 30 NBA teams with 2025–26 rosters — real names, accurate ratings, real contracts. Draft classes are AI-generated.
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {['2025–26 season', 'Real names & ratings', 'Accurate contracts'].map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: '#6c63ff18', color: '#a5b4fc', border: '1px solid #6c63ff28' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>

          {/* AI Generated */}
          <button
            onClick={() => onSelect('generated')}
            className="w-full rounded-2xl p-5 text-left transition-all hover:opacity-95 active:scale-[0.99] relative overflow-hidden group"
            style={{ background: '#0e1020', border: '1px solid rgba(255,255,255,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 24px #4ade8018')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'radial-gradient(circle at top right, #4ade8010, transparent 70%)' }} />

            <div className="flex items-start gap-4 relative">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: '#4ade8012', border: '1px solid #4ade8028' }}>
                ✨
              </div>
              <div className="flex-1">
                <div className="text-base font-black text-white mb-1">AI Generated</div>
                <div className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  Fully fictional league with procedurally generated players across all 30 teams. Every save is unique.
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {['Unique every time', 'No real-world bias', 'Sandbox-friendly'].map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: '#4ade8012', color: '#86efac', border: '1px solid #4ade8028' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        </div>

        <p className="text-xs text-center mt-6" style={{ color: '#252840' }}>
          This cannot be changed after starting your save.
        </p>
      </div>
    </div>
  );
}
