export const SCREENS = {
  GAME: "game",
  COLLECTION: "collection",
  LEADERBOARD: "leaderboard",
  SETTINGS: "settings",
  ROSTER: "roster",
  HISTORY: "history",
};

export const SCREEN_CONFIG = {
  [SCREENS.GAME]: {
    id: SCREENS.GAME,
    title: "Jack'o Pot",
    icon: "game-icons:slot-machine",
  },
  [SCREENS.COLLECTION]: {
    id: SCREENS.COLLECTION,
    title: "Game Collection",
    icon: "game-icons:retro-controller",
  },
  [SCREENS.LEADERBOARD]: {
    id: SCREENS.LEADERBOARD,
    title: "Hall of Fate • Leaderboard",
    icon: "game-icons:trophy",
  },
  [SCREENS.SETTINGS]: {
    id: SCREENS.SETTINGS,
    title: "Settings & Configuration",
    icon: "game-icons:gears",
  },
  [SCREENS.ROSTER]: {
    id: SCREENS.ROSTER,
    title: "Player & Dare Roster",
    icon: "game-icons:crowd",
  },
  [SCREENS.HISTORY]: {
    id: SCREENS.HISTORY,
    title: "Dare History Log",
    icon: "game-icons:scroll-unfurled",
  },
};

