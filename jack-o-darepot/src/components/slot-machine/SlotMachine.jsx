import { useState, useEffect, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import SlotReel from "./SlotReel";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";
import { Icon } from "@iconify/react";
import "./SlotMachine.css";

const SlotMachine = forwardRef(
  (
    {
      players,
      gamesByCategory,
      curseMeter = 0,
      increaseCurse,
      resetCurse,
      setSpinCount,
      spinning,
      fastSpinMode = false,
      curseModifierActive = false,
      curseSettings = {},
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
    const [preloadedImages, setPreloadedImages] = useState([]);
    const [teasingReel, setTeasingReel] = useState(-1); // -1: none, 0: player, 1: category, 2: game
    const [curseSurgeNotice, setCurseSurgeNotice] = useState(false);

    // Stable memoized collections to prevent unnecessary re-render interruptions
    const categories = useMemo(() => Object.keys(gamesByCategory || {}), [gamesByCategory]);
    const allGames = useMemo(() => Object.values(gamesByCategory || {}).flat(), [gamesByCategory]);
    const playerItems = useMemo(() => (players || []).map((p) => p.name || p), [players]);
    const gameItems = useMemo(
      () => allGames.map((g) => ({ name: g.name, image: g.image || null })),
      [allGames]
    );

    const getRandom = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);

    // Preload all game images once
    useEffect(() => {
      const imgs = [];
      Object.values(gamesByCategory || {}).forEach((cat) => {
        cat.forEach((g) => {
          if (g.image) {
            const img = new Image();
            img.src = g.image;
            imgs.push(img);
          }
        });
      });
      setPreloadedImages(imgs);
    }, [gamesByCategory]);

    // Load random spin messages
    useEffect(() => {
      fetch("/data/messages.json")
        .then((res) => res.json())
        .then((data) => setMessages(data.messages || []))
        .catch(console.error);
    }, []);

    // Spin start sound
    const spinStartSound = useMemo(() => {
      try {
        return new Howl({
          src: ["/assets/sounds/spin.mp3"],
          volume: 0.9,
          loop: true,
        });
      } catch (e) {
        return null;
      }
    }, []);

    useEffect(() => {
      return () => {
        spinStartSound?.stop();
      };
    }, [spinStartSound]);

    const handleTeaseHit = useCallback(() => {
      const inc = curseSettings?.curseIncrement ?? 8;
      if (increaseCurse) increaseCurse(inc);
      setCurseSurgeNotice(true);
      setTimeout(() => setCurseSurgeNotice(false), 1400);
    }, [curseSettings?.curseIncrement, increaseCurse]);

    useImperativeHandle(ref, () => ({
      spin(onComplete) {
        if (!players.length || !allGames.length) return;

        spinStartSound?.stop();
        spinStartSound?.play();
        setDisplayText(getRandom(messages) || "ROLLING FATE...");
        // Crucial: keep cursed styles FALSE while spinning so players cannot anticipate Jack'O Pot
        setCursed(false);
        setTeasingReel(-1);

        // Increase spin count
        setSpinCount((prev) => {
          const next = prev + 1;
          localStorage.setItem("spinCount", next);
          return next;
        });

        let isJackopot = false;
        let chosenTeaseReel = -1;

        // If the Curse Modifier is active, calculate Jack'O Pot and Six Tease odds
        if (curseModifierActive) {
          const baseChance = curseSettings.baseJackopotChance ?? 3;
          const maxChance = curseSettings.maxJackopotChance ?? 60;
          const jackopotChance = Math.min(
            100,
            baseChance + (curseMeter / 100) * (maxChance - baseChance)
          );

          isJackopot = Math.random() * 100 < jackopotChance;

          if (!isJackopot) {
            const teaseChance = curseSettings.sixTeaseChance ?? 35;
            const willTease = Math.random() * 100 < teaseChance;
            if (willTease) {
              const choices = [0, 1, 2, 2];
              chosenTeaseReel = choices[Math.floor(Math.random() * choices.length)];
            }
          }
        }

        // Note: do NOT setCursed(isJackopot) here! It will be set only when all reels end!
        setTeasingReel(chosenTeaseReel);

        let finalPlayerVal, finalCategoryVal, finalGameObj;

        if (isJackopot) {
          finalPlayerVal = "6";
          finalCategoryVal = "6";
          finalGameObj = { name: "6", image: "/assets/images/six.png" };
        } else {
          const chosenPlayer = getRandom(players);
          finalPlayerVal = chosenPlayer?.name || chosenPlayer || "Player";
          finalGameObj = getRandom(allGames);
          finalCategoryVal =
            Object.keys(gamesByCategory).find((cat) =>
              gamesByCategory[cat].some((g) => g.name === finalGameObj.name)
            ) || categories[0] || "General";
        }

        setPlayer(finalPlayerVal);
        setCategory(finalCategoryVal);
        setGame(finalGameObj?.name || "Game");

        // Precise timing calculation ensuring all reels, holds, and re-spins finish cleanly
        const baseSpinTimes = [
          Math.round(3500 * durationMult),
          Math.round(4800 * durationMult),
          Math.round(6200 * durationMult),
        ];

        let maxDuration = baseSpinTimes[2];
        if (chosenTeaseReel !== -1) {
          // Tease hold ~1100ms + re-spin ~650ms = ~1750ms
          const teaseFinishTime = baseSpinTimes[chosenTeaseReel] + Math.round(1800 * durationMult);
          maxDuration = Math.max(maxDuration, teaseFinishTime);
        }

        // 1. STOP THE SPIN SOUND ONCE THE LAST RESULT IS DISPLAYED
        // and apply cursed styles ONLY after the machine ends
        setTimeout(() => {
          spinStartSound?.stop();

          if (isJackopot) {
            // Apply cursed styles to the machine only now that all 3 sixes have locked in!
            setCursed(true);
            setDisplayText("🔥 666 JACK'O POT! NEXT SPIN IS CURSED! 🔥");
          } else if (finalGameObj?.text) {
            setDisplayText(finalGameObj.text);
          }
        }, maxDuration);

        // 2. WAIT A FULL SECOND BEFORE SHOWING THE RESULT MODAL
        // so players can clearly see the results and the still machine
        const modalDelay = maxDuration + Math.round(1100 * durationMult);

        setTimeout(() => {
          if (onComplete) {
            const result = {
              player: finalPlayerVal,
              category: finalCategoryVal,
              game: finalGameObj,
            };
            console.log("[SlotMachine] Finished spin with:", { isJackopot, result });
            onComplete(isJackopot, result);
          }
        }, modalDelay);
      },
    }));

    return (
      <div className={`slot-machine-cabinet ${cursed ? "cursed" : ""} ${spinning ? "is-spinning" : ""}`}>
        {/* Arcade Marquee Header */}
        <div className={`marquee-bar ${cursed ? "cursed" : ""}`}>
          <div className={`marquee-indicator ${cursed ? "cursed" : ""}`} />
          <motion.div
            className={`marquee-text ${cursed ? "cursed" : ""}`}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            {displayText || "SPIN THE REELS • SEAL YOUR FATE"}
          </motion.div>
          <div className={`marquee-indicator ${cursed ? "cursed" : ""}`} />
        </div>

        {/* Reels Wrapper */}
        <div className="slots-wrapper">
          <SlotReel
            label="PLAYER"
            items={playerItems}
            finalValue={player}
            spinTime={Math.round(3500 * durationMult)}
            spinning={spinning}
            cursed={cursed}
            pitch={1}
            teaseSix={teasingReel === 0}
            onTeaseHit={handleTeaseHit}
            allowSixInSpin={curseModifierActive}
            fastSpinMode={fastSpinMode}
          />

          <SlotReel
            label="CATEGORY"
            items={categories}
            finalValue={category}
            spinTime={Math.round(4800 * durationMult)}
            spinning={spinning}
            cursed={cursed}
            pitch={1.1}
            teaseSix={teasingReel === 1}
            onTeaseHit={handleTeaseHit}
            allowSixInSpin={curseModifierActive}
            fastSpinMode={fastSpinMode}
          />

          <SlotReel
            label="GAME"
            items={gameItems}
            finalValue={game}
            spinTime={Math.round(6200 * durationMult)}
            spinning={spinning}
            cursed={cursed}
            pitch={1.25}
            teaseSix={teasingReel === 2}
            onTeaseHit={handleTeaseHit}
            allowSixInSpin={curseModifierActive}
            fastSpinMode={fastSpinMode}
          />
        </div>

        {/* Curse Bar / Gauge - ONLY shown when Curse Modifier is active */}
        {curseModifierActive && (
          <div className="curse-gauge-container">
            <div className="curse-gauge-header">
              <span className="curse-gauge-title flex items-center gap-1.5">
                <Icon
                  icon="game-icons:skull-crossed-bones"
                  className={`text-ui-cursed inline-block text-base ${
                    curseMeter > 50 ? "animate-pulse" : ""
                  }`}
                />
                <span>CURSE METER</span>
                <AnimatePresence>
                  {curseSurgeNotice && (
                    <motion.span
                      initial={{ opacity: 0, y: -4, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="text-xs font-bold text-ui-cursed ml-1"
                    >
                      +{curseSettings?.curseIncrement ?? 8}% SURGE!
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="curse-gauge-value flex items-center gap-1">
                <span>{Math.round(curseMeter)}%</span>
                {curseMeter >= 75 && (
                  <span className="text-[10px] bg-ui-cursed text-black font-extrabold px-1 rounded">
                    DANGER
                  </span>
                )}
              </span>
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
        )}
      </div>
    );
  }
);

export default SlotMachine;
