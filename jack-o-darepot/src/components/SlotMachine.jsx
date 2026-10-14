import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import SlotReel from "./SlotReel";
import { motion } from "framer-motion";
import { Howl } from "howler";
import { Icon } from "@iconify/react";
import "./SlotMachine.css";

const SlotMachine = forwardRef(
  (
    {
      players,
      gamesByCategory,
      curseMeter,
      increaseCurse,
      resetCurse,
      setSpinCount,
      spinning,
      fastSpinMode = false,
      baseCurseChance = 5,
      maxCurseCap = 100,
    },
    ref
  ) => {
    const durationMult = fastSpinMode ? 0.5 : 1;
    const [player, setPlayer] = useState("?");
    const [category, setCategory] = useState("?");
    const [game, setGame] = useState("?");
    const [cursed, setCursed] = useState(false);
    const [displayText, setDisplayText] = useState("");
    const [messages, setMessages] = useState([]);
    const [preloadedImages, setPreloadedImages] = useState([]); // ✅ for random spinning images

    const categories = Object.keys(gamesByCategory);
    const allGames = Object.values(gamesByCategory).flat();
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    

    // ✅ Preload all game images once
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

    // ✅ Load random spin messages
    useEffect(() => {
      fetch("/data/messages.json")
        .then((res) => res.json())
        .then((data) => setMessages(data.messages))
        .catch(console.error);
    }, []);

    // ✅ Spin start sound
    const spinStartSound = new Howl({
      src: ["/assets/sounds/spin.mp3"],
      volume: 0.9,
    });

    useImperativeHandle(ref, () => ({
      spin(onComplete) {
        if (!players.length || !allGames.length) return;

        spinStartSound.play();
        setDisplayText(getRandom(messages)); // 🎰 random message while spinning
        setCursed(false);

        // ✅ Increase spin count and persist
        setSpinCount((prev) => {
          const next = prev + 1;
          localStorage.setItem("spinCount", next);
          return next;
        });

        const curseChance = Math.min((baseCurseChance || 5) + (curseMeter / 2), (maxCurseCap || 100) / 2);
        const isCursed = Math.random() * 100 < curseChance;
        setCursed(isCursed);

        const finalPlayer = isCursed ? "6" : getRandom(players);
        let finalGameObj, finalCategory;

        if (isCursed) {
          finalGameObj = null;
          finalCategory = "6";
        } else {
          finalGameObj = getRandom(allGames);
          finalCategory = Object.keys(gamesByCategory).find((cat) =>
            gamesByCategory[cat].some((g) => g.name === finalGameObj.name)
          );
        }

        setPlayer(finalPlayer);
        setCategory(finalCategory);
        setGame(finalGameObj?.name || "6");

        // 🕒 Wait for reels to finish
        setTimeout(() => {
          if (isCursed) {
            resetCurse();
            setDisplayText("CURSED");
          } else {
            increaseCurse();
            localStorage.setItem("curseMeter", curseMeter);
            // ✅ Only update text if game has a specific message
            if (finalGameObj?.text) {
              setDisplayText(finalGameObj.text);
            }
          }
          if (onComplete) {
            const result = {
              player: finalPlayer,
              category: finalCategory,
              game: finalGameObj,
            };
          
            console.log("[SlotMachine] Finished spin with:", result);
            onComplete(isCursed, result);
          }
          
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
      <div className={`slot-machine-cabinet ${cursed ? "cursed" : ""} ${spinning ? "is-spinning" : ""}`}>
        {/* Arcade Marquee Header */}
        <div className="marquee-bar">
          <div className="marquee-indicator" />
          <motion.div
            className="marquee-text"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {displayText || "SPIN THE REELS • SEAL YOUR FATE"}
          </motion.div>
          <div className="marquee-indicator" />
        </div>

        {/* Reels Wrapper */}
        <div className="slots-wrapper">
          <SlotReel
            label="PLAYER"
            items={players}
            finalValue={player}
            spinTime={Math.round(4000 * durationMult)}
            spinning={spinning}
            cursed={cursed}
            pitch={1}
          />

          <SlotReel
            label="CATEGORY"
            items={categories}
            finalValue={category}
            spinTime={Math.round(6000 * durationMult)}
            spinning={spinning}
            cursed={cursed}
            pitch={1.1}
          />

          {/* Game reel: show images while spinning */}
          <SlotReel
            label="GAME"
            items={allGames.map((g) => ({
              name: g.name,
              image: g.image || null,
            }))}
            finalValue={game}
            spinTime={Math.round(8000 * durationMult)}
            spinning={spinning}
            cursed={cursed}
            pitch={1.25}
            getRandomImage={getRandomImage}
          />
        </div>

        {/* Curse Bar / Gauge */}
        <div className="curse-gauge-container">
          <div className="curse-gauge-header">
            <span className="curse-gauge-title flex items-center">
              <Icon icon="game-icons:skull-crossed-bones" className="text-ui-cursed inline-block mr-1 text-base" /> CURSE METER
            </span>
            <span className="curse-gauge-value">{curseMeter}%</span>
          </div>
          <div className="curse-track">
            <motion.div
              className="curse-bar-fill"
              style={{ width: `${Math.min(curseMeter, 100)}%` }}
              animate={
                curseMeter > 50
                  ? { opacity: [0.85, 1, 0.85] }
                  : { opacity: 1 }
              }
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default SlotMachine;
