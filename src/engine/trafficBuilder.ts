import * as THREE from 'three';

export type TrafficVehicleType = 'auto' | 'car' | 'bus' | 'truck';

export interface TrafficAgent {
  mesh: THREE.Group;
  wheels: THREE.Mesh[];
  type: TrafficVehicleType;
  x: number;
  z: number;
  axis: 'x' | 'z';
  dir: 1 | -1;
  baseSpeed: number;
  currentSpeed: number;
  radius: number;
  minBound: number;
  maxBound: number;
}

function buildTrafficVehicle(type: TrafficVehicleType, primaryColor: number): { mesh: THREE.Group; wheels: THREE.Mesh[] } {
  const grp = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.4, metalness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.6 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 1.4 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0xef4444, emissiveIntensity: 1.1 });

  const addWheel = (wx: number, wy: number, wz: number, r: number, w: number) => {
    const geo = new THREE.CylinderGeometry(r, r, w, 12);
    geo.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(geo, darkMat);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    grp.add(wheel);
    wheels.push(wheel);
  };

  if (type === 'auto') {
    // Classic Indian Auto-Rickshaw (Green body + Yellow canopy)
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.45 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.85, 2.1), greenMat);
    cabin.position.set(0, 0.72, 0);
    cabin.castShadow = true;
    grp.add(cabin);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.75, 1.85), yellowMat);
    canopy.position.set(0, 1.45, -0.05);
    canopy.castShadow = true;
    grp.add(canopy);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 0.08), glassMat);
    windshield.position.set(0, 1.38, 0.92);
    windshield.rotation.x = -0.2;
    grp.add(windshield);

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10), lightMat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0.78, 1.08);
    grp.add(head);

    addWheel(0, 0.25, 0.85, 0.25, 0.16);
    addWheel(-0.62, 0.25, -0.68, 0.25, 0.16);
    addWheel(0.62, 0.25, -0.68, 0.25, 0.16);
  } else if (type === 'car') {
    // Indian Sedan / Taxi
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 4.1), bodyMat);
    lower.position.set(0, 0.62, 0);
    lower.castShadow = true;
    grp.add(lower);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.58, 2.2), bodyMat);
    top.position.set(0, 1.2, -0.15);
    top.castShadow = true;
    grp.add(top);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.45, 2.0), glassMat);
    glass.position.set(0, 1.22, -0.15);
    grp.add(glass);

    for (const sx of [-0.62, 0.62]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), lightMat);
      hl.position.set(sx, 0.65, 2.06);
      grp.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), tailMat);
      tl.position.set(sx, 0.68, -2.06);
      grp.add(tl);
    }

    addWheel(-0.92, 0.34, 1.25, 0.34, 0.22);
    addWheel(0.92, 0.34, 1.25, 0.34, 0.22);
    addWheel(-0.92, 0.34, -1.25, 0.34, 0.22);
    addWheel(0.92, 0.34, -1.25, 0.34, 0.22);
  } else if (type === 'bus') {
    // State Transport City Bus
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.55, 8.2), bodyMat);
    body.position.set(0, 1.72, 0);
    body.castShadow = true;
    grp.add(body);

    const winBand = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.85, 7.6), glassMat);
    winBand.position.set(0, 2.15, 0.1);
    grp.add(winBand);

    for (const sx of [-0.85, 0.85]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.08), lightMat);
      hl.position.set(sx, 0.8, 4.12);
      grp.add(hl);
    }

    addWheel(-1.15, 0.48, 2.6, 0.48, 0.3);
    addWheel(1.15, 0.48, 2.6, 0.48, 0.3);
    addWheel(-1.15, 0.48, -2.5, 0.48, 0.3);
    addWheel(1.15, 0.48, -2.5, 0.48, 0.3);
  } else {
    // Colorful Indian Cargo Truck ("HORN OK PLEASE")
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.1, 2.2), new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.5 }));
    cab.position.set(0, 1.5, 2.3);
    cab.castShadow = true;
    grp.add(cab);

    const wind = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 0.08), glassMat);
    wind.position.set(0, 1.9, 3.41);
    grp.add(wind);

    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.3, 5.2), bodyMat);
    cargo.position.set(0, 1.75, -1.5);
    cargo.castShadow = true;
    grp.add(cargo);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.35, 5.22), yellowMat);
    stripe.position.set(0, 1.2, -1.5);
    grp.add(stripe);

    addWheel(-1.12, 0.48, 2.3, 0.48, 0.28);
    addWheel(1.12, 0.48, 2.3, 0.48, 0.28);
    addWheel(-1.12, 0.48, -2.2, 0.48, 0.32);
    addWheel(1.12, 0.48, -2.2, 0.48, 0.32);
  }

  return { mesh: grp, wheels };
}

