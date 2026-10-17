import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useElectron } from "../hooks/useElectron";
import "./DesktopBar.css";

export default function DesktopBar({ isFullscreen = false }) {
  const {
    isElectron,
    minimize,
    maximize,
    close,
    isMaximized,
    onMaximizeChange,
  } = useElectron();

  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (isElectron && isMaximized) {
      isMaximized().then((res) => setMaximized(Boolean(res))).catch(() => { });
    }

    if (onMaximizeChange) {
      const unsub = onMaximizeChange((isMax) => {
        setMaximized(isMax);
      });
      return () => unsub?.();
    }
  }, [isElectron, isMaximized, onMaximizeChange]);

  // Hide the top app bar in fullscreen mode
  if (isFullscreen) {
    return null;
  }

  return (
    <div className="desktop-topbar">
      <div className="desktop-topbar-left">
        <div className="desktop-brand">
          <Icon icon="game-icons:pumpkin-lantern" className="text-ui-accent text-lg" />
          <span className="desktop-brand-name">JACK'O POT</span>
        </div>
      </div>

      {/* Draggable center area - all buttons removed */}
      <div className="desktop-topbar-drag-spacer" />

      <div className="desktop-topbar-right">
        {isElectron && (
          <>
            <button
              className="window-ctrl-btn"
              onClick={minimize}
              title="Minimize"
              aria-label="Minimize"
            >
              &#x2014;
            </button>
            <button
              className="window-ctrl-btn"
              onClick={maximize}
              title={maximized ? "Restore" : "Maximize"}
              aria-label={maximized ? "Restore" : "Maximize"}
            >
              {maximized ? "❐" : "▢"}
            </button>
            <button
              className="window-ctrl-btn close-btn"
              onClick={close}
              title="Close"
              aria-label="Close"
            >
              &#x2715;
            </button>
          </>
        )}
      </div>
    </div>
  );
}
