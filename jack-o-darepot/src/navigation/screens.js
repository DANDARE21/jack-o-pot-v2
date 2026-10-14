export const SCREENS = {
  GAME: "game",
  COLLECTION: "collection",
  SETTINGS: "settings",
  ROSTER: "roster",
  HISTORY: "history",
};

export const SCREEN_CONFIG = {
  [SCREENS.GAME]: {
    id: SCREENS.GAME,
    title: "Jack'o Pot",
    icon: "🎰",
  },
  [SCREENS.COLLECTION]: {
    id: SCREENS.COLLECTION,
    title: "Game Collection",
    icon: "🎮",
  },
  [SCREENS.SETTINGS]: {
    id: SCREENS.SETTINGS,
    title: "Settings & Configuration",
    icon: "⚙️",
  },
  [SCREENS.ROSTER]: {
    id: SCREENS.ROSTER,
    title: "Player & Dare Roster",
    icon: "👥",
  },
  [SCREENS.HISTORY]: {
    id: SCREENS.HISTORY,
    title: "Dare History Log",
    icon: "📜",
  },
};
