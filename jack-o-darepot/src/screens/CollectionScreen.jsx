import { useState, useMemo, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { useNavigation } from "../navigation/NavigationContext";
import { useElectron } from "../hooks/useElectron";
import { Howl } from "howler";
import { Icon } from "@iconify/react";
import { searchGameDatabase } from "../services/gameScraper";
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
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [onlyWithExecutable, setOnlyWithExecutable] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  // Status & Feedback
  const [launchingKey, setLaunchingKey] = useState(null);
  const [notice, setNotice] = useState(null);

  // Modal States
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [editingGameInfo, setEditingGameInfo] = useState(null); // { categoryName, index, game }
  const [isCustomCategoryInput, setIsCustomCategoryInput] = useState(false);

  // Game Form State (Multi-Artwork & Metadata)
  const [gameFormData, setGameFormData] = useState({
    categoryName: "",
    name: "",
    executablePath: "",
    launchArgs: "",
    verticalArtwork: "",
    horizontalArtwork: "",
    screenshots: [],
    image: "",
    sound: "",
    text: "",
    description: "",
  });

  // Online Database Scraper State (Steam -> IGDB -> Open Game DB)
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [dbSearchResults, setDbSearchResults] = useState([]);
  const [dbSearchError, setDbSearchError] = useState(null);
  const [dbSearchProvider, setDbSearchProvider] = useState(null); // 'STEAM' | 'OPEN_DB' | 'IGDB'
  const [showDbConfigDrawer, setShowDbConfigDrawer] = useState(false);
  const [igdbClientId, setIgdbClientId] = useState(() => localStorage.getItem("jackopot_igdb_client_id") || "");
  const [igdbClientSecret, setIgdbClientSecret] = useState(() => localStorage.getItem("jackopot_igdb_client_secret") || "");
  const [newScreenshotInput, setNewScreenshotInput] = useState("");

  // Screenshots Lightbox Viewer State
  const [viewingScreenshotsGame, setViewingScreenshotsGame] = useState(null);
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState(0);

  // Category Modals
  const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [renameCatTarget, setRenameCatTarget] = useState(null);
  const [renameCatInput, setRenameCatInput] = useState("");

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null); // { type: 'cat' | 'game', categoryName, index, name }
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Keyboard shortcut listener (Esc to close modal or go back)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (viewingScreenshotsGame) setViewingScreenshotsGame(null);
        else if (isGameModalOpen) setIsGameModalOpen(false);
        else if (isNewCatModalOpen) setIsNewCatModalOpen(false);
        else if (renameCatTarget) setRenameCatTarget(null);
        else if (confirmDeleteTarget) setConfirmDeleteTarget(null);
        else if (isResetConfirmOpen) setIsResetConfirmOpen(false);
        else goBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    viewingScreenshotsGame,
    isGameModalOpen,
    isNewCatModalOpen,
    renameCatTarget,
    confirmDeleteTarget,
    isResetConfirmOpen,
    goBack,
  ]);

  // Asset path helper
  const fixAssetPath = (path) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("file:")) return path;
    if (path.startsWith("/")) return path;
    return `/assets/${path}`;
  };

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

  // Filtered games structure
  const filteredCategoryGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return categoriesList
      .filter((cat) => {
        if (selectedCategory !== "ALL" && cat !== selectedCategory) return false;
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
        if (searchQuery || onlyWithExecutable) {
          return group.games.length > 0;
        }
        return true;
      });
  }, [categoriesList, gamesByCategory, selectedCategory, searchQuery, onlyWithExecutable]);

  const totalFilteredGames = useMemo(() => {
    return filteredCategoryGroups.reduce((acc, grp) => acc + grp.games.length, 0);
  }, [filteredCategoryGroups]);

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
      if (game.sound) {
        try {
          new Howl({ src: [fixAssetPath(game.sound)], volume: 0.5 }).play();
        } catch (e) {
          console.warn("Sound play failed", e);
        }
      }

      showNotification?.({
        title: `Launching ${game.name}`,
        body: `Starting executable from ${game.executablePath}...`,
      });

      const res = await launchGame({
        executablePath: game.executablePath,
        args: game.launchArgs || [],
      });

      if (res?.success) {
        showNotice(
          "success",
          `"${game.name}" launched successfully! ${res.pid ? `(PID: ${res.pid})` : ""}`
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

      if (targetCategory && targetIndex !== null && currentGame) {
        updateGameInCategory(targetCategory, targetIndex, {
          ...currentGame,
          executablePath: selectedPath,
        });
        showNotice("success", `Linked "${res.fileName}" to "${currentGame.name}"!`);
      } else {
        setGameFormData((prev) => ({
          ...prev,
          executablePath: selectedPath,
          name: prev.name.trim() ? prev.name : cleanFileName,
        }));
      }
    }
  };

  // Online Database Scraper Handler (Steam -> IGDB -> Open Game DB)
  const handleSearchDatabase = async (overrideTerm = null, forceProvider = null) => {
    const term = (overrideTerm || gameFormData.name).trim();
    if (!term) {
      showNotice("error", "Please enter a game title first to search online artwork!");
      return;
    }
    setIsSearchingDb(true);
    setDbSearchError(null);
    setDbSearchResults([]);
    setDbSearchProvider(null);
    try {
      const res = await searchGameDatabase(term, {
        forceProvider,
        igdbClientId: igdbClientId.trim(),
        igdbClientSecret: igdbClientSecret.trim(),
      });
      if (res?.success && Array.isArray(res.results) && res.results.length > 0) {
        setDbSearchResults(res.results);
        const provider = res.provider || res.results[0]?.source || "STEAM";
        setDbSearchProvider(provider);
        if (provider === "OPEN_DB") {
          showNotice("success", `Found artwork on Open Video Game Database for "${term}"!`);
        } else if (provider === "IGDB") {
          showNotice("success", `Found official match on IGDB for "${term}"!`);
        }
      } else {
        setDbSearchError(
          `No online matches found for "${term}" across Steam, IGDB, and Open Game DB. You can still paste custom artwork links below.`
        );
      }
    } catch (err) {
      setDbSearchError(`Search error: ${err.message}`);
    } finally {
      setIsSearchingDb(false);
    }
  };

  const handleSaveIgdbKeys = () => {
    localStorage.setItem("jackopot_igdb_client_id", igdbClientId.trim());
    localStorage.setItem("jackopot_igdb_client_secret", igdbClientSecret.trim());
    showNotice("success", "IGDB API credentials saved locally!");
    setShowDbConfigDrawer(false);
  };

  // Apply scraped database game metadata
  const handleApplyDbGame = (matchedGame) => {
    setGameFormData((prev) => {
      const vert = matchedGame.verticalArtwork || prev.verticalArtwork;
      const horiz = matchedGame.horizontalArtwork || prev.horizontalArtwork;
      const shots = matchedGame.screenshots?.length ? matchedGame.screenshots : prev.screenshots;
      return {
        ...prev,
        name: prev.name.trim() ? prev.name : matchedGame.name,
        verticalArtwork: vert,
        horizontalArtwork: horiz,
        image: vert || horiz || prev.image,
        screenshots: shots,
        description: matchedGame.description || prev.description,
        text: prev.text.trim()
          ? prev.text
          : `Complete a dare in ${matchedGame.name}!`,
      };
    });
    setDbSearchResults([]);
    showNotice("success", `Imported official artwork & screenshots for "${matchedGame.name}"!`);
  };

  // Screenshot management in form
  const handleAddScreenshot = () => {
    if (!newScreenshotInput.trim()) return;
    setGameFormData((prev) => ({
      ...prev,
      screenshots: [...(prev.screenshots || []), newScreenshotInput.trim()],
    }));
    setNewScreenshotInput("");
  };

  const handleRemoveScreenshot = (indexToRemove) => {
    setGameFormData((prev) => ({
      ...prev,
      screenshots: (prev.screenshots || []).filter((_, i) => i !== indexToRemove),
    }));
  };

  // Open Add Game Modal
  const openAddGameModal = (categoryName = null) => {
    const defaultCat =
      categoryName || (selectedCategory !== "ALL" ? selectedCategory : categoriesList[0]) || "General";
    setIsCustomCategoryInput(categoriesList.length === 0);
    setEditingGameInfo(null);
    setDbSearchResults([]);
    setDbSearchError(null);
    setNewScreenshotInput("");
    setGameFormData({
      categoryName: defaultCat,
      name: "",
      executablePath: "",
      launchArgs: "",
      verticalArtwork: "",
      horizontalArtwork: "",
      screenshots: [],
      image: "",
      sound: "",
      text: "",
      description: "",
    });
    setIsGameModalOpen(true);
  };

  // Open Edit Game Modal
  const openEditGameModal = (categoryName, index, game) => {
    setIsCustomCategoryInput(false);
    setEditingGameInfo({ categoryName, index, game });
    setDbSearchResults([]);
    setDbSearchError(null);
    setNewScreenshotInput("");
    setGameFormData({
      categoryName,
      name: game.name || "",
      executablePath: game.executablePath || "",
      launchArgs: game.launchArgs || "",
      verticalArtwork: game.verticalArtwork || game.image || "",
      horizontalArtwork: game.horizontalArtwork || "",
      screenshots: Array.isArray(game.screenshots) ? game.screenshots : [],
      image: game.image || game.verticalArtwork || "",
      sound: game.sound || "",
      text: game.text || "",
      description: game.description || "",
    });
    setIsGameModalOpen(true);
  };

  // Save Game (Add or Update)
  const handleSaveGame = (e) => {
    e.preventDefault();
    const {
      categoryName,
      name,
      executablePath,
      launchArgs,
      verticalArtwork,
      horizontalArtwork,
      screenshots,
      image,
      sound,
      text,
      description,
    } = gameFormData;

    if (!name.trim()) {
      alert("Game name is required!");
      return;
    }
    const cleanCat = categoryName.trim();
    if (!cleanCat) {
      alert("Please select or specify a category!");
      return;
    }

    if (!gamesByCategory[cleanCat]) {
      addCategory(cleanCat);
    }

    const cleanGame = {
      name: name.trim(),
      executablePath: executablePath.trim(),
      launchArgs: launchArgs.trim(),
      verticalArtwork: (verticalArtwork || "").trim(),
      horizontalArtwork: (horizontalArtwork || "").trim(),
      screenshots: Array.isArray(screenshots) ? screenshots.filter(Boolean) : [],
      image: (verticalArtwork || "").trim() || (image || "").trim() || (horizontalArtwork || "").trim(),
      sound: sound.trim(),
      text: text.trim(),
      description: (description || "").trim(),
    };

    if (editingGameInfo) {
      const { categoryName: origCat, index: origIndex } = editingGameInfo;
      if (origCat !== cleanCat) {
        deleteGameFromCategory(origCat, origIndex);
        addGameToCategory(cleanCat, cleanGame);
      } else {
        updateGameInCategory(origCat, origIndex, cleanGame);
      }
      showNotice("success", `Updated "${cleanGame.name}" successfully!`);
    } else {
      addGameToCategory(cleanCat, cleanGame);
      showNotice("success", `Added "${cleanGame.name}" to "${cleanCat}"!`);
    }

    setIsGameModalOpen(false);
  };

  // Create Category Handler
  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const res = addCategory(newCatName.trim());
    if (res?.success) {
      showNotice("success", `Category "${newCatName.trim()}" created!`);
      setSelectedCategory(newCatName.trim());
      setNewCatName("");
      setIsNewCatModalOpen(false);
    } else {
      alert(res?.error || "Category already exists!");
    }
  };

  // Rename Category Handler
  const handleRenameCategorySubmit = (e) => {
    e.preventDefault();
    if (!renameCatTarget || !renameCatInput.trim()) return;

    const res = renameCategory(renameCatTarget, renameCatInput.trim());
    if (res?.success) {
      showNotice("success", `Renamed to "${renameCatInput.trim()}"!`);
      if (selectedCategory === renameCatTarget) {
        setSelectedCategory(renameCatInput.trim());
      }
      setRenameCatTarget(null);
    } else {
      alert(res?.error || "Failed to rename category");
    }
  };

  // Execute confirmed deletion
  const executeDelete = () => {
    if (!confirmDeleteTarget) return;

    if (confirmDeleteTarget.type === "cat") {
      deleteCategory(confirmDeleteTarget.categoryName);
      if (selectedCategory === confirmDeleteTarget.categoryName) {
        setSelectedCategory("ALL");
      }
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
      resetGamesToDefault().catch(() => { });
      localStorage.setItem("jack_o_pot_games", JSON.stringify(res.data));
      window.location.reload();
    }
  };

  return (
    <div className="collection-screen">
      {/* ================= TOP COMMAND BAR ================= */}
      <header className="collection-topbar">
        {/* Left: Navigation & Branding */}
        <div className="topbar-left">


          <div className="topbar-brand">
            <Icon icon="game-icons:retro-controller" className="brand-controller-icon text-ui-accent" />
          </div>
        </div>

        {/* Center: Instant Search */}
        <div className="topbar-search-wrap">
          <Icon icon="game-icons:magnifying-glass" className="search-glass-icon" />
          <input
            type="text"
            className="topbar-search-input"
            placeholder="Search games, categories, executables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              title="Clear Search"
            >
              <Icon icon="game-icons:cross-mark" />
            </button>
          )}
        </div>

        {/* Right: Stats & Global Actions */}
        <div className="topbar-right">
          <div className="topbar-stats-group">
            <div className="topbar-stat-badge" title="Total Games in Library">
              <Icon icon="game-icons:game-console" className="text-ui-accent" />
              <span>{totalGamesCount}</span>
              <span className="stat-unit">GAMES</span>
            </div>
            <div
              className={`topbar-stat-badge ${linkedGamesCount > 0 ? "ready-highlight" : ""}`}
              title="Games with Executable file linked"
            >
              <span className="ready-indicator-dot" />
              <span>{linkedGamesCount}</span>
              <span className="stat-unit">LAUNCH READY</span>
            </div>
          </div>

          <div className="topbar-actions-group">
            <button
              type="button"
              className="topbar-btn topbar-btn-primary"
              onClick={() => openAddGameModal()}
              title="Add a new game to collection"
            >
              <Icon icon="game-icons:plus" className="text-base" />
              <span>+ ADD GAME</span>
            </button>

            <button
              type="button"
              className="topbar-btn topbar-btn-secondary"
              onClick={() => setIsNewCatModalOpen(true)}
              title="Create a new Category"
            >
              <Icon icon="game-icons:open-folder" className="text-base" />
              <span>+ NEW CAT</span>
            </button>

            <button
              type="button"
              className="topbar-btn topbar-btn-subtle"
              onClick={handleExportCatalog}
              title="Export game collection to JSON"
            >
              <Icon icon="game-icons:save" className="text-base" />
              <span>EXPORT</span>
            </button>

            <button
              type="button"
              className="topbar-btn topbar-btn-subtle"
              onClick={handleImportCatalog}
              title="Import game collection from JSON"
            >
              <Icon icon="game-icons:download" className="text-base" />
              <span>IMPORT</span>
            </button>

            <button
              type="button"
              className="topbar-btn topbar-btn-danger"
              onClick={() => setIsResetConfirmOpen(true)}
              title="Restore Factory Default Games Catalog"
            >
              <Icon icon="game-icons:anticlockwise-rotation" className="text-base" />
              <span>RESET</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div className={`collection-notice-banner ${notice.type}`}>
          <Icon
            icon={notice.type === "success" ? "game-icons:check-mark" : "game-icons:hazard-sign"}
            className="text-lg"
          />
          <span className="notice-message">{notice.message}</span>
          <button type="button" className="notice-close-btn" onClick={() => setNotice(null)}>
            <Icon icon="game-icons:cross-mark" />
          </button>
        </div>
      )}

      {/* ================= MAIN SPLIT WORKSPACE ================= */}
      <div className="collection-workspace">
        {/* ================= LEFT SIDEBAR (Category Rail) ================= */}
        <aside className="collection-sidebar">
          {/* Category Rail Header */}
          <div className="sidebar-section-header">
            <div className="flex items-center gap-1.5">
              <Icon icon="game-icons:open-folder" className="text-ui-accent text-base" />
              <span className="sidebar-header-title">CATEGORIES</span>
            </div>
            <button
              type="button"
              className="sidebar-add-cat-btn"
              onClick={() => setIsNewCatModalOpen(true)}
              title="Create a new Category"
            >
              <Icon icon="game-icons:plus" />
              <span>NEW</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="sidebar-filter-toggles">
            <label className="sidebar-toggle-row">
              <input
                type="checkbox"
                checked={onlyWithExecutable}
                onChange={(e) => setOnlyWithExecutable(e.target.checked)}
              />
              <span className="toggle-label flex items-center gap-1.5">
                <Icon icon="game-icons:rocket" className="text-ui-accent text-sm" />
                <span>Launch Ready Only</span>
              </span>
            </label>
          </div>

          {/* Category Navigation List */}
          <nav className="sidebar-category-nav">
            <button
              type="button"
              className={`category-nav-item ${selectedCategory === "ALL" ? "active" : ""}`}
              onClick={() => setSelectedCategory("ALL")}
            >
              <div className="cat-item-left">
                <Icon icon="game-icons:star-formation" className="cat-nav-icon" />
                <span className="cat-nav-name">ALL GAMES</span>
              </div>
              <span className="cat-nav-count">{totalGamesCount}</span>
            </button>

            {categoriesList.map((cat) => {
              const catGames = gamesByCategory[cat] || [];
              const hasLinked = catGames.some((g) => Boolean(g.executablePath && g.executablePath.trim()));
              const isSelected = selectedCategory === cat;

              return (
                <div
                  key={cat}
                  className={`category-nav-item-wrap ${isSelected ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="category-nav-item-btn"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <div className="cat-item-left">
                      <Icon
                        icon={hasLinked ? "game-icons:open-folder" : "game-icons:folder-closed"}
                        className={`cat-nav-icon ${hasLinked ? "text-ui-accent" : ""}`}
                      />
                      <span className="cat-nav-name" title={cat}>
                        {cat}
                      </span>
                    </div>
                    <span className="cat-nav-count">{catGames.length}</span>
                  </button>

                  {/* Inline Quick Action Icons */}
                  <div className="category-inline-actions">
                    <button
                      type="button"
                      className="cat-quick-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameCatTarget(cat);
                        setRenameCatInput(cat);
                      }}
                      title={`Rename "${cat}"`}
                    >
                      <Icon icon="game-icons:pencil" />
                    </button>
                    <button
                      type="button"
                      className="cat-quick-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteTarget({
                          type: "cat",
                          categoryName: cat,
                          name: cat,
                        });
                      }}
                      title={`Delete "${cat}"`}
                    >
                      <Icon icon="game-icons:trash-can" />
                    </button>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Sidebar Footer Utilities */}
          <div className="sidebar-footer-utilities">
            <div className="sidebar-tools-grid">
              <button
                type="button"
                className="sidebar-tool-btn"
                onClick={handleExportCatalog}
                title="Export Game Catalog to JSON"
              >
                <Icon icon="game-icons:save" className="text-sm" />
                <span>EXPORT</span>
              </button>

              <button
                type="button"
                className="sidebar-tool-btn"
                onClick={handleImportCatalog}
                title="Import Game Catalog from JSON"
              >
                <Icon icon="game-icons:download" className="text-sm" />
                <span>IMPORT</span>
              </button>
            </div>

            <button
              type="button"
              className="sidebar-reset-btn"
              onClick={() => setIsResetConfirmOpen(true)}
              title="Restore Factory Default Games Catalog"
            >
              <Icon icon="game-icons:anticlockwise-rotation" className="text-sm" />
              <span>RESET DEFAULTS</span>
            </button>
          </div>
        </aside>

        {/* ================= RIGHT MAIN STAGE (Game Showcase) ================= */}
        <main className="collection-main-stage">
          {/* Main Stage Subheader */}
          <div className="main-stage-header">
            <div className="stage-header-info">
              <div className="flex items-center gap-2">
                <h2 className="stage-category-title">
                  {selectedCategory === "ALL" ? "ALL GAMES" : selectedCategory}
                </h2>
                <span className="stage-game-count-badge">
                  {totalFilteredGames} {totalFilteredGames === 1 ? "GAME" : "GAMES"}
                </span>
              </div>
              <span className="stage-category-desc">
                {selectedCategory === "ALL"
                  ? "Showing all active games across all categories in your Darepot library"
                  : `Games categorized under "${selectedCategory}" ready for reel selection and launch`}
              </span>
            </div>

            {/* View Mode & Actions */}
            <div className="stage-header-actions">
              <div className="view-mode-toggle-group">
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Poster Cartridge Grid View"
                >
                  <Icon icon="game-icons:tabletop-scene" className="text-base" />
                  <span>GRID</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                  title="Compact Data List View"
                >
                  <Icon icon="game-icons:reception-bell" className="text-base" />
                  <span>LIST</span>
                </button>
              </div>

              {selectedCategory !== "ALL" && (
                <div className="stage-cat-manage-group">
                  <button
                    type="button"
                    className="stage-manage-btn"
                    onClick={() => {
                      setRenameCatTarget(selectedCategory);
                      setRenameCatInput(selectedCategory);
                    }}
                    title={`Rename category "${selectedCategory}"`}
                  >
                    <Icon icon="game-icons:pencil" className="text-sm" />
                    <span>RENAME</span>
                  </button>
                  <button
                    type="button"
                    className="stage-manage-btn danger"
                    onClick={() =>
                      setConfirmDeleteTarget({
                        type: "cat",
                        categoryName: selectedCategory,
                        name: selectedCategory,
                      })
                    }
                    title={`Delete category "${selectedCategory}"`}
                  >
                    <Icon icon="game-icons:trash-can" className="text-sm" />
                    <span>DELETE</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                className="coll-btn-accent-sm"
                onClick={() => openAddGameModal(selectedCategory !== "ALL" ? selectedCategory : null)}
                title={`Add Game to ${selectedCategory !== "ALL" ? selectedCategory : "Library"}`}
              >
                <Icon icon="game-icons:plus" className="text-base" />
                <span>+ ADD TO {selectedCategory !== "ALL" ? selectedCategory.toUpperCase() : "VAULT"}</span>
              </button>
            </div>
          </div>

          {/* Quick Category Horizontal Filter Bar */}
          <div className="stage-category-pills-bar">
            <button
              type="button"
              className={`stage-pill-btn ${selectedCategory === "ALL" ? "active" : ""}`}
              onClick={() => setSelectedCategory("ALL")}
            >
              <Icon icon="game-icons:star-formation" />
              <span>ALL ({totalGamesCount})</span>
            </button>
            {categoriesList.map((cat) => {
              const count = (gamesByCategory[cat] || []).length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`stage-pill-btn ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <Icon icon="game-icons:open-folder" />
                  <span>{cat} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Game Cards or List Container */}
          <div className="collection-gallery-scroll">
            {filteredCategoryGroups.length === 0 ? (
              <div className="collection-empty-stage">
                <div className="empty-icon-circle">
                  <Icon icon="game-icons:retro-controller" className="empty-retro-icon" />
                </div>
                <h3 className="empty-title">NO GAMES FOUND</h3>
                <p className="empty-desc">
                  {searchQuery || onlyWithExecutable
                    ? "No games match your active search terms or executable filters."
                    : `No games in "${selectedCategory}". Click "+ ADD GAME" to add your first title!`}
                </p>
                {(searchQuery || onlyWithExecutable) && (
                  <button
                    type="button"
                    className="empty-clear-btn"
                    onClick={() => {
                      setSearchQuery("");
                      setOnlyWithExecutable(false);
                      setSelectedCategory("ALL");
                    }}
                  >
                    <Icon icon="game-icons:anticlockwise-rotation" />
                    <span>RESET SEARCH FILTERS</span>
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* ================= GRID VIEW: Visual Arcade Cartridge Cards ================= */
              <div className="stage-categories-flow">
                {filteredCategoryGroups.map(({ categoryName, games }) => (
                  <section key={categoryName} className="category-shelf-section">
                    {/* Shelf Banner if browsing ALL */}
                    {selectedCategory === "ALL" && (
                      <div className="category-shelf-banner">
                        <div className="flex items-center gap-2">
                          <Icon icon="game-icons:open-folder" className="text-ui-accent text-lg" />
                          <h3 className="shelf-name">{categoryName}</h3>
                          <span className="shelf-count-pill">{games.length}</span>
                        </div>

                        <button
                          type="button"
                          className="shelf-add-btn"
                          onClick={() => openAddGameModal(categoryName)}
                          title={`Add Game to ${categoryName}`}
                        >
                          <Icon icon="game-icons:plus" className="text-sm" />
                          <span>ADD GAME</span>
                        </button>
                      </div>
                    )}

                    <div className="arcade-games-grid">
                      {games.map(({ game, originalIndex }) => {
                        const hasExe = Boolean(game.executablePath && game.executablePath.trim());
                        const isLaunching = launchingKey === `${categoryName}_${game.name}`;

                        return (
                          <div
                            key={`${categoryName}_${game.name}_${originalIndex}`}
                            className={`arcade-game-card ${hasExe ? "has-exe" : "no-exe"}`}
                          >
                            {/* Card Poster Cover */}
                            <div className="game-card-poster-frame">
                              {(game.verticalArtwork || game.image || game.horizontalArtwork) ? (
                                <img
                                  src={fixAssetPath(game.verticalArtwork || game.image || game.horizontalArtwork)}
                                  alt={game.name}
                                  className="game-card-poster-img"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    if (e.target.nextSibling) {
                                      e.target.nextSibling.style.display = "flex";
                                    }
                                  }}
                                />
                              ) : null}

                              {/* Fallback Artwork when no image */}
                              <div
                                className="game-card-poster-fallback"
                                style={{
                                  display: (game.verticalArtwork || game.image || game.horizontalArtwork)
                                    ? "none"
                                    : "flex",
                                }}
                              >
                                <Icon icon="game-icons:retro-controller" className="poster-fallback-icon" />
                              </div>

                              {/* Category Tag on Poster */}
                              <span className="poster-category-tag">{categoryName}</span>

                              {/* Screenshots Badge Trigger */}
                              {game.screenshots && game.screenshots.length > 0 && (
                                <button
                                  type="button"
                                  className="poster-screenshots-indicator"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveScreenshotIdx(0);
                                    setViewingScreenshotsGame(game);
                                  }}
                                  title={`View ${game.screenshots.length} Screenshots & Artwork`}
                                >
                                  <Icon icon="game-icons:camera" />
                                  <span>{game.screenshots.length} SHOTS</span>
                                </button>
                              )}

                              {/* Status Badge */}
                              <span className={`poster-status-tag ${hasExe ? "ready" : "missing"}`}>
                                <span className="status-dot" />
                                <span>{hasExe ? "READY" : "NO .EXE"}</span>
                              </span>
                            </div>

                            {/* Card Details Body */}
                            <div className="game-card-body-content">
                              <h4 className="card-game-title" title={game.name}>
                                {game.name}
                              </h4>

                              {game.text ? (
                                <p className="card-game-dare-quote" title={game.text}>
                                  "{game.text}"
                                </p>
                              ) : (
                                <p className="card-game-no-dare">No custom dare message</p>
                              )}

                              {/* Executable Path Display */}
                              <div className="card-exe-row">
                                {hasExe ? (
                                  <div className="exe-linked-snippet" title={game.executablePath}>
                                    <Icon icon="game-icons:rocket" className="text-ui-accent text-sm flex-shrink-0" />
                                    <span className="exe-filename-text">
                                      {game.executablePath.split(/[\\/]/).pop()}
                                    </span>
                                    {isElectron && (
                                      <button
                                        type="button"
                                        className="reveal-folder-btn"
                                        onClick={() => openGameFolder(game.executablePath)}
                                        title="Reveal in File Explorer"
                                      >
                                        <Icon icon="game-icons:open-folder" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="exe-unlinked-snippet">
                                    <Icon icon="game-icons:hazard-sign" className="text-muted text-sm" />
                                    <span>No desktop .exe linked</span>
                                  </div>
                                )}
                              </div>

                              {/* Card Action Controls */}
                              <div className="card-actions-bar">
                                {hasExe ? (
                                  <button
                                    type="button"
                                    className="card-launch-btn"
                                    onClick={() => handleLaunchGame(game, categoryName)}
                                    disabled={isLaunching}
                                    title={`Launch ${game.name}`}
                                  >
                                    {isLaunching ? (
                                      <>
                                        <Icon icon="game-icons:anticlockwise-rotation" className="animate-spin text-base" />
                                        <span>LAUNCHING...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Icon icon="game-icons:rocket" className="text-base" />
                                        <span>LAUNCH GAME</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="card-link-exe-btn"
                                    onClick={() => handlePickExecutable(categoryName, originalIndex, game)}
                                    title="Browse and select game executable"
                                  >
                                    <Icon icon="game-icons:open-folder" className="text-base" />
                                    <span>LINK .EXE</span>
                                  </button>
                                )}

                                <div className="card-mini-actions">
                                  {game.screenshots && game.screenshots.length > 0 && (
                                    <button
                                      type="button"
                                      className="card-icon-tool-btn"
                                      onClick={() => {
                                        setActiveScreenshotIdx(0);
                                        setViewingScreenshotsGame(game);
                                      }}
                                      title={`View ${game.screenshots.length} Screenshots`}
                                    >
                                      <Icon icon="game-icons:camera" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="card-icon-tool-btn"
                                    onClick={() => openEditGameModal(categoryName, originalIndex, game)}
                                    title="Edit Game Settings"
                                  >
                                    <Icon icon="game-icons:pencil" />
                                  </button>
                                  <button
                                    type="button"
                                    className="card-icon-tool-btn danger"
                                    onClick={() =>
                                      setConfirmDeleteTarget({
                                        type: "game",
                                        categoryName,
                                        index: originalIndex,
                                        name: game.name,
                                      })
                                    }
                                    title="Delete Game"
                                  >
                                    <Icon icon="game-icons:trash-can" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* ================= LIST VIEW: Compact Data Table ================= */
              <div className="arcade-list-table-container">
                <table className="arcade-list-table">
                  <thead>
                    <tr>
                      <th className="th-cover">ART</th>
                      <th className="th-name">GAME TITLE</th>
                      <th className="th-category">CATEGORY</th>
                      <th className="th-dare">REEL DARE</th>
                      <th className="th-exe">EXECUTABLE LOCATION</th>
                      <th className="th-actions">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategoryGroups.flatMap(({ categoryName, games }) =>
                      games.map(({ game, originalIndex }) => {
                        const hasExe = Boolean(game.executablePath && game.executablePath.trim());
                        const isLaunching = launchingKey === `${categoryName}_${game.name}`;

                        return (
                          <tr key={`${categoryName}_${game.name}_${originalIndex}`} className="table-game-row">
                            <td className="td-cover">
                              <div className="table-thumbnail-box">
                                {(game.horizontalArtwork || game.verticalArtwork || game.image) ? (
                                  <img
                                    src={fixAssetPath(game.horizontalArtwork || game.verticalArtwork || game.image)}
                                    alt={game.name}
                                    className="table-thumb-img"
                                  />
                                ) : (
                                  <Icon icon="game-icons:retro-controller" className="table-thumb-fallback" />
                                )}
                              </div>
                            </td>

                            <td className="td-name">
                              <span className="table-game-name">{game.name}</span>
                            </td>

                            <td className="td-category">
                              <span className="table-cat-badge">{categoryName}</span>
                            </td>

                            <td className="td-dare">
                              <span className="table-dare-text" title={game.text || "None"}>
                                {game.text || "—"}
                              </span>
                            </td>

                            <td className="td-exe">
                              {hasExe ? (
                                <div className="table-exe-box" title={game.executablePath}>
                                  <span className="table-status-dot ready" />
                                  <span className="table-exe-filename">
                                    {game.executablePath.split(/[\\/]/).pop()}
                                  </span>
                                  {isElectron && (
                                    <button
                                      type="button"
                                      className="table-folder-btn"
                                      onClick={() => openGameFolder(game.executablePath)}
                                      title="Open Containing Folder"
                                    >
                                      <Icon icon="game-icons:open-folder" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="table-missing-exe">
                                  <span className="table-status-dot missing" /> No .exe
                                </span>
                              )}
                            </td>

                            <td className="td-actions">
                              <div className="table-actions-cell">
                                {hasExe ? (
                                  <button
                                    type="button"
                                    className="table-launch-btn"
                                    onClick={() => handleLaunchGame(game, categoryName)}
                                    disabled={isLaunching}
                                    title="Launch Executable"
                                  >
                                    <Icon
                                      icon={isLaunching ? "game-icons:anticlockwise-rotation" : "game-icons:rocket"}
                                      className={isLaunching ? "animate-spin" : ""}
                                    />
                                    <span>{isLaunching ? "LAUNCHING" : "LAUNCH"}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="table-link-btn"
                                    onClick={() => handlePickExecutable(categoryName, originalIndex, game)}
                                    title="Link Executable Path"
                                  >
                                    <Icon icon="game-icons:open-folder" />
                                    <span>LINK</span>
                                  </button>
                                )}

                                {game.screenshots && game.screenshots.length > 0 && (
                                  <button
                                    type="button"
                                    className="table-tool-btn"
                                    onClick={() => {
                                      setActiveScreenshotIdx(0);
                                      setViewingScreenshotsGame(game);
                                    }}
                                    title={`View ${game.screenshots.length} Screenshots`}
                                  >
                                    <Icon icon="game-icons:camera" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="table-tool-btn"
                                  onClick={() => openEditGameModal(categoryName, originalIndex, game)}
                                  title="Edit"
                                >
                                  <Icon icon="game-icons:pencil" />
                                </button>

                                <button
                                  type="button"
                                  className="table-tool-btn danger"
                                  onClick={() =>
                                    setConfirmDeleteTarget({
                                      type: "game",
                                      categoryName,
                                      index: originalIndex,
                                      name: game.name,
                                    })
                                  }
                                  title="Delete"
                                >
                                  <Icon icon="game-icons:trash-can" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ================= MODALS (Add / Edit / Delete / Reset) ================= */}

      {/* ================= ADD / EDIT GAME BUILDER STUDIO MODAL ================= */}
      {isGameModalOpen && (
        <div className="collection-modal-overlay" onClick={() => setIsGameModalOpen(false)}>
          <div className="collection-modal-card game-builder-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header-bar">
              <div className="flex items-center gap-3">
                <div className="builder-header-icon-box">
                  <Icon
                    icon={editingGameInfo ? "game-icons:pencil" : "game-icons:game-console"}
                    className="text-ui-accent text-2xl"
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="modal-title">
                    {editingGameInfo ? `EDIT: ${editingGameInfo.game.name.toUpperCase()}` : "ADD NEW GAME TO ARCADE VAULT"}
                  </h3>
                  <span className="builder-header-subtitle">
                    Scrape official artwork & screenshots, configure executable, and set slot dare challenges.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-x-btn"
                onClick={() => setIsGameModalOpen(false)}
                title="Close modal (Esc)"
              >
                <Icon icon="game-icons:cross-mark" />
              </button>
            </div>

            <form onSubmit={handleSaveGame} className="builder-form-wrapper">
              <div className="game-builder-split-body">
                {/* ================= LEFT COLUMN: SETUP & ONLINE SCRAPER ================= */}
                <div className="game-builder-left-col">
                  {/* Public Database Scraper Card (Steam -> IGDB -> Open Game DB) */}
                  <div className="scraper-action-card">
                    <div className="scraper-card-header">
                      <div className="flex items-center gap-2">
                        <Icon icon="game-icons:satellite-communication" className="text-ui-accent text-lg" />
                        <span className="scraper-card-title">GAME DATABASE SCRAPER</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="scraper-config-toggle-btn"
                          onClick={() => setShowDbConfigDrawer(!showDbConfigDrawer)}
                          title="Optional IGDB (Twitch API) Settings"
                        >
                          <Icon icon="game-icons:gears" />
                          <span>{showDbConfigDrawer ? "HIDE KEYS" : "IGDB KEYS"}</span>
                        </button>
                        <span
                          className={`scraper-badge ${dbSearchProvider === "IGDB"
                            ? "igdb"
                            : dbSearchProvider === "OPEN_DB"
                              ? "open"
                              : ""
                            }`}
                        >
                          {dbSearchProvider === "IGDB"
                            ? "🟣 IGDB"
                            : dbSearchProvider === "OPEN_DB"
                              ? "🌐 OPEN DB"
                              : dbSearchProvider === "STEAM"
                                ? "🎮 STEAM DB"
                                : "STEAM & OPEN DB"}
                        </span>
                      </div>
                    </div>

                    {/* Optional IGDB (Twitch) Configuration Drawer */}
                    {showDbConfigDrawer && (
                      <div className="scraper-db-config-drawer">
                        <div className="scraper-config-header">
                          <span className="text-xs font-mono font-bold text-ui-accent flex items-center gap-1">
                            <Icon icon="game-icons:key" /> OPTIONAL IGDB (TWITCH API) CREDENTIALS
                          </span>
                          <span className="text-[0.66rem] text-muted font-mono">
                            Steam & Open DB work with zero keys!
                          </span>
                        </div>
                        <p className="text-[0.7rem] text-muted leading-tight mt-1 mb-2">
                          If you have a Twitch Developer account, enter your Client ID & Secret to query IGDB v4 directly. If omitted, Darepot seamlessly falls back to Steam and the Open Video Game Database.
                        </p>
                        <div className="scraper-config-inputs-row">
                          <input
                            type="text"
                            className="builder-text-input text-xs font-mono"
                            placeholder="Twitch Client ID (e.g. gp762...)"
                            value={igdbClientId}
                            onChange={(e) => setIgdbClientId(e.target.value)}
                          />
                          <input
                            type="password"
                            className="builder-text-input text-xs font-mono"
                            placeholder="Twitch Client Secret..."
                            value={igdbClientSecret}
                            onChange={(e) => setIgdbClientSecret(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[0.66rem] text-muted font-mono">
                            {igdbClientId ? "✓ IGDB Credentials configured" : "Open Game Database fallback active"}
                          </span>
                          <button
                            type="button"
                            className="scraper-save-keys-btn"
                            onClick={handleSaveIgdbKeys}
                          >
                            SAVE CREDENTIALS
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="scraper-card-desc">
                      Search titles on <strong>Steam Store</strong>, <strong>IGDB</strong>, or the <strong>Open Video Game Database</strong> (console, retro & non-Steam titles like <em>Mario</em>, <em>Zelda</em>, <em>Bloodborne</em>, <em>Minecraft</em>).
                    </p>

                    <div className="scraper-input-row">
                      <div className="scraper-input-wrap">
                        <Icon icon="game-icons:magnifying-glass" className="scraper-search-icon" />
                        <input
                          type="text"
                          className="scraper-search-input"
                          placeholder="Search game (e.g. Hades, Bloodborne, Zelda, Hollow Knight)..."
                          value={gameFormData.name}
                          onChange={(e) => setGameFormData({ ...gameFormData, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSearchDatabase();
                            }
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        className="scraper-fetch-btn"
                        onClick={() => handleSearchDatabase()}
                        disabled={isSearchingDb}
                        title="Auto-search Steam Store with Open DB fallback"
                      >
                        {isSearchingDb ? (
                          <>
                            <Icon icon="game-icons:anticlockwise-rotation" className="animate-spin text-base" />
                            <span>FETCHING...</span>
                          </>
                        ) : (
                          <>
                            <Icon icon="game-icons:sparkles" className="text-base text-yellow-300" />
                            <span>FETCH ARTWORK</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="scraper-open-btn"
                        onClick={() => handleSearchDatabase(null, "open")}
                        disabled={isSearchingDb}
                        title="Directly query Open Video Game Database (Wikipedia / Wikimedia archives)"
                      >
                        <Icon icon="game-icons:globe" className="text-base text-cyan-300" />
                        <span>OPEN DB</span>
                      </button>
                    </div>

                    {/* Scraper Error Warning */}
                    {dbSearchError && (
                      <div className="scraper-error-banner">
                        <Icon icon="game-icons:hazard-sign" className="text-base flex-shrink-0" />
                        <span>{dbSearchError}</span>
                      </div>
                    )}

                    {/* Scraper Results Grid */}
                    {dbSearchResults.length > 0 && (
                      <div className="scraper-results-container">
                        <div className="scraper-results-header">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-ui-accent">
                              MATCHES ({dbSearchResults.length} FOUND VIA {dbSearchProvider || "DATABASE"}):
                            </span>
                            {dbSearchProvider === "STEAM" && (
                              <button
                                type="button"
                                className="scraper-retry-open-btn"
                                onClick={() => handleSearchDatabase(null, "open")}
                                title="Not the title you wanted? Search Open Game Database"
                              >
                                Not on Steam? Try Open DB →
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            className="text-xs text-muted hover:text-white"
                            onClick={() => setDbSearchResults([])}
                          >
                            Dismiss
                          </button>
                        </div>
                        <div className="scraper-results-grid">
                          {dbSearchResults.map((match) => (
                            <div key={match.id} className="scraper-match-card">
                              <div className="relative">
                                <img
                                  src={match.horizontalArtwork || match.verticalArtwork}
                                  alt={match.name}
                                  className="scraper-match-img"
                                />
                                <span
                                  className={`scraper-card-source-badge ${match.source === "IGDB"
                                    ? "igdb"
                                    : match.source === "OPEN_DB"
                                      ? "open"
                                      : "steam"
                                    }`}
                                >
                                  {match.source === "IGDB"
                                    ? "IGDB"
                                    : match.source === "OPEN_DB"
                                      ? "OPEN DB"
                                      : "STEAM"}
                                </span>
                              </div>
                              <div className="scraper-match-info">
                                <span className="scraper-match-name" title={match.name}>
                                  {match.name}
                                </span>
                                <div className="flex items-center justify-between gap-1 mt-1">
                                  {match.screenshots?.length > 0 ? (
                                    <span className="scraper-match-pill">
                                      📷 {match.screenshots.length} shots
                                    </span>
                                  ) : (
                                    <span className="text-[0.62rem] text-muted font-mono">Box cover only</span>
                                  )}
                                  <button
                                    type="button"
                                    className="scraper-apply-btn"
                                    onClick={() => handleApplyDbGame(match)}
                                  >
                                    <Icon icon="game-icons:check-mark" /> USE ARTWORK
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Category Selection */}
                  <div className="builder-field-group">
                    <div className="flex items-center justify-between mb-1">
                      <label className="builder-label">
                        CATEGORY <span className="req">*</span>
                      </label>
                      {categoriesList.length > 0 && (
                        <button
                          type="button"
                          className="builder-inline-link"
                          onClick={() => setIsCustomCategoryInput(!isCustomCategoryInput)}
                        >
                          {isCustomCategoryInput ? "← Select existing category" : "+ Create custom category"}
                        </button>
                      )}
                    </div>
                    {isCustomCategoryInput || categoriesList.length === 0 ? (
                      <input
                        type="text"
                        className="builder-text-input"
                        placeholder="Enter category name (e.g. Action, Roguelike, Horror)..."
                        value={gameFormData.categoryName}
                        onChange={(e) => setGameFormData({ ...gameFormData, categoryName: e.target.value })}
                        required
                      />
                    ) : (
                      <select
                        className="builder-select-input"
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

                  {/* Desktop Executable Launcher Setup */}
                  <div className="builder-field-group">
                    <label className="builder-label">
                      <span>DESKTOP EXECUTABLE / SHORTCUT (.EXE, .LNK, .BAT)</span>
                      <span className="builder-hint">Select the game executable on your PC to enable 1-click launch from the Darepot reels</span>
                    </label>
                    <div className="builder-exe-picker-row">
                      <input
                        type="text"
                        className="builder-text-input font-mono text-xs"
                        placeholder="C:\Program Files (x86)\Steam\steamapps\common\Game\game.exe"
                        value={gameFormData.executablePath}
                        onChange={(e) => setGameFormData({ ...gameFormData, executablePath: e.target.value })}
                      />
                      {isElectron && (
                        <button
                          type="button"
                          className="builder-browse-file-btn"
                          onClick={() => handlePickExecutable()}
                          title="Browse PC for executable file"
                        >
                          <Icon icon="game-icons:open-folder" className="text-base text-ui-accent" />
                          <span>BROWSE .EXE</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Launch Arguments */}
                  <div className="builder-field-group">
                    <label className="builder-label">
                      <span>COMMAND-LINE ARGUMENTS (OPTIONAL)</span>
                      <span className="builder-hint">Extra parameters passed when launching (e.g. -fullscreen -novid)</span>
                    </label>
                    <input
                      type="text"
                      className="builder-text-input font-mono text-xs"
                      placeholder="-fullscreen -dx11"
                      value={gameFormData.launchArgs}
                      onChange={(e) => setGameFormData({ ...gameFormData, launchArgs: e.target.value })}
                    />
                  </div>

                  {/* Reel Dare Challenge */}
                  <div className="builder-field-group">
                    <label className="builder-label">
                      <span>REEL DARE / CHALLENGE TASK</span>
                      <span className="builder-hint">Fun challenge presented when this title is hit on the slot machine</span>
                    </label>
                    <input
                      type="text"
                      className="builder-text-input"
                      placeholder="e.g. Complete the next level with pistols only..."
                      value={gameFormData.text}
                      onChange={(e) => setGameFormData({ ...gameFormData, text: e.target.value })}
                    />

                    {/* Dare Suggestion Chips */}
                    <div className="builder-suggestion-chips-row">
                      <span className="text-[0.68rem] text-muted font-mono">QUICK IDEAS:</span>
                      {[
                        "No healing allowed",
                        "Speedrun 10 minutes",
                        "Basic weapons only",
                        "Zero deaths challenge",
                        "Blindfolded for 1 min",
                      ].map((idea) => (
                        <button
                          key={idea}
                          type="button"
                          className="builder-chip-btn"
                          onClick={() => setGameFormData({ ...gameFormData, text: idea })}
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ================= RIGHT COLUMN: MEDIA & ARTWORK STUDIO ================= */}
                <div className="game-builder-right-col">
                  <div className="studio-section-header">
                    <Icon icon="game-icons:palette" className="text-ui-accent text-lg" />
                    <span className="studio-section-title">ARTWORK & MEDIA STUDIO</span>
                  </div>

                  {/* Vertical Artwork (Portrait Box Cover 600x900) */}
                  <div className="artwork-preview-card">
                    <div className="artwork-card-label-bar">
                      <span className="artwork-card-label">1. VERTICAL BOX ARTWORK (PORTRAIT)</span>
                      <span className="artwork-dim-tag">600 × 900 (2:3)</span>
                    </div>

                    <div className="artwork-vertical-frame">
                      {gameFormData.verticalArtwork || gameFormData.image ? (
                        <img
                          src={fixAssetPath(gameFormData.verticalArtwork || gameFormData.image)}
                          alt="Vertical Cover Preview"
                          className="artwork-vertical-img"
                          onError={(e) => (e.target.style.opacity = "0.3")}
                        />
                      ) : (
                        <div className="artwork-fallback-placeholder">
                          <Icon icon="game-icons:retro-controller" className="text-4xl text-muted" />
                          <span className="text-xs text-muted font-mono mt-2">NO PORTRAIT COVER</span>
                        </div>
                      )}
                    </div>

                    <div className="artwork-input-group">
                      <input
                        type="text"
                        className="builder-text-input text-xs font-mono"
                        placeholder="https://.../library_600x900.jpg"
                        value={gameFormData.verticalArtwork}
                        onChange={(e) =>
                          setGameFormData({
                            ...gameFormData,
                            verticalArtwork: e.target.value,
                            image: e.target.value || gameFormData.image,
                          })
                        }
                      />
                      {gameFormData.verticalArtwork && (
                        <button
                          type="button"
                          className="artwork-clear-btn"
                          onClick={() => setGameFormData({ ...gameFormData, verticalArtwork: "" })}
                          title="Clear vertical artwork"
                        >
                          <Icon icon="game-icons:cross-mark" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Banner Artwork (Landscape 16:9) */}
                  <div className="artwork-preview-card">
                    <div className="artwork-card-label-bar">
                      <span className="artwork-card-label">2. HORIZONTAL BANNER (LANDSCAPE)</span>
                      <span className="artwork-dim-tag">16:9 / HEADER</span>
                    </div>

                    <div className="artwork-horizontal-frame">
                      {gameFormData.horizontalArtwork ? (
                        <img
                          src={fixAssetPath(gameFormData.horizontalArtwork)}
                          alt="Horizontal Banner Preview"
                          className="artwork-horizontal-img"
                          onError={(e) => (e.target.style.opacity = "0.3")}
                        />
                      ) : (
                        <div className="artwork-fallback-placeholder">
                          <Icon icon="game-icons:tabletop-scene" className="text-3xl text-muted" />
                          <span className="text-xs text-muted font-mono mt-1">NO BANNER ARTWORK</span>
                        </div>
                      )}
                    </div>

                    <div className="artwork-input-group">
                      <input
                        type="text"
                        className="builder-text-input text-xs font-mono"
                        placeholder="https://.../header.jpg"
                        value={gameFormData.horizontalArtwork}
                        onChange={(e) =>
                          setGameFormData({ ...gameFormData, horizontalArtwork: e.target.value })
                        }
                      />
                      {gameFormData.horizontalArtwork && (
                        <button
                          type="button"
                          className="artwork-clear-btn"
                          onClick={() => setGameFormData({ ...gameFormData, horizontalArtwork: "" })}
                          title="Clear horizontal artwork"
                        >
                          <Icon icon="game-icons:cross-mark" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Screenshots Showcase */}
                  <div className="artwork-preview-card">
                    <div className="artwork-card-label-bar">
                      <span className="artwork-card-label">
                        3. SCREENSHOTS GALLERY ({gameFormData.screenshots?.length || 0})
                      </span>
                      <span className="artwork-dim-tag">GAMEPLAY PREVIEWS</span>
                    </div>

                    {gameFormData.screenshots && gameFormData.screenshots.length > 0 ? (
                      <div className="screenshots-mini-grid">
                        {gameFormData.screenshots.map((shot, idx) => (
                          <div key={idx} className="screenshot-thumb-item">
                            <img src={fixAssetPath(shot)} alt={`Screenshot ${idx + 1}`} className="screenshot-thumb-img" />
                            <button
                              type="button"
                              className="screenshot-remove-btn"
                              onClick={() => handleRemoveScreenshot(idx)}
                              title="Remove screenshot"
                            >
                              <Icon icon="game-icons:cross-mark" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted font-mono italic my-1">
                        No screenshots attached yet. Use the online scraper or add image URLs below!
                      </p>
                    )}

                    <div className="add-screenshot-row">
                      <input
                        type="text"
                        className="builder-text-input text-xs font-mono"
                        placeholder="Add image URL https://..."
                        value={newScreenshotInput}
                        onChange={(e) => setNewScreenshotInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddScreenshot();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="add-screenshot-btn"
                        onClick={handleAddScreenshot}
                      >
                        <Icon icon="game-icons:plus" />
                        <span>ADD</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-footer-actions">
                <div className="footer-helper-text">
                  <Icon icon="game-icons:info" className="text-ui-accent text-base" />
                  <span>Both portrait covers and landscape banners are saved directly to your local Darepot catalog.</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="modal-btn modal-btn-secondary"
                    onClick={() => setIsGameModalOpen(false)}
                  >
                    CANCEL (ESC)
                  </button>
                  <button type="submit" className="modal-btn modal-btn-primary">
                    <Icon icon="game-icons:check-mark" className="text-base" />
                    <span>{editingGameInfo ? "SAVE CONFIGURATION" : "ADD GAME TO VAULT"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SCREENSHOTS LIGHTBOX VIEWER ================= */}
      {viewingScreenshotsGame && (
        <div className="collection-modal-overlay" onClick={() => setViewingScreenshotsGame(null)}>
          <div className="collection-modal-card screenshots-viewer-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div className="flex items-center gap-2">
                <Icon icon="game-icons:camera" className="text-ui-accent text-xl" />
                <h3 className="modal-title">{viewingScreenshotsGame.name} - SCREENSHOT GALLERY</h3>
                <span className="stage-game-count-badge">
                  {viewingScreenshotsGame.screenshots?.length || 0} PHOTOS
                </span>
              </div>
              <button
                type="button"
                className="modal-close-x-btn"
                onClick={() => setViewingScreenshotsGame(null)}
              >
                <Icon icon="game-icons:cross-mark" />
              </button>
            </div>

            <div className="screenshots-viewer-body">
              {viewingScreenshotsGame.screenshots && viewingScreenshotsGame.screenshots.length > 0 ? (
                <>
                  <div className="screenshot-main-display">
                    <img
                      src={fixAssetPath(
                        viewingScreenshotsGame.screenshots[activeScreenshotIdx] ||
                        viewingScreenshotsGame.screenshots[0]
                      )}
                      alt="Game Screenshot Full"
                      className="screenshot-main-img"
                    />
                  </div>
                  <div className="screenshot-thumbnails-strip">
                    {viewingScreenshotsGame.screenshots.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`screenshot-strip-thumb ${idx === activeScreenshotIdx ? "active" : ""}`}
                        onClick={() => setActiveScreenshotIdx(idx)}
                      >
                        <img src={fixAssetPath(s)} alt={`Thumb ${idx}`} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted">No screenshots available for this game.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {isNewCatModalOpen && (
        <div className="collection-modal-overlay" onClick={() => setIsNewCatModalOpen(false)}>
          <div className="collection-modal-card sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div className="flex items-center gap-2">
                <Icon icon="game-icons:open-folder" className="text-ui-accent text-xl" />
                <h3 className="modal-title">CREATE NEW CATEGORY</h3>
              </div>
              <button
                type="button"
                className="modal-close-x-btn"
                onClick={() => setIsNewCatModalOpen(false)}
              >
                <Icon icon="game-icons:cross-mark" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="modal-form">
              <div className="modal-form-scroll-body">
                <div className="modal-form-row">
                  <label className="modal-input-label">CATEGORY NAME</label>
                  <input
                    type="text"
                    className="modal-text-input"
                    placeholder="e.g. Rogue-like, Speedruns, Horror Classic..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="modal-btn modal-btn-secondary"
                  onClick={() => setIsNewCatModalOpen(false)}
                >
                  CANCEL
                </button>
                <button type="submit" className="modal-btn modal-btn-primary">
                  CREATE CATEGORY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Category Modal */}
      {renameCatTarget && (
        <div className="collection-modal-overlay" onClick={() => setRenameCatTarget(null)}>
          <div className="collection-modal-card sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div className="flex items-center gap-2">
                <Icon icon="game-icons:pencil" className="text-ui-accent text-xl" />
                <h3 className="modal-title">RENAME CATEGORY</h3>
              </div>
              <button
                type="button"
                className="modal-close-x-btn"
                onClick={() => setRenameCatTarget(null)}
              >
                <Icon icon="game-icons:cross-mark" />
              </button>
            </div>
            <form onSubmit={handleRenameCategorySubmit} className="modal-form">
              <div className="modal-form-scroll-body">
                <div className="modal-form-row">
                  <label className="modal-input-label">NEW NAME FOR "{renameCatTarget.toUpperCase()}"</label>
                  <input
                    type="text"
                    className="modal-text-input"
                    value={renameCatInput}
                    onChange={(e) => setRenameCatInput(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="modal-btn modal-btn-secondary"
                  onClick={() => setRenameCatTarget(null)}
                >
                  CANCEL
                </button>
                <button type="submit" className="modal-btn modal-btn-primary">
                  SAVE NAME
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteTarget && (
        <div className="collection-modal-overlay" onClick={() => setConfirmDeleteTarget(null)}>
          <div className="collection-modal-card sm danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar danger">
              <div className="flex items-center gap-2">
                <Icon icon="game-icons:trash-can" className="text-ui-cursed text-xl" />
                <h3 className="modal-title">CONFIRM DELETION</h3>
              </div>
              <button
                type="button"
                className="modal-close-x-btn"
                onClick={() => setConfirmDeleteTarget(null)}
              >
                <Icon icon="game-icons:cross-mark" />
              </button>
            </div>
            <div className="modal-form-scroll-body">
              <p className="delete-confirm-prompt">
                Are you sure you want to delete{" "}
                <strong className="text-white">
                  {confirmDeleteTarget.type === "cat"
                    ? `the entire category "${confirmDeleteTarget.name}"`
                    : `"${confirmDeleteTarget.name}"`}
                </strong>
                ?
              </p>
              {confirmDeleteTarget.type === "cat" && (
                <div className="delete-hazard-warning">
                  <Icon icon="game-icons:hazard-sign" className="text-lg flex-shrink-0" />
                  <span>Warning: This will delete all games currently inside this category!</span>
                </div>
              )}
            </div>
            <div className="modal-footer-actions">
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={() => setConfirmDeleteTarget(null)}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-danger"
                onClick={executeDelete}
              >
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="collection-modal-overlay" onClick={() => setIsResetConfirmOpen(false)}>
          <div className="collection-modal-card sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div className="flex items-center gap-2">
                <Icon icon="game-icons:anticlockwise-rotation" className="text-ui-accent text-xl" />
                <h3 className="modal-title">RESTORE DEFAULT CATALOG</h3>
              </div>
              <button
                type="button"
                className="modal-close-x-btn"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                <Icon icon="game-icons:cross-mark" />
              </button>
            </div>
            <div className="modal-form-scroll-body">
              <p className="reset-confirm-prompt">
                Are you sure you want to reset your game catalog back to factory defaults? Custom categories and executable paths will be overwritten.
              </p>
            </div>
            <div className="modal-footer-actions">
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-primary"
                onClick={handleResetDefaults}
              >
                RESTORE DEFAULTS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
