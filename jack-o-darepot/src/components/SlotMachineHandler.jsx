import { useState, useRef, useEffect } from "react";
import SlotMachine from "./SlotMachine";
import CursedSlotMachine from "./CursedSlotMachine";
import { motion } from "framer-motion";
import CursedText from "./CursedText";
import SpinResultPopup from "./SpinResultPopup";
import { useElectron } from "../hooks/useElectron";
import { useSettings } from "../context/SettingsContext";
import { useGame } from "../context/GameContext";
import "./SlotMachineHandler.css";

export default function SlotMachineHandler({
  players: propPlayers,
  gamesByCategory: propGamesByCategory,
}) {
  const { showNotification, beep } = useElectron();
  const { settings } = useSettings();
  const game = useGame();

  const players = propPlayers ?? game.players;
  const gamesByCategory = propGamesByCategory ?? game.gamesByCategory;
  const {
    curseMeter,
    increaseCurse,
    resetCurse,
    spinCount,
    setSpinCount,
  } = game;

  const [spinning, setSpinning] = useState(false);
  const [cursedTrigger, setCursedTrigger] = useState(false);
  const [isCursedMode, setIsCursedMode] = useState(false);

  const [challenges, setChallenges] = useState([]);
  const [messages, setMessages] = useState([]);

  const [popupData, setPopupData] = useState(null);

  const normalRef = useRef();
  const cursedRef = useRef();

  // Load challenges/messages once (with logs)
  useEffect(() => {
    console.log("[Handler] fetching challenges/messages...");
    fetch("/data/challenges.json")
      .then((res) => res.json())
      .then((data) => {
        console.log("[Handler] fetched challenges:", data);
        setChallenges(data.challenges || []);
      })
      .catch((err) => {
        console.error("[Handler] fetch challenges error:", err);
      });

    fetch("/data/messages.json")
      .then((res) => res.json())
      .then((data) => {
        console.log("[Handler] fetched messages:", data);
        setMessages(data.messages || []);
      })
      .catch((err) => {
        console.error("[Handler] fetch messages error:", err);
      });
  }, []);

  // Helper: normalize name extraction from different shapes (with logs)
  const nameOf = (item, label = "item") => {
    if (item === null || item === undefined) {
      console.log(`[Handler][nameOf] ${label} is null/undefined -> "Unknown"`);
      return "Unknown";
    }
    if (typeof item === "string") {
      console.log(`[Handler][nameOf] ${label} is string ->`, item);
      return item;
    }
    if (typeof item === "number") {
      console.log(`[Handler][nameOf] ${label} is number ->`, String(item));
      return String(item);
    }
    if (typeof item === "object") {
      if ("name" in item && item.name) {
        console.log(`[Handler][nameOf] ${label}.name ->`, item.name);
        return item.name;
      }
      // Try other common fields
      if ("player" in item && typeof item.player === "string") {
        console.log(`[Handler][nameOf] ${label}.player ->`, item.player);
        return item.player;
      }
      if ("game" in item && typeof item.game === "string") {
        console.log(`[Handler][nameOf] ${label}.game ->`, item.game);
        return item.game;
      }
      console.log(`[Handler][nameOf] ${label} object has no name ->`, item);
      return "Unknown";
    }
    console.log(`[Handler][nameOf] ${label} fallback ->`, item);
    return "Unknown";
  };

  // Debug helper to pretty-print args and ref state
  const debugLogSpinArgs = (prefix, args, ref) => {
    console.log(`[Handler][${prefix}] callback args:`, args);
    try {
      console.log(`[Handler][${prefix}] ref.current:`, ref.current);
    } catch (e) {
      console.log(`[Handler][${prefix}] ref.current read error:`, e);
    }
  };

  const startSpin = () => {
    if (!players.length || spinning) {
      console.log("[Handler] startSpin blocked: players.length=", players.length, "spinning=", spinning);
      return;
    }
    console.log("[Handler] Starting spin... isCursedMode=", isCursedMode);
    setSpinning(true);

    if (isCursedMode) {
      console.log("[Handler] Invoking cursedRef.spin()");
      // Accept flexible callback signature
      cursedRef.current.spin((...args) => {
        debugLogSpinArgs("cursed", args, cursedRef);

        // normalize result object
        let result = null;
        if (args.length === 1) result = args[0];
        else if (args.length >= 2) {
          // could be (isCursed, result) or (result, extra)
          if (typeof args[0] === "boolean") result = args[1];
          else result = args[0];
        }
        console.log("[Handler] cursed spin normalized result:", result);

        const playerName = nameOf(result?.player ?? result?.playerName ?? result?.name, "player");
        const challengeName = nameOf(result?.challenge ?? result?.challengeName ?? result?.challenge?.name, "challengeName");
        const challengeText =
          (typeof result?.challenge === "object" && result.challenge?.text) ||
          result?.challengeText ||
          result?.text ||
          "No description";

        console.log("[Handler] cursed resolved ->", { playerName, challengeName, challengeText });

        if (settings.desktopNotifications) {
          showNotification({
            title: "💀 CURSED DARE DECIDED!",
            body: `${playerName}: ${challengeName}`,
          });
        }

        setPopupData({
          type: "cursed",
          player: playerName,
          challengeName,
          challengeText,
          onClose: () => {
            console.log("[Handler] popup closed (cursed) -> switching back to normal");
            setPopupData(null);
            setIsCursedMode(false);
          },
        });

        setSpinning(false);
        setCursedTrigger(false);
      });
    } else {
      console.log("[Handler] Invoking normalRef.spin()");
      normalRef.current.spin((...args) => {
        debugLogSpinArgs("normal", args, normalRef);

        // Normalize callback signature:
        // possible signatures:
        // - (isCursed)
        // - (isCursed, result)
        // - (result)
        // - ( ) -> nothing
        let isCursed = false;
        let result = null;

        if (args.length === 0) {
          // nothing
          isCursed = false;
          result = null;
        } else if (args.length === 1) {
          if (typeof args[0] === "boolean") {
            isCursed = args[0];
            result = null;
          } else {
            isCursed = false;
            result = args[0];
          }
        } else {
          isCursed = Boolean(args[0]);
          result = args[1];
        }

        // If no result, try to fallback to lastResult stored on ref (some components use that)
        if (!result) {
          try {
            result = normalRef.current?.lastResult ?? null;
            console.log("[Handler] fallback result from normalRef.current.lastResult:", result);
          } catch (e) {
            console.log("[Handler] error reading normalRef.current.lastResult:", e);
          }
        }

        console.log("[Handler] normalized normal spin -> isCursed:", isCursed, "result:", result);

        if (isCursed) {
          console.log("[Handler] Normal spin reported CURSED.");
          if (settings.systemBeepOnCurse) beep();
          if (settings.desktopNotifications) {
            showNotification({
              title: "💀 CURSED REEL TRIGGERED!",
              body: "The machine whispers back... cursed mode activated!",
            });
          }
          setCursedTrigger(true);
          resetCurse();
          setTimeout(() => {
            setIsCursedMode(true);
            setSpinning(false);
          }, 800);
          return;
        }

        // Extract names safely
        const playerName = nameOf(result?.player ?? result?.playerName ?? result?.name, "player");
        const categoryName = nameOf(result?.category ?? result?.categoryName ?? result?.category?.name, "category");
        const gameName = nameOf(result?.game ?? result?.gameName ?? result?.game?.name ?? result?.name, "game");

        console.log("[Handler] normal resolved ->", { playerName, categoryName, gameName });

        if (settings.desktopNotifications) {
          showNotification({
            title: "🎃 JACK'O DAREPOT",
            body: `${playerName} got ${gameName} (${categoryName})!`,
          });
        }

        // Update curse and spin count BEFORE popup
        increaseCurse();
        setSpinCount((prev) => prev + 1);

        const gameObj = typeof result?.game === "object" ? result.game : null;

        setPopupData({
          type: "normal",
          player: playerName,
          category: categoryName,
          game: gameName,
          executablePath: gameObj?.executablePath,
          launchArgs: gameObj?.launchArgs,
          onClose: () => {
            console.log("[Handler] popup closed (normal)");
            setPopupData(null);
          },
        });

        setSpinning(false);
      });
    }
  };

  return (
    <div className="handler-container">
      {/* Cursed overlay */}
      <CursedText trigger={cursedTrigger} />

      {/* Slot machine */}
      <motion.div
        className="handler-machine-wrapper"
        animate={spinning ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.2, repeat: spinning ? Infinity : 0 }}
      >
        {!isCursedMode ? (
          <SlotMachine
            ref={normalRef}
            players={players}
            gamesByCategory={gamesByCategory}
            curseMeter={curseMeter}
            increaseCurse={increaseCurse}
            resetCurse={resetCurse}
            spinCount={spinCount}
            setSpinCount={setSpinCount}
            spinning={spinning}
            messages={messages}
            fastSpinMode={settings.fastSpinMode}
            baseCurseChance={settings.baseCurseChance}
            maxCurseCap={settings.maxCurseCap}
          />
        ) : (
          <CursedSlotMachine
            ref={cursedRef}
            players={players}
            gamesByCategory={gamesByCategory}
            challenges={challenges}
            messages={messages}
            spinning={spinning}
            fastSpinMode={settings.fastSpinMode}
          />
        )}
      </motion.div>

      {/* Arcade Dashboard & HUD */}
      <div className="handler-controls-area">
        <div className="arcade-hud-bar">
          <div className="hud-stat-item">
            <span className="hud-stat-label">TOTAL SPINS</span>
            <span className="hud-stat-value">🌀 {spinCount}</span>
          </div>
          <div className="hud-divider" />
          <div className="hud-stat-item">
            <span className="hud-stat-label">LOADED PLAYERS</span>
            <span className="hud-stat-value">👥 {players.length}</span>
          </div>
          <div className="hud-divider" />
          <div className="hud-stat-item">
            <span className="hud-stat-label">MACHINE STATUS</span>
            <span className={`hud-stat-value ${spinning ? "status-spinning" : isCursedMode ? "status-cursed" : "status-ready"}`}>
              {spinning ? "SPINNING..." : isCursedMode ? "CURSED" : "READY"}
            </span>
          </div>
        </div>

        {/* Big Juicy Arcade Spin Button */}
        <motion.button
          className={`arcade-spin-button ${isCursedMode ? "cursed" : ""} ${spinning ? "spinning" : ""}`}
          onClick={startSpin}
          disabled={spinning || !players.length}
          whileHover={!spinning && players.length ? { scale: 1.04 } : {}}
          whileTap={!spinning && players.length ? { scale: 0.96 } : {}}
        >
          <span className="spin-btn-icon">
            {spinning ? "🌀" : isCursedMode ? "👿" : "🎰"}
          </span>
          <span className="spin-btn-text">
            {!players.length
              ? "LOAD PLAYERS FIRST"
              : spinning
              ? "ROLLING FATE..."
              : isCursedMode
              ? "TRIGGER CURSED DARE"
              : "SPIN THE DAREPOT"}
          </span>
        </motion.button>
      </div>

      {/* Popup */}
      {popupData && <SpinResultPopup {...popupData} />}
    </div>
  );
}
