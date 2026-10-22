/**
 * Slot Machine, Dare & Video Game Modifiers Service
 * Manages definitions, default presets, settings, and localStorage persistence for modifiers.
 */

export const MODIFIER_CATEGORIES = [
  { id: "ALL", label: "All Modifiers", icon: "game-icons:crystal-wand" },
  { id: "slot", label: "Slot Machine", icon: "game-icons:slot-machine" },
  { id: "dare", label: "Dares & Trials", icon: "game-icons:bloody-stash" },
  { id: "game", label: "Video Games", icon: "game-icons:retro-controller" },
];

export const MODIFIERS_DATA = [
  // ==========================================
  // SLOT MACHINE MODIFIERS
  // ==========================================
  {
    id: "jack_o_curse",
    name: "Curse of the Jack'O Pot",
    target: "slot",
    targetLabel: "Slot Machine",
    category: "Slot Machine",
    rarity: "Curse",
    color: "#ff1744",
    icon: "game-icons:skull-crossed-bones",
    image: "/assets/images/placeholder.svg",
    tagline: "Unleashes the Curse Meter. Demonic 6 teasers fill the gauge towards a 666 JACK'O POT Cursed Spin!",
    description: "Each spin carries a risk that a demonic '6' lands on a reel, raising the Curse Meter before sliding down to reveal the true outcome. When the meter climbs, odds of the fateful '666 JACK'O POT' spike—unleashing a Cursed Spin that activates both a game and a gameplay modifier!",
    lore: "Forged in the underworld of forgotten slot arcades. The machine remembers every bet... and when three sixes align, a cursed pact is sealed.",
    howItWorks: [
      "Activates the sinister Curse Meter bar beneath the slot cabinet.",
      "During spins, a reel may tease with a '6', surging the Curse Meter before sliding down to reveal the true result.",
      "Higher curse levels exponentially increase the odds of hitting a triple-six (666) JACK'O POT.",
      "Landing 666 primes the next roll as a CURSED SPIN, which rolls a victim, a game, and activates a game modifier!"
    ],
    enabled: true,
    defaultSettings: {
      sixTeaseChance: 35,
      curseIncrement: 8,
      baseJackopotChance: 3,
      maxJackopotChance: 60,
      demonicAudio: true,
    },
    settingsSchema: [
      {
        id: "sixTeaseChance",
        label: "Six Tease Probability",
        type: "range",
        min: 10,
        max: 80,
        step: 5,
        unit: "%",
        description: "Chance on each spin that a reel momentarily reveals a 6 and charges the curse meter.",
      },
      {
        id: "curseIncrement",
        label: "Curse Surge per Six",
        type: "range",
        min: 2,
        max: 20,
        step: 1,
        unit: "%",
        description: "How much the Curse Meter fills whenever a demonic six tease appears.",
      },
      {
        id: "baseJackopotChance",
        label: "Base 666 Jack'O Pot Odds",
        type: "range",
        min: 0,
        max: 15,
        step: 1,
        unit: "%",
        description: "Initial odds of hitting a triple 6 Jack'O Pot when the curse meter is empty.",
      },
      {
        id: "maxJackopotChance",
        label: "Maximum 666 Jack'O Pot Odds",
        type: "range",
        min: 25,
        max: 100,
        step: 5,
        unit: "%",
        description: "Peak odds of hitting a triple 6 Jack'O Pot when the curse meter reaches 100%.",
      },
      {
        id: "demonicAudio",
        label: "Demonic Sound Effects",
        type: "switch",
        description: "Play cursed audio stings and demonic laughter when sixes and Jack'O Pots land.",
      },
    ],
  },
  {
    id: "warp_speed",
    name: "Warp Drive Overclock",
    target: "slot",
    targetLabel: "Slot Machine",
    category: "Slot Machine",
    rarity: "Rare",
    color: "#00e5ff",
    icon: "game-icons:lightning-trio",
    image: "/assets/images/placeholder.svg",
    tagline: "Supercharged reel motors spinning at breakneck velocity with sonic deceleration.",
    description: "Accelerates slot reel rotations to blinding hyper-speed with electric spark trails and instantaneous sonic-boom reel halts.",
    lore: "The cabinet's induction coils were salvaged from a supersonic arcade simulator struck by storm lightning in '89. It never decelerated.",
    howItWorks: [
      "Reels spin up to 4x faster during the spin sequence.",
      "Cuts spin cycle duration down for rapid-fire adrenaline runs.",
      "Emits hyper-velocity electric spark arcs and motion blur streaks.",
      "Produces a dramatic sonic thunderclap when reels snap locked."
    ],
    enabled: false,
    defaultSettings: {
      speedMultiplier: 2.5,
      spinDuration: 1.4,
      electricSparks: true,
      motionBlurIntensity: 80,
    },
    settingsSchema: [
      {
        id: "speedMultiplier",
        label: "Reel Speed Multiplier",
        type: "range",
        min: 1.5,
        max: 5.0,
        step: 0.1,
        unit: "x",
        description: "How rapidly the reel symbols cycle past the viewing window.",
      },
      {
        id: "spinDuration",
        label: "Spin Duration",
        type: "range",
        min: 0.6,
        max: 3.5,
        step: 0.1,
        unit: "s",
        description: "How many seconds the reels spin before locking on results.",
      },
      {
        id: "electricSparks",
        label: "Electric Spark Arcs",
        type: "switch",
        description: "Emit bright cyan neon particle arcs around the spinning reels.",
      },
      {
        id: "motionBlurIntensity",
        label: "Motion Blur Strength",
        type: "range",
        min: 20,
        max: 100,
        step: 5,
        unit: "%",
        description: "Visual velocity blur applied to rotating symbols.",
      },
    ],
  },
  {
    id: "ghost_reel",
    name: "Phantom Spectral Reel",
    target: "slot",
    targetLabel: "Slot Machine",
    category: "Slot Machine",
    rarity: "Legendary",
    color: "#b388ff",
    icon: "game-icons:spectre",
    image: "/assets/images/placeholder.svg",
    tagline: "Summons a glowing ethereal 4th reel that spins backwards from beyond the veil.",
    description: "Materializes an otherworldly translucent phantom reel casting violet mist and ectoplasmic particles, spinning in opposing directions.",
    lore: "Cold whispers emanate from the cabinet ventilation vents. Legend holds that a 4th phantom slot turns on its own whenever midnight strikes.",
    howItWorks: [
      "Projects a holographic, translucent spectral reel alongside the normal reels.",
      "The phantom reel spins backwards with reverse gravitational inertia.",
      "Radiates ghostly ectoplasmic fog and pulsing spiritual auras.",
      "Chance to trigger bonus spectral multipliers on dare point rewards."
    ],
    enabled: true,
    defaultSettings: {
      spectralGlow: 85,
      ectoplasmEffect: true,
      phantomBonusChance: 35,
      ghostColor: "Haunted Violet",
    },
    settingsSchema: [
      {
        id: "spectralGlow",
        label: "Spectral Opacity & Glow",
        type: "range",
        min: 30,
        max: 100,
        step: 5,
        unit: "%",
        description: "Controls the translucency and neon glow of the phantom reel.",
      },
      {
        id: "ectoplasmEffect",
        label: "Ectoplasm Fog Particles",
        type: "switch",
        description: "Spawns floating mist and spectral wisps around reel edges.",
      },
      {
        id: "phantomBonusChance",
        label: "Phantom Gift Chance",
        type: "range",
        min: 10,
        max: 80,
        step: 5,
        unit: "%",
        description: "Probability that the ghost reel grants a surprise point boost or dare shield.",
      },
      {
        id: "ghostColor",
        label: "Phantom Spirit Hue",
        type: "select",
        description: "The supernatural color signature of the ghost reel.",
        options: [
          { value: "Haunted Violet", label: "Haunted Violet (Eerie Occult)" },
          { value: "Ethereal Cyan", label: "Ethereal Cyan (Cold Ghost)" },
          { value: "Emerald Spook", label: "Emerald Spook (Poltergeist)" },
          { value: "Blood Apparition", label: "Blood Apparition (Wrathful)" },
        ],
      },
    ],
  },
  {
    id: "midas_touch",
    name: "Midas Touch Golden Jackpot",
    target: "slot",
    targetLabel: "Slot Machine",
    category: "Slot Machine",
    rarity: "Legendary",
    color: "#ffd700",
    icon: "game-icons:two-coins",
    image: "/assets/images/placeholder.svg",
    tagline: "Turns reel borders into molten gold with raining coin particles and multiplied points.",
    description: "Gives every spin a golden chance to turn into pure bullion, showering the display with glittering gold coins and multiplying points tenfold.",
    lore: "Discovered inside the sunken vault of an ancient golden casino ship. Anything the golden reels settle upon is crowned in arcade glory.",
    howItWorks: [
      "Chance on each spin for reels to burst into gleam-plated 24K gold.",
      "Explodes a shower of physical bouncing 3D coins and sparkling stars.",
      "Multiplies leaderboard points awarded from completing the spin dare.",
      "Plays triumphant golden bell rings and royal trumpets on win."
    ],
    enabled: false,
    defaultSettings: {
      goldChance: 25,
      pointMultiplier: 3.0,
      coinFountainFX: true,
      shimmerGleam: 85,
    },
    settingsSchema: [
      {
        id: "goldChance",
        label: "Midas Trigger Chance",
        type: "range",
        min: 5,
        max: 60,
        step: 5,
        unit: "%",
        description: "Percentage chance that any given spin transforms into the Midas Gold state.",
      },
      {
        id: "pointMultiplier",
        label: "Gold Point Multiplier",
        type: "range",
        min: 1.5,
        max: 10.0,
        step: 0.5,
        unit: "x",
        description: "Multiplies leaderboard score points won on conquering the dare.",
      },
      {
        id: "coinFountainFX",
        label: "Coin Fountain Particle Blast",
        type: "switch",
        description: "Launches bursting golden coin particles on jackpot landing.",
      },
      {
        id: "shimmerGleam",
        label: "Gold Shimmer Intensity",
        type: "range",
        min: 40,
        max: 100,
        step: 5,
        unit: "%",
        description: "Luminance of the gleaming molten gold metallic gradient.",
      },
    ],
  },
  {
    id: "sudden_death",
    name: "Russian Roulette Chamber",
    target: "slot",
    targetLabel: "Slot Machine",
    category: "Slot Machine",
    rarity: "Curse",
    color: "#ff3d00",
    icon: "game-icons:skull-crossed-bones",
    image: "/assets/images/placeholder.svg",
    tagline: "Loads a glowing skull into the reel. Landing on it unleashes sudden high-stakes forfeit!",
    description: "High tension Russian roulette gamble. An ominous glowing skull slot is injected into the reel lineup. Landing it incurs an instant catastrophic dare penalty!",
    lore: "Five chambers spin empty. In the sixth rests the skull of the fallen champion. One fateful pull is all it takes to decide your fate.",
    howItWorks: [
      "Adds a hazardous Skull symbol to the reel rotation.",
      "If the skull stops in the winner slot, an ominous klaxon siren blares.",
      "The designated player immediately suffers the chosen forfeiture penalty.",
      "Builds maximum suspense as reels slow down near the skull."
    ],
    enabled: false,
    defaultSettings: {
      skullRiskChance: 15,
      penaltyType: "Halve Leaderboard Points (-50%)",
      warningAlarm: true,
      heartbeatAudio: true,
    },
    settingsSchema: [
      {
        id: "skullRiskChance",
        label: "Chamber Risk Probability",
        type: "range",
        min: 5,
        max: 35,
        step: 5,
        unit: "%",
        description: "The mathematical odds of landing the deadly Skull slot.",
      },
      {
        id: "penaltyType",
        label: "Deadly Skull Penalty",
        type: "select",
        description: "The punitive consequence triggered when the skull lands.",
        options: [
          { value: "Halve Leaderboard Points (-50%)", label: "Halve Leaderboard Points (-50%)" },
          { value: "Instant Extreme Forfeit Dare", label: "Instant Extreme Forfeit Dare" },
          { value: "Curse Meter to 100% Maximum", label: "Curse Meter to 100% Maximum" },
          { value: "Double Dare Stacking", label: "Double Dare Stacking (Must do 2 Dares)" },
        ],
      },
      {
        id: "warningAlarm",
        label: "Emergency Klaxon Siren",
        type: "switch",
        description: "Sound a loud red hazard siren when the skull lands.",
      },
    ],
  },
  {
    id: "glitch_matrix",
    name: "Glitch In The Matrix",
    target: "slot",
    targetLabel: "Slot Machine",
    category: "Slot Machine",
    rarity: "Epic",
    color: "#00ff66",
    icon: "game-icons:glitch",
    image: "/assets/images/placeholder.svg",
    tagline: "Corrupts slot reality with RGB channel splits, VHS scanlines, and digital jitter.",
    description: "Simulates hardware memory corruption and rogue code glitches. Symbols flicker, distort with chromatic aberration, and display cyber data noise.",
    lore: "A rogue AI process injected itself into the slot machine's BIOS memory segment, leaking matrix glyphs into reality.",
    howItWorks: [
      "Applies real-time chromatic aberration RGB split shaders across reels.",
      "Randomly flickers horizontal VHS tracking lines and horizontal tape jumps.",
      "Displays matrix green terminal characters glitching through symbol cards.",
      "Adds digital bitcrushed audio crackle to mechanical reel spin sounds."
    ],
    enabled: false,
    defaultSettings: {
      glitchSeverity: "Medium Cyberpunk",
      chromaticAberration: true,
      vhsScanlines: true,
    },
    settingsSchema: [
      {
        id: "glitchSeverity",
        label: "Glitch Severity Mode",
        type: "select",
        description: "Intensity tier of digital anomalies and visual artifacts.",
        options: [
          { value: "Subtle Jitter", label: "Subtle Jitter (Light VHS Tape)" },
          { value: "Medium Cyberpunk", label: "Medium Cyberpunk (RGB Splits & Flicker)" },
          { value: "Corrupted Matrix", label: "Corrupted Matrix (Heavy Distortion)" },
          { value: "System Meltdown", label: "System Meltdown (Maximum Chaos)" },
        ],
      },
      {
        id: "chromaticAberration",
        label: "RGB Split Chromatic Aberration",
        type: "switch",
        description: "Separates red, green, and blue color channels dynamically.",
      },
    ],
  },

  // ==========================================
  // DARE & CHALLENGE MODIFIERS
  // ==========================================
  {
    id: "blind_faith",
    name: "Blindfold Runic Trial",
    target: "dare",
    targetLabel: "Dare Challenge",
    category: "Dares & Trials",
    rarity: "Curse",
    color: "#a855f7",
    icon: "game-icons:blindfold",
    image: "/assets/images/placeholder.svg",
    tagline: "The player must conquer their challenge completely blindfolded!",
    description: "Forces the rolled contestant to wear a blindfold (or turn away from the screen) while executing their assigned gaming dare. Teammates may shout frantic verbal cues!",
    lore: "In ancient dare rites, true champions proved their mastery not with their eyes, but through muscle memory and the screams of their allies.",
    howItWorks: [
      "The designated player must be blindfolded before the challenge begins.",
      "Other players can either guide them with verbal commands or provide chaotic hints.",
      "Awards triple points upon successful completion of the blindfolded dare.",
      "Displays an eerie runic blindfold emblem over the active dare banner."
    ],
    enabled: false,
    defaultSettings: {
      pointsBonus: 150,
      allowVoiceCoach: true,
      timeLimitSeconds: 120,
    },
    settingsSchema: [
      {
        id: "pointsBonus",
        label: "Blindfold Bonus Points",
        type: "range",
        min: 50,
        max: 300,
        step: 25,
        unit: " PTS",
        description: "Extra leaderboard points awarded for surviving the trial blind.",
      },
      {
        id: "allowVoiceCoach",
        label: "Allow Teammate Voice Guidance",
        type: "switch",
        description: "Permit spectators to shout directions and warnings to the blind player.",
      },
    ],
  },
  {
    id: "silent_run",
    name: "The Silent Scream",
    target: "dare",
    targetLabel: "Dare Challenge",
    category: "Dares & Trials",
    rarity: "Epic",
    color: "#ec4899",
    icon: "game-icons:screaming",
    image: "/assets/images/placeholder.svg",
    tagline: "Total absolute silence required. A single laugh, whisper, or scream fails the run!",
    description: "The contestant is forbidden from uttering a sound, laughing, whispering, or screaming for the entire duration of the dare. Spectators are encouraged to make them break!",
    lore: "The crypt keeper despises noise. Any player who breaks the vow of silence is dragged down into the penalty pit.",
    howItWorks: [
      "Player must remain 100% silent during the assigned game session.",
      "Any audible sound, chuckle, or gasp results in an immediate strike.",
      "Room spectators can perform silly acts or crack jokes to induce laughter.",
      "High suspense with visual audio decibel meter on the HUD."
    ],
    enabled: false,
    defaultSettings: {
      strictness: "Zero Tolerance",
      durationSeconds: 180,
    },
    settingsSchema: [
      {
        id: "strictness",
        label: "Silence Strictness",
        type: "select",
        description: "Severity threshold for sound detection.",
        options: [
          { value: "Zero Tolerance", label: "Zero Tolerance (No whispers, giggles, or squeaks)" },
          { value: "Screams Only", label: "Screams Only (Must suppress fear screams)" },
        ],
      },
    ],
  },
  {
    id: "saboteur",
    name: "Rogue Saboteur Intervention",
    target: "dare",
    targetLabel: "Dare Challenge",
    category: "Dares & Trials",
    rarity: "Curse",
    color: "#ff0055",
    icon: "game-icons:hood",
    image: "/assets/images/placeholder.svg",
    tagline: "Another contestant is appointed as a saboteur to actively disrupt the challenge!",
    description: "A secondary player is randomly chosen to act as the official Saboteur. Their mission: tickle, wave hands, obstruct view, or make funny faces to prevent victory!",
    lore: "Chaos thrives when loyalty fractures. The machine crowns one assassin to pull down the hopeful hero.",
    howItWorks: [
      "Selects a secondary player as the assigned Saboteur.",
      "Saboteur gains 50 points if the main player fails the challenge.",
      "Physical obstruction rules can be configured from light to full chaos.",
      "Displays dual player showdown spotlight on the result popup."
    ],
    enabled: false,
    defaultSettings: {
      saboteurReward: 50,
      allowedInterference: "Verbal & Distraction",
    },
    settingsSchema: [
      {
        id: "saboteurReward",
        label: "Bounty for Successful Sabotage",
        type: "range",
        min: 25,
        max: 100,
        step: 25,
        unit: " PTS",
        description: "Score given to the saboteur if they cause the player to fail.",
      },
      {
        id: "allowedInterference",
        label: "Interference Rules",
        type: "select",
        description: "Permitted actions the saboteur may take.",
        options: [
          { value: "Verbal & Distraction", label: "Verbal & Distraction (No touching controller)" },
          { value: "Physical Tickling & Vision Block", label: "Light Physical (Waving hands, tickling)" },
        ],
      },
    ],
  },
  {
    id: "double_trouble",
    name: "Tag-Team Showdown",
    target: "dare",
    targetLabel: "Dare Challenge",
    category: "Dares & Trials",
    rarity: "Epic",
    color: "#f59e0b",
    icon: "game-icons:player-next",
    image: "/assets/images/placeholder.svg",
    tagline: "Spins select TWO players simultaneously for a co-op trial or 1v1 grudge match.",
    description: "Doubles the stakes by selecting two simultaneous contestants! They must either cooperate to complete the dare or duel each other head-to-head.",
    lore: "Misery loves company. The haunted cabinet demands two souls step into the ring.",
    howItWorks: [
      "The slot reels pick two players together.",
      "In Co-op mode, both players share victory points.",
      "In Versus mode, whoever performs better claims the entire bounty.",
      "Spawns tandem animated player badges."
    ],
    enabled: false,
    defaultSettings: {
      showdownType: "Co-op Alliance",
      splitPoints: true,
    },
    settingsSchema: [
      {
        id: "showdownType",
        label: "Showdown Format",
        type: "select",
        description: "Alliance or rivalry between the two rolled players.",
        options: [
          { value: "Co-op Alliance", label: "Co-op Alliance (Both win or both fail)" },
          { value: "1v1 Deathmatch", label: "1v1 Deathmatch (Winner takes all points)" },
        ],
      },
    ],
  },

  // ==========================================
  // VIDEO GAME MODIFIERS
  // ==========================================
  {
    id: "inverted_controls",
    name: "Controller of Inverted Fate",
    target: "game",
    targetLabel: "Video Game",
    category: "Video Games",
    rarity: "Curse",
    color: "#38bdf8",
    icon: "game-icons:gamepad",
    image: "/assets/images/placeholder.svg",
    tagline: "Inverts gamepad axes or forces players to hold the controller upside down!",
    description: "Reverses player control reflexes! The player must hold their game controller completely upside-down, invert game stick axes, or cross their hands on keyboard.",
    lore: "A demonic inversion spell cast upon the joystick circuit boards. Up is down, left is right, and forward leads straight off a cliff.",
    howItWorks: [
      "Player must flip their controller 180° upside-down or cross hands.",
      "Tested reflexes create hilarious party blunders and chaotic fails.",
      "Conquering the level under inverted controls earns a Legendary badge.",
      "Displays live inverted directional arrow overlay."
    ],
    enabled: false,
    defaultSettings: {
      gripStyle: "Upside-Down Controller",
      difficultyMultiplier: 2.0,
    },
    settingsSchema: [
      {
        id: "gripStyle",
        label: "Inversion Handicap Method",
        type: "select",
        description: "How the player must physically handicap their controls.",
        options: [
          { value: "Upside-Down Controller", label: "Upside-Down Controller (Hold pad flipped 180°)" },
          { value: "Crossed Arms", label: "Crossed Arms (Left hand on right stick/keys)" },
          { value: "In-Game Invert", label: "In-Game Invert (Invert X & Y axes in settings)" },
        ],
      },
    ],
  },
  {
    id: "speedrun_rush",
    name: "Speedrun Time Bomb Rush",
    target: "game",
    targetLabel: "Video Game",
    category: "Video Games",
    rarity: "Rare",
    color: "#ff6200",
    icon: "game-icons:stopwatch",
    image: "/assets/images/placeholder.svg",
    tagline: "Tick-tock! A frantic 3-minute countdown bomb is armed during gameplay.",
    description: "Adds extreme time pressure to video game trials! An explosive countdown clock ticks down on screen—clear the gaming objective before the bomb explodes!",
    lore: "Tick, tock. The arcade cabinet's self-destruct fuse has been lit. Hesitate for a second, and your leaderboard points go up in smoke.",
    howItWorks: [
      "Starts an animated ticking countdown clock when the video game launches.",
      "Screen edges flash red when less than 30 seconds remain.",
      "Failing before the clock hits zero costs 50 leaderboard points.",
      "Plays accelerating adrenaline heartbeat and ticking audio."
    ],
    enabled: false,
    defaultSettings: {
      timeLimitMinutes: 3,
      urgentAlarmAtSeconds: 30,
    },
    settingsSchema: [
      {
        id: "timeLimitMinutes",
        label: "Countdown Time Limit",
        type: "range",
        min: 1,
        max: 10,
        step: 0.5,
        unit: " MIN",
        description: "Total minutes allowed to clear the designated game objective.",
      },
      {
        id: "urgentAlarmAtSeconds",
        label: "Panic Siren Warning Time",
        type: "range",
        min: 10,
        max: 60,
        step: 5,
        unit: " SEC",
        description: "When the red warning strobe begins flashing.",
      },
    ],
  },
  {
    id: "one_life",
    name: "One Life Left (Hardcore Perma-Death)",
    target: "game",
    targetLabel: "Video Game",
    category: "Video Games",
    rarity: "Legendary",
    color: "#ff1744",
    icon: "game-icons:heart-minus",
    image: "/assets/images/placeholder.svg",
    tagline: "A single in-game death or failed checkpoint triggers instant run forfeit!",
    description: "Ultimate high-stakes survival. Any death, hit, or respawn in the video game immediately terminates the run with a forfeit penalty.",
    lore: "No continues. No extra credits. No second chances. Insert coin or face eternal banishment.",
    howItWorks: [
      "The player has strictly 1 life in the game.",
      "If the player's character dies even once, the dare is instantly lost.",
      "Huge reward if survived: +200 bonus leaderboard points.",
      "Displays heartbeat pulse meter on the HUD."
    ],
    enabled: false,
    defaultSettings: {
      pointsBounty: 200,
    },
    settingsSchema: [
      {
        id: "pointsBounty",
        label: "Perma-Death Victory Bounty",
        type: "range",
        min: 100,
        max: 500,
        step: 50,
        unit: " PTS",
        description: "Massive points awarded for beating the game without dying once.",
      },
    ],
  },
  {
    id: "one_handed",
    name: "Single-Handed Gladiator",
    target: "game",
    targetLabel: "Video Game",
    category: "Video Games",
    rarity: "Epic",
    color: "#10e050",
    icon: "game-icons:hand",
    image: "/assets/images/placeholder.svg",
    tagline: "Player must play using only ONE hand on the controller or mouse!",
    description: "Disables one of the player's arms! The other hand must remain strictly behind their back while playing the video game challenge.",
    lore: "The ancient arcade gladiators often fought with one hand bound to test their raw reflexes and composure under fire.",
    howItWorks: [
      "Player must keep their off-hand behind their back or in their pocket.",
      "Controller must be operated entirely with 1 hand (thumb & fingers).",
      "Hilarious scramble to reach face buttons and trigger sticks.",
      "Spectators can enforce the one-hand rule with vigilant referee calls."
    ],
    enabled: false,
    defaultSettings: {
      bonusPoints: 100,
    },
    settingsSchema: [
      {
        id: "bonusPoints",
        label: "One-Hand Victory Bonus",
        type: "range",
        min: 50,
        max: 200,
        step: 25,
        unit: " PTS",
        description: "Points granted for triumphing with only one hand.",
      },
    ],
  },
];

