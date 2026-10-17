import { useEffect, useRef } from "react";
import {
  WebGLBackgroundRenderer,
  COLOR_PALETTES,
  PATTERN_MAP,
  getLogoTextureUrl,
} from "../../services/webglShader";
import { audioCaptureInstance } from "../../services/audioCapture";
import { useSettings } from "../../context/SettingsContext";
import { useGame } from "../../context/GameContext";
import "./ReactiveBackground.css";

// Backward-compatibility alias map for legacy palette keys
const PALETTE_ALIAS = {
  flame: "jack_o_flame",
  cursed: "cursed_blood",
  acid: "toxic_acid",
  cyber: "midnight_synth",
};

export default function ReactiveBackground() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);
  const isPausedRef = useRef(false);

  // 3-Band state tracking across frames
  const accumMovementRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const shakeIntensityRef = useRef(0);
  const logoOffsetRef = useRef({ x: 0, y: 0 });
  const headShakePhaseRef = useRef(0);

  const { settings } = useSettings();
  const { isCursed } = useGame();

  // Store settings in ref so render loop reads live values without tearing down WebGL
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const isCursedRef = useRef(isCursed);
  isCursedRef.current = isCursed;

  const enabled = settings.reactiveBackground !== false;

  // Update Web Audio Analyser smoothing in real time
  useEffect(() => {
    audioCaptureInstance.setSmoothing(
      settings.fftSmoothing !== undefined ? settings.fftSmoothing : 0.35
    );
  }, [settings.fftSmoothing]);

  // Handle resolution scale changes smoothly without full re-init
  useEffect(() => {
    if (rendererRef.current && enabled) {
      rendererRef.current.resize(settings.backgroundResolutionScale || 2);
    }
  }, [settings.backgroundResolutionScale, enabled]);

  // Handle dynamic logo texture changes smoothly
  useEffect(() => {
    if (rendererRef.current && enabled) {
      const targetUrl = getLogoTextureUrl(
        settings.logoTexture,
        settings.logoCustomUrl
      );
      rendererRef.current.loadLogoTexture(targetUrl);
    }
  }, [settings.logoTexture, settings.logoCustomUrl, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas) return;

    // Initialize WebGL Renderer once
    const renderer = new WebGLBackgroundRenderer(canvas);
    rendererRef.current = renderer;
    renderer.resize(settingsRef.current.backgroundResolutionScale || 2);

    const initialLogoUrl = getLogoTextureUrl(
      settingsRef.current.logoTexture,
      settingsRef.current.logoCustomUrl
    );
    renderer.loadLogoTexture(initialLogoUrl);

    // Initialize Audio Capture with current FFT smoothing
    audioCaptureInstance.setSmoothing(
      settingsRef.current.fftSmoothing !== undefined
        ? settingsRef.current.fftSmoothing
        : 0.35
    );
    audioCaptureInstance.start();

    // Visibility throttling: pause rendering when minimized/hidden to save GPU
    const handleVisibilityChange = () => {
      isPausedRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Resize handler
    const handleResize = () => {
      renderer.resize(settingsRef.current.backgroundResolutionScale || 2);
    };
    window.addEventListener("resize", handleResize);

    lastTimeRef.current = performance.now();

    // Animation Render Loop
    const renderLoop = (timeMs) => {
      animFrameRef.current = requestAnimationFrame(renderLoop);

      if (isPausedRef.current) return;

      const dt = Math.min(
        0.08,
        Math.max(0.001, (timeMs - lastTimeRef.current) * 0.001)
      );
      lastTimeRef.current = timeMs;

      // Read live settings directly from ref without triggering react effect rebuilds
      const s = settingsRef.current;
      const userPaletteKey =
        PALETTE_ALIAS[s.backgroundPalette] ||
        s.backgroundPalette ||
        "jack_o_flame";
      const patternKey = s.backgroundPattern || "plasma";
      const pixelSize = s.backgroundPixelSize || 4.0;
      const ditherStrength =
        s.backgroundDitherStrength !== undefined
          ? s.backgroundDitherStrength
          : 0.25;
      const reactivity =
        s.backgroundReactivity !== undefined ? s.backgroundReactivity : 1.0;
      const speed = s.backgroundSpeed !== undefined ? s.backgroundSpeed : 1.0;

      const enableTiledLogo = s.enableTiledLogo !== false;
      const logoDensity = s.logoDensity || 4;
      const bassShakeStrength =
        s.bassShakeStrength !== undefined ? s.bassShakeStrength : 0.6;
      const midsLogoScale =
        s.midsLogoScale !== undefined ? s.midsLogoScale : 0.7;
      const highsMovementSpeed =
        s.highsMovementSpeed !== undefined ? s.highsMovementSpeed : 0.8;

      const audioGain = s.audioGain !== undefined ? s.audioGain : 1.3;
      const lowsSmoothing =
        s.lowsSmoothing !== undefined ? s.lowsSmoothing : 0.15;
      const midsSmoothing =
        s.midsSmoothing !== undefined ? s.midsSmoothing : 0.2;
      const highsSmoothing =
        s.highsSmoothing !== undefined ? s.highsSmoothing : 0.15;
      const lowsBaseThreshold =
        s.lowsBaseThreshold !== undefined ? s.lowsBaseThreshold : 0.15;
      const midsBaseScale =
        s.midsBaseScale !== undefined ? s.midsBaseScale : 0.25;
      // Idle loop drift: baseline animation rate when silent
      let effectiveBaseDrift =
        s.highsBaseDrift !== undefined ? s.highsBaseDrift : 1.0;
      // Upgrade legacy default (0.15) or low legacy presets to lively fluid baseline speed
      if (effectiveBaseDrift <= 0.35 && effectiveBaseDrift > 0.0) {
        effectiveBaseDrift = 0.65 + effectiveBaseDrift * 2.5;
      }

      // Extract real-time frequency bands with per-channel smoothing, pre-amp gain, and 3-band range calibrations
      const { lows, mids, highs, lowsPeak, midsPeak, highsPeak } =
        audioCaptureInstance.getBands(timeMs, {
          lowsSmoothing,
          midsSmoothing,
          highsSmoothing,
          audioGain,
          lowsMaxFreq: s.lowsMaxFreq !== undefined ? s.lowsMaxFreq : 120,
          midsMaxFreq: s.midsMaxFreq !== undefined ? s.midsMaxFreq : 3500,
          highsMaxFreq: s.highsMaxFreq !== undefined ? s.highsMaxFreq : 16000,
          lowsGain: s.lowsGain !== undefined ? s.lowsGain : 1.5,
          midsGain: s.midsGain !== undefined ? s.midsGain : 1.4,
          highsGain: s.highsGain !== undefined ? s.highsGain : 1.5,
        });

      // 1. LOWS (BASS): Background Viewport Shake
      // Non-linear incremental escalation: low bass = micro-rumble, heavy drop = massive camera shake
      const rawBass =
        lowsSmoothing <= 0.01 ? lows : Math.max(lows, lowsPeak || 0);
      const normalizedBass = Math.max(
        0,
        (rawBass - lowsBaseThreshold) / Math.max(0.01, 1.0 - lowsBaseThreshold)
      );

      // Incremental curve (power 1.85): intensity ramps up exponentially on high peaks
      const incrementalBass = Math.pow(normalizedBass, 1.85);

      if (lowsSmoothing <= 0.01) {
        shakeIntensityRef.current = incrementalBass * bassShakeStrength;
      } else {
        if (bassShakeStrength > 0.01 && incrementalBass > 0.05) {
          shakeIntensityRef.current = Math.min(
            1.0,
            shakeIntensityRef.current + incrementalBass * 2.8 * bassShakeStrength
          );
        }
        const decayRate = 1.0 + (1.0 - lowsSmoothing) * 12.0;
        shakeIntensityRef.current = Math.max(
          0,
          shakeIntensityRef.current - dt * decayRate
        );
      }

      let shakeX = 0;
      let shakeY = 0;
      let shakeRot = 0;
      if (shakeIntensityRef.current > 0.005 && bassShakeStrength > 0.01) {
        const maxShakePx = 20 * bassShakeStrength;
        const currentShakeScale = Math.pow(shakeIntensityRef.current, 1.4);
        shakeX = (Math.random() * 2 - 1) * maxShakePx * currentShakeScale;
        shakeY = (Math.random() * 2 - 1) * maxShakePx * currentShakeScale;
        shakeRot = (Math.random() * 2 - 1) * 2.2 * currentShakeScale;

        if (container) {
          container.style.transform = `scale(1.04) translate3d(${shakeX.toFixed(
            1
          )}px, ${shakeY.toFixed(1)}px, 0) rotate(${shakeRot.toFixed(2)}deg)`;
        }
      } else if (container) {
        container.style.transform = "scale(1.04)";
      }

      // 2. MIDS & LOWS: Tiled Logo Layer
      const rawMids =
        midsSmoothing <= 0.01 ? mids : Math.max(mids, midsPeak || 0);
      const incrementalMids = Math.pow(rawMids, 1.55);
      const expansionHeadroom = Math.max(0.1, 0.94 - midsBaseScale);
      const currentLogoScale =
        midsBaseScale + incrementalMids * expansionHeadroom * midsLogoScale;

      // Lows-Controlled Logo Opacity: Base resting opacity modulated dynamically by Lows energy
      const baseLogoOpacity =
        s.logoBaseOpacity !== undefined ? s.logoBaseOpacity : 0.55;
      const lowsOpacityBoost =
        s.lowsLogoOpacityBoost !== undefined ? s.lowsLogoOpacityBoost : 0.45;
      const currentLogoOpacity = Math.min(
        1.0,
        Math.max(0.0, baseLogoOpacity + incrementalBass * lowsOpacityBoost)
      );

      // Lows-Controlled Head Shake Rotation: Side-to-side oscillation, slowing/stopping on low frequencies
      const enableHeadShake = s.enableLogoHeadShake !== false;
      let logoRotation = 0.0;
      if (enableHeadShake) {
        const baseShakeSpeed =
          s.logoHeadShakeSpeed !== undefined ? s.logoHeadShakeSpeed : 3.2;
        const maxShakeAngle =
          s.logoHeadShakeAngle !== undefined ? s.logoHeadShakeAngle : 0.35;
        const lowsBrakeStrength =
          s.lowsHeadShakeBrake !== undefined ? s.lowsHeadShakeBrake : 1.0;

        // When low frequencies peak, lowsBrake rises to 1.0, stopping or slowing the head shake
        const lowsBrake = Math.min(1.0, incrementalBass * lowsBrakeStrength * 1.5);
        const currentSpeed = baseShakeSpeed * Math.max(0.0, 1.0 - lowsBrake);

        headShakePhaseRef.current += dt * currentSpeed;
        logoRotation = Math.sin(headShakePhaseRef.current) * maxShakeAngle;
      }

      // Diagonal movement: speed is dynamically accelerated by mids frequency
      const midsSpeedRate =
        (0.05 + Math.pow(rawMids, 1.5) * 2.2 * midsLogoScale) * speed;
      logoOffsetRef.current.x =
        (logoOffsetRef.current.x + dt * midsSpeedRate * 0.22) % 1000.0;
      logoOffsetRef.current.y =
        (logoOffsetRef.current.y + dt * midsSpeedRate * 0.22 * 0.75) % 1000.0;

      // 3. HIGHS & PROCEDURAL BACKGROUND: Ambient Continuous Loop & Audio Acceleration
      // Plays continuous animation on loop even without music; sound accelerates & accentuates it
      const rawHighs =
        highsSmoothing <= 0.01 ? highs : Math.max(highs, highsPeak || 0);
      const incrementalHighs = Math.pow(rawHighs, 1.8);
      const highsDrive =
        (incrementalHighs * 6.5 * highsMovementSpeed +
          Math.pow(rawMids, 2.0) * 1.5 * midsLogoScale);
      const movementRate = (effectiveBaseDrift + highsDrive) * speed;
      accumMovementRef.current += dt * movementRate;

      // Determine palette: shift to cursed blood only during active cursed round
      let effectivePaletteKey = userPaletteKey;
      if (isCursedRef.current && COLOR_PALETTES.cursed_blood) {
        effectivePaletteKey = "cursed_blood";
      }

      const activePaletteObj =
        COLOR_PALETTES[effectivePaletteKey] || COLOR_PALETTES.jack_o_flame;
      const patternIndex =
        PATTERN_MAP[patternKey] !== undefined ? PATTERN_MAP[patternKey] : 0;

      renderer.render({
        timeMovement: accumMovementRef.current,
        lows: incrementalBass,
        mids: incrementalMids,
        highs: incrementalHighs,
        shake: [shakeX, shakeY],
        enableLogo: enableTiledLogo,
        logoScale: currentLogoScale,
        logoDensity,
        logoOpacity: currentLogoOpacity,
        logoOffset: [logoOffsetRef.current.x, logoOffsetRef.current.y],
        logoRotation,
        pixelSize,
        ditherStrength,
        reactivity,
        speed,
        pattern: patternIndex,
        palette: activePaletteObj.colors,
      });
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
      audioCaptureInstance.stop();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="reactive-bg-container" ref={containerRef}>
      <canvas id="reactive-bg-canvas" ref={canvasRef} />
      <div className="reactive-bg-vignette" />
    </div>
  );
}
