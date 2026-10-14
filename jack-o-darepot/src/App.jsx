import { GameProvider, useGame } from "./context/GameContext";
import { useSettings } from "./context/SettingsContext";
import { NavigationProvider } from "./navigation/NavigationContext";
import Navigator from "./navigation/Navigator";
import DesktopBar from "./components/DesktopBar";
import CornerSettingsButton from "./components/layout/CornerSettingsButton";
import ReactiveBackground from "./components/background/ReactiveBackground";
import "./App.css";

function AppShell() {
  const { settings } = useSettings();
  const { isFullscreen } = useGame();

  return (
    <div
      className={`app-container atmosphere-${settings.spookyAtmosphere || "high"} ${
        isFullscreen ? "is-fullscreen" : ""
      }`}
    >
      {/* Sound Reactive Animated WebGL Background */}
      <ReactiveBackground />

      {/* Top Bar (visible only when not in fullscreen mode) */}
      {!isFullscreen && <DesktopBar isFullscreen={isFullscreen} />}

      {/* Screen Navigator Controller */}
      <main className="app-main-content">
        <Navigator />
      </main>

      {/* Floating Corner Settings Icon Button */}
      <CornerSettingsButton />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <NavigationProvider>
        <AppShell />
      </NavigationProvider>
    </GameProvider>
  );
}
