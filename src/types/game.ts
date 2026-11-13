export type BikeCategory =
  | 'cruiser'
  | 'streetfighter'
  | 'street'
  | 'sport_commuter'
  | 'adventure'
  | 'superbike'
  | 'electric'
  | 'dirt';

export type EngineSoundType = 'thump' | 'single' | 'twin' | 'inline4' | 'electric' | 'dirt';

export interface BikeSpec {
  id: string;
  name: string;
  inspiredBy: string;
  category: BikeCategory;
  description: string;
  topSpeedKmh: number;
  acceleration: number; // m/s^2 base
  braking: number;
  handling: number; // turn responsiveness
  leanMaxDeg: number;
  suspensionTravel: number;
  offRoadGrip: number; // 0..1
  wheeliePower: number;
  soundType: EngineSoundType;
  defaultColor: string;
  accentColor: string;
  colors: { name: string; hex: string }[];
  stats: {
    speed: number; // 1..100
    acceleration: number;
    handling: number;
    offroad: number;
  };
}

export type HelmetStyle = 'fullface' | 'classic' | 'motocross' | 'none';
export type OutfitStyle = 'street' | 'racing' | 'monsoon' | 'denim' | 'kurta';

export interface RiderCustomization {
  helmetStyle: HelmetStyle;
  helmetColor: string;
  outfitStyle: OutfitStyle;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'sunset' | 'night';
export type CameraMode = 'chase' | 'action' | 'helmet' | 'orbit';

export interface MissionCheckpoint {
  x: number;
  z: number;
  label: string;
}

export interface MissionDef {
  id: string;
  title: string;
  region: string;
  description: string;
  type: 'checkpoint' | 'stunt' | 'speed';
  timeLimitSec: number;
  targetScore?: number;
  targetSpeedKmh?: number;
  checkpoints: MissionCheckpoint[];
  rewardPoints: number;
}

export interface ActiveMissionState {
  mission: MissionDef;
  currentCheckpointIndex: number;
  timeLeftSec: number;
  status: 'active' | 'completed' | 'failed';
  bestAchieved: number;
}

export interface StuntPopup {
  id: number;
  label: string;
  points: number;
  timestamp: number;
}

export interface HudSnapshot {
  speedKmh: number;
  rpmRatio: number; // 0..1
  gear: number | 'R' | 'N';
  isOnBike: boolean;
  canMountBike: boolean;
  currentZone: string;
  stuntScore: number;
  comboMultiplier: number;
  activeStuntLabel: string | null;
  recentStunts: StuntPopup[];
  headlightsOn: boolean;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  bikeX: number;
  bikeZ: number;
  activeMission: ActiveMissionState | null;
  completedMissionIds: string[];
  wheelieAngleDeg: number;
  stoppieAngleDeg: number;
  isDrifting: boolean;
  isAirborne: boolean;
  isRefueling: boolean;
  fuelLevel: number; // 0..100
  muted: boolean;
}

export interface TouchInputState {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  wheelie: boolean;
  drift: boolean;
  jump: boolean;
}
