import { useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { useGame } from "../context/GameContext";
import { useNavigation } from "../navigation/NavigationContext";
import { useElectron } from "../hooks/useElectron";
import { Howl } from "howler";
import {
  SettingSection,
  SettingRow,
  SettingToggle,
  SettingSlider,
  SettingSelect,
  SettingButton,
} from "../components/settings/SettingControls";
import {
  BUILT_IN_PRESETS,
  getCustomPresets,
  addCustomPreset,
  deleteCustomPreset,
} from "../services/presetService";
import {
  COLOR_PALETTES,
  LOGO_TEXTURE_OPTIONS,
  getLogoTextureUrl,
} from "../services/webglShader";
import "../components/settings/SettingsModal.css";
import "./SettingsScreen.css";

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState("theme");
  const { settings, updateSetting, applySettings, resetSettings } = useSettings();
  const [customPresets, setCustomPresets] = useState(() => getCustomPresets());
  const [selectedPresetId, setSelectedPresetId] = useState(BUILT_IN_PRESETS[0].id);
  const [newPresetName, setNewPresetName] = useState("");
  const [presetNotice, setPresetNotice] = useState(null);
  const {
    players,
    setPlayers,
    gamesByCategory,
    setGamesByCategory,
    resetSpins,
    resetCurse,
  } = useGame();
  const { goBack } = useNavigation();

  const {
    isElectron,
    importJsonFile,
    exportJsonFile,
    openUserDataFolder,
    toggleFullscreen,
    showNotification,
    electron,
  } = useElectron();

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

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];
  const activePreset =
    allPresets.find((p) => p.id === selectedPresetId) || allPresets[0];

  const showPresetNotice = (msg) => {
    setPresetNotice(msg);
    setTimeout(() => {
      setPresetNotice(null);
    }, 3500);
  };

  const handleLoadPreset = () => {
    if (!activePreset || !activePreset.settings) return;
    applySettings(activePreset.settings);
    showPresetNotice(`✓ Applied "${activePreset.name}" preset!`);
  };

  const handleSaveCurrentAsPreset = (e) => {
    e?.preventDefault();
    const name = newPresetName.trim();
    if (!name) {
      alert("Please enter a name for the new preset.");
      return;
    }

    const currentBgSettings = {
      reactiveBackground: settings.reactiveBackground !== false,
      backgroundPalette: settings.backgroundPalette || "jack_o_flame",
      backgroundPattern: settings.backgroundPattern || "plasma",
      backgroundPixelSize: settings.backgroundPixelSize || 4,
      backgroundDitherStrength: settings.backgroundDitherStrength ?? 0.25,
      backgroundReactivity: settings.backgroundReactivity ?? 1.0,
      backgroundSpeed: settings.backgroundSpeed ?? 1.0,
      backgroundResolutionScale: settings.backgroundResolutionScale || 2,
      enableTiledLogo: settings.enableTiledLogo !== false,
      logoTexture: settings.logoTexture || "dandare",
      logoCustomUrl: settings.logoCustomUrl || "",
      logoDensity: settings.logoDensity || 4,
      logoBaseOpacity: settings.logoBaseOpacity ?? 0.55,
      lowsLogoOpacityBoost: settings.lowsLogoOpacityBoost ?? 0.45,
      enableLogoHeadShake: settings.enableLogoHeadShake !== false,
      logoHeadShakeAngle: settings.logoHeadShakeAngle ?? 0.35,
      logoHeadShakeSpeed: settings.logoHeadShakeSpeed ?? 3.2,
      lowsHeadShakeBrake: settings.lowsHeadShakeBrake ?? 1.0,
      bassShakeStrength: settings.bassShakeStrength ?? 0.6,
      midsLogoScale: settings.midsLogoScale ?? 0.7,
      highsMovementSpeed: settings.highsMovementSpeed ?? 0.8,
      fftSmoothing: settings.fftSmoothing ?? 0.35,
      audioGain: settings.audioGain ?? 1.3,
      lowsSmoothing: settings.lowsSmoothing ?? 0.15,
      midsSmoothing: settings.midsSmoothing ?? 0.2,
      highsSmoothing: settings.highsSmoothing ?? 0.15,
      lowsBaseThreshold: settings.lowsBaseThreshold ?? 0.15,
      midsBaseScale: settings.midsBaseScale ?? 0.25,
      highsBaseDrift: settings.highsBaseDrift ?? 0.15,
    };

    const newPreset = addCustomPreset(name, currentBgSettings);
    const updatedCustom = getCustomPresets();
    setCustomPresets(updatedCustom);
    setSelectedPresetId(newPreset.id);
    setNewPresetName("");
    showPresetNotice(`✓ Saved custom preset "${name}"!`);
  };

  const handleDeleteCustomPreset = () => {
    if (!activePreset?.isCustom) return;
    if (window.confirm(`Delete custom preset "${activePreset.name}"?`)) {
      const updated = deleteCustomPreset(activePreset.id);
      setCustomPresets(updated);
      setSelectedPresetId(BUILT_IN_PRESETS[0].id);
      showPresetNotice(`🗑️ Deleted preset "${activePreset.name}".`);
    }
  };

  return (
    <div className="settings-screen">
      {/* Header with Back Button */}
      <div className="settings-screen-header">
        <button className="screen-back-btn" onClick={goBack} title="Return to Game (Esc)">
          <span>←</span> Back to Game
        </button>

        <div className="settings-title-wrap">
          <span className="settings-title-icon">⚙️</span>
          <h2 className="settings-title">SETTINGS & CONFIGURATION</h2>
        </div>

        <div style={{ width: "90px" }} />
      </div>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <button
          className={`settings-tab-btn ${activeTab === "theme" || activeTab === "background" ? "active" : ""}`}
          onClick={() => setActiveTab("theme")}
        >
          <span>🎨</span> Theme & Personalization
        </button>
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
          <span>🖥️</span> Desktop & System
        </button>
      </div>

      {/* Body Content */}
      <div className="settings-body">
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
                  onClick={resetCurse}
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
                  onClick={resetSpins}
                />
              </SettingRow>
            </SettingSection>
          </>
        )}

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

        {(activeTab === "theme" || activeTab === "background") && (
          <>
            {/* Setting Presets Section */}
            <SettingSection
              title="Theme & Personalization Presets"
              icon="🎛️"
              description="Instantly switch between visual themes, custom logos, and audio reactivity profiles, or save your own."
            >
              <div className="preset-hero-box">
                {presetNotice && (
                  <div className="preset-notice-badge">
                    <span>{presetNotice}</span>
                  </div>
                )}

                <SettingRow
                  title="Select Preset"
                  description="Choose from built-in curated profiles or your custom saved presets"
                  badge={activePreset?.isCustom ? "Custom Preset" : "Built-in"}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <SettingSelect
                      value={selectedPresetId}
                      options={allPresets.map((p) => ({
                        value: p.id,
                        label: (p.isCustom ? "⭐ " : "") + p.name,
                      }))}
                      onChange={(val) => setSelectedPresetId(val)}
                    />
                    <SettingButton
                      label="Load Preset"
                      icon="⚡"
                      variant="primary"
                      onClick={handleLoadPreset}
                    />
                    {activePreset?.isCustom && (
                      <SettingButton
                        label="Delete"
                        icon="🗑️"
                        variant="danger"
                        onClick={handleDeleteCustomPreset}
                      />
                    )}
                  </div>
                </SettingRow>

                <div className="preset-info-banner">
                  <div className="preset-info-text">
                    <span className="preset-info-title">{activePreset?.name}</span>
                    <span className="preset-info-desc">{activePreset?.description}</span>
                  </div>
                  <div className="preset-chips-wrap">
                    <span className="preset-chip">
                      🎨 {activePreset?.settings?.backgroundPalette || "jack_o_flame"}
                    </span>
                    <span className="preset-chip">
                      🌀 {activePreset?.settings?.backgroundPattern || "plasma"}
                    </span>
                    <span className="preset-chip">
                      🎭 {activePreset?.settings?.logoTexture || "dandare"}
                    </span>
                    <span className="preset-chip">
                      ⚡ {activePreset?.settings?.fftSmoothing === 0 ? "0-Delay" : `${Math.round((activePreset?.settings?.fftSmoothing ?? 0.35) * 100)}% FFT`}
                    </span>
                  </div>
                </div>

                <SettingRow
                  title="Save Current as New Preset"
                  description="Stores your current palette, pattern, logo texture, and 3-band calibrations"
                >
                  <form onSubmit={handleSaveCurrentAsPreset} className="preset-input-wrap">
                    <input
                      type="text"
                      className="preset-text-input"
                      placeholder="Enter preset name (e.g. Neon Synth Vibe)..."
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                    />
                    <SettingButton
                      label="Save Preset"
                      icon="💾"
                      variant="secondary"
                      onClick={handleSaveCurrentAsPreset}
                    />
                  </form>
                </SettingRow>
              </div>
            </SettingSection>

            {/* Background Shader & Palette */}
            <SettingSection
              title="Sound Reactive Shader Background"
              icon="🌊"
              description="Real-time WebGL Bayer-dithered procedural background with audio frequency reaction."
            >
              <SettingRow
                title="Enable Sound Reactive Background"
                description="Pipes audio frequencies into the GLSL shader in real time"
                badge={settings.reactiveBackground !== false ? "Active" : "Disabled"}
              >
                <SettingToggle
                  checked={settings.reactiveBackground !== false}
                  onChange={(val) => updateSetting("reactiveBackground", val)}
                />
              </SettingRow>

              <SettingRow
                title="Color Palette"
                description="4-color quantized retro palette with perceptual luminance weighting"
              >
                <div>
                  <SettingSelect
                    value={settings.backgroundPalette || "jack_o_flame"}
                    options={[
                      { value: "jack_o_flame", label: "🎃 Jack-o-Flame (Pumpkin Fire)" },
                      { value: "lospec_retro", label: "💾 Lospec Retro (Cyberpunk Hot Pink)" },
                      { value: "cursed_blood", label: "💀 Demonic Crimson (Cursed)" },
                      { value: "toxic_acid", label: "🧪 Acid Hazard (Toxic Slime)" },
                      { value: "gameboy_dmg", label: "🕹️ GameBoy Classic (1989 DMG)" },
                      { value: "midnight_synth", label: "🌌 Midnight Synthwave (Outrun)" },
                      { value: "gothic_crypt", label: "🦇 Castlevania Crypt (Haunted Fog)" },
                      { value: "noir_monochrome", label: "📺 1-Bit Noir (Obra Dinn)" },
                    ]}
                    disabled={settings.reactiveBackground === false}
                    onChange={(val) => updateSetting("backgroundPalette", val)}
                  />
                  {/* Visual 4-Color Palette Swatch Display */}
                  <div className="palette-swatches-row">
                    <span style={{ fontSize: "0.74rem", color: "#8c889f", fontWeight: "600" }}>
                      Active Tones:
                    </span>
                    {(
                      COLOR_PALETTES[settings.backgroundPalette] ||
                      COLOR_PALETTES.jack_o_flame
                    )?.colors?.map((c, i) => (
                      <div
                        key={i}
                        className="palette-swatch-chip"
                        style={{
                          backgroundColor: `rgb(${Math.round(c[0] * 255)}, ${Math.round(
                            c[1] * 255
                          )}, ${Math.round(c[2] * 255)})`,
                        }}
                        title={`Palette Tone ${i + 1}: rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`}
                      />
                    ))}
                  </div>
                </div>
              </SettingRow>

              <SettingRow
                title="Motion Pattern"
                description="Procedural generative wave, swirl, and perspective algorithms"
              >
                <SettingSelect
                  value={settings.backgroundPattern || "plasma"}
                  options={[
                    { value: "balatro", label: "🃏 Balatro Hypnotic Card Swirl" },
                    { value: "plasma", label: "🌀 Warped Plasma & Organic Waves" },
                    { value: "vortex", label: "🌪️ Hypnotic Vortex Chasm" },
                    { value: "waves", label: "〰️ Soundwave Oscilloscope Ribbons" },
                    { value: "grid", label: "🌐 Retro Perspective Cyber Grid" },
                  ]}
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("backgroundPattern", val)}
                />
              </SettingRow>

              <SettingRow
                title="Pixelation Block Size"
                description="Virtual pixel granularity (lower = sharper, higher = chunkier)"
              >
                <SettingSlider
                  value={settings.backgroundPixelSize || 4}
                  min={1}
                  max={12}
                  step={1}
                  unit="px"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("backgroundPixelSize", val)}
                />
              </SettingRow>

              <SettingRow
                title="Bayer 4x4 Dither Strength"
                description="Cross-hatch ordered dither dot intensity across color steps"
              >
                <SettingSlider
                  value={Math.round((settings.backgroundDitherStrength ?? 0.25) * 100)}
                  min={0}
                  max={50}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("backgroundDitherStrength", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Audio Reactivity Intensity"
                description="Sensitivity of bass swell and treble pulses"
              >
                <SettingSlider
                  value={Math.round((settings.backgroundReactivity ?? 1.0) * 10)}
                  min={0}
                  max={20}
                  step={1}
                  unit="x"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("backgroundReactivity", val / 10)}
                />
              </SettingRow>

              <SettingRow
                title="Animation Flow Speed"
                description="Base rate of generative motion and rotation"
              >
                <SettingSlider
                  value={Math.round((settings.backgroundSpeed ?? 1.0) * 10)}
                  min={2}
                  max={25}
                  step={1}
                  unit="x"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("backgroundSpeed", val / 10)}
                />
              </SettingRow>

              <SettingRow
                title="GPU Resolution Scale"
                description="Internal render buffer resolution (upscaled via pixelated filter)"
              >
                <SettingSelect
                  value={String(settings.backgroundResolutionScale || 2)}
                  options={[
                    { value: "1", label: "1x Full Native (Ultra Sharp)" },
                    { value: "2", label: "2x Half Resolution (Recommended - Balanced & Fast)" },
                    { value: "4", label: "4x Quarter Resolution (Retro Lo-Fi & Lightweight)" },
                  ]}
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("backgroundResolutionScale", Number(val))}
                />
              </SettingRow>
            </SettingSection>

            {/* 3-Band Audio Reactivity & Tiled Logo Layers */}
            <SettingSection
              title="Tiled Logo Layer, Opacity & Head Shake"
              icon="🎭"
              description="Customize the tiled logo sprite, low-frequency opacity surges, and side-to-side head shaking."
            >
              <SettingRow
                title="Tiled Logo Layer"
                description="Renders repeating logo tiles underneath pixelation and dithering"
                badge={settings.enableTiledLogo !== false ? "Active" : "Disabled"}
              >
                <SettingToggle
                  checked={settings.enableTiledLogo !== false}
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("enableTiledLogo", val)}
                />
              </SettingRow>

              <SettingRow
                title="Logo Texture"
                description="Choose the sprite displayed on the animated wallpaper"
              >
                <div>
                  <SettingSelect
                    value={settings.logoTexture || "dandare"}
                    options={LOGO_TEXTURE_OPTIONS}
                    disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false}
                    onChange={(val) => updateSetting("logoTexture", val)}
                  />

                  {/* Thumbnail and Custom Upload Row */}
                  <div className="logo-texture-preview-row">
                    <img
                      src={getLogoTextureUrl(settings.logoTexture, settings.logoCustomUrl)}
                      alt="Logo preview"
                      className="logo-texture-thumb"
                      onError={(e) => {
                        e.currentTarget.src = "/assets/images/dandare.png";
                      }}
                    />
                    {settings.logoTexture === "custom" && (
                      <div style={{ display: "flex", gap: "8px", flex: 1, alignItems: "center" }}>
                        <label
                          className="screen-back-btn"
                          style={{ cursor: "pointer", fontSize: "0.75rem", padding: "6px 12px" }}
                        >
                          📁 Choose File
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  updateSetting("logoCustomUrl", evt.target.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <input
                          type="text"
                          className="preset-text-input"
                          style={{ fontSize: "0.76rem", padding: "6px 10px" }}
                          placeholder="Or paste image URL / Data URI..."
                          value={settings.logoCustomUrl || ""}
                          onChange={(e) => updateSetting("logoCustomUrl", e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </SettingRow>

              <SettingRow
                title="Logo Grid Density"
                description="Number of repeating logo tiles across the screen"
              >
                <SettingSlider
                  value={settings.logoDensity || 4}
                  min={2}
                  max={8}
                  step={1}
                  unit=" tiles"
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false}
                  onChange={(val) => updateSetting("logoDensity", val)}
                />
              </SettingRow>

              <SettingRow
                title="Lows: Resting Logo Opacity"
                description="Base visibility of the logo tiles during silence and gentle sound"
              >
                <SettingSlider
                  value={Math.round((settings.logoBaseOpacity ?? 0.55) * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false}
                  onChange={(val) => updateSetting("logoBaseOpacity", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Lows: Logo Opacity Surge on Bass"
                description="How much heavy low frequencies (kicks & sub-bass) brighten and surge the logo opacity"
              >
                <SettingSlider
                  value={Math.round((settings.lowsLogoOpacityBoost ?? 0.45) * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false}
                  onChange={(val) => updateSetting("lowsLogoOpacityBoost", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Logo Head Shake Motion"
                description="Rotates the logo side to side; low frequencies slow or stop the movement"
                badge={settings.enableLogoHeadShake !== false ? "Active" : "Disabled"}
              >
                <SettingToggle
                  checked={settings.enableLogoHeadShake !== false}
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false}
                  onChange={(val) => updateSetting("enableLogoHeadShake", val)}
                />
              </SettingRow>

              <SettingRow
                title="Head Shake Angle (Range)"
                description="Maximum side-to-side rotation range for the head shake sway"
              >
                <SettingSlider
                  value={Math.round(((settings.logoHeadShakeAngle ?? 0.35) * 180) / Math.PI)}
                  min={5}
                  max={45}
                  step={1}
                  unit="°"
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false || settings.enableLogoHeadShake === false}
                  onChange={(val) => updateSetting("logoHeadShakeAngle", (val * Math.PI) / 180)}
                />
              </SettingRow>

              <SettingRow
                title="Head Shake Speed"
                description="Natural side-to-side oscillation frequency"
              >
                <SettingSlider
                  value={Math.round((settings.logoHeadShakeSpeed ?? 3.2) * 10)}
                  min={10}
                  max={60}
                  step={2}
                  unit="x"
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false || settings.enableLogoHeadShake === false}
                  onChange={(val) => updateSetting("logoHeadShakeSpeed", val / 10)}
                />
              </SettingRow>

              <SettingRow
                title="Lows: Head Shake Brake / Freeze"
                description="Controls how strongly low frequencies (bass) slow down and freeze the head shake rotation"
                badge={Math.round((settings.lowsHeadShakeBrake ?? 1.0) * 100) > 80 ? "Heavy Freeze" : "Gentle Slowdown"}
              >
                <SettingSlider
                  value={Math.round((settings.lowsHeadShakeBrake ?? 1.0) * 100)}
                  min={0}
                  max={150}
                  step={10}
                  unit="%"
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false || settings.enableLogoHeadShake === false}
                  onChange={(val) => updateSetting("lowsHeadShakeBrake", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Lows: Bass Screen Shake (0 - 100 Hz)"
                description="Intensity of viewport camera shake on heavy hitting sub-basslines & kicks"
              >
                <SettingSlider
                  value={Math.round((settings.bassShakeStrength ?? 0.6) * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("bassShakeStrength", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Mids: Logo Swell & Diagonal Drift"
                description="How much the logo expands in size and accelerates diagonally on mid-frequency peaks"
              >
                <SettingSlider
                  value={Math.round((settings.midsLogoScale ?? 0.7) * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false}
                  onChange={(val) => updateSetting("midsLogoScale", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Highs: Shader Movement Speed"
                description="Rate at which high frequencies (hi-hats, cymbals, transients) accelerate procedural wave motion"
              >
                <SettingSlider
                  value={Math.round((settings.highsMovementSpeed ?? 0.8) * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("highsMovementSpeed", val / 100)}
                />
              </SettingRow>
            </SettingSection>

            {/* Latency & Ultra-Responsiveness Calibration */}
            <SettingSection
              title="Latency & Smoothing Calibration"
              icon="⚡"
              description="Fine-tune time constants and base offsets for zero-delay instant reactivity."
            >
              <SettingRow
                title="Web Audio Hardware Smoothing"
                description="Internal FFT time smoothing constant (0.00 = pure 0-delay instant data)"
                badge={settings.fftSmoothing === 0 ? "⚡ 0-Delay" : `${Math.round((settings.fftSmoothing ?? 0.35) * 100)}%`}
              >
                <SettingSlider
                  value={Math.round((settings.fftSmoothing ?? 0.35) * 100)}
                  min={0}
                  max={90}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("fftSmoothing", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Audio Pre-Amp Gain"
                description="Input sensitivity multiplier for quiet music streams"
              >
                <SettingSlider
                  value={Math.round((settings.audioGain ?? 1.3) * 10)}
                  min={5}
                  max={30}
                  step={1}
                  unit="x"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("audioGain", val / 10)}
                />
              </SettingRow>

              <SettingRow
                title="Lows Smoothing (Bass Shake Decay)"
                description="0% = Instant 0-delay shake cutoff; Higher = longer decaying bass rumble"
              >
                <SettingSlider
                  value={Math.round((settings.lowsSmoothing ?? 0.15) * 100)}
                  min={0}
                  max={80}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("lowsSmoothing", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Lows Base Threshold (Bass Cutoff)"
                description="Minimum bass energy required before shake activates (0% = responds to all bass)"
              >
                <SettingSlider
                  value={Math.round((settings.lowsBaseThreshold ?? 0.15) * 100)}
                  min={0}
                  max={50}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("lowsBaseThreshold", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Mids Smoothing (Logo Bounce Decay)"
                description="0% = Instant 0-delay logo snap; Higher = smooth floating rebound"
              >
                <SettingSlider
                  value={Math.round((settings.midsSmoothing ?? 0.20) * 100)}
                  min={0}
                  max={80}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false}
                  onChange={(val) => updateSetting("midsSmoothing", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Mids Base Logo Size"
                description="Resting size of the tiled Dandare logo during silence"
              >
                <SettingSlider
                  value={Math.round((settings.midsBaseScale ?? 0.25) * 100)}
                  min={5}
                  max={50}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false || settings.enableTiledLogo === false}
                  onChange={(val) => updateSetting("midsBaseScale", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Highs Smoothing (Motion Momentum)"
                description="0% = Instant speed surges; Higher = rolling momentum carryover"
              >
                <SettingSlider
                  value={Math.round((settings.highsSmoothing ?? 0.15) * 100)}
                  min={0}
                  max={80}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("highsSmoothing", val / 100)}
                />
              </SettingRow>

              <SettingRow
                title="Highs Base Idle Drift"
                description="Resting shader motion speed when no highs are playing (0% = freezes completely on silence)"
              >
                <SettingSlider
                  value={Math.round((settings.highsBaseDrift ?? 0.15) * 100)}
                  min={0}
                  max={50}
                  step={5}
                  unit="%"
                  disabled={settings.reactiveBackground === false}
                  onChange={(val) => updateSetting("highsBaseDrift", val / 100)}
                />
              </SettingRow>
            </SettingSection>
          </>
        )}

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
          label="Done"
          icon="✓"
          variant="primary"
          onClick={goBack}
        />
      </div>
    </div>
  );
}
