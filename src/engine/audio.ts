import { EngineSoundType } from '../types/game';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private driftGain: GainNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;
  private muted = false;
  private soundType: EngineSoundType = 'thump';
  private initialized = false;

  public initOnGesture(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.35;
    this.masterGain.connect(this.ctx.destination);

    // Engine synthesizer
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;
    this.engineFilter.Q.value = 2.5;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.configureOscillators(this.soundType);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Tire screech noise loop
    const bufferSize = this.ctx.sampleRate * 1.5;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.driftFilter = this.ctx.createBiquadFilter();
    this.driftFilter.type = 'bandpass';
    this.driftFilter.frequency.value = 1400;
    this.driftFilter.Q.value = 5.0;

    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0;

    noiseSource.connect(this.driftFilter);
    this.driftFilter.connect(this.driftGain);
    this.driftGain.connect(this.masterGain);
    noiseSource.start();

    this.initialized = true;
  }

  private configureOscillators(type: EngineSoundType): void {
    if (!this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;
    switch (type) {
      case 'thump': // Royal Enfield deep thump
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.engineFilter.frequency.value = 220;
        break;
      case 'single':
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'square';
        this.engineFilter.frequency.value = 380;
        break;
      case 'twin':
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'sawtooth';
        this.engineFilter.frequency.value = 460;
        break;
      case 'inline4':
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.engineFilter.frequency.value = 850;
        break;
      case 'electric':
        this.engineOsc1.type = 'sine';
        this.engineOsc2.type = 'triangle';
        this.engineFilter.frequency.value = 1600;
        break;
      case 'dirt':
        this.engineOsc1.type = 'square';
        this.engineOsc2.type = 'sawtooth';
        this.engineFilter.frequency.value = 420;
        break;
    }
  }

  public setSoundType(type: EngineSoundType): void {
    this.soundType = type;
    this.configureOscillators(type);
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.35, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateEngine(rpmRatio: number, isOnBike: boolean, throttle: number, isDrifting: boolean): void {
    if (!this.initialized || !this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineGain || !this.engineFilter || !this.driftGain) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!isOnBike) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.driftGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    let baseFreq = 32;
    let maxFreq = 130;
    let harmRatio = 1.5;
    let gainBase = 0.16;

    switch (this.soundType) {
      case 'thump':
        baseFreq = 22;
        maxFreq = 82;
        harmRatio = 2.0;
        gainBase = 0.22;
        break;
      case 'single':
        baseFreq = 36;
        maxFreq = 160;
        harmRatio = 1.5;
        gainBase = 0.16;
        break;
      case 'twin':
        baseFreq = 42;
        maxFreq = 190;
        harmRatio = 1.33;
        gainBase = 0.17;
        break;
      case 'inline4':
        baseFreq = 58;
        maxFreq = 340;
        harmRatio = 2.0;
        gainBase = 0.15;
        break;
      case 'electric':
        baseFreq = 110;
        maxFreq = 920;
        harmRatio = 1.5;
        gainBase = rpmRatio > 0.03 ? 0.12 : 0.01;
        break;
      case 'dirt':
        baseFreq = 34;
        maxFreq = 155;
        harmRatio = 1.48;
        gainBase = 0.16;
        break;
    }

    const freq = baseFreq + (maxFreq - baseFreq) * rpmRatio;
    this.engineOsc1.frequency.setTargetAtTime(freq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(freq * harmRatio, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(
      this.soundType === 'electric' ? 1200 + rpmRatio * 1400 : 180 + rpmRatio * 900 + throttle * 250,
      now,
      0.05
    );
    this.engineGain.gain.setTargetAtTime(gainBase + throttle * 0.07, now, 0.06);
    this.driftGain.gain.setTargetAtTime(isDrifting ? 0.14 : 0, now, 0.04);
  }

  public playHorn(): void {
    this.initOnGesture();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(392, now);
    osc2.frequency.setValueAtTime(493.88, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + 0.02);
    gain.gain.setValueAtTime(0.24, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  public playTrainHorn(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(146.8, now);
    osc2.frequency.setValueAtTime(185.0, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.95);
    osc2.stop(now + 0.95);
  }

  public playImpact(strength = 1): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);
    gain.gain.setValueAtTime(Math.min(0.45, 0.18 * strength), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playChime(success = true): void {
    this.initOnGesture();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = success ? [523.25, 659.25, 783.99, 1046.5] : [330, 261.63];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
