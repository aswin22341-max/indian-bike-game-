import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BIKES } from '../data/bikes';
import {
  ActiveMissionState,
  BikeSpec,
  CameraMode,
  HudSnapshot,
  MissionDef,
  RiderCustomization,
  StuntPopup,
  TimeOfDay,
  TouchInputState,
} from '../types/game';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import { SoundEngine } from './audio';
import { buildMotorcycle, BuiltBike } from './bikeBuilder';
import { buildRider, BuiltRider } from './riderBuilder';
import { buildIndianOpenWorld, BuiltWorld } from './worldBuilder';
import { TrafficSystem } from './trafficBuilder';

// Pre-allocated math helpers (zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camPos = new THREE.Vector3();

interface DustParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private textures: ProceduralTextureSet;
  private sound = new SoundEngine();
  private world: BuiltWorld;
  private traffic: TrafficSystem;

  // Lighting
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private timeOfDay: TimeOfDay = 'afternoon';

  // Active Bike & Rider
  private currentBikeSpec: BikeSpec = BIKES[1]; // Start on Duke 390
  private currentBikeColor: string = BIKES[1].defaultColor;
  private bike: BuiltBike;
  private rider: BuiltRider;
  private riderCust: RiderCustomization = {
    helmetStyle: 'fullface',
    helmetColor: '#f97316',
    outfitStyle: 'street',
  };

  // Physics State — Bike
  private bikePos = new THREE.Vector3(-40, 0.05, -20);
  private bikeHeading = 0; // 0 = +Z
  private bikeSpeed = 0; // m/s forward
  private bikeVy = 0;
  private bikeLatVel = 0; // drift lateral slip
  private bikeRoll = 0;
  private bikePitch = 0;
  private steerAngle = 0;
  private frontSuspOffset = 0;
  private rearSuspOffset = 0;
  private prevGroundY = 0.05;
  private isAirborne = false;
  private airStartTime = 0;
  private headlightsOn = false;
  private fuelLevel = 100;

  // Physics State — On-Foot Player
  private isOnBike = true;
  private footPos = new THREE.Vector3(-40, 0.05, -20);
  private footHeading = 0;
  private footVy = 0;
  private footGrounded = true;

  // Camera
  private cameraMode: CameraMode = 'chase';
  private startScreenActive = true;
  private showroomOpen = false;
  private showroomOrbitAngle = 0.7;
  private smoothCamPos = new THREE.Vector3(-40, 4, -30);
  private smoothLookAt = new THREE.Vector3(-40, 1.5, -15);

  // Stunts & Scoring
  private stuntScore = 0;
  private comboMultiplier = 1;
  private comboTimer = 0;
  private activeStuntLabel: string | null = null;
  private wheelieAccum = 0;
  private stoppieAccum = 0;
  private driftAccum = 0;
  private recentStunts: StuntPopup[] = [];
  private popupCounter = 1;
  private nearMissCooldown = 0;

  // Mission & Checkpoint Beacon
  private activeMission: ActiveMissionState | null = null;
  private completedMissionIds = new Set<string>();
  private beaconGroup: THREE.Group;
  private beaconRing: THREE.Mesh;

  // Particles
  private particles: DustParticle[] = [];
  private particleEmitTimer = 0;

  // Input
  private keys = new Set<string>();
  private touchInput: TouchInputState = {
    throttle: false,
    brake: false,
    left: false,
    right: false,
    wheelie: false,
    drift: false,
    jump: false,
  };

  // Callbacks
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onShowroomToggleRequest: () => void;
  private hudSyncTimer = 0;
  private elapsed = 0;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onShowroomToggleRequest: () => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onShowroomToggleRequest = onShowroomToggleRequest;

    // 1. Software WebGL Guard
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // 2. Scene & RoomEnvironment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x9fd8ef, 0.0022);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      64,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.2,
      850
    );

    // 3. Lighting Rig (Warm Sun + Cool Sky Hemisphere)
    this.hemiLight = new THREE.HemisphereLight(0xbbe6ff, 0x4f4436, 0.75);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.sunLight.position.set(80, 120, 60);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 300;
    const d = 95;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 4. Procedural Textures & World & Traffic
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    this.world = buildIndianOpenWorld(this.textures);
    this.scene.add(this.world.root);

    this.traffic = new TrafficSystem();
    this.scene.add(this.traffic.root);

    // 5. Bike & Rider
    this.bike = buildMotorcycle(
      this.currentBikeSpec,
      this.currentBikeColor,
      this.textures.contactShadow,
      !this.isSoftwareGl
    );
    this.bike.root.position.copy(this.bikePos);
    this.scene.add(this.bike.root);

    this.rider = buildRider(this.riderCust);
    this.bike.tiltGroup.add(this.rider.root);
    this.sound.setSoundType(this.currentBikeSpec.soundType);

    // 6. Mission Checkpoint Beacon
    this.beaconGroup = new THREE.Group();
    this.beaconGroup.visible = false;
    const ringGeo = new THREE.TorusGeometry(3.2, 0.24, 12, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.0,
    });
    this.beaconRing = new THREE.Mesh(ringGeo, ringMat);
    this.beaconGroup.add(this.beaconRing);

    const beamGeo = new THREE.CylinderGeometry(1.6, 2.4, 45, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 22.5;
    this.beaconGroup.add(beam);
    this.scene.add(this.beaconGroup);

    // 7. Particle Pool
    const partGeo = new THREE.DodecahedronGeometry(0.28, 0);
    for (let i = 0; i < 65; i++) {
      const partMat = new THREE.MeshBasicMaterial({
        color: 0xd6cfc2,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(partGeo, partMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1 });
    }

    this.applyTimeOfDay(this.timeOfDay);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerGesture);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handlePointerGesture = () => {
    this.sound.initOnGesture();
  };

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.sound.initOnGesture();
    if (this.startScreenActive) return;
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }
    this.keys.add(code);

    if (e.repeat) return;

    if (code === 'KeyF') {
      this.toggleMountBike();
    } else if (code === 'KeyV') {
      this.cycleCameraMode();
    } else if (code === 'KeyH') {
      this.honkHorn();
    } else if (code === 'KeyL') {
      this.toggleHeadlights();
    } else if (code === 'KeyG') {
      this.onShowroomToggleRequest();
    } else if (code === 'KeyR') {
      this.resetToRoad();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  // --- PUBLIC ACTIONS FOR UI ---
  public setTouchInput(partial: Partial<TouchInputState>): void {
    this.sound.initOnGesture();
    Object.assign(this.touchInput, partial);
  }

  public selectBike(spec: BikeSpec, colorHex: string): void {
    this.currentBikeSpec = spec;
    this.currentBikeColor = colorHex;
    const wasOnBike = this.isOnBike;

    // Detach rider cleanly before rebuilding bike
    if (wasOnBike) {
      this.bike.tiltGroup.remove(this.rider.root);
    }
    this.scene.remove(this.bike.root);

    this.bike = buildMotorcycle(spec, colorHex, this.textures.contactShadow, !this.isSoftwareGl);
    this.bike.root.position.copy(this.bikePos);
    this.bike.root.rotation.y = this.bikeHeading;
    this.bike.setHeadlights(this.headlightsOn);
    this.scene.add(this.bike.root);

    if (wasOnBike) {
      this.bike.tiltGroup.add(this.rider.root);
      this.rider.root.position.set(0, 0, 0);
      this.rider.root.rotation.set(0, 0, 0);
    }

    this.sound.setSoundType(spec.soundType);
    this.fuelLevel = 100;
  }

  public setBikeColor(hex: string): void {
    this.currentBikeColor = hex;
    this.bike.setPaintColor(hex);
  }

  public setRiderCustomization(cust: RiderCustomization): void {
    this.riderCust = { ...cust };
    this.rider.applyCustomization(this.riderCust);
  }

  public setStartScreenActive(active: boolean): void {
    this.startScreenActive = active;
    if (!active) {
      this.keys.clear();
    }
  }

  public setShowroomOpen(open: boolean): void {
    this.showroomOpen = open;
    if (open) {
      this.bikeSpeed = 0;
      this.bikeLatVel = 0;
      this.showroomOrbitAngle = this.bikeHeading + 0.75;
    }
  }

  public rotateShowroom(delta: number): void {
    this.showroomOrbitAngle += delta;
  }

  public toggleMountBike(): void {
    if (this.showroomOpen) return;
    if (this.isOnBike) {
      // Dismount beside bike
      this.isOnBike = false;
      this.bike.tiltGroup.remove(this.rider.root);
      this.scene.add(this.rider.root);
      const sideX = Math.cos(this.bikeHeading) * 1.1;
      const sideZ = -Math.sin(this.bikeHeading) * 1.1;
      this.footPos.set(
        this.bikePos.x + sideX,
        this.world.getGroundHeight(this.bikePos.x + sideX, this.bikePos.z + sideZ, this.bikePos.y),
        this.bikePos.z + sideZ
      );
      this.footHeading = this.bikeHeading;
      this.footVy = 0;
      this.footGrounded = true;
      this.rider.root.position.copy(this.footPos);
      this.rider.root.rotation.set(0, this.footHeading, 0);
    } else {
      // Mount if near bike
      const dist = Math.hypot(this.footPos.x - this.bikePos.x, this.footPos.z - this.bikePos.z);
      if (dist < 4.5) {
        this.isOnBike = true;
        this.scene.remove(this.rider.root);
        this.bike.tiltGroup.add(this.rider.root);
        this.rider.root.position.set(0, 0, 0);
        this.rider.root.rotation.set(0, 0, 0);
      }
    }
  }

  public cycleCameraMode(): void {
    const order: CameraMode[] = ['chase', 'action', 'helmet', 'orbit'];
    const next = order[(order.indexOf(this.cameraMode) + 1) % order.length];
    this.cameraMode = next;
  }

  public setTimeOfDay(tod: TimeOfDay): void {
    this.timeOfDay = tod;
    this.applyTimeOfDay(tod);
  }

  private applyTimeOfDay(tod: TimeOfDay): void {
    if (tod === 'morning') {
      this.scene.background = new THREE.Color(0x9bd7f5);
      (this.scene.fog as THREE.FogExp2).color.setHex(0xb4e2f7);
      (this.scene.fog as THREE.FogExp2).density = 0.0019;
      this.sunLight.color.setHex(0xfff5e0);
      this.sunLight.intensity = 2.0;
      this.sunLight.position.set(110, 80, 70);
      this.hemiLight.color.setHex(0xcbeaff);
      this.hemiLight.groundColor.setHex(0x52493a);
      this.hemiLight.intensity = 0.8;
    } else if (tod === 'afternoon') {
      this.scene.background = new THREE.Color(0x7cc6ed);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x9ad5f2);
      (this.scene.fog as THREE.FogExp2).density = 0.0018;
      this.sunLight.color.setHex(0xfff2d6);
      this.sunLight.intensity = 2.3;
      this.sunLight.position.set(60, 140, 50);
      this.hemiLight.color.setHex(0xbbe6ff);
      this.hemiLight.groundColor.setHex(0x574c3b);
      this.hemiLight.intensity = 0.78;
    } else if (tod === 'sunset') {
      this.scene.background = new THREE.Color(0xf59e6c);
      (this.scene.fog as THREE.FogExp2).color.setHex(0xe88d67);
      (this.scene.fog as THREE.FogExp2).density = 0.0024;
      this.sunLight.color.setHex(0xff944d);
      this.sunLight.intensity = 2.1;
      this.sunLight.position.set(-130, 36, 90);
      this.hemiLight.color.setHex(0xffb58a);
      this.hemiLight.groundColor.setHex(0x3a2a2d);
      this.hemiLight.intensity = 0.65;
      this.headlightsOn = true;
      this.bike.setHeadlights(true);
    } else {
      this.scene.background = new THREE.Color(0x0b1325);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x0d172b);
      (this.scene.fog as THREE.FogExp2).density = 0.0032;
      this.sunLight.color.setHex(0x7da2db);
      this.sunLight.intensity = 0.55;
      this.sunLight.position.set(-60, 90, -50);
      this.hemiLight.color.setHex(0x233863);
      this.hemiLight.groundColor.setHex(0x0b0f17);
      this.hemiLight.intensity = 0.45;
      this.headlightsOn = true;
      this.bike.setHeadlights(true);
    }
  }

  public toggleHeadlights(): void {
    this.headlightsOn = !this.headlightsOn;
    this.bike.setHeadlights(this.headlightsOn);
  }

  public toggleMute(): void {
    this.sound.setMuted(!this.sound.isMuted());
  }

  public honkHorn(): void {
    this.sound.playHorn();
  }

  public resetToRoad(): void {
    this.bikePos.set(-40, 0.05, -20);
    this.bikeHeading = 0;
    this.bikeSpeed = 0;
    this.bikeVy = 0;
    this.bikeLatVel = 0;
    this.bikeRoll = 0;
    this.bikePitch = 0;
    if (!this.isOnBike) {
      this.toggleMountBike();
    }
  }

  public startMission(mission: MissionDef): void {
    this.activeMission = {
      mission,
      currentCheckpointIndex: 0,
      timeLeftSec: mission.timeLimitSec,
      status: 'active',
      bestAchieved: mission.type === 'stunt' ? 0 : 0,
    };
    this.sound.playChime(true);
  }

  public cancelMission(): void {
    this.activeMission = null;
    this.beaconGroup.visible = false;
  }

  // --- MAIN LOOP ---
  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      this.elapsed += dt;

      this.stepSimulation(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = requestAnimationFrame(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private addStuntPopup(label: string, points: number): void {
    const awarded = Math.round(points * this.comboMultiplier);
    this.stuntScore += awarded;
    this.comboTimer = 4.0;
    this.comboMultiplier = Math.min(5, +(this.comboMultiplier + 0.5).toFixed(1));

    if (this.activeMission && this.activeMission.status === 'active' && this.activeMission.mission.type === 'stunt') {
      this.activeMission.bestAchieved += awarded;
    }

    this.recentStunts.unshift({
      id: this.popupCounter++,
      label,
      points: awarded,
      timestamp: this.elapsed,
    });
    if (this.recentStunts.length > 4) this.recentStunts.pop();
  }

  private emitDust(x: number, y: number, z: number, count: number, colorHex: number): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.life <= 0) {
        p.life = 0.5 + Math.random() * 0.35;
        p.maxLife = p.life;
        p.mesh.position.set(x + (Math.random() - 0.5) * 0.4, y + 0.15, z + (Math.random() - 0.5) * 0.4);
        p.vx = (Math.random() - 0.5) * 2.4;
        p.vy = 0.8 + Math.random() * 1.4;
        p.vz = (Math.random() - 0.5) * 2.4;
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        p.mesh.visible = true;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private stepSimulation(dt: number): void {
    const dyn = this.world.updateDynamicWorld(this.elapsed, dt, this.timeOfDay, () => {
      const dist = Math.hypot(this.bikePos.x - 0, this.bikePos.z - 65);
      if (dist < 220) this.sound.playTrainHorn();
    });

    const actorX = this.isOnBike ? this.bikePos.x : this.footPos.x;
    const actorZ = this.isOnBike ? this.bikePos.z : this.footPos.z;
    this.traffic.update(dt, dyn.nsGreen, dyn.ewGreen, actorX, actorZ, dyn.trainActive, dyn.trainX);

    // Move sun shadow frustum smoothly around player
    this.sunLight.target.position.set(actorX, 0, actorZ);
    const sunOffset =
      this.timeOfDay === 'sunset'
        ? _v1.set(-130, 36, 90)
        : this.timeOfDay === 'morning'
        ? _v1.set(110, 80, 70)
        : _v1.set(60, 140, 50);
    this.sunLight.position.set(actorX + sunOffset.x, sunOffset.y, actorZ + sunOffset.z);

    // Input aggregation
    const throttleIn =
      this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.touchInput.throttle ? 1 : 0;
    const brakeIn =
      this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.touchInput.brake ? 1 : 0;
    const leftIn =
      this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.touchInput.left ? 1 : 0;
    const rightIn =
      this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.touchInput.right ? 1 : 0;
    const steerIn = leftIn - rightIn; // +1 left, -1 right
    const wheelieIn =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchInput.wheelie;
    const driftIn = this.keys.has('Space') || this.touchInput.drift;
    const stoppieIn = this.keys.has('KeyC') || this.keys.has('ControlLeft');
    const jumpIn = this.keys.has('Space') || this.touchInput.jump;

    if (this.showroomOpen || this.startScreenActive) {
      this.showroomOrbitAngle += dt * 0.28;
      this.rider.updatePose(
        'riding',
        this.elapsed,
        0,
        0,
        0,
        false,
        this.bike.seatOffset,
        this.bike.handlebarOffset,
        this.bike.footpegOffset
      );
      this.sound.updateEngine(0.05, false, 0, false);
      this.updateCamera(dt);
      this.syncHud(dt);
      return;
    }

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboMultiplier = 1;
      }
    }
    if (this.nearMissCooldown > 0) this.nearMissCooldown -= dt;

    // --- BIKE PHYSICS ---
    let isDrifting = false;
    let isRefueling = false;
    if (this.isOnBike) {
      const spec = this.currentBikeSpec;
      const topSpeedMs = spec.topSpeedKmh / 3.6;
      const surface = this.world.getSurfaceType(this.bikePos.x, this.bikePos.z);
      const grip = surface === 'road' ? 1.0 : surface === 'sand' ? spec.offRoadGrip * 0.78 : spec.offRoadGrip;

      // Petrol Pump refuel check
      const distPetrol = Math.hypot(
        this.bikePos.x - this.world.petrolZone.x,
        this.bikePos.z - this.world.petrolZone.z
      );
      if (distPetrol < this.world.petrolZone.radius) {
        isRefueling = true;
        this.fuelLevel = Math.min(100, this.fuelLevel + dt * 32);
      } else if (throttleIn > 0) {
        this.fuelLevel = Math.max(5, this.fuelLevel - dt * 0.16);
      }

      // Forward Acceleration / Braking / Reverse
      const speedRatio = Math.min(1, Math.abs(this.bikeSpeed) / topSpeedMs);
      const effectiveAccel = spec.acceleration * (1 - speedRatio * 0.58) * grip;
      if (throttleIn > 0) {
        this.bikeSpeed += effectiveAccel * dt;
      }
      if (brakeIn > 0) {
        if (this.bikeSpeed > 0.8) {
          this.bikeSpeed = Math.max(0, this.bikeSpeed - spec.braking * dt);
        } else {
          // Reverse gear (up to -16 km/h)
          this.bikeSpeed = Math.max(-4.5, this.bikeSpeed - 8.5 * dt);
        }
      }
      if (throttleIn === 0 && brakeIn === 0) {
        // Rolling resistance + aerodynamic drag
        const drag = (surface === 'road' ? 1.8 : 4.2) + 0.008 * this.bikeSpeed * Math.abs(this.bikeSpeed);
        if (Math.abs(this.bikeSpeed) < drag * dt) {
          this.bikeSpeed = 0;
        } else {
          this.bikeSpeed -= Math.sign(this.bikeSpeed) * drag * dt;
        }
      }
      this.bikeSpeed = THREE.MathUtils.clamp(this.bikeSpeed, -4.5, topSpeedMs * grip);

      // Steering & Drifting
      const absSpeed = Math.abs(this.bikeSpeed);
      isDrifting = driftIn && absSpeed > 7.5 && !this.isAirborne && Math.abs(steerIn) > 0;
      const targetSteer = steerIn * (0.48 - 0.25 * speedRatio);
      this.steerAngle = THREE.MathUtils.damp(this.steerAngle, targetSteer, 10, dt);

      if (absSpeed > 0.35) {
        const turnRate =
          steerIn *
          spec.handling *
          (isDrifting ? 1.42 : 1.0) *
          Math.min(1, absSpeed / 6.5) *
          (1 - speedRatio * 0.32) *
          (this.bikeSpeed >= 0 ? 1 : -1);
        this.bikeHeading += turnRate * dt;
      }

      // Drift lateral velocity
      const targetLat = isDrifting ? -steerIn * absSpeed * 0.32 : 0;
      this.bikeLatVel = THREE.MathUtils.damp(this.bikeLatVel, targetLat, 7, dt);
      if (isDrifting) {
        this.bikeSpeed = Math.max(5, this.bikeSpeed - 3.2 * dt);
      }

      // Integrate horizontal position
      const fwdX = Math.sin(this.bikeHeading);
      const fwdZ = Math.cos(this.bikeHeading);
      const rightX = Math.cos(this.bikeHeading);
      const rightZ = -Math.sin(this.bikeHeading);

      this.bikePos.x += (fwdX * this.bikeSpeed + rightX * this.bikeLatVel) * dt;
      this.bikePos.z += (fwdZ * this.bikeSpeed + rightZ * this.bikeLatVel) * dt;

      // World boundary soft keep-in
      this.bikePos.x = THREE.MathUtils.clamp(this.bikePos.x, -410, 410);
      this.bikePos.z = THREE.MathUtils.clamp(this.bikePos.z, -390, 326);

      // Vertical Ground / Ramp / Flyover / Jump Physics
      const groundY = this.world.getGroundHeight(this.bikePos.x, this.bikePos.z, this.bikePos.y);
      const groundSlopeVy = (groundY - this.prevGroundY) / Math.max(dt, 0.001);

      if (this.bikePos.y <= groundY + 0.06 && this.bikeVy <= 0.5) {
        // Check if launching off ramp edge
        if (this.prevGroundY - groundY > 0.22 && absSpeed > 10) {
          this.isAirborne = true;
          this.bikeVy = Math.max(2.5, Math.min(13, absSpeed * 0.35));
          this.airStartTime = this.elapsed;
        } else {
          // Landed!
          if (this.isAirborne) {
            const airDur = this.elapsed - this.airStartTime;
            if (airDur > 0.55) {
              this.addStuntPopup(`BIG AIR (${airDur.toFixed(1)}s)`, Math.round(airDur * 320));
              this.sound.playImpact(Math.min(1.6, airDur));
            }
            this.frontSuspOffset = spec.suspensionTravel * 0.85;
            this.rearSuspOffset = spec.suspensionTravel * 0.85;
            this.emitDust(this.bikePos.x, groundY, this.bikePos.z, 8, 0xcab99b);
            this.isAirborne = false;
          }
          // Speed breaker suspension bump!
          if (groundSlopeVy > 1.8 && absSpeed > 4) {
            this.frontSuspOffset = Math.min(spec.suspensionTravel, groundSlopeVy * 0.025);
            this.rearSuspOffset = Math.min(spec.suspensionTravel, groundSlopeVy * 0.022);
            if (absSpeed > 18 && groundY > this.prevGroundY + 0.08) {
              this.bikeVy = Math.min(4.8, absSpeed * 0.14);
              this.isAirborne = true;
              this.airStartTime = this.elapsed;
            }
          }
          this.bikePos.y = groundY;
          this.bikeVy = Math.max(0, groundSlopeVy * 0.65);
        }
      } else {
        this.isAirborne = true;
        this.bikeVy -= 19.5 * dt; // Gravity
        this.bikePos.y += this.bikeVy * dt;
        if (this.bikePos.y <= groundY) {
          this.bikePos.y = groundY;
        }
      }
      this.prevGroundY = groundY;

      // Collisions against buildings, trees, pillars, traffic, train
      this.resolveCollisions(dyn.trainActive, dyn.trainX);

      // Lean Roll + Wheelie + Stoppie Pitch
      const leanMaxRad = THREE.MathUtils.degToRad(spec.leanMaxDeg);
      const targetRoll =
        -steerIn *
        leanMaxRad *
        Math.min(1, absSpeed / 12) *
        (isDrifting ? 1.15 : 1.0);
      this.bikeRoll = THREE.MathUtils.damp(this.bikeRoll, targetRoll, 9, dt);

      // Wheelie (-X pitch) & Stoppie (+X pitch)
      const canWheelie = wheelieIn && throttleIn > 0 && this.bikeSpeed > 5 && !this.isAirborne;
      const canStoppie = (stoppieIn || (brakeIn > 0 && driftIn)) && this.bikeSpeed > 8 && !this.isAirborne;

      let targetPitch = 0;
      if (this.isAirborne) {
        targetPitch = THREE.MathUtils.clamp(-this.bikeVy * 0.045, -0.45, 0.45);
      } else if (canWheelie) {
        targetPitch = -0.44 * Math.min(1.15, spec.wheeliePower);
      } else if (canStoppie) {
        targetPitch = 0.34;
      } else if (throttleIn > 0) {
        targetPitch = -0.05; // Acceleration squat
      } else if (brakeIn > 0 && this.bikeSpeed > 2) {
        targetPitch = 0.07; // Brake dive
      }
      this.bikePitch = THREE.MathUtils.damp(this.bikePitch, targetPitch, 8, dt);

      // Suspension spring-damper recovery
      const targetFrontSusp = brakeIn > 0 && this.bikeSpeed > 2 ? spec.suspensionTravel * 0.45 : 0;
      const targetRearSusp = throttleIn > 0 ? spec.suspensionTravel * 0.35 : 0;
      this.frontSuspOffset = THREE.MathUtils.damp(this.frontSuspOffset, targetFrontSusp, 14, dt);
      this.rearSuspOffset = THREE.MathUtils.damp(this.rearSuspOffset, targetRearSusp, 14, dt);

      // Apply transforms to bike 3D hierarchy
      this.bike.root.position.copy(this.bikePos);
      this.bike.root.rotation.y = this.bikeHeading;
      this.bike.tiltGroup.rotation.set(this.bikePitch, isDrifting ? -steerIn * 0.22 : 0, this.bikeRoll);

      // Front fork steering & suspension compression
      this.bike.frontSteeringGroup.rotation.y = this.steerAngle;
      this.bike.frontSuspGroup.position.y = this.frontSuspOffset;
      this.bike.rearSwingarmGroup.rotation.x = -this.rearSuspOffset * 0.7;

      // Wheel rotation
      const wheelDelta = (this.bikeSpeed * dt) / this.bike.wheelRadius;
      this.bike.frontWheelGroup.rotation.x += wheelDelta;
      this.bike.rearWheelGroup.rotation.x += wheelDelta;
      this.bike.setBraking(brakeIn > 0);

      // Rider pose on bike
      const wheelieRatio = Math.max(0, -this.bikePitch / 0.48);
      this.rider.updatePose(
        'riding',
        this.elapsed,
        this.bikeSpeed,
        steerIn,
        wheelieRatio,
        this.isAirborne,
        this.bike.seatOffset,
        this.bike.handlebarOffset,
        this.bike.footpegOffset
      );

      // Stunt detection & particle emission
      this.activeStuntLabel = null;
      if (this.bikePitch < -0.24 && !this.isAirborne) {
        this.activeStuntLabel = 'WHEELIE';
        this.wheelieAccum += dt;
        if (this.wheelieAccum > 0.6) {
          this.addStuntPopup('WHEELIE', 120);
          this.wheelieAccum = 0;
        }
      } else if (this.bikePitch > 0.18 && !this.isAirborne) {
        this.activeStuntLabel = 'STOPPIE';
        this.stoppieAccum += dt;
        if (this.stoppieAccum > 0.5) {
          this.addStuntPopup('STOPPIE', 140);
          this.stoppieAccum = 0;
        }
      } else if (isDrifting) {
        this.activeStuntLabel = 'DRIFT';
        this.driftAccum += dt;
        if (this.driftAccum > 0.6) {
          this.addStuntPopup('DRIFT', 110);
          this.driftAccum = 0;
        }
      } else if (this.isAirborne && this.elapsed - this.airStartTime > 0.35) {
        this.activeStuntLabel = 'AIRBORNE';
      }

      this.particleEmitTimer += dt;
      if (this.particleEmitTimer > 0.05) {
        this.particleEmitTimer = 0;
        if (isDrifting) {
          this.emitDust(this.bikePos.x, this.bikePos.y, this.bikePos.z, 2, 0xe2e8f0);
        } else if (surface !== 'road' && absSpeed > 6 && !this.isAirborne) {
          this.emitDust(
            this.bikePos.x,
            this.bikePos.y,
            this.bikePos.z,
            1,
            surface === 'sand' ? 0xdec48f : 0x7c6a4f
          );
        }
      }

      // Engine Audio
      const rpm = Math.min(1, (absSpeed / topSpeedMs) * 0.85 + (throttleIn ? 0.15 : 0.04));
      this.sound.updateEngine(rpm, true, throttleIn, isDrifting);
    } else {
      // --- ON-FOOT PLAYER PHYSICS ---
      this.sound.updateEngine(0, false, 0, false);
      this.bike.tiltGroup.rotation.set(0, 0, 0.12); // Parked on kickstand!

      const moveForward = throttleIn - brakeIn;
      const turnInput = steerIn;
      const sprint = wheelieIn ? 8.2 : 4.2;

      // Move relative to camera horizontal view
      const camYaw = Math.atan2(
        this.bikePos.x * 0 + (this.footPos.x - this.camera.position.x),
        this.footPos.z - this.camera.position.z
      );
      let vx = 0;
      let vz = 0;
      if (moveForward !== 0 || turnInput !== 0) {
        const inputAngle = Math.atan2(-turnInput, moveForward);
        const worldAngle = camYaw + inputAngle;
        this.footHeading = worldAngle;
        vx = Math.sin(worldAngle) * sprint;
        vz = Math.cos(worldAngle) * sprint;
      }

      this.footPos.x = THREE.MathUtils.clamp(this.footPos.x + vx * dt, -410, 410);
      this.footPos.z = THREE.MathUtils.clamp(this.footPos.z + vz * dt, -390, 326);

      const groundY = this.world.getGroundHeight(this.footPos.x, this.footPos.z, this.footPos.y);
      if (this.footGrounded && jumpIn) {
        this.footVy = 7.5;
        this.footGrounded = false;
      }
      if (!this.footGrounded) {
        this.footVy -= 19.5 * dt;
        this.footPos.y += this.footVy * dt;
        if (this.footPos.y <= groundY) {
          this.footPos.y = groundY;
          this.footVy = 0;
          this.footGrounded = true;
        }
      } else {
        this.footPos.y = groundY;
      }

      this.rider.root.position.copy(this.footPos);
      this.rider.root.rotation.set(0, this.footHeading, 0);
      const footSpeed = Math.hypot(vx, vz);
      this.rider.updatePose('foot', this.elapsed, footSpeed, 0, 0, !this.footGrounded);
    }

    // Update particles
    for (const p of this.particles) {
      if (p.life > 0) {
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const alpha = Math.max(0, p.life / p.maxLife);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.55;
        p.mesh.scale.setScalar(1 + (1 - alpha) * 1.8);
        if (p.life <= 0) p.mesh.visible = false;
      }
    }

    // Update Mission & Beacon
    this.updateMission(dt);

    // Update Camera
    this.updateCamera(dt);

    // Sync HUD at ~20Hz
    this.syncHud(dt, isDrifting, isRefueling);
  }

  private resolveCollisions(trainActive: boolean, trainX: number): void {
    const bx = this.bikePos.x;
    const bz = this.bikePos.z;
    const bikeR = 0.95;

    // 1. Circle colliders (trees, pillars, temple, poles)
    for (const c of this.world.circleColliders) {
      const dx = bx - c.x;
      const dz = bz - c.z;
      const minD = bikeR + c.radius;
      const dSq = dx * dx + dz * dz;
      if (dSq < minD * minD && dSq > 0.0001) {
        const dist = Math.sqrt(dSq);
        const nx = dx / dist;
        const nz = dz / dist;
        this.bikePos.x = c.x + nx * minD;
        this.bikePos.z = c.z + nz * minD;
        if (Math.abs(this.bikeSpeed) > 4) {
          this.sound.playImpact(Math.min(1.5, Math.abs(this.bikeSpeed) / 15));
          this.bikeSpeed *= -0.32;
        } else {
          this.bikeSpeed = 0;
        }
      }
    }

    // 2. Building Box colliders
    for (const b of this.world.boxColliders) {
      if (this.bikePos.y > b.maxY) continue;
      const cx = THREE.MathUtils.clamp(bx, b.minX, b.maxX);
      const cz = THREE.MathUtils.clamp(bz, b.minZ, b.maxZ);
      const dx = bx - cx;
      const dz = bz - cz;
      const dSq = dx * dx + dz * dz;
      if (dSq < bikeR * bikeR) {
        const dist = Math.sqrt(dSq);
        if (dist > 0.001) {
          this.bikePos.x = cx + (dx / dist) * bikeR;
          this.bikePos.z = cz + (dz / dist) * bikeR;
        } else {
          this.bikePos.z = b.maxZ + bikeR;
        }
        if (Math.abs(this.bikeSpeed) > 4) {
          this.sound.playImpact(1.0);
          this.bikeSpeed *= -0.35;
        } else {
          this.bikeSpeed = 0;
        }
      }
    }

    // 3. Traffic Vehicles & Near-Miss detection
    const speedKmh = Math.abs(this.bikeSpeed) * 3.6;
    for (const a of this.traffic.agents) {
      const dx = this.bikePos.x - a.x;
      const dz = this.bikePos.z - a.z;
      const dist = Math.hypot(dx, dz);
      const minD = bikeR + a.radius;
      if (dist < minD && dist > 0.001 && this.bikePos.y < 2.2) {
        this.bikePos.x = a.x + (dx / dist) * minD;
        this.bikePos.z = a.z + (dz / dist) * minD;
        if (Math.abs(this.bikeSpeed) > 5) {
          this.sound.playImpact(1.2);
          this.bikeSpeed *= -0.35;
        }
      } else if (dist < minD + 2.0 && speedKmh > 68 && this.nearMissCooldown <= 0) {
        this.nearMissCooldown = 1.8;
        this.addStuntPopup('NEAR MISS!', 150);
      }
    }

    // 4. Passing Indian Railways Train (z = 65, trainX - 90 .. trainX + 9)
    if (trainActive && Math.abs(this.bikePos.z - 65) < 2.8 && this.bikePos.y < 4.5) {
      if (this.bikePos.x > trainX - 96 && this.bikePos.x < trainX + 10) {
        this.bikePos.z = this.bikePos.z > 65 ? 68.2 : 61.8;
        this.sound.playImpact(1.6);
        this.bikeSpeed *= -0.5;
      }
    }
  }

  private updateMission(dt: number): void {
    if (!this.activeMission || this.activeMission.status !== 'active') {
      this.beaconGroup.visible = false;
      return;
    }

    const m = this.activeMission.mission;
    this.activeMission.timeLeftSec -= dt;
    if (this.activeMission.timeLeftSec <= 0) {
      this.activeMission.timeLeftSec = 0;
      this.activeMission.status = 'failed';
      this.beaconGroup.visible = false;
      this.sound.playChime(false);
      return;
    }

    const px = this.isOnBike ? this.bikePos.x : this.footPos.x;
    const pz = this.isOnBike ? this.bikePos.z : this.footPos.z;
    const speedKmh = Math.abs(this.bikeSpeed) * 3.6;

    if (m.type === 'checkpoint') {
      const cp = m.checkpoints[this.activeMission.currentCheckpointIndex];
      const cy = this.world.getGroundHeight(cp.x, cp.z, 20);
      this.beaconGroup.visible = true;
      this.beaconGroup.position.set(cp.x, cy + 0.3, cp.z);
      this.beaconRing.rotation.z = this.elapsed * 2.5;

      const dist = Math.hypot(px - cp.x, pz - cp.z);
      if (dist < 7.5) {
        this.sound.playChime(true);
        this.activeMission.currentCheckpointIndex++;
        if (this.activeMission.currentCheckpointIndex >= m.checkpoints.length) {
          this.activeMission.status = 'completed';
          this.stuntScore += m.rewardPoints;
          this.completedMissionIds.add(m.id);
          this.beaconGroup.visible = false;
        }
      }
    } else if (m.type === 'stunt') {
      this.beaconGroup.visible = false;
      if (this.activeMission.bestAchieved >= (m.targetScore ?? 1500)) {
        this.activeMission.status = 'completed';
        this.stuntScore += m.rewardPoints;
        this.completedMissionIds.add(m.id);
        this.sound.playChime(true);
      }
    } else if (m.type === 'speed') {
      const cp = m.checkpoints[0];
      if (cp) {
        this.beaconGroup.visible = true;
        this.beaconGroup.position.set(cp.x, 0.3, cp.z);
      }
      this.activeMission.bestAchieved = Math.max(this.activeMission.bestAchieved, Math.round(speedKmh));
      if (speedKmh >= (m.targetSpeedKmh ?? 175)) {
        this.activeMission.status = 'completed';
        this.stuntScore += m.rewardPoints;
        this.completedMissionIds.add(m.id);
        this.beaconGroup.visible = false;
        this.sound.playChime(true);
      }
    }
  }

  private updateCamera(dt: number): void {
    if (this.showroomOpen || this.startScreenActive) {
      const dist = this.startScreenActive ? 4.3 : 3.6;
      const angle = this.showroomOrbitAngle;
      _camPos.set(
        this.bikePos.x + Math.sin(angle) * dist,
        this.bikePos.y + (this.startScreenActive ? 1.6 : 1.45),
        this.bikePos.z + Math.cos(angle) * dist
      );
      // Offset lookAt slightly left on start screen so bike sits framed cleanly on the right half
      const lookOffsetX = this.startScreenActive ? -Math.cos(angle) * 0.9 : 0;
      const lookOffsetZ = this.startScreenActive ? Math.sin(angle) * 0.9 : 0;
      _camTarget.set(
        this.bikePos.x + lookOffsetX,
        this.bikePos.y + 0.78,
        this.bikePos.z + lookOffsetZ
      );
      this.camera.position.lerp(_camPos, 1 - Math.exp(-8 * dt));
      this.camera.lookAt(_camTarget);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 48, 8, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (!this.isOnBike) {
      // Third-person on-foot chase cam
      const dist = 4.6;
      _camPos.set(
        this.footPos.x - Math.sin(this.footHeading) * dist,
        this.footPos.y + 2.35,
        this.footPos.z - Math.cos(this.footHeading) * dist
      );
      _camTarget.set(this.footPos.x, this.footPos.y + 1.35, this.footPos.z);
      this.smoothCamPos.lerp(_camPos, 1 - Math.exp(-7 * dt));
      this.smoothLookAt.lerp(_camTarget, 1 - Math.exp(-10 * dt));
      this.camera.position.copy(this.smoothCamPos);
      this.camera.lookAt(this.smoothLookAt);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 60, 8, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    const fwdX = Math.sin(this.bikeHeading);
    const fwdZ = Math.cos(this.bikeHeading);
    const speedRatio = Math.min(1, Math.abs(this.bikeSpeed) / 55);

    if (this.cameraMode === 'helmet') {
      // First-Person Rider Helmet View
      _camPos.set(
        this.bikePos.x + fwdX * 0.15,
        this.bikePos.y + 1.48,
        this.bikePos.z + fwdZ * 0.15
      );
      _camTarget.set(
        this.bikePos.x + fwdX * 18,
        this.bikePos.y + 1.25 - this.bikePitch * 6,
        this.bikePos.z + fwdZ * 18
      );
      this.camera.position.copy(_camPos);
      this.camera.lookAt(_camTarget);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 72 + speedRatio * 14, 8, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    let dist = 5.4;
    let height = 2.25;
    let targetFov = 64 + speedRatio * 14;

    if (this.cameraMode === 'action') {
      dist = 3.8;
      height = 1.65;
      targetFov = 70 + speedRatio * 16;
    } else if (this.cameraMode === 'orbit') {
      const ang = this.bikeHeading + this.elapsed * 0.55;
      _camPos.set(
        this.bikePos.x - Math.sin(ang) * 5.8,
        this.bikePos.y + 2.5,
        this.bikePos.z - Math.cos(ang) * 5.8
      );
      _camTarget.set(this.bikePos.x, this.bikePos.y + 0.9, this.bikePos.z);
      this.smoothCamPos.lerp(_camPos, 1 - Math.exp(-7 * dt));
      this.smoothLookAt.lerp(_camTarget, 1 - Math.exp(-10 * dt));
      this.camera.position.copy(this.smoothCamPos);
      this.camera.lookAt(this.smoothLookAt);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 58, 8, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    _camPos.set(
      this.bikePos.x - fwdX * (dist + speedRatio * 0.8),
      this.bikePos.y + height,
      this.bikePos.z - fwdZ * (dist + speedRatio * 0.8)
    );
    _camTarget.set(
      this.bikePos.x + fwdX * 4.5,
      this.bikePos.y + 1.05,
      this.bikePos.z + fwdZ * 4.5
    );

    this.smoothCamPos.lerp(_camPos, 1 - Math.exp(-9 * dt));
    this.smoothLookAt.lerp(_camTarget, 1 - Math.exp(-12 * dt));

    this.camera.position.copy(this.smoothCamPos);
    this.camera.lookAt(this.smoothLookAt);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
    this.camera.updateProjectionMatrix();
  }

  private syncHud(dt: number, isDrifting = false, isRefueling = false): void {
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer < 0.05) return;
    this.hudSyncTimer = 0;

    // Prune old stunt popups (> 2.6s)
    this.recentStunts = this.recentStunts.filter((s) => this.elapsed - s.timestamp < 2.6);

    const speedKmh = Math.round(Math.abs(this.bikeSpeed) * 3.6);
    const topKmh = this.currentBikeSpec.topSpeedKmh;
    const gear: number | 'R' | 'N' =
      this.bikeSpeed < -0.3
        ? 'R'
        : speedKmh < 2
        ? 'N'
        : Math.min(6, Math.max(1, Math.ceil((speedKmh / topKmh) * 6)));

    const rpmRatio =
      gear === 'N'
        ? 0.14
        : Math.min(1, ((speedKmh % (topKmh / 6)) / (topKmh / 6)) * 0.72 + (speedKmh / topKmh) * 0.35);

    const px = this.isOnBike ? this.bikePos.x : this.footPos.x;
    const pz = this.isOnBike ? this.bikePos.z : this.footPos.z;
    const canMountBike =
      !this.isOnBike && Math.hypot(this.footPos.x - this.bikePos.x, this.footPos.z - this.bikePos.z) < 4.5;

    this.onHudUpdate({
      speedKmh,
      rpmRatio,
      gear,
      isOnBike: this.isOnBike,
      canMountBike,
      currentZone: this.world.getZoneName(px, pz),
      stuntScore: this.stuntScore,
      comboMultiplier: this.comboMultiplier,
      activeStuntLabel: this.activeStuntLabel,
      recentStunts: [...this.recentStunts],
      headlightsOn: this.headlightsOn,
      cameraMode: this.cameraMode,
      timeOfDay: this.timeOfDay,
      playerX: px,
      playerZ: pz,
      playerHeading: this.isOnBike ? this.bikeHeading : this.footHeading,
      bikeX: this.bikePos.x,
      bikeZ: this.bikePos.z,
      activeMission: this.activeMission ? { ...this.activeMission } : null,
      completedMissionIds: Array.from(this.completedMissionIds),
      wheelieAngleDeg: Math.round(THREE.MathUtils.radToDeg(Math.max(0, -this.bikePitch))),
      stoppieAngleDeg: Math.round(THREE.MathUtils.radToDeg(Math.max(0, this.bikePitch))),
      isDrifting,
      isAirborne: this.isAirborne,
      isRefueling,
      fuelLevel: Math.round(this.fuelLevel),
      muted: this.sound.isMuted(),
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerGesture);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.textures.dispose();
    this.sound.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
