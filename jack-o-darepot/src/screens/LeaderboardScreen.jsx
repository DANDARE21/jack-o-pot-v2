import React, { useState, useMemo, useEffect } from "react";
import { useGame } from "@/context";
import { useNavigation, SCREENS } from "@/navigation";
import { useElectron } from "@/hooks";
import { Icon } from "@iconify/react";
import { Howl } from "howler";
import "./LeaderboardScreen.css";

const PRESET_AVATARS = [
  { label: "DanDare", src: "/assets/images/dandare.png" },
  { label: "The Beast", src: "/assets/images/six.png" },
  { label: "Vault Placeholder", src: "/assets/images/placeholder.svg" },
];

const PRESET_TITLES = [
  "Reel Overlord",
  "Dare Queen",
  "Arcade Gambler",
  "Curse Survivor",
  "Daredevil",
  "Pumpkin Monarch",
  "Slot Fiend",
  "High Roller",
  "Shadow Walker",
  "The Unflinching",
];

export default function LeaderboardScreen() {
  const {
    players = [],
    addPlayer,
    updatePlayer,
    deletePlayer,
    adjustPlayerStats,
    recordChallengeOutcome,
    resetAllPlayerStats,
    resetPlayersToDefault,
  } = useGame();

  const { goBack, navigate } = useNavigation();
  const { showNotification, beep, exportJsonFile, importJsonFile } = useElectron();

  // Search & Sorting States
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("points"); // 'points' | 'spins' | 'beaten' | 'lost' | 'winrate' | 'name'
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'
  const [notice, setNotice] = useState(null);

  // Challenges list for quick logging
  const [availableChallenges, setAvailableChallenges] = useState([]);

  useEffect(() => {
    fetch("/data/challenges.json")
      .then((res) => res.json())
      .then((data) => {
        if (data?.challenges && Array.isArray(data.challenges)) {
          setAvailableChallenges(data.challenges);
        }
      })
      .catch(() => {});
  }, []);

  const showNotice = (type, message) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const playClickSound = (freq = 1.0) => {
    try {
      const sound = new Howl({
        src: ["/assets/sounds/reel-stop.mp3"],
        volume: 0.6,
      });
      sound.rate(freq);
      sound.play();
    } catch (e) {
      // Audio fallback
    }
  };

  // Modals
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isEditPlayerModalOpen, setIsEditPlayerModalOpen] = useState(false);
  const [isLogDareModalOpen, setIsLogDareModalOpen] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);

  // Active Player being Edited or Viewed in Dossier
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Add/Edit Player Form Data
  const [playerFormData, setPlayerFormData] = useState({
    name: "",
    customTitle: "",
    image: "",
    sound: "",
    points: 100,
    spins: 0,
    beatenChallenges: 0,
    lostChallenges: 0,
  });

  // Log Dare Form Data
  const [logDareFormData, setLogDareFormData] = useState({
    playerName: "",
    dareName: "",
    customDare: "",
    won: true,
    pointsAwarded: 50,
  });

  // Compute Enriched & Sorted Players
  const processedPlayers = useMemo(() => {
    const list = players.map((p) => {
      const beaten = Number(p.beatenChallenges || 0);
      const lost = Number(p.lostChallenges || 0);
      const totalPlayed = beaten + lost;
      const winRate = totalPlayed > 0 ? Math.round((beaten / totalPlayed) * 100) : 0;
      return {
        ...p,
        points: Number(p.points || 0),
        spins: Number(p.spins || 0),
        beatenChallenges: beaten,
        lostChallenges: lost,
        totalPlayed,
        winRate,
        streak: Number(p.streak || 0),
        bestStreak: Number(p.bestStreak || 0),
      };
    });

    // Filter by search query
    const q = searchQuery.toLowerCase().trim();
    const filtered = list.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.customTitle && p.customTitle.toLowerCase().includes(q))
      );
    });

    // Sort
    return filtered.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case "spins":
          valA = a.spins;
          valB = b.spins;
          break;
        case "beaten":
          valA = a.beatenChallenges;
          valB = b.beatenChallenges;
          break;
        case "lost":
          valA = a.lostChallenges;
          valB = b.lostChallenges;
          break;
        case "winrate":
          valA = a.winRate;
          valB = b.winRate;
          break;
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "points":
        default:
          valA = a.points;
          valB = b.points;
          break;
      }

      if (sortOrder === "asc") {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
  }, [players, searchQuery, sortBy, sortOrder]);

  // Top 3 Podium Players (by Points)
  const podiumPlayers = useMemo(() => {
    const sortedByPoints = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
    return {
      first: sortedByPoints[0] || null,
      second: sortedByPoints[1] || null,
      third: sortedByPoints[2] || null,
    };
  }, [players]);

  // Overall Global Statistics
  const globalStats = useMemo(() => {
    const totalPlayers = players.length;
    const totalPoints = players.reduce((sum, p) => sum + (p.points || 0), 0);
    const totalSpins = players.reduce((sum, p) => sum + (p.spins || 0), 0);
    const totalBeaten = players.reduce((sum, p) => sum + (p.beatenChallenges || 0), 0);
    const totalLost = players.reduce((sum, p) => sum + (p.lostChallenges || 0), 0);
    const totalDares = totalBeaten + totalLost;
    const overallWinRate = totalDares > 0 ? Math.round((totalBeaten / totalDares) * 100) : 0;

    return {
      totalPlayers,
      totalPoints,
      totalSpins,
      totalBeaten,
      totalLost,
      overallWinRate,
    };
  }, [players]);

  // Sort Toggle Handler
  const handleSortChange = (newSortBy) => {
    playClickSound(1.2);
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
  };

  // Open Add Player Modal
  const openAddPlayerModal = () => {
    playClickSound();
    setPlayerFormData({
      name: "",
      customTitle: PRESET_TITLES[Math.floor(Math.random() * PRESET_TITLES.length)],
      image: "",
      sound: "",
      points: 100,
      spins: 0,
      beatenChallenges: 0,
      lostChallenges: 0,
    });
    setIsAddPlayerModalOpen(true);
  };

  // Open Edit Player Modal
  const openEditPlayerModal = (player) => {
    playClickSound();
    setSelectedPlayer(player);
    setPlayerFormData({
      name: player.name || "",
      customTitle: player.customTitle || "",
      image: player.image || "",
      sound: player.sound || "",
      points: player.points || 0,
      spins: player.spins || 0,
      beatenChallenges: player.beatenChallenges || 0,
      lostChallenges: player.lostChallenges || 0,
    });
    setIsEditPlayerModalOpen(true);
  };

  // Open Dossier Modal
  const openDossierModal = (player) => {
    playClickSound(1.1);
    setSelectedPlayer(player);
    setIsDossierModalOpen(true);
  };

  // Open Quick Dare Log Modal
  const openLogDareModal = (player = null) => {
    playClickSound();
    const defaultPlayerName = player ? player.name : players[0]?.name || "";
    const firstDare = availableChallenges[0]?.name || "The Trial of Fate";
    setLogDareFormData({
      playerName: defaultPlayerName,
      dareName: firstDare,
      customDare: "",
      won: true,
      pointsAwarded: 50,
    });
    setIsLogDareModalOpen(true);
  };

  // Save New Player
  const handleSaveNewPlayer = (e) => {
    e.preventDefault();
    const res = addPlayer(playerFormData);
    if (res.success) {
      showNotice("success", `Registered "${playerFormData.name}" to the Hall of Fate!`);
      showNotification?.({
        title: "Player Registered",
        body: `${playerFormData.name} joined the Hall of Fate!`,
      });
      setIsAddPlayerModalOpen(false);
    } else {
      alert(res.error || "Failed to register player");
    }
  };

  // Update Player
  const handleUpdatePlayer = (e) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    const res = updatePlayer(selectedPlayer.id || selectedPlayer.name, playerFormData);
    if (res.success) {
      showNotice("success", `Updated stats for ${playerFormData.name}.`);
      setIsEditPlayerModalOpen(false);
    } else {
      alert("Failed to update player stats.");
    }
  };

  // Quick Inline Stat Adjustment
  const handleAdjustStats = (playerName, deltas, message = "") => {
    playClickSound(1.3);
    adjustPlayerStats(playerName, deltas);
    if (message) {
      showNotice("info", `${playerName}: ${message}`);
    }
  };

  // Submit Dare Outcome
  const handleLogDareOutcome = (e) => {
    e.preventDefault();
    const { playerName, dareName, customDare, won, pointsAwarded } = logDareFormData;
    if (!playerName) {
      alert("Please select a player.");
      return;
    }
    const finalDareName = customDare.trim() || dareName || "Custom Dare";
    recordChallengeOutcome(playerName, {
      won,
      points: Number(pointsAwarded) || 0,
      dareName: finalDareName,
    });

    if (won) {
      playClickSound(1.5);
      showNotice("success", `👑 VICTORY! ${playerName} conquered "${finalDareName}" (+${pointsAwarded} pts)!`);
      showNotification?.({
        title: "Dare Conquered!",
        body: `${playerName} conquered "${finalDareName}" (+${pointsAwarded} pts)!`,
      });
    } else {
      beep?.();
      showNotice("cursed", `💀 DEFEAT! ${playerName} failed "${finalDareName}".`);
      showNotification?.({
        title: "Dare Failed",
        body: `${playerName} failed "${finalDareName}".`,
      });
    }

    setIsLogDareModalOpen(false);
  };

  // Confirm Delete Player
  const handleDeletePlayer = () => {
    if (!playerToDelete) return;
    deletePlayer(playerToDelete.id || playerToDelete.name);
    showNotice("info", `Removed ${playerToDelete.name} from the roster.`);
    setPlayerToDelete(null);
  };

  // Export Leaderboard JSON
  const handleExportData = async () => {
    playClickSound();
    await exportJsonFile?.(players, "jack-o-pot-leaderboard.json");
  };

  // Import Leaderboard JSON
  const handleImportData = async () => {
    playClickSound();
    const res = await importJsonFile?.({ title: "Import Leaderboard Players JSON" });
    if (res?.data && Array.isArray(res.data)) {
      localStorage.setItem("jack_o_pot_players", JSON.stringify(res.data));
      window.location.reload();
    } else if (res?.error) {
      alert("Import error: " + res.error);
    }
  };

  return (
    <div className="leaderboard-screen">
      {/* Screen Header */}
      <header className="leaderboard-header">
        <div className="leaderboard-header-left">
          <button
            className="lead-btn lead-btn-secondary lead-btn-sm"
            onClick={goBack}
            title="Return to Game Reels (Esc)"
          >
            <Icon icon="game-icons:anticlockwise-rotation" className="text-ui-accent inline-block text-base mr-1" />
            Back to Reels
          </button>

          <div className="leaderboard-title-wrap">
            <div className="leaderboard-title-main">
              <Icon icon="game-icons:trophy" className="leaderboard-title-icon text-ui-accent text-3xl" />
              <h1 className="leaderboard-title">HALL OF FATE • LEADERBOARD</h1>
            </div>
            <p className="leaderboard-subtitle">
              Glory, spins, dares conquered, and session statistics of all registered players
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="leaderboard-header-actions">
          <button
            className="lead-btn lead-btn-primary"
            onClick={openAddPlayerModal}
            title="Register a new player"
          >
            <Icon icon="game-icons:hood" className="text-base inline-block mr-1" />
            + New Player
          </button>

          <button
            className="lead-btn lead-btn-secondary"
            onClick={() => openLogDareModal()}
            title="Quickly record dare outcome"
          >
            <Icon icon="game-icons:sword-brandish" className="text-ui-accent inline-block mr-1 text-base" />
            Log Challenge Result
          </button>

          <div className="lead-btn-group">
            <button
              className="lead-btn lead-btn-secondary lead-btn-sm"
              onClick={handleExportData}
              title="Export leaderboard JSON"
            >
              <Icon icon="game-icons:save" className="text-ui-accent text-sm mr-1" /> Export
            </button>
            <button
              className="lead-btn lead-btn-secondary lead-btn-sm"
              onClick={handleImportData}
              title="Import leaderboard JSON"
            >
              <Icon icon="game-icons:upgrade" className="text-ui-accent text-sm mr-1" /> Import
            </button>
          </div>

          <button
            className="lead-btn lead-btn-danger lead-btn-sm"
            onClick={() => setIsResetConfirmModalOpen(true)}
            title="Reset player stats"
          >
            <Icon icon="game-icons:recycle" className="text-base inline-block mr-1" />
            Reset
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div className={`lead-notice-bar ${notice.type}`}>
          <div className="flex items-center gap-2">
            <Icon
              icon={
                notice.type === "success"
                  ? "game-icons:check-mark"
                  : notice.type === "cursed"
                  ? "game-icons:skull-crossed-bones"
                  : "game-icons:info"
              }
              className="text-lg"
            />
            <span>{notice.message}</span>
          </div>
          <button className="lead-notice-close" onClick={() => setNotice(null)}>
            <Icon icon="game-icons:cancel" className="text-base" />
          </button>
        </div>
      )}

      {/* Global Stat Cards Grid */}
      <section className="leaderboard-stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon-wrap">
            <Icon icon="game-icons:crowd" className="stat-card-icon text-ui-accent" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">REGISTERED PLAYERS</span>
            <span className="stat-card-value">{globalStats.totalPlayers}</span>
          </div>
        </div>

        <div className="stat-card highlight-gold">
          <div className="stat-card-icon-wrap">
            <Icon icon="game-icons:laurel-crown" className="stat-card-icon text-amber-400" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">TOTAL HALL POINTS</span>
            <span className="stat-card-value font-mono">{globalStats.totalPoints.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon-wrap">
            <Icon icon="game-icons:slot-machine" className="stat-card-icon text-ui-accent" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">TOTAL SPINS</span>
            <span className="stat-card-value font-mono">{globalStats.totalSpins}</span>
          </div>
        </div>

        <div className="stat-card highlight-green">
          <div className="stat-card-icon-wrap">
            <Icon icon="game-icons:shield-reflect" className="stat-card-icon text-emerald-400" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">DARES CONQUERED</span>
            <span className="stat-card-value text-emerald-400 font-mono">{globalStats.totalBeaten}</span>
          </div>
        </div>

        <div className="stat-card highlight-crimson">
          <div className="stat-card-icon-wrap">
            <Icon icon="game-icons:death-skull" className="stat-card-icon text-ui-cursed" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">DARES LOST</span>
            <span className="stat-card-value text-ui-cursed font-mono">{globalStats.totalLost}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon-wrap">
            <Icon icon="game-icons:bullseye" className="stat-card-icon text-ui-accent" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">SURVIVAL RATE</span>
            <span className="stat-card-value font-mono">{globalStats.overallWinRate}%</span>
          </div>
        </div>
      </section>

      {/* Podium: Hall of Champions (Top 3) */}
      {podiumPlayers.first && (
        <section className="leaderboard-podium-section">
          <div className="podium-banner">
            <Icon icon="game-icons:laurels" className="text-amber-400 text-xl" />
            <span>TOP CONTENDERS • HALL OF CHAMPIONS</span>
            <Icon icon="game-icons:laurels" className="text-amber-400 text-xl" />
          </div>

          <div className="podium-grid">
            {/* 2nd Place (Silver) */}
            <div className={`podium-card podium-silver ${!podiumPlayers.second ? "is-empty" : ""}`}>
              {podiumPlayers.second ? (
                <>
                  <div className="podium-medal-badge silver">
                    <Icon icon="game-icons:medal" className="text-lg mr-1" /> #2 CONTENDER
                  </div>
                  <div className="podium-avatar-wrap">
                    <img
                      src={podiumPlayers.second.image || "/assets/images/placeholder.svg"}
                      alt={podiumPlayers.second.name}
                      className="podium-avatar"
                      onError={(e) => {
                        e.target.src = "/assets/images/placeholder.svg";
                      }}
                    />
                  </div>
                  <h3 className="podium-name">{podiumPlayers.second.name}</h3>
                  <span className="podium-title">{podiumPlayers.second.customTitle || "Challenger"}</span>
                  <div className="podium-points font-mono">{podiumPlayers.second.points || 0} PTS</div>
                  <div className="podium-mini-stats">
                    <span>⚔️ {podiumPlayers.second.beatenChallenges || 0} Won</span>
                    <span>•</span>
                    <span>🎰 {podiumPlayers.second.spins || 0} Spins</span>
                  </div>
                  <div className="podium-actions">
                    <button
                      className="podium-action-btn"
                      onClick={() => openDossierModal(podiumPlayers.second)}
                      title="View dossier"
                    >
                      Dossier
                    </button>
                    <button
                      className="podium-action-btn highlight"
                      onClick={() => handleAdjustStats(podiumPlayers.second.name, { deltaPoints: 50 }, "+50 Points!")}
                      title="Boost 50 points"
                    >
                      +50 Pts
                    </button>
                  </div>
                </>
              ) : (
                <div className="podium-empty-text">Awaiting Contender...</div>
              )}
            </div>

            {/* 1st Place (Gold 👑) */}
            <div className="podium-card podium-gold">
              <div className="podium-crown-icon">
                <Icon icon="game-icons:crown" className="text-3xl text-amber-300 animate-pulse" />
              </div>
              <div className="podium-medal-badge gold">
                <Icon icon="game-icons:trophy-cup" className="text-lg mr-1 text-amber-300" /> #1 CHAMPION
              </div>
              <div className="podium-avatar-wrap gold-wrap">
                <img
                  src={podiumPlayers.first.image || "/assets/images/dandare.png"}
                  alt={podiumPlayers.first.name}
                  className="podium-avatar gold-avatar"
                  onError={(e) => {
                    e.target.src = "/assets/images/placeholder.svg";
                  }}
                />
              </div>
              <h3 className="podium-name gold-name">{podiumPlayers.first.name}</h3>
              <span className="podium-title">{podiumPlayers.first.customTitle || "Reel Overlord"}</span>
              <div className="podium-points gold-points font-mono">{podiumPlayers.first.points || 0} PTS</div>
              <div className="podium-mini-stats">
                <span className="text-emerald-400">⚔️ {podiumPlayers.first.beatenChallenges || 0} Conquered</span>
                <span>•</span>
                <span>🎰 {podiumPlayers.first.spins || 0} Spins</span>
                <span>•</span>
                <span className="text-amber-300">🔥 {podiumPlayers.first.streak || 0} Streak</span>
              </div>
              <div className="podium-actions">
                <button
                  className="podium-action-btn"
                  onClick={() => openDossierModal(podiumPlayers.first)}
                  title="View dossier"
                >
                  Dossier
                </button>
                <button
                  className="podium-action-btn gold-btn"
                  onClick={() => openLogDareModal(podiumPlayers.first)}
                  title="Record challenge outcome"
                >
                  Log Dare
                </button>
              </div>
            </div>

            {/* 3rd Place (Bronze) */}
            <div className={`podium-card podium-bronze ${!podiumPlayers.third ? "is-empty" : ""}`}>
              {podiumPlayers.third ? (
                <>
                  <div className="podium-medal-badge bronze">
                    <Icon icon="game-icons:laurel-crown" className="text-lg mr-1" /> #3 SURVIVOR
                  </div>
                  <div className="podium-avatar-wrap">
                    <img
                      src={podiumPlayers.third.image || "/assets/images/placeholder.svg"}
                      alt={podiumPlayers.third.name}
                      className="podium-avatar"
                      onError={(e) => {
                        e.target.src = "/assets/images/placeholder.svg";
                      }}
                    />
                  </div>
                  <h3 className="podium-name">{podiumPlayers.third.name}</h3>
                  <span className="podium-title">{podiumPlayers.third.customTitle || "Challenger"}</span>
                  <div className="podium-points font-mono">{podiumPlayers.third.points || 0} PTS</div>
                  <div className="podium-mini-stats">
                    <span>⚔️ {podiumPlayers.third.beatenChallenges || 0} Won</span>
                    <span>•</span>
                    <span>🎰 {podiumPlayers.third.spins || 0} Spins</span>
                  </div>
                  <div className="podium-actions">
                    <button
                      className="podium-action-btn"
                      onClick={() => openDossierModal(podiumPlayers.third)}
                      title="View dossier"
                    >
                      Dossier
                    </button>
                    <button
                      className="podium-action-btn highlight"
                      onClick={() => handleAdjustStats(podiumPlayers.third.name, { deltaPoints: 50 }, "+50 Points!")}
                      title="Boost 50 points"
                    >
                      +50 Pts
                    </button>
                  </div>
                </>
              ) : (
                <div className="podium-empty-text">Awaiting Contender...</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Toolbar: Search, Filters, and Sorting Pills */}
      <div className="leaderboard-toolbar">
        <div className="lead-search-box">
          <Icon icon="game-icons:magnifying-glass" className="lead-search-icon text-ui-accent text-lg" />
          <input
            type="text"
            className="lead-search-input"
            placeholder="Search players by name or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="lead-search-clear" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="lead-sort-pills">
          <span className="lead-sort-label">SORT BY:</span>
          <button
            className={`lead-sort-pill ${sortBy === "points" ? "active" : ""}`}
            onClick={() => handleSortChange("points")}
          >
            Points {sortBy === "points" && (sortOrder === "desc" ? "▼" : "▲")}
          </button>
          <button
            className={`lead-sort-pill ${sortBy === "spins" ? "active" : ""}`}
            onClick={() => handleSortChange("spins")}
          >
            Spins {sortBy === "spins" && (sortOrder === "desc" ? "▼" : "▲")}
          </button>
          <button
            className={`lead-sort-pill ${sortBy === "beaten" ? "active" : ""}`}
            onClick={() => handleSortChange("beaten")}
          >
            Beaten {sortBy === "beaten" && (sortOrder === "desc" ? "▼" : "▲")}
          </button>
          <button
            className={`lead-sort-pill ${sortBy === "lost" ? "active" : ""}`}
            onClick={() => handleSortChange("lost")}
          >
            Lost {sortBy === "lost" && (sortOrder === "desc" ? "▼" : "▲")}
          </button>
          <button
            className={`lead-sort-pill ${sortBy === "winrate" ? "active" : ""}`}
            onClick={() => handleSortChange("winrate")}
          >
            Win Rate {sortBy === "winrate" && (sortOrder === "desc" ? "▼" : "▲")}
          </button>
          <button
            className={`lead-sort-pill ${sortBy === "name" ? "active" : ""}`}
            onClick={() => handleSortChange("name")}
          >
            Name {sortBy === "name" && (sortOrder === "desc" ? "▼" : "▲")}
          </button>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="col-rank">RANK</th>
              <th className="col-player">PLAYER</th>
              <th className="col-points">POINTS</th>
              <th className="col-spins">SPINS</th>
              <th className="col-beaten">BEATEN</th>
              <th className="col-lost">LOST</th>
              <th className="col-rate">SURVIVAL RATE</th>
              <th className="col-last">RECENT STATUS</th>
              <th className="col-actions">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {processedPlayers.length === 0 ? (
              <tr>
                <td colSpan="9" className="lead-table-empty">
                  <Icon icon="game-icons:tombstone" className="text-4xl text-ui-text-muted mb-2 inline-block" />
                  <p>No players found matching "{searchQuery}".</p>
                  <button className="lead-btn lead-btn-primary mt-3" onClick={openAddPlayerModal}>
                    + Register New Player
                  </button>
                </td>
              </tr>
            ) : (
              processedPlayers.map((player, idx) => {
                const rank = idx + 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;

                return (
                  <tr key={player.id || player.name} className={`lead-row ${isTop1 ? "row-rank-1" : ""}`}>
                    {/* Rank */}
                    <td className="col-rank">
                      <div className="lead-rank-wrap">
                        {isTop1 ? (
                          <span className="rank-badge rank-1" title="1st Place Champion">
                            <Icon icon="game-icons:crown" className="text-amber-300" /> #1
                          </span>
                        ) : isTop2 ? (
                          <span className="rank-badge rank-2" title="2nd Place">
                            #2
                          </span>
                        ) : isTop3 ? (
                          <span className="rank-badge rank-3" title="3rd Place">
                            #3
                          </span>
                        ) : (
                          <span className="rank-badge rank-other">#{rank}</span>
                        )}
                      </div>
                    </td>

                    {/* Player Info */}
                    <td className="col-player">
                      <div className="player-meta-wrap">
                        <img
                          src={player.image || "/assets/images/placeholder.svg"}
                          alt={player.name}
                          className="player-thumb"
                          onError={(e) => {
                            e.target.src = "/assets/images/placeholder.svg";
                          }}
                        />
                        <div className="player-meta-text">
                          <div className="flex items-center gap-2">
                            <span className="player-name-link" onClick={() => openDossierModal(player)}>
                              {player.name}
                            </span>
                            {player.streak >= 2 && (
                              <span className="streak-badge" title={`${player.streak} consecutive dares beaten!`}>
                                🔥 {player.streak} Streak
                              </span>
                            )}
                          </div>
                          <span className="player-title-tag">{player.customTitle || "Challenger"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Points */}
                    <td className="col-points">
                      <div className="points-cell-wrap">
                        <span className="points-value font-mono">{player.points.toLocaleString()}</span>
                        <div className="points-adjust-buttons">
                          <button
                            className="adjust-btn adjust-add"
                            onClick={() => handleAdjustStats(player.name, { deltaPoints: 10 }, "+10 Pts")}
                            title="Add 10 points"
                          >
                            +10
                          </button>
                          <button
                            className="adjust-btn adjust-sub"
                            onClick={() => handleAdjustStats(player.name, { deltaPoints: -10 }, "-10 Pts")}
                            title="Deduct 10 points"
                          >
                            -10
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Spins */}
                    <td className="col-spins font-mono">
                      <div className="spins-cell-wrap">
                        <span>{player.spins}</span>
                        <button
                          className="mini-add-btn"
                          onClick={() => handleAdjustStats(player.name, { deltaSpins: 1 }, "+1 Spin")}
                          title="Record spin"
                        >
                          +1
                        </button>
                      </div>
                    </td>

                    {/* Beaten Challenges */}
                    <td className="col-beaten font-mono text-emerald-400">
                      <span className="beaten-chip">
                        <Icon icon="game-icons:check-mark" className="inline mr-1 text-xs" />
                        {player.beatenChallenges}
                      </span>
                    </td>

                    {/* Lost Challenges */}
                    <td className="col-lost font-mono text-ui-cursed">
                      <span className="lost-chip">
                        <Icon icon="game-icons:cancel" className="inline mr-1 text-xs" />
                        {player.lostChallenges}
                      </span>
                    </td>

                    {/* Survival Rate */}
                    <td className="col-rate">
                      <div className="rate-bar-container">
                        <div className="rate-bar-track">
                          <div
                            className="rate-bar-fill"
                            style={{
                              width: `${player.winRate}%`,
                              backgroundColor:
                                player.winRate >= 70
                                  ? "var(--ui-success)"
                                  : player.winRate >= 40
                                  ? "var(--ui-accent)"
                                  : "var(--ui-cursed)",
                            }}
                          />
                        </div>
                        <span className="rate-text font-mono">{player.winRate}%</span>
                      </div>
                    </td>

                    {/* Recent Status */}
                    <td className="col-last">
                      <span className="last-dare-text" title={player.lastDare}>
                        {player.lastDare || "Spun the reels"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="col-actions">
                      <div className="table-actions-group">
                        <button
                          className="table-action-icon-btn highlight-win"
                          onClick={() =>
                            recordChallengeOutcome(player.name, {
                              won: true,
                              points: 50,
                              dareName: "Quick Victory",
                            })
                          }
                          title="Quick Win (+50 pts, +1 Beaten)"
                        >
                          <Icon icon="game-icons:trophy" className="text-base" />
                        </button>

                        <button
                          className="table-action-icon-btn highlight-loss"
                          onClick={() =>
                            recordChallengeOutcome(player.name, {
                              won: false,
                              dareName: "Quick Defeat",
                            })
                          }
                          title="Quick Loss (+1 Lost)"
                        >
                          <Icon icon="game-icons:skull-crossed-bones" className="text-base" />
                        </button>

                        <button
                          className="table-action-icon-btn"
                          onClick={() => openDossierModal(player)}
                          title="View Player Dossier"
                        >
                          <Icon icon="game-icons:scroll-unfurled" className="text-base" />
                        </button>

                        <button
                          className="table-action-icon-btn"
                          onClick={() => openEditPlayerModal(player)}
                          title="Edit Player Details & Stats"
                        >
                          <Icon icon="game-icons:quill-ink" className="text-base" />
                        </button>

                        <button
                          className="table-action-icon-btn delete-btn"
                          onClick={() => setPlayerToDelete(player)}
                          title="Remove Player"
                        >
                          <Icon icon="game-icons:trash-can" className="text-base" />
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

      {/* ================= MODAL: ADD NEW PLAYER ================= */}
      {isAddPlayerModalOpen && (
        <div className="lead-modal-backdrop" onClick={() => setIsAddPlayerModalOpen(false)}>
          <div className="lead-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lead-modal-header">
              <div className="flex items-center gap-2">
                <Icon icon="game-icons:hood" className="text-ui-accent text-2xl" />
                <h2 className="lead-modal-title">REGISTER NEW PLAYER</h2>
              </div>
              <button className="lead-modal-close-btn" onClick={() => setIsAddPlayerModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewPlayer} className="lead-form">
              <div className="form-group">
                <label className="form-label">Player Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CASANOVA, GHOST_RIDER"
                  value={playerFormData.name}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custom Title / Tagline</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Reel Overlord, Dare Queen"
                  value={playerFormData.customTitle}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, customTitle: e.target.value })}
                />
                <div className="preset-chips">
                  {PRESET_TITLES.slice(0, 6).map((title) => (
                    <button
                      key={title}
                      type="button"
                      className="preset-chip"
                      onClick={() => setPlayerFormData({ ...playerFormData, customTitle: title })}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Avatar Image URL / Preset</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="/assets/images/placeholder.svg or custom URL"
                  value={playerFormData.image}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, image: e.target.value })}
                />
                <div className="preset-avatars-row">
                  {PRESET_AVATARS.map((av) => (
                    <div
                      key={av.label}
                      className={`preset-avatar-option ${playerFormData.image === av.src ? "selected" : ""}`}
                      onClick={() => setPlayerFormData({ ...playerFormData, image: av.src })}
                      title={av.label}
                    >
                      <img src={av.src} alt={av.label} />
                      <span>{av.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Starting Points</label>
                  <input
                    type="number"
                    className="form-input"
                    value={playerFormData.points}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, points: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Starting Spins</label>
                  <input
                    type="number"
                    className="form-input"
                    value={playerFormData.spins}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, spins: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Beaten Challenges</label>
                  <input
                    type="number"
                    className="form-input"
                    value={playerFormData.beatenChallenges}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        beatenChallenges: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lost Challenges</label>
                  <input
                    type="number"
                    className="form-input"
                    value={playerFormData.lostChallenges}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        lostChallenges: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="lead-modal-footer">
                <button
                  type="button"
                  className="lead-btn lead-btn-secondary"
                  onClick={() => setIsAddPlayerModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="lead-btn lead-btn-primary">
                  Register Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PLAYER ================= */}
      {isEditPlayerModalOpen && selectedPlayer && (
        <div className="lead-modal-backdrop" onClick={() => setIsEditPlayerModalOpen(false)}>
          <div className="lead-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lead-modal-header">
              <div className="flex items-center gap-2">
                <Icon icon="game-icons:quill-ink" className="text-ui-accent text-2xl" />
                <h2 className="lead-modal-title">EDIT PLAYER: {selectedPlayer.name}</h2>
              </div>
              <button className="lead-modal-close-btn" onClick={() => setIsEditPlayerModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePlayer} className="lead-form">
              <div className="form-group">
                <label className="form-label">Player Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={playerFormData.name}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custom Title / Tagline</label>
                <input
                  type="text"
                  className="form-input"
                  value={playerFormData.customTitle}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, customTitle: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Avatar Image URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={playerFormData.image}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, image: e.target.value })}
                />
                <div className="preset-avatars-row">
                  {PRESET_AVATARS.map((av) => (
                    <div
                      key={av.label}
                      className={`preset-avatar-option ${playerFormData.image === av.src ? "selected" : ""}`}
                      onClick={() => setPlayerFormData({ ...playerFormData, image: av.src })}
                      title={av.label}
                    >
                      <img src={av.src} alt={av.label} />
                      <span>{av.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Points</label>
                  <input
                    type="number"
                    className="form-input"
                    value={playerFormData.points}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, points: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Spins</label>
                  <input
                    type="number"
                    className="form-input"
                    value={playerFormData.spins}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, spins: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Beaten Challenges</label>
                  <input
                    type="number"
                    className="form-input"
                    value={playerFormData.beatenChallenges}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        beatenChallenges: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lost Challenges</label>
                  <input
                    type="number"
                    className="form-input"
                    value={playerFormData.lostChallenges}
                    onChange={(e) =>
                      setPlayerFormData({
                        ...playerFormData,
                        lostChallenges: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="lead-modal-footer">
                <button
                  type="button"
                  className="lead-btn lead-btn-secondary"
                  onClick={() => setIsEditPlayerModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="lead-btn lead-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: LOG DARE RESULT ================= */}
      {isLogDareModalOpen && (
        <div className="lead-modal-backdrop" onClick={() => setIsLogDareModalOpen(false)}>
          <div className="lead-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lead-modal-header">
              <div className="flex items-center gap-2">
                <Icon icon="game-icons:sword-brandish" className="text-ui-accent text-2xl" />
                <h2 className="lead-modal-title">LOG CHALLENGE / DARE OUTCOME</h2>
              </div>
              <button className="lead-modal-close-btn" onClick={() => setIsLogDareModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleLogDareOutcome} className="lead-form">
              <div className="form-group">
                <label className="form-label">Victim / Player *</label>
                <select
                  className="form-input"
                  value={logDareFormData.playerName}
                  onChange={(e) => setLogDareFormData({ ...logDareFormData, playerName: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    -- Select Player --
                  </option>
                  {players.map((p) => (
                    <option key={p.id || p.name} value={p.name}>
                      {p.name} ({p.points || 0} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Registered Dare (or enter below)</label>
                <select
                  className="form-input"
                  value={logDareFormData.dareName}
                  onChange={(e) =>
                    setLogDareFormData({ ...logDareFormData, dareName: e.target.value, customDare: "" })
                  }
                >
                  {availableChallenges.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="Wheel of Fate">Wheel of Fate Spin</option>
                  <option value="One Life Left">One Life Left</option>
                  <option value="The Silent Run">The Silent Run</option>
                  <option value="Inverted Controls">Inverted Controls</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Or Custom Challenge Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Beat boss blindfolded, no jumping allowed..."
                  value={logDareFormData.customDare}
                  onChange={(e) => setLogDareFormData({ ...logDareFormData, customDare: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Challenge Outcome *</label>
                <div className="outcome-toggle-group">
                  <button
                    type="button"
                    className={`outcome-toggle-btn win-btn ${logDareFormData.won ? "active" : ""}`}
                    onClick={() => setLogDareFormData({ ...logDareFormData, won: true })}
                  >
                    <Icon icon="game-icons:trophy" className="text-xl" />
                    <span>CONQUERED / BEATEN</span>
                  </button>
                  <button
                    type="button"
                    className={`outcome-toggle-btn lose-btn ${!logDareFormData.won ? "active" : ""}`}
                    onClick={() => setLogDareFormData({ ...logDareFormData, won: false })}
                  >
                    <Icon icon="game-icons:skull-crossed-bones" className="text-xl" />
                    <span>FAILED / FORFEITED</span>
                  </button>
                </div>
              </div>

              {logDareFormData.won && (
                <div className="form-group">
                  <label className="form-label">Points Awarded</label>
                  <div className="points-preset-row">
                    {[25, 50, 100, 200].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        className={`points-preset-btn ${logDareFormData.pointsAwarded === pts ? "active" : ""}`}
                        onClick={() => setLogDareFormData({ ...logDareFormData, pointsAwarded: pts })}
                      >
                        +{pts} PTS
                      </button>
                    ))}
                    <input
                      type="number"
                      className="form-input points-custom-input"
                      value={logDareFormData.pointsAwarded}
                      onChange={(e) =>
                        setLogDareFormData({
                          ...logDareFormData,
                          pointsAwarded: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      title="Custom points"
                    />
                  </div>
                </div>
              )}

              <div className="lead-modal-footer">
                <button
                  type="button"
                  className="lead-btn lead-btn-secondary"
                  onClick={() => setIsLogDareModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`lead-btn ${logDareFormData.won ? "lead-btn-primary" : "lead-btn-danger"}`}
                >
                  {logDareFormData.won ? "Record Victory (+Pts)" : "Record Defeat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PLAYER DOSSIER ================= */}
      {isDossierModalOpen && selectedPlayer && (
        <div className="lead-modal-backdrop" onClick={() => setIsDossierModalOpen(false)}>
          <div className="lead-modal-card dossier-card" onClick={(e) => e.stopPropagation()}>
            <div className="lead-modal-header">
              <div className="flex items-center gap-2">
                <Icon icon="game-icons:scroll-unfurled" className="text-ui-accent text-2xl" />
                <h2 className="lead-modal-title">PLAYER DOSSIER: {selectedPlayer.name}</h2>
              </div>
              <button className="lead-modal-close-btn" onClick={() => setIsDossierModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="dossier-hero">
              <img
                src={selectedPlayer.image || "/assets/images/placeholder.svg"}
                alt={selectedPlayer.name}
                className="dossier-avatar"
                onError={(e) => {
                  e.target.src = "/assets/images/placeholder.svg";
                }}
              />
              <div className="dossier-hero-info">
                <h3 className="dossier-name">{selectedPlayer.name}</h3>
                <span className="dossier-title">{selectedPlayer.customTitle || "Challenger"}</span>
                <div className="dossier-score-tag font-mono">
                  {selectedPlayer.points || 0} TOTAL POINTS
                </div>
              </div>
            </div>

            <div className="dossier-metrics-grid">
              <div className="metric-box">
                <span className="metric-label">TOTAL SPINS</span>
                <span className="metric-value font-mono">{selectedPlayer.spins || 0}</span>
              </div>
              <div className="metric-box highlight-green">
                <span className="metric-label">BEATEN</span>
                <span className="metric-value font-mono text-emerald-400">
                  {selectedPlayer.beatenChallenges || 0}
                </span>
              </div>
              <div className="metric-box highlight-red">
                <span className="metric-label">LOST</span>
                <span className="metric-value font-mono text-ui-cursed">
                  {selectedPlayer.lostChallenges || 0}
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">CURRENT STREAK</span>
                <span className="metric-value font-mono">🔥 {selectedPlayer.streak || 0}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">BEST STREAK</span>
                <span className="metric-value font-mono">👑 {selectedPlayer.bestStreak || 0}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">SURVIVAL RATE</span>
                <span className="metric-value font-mono">
                  {(selectedPlayer.beatenChallenges || 0) + (selectedPlayer.lostChallenges || 0) > 0
                    ? Math.round(
                        ((selectedPlayer.beatenChallenges || 0) /
                          ((selectedPlayer.beatenChallenges || 0) + (selectedPlayer.lostChallenges || 0))) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="dossier-achievements-wrap">
              <h4 className="dossier-section-title">ACHIEVEMENTS UNLOCKED</h4>
              <div className="achievements-list">
                <div className={`achievement-badge ${(selectedPlayer.points || 0) >= 100 ? "unlocked" : "locked"}`}>
                  <Icon icon="game-icons:trophy" className="text-xl" />
                  <div>
                    <div className="achieve-title">Century Club</div>
                    <div className="achieve-desc">100+ Total Points</div>
                  </div>
                </div>

                <div className={`achievement-badge ${(selectedPlayer.spins || 0) >= 10 ? "unlocked" : "locked"}`}>
                  <Icon icon="game-icons:slot-machine" className="text-xl" />
                  <div>
                    <div className="achieve-title">Slot Fiend</div>
                    <div className="achieve-desc">10+ Machine Spins</div>
                  </div>
                </div>

                <div className={`achievement-badge ${(selectedPlayer.beatenChallenges || 0) >= 5 ? "unlocked" : "locked"}`}>
                  <Icon icon="game-icons:shield-reflect" className="text-xl" />
                  <div>
                    <div className="achieve-title">Dare Conqueror</div>
                    <div className="achieve-desc">5+ Dares Beaten</div>
                  </div>
                </div>

                <div className={`achievement-badge ${(selectedPlayer.streak || 0) >= 3 ? "unlocked" : "locked"}`}>
                  <Icon icon="game-icons:flame" className="text-xl" />
                  <div>
                    <div className="achieve-title">On Fire</div>
                    <div className="achieve-desc">3+ Consecutive Wins</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lead-modal-footer">
              <button
                className="lead-btn lead-btn-secondary"
                onClick={() => {
                  setIsDossierModalOpen(false);
                  openEditPlayerModal(selectedPlayer);
                }}
              >
                Edit Stats
              </button>
              <button
                className="lead-btn lead-btn-primary"
                onClick={() => {
                  setIsDossierModalOpen(false);
                  openLogDareModal(selectedPlayer);
                }}
              >
                Log Dare Outcome
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {playerToDelete && (
        <div className="lead-modal-backdrop" onClick={() => setPlayerToDelete(null)}>
          <div className="lead-modal-card confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrap">
              <Icon icon="game-icons:trash-can" className="text-ui-cursed text-4xl" />
            </div>
            <h3 className="confirm-title">REMOVE PLAYER</h3>
            <p className="confirm-text">
              Are you sure you want to remove <strong>{playerToDelete.name}</strong> from the leaderboard? All accrued points and stats will be removed.
            </p>
            <div className="lead-modal-footer">
              <button className="lead-btn lead-btn-secondary" onClick={() => setPlayerToDelete(null)}>
                Cancel
              </button>
              <button className="lead-btn lead-btn-danger" onClick={handleDeletePlayer}>
                Remove Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET STATS CONFIRMATION ================= */}
      {isResetConfirmModalOpen && (
        <div className="lead-modal-backdrop" onClick={() => setIsResetConfirmModalOpen(false)}>
          <div className="lead-modal-card confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrap">
              <Icon icon="game-icons:recycle" className="text-amber-400 text-4xl" />
            </div>
            <h3 className="confirm-title">RESET LEADERBOARD</h3>
            <p className="confirm-text">
              Choose how you want to reset the leaderboard session:
            </p>

            <div className="reset-options-wrap">
              <button
                className="reset-choice-btn"
                onClick={() => {
                  resetAllPlayerStats("zero");
                  showNotice("info", "Reset all players' points, spins, and dares to 0.");
                  setIsResetConfirmModalOpen(false);
                }}
              >
                <Icon icon="game-icons:broom" className="text-2xl text-amber-400" />
                <div>
                  <strong>Clear All Stats to 0</strong>
                  <span>Keep registered player names, reset all numbers to zero</span>
                </div>
              </button>

              <button
                className="reset-choice-btn"
                onClick={async () => {
                  await resetPlayersToDefault();
                  showNotice("success", "Restored default tournament roster.");
                  setIsResetConfirmModalOpen(false);
                }}
              >
                <Icon icon="game-icons:backward-time" className="text-2xl text-emerald-400" />
                <div>
                  <strong>Restore Default Tournament Roster</strong>
                  <span>Reset players and scores back to the initial defaults</span>
                </div>
              </button>
            </div>

            <div className="lead-modal-footer mt-4">
              <button
                className="lead-btn lead-btn-secondary"
                onClick={() => setIsResetConfirmModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
