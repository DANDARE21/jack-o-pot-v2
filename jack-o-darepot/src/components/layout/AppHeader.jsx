import React from "react";
import { useNavigation } from "../../navigation/NavigationContext";
import { SCREENS } from "../../navigation/screens";

export default function AppHeader() {
  const { currentScreen, navigate } = useNavigation();

  return (
    <header className="app-header">
      <h1 className="app-title">JACK'O POT</h1>
      <div className="app-subtitle">
        <span>Spin the reels</span>
        <span className="dot" />
        <span>Face the dare</span>
      </div>

      <nav className="app-nav-tabs">
        <button
          className={`app-nav-tab ${currentScreen === SCREENS.GAME ? "active" : ""}`}
          onClick={() => navigate(SCREENS.GAME)}
        >
          <span className="tab-icon">🎰</span>
          <span>Reels</span>
        </button>
        <button
          className={`app-nav-tab ${currentScreen === SCREENS.COLLECTION ? "active" : ""}`}
          onClick={() => navigate(SCREENS.COLLECTION)}
          title="Game Collection & Launcher (Press C)"
        >
          <span className="tab-icon">🎮</span>
          <span>Collection</span>
          <span className="nav-hotkey-badge">C</span>
        </button>
        <button
          className={`app-nav-tab ${currentScreen === SCREENS.SETTINGS ? "active" : ""}`}
          onClick={() => navigate(SCREENS.SETTINGS)}
          title="Settings & Configuration (Press S)"
        >
          <span className="tab-icon">⚙️</span>
          <span>Settings</span>
          <span className="nav-hotkey-badge">S</span>
        </button>
      </nav>
    </header>
  );
}
