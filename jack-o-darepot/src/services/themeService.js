// themeService.js - Dynamic Retro 8-bit UI Color & Theme Manager

export const UI_THEMES = {
  jack_o_flame: {
    id: "jack_o_flame",
    name: "Jack-o-Flame (Pumpkin Fire)",
    icon: "game-icons:jack-o-lantern",
    paletteKey: "jack_o_flame",
    accent: "#ff6200",
    accentHover: "#ff8533",
    accentGlow: "#ffaa44",
    surface: "#110e19",
    surfaceElevated: "#181424",
    border: "#ff6200",
    borderSubtle: "rgba(255, 98, 0, 0.3)",
    text: "#f8f8fc",
    textMuted: "#8e8a9f",
    cursed: "#ff1744",
    cursedDark: "#7a0016",
    success: "#10e050",
  },
  lospec_retro: {
    id: "lospec_retro",
    name: "Lospec Retro (Cyberpunk Hot Pink)",
    icon: "game-icons:floppy-disk",
    paletteKey: "lospec_retro",
    accent: "#ff007f",
    accentHover: "#ff3399",
    accentGlow: "#ff66b2",
    surface: "#0a0d24",
    surfaceElevated: "#12173b",
    border: "#ff007f",
    borderSubtle: "rgba(255, 0, 127, 0.35)",
    text: "#f2f2f2",
    textMuted: "#7a8ba9",
    cursed: "#ff1744",
    cursedDark: "#7a0016",
    success: "#00f5d4",
  },
  cursed_blood: {
    id: "cursed_blood",
    name: "Demonic Crimson (Cursed Blood)",
    icon: "game-icons:skull-crossed-bones",
    paletteKey: "cursed_blood",
    accent: "#e01a4f",
    accentHover: "#ff3366",
    accentGlow: "#ff7597",
    surface: "#14040a",
    surfaceElevated: "#220812",
    border: "#e01a4f",
    borderSubtle: "rgba(224, 26, 79, 0.35)",
    text: "#ffe5ec",
    textMuted: "#9c6b78",
    cursed: "#ff1744",
    cursedDark: "#520010",
    success: "#ff99c8",
  },
  toxic_acid: {
    id: "toxic_acid",
    name: "Acid Hazard (Toxic Slime)",
    icon: "game-icons:poison-bottle",
    paletteKey: "toxic_acid",
    accent: "#10e050",
    accentHover: "#3df070",
    accentGlow: "#d8ff54",
    surface: "#051208",
    surfaceElevated: "#0c2010",
    border: "#10e050",
    borderSubtle: "rgba(16, 224, 80, 0.35)",
    text: "#f0fff4",
    textMuted: "#73997b",
    cursed: "#ff2a4b",
    cursedDark: "#6b0515",
    success: "#10e050",
  },
  gameboy_dmg: {
    id: "gameboy_dmg",
    name: "GameBoy Classic (1989 DMG)",
    icon: "game-icons:game-console",
    paletteKey: "gameboy_dmg",
    accent: "#8bac0f",
    accentHover: "#9bbc0f",
    accentGlow: "#b8dc14",
    surface: "#0f380f",
    surfaceElevated: "#1c4a1c",
    border: "#8bac0f",
    borderSubtle: "rgba(139, 172, 15, 0.4)",
    text: "#e0f8d0",
    textMuted: "#6b8c42",
    cursed: "#cc2222",
    cursedDark: "#550a0a",
    success: "#9bbc0f",
  },
  midnight_synth: {
    id: "midnight_synth",
    name: "Midnight Synthwave (Outrun)",
    icon: "game-icons:sunglasses",
    paletteKey: "midnight_synth",
    accent: "#00f5d4",
    accentHover: "#33ffd9",
    accentGlow: "#e024c3",
    surface: "#0e051d",
    surfaceElevated: "#190b33",
    border: "#00f5d4",
    borderSubtle: "rgba(0, 245, 212, 0.35)",
    text: "#f0f8ff",
    textMuted: "#8e78aa",
    cursed: "#ff2a6d",
    cursedDark: "#700528",
    success: "#00f5d4",
  },
  gothic_crypt: {
    id: "gothic_crypt",
    name: "Castlevania Crypt (Haunted Slate)",
    icon: "game-icons:coffin",
    paletteKey: "gothic_crypt",
    accent: "#9f8ec2",
    accentHover: "#baa8e0",
    accentGlow: "#e8e0d5",
    surface: "#0e0c15",
    surfaceElevated: "#191524",
    border: "#7f6e91",
    borderSubtle: "rgba(127, 110, 145, 0.35)",
    text: "#e8e0d5",
    textMuted: "#837894",
    cursed: "#ff3355",
    cursedDark: "#600818",
    success: "#9f8ec2",
  },
  noir_monochrome: {
    id: "noir_monochrome",
    name: "1-Bit Amber Noir (Retro Arcade)",
    icon: "game-icons:vintage-robot",
    paletteKey: "noir_monochrome",
    accent: "#ffaa00",
    accentHover: "#ffc233",
    accentGlow: "#ffe066",
    surface: "#0d0c08",
    surfaceElevated: "#1c1912",
    border: "#ffaa00",
    borderSubtle: "rgba(255, 170, 0, 0.35)",
    text: "#ffffff",
    textMuted: "#a09880",
    cursed: "#ff3333",
    cursedDark: "#600000",
    success: "#ffaa00",
  },
};

