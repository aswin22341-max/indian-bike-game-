import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';
import { TimeOfDay } from '../types/game';

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
  label?: string;
}

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
}

export interface StuntRamp {
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  rotY: number; // direction ramp faces (+Z rotated by rotY)
}

export interface SpeedBreaker {
  x: number;
  z: number;
  width: number;
  axis: 'x' | 'z'; // road travel axis
}

export interface TrafficSignal {
  x: number;
  z: number;
  nsRedMat: THREE.MeshStandardMaterial;
  nsYellowMat: THREE.MeshStandardMaterial;
  nsGreenMat: THREE.MeshStandardMaterial;
  ewRedMat: THREE.MeshStandardMaterial;
  ewYellowMat: THREE.MeshStandardMaterial;
  ewGreenMat: THREE.MeshStandardMaterial;
}

export interface BuiltWorld {
  root: THREE.Group;
  circleColliders: CircleCollider[];
  boxColliders: BoxCollider[];
  ramps: StuntRamp[];
  speedBreakers: SpeedBreaker[];
  petrolZone: { x: number; z: number; radius: number };
  showroomZone: { x: number; z: number; radius: number };
  getGroundHeight: (x: number, z: number, currentY?: number) => number;
  getSurfaceType: (x: number, z: number) => 'road' | 'grass' | 'sand' | 'water';
  getZoneName: (x: number, z: number) => string;
  updateDynamicWorld: (
    time: number,
    dt: number,
    timeOfDay: TimeOfDay,
    onTrainHorn: () => void
  ) => { nsGreen: boolean; ewGreen: boolean; trainX: number; trainActive: boolean };
}

