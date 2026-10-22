import { Howl } from "howler";

export const SOUND_PATHS = {
  hover: "/assets/sounds/hover.wav",
  hoverChicken: "/assets/sounds/hoverChicken.wav",
  forfeit: "/assets/sounds/forfeit.wav",
  reelStop: "/assets/sounds/reel-stop.mp3",
  spin: "/assets/sounds/spin.mp3",
  sixFinal: "/assets/sounds/six-final.mp3",
};

// Cached Howl audio instances
const soundCache = {};

function getSound(name) {
  if (!name) return null;
  if (!soundCache[name]) {
    const src = SOUND_PATHS[name] || name;
    try {
      soundCache[name] = new Howl({
        src: [src],
        volume:
          name === "hover"
            ? 0.35
            : name === "hoverChicken"
            ? 0.5
            : name === "forfeit"
            ? 0.6
            : 0.4,
        preload: true,
      });
    } catch (err) {
      console.warn(`[soundService] Failed to load sound: ${name}`, err);
      return null;
    }
  }
  return soundCache[name];
}

// Throttle timestamps to prevent audio stutter/distortion on rapid pointer sweeps
let lastHoverTime = 0;
let lastChickenTime = 0;
let lastForfeitTime = 0;

/**
 * Play standard button hover sound
 */
export function playHover() {
  const now = Date.now();
  if (now - lastHoverTime < 35) return;
  lastHoverTime = now;
  try {
    const sound = getSound("hover");
    if (sound) {
      sound.stop();
      sound.play();
    }
  } catch (err) {
    console.warn("[soundService] playHover error:", err);
  }
}

/**
 * Play hover chicken sound (for forfeit button)
 */
export function playHoverChicken() {
  const now = Date.now();
  if (now - lastChickenTime < 60) return;
  lastChickenTime = now;
  try {
    const sound = getSound("hoverChicken");
    if (sound) {
      sound.stop();
      sound.play();
    }
  } catch (err) {
    console.warn("[soundService] playHoverChicken error:", err);
  }
}

/**
 * Play forfeit sound (for pressing forfeit button)
 */
export function playForfeit() {
  const now = Date.now();
  if (now - lastForfeitTime < 150) return;
  lastForfeitTime = now;
  try {
    const sound = getSound("forfeit");
    if (sound) {
      sound.stop();
      sound.play();
    }
  } catch (err) {
    console.warn("[soundService] playForfeit error:", err);
  }
}

/**
 * Play arbitrary sound by key or path
 */
export function playSound(name, options = {}) {
  try {
    const sound = getSound(name);
    if (!sound) return;
    if (options.volume !== undefined) {
      sound.volume(options.volume);
    }
    if (options.rate !== undefined) {
      sound.rate(options.rate);
    }
    sound.stop();
    sound.play();
  } catch (err) {
    console.warn(`[soundService] playSound error (${name}):`, err);
  }
}

/**
 * Checks if a DOM element is the forfeit button
 */
export function isForfeitButton(element) {
  if (!element) return false;

  if (
    element.dataset?.soundHover === "hoverChicken" ||
    element.dataset?.soundClick === "forfeit"
  ) {
    return true;
  }
  if (
    element.dataset?.action === "forfeit" ||
    element.dataset?.type === "forfeit"
  ) {
    return true;
  }
  if (
    element.classList?.contains("forfeit-btn") ||
    element.classList?.contains("deny-btn") ||
    element.classList?.contains("btn-forfeit")
  ) {
    return true;
  }

  const text = element.textContent || "";
  if (/forfeit/i.test(text) && !/status|history|stats|filter|summary/i.test(text)) {
    return true;
  }

  return false;
}

/**
 * Global sound effect listener for button hover and button interactions.
 * - Plays `hover` on any button that doesn't specify another sound.
 * - Plays `hoverChicken` on the forfeit button when hovered.
 * - Plays `forfeit` on pressing the forfeit button.
 */
export function initGlobalSoundEffects() {
  if (typeof window === "undefined") return () => {};

  let currentHoveredButton = null;

  const handleMouseOver = (e) => {
    try {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;

      const button = target.closest(
        "button, [role='button'], a.btn, input[type='button'], input[type='submit']"
      );
      if (!button) {
        currentHoveredButton = null;
        return;
      }

      // If pointer is moving between child elements inside the same button, don't replay
      if (button === currentHoveredButton) return;

      if (e.relatedTarget && button.contains(e.relatedTarget)) {
        currentHoveredButton = button;
        return;
      }

      currentHoveredButton = button;

      // Ignore disabled buttons
      if (button.disabled || button.getAttribute("aria-disabled") === "true") {
        return;
      }

      // Check if button specifies a custom hover sound
      const customHover = button.dataset.soundHover;

      // Opt-out check
      if (
        customHover === "none" ||
        customHover === "mute" ||
        customHover === "false" ||
        button.dataset.noHoverSound !== undefined
      ) {
        return;
      }

      // Custom specified sound
      if (customHover) {
        playSound(customHover);
        return;
      }

      // Forfeit button check
      if (isForfeitButton(button)) {
        playHoverChicken();
        return;
      }

      // Default hover sound
      playHover();
    } catch {
      // Non-blocking
    }
  };

  const handleMouseOut = (e) => {
    try {
      if (
        currentHoveredButton &&
        e.relatedTarget &&
        !currentHoveredButton.contains(e.relatedTarget)
      ) {
        currentHoveredButton = null;
      }
    } catch {
      // Non-blocking
    }
  };

  const handleClick = (e) => {
    try {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;

      const button = target.closest(
        "button, [role='button'], a.btn, input[type='button'], input[type='submit']"
      );
      if (!button) return;

      if (button.disabled || button.getAttribute("aria-disabled") === "true") {
        return;
      }

      // Check if forfeit button or custom click sound
      if (button.dataset.soundClick === "forfeit" || isForfeitButton(button)) {
        playForfeit();
        return;
      }

      const clickSound = button.dataset.soundClick;
      if (clickSound && clickSound !== "none") {
        playSound(clickSound);
      }
    } catch {
      // Non-blocking
    }
  };

  window.addEventListener("mouseover", handleMouseOver, { passive: true });
  window.addEventListener("mouseout", handleMouseOut, { passive: true });
  window.addEventListener("click", handleClick, { passive: true });

  return () => {
    window.removeEventListener("mouseover", handleMouseOver);
    window.removeEventListener("mouseout", handleMouseOut);
    window.removeEventListener("click", handleClick);
  };
}

export default {
  playHover,
  playHoverChicken,
  playForfeit,
  playSound,
  isForfeitButton,
  initGlobalSoundEffects,
  SOUND_PATHS,
};