/**
 * Converts a hex color to rgba string
 */
export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== "string") return `rgba(255, 98, 0, ${alpha})`;
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleanHex.length !== 6) return `rgba(255, 98, 0, ${alpha})`;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Applies UI colors and theme variables to the document element styles
 */
export function applyThemeToDom(settings = {}) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Determine effective theme
  const bgPaletteKey = settings.backgroundPalette || "jack_o_flame";
  const presetKey = settings.uiThemePreset || (settings.uiSyncWithBackground ? bgPaletteKey : "jack_o_flame");
  const baseTheme = UI_THEMES[presetKey] || UI_THEMES[bgPaletteKey] || UI_THEMES.jack_o_flame;

  // Use custom colors if configured, else base theme colors
  const accent = settings.uiAccentColor || baseTheme.accent;
  const accentHover = settings.uiAccentHover || baseTheme.accentHover;
  const accentGlow = settings.uiAccentGlow || baseTheme.accentGlow;
  const surface = settings.uiBgSurface || baseTheme.surface;
  const surfaceElevated = baseTheme.surfaceElevated;
  const border = settings.uiBorderColor || baseTheme.border;
  const text = settings.uiTextColor || baseTheme.text;
  const cursed = settings.uiCursedColor || baseTheme.cursed;
  const cursedDark = baseTheme.cursedDark;
  const success = baseTheme.success;

  // Set modern retro 8-bit CSS variables
  root.style.setProperty("--ui-accent", accent);
  root.style.setProperty("--ui-accent-hover", accentHover);
  root.style.setProperty("--ui-accent-glow", accentGlow);
  root.style.setProperty("--ui-accent-alpha-15", hexToRgba(accent, 0.15));
  root.style.setProperty("--ui-accent-alpha-25", hexToRgba(accent, 0.25));
  root.style.setProperty("--ui-accent-alpha-40", hexToRgba(accent, 0.4));
  root.style.setProperty("--ui-bg-surface", surface);
  root.style.setProperty("--ui-bg-surface-elevated", surfaceElevated);
  root.style.setProperty("--ui-border", border);
  root.style.setProperty("--ui-border-subtle", hexToRgba(border, 0.35));
  root.style.setProperty("--ui-text-main", text);
  root.style.setProperty("--ui-text-muted", baseTheme.textMuted);
  root.style.setProperty("--ui-cursed", cursed);
  root.style.setProperty("--ui-cursed-dark", cursedDark);
  root.style.setProperty("--ui-cursed-alpha-20", hexToRgba(cursed, 0.2));
  root.style.setProperty("--ui-cursed-alpha-40", hexToRgba(cursed, 0.4));
  root.style.setProperty("--ui-success", success);

  // Set backwards-compatible legacy variables so existing components react immediately
  root.style.setProperty("--accent-orange", accent);
  root.style.setProperty("--accent-orange-bright", accentHover);
  root.style.setProperty("--accent-amber", accentGlow);
  root.style.setProperty("--accent-gold", accentGlow);
  root.style.setProperty("--bg-cabinet", surface);
  root.style.setProperty("--bg-cabinet-dark", surfaceElevated);
  root.style.setProperty("--border-cabinet", hexToRgba(border, 0.4));
  root.style.setProperty("--accent-cursed", cursed);
  root.style.setProperty("--accent-cursed-dark", cursedDark);
  root.style.setProperty("--border-cursed", hexToRgba(cursed, 0.55));
  root.style.setProperty("--text-main", text);
  root.style.setProperty("--text-muted", baseTheme.textMuted);
  root.style.setProperty("--text-accent", accentGlow);
}
