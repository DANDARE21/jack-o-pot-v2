import { useEffect } from "react";
import { GameProvider, useGame, useSettings, ModifierProvider } from "@/context";
import { NavigationProvider, useNavigation, Navigator } from "@/navigation";
import { initGlobalSoundEffects } from "@/services";
import { DesktopBar, CornerSettingsButton, ReactiveBackground } from "@/components";
import "./App.css";

function AppShell() {
  const { settings } = useSettings();
  const { isFullscreen, isSpinning } = useGame();
  const { currentScreen } = useNavigation();

  useEffect(() => {
    const cleanup = initGlobalSoundEffects();
    return cleanup;
  }, []);

  return (
    <div
      className={`app-container atmosphere-${settings.spookyAtmosphere || "high"} screen-active-${currentScreen} ${
        isFullscreen ? "is-fullscreen" : ""
      } ${isSpinning ? "is-spinning-active" : ""}`}
    >
      {/* Sound Reactive Animated WebGL Background */}
      <ReactiveBackground />

      {/* Top Bar (visible only when not in fullscreen mode) */}
      {!isFullscreen && <DesktopBar isFullscreen={isFullscreen} />}

      {/* Screen Navigator Controller */}
      <main className={`app-main-content screen-${currentScreen}`}>
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
      <ModifierProvider>
        <NavigationProvider>
          <AppShell />
        </NavigationProvider>
      </ModifierProvider>
    </GameProvider>
  );
}
