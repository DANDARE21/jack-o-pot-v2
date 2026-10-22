import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SCREENS, SCREEN_CONFIG } from "./screens";

const NavigationContext = createContext(null);

export function NavigationProvider({ initialScreen = SCREENS.GAME, children }) {
  const [history, setHistory] = useState([
    { screen: initialScreen, params: {} },
  ]);

  const currentEntry = history[history.length - 1] || { screen: initialScreen, params: {} };
  const currentScreen = currentEntry.screen;
  const currentParams = currentEntry.params;
  const canGoBack = history.length > 1;

  const navigate = useCallback((screen, params = {}) => {
    setHistory((prev) => [...prev, { screen, params }]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, prev.length - 1);
    });
  }, []);

  const resetTo = useCallback((screen = SCREENS.GAME, params = {}) => {
    setHistory([{ screen, params }]);
  }, []);

  // Keyboard shortcuts: Escape to go back, S to toggle Settings screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;

      if (e.key === "Escape" && canGoBack) {
        e.preventDefault();
        goBack();
      } else if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (currentScreen === SCREENS.SETTINGS) {
          goBack();
        } else {
          navigate(SCREENS.SETTINGS);
        }
      } else if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (currentScreen === SCREENS.COLLECTION) {
          goBack();
        } else {
          navigate(SCREENS.COLLECTION);
        }
      } else if ((e.key === "l" || e.key === "L") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (currentScreen === SCREENS.LEADERBOARD) {
          goBack();
        } else {
          navigate(SCREENS.LEADERBOARD);
        }
      } else if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (currentScreen === SCREENS.MODIFIERS) {
          goBack();
        } else {
          navigate(SCREENS.MODIFIERS);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoBack, goBack, currentScreen, navigate]);

  const screenConfig = SCREEN_CONFIG[currentScreen] || {
    id: currentScreen,
    title: "Screen",
    icon: "game-icons:scroll-unfurled",
  };

  return (
    <NavigationContext.Provider
      value={{
        currentScreen,
        params: currentParams,
        history,
        canGoBack,
        navigate,
        goBack,
        resetTo,
        screenConfig,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
