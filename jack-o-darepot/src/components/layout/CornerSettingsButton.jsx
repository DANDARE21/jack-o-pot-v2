import React from "react";
import { useNavigation } from "../../navigation/NavigationContext";
import { SCREENS } from "../../navigation/screens";

export default function CornerSettingsButton() {
  const { currentScreen, navigate } = useNavigation();

  return (
    <div className="corner-actions-dock">
      {currentScreen !== SCREENS.GAME && (
        <button
          className="corner-btn corner-game-btn"
          onClick={() => navigate(SCREENS.GAME)}
          title="Return to Reels (Esc)"
          aria-label="Return to Reels"
        >
          <span className="corner-btn-icon">🎰</span>
        </button>
      )}

      {currentScreen !== SCREENS.COLLECTION && (
        <button
          className="corner-btn corner-coll-btn"
          onClick={() => navigate(SCREENS.COLLECTION)}
          title="Game Collection (Press C)"
          aria-label="Open Collection"
        >
          <span className="corner-btn-icon">🎮</span>
        </button>
      )}

      {currentScreen !== SCREENS.SETTINGS && (
        <button
          className="corner-btn corner-settings-btn"
          onClick={() => navigate(SCREENS.SETTINGS)}
          title="Settings (Press S)"
          aria-label="Open Settings"
        >
          <span className="corner-btn-icon">⚙️</span>
        </button>
      )}
    </div>
  );
}