export class TrafficSystem {
  public agents: TrafficAgent[] = [];
  public root = new THREE.Group();

  constructor() {
    const configs: {
      type: TrafficVehicleType;
      color: number;
      axis: 'x' | 'z';
      fixedCoord: number;
      startPos: number;
      dir: 1 | -1;
      speed: number;
      min: number;
      max: number;
    }[] = [
      // City N-S Boulevard (x = -40)
      { type: 'auto', color: 0x15803d, axis: 'z', fixedCoord: -36.5, startPos: -140, dir: 1, speed: 12, min: -210, max: 230 },
      { type: 'car', color: 0xf8fafc, axis: 'z', fixedCoord: -43.5, startPos: 120, dir: -1, speed: 16, min: -210, max: 230 },
      { type: 'bus', color: 0xdc2626, axis: 'z', fixedCoord: -36.5, startPos: 40, dir: 1, speed: 11, min: -210, max: 230 },
      { type: 'auto', color: 0x15803d, axis: 'z', fixedCoord: -43.5, startPos: -60, dir: -1, speed: 13, min: -210, max: 230 },
      // City E-W Avenue (z = -20)
      { type: 'car', color: 0x3b82f6, axis: 'x', fixedCoord: -16.5, startPos: -180, dir: 1, speed: 16, min: -230, max: 240 },
      { type: 'auto', color: 0x15803d, axis: 'x', fixedCoord: -23.5, startPos: 160, dir: -1, speed: 12, min: -230, max: 240 },
      { type: 'car', color: 0xfacc15, axis: 'x', fixedCoord: -16.5, startPos: 30, dir: 1, speed: 15, min: -230, max: 240 },
      // NH-48 National Highway (z = -200)
      { type: 'truck', color: 0x0284c7, axis: 'x', fixedCoord: -194.5, startPos: -190, dir: 1, speed: 19, min: -245, max: 265 },
      { type: 'car', color: 0xe2e8f0, axis: 'x', fixedCoord: -194.5, startPos: 60, dir: 1, speed: 24, min: -245, max: 265 },
      { type: 'truck', color: 0x16a34a, axis: 'x', fixedCoord: -205.5, startPos: 210, dir: -1, speed: 18, min: -245, max: 265 },
      { type: 'bus', color: 0x1d4ed8, axis: 'x', fixedCoord: -205.5, startPos: -40, dir: -1, speed: 20, min: -245, max: 265 },
      // Secondary N-S Road (x = 70)
      { type: 'car', color: 0x64748b, axis: 'z', fixedCoord: 73.2, startPos: -120, dir: 1, speed: 15, min: -205, max: 235 },
      { type: 'auto', color: 0x15803d, axis: 'z', fixedCoord: 66.8, startPos: 140, dir: -1, speed: 12, min: -205, max: 235 },
      // Beach Promenade (z = 250)
      { type: 'car', color: 0xef4444, axis: 'x', fixedCoord: 253, startPos: -150, dir: 1, speed: 15, min: -230, max: 240 },
      { type: 'auto', color: 0x15803d, axis: 'x', fixedCoord: 247, startPos: 110, dir: -1, speed: 11, min: -230, max: 240 },
      // Eastern Village Road (x = 180)
      { type: 'truck', color: 0x9333ea, axis: 'z', fixedCoord: 182.8, startPos: -110, dir: 1, speed: 13, min: -195, max: 235 },
      { type: 'auto', color: 0x15803d, axis: 'z', fixedCoord: 177.2, startPos: 130, dir: -1, speed: 11, min: -195, max: 235 },
    ];

    for (const cfg of configs) {
      const { mesh, wheels } = buildTrafficVehicle(cfg.type, cfg.color);
      const x = cfg.axis === 'z' ? cfg.fixedCoord : cfg.startPos;
      const z = cfg.axis === 'z' ? cfg.startPos : cfg.fixedCoord;
      mesh.position.set(x, 0.04, z);
      if (cfg.axis === 'z') {
        mesh.rotation.y = cfg.dir === 1 ? 0 : Math.PI;
      } else {
        mesh.rotation.y = cfg.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      }
      this.root.add(mesh);
      this.agents.push({
        mesh,
        wheels,
        type: cfg.type,
        x,
        z,
        axis: cfg.axis,
        dir: cfg.dir,
        baseSpeed: cfg.speed,
        currentSpeed: cfg.speed,
        radius: cfg.type === 'bus' || cfg.type === 'truck' ? 2.4 : cfg.type === 'car' ? 1.6 : 1.0,
        minBound: cfg.min,
        maxBound: cfg.max,
      });
    }
  }

