import { useState, useMemo, useEffect, useRef } from "react";
import { useModifiers } from "@/context";
import { useNavigation } from "@/navigation";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import "./ModifiersScreen.css";

export default function ModifiersScreen() {
  const {
    modifiers,
    activeModifiers,
    categories,
    selectedModifierId,
    setSelectedModifierId,
    selectedModifier,
    toggleModifier,
    updateModifierSetting,
    resetModifierSettings,
    enableAll,
    disableAll,
    randomizeActive,
    playClickSound,
  } = useModifiers();

  const { goBack } = useNavigation();

  // Hover state: hovering over any icon tile instantly shows it in Panel 2
  const [hoveredModifierId, setHoveredModifierId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Preview test playback state
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [previewTicker, setPreviewTicker] = useState(0);
  const previewTimerRef = useRef(null);

  // The modifier currently displayed in Panel 2: hovered modifier takes priority, falls back to selected
  const displayedModifier = useMemo(() => {
    if (hoveredModifierId) {
      const found = modifiers.find((m) => m.id === hoveredModifierId);
      if (found) return found;
    }
    return selectedModifier || modifiers[0];
  }, [hoveredModifierId, selectedModifier, modifiers]);

  // Filter modifiers by category and search
  const filteredModifiers = useMemo(() => {
    return modifiers.filter((m) => {
      const matchesCategory =
        selectedCategory === "ALL" ||
        m.target === selectedCategory ||
        m.category === selectedCategory;

      const matchesSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [modifiers, selectedCategory, searchQuery]);

  // Trigger test preview FX on the media stage
  const handleTestPreview = () => {
    playClickSound();
    setIsPreviewActive(true);
    setPreviewTicker((t) => t + 1);

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setIsPreviewActive(false);
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const handleSettingChange = (settingId, value) => {
    if (!displayedModifier) return;
    updateModifierSetting(displayedModifier.id, settingId, value);
  };

  const getTargetIcon = (target) => {
    switch (target) {
      case "slot":
        return "game-icons:slot-machine";
      case "dare":
        return "game-icons:bloody-stash";
      case "game":
        return "game-icons:retro-controller";
      default:
        return "game-icons:dice-eight-faces-eight";
    }
  };

  return (
    <div className="modifiers-screen-v2">
      {/* Top Arcade Bar */}
      <header className="mod-top-header">
        <div className="mod-header-left">
          <button
            className="arcade-nav-btn"
            onClick={goBack}
            title="Return to Reels (Esc)"
          >
            <Icon icon="game-icons:anticlockwise-rotation" className="text-ui-accent mr-1 text-base inline-block" />
            <span>BACK TO REELS</span>
          </button>

          <div className="mod-header-title-box">
            <Icon icon="game-icons:magic-swirl" className="mod-header-sparkle-icon" />
            <h1 className="mod-header-title">SLOT & DARE MODIFIERS</h1>
          </div>
        </div>

        {/* Global Toolbar Action Controls */}
        <div className="mod-header-actions">
          <div className="mod-equipped-counter">
            <span className="equipped-pulse-led" />
            <span className="equipped-number">{activeModifiers.length}</span>
            <span className="equipped-label">ACTIVE / EQUIPPED</span>
          </div>

          <button
            className="arcade-tool-btn"
            onClick={randomizeActive}
            title="Randomize chaotic modifier synergies"
          >
            <Icon icon="game-icons:rolling-dice-cup" className="text-ui-accent text-sm mr-1" />
            <span>RANDOM BUILD</span>
          </button>

          <button
            className="arcade-tool-btn"
            onClick={enableAll}
            title="Equip all modifiers"
          >
            <Icon icon="game-icons:check-mark" className="text-ui-success text-sm mr-1" />
            <span>EQUIP ALL</span>
          </button>

          <button
            className="arcade-tool-btn"
            onClick={disableAll}
            title="Unequip all modifiers (Vanilla mode)"
          >
            <Icon icon="game-icons:cancel" className="text-ui-muted text-sm mr-1" />
            <span>UNEQUIP ALL</span>
          </button>
        </div>
      </header>

      {/* Main Equal-Width 50/50 Dual Panel Layout */}
      <div className="mod-dual-panels">
        {/* ========================================================== */}
        {/* PANEL 1: ICON GRID PANEL (EQUAL 50% HORIZONTAL WIDTH)       */}
        {/* ========================================================== */}
        <section className="mod-panel-grid-side" aria-label="Modifier Icon Grid">
          {/* Filter Bar */}
          <div className="mod-grid-toolbar">
            <div className="mod-category-tab-bar">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count =
                  cat.id === "ALL"
                    ? modifiers.length
                    : modifiers.filter(
                      (m) => m.target === cat.id || m.category === cat.id
                    ).length;

                return (
                  <button
                    key={cat.id}
                    className={`mod-tab-btn ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      playClickSound();
                      setSelectedCategory(cat.id);
                    }}
                  >
                    <Icon icon={cat.icon} className="mod-tab-icon" />
                    <span>{cat.label}</span>
                    <span className="mod-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="mod-search-bar">
              <Icon icon="game-icons:magnifying-glass" className="text-ui-accent text-sm" />
              <input
                type="text"
                placeholder="Search modifiers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mod-search-field"
              />
              {searchQuery && (
                <button
                  className="mod-search-clear-btn"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Game-like Icon Grid */}
          <div className="mod-icon-grid-scroll">
            <div className="mod-icon-tiles-container">
              {filteredModifiers.map((mod) => {
                const isSelected = selectedModifierId === mod.id;
                const isHovered = hoveredModifierId === mod.id;
                const isEquipped = mod.enabled;

                return (
                  <div
                    key={mod.id}
                    className={`mod-icon-tile ${isEquipped ? "is-equipped" : ""} ${isSelected ? "is-pinned" : ""
                      } ${isHovered ? "is-hovered" : ""}`}
                    style={{ "--tile-color": mod.color }}
                    onMouseEnter={() => setHoveredModifierId(mod.id)}
                    onMouseLeave={() => setHoveredModifierId(null)}
                    onClick={() => {
                      playClickSound();
                      setSelectedModifierId(mod.id);
                      toggleModifier(mod.id);
                    }}
                    title={`${mod.name} (${mod.targetLabel}) - Click to ${isEquipped ? "Unequip" : "Equip"
                      }`}
                  >
                    {/* Corner Target Badge (Slot / Dare / Game) */}
                    <div className="tile-target-badge" title={mod.targetLabel}>
                      <Icon icon={getTargetIcon(mod.target)} />
                    </div>





                    {/* Main Chunky Arcade Icon */}
                    <div className="tile-icon-frame">
                      <Icon icon={mod.icon} className="tile-center-icon" />
                      {isEquipped && <div className="tile-neon-flare" />}
                    </div>


                    {/* Hover Glow Rim */}
                    <div className="tile-border-glow" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Footer Hint */}
          <div className="mod-grid-footer-hint">
            <Icon icon="game-icons:help" className="text-ui-accent mr-1" />
            <span>Hover icon to inspect details & options • Click tile to toggle equip</span>
          </div>
        </section>

        {/* ========================================================== */}
        {/* PANEL 2: PREVIEW & EXPLANATION PANEL (EQUAL 50% HORIZONTAL) */}
        {/* ========================================================== */}
        <section className="mod-panel-detail-side" aria-label="Modifier Preview & Settings">
          {displayedModifier ? (
            <div
              className="mod-detail-wrapper"
              style={{ "--mod-accent": displayedModifier.color }}
            >
              {/* Media Preview Window (Image / Video simulation) */}
              <div className="mod-media-hero-stage">
                <div className="media-stage-frame">
                  {/* Visual Artwork Image */}
                  {displayedModifier.image ? (
                    <img
                      src={displayedModifier.image}
                      alt={displayedModifier.name}
                      onError={(e) => {
                        e.target.src = "/assets/images/placeholder.svg";
                      }}
                      className={`media-hero-image ${isPreviewActive ? "is-fx-active" : ""
                        }`}
                    />
                  ) : (
                    <div className="media-fallback-bg" />
                  )}

                  {/* Dynamic Animated Shader / Particle Overlay */}
                  <div className={`media-shader-overlay ${isPreviewActive ? "animate-pulse" : ""}`}>
                    {/* VHS Scanlines */}
                    <div className="media-scanlines" />

                    {/* Animated FX on Test Click */}
                    {isPreviewActive && (
                      <div className="media-live-particles">
                        <div className="fx-lightning-flash" />
                        <div className="fx-scan-beam" />
                      </div>
                    )}
                  </div>

                  {/* Header Badge Strip over Media */}
                  <div className="media-top-tags">
                    <span className="media-badge media-target-badge">
                      <Icon icon={getTargetIcon(displayedModifier.target)} className="mr-1" />
                      {displayedModifier.targetLabel || displayedModifier.category}
                    </span>
                    <span
                      className={`media-badge media-rarity-badge rarity-${displayedModifier.rarity
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {displayedModifier.rarity} TIER
                    </span>
                  </div>

                  {/* Test Preview Action Button Floating on Media */}
                  <div className="media-bottom-controls">
                    <button
                      className={`media-test-btn ${isPreviewActive ? "is-previewing" : ""}`}
                      onClick={handleTestPreview}
                      title="Trigger dynamic preview animation"
                    >
                      <Icon
                        icon={isPreviewActive ? "game-icons:lightning-trio" : "game-icons:play-button"}
                        className="text-base mr-1.5"
                      />
                      <span>{isPreviewActive ? "PREVIEW ENGAGED" : "TEST MODIFIER FX"}</span>
                    </button>

                    <div className="media-status-pill">
                      <span className={`status-led ${displayedModifier.enabled ? "is-active" : ""}`} />
                      <span>{displayedModifier.enabled ? "ACTIVE IN GAME" : "UNMOUNTED"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Master Equip Bar */}
              <div className="mod-action-banner">
                <div className="mod-banner-left">
                  <div
                    className="mod-banner-avatar"
                    style={{ borderColor: displayedModifier.color }}
                  >
                    <Icon
                      icon={displayedModifier.icon}
                      style={{ color: displayedModifier.color }}
                      className="text-3xl"
                    />
                  </div>

                  <div className="mod-banner-info">
                    <h2 className="mod-banner-name">{displayedModifier.name}</h2>
                    <p className="mod-banner-tagline">{displayedModifier.tagline}</p>
                  </div>
                </div>

                {/* Big Tactile Equip Switch Button */}
                <button
                  className={`mod-equip-trigger-btn ${displayedModifier.enabled ? "is-equipped" : ""
                    }`}
                  onClick={() => toggleModifier(displayedModifier.id)}
                  title={displayedModifier.enabled ? "Click to Unequip" : "Click to Equip"}
                >
                  <Icon
                    icon={displayedModifier.enabled ? "game-icons:check-mark" : "game-icons:power-button"}
                    className="text-lg mr-1.5"
                  />
                  <span>{displayedModifier.enabled ? "EQUIPPED" : "EQUIP MODIFIER"}</span>
                </button>
              </div>

              {/* Scrollable Details Section: Explanation & Options */}
              <div className="mod-body-scroll-area">
                {/* Description & Mechanics */}
                <div className="mod-info-card">
                  <div className="mod-card-subheading">
                    <Icon icon="game-icons:scroll-quill" className="text-ui-accent mr-1.5 text-base" />
                    <span>MUTATION MECHANICS</span>
                  </div>
                  <p className="mod-core-description">{displayedModifier.description}</p>

                  {/* Bullet Points */}
                  {displayedModifier.howItWorks && (
                    <div className="mod-bullets-box">
                      <h4 className="mod-bullets-title">WHAT HAPPENS WHEN ACTIVE:</h4>
                      <ul className="mod-bullets-list">
                        {displayedModifier.howItWorks.map((item, idx) => (
                          <li key={idx} className="mod-bullet-entry">
                            <Icon icon="game-icons:check-mark" className="bullet-tick text-ui-success" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Lore */}
                  {displayedModifier.lore && (
                    <div className="mod-lore-box">
                      <Icon icon="game-icons:evil-book" className="mod-lore-quote-icon" />
                      <p className="mod-lore-quote-text">"{displayedModifier.lore}"</p>
                    </div>
                  )}
                </div>

                {/* Settings & Configuration Options (if it has them) */}
                <div className="mod-info-card mod-options-card">
                  <div className="mod-card-subheading-row">
                    <div className="mod-card-subheading">
                      <Icon icon="game-icons:gears" className="text-ui-accent mr-1.5 text-base" />
                      <span>MODIFIER OPTIONS & CALIBRATION</span>
                    </div>

                    <button
                      className="mod-reset-opts-btn"
                      onClick={() => resetModifierSettings(displayedModifier.id)}
                      title="Reset settings of this modifier"
                    >
                      <Icon icon="game-icons:clockwise-rotation" className="text-xs mr-1" />
                      Reset Options
                    </button>
                  </div>

                  {displayedModifier.settingsSchema && displayedModifier.settingsSchema.length > 0 ? (
                    <div className="mod-options-stack">
                      {displayedModifier.settingsSchema.map((field) => {
                        const val =
                          displayedModifier.settings?.[field.id] ?? field.defaultValue;

                        return (
                          <div key={field.id} className="mod-option-row">
                            <div className="option-label-line">
                              <label className="option-name">{field.label}</label>
                              {field.type === "range" && (
                                <span className="option-value-tag">
                                  {val}
                                  {field.unit || ""}
                                </span>
                              )}
                            </div>

                            {/* Range Slider */}
                            {field.type === "range" && (
                              <div className="option-range-box">
                                <input
                                  type="range"
                                  min={field.min}
                                  max={field.max}
                                  step={field.step}
                                  value={val}
                                  onChange={(e) =>
                                    handleSettingChange(field.id, parseFloat(e.target.value))
                                  }
                                  className="option-range-slider"
                                  style={{
                                    "--range-fill": `${((val - field.min) / (field.max - field.min)) * 100
                                      }%`,
                                  }}
                                />
                                <div className="option-range-ticks">
                                  <span>
                                    {field.min}
                                    {field.unit || ""}
                                  </span>
                                  <span>
                                    {field.max}
                                    {field.unit || ""}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Toggle Switch */}
                            {field.type === "switch" && (
                              <div className="option-switch-box">
                                <button
                                  type="button"
                                  className={`arcade-switch-toggle ${val ? "is-on" : ""}`}
                                  onClick={() => handleSettingChange(field.id, !val)}
                                >
                                  <span className="switch-peg" />
                                </button>
                                <span className="switch-status-label">
                                  {val ? "ENGAGED" : "DISABLED"}
                                </span>
                              </div>
                            )}

                            {/* Dropdown Select */}
                            {field.type === "select" && (
                              <div className="option-select-box">
                                <select
                                  value={val}
                                  onChange={(e) =>
                                    handleSettingChange(field.id, e.target.value)
                                  }
                                  className="arcade-select-input"
                                >
                                  {field.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <Icon icon="game-icons:expand" className="select-dropdown-icon" />
                              </div>
                            )}

                            <p className="option-subtext">{field.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mod-no-options-banner">
                      <Icon icon="game-icons:star-swirl" className="text-3xl text-ui-accent mb-1" />
                      <p>Instant plug-and-play modifier. No extra configuration required.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mod-empty-detail">
              <Icon icon="game-icons:crystal-wand" className="text-6xl text-ui-muted mb-3" />
              <h3>Hover over an icon to inspect</h3>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
