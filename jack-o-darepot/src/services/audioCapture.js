/**
 * Audio Capture Service
 * Captures loopback PC audio or microphone input, splits frequency spectrum into
 * 3 distinct frequency bands (Lows, Mids, Highs), and provides ultra-responsive,
 * configurable peak envelope tracking with 0-delay capability.
 */
export class AudioCaptureService {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.stream = null;
    this.freqData = null;
    this.isCapturing = false;
    this.isSynthetic = false;

    // Default Web Audio analyser smoothing (0.0 = pure 0-delay raw data)
    this.smoothingTimeConstant = 0.35;

    // Peak envelope followers
    this.lowsPeak = 0;
    this.midsPeak = 0;
    this.highsPeak = 0;
    this.lastTimeMs = performance.now();
  }

  setSmoothing(val) {
    const clamped = Math.max(0.0, Math.min(0.95, Number(val)));
    this.smoothingTimeConstant = clamped;
    if (this.analyser) {
      try {
        this.analyser.smoothingTimeConstant = clamped;
      } catch (e) {
        console.warn("Error updating smoothingTimeConstant:", e);
      }
    }
  }

  async start() {
    if (this.isCapturing) return true;

    try {
      // 1. Attempt loopback capture via Electron's setDisplayMediaRequestHandler
      if (navigator.mediaDevices?.getDisplayMedia) {
        this.stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: { width: 1, height: 1, frameRate: 1 },
        });

        // Immediately terminate dummy video tracks to free GPU and memory
        this.stream.getVideoTracks().forEach((track) => track.stop());
      } else if (navigator.mediaDevices?.getUserMedia) {
        // Fallback to microphone if display media is unavailable
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API not supported");
      }

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();

      this.analyser.fftSize = 1024; // 512 frequency bins (~43Hz resolution at 44.1kHz)
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
      source.connect(this.analyser);

      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.isCapturing = true;
      this.isSynthetic = false;
      return true;
    } catch (err) {
      console.warn(
        "[AudioCapture] Live capture not available, using synthetic 3-band rhythm generator:",
        err
      );
      this.isCapturing = true;
      this.isSynthetic = true;
      return false;
    }
  }

  getBands(
    timeMs = performance.now(),
    options = {}
  ) {
    const {
      lowsSmoothing = 0.15,
      midsSmoothing = 0.20,
      highsSmoothing = 0.15,
      audioGain = 1.2,
      lowsMaxFreq = 120,
      midsMaxFreq = 3500,
      highsMaxFreq = 16000,
      lowsGain = 1.5,
      midsGain = 1.4,
      highsGain = 1.5,
    } = options;

    const dt = Math.min(0.1, Math.max(0.001, (timeMs - this.lastTimeMs) * 0.001));
    this.lastTimeMs = timeMs;

    if (!this.isCapturing) {
      return {
        lows: 0.0,
        mids: 0.0,
        highs: 0.0,
        lowsPeak: 0.0,
        midsPeak: 0.0,
        highsPeak: 0.0,
        bass: 0.0,
        treble: 0.0,
      };
    }

    if (this.isSynthetic || !this.analyser || !this.freqData) {
      // Synthetic 3-band electronic beat generator:
      // - Lows: 4-on-the-floor kick beat
      // - Mids: Snare on 2 and 4
      // - Highs: 16th-note hi-hat pulse
      const bpm = 124;
      const beatProgress = (timeMs / 1000) * (bpm / 60);
      const beatFraction = beatProgress % 1.0;
      const measureBeat = Math.floor(beatProgress) % 4; // 0, 1, 2, 3

      // Kick drum on each beat (decay curve) scaled by lowsGain
      const kick = Math.max(0, 1.0 - beatFraction * 3.5);
      const synthLows = (Math.pow(kick, 2.0) * 0.9 + 0.1) * audioGain * (lowsGain / 1.5);

      // Snare on beats 1 and 3 (0-indexed: 2nd and 4th beats) scaled by midsGain
      const isSnareBeat = measureBeat === 1 || measureBeat === 3;
      const snare = isSnareBeat ? Math.max(0, 1.0 - beatFraction * 2.8) : 0;
      const synthMids = (Math.pow(snare, 1.8) * 0.85 + 0.12) * audioGain * (midsGain / 1.4);

      // Hi-hat 16th notes (4 ticks per beat) scaled by highsGain
      const sixteenthFraction = (beatProgress * 4) % 1.0;
      const hihat = Math.max(0, 1.0 - sixteenthFraction * 4.0);
      const synthHighs = (Math.pow(hihat, 1.5) * 0.75 + 0.15) * audioGain * (highsGain / 1.5);

      this.updatePeaks(
        Math.min(1.0, synthLows),
        Math.min(1.0, synthMids),
        Math.min(1.0, synthHighs),
        dt,
        lowsSmoothing,
        midsSmoothing,
        highsSmoothing
      );

      const bands = {
        lows: Math.min(1.0, synthLows),
        mids: Math.min(1.0, synthMids),
        highs: Math.min(1.0, synthHighs),
        lowsPeak: this.lowsPeak,
        midsPeak: this.midsPeak,
        highsPeak: this.highsPeak,
        bass: Math.min(1.0, synthLows),
        treble: Math.min(1.0, synthHighs),
      };
      this.currentBands = bands;
      return bands;
    }

    this.analyser.getByteFrequencyData(this.freqData);

    const sampleRate = this.audioCtx ? this.audioCtx.sampleRate : 44100;
    const binWidth = sampleRate / (this.analyser.fftSize || 1024);

    // 1. LOWS: Exactly 0 to lowsMaxFreq Hz (Sub-bass, 808s, and kick thump)
    const lowBinMax = Math.max(1, Math.min(this.freqData.length - 2, Math.ceil(lowsMaxFreq / binWidth)));
    let lowsSum = 0;
    for (let i = 0; i < lowBinMax; i++) {
      lowsSum += this.freqData[i];
    }
    const rawLows = Math.min(1.0, ((lowsSum / lowBinMax / 255) * lowsGain) * audioGain);

    // 2. MIDS: lowsMaxFreq to midsMaxFreq Hz (Snares, claps, vocal body, brass, guitars, lead synths)
    const midBinMin = lowBinMax;
    const midBinMax = Math.max(midBinMin + 1, Math.min(this.freqData.length - 1, Math.ceil(midsMaxFreq / binWidth)));
    let midsSum = 0;
    const midsCount = midBinMax - midBinMin;
    for (let i = midBinMin; i < midBinMax; i++) {
      midsSum += this.freqData[i];
    }
    const rawMids = Math.min(1.0, ((midsSum / midsCount / 255) * midsGain) * audioGain);

    // 3. HIGHS: midsMaxFreq to highsMaxFreq Hz (Hi-hats, percussive transients, cymbals, sizzle)
    const highBinMin = midBinMax;
    const highBinMax = Math.max(highBinMin + 1, Math.min(this.freqData.length, Math.ceil(highsMaxFreq / binWidth)));
    let highsSum = 0;
    const highsCount = highBinMax - highBinMin;
    for (let i = highBinMin; i < highBinMax; i++) {
      highsSum += this.freqData[i];
    }
    const rawHighs = Math.min(1.0, ((highsSum / highsCount / 255) * highsGain) * audioGain);

    this.updatePeaks(
      rawLows,
      rawMids,
      rawHighs,
      dt,
      lowsSmoothing,
      midsSmoothing,
      highsSmoothing
    );

    const bands = {
      lows: rawLows,
      mids: rawMids,
      highs: rawHighs,
      lowsPeak: this.lowsPeak,
      midsPeak: this.midsPeak,
      highsPeak: this.highsPeak,
      bass: rawLows,
      treble: rawHighs,
    };
    this.currentBands = bands;
    return bands;
  }

  getSpectrumData() {
    const sampleRate = this.audioCtx ? this.audioCtx.sampleRate : 44100;
    const binCount = this.analyser ? this.analyser.frequencyBinCount : 512;

    if (this.isCapturing && this.analyser && this.freqData) {
      this.analyser.getByteFrequencyData(this.freqData);
      return {
        freqData: this.freqData,
        sampleRate,
        binCount: this.freqData.length,
        isCapturing: true,
        isSynthetic: Boolean(this.isSynthetic),
        bands: this.currentBands || {
          lows: 0,
          mids: 0,
          highs: 0,
          lowsPeak: this.lowsPeak,
          midsPeak: this.midsPeak,
          highsPeak: this.highsPeak,
        },
      };
    }

    // Synthetic frequency visualizer fallback for previews / silent input
    if (!this.syntheticFreqData || this.syntheticFreqData.length !== 128) {
      this.syntheticFreqData = new Uint8Array(128);
    }

    const t = performance.now() * 0.001;
    const kick = Math.max(0, 1.0 - ((t % 0.48) / 0.48) * 3.2);
    const snare = Math.max(0, 1.0 - Math.abs(((t % 0.96) / 0.96) - 0.5) * 7.5);
    const hat = Math.max(0, 1.0 - ((t % 0.12) / 0.12) * 2.8);

    for (let i = 0; i < 128; i++) {
      let val = 0;
      if (i < 8) {
        val = kick * 230 + Math.sin(t * 12 + i) * 35 + 25;
      } else if (i < 48) {
        val = snare * 190 + Math.sin(t * 8 + i * 0.6) * 45 + Math.sin(t * 3) * 25 + 20;
      } else {
        val = hat * 175 + Math.random() * 35 + Math.sin(t * 18 + i) * 20 + 15;
      }
      this.syntheticFreqData[i] = Math.max(0, Math.min(255, Math.round(val)));
    }

    return {
      freqData: this.syntheticFreqData,
      sampleRate,
      binCount: 128,
      isCapturing: this.isCapturing,
      isSynthetic: true,
      bands: this.currentBands || {
        lows: kick,
        mids: snare,
        highs: hat,
        lowsPeak: Math.max(this.lowsPeak, kick),
        midsPeak: Math.max(this.midsPeak, snare),
        highsPeak: Math.max(this.highsPeak, hat),
      },
    };
  }

  updatePeaks(lows, mids, highs, dt, lowsSmoothing, midsSmoothing, highsSmoothing) {
    // If smoothing is <= 0.01: Pure 0-delay instant tracking without decay delay
    if (lowsSmoothing <= 0.01) {
      this.lowsPeak = lows;
    } else {
      if (lows >= this.lowsPeak) {
        this.lowsPeak = lows; // Instant attack on transients
      } else {
        const decayRate = 1.0 + (1.0 - lowsSmoothing) * 10.0;
        this.lowsPeak = Math.max(0, this.lowsPeak - dt * decayRate);
      }
    }

    if (midsSmoothing <= 0.01) {
      this.midsPeak = mids;
    } else {
      if (mids >= this.midsPeak) {
        this.midsPeak = mids;
      } else {
        const decayRate = 1.0 + (1.0 - midsSmoothing) * 9.0;
        this.midsPeak = Math.max(0, this.midsPeak - dt * decayRate);
      }
    }

    if (highsSmoothing <= 0.01) {
      this.highsPeak = highs;
    } else {
      if (highs >= this.highsPeak) {
        this.highsPeak = highs;
      } else {
        const decayRate = 1.0 + (1.0 - highsSmoothing) * 12.0;
        this.highsPeak = Math.max(0, this.highsPeak - dt * decayRate);
      }
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.isCapturing = false;
    this.isSynthetic = false;
    this.lowsPeak = 0;
    this.midsPeak = 0;
    this.highsPeak = 0;
  }
}

export const audioCaptureInstance = new AudioCaptureService();
