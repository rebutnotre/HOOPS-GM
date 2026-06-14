import { useState } from 'react';
import { TEAM_TEMPLATES } from '../engine/teamData';
import { useRipple } from '../components/Ripple';

const CONFERENCES = ['East', 'West'] as const;

interface Props {
  onBack: () => void;
  onStart: (teamId: string) => void;
}

function visibleColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 60 ? '#a78bfa' : hex;
}

export default function TeamSelect({ onBack, onStart }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [conf, setConf] = useState<'East' | 'West'>('East');
  const { addRipple, rippleEls } = useRipple();

  const display = conf === 'East'
    ? TEAM_TEMPLATES.filter(t => t.conference === 'East')
    : TEAM_TEMPLATES.filter(t => t.conference === 'West');

  const selectedTeam = selected ? TEAM_TEMPLATES.find(t => t.id === selected) : null;
  const tc = selectedTeam ? visibleColor(selectedTeam.primaryColor) : '#6c63ff';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: '#080a12' }}>

      {/* Ambient glow from selected team */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(ellipse at top, ${tc}18, transparent 70%)`, opacity: selected ? 1 : 0 }} />

      <div className="w-full max-w-3xl relative z-10">

        {/* Header */}
        <div className="mb-8 text-center relative">
          <button
            onClick={onBack}
            className="absolute left-0 top-1 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#11131e', color: '#5a6080', border: '1px solid rgba(255,255,255,0.05)' }}>
            ← Back
          </button>
          <h1 className="text-4xl font-black tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
            Choose Your <span style={{ color: tc, transition: 'color 0.4s' }}>Team</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: '#3d4262' }}>
            Pick a franchise to build your dynasty
          </p>
        </div>

        {/* Conference toggle */}
        <div className="flex justify-center mb-6">
          <div className="flex rounded-xl overflow-hidden p-0.5 gap-0.5"
            style={{ background: '#11131e', border: '1px solid rgba(255,255,255,0.06)' }}>
            {CONFERENCES.map(c => (
              <button
                key={c}
                onClick={() => setConf(c)}
                className="px-6 py-2 text-sm font-bold rounded-lg transition-all"
                style={{
                  background: conf === c ? '#1e2235' : 'transparent',
                  color: conf === c ? '#fff' : '#3d4262',
                  boxShadow: conf === c ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
                }}>
                {c}ern
              </button>
            ))}
          </div>
        </div>

        {/* Team grid */}
        <div className="grid grid-cols-5 gap-2.5 mb-6">
          {display.map(team => {
            const isSelected = selected === team.id;
            const col = visibleColor(team.primaryColor);
            return (
              <button
                key={team.id}
                onClick={() => setSelected(team.id)}
                className="flex flex-col items-center p-3 rounded-xl transition-all relative overflow-hidden group"
                style={{
                  background: isSelected ? `${col}1a` : '#0e1020',
                  border: `1.5px solid ${isSelected ? col + '60' : 'rgba(255,255,255,0.04)'}`,
                  boxShadow: isSelected ? `0 0 20px ${col}30, 0 4px 12px rgba(0,0,0,0.4)` : 'none',
                  transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                }}>

                {/* Ambient glow for selected */}
                {isSelected && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${col}20, transparent 70%)` }} />
                )}

                <div className="text-lg font-black mb-1 relative" style={{ color: isSelected ? col : '#4a5070' }}>
                  {team.abbreviation}
                </div>
                <div className="text-xs font-semibold leading-tight text-center relative"
                  style={{ color: isSelected ? '#e8eaf0' : '#5a6080' }}>
                  {team.city}
                </div>
                <div className="text-xs leading-tight text-center relative opacity-70"
                  style={{ color: isSelected ? '#c5c9d8' : '#3d4262' }}>
                  {team.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected team detail */}
        <div className="mb-6 text-center h-8 flex items-center justify-center transition-all">
          {selectedTeam ? (
            <div className="fade-in-up flex items-center gap-3">
              <div className="w-px h-4" style={{ background: `${tc}66` }} />
              <div>
                <span className="font-black text-white text-lg">{selectedTeam.city} {selectedTeam.name}</span>
                <span className="text-sm ml-2" style={{ color: '#3d4262' }}>
                  {selectedTeam.conference}ern · {selectedTeam.division}
                </span>
              </div>
              <div className="w-px h-4" style={{ background: `${tc}66` }} />
            </div>
          ) : (
            <span className="text-sm" style={{ color: '#2a2e3e' }}>Select a team above</span>
          )}
        </div>

        {/* Start button */}
        <div className="flex justify-center">
          <button
            onClick={(e) => { addRipple(e); if (selected) onStart(selected); }}
            disabled={!selected}
            className="px-12 py-3.5 rounded-xl font-black text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed relative overflow-hidden"
            style={{
              background: selected
                ? `linear-gradient(135deg, ${tc}, ${tc}cc)`
                : 'linear-gradient(135deg, #1e2235, #252840)',
              color: '#fff',
              boxShadow: selected ? `0 8px 24px ${tc}44` : 'none',
              transition: 'all 0.3s ease',
            }}>
            {rippleEls}
            Start Season →
          </button>
        </div>
      </div>
    </div>
  );
}
