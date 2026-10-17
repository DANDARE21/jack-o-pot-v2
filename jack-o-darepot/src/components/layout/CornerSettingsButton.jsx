import React from "react";
import { Icon } from "@iconify/react";
import { useNavigation } from "../../navigation/NavigationContext";
import { SCREENS } from "../../navigation/screens";

export default function CornerSettingsButton() {
  const { currentScreen, navigate } = useNavigation();

  return (
    <div className="corner-actions-dock" role="navigation" aria-label="Quick Navigation">
      {currentScreen !== SCREENS.GAME && (
        <button
          className="corner-btn corner-game-btn"
          onClick={() => navigate(SCREENS.GAME)}
          title="Return to Reels (Esc)"
          aria-label="Return to Reels"
        >
          <Icon icon="game-icons:slot-machine" className="corner-btn-icon text-xl" />
        </button>
      )}

      {currentScreen !== SCREENS.COLLECTION && (
        <button
          className="corner-btn corner-coll-btn"
          onClick={() => navigate(SCREENS.COLLECTION)}
          title="Game Collection (Press C)"
          aria-label="Open Collection"
        >
          <Icon icon="game-icons:retro-controller" className="corner-btn-icon text-xl" />
        </button>
      )}

      {currentScreen !== SCREENS.LEADERBOARD && (
        <button
          className="corner-btn corner-leaderboard-btn"
          onClick={() => navigate(SCREENS.LEADERBOARD)}
          title="Leaderboard (Press L)"
          aria-label="Open Leaderboard"
        >
          <Icon icon="game-icons:trophy" className="corner-btn-icon text-xl" />
        </button>
      )}

      {currentScreen !== SCREENS.SETTINGS && (
        <button
          className="corner-btn corner-settings-btn"
          onClick={() => navigate(SCREENS.SETTINGS)}
          title="Settings (Press S)"
          aria-label="Open Settings"
        >
          <Icon icon="streamline-ultimate:cog-bold" className="corner-btn-icon text-xl" />
        </button>
      )}
    </div>
  );
}
