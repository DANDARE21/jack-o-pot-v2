import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useElectron } from "@/hooks";
import { useNavigation, SCREENS } from "@/navigation";
import { playForfeit, playHoverChicken } from "@/services";
import "./SpinResultPopup.css";

export default function SpinResultPopup({
  type,
  player,
  category,
  game,
  gameImage,
  challengeName,
  challengeText,
  executablePath,
  launchArgs,
  onResolveDare,
  onClose,
}) {
  const isCursed = type === "cursed";
  const { launchGame, showNotification } = useElectron();
  const { navigate } = useNavigation();
  const [isLaunching, setIsLaunching] = useState(false);
  const [resolvedStatus, setResolvedStatus] = useState(null); // "accepted" | "denied"

  const fixAssetPath = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return path;
    return `/assets/${path}`;
  };

  const handleLaunchNow = async () => {
    if (!executablePath) return;
    setIsLaunching(true);
    try {
      showNotification?.({
        title: `Launching ${game}`,
        body: `Starting executable from ${executablePath}...`,
      });
      await launchGame({ executablePath, args: launchArgs });
    } finally {
      setTimeout(() => setIsLaunching(false), 1500);
    }
  };

  const handleAcceptDare = () => {
    if (resolvedStatus) return;
    setResolvedStatus("accepted");
    onResolveDare?.(true);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleDenyDare = () => {
    if (resolvedStatus) return;
    playForfeit();
    setResolvedStatus("denied");
    onResolveDare?.(false);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleGoToLeaderboard = () => {
    onClose();
    navigate(SCREENS.LEADERBOARD);
  };

  const ptsValue = isCursed ? 100 : 50;

  return (
    <AnimatePresence>
      <div className="popup-overlay" onClick={onClose}>
        <motion.div
          className={`popup-card ${isCursed ? "cursed" : ""}`}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 30 }}
          transition={{ type: "spring", damping: 26, stiffness: 340 }}
        >
          {/* Close button in top-right */}
          <button
            type="button"
            className="popup-close-x-btn"
            onClick={onClose}
            title="Close Popup (Esc)"
          >
            <Icon icon="game-icons:cross-mark" />
          </button>

          {/* Top Marquee Header Bar */}
          <div className={`popup-marquee-bar ${isCursed ? "cursed" : ""}`}>
            <span className="marquee-dot" />
            <div className="popup-marquee-content">
              {isCursed ? (
                <span className="flex items-center gap-1.5">
                  <Icon icon="game-icons:skull-crossed-bones" className="text-ui-cursed text-base animate-pulse" />
                  <span>DEMONIC PROTOCOL ACTIVE • CURSED DARE ISSUED</span>
                  <Icon icon="game-icons:skull-crossed-bones" className="text-ui-cursed text-base animate-pulse" />
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Icon icon="game-icons:sparkles" className="text-ui-accent text-base" />
                  <span>THE WHEEL OF FATE HAS SPOKEN • DARE DECIDED</span>
                  <Icon icon="game-icons:sparkles" className="text-ui-accent text-base" />
                </span>
              )}
            </div>
            <span className="marquee-dot" />
          </div>

          {/* Grand Title */}
          <div className="popup-header-block">
            <h2 className={`popup-grand-title ${isCursed ? "cursed" : ""}`}>
              {isCursed ? "THE MACHINE HAS CHOSEN ITS VICTIM" : "A NEW CHALLENGE HAS BEEN CHOSEN!"}
            </h2>
            <p className="popup-subtitle">
              {isCursed
                ? "Darkness looms over the machine. Will you accept your doom?"
                : "The reels have locked in. Accept the challenge to claim glory on the leaderboard!"}
            </p>
          </div>

          {/* Visual Showcase Stage (Cards Grid) */}
          <div className="popup-visual-stage">
            {/* Player / Victim Card */}
            <div className={`popup-hero-card player-hero-card ${isCursed ? "cursed" : ""}`}>
              <div className="hero-card-tag">
                <Icon
                  icon={isCursed ? "game-icons:bleeding-eye" : "game-icons:hood"}
                  className="text-sm"
                />
                <span>{isCursed ? "VICTIM" : "CHALLENGER"}</span>
              </div>

              <div className="player-avatar-circle">
                <Icon
                  icon={isCursed ? "game-icons:skull-mask" : "game-icons:ninja-mask"}
                  className="player-avatar-icon"
                />
              </div>

              <div className="player-info-meta">
                <span className="player-title-label">PLAYER</span>
                <span className="player-name-display">{player || "Unknown"}</span>
              </div>

              <div className="points-bounty-badge">
                <Icon icon="game-icons:trophy" className="text-sm" />
                <span>WORTH +{ptsValue} PTS</span>
              </div>
            </div>

            {/* Game / Dare Mission Card */}
            <div className={`popup-hero-card game-hero-card ${isCursed ? "cursed" : ""}`}>
              <div className="hero-card-tag">
                <Icon
                  icon={isCursed ? "game-icons:lightning-trio" : "game-icons:retro-controller"}
                  className="text-sm"
                />
                <span>{isCursed ? "CURSED MISSION" : "TARGET GAME"}</span>
              </div>

              {!isCursed ? (
                <>
                  <div className="game-preview-container">
                    {gameImage ? (
                      <img
                        src={fixAssetPath(gameImage)}
                        alt={game}
                        className="game-cover-art"
                        onError={(e) => {
                          e.target.src = "/assets/images/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="game-icon-fallback">
                        <Icon icon="game-icons:retro-controller" className="fallback-game-icon" />
                      </div>
                    )}
                  </div>

                  <div className="game-info-meta">
                    <span className="category-pill-badge">
                      <Icon icon="game-icons:price-tag" className="text-xs" />
                      <span>{category || "GENERAL"}</span>
                    </span>
                    <span className="game-title-display">{game || "Mystery Title"}</span>
                  </div>
                </>
              ) : (
                <div className="cursed-mission-content">
                  <div className="cursed-target-game">
                    <span className="cursed-game-label">GAME TARGET:</span>
                    <span className="cursed-game-name">{game || "Cursed Game"}</span>
                  </div>

                  <div className="cursed-dare-banner">
                    <div className="cursed-dare-header">
                      <Icon icon="game-icons:skull-crossed-bones" className="text-base" />
                      <span>DARE: {challengeName || "MYSTERY CURSE"}</span>
                    </div>
                    <p className="cursed-dare-description">{challengeText || "No description provided."}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional Launch Executable Bar */}
          {executablePath && (
            <button
              type="button"
              className="popup-launch-action-bar"
              onClick={handleLaunchNow}
              disabled={isLaunching}
            >
              <span className="launch-icon-box">
                {isLaunching ? (
                  <Icon icon="game-icons:anticlockwise-rotation" className="animate-spin text-xl" />
                ) : (
                  <Icon icon="game-icons:rocket" className="text-xl" />
                )}
              </span>
              <span className="launch-text-box">
                <span className="launch-main-text">
                  {isLaunching ? "LAUNCHING GAME EXECUTABLE..." : `LAUNCH ${game?.toUpperCase()} NOW`}
                </span>
                <span className="launch-sub-text">Starts executable directly via desktop bridge</span>
              </span>
            </button>
          )}

          {/* Resolution Outcome Banner */}
          {resolvedStatus && (
            <motion.div
              className={`popup-resolution-banner ${resolvedStatus}`}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {resolvedStatus === "accepted" ? (
                <>
                  <Icon icon="game-icons:trophy" className="text-xl animate-bounce" />
                  <span>DARE ACCEPTED! +{ptsValue} POINTS AWARDED ON LEADERBOARD!</span>
                </>
              ) : (
                <>
                  <Icon icon="game-icons:chicken" className="text-xl animate-bounce" />
                  <span>DARE DENIED! NO POINTS AWARDED (RECORDED AS FAILED)!</span>
                </>
              )}
            </motion.div>
          )}

          {/* TWO HERO OPTIONS: Accept Dare & Deny Dare */}
          <div className="popup-two-options-grid">
            {/* OPTION 1: ACCEPT DARE */}
            <motion.button
              type="button"
              className={`popup-hero-option-btn accept-btn ${isCursed ? "cursed" : ""}`}
              onClick={handleAcceptDare}
              disabled={Boolean(resolvedStatus)}
              whileHover={!resolvedStatus ? { scale: 1.03 } : {}}
              whileTap={!resolvedStatus ? { scale: 0.97 } : {}}
              autoFocus
            >
              <div className="option-btn-icon-wrapper">
                <Icon icon="game-icons:muscle-up" className="option-icon" />
              </div>
              <div className="option-btn-text-content">
                <span className="option-title">ACCEPT DARE</span>
                <span className="option-subtitle">CLAIM +{ptsValue} PTS</span>
              </div>
            </motion.button>

            {/* OPTION 2: DENY DARE (FORFEIT) */}
            <motion.button
              type="button"
              className="popup-hero-option-btn deny-btn forfeit-btn"
              data-sound-hover="hoverChicken"
              data-sound-click="forfeit"
              onClick={handleDenyDare}
              onMouseEnter={() => {
                if (!resolvedStatus) playHoverChicken();
              }}
              disabled={Boolean(resolvedStatus)}
              whileHover={!resolvedStatus ? { scale: 1.03 } : {}}
              whileTap={!resolvedStatus ? { scale: 0.97 } : {}}
            >
              <div className="option-btn-icon-wrapper">
                <Icon icon="game-icons:chicken" className="option-icon" />
              </div>
              <div className="option-btn-text-content">
                <span className="option-title">DENY DARE</span>
                <span className="option-subtitle">FORFEIT • 0 PTS</span>
              </div>
            </motion.button>
          </div>

          {/* Footer Sub-Bar */}
          <div className="popup-footer-bar">
            <button
              type="button"
              className="popup-leaderboard-shortcut"
              onClick={handleGoToLeaderboard}
            >
              <Icon icon="game-icons:podium" className="text-base" />
              <span>Leaderboard Standings</span>
            </button>

            <span className="popup-keyboard-hint">Press ESC to dismiss</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
