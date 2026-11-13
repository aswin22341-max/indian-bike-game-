import React, { useEffect, useRef } from 'react';
import { ActiveMissionState } from '../types/game';

interface MiniMapProps {
  playerX: number;
  playerZ: number;
  playerHeading: number;
  bikeX: number;
  bikeZ: number;
  isOnBike: boolean;
  activeMission: ActiveMissionState | null;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerX,
  playerZ,
  playerHeading,
  bikeX,
  bikeZ,
  isOnBike,
  activeMission,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 148;
    const scale = size / 760; // Covers [-380..380] world coordinates
    const toMap = (wx: number, wz: number) => ({
      x: size / 2 + wx * scale,
      y: size / 2 + wz * scale,
    });

    ctx.clearRect(0, 0, size, size);

    // Land background
    ctx.fillStyle = '#18241d';
    ctx.fillRect(0, 0, size, size);

    // Arabian Sea at south (z > 275)
    const seaTop = toMap(0, 275).y;
    ctx.fillStyle = '#0c5c75';
    ctx.fillRect(0, seaTop, size, size - seaTop);

    // Backwater canal
    const bw = toMap(-190, 165);
    ctx.fillStyle = '#0e7490';
    ctx.fillRect(bw.x - 3, toMap(0, 45).y, 6, 48);

    // Road Network
    ctx.strokeStyle = '#475569';
    ctx.lineCap = 'square';

    const drawRoad = (x1: number, z1: number, x2: number, z2: number, w: number, color = '#475569') => {
      const p1 = toMap(x1, z1);
      const p2 = toMap(x2, z2);
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    // NH-48 Highway
    drawRoad(-260, -200, 280, -200, 4.5, '#64748b');
    // Flyover
    drawRoad(-30, -155, 170, -155, 3, '#f59e0b');
    // City Avenues
    drawRoad(-40, -220, -40, 255, 3.5);
    drawRoad(70, -220, 70, 255, 3);
    drawRoad(-250, -20, 265, -20, 3.5);
    drawRoad(-250, 115, 265, 115, 2.5);
    drawRoad(-250, 250, 270, 250, 3);
    drawRoad(-240, -205, -240, 255, 2.5);
    drawRoad(180, -205, 180, 255, 2.5);
    drawRoad(260, -25, 260, 255, 2);

    // Railway Line
    drawRoad(-360, 65, 360, 65, 1.5, '#991b1b');

    // Petrol Pump Marker
    const petrol = toMap(45, -222);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(petrol.x - 2.5, petrol.y - 2.5, 5, 5);

    // Parked Bike Marker when on foot
    if (!isOnBike) {
      const bm = toMap(bikeX, bikeZ);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(bm.x, bm.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mission Checkpoint Marker
    if (activeMission && activeMission.status === 'active') {
      const cp = activeMission.mission.checkpoints[activeMission.currentCheckpointIndex];
      if (cp) {
        const mp = toMap(cp.x, cp.z);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // Player Arrow
    const pm = toMap(playerX, playerZ);
    ctx.save();
    ctx.translate(pm.x, pm.y);
    // In canvas +Y is +Z (down), +X is right. Heading 0 = +Z (down).
    ctx.rotate(-playerHeading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-4.5, -4.5);
    ctx.lineTo(0, -2);
    ctx.lineTo(4.5, -4.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [playerX, playerZ, playerHeading, bikeX, bikeZ, isOnBike, activeMission]);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/15 shadow-lg"
      style={{ width: 148, height: 148, backgroundColor: 'rgba(11, 15, 23, 0.9)' }}
    >
      <canvas ref={canvasRef} width={148} height={148} className="block" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-2 py-0.5 text-[10px] font-medium text-slate-300 flex justify-between">
        <span>N ↑</span>
        <span>Open World</span>
      </div>
    </div>
  );
};