const STORAGE_KEY = "jack_o_pot_modifiers_v3";

/**
 * Loads modifiers from localStorage, merging stored user settings with base defaults
 */
export function loadModifiers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return MODIFIERS_DATA.map((m) => ({
        ...m,
        settings: { ...m.defaultSettings },
      }));
    }
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) {
      return MODIFIERS_DATA.map((m) => ({
        ...m,
        settings: { ...m.defaultSettings },
      }));
    }

    return MODIFIERS_DATA.map((base) => {
      const found = saved.find((s) => s.id === base.id);
      if (!found) {
        return {
          ...base,
          settings: { ...base.defaultSettings },
        };
      }
      return {
        ...base,
        enabled: typeof found.enabled === "boolean" ? found.enabled : base.enabled,
        settings: {
          ...base.defaultSettings,
          ...(found.settings || {}),
        },
      };
    });
  } catch (e) {
    console.error("Failed to load modifiers from localStorage:", e);
    return MODIFIERS_DATA.map((m) => ({
      ...m,
      settings: { ...m.defaultSettings },
    }));
  }
}

/**
 * Persists modifiers array to localStorage
 */
export function saveModifiers(modifiers) {
  try {
    const serialized = modifiers.map((m) => ({
      id: m.id,
      enabled: m.enabled,
      settings: m.settings,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.error("Failed to save modifiers to localStorage:", e);
  }
}
