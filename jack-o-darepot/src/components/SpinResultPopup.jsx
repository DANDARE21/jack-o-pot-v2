import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useElectron } from "../hooks/useElectron";
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
  onClose,
}) {
  const isCursed = type === "cursed";
  const { launchGame, showNotification } = useElectron();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunchNow = async () => {
    if (!executablePath) return;
    setIsLaunching(true);
    try {
      showNotification?.({
        title: `🚀 Launching ${game}`,
        body: `Starting executable from ${executablePath}...`,
      });
      await launchGame({ executablePath, args: launchArgs });
    } finally {
      setTimeout(() => setIsLaunching(false), 1500);
    }
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
            {isCursed ? "💀 CURSED DARE" : "🎃 DARE DECIDED"}
          </div>

          <h2 className={`popup-title ${isCursed ? "cursed" : ""}`}>
            {isCursed ? "THE MACHINE HAS CHOSEN" : "THE WHEEL OF FATE HAS SPOKEN"}
          </h2>

          <div className="popup-details">
            <div className="popup-detail-row highlight-player">
              <span className="popup-label">👤 {isCursed ? "Victim" : "Player"}</span>
              <span className="popup-value player-name">{player || "Unknown"}</span>
            </div>

            {!isCursed ? (
              <>
                <div className="popup-detail-row">
                  <span className="popup-label">🏷️ Category</span>
                  <span className="popup-value">{category || "General"}</span>
                </div>
                <div className="popup-detail-row highlight-game">
                  <span className="popup-label">🎮 Selected Game</span>
                  <span className="popup-value game-name">{game || "Mystery Title"}</span>
                </div>
              </>
            ) : (
              <>
                <div className="popup-detail-row highlight-game">
                  <span className="popup-label">🎮 Game</span>
                  <span className="popup-value game-name">{game || "Cursed Game"}</span>
                </div>
                <div className="popup-detail-row cursed-challenge-box">
                  <span className="popup-label">⚡ Dare: {challengeName}</span>
                  <p className="cursed-challenge-text">{challengeText}</p>
                </div>
              </>
            )}
          </div>

          {executablePath && (
            <button
              className="popup-launch-btn"
              onClick={handleLaunchNow}
              disabled={isLaunching}
            >
              {isLaunching ? "⏳ Launching Game..." : "🚀 Launch Game Now"}
            </button>
          )}

          <button
            className={`popup-accept-btn ${isCursed ? "cursed" : ""}`}
            onClick={onClose}
            autoFocus
          >
            {isCursed ? "ACCEPT YOUR FATE" : "ACCEPT THE DARE"}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
