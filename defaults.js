import { makeId } from "./utils.js";

export const SCHEMA_VERSION = 2;

export function createEntry(label, overrides = {}) {
  return {
    id: makeId(),
    label,
    subtitle: "",
    weight: 1,
    sliceColor: null,
    textColor: null,
    image: null,
    imageMode: "image-text",
    enabled: true,
    eliminated: false,
    winCount: 0,
    meta: {},
    ...overrides
  };
}

export const TEAM_PICKER_NAMES = [
  "Noah",
  "Olivia",
  "Sofia",
  "Isla",
  "Hugo",
  "Lucía",
  "Yi-seo",
  "Minato",
  "Liam"
];

export const DEFAULT_ENTRIES = TEAM_PICKER_NAMES.map((name) => createEntry(name));

export const DEFAULT_STATE = {
  schemaVersion: SCHEMA_VERSION,
  title: "My Wheel",
  description: "",
  entries: DEFAULT_ENTRIES,
  tournament: {
    rounds: [],
    winnerId: null,
    winnerLabel: "",
    generatedAt: 0
  },
  results: [],
  settings: {
    mode: "normal",
    spinDuration: 5,
    spinTurns: 8,
    easingCurve: "cubic-out",
    manualStop: false,
    randomInitialAngle: true,
    showWeights: false,
    mysteryWheel: false,
    teamCount: 2,
    numberMin: 1,
    numberMax: 20,
    numberStep: 1,
    numberCount: 3,
    seedEnabled: false,
    seedValue: "",
    seedCursor: 0,
    celebrationMode: "confetti",
    cinematicMode: false,
    hapticsEnabled: true,
    idleAnimationEnabled: true,
    tournamentMode: false,
    performanceModeAuto: true,
    performanceOverview: false,
    confettiEnabled: true,
    reduceMotionOverride: false
  },
  theme: {
    preset: "rainbow",
    sliceColors: [],
    backgroundColor: "#091126",
    borderColor: "#ffffff22",
    borderWidth: 2,
    pointerStyle: "classic",
    centerStyle: "spin-button",
    centerImage: null,
    centerText: "",
    centerColor: null,
    fontFamily: "auto",
    pageTheme: "dark",
    backgroundType: "default",
    backgroundSolid: "#091126",
    backgroundGradientFrom: "#091126",
    backgroundGradientTo: "#14335d",
    backgroundGradientAngle: 150,
    backgroundImage: null,
    eventPreset: "default"
  },
  audio: {
    tickSound: "click",
    winSound: "fanfare",
    spinSound: "whoosh",
    masterVolume: 0.7,
    tickEnabled: true,
    winEnabled: true,
    spinEnabled: false
  },
  ui: {
    language: "en",
    activeTab: "entries",
    firstRunHintDismissed: false
  }
};

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "vi", label: "ខ្មែរ" }
];

export const HREFLANG_CODES = ["en", "vi", "es", "pt", "fr", "de", "ja", "ko", "zh", "id"];
