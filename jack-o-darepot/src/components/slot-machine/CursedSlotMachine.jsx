import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import SlotReel from "./SlotReel";
import { motion } from "framer-motion";
import { Howl } from "howler";
import { Icon } from "@iconify/react";
import { useModifiers } from "@/context";
import "./SlotMachine.css";

const CursedSlotMachine = forwardRef(
  (
    {
      players = [],
      gamesByCategory = {},
      challenges = [],
      messages = [],
      spinning,
      fastSpinMode = false,
      modifiers: propModifiers,
    },
    ref
  ) => {
    const durationMult = fastSpinMode ? 0.5 : 1;
    const { modifiers: contextModifiers } = useModifiers();
    const modifiersList = propModifiers || contextModifiers || [];

    // Filter out the curse trigger modifier itself so it selects another fun modifier to activate
    const safeModifiers = useMemo(() => {
      const eligible = modifiersList.filter((m) => m.id !== "jack_o_curse");
      return eligible.length > 0 ? eligible : modifiersList;
    }, [modifiersList]);

    const allGames = useMemo(() => Object.values(gamesByCategory || {}).flat(), [gamesByCategory]);
    const playerItems = useMemo(() => (players || []).map((p) => p.name || p), [players]);
    const gameItems = useMemo(
      () => allGames.map((g) => ({ name: g.name, image: g.image || null })),
      [allGames]
    );
    const modifierItems = useMemo(
      () => safeModifiers.map((m) => ({ name: m.name, icon: m.icon })),
      [safeModifiers]
    );

    const [player, setPlayer] = useState("?");
    const [game, setGame] = useState("?");
    const [modifierName, setModifierName] = useState("?");
    const [displayText, setDisplayText] = useState("");
    const [preloadedImages, setPreloadedImages] = useState([]);

    const getRandom = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);

    // Preload game images
    useEffect(() => {
      const imgs = [];
      Object.values(gamesByCategory || {}).forEach((category) => {
        category.forEach((g) => {
          if (g.image) {
            const img = new Image();
            img.src = g.image;
            imgs.push(img);
          }
        });
      });
      setPreloadedImages(imgs);
    }, [gamesByCategory]);

    // Spin sound
    const cursedSpinSound = useMemo(() => {
      try {
        return new Howl({
          src: ["/assets/sounds/spin.mp3"],
          volume: 0.9,
        });
      } catch (e) {
        return null;
      }
    }, []);

    useEffect(() => {
      return () => {
        cursedSpinSound?.stop();
      };
    }, [cursedSpinSound]);

    useImperativeHandle(ref, () => ({
      spin(onComplete) {
        if (!players.length || !allGames.length) return;

        console.log("[CursedSlotMachine] Starting cursed spin...");
        cursedSpinSound?.play();
        setDisplayText("⚡ CURSED SPIN UNLEASHED • ROLLING MODIFIER & GAME ⚡");

        const selectedPlayer = getRandom(players);
        const selectedGame = getRandom(allGames);
        const selectedModifier = getRandom(safeModifiers) || {
          id: "phantom_reel",
          name: "Phantom Spectral Reel",
        };
        const selectedChallenge = challenges.length > 0 ? getRandom(challenges) : null;

        // Update reels
        setPlayer(selectedPlayer?.name || selectedPlayer || "Victim");
        setGame(selectedGame?.name || selectedGame || "Cursed Game");
        setModifierName(selectedModifier.name);

        const maxDuration = Math.round(8000 * durationMult);

        // 1. Stop spin sound as soon as the last reel locks in
        setTimeout(() => {
          cursedSpinSound?.stop();
        }, maxDuration);

        // 2. Wait 1 full second with the still machine showing results before calling onComplete
        const modalDelay = maxDuration + Math.round(1100 * durationMult);

        setTimeout(() => {
          console.log("[CursedSlotMachine] Cursed spin complete.");
          const result = {
            player: selectedPlayer,
            game: selectedGame,
            modifier: selectedModifier,
            challengeName: selectedChallenge?.name || `${selectedModifier.name} Trial`,
            challengeText:
              selectedChallenge?.text ||
              `Play ${selectedGame.name || "the game"} with ${selectedModifier.name} active!`,
          };

          if (onComplete) onComplete(result);
        }, modalDelay);
      },
    }));

    return (
      <div className={`slot-machine-cabinet cursed ${spinning ? "is-spinning" : ""}`}>
        {/* Arcade Marquee Header */}
        <div className="marquee-bar cursed">
          <div className="marquee-indicator cursed" />
          <motion.div
            className="marquee-text cursed flex items-center justify-center gap-2"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {displayText ? (
              displayText
            ) : (
              <>
                <Icon icon="game-icons:skull-crossed-bones" className="text-ui-cursed inline-block" />
                <span>CURSED REELS ACTIVATED • ACTIVATING MODIFIER</span>
                <Icon icon="game-icons:skull-crossed-bones" className="text-ui-cursed inline-block" />
              </>
            )}
          </motion.div>
          <div className="marquee-indicator cursed" />
        </div>

        <div className="slots-wrapper">
          <SlotReel
            label="VICTIM"
            items={playerItems}
            finalValue={player}
            spinTime={Math.round(4000 * durationMult)}
            spinning={spinning}
            cursed={true}
            pitch={1}
            allowSixInSpin={true}
            fastSpinMode={fastSpinMode}
          />

          <SlotReel
            label="GAME"
            items={gameItems}
            finalValue={game}
            spinTime={Math.round(6000 * durationMult)}
            spinning={spinning}
            cursed={true}
            pitch={1.15}
            allowSixInSpin={true}
            fastSpinMode={fastSpinMode}
          />

          <SlotReel
            label="CURSED MODIFIER"
            items={modifierItems}
            finalValue={modifierName}
            spinTime={Math.round(8000 * durationMult)}
            spinning={spinning}
            cursed={true}
            pitch={1.3}
            allowSixInSpin={true}
            fastSpinMode={fastSpinMode}
          />
        </div>
      </div>
    );
  }
);

export default CursedSlotMachine;
