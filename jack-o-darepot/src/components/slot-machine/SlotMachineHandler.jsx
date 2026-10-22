import { useState, useRef, useEffect } from "react";
import SlotMachine from "./SlotMachine";
import CursedSlotMachine from "./CursedSlotMachine";
import { motion, AnimatePresence } from "framer-motion";
import CursedText from "./CursedText";
import SpinResultPopup from "./SpinResultPopup";
import { useElectron } from "@/hooks";
import { useSettings, useGame, useModifiers } from "@/context";
import { useNavigation, SCREENS } from "@/navigation";
import { Icon } from "@iconify/react";
import "./SlotMachineHandler.css";

export default function SlotMachineHandler({
  players: propPlayers,
  gamesByCategory: propGamesByCategory,
}) {
  const { showNotification, beep } = useElectron();
  const { settings } = useSettings();
  const game = useGame();
  const { activeModifiers } = useModifiers();
  const { navigate } = useNavigation();

  const players = propPlayers ?? game.players;
  const gamesByCategory = propGamesByCategory ?? game.gamesByCategory;
  const {
    curseMeter,
    increaseCurse,
    resetCurse,
    spinCount,
    setSpinCount,
    isSpinning: spinning,
    setIsSpinning: setSpinning,
  } = game;

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
        const gameName = nameOf(result?.game ?? result?.gameName ?? result?.game?.name, "game");
        const challengeName = nameOf(result?.challenge ?? result?.challengeName ?? result?.challenge?.name, "challengeName");
        const challengeText =
          (typeof result?.challenge === "object" && result.challenge?.text) ||
          result?.challengeText ||
          result?.text ||
          "No description";

        console.log("[Handler] cursed resolved ->", { playerName, gameName, challengeName, challengeText });

        if (settings.desktopNotifications) {
          showNotification({
            title: "CURSED DARE DECIDED!",
            body: `${playerName}: ${challengeName}`,
          });
        }

        // Record player spin on leaderboard
        game.recordPlayerSpin?.(playerName);

        const gameObj = typeof result?.game === "object" ? result.game : null;

        setPopupData({
          type: "cursed",
          player: playerName,
          game: gameName,
          gameImage: gameObj?.image,
          executablePath: gameObj?.executablePath,
          launchArgs: gameObj?.launchArgs,
          challengeName,
          challengeText,
          onResolveDare: (won) => {
            game.recordChallengeOutcome?.(playerName, {
              won,
              points: won ? 100 : 0,
              dareName: challengeName,
            });
          },
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
              title: "CURSED REEL TRIGGERED!",
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
            title: "JACK'O DAREPOT",
            body: `${playerName} got ${gameName} (${categoryName})!`,
          });
        }

        // Update curse and spin count BEFORE popup
        increaseCurse();
        setSpinCount((prev) => prev + 1);
        game.recordPlayerSpin?.(playerName);

        const gameObj = typeof result?.game === "object" ? result.game : null;

        setPopupData({
          type: "normal",
          player: playerName,
          category: categoryName,
          game: gameName,
          gameImage: gameObj?.image,
          executablePath: gameObj?.executablePath,
          launchArgs: gameObj?.launchArgs,
          onResolveDare: (won) => {
            game.recordChallengeOutcome?.(playerName, {
              won,
              points: won ? 50 : 0,
              dareName: `${gameName} (${categoryName})`,
            });
          },
          onClose: () => {
            console.log("[Handler] popup closed (normal)");
            setPopupData(null);
          },
        });

        setSpinning(false);
      });
    }
  };

  const spinExpansionScale = settings.spinExpansionScale ?? 1.13;
  // When spinning, the stats bar hides. Calculate clearance so the spin button positions cleanly below the enlarged cabinet
  const controlsOffsetY = spinning
    ? Math.round((spinExpansionScale - 1) * 160 + 24)
    : 0;

  return (
    <div className="handler-container">
      {/* Cursed overlay */}
      <CursedText trigger={cursedTrigger} />

      {/* Slot machine */}
      <motion.div
        className={`handler-machine-wrapper ${spinning ? "is-machine-spinning" : ""}`}
        animate={
          spinning
            ? { scale: spinExpansionScale, x: [-2, 2, -2, 2, 0] }
            : { scale: 1, x: 0 }
        }
        transition={{
          scale: { duration: 0.5, ease: [0.25, 1, 0.5, 1] },
          x: { duration: 0.18, repeat: spinning ? Infinity : 0, ease: "linear" },
        }}
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
      <motion.div
        className="handler-controls-area"
        animate={{ y: controlsOffsetY }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
      >
        <AnimatePresence initial={false}>
          {!spinning && (
            <motion.div
              key="arcade-hud-panel"
              className="arcade-hud-panel"
              initial={{ opacity: 0, height: 0, scale: 0.95, paddingTop: 0, paddingBottom: 0 }}
              animate={{ opacity: 1, height: "auto", scale: 1, paddingTop: 10, paddingBottom: 10 }}
              exit={{ opacity: 0, height: 0, scale: 0.95, paddingTop: 0, paddingBottom: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            >
              <div className="hud-stat-item">
                <span className="hud-stat-label">TOTAL SPINS</span>
                <span className="hud-stat-value flex items-center gap-1.5">
                  <Icon icon="game-icons:anticlockwise-rotation" className="text-ui-accent text-base" />
                  <span>{spinCount}</span>
                </span>
              </div>
              <div className="hud-divider" />
              <div className="hud-stat-item">
                <span className="hud-stat-label">LOADED PLAYERS</span>
                <span className="hud-stat-value flex items-center gap-1.5">
                  <Icon icon="game-icons:crowd" className="text-ui-accent text-base" />
                  <span>{players.length}</span>
                </span>
              </div>
              <div className="hud-divider" />
              <div className="hud-stat-item">
                <span className="hud-stat-label">MACHINE STATUS</span>
                <span className={`hud-status-badge ${isCursedMode ? "status-cursed" : "status-ready"}`}>
                  <span className="status-indicator-dot" />
                  <span>{isCursedMode ? "CURSED" : "READY"}</span>
                </span>
              </div>
              <div className="hud-divider" />
              <div
                className="hud-stat-item hud-stat-clickable cursor-pointer"
                onClick={() => navigate(SCREENS.MODIFIERS)}
                title="Manage Slot Modifiers (Press M)"
              >
                <span className="hud-stat-label">MODIFIERS</span>
                <span className="hud-stat-value flex items-center gap-1.5 text-ui-accent hover:underline">
                  <Icon icon="game-icons:magic-swirl" className="text-ui-accent text-base" />
                  <span>{activeModifiers.length > 0 ? `${activeModifiers.length} ACTIVE` : "MUTED"}</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Big Juicy Arcade Spin Button */}
        <motion.button
          className={`arcade-spin-button ${isCursedMode ? "cursed" : ""} ${spinning ? "spinning" : ""}`}
          onClick={startSpin}
          disabled={spinning || !players.length}
          whileHover={!spinning && players.length ? { scale: 1.04 } : {}}
          whileTap={!spinning && players.length ? { scale: 0.96 } : {}}
        >
          <span className="spin-btn-icon flex items-center justify-center">
            {spinning ? (
              <Icon icon="game-icons:anticlockwise-rotation" className="animate-spin text-2xl" />
            ) : isCursedMode ? (
              <Icon icon="game-icons:skull-crossed-bones" className="text-2xl" />
            ) : (
              <Icon icon="game-icons:rolling-dices" className="text-2xl" />
            )}
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
      </motion.div>

      {/* Popup */}
      {popupData && <SpinResultPopup {...popupData} />}
    </div>
  );
}