export function buildIndianOpenWorld(textures: ProceduralTextureSet): BuiltWorld {
  const root = new THREE.Group();
  const circleColliders: CircleCollider[] = [];
  const boxColliders: BoxCollider[] = [];
  const ramps: StuntRamp[] = [];
  const speedBreakers: SpeedBreaker[] = [];
  const streetLampMats: THREE.MeshStandardMaterial[] = [];
  const windowEmissiveMats: THREE.MeshStandardMaterial[] = [];
  const signals: TrafficSignal[] = [];

  // --- 1. BASE TERRAIN & BEACH / SEA / BACKWATERS ---
  const terrainGeo = new THREE.PlaneGeometry(1100, 1100, 96, 96);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;

  const hillHeight = (x: number, z: number): number => {
    let h = 0;
    // Northern mountain ridge perimeter (z < -315)
    if (z < -315) {
      const d = (-315 - z) / 80;
      h += Math.min(48, d * d * 18 + Math.sin(x * 0.03) * 4 + Math.cos(x * 0.07) * 2.5);
    }
    // Eastern mountain ridge perimeter (x > 345)
    if (x > 345) {
      const d = (x - 345) / 80;
      h += Math.min(52, d * d * 20 + Math.sin(z * 0.035) * 4.5);
    }
    // Western hills (x < -340)
    if (x < -340) {
      const d = (-340 - x) / 80;
      h += Math.min(36, d * d * 14 + Math.cos(z * 0.04) * 3);
    }
    // Driveable North-East Hilltop Temple Plateau (center around x=315, z=-195)
    const dx = (x - 315) / 85;
    const dz = (z - -195) / 85;
    const distSq = dx * dx + dz * dz;
    if (distSq < 1.2) {
      const hill = Math.max(0, 1 - distSq / 1.2);
      h = Math.max(h, hill * hill * 16.5);
    }
    // Gentle beach slope south of z=262
    if (z > 262) {
      h = Math.min(h, -(z - 262) * 0.055);
    }
    return h;
  };

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, hillHeight(x, z));
  }
  terrainGeo.computeVertexNormals();

  const grassMat = new THREE.MeshStandardMaterial({
    map: textures.grass,
    roughness: 0.92,
    metalness: 0.0,
  });
  const terrain = new THREE.Mesh(terrainGeo, grassMat);
  terrain.receiveShadow = true;
  root.add(terrain);

  // Golden Sandy Beach Strip (z = 262..355)
  const sandGeo = new THREE.PlaneGeometry(920, 95, 48, 8);
  sandGeo.rotateX(-Math.PI / 2);
  const sandPos = sandGeo.attributes.position;
  for (let i = 0; i < sandPos.count; i++) {
    const wx = sandPos.getX(i);
    const wz = sandPos.getZ(i) + 308;
    sandPos.setY(i, hillHeight(wx, wz) + 0.03);
  }
  sandGeo.computeVertexNormals();
  const sandMesh = new THREE.Mesh(
    sandGeo,
    new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.94 })
  );
  sandMesh.position.set(0, 0, 308);
  sandMesh.receiveShadow = true;
  root.add(sandMesh);

  // Arabian Sea Ocean (z > 312)
  const seaMat = new THREE.MeshPhysicalMaterial({
    map: textures.water,
    color: 0x0e9aa7,
    roughness: 0.16,
    metalness: 0.1,
    clearcoat: 0.85,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 380), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -1.5, 495);
  sea.receiveShadow = true;
  root.add(sea);

  // Kerala Backwater Canal (x = -240 area, winding channel)
  const backwater = new THREE.Mesh(new THREE.PlaneGeometry(34, 240), seaMat);
  backwater.rotation.x = -Math.PI / 2;
  backwater.position.set(-190, 0.02, 165);
  backwater.receiveShadow = true;
  root.add(backwater);

  // --- 2. INTERCONNECTED ROAD NETWORK ---
  const addRoadSegment = (
    x: number,
    z: number,
    width: number,
    length: number,
    rotY: number,
    type: 'city' | 'highway' | 'village',
    yOffset = 0.04
  ) => {
    const baseTex =
      type === 'highway'
        ? textures.highway
        : type === 'village'
        ? textures.villageRoad
        : textures.asphalt;
    const tex = baseTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, Math.max(1, Math.round(length / 18)));
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const geo = new THREE.PlaneGeometry(width, length);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, yOffset, z);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    root.add(mesh);
  };

  // Main N-S City Boulevard (x = -40, z = -220..255)
  addRoadSegment(-40, 17, 16, 475, 0, 'city', 0.05);
  // Secondary N-S Connector (x = 70, z = -220..255) - passes under flyover!
  addRoadSegment(70, 17, 14, 475, 0, 'city', 0.045);
  // Main E-W City Avenue (z = -20, x = -250..265)
  addRoadSegment(7, -20, 16, 515, Math.PI / 2, 'city', 0.055);
  // Mid-South E-W Village/Kerala Road (z = 115, x = -250..265)
  addRoadSegment(7, 115, 12, 515, Math.PI / 2, 'village', 0.045);
  // National Highway NH-48 (z = -200, x = -260..280)
  addRoadSegment(10, -200, 22, 540, Math.PI / 2, 'highway', 0.06);
  // Kerala Coastal Loop West (x = -240, z = -205..255)
  addRoadSegment(-240, 25, 11, 460, 0, 'village', 0.045);
  // Southern Arabian Beach Promenade Road (z = 250, x = -250..270)
  addRoadSegment(10, 250, 13, 520, Math.PI / 2, 'city', 0.05);
  // Eastern Village Road (x = 180, z = -205..255)
  addRoadSegment(180, 25, 12, 460, 0, 'village', 0.045);
  // Narrow Village Bazaar Lane (x = 260, z = -25..255)
  addRoadSegment(260, 115, 9, 280, 0, 'village', 0.048);

  // Zebra Crossings at main City intersections
  const addZebra = (x: number, z: number, rotY: number) => {
    const zMat = new THREE.MeshStandardMaterial({
      map: textures.zebraCrossing,
      roughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(15, 4.2), zMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.position.set(x, 0.065, z);
    m.receiveShadow = true;
    root.add(m);
  };
  addZebra(-40, -10, 0);
  addZebra(-40, -30, 0);
  addZebra(-30, -20, Math.PI / 2);
  addZebra(-50, -20, Math.PI / 2);
  addZebra(70, -10, 0);
  addZebra(70, -30, 0);

  // --- 3. ELEVATED CONCRETE FLYOVER BRIDGE (z = -155, x = -30..170) ---
  // Ramp Up: x = -30 to x = 20 (height 0 -> 6.5m)
  // Flat Deck: x = 20 to x = 120 (height 6.5m, spans over x = 70 road!)
  // Ramp Down: x = 120 to x = 170 (height 6.5m -> 0)
  const flyoverMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const deckTex = textures.asphalt.clone();
  deckTex.needsUpdate = true;
  deckTex.repeat.set(1, 6);
  const deckRoadMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.82 });

  const flyoverFlatLen = 100;
  const flyoverW = 12;
  const flyoverH = 6.5;

  // Flat Deck
  const flatDeck = new THREE.Mesh(new THREE.BoxGeometry(flyoverFlatLen, 0.7, flyoverW), flyoverMat);
  flatDeck.position.set(70, flyoverH - 0.35, -155);
  flatDeck.castShadow = true;
  flatDeck.receiveShadow = true;
  root.add(flatDeck);

  const flatSurface = new THREE.Mesh(new THREE.PlaneGeometry(flyoverW - 1, flyoverFlatLen), deckRoadMat);
  flatSurface.rotation.x = -Math.PI / 2;
  flatSurface.rotation.z = Math.PI / 2;
  flatSurface.position.set(70, flyoverH + 0.02, -155);
  flatSurface.receiveShadow = true;
  root.add(flatSurface);

  // Guardrails on flat deck
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(flyoverFlatLen, 0.9, 0.4), flyoverMat);
    rail.position.set(70, flyoverH + 0.45, -155 + side * (flyoverW / 2 - 0.2));
    rail.castShadow = true;
    root.add(rail);
  }

  // Support Pillars (left & right of x=70 underpass road)
  for (const px of [24, 48, 92, 116]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, flyoverH, 12), flyoverMat);
    pillar.position.set(px, flyoverH / 2, -155);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    root.add(pillar);
    circleColliders.push({ x: px, z: -155, radius: 1.2, label: 'Flyover Pillar' });
  }

  // Ramps up and down
  const rampLen = 50;
  const rampHyp = Math.hypot(rampLen, flyoverH);
  const rampAngle = Math.atan2(flyoverH, rampLen);

  const makeFlyoverRamp = (centerX: number, slopeDir: number) => {
    const grp = new THREE.Group();
    grp.position.set(centerX, flyoverH / 2, -155);
    grp.rotation.z = slopeDir * rampAngle;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(rampHyp, 0.7, flyoverW), flyoverMat);
    slab.position.y = -0.35;
    slab.castShadow = true;
    slab.receiveShadow = true;
    grp.add(slab);

    const surf = new THREE.Mesh(new THREE.PlaneGeometry(flyoverW - 1, rampHyp), deckRoadMat);
    surf.rotation.x = -Math.PI / 2;
    surf.rotation.z = Math.PI / 2;
    surf.position.y = 0.02;
    surf.receiveShadow = true;
    grp.add(surf);

    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rampHyp, 0.9, 0.4), flyoverMat);
      rail.position.set(0, 0.45, side * (flyoverW / 2 - 0.2));
      grp.add(rail);
    }
    root.add(grp);
  };
  makeFlyoverRamp(-5, 1); // x = -30 -> +20
  makeFlyoverRamp(145, -1); // x = 120 -> +170

  // --- 4. SPEED BREAKERS & STUNT RAMPS ---
  const sbMat = new THREE.MeshStandardMaterial({ map: textures.speedBreaker, roughness: 0.75 });
  const addSpeedBreaker = (x: number, z: number, width: number, axis: 'x' | 'z') => {
    const geo = new THREE.CylinderGeometry(0.22, 0.22, width, 12, 1, false, 0, Math.PI);
    geo.rotateZ(Math.PI / 2);
    if (axis === 'x') geo.rotateY(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, sbMat);
    mesh.scale.set(1, 0.65, 1.8);
    mesh.position.set(x, 0.03, z);
    mesh.receiveShadow = true;
    root.add(mesh);
    speedBreakers.push({ x, z, width, axis });
  };
  addSpeedBreaker(-40, 20, 15, 'z');
  addSpeedBreaker(-40, -90, 15, 'z');
  addSpeedBreaker(15, -20, 15, 'x');
  addSpeedBreaker(-120, -20, 15, 'x');
  addSpeedBreaker(180, 15, 11, 'z');
  addSpeedBreaker(-240, 35, 10, 'z');
  addSpeedBreaker(30, 250, 12, 'x');

  // Stunt Jump Ramps
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.5,
    metalness: 0.2,
  });
  const addStuntRamp = (x: number, z: number, width: number, length: number, height: number, rotY: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(length, 0);
    shape.lineTo(length, height);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2);
    geo.translate(width / 2, 0, -length / 2);

    const mesh = new THREE.Mesh(geo, rampMat);
    mesh.position.set(x, 0.03, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    ramps.push({ x, z, width, length, height, rotY });
  };

  addStuntRamp(-40, 175, 6.5, 11, 2.8, 0); // City South Jump
  addStuntRamp(-15, -200, 7, 13, 3.4, Math.PI / 2); // Highway Mega Jump
  addStuntRamp(-40, 295, 7, 10, 2.6, 0); // Beach Launch Ramp
  addStuntRamp(180, -80, 6, 10, 2.5, Math.PI); // Eastern Road Jump

  // --- 5. TRAFFIC SIGNALS (2 Major Intersections) ---
  const addTrafficSignal = (x: number, z: number) => {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.35 });
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });

    const nsRed = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.1 });
    const nsYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.1 });
    const nsGreen = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 2.0 });
    const ewRed = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.0 });
    const ewYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.1 });
    const ewGreen = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.1 });

    const corners: [number, number, boolean][] = [
      [x + 10, z + 10, true],
      [x - 10, z - 10, true],
      [x + 10, z - 10, false],
      [x - 10, z + 10, false],
    ];
    for (const [cx, cz, isNS] of corners) {
      const grp = new THREE.Group();
      grp.position.set(cx, 0, cz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 5.5, 8), poleMat);
      pole.position.y = 2.75;
      pole.castShadow = true;
      grp.add(pole);

      const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.55), housingMat);
      box.position.y = 5.1;
      grp.add(box);

      const mats = isNS ? [nsRed, nsYellow, nsGreen] : [ewRed, ewYellow, ewGreen];
      mats.forEach((m, idx) => {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), m);
        bulb.position.set(0, 5.5 - idx * 0.4, isNS ? 0.28 : 0);
        if (!isNS) bulb.position.x = 0.28;
        grp.add(bulb);
      });
      root.add(grp);
      circleColliders.push({ x: cx, z: cz, radius: 0.4 });
    }
    signals.push({
      x,
      z,
      nsRedMat: nsRed,
      nsYellowMat: nsYellow,
      nsGreenMat: nsGreen,
      ewRedMat: ewRed,
      ewYellowMat: ewYellow,
      ewGreenMat: ewGreen,
    });
  };
  addTrafficSignal(-40, -20);
  addTrafficSignal(70, -20);

  // --- 6. INDIAN BUILDINGS, MALLS, SHOWROOM, PETROL PUMP, TEA SHOP, TEMPLES ---
  const addBoxBuilding = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    roofColor = 0x334155,
    hasWaterTank = false,
    signText?: { title: string; sub: string; bg: string; fg: string }
  ) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    grp.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4),
      new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.85 })
    );
    roof.position.y = h + 0.25;
    grp.add(roof);

    if (hasWaterTank) {
      // Iconic black/blue Indian rooftop Sintex water tank!
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 1.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
      );
      tank.position.set(w * 0.22, h + 1.4, d * 0.2);
      grp.add(tank);
    }

    if (signText) {
      const signTex = textures.createSignTexture(signText.title, signText.sub, signText.bg, signText.fg);
      const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        emissive: new THREE.Color(signText.bg),
        emissiveMap: signTex,
        emissiveIntensity: 0.55,
      });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.85, 12), 3.6), signMat);
      sign.position.set(0, Math.min(h - 2, 5.5), d / 2 + 0.08);
      grp.add(sign);
    }

    root.add(grp);
    boxColliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      maxY: h + 1,
    });
  };

  const modernMat = new THREE.MeshStandardMaterial({ map: textures.buildingFacadeModern, roughness: 0.45 });
  const indianResMat = new THREE.MeshStandardMaterial({ map: textures.buildingFacadeIndian, roughness: 0.78 });
  windowEmissiveMats.push(modernMat, indianResMat);

  // Shopping Complex - BHARAT MALL
  addBoxBuilding(-92, -62, 34, 18, 26, modernMat, 0x1e293b, false, {
    title: 'BHARAT MALL',
    sub: 'SHOPPING · FOOD COURT · CINEMA',
    bg: '#0f172a',
    fg: '#38bdf8',
  });

  // City Bike Showroom Building (near spawn!)
  addBoxBuilding(-68, -56, 18, 8, 14, modernMat, 0xf97316, false, {
    title: 'MOTOVEDA SHOWROOM',
    sub: 'PRESS [G] TO ENTER GARAGE',
    bg: '#18181b',
    fg: '#f97316',
  });
  const showroomZone = { x: -58, z: -44, radius: 7 };

  // Modern City Towers & Indian Residential Apartments
  addBoxBuilding(-88, 30, 24, 28, 22, modernMat, 0x334155, true);
  addBoxBuilding(-82, 82, 20, 22, 18, indianResMat, 0x475569, true);
  addBoxBuilding(18, -62, 26, 30, 22, modernMat, 0x1e293b, false, {
    title: 'METRO TECH PLAZA',
    sub: 'IT PARK & CAFES',
    bg: '#1e293b',
    fg: '#f8fafc',
  });
  addBoxBuilding(16, 28, 22, 20, 20, indianResMat, 0x7c2d12, true);
  addBoxBuilding(112, 25, 24, 24, 20, indianResMat, 0x475569, true);
  addBoxBuilding(115, -65, 26, 20, 22, modernMat, 0x334155, false);
  addBoxBuilding(-140, -68, 24, 18, 20, indianResMat, 0x9a3412, true);
  addBoxBuilding(-145, 28, 22, 16, 18, indianResMat, 0x475569, true);

  // Bharat Petrol Pump on Highway NH-48 (x = 45, z = -226)
  const buildPetrolPump = (px: number, pz: number) => {
    const grp = new THREE.Group();
    grp.position.set(px, 0, pz);

    // Concrete forecourt pad
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(28, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 })
    );
    pad.position.y = 0.08;
    pad.receiveShadow = true;
    grp.add(pad);

    // Canopy roof (Bharat Petroleum blue & yellow!)
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(24, 1.3, 12),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.4, metalness: 0.3 })
    );
    canopy.position.y = 5.6;
    canopy.castShadow = true;
    grp.add(canopy);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(24.4, 0.45, 12.4),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.35 })
    );
    trim.position.y = 5.1;
    grp.add(trim);

    const signTex = textures.createSignTexture('BHARAT FUEL', 'PETROL · DIESEL · NITRO', '#0369a1', '#ffffff', '#facc15');
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 2.2),
      new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x0284c7, emissiveMap: signTex, emissiveIntensity: 0.4 })
    );
    sign.position.set(0, 5.7, 6.25);
    grp.add(sign);

    // 4 Pillars + 3 Dispensers
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
    for (const sx of [-9, 9]) {
      for (const sz of [-4, 4]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.2, 10), pillarMat);
        col.position.set(sx, 2.6, sz);
        col.castShadow = true;
        grp.add(col);
        circleColliders.push({ x: px + sx, z: pz + sz, radius: 0.6 });
      }
    }
    const dispMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    for (const dx of [-5, 0, 5]) {
      const disp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.8), dispMat);
      disp.position.set(dx, 1.0, 0);
      disp.castShadow = true;
      grp.add(disp);
      circleColliders.push({ x: px + dx, z: pz, radius: 0.9 });
    }
    root.add(grp);
  };
  buildPetrolPump(45, -228);
  const petrolZone = { x: 45, z: -222, radius: 13 };

  // Sharma Tea Stall & Highway Dhaba (x = 240, z = -70)
  const buildTeaShop = (tx: number, tz: number) => {
    const grp = new THREE.Group();
    grp.position.set(tx, 0, tz);
    const stall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 3.8, 7),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 })
    );
    stall.position.y = 1.9;
    stall.castShadow = true;
    grp.add(stall);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.25, 4.5),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 })
    );
    awning.position.set(0, 3.3, 4.8);
    awning.rotation.x = 0.22;
    grp.add(awning);

    const signTex = textures.createSignTexture('SHARMA TEA STALL', 'MASALA CHAI · SAMOSA · DHABA', '#991b1b', '#fef08a');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 1.8), new THREE.MeshStandardMaterial({ map: signTex }));
    sign.position.set(0, 4.3, 3.6);
    grp.add(sign);

    // Outdoor wooden benches
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    for (const bx of [-3, 3]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 0.8), benchMat);
      bench.position.set(bx, 0.28, 5.5);
      grp.add(bench);
    }
    root.add(grp);
    boxColliders.push({ minX: tx - 5, maxX: tx + 5, minZ: tz - 3.5, maxZ: tz + 3.5, maxY: 4.5 });
  };
  buildTeaShop(240, -78);

  // Kerala Traditional Houses (Terracotta sloped roofs!)
  const roofMat = new THREE.MeshStandardMaterial({ map: textures.terracottaRoof, roughness: 0.8 });
  const addKeralaHouse = (hx: number, hz: number, wallColor: number, rotY = 0) => {
    const grp = new THREE.Group();
    grp.position.set(hx, 0, hz);
    grp.rotation.y = rotY;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 })
    );
    wall.position.y = 2.1;
    wall.castShadow = true;
    wall.receiveShadow = true;
    grp.add(wall);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.8, 3.2, 4), roofMat);
    roof.position.y = 5.8;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    grp.add(roof);
    root.add(grp);
    boxColliders.push({ minX: hx - 5.5, maxX: hx + 5.5, minZ: hz - 5.5, maxZ: hz + 5.5, maxY: 7 });
  };
  addKeralaHouse(-270, 30, 0xfef9c3);
  addKeralaHouse(-272, 140, 0xfed7aa);
  addKeralaHouse(-215, 210, 0xffffff);
  addKeralaHouse(-155, 195, 0xe0f2fe);
  // Village houses in East
  addKeralaHouse(215, -10, 0xfde68a);
  addKeralaHouse(290, 20, 0xbfdbfe);
  addKeralaHouse(225, 145, 0xfecaca);
  addKeralaHouse(292, 85, 0xd9f99d);

  // Kerala Backwater Wooden Bridge (x = -190, z = 115)
  const bridgeDeck = new THREE.Mesh(
    new THREE.BoxGeometry(38, 0.8, 12.6),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.82 })
  );
  bridgeDeck.position.set(-190, 0.25, 115);
  bridgeDeck.receiveShadow = true;
  root.add(bridgeDeck);

  // Wooden Kerala Canoe in Backwater
  const boat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.6, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 })
  );
  boat.rotation.x = Math.PI / 2;
  boat.scale.set(1, 1, 0.55);
  boat.position.set(-190, 0.15, 165);
  root.add(boat);

  // Indian Temple with Gopuram Spire (Village Temple at x=298, z=145 & Hilltop Temple at x=315, z=-195)
  const buildTemple = (tx: number, ty: number, tz: number) => {
    const grp = new THREE.Group();
    grp.position.set(tx, ty, tz);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe7d3b0, roughness: 0.82 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 });
    const saffronMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.7 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(16, 1.5, 16), stoneMat);
    base.position.y = 0.75;
    base.receiveShadow = true;
    grp.add(base);

    const sanctum = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), stoneMat);
    sanctum.position.y = 4.5;
    sanctum.castShadow = true;
    grp.add(sanctum);

    // Stepped Shikhara / Gopuram spire
    for (let tier = 0; tier < 5; tier++) {
      const s = 9 - tier * 1.5;
      const layer = new THREE.Mesh(new THREE.BoxGeometry(s, 1.6, s), tier % 2 === 0 ? saffronMat : stoneMat);
      layer.position.y = 8.3 + tier * 1.55;
      layer.castShadow = true;
      grp.add(layer);
    }

    const kalash = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.5, 12), goldMat);
    kalash.position.y = 16.5;
    grp.add(kalash);

    root.add(grp);
    circleColliders.push({ x: tx, z: tz, radius: 8.5, label: 'Temple' });
  };
  buildTemple(298, 0, 145);
  buildTemple(315, hillHeight(315, -195) - 0.3, -195);

  // Beach Shack ("KOVALAM BEACH SHACK")
  addBoxBuilding(-125, 282, 12, 4.2, 8, new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.88 }), 0xfacc15, false, {
    title: 'KOVALAM SHACK',
    sub: 'COCONUT WATER · SURF · CHILL',
    bg: '#0f766e',
    fg: '#fef08a',
  });

  // Highway Overhead Gantry Signboard (x = 90, z = -200)
  const buildHighwayGantry = (gx: number, gz: number) => {
    const grp = new THREE.Group();
    grp.position.set(gx, 0, gz);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.35 });
    for (const sz of [-12, 12]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 8, 8), steelMat);
      post.position.set(0, 4, sz);
      grp.add(post);
      circleColliders.push({ x: gx, z: gz + sz, radius: 0.5 });
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 25), steelMat);
    beam.position.set(0, 7.6, 0);
    grp.add(beam);

    const signTex = textures.createSignTexture('NH-48  MUMBAI 42 KM', 'KOCHI 18 KM  ·  SPEED LIMIT 80', '#15803d', '#ffffff', '#ffffff');
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 15), new THREE.MeshStandardMaterial({ map: signTex }));
    board.position.set(0, 7.4, 0);
    grp.add(board);
    root.add(grp);
  };
  buildHighwayGantry(115, -200);

  // Indian Road Signs
  const addRoadSign = (sx: number, sz: number, title: string, sub: string, bg: string, rotY = 0) => {
    const grp = new THREE.Group();
    grp.position.set(sx, 0, sz);
    grp.rotation.y = rotY;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 })
    );
    pole.position.y = 1.6;
    grp.add(pole);
    const tex = textures.createSignTexture(title, sub, bg, '#ffffff', '#facc15');
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.08), new THREE.MeshStandardMaterial({ map: tex }));
    plate.position.y = 3.0;
    grp.add(plate);
    root.add(grp);
  };
  addRoadSign(-30, 12, 'SPEED BREAKER', 'SLOW DOWN', '#b91c1c');
  addRoadSign(172, 48, 'RAILWAY CROSSING', 'STOP · LOOK · LISTEN', '#b91c1c');
  addRoadSign(-232, 48, 'RAILWAY CROSSING', 'KERALA LINE', '#b91c1c');
  addRoadSign(245, -182, 'HILL TEMPLE', 'STEEP CLIMB AHEAD', '#15803d', -Math.PI / 2);

  // --- 7. RAILWAY TRACK, CROSSINGS & ANIMATED INDIAN TRAIN ---
  const railZ = 65;
  const railBed = new THREE.Mesh(
    new THREE.BoxGeometry(760, 0.14, 5.2),
    new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.95 })
  );
  railBed.position.set(0, 0.06, railZ);
  root.add(railBed);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
  for (const offset of [-1.1, 1.1]) {
    const steelRail = new THREE.Mesh(new THREE.BoxGeometry(760, 0.18, 0.14), railMat);
    steelRail.position.set(0, 0.16, railZ + offset);
    root.add(steelRail);
  }

  // Crossing Barriers (animated when train approaches)
  const crossingBars: THREE.Mesh[] = [];
  const barMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
  for (const cx of [-240, -40, 70, 180]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(12, 0.22, 0.22), barMat);
    bar.position.set(cx, 1.3, railZ - 5.5);
    root.add(bar);
    crossingBars.push(bar);
  }

  // Animated Indian Railways Train (WDP-4 Locomotive + 4 Coaches)
  const trainGroup = new THREE.Group();
  trainGroup.position.set(-420, 0.25, railZ);
  root.add(trainGroup);

  const locoMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.35 });
  const coachMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45, metalness: 0.3 });
  const roofTrainMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 });

  // Locomotive
  const loco = new THREE.Mesh(new THREE.BoxGeometry(18, 4.2, 3.4), locoMat);
  loco.position.set(0, 2.4, 0);
  loco.castShadow = true;
  trainGroup.add(loco);
  const locoStripe = new THREE.Mesh(
    new THREE.BoxGeometry(18.1, 0.6, 3.45),
    new THREE.MeshStandardMaterial({ color: 0xfacc15 })
  );
  locoStripe.position.set(0, 2.0, 0);
  trainGroup.add(locoStripe);

  for (let c = 1; c <= 4; c++) {
    const coach = new THREE.Mesh(new THREE.BoxGeometry(21, 4.0, 3.3), coachMat);
    coach.position.set(-c * 22.5, 2.3, 0);
    coach.castShadow = true;
    trainGroup.add(coach);

    const cRoof = new THREE.Mesh(new THREE.BoxGeometry(21, 0.4, 3.1), roofTrainMat);
    cRoof.position.set(-c * 22.5, 4.4, 0);
    trainGroup.add(cRoof);
  }

  // --- 8. INSTANCED COCONUT PALMS & TREES (240+ Trees!) ---
  const palmPositions: { x: number; y: number; z: number; scale: number; rot: number }[] = [];
  const addPalmRing = (x: number, z: number, scale = 1) => {
    const y = hillHeight(x, z);
    palmPositions.push({ x, y, z, scale, rot: Math.random() * Math.PI * 2 });
    circleColliders.push({ x, z, radius: 0.65 * scale });
  };

  // Kerala Backwaters & Beach Coconut Groves
  for (let i = 0; i < 95; i++) {
    const x = -280 + Math.random() * 540;
    const z = 258 + Math.random() * 34;
    if (Math.abs(x - -40) < 12) continue;
    addPalmRing(x, z, 0.85 + Math.random() * 0.45);
  }
  for (let i = 0; i < 65; i++) {
    const x = -290 + Math.random() * 140;
    const z = -140 + Math.random() * 380;
    if (Math.abs(x - -240) < 10 || Math.abs(x - -190) < 20 || Math.abs(z - 115) < 10 || Math.abs(z - -20) < 12 || Math.abs(z - 65) < 8)
      continue;
    addPalmRing(x, z, 0.9 + Math.random() * 0.4);
  }
  // Avenue & Village Trees
  for (let z = -170; z <= 220; z += 36) {
    if (Math.abs(z - -20) < 20 || Math.abs(z - 65) < 15 || Math.abs(z - 115) < 16) continue;
    addPalmRing(-52, z, 0.95);
    addPalmRing(-28, z, 0.95);
    addPalmRing(190, z, 1.0);
  }

  const count = palmPositions.length;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 8.5, 7);
  trunkGeo.translate(0, 4.25, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5836, roughness: 0.92 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  trunkInst.castShadow = true;

  const crownGeo = new THREE.ConeGeometry(3.2, 2.4, 7);
  crownGeo.translate(0, 8.8, 0);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2f855a, roughness: 0.85 });
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, count);
  crownInst.castShadow = true;

  const dummy = new THREE.Object3D();
  const colorTmp = new THREE.Color();
  palmPositions.forEach((p, idx) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0.06, p.rot, 0.05);
    dummy.scale.setScalar(p.scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);
    crownInst.setMatrixAt(idx, dummy.matrix);
    colorTmp.setHSL(0.32 + (Math.random() - 0.5) * 0.05, 0.52, 0.32 + Math.random() * 0.12);
    crownInst.setColorAt(idx, colorTmp);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  root.add(trunkInst);
  root.add(crownInst);

  // --- 9. STREETLIGHTS ---
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });
  const addStreetLight = (lx: number, lz: number, armDirX: number) => {
    const grp = new THREE.Group();
    grp.position.set(lx, 0, lz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 6.2, 6), lampPoleMat);
    pole.position.y = 3.1;
    grp.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), lampPoleMat);
    arm.position.set(armDirX * 0.75, 6.1, 0);
    grp.add(arm);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.2,
    });
    streetLampMats.push(bulbMat);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.35), bulbMat);
    bulb.position.set(armDirX * 1.4, 6.0, 0);
    grp.add(bulb);
    root.add(grp);
  };
  for (let z = -170; z <= 220; z += 45) {
    addStreetLight(-49.5, z, 1);
    addStreetLight(-30.5, z, -1);
  }
  for (let x = -200; x <= 220; x += 65) {
    addStreetLight(x, -212, 0);
  }

  // --- 10. GROUND HEIGHT & ZONE HELPERS ---
  const getGroundHeight = (x: number, z: number, currentY = 0): number => {
    let h = hillHeight(x, z);

    // Check Elevated Flyover (z in [-161, -149], x in [-30, 170])
    if (Math.abs(z - -155) < 6.0 && x >= -30 && x <= 170) {
      let deckH = 0;
      if (x < 20) {
        deckH = ((x - -30) / 50) * flyoverH;
      } else if (x <= 120) {
        deckH = flyoverH;
      } else {
        deckH = ((170 - x) / 50) * flyoverH;
      }
      // Snap to flyover if player is near ramps or already elevated above 2m
      if (currentY > 1.8 || x < -14 || x > 154) {
        h = Math.max(h, deckH);
      }
    }

    // Backwater bridge
    if (x >= -209 && x <= -171 && Math.abs(z - 115) < 6.3) {
      h = Math.max(h, 0.65);
    }

    // Check Stunt Ramps
    for (const r of ramps) {
      const dx = x - r.x;
      const dz = z - r.z;
      const cos = Math.cos(-r.rotY);
      const sin = Math.sin(-r.rotY);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      if (Math.abs(lx) <= r.width / 2 && lz >= -r.length / 2 && lz <= r.length / 2) {
        const t = (lz + r.length / 2) / r.length;
        h = Math.max(h, t * r.height + 0.03);
      }
    }

    // Check Speed Breakers
    for (const sb of speedBreakers) {
      const distAlong = sb.axis === 'z' ? Math.abs(z - sb.z) : Math.abs(x - sb.x);
      const distAcross = sb.axis === 'z' ? Math.abs(x - sb.x) : Math.abs(z - sb.z);
      if (distAcross < sb.width / 2 && distAlong < 0.7) {
        h = Math.max(h, (1 - distAlong / 0.7) * 0.22 + 0.05);
      }
    }

    return h;
  };

  const getSurfaceType = (x: number, z: number): 'road' | 'grass' | 'sand' | 'water' => {
    if (z > 316) return 'water';
    if (z > 263) return 'sand';
    if (
      Math.abs(x - -40) < 8.5 ||
      Math.abs(x - 70) < 7.5 ||
      Math.abs(z - -20) < 8.5 ||
      Math.abs(z - -200) < 11.5 ||
      Math.abs(z - 115) < 6.5 ||
      Math.abs(z - 250) < 7 ||
      Math.abs(x - -240) < 6 ||
      Math.abs(x - 180) < 6.5 ||
      Math.abs(x - 260) < 5
    ) {
      return 'road';
    }
    return 'grass';
  };

  const getZoneName = (x: number, z: number): string => {
    if (z > 260) return 'Arabian Sea Beach';
    if (z < -165 && x < 240) return 'NH-48 National Highway';
    if (x > 240 && z < -120) return 'Eastern Hilltop Temple';
    if (x < -140 && z > 20) return 'Kerala Backwaters';
    if (x > 140 && z > -80) return 'Indian Village & Rail Crossing';
    if (Math.abs(z - -155) < 10 && x > -30 && x < 170) return 'City Flyover';
    return 'Modern City Center';
  };

  let trainTimer = 10;
  let trainX = -420;
  let trainActive = false;
  let hornPlayedThisPass = false;

  const updateDynamicWorld = (
    time: number,
    dt: number,
    timeOfDay: TimeOfDay,
    onTrainHorn: () => void
  ) => {
    // 1. Traffic Signal 18s cycle (0..7s NS Green, 7..9s NS Yellow, 9..16s EW Green, 16..18s EW Yellow)
    const cycle = time % 18;
    const nsGreen = cycle < 7;
    const nsYellow = cycle >= 7 && cycle < 9;
    const ewGreen = cycle >= 9 && cycle < 16;
    const ewYellow = cycle >= 16;

    for (const sig of signals) {
      sig.nsGreenMat.emissiveIntensity = nsGreen ? 2.6 : 0.08;
      sig.nsYellowMat.emissiveIntensity = nsYellow ? 2.6 : 0.08;
      sig.nsRedMat.emissiveIntensity = !nsGreen && !nsYellow ? 2.6 : 0.08;

      sig.ewGreenMat.emissiveIntensity = ewGreen ? 2.6 : 0.08;
      sig.ewYellowMat.emissiveIntensity = ewYellow ? 2.6 : 0.08;
      sig.ewRedMat.emissiveIntensity = !ewGreen && !ewYellow ? 2.6 : 0.08;
    }

    // 2. Streetlights intensity by time of day
    const lampOn = timeOfDay === 'night' || timeOfDay === 'sunset';
    for (const m of streetLampMats) {
      m.emissiveIntensity = lampOn ? 2.8 : 0.15;
    }

    // 3. Railway Train cycle
    trainTimer += dt;
    if (!trainActive && trainTimer > 28) {
      trainActive = true;
      trainX = -420;
      hornPlayedThisPass = false;
    }
    if (trainActive) {
      trainX += 46 * dt;
      trainGroup.position.x = trainX;
      if (!hornPlayedThisPass && trainX > -160) {
        hornPlayedThisPass = true;
        onTrainHorn();
      }
      if (trainX > 480) {
        trainActive = false;
        trainTimer = 0;
      }
    }

    // Animate railway crossing barriers down when train is near
    const barrierDown = trainActive && trainX > -280 && trainX < 280;
    const targetBarY = barrierDown ? 1.2 : 3.4;
    const targetBarRot = barrierDown ? 0 : 1.15;
    for (const b of crossingBars) {
      b.position.y = THREE.MathUtils.lerp(b.position.y, targetBarY, dt * 4);
      b.rotation.z = THREE.MathUtils.lerp(b.rotation.z, targetBarRot, dt * 4);
    }

    // Gentle ocean texture scroll
    textures.water.offset.x = (time * 0.015) % 1;
    textures.water.offset.y = Math.sin(time * 0.3) * 0.02;

    return { nsGreen, ewGreen, trainX, trainActive };
  };

  return {
    root,
    circleColliders,
    boxColliders,
    ramps,
    speedBreakers,
    petrolZone,
    showroomZone,
    getGroundHeight,
    getSurfaceType,
    getZoneName,
    updateDynamicWorld,
  };
}
