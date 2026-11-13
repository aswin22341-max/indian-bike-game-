import React, { useState } from 'react';
import {
  Camera,
  Flag,
  Gamepad2,
  Lightbulb,
  RotateCcw,
  Store,
  Sun,
  Volume2,
  VolumeX,
  HelpCircle,
} from 'lucide-react';
import { HudSnapshot, TimeOfDay, TouchInputState } from '../types/game';
import { MiniMap } from './MiniMap';

interface GameHUDProps {
  hud: HudSnapshot;
  bikeName: string;
  onOpenShowroom: () => void;
  onOpenMissions: () => void;
  onCycleCamera: () => void;
  onCycleTimeOfDay: () => void;
  onToggleHeadlights: () => void;
  onToggleMute: () => void;
  onToggleMount: () => void;
  onHonk: () => void;
  onResetRoad: () => void;
  onCancelMission: () => void;
  onTouchChange: (partial: Partial<TouchInputState>) => void;
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Daylight',
  sunset: 'Sunset',
  night: 'Night',
};

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  bikeName,
  onOpenShowroom,
  onOpenMissions,
  onCycleCamera,
  onCycleTimeOfDay,
  onToggleHeadlights,
  onToggleMute,
  onToggleMount,
  onHonk,
  onResetRoad,
  onCancelMission,
  onTouchChange,
}) => {
  const [showTouch, setShowTouch] = useState<boolean>(() =>
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
  const [showControlsHelp, setShowControlsHelp] = useState(false);

  const touchBtn = (
    label: string,
    field: keyof TouchInputState,
    className: string
  ) => (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onTouchChange({ [field]: true });
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onTouchChange({ [field]: false });
      }}
      onPointerLeave={() => onTouchChange({ [field]: false })}
      onPointerCancel={() => onTouchChange({ [field]: false })}
      className={`select-none rounded-xl border border-white/20 font-display font-bold active:scale-95 transition-transform ${className}`}
      style={{ backgroundColor: 'rgba(11, 15, 23, 0.82)' }}
    >
      {label}
    </button>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* TOP BAR ROW */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: MiniMap + Title & Zone */}
        <div className="pointer-events-auto flex items-start gap-3">
          <div className="hidden sm:block">
            <MiniMap
              playerX={hud.playerX}
              playerZ={hud.playerZ}
              playerHeading={hud.playerHeading}
              bikeX={hud.bikeX}
              bikeZ={hud.bikeZ}
              isOnBike={hud.isOnBike}
              activeMission={hud.activeMission}
            />
          </div>
          <div
            className="rounded-xl border border-white/15 px-3.5 py-2.5 shadow-lg"
            style={{ backgroundColor: 'rgba(11, 15, 23, 0.88)' }}
          >
            <div className="font-display text-sm sm:text-base font-bold tracking-wide text-amber-400 whitespace-nowrap">
              INDIAN BIKE RIDER 3D
            </div>
            <div className="text-[11px] text-slate-300 font-medium mt-0.5">
              Developer: Adhvik dev 3th D
            </div>
            <div className="text-xs text-slate-200 font-medium mt-0.5">{hud.currentZone}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono-tech">
              Score {hud.stuntScore.toLocaleString()}
              {hud.comboMultiplier > 1 ? ` · ${hud.comboMultiplier}x Combo` : ''}
            </div>
          </div>
        </div>

        {/* Top-Center: Active Mission Banner */}
        {hud.activeMission && (
          <div
            className="pointer-events-auto hidden md:flex items-center gap-4 rounded-xl border border-amber-400/40 px-4 py-2.5 shadow-lg"
            style={{ backgroundColor: 'rgba(11, 15, 23, 0.92)' }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-amber-400">
                  {hud.activeMission.mission.title}
                </span>
                {hud.activeMission.status === 'completed' && (
                  <span className="text-xs font-bold text-emerald-400">MISSION COMPLETE!</span>
                )}
                {hud.activeMission.status === 'failed' && (
                  <span className="text-xs font-bold text-red-400">TIME UP!</span>
                )}
              </div>
              <div className="text-xs text-slate-200 mt-0.5">
                {hud.activeMission.mission.type === 'checkpoint' &&
                  hud.activeMission.mission.checkpoints[hud.activeMission.currentCheckpointIndex] &&
                  `Next: ${
                    hud.activeMission.mission.checkpoints[hud.activeMission.currentCheckpointIndex].label
                  } (${hud.activeMission.currentCheckpointIndex + 1}/${
                    hud.activeMission.mission.checkpoints.length
                  })`}
                {hud.activeMission.mission.type === 'stunt' &&
                  `Stunt Points: ${hud.activeMission.bestAchieved} / ${hud.activeMission.mission.targetScore}`}
                {hud.activeMission.mission.type === 'speed' &&
                  `Best Speed: ${hud.activeMission.bestAchieved} / ${hud.activeMission.mission.targetSpeedKmh} km/h`}
              </div>
            </div>
            <div className="font-mono-tech text-lg font-bold text-white border-l border-white/15 pl-3">
              {Math.ceil(hud.activeMission.timeLeftSec)}s
            </div>
            <button
              onClick={onCancelMission}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* Top-Right: Action Toolbar */}
        <div
          className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 rounded-xl border border-white/15 p-1.5 shadow-lg"
          style={{ backgroundColor: 'rgba(11, 15, 23, 0.88)' }}
        >
          <button
            onClick={onOpenShowroom}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Store className="h-3.5 w-3.5" />
            Showroom
          </button>
          <button
            onClick={onOpenMissions}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Flag className="h-3.5 w-3.5 text-amber-400" />
            Missions
          </button>
          <button
            onClick={onCycleCamera}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
            title="Switch Camera (V)"
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden lg:inline capitalize">{hud.cameraMode}</span>
          </button>
          <button
            onClick={onCycleTimeOfDay}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
            title="Time of Day"
          >
            <Sun className="h-3.5 w-3.5 text-amber-300" />
            <span className="hidden lg:inline">{TIME_LABELS[hud.timeOfDay]}</span>
          </button>
          <button
            onClick={onToggleHeadlights}
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
              hud.headlightsOn ? 'text-amber-300 bg-amber-500/15' : 'text-slate-400 hover:bg-white/10'
            }`}
            title="Headlights (L)"
          >
            <Lightbulb className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowTouch((v) => !v)}
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
              showTouch ? 'text-cyan-300 bg-cyan-500/15' : 'text-slate-400 hover:bg-white/10'
            }`}
            title="Toggle On-Screen Touch Controls"
          >
            <Gamepad2 className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleMute}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 cursor-pointer"
            title="Mute / Unmute"
          >
            {hud.muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onResetRoad}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 cursor-pointer"
            title="Reset to City Road (R)"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowControlsHelp((v) => !v)}
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
              showControlsHelp ? 'text-amber-300 bg-amber-500/15' : 'text-slate-300 hover:bg-white/10'
            }`}
            title="Controls Guide"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CENTER STUNT POPUPS & NOTIFICATIONS (non-blocking) */}
      <div className="flex flex-col items-center justify-center gap-1.5">
        {hud.activeStuntLabel && (
          <div className="font-display text-2xl font-bold tracking-wider text-amber-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {hud.activeStuntLabel}
            {hud.wheelieAngleDeg > 10 ? ` · ${hud.wheelieAngleDeg}°` : ''}
            {hud.stoppieAngleDeg > 10 ? ` · ${hud.stoppieAngleDeg}°` : ''}
          </div>
        )}
        {hud.recentStunts.slice(0, 2).map((s) => (
          <div
            key={s.id}
            className="rounded-lg border border-amber-400/35 px-3 py-1 text-xs font-bold text-white shadow"
            style={{ backgroundColor: 'rgba(11, 15, 23, 0.85)' }}
          >
            {s.label} <span className="text-amber-400 font-mono-tech">+{s.points}</span>
          </div>
        ))}
        {hud.isRefueling && (
          <div
            className="rounded-lg border border-sky-400/40 px-3 py-1 text-xs font-semibold text-sky-300"
            style={{ backgroundColor: 'rgba(11, 15, 23, 0.88)' }}
          >
            Refueling at Bharat Fuel Pump ({hud.fuelLevel}%)
          </div>
        )}
        {!hud.isOnBike && hud.canMountBike && (
          <button
            onClick={onToggleMount}
            className="pointer-events-auto rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-lg hover:bg-amber-400 cursor-pointer"
          >
            Press F or Tap to Mount {bikeName}
          </button>
        )}
      </div>

      {/* Controls Quick Popover */}
      {showControlsHelp && (
        <div
          className="pointer-events-auto self-end rounded-xl border border-white/15 p-3.5 text-xs text-slate-200 shadow-2xl max-w-xs"
          style={{ backgroundColor: 'rgba(11, 15, 23, 0.95)' }}
        >
          <div className="font-display font-bold text-amber-400 mb-2">Controls</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-slate-400">W / ↑</span><span>Throttle / Walk</span>
            <span className="text-slate-400">S / ↓</span><span>Brake / Reverse</span>
            <span className="text-slate-400">A D / ← →</span><span>Steer & Lean</span>
            <span className="text-slate-400">Shift</span><span>Wheelie / Sprint</span>
            <span className="text-slate-400">Space</span><span>Drift / Jump</span>
            <span className="text-slate-400">C / Ctrl</span><span>Stoppie</span>
            <span className="text-slate-400">F</span><span>Get On / Off Bike</span>
            <span className="text-slate-400">V / L / H</span><span>Cam / Lights / Horn</span>
            <span className="text-slate-400">G / R</span><span>Showroom / Reset</span>
          </div>
        </div>
      )}

      {/* BOTTOM ROW: Touch Controls OR Compact Key Hints + Speedometer */}
      <div className="flex items-end justify-between gap-3">
        {/* Bottom-Left: Touch Steering or Compact Key Hint */}
        {showTouch ? (
          <div className="pointer-events-auto flex items-center gap-2">
            {touchBtn('◀', 'left', 'h-14 w-14 text-xl text-white')}
            {touchBtn('▶', 'right', 'h-14 w-14 text-xl text-white')}
            <button
              onClick={onToggleMount}
              className="rounded-xl border border-white/20 px-3 h-14 text-xs font-bold text-amber-300"
              style={{ backgroundColor: 'rgba(11, 15, 23, 0.85)' }}
            >
              {hud.isOnBike ? 'Get Off' : 'Mount'}
            </button>
            <button
              onClick={onHonk}
              className="rounded-xl border border-white/20 px-3 h-14 text-xs font-bold text-slate-200"
              style={{ backgroundColor: 'rgba(11, 15, 23, 0.85)' }}
            >
              Horn
            </button>
          </div>
        ) : (
          <div
            className="pointer-events-auto hidden md:flex items-center gap-3 rounded-xl border border-white/15 px-3.5 py-2 text-[11px] text-slate-300"
            style={{ backgroundColor: 'rgba(11, 15, 23, 0.84)' }}
          >
            <span>WASD Drive</span>
            <span aria-hidden="true">·</span>
            <span>Shift Wheelie</span>
            <span aria-hidden="true">·</span>
            <span>Space Drift</span>
            <span aria-hidden="true">·</span>
            <button onClick={onToggleMount} className="text-amber-400 font-semibold hover:underline cursor-pointer">
              [F] {hud.isOnBike ? 'Dismount' : 'Mount Bike'}
            </button>
            <span aria-hidden="true">·</span>
            <button onClick={onHonk} className="text-slate-200 hover:text-amber-300 cursor-pointer">
              [H] Horn
            </button>
          </div>
        )}

        {/* Bottom-Right: Digital Speedometer + Touch Gas/Brake */}
        <div className="pointer-events-auto flex items-end gap-3">
          {showTouch && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 justify-end">
                {touchBtn('WHEELIE', 'wheelie', 'px-3 h-10 text-[11px] text-amber-300')}
                {touchBtn(hud.isOnBike ? 'DRIFT' : 'JUMP', hud.isOnBike ? 'drift' : 'jump', 'px-3 h-10 text-[11px] text-cyan-300')}
              </div>
              <div className="flex gap-2">
                {touchBtn('BRAKE', 'brake', 'h-14 w-20 text-xs text-red-400')}
                {touchBtn('GAS', 'throttle', 'h-14 w-24 text-sm text-emerald-400')}
              </div>
            </div>
          )}

          {/* Speedometer Cluster */}
          <div
            className="rounded-2xl border border-white/15 px-4 py-3 shadow-xl min-w-[180px]"
            style={{ backgroundColor: 'rgba(11, 15, 23, 0.90)' }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono-tech text-3xl sm:text-4xl font-bold text-white leading-none">
                  {hud.isOnBike ? hud.speedKmh : 'FOOT'}
                </span>
                {hud.isOnBike && <span className="text-[11px] text-slate-400 font-semibold">KM/H</span>}
              </div>
              {hud.isOnBike && (
                <div className="font-display text-lg font-bold text-amber-400 leading-none">
                  {hud.gear}
                </div>
              )}
            </div>

            {/* RPM Bar */}
            {hud.isOnBike && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    hud.rpmRatio > 0.85 ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.round(hud.rpmRatio * 100)}%` }}
                />
              </div>
            )}

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate max-w-[125px] text-slate-300">{bikeName}</span>
              <span className="font-mono-tech">Fuel {hud.fuelLevel}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
