import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSettings } from "./SettingsContext";
import { useFullscreen } from "../hooks/useFullscreen";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const { settings } = useSettings();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Players & Games Data
  const [players, setPlayers] = useState([]);
  const [gamesByCategory, setGamesByCategory] = useState(() => {
    try {
      const stored = localStorage.getItem("jack_o_pot_games");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to parse stored games:", e);
    }
    return {};
  });

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Persistent Spin Count
  const [spinCount, setSpinCount] = useState(() => {
    const stored = localStorage.getItem("spinCount") || localStorage.getItem("totalSpins");
    return stored ? parseInt(stored, 10) : 0;
  });

  // Persistent Curse Meter
  const [curseMeter, setCurseMeter] = useState(() => {
    const stored = localStorage.getItem("curseMeter");
    return stored ? parseFloat(stored) : 0;
  });

  // Sync persistence
  useEffect(() => {
    localStorage.setItem("spinCount", spinCount.toString());
    localStorage.setItem("totalSpins", spinCount.toString());
  }, [spinCount]);

  useEffect(() => {
    localStorage.setItem("curseMeter", curseMeter.toString());
  }, [curseMeter]);

  // Persist gamesByCategory to localStorage
  useEffect(() => {
    if (gamesByCategory && Object.keys(gamesByCategory).length > 0) {
      try {
        localStorage.setItem("jack_o_pot_games", JSON.stringify(gamesByCategory));
      } catch (e) {
        console.error("Failed to persist gamesByCategory:", e);
      }
    }
  }, [gamesByCategory]);

  // Load Initial JSON Data
  useEffect(() => {
    fetch("/data/players.json")
      .then((res) => res.json())
      .then(setPlayers)
      .catch(console.error);

    const stored = localStorage.getItem("jack_o_pot_games");
    if (!stored) {
      fetch("/data/games.json")
        .then((res) => res.json())
        .then((data) => {
          setGamesByCategory(data);
          try {
            localStorage.setItem("jack_o_pot_games", JSON.stringify(data));
          } catch (e) {
            console.error(e);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Global Keyboard Shortcuts (F11 for Fullscreen, S for Settings)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) {
          setIsSettingsOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen]);

  // Actions
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const toggleSettings = useCallback(() => setIsSettingsOpen((prev) => !prev), []);

  const increaseCurse = useCallback(() => {
    setCurseMeter((prev) =>
      Math.min(prev + (settings.curseIncrement || 10), settings.maxCurseCap || 100)
    );
  }, [settings.curseIncrement, settings.maxCurseCap]);

  const resetCurse = useCallback(() => {
    setCurseMeter(0);
    localStorage.setItem("curseMeter", "0");
  }, []);

  const incrementSpins = useCallback(() => {
    setSpinCount((prev) => {
      const next = prev + 1;
      localStorage.setItem("spinCount", next.toString());
      localStorage.setItem("totalSpins", next.toString());
      return next;
    });
  }, []);

  const resetSpins = useCallback(() => {
    setSpinCount(0);
    localStorage.setItem("spinCount", "0");
    localStorage.setItem("totalSpins", "0");
  }, []);

  // Category and Game Management Actions
  const addCategory = useCallback((categoryName) => {
    const trimmed = categoryName?.trim();
    if (!trimmed) return { success: false, error: "Category name cannot be empty." };
    let success = false;
    setGamesByCategory((prev) => {
      if (prev && prev[trimmed]) {
        return prev;
      }
      success = true;
      return {
        ...prev,
        [trimmed]: [],
      };
    });
    return { success, error: success ? null : `Category "${trimmed}" already exists.` };
  }, []);

  const deleteCategory = useCallback((categoryName) => {
    setGamesByCategory((prev) => {
      const copy = { ...prev };
      delete copy[categoryName];
      return copy;
    });
  }, []);

  const renameCategory = useCallback((oldName, newName) => {
    const trimmed = newName?.trim();
    if (!trimmed || trimmed === oldName) return { success: false, error: "Invalid category name." };
    let success = false;
    setGamesByCategory((prev) => {
      if (!prev || !prev[oldName] || prev[trimmed]) {
        return prev;
      }
      success = true;
      const copy = { ...prev };
      copy[trimmed] = copy[oldName];
      delete copy[oldName];
      return copy;
    });
    return { success, error: success ? null : `Category "${trimmed}" already exists or original not found.` };
  }, []);

  const addGameToCategory = useCallback((categoryName, gameData) => {
    if (!categoryName || !gameData?.name?.trim()) {
      return { success: false, error: "Game name and category are required." };
    }
    const cleanGame = {
      name: gameData.name.trim(),
      image: gameData.image?.trim() || "/assets/images/placeholder.png",
      sound: gameData.sound?.trim() || "",
      text: gameData.text?.trim() || "",
      executablePath: gameData.executablePath?.trim() || "",
      launchArgs: gameData.launchArgs?.trim() || "",
    };

    setGamesByCategory((prev) => {
      const currentList = prev[categoryName] || [];
      return {
        ...prev,
        [categoryName]: [...currentList, cleanGame],
      };
    });
    return { success: true };
  }, []);

  const updateGameInCategory = useCallback((categoryName, gameIndex, updatedGameData) => {
    setGamesByCategory((prev) => {
      const currentList = prev[categoryName] || [];
      if (gameIndex < 0 || gameIndex >= currentList.length) return prev;
      const nextList = [...currentList];
      nextList[gameIndex] = {
        ...nextList[gameIndex],
        ...updatedGameData,
      };
      return {
        ...prev,
        [categoryName]: nextList,
      };
    });
    return { success: true };
  }, []);

  const deleteGameFromCategory = useCallback((categoryName, gameIndex) => {
    setGamesByCategory((prev) => {
      const currentList = prev[categoryName] || [];
      return {
        ...prev,
        [categoryName]: currentList.filter((_, idx) => idx !== gameIndex),
      };
    });
  }, []);

  const resetGamesToDefault = useCallback(async () => {
    try {
      const res = await fetch("/data/games.json");
      const data = await res.json();
      setGamesByCategory(data);
      try {
        localStorage.setItem("jack_o_pot_games", JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
      return { success: true, data };
    } catch (err) {
      console.error("Failed to reset games to default:", err);
      return { success: false, error: err.message };
    }
  }, []);

  return (
    <GameContext.Provider
      value={{
        players,
        setPlayers,
        gamesByCategory,
        setGamesByCategory,
        addCategory,
        deleteCategory,
        renameCategory,
        addGameToCategory,
        updateGameInCategory,
        deleteGameFromCategory,
        resetGamesToDefault,
        spinCount,
        setSpinCount,
        incrementSpins,
        resetSpins,
        curseMeter,
        setCurseMeter,
        increaseCurse,
        resetCurse,
        isSettingsOpen,
        openSettings,
        closeSettings,
        toggleSettings,
        isFullscreen,
        toggleFullscreen,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
