import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSettings } from "./SettingsContext";
import { useFullscreen } from "../hooks/useFullscreen";

const GameContext = createContext(null);

export const DEFAULT_PLAYER_STATS = [
  { points: 260, spins: 18, beatenChallenges: 10, lostChallenges: 2, streak: 3, bestStreak: 5, customTitle: "Reel Overlord" },
  { points: 210, spins: 15, beatenChallenges: 8, lostChallenges: 3, streak: 2, bestStreak: 4, customTitle: "Dare Queen" },
  { points: 150, spins: 12, beatenChallenges: 6, lostChallenges: 4, streak: 1, bestStreak: 3, customTitle: "Arcade Gambler" },
  { points: 95, spins: 9, beatenChallenges: 3, lostChallenges: 5, streak: 0, bestStreak: 2, customTitle: "Curse Survivor" },
];

export const enrichPlayer = (player, index = 0) => {
  const fallback = DEFAULT_PLAYER_STATS[index % DEFAULT_PLAYER_STATS.length] || {
    points: 100,
    spins: 5,
    beatenChallenges: 2,
    lostChallenges: 1,
    streak: 1,
    bestStreak: 2,
    customTitle: "Challenger",
  };

  const name = typeof player === "string" ? player : player?.name || `Player ${index + 1}`;
  const image = typeof player === "object" ? (player.image || "") : "";
  const sound = typeof player === "object" ? (player.sound || "") : "";

  return {
    id: typeof player === "object" && player.id ? player.id : name.toLowerCase().replace(/\s+/g, "-"),
    name,
    image,
    sound,
    points: typeof player === "object" && typeof player.points === "number" ? player.points : fallback.points,
    spins: typeof player === "object" && typeof player.spins === "number" ? player.spins : fallback.spins,
    beatenChallenges: typeof player === "object" && typeof player.beatenChallenges === "number" ? player.beatenChallenges : fallback.beatenChallenges,
    lostChallenges: typeof player === "object" && typeof player.lostChallenges === "number" ? player.lostChallenges : fallback.lostChallenges,
    streak: typeof player === "object" && typeof player.streak === "number" ? player.streak : fallback.streak,
    bestStreak: typeof player === "object" && typeof player.bestStreak === "number" ? player.bestStreak : fallback.bestStreak,
    customTitle: typeof player === "object" && player.customTitle ? player.customTitle : fallback.customTitle,
    lastDare: typeof player === "object" && player.lastDare ? player.lastDare : "Spun the reels",
    updatedAt: typeof player === "object" && player.updatedAt ? player.updatedAt : new Date().toISOString(),
  };
};

