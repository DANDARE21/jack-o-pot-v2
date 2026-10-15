export const SETTINGS_STORAGE_KEY = "jackopot_settings_v2";

export const DEFAULT_SETTINGS = {
  // Audio
  masterSound: true,
  soundVolume: 80,
  systemBeepOnCurse: true,

  // Game & Odds
  baseCurseChance: 5, // in percent
  curseIncrement: 10, // in percent
  maxCurseCap: 100, // in percent
  fastSpinMode: false,
  spinExpansionScale: 1.13, // 1.0 (no expansion) to 1.40 (40% expansion)

  // Desktop & Display
  desktopNotifications: true,
  spookyAtmosphere: "high", // 'off', 'low', 'high'

  // Reactive Sound Shader Background
  reactiveBackground: true,
  backgroundPalette: "jack_o_flame", // 'jack_o_flame', 'lospec_retro', 'cursed_blood', 'toxic_acid', 'gameboy_dmg', 'midnight_synth', 'gothic_crypt', 'noir_monochrome'
  backgroundPattern: "plasma", // 'plasma', 'vortex', 'waves', 'grid'
  backgroundPixelSize: 4, // 1 to 16 virtual pixels
  backgroundDitherStrength: 0.25, // 0.0 to 0.50
  backgroundReactivity: 1.0, // 0.0 to 2.0x audio reactivity
  backgroundSpeed: 1.0, // 0.2 to 2.5x animation speed
  backgroundResolutionScale: 2, // 1 = native, 2 = 1/2 res, 4 = 1/4 res

  // 3-Frequency Bands & Tiled Logo Reactivity
  enableTiledLogo: true, // Tiled logo layer
  logoTexture: "dandare", // 'dandare', 'pumpkin', 'skull', 'six', 'custom'
  logoCustomUrl: "", // Custom texture image data URL
  logoDensity: 4, // 2 to 8 tiles across
  logoBaseOpacity: 0.55, // Resting logo opacity (0.0 to 1.0)
  lowsLogoOpacityBoost: 0.45, // Lows frequency opacity surge (0.0 to 1.0)
  enableLogoHeadShake: true, // Head shake side-to-side oscillation
  logoHeadShakeAngle: 0.35, // Side-to-side rotation range (~20 degrees)
  logoHeadShakeSpeed: 3.2, // Base head shake oscillation speed
  lowsHeadShakeBrake: 1.0, // Low frequency braking strength (slows/stops rotation on bass)
  bassShakeStrength: 0.6, // Lows: Camera/Background shake on basslines (0.0 to 1.0)
  midsLogoScale: 0.7, // Mids: Logo expansion multiplier on audio peaks (0.0 to 1.0)
  highsMovementSpeed: 0.8, // Highs: Procedural background motion speed multiplier (0.0 to 1.0)

  // Advanced Responsiveness & Zero-Delay Tweaks
  fftSmoothing: 0.35, // Web Audio smoothing (0.0 = pure 0-delay raw FFT, 0.9 = heavy averaging)
  audioGain: 1.3, // Pre-amp input sensitivity boost (0.5x to 3.0x)
  lowsSmoothing: 0.15, // 0.0 = instant 0-delay bass kick, higher = longer rumble decay
  midsSmoothing: 0.20, // 0.0 = instant 0-delay logo snap, higher = smooth floating bounce
  highsSmoothing: 0.15, // 0.0 = instant 0-delay wave acceleration, higher = rolling momentum
  lowsBaseThreshold: 0.15, // Minimum bass energy to trigger shake (0.0 = sensitive to all bass)
  midsBaseScale: 0.25, // Resting logo size during silence (0.05 to 0.50)
  highsBaseDrift: 1.0, // Resting shader motion loop speed during silence (1.0 = 100% fluid loop; sounds accelerate)

  // Retro 8-bit UI Styles & Colors
  uiThemePreset: "jack_o_flame", // Theme key or 'custom'
  uiSyncWithBackground: true, // Auto-sync UI colors with background palette
  uiAccentColor: "#ff6200", // Main accent
  uiAccentHover: "#ff8533", // Secondary / hover
  uiAccentGlow: "#ffaa44", // Text highlight / glow
  uiBgSurface: "#110e19", // Main surface / cabinet background
  uiBorderColor: "#ff6200", // Primary UI border
  uiTextColor: "#f8f8fc", // High-contrast body text
  uiCursedColor: "#ff1744", // Curse / hazard red
};
