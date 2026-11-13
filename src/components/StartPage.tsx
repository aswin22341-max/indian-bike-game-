import React from 'react';
import { BikeSpec } from '../types/game';
import { Flag, Play, Store } from 'lucide-react';

interface StartPageProps {
  selectedBike: BikeSpec;
  onStartRiding: () => void;
  onOpenShowroom: () => void;
  onOpenMissions: () => void;
}

export const StartPage: React.FC<StartPageProps> = ({
  selectedBike,
  onStartRiding,
  onOpenShowroom,
  onOpenMissions,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-between p-6 sm:p-10 md:p-14"
      style={{
        background:
          'linear-gradient(95deg, rgba(9, 13, 21, 0.94) 0%, rgba(9, 13, 21, 0.78) 44%, rgba(9, 13, 21, 0.18) 100%)',
      }}
    >
      {/* Top Credit Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-medium tracking-wide text-slate-300">
          Open-World Motorcycle Experience
        </div>
        <div
          className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-amber-300"
          style={{ backgroundColor: 'rgba(11, 15, 23, 0.88)' }}
        >
          Developer: Adhvik dev 3th D
        </div>
      </div>

      {/* Main Hero Left Anchor (leaves 3D bike + Indian city clearly visible on right) */}
      <div className="max-w-xl space-y-6 my-auto">
        <div className="space-y-2.5">
          <div className="text-xs font-semibold tracking-wider text-amber-400">
            8 MOTORCYCLES · INTERCONNECTED INDIAN WORLD · STUNTS & MISSIONS
          </div>
          <h1
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.04]"
            style={{ textWrap: 'balance' }}
          >
            INDIAN BIKE RIDER 3D
          </h1>
          <p className="text-sm sm:text-base text-slate-200 font-medium">
            Developer: <span className="text-amber-400 font-semibold">Adhvik dev 3th D</span>
          </p>
        </div>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
          Ride across modern city avenues, elevated flyovers, NH-48 highway, Kerala backwaters,
          Arabian beaches, village lanes, railway crossings, and hilltop temples. Pull wheelies,
          stoppies, drifts, and dismount on foot anytime.
        </p>

        {/* Active Bike Readout */}
        <div
          className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/15 px-4 py-2.5 text-xs"
          style={{ backgroundColor: 'rgba(11, 15, 23, 0.86)' }}
        >
          <span className="text-slate-400">Selected Bike:</span>
          <span className="font-display font-bold text-white text-sm">{selectedBike.name}</span>
          <span className="text-amber-400 font-mono-tech">
            Top Speed {selectedBike.topSpeedKmh} km/h
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={onStartRiding}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg hover:bg-amber-400 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Play className="h-4 w-4 fill-current" />
            Start Riding
          </button>

          <button
            onClick={onOpenShowroom}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: 'rgba(11, 15, 23, 0.86)' }}
          >
            <Store className="h-4 w-4 text-amber-400" />
            Showroom & Rider
          </button>

          <button
            onClick={onOpenMissions}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: 'rgba(11, 15, 23, 0.86)' }}
          >
            <Flag className="h-4 w-4 text-amber-400" />
            Missions
          </button>
        </div>
      </div>

      {/* Bottom Controls Reference Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span><strong className="text-slate-200">WASD / Arrows</strong> Drive & Steer</span>
          <span aria-hidden="true">·</span>
          <span><strong className="text-slate-200">Shift</strong> Wheelie / Sprint</span>
          <span aria-hidden="true">·</span>
          <span><strong className="text-slate-200">Space</strong> Drift / Jump</span>
          <span aria-hidden="true">·</span>
          <span><strong className="text-slate-200">C</strong> Stoppie</span>
          <span aria-hidden="true">·</span>
          <span><strong className="text-slate-200">F</strong> On / Off Bike</span>
          <span aria-hidden="true">·</span>
          <span><strong className="text-slate-200">V</strong> Camera</span>
        </div>
        <div className="text-slate-300 font-medium">
          Created by Adhvik dev 3th D
        </div>
      </div>
    </div>
  );
};
