import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Howl } from "howler";

export default function SlotReel({
  items = [],
  finalValue,
  spinTime = 2000,
  cursed,
  spinning: parentSpinning,
  pitch = 1.0,
  label = "",
}) {
  const [displayValue, setDisplayValue] = useState(finalValue || "?");
  const [spinning, setSpinning] = useState(false);
  const stopSound = useRef(null);

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
  }, [items]);

  useEffect(() => {
    if (!parentSpinning) return;

    setSpinning(true);

    const sixItem = { name: "6", image: "/assets/images/six.png" };
    const normalized = items.map(normalize).filter(Boolean);
    const spinningItems = [...normalized, sixItem];

    const interval = setInterval(() => {
      if (spinningItems.length === 0) return;
      const randomItem =
        spinningItems[Math.floor(Math.random() * spinningItems.length)];
      setDisplayValue(randomItem);
    }, 75);

    const timeout = setTimeout(() => {
      clearInterval(interval);

      let finalResult = normalize(finalValue) || finalValue;

      if ((finalResult === "6" || finalResult?.name === "6") && cursed) {
        finalResult = {
          name: "6",
          image: "/assets/images/six.png",
          sound: "/assets/sounds/six-final.mp3",
        };
      }

      if (typeof finalResult === "string" || typeof finalResult === "number") {
        finalResult = { name: String(finalResult) };
      }

      setDisplayValue(finalResult);
      setSpinning(false);

      try {
        stopSound.current?.rate && stopSound.current.rate(pitch);
      } catch (e) {
        // Ignored
      }
      stopSound.current?.play();

      if (finalResult?.sound) {
        const finalSound = new Howl({
          src: [fixAssetPath(finalResult.sound)],
          volume: 1,
        });
        finalSound.play();
      }
    }, spinTime);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [parentSpinning, finalValue, items, spinTime, cursed, pitch]);

  const shake = !spinning && cursed
    ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } }
    : { x: 0 };

  const spinMotion = spinning
    ? { y: [0, -6, 6, 0], transition: { repeat: Infinity, duration: 0.09, ease: "linear" } }
    : { y: 0 };

  const bounce = !spinning
    ? { y: [-12, 0], transition: { type: "spring", stiffness: 450, damping: 14 } }
    : {};

  const isImage = displayValue && displayValue.image;
  const rawText = displayValue?.name ?? (typeof displayValue === "string" ? displayValue : "?");

  return (
    <div className={`reel-column ${cursed ? "cursed" : ""}`}>
      {label && <div className="reel-column-label">{label}</div>}
      
      <motion.div
        className={`slot-reel-frame ${cursed ? "cursed" : ""} ${spinning ? "is-spinning" : ""}`}
        animate={shake}
      >
        <div className="reel-glass-reflection" />
        <div className="reel-indicator-line" />

        <motion.div
          className="reel-content-wrapper"
          animate={{ ...spinMotion, ...bounce }}
        >
          {isImage ? (
            <img
              src={fixAssetPath(displayValue.image)}
              alt={rawText}
              className="reel-image-item"
              onError={(e) => {
                e.target.src = "/assets/images/placeholder.svg";
              }}
            />
          ) : (
            <span className={`reel-text-item ${rawText.length > 14 ? "long-text" : ""}`}>
              {rawText}
            </span>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
