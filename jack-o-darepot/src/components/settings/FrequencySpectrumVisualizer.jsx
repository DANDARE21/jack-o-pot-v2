import { useRef, useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { audioCaptureInstance } from "@/services";
import "./FrequencySpectrumVisualizer.css";

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const BAR_COUNT = 72;

function freqToX(freq, width) {
  const clamped = Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq));
  const ratio = Math.log10(clamped / MIN_FREQ) / Math.log10(MAX_FREQ / MIN_FREQ);
  return ratio * width;
}

function xToFreq(x, width) {
  const ratio = Math.max(0, Math.min(1, x / width));
  return Math.round(MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, ratio));
}

function formatFreq(val) {
  if (val >= 1000) {
    const k = val / 1000;
    return k % 1 === 0 ? `${k} kHz` : `${k.toFixed(1)} kHz`;
  }
  return `${Math.round(val)} Hz`;
}

export default function FrequencySpectrumVisualizer({
  settings,
  updateSetting,
  applySettings,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const peaksRef = useRef(new Float32Array(BAR_COUNT));
  const draggingHandleRef = useRef(null); // 'lows' | 'mids' | 'highs' | null

  const [liveBands, setLiveBands] = useState({
    lows: 0,
    mids: 0,
    highs: 0,
    isCapturing: false,
    isSynthetic: true,
  });

  const lowsMaxFreq = settings.lowsMaxFreq ?? 120;
  const midsMaxFreq = settings.midsMaxFreq ?? 3500;
  const highsMaxFreq = settings.highsMaxFreq ?? 16000;
  const lowsGain = settings.lowsGain ?? 1.5;
  const midsGain = settings.midsGain ?? 1.4;
  const highsGain = settings.highsGain ?? 1.5;

  // Real-time animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let lastTime = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) * 0.001);
      lastTime = now;

      // Handle HiDPI scaling
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Clear background
      ctx.fillStyle = "#090710";
      ctx.fillRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let y = 30; y < height - 20; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Fetch frequency data from audio capture service
      const spectrum = audioCaptureInstance.getSpectrumData();
      const freqData = spectrum.freqData;
      const sampleRate = spectrum.sampleRate || 44100;
      const binCount = spectrum.binCount || 512;
      const binWidth = sampleRate / (binCount * 2);

      // 3. Compute X coordinates for the 3 frequency cutoff markers
      const xLow = freqToX(lowsMaxFreq, width);
      const xMid = freqToX(midsMaxFreq, width);
      const xHigh = freqToX(highsMaxFreq, width);

      // Subtle zone background coloring
      // Lows Zone
      ctx.fillStyle = "rgba(255, 69, 0, 0.08)";
      ctx.fillRect(0, 0, xLow, height - 20);

      // Mids Zone
      ctx.fillStyle = "rgba(255, 170, 0, 0.06)";
      ctx.fillRect(xLow, 0, xMid - xLow, height - 20);

      // Highs Zone
      ctx.fillStyle = "rgba(0, 229, 255, 0.06)";
      ctx.fillRect(xMid, 0, xHigh - xMid, height - 20);

      // Beyond Highs Cutoff Zone (Dimmed/Shadowed)
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(xHigh, 0, width - xHigh, height - 20);

      // 4. Draw EQ Spectrum Bars
      const usableHeight = height - 26;
      const barSpacing = 2;
      const barWidth = Math.max(2, (width - (BAR_COUNT - 1) * barSpacing) / BAR_COUNT);

      let currentLowsEnergy = 0;
      let currentMidsEnergy = 0;
      let currentHighsEnergy = 0;
      let lowsCount = 0;
      let midsCount = 0;
      let highsCount = 0;

      for (let i = 0; i < BAR_COUNT; i++) {
        // Logarithmic center frequency for this bar
        const barFreq = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, (i + 0.5) / BAR_COUNT);
        const barX = i * (barWidth + barSpacing);

        // Find nearest FFT bin
        const binIndex = Math.min(binCount - 1, Math.max(0, Math.floor(barFreq / binWidth)));
        let rawVal = freqData ? freqData[binIndex] / 255 : 0;

        // Apply band gain multiplier for visual resonance
        if (barFreq <= lowsMaxFreq) {
          rawVal = Math.min(1.0, rawVal * (lowsGain / 1.5));
          currentLowsEnergy += rawVal;
          lowsCount++;
        } else if (barFreq <= midsMaxFreq) {
          rawVal = Math.min(1.0, rawVal * (midsGain / 1.4));
          currentMidsEnergy += rawVal;
          midsCount++;
        } else if (barFreq <= highsMaxFreq) {
          rawVal = Math.min(1.0, rawVal * (highsGain / 1.5));
          currentHighsEnergy += rawVal;
          highsCount++;
        } else {
          // Dimmed out beyond highs cutoff
          rawVal *= 0.35;
        }

        const barHeight = Math.max(3, rawVal * usableHeight);
        const barY = usableHeight - barHeight + 4;

        // Update Peak cap
        if (rawVal >= peaksRef.current[i]) {
          peaksRef.current[i] = rawVal;
        } else {
          peaksRef.current[i] = Math.max(0, peaksRef.current[i] - dt * 0.8);
        }
        const peakY = usableHeight - peaksRef.current[i] * usableHeight + 4;

        // Color gradient based on frequency zone
        let gradient;
        if (barFreq <= lowsMaxFreq) {
          gradient = ctx.createLinearGradient(0, barY, 0, usableHeight);
          gradient.addColorStop(0, "#ff5722");
          gradient.addColorStop(1, "#b71c1c");
        } else if (barFreq <= midsMaxFreq) {
          gradient = ctx.createLinearGradient(0, barY, 0, usableHeight);
          gradient.addColorStop(0, "#ffd600");
          gradient.addColorStop(1, "#ff8f00");
        } else if (barFreq <= highsMaxFreq) {
          gradient = ctx.createLinearGradient(0, barY, 0, usableHeight);
          gradient.addColorStop(0, "#00e5ff");
          gradient.addColorStop(1, "#7c4dff");
        } else {
          gradient = ctx.createLinearGradient(0, barY, 0, usableHeight);
          gradient.addColorStop(0, "#555260");
          gradient.addColorStop(1, "#272430");
        }

        // Draw Bar
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Draw Peak Cap Line
        ctx.fillStyle = barFreq <= highsMaxFreq ? "#ffffff" : "#777788";
        ctx.fillRect(barX, Math.max(2, peakY), barWidth, 2);
      }

      // Update HUD state at reduced frequency (every ~6 frames)
      if (Math.random() < 0.25) {
        setLiveBands({
          lows: lowsCount > 0 ? currentLowsEnergy / lowsCount : 0,
          mids: midsCount > 0 ? currentMidsEnergy / midsCount : 0,
          highs: highsCount > 0 ? currentHighsEnergy / highsCount : 0,
          isCapturing: spectrum.isCapturing,
          isSynthetic: spectrum.isSynthetic,
        });
      }

      // 5. Draw Vertical Cutoff Lines & Draggable Pill Badges
      const drawCutoffLine = (x, color, label, isDragging) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = isDragging ? 3 : 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, usableHeight + 6);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cutoff Label Pill Handle
        const pillText = label;
        ctx.font = "bold 9px monospace";
        const textWidth = ctx.measureText(pillText).width;
        const pillW = textWidth + 10;
        const pillH = 16;
        const pillX = Math.max(4, Math.min(width - pillW - 4, x - pillW / 2));
        const pillY = 4;

        ctx.fillStyle = isDragging ? "#ffffff" : "#110e19";
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.fillRect(pillX, pillY, pillW, pillH);
        ctx.strokeRect(pillX, pillY, pillW, pillH);

        ctx.fillStyle = isDragging ? "#000000" : color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2);

        ctx.restore();
      };

      drawCutoffLine(xLow, "#ff5722", `${lowsMaxFreq} Hz`, draggingHandleRef.current === "lows");
      drawCutoffLine(xMid, "#ffd600", formatFreq(midsMaxFreq), draggingHandleRef.current === "mids");
      drawCutoffLine(xHigh, "#00e5ff", formatFreq(highsMaxFreq), draggingHandleRef.current === "highs");

      // 6. Draw Frequency Legend Axis Along Bottom
      ctx.fillStyle = "#6e6a80";
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const legendFreqs = [30, 60, 120, 250, 500, 1000, 2500, 5000, 10000, 20000];
      legendFreqs.forEach((f) => {
        const lx = freqToX(f, width);
        ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, lx, usableHeight + 9);
      });

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [lowsMaxFreq, midsMaxFreq, highsMaxFreq, lowsGain, midsGain, highsGain]);

  // Canvas Mouse & Touch Drag Interaction for direct on-screen frequency tuning
  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    if (clientX === undefined) return;

    const clickX = clientX - rect.left;
    const xLow = freqToX(lowsMaxFreq, rect.width);
    const xMid = freqToX(midsMaxFreq, rect.width);
    const xHigh = freqToX(highsMaxFreq, rect.width);

    const distLow = Math.abs(clickX - xLow);
    const distMid = Math.abs(clickX - xMid);
    const distHigh = Math.abs(clickX - xHigh);

    const threshold = 28; // Click detection radius
    if (distLow <= threshold && distLow <= distMid && distLow <= distHigh) {
      draggingHandleRef.current = "lows";
    } else if (distMid <= threshold && distMid <= distHigh) {
      draggingHandleRef.current = "mids";
    } else if (distHigh <= threshold) {
      draggingHandleRef.current = "highs";
    }
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingHandleRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      if (clientX === undefined) return;

      const currentX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const targetFreq = xToFreq(currentX, rect.width);

      if (draggingHandleRef.current === "lows") {
        const clamped = Math.max(40, Math.min(midsMaxFreq - 150, Math.min(500, targetFreq)));
        updateSetting("lowsMaxFreq", Math.round(clamped / 5) * 5);
      } else if (draggingHandleRef.current === "mids") {
        const clamped = Math.max(lowsMaxFreq + 150, Math.min(highsMaxFreq - 500, Math.min(8000, targetFreq)));
        updateSetting("midsMaxFreq", Math.round(clamped / 50) * 50);
      } else if (draggingHandleRef.current === "highs") {
        const clamped = Math.max(midsMaxFreq + 500, Math.min(20000, targetFreq));
        updateSetting("highsMaxFreq", Math.round(clamped / 250) * 250);
      }
    },
    [lowsMaxFreq, midsMaxFreq, highsMaxFreq, updateSetting]
  );

  const handlePointerUp = useCallback(() => {
    draggingHandleRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Quick Calibration Presets
  const handleApplyPreset = (presetKey) => {
    switch (presetKey) {
      case "balanced":
        applySettings({
          lowsMaxFreq: 120,
          midsMaxFreq: 3500,
          highsMaxFreq: 16000,
          lowsGain: 1.5,
          midsGain: 1.4,
          highsGain: 1.5,
        });
        break;
      case "bass_heavy":
        applySettings({
          lowsMaxFreq: 160,
          midsMaxFreq: 3000,
          highsMaxFreq: 14000,
          lowsGain: 2.2,
          midsGain: 1.2,
          highsGain: 1.0,
        });
        break;
      case "punchy_kicks":
        applySettings({
          lowsMaxFreq: 90,
          midsMaxFreq: 4000,
          highsMaxFreq: 18000,
          lowsGain: 1.8,
          midsGain: 1.4,
          highsGain: 1.2,
        });
        break;
      case "vocal_snare":
        applySettings({
          lowsMaxFreq: 100,
          midsMaxFreq: 5000,
          highsMaxFreq: 16000,
          lowsGain: 1.2,
          midsGain: 2.0,
          highsGain: 1.4,
        });
        break;
      case "crisp_treble":
        applySettings({
          lowsMaxFreq: 110,
          midsMaxFreq: 3200,
          highsMaxFreq: 20000,
          lowsGain: 1.2,
          midsGain: 1.2,
          highsGain: 2.2,
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="freq-spectrum-container" ref={containerRef}>
      {/* Top Header & Status */}
      <div className="freq-spectrum-header">
        <div className="freq-spectrum-title-wrap">
          <Icon icon="game-icons:sound-waves" className="text-ui-accent text-xl" />
          <h4 className="freq-spectrum-title">Frequency Spectrum & 3-Band Calibration</h4>
        </div>
        <div className="freq-spectrum-status-badge">
          <span
            className={`freq-status-dot ${
              liveBands.isCapturing && !liveBands.isSynthetic ? "live" : "synth"
            }`}
          />
          <span>
            {liveBands.isCapturing && !liveBands.isSynthetic
              ? "Live Audio Capture Active"
              : "Synthetic Rhythm Generator"}
          </span>
        </div>
      </div>

      {/* 3-Band Live Level Meters */}
      <div className="freq-bands-hud">
        {/* Lows Band */}
        <div className="freq-band-card band-lows">
          <div className="freq-band-card-header">
            <span className="freq-band-name flex items-center gap-1">
              <Icon icon="game-icons:heart-beats" /> LOWS (BASS)
            </span>
            <span className="freq-band-range-tag">0 – {lowsMaxFreq} Hz</span>
          </div>
          <div className="freq-band-vu-bar-wrap">
            <div
              className="freq-band-vu-bar"
              style={{ width: `${Math.min(100, Math.round(liveBands.lows * 100))}%` }}
            />
          </div>
          <div className="freq-band-effects">
            Drives: <b>Camera Shake</b>, <b>Logo Opacity</b> & <b>Head-Shake Freeze</b>
          </div>
        </div>

        {/* Mids Band */}
        <div className="freq-band-card band-mids">
          <div className="freq-band-card-header">
            <span className="freq-band-name flex items-center gap-1">
              <Icon icon="game-icons:vortex" /> MIDS (BODY)
            </span>
            <span className="freq-band-range-tag">
              {lowsMaxFreq} Hz – {formatFreq(midsMaxFreq)}
            </span>
          </div>
          <div className="freq-band-vu-bar-wrap">
            <div
              className="freq-band-vu-bar"
              style={{ width: `${Math.min(100, Math.round(liveBands.mids * 100))}%` }}
            />
          </div>
          <div className="freq-band-effects">
            Drives: <b>Logo Swell Scaling</b> & <b>Diagonal Drift Speed</b>
          </div>
        </div>

        {/* Highs Band */}
        <div className="freq-band-card band-highs">
          <div className="freq-band-card-header">
            <span className="freq-band-name flex items-center gap-1">
              <Icon icon="game-icons:lightning-arc" /> HIGHS (TREBLE)
            </span>
            <span className="freq-band-range-tag">
              {formatFreq(midsMaxFreq)} – {formatFreq(highsMaxFreq)}
            </span>
          </div>
          <div className="freq-band-vu-bar-wrap">
            <div
              className="freq-band-vu-bar"
              style={{ width: `${Math.min(100, Math.round(liveBands.highs * 100))}%` }}
            />
          </div>
          <div className="freq-band-effects">
            Drives: <b>Wave Flow Velocity</b> & <b>Dynamic Palette Shimmer</b>
          </div>
        </div>
      </div>

      {/* Interactive 60fps Canvas Spectrum */}
      <div className="freq-spectrum-canvas-wrap" onPointerDown={handlePointerDown}>
        <canvas ref={canvasRef} className="freq-spectrum-canvas" />
        <span className="freq-canvas-drag-hint">
          Drag handles to adjust cutoff boundaries
        </span>
      </div>

      {/* Frequency Cutoff Sliders */}
      <div className="freq-controls-grid">
        {/* Lows Cutoff Slider */}
        <div className="freq-control-box">
          <div className="freq-control-header">
            <span className="freq-control-label">
              <Icon icon="game-icons:speaker-off" className="text-ui-accent text-sm" />
              Lows Cutoff Frequency
            </span>
            <span className="freq-control-badge">{lowsMaxFreq} Hz</span>
          </div>
          <div className="freq-slider-row">
            <input
              type="range"
              className="freq-range-slider"
              min={40}
              max={500}
              step={5}
              value={lowsMaxFreq}
              onChange={(e) => updateSetting("lowsMaxFreq", Number(e.target.value))}
            />
          </div>
          <span className="freq-control-hint">
            Upper ceiling for sub-bass & kicks (0 to {lowsMaxFreq} Hz).
          </span>
        </div>

        {/* Mids Cutoff Slider */}
        <div className="freq-control-box">
          <div className="freq-control-header">
            <span className="freq-control-label">
              <Icon icon="game-icons:sound-waves" className="text-ui-accent text-sm" />
              Mids Crossover Frequency
            </span>
            <span className="freq-control-badge">{formatFreq(midsMaxFreq)}</span>
          </div>
          <div className="freq-slider-row">
            <input
              type="range"
              className="freq-range-slider"
              min={500}
              max={8000}
              step={50}
              value={midsMaxFreq}
              onChange={(e) => updateSetting("midsMaxFreq", Number(e.target.value))}
            />
          </div>
          <span className="freq-control-hint">
            Boundary separating vocal/snare body from hi-hats & sizzle.
          </span>
        </div>

        {/* Highs Upper Limit Slider */}
        <div className="freq-control-box">
          <div className="freq-control-header">
            <span className="freq-control-label">
              <Icon icon="game-icons:radar-sweep" className="text-ui-accent text-sm" />
              Highs Upper Limit
            </span>
            <span className="freq-control-badge">{formatFreq(highsMaxFreq)}</span>
          </div>
          <div className="freq-slider-row">
            <input
              type="range"
              className="freq-range-slider"
              min={4000}
              max={20000}
              step={250}
              value={highsMaxFreq}
              onChange={(e) => updateSetting("highsMaxFreq", Number(e.target.value))}
            />
          </div>
          <span className="freq-control-hint">
            Top frequency ceiling for cymbal transients & wave speed.
          </span>
        </div>
      </div>

      {/* Band Sensitivity Multipliers */}
      <div className="freq-controls-grid">
        {/* Lows Sensitivity */}
        <div className="freq-control-box">
          <div className="freq-control-header">
            <span className="freq-control-label">Lows Sensitivity (Bass Gain)</span>
            <span className="freq-control-badge">{lowsGain.toFixed(1)}x</span>
          </div>
          <div className="freq-slider-row">
            <input
              type="range"
              className="freq-range-slider"
              min={0.5}
              max={3.0}
              step={0.1}
              value={lowsGain}
              onChange={(e) => updateSetting("lowsGain", Number(e.target.value))}
            />
          </div>
          <span className="freq-control-hint">Amplifies bass response multiplier.</span>
        </div>

        {/* Mids Sensitivity */}
        <div className="freq-control-box">
          <div className="freq-control-header">
            <span className="freq-control-label">Mids Sensitivity (Body Gain)</span>
            <span className="freq-control-badge">{midsGain.toFixed(1)}x</span>
          </div>
          <div className="freq-slider-row">
            <input
              type="range"
              className="freq-range-slider"
              min={0.5}
              max={3.0}
              step={0.1}
              value={midsGain}
              onChange={(e) => updateSetting("midsGain", Number(e.target.value))}
            />
          </div>
          <span className="freq-control-hint">Amplifies logo pulsation on snare/lead.</span>
        </div>

        {/* Highs Sensitivity */}
        <div className="freq-control-box">
          <div className="freq-control-header">
            <span className="freq-control-label">Highs Sensitivity (Treble Gain)</span>
            <span className="freq-control-badge">{highsGain.toFixed(1)}x</span>
          </div>
          <div className="freq-slider-row">
            <input
              type="range"
              className="freq-range-slider"
              min={0.5}
              max={3.0}
              step={0.1}
              value={highsGain}
              onChange={(e) => updateSetting("highsGain", Number(e.target.value))}
            />
          </div>
          <span className="freq-control-hint">Amplifies shader flow speed on hi-hats.</span>
        </div>
      </div>

      {/* Quick EQ Presets */}
      <div className="freq-presets-bar">
        <span className="freq-presets-label">Quick EQ Profiles:</span>
        <button
          type="button"
          className="freq-preset-btn"
          onClick={() => handleApplyPreset("balanced")}
        >
          <Icon icon="game-icons:sound-waves" /> Balanced Default
        </button>
        <button
          type="button"
          className="freq-preset-btn"
          onClick={() => handleApplyPreset("bass_heavy")}
        >
          <Icon icon="game-icons:speaker" /> Sub-Bass Heavy (EDM)
        </button>
        <button
          type="button"
          className="freq-preset-btn"
          onClick={() => handleApplyPreset("punchy_kicks")}
        >
          <Icon icon="game-icons:kick-scooter" /> Punchy Kicks (Rock)
        </button>
        <button
          type="button"
          className="freq-preset-btn"
          onClick={() => handleApplyPreset("vocal_snare")}
        >
          <Icon icon="game-icons:micro-microphone" /> Vocal & Snare Focus
        </button>
        <button
          type="button"
          className="freq-preset-btn"
          onClick={() => handleApplyPreset("crisp_treble")}
        >
          <Icon icon="game-icons:sparks" /> Crisp Treble (Hi-Hats)
        </button>
      </div>
    </div>
  );
}
