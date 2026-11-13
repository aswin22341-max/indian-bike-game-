import React from 'react';
import { MISSIONS } from '../data/missions';
import { MissionDef } from '../types/game';
import { CheckCircle2, Flag, Play, X } from 'lucide-react';

interface MissionModalProps {
  completedIds: string[];
  activeMissionId: string | null;
  onStartMission: (m: MissionDef) => void;
  onCancelMission: () => void;
  onClose: () => void;
}

export const MissionModal: React.FC<MissionModalProps> = ({
  completedIds,
  activeMissionId,
  onStartMission,
  onCancelMission,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/55">
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/15 p-5 shadow-2xl max-h-[85vh] flex flex-col"
        style={{ backgroundColor: 'rgba(11, 15, 23, 0.96)' }}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Flag className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">Open-World Missions</h2>
              <p className="text-xs text-slate-400">
                Completed {completedIds.length} of {MISSIONS.length} challenges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Close missions"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1">
          {MISSIONS.map((m) => {
            const done = completedIds.includes(m.id);
            const active = activeMissionId === m.id;
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  active
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-white/10 bg-slate-900/70'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-bold text-white">{m.title}</span>
                    {done && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-amber-400">
                    {m.region} · {m.timeLimitSec}s Time Limit · +{m.rewardPoints} Stunt Pts
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{m.description}</p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {active ? (
                    <button
                      onClick={() => {
                        onCancelMission();
                        onClose();
                      }}
                      className="rounded-lg border border-red-500/40 bg-red-500/15 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/25 cursor-pointer whitespace-nowrap"
                    >
                      Abort
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onStartMission(m);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Start
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
