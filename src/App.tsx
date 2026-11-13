import { useCallback, useEffect, useRef, useState } from 'react';
import { BIKES } from './data/bikes';
import { GameEngine } from './engine/GameEngine';
import {
  BikeSpec,
  HudSnapshot,
  MissionDef,
  RiderCustomization,
  TimeOfDay,
  TouchInputState,
} from './types/game';
import { GameHUD } from './components/GameHUD';
import { ShowroomModal } from './components/ShowroomModal';
import { MissionModal } from './components/MissionModal';
import { StartPage } from './components/StartPage';

const INITIAL_HUD: HudSnapshot = {
  speedKmh: 0,
  rpmRatio: 0.14,
  gear: 'N',
  isOnBike: true,
  canMountBike: false,
  currentZone: 'Modern City Center',
  stuntScore: 0,
  comboMultiplier: 1,
  activeStuntLabel: null,
  recentStunts: [],
  headlightsOn: false,
  cameraMode: 'chase',
  timeOfDay: 'afternoon',
  playerX: -40,
  playerZ: -20,
  playerHeading: 0,
  bikeX: -40,
  bikeZ: -20,
  activeMission: null,
  completedMissionIds: [],
  wheelieAngleDeg: 0,
  stoppieAngleDeg: 0,
  isDrifting: false,
  isAirborne: false,
  isRefueling: false,
  fuelLevel: 100,
  muted: false,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [selectedBike, setSelectedBike] = useState<BikeSpec>(BIKES[1]);
  const [selectedColor, setSelectedColor] = useState<string>(BIKES[1].defaultColor);
  const [riderCust, setRiderCust] = useState<RiderCustomization>({
    helmetStyle: 'fullface',
    helmetColor: '#f97316',
    outfitStyle: 'street',
  });
  const [startPageOpen, setStartPageOpen] = useState(true);
  const [showroomOpen, setShowroomOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);

  const showroomRef = useRef(showroomOpen);
  showroomRef.current = showroomOpen;

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new GameEngine(
      el,
      (snapshot) => {
        setHud(snapshot);
      },
      () => {
        const next = !showroomRef.current;
        setShowroomOpen(next);
        engine.setShowroomOpen(next);
      }
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartRiding = useCallback(() => {
    setStartPageOpen(false);
    setShowroomOpen(false);
    setMissionsOpen(false);
    engineRef.current?.setStartScreenActive(false);
    engineRef.current?.setShowroomOpen(false);
  }, []);

  const handleOpenShowroom = useCallback(() => {
    setStartPageOpen(false);
    setMissionsOpen(false);
    setShowroomOpen(true);
    engineRef.current?.setStartScreenActive(false);
    engineRef.current?.setShowroomOpen(true);
  }, []);

  const handleCloseShowroom = useCallback(() => {
    setShowroomOpen(false);
    engineRef.current?.setShowroomOpen(false);
  }, []);

  const handleSelectBike = useCallback((bike: BikeSpec, colorHex: string) => {
    setSelectedBike(bike);
    setSelectedColor(colorHex);
    engineRef.current?.selectBike(bike, colorHex);
  }, []);

  const handleChangeColor = useCallback((hex: string) => {
    setSelectedColor(hex);
    engineRef.current?.setBikeColor(hex);
  }, []);

  const handleChangeRider = useCallback((cust: RiderCustomization) => {
    setRiderCust(cust);
    engineRef.current?.setRiderCustomization(cust);
  }, []);

  const handleCycleTime = useCallback(() => {
    const order: TimeOfDay[] = ['morning', 'afternoon', 'sunset', 'night'];
    const next = order[(order.indexOf(hud.timeOfDay) + 1) % order.length];
    engineRef.current?.setTimeOfDay(next);
  }, [hud.timeOfDay]);

  const handleStartMission = useCallback((m: MissionDef) => {
    setStartPageOpen(false);
    engineRef.current?.setStartScreenActive(false);
    engineRef.current?.startMission(m);
  }, []);

  const handleTouchChange = useCallback((partial: Partial<TouchInputState>) => {
    engineRef.current?.setTouchInput(partial);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b0e14]">
      {/* Isolated 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Start Page */}
      {startPageOpen && !showroomOpen && (
        <StartPage
          selectedBike={selectedBike}
          onStartRiding={handleStartRiding}
          onOpenShowroom={handleOpenShowroom}
          onOpenMissions={() => setMissionsOpen(true)}
        />
      )}

      {/* Driving HUD */}
      {!startPageOpen && !showroomOpen && (
        <GameHUD
          hud={hud}
          bikeName={selectedBike.name}
          onOpenShowroom={handleOpenShowroom}
          onOpenMissions={() => setMissionsOpen(true)}
          onCycleCamera={() => engineRef.current?.cycleCameraMode()}
          onCycleTimeOfDay={handleCycleTime}
          onToggleHeadlights={() => engineRef.current?.toggleHeadlights()}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onToggleMount={() => engineRef.current?.toggleMountBike()}
          onHonk={() => engineRef.current?.honkHorn()}
          onResetRoad={() => engineRef.current?.resetToRoad()}
          onCancelMission={() => engineRef.current?.cancelMission()}
          onTouchChange={handleTouchChange}
        />
      )}

      {/* 360° Interactive Showroom & Rider Customization */}
      {showroomOpen && (
        <ShowroomModal
          selectedBikeId={selectedBike.id}
          selectedColorHex={selectedColor}
          riderCustomization={riderCust}
          onSelectBike={handleSelectBike}
          onChangeColor={handleChangeColor}
          onChangeRider={handleChangeRider}
          onRotateTurntable={(d) => engineRef.current?.rotateShowroom(d)}
          onClose={handleCloseShowroom}
        />
      )}

      {/* Open-World Missions Modal */}
      {missionsOpen && (
        <MissionModal
          completedIds={hud.completedMissionIds}
          activeMissionId={
            hud.activeMission?.status === 'active' ? hud.activeMission.mission.id : null
          }
          onStartMission={handleStartMission}
          onCancelMission={() => engineRef.current?.cancelMission()}
          onClose={() => setMissionsOpen(false)}
        />
      )}
    </div>
  );
}
