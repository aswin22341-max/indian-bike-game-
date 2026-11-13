import React, { useState } from 'react';
import { BIKES } from '../data/bikes';
import { BikeSpec, HelmetStyle, OutfitStyle, RiderCustomization } from '../types/game';
import { Check, ChevronLeft, ChevronRight, RotateCw, User, X } from 'lucide-react';

interface ShowroomModalProps {
  selectedBikeId: string;
  selectedColorHex: string;
  riderCustomization: RiderCustomization;
  onSelectBike: (bike: BikeSpec, colorHex: string) => void;
  onChangeColor: (hex: string) => void;
  onChangeRider: (cust: RiderCustomization) => void;
  onRotateTurntable: (delta: number) => void;
  onClose: () => void;
}

const HELMET_STYLES: { id: HelmetStyle; label: string }[] = [
  { id: 'fullface', label: 'Full-Face Pro' },
  { id: 'motocross', label: 'Motocross Peak' },
  { id: 'classic', label: 'Classic Retro' },
  { id: 'none', label: 'Sunglasses Only' },
];

const HELMET_COLORS = ['#f97316', '#dc2626', '#18181b', '#f8fafc', '#0284c7', '#16a34a', '#eab308'];

const OUTFIT_STYLES: { id: OutfitStyle; label: string }[] = [
  { id: 'street', label: 'Mumbai Street' },
  { id: 'racing', label: 'Track Leathers' },
  { id: 'monsoon', label: 'Kerala Monsoon' },
  { id: 'denim', label: 'Highway Denim' },
  { id: 'kurta', label: 'Saffron Festive' },
];

export const ShowroomModal: React.FC<ShowroomModalProps> = ({
  selectedBikeId,
  selectedColorHex,
  riderCustomization,
  onSelectBike,
  onChangeColor,
  onChangeRider,
  onRotateTurntable,
  onClose,
}) => {
  const [tab, setTab] = useState<'bikes' | 'rider'>('bikes');
  const currentIndex = Math.max(
    0,
    BIKES.findIndex((b) => b.id === selectedBikeId)
  );
  const currentBike = BIKES[currentIndex];

  const handleCycle = (dir: -1 | 1) => {
    const nextIdx = (currentIndex + dir + BIKES.length) % BIKES.length;
    const next = BIKES[nextIdx];
    onSelectBike(next, next.defaultColor);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-3 rounded-xl border border-white/15 px-4 py-2.5"
          style={{ backgroundColor: 'rgba(11, 15, 23, 0.92)' }}
        >
          <span className="font-display text-lg font-bold tracking-wide text-amber-400 whitespace-nowrap">
            MOTOVEDA SHOWROOM
          </span>
          <span className="hidden sm:inline text-xs text-slate-400">
            360° Turntable · 8 Indian Motorcycles · Developer: Adhvik dev 3th D
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRotateTurntable(0.8)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: 'rgba(11, 15, 23, 0.92)' }}
          >
            <RotateCw className="h-3.5 w-3.5" />
            Rotate View
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Check className="h-4 w-4" />
            Ride Now
          </button>
        </div>
      </div>

      {/* Bottom Interactive Garage Dock (leaves center 3D motorcycle 100% visible!) */}
      <div
        className="pointer-events-auto mx-auto w-full max-w-5xl rounded-2xl border border-white/15 p-4 sm:p-5 shadow-2xl"
        style={{ backgroundColor: 'rgba(11, 15, 23, 0.92)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
            <button
              onClick={() => setTab('bikes')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                tab === 'bikes' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Motorcycles ({BIKES.length})
            </button>
            <button
              onClick={() => setTab('rider')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                tab === 'rider' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Rider & Helmet
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Close showroom"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {tab === 'bikes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Bike Selector Carousel */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handleCycle(-1)}
                  className="rounded-lg border border-white/15 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800 cursor-pointer"
                  aria-label="Previous motorcycle"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center min-w-0">
                  <div className="font-display text-lg font-bold text-white truncate">
                    {currentBike.name}
                  </div>
                  <div className="text-xs text-amber-400">
                    {currentBike.inspiredBy} · Top Speed {currentBike.topSpeedKmh} km/h
                  </div>
                </div>
                <button
                  onClick={() => handleCycle(1)}
                  className="rounded-lg border border-white/15 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800 cursor-pointer"
                  aria-label="Next motorcycle"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{currentBike.description}</p>

              {/* Quick Bike Strip */}
              <div className="grid grid-cols-4 gap-1.5">
                {BIKES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onSelectBike(b, b.defaultColor)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium truncate transition-colors cursor-pointer ${
                      b.id === currentBike.id
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-slate-900 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {b.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Specs Bars */}
            <div className="lg:col-span-4 space-y-2">
              {(
                [
                  ['Top Speed', currentBike.stats.speed],
                  ['Acceleration', currentBike.stats.acceleration],
                  ['Handling', currentBike.stats.handling],
                  ['Off-Road Grip', currentBike.stats.offroad],
                ] as const
              ).map(([label, val]) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>{label}</span>
                    <span className="font-mono-tech text-slate-100">{val}/100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Paint Swatches */}
            <div className="lg:col-span-3 space-y-2.5">
              <div className="text-xs font-semibold text-slate-200">Paint Finish</div>
              <div className="grid grid-cols-2 gap-2">
                {currentBike.colors.map((c) => {
                  const active = selectedColorHex.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      onClick={() => onChangeColor(c.hex)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors cursor-pointer ${
                        active
                          ? 'border-amber-400 bg-slate-800 text-white'
                          : 'border-white/10 bg-slate-900 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/30"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Helmet Customization */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-200">Helmet Style</div>
              <div className="grid grid-cols-2 gap-2">
                {HELMET_STYLES.map((h) => (
                  <button
                    key={h.id}
                    onClick={() =>
                      onChangeRider({ ...riderCustomization, helmetStyle: h.id })
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      riderCustomization.helmetStyle === h.id
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-slate-900 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-400">Helmet Color:</span>
                {HELMET_COLORS.map((hex) => (
                  <button
                    key={hex}
                    onClick={() =>
                      onChangeRider({ ...riderCustomization, helmetColor: hex })
                    }
                    className={`h-6 w-6 rounded-full border-2 cursor-pointer ${
                      riderCustomization.helmetColor === hex ? 'border-amber-400 scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Helmet color ${hex}`}
                  />
                ))}
              </div>
            </div>

            {/* Outfit Customization */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-200">Riding Outfit</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {OUTFIT_STYLES.map((o) => (
                  <button
                    key={o.id}
                    onClick={() =>
                      onChangeRider({ ...riderCustomization, outfitStyle: o.id })
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      riderCustomization.outfitStyle === o.id
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-slate-900 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
