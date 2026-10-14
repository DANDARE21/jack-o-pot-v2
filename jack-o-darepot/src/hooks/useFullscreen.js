import { useState, useEffect, useCallback } from "react";
import { useElectron } from "./useElectron";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const {
    isElectron,
    toggleFullscreen: electronToggleFullscreen,
    isFullscreen: isFullscreenCheck,
    onFullscreenChange,
  } = useElectron();

  const toggleFullscreen = useCallback(async () => {
    if (isElectron && electronToggleFullscreen) {
      await electronToggleFullscreen();
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      } else {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    }
  }, [isElectron, electronToggleFullscreen]);

  // Sync initial and dynamic Electron fullscreen state
  useEffect(() => {
    if (isElectron && isFullscreenCheck) {
      isFullscreenCheck().then((val) => setIsFullscreen(Boolean(val))).catch(() => {});
    }

    if (onFullscreenChange) {
      const unsub = onFullscreenChange((isFull) => {
        setIsFullscreen(isFull);
      });
      return () => unsub?.();
    }
  }, [isElectron, isFullscreenCheck, onFullscreenChange]);

  // Sync standard DOM fullscreen events
  useEffect(() => {
    const handleDomFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleDomFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleDomFullscreen);
  }, []);

  return { isFullscreen, toggleFullscreen };
}
