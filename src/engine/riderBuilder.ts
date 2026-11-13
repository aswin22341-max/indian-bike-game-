import * as THREE from 'three';
import { OutfitStyle, RiderCustomization } from '../types/game';

export interface BuiltRider {
  root: THREE.Group; // Grounded at (0,0,0) when standing, or attached to bike tiltGroup
  pelvisGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftCalf: THREE.Group;
  rightCalf: THREE.Group;
  applyCustomization: (cust: RiderCustomization) => void;
  updatePose: (
    mode: 'riding' | 'foot',
    time: number,
    speed: number,
    steer: number,
    wheelieRatio: number,
    isJumping: boolean,
    seatOffset?: THREE.Vector3,
    handlebarOffset?: THREE.Vector3,
    footpegOffset?: THREE.Vector3
  ) => void;
}

const OUTFIT_COLORS: Record<OutfitStyle, { jacket: number; pants: number; stripe: number }> = {
  street: { jacket: 0x1e293b, pants: 0x334155, stripe: 0xf97316 },
  racing: { jacket: 0xdc2626, pants: 0x111827, stripe: 0xf8fafc },
  monsoon: { jacket: 0x0f766e, pants: 0x1e293b, stripe: 0xfacc15 },
  denim: { jacket: 0x1d4ed8, pants: 0x1e3a8a, stripe: 0x93c5fd },
  kurta: { jacket: 0xd97706, pants: 0xf1f5f9, stripe: 0x7c2d12 },
};

