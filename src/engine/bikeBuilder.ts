import * as THREE from 'three';
import { BikeCategory, BikeSpec } from '../types/game';

export interface BuiltBike {
  root: THREE.Group; // Grounded at (0,0,0), forward = +Z
  tiltGroup: THREE.Group; // Roll/lean + wheelie/stoppie pitch
  chassisGroup: THREE.Group;
  frontSteeringGroup: THREE.Group;
  frontSuspGroup: THREE.Group;
  frontWheelGroup: THREE.Group;
  rearSwingarmGroup: THREE.Group;
  rearWheelGroup: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  taillightMat: THREE.MeshStandardMaterial;
  headlightSpot: THREE.SpotLight | null;
  headlightTarget: THREE.Object3D;
  seatOffset: THREE.Vector3;
  handlebarOffset: THREE.Vector3;
  footpegOffset: THREE.Vector3;
  wheelRadius: number;
  setPaintColor: (hex: string) => void;
  setHeadlights: (on: boolean) => void;
  setBraking: (braking: boolean) => void;
}

function createWheel(
  radius: number,
  width: number,
  isSpoked: boolean,
  isKnobby: boolean,
  rimColor: number,
  rubberMat: THREE.Material,
  metalMat: THREE.Material,
  discMat: THREE.Material
): THREE.Group {
  const wheel = new THREE.Group();

  // Tire (torus oriented in YZ plane so it rolls around X axis)
  const tubeR = width * 0.45;
  const tireGeo = new THREE.TorusGeometry(radius - tubeR * 0.65, tubeR, 14, 28);
  tireGeo.rotateY(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, rubberMat);
  tire.castShadow = true;
  wheel.add(tire);

  if (isKnobby) {
    const knobGeo = new THREE.BoxGeometry(width * 0.9, 0.03, 0.045);
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const knob = new THREE.Mesh(knobGeo, rubberMat);
      knob.position.set(0, Math.sin(ang) * radius, Math.cos(ang) * radius);
      knob.rotation.x = -ang;
      wheel.add(knob);
    }
  }

  // Rim ring
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: 0.78,
    roughness: 0.25,
  });
  const rimGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width * 0.65, 22, 1, true);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheel.add(rim);

  // Hub
  const hubGeo = new THREE.CylinderGeometry(0.065, 0.065, width * 0.9, 14);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, metalMat);
  wheel.add(hub);

  // Spokes or Alloy blades
  const spokeCount = isSpoked ? 12 : 5;
  const spokeGeo = new THREE.BoxGeometry(0.014, radius * 0.66, isSpoked ? 0.012 : 0.042);
  for (let i = 0; i < spokeCount; i++) {
    const ang = (i / spokeCount) * Math.PI * 2;
    const spoke = new THREE.Mesh(spokeGeo, isSpoked ? metalMat : rimMat);
    spoke.position.set(0, Math.sin(ang) * (radius * 0.34), Math.cos(ang) * (radius * 0.34));
    spoke.rotation.x = -ang + Math.PI / 2;
    wheel.add(spoke);
  }

  // Brake disc
  const discGeo = new THREE.CylinderGeometry(radius * 0.44, radius * 0.44, 0.015, 20);
  discGeo.rotateZ(Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.x = width * 0.36;
  wheel.add(disc);

  return wheel;
}

