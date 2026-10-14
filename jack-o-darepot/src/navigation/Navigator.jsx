import { useNavigation } from "./NavigationContext";
import { SCREENS } from "./screens";
import { motion, AnimatePresence } from "framer-motion";
import GameScreen from "../screens/GameScreen";
import SettingsScreen from "../screens/SettingsScreen";
import CollectionScreen from "../screens/CollectionScreen";

// Screen Registry
const SCREEN_COMPONENTS = {
  [SCREENS.GAME]: GameScreen,
  [SCREENS.COLLECTION]: CollectionScreen,
  [SCREENS.SETTINGS]: SettingsScreen,
};

export default function Navigator() {
  const { currentScreen, resetTo } = useNavigation();

  const ActiveScreenComponent = SCREEN_COMPONENTS[currentScreen];

  return (
    <div className="navigator-viewport">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          className="navigator-screen-wrapper"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          {ActiveScreenComponent ? (
            <ActiveScreenComponent />
          ) : (
            <div className="screen-fallback">
              <h2>Screen Not Found</h2>
              <p>No component registered for route "{currentScreen}".</p>
              <button
                className="setting-btn setting-btn-primary"
                onClick={() => resetTo(SCREENS.GAME)}
              >
                Return to Game
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
