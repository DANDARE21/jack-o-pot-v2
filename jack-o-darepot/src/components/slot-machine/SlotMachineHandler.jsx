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
  const {
    activeModifiers,
    modifiers,
    isModifierActive,
    getModifierSettings,
    setModifierEnabled,
  } = useModifiers();
  const { navigate } = useNavigation();

  const isCurseModifierActive = isModifierActive("jack_o_curse");
  const curseSettings = getModifierSettings("jack_o_curse") || {};

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
  const [cursedOverlayText, setCursedOverlayText] = useState("CURSED!");
  const [isCursedMode, setIsCursedMode] = useState(false);
  const [primedCursedSpin, setPrimedCursedSpin] = useState(false);

  const [challenges, setChallenges] = useState([]);
  const [messages, setMessages] = useState([]);

  const [popupData, setPopupData] = useState(null);

  const normalRef = useRef();
  const cursedRef = useRef();

  // Load challenges/messages
  useEffect(() => {
    fetch("/data/challenges.json")
      .then((res) => res.json())
      .then((data) => {
        setChallenges(data.challenges || []);
      })
      .catch((err) => {
        console.error("[Handler] fetch challenges error:", err);
      });

    fetch("/data/messages.json")
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
      })
      .catch((err) => {
        console.error("[Handler] fetch messages error:", err);
      });
  }, []);

  const nameOf = (item, label = "item") => {
    if (item === null || item === undefined) return "Unknown";
    if (typeof item === "string") return item;
    if (typeof item === "number") return String(item);
    if (typeof item === "object") {
      if ("name" in item && item.name) return item.name;
      if ("player" in item && typeof item.player === "string") return item.player;
      if ("game" in item && typeof item.game === "string") return item.game;
      return "Unknown";
    }
    return "Unknown";
  };

  const startSpin = () => {
    if (!players.length || spinning) return;
    setSpinning(true);

    const isRunningCursedSpin = isCursedMode || primedCursedSpin;

    if (isRunningCursedSpin) {
      console.log("[Handler] Launching CURSED SPIN...");
      setIsCursedMode(true);
      setPrimedCursedSpin(false);

      // Brief delay to ensure CursedSlotMachine is mounted and ref is ready
      setTimeout(() => {
        cursedRef.current?.spin((...args) => {
          let result =
            args.length === 1
              ? args[0]
              : typeof args[0] === "boolean"
              ? args[1]
              : args[0];

          console.log("[Handler] cursed spin callback resolved:", result);

          const playerName = nameOf(result?.player, "player");
          const gameName = nameOf(result?.game, "game");
          const modifierObj = result?.modifier || null;
          const challengeName =
            result?.challengeName ||
            result?.challenge?.name ||
            `${modifierObj?.name || "Cursed"} Dare`;
          const challengeText =
            result?.challengeText ||
            result?.challenge?.text ||
            `Conquer ${gameName} with the activated modifier!`;

          // Activate the rolled modifier in-game
          if (modifierObj?.id) {
            console.log("[Handler] Activating modifier into game:", modifierObj.name);
            setModifierEnabled(modifierObj.id, true);
          }

          // Reset the curse meter back to 0
          resetCurse();

          if (settings.desktopNotifications) {
            showNotification({
              title: "CURSED DARE & MODIFIER ACTIVATED!",
              body: `${playerName}: ${gameName} + ${modifierObj?.name || "Modifier"}!`,
            });
          }

          game.recordPlayerSpin?.(playerName);

          const gameObj = typeof result?.game === "object" ? result.game : null;

          setPopupData({
            type: "cursed",
            player: playerName,
            game: gameName,
            gameImage: gameObj?.image,
            executablePath: gameObj?.executablePath,
            launchArgs: gameObj?.launchArgs,
            modifier: modifierObj,
            challengeName,
            challengeText,
            onResolveDare: (won) => {
              game.recordChallengeOutcome?.(playerName, {
                won,
                points: won ? 100 : 0,
                dareName: `${challengeName} (${modifierObj?.name || "Cursed"})`,
              });
            },
            onClose: () => {
              setPopupData(null);
              setIsCursedMode(false);
              setPrimedCursedSpin(false);
            },
          });

          setSpinning(false);
          setCursedTrigger(false);
        });
      }, 50);
    } else {
      console.log("[Handler] Launching NORMAL spin...");
      normalRef.current?.spin((isJackopot, result) => {
        console.log("[Handler] normal spin callback resolved:", { isJackopot, result });

        if (isJackopot) {
          // 6-6-6 JACK'O POT HIT!
          console.log("[Handler] 666 JACK'O POT! Priming next spin as CURSED SPIN!");
          if (settings.systemBeepOnCurse) beep();
          if (settings.desktopNotifications) {
            showNotification({
              title: "🔥 JACK'O POT! 6-6-6 UNLEASHED! 🔥",
              body: "The reels hit 666! The next spin is a CURSED SPIN!",
            });
          }

          setCursedOverlayText("JACK'O POT!");
          setCursedTrigger(true);
          setPrimedCursedSpin(true);
          setSpinning(false);
          return;
        }

        // Normal spin result
        const playerName = nameOf(result?.player ?? result?.playerName ?? result?.name, "player");
        const categoryName = nameOf(result?.category ?? result?.categoryName ?? result?.category?.name, "category");
        const gameName = nameOf(result?.game ?? result?.gameName ?? result?.game?.name ?? result?.name, "game");

        if (settings.desktopNotifications) {
          showNotification({
            title: "JACK'O DAREPOT",
            body: `${playerName} got ${gameName} (${categoryName})!`,
          });
        }

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
            setPopupData(null);
          },
        });

        setSpinning(false);
      });
    }
  };

  const spinExpansionScale = settings.spinExpansionScale ?? 1.13;
  const controlsOffsetY = spinning
    ? Math.round((spinExpansionScale - 1) * 160 + 24)
    : 0;

  const isCursedActive = isCursedMode || primedCursedSpin;

  return (
    <div className="handler-container">
      {/* Cursed Overlay Announcement */}
      <CursedText trigger={cursedTrigger} text={cursedOverlayText} />

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
            curseModifierActive={isCurseModifierActive}
            curseSettings={curseSettings}
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
            modifiers={modifiers}
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
                <span className={`hud-status-badge ${isCursedActive ? "status-cursed" : "status-ready"}`}>
                  <span className="status-indicator-dot" />
                  <span>
                    {primedCursedSpin
                      ? "666 PRIMED"
                      : isCursedMode
                      ? "CURSED"
                      : "READY"}
                  </span>
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
          className={`arcade-spin-button ${isCursedActive ? "cursed" : ""} ${spinning ? "spinning" : ""}`}
          onClick={startSpin}
          disabled={spinning || !players.length}
          whileHover={!spinning && players.length ? { scale: 1.04 } : {}}
          whileTap={!spinning && players.length ? { scale: 0.96 } : {}}
        >
          <span className="spin-btn-icon flex items-center justify-center">
            {spinning ? (
              <Icon icon="game-icons:anticlockwise-rotation" className="animate-spin text-2xl" />
            ) : isCursedActive ? (
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
              : primedCursedSpin
              ? "UNLEASH 666 CURSED SPIN"
              : isCursedMode
              ? "TRIGGER CURSED SPIN"
              : "SPIN THE DAREPOT"}
          </span>
        </motion.button>
      </motion.div>

      {/* Result Popup */}
      {popupData && <SpinResultPopup {...popupData} />}
    </div>
  );
}
