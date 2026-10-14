import { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import { useNavigation } from "../navigation/NavigationContext";
import { useElectron } from "../hooks/useElectron";
import { Howl } from "howler";
import "./CollectionScreen.css";

export default function CollectionScreen() {
  const {
    gamesByCategory = {},
    addCategory,
    deleteCategory,
    renameCategory,
    addGameToCategory,
    updateGameInCategory,
    deleteGameFromCategory,
    resetGamesToDefault,
  } = useGame();

  const { goBack } = useNavigation();
  const {
    isElectron,
    selectExecutable,
    launchGame,
    openGameFolder,
    showNotification,
    beep,
    importJsonFile,
    exportJsonFile,
  } = useElectron();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [onlyWithExecutable, setOnlyWithExecutable] = useState(false);

  // Status & Feedback
  const [launchingKey, setLaunchingKey] = useState(null);
  const [notice, setNotice] = useState(null);

  // Modal States
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [editingGameInfo, setEditingGameInfo] = useState(null); // { categoryName, index, game }
  const [isCustomCategoryInput, setIsCustomCategoryInput] = useState(false);

  // Game Form State
  const [gameFormData, setGameFormData] = useState({
    categoryName: "",
    name: "",
    executablePath: "",
    launchArgs: "",
    image: "",
    sound: "",
    text: "",
  });

  // Category Modals
  const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [renameCatTarget, setRenameCatTarget] = useState(null);
  const [renameCatInput, setRenameCatInput] = useState("");

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null); // { type: 'cat' | 'game', categoryName, index, name }
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Computed Categories and Stats
  const categoriesList = useMemo(() => Object.keys(gamesByCategory || {}), [gamesByCategory]);

  const totalGamesCount = useMemo(() => {
    return Object.values(gamesByCategory || {}).reduce((acc, list) => acc + (list?.length || 0), 0);
  }, [gamesByCategory]);

  const linkedGamesCount = useMemo(() => {
    return Object.values(gamesByCategory || {}).reduce((acc, list) => {
      const count = (list || []).filter((g) => Boolean(g.executablePath && g.executablePath.trim())).length;
      return acc + count;
    }, 0);
  }, [gamesByCategory]);

  // Filtered games structure: returns array of { categoryName, games: [{ game, originalIndex }] }
  const filteredCategoryGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return categoriesList
      .filter((cat) => {
        if (selectedCategoryFilter !== "ALL" && cat !== selectedCategoryFilter) return false;
        return true;
      })
      .map((cat) => {
        const rawGames = gamesByCategory[cat] || [];
        const matched = rawGames
          .map((game, originalIndex) => ({ game, originalIndex }))
          .filter(({ game }) => {
            if (onlyWithExecutable && (!game.executablePath || !game.executablePath.trim())) {
              return false;
            }
            if (!q) return true;
            return (
              game.name?.toLowerCase().includes(q) ||
              cat.toLowerCase().includes(q) ||
              game.executablePath?.toLowerCase().includes(q) ||
              game.text?.toLowerCase().includes(q)
            );
          });

        return {
          categoryName: cat,
          games: matched,
          totalInCategory: rawGames.length,
        };
      })
      .filter((group) => {
        // If searching or filtering by exe, hide empty category groups
        if (searchQuery || onlyWithExecutable) {
          return group.games.length > 0;
        }
        return true;
      });
  }, [categoriesList, gamesByCategory, selectedCategoryFilter, searchQuery, onlyWithExecutable]);

  // Notice helper
  const showNotice = (type, message) => {
    setNotice({ type, message });
    setTimeout(() => {
      setNotice((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  // Launch Game Handler
  const handleLaunchGame = async (game, categoryName) => {
    if (!game?.executablePath) {
      showNotice("error", `No executable file linked for "${game.name}". Click "Link .exe" first!`);
      return;
    }

    const launchKey = `${categoryName}_${game.name}`;
    setLaunchingKey(launchKey);

    try {
      // Audio feedback
      if (game.sound) {
        try {
          new Howl({ src: [game.sound], volume: 0.5 }).play();
        } catch (e) {
          console.warn("Sound play failed", e);
        }
      }

      showNotification?.({
        title: `🚀 Launching ${game.name}`,
        body: `Starting executable from ${game.executablePath}...`,
      });

      const res = await launchGame({
        executablePath: game.executablePath,
        args: game.launchArgs || [],
      });

      if (res?.success) {
        showNotice(
          "success",
          `🎮 "${game.name}" launched successfully! ${res.pid ? `(PID: ${res.pid})` : ""}`
        );
      } else {
        beep?.();
        showNotice("error", `Failed to launch "${game.name}": ${res?.error || "Unknown error"}`);
      }
    } catch (err) {
      showNotice("error", `Unexpected error launching game: ${err.message}`);
    } finally {
      setTimeout(() => {
        setLaunchingKey((prev) => (prev === launchKey ? null : prev));
      }, 1200);
    }
  };

  // Select Executable file picker
  const handlePickExecutable = async (targetCategory = null, targetIndex = null, currentGame = null) => {
    if (!isElectron) {
      alert("Executable selection requires running in the Electron desktop environment.");
      return;
    }

    const res = await selectExecutable({
      title: "Select Game Executable or Shortcut",
    });

    if (res && !res.canceled && res.filePath) {
      const selectedPath = res.filePath;
      const cleanFileName = res.fileName ? res.fileName.replace(/\.(exe|bat|cmd|lnk|url)$/i, "") : "";

      // If we are currently editing a card in-line or in modal
      if (targetCategory && targetIndex !== null && currentGame) {
        updateGameInCategory(targetCategory, targetIndex, {
          ...currentGame,
          executablePath: selectedPath,
        });
        showNotice("success", `Linked "${res.fileName}" to "${currentGame.name}"!`);
      } else {
        // We're inside the Add/Edit Modal
        setGameFormData((prev) => ({
          ...prev,
          executablePath: selectedPath,
          name: prev.name.trim() ? prev.name : cleanFileName,
        }));
      }
    }
  };

  // Open Add Game Modal
  const openAddGameModal = (categoryName = null) => {
    const defaultCat = categoryName || categoriesList[0] || "General";
    setIsCustomCategoryInput(categoriesList.length === 0);
    setEditingGameInfo(null);
    setGameFormData({
      categoryName: defaultCat,
      name: "",
      executablePath: "",
      launchArgs: "",
      image: "",
      sound: "",
      text: "",
    });
    setIsGameModalOpen(true);
  };

  // Open Edit Game Modal
  const openEditGameModal = (categoryName, index, game) => {
    setIsCustomCategoryInput(false);
    setEditingGameInfo({ categoryName, index, game });
    setGameFormData({
      categoryName,
      name: game.name || "",
      executablePath: game.executablePath || "",
      launchArgs: game.launchArgs || "",
      image: game.image || "",
      sound: game.sound || "",
      text: game.text || "",
    });
    setIsGameModalOpen(true);
  };

  // Save Game (Add or Update)
  const handleSaveGame = (e) => {
    e.preventDefault();
    const { categoryName, name, executablePath, launchArgs, image, sound, text } = gameFormData;

    if (!name.trim()) {
      alert("Game name is required!");
      return;
    }
    const cleanCat = categoryName.trim();
    if (!cleanCat) {
      alert("Please select or specify a category!");
      return;
    }

    // Auto-create category if it does not exist yet
    if (!gamesByCategory[cleanCat]) {
      addCategory(cleanCat);
    }

    const cleanGame = {
      name: name.trim(),
      executablePath: executablePath.trim(),
      launchArgs: launchArgs.trim(),
      image: image.trim() || "/assets/images/placeholder.png",
      sound: sound.trim(),
      text: text.trim(),
    };

    if (editingGameInfo) {
      const { categoryName: origCat, index: origIndex } = editingGameInfo;
      // If category changed, remove from old and add to new
      if (origCat !== cleanCat) {
        deleteGameFromCategory(origCat, origIndex);
        addGameToCategory(cleanCat, cleanGame);
      } else {
        updateGameInCategory(origCat, origIndex, cleanGame);
      }
      showNotice("success", `Updated "${cleanGame.name}" successfully!`);
    } else {
      // Adding new game
      addGameToCategory(cleanCat, cleanGame);
      showNotice("success", `Added "${cleanGame.name}" to "${cleanCat}"!`);
    }

    setIsGameModalOpen(false);
  };

  // Add Category Handler
  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const res = addCategory(newCatName.trim());
    if (res?.success) {
      showNotice("success", `Category "${newCatName.trim()}" created!`);
      setSelectedCategoryFilter("ALL");
      setNewCatName("");
      setIsNewCatModalOpen(false);
    } else {
      alert(res?.error || "Could not add category.");
    }
  };

  // Rename Category Handler
  const handleRenameCategorySubmit = (e) => {
    e.preventDefault();
    if (!renameCatTarget || !renameCatInput.trim()) return;

    const res = renameCategory(renameCatTarget, renameCatInput.trim());
    if (res?.success || res === true) {
      showNotice("success", `Renamed to "${renameCatInput.trim()}"!`);
      setRenameCatTarget(null);
      setRenameCatInput("");
    } else {
      alert(res?.error || "Could not rename category.");
    }
  };

  // Delete Action Confirm Execution
  const executeDelete = () => {
    if (!confirmDeleteTarget) return;

    if (confirmDeleteTarget.type === "cat") {
      deleteCategory(confirmDeleteTarget.categoryName);
      showNotice("success", `Deleted category "${confirmDeleteTarget.categoryName}".`);
    } else if (confirmDeleteTarget.type === "game") {
      deleteGameFromCategory(confirmDeleteTarget.categoryName, confirmDeleteTarget.index);
      showNotice("success", `Removed "${confirmDeleteTarget.name}".`);
    }
    setConfirmDeleteTarget(null);
  };

  // Reset to default games
  const handleResetDefaults = async () => {
    const res = await resetGamesToDefault();
    if (res?.success) {
      showNotice("success", "Restored library to default games catalog.");
    } else {
      alert("Failed to reset: " + (res?.error || "Unknown error"));
    }
    setIsResetConfirmOpen(false);
  };

  // Export / Import games catalog
  const handleExportCatalog = async () => {
    await exportJsonFile?.(gamesByCategory, "jack-o-pot-games.json");
  };

  const handleImportCatalog = async () => {
    const res = await importJsonFile?.({ title: "Import Games Collection JSON" });
    if (res?.data && typeof res.data === "object") {
      resetGamesToDefault().catch(() => {});
      localStorage.setItem("jack_o_pot_games", JSON.stringify(res.data));
      window.location.reload();
    }
  };

  return (
    <div className="collection-screen">
      {/* Header */}
      <header className="collection-header">
        <div className="collection-header-left">
          <button className="coll-btn coll-btn-secondary coll-btn-sm" onClick={goBack} title="Return to Game (Esc)">
            <span>←</span> Back to Game
          </button>

          <div className="collection-title-wrap">
            <div className="collection-title-main">
              <span className="collection-title-icon">🎮</span>
              <h1 className="collection-title">GAME COLLECTION & LAUNCHER</h1>
            </div>
            <p className="collection-subtitle">
              Manage game categories, configure titles, and link desktop executables to launch games directly
            </p>
          </div>
        </div>

        {/* Stats & Global Actions */}
        <div className="collection-header-actions">
          <div className="collection-header-stats">
            <div className="stat-pill" title="Total game categories">
              📁 {categoriesList.length} Categories
            </div>
            <div className="stat-pill" title="Total game titles">
              🕹️ {totalGamesCount} Games
            </div>
            <div className="stat-pill highlight" title="Games with linked executable files ready to launch">
              🚀 {linkedGamesCount} Ready to Launch
            </div>
          </div>

          <button
            className="coll-btn coll-btn-secondary"
            onClick={() => setIsNewCatModalOpen(true)}
            title="Create a new category"
          >
            <span>📁</span> + New Category
          </button>

          <button
            className="coll-btn coll-btn-primary"
            onClick={() => openAddGameModal()}
            title="Add a new game"
          >
            <span>+</span> Add Game
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div className={`launch-notice-bar ${notice.type}`}>
          <span>{notice.message}</span>
          <button className="launch-notice-close" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      {/* Toolbar: Search, Category Pills, and Filters */}
      <div className="collection-toolbar">
        <div className="collection-search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="collection-search-input"
            placeholder="Search by game title, category, or executable path..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="collection-filter-pills">
          <button
            className={`filter-pill ${selectedCategoryFilter === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedCategoryFilter("ALL")}
          >
            All Categories ({totalGamesCount})
          </button>
          {categoriesList.map((cat) => {
            const count = (gamesByCategory[cat] || []).length;
            return (
              <button
                key={cat}
                className={`filter-pill ${selectedCategoryFilter === cat ? "active" : ""}`}
                onClick={() => setSelectedCategoryFilter(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label className="filter-toggle-label">
            <input
              type="checkbox"
              checked={onlyWithExecutable}
              onChange={(e) => setOnlyWithExecutable(e.target.checked)}
            />
            <span>🚀 Executable Linked Only</span>
          </label>

          <button
            className="coll-btn coll-btn-secondary coll-btn-sm"
            onClick={() => setIsResetConfirmOpen(true)}
            title="Restore default game library"
          >
            🔄 Reset Defaults
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="collection-content">
        {filteredCategoryGroups.length === 0 ? (
          <div className="collection-empty-view">
            <span className="empty-view-icon">🕹️</span>
            <h3>No Games Found</h3>
            <p>
              {searchQuery || onlyWithExecutable
                ? "No games match your current search or filter criteria."
                : "No games in this collection yet. Add your first game or category above!"}
            </p>
            {(searchQuery || onlyWithExecutable) && (
              <button
                className="coll-btn coll-btn-secondary"
                onClick={() => {
                  setSearchQuery("");
                  setOnlyWithExecutable(false);
                  setSelectedCategoryFilter("ALL");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredCategoryGroups.map(({ categoryName, games, totalInCategory }) => (
            <section key={categoryName} className="category-section">
              {/* Category Header */}
              <div className="category-section-header">
                <div className="category-header-title">
                  <span style={{ fontSize: "1.2rem" }}>📁</span>
                  <h2 className="category-name">{categoryName}</h2>
                  <span className="category-count-badge">
                    {games.length} {games.length === 1 ? "game" : "games"}
                  </span>
                </div>

                <div className="category-header-actions">
                  <button
                    className="coll-btn coll-btn-primary coll-btn-sm"
                    onClick={() => openAddGameModal(categoryName)}
                    title={`Add new game directly to ${categoryName}`}
                  >
                    + Add Game
                  </button>

                  <button
                    className="cat-action-btn"
                    onClick={() => {
                      setRenameCatTarget(categoryName);
                      setRenameCatInput(categoryName);
                    }}
                    title="Rename this category"
                  >
                    ✏️ Rename
                  </button>

                  <button
                    className="cat-action-btn danger"
                    onClick={() =>
                      setConfirmDeleteTarget({
                        type: "cat",
                        categoryName,
                        name: categoryName,
                      })
                    }
                    title="Delete this category"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Games Grid for Category */}
              <div className="games-grid">
                {games.length === 0 ? (
                  <div className="category-empty-state">
                    <p>No games in this category yet.</p>
                    <button
                      className="coll-btn coll-btn-secondary coll-btn-sm"
                      onClick={() => openAddGameModal(categoryName)}
                    >
                      + Add Game to {categoryName}
                    </button>
                  </div>
                ) : (
                  games.map(({ game, originalIndex }) => {
                    const hasExe = Boolean(game.executablePath && game.executablePath.trim());
                    const isLaunching = launchingKey === `${categoryName}_${game.name}`;

                    return (
                      <div
                        key={`${categoryName}_${game.name}_${originalIndex}`}
                        className={`game-card ${hasExe ? "has-exe" : "missing-exe"}`}
                      >
                        {/* Poster Banner */}
                        <div className="game-card-poster">
                          {game.image ? (
                            <img
                              src={game.image}
                              alt={game.name}
                              className="game-card-img"
                              onError={(e) => {
                                e.target.style.display = "none";
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className="game-card-placeholder"
                            style={{ display: game.image ? "none" : "flex" }}
                          >
                            🎃
                          </div>
                          <div className="game-card-overlay" />
                          <span className="game-category-tag">{categoryName}</span>

                          <span className={`game-status-badge ${hasExe ? "ready" : "missing"}`}>
                            <span className="status-dot" />
                            {hasExe ? "Ready to Launch" : "No Executable"}
                          </span>
                        </div>

                        {/* Card Body */}
                        <div className="game-card-body">
                          <h3 className="game-card-title">{game.name}</h3>

                          {game.text && (
                            <p className="game-card-dare-text" title={game.text}>
                              "{game.text}"
                            </p>
                          )}

                          {/* Executable Path Display */}
                          {hasExe ? (
                            <div className="game-exe-info">
                              <span className="exe-path-text" title={game.executablePath}>
                                📁 {game.executablePath}
                              </span>
                              {isElectron && (
                                <button
                                  className="exe-folder-link"
                                  onClick={() => openGameFolder(game.executablePath)}
                                  title="Reveal file in Windows Explorer"
                                >
                                  📂
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="game-exe-info" style={{ opacity: 0.65 }}>
                              <span className="exe-path-text">No executable location specified</span>
                            </div>
                          )}

                          {/* Actions / Launch Bar */}
                          <div className="game-card-footer">
                            {hasExe ? (
                              <button
                                className="launch-btn"
                                onClick={() => handleLaunchGame(game, categoryName)}
                                disabled={isLaunching}
                                title={`Launch ${game.name}`}
                              >
                                {isLaunching ? (
                                  <>
                                    <span>⏳</span> Launching...
                                  </>
                                ) : (
                                  <>
                                    <span>🚀</span> LAUNCH GAME
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                className="link-exe-btn"
                                onClick={() => handlePickExecutable(categoryName, originalIndex, game)}
                                title="Select executable file for this game"
                              >
                                <span>📁</span> Link .exe
                              </button>
                            )}

                            <button
                              className="card-icon-btn"
                              onClick={() => openEditGameModal(categoryName, originalIndex, game)}
                              title="Edit game configuration"
                            >
                              ✏️
                            </button>

                            <button
                              className="card-icon-btn delete-btn"
                              onClick={() =>
                                setConfirmDeleteTarget({
                                  type: "game",
                                  categoryName,
                                  index: originalIndex,
                                  name: game.name,
                                })
                              }
                              title="Delete game from collection"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          ))
        )}
      </div>

      {/* ===================== MODALS ===================== */}

      {/* Add / Edit Game Modal */}
      {isGameModalOpen && (
        <div className="coll-modal-overlay" onClick={() => setIsGameModalOpen(false)}>
          <div className="coll-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="coll-modal-header">
              <h3 className="coll-modal-title">
                <span>{editingGameInfo ? "✏️" : "➕"}</span>
                {editingGameInfo ? `Edit "${editingGameInfo.game.name}"` : "Add New Game"}
              </h3>
              <button className="coll-modal-close-btn" onClick={() => setIsGameModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGame}>
              <div className="coll-modal-body">
                {/* Category Selection */}
                <div className="coll-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="coll-form-label" style={{ marginBottom: 0 }}>
                      Category <span className="req">*</span>
                    </label>
                    {categoriesList.length > 0 && (
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff9142",
                          cursor: "pointer",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          textDecoration: "underline",
                        }}
                        onClick={() => setIsCustomCategoryInput(!isCustomCategoryInput)}
                      >
                        {isCustomCategoryInput ? "← Select from existing" : "+ New category"}
                      </button>
                    )}
                  </div>
                  {isCustomCategoryInput || categoriesList.length === 0 ? (
                    <input
                      type="text"
                      className="coll-form-input"
                      placeholder="Enter new category name..."
                      value={gameFormData.categoryName}
                      onChange={(e) => setGameFormData({ ...gameFormData, categoryName: e.target.value })}
                      required
                    />
                  ) : (
                    <select
                      className="coll-form-select"
                      value={gameFormData.categoryName}
                      onChange={(e) => setGameFormData({ ...gameFormData, categoryName: e.target.value })}
                      required
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Game Title */}
                <div className="coll-form-group">
                  <label className="coll-form-label">
                    Game Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="coll-form-input"
                    placeholder="e.g. Silent Hill 2, Phasmophobia..."
                    value={gameFormData.name}
                    onChange={(e) => setGameFormData({ ...gameFormData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Executable Path */}
                <div className="coll-form-group">
                  <label className="coll-form-label">
                    Executable File Location (.exe, .bat, shortcut)
                    <span className="coll-form-hint">Path to launch the game</span>
                  </label>
                  <div className="exe-input-group">
                    <input
                      type="text"
                      className="coll-form-input"
                      placeholder="C:\Games\MyGame\game.exe"
                      value={gameFormData.executablePath}
                      onChange={(e) => setGameFormData({ ...gameFormData, executablePath: e.target.value })}
                    />
                    {isElectron && (
                      <button
                        type="button"
                        className="browse-exe-btn"
                        onClick={() => handlePickExecutable()}
                        title="Browse for executable file"
                      >
                        📂 Browse
                      </button>
                    )}
                  </div>
                </div>

                {/* Launch Arguments */}
                <div className="coll-form-group">
                  <label className="coll-form-label">
                    Launch Arguments (Optional)
                    <span className="coll-form-hint">e.g. -fullscreen -dx11 --no-intro</span>
                  </label>
                  <input
                    type="text"
                    className="coll-form-input"
                    placeholder="-fullscreen"
                    value={gameFormData.launchArgs}
                    onChange={(e) => setGameFormData({ ...gameFormData, launchArgs: e.target.value })}
                  />
                </div>

                {/* Poster Image URL */}
                <div className="coll-form-group">
                  <label className="coll-form-label">
                    Banner / Thumbnail Image URL
                    <span className="coll-form-hint">Direct link to image file</span>
                  </label>
                  <input
                    type="text"
                    className="coll-form-input"
                    placeholder="/assets/images/doom.png or https://..."
                    value={gameFormData.image}
                    onChange={(e) => setGameFormData({ ...gameFormData, image: e.target.value })}
                  />
                  {gameFormData.image && (
                    <div className="coll-img-preview-box">
                      <img
                        src={gameFormData.image}
                        alt="Preview"
                        className="coll-img-preview"
                        onError={(e) => {
                          e.target.style.opacity = "0.3";
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Custom Sound Effect */}
                <div className="coll-form-group">
                  <label className="coll-form-label">
                    Sound FX URL (Optional)
                    <span className="coll-form-hint">Audio file played when selected or launched</span>
                  </label>
                  <input
                    type="text"
                    className="coll-form-input"
                    placeholder="/assets/sounds/doom.mp3"
                    value={gameFormData.sound}
                    onChange={(e) => setGameFormData({ ...gameFormData, sound: e.target.value })}
                  />
                </div>

                {/* Custom Dare / Description */}
                <div className="coll-form-group">
                  <label className="coll-form-label">
                    Reel Dare Message (Optional)
                    <span className="coll-form-hint">Text shown on slot machine</span>
                  </label>
                  <input
                    type="text"
                    className="coll-form-input"
                    placeholder="e.g. Survive 15 minutes without hiding..."
                    value={gameFormData.text}
                    onChange={(e) => setGameFormData({ ...gameFormData, text: e.target.value })}
                  />
                </div>
              </div>

              <div className="coll-modal-footer">
                <button
                  type="button"
                  className="coll-btn coll-btn-secondary"
                  onClick={() => setIsGameModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="coll-btn coll-btn-primary">
                  {editingGameInfo ? "Save Changes" : "Add Game"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {isNewCatModalOpen && (
        <div className="coll-modal-overlay" onClick={() => setIsNewCatModalOpen(false)}>
          <div className="coll-modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="coll-modal-header">
              <h3 className="coll-modal-title">📁 New Category</h3>
              <button className="coll-modal-close-btn" onClick={() => setIsNewCatModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="coll-modal-body">
                <div className="coll-form-group">
                  <label className="coll-form-label">Category Name</label>
                  <input
                    type="text"
                    className="coll-form-input"
                    placeholder="e.g. Indie, Stealth, Retro..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="coll-modal-footer">
                <button
                  type="button"
                  className="coll-btn coll-btn-secondary"
                  onClick={() => setIsNewCatModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="coll-btn coll-btn-primary">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Category Modal */}
      {renameCatTarget && (
        <div className="coll-modal-overlay" onClick={() => setRenameCatTarget(null)}>
          <div className="coll-modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="coll-modal-header">
              <h3 className="coll-modal-title">✏️ Rename Category</h3>
              <button className="coll-modal-close-btn" onClick={() => setRenameCatTarget(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleRenameCategorySubmit}>
              <div className="coll-modal-body">
                <div className="coll-form-group">
                  <label className="coll-form-label">New Name for "{renameCatTarget}"</label>
                  <input
                    type="text"
                    className="coll-form-input"
                    value={renameCatInput}
                    onChange={(e) => setRenameCatInput(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="coll-modal-footer">
                <button
                  type="button"
                  className="coll-btn coll-btn-secondary"
                  onClick={() => setRenameCatTarget(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="coll-btn coll-btn-primary">
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteTarget && (
        <div className="coll-modal-overlay" onClick={() => setConfirmDeleteTarget(null)}>
          <div className="coll-modal-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="coll-modal-header">
              <h3 className="coll-modal-title" style={{ color: "#ff5555" }}>
                🗑️ Confirm Deletion
              </h3>
              <button className="coll-modal-close-btn" onClick={() => setConfirmDeleteTarget(null)}>
                ✕
              </button>
            </div>
            <div className="coll-modal-body">
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#dedbe8" }}>
                Are you sure you want to delete{" "}
                <strong style={{ color: "#ffffff" }}>
                  {confirmDeleteTarget.type === "cat" ? `the entire category "${confirmDeleteTarget.name}"` : `"${confirmDeleteTarget.name}"`}
                </strong>
                ?
              </p>
              {confirmDeleteTarget.type === "cat" && (
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#ff8888" }}>
                  ⚠️ This will also delete all games inside this category!
                </p>
              )}
            </div>
            <div className="coll-modal-footer">
              <button
                type="button"
                className="coll-btn coll-btn-secondary"
                onClick={() => setConfirmDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="coll-btn coll-btn-outline-danger"
                onClick={executeDelete}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="coll-modal-overlay" onClick={() => setIsResetConfirmOpen(false)}>
          <div className="coll-modal-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="coll-modal-header">
              <h3 className="coll-modal-title">🔄 Reset to Defaults</h3>
              <button className="coll-modal-close-btn" onClick={() => setIsResetConfirmOpen(false)}>
                ✕
              </button>
            </div>
            <div className="coll-modal-body">
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#dedbe8" }}>
                Are you sure you want to reset the game catalog back to the original built-in defaults? Any custom categories and executable paths you added will be reverted.
              </p>
            </div>
            <div className="coll-modal-footer">
              <button
                type="button"
                className="coll-btn coll-btn-secondary"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="coll-btn coll-btn-primary"
                onClick={handleResetDefaults}
              >
                Reset Catalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
