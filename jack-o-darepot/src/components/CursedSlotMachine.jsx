import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import SlotReel from "./SlotReel";
import { motion } from "framer-motion";
import { Howl } from "howler";
import { Icon } from "@iconify/react";
import "./SlotMachine.css";

const CursedSlotMachine = forwardRef(
  ({ players, gamesByCategory, challenges, messages, spinning, fastSpinMode = false }, ref) => {
    const durationMult = fastSpinMode ? 0.5 : 1;
    const [player, setPlayer] = useState("?");
    const [game, setGame] = useState("?");
    const [challengeName, setChallengeName] = useState("?");
    const [challengeText, setChallengeText] = useState("?");
    const [displayText, setDisplayText] = useState("");
    const [preloadedImages, setPreloadedImages] = useState([]);

    const allGames = Object.values(gamesByCategory).flat();
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // ✅ Preload game images
    useEffect(() => {
      const imgs = [];
      Object.values(gamesByCategory).forEach((category) => {
        category.forEach((game) => {
          if (game.image) {
            const img = new Image();
            img.src = game.image;
            imgs.push(img);
          }
        });
      });
      setPreloadedImages(imgs);
    }, [gamesByCategory]);

    // ✅ Spin sound
    const cursedSpinSound = new Howl({
      src: ["/assets/sounds/cursed_spin.mp3"],
      volume: 0.9,
    });

    useImperativeHandle(ref, () => ({
      spin(onComplete) {
        if (!players.length || !allGames.length || !challenges.length) return;

        console.log("[CursedSlotMachine] Starting cursed spin...");
        cursedSpinSound.play();
        setDisplayText(getRandom(messages));

        const selectedPlayer = getRandom(players);
        const selectedGame = getRandom(allGames);
        const selectedChallenge = getRandom(challenges);

        console.log("[CursedSlotMachine] Selected player:", selectedPlayer);
        console.log("[CursedSlotMachine] Selected game:", selectedGame);
        console.log("[CursedSlotMachine] Selected challenge:", selectedChallenge);

        // Update reels
        setPlayer(selectedPlayer.name || selectedPlayer);
        setGame(selectedGame.name || selectedGame);
        setChallengeName(selectedChallenge.name || "???");
        setChallengeText(selectedChallenge.text || "???");

        // 🕒 Wait for reels to finish
        setTimeout(() => {
          console.log("[CursedSlotMachine] Spin complete.");
          const result = {
            player: selectedPlayer,
            game: selectedGame,
            challengeName: selectedChallenge.name,
            challengeText: selectedChallenge.text,
          };

          console.log("[CursedSlotMachine] Finished spin with:", result);
          if (onComplete) onComplete(result);
        }, Math.round(8100 * durationMult));
      },
    }));

    // ✅ Random spinning image for visual feedback
    const getRandomImage = () => {
      if (!preloadedImages.length) return null;
      const randomIndex = Math.floor(Math.random() * preloadedImages.length);
      return preloadedImages[randomIndex].src;
    };

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
                <span>CURSED REELS ACTIVATED</span>
                <Icon icon="game-icons:skull-crossed-bones" className="text-ui-cursed inline-block" />
              </>
            )}
          </motion.div>
          <div className="marquee-indicator cursed" />
        </div>

        <div className="slots-wrapper">
          <SlotReel
            label="VICTIM"
            items={players.map((p) => p.name || p)}
            finalValue={player}
            spinTime={Math.round(4000 * durationMult)}
            spinning={spinning}
            cursed={true}
            pitch={1}
          />

          <SlotReel
            label="GAME"
            items={allGames.map((g) => ({
              name: g.name,
              image: g.image || null,
            }))}
            finalValue={game}
            spinTime={Math.round(6000 * durationMult)}
            spinning={spinning}
            cursed={true}
            pitch={1.15}
            getRandomImage={getRandomImage}
          />

          <SlotReel
            label="CURSED DARE"
            items={challenges.map((c) => c.name || "Unknown Challenge")}
            finalValue={challengeName}
            spinTime={Math.round(8000 * durationMult)}
            spinning={spinning}
            cursed={true}
            pitch={1.3}
          />
        </div>
      </div>
    );
  }
);

export default CursedSlotMachine;
