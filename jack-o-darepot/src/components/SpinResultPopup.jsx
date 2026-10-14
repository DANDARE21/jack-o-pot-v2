import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useElectron } from "../hooks/useElectron";
import { useNavigation } from "../navigation/NavigationContext";
import { SCREENS } from "../navigation/screens";
import "./SpinResultPopup.css";

export default function SpinResultPopup({
  type,
  player,
  category,
  game,
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
  const [resolvedStatus, setResolvedStatus] = useState(null);

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

  const handleResolveOutcome = (won) => {
    onResolveDare?.(won);
    setResolvedStatus(won ? "won" : "lost");
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleGoToLeaderboard = () => {
    onClose();
    navigate(SCREENS.LEADERBOARD);
  };

  return (
    <AnimatePresence>
      <div className="popup-overlay" onClick={onClose}>
        <motion.div
          className={`popup-card ${isCursed ? "cursed" : ""}`}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
        >
          {/* Top Banner Tag */}
          <div className={`popup-badge ${isCursed ? "cursed" : ""}`}>
            {isCursed ? (
              <span className="flex items-center justify-center gap-1">
                <Icon icon="game-icons:skull-crossed-bones" className="text-ui-cursed text-sm" />
                <span>CURSED DARE</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <Icon icon="game-icons:jack-o-lantern" className="text-ui-accent text-sm" />
                <span>DARE DECIDED</span>
              </span>
            )}
          </div>

          <h2 className={`popup-title ${isCursed ? "cursed" : ""}`}>
            {isCursed ? "THE MACHINE HAS CHOSEN" : "THE WHEEL OF FATE HAS SPOKEN"}
          </h2>

          <div className="popup-details">
            <div className="popup-detail-row highlight-player">
              <span className="popup-label flex items-center gap-1">
                <Icon icon="game-icons:hood" className="text-ui-accent text-sm" />
                <span>{isCursed ? "Victim" : "Player"}</span>
              </span>
              <span className="popup-value player-name">{player || "Unknown"}</span>
            </div>

            {!isCursed ? (
              <>
                <div className="popup-detail-row">
                  <span className="popup-label flex items-center gap-1">
                    <Icon icon="game-icons:price-tag" className="text-ui-accent text-sm" />
                    <span>Category</span>
                  </span>
                  <span className="popup-value">{category || "General"}</span>
                </div>
                <div className="popup-detail-row highlight-game">
                  <span className="popup-label flex items-center gap-1">
                    <Icon icon="game-icons:retro-controller" className="text-ui-accent text-sm" />
                    <span>Selected Game</span>
                  </span>
                  <span className="popup-value game-name">{game || "Mystery Title"}</span>
                </div>
              </>
            ) : (
              <>
                <div className="popup-detail-row highlight-game">
                  <span className="popup-label flex items-center gap-1">
                    <Icon icon="game-icons:retro-controller" className="text-ui-accent text-sm" />
                    <span>Game</span>
                  </span>
                  <span className="popup-value game-name">{game || "Cursed Game"}</span>
                </div>
                <div className="popup-detail-row cursed-challenge-box">
                  <span className="popup-label flex items-center gap-1">
                    <Icon icon="game-icons:lightning-trio" className="text-ui-cursed text-sm" />
                    <span>Dare: {challengeName}</span>
                  </span>
                  <p className="cursed-challenge-text">{challengeText}</p>
                </div>
              </>
            )}
          </div>

          {resolvedStatus && (
            <div className={`popup-resolved-banner ${resolvedStatus}`}>
              {resolvedStatus === "won" ? (
                <span>👑 DARE CONQUERED! Recorded on Leaderboard!</span>
              ) : (
                <span>💀 DARE FAILED! Recorded on Leaderboard!</span>
              )}
            </div>
          )}

          {executablePath && (
            <button
              className="popup-launch-btn flex items-center justify-center gap-2"
              onClick={handleLaunchNow}
              disabled={isLaunching}
            >
              {isLaunching ? (
                <>
                  <Icon icon="game-icons:anticlockwise-rotation" className="animate-spin text-lg" />
                  <span>Launching Game...</span>
                </>
              ) : (
                <>
                  <Icon icon="game-icons:rocket" className="text-lg" />
                  <span>Launch Game Now</span>
                </>
              )}
            </button>
          )}

          {/* Quick Dare Outcome Logger for Leaderboard */}
          <div className="popup-dare-actions">
            <button
              type="button"
              className="popup-outcome-btn win-action"
              onClick={() => handleResolveOutcome(true)}
              title="Record win & award points on leaderboard"
            >
              <Icon icon="game-icons:trophy" className="text-base" />
              <span>Conquered (+{isCursed ? "100" : "50"} Pts)</span>
            </button>
            <button
              type="button"
              className="popup-outcome-btn lose-action"
              onClick={() => handleResolveOutcome(false)}
              title="Record failure on leaderboard"
            >
              <Icon icon="game-icons:skull-crossed-bones" className="text-base" />
              <span>Failed</span>
            </button>
          </div>

          <div className="popup-footer-row">
            <button
              type="button"
              className="popup-leaderboard-link"
              onClick={handleGoToLeaderboard}
            >
              <Icon icon="game-icons:podium" className="text-base" />
              <span>View Leaderboard</span>
            </button>

            <button
              className={`popup-accept-btn ${isCursed ? "cursed" : ""}`}
              onClick={onClose}
              autoFocus
            >
              {isCursed ? "ACCEPT FATE" : "ACCEPT DARE"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
