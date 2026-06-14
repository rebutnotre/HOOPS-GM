import type { LeagueSettings } from '../types';

const DIFFICULTY_OPTIONS: { value: LeagueSettings['difficulty']; label: string; desc: string; color: string }[] = [
  { value: 'easy',   label: 'Easy',   desc: 'Relaxed trading, high morale stability', color: '#4ade80' },
  { value: 'normal', label: 'Normal', desc: 'Balanced — recommended for first playthrough', color: '#6c63ff' },
  { value: 'hard',   label: 'Hard',   desc: 'Strict AI trades, more morale volatility', color: '#f59e0b' },
  { value: 'legend', label: 'Legend', desc: 'Hardest AI, volatile morale, cap enforcement', color: '#f87171' },
];

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
      style={{ background: enabled ? '#6c63ff' : '#1e2235' }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: enabled ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

function SegmentedControl<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#0d0f17', border: '1px solid #1e2235' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex-1 py-1.5 rounded-md text-xs font-black transition-all"
          style={
            value === opt.value
              ? { background: '#6c63ff', color: '#fff', boxShadow: '0 1px 6px #6c63ff55' }
              : { background: 'transparent', color: '#8b90a7' }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface Props {
  settings: LeagueSettings;
  onChange: (s: Partial<LeagueSettings>) => void;
  onBack: () => void;
  onStart: () => void;
}

function Section({ title }: { title: string }) {
  return (
    <div className="text-xs font-black uppercase tracking-widest mt-6 mb-3" style={{ color: '#6b7280' }}>{title}</div>
  );
}

function Row({ label, desc, children, last }: { label: string; desc: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 gap-4"
      style={{ borderBottom: last ? undefined : '1px solid #1a1d2e' }}
    >
      <div className="min-w-0">
        <div className="text-sm font-bold text-white">{label}</div>
        <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function NewGameSettings({ settings, onChange, onBack, onStart }: Props) {
  const tog = (key: keyof LeagueSettings) => onChange({ [key]: !settings[key] } as Partial<LeagueSettings>);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: '#080a12' }}>
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-6 relative">
          <button
            onClick={onBack}
            className="absolute left-0 top-1 text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#1e2235', color: '#8b90a7' }}>
            ← Back
          </button>
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight text-white">League <span style={{ color: '#6c63ff' }}>Settings</span></h1>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Customize before your first season tips off.</p>
          </div>
        </div>

        {/* Difficulty */}
        <Section title="Difficulty" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          {DIFFICULTY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ difficulty: opt.value })}
              className="rounded-xl p-4 text-left transition-all hover:opacity-90"
              style={{
                background: settings.difficulty === opt.value ? `${opt.color}18` : '#12151e',
                border: `1px solid ${settings.difficulty === opt.value ? opt.color : '#1e2235'}`,
              }}
            >
              <div className="text-sm font-black mb-1" style={{ color: opt.color }}>{opt.label}</div>
              <div className="text-xs" style={{ color: '#6b7280' }}>{opt.desc}</div>
            </button>
          ))}
        </div>

        {/* Core Rules */}
        <Section title="Core Rules" />
        <div className="rounded-2xl overflow-hidden mb-2" style={{ border: '1px solid #1e2235' }}>
          <Row label="Injuries" desc="Players miss games when injured.">
            <Toggle enabled={settings.injuriesEnabled} onToggle={() => tog('injuriesEnabled')} />
          </Row>
          <Row label="Salary Cap" desc="Enforce the $145M cap, with MLE and vet minimum exceptions.">
            <Toggle enabled={settings.salaryCapEnabled} onToggle={() => tog('salaryCapEnabled')} />
          </Row>
          <Row label="Contract Enforcement" desc="AI teams must also respect cap rules.">
            <Toggle enabled={settings.contractEnforcement} onToggle={() => tog('contractEnforcement')} />
          </Row>
          <Row label="Team Chemistry" desc="Chemistry boosts or hurts performance.">
            <Toggle enabled={settings.chemistryEnabled} onToggle={() => tog('chemistryEnabled')} />
          </Row>
          <Row label="Morale System" desc="Wins/losses affect player morale.">
            <Toggle enabled={settings.moraleSystem} onToggle={() => tog('moraleSystem')} />
          </Row>
          <Row label="Player Regression" desc="Veterans decline with age.">
            <Toggle enabled={settings.playerRegression} onToggle={() => tog('playerRegression')} />
          </Row>
          <Row label="Draft Lottery" desc="Bad teams get better odds (off = strict order)." last>
            <Toggle enabled={settings.draftLottery} onToggle={() => tog('draftLottery')} />
          </Row>
        </div>

        {/* Simulation */}
        <Section title="Simulation" />
        <div className="rounded-2xl overflow-hidden mb-2" style={{ border: '1px solid #1e2235' }}>
          <Row label="Sim Speed" desc="How fast days advance during sim.">
            <SegmentedControl
              value={settings.simSpeed}
              options={[{ value: 'slow', label: 'Slow' }, { value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Fast' }, { value: 'instant', label: 'Instant' }]}
              onChange={v => onChange({ simSpeed: v })}
            />
          </Row>
<Row label="Pause on Injuries" desc="Sim stops when a player on your team gets injured.">
            <Toggle enabled={settings.simPauseOnInjuries} onToggle={() => tog('simPauseOnInjuries')} />
          </Row>
          <Row label="Pause on Milestones" desc="Sim stops on notable achievements." last>
            <Toggle enabled={settings.simPauseOnMilestones} onToggle={() => tog('simPauseOnMilestones')} />
          </Row>
        </div>

        {/* League Tuning */}
        <Section title="League Tuning" />
        <div className="rounded-2xl overflow-hidden mb-2" style={{ border: '1px solid #1e2235' }}>
          <Row label="Trade Frequency" desc="How often AI teams propose trades.">
            <SegmentedControl
              value={settings.tradeFrequency}
              options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }]}
              onChange={v => onChange({ tradeFrequency: v })}
            />
          </Row>
          <Row label="Progression Speed" desc="How fast players develop or decline.">
            <SegmentedControl
              value={settings.progressionSpeed}
              options={[{ value: 'slow', label: 'Slow' }, { value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Fast' }]}
              onChange={v => onChange({ progressionSpeed: v })}
            />
          </Row>
          <Row label="Rookie Quality" desc="Strength of incoming draft classes.">
            <SegmentedControl
              value={settings.rookieQuality}
              options={[{ value: 'weak', label: 'Weak' }, { value: 'normal', label: 'Normal' }, { value: 'loaded', label: 'Loaded' }]}
              onChange={v => onChange({ rookieQuality: v })}
            />
          </Row>
          <Row label="Free Agency" desc="How aggressively AI teams sign free agents." last>
            <SegmentedControl
              value={settings.freeAgencyCompetitiveness}
              options={[{ value: 'easy', label: 'Easy' }, { value: 'normal', label: 'Normal' }, { value: 'hard', label: 'Hard' }]}
              onChange={v => onChange({ freeAgencyCompetitiveness: v })}
            />
          </Row>
        </div>

        {/* UI & Misc */}
        <Section title="UI & Notifications" />
        <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid #1e2235' }}>
          <Row label="News Verbosity" desc="How much news appears in your feed.">
            <SegmentedControl
              value={settings.newsVerbosity}
              options={[{ value: 'minimal', label: 'Minimal' }, { value: 'normal', label: 'Normal' }, { value: 'full', label: 'Full' }]}
              onChange={v => onChange({ newsVerbosity: v })}
            />
          </Row>
          <Row label="Auto-Decline Expired Offers" desc="Expired trade offers auto-decline (no inbox clutter).">
            <Toggle enabled={settings.autoDeclineExpiredOffers} onToggle={() => tog('autoDeclineExpiredOffers')} />
          </Row>
          <Row label="Rival Callouts" desc="Show rivalry highlights in news feed." last>
            <Toggle enabled={settings.showRivalCallouts} onToggle={() => tog('showRivalCallouts')} />
          </Row>
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          className="w-full py-4 rounded-xl font-black text-lg transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#6c63ff,#4f46e5)', color: '#fff' }}>
          Start Season →
        </button>
      </div>
    </div>
  );
}
