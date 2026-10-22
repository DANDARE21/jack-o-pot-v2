import { useState, useEffect } from "react";
import { Howler } from "howler";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "./settingsDefaults";
import { SettingsContext } from "./SettingsContextInstance";
import { applyThemeToDom } from "@/services";
export { useSettings } from "./useSettings";

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to parse settings from localStorage:", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Apply UI theme CSS variables to DOM
  useEffect(() => {
    try {
      applyThemeToDom(settings);
    } catch (e) {
      console.error("Failed to apply theme to DOM:", e);
    }
  }, [
    settings.uiThemePreset,
    settings.uiSyncWithBackground,
    settings.uiAccentColor,
    settings.uiAccentHover,
    settings.uiAccentGlow,
    settings.uiBgSurface,
    settings.uiBorderColor,
    settings.uiTextColor,
    settings.uiCursedColor,
    settings.backgroundPalette,
  ]);

  // Apply settings to Howler audio engine
  useEffect(() => {
    try {
      Howler.mute(!settings.masterSound);
      Howler.volume(settings.soundVolume / 100);
    } catch (e) {
      console.error("Howler audio settings error:", e);
    }
  }, [settings.masterSound, settings.soundVolume]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applySettings = (partialSettings) => {
    setSettings((prev) => ({
      ...prev,
      ...partialSettings,
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        applySettings,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
