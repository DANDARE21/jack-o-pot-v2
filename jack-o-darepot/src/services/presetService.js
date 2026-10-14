const PRESETS_STORAGE_KEY = "jackopot_setting_presets_v2";

export const BUILT_IN_PRESETS = [
  {
    id: "balatro_hypnotic",
    name: "🃏 Balatro Hypnotic Swirl",
    description: "Psychedelic card swirl with Lospec Hot Pink dithered tones",
    settings: {
      reactiveBackground: true,
      backgroundPattern: "balatro",
      backgroundPalette: "lospec_retro",
      backgroundPixelSize: 4,
      backgroundDitherStrength: 0.25,
      backgroundReactivity: 1.1,
      backgroundSpeed: 1.0,
      backgroundResolutionScale: 2,
      enableTiledLogo: true,
      logoTexture: "dandare",
      logoDensity: 4,
      logoBaseOpacity: 0.55,
      lowsLogoOpacityBoost: 0.45,
      enableLogoHeadShake: true,
      logoHeadShakeAngle: 0.35,
      logoHeadShakeSpeed: 3.2,
      lowsHeadShakeBrake: 1.0,
      bassShakeStrength: 0.55,
      midsLogoScale: 0.75,
      highsMovementSpeed: 0.85,
      fftSmoothing: 0.35,
      audioGain: 1.3,
      lowsSmoothing: 0.15,
      midsSmoothing: 0.2,
      highsSmoothing: 0.15,
      lowsBaseThreshold: 0.15,
      midsBaseScale: 0.25,
      highsBaseDrift: 0.15,
    },
  },
  {
    id: "jack_o_rave",
    name: "🎃 Jack-o-Rave (Heavy Bass)",
    description: "Explosive flame waves with intense subwoofer screen shake",
    settings: {
      reactiveBackground: true,
      backgroundPattern: "plasma",
      backgroundPalette: "jack_o_flame",
      backgroundPixelSize: 4,
      backgroundDitherStrength: 0.25,
      backgroundReactivity: 1.3,
      backgroundSpeed: 1.1,
      backgroundResolutionScale: 2,
      enableTiledLogo: true,
      logoTexture: "pumpkin",
      logoDensity: 4,
      logoBaseOpacity: 0.65,
      lowsLogoOpacityBoost: 0.4,
      enableLogoHeadShake: true,
      logoHeadShakeAngle: 0.4,
      logoHeadShakeSpeed: 3.8,
      lowsHeadShakeBrake: 1.2,
      bassShakeStrength: 0.9,
      midsLogoScale: 0.85,
      highsMovementSpeed: 0.9,
      fftSmoothing: 0.2,
      audioGain: 1.4,
      lowsSmoothing: 0.05,
      midsSmoothing: 0.15,
      highsSmoothing: 0.1,
      lowsBaseThreshold: 0.05,
      midsBaseScale: 0.28,
      highsBaseDrift: 0.15,
    },
  },
  {
    id: "zero_delay_raw",
    name: "⚡ Zero-Delay Competitive",
    description: "Pure raw real-time audio reactivity with 0ms averaging delay",
    settings: {
      reactiveBackground: true,
      backgroundPattern: "waves",
      backgroundPalette: "midnight_synth",
      backgroundPixelSize: 3,
      backgroundDitherStrength: 0.20,
      backgroundReactivity: 1.2,
      backgroundSpeed: 1.0,
      backgroundResolutionScale: 2,
      enableTiledLogo: true,
      logoDensity: 4,
      bassShakeStrength: 0.70,
      midsLogoScale: 0.75,
      highsMovementSpeed: 0.85,
      fftSmoothing: 0.0,
      audioGain: 1.5,
      lowsSmoothing: 0.0,
      midsSmoothing: 0.0,
      highsSmoothing: 0.0,
      lowsBaseThreshold: 0.05,
      midsBaseScale: 0.22,
      highsBaseDrift: 0.05,
    },
  },
  {
    id: "demonic_blood_chasm",
    name: "💀 Demonic Crimson Chasm",
    description: "Deep cursed blood vortex with dark red dithered distortion",
    settings: {
      reactiveBackground: true,
      backgroundPattern: "vortex",
      backgroundPalette: "cursed_blood",
      backgroundPixelSize: 5,
      backgroundDitherStrength: 0.35,
      backgroundReactivity: 1.4,
      backgroundSpeed: 0.9,
      backgroundResolutionScale: 2,
      enableTiledLogo: true,
      logoDensity: 3,
      bassShakeStrength: 0.80,
      midsLogoScale: 0.85,
      highsMovementSpeed: 0.90,
      fftSmoothing: 0.30,
      audioGain: 1.3,
      lowsSmoothing: 0.12,
      midsSmoothing: 0.18,
      highsSmoothing: 0.12,
      lowsBaseThreshold: 0.10,
      midsBaseScale: 0.25,
      highsBaseDrift: 0.12,
    },
  },
  {
    id: "gameboy_lofi",
    name: "🕹️ GameBoy 1989 Lo-Fi",
    description: "Retro 4-shade pea green perspective grid with chunky pixels",
    settings: {
      reactiveBackground: true,
      backgroundPattern: "grid",
      backgroundPalette: "gameboy_dmg",
      backgroundPixelSize: 8,
      backgroundDitherStrength: 0.35,
      backgroundReactivity: 0.9,
      backgroundSpeed: 0.8,
      backgroundResolutionScale: 4,
      enableTiledLogo: true,
      logoDensity: 3,
      bassShakeStrength: 0.40,
      midsLogoScale: 0.60,
      highsMovementSpeed: 0.65,
      fftSmoothing: 0.45,
      audioGain: 1.2,
      lowsSmoothing: 0.25,
      midsSmoothing: 0.25,
      highsSmoothing: 0.20,
      lowsBaseThreshold: 0.20,
      midsBaseScale: 0.30,
      highsBaseDrift: 0.20,
    },
  },
  {
    id: "toxic_acid_hazard",
    name: "🧪 Acid Hazard Slime",
    description: "Electric neon biohazard green vortex with high contrast",
    settings: {
      reactiveBackground: true,
      backgroundPattern: "vortex",
      backgroundPalette: "toxic_acid",
      backgroundPixelSize: 4,
      backgroundDitherStrength: 0.25,
      backgroundReactivity: 1.2,
      backgroundSpeed: 1.0,
      backgroundResolutionScale: 2,
      enableTiledLogo: true,
      logoDensity: 4,
      bassShakeStrength: 0.65,
      midsLogoScale: 0.7,
      highsMovementSpeed: 0.85,
      fftSmoothing: 0.35,
      audioGain: 1.3,
      lowsSmoothing: 0.15,
      midsSmoothing: 0.2,
      highsSmoothing: 0.15,
      lowsBaseThreshold: 0.15,
      midsBaseScale: 0.25,
      highsBaseDrift: 0.15,
    },
  },
  {
    id: "midnight_synth_grid",
    name: "🌌 Midnight Synth Outrun",
    description: "Neon magenta and cyan retro cyber grid with fast scrolling",
    settings: {
      reactiveBackground: true,
      backgroundPattern: "grid",
      backgroundPalette: "midnight_synth",
      backgroundPixelSize: 4,
      backgroundDitherStrength: 0.25,
      backgroundReactivity: 1.2,
      backgroundSpeed: 1.2,
      backgroundResolutionScale: 2,
      enableTiledLogo: true,
      logoDensity: 4,
      bassShakeStrength: 0.7,
      midsLogoScale: 0.75,
      highsMovementSpeed: 0.85,
      fftSmoothing: 0.3,
      audioGain: 1.3,
      lowsSmoothing: 0.12,
      midsSmoothing: 0.18,
      highsSmoothing: 0.12,
      lowsBaseThreshold: 0.12,
      midsBaseScale: 0.25,
      highsBaseDrift: 0.18,
    },
  },
  {
    id: "gothic_crypt_fog",
    name: "🦇 Castlevania Crypt Fog",
    description: "Atmospheric haunted lavender & bone fog with smooth organic plasma",
    settings: {
      reactiveBackground: true,
      backgroundPattern: "plasma",
      backgroundPalette: "gothic_crypt",
      backgroundPixelSize: 5,
      backgroundDitherStrength: 0.3,
      backgroundReactivity: 0.9,
      backgroundSpeed: 0.7,
      backgroundResolutionScale: 2,
      enableTiledLogo: true,
      logoDensity: 3,
      bassShakeStrength: 0.45,
      midsLogoScale: 0.65,
      highsMovementSpeed: 0.7,
      fftSmoothing: 0.45,
      audioGain: 1.2,
      lowsSmoothing: 0.25,
      midsSmoothing: 0.25,
      highsSmoothing: 0.2,
      lowsBaseThreshold: 0.2,
      midsBaseScale: 0.28,
      highsBaseDrift: 0.15,
    },
  },
];

export function getCustomPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading custom presets:", e);
  }
  return [];
}

export function saveCustomPresets(presets) {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (e) {
    console.error("Error saving custom presets:", e);
    return false;
  }
}

export function addCustomPreset(name, currentSettings) {
  const customPresets = getCustomPresets();
  const id = "custom_" + Date.now();
  const newPreset = {
    id,
    name: name.trim() || `Custom Preset ${customPresets.length + 1}`,
    description: "Custom user-saved preset",
    isCustom: true,
    createdAt: new Date().toISOString(),
    settings: { ...currentSettings },
  };
  const updated = [newPreset, ...customPresets];
  saveCustomPresets(updated);
  return newPreset;
}

export function deleteCustomPreset(id) {
  const customPresets = getCustomPresets();
  const updated = customPresets.filter((p) => p.id !== id);
  saveCustomPresets(updated);
  return updated;
}
