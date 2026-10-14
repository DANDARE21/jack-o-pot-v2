import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useGame } from "../../context/GameContext";
import { useElectron } from "../../hooks/useElectron";
import { Howl } from "howler";
import {
  SettingSection,
  SettingRow,
  SettingToggle,
  SettingSlider,
  SettingSelect,
  SettingButton,
} from "./SettingControls";
import "./SettingsModal.css";

export default function SettingsModal({
  isOpen: propIsOpen,
  onClose: propOnClose,
  players: propPlayers,
  setPlayers: propSetPlayers,
  gamesByCategory: propGamesByCategory,
  setGamesByCategory: propSetGamesByCategory,
  onResetSpins: propOnResetSpins,
  onResetCurse: propOnResetCurse,
}) {
  const [activeTab, setActiveTab] = useState("data");
  const { settings, updateSetting, resetSettings } = useSettings();
  const game = useGame();

  const isOpen = propIsOpen ?? game.isSettingsOpen;
  const onClose = propOnClose ?? game.closeSettings;
  const players = propPlayers ?? game.players;
  const setPlayers = propSetPlayers ?? game.setPlayers;
  const gamesByCategory = propGamesByCategory ?? game.gamesByCategory;
  const setGamesByCategory = propSetGamesByCategory ?? game.setGamesByCategory;
  const onResetSpins = propOnResetSpins ?? game.resetSpins;
  const onResetCurse = propOnResetCurse ?? game.resetCurse;

  const {
    isElectron,
    importJsonFile,
    exportJsonFile,
    openUserDataFolder,
    toggleFullscreen,
    showNotification,
    beep,
    electron,
  } = useElectron();

  if (!isOpen) return null;

  const totalCategories = Object.keys(gamesByCategory || {}).length;
  const totalGames = Object.values(gamesByCategory || {}).flat().length;

  const handleImportPlayers = async () => {
    const res = await importJsonFile({ title: "Import Players JSON" });
    if (res?.data && Array.isArray(res.data)) {
      setPlayers?.(res.data);
      showNotification({
        title: "🎃 Players Imported",
        body: `Successfully imported ${res.data.length} players!`,
      });
    } else if (res?.error) {
      alert("Error reading file: " + res.error);
    }
  };

  const handleExportPlayers = async () => {
    await exportJsonFile(players, "jack-o-pot-players.json");
  };

  const handleResetPlayers = () => {
    fetch("/data/players.json")
      .then((res) => res.json())
      .then((data) => {
        setPlayers?.(data);
        showNotification({
          title: "🔄 Players Reset",
          body: "Restored default players list.",
        });
      })
      .catch(console.error);
  };

  const handleImportGames = async () => {
    const res = await importJsonFile({ title: "Import Games by Category JSON" });
    if (res?.data && typeof res.data === "object") {
      setGamesByCategory?.(res.data);
      showNotification({
        title: "🎃 Games Imported",
        body: "Successfully imported games catalog!",
      });
    } else if (res?.error) {
      alert("Error reading file: " + res.error);
    }
  };

  const handleExportGames = async () => {
    await exportJsonFile(gamesByCategory, "jack-o-pot-games.json");
  };

  const handleResetGames = () => {
    fetch("/data/games.json")
      .then((res) => res.json())
      .then((data) => {
        setGamesByCategory?.(data);
        showNotification({
          title: "🔄 Games Catalog Reset",
          body: "Restored default games catalog.",
        });
      })
      .catch(console.error);
  };

  const handleTestSound = () => {
    try {
      const testHowl = new Howl({
        src: ["/assets/sounds/reel-stop.mp3"],
        volume: 1,
      });
      testHowl.play();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title-wrap">
            <span className="settings-title-icon">⚙️</span>
            <h2 className="settings-title">SETTINGS & CONFIGURATION</h2>
          </div>
          <button className="settings-close-btn" onClick={onClose} title="Close Settings">
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={`settings-tab-btn ${activeTab === "data" ? "active" : ""}`}
            onClick={() => setActiveTab("data")}
          >
            <span>📁</span> Data & Content
          </button>
          <button
            className={`settings-tab-btn ${activeTab === "game" ? "active" : ""}`}
            onClick={() => setActiveTab("game")}
          >
            <span>⚡</span> Curse & Game Rules
          </button>
          <button
            className={`settings-tab-btn ${activeTab === "audio" ? "active" : ""}`}
            onClick={() => setActiveTab("audio")}
          >
            <span>🔊</span> Audio & FX
          </button>
          <button
            className={`settings-tab-btn ${activeTab === "desktop" ? "active" : ""}`}
            onClick={() => setActiveTab("desktop")}
          >
            <span>🖥️</span> Desktop & Display
          </button>
        </div>

        {/* Body Content */}
        <div className="settings-body">
          {/* TAB 1: DATA & CONTENT */}
          {activeTab === "data" && (
            <>
              <SettingSection
                title="Player Roster"
                icon="👥"
                description="Manage the list of victims and challengers in the Darepot."
              >
                <SettingRow
                  title="Active Players"
                  description="Loaded into the first slot reel"
                  badge={`${players.length} Active`}
                >
                  <div style={{ display: "flex", gap: "8px" }}>
                    <SettingButton
                      label="Import JSON"
                      icon="📥"
                      variant="primary"
                      onClick={handleImportPlayers}
                    />
                    <SettingButton
                      label="Export"
                      icon="📤"
                      variant="secondary"
                      onClick={handleExportPlayers}
                    />
                    <SettingButton
                      label="Reset Defaults"
                      icon="🔄"
                      variant="secondary"
                      onClick={handleResetPlayers}
                    />
                  </div>
                </SettingRow>
              </SettingSection>

              <SettingSection
                title="Games & Categories"
                icon="🎮"
                description="Manage the horrors and challenges in the game pool."
              >
                <SettingRow
                  title="Games Catalog"
                  description="Categories and dare games loaded"
                  badge={`${totalCategories} Categories • ${totalGames} Games`}
                >
                  <div style={{ display: "flex", gap: "8px" }}>
                    <SettingButton
                      label="Import JSON"
                      icon="📥"
                      variant="primary"
                      onClick={handleImportGames}
                    />
                    <SettingButton
                      label="Export"
                      icon="📤"
                      variant="secondary"
                      onClick={handleExportGames}
                    />
                    <SettingButton
                      label="Reset Defaults"
                      icon="🔄"
                      variant="secondary"
                      onClick={handleResetGames}
                    />
                  </div>
                </SettingRow>
              </SettingSection>

              {isElectron && (
                <SettingSection
                  title="Local Application Data"
                  icon="📂"
                  description="Direct access to your desktop config and storage folder."
                >
                  <SettingRow
                    title="User Data Directory"
                    description="Open folder in Windows Explorer"
                  >
                    <SettingButton
                      label="Open Data Folder"
                      icon="📂"
                      variant="secondary"
                      onClick={openUserDataFolder}
                    />
                  </SettingRow>
                </SettingSection>
              )}
            </>
          )}

          {/* TAB 2: GAME & CURSE RULES */}
          {activeTab === "game" && (
            <>
              <SettingSection
                title="Spin Pace & Animation"
                icon="⏱️"
                description="Adjust reel pacing for your streaming or party environment."
              >
                <SettingRow
                  title="Fast Spin Mode"
                  description="Halves reel duration for faster dare turnover"
                  badge={settings.fastSpinMode ? "Fast" : "Normal"}
                >
                  <SettingToggle
                    checked={settings.fastSpinMode}
                    onChange={(val) => updateSetting("fastSpinMode", val)}
                  />
                </SettingRow>
              </SettingSection>

              <SettingSection
                title="Curse Mechanics & Risk"
                icon="💀"
                description="Fine tune how fast the slot machine turns against you."
              >
                <SettingRow
                  title="Base Curse Chance"
                  description="Initial chance of a cursed reel trigger"
                >
                  <SettingSlider
                    value={settings.baseCurseChance}
                    min={1}
                    max={25}
                    step={1}
                    onChange={(val) => updateSetting("baseCurseChance", val)}
                  />
                </SettingRow>

                <SettingRow
                  title="Curse Increment per Spin"
                  description="How much the curse meter increases after each normal spin"
                >
                  <SettingSlider
                    value={settings.curseIncrement}
                    min={5}
                    max={25}
                    step={1}
                    onChange={(val) => updateSetting("curseIncrement", val)}
                  />
                </SettingRow>

                <SettingRow
                  title="Max Curse Cap"
                  description="Maximum upper limit for curse trigger probability"
                >
                  <SettingSlider
                    value={settings.maxCurseCap}
                    min={50}
                    max={100}
                    step={5}
                    onChange={(val) => updateSetting("maxCurseCap", val)}
                  />
                </SettingRow>
              </SettingSection>

              <SettingSection
                title="Reset Counters"
                icon="⚠️"
                description="Clear session counters if starting a new game night."
              >
                <SettingRow
                  title="Reset Curse Meter"
                  description="Set current curse meter back to 0%"
                >
                  <SettingButton
                    label="Reset Curse"
                    icon="💀"
                    variant="danger"
                    onClick={onResetCurse}
                  />
                </SettingRow>

                <SettingRow
                  title="Reset Total Spins"
                  description="Zero out the cumulative spin counter"
                >
                  <SettingButton
                    label="Reset Spins"
                    icon="🌀"
                    variant="danger"
                    onClick={onResetSpins}
                  />
                </SettingRow>
              </SettingSection>
            </>
          )}

          {/* TAB 3: AUDIO & FX */}
          {activeTab === "audio" && (
            <>
              <SettingSection
                title="Master Audio"
                icon="🔊"
                description="Control sound effects and haunted ambient audio."
              >
                <SettingRow
                  title="Enable Sound Effects"
                  description="Reel spinning, stop clicks, and dare audio"
                  badge={settings.masterSound ? "ON" : "MUTED"}
                >
                  <SettingToggle
                    checked={settings.masterSound}
                    onChange={(val) => updateSetting("masterSound", val)}
                  />
                </SettingRow>

                <SettingRow
                  title="SFX Volume"
                  description="Master volume level for all slot machine sounds"
                >
                  <SettingSlider
                    value={settings.soundVolume}
                    min={0}
                    max={100}
                    step={5}
                    disabled={!settings.masterSound}
                    onChange={(val) => updateSetting("soundVolume", val)}
                  />
                </SettingRow>

                <SettingRow
                  title="Test Audio Output"
                  description="Verify sound level with a reel stop click"
                >
                  <SettingButton
                    label="Play Test Sound"
                    icon="🔊"
                    variant="secondary"
                    disabled={!settings.masterSound}
                    onClick={handleTestSound}
                  />
                </SettingRow>
              </SettingSection>

              <SettingSection
                title="System Audio"
                icon="🔔"
                description="Desktop native alerts and haptics."
              >
                <SettingRow
                  title="System Beep on Curse"
                  description="Emit a native OS alert beep when cursed mode triggers"
                >
                  <SettingToggle
                    checked={settings.systemBeepOnCurse}
                    onChange={(val) => updateSetting("systemBeepOnCurse", val)}
                  />
                </SettingRow>
              </SettingSection>
            </>
          )}

          {/* TAB 4: DESKTOP & DISPLAY */}
          {activeTab === "desktop" && (
            <>
              <SettingSection
                title="Desktop Features"
                icon="🖥️"
                description="System level integrations for the standalone app."
              >
                <SettingRow
                  title="Native OS Notifications"
                  description="Show desktop popups on dare results and cursed triggers"
                  badge={isElectron ? "Desktop Ready" : "Browser"}
                >
                  <SettingToggle
                    checked={settings.desktopNotifications}
                    onChange={(val) => updateSetting("desktopNotifications", val)}
                  />
                </SettingRow>

                <SettingRow
                  title="Display Mode"
                  description="Switch to immersive fullscreen for game streams"
                >
                  <SettingButton
                    label="Toggle Fullscreen"
                    icon="🖥️"
                    variant="secondary"
                    onClick={toggleFullscreen}
                  />
                </SettingRow>
              </SettingSection>

              <SettingSection
                title="Atmospheric Visuals"
                icon="🎃"
                description="Customize ambient effects and vignettes."
              >
                <SettingRow
                  title="Ambient Mist & Vignette"
                  description="Background particle and lighting depth"
                >
                  <SettingSelect
                    value={settings.spookyAtmosphere}
                    options={[
                      { value: "off", label: "Off (Clean Dark)" },
                      { value: "low", label: "Subtle Glow" },
                      { value: "high", label: "Full Halloween Haze" },
                    ]}
                    onChange={(val) => updateSetting("spookyAtmosphere", val)}
                  />
                </SettingRow>
              </SettingSection>

              <SettingSection
                title="System Info"
                icon="ℹ️"
                description="Runtime specifications."
              >
                <SettingRow
                  title="App Environment"
                  description={`Platform: ${isElectron ? electron?.platform || "Windows" : "Web Browser"}`}
                  badge={isElectron ? "Electron Standalone" : "Web View"}
                >
                  <span style={{ fontSize: "0.8rem", color: "#8c889f", fontFamily: "var(--font-mono)" }}>
                    v2.0 Desktop
                  </span>
                </SettingRow>
              </SettingSection>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <SettingButton
            label="Reset All Settings"
            icon="🔄"
            variant="danger"
            onClick={resetSettings}
          />
          <SettingButton
            label="Save & Close"
            icon="✓"
            variant="primary"
            onClick={onClose}
          />
        </div>
      </div>
    </div>
  );
}
