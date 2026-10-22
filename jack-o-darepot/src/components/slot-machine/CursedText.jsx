import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CursedText({ trigger, text = "CURSED!" }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2400);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cursed-text"
          initial={{ opacity: 0, scale: 0.5, rotate: -4 }}
          animate={{ opacity: 1, scale: [0.8, 1.25, 1.15], rotate: [0, 2, -2, 0] }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#ff1744",
            fontFamily: "var(--font-cursed), cursive, sans-serif",
            fontSize: "clamp(3.5rem, 8vw, 6.5rem)",
            fontWeight: "900",
            letterSpacing: "8px",
            textShadow: "0 0 20px #ff1744, 0 0 40px #ff0033, 0 0 80px #b30024, 4px 4px 0px #000000",
            pointerEvents: "none",
            zIndex: 99999,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