export function buildRider(initialCust: RiderCustomization): BuiltRider {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb57c52, roughness: 0.72 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.2 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
  const helmetMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialCust.helmetColor),
    metalness: 0.35,
    roughness: 0.2,
    clearcoat: 0.85,
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0x090d16,
    metalness: 0.8,
    roughness: 0.1,
  });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

  // Pelvis (root pivot ~0.92m above ground when standing)
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 0.92, 0);
  root.add(pelvisGroup);

  const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.18), pantsMat);
  pelvisMesh.castShadow = true;
  pelvisGroup.add(pelvisMesh);

  // Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.08, 0);
  pelvisGroup.add(torsoGroup);

  const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.20), jacketMat);
  chestMesh.position.set(0, 0.24, 0);
  chestMesh.castShadow = true;
  torsoGroup.add(chestMesh);

  const stripeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.21), stripeMat);
  stripeMesh.position.set(0, 0.30, 0);
  torsoGroup.add(stripeMesh);

  // Head & Helmet Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.50, 0);
  torsoGroup.add(headGroup);

  const bareHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), skinMat);
  bareHead.position.y = 0.11;
  headGroup.add(bareHead);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.y = 0.118;
  headGroup.add(hair);

  const sunglasses = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), visorMat);
  sunglasses.position.set(0, 0.125, 0.098);
  headGroup.add(sunglasses);

  const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 14), helmetMat);
  helmetShell.position.y = 0.12;
  helmetShell.castShadow = true;
  headGroup.add(helmetShell);

  const helmetVisor = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.08), visorMat);
  helmetVisor.position.set(0, 0.13, 0.11);
  headGroup.add(helmetVisor);

  const helmetChin = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.11), helmetMat);
  helmetChin.position.set(0, 0.05, 0.10);
  headGroup.add(helmetChin);

  const mxPeak = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.14), helmetMat);
  mxPeak.position.set(0, 0.23, 0.13);
  mxPeak.rotation.x = 0.18;
  headGroup.add(mxPeak);

  // Arms
  const makeArm = (side: number) => {
    const upper = new THREE.Group();
    upper.position.set(side * 0.21, 0.42, 0);
    torsoGroup.add(upper);

    const upperMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.28, 10), jacketMat);
    upperMesh.position.y = -0.13;
    upperMesh.castShadow = true;
    upper.add(upperMesh);

    const forearm = new THREE.Group();
    forearm.position.set(0, -0.26, 0);
    upper.add(forearm);

    const forearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.26, 10), jacketMat);
    forearmMesh.position.y = -0.12;
    forearmMesh.castShadow = true;
    forearm.add(forearmMesh);

    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), gloveMat);
    glove.position.y = -0.26;
    forearm.add(glove);

    return { upper, forearm };
  };

  const left = makeArm(1);
  const right = makeArm(-1);

  // Legs
  const makeLeg = (side: number) => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.11, -0.02, 0);
    pelvisGroup.add(thigh);

    const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.055, 0.44, 10), pantsMat);
    thighMesh.position.y = -0.22;
    thighMesh.castShadow = true;
    thigh.add(thighMesh);

    const calf = new THREE.Group();
    calf.position.set(0, -0.44, 0);
    thigh.add(calf);

    const calfMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, 0.42, 10), pantsMat);
    calfMesh.position.y = -0.21;
    calfMesh.castShadow = true;
    calf.add(calfMesh);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.18), bootMat);
    boot.position.set(0, -0.42, 0.04);
    boot.castShadow = true;
    calf.add(boot);

    return { thigh, calf };
  };

  const leftL = makeLeg(1);
  const rightL = makeLeg(-1);

  const applyCustomization = (cust: RiderCustomization) => {
    const theme = OUTFIT_COLORS[cust.outfitStyle];
    jacketMat.color.setHex(theme.jacket);
    pantsMat.color.setHex(theme.pants);
    stripeMat.color.setHex(theme.stripe);
    helmetMat.color.set(cust.helmetColor);

    const hasHelmet = cust.helmetStyle !== 'none';
    bareHead.visible = !hasHelmet;
    hair.visible = !hasHelmet;
    sunglasses.visible = !hasHelmet;
    helmetShell.visible = hasHelmet;
    helmetVisor.visible = cust.helmetStyle === 'fullface' || cust.helmetStyle === 'classic';
    helmetChin.visible = cust.helmetStyle === 'fullface' || cust.helmetStyle === 'motocross';
    mxPeak.visible = cust.helmetStyle === 'motocross';
  };

  applyCustomization(initialCust);

  const updatePose: BuiltRider['updatePose'] = (
    mode,
    time,
    speed,
    steer,
    wheelieRatio,
    isJumping,
    seatOffset,
    handlebarOffset,
    footpegOffset
  ) => {
    if (mode === 'riding' && seatOffset && handlebarOffset && footpegOffset) {
      // Seat rider on the bike
      pelvisGroup.position.set(0, seatOffset.y + 0.06, seatOffset.z - 0.04);
      pelvisGroup.rotation.set(0, 0, 0);

      // Lean forward slightly, tuck more at high speed, shift back on wheelie
      const speedTuck = Math.min(0.45, Math.abs(speed) * 0.008);
      const wheelieShift = wheelieRatio * 0.35;
      torsoGroup.rotation.set(0.32 + speedTuck - wheelieShift, steer * 0.25, -steer * 0.12);
      headGroup.rotation.set(-0.22 - speedTuck * 0.7, steer * 0.35, 0);

      // Reach arms forward to handlebars
      const armPitch = -1.05 - speedTuck * 0.3 + wheelieShift * 0.5;
      left.upper.rotation.set(armPitch, -0.18 + steer * 0.15, 0.22);
      right.upper.rotation.set(armPitch, 0.18 + steer * 0.15, -0.22);
      left.forearm.rotation.set(-0.35, 0, 0);
      right.forearm.rotation.set(-0.35, 0, 0);

      // Knees bent to footpegs
      leftL.thigh.rotation.set(-0.95, 0.18, 0.18);
      rightL.thigh.rotation.set(-0.95, -0.18, -0.18);
      leftL.calf.rotation.set(1.25, 0, 0);
      rightL.calf.rotation.set(1.25, 0, 0);
    } else {
      // On-foot walking / running / jumping
      const absSpeed = Math.abs(speed);
      const moving = absSpeed > 0.3;
      const strideFreq = absSpeed > 5 ? 11.5 : 7.5;
      const amp = isJumping ? 0.65 : moving ? Math.min(0.85, absSpeed * 0.12) : 0.03;
      const phase = time * strideFreq;

      const bob = moving && !isJumping ? Math.abs(Math.sin(phase)) * 0.045 : Math.sin(time * 2) * 0.01;
      pelvisGroup.position.set(0, 0.90 + bob, 0);
      pelvisGroup.rotation.set(moving ? 0.08 : 0, 0, 0);

      torsoGroup.rotation.set(moving ? Math.min(0.22, absSpeed * 0.025) : 0, Math.sin(phase) * 0.06 * (moving ? 1 : 0), 0);
      headGroup.rotation.set(0, 0, 0);

      if (isJumping) {
        leftL.thigh.rotation.set(-0.65, 0, 0.08);
        rightL.thigh.rotation.set(0.35, 0, -0.08);
        leftL.calf.rotation.set(0.95, 0, 0);
        rightL.calf.rotation.set(0.45, 0, 0);
        left.upper.rotation.set(-0.9, 0, 0.35);
        right.upper.rotation.set(-0.9, 0, -0.35);
        left.forearm.rotation.set(-0.5, 0, 0);
        right.forearm.rotation.set(-0.5, 0, 0);
      } else {
        const swing = Math.sin(phase) * amp;
        leftL.thigh.rotation.set(swing, 0, 0.04);
        rightL.thigh.rotation.set(-swing, 0, -0.04);
        leftL.calf.rotation.set(Math.max(0.05, -swing * 0.8), 0, 0);
        rightL.calf.rotation.set(Math.max(0.05, swing * 0.8), 0, 0);

        left.upper.rotation.set(-swing * 0.85, 0, 0.08);
        right.upper.rotation.set(swing * 0.85, 0, -0.08);
        left.forearm.rotation.set(-0.35, 0, 0);
        right.forearm.rotation.set(-0.35, 0, 0);
      }
    }
  };

  return {
    root,
    pelvisGroup,
    torsoGroup,
    headGroup,
    leftArm: left.upper,
    rightArm: right.upper,
    leftForearm: left.forearm,
    rightForearm: right.forearm,
    leftLeg: leftL.thigh,
    rightLeg: rightL.thigh,
    leftCalf: leftL.calf,
    rightCalf: rightL.calf,
    applyCustomization,
    updatePose,
  };
}