  public update(
    dt: number,
    nsGreen: boolean,
    ewGreen: boolean,
    playerX: number,
    playerZ: number,
    trainActive: boolean,
    trainX: number
  ): void {
    for (const a of this.agents) {
      let targetSpeed = a.baseSpeed;

      // Stop at main intersections (x=-40, z=-20) and (x=70, z=-20) on red light
      if (a.axis === 'z' && !nsGreen) {
        const distToStop = a.dir === 1 ? -34 - a.z : a.z - -6;
        if (distToStop > 0 && distToStop < 14) targetSpeed = 0;
      }
      if (a.axis === 'x' && !ewGreen) {
        for (const ix of [-40, 70]) {
          const distToStop = a.dir === 1 ? ix - 14 - a.x : a.x - (ix + 14);
          if (distToStop > 0 && distToStop < 14) targetSpeed = 0;
        }
      }

      // Stop at railway crossing (z = 65) when train is passing
      if (a.axis === 'z' && trainActive && trainX > -280 && trainX < 280) {
        const distToRail = a.dir === 1 ? 56 - a.z : a.z - 74;
        if (distToRail > 0 && distToRail < 14) targetSpeed = 0;
      }

      // Brake if player is directly in front
      const dxp = playerX - a.x;
      const dzp = playerZ - a.z;
      const forwardDot = a.axis === 'z' ? dzp * a.dir : dxp * a.dir;
      const lateralDist = a.axis === 'z' ? Math.abs(dxp) : Math.abs(dzp);
      if (forwardDot > 0 && forwardDot < 10 && lateralDist < 2.2) {
        targetSpeed = 0;
      }

      a.currentSpeed = THREE.MathUtils.lerp(a.currentSpeed, targetSpeed, dt * 4.5);

      const move = a.currentSpeed * a.dir * dt;
      if (a.axis === 'z') {
        a.z += move;
        if (a.z > a.maxBound) a.z = a.minBound;
        if (a.z < a.minBound) a.z = a.maxBound;
      } else {
        a.x += move;
        if (a.x > a.maxBound) a.x = a.minBound;
        if (a.x < a.minBound) a.x = a.maxBound;
      }

      a.mesh.position.set(a.x, 0.04, a.z);
      const wheelRot = (a.currentSpeed * dt) / 0.35;
      for (const w of a.wheels) {
        w.rotation.x += wheelRot;
      }
    }
  }
}