export function GameProvider({ children }) {
  const { settings } = useSettings();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Players & Games Data with LocalStorage Persistence
  const [players, setPlayers] = useState(() => {
    try {
      const stored = localStorage.getItem("jack_o_pot_players");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => enrichPlayer(p, idx));
        }
      }
    } catch (e) {
      console.warn("Failed to parse stored players:", e);
    }
    return [];
  });

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

  // Active Spin State (for coordinated animations and HUD hiding)
  const [isSpinning, setIsSpinning] = useState(false);

  // Sync persistence
  useEffect(() => {
    localStorage.setItem("spinCount", spinCount.toString());
    localStorage.setItem("totalSpins", spinCount.toString());
  }, [spinCount]);

  useEffect(() => {
    localStorage.setItem("curseMeter", curseMeter.toString());
  }, [curseMeter]);

  // Persist players to localStorage
  useEffect(() => {
    if (players && players.length > 0) {
      try {
        localStorage.setItem("jack_o_pot_players", JSON.stringify(players));
      } catch (e) {
        console.error("Failed to persist players:", e);
      }
    }
  }, [players]);

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

  // Load Initial JSON Data if not present in localStorage
  useEffect(() => {
    const storedPlayers = localStorage.getItem("jack_o_pot_players");
    if (!storedPlayers || players.length === 0) {
      fetch("/data/players.json")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const enriched = data.map((p, idx) => enrichPlayer(p, idx));
            setPlayers(enriched);
            try {
              localStorage.setItem("jack_o_pot_players", JSON.stringify(enriched));
            } catch (err) {
              console.error(err);
            }
          }
        })
        .catch(console.error);
    }

    const storedGames = localStorage.getItem("jack_o_pot_games");
    let hasValidGames = false;
    try {
      if (storedGames) {
        const parsed = JSON.parse(storedGames);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          hasValidGames = true;
        }
      }
    } catch (e) {}

    if (!hasValidGames || Object.keys(gamesByCategory).length === 0) {
      fetch("/data/games.json")
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data === "object" && Object.keys(data).length > 0) {
            setGamesByCategory(data);
            try {
              localStorage.setItem("jack_o_pot_games", JSON.stringify(data));
            } catch (e) {
              console.error(e);
            }
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

  // Player & Leaderboard Management Actions
  const addPlayer = useCallback((playerData) => {
    const rawName = playerData?.name?.trim();
    if (!rawName) return { success: false, error: "Player name is required." };

    let isDuplicate = false;
    setPlayers((prev) => {
      const exists = prev.some((p) => p.name.toLowerCase() === rawName.toLowerCase());
      if (exists) {
        isDuplicate = true;
        return prev;
      }
      const newPlayer = enrichPlayer({
        ...playerData,
        name: rawName,
      }, prev.length);
      return [...prev, newPlayer];
    });

    if (isDuplicate) {
      return { success: false, error: `Player "${rawName}" already registered.` };
    }
    return { success: true };
  }, []);

  const updatePlayer = useCallback((idOrName, updatedFields) => {
    if (!idOrName) return { success: false, error: "Invalid player identifier." };
    setPlayers((prev) =>
      prev.map((p) => {
        const matches = p.id === idOrName || p.name.toLowerCase() === String(idOrName).toLowerCase();
        if (!matches) return p;
        return {
          ...p,
          ...updatedFields,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    return { success: true };
  }, []);

  const deletePlayer = useCallback((idOrName) => {
    setPlayers((prev) =>
      prev.filter((p) => p.id !== idOrName && p.name.toLowerCase() !== String(idOrName).toLowerCase())
    );
    return { success: true };
  }, []);

  const adjustPlayerStats = useCallback((idOrName, { deltaPoints = 0, deltaSpins = 0, deltaBeaten = 0, deltaLost = 0 }) => {
    setPlayers((prev) =>
      prev.map((p) => {
        const matches = p.id === idOrName || p.name.toLowerCase() === String(idOrName).toLowerCase();
        if (!matches) return p;
        const newPoints = Math.max(0, (p.points || 0) + deltaPoints);
        const newSpins = Math.max(0, (p.spins || 0) + deltaSpins);
        const newBeaten = Math.max(0, (p.beatenChallenges || 0) + deltaBeaten);
        const newLost = Math.max(0, (p.lostChallenges || 0) + deltaLost);
        return {
          ...p,
          points: newPoints,
          spins: newSpins,
          beatenChallenges: newBeaten,
          lostChallenges: newLost,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const recordPlayerSpin = useCallback((playerName) => {
    if (!playerName || playerName === "6" || playerName === "Unknown") return;
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.name.toLowerCase() === playerName.toLowerCase()) {
          return {
            ...p,
            spins: (p.spins || 0) + 1,
            lastDare: "Spun the reels",
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  }, []);

  const recordChallengeOutcome = useCallback((playerName, { won, points = 50, dareName = "" }) => {
    if (!playerName || playerName === "6" || playerName === "Unknown") return;
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.name.toLowerCase() === playerName.toLowerCase()) {
          const currentStreak = won ? (p.streak || 0) + 1 : 0;
          const bestStreak = Math.max(p.bestStreak || 0, currentStreak);
          const pointsEarned = won ? points : 0;
          return {
            ...p,
            points: Math.max(0, (p.points || 0) + pointsEarned),
            beatenChallenges: won ? (p.beatenChallenges || 0) + 1 : (p.beatenChallenges || 0),
            lostChallenges: !won ? (p.lostChallenges || 0) + 1 : (p.lostChallenges || 0),
            streak: currentStreak,
            bestStreak,
            lastDare: dareName || (won ? "Conquered Dare" : "Fell to Dare"),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  }, []);

  const resetAllPlayerStats = useCallback((mode = "zero") => {
    if (mode === "default") {
      setPlayers((prev) => prev.map((p, idx) => enrichPlayer({ name: p.name, image: p.image, sound: p.sound }, idx)));
    } else {
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          points: 0,
          spins: 0,
          beatenChallenges: 0,
          lostChallenges: 0,
          streak: 0,
          bestStreak: 0,
          lastDare: "Stats Reset",
          updatedAt: new Date().toISOString(),
        }))
      );
    }
  }, []);

  const resetPlayersToDefault = useCallback(async () => {
    try {
      const res = await fetch("/data/players.json");
      const data = await res.json();
      if (Array.isArray(data)) {
        const enriched = data.map((p, idx) => enrichPlayer(p, idx));
        setPlayers(enriched);
        localStorage.setItem("jack_o_pot_players", JSON.stringify(enriched));
        return { success: true, data: enriched };
      }
      return { success: false, error: "Invalid players data format" };
    } catch (err) {
      console.error("Failed to reset players:", err);
      return { success: false, error: err.message };
    }
  }, []);

  return (
    <GameContext.Provider
      value={{
        players,
        setPlayers,
        addPlayer,
        updatePlayer,
        deletePlayer,
        adjustPlayerStats,
        recordPlayerSpin,
        recordChallengeOutcome,
        resetAllPlayerStats,
        resetPlayersToDefault,
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
        isSpinning,
        setIsSpinning,
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
