import { MissionDef } from '../types/game';

export const MISSIONS: MissionDef[] = [
  {
    id: 'chai-dash',
    title: 'Chai & City Dash',
    region: 'Modern City → Highway',
    description:
      'Blast through the city signal, cross the elevated flyover, and deliver hot parcels to Sharma Tea Stall on NH-48.',
    type: 'checkpoint',
    timeLimitSec: 75,
    checkpoints: [
      { x: -120, z: -80, label: 'Bharat Mall Plaza' },
      { x: 0, z: -155, label: 'Flyover Entry' },
      { x: 140, z: -155, label: 'NH-48 Flyover Exit' },
      { x: 240, z: -70, label: 'Sharma Tea Stall' },
    ],
    rewardPoints: 1000,
  },
  {
    id: 'kerala-coast',
    title: 'Kerala Coastal Run',
    region: 'Backwaters & Arabian Beach',
    description:
      'Carve through lush coconut groves, cross the backwater bridge, and sprint along the golden shoreline before time runs out.',
    type: 'checkpoint',
    timeLimitSec: 85,
    checkpoints: [
      { x: -160, z: 90, label: 'Paddy Field Bend' },
      { x: -240, z: 185, label: 'Backwater Bridge' },
      { x: -110, z: 270, label: 'Kovalam Beach Shack' },
      { x: 90, z: 270, label: 'Lighthouse Promenade' },
    ],
    rewardPoints: 1250,
  },
  {
    id: 'temple-hill',
    title: 'Railway & Temple Climb',
    region: 'Village → Eastern Hills',
    description:
      'Navigate the bustling village lane, time your crossing over the railway tracks, and climb up to the Hilltop Temple.',
    type: 'checkpoint',
    timeLimitSec: 90,
    checkpoints: [
      { x: 130, z: 0, label: 'Village Chowk' },
      { x: 210, z: 65, label: 'Railway Crossing' },
      { x: 290, z: 130, label: 'Shiva Temple Gate' },
      { x: 315, z: -195, label: 'Hilltop Viewpoint' },
    ],
    rewardPoints: 1500,
  },
  {
    id: 'stunt-master',
    title: 'Desi Stunt Showdown',
    region: 'Open World',
    description:
      'Chain Wheelies (Shift), Stoppies, Drifts (Space), and Ramp Jumps anywhere in the city to score 1,500 stunt points.',
    type: 'stunt',
    timeLimitSec: 90,
    targetScore: 1500,
    checkpoints: [],
    rewardPoints: 2000,
  },
  {
    id: 'highway-blitz',
    title: 'NH-48 Top Speed Blitz',
    region: 'National Highway',
    description:
      'Take a fast machine onto the open National Highway and break 175 km/h to earn the Highway King badge.',
    type: 'speed',
    timeLimitSec: 60,
    targetSpeedKmh: 175,
    checkpoints: [{ x: 210, z: -200, label: 'NH-48 Straightaway' }],
    rewardPoints: 1800,
  },
];
