import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Howl } from "howler";

export default function SlotReel({
  items = [],
  finalValue,
  spinTime = 2000,
  cursed = false,
  spinning: parentSpinning,
  pitch = 1.0,
  label = "",
  teaseSix = false,
  onTeaseHit,
  allowSixInSpin = false,
  fastSpinMode = false,
}) {
  const durationMult = fastSpinMode ? 0.5 : 1;
  const [displayValue, setDisplayValue] = useState(finalValue || "?");
  const [topGhost, setTopGhost] = useState(null);
  const [bottomGhost, setBottomGhost] = useState(null);
  const [phase, setPhase] = useState("idle"); // "idle" | "spinning" | "six_landed" | "respinning" | "revealed"

  // Stable references so parent re-renders never interrupt an active spin
  const itemsRef = useRef(items);
  const finalValueRef = useRef(finalValue);
  const onTeaseHitRef = useRef(onTeaseHit);
  const teaseSixRef = useRef(teaseSix);
  const isSpinningRef = useRef(false);

  const stopSound = useRef(null);
  const sixSound = useRef(null);

  const fixAssetPath = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return path;
    return `/assets/${path}`;
  };

  const normalize = (it) => {
    if (!it && it !== 0) return null;
    if (typeof it === "string" || typeof it === "number") {
      return { name: String(it) };
    }
    return it;
  };

  // Sync mutable refs
  useEffect(() => {
    itemsRef.current = items;
    if (items.length > 1 && !isSpinningRef.current) {
      const normItems = items.map(normalize).filter(Boolean);
      const currNorm = normalize(finalValueRef.current);
      const isSix =
        currNorm === "6" ||
        currNorm?.name === "6" ||
        finalValueRef.current === "6" ||
        finalValueRef.current?.name === "6";

      if (isSix) {
        setTopGhost(normItems[0] || { name: "6", image: "/assets/images/six.png" });
        setBottomGhost(normItems[1] || { name: "6", image: "/assets/images/six.png" });
      } else {
        const idx = normItems.findIndex((it) => (it.name || it) === (currNorm?.name || currNorm));
        if (idx !== -1) {
          setTopGhost(normItems[(idx + normItems.length - 1) % normItems.length]);
          setBottomGhost(normItems[(idx + 1) % normItems.length]);
        } else {
          setTopGhost(normItems[0] || null);
          setBottomGhost(normItems[1] || null);
        }
      }
    }
  }, [items]);

  useEffect(() => {
    finalValueRef.current = finalValue;
  }, [finalValue]);

  useEffect(() => {
    onTeaseHitRef.current = onTeaseHit;
  }, [onTeaseHit]);

  useEffect(() => {
    teaseSixRef.current = teaseSix;
  }, [teaseSix]);

  // Audio setup
  useEffect(() => {
    items.forEach((item) => {
      const n = normalize(item);
      if (n?.image) {
        const img = new Image();
        img.src = fixAssetPath(n.image);
      }
    });

    stopSound.current = new Howl({
      src: ["/assets/sounds/reel-stop.mp3"],
      volume: 1,
    });

    sixSound.current = new Howl({
      src: ["/assets/sounds/six-final.mp3"],
      volume: 1,
    });
  }, [items]);

  // Handle spin lifecycle exclusively based on parentSpinning transitions
  useEffect(() => {
    let cycleInterval = null;
    let mainTimeout = null;
    let teaseHoldTimeout = null;
    let respinInterval = null;
    let respinTimeout = null;

    if (!parentSpinning) {
      isSpinningRef.current = false;
      setPhase("idle");
      if (finalValueRef.current) {
        const isSix =
          finalValueRef.current === "6" ||
          finalValueRef.current?.name === "6";

        if (isSix) {
          setDisplayValue({
            name: "6",
            image: "/assets/images/six.png",
            sound: "/assets/sounds/six-final.mp3",
          });
        } else {
          const finalNorm = normalize(finalValueRef.current) || { name: String(finalValueRef.current) };
          setDisplayValue(finalNorm);
        }
      }
      return () => {};
    }

    // Begin spin
    isSpinningRef.current = true;
    setPhase("spinning");

    const sixItem = { name: "6", image: "/assets/images/six.png" };
    const currentItems = itemsRef.current.map(normalize).filter(Boolean);
    const spinningItems = allowSixInSpin ? [...currentItems, sixItem] : [...currentItems];

    // High speed drum roll: cycles center, top, and bottom symbols together
    cycleInterval = setInterval(() => {
      if (spinningItems.length === 0) return;
      const rndIdx = Math.floor(Math.random() * spinningItems.length);
      const center = spinningItems[rndIdx];
      const top = spinningItems[(rndIdx + spinningItems.length - 1) % spinningItems.length];
      const btm = spinningItems[(rndIdx + 1) % spinningItems.length];

      setDisplayValue(center);
      setTopGhost(top);
      setBottomGhost(btm);
    }, 45);

    // Initial spin timeout
    mainTimeout = setTimeout(() => {
      clearInterval(cycleInterval);

      let finalResult = normalize(finalValueRef.current) || finalValueRef.current;
      const isSixVal =
        finalResult === "6" ||
        finalResult?.name === "6" ||
        finalValueRef.current === "6" ||
        finalValueRef.current?.name === "6";

      if (isSixVal) {
        finalResult = {
          name: "6",
          image: "/assets/images/six.png",
          sound: "/assets/sounds/six-final.mp3",
        };
      }
      if (typeof finalResult === "string" || typeof finalResult === "number") {
        finalResult = { name: String(finalResult) };
      }

      // Only tease if it's not a genuine 666 Jack'O Pot outcome
      const shouldTease = teaseSixRef.current && !isSixVal;

      if (shouldTease) {
        // === STEP 1: Lands on "6" as the visible result with dramatic snap ===
        setPhase("six_landed");
        setDisplayValue(sixItem);
        setTopGhost(currentItems[0] || null);
        setBottomGhost(currentItems[1] || null);

        try {
          sixSound.current?.play();
          stopSound.current?.rate && stopSound.current.rate(pitch);
          stopSound.current?.play();
        } catch (e) {}

        // Trigger curse surge
        onTeaseHitRef.current?.();

        // === STEP 2: Holds on "6" for ~1.1s so the player sees the result ===
        teaseHoldTimeout = setTimeout(() => {
          // === STEP 3: "Goes down and reveals real result as if reel spins again" ===
          setPhase("respinning");

          try {
            stopSound.current?.rate && stopSound.current.rate(pitch * 1.15);
          } catch (e) {}

          // Mini-spin cycling downwards
          respinInterval = setInterval(() => {
            if (spinningItems.length === 0) return;
            const rndIdx = Math.floor(Math.random() * spinningItems.length);
            setDisplayValue(spinningItems[rndIdx]);
            setTopGhost(spinningItems[(rndIdx + spinningItems.length - 1) % spinningItems.length]);
            setBottomGhost(spinningItems[(rndIdx + 1) % spinningItems.length]);
          }, 40);

          // After 650ms of mini-spin, snap into the true final result
          respinTimeout = setTimeout(() => {
            clearInterval(respinInterval);
            setPhase("revealed");
            setDisplayValue(finalResult);

            const finalNorm = normalize(finalResult);
            const idx = currentItems.findIndex((it) => (it.name || it) === (finalNorm?.name || finalNorm));
            if (idx !== -1) {
              setTopGhost(currentItems[(idx + currentItems.length - 1) % currentItems.length]);
              setBottomGhost(currentItems[(idx + 1) % currentItems.length]);
            }

            isSpinningRef.current = false;

            try {
              stopSound.current?.rate && stopSound.current.rate(pitch);
              stopSound.current?.play();
            } catch (e) {}

            if (finalResult?.sound) {
              const finalSound = new Howl({
                src: [fixAssetPath(finalResult.sound)],
                volume: 1,
              });
              finalSound.play();
            }
          }, Math.round(650 * durationMult));
        }, Math.round(1100 * durationMult));
      } else {
        // Normal stop or 666 Jack'O Pot stop - snaps firmly into center
        setPhase("revealed");
        setDisplayValue(finalResult);

        if (isSixVal) {
          setTopGhost(currentItems[0] || { name: "6", image: "/assets/images/six.png" });
          setBottomGhost(currentItems[1] || { name: "6", image: "/assets/images/six.png" });
        } else {
          const finalNorm = normalize(finalResult);
          const idx = currentItems.findIndex((it) => (it.name || it) === (finalNorm?.name || finalNorm));
          if (idx !== -1) {
            setTopGhost(currentItems[(idx + currentItems.length - 1) % currentItems.length]);
            setBottomGhost(currentItems[(idx + 1) % currentItems.length]);
          }
        }

        isSpinningRef.current = false;

        try {
          stopSound.current?.rate && stopSound.current.rate(pitch);
          stopSound.current?.play();
        } catch (e) {}

        if (finalResult?.sound) {
          const finalSound = new Howl({
            src: [fixAssetPath(finalResult.sound)],
            volume: 1,
          });
          finalSound.play();
        }
      }
    }, spinTime);

    return () => {
      clearInterval(cycleInterval);
      clearTimeout(mainTimeout);
      if (teaseHoldTimeout) clearTimeout(teaseHoldTimeout);
      if (respinInterval) clearInterval(respinInterval);
      if (respinTimeout) clearTimeout(respinTimeout);
    };
  }, [parentSpinning, spinTime, cursed, pitch, allowSixInSpin, durationMult]);

  const isSpinning = phase === "spinning" || phase === "respinning";
  const isSixLanded = phase === "six_landed";

  const shake =
    (!isSpinning && cursed) || isSixLanded
      ? { x: [-3, 3, -3, 3, 0], transition: { duration: 0.3 } }
      : { x: 0 };

  // Smooth cascading drum vibration during spin
  const spinMotion = isSpinning
    ? {
        y: [-12, 12],
        transition: {
          repeat: Infinity,
          repeatType: "reverse",
          duration: 0.065,
          ease: "linear",
        },
      }
    : { y: 0 };

  // Authentic physical spring bounce upon locking in
  const bounce =
    phase === "revealed"
      ? {
          y: [-28, 8, -3, 0],
          scale: [0.94, 1.05, 0.99, 1],
          transition: {
            duration: 0.42,
            times: [0, 0.48, 0.78, 1],
            ease: "easeOut",
          },
        }
      : phase === "six_landed"
      ? {
          y: [-24, 6, 0],
          scale: [0.95, 1.04, 1],
          transition: {
            duration: 0.35,
            times: [0, 0.6, 1],
            ease: "easeOut",
          },
        }
      : {};

  const renderItemContent = (item, isGhost = false) => {
    if (!item && item !== 0) return null;
    const norm = normalize(item);
    const rawText = norm?.name ?? (typeof norm === "string" ? norm : "?");
    const isImage = norm && (norm.image || norm.name === "6");
    const imagePath = norm?.image || (norm?.name === "6" ? "/assets/images/six.png" : null);

    if (isImage && imagePath) {
      return (
        <img
          src={fixAssetPath(imagePath)}
          alt={rawText}
          className={`reel-image-item ${isGhost ? "ghost-image" : ""}`}
          onError={(e) => {
            e.target.src = "/assets/images/placeholder.svg";
          }}
        />
      );
    }

    return (
      <span
        className={`reel-text-item ${rawText.length > 14 ? "long-text" : ""} ${
          isGhost ? "ghost-text" : ""
        }`}
      >
        {rawText}
      </span>
    );
  };

  return (
    <div className={`reel-column ${cursed || isSixLanded ? "cursed" : ""}`}>
      {/* Hidden SVG Filter Definition for Pure Vertical Directional Motion Blur (0 horizontal, 7.5px vertical) */}
      <svg
        style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <defs>
          <filter id="reel-directional-blur" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0 7.5" />
          </filter>
        </defs>
      </svg>

      {label && <div className="reel-column-label">{label}</div>}

      <motion.div
        className={`slot-reel-frame ${cursed ? "cursed" : ""} ${isSpinning ? "is-spinning" : ""} ${
          isSixLanded ? "tease-six-landed" : ""
        } ${phase === "respinning" ? "respinning" : ""}`}
        animate={shake}
      >
        {/* Curved Glossy Glass Reflection Sheen */}
        <div className="reel-glass-reflection" />

        {/* Center Payline Pointer Notches */}
        <div className="reel-indicator-line" />

        {/* 3D Cylindrical Drum Strip Container */}
        <motion.div
          className="reel-drum-track"
          animate={{ ...spinMotion, ...bounce }}
        >
          {/* Top Ghost Symbol (emerging from top shadow) */}
          {topGhost && (
            <div className={`reel-drum-ghost ghost-top ${isSpinning ? "is-motion-blurred" : ""}`}>
              {renderItemContent(topGhost, true)}
            </div>
          )}

          {/* Main Center Payline Item */}
          <div className={`reel-content-wrapper ${isSpinning ? "is-motion-blurred" : ""}`}>
            {renderItemContent(displayValue, false)}
          </div>

          {/* Bottom Ghost Symbol (disappearing into bottom shadow) */}
          {bottomGhost && (
            <div className={`reel-drum-ghost ghost-bottom ${isSpinning ? "is-motion-blurred" : ""}`}>
              {renderItemContent(bottomGhost, true)}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