export function buildMotorcycle(
  spec: BikeSpec,
  paintHex: string,
  contactShadowTex: THREE.Texture,
  enableSpotLight = true
): BuiltBike {
  const cat: BikeCategory = spec.category;
  const root = new THREE.Group();

  // Contact shadow on ground
  const shadowGeo = new THREE.PlaneGeometry(1.15, 2.35);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.position.y = 0.025;
  root.add(shadowPlane);

  const tiltGroup = new THREE.Group();
  root.add(tiltGroup);

  const chassisGroup = new THREE.Group();
  tiltGroup.add(chassisGroup);

  // Shared materials with varied PBR roughness/metalness
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(paintHex),
    metalness: cat === 'cruiser' ? 0.65 : 0.45,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.accentColor),
    metalness: 0.35,
    roughness: 0.45,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: cat === 'streetfighter' ? 0xf97316 : 0x1e293b,
    metalness: 0.72,
    roughness: 0.32,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.94,
    roughness: 0.14,
  });

  const engineMat = new THREE.MeshStandardMaterial({
    color: cat === 'cruiser' ? 0xcbd5e1 : 0x27272a,
    metalness: 0.8,
    roughness: 0.38,
  });

  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    metalness: 0.04,
    roughness: 0.88,
  });

  const seatMat = new THREE.MeshStandardMaterial({
    color: cat === 'cruiser' ? 0x3f2618 : 0x18181b,
    metalness: 0.05,
    roughness: 0.78,
  });

  const discMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.25,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff3c4,
    emissiveIntensity: 1.4,
    roughness: 0.1,
    metalness: 0.1,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0xef4444,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  // Proportions per category
  const wheelRadius = cat === 'dirt' || cat === 'adventure' ? 0.34 : 0.31;
  const frontTireW = cat === 'dirt' ? 0.11 : cat === 'superbike' ? 0.13 : 0.12;
  const rearTireW = cat === 'superbike' ? 0.19 : cat === 'dirt' ? 0.13 : 0.16;
  const isSpoked = cat === 'cruiser' || cat === 'dirt' || cat === 'adventure';
  const isKnobby = cat === 'dirt' || cat === 'adventure';
  const rimColor =
    cat === 'streetfighter' ? 0xf97316 : cat === 'adventure' ? 0xd4af37 : cat === 'electric' ? 0x06b6d4 : 0xcbd5e1;

  const frontZ = cat === 'cruiser' ? 0.76 : 0.71;
  const rearZ = cat === 'cruiser' ? -0.74 : -0.69;

  // --- 1. ENGINE & FRAME CORE ---
  const engineHeight = cat === 'dirt' || cat === 'adventure' ? 0.44 : 0.38;
  if (cat === 'electric') {
    const batteryPack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.56), accentMat);
    batteryPack.position.set(0, engineHeight, 0.05);
    batteryPack.castShadow = true;
    chassisGroup.add(batteryPack);

    const glowStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.035, 0.46),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.8 })
    );
    glowStrip.position.set(0, engineHeight + 0.06, 0.05);
    chassisGroup.add(glowStrip);
  } else {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.30, 0.38), engineMat);
    block.position.set(0, engineHeight, 0.03);
    block.castShadow = true;
    chassisGroup.add(block);

    // Cylinder head + cooling fins
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.24, 12), engineMat);
    cyl.position.set(0, engineHeight + 0.2, 0.12);
    cyl.rotation.x = 0.28;
    cyl.castShadow = true;
    chassisGroup.add(cyl);

    if (cat === 'cruiser' || cat === 'street') {
      for (let f = 0; f < 4; f++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.24), chromeMat);
        fin.position.set(0, engineHeight + 0.14 + f * 0.04, 0.12);
        fin.rotation.x = 0.28;
        chassisGroup.add(fin);
      }
    }
  }

  // Main spine & trellis frame tubes
  const spineGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8);
  spineGeo.rotateX(Math.PI / 2 - 0.15);
  const spine = new THREE.Mesh(spineGeo, frameMat);
  spine.position.set(0, engineHeight + 0.32, 0.06);
  chassisGroup.add(spine);

  const downTubeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.58, 8);
  downTubeGeo.rotateX(-0.45);
  const downTube = new THREE.Mesh(downTubeGeo, frameMat);
  downTube.position.set(0, engineHeight + 0.12, 0.34);
  chassisGroup.add(downTube);

  if (cat === 'streetfighter') {
    // Exposed KTM-style orange trellis bars on both sides
    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 8), frameMat);
      bar.position.set(side * 0.13, engineHeight + 0.24, 0.08);
      bar.rotation.x = 0.85;
      chassisGroup.add(bar);
      const subBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.52, 8), frameMat);
      subBar.position.set(side * 0.12, engineHeight + 0.28, -0.35);
      subBar.rotation.x = -1.1;
      chassisGroup.add(subBar);
    }
  }

  // --- 2. FUEL TANK (Sculpted Beveled Shape / Lathe) ---
  const tankY = engineHeight + (cat === 'dirt' ? 0.36 : 0.40);
  if (cat === 'cruiser') {
    // Teardrop classic tank
    const tankGeo = new THREE.SphereGeometry(0.21, 18, 14);
    tankGeo.scale(0.85, 0.72, 1.45);
    const tank = new THREE.Mesh(tankGeo, paintMat);
    tank.position.set(0, tankY, 0.18);
    tank.castShadow = true;
    chassisGroup.add(tank);
  } else {
    // Sculpted extruded sport/adventure tank
    const tankShape = new THREE.Shape();
    tankShape.moveTo(-0.26, -0.06);
    tankShape.quadraticCurveTo(-0.18, 0.16, 0.08, 0.18);
    tankShape.quadraticCurveTo(0.28, 0.15, 0.30, -0.04);
    tankShape.lineTo(0.10, -0.10);
    tankShape.closePath();

    const tankGeo = new THREE.ExtrudeGeometry(tankShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.035,
      bevelSegments: 3,
    });
    tankGeo.rotateY(Math.PI / 2);
    tankGeo.center();
    const tank = new THREE.Mesh(tankGeo, paintMat);
    tank.position.set(0, tankY + 0.02, 0.18);
    tank.castShadow = true;
    chassisGroup.add(tank);

    // Side tank shrouds for Streetfighter / Street / ADV
    if (cat === 'streetfighter' || cat === 'street' || cat === 'adventure') {
      for (const side of [-1, 1]) {
        const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.20, 0.36), paintMat);
        shroud.position.set(side * 0.17, tankY - 0.03, 0.26);
        shroud.rotation.x = 0.25;
        shroud.rotation.y = side * -0.14;
        shroud.castShadow = true;
        chassisGroup.add(shroud);
      }
    }
  }

  // --- 3. FAIRINGS (Superbike / Sport Commuter / ADV / Electric) ---
  if (cat === 'superbike' || cat === 'sport_commuter') {
    for (const side of [-1, 1]) {
      const fairing = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, cat === 'superbike' ? 0.46 : 0.32, 0.56),
        paintMat
      );
      fairing.position.set(side * 0.18, engineHeight + 0.22, 0.36);
      fairing.rotation.y = side * -0.12;
      fairing.castShadow = true;
      chassisGroup.add(fairing);
    }
    // Front nose cowl + tinted windscreen
    const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.38), paintMat);
    cowl.position.set(0, tankY + 0.08, 0.54);
    cowl.rotation.x = 0.42;
    cowl.castShadow = true;
    chassisGroup.add(cowl);

    const screenMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.1,
      roughness: 0.08,
      transparent: true,
      opacity: 0.65,
    });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.03), screenMat);
    screen.position.set(0, tankY + 0.25, 0.52);
    screen.rotation.x = -0.68;
    chassisGroup.add(screen);
  }

  if (cat === 'adventure') {
    // Tall Dakar windscreen + rear luggage rack
    const screenMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.1,
      transparent: true,
      opacity: 0.6,
    });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.03), screenMat);
    screen.position.set(0, tankY + 0.28, 0.52);
    screen.rotation.x = -0.45;
    chassisGroup.add(screen);

    // Side panniers
    for (const side of [-1, 1]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.36), accentMat);
      box.position.set(side * 0.24, engineHeight + 0.32, -0.58);
      box.castShadow = true;
      chassisGroup.add(box);
    }
  }

  // --- 4. SEAT & TAIL SECTION ---
  const seatY = engineHeight + (cat === 'dirt' ? 0.36 : cat === 'cruiser' ? 0.29 : 0.35);
  const seatLen = cat === 'dirt' ? 0.72 : 0.58;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, seatLen), seatMat);
  seat.position.set(0, seatY, -0.22);
  seat.rotation.x = cat === 'superbike' || cat === 'streetfighter' ? -0.12 : 0.02;
  seat.castShadow = true;
  chassisGroup.add(seat);

  // Tail cowl + Taillight
  const tailCowl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.38), paintMat);
  tailCowl.position.set(0, seatY + 0.06, -0.60);
  tailCowl.rotation.x = -0.25;
  tailCowl.castShadow = true;
  chassisGroup.add(tailCowl);

  const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.04), taillightMat);
  taillight.position.set(0, seatY + 0.08, -0.78);
  chassisGroup.add(taillight);

  // --- 5. EXHAUST PIPE (TubeGeometry) ---
  if (cat !== 'electric') {
    const exhaustMat = cat === 'cruiser' ? chromeMat : engineMat;
    const exhaustCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.14, engineHeight + 0.12, 0.24),
      new THREE.Vector3(0.18, engineHeight - 0.12, 0.05),
      new THREE.Vector3(0.19, engineHeight - 0.10, -0.32),
      new THREE.Vector3(0.20, cat === 'dirt' || cat === 'adventure' ? seatY - 0.08 : engineHeight + 0.04, -0.72),
    ]);
    const exhaustGeo = new THREE.TubeGeometry(exhaustCurve, 16, 0.042, 10, false);
    const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaust.castShadow = true;
    chassisGroup.add(exhaust);

    // Muffler can
    const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.34, 12), exhaustMat);
    muffler.rotation.x = Math.PI / 2 - (cat === 'cruiser' ? 0 : 0.25);
    muffler.position.set(0.20, cat === 'dirt' ? seatY - 0.08 : engineHeight + 0.04, -0.66);
    muffler.castShadow = true;
    chassisGroup.add(muffler);
  }

  // --- 6. REAR SWINGARM & REAR WHEEL ---
  const rearSwingarmGroup = new THREE.Group();
  rearSwingarmGroup.position.set(0, wheelRadius, -0.18);
  chassisGroup.add(rearSwingarmGroup);

  const swingarmLen = Math.abs(rearZ - -0.18);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, swingarmLen), frameMat);
    arm.position.set(side * 0.13, 0, -swingarmLen / 2);
    rearSwingarmGroup.add(arm);
  }

  // Rear shock spring
  const rearShock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.28, 10),
    new THREE.MeshStandardMaterial({ color: cat === 'streetfighter' ? 0xf97316 : 0xeab308, roughness: 0.35 })
  );
  rearShock.position.set(0, 0.18, -0.18);
  rearShock.rotation.x = 0.45;
  rearSwingarmGroup.add(rearShock);

  const rearWheelGroup = createWheel(
    wheelRadius,
    rearTireW,
    isSpoked,
    isKnobby,
    rimColor,
    rubberMat,
    chromeMat,
    discMat
  );
  rearWheelGroup.position.set(0, 0, rearZ - -0.18);
  rearSwingarmGroup.add(rearWheelGroup);

  // --- 7. FRONT STEERING & TELESCOPIC SUSPENSION ---
  const frontSteeringGroup = new THREE.Group();
  frontSteeringGroup.position.set(0, tankY + 0.08, 0.45);
  chassisGroup.add(frontSteeringGroup);

  // Steering stem & upper fork tubes
  const forkAngle = cat === 'cruiser' ? -0.46 : cat === 'dirt' ? -0.38 : -0.33;
  const forkHolder = new THREE.Group();
  forkHolder.rotation.x = forkAngle;
  frontSteeringGroup.add(forkHolder);

  const upperForkLen = 0.42;
  for (const side of [-1, 1]) {
    const upperTube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, upperForkLen, 10), cat === 'streetfighter' || cat === 'superbike' ? discMat : chromeMat);
    upperTube.position.set(side * 0.11, -upperForkLen * 0.35, 0);
    forkHolder.add(upperTube);
  }

  // Suspension slider group (translates along fork axis when compressing)
  const frontSuspGroup = new THREE.Group();
  forkHolder.add(frontSuspGroup);

  for (const side of [-1, 1]) {
    const lowerTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 10), chromeMat);
    lowerTube.position.set(side * 0.11, -0.52, 0);
    frontSuspGroup.add(lowerTube);
  }

  // Front mudguard
  const fenderY = cat === 'dirt' || cat === 'adventure' ? -0.30 : -0.50;
  const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.34), paintMat);
  frontFender.position.set(0, fenderY, 0.06);
  frontFender.rotation.x = 0.25;
  frontSuspGroup.add(frontFender);

  // Front Wheel
  const frontWheelGroup = createWheel(
    wheelRadius,
    frontTireW,
    isSpoked,
    isKnobby,
    rimColor,
    rubberMat,
    chromeMat,
    discMat
  );
  // Position wheel at bottom of fork
  const forkDropY = -(tankY + 0.08 - wheelRadius) / Math.cos(forkAngle);
  frontWheelGroup.position.set(0, forkDropY, 0);
  frontSuspGroup.add(frontWheelGroup);

  // Handlebars + Grips + Mirrors
  const barY = cat === 'superbike' ? 0.02 : cat === 'cruiser' ? 0.16 : 0.11;
  const barWidth = cat === 'superbike' ? 0.52 : 0.68;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, barWidth, 10), chromeMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, barY, -0.02);
  frontSteeringGroup.add(bar);

  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 10), rubberMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(side * (barWidth * 0.45), barY, -0.02);
    frontSteeringGroup.add(grip);

    // Mirror stalk + mirror
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6), frameMat);
    stalk.position.set(side * 0.24, barY + 0.07, 0.0);
    stalk.rotation.z = side * -0.35;
    frontSteeringGroup.add(stalk);

    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.02), frameMat);
    mirror.position.set(side * 0.28, barY + 0.14, -0.01);
    frontSteeringGroup.add(mirror);
  }

  // Headlight assembly
  const headY = cat === 'cruiser' ? 0.02 : 0.0;
  const headZ = cat === 'superbike' || cat === 'sport_commuter' ? 0.22 : 0.14;
  if (cat === 'cruiser') {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.14, 16), chromeMat);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(0, headY, headZ);
    frontSteeringGroup.add(housing);

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.095, 16), headlightMat);
    lens.position.set(0, headY, headZ + 0.072);
    frontSteeringGroup.add(lens);
  } else {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.12), accentMat);
    housing.position.set(0, headY, headZ);
    frontSteeringGroup.add(housing);

    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.02), headlightMat);
    lens.position.set(0, headY, headZ + 0.062);
    frontSteeringGroup.add(lens);
  }

  // Real Headlight SpotLight (toggled by L / Night mode)
  const headlightTarget = new THREE.Object3D();
  headlightTarget.position.set(0, -0.6, 18);
  frontSteeringGroup.add(headlightTarget);

  let headlightSpot: THREE.SpotLight | null = null;
  if (enableSpotLight) {
    headlightSpot = new THREE.SpotLight(0xfff4d2, 0, 55, Math.PI / 4.5, 0.45, 1.4);
    headlightSpot.position.set(0, headY, headZ + 0.1);
    headlightSpot.target = headlightTarget;
    frontSteeringGroup.add(headlightSpot);
  }

  const seatOffset = new THREE.Vector3(0, seatY + 0.05, -0.18);
  const handlebarOffset = new THREE.Vector3(0, tankY + 0.08 + barY, 0.43);
  const footpegOffset = new THREE.Vector3(0, engineHeight - 0.12, cat === 'superbike' ? -0.18 : 0.02);

  return {
    root,
    tiltGroup,
    chassisGroup,
    frontSteeringGroup,
    frontSuspGroup,
    frontWheelGroup,
    rearSwingarmGroup,
    rearWheelGroup,
    headlightMat,
    taillightMat,
    headlightSpot,
    headlightTarget,
    seatOffset,
    handlebarOffset,
    footpegOffset,
    wheelRadius,
    setPaintColor: (hex: string) => {
      paintMat.color.set(hex);
    },
    setHeadlights: (on: boolean) => {
      headlightMat.emissiveIntensity = on ? 2.6 : 0.4;
      if (headlightSpot) {
        headlightSpot.intensity = on ? 14 : 0;
      }
    },
    setBraking: (braking: boolean) => {
      taillightMat.emissiveIntensity = braking ? 3.2 : 0.9;
    },
  };
}
