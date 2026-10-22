import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  loadModifiers,
  saveModifiers,
  MODIFIERS_DATA,
  MODIFIER_CATEGORIES,
} from "@/services";
import { Howl } from "howler";

const ModifierContext = createContext(null);

export function ModifierProvider({ children }) {
  const [modifiers, setModifiers] = useState(() => loadModifiers());
  const [selectedModifierId, setSelectedModifierId] = useState(() => {
    const loaded = loadModifiers();
    return loaded[0]?.id || "warp_speed";
  });

  // Sound effects
  const sounds = useMemo(() => {
    try {
      return {
        toggle: new Howl({ src: ["/assets/sounds/reel-stop.mp3"], volume: 0.35 }),
        click: new Howl({ src: ["/assets/sounds/spin.mp3"], volume: 0.2 }),
      };
    } catch (e) {
      return null;
    }
  }, []);

  const playClickSound = useCallback(() => {
    try {
      sounds?.click?.play();
    } catch (e) {}
  }, [sounds]);

  const playToggleSound = useCallback(() => {
    try {
      sounds?.toggle?.play();
    } catch (e) {}
  }, [sounds]);

  // Persist modifiers on change
  useEffect(() => {
    saveModifiers(modifiers);
  }, [modifiers]);

  // Currently selected modifier object
  const selectedModifier = useMemo(() => {
    return modifiers.find((m) => m.id === selectedModifierId) || modifiers[0];
  }, [modifiers, selectedModifierId]);

  // Active modifiers list
  const activeModifiers = useMemo(() => {
    return modifiers.filter((m) => m.enabled);
  }, [modifiers]);

  // Toggle single modifier active/inactive
  const toggleModifier = useCallback(
    (id) => {
      playToggleSound();
      setModifiers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
      );
    },
    [playToggleSound]
  );

  // Set modifier enabled explicitly
  const setModifierEnabled = useCallback(
    (id, enabled) => {
      playToggleSound();
      setModifiers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, enabled: Boolean(enabled) } : m))
      );
    },
    [playToggleSound]
  );

  // Update specific setting in a modifier
  const updateModifierSetting = useCallback((modifierId, settingId, value) => {
    setModifiers((prev) =>
      prev.map((m) => {
        if (m.id !== modifierId) return m;
        return {
          ...m,
          settings: {
            ...m.settings,
            [settingId]: value,
          },
        };
      })
    );
  }, []);

  // Reset a modifier's settings to its default schema
  const resetModifierSettings = useCallback(
    (modifierId) => {
      playClickSound();
      const base = MODIFIERS_DATA.find((m) => m.id === modifierId);
      if (!base) return;

      setModifiers((prev) =>
        prev.map((m) => {
          if (m.id !== modifierId) return m;
          return {
            ...m,
            settings: { ...base.defaultSettings },
          };
        })
      );
    },
    [playClickSound]
  );

  // Enable All Modifiers
  const enableAll = useCallback(() => {
    playToggleSound();
    setModifiers((prev) => prev.map((m) => ({ ...m, enabled: true })));
  }, [playToggleSound]);

  // Disable All Modifiers
  const disableAll = useCallback(() => {
    playToggleSound();
    setModifiers((prev) => prev.map((m) => ({ ...m, enabled: false })));
  }, [playToggleSound]);

  // Randomize Active Modifiers (picks 2-4 fun combos)
  const randomizeActive = useCallback(() => {
    playToggleSound();
    setModifiers((prev) => {
      const shuffled = [...prev].sort(() => 0.5 - Math.random());
      const pickCount = Math.floor(Math.random() * 3) + 2; // 2 to 4
      const activeIds = new Set(shuffled.slice(0, pickCount).map((m) => m.id));

      return prev.map((m) => ({
        ...m,
        enabled: activeIds.has(m.id),
      }));
    });
  }, [playToggleSound]);

  // Helper check
  const isModifierActive = useCallback(
    (id) => {
      return Boolean(modifiers.find((m) => m.id === id)?.enabled);
    },
    [modifiers]
  );

  // Get single modifier settings
  const getModifierSettings = useCallback(
    (id) => {
      const found = modifiers.find((m) => m.id === id);
      return found ? found.settings : null;
    },
    [modifiers]
  );

  return (
    <ModifierContext.Provider
      value={{
        modifiers,
        activeModifiers,
        categories: MODIFIER_CATEGORIES,
        selectedModifierId,
        setSelectedModifierId,
        selectedModifier,
        toggleModifier,
        setModifierEnabled,
        updateModifierSetting,
        resetModifierSettings,
        enableAll,
        disableAll,
        randomizeActive,
        isModifierActive,
        getModifierSettings,
        playClickSound,
      }}
    >
      {children}
    </ModifierContext.Provider>
  );
}

export function useModifiers() {
  const context = useContext(ModifierContext);
  if (!context) {
    throw new Error("useModifiers must be used within a ModifierProvider");
  }
  return context;
}
