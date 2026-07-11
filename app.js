import { AudioEngine } from "./audio-engine.js";
import { DEFAULT_STATE, HREFLANG_CODES, SUPPORTED_LANGUAGES, createEntry } from "./defaults.js";
import { applyTranslations, getCurrentLanguage, initI18n, onLanguageChange, setLanguage, t } from "./i18n.js";
import { decodeWheelConfig, encodeWheelConfig, estimateShareSize, readSharePayload, buildShareUrl } from "./share-codec.js";
import { STATE_EVENTS, StateManager } from "./state-manager.js";
import { buildTemplateEntries, getTemplatesForCurrentLanguage } from "./templates.js";
import { THEME_ORDER, THEME_PRESETS } from "./themes.js";
import { clearLibrary, deleteWheel, duplicateWheel, getWheel, listWheels, renameWheel, saveWheel, togglePinned } from "./wheel-library.js";
import { STORAGE_KEYS, clamp, cryptoRandom, csvEscape, downloadFile, formatTimestamp, hasEqualWeights, parseBulkEntries, parseCsvRows, safeLocalStorageGet, safeLocalStorageRemove, safeLocalStorageSet, shuffleArray, sortEntriesAZ } from "./utils.js";
import { WheelEngine } from "./wheel-engine.js";

const SITE_ORIGIN = "https://spin.alsatian.co";
const OG_LOCALE_BY_LANG = {
  en: "en_US",
  vi: "km_kh",
  es: "es_ES",
  pt: "pt_BR",
  fr: "fr_FR",
  de: "de_DE",
  ja: "ja_JP",
  ko: "ko_KR",
  zh: "zh_CN",
  id: "id_ID"
};

const dom = {
  app: document.querySelector("#app"),
  wheelContainer: document.querySelector("#wheelContainer"),
  wheelCanvas: document.querySelector("#wheelCanvas"),
  confettiCanvas: document.querySelector("#confettiCanvas"),
  centerSpinButton: document.querySelector("#centerSpinButton"),
  floatingSpinButton: document.querySelector("#floatingSpinButton"),
  fullscreenToolbar: document.querySelector("#fullscreenToolbar"),
  fullscreenExitButton: document.querySelector("#fullscreenExitButton"),
  fullscreenSettingsButton: document.querySelector("#fullscreenSettingsButton"),
  firstRunHint: document.querySelector("#firstRunHint"),
  languageButton: document.querySelector("#languageButton"),
  languageMenu: document.querySelector("#languageMenu"),
  languageCode: document.querySelector("#languageCode"),
  settingsButton: document.querySelector("#settingsButton"),
  fullscreenToggle: document.querySelector("#fullscreenToggle"),
  libraryButton: document.querySelector("#libraryButton"),
  shareButton: document.querySelector("#shareButton"),
  shortcutButton: document.querySelector("#shortcutButton"),
  entryCountBadge: document.querySelector("#entryCountBadge"),
  undoButton: document.querySelector("#undoButton"),
  redoButton: document.querySelector("#redoButton"),
  saveAsButton: document.querySelector("#saveAsButton"),
  openLibraryButton: document.querySelector("#openLibraryButton"),
  recentWheelsSelect: document.querySelector("#recentWheelsSelect"),
  entriesList: document.querySelector("#entriesList"),
  addEntryInput: document.querySelector("#addEntryInput"),
  addEntryButton: document.querySelector("#addEntryButton"),
  shuffleEntriesButton: document.querySelector("#shuffleEntriesButton"),
  sortEntriesButton: document.querySelector("#sortEntriesButton"),
  clearEntriesButton: document.querySelector("#clearEntriesButton"),
  pasteListButton: document.querySelector("#pasteListButton"),
  importDataButton: document.querySelector("#importDataButton"),
  exportDataButton: document.querySelector("#exportDataButton"),
  templateButton: document.querySelector("#templateButton"),
  resetEliminationsButton: document.querySelector("#resetEliminationsButton"),
  emptyTemplateHint: document.querySelector("#emptyTemplateHint"),
  emptyTemplateButton: document.querySelector("#emptyTemplateButton"),
  resultsList: document.querySelector("#resultsList"),
  winCountList: document.querySelector("#winCountList"),
  clearResultsButton: document.querySelector("#clearResultsButton"),
  factoryResetButton: document.querySelector("#factoryResetButton"),
  historyButton: document.querySelector("#historyButton"),
  exportResultsCsvButton: document.querySelector("#exportResultsCsvButton"),
  exportAuditJsonButton: document.querySelector("#exportAuditJsonButton"),
  weightsToggle: document.querySelector("#weightsToggle"),
  manualStopToggle: document.querySelector("#manualStopToggle"),
  mysteryWheelToggle: document.querySelector("#mysteryWheelToggle"),
  durationSlider: document.querySelector("#durationSlider"),
  durationOutput: document.querySelector("#durationOutput"),
  turnsSlider: document.querySelector("#turnsSlider"),
  turnsOutput: document.querySelector("#turnsOutput"),
  seedModeToggle: document.querySelector("#seedModeToggle"),
  seedInput: document.querySelector("#seedInput"),
  themeSelect: document.querySelector("#themeSelect"),
  themeSwatches: document.querySelector("#themeSwatches"),
  eventPresetSelect: document.querySelector("#eventPresetSelect"),
  pointerStyleSelect: document.querySelector("#pointerStyleSelect"),
  centerTextInput: document.querySelector("#centerTextInput"),
  centerColorInput: document.querySelector("#centerColorInput"),
  centerImageButton: document.querySelector("#centerImageButton"),
  removeCenterImageButton: document.querySelector("#removeCenterImageButton"),
  backgroundTypeSelect: document.querySelector("#backgroundTypeSelect"),
  backgroundSolidInput: document.querySelector("#backgroundSolidInput"),
  backgroundFromInput: document.querySelector("#backgroundFromInput"),
  backgroundToInput: document.querySelector("#backgroundToInput"),
  backgroundAngleInput: document.querySelector("#backgroundAngleInput"),
  backgroundImageButton: document.querySelector("#backgroundImageButton"),
  removeBackgroundImageButton: document.querySelector("#removeBackgroundImageButton"),
  volumeSlider: document.querySelector("#volumeSlider"),
  volumeOutput: document.querySelector("#volumeOutput"),
  tickSoundToggle: document.querySelector("#tickSoundToggle"),
  tickSoundSelect: document.querySelector("#tickSoundSelect"),
  winSoundToggle: document.querySelector("#winSoundToggle"),
  winSoundSelect: document.querySelector("#winSoundSelect"),
  spinSoundToggle: document.querySelector("#spinSoundToggle"),
  spinSoundSelect: document.querySelector("#spinSoundSelect"),
  celebrationSelect: document.querySelector("#celebrationSelect"),
  reduceMotionOverride: document.querySelector("#reduceMotionOverride"),
  cinematicModeToggle: document.querySelector("#cinematicModeToggle"),
  hapticsToggle: document.querySelector("#hapticsToggle"),
  idleAnimationToggle: document.querySelector("#idleAnimationToggle"),
  performanceAutoToggle: document.querySelector("#performanceAutoToggle"),
  performanceOverviewToggle: document.querySelector("#performanceOverviewToggle"),
  probabilityList: document.querySelector("#probabilityList"),
  probabilityEqualBadge: document.querySelector("#probabilityEqualBadge"),
  weightedBadge: document.querySelector("#weightedBadge"),
  seedBadge: document.querySelector("#seedBadge"),
  tabs: Array.from(document.querySelectorAll(".tab-btn")),
  tabPanels: {
    entries: document.querySelector("#entriesTab"),
    results: document.querySelector("#resultsTab")
  },
  modalRoot: document.querySelector("#modalRoot"),
  settingsModal: document.querySelector("#settingsModal"),
  closeSettingsButton: document.querySelector("#closeSettingsButton"),
  settingsTabs: Array.from(document.querySelectorAll(".settings-modal-tab")),
  settingsPanels: {
    general: document.querySelector("[data-settings-panel='general']"),
    spin: document.querySelector("[data-settings-panel='spin']"),
    theme: document.querySelector("[data-settings-panel='theme']"),
    sound: document.querySelector("[data-settings-panel='sound']"),
    effects: document.querySelector("[data-settings-panel='effects']"),
    probability: document.querySelector("[data-settings-panel='probability']")
  },
  pasteModal: document.querySelector("#pasteModal"),
  pasteTextarea: document.querySelector("#pasteTextarea"),
  pasteCancelButton: document.querySelector("#pasteCancelButton"),
  pasteApplyButton: document.querySelector("#pasteApplyButton"),
  resultModal: document.querySelector("#resultModal"),
  resultWinner: document.querySelector("#resultWinner"),
  resultSubtitle: document.querySelector("#resultSubtitle"),
  spinAgainButton: document.querySelector("#spinAgainButton"),
  removeWinnerButton: document.querySelector("#removeWinnerButton"),
  closeResultButton: document.querySelector("#closeResultButton"),
  shareModal: document.querySelector("#shareModal"),
  shareUrlInput: document.querySelector("#shareUrlInput"),
  shareSizeStatus: document.querySelector("#shareSizeStatus"),
  embedWidthInput: document.querySelector("#embedWidthInput"),
  embedHeightInput: document.querySelector("#embedHeightInput"),
  embedCodeInput: document.querySelector("#embedCodeInput"),
  copyEmbedButton: document.querySelector("#copyEmbedButton"),
  qrCanvas: document.querySelector("#qrCanvas"),
  downloadQrButton: document.querySelector("#downloadQrButton"),
  copyShareButton: document.querySelector("#copyShareButton"),
  closeShareButton: document.querySelector("#closeShareButton"),
  libraryModal: document.querySelector("#libraryModal"),
  libraryList: document.querySelector("#libraryList"),
  closeLibraryButton: document.querySelector("#closeLibraryButton"),
  csvMapModal: document.querySelector("#csvMapModal"),
  csvLabelColumn: document.querySelector("#csvLabelColumn"),
  csvWeightColumn: document.querySelector("#csvWeightColumn"),
  csvColorColumn: document.querySelector("#csvColorColumn"),
  csvMapCancelButton: document.querySelector("#csvMapCancelButton"),
  csvMapApplyButton: document.querySelector("#csvMapApplyButton"),
  exportModal: document.querySelector("#exportModal"),
  exportCancelButton: document.querySelector("#exportCancelButton"),
  exportApplyButton: document.querySelector("#exportApplyButton"),
  historyModal: document.querySelector("#historyModal"),
  closeHistoryButton: document.querySelector("#closeHistoryButton"),
  factoryResetModal: document.querySelector("#factoryResetModal"),
  factoryResetTitle: document.querySelector("#factoryResetTitle"),
  factoryResetDescription: document.querySelector("#factoryResetDescription"),
  factoryResetCancelButton: document.querySelector("#factoryResetCancelButton"),
  factoryResetConfirmButton: document.querySelector("#factoryResetConfirmButton"),
  templateModal: document.querySelector("#templateModal"),
  templateGrid: document.querySelector("#templateGrid"),
  closeTemplateButton: document.querySelector("#closeTemplateButton"),
  shortcutModal: document.querySelector("#shortcutModal"),
  closeShortcutButton: document.querySelector("#closeShortcutButton"),
  toastRoot: document.querySelector("#toastRoot"),
  ariaLive: document.querySelector("#ariaLive"),
  importDataFileInput: document.querySelector("#importDataFileInput"),
  centerImageInput: document.querySelector("#centerImageInput"),
  backgroundImageInput: document.querySelector("#backgroundImageInput")
};

const stateManager = new StateManager({ storageKey: STORAGE_KEYS.state });
const wheelEngine = new WheelEngine({ canvas: dom.wheelCanvas, container: dom.wheelContainer });
const audioEngine = new AudioEngine();

const mediaReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mediaDarkMode = window.matchMedia("(prefers-color-scheme: dark)");

let activeModal = null;
let activeCelebration = null;
let currentWinnerEntryId = null;
let templateCache = [];
let manualSpinPending = null;
let csvImportRows = [];
let recentWheels = [];
let latestResultId = null;
let lastHapticTickAt = 0;
let pendingResultModalTimeoutId = null;
let confirmResolve = null;
let confirmReturnModal = null;
let confirmClosingByChoice = false;
let floatingSpinObserver = null;
let spinOnlyControlElements = null;
const EVENT_PRESET_KEYS = new Set(["default", "classroom", "raffle", "streamer", "party", "minimal", "dark-luxury"]);
const AUTO_CENTER_TEXT_PREFIX = "__auto__:";
const AUTO_CENTER_TEXT_KEY_BY_PRESET = {
  default: "spin_button",
  classroom: "center_text_go",
  raffle: "center_text_draw",
  streamer: "spin_button",
  party: "center_text_party",
  minimal: "spin_button",
  "dark-luxury": "spin_button"
};
const LEGACY_AUTO_CENTER_TEXT_KEY_BY_VALUE = {
  SPIN: "spin_button",
  GO: "center_text_go",
  DRAW: "center_text_draw",
  PARTY: "center_text_party"
};

function getState() {
  return stateManager.getState();
}

function activeEntries(state) {
  return state.entries.filter((entry) => entry.enabled && !entry.eliminated && entry.label.trim());
}

function canRemoveWinner(state) {
  return !state.settings.spinOnly;
}

function reducedMotionEnabled(state) {
  return mediaReduceMotion.matches && !state.settings.reduceMotionOverride;
}

function clearPendingResultModal() {
  if (pendingResultModalTimeoutId === null) return;
  window.clearTimeout(pendingResultModalTimeoutId);
  pendingResultModalTimeoutId = null;
}

function openModal(modalElement) {
  closeModal();
  activeModal = modalElement;
  document.body.classList.add("modal-open");
  modalElement.classList.remove("hidden");
}

function closeModal() {
  if (!activeModal) return;
  if (activeModal === dom.factoryResetModal && confirmResolve && !confirmClosingByChoice) {
    resolveAppConfirm(false);
    return;
  }
  if (activeModal === dom.resultModal) {
    stopCelebration();
  }
  activeModal.classList.add("hidden");
  activeModal = null;
  document.body.classList.remove("modal-open");
}

function resolveAppConfirm(result) {
  if (!confirmResolve) return;
  const resolve = confirmResolve;
  const returnModal = confirmReturnModal;
  confirmResolve = null;
  confirmReturnModal = null;
  confirmClosingByChoice = true;
  closeModal();
  confirmClosingByChoice = false;
  if (returnModal) {
    openModal(returnModal);
  }
  resolve(result);
}

function requestAppConfirm({ titleKey, messageKey, confirmKey = "apply", danger = false } = {}) {
  if (!dom.factoryResetModal || !dom.factoryResetTitle || !dom.factoryResetDescription || !dom.factoryResetConfirmButton) {
    return Promise.resolve(false);
  }
  if (!titleKey || !messageKey) {
    return Promise.resolve(false);
  }

  if (confirmResolve) {
    const resolve = confirmResolve;
    confirmResolve = null;
    confirmReturnModal = null;
    resolve(false);
  }

  confirmReturnModal = activeModal && activeModal !== dom.factoryResetModal ? activeModal : null;
  dom.factoryResetTitle.textContent = t(titleKey);
  dom.factoryResetDescription.textContent = t(messageKey);
  dom.factoryResetConfirmButton.textContent = t(confirmKey);

  if (danger) {
    dom.factoryResetConfirmButton.classList.remove("accent-btn");
    dom.factoryResetConfirmButton.classList.add("ghost-btn", "danger-btn");
  } else {
    dom.factoryResetConfirmButton.classList.remove("ghost-btn", "danger-btn");
    dom.factoryResetConfirmButton.classList.add("accent-btn");
  }

  openModal(dom.factoryResetModal);
  dom.factoryResetCancelButton?.focus();

  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function showToast(message) {
  if (!dom.toastRoot) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  dom.toastRoot.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2600);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode image"));
    image.src = src;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressImageFile(file, maxBytes = 102400, maxDimension = 768) {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const maxSide = Math.max(image.width, image.height) || 1;
  const baseScale = Math.min(1, maxDimension / maxSide);
  let width = Math.max(1, Math.round(image.width * baseScale));
  let height = Math.max(1, Math.round(image.height * baseScale));

  let attempt = 0;
  let quality = 0.9;
  let resultBlob = null;
  while (attempt < 10) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    resultBlob = await canvasToBlob(canvas, "image/webp", quality);
    if (resultBlob && resultBlob.size <= maxBytes) {
      break;
    }
    if (quality > 0.45) {
      quality -= 0.1;
    } else {
      width = Math.max(60, Math.round(width * 0.86));
      height = Math.max(60, Math.round(height * 0.86));
      quality = 0.86;
    }
    attempt += 1;
  }

  if (!resultBlob) {
    return dataUrl;
  }
  return fileToDataUrl(new File([resultBlob], "image.webp", { type: "image/webp" }));
}

async function readTextFile(file) {
  const buffer = await file.arrayBuffer();
  const decoders = [
    new TextDecoder("utf-8", { fatal: false }),
    new TextDecoder("windows-1252", { fatal: false }),
    new TextDecoder("iso-8859-1", { fatal: false })
  ];
  for (const decoder of decoders) {
    try {
      return decoder.decode(buffer);
    } catch {
      // Try next decoder.
    }
  }
  return new TextDecoder().decode(buffer);
}

function sanitizeFilename(name) {
  return String(name || "wheel")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "wheel";
}

function csvFromEntries(entries) {
  const header = ["label", "weight", "color"];
  const rows = entries.map((entry) => [
    csvEscape(entry.label),
    csvEscape(Number(entry.weight ?? 1)),
    csvEscape(entry.sliceColor || "")
  ]);
  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function csvFromResults(results) {
  const header = ["timestamp", "winner", "randomValue", "settings"];
  const rows = results.map((result) => [
    csvEscape(new Date(result.timestamp).toISOString()),
    csvEscape(result.label),
    csvEscape(result.randomValue ?? ""),
    csvEscape(JSON.stringify(result.settingsSnapshot || {}))
  ]);
  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function loadRecentWheels() {
  try {
    const raw = safeLocalStorageGet(STORAGE_KEYS.recentWheels);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 20).filter((item) => item && item.id && item.name);
  } catch {
    return [];
  }
}

function saveRecentWheels(items) {
  recentWheels = items.slice(0, 20);
  safeLocalStorageSet(STORAGE_KEYS.recentWheels, JSON.stringify(recentWheels));
}

function pushRecentWheel(item) {
  if (!item?.id) return;
  const filtered = recentWheels.filter((entry) => entry.id !== item.id);
  filtered.unshift({ id: item.id, name: item.name || "Untitled Wheel" });
  saveRecentWheels(filtered);
  renderRecentWheelsSelect();
}

function renderRecentWheelsSelect() {
  if (!dom.recentWheelsSelect) return;
  dom.recentWheelsSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = `${t("recent_wheels")}:`;
  dom.recentWheelsSelect.appendChild(defaultOption);
  recentWheels.forEach((wheel) => {
    const option = document.createElement("option");
    option.value = wheel.id;
    option.textContent = wheel.name;
    dom.recentWheelsSelect.appendChild(option);
  });
}

function normalizeEventPresetKey(presetKey) {
  if (!presetKey || presetKey === "none") return "default";
  return EVENT_PRESET_KEYS.has(presetKey) ? presetKey : "default";
}

function getAutoCenterTextKeyForPreset(presetKey) {
  const normalizedPresetKey = normalizeEventPresetKey(presetKey);
  return AUTO_CENTER_TEXT_KEY_BY_PRESET[normalizedPresetKey] || "spin_button";
}

function getAutoCenterTextValueForPreset(presetKey) {
  const autoKey = getAutoCenterTextKeyForPreset(presetKey);
  return autoKey === "spin_button" ? "" : `${AUTO_CENTER_TEXT_PREFIX}${autoKey}`;
}

function getLegacyAutoCenterTextKey(value) {
  return LEGACY_AUTO_CENTER_TEXT_KEY_BY_VALUE[String(value || "")] || null;
}

function resolveCenterText(themeState = {}) {
  const normalizedPresetKey = normalizeEventPresetKey(themeState.eventPreset);
  const autoKey = getAutoCenterTextKeyForPreset(normalizedPresetKey);
  const value = String(themeState.centerText || "");
  if (!value) {
    return t(autoKey);
  }
  if (value.startsWith(AUTO_CENTER_TEXT_PREFIX)) {
    return t(value.slice(AUTO_CENTER_TEXT_PREFIX.length));
  }
  const legacyAutoKey = getLegacyAutoCenterTextKey(value);
  return legacyAutoKey ? t(legacyAutoKey) : value;
}

function applyEventPreset(presetKey) {
  const normalizedPresetKey = normalizeEventPresetKey(presetKey);
  const defaultPageTheme = DEFAULT_STATE.theme.pageTheme === "light" ? "light" : "dark";

  if (normalizedPresetKey === "default") {
    stateManager.update((draft) => {
      draft.theme = {
        ...draft.theme,
        ...structuredClone(DEFAULT_STATE.theme),
        pageTheme: defaultPageTheme,
        eventPreset: "default"
      };
      draft.settings.confettiEnabled = Boolean(DEFAULT_STATE.settings.confettiEnabled);
      draft.settings.celebrationMode = DEFAULT_STATE.settings.celebrationMode || (draft.settings.confettiEnabled ? "confetti" : "none");
    });
    return;
  }

  const patch = {
    classroom: {
      theme: "pastel",
      pageTheme: "light",
      pointerStyle: "classic",
      confettiEnabled: false
    },
    raffle: {
      theme: "casino",
      pageTheme: "dark",
      pointerStyle: "diamond",
      confettiEnabled: true
    },
    streamer: {
      theme: "cyberpunk",
      pageTheme: "dark",
      pointerStyle: "flag",
      confettiEnabled: false
    },
    party: {
      theme: "candy",
      pageTheme: "dark",
      pointerStyle: "pin",
      confettiEnabled: true
    },
    minimal: {
      theme: "monochrome",
      pageTheme: "light",
      pointerStyle: "classic",
      confettiEnabled: false
    },
    "dark-luxury": {
      theme: "elegant",
      pageTheme: "dark",
      pointerStyle: "diamond",
      confettiEnabled: true
    }
  }[normalizedPresetKey];

  if (!patch) return;
  stateManager.update((draft) => {
    draft.theme.preset = patch.theme;
    draft.theme.pageTheme = patch.pageTheme;
    draft.theme.pointerStyle = patch.pointerStyle;
    draft.theme.centerText = getAutoCenterTextValueForPreset(normalizedPresetKey);
    draft.settings.confettiEnabled = patch.confettiEnabled;
    draft.settings.celebrationMode = patch.confettiEnabled ? "confetti" : "none";
    draft.theme.eventPreset = normalizedPresetKey;
  });
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function createRandomStream(settings = {}) {
  const seedText = String(settings.seedValue || "").trim();
  const seeded = Boolean(settings.seedEnabled && seedText);
  let cursor = Math.max(0, Number.parseInt(settings.seedCursor, 10) || 0);
  const draws = [];

  const next = () => {
    const cursorUsed = seeded ? cursor : null;
    const value = seeded
      ? (hashString(`${seedText}:${cursor++}`) / 0x100000000)
      : cryptoRandom();
    const draw = { value, cursor: cursorUsed };
    draws.push(draw);
    return draw;
  };

  return {
    seeded,
    seedText,
    draws,
    next,
    getCursor() {
      return cursor;
    }
  };
}

function triggerHaptic(type = "tick", settings = getState().settings) {
  if (!settings.hapticsEnabled) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = {
    start: [24],
    tick: [8],
    result: [42, 28, 46]
  }[type] || [10];
  navigator.vibrate(pattern);
}

function triggerTickHaptic(settings) {
  const now = performance.now();
  if (now - lastHapticTickAt < 38) return;
  lastHapticTickAt = now;
  triggerHaptic("tick", settings);
}

function renderPseudoQr(text) {
  if (!dom.qrCanvas) return;
  const ctx = dom.qrCanvas.getContext("2d");
  const size = 33;
  const cell = Math.floor(dom.qrCanvas.width / size);
  const seed = hashString(text || "");
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  const drawFinder = (x, y) => {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const isBorder = row === 0 || col === 0 || row === 6 || col === 6;
        const isCenter = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        matrix[y + row][x + col] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (matrix[y][x]) continue;
      const mixed = hashString(`${seed}:${x}:${y}:${text}`);
      matrix[y][x] = (mixed % 11) < 5;
    }
  }

  ctx.clearRect(0, 0, dom.qrCanvas.width, dom.qrCanvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, dom.qrCanvas.width, dom.qrCanvas.height);
  ctx.fillStyle = "#0a1024";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!matrix[y][x]) continue;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
}

function updateEmbedCode(url) {
  const width = clamp(Number(dom.embedWidthInput.value) || 720, 280, 2000);
  const height = clamp(Number(dom.embedHeightInput.value) || 720, 280, 2000);
  const embedUrl = new URL(url);
  embedUrl.searchParams.set("embed", "1");
  dom.embedCodeInput.value = `<iframe src="${embedUrl.toString()}" width="${Math.round(width)}" height="${Math.round(height)}" frameborder="0" loading="lazy" allowfullscreen></iframe>`;
}

function updateThemeVars(themeState) {
  const preset = THEME_PRESETS[themeState.preset] || THEME_PRESETS.rainbow;
  const mode = themeState.pageTheme;
  const pagePalette = mode === "light" ? preset.pageLight : preset.pageDark;
  dom.app.setAttribute("data-theme", mode);
  document.body.setAttribute("data-theme", mode);

  document.documentElement.style.setProperty("--bg-base", pagePalette.bg);
  document.documentElement.style.setProperty("--bg-surface", pagePalette.surface);
  document.documentElement.style.setProperty("--bg-elevated", pagePalette.elevated);
  document.documentElement.style.setProperty("--accent", pagePalette.accent);
  document.documentElement.style.setProperty("--accent-2", pagePalette.accent2);
  applyBackgroundTheme(themeState, pagePalette);

  if (themeState.pointerStyle) {
    dom.wheelContainer.setAttribute("data-pointer-style", themeState.pointerStyle);
  }

  if (themeState.centerColor) {
    dom.centerSpinButton.style.background = `radial-gradient(circle at 30% 30%, ${lighten(themeState.centerColor, 26)}, ${themeState.centerColor})`;
    dom.floatingSpinButton.style.background = `linear-gradient(160deg, ${lighten(themeState.centerColor, 22)}, ${themeState.centerColor})`;
  } else {
    dom.centerSpinButton.style.background = "";
    dom.floatingSpinButton.style.background = "";
  }
  safeLocalStorageSet(STORAGE_KEYS.themeMode, mode);
}

function applyBackgroundTheme(themeState, pagePalette) {
  const type = themeState.backgroundType || "default";
  if (type === "solid") {
    document.body.style.background = themeState.backgroundSolid || pagePalette.bg;
    return;
  }

  if (type === "gradient") {
    const from = themeState.backgroundGradientFrom || pagePalette.bg;
    const to = themeState.backgroundGradientTo || pagePalette.surface;
    const angle = Number(themeState.backgroundGradientAngle) || 150;
    document.body.style.background = `linear-gradient(${angle}deg, ${from}, ${to})`;
    return;
  }

  if (type === "image" && themeState.backgroundImage) {
    document.body.style.background = `linear-gradient(rgb(0 0 0 / 0.32), rgb(0 0 0 / 0.32)), url(${themeState.backgroundImage}) center/cover no-repeat fixed`;
    return;
  }

  document.body.style.background = "";
}

function lighten(hex, amount) {
  const value = (hex || "").replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((c) => `${c}${c}`).join("") : value;
  if (normalized.length !== 6) return hex;
  const shift = (offset) => {
    const raw = Number.parseInt(normalized.slice(offset, offset + 2), 16);
    return Math.round(clamp(raw + amount, 0, 255)).toString(16).padStart(2, "0");
  };
  return `#${shift(0)}${shift(2)}${shift(4)}`;
}

function normalizeColor(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return null;
}

function applyThemeSelectionUI(presetKey) {
  dom.themeSelect.value = presetKey;
  dom.themeSwatches.querySelectorAll(".theme-swatch").forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === presetKey);
  });
}

function renderThemeOptions() {
  dom.themeSelect.innerHTML = "";
  dom.themeSwatches.innerHTML = "";
  THEME_ORDER.forEach((key) => {
    const preset = THEME_PRESETS[key];
    const option = document.createElement("option");
    option.value = key;
    option.textContent = preset.label;
    dom.themeSelect.appendChild(option);

    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "theme-swatch";
    swatch.dataset.theme = key;
    swatch.style.background = `conic-gradient(${preset.colors.join(",")})`;
    swatch.setAttribute("aria-label", preset.label);
    swatch.addEventListener("click", () => {
      stateManager.update((draft) => {
        draft.theme.preset = key;
      });
    });
    dom.themeSwatches.appendChild(swatch);
  });
}

function renderLanguageMenu() {
  dom.languageMenu.innerHTML = "";
  const current = getCurrentLanguage();
  dom.languageCode.textContent = current.toUpperCase();

  SUPPORTED_LANGUAGES.forEach((language) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lang-option";
    button.classList.toggle("is-active", language.code === current);
    button.textContent = language.label;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", language.code === current ? "true" : "false");
    button.addEventListener("click", async () => {
      await setLanguage(language.code);
      stateManager.update((draft) => {
        draft.ui.language = language.code;
      });
      dom.languageMenu.classList.add("hidden");
      dom.languageButton.setAttribute("aria-expanded", "false");
      renderAll(getState());
    });
    dom.languageMenu.appendChild(button);
  });
}

function renderTabs(activeTab) {
  const panelKeys = Object.keys(dom.tabPanels);
  const effectiveTab = panelKeys.includes(activeTab) ? activeTab : "entries";
  dom.tabs.forEach((button) => {
    const tab = button.dataset.tab;
    button.classList.toggle("active", Boolean(tab) && tab === effectiveTab);
  });
  Object.entries(dom.tabPanels).forEach(([tab, panel]) => {
    if (!panel) return;
    panel.classList.toggle("active", tab === effectiveTab);
  });
}

function renderSettingsModalTabs(activeTab = "general") {
  const panelKeys = Object.keys(dom.settingsPanels);
  const effectiveTab = panelKeys.includes(activeTab) ? activeTab : "general";

  dom.settingsTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.settingsTab === effectiveTab);
  });

  Object.entries(dom.settingsPanels).forEach(([tab, panel]) => {
    if (!panel) return;
    panel.classList.toggle("active", tab === effectiveTab);
  });
}

function openSettingsModal(initialTab = "general") {
  if (!dom.settingsModal) return;
  renderSettingsModalTabs(initialTab);
  openModal(dom.settingsModal);
}

function renderEntries(state) {
  const entries = state.entries;
  const spinOnly = Boolean(state.settings.spinOnly);
  dom.entriesList.innerHTML = "";
  if (dom.entryCountBadge) {
    dom.entryCountBadge.textContent = String(entries.length);
  }

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "result-item";
    empty.textContent = t("no_entries");
    dom.entriesList.appendChild(empty);
  }

  entries.forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "entry-row";
    row.dataset.entryId = entry.id;
    row.setAttribute("role", "listitem");
    row.draggable = !spinOnly;
    if (!entry.enabled) row.classList.add("is-disabled");
    if (entry.eliminated) row.classList.add("is-eliminated");

    row.addEventListener("dragstart", (event) => {
      if (spinOnly) return;
      event.dataTransfer?.setData("text/plain", entry.id);
      row.style.opacity = "0.5";
    });
    row.addEventListener("dragend", () => {
      row.style.opacity = "";
      dom.entriesList.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", (event) => {
      if (spinOnly) return;
      event.preventDefault();
      row.classList.remove("drag-over");
      const sourceId = event.dataTransfer?.getData("text/plain");
      if (!sourceId || sourceId === entry.id) return;
      stateManager.update((draft) => {
        const sourceIndex = draft.entries.findIndex((item) => item.id === sourceId);
        const targetIndex = draft.entries.findIndex((item) => item.id === entry.id);
        if (sourceIndex < 0 || targetIndex < 0) return;
        const [moved] = draft.entries.splice(sourceIndex, 1);
        draft.entries.splice(targetIndex, 0, moved);
      });
    });

    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "entry-handle";
    handle.textContent = "☰";
    handle.setAttribute("aria-label", t("drag_to_reorder"));
    handle.disabled = spinOnly;

    const enable = document.createElement("button");
    enable.type = "button";
    enable.className = "entry-enable";
    enable.textContent = entry.enabled ? "👁" : "🚫";
    enable.setAttribute("aria-label", entry.enabled ? t("disable_entry") : t("enable_entry"));
    enable.addEventListener("click", () => {
      if (spinOnly) return;
      stateManager.update((draft) => {
        draft.entries[index].enabled = !draft.entries[index].enabled;
      });
    });
    enable.disabled = spinOnly;

    const label = document.createElement("span");
    label.className = "entry-label";
    label.textContent = entry.label || t("untitled_entry");
    label.setAttribute("tabindex", "0");
    label.addEventListener("click", () => {
      if (spinOnly) return;
      enableInlineEdit(label, entry.id);
    });
    label.addEventListener("keydown", (event) => {
      if (spinOnly) return;
      if (event.key === "Enter") {
        event.preventDefault();
        enableInlineEdit(label, entry.id);
      }
    });

    const labelWrap = document.createElement("div");
    labelWrap.className = "entry-label-wrap";
    labelWrap.appendChild(label);

    const weightWrap = document.createElement("div");
    weightWrap.className = "entry-weight-wrap";
    if (state.settings.showWeights) {
      const weightLabel = document.createElement("span");
      weightLabel.className = "weight-badge";
      weightLabel.textContent = t("weight");
      weightLabel.setAttribute("aria-hidden", "true");
      weightWrap.appendChild(weightLabel);

      const weightInput = document.createElement("input");
      weightInput.type = "number";
      weightInput.className = "entry-weight-input";
      weightInput.min = "0.1";
      weightInput.max = "100";
      weightInput.step = "0.1";
      weightInput.value = String(entry.weight ?? 1);
      weightInput.inputMode = "decimal";
      weightInput.setAttribute("aria-label", t("weight"));
      weightInput.title = `${t("weight")}: 0.1 - 100`;
      weightInput.addEventListener("change", () => {
        if (spinOnly) return;
        const nextWeight = clamp(Number.parseFloat(weightInput.value) || 1, 0.1, 100);
        stateManager.update((draft) => {
          draft.entries[index].weight = nextWeight;
        });
      });
      weightInput.disabled = spinOnly;
      weightWrap.appendChild(weightInput);
    } else if (entry.winCount > 0) {
      const winBadge = document.createElement("span");
      winBadge.className = "win-badge";
      winBadge.textContent = `${t("wins_short")}: ${entry.winCount}`;
      weightWrap.appendChild(winBadge);
    }

    const mediaWrap = document.createElement("div");
    mediaWrap.className = "entry-media";
    if (entry.image) {
      const thumb = document.createElement("img");
      thumb.className = "entry-image-thumb";
      thumb.src = entry.image;
      thumb.alt = t("entry_image");
      mediaWrap.appendChild(thumb);
    }

    const uploadImageButton = document.createElement("button");
    uploadImageButton.type = "button";
    uploadImageButton.className = "entry-small-btn";
    uploadImageButton.textContent = "🖼";
    uploadImageButton.setAttribute("aria-label", t("upload_image"));
    uploadImageButton.disabled = spinOnly;
    const imageInput = document.createElement("input");
    imageInput.type = "file";
    imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
    imageInput.className = "sr-only";
    imageInput.addEventListener("change", async () => {
      if (spinOnly) return;
      const file = imageInput.files?.[0];
      if (!file) return;
      try {
        const compressed = await compressImageFile(file);
        stateManager.update((draft) => {
          draft.entries[index].image = compressed;
          if (!draft.entries[index].imageMode) {
            draft.entries[index].imageMode = "image-text";
          }
        });
      } catch {
        showToast(t("image_upload_failed"));
      }
    });
    uploadImageButton.addEventListener("click", () => imageInput.click());
    mediaWrap.append(uploadImageButton, imageInput);

    if (entry.image) {
      const removeImageButton = document.createElement("button");
      removeImageButton.type = "button";
      removeImageButton.className = "entry-small-btn";
      removeImageButton.textContent = "✕";
      removeImageButton.setAttribute("aria-label", t("remove_image"));
      removeImageButton.disabled = spinOnly;
      removeImageButton.addEventListener("click", () => {
        if (spinOnly) return;
        stateManager.update((draft) => {
          draft.entries[index].image = null;
          draft.entries[index].imageMode = "image-text";
        });
      });
      mediaWrap.appendChild(removeImageButton);

      const modeSelect = document.createElement("select");
      modeSelect.className = "entry-image-mode";
      modeSelect.disabled = spinOnly;
      [
        { value: "image-text", label: t("image_mode_image_text") },
        { value: "image-only", label: t("image_mode_image_only") },
        { value: "text-only", label: t("image_mode_text_only") }
      ].forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        modeSelect.appendChild(option);
      });
      modeSelect.value = entry.imageMode || "image-text";
      modeSelect.addEventListener("change", () => {
        if (spinOnly) return;
        stateManager.update((draft) => {
          draft.entries[index].imageMode = modeSelect.value;
        });
      });
      mediaWrap.appendChild(modeSelect);
    }

    const colorWrap = document.createElement("div");
    colorWrap.className = "entry-color-wrap";
    const sliceColorInput = document.createElement("input");
    sliceColorInput.type = "color";
    sliceColorInput.className = "entry-color";
    sliceColorInput.value = normalizeColor(entry.sliceColor) || "#66ccff";
    sliceColorInput.title = t("slice_color");
    sliceColorInput.disabled = spinOnly;
    sliceColorInput.addEventListener("change", () => {
      if (spinOnly) return;
      stateManager.update((draft) => {
        draft.entries[index].sliceColor = sliceColorInput.value;
      });
    });

    const textColorInput = document.createElement("input");
    textColorInput.type = "color";
    textColorInput.className = "entry-color";
    textColorInput.value = normalizeColor(entry.textColor) || "#ffffff";
    textColorInput.title = t("text_color");
    textColorInput.disabled = spinOnly;
    textColorInput.addEventListener("change", () => {
      if (spinOnly) return;
      stateManager.update((draft) => {
        draft.entries[index].textColor = textColorInput.value;
      });
    });

    const clearColor = document.createElement("button");
    clearColor.type = "button";
    clearColor.className = "entry-small-btn";
    clearColor.textContent = "↺";
    clearColor.setAttribute("aria-label", t("reset_colors"));
    clearColor.disabled = spinOnly;
    clearColor.addEventListener("click", () => {
      if (spinOnly) return;
      stateManager.update((draft) => {
        draft.entries[index].sliceColor = null;
        draft.entries[index].textColor = null;
      });
    });
    colorWrap.append(sliceColorInput, textColorInput, clearColor);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "entry-delete";
    deleteButton.textContent = "✕";
    deleteButton.setAttribute("aria-label", t("delete_entry"));
    deleteButton.addEventListener("click", () => {
      if (spinOnly) return;
      stateManager.update((draft) => {
        draft.entries.splice(index, 1);
      });
    });
    deleteButton.disabled = spinOnly;

    row.append(handle, enable, labelWrap, weightWrap, mediaWrap, colorWrap, deleteButton);
    dom.entriesList.appendChild(row);
  });

  dom.resetEliminationsButton.classList.toggle("hidden", !state.entries.some((entry) => entry.eliminated));
  dom.emptyTemplateHint.classList.toggle("hidden", state.entries.length !== 0);
}

function enableInlineEdit(labelElement, entryId) {
  const currentState = getState();
  const entry = currentState.entries.find((item) => item.id === entryId);
  if (!entry) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "entry-label-input";
  input.value = entry.label;
  labelElement.replaceWith(input);
  input.focus();
  input.select();

  const cancel = () => renderEntries(getState());
  const save = () => {
    const nextLabel = input.value.trim();
    stateManager.update((draft) => {
      const index = draft.entries.findIndex((item) => item.id === entryId);
      if (index >= 0) {
        draft.entries[index].label = nextLabel || t("untitled_entry");
      }
    });
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  });
  input.addEventListener("blur", save);
}

function renderResults(state) {
  dom.resultsList.innerHTML = "";
  if (!state.results.length) {
    const item = document.createElement("div");
    item.className = "result-item";
    item.textContent = t("no_results");
    dom.resultsList.appendChild(item);
  } else {
    state.results.forEach((result) => {
      const row = document.createElement("div");
      row.className = "result-item";
      const left = document.createElement("div");
      const seedStart = result.settingsSnapshot?.seedCursorStart;
      const activeCount = result.settingsSnapshot?.activeEntryCount;
      const auditHash = result.verificationHash || "";
      const details = [];
      if (Number.isFinite(activeCount)) {
        details.push(`${t("entries")}: ${activeCount}`);
      }
      if (seedStart !== null && seedStart !== undefined) {
        details.push(`${t("seed_cursor")}: ${seedStart}`);
      }
      if (auditHash) {
        details.push(`${t("audit_hash")}: ${auditHash}`);
      }
      const labelStrong = document.createElement("strong");
      labelStrong.textContent = result.label;
      const detailSmall = document.createElement("small");
      detailSmall.textContent = details.join(" · ");
      left.append(labelStrong, detailSmall);
      const right = document.createElement("time");
      right.textContent = formatTimestamp(result.timestamp, getCurrentLanguage());
      row.append(left, right);
      dom.resultsList.appendChild(row);
    });
  }

  dom.winCountList.innerHTML = "";
  const ranked = state.entries
    .filter((entry) => entry.winCount > 0)
    .sort((a, b) => b.winCount - a.winCount);
  if (!ranked.length) {
    const empty = document.createElement("div");
    empty.className = "result-item win-count-empty";
    empty.textContent = t("no_stats_yet");
    dom.winCountList.appendChild(empty);
    return;
  }

  ranked.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "win-count-item";
    const labelSpan = document.createElement("span");
    labelSpan.textContent = entry.label;
    const countStrong = document.createElement("strong");
    countStrong.textContent = String(entry.winCount);
    row.append(labelSpan, countStrong);
    dom.winCountList.appendChild(row);
  });
}

function renderProbability(state) {
  const entries = activeEntries(state);
  dom.probabilityList.innerHTML = "";
  if (!entries.length) {
    dom.probabilityEqualBadge.classList.add("hidden");
    return;
  }

  const weights = entries.map((entry) => state.settings.showWeights ? clamp(Number(entry.weight) || 1, 0.1, 100) : 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  entries.forEach((entry, index) => {
    const probability = (weights[index] / totalWeight) * 100;
    const row = document.createElement("div");
    row.className = "probability-item";
    const probLabel = document.createElement("span");
    probLabel.textContent = entry.label;
    const probValue = document.createElement("strong");
    probValue.textContent = `${probability.toFixed(2)}%`;
    row.append(probLabel, probValue);
    dom.probabilityList.appendChild(row);
  });

  const isEqual = hasEqualWeights(entries);
  dom.probabilityEqualBadge.classList.toggle("hidden", !(isEqual || !state.settings.showWeights));
}

function renderSettings(state) {
  dom.weightsToggle.checked = state.settings.showWeights;
  dom.manualStopToggle.checked = Boolean(state.settings.manualStop);
  dom.mysteryWheelToggle.checked = Boolean(state.settings.mysteryWheel);
  dom.durationSlider.value = String(state.settings.spinDuration);
  dom.turnsSlider.value = String(state.settings.spinTurns);
  dom.durationOutput.textContent = `${state.settings.spinDuration}s`;
  dom.turnsOutput.textContent = `${state.settings.spinTurns}`;
  dom.seedModeToggle.checked = Boolean(state.settings.seedEnabled);
  dom.seedInput.value = String(state.settings.seedValue || "");
  dom.volumeSlider.value = String(Math.round(state.audio.masterVolume * 100));
  dom.volumeOutput.textContent = `${Math.round(state.audio.masterVolume * 100)}%`;
  dom.tickSoundToggle.checked = state.audio.tickEnabled;
  dom.tickSoundSelect.value = state.audio.tickSound || "click";
  dom.winSoundToggle.checked = state.audio.winEnabled;
  dom.winSoundSelect.value = state.audio.winSound || "fanfare";
  dom.spinSoundToggle.checked = Boolean(state.audio.spinEnabled);
  dom.spinSoundSelect.value = state.audio.spinSound || "whoosh";
  dom.celebrationSelect.value = state.settings.celebrationMode || (state.settings.confettiEnabled ? "confetti" : "none");
  dom.reduceMotionOverride.checked = state.settings.reduceMotionOverride;
  dom.cinematicModeToggle.checked = Boolean(state.settings.cinematicMode);
  dom.hapticsToggle.checked = Boolean(state.settings.hapticsEnabled);
  dom.idleAnimationToggle.checked = Boolean(state.settings.idleAnimationEnabled);
  dom.performanceAutoToggle.checked = state.settings.performanceModeAuto !== false;
  dom.performanceOverviewToggle.checked = Boolean(state.settings.performanceOverview);
  dom.eventPresetSelect.value = normalizeEventPresetKey(state.theme.eventPreset);
  dom.pointerStyleSelect.value = state.theme.pointerStyle || "classic";
  dom.centerTextInput.value = resolveCenterText(state.theme);
  dom.centerColorInput.value = normalizeColor(state.theme.centerColor) || "#14325f";
  dom.backgroundTypeSelect.value = state.theme.backgroundType || "default";
  dom.backgroundSolidInput.value = normalizeColor(state.theme.backgroundSolid) || "#091126";
  dom.backgroundFromInput.value = normalizeColor(state.theme.backgroundGradientFrom) || "#091126";
  dom.backgroundToInput.value = normalizeColor(state.theme.backgroundGradientTo) || "#14335d";
  dom.backgroundAngleInput.value = String(Number(state.theme.backgroundGradientAngle) || 150);

  dom.weightedBadge.classList.toggle("hidden", !state.settings.showWeights);
  dom.seedBadge.classList.toggle("hidden", !(state.settings.seedEnabled && String(state.settings.seedValue || "").trim()));
  applyThemeSelectionUI(state.theme.preset);
}

function renderTemplates() {
  templateCache = getTemplatesForCurrentLanguage();
  dom.templateGrid.innerHTML = "";
  templateCache.forEach((template) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "template-btn";
    const preview = template.entries.slice(0, 3).join(", ");
    const tplName = document.createElement("strong");
    tplName.textContent = template.label;
    const tplPreview = document.createElement("small");
    tplPreview.textContent = preview;
    button.append(tplName, tplPreview);
    button.addEventListener("click", async () => {
      const state = getState();
      if (state.settings.spinOnly) return;
      if (state.entries.length > 0) {
        const confirmed = await requestAppConfirm({
          titleKey: "templates",
          messageKey: "template_confirm_replace",
          confirmKey: "apply",
          danger: false
        });
        if (!confirmed) return;
      }
      stateManager.update((draft) => {
        draft.entries = buildTemplateEntries(template);
        draft.theme.preset = template.theme;
      });
      closeModal();
      showToast(t("template_applied"));
    });
    dom.templateGrid.appendChild(button);
  });
}

async function openWheelRecord(record) {
  if (!record?.config) return;
  stateManager.setState(record.config, { reason: "open-wheel", skipHistory: true });
  pushRecentWheel({ id: record.id, name: record.name });
  showToast(t("wheel_loaded", { name: record.name }));
}

async function renderLibraryList() {
  const wheels = await listWheels();
  dom.libraryList.innerHTML = "";
  if (!wheels.length) {
    const empty = document.createElement("div");
    empty.className = "result-item";
    empty.textContent = t("no_saved_wheels");
    dom.libraryList.appendChild(empty);
    return;
  }

  wheels.forEach((wheel) => {
    const item = document.createElement("div");
    item.className = "library-item";
    const title = document.createElement("strong");
    title.textContent = `${wheel.pinned ? "★ " : ""}${wheel.name}`;
    const meta = document.createElement("div");
    meta.className = "library-meta";
    meta.textContent = `${wheel.entryCount || 0} ${t("entries_tab").toLowerCase()} · ${formatTimestamp(wheel.updatedAt, getCurrentLanguage())}`;

    const actions = document.createElement("div");
    actions.className = "library-actions";
    const openButton = document.createElement("button");
    openButton.className = "ghost-btn";
    openButton.type = "button";
    openButton.textContent = t("open");
    openButton.addEventListener("click", async () => {
      await openWheelRecord(wheel);
      closeModal();
    });

    const renameButton = document.createElement("button");
    renameButton.className = "ghost-btn";
    renameButton.type = "button";
    renameButton.textContent = t("rename");
    renameButton.addEventListener("click", async () => {
      const next = window.prompt(t("rename_wheel_prompt"), wheel.name);
      if (!next) return;
      await renameWheel(wheel.id, next);
      renderLibraryList();
    });

    const duplicateButton = document.createElement("button");
    duplicateButton.className = "ghost-btn";
    duplicateButton.type = "button";
    duplicateButton.textContent = t("duplicate");
    duplicateButton.addEventListener("click", async () => {
      await duplicateWheel(wheel.id);
      renderLibraryList();
    });

    const pinButton = document.createElement("button");
    pinButton.className = "ghost-btn";
    pinButton.type = "button";
    pinButton.textContent = wheel.pinned ? t("unpin") : t("pin");
    pinButton.addEventListener("click", async () => {
      await togglePinned(wheel.id, !wheel.pinned);
      renderLibraryList();
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "ghost-btn danger-btn";
    deleteButton.type = "button";
    deleteButton.textContent = t("delete");
    deleteButton.addEventListener("click", async () => {
      const confirmed = await requestAppConfirm({
        titleKey: "delete",
        messageKey: "delete_saved_wheel_confirm",
        confirmKey: "delete",
        danger: true
      });
      if (!confirmed) return;
      await deleteWheel(wheel.id);
      recentWheels = recentWheels.filter((item) => item.id !== wheel.id);
      saveRecentWheels(recentWheels);
      renderRecentWheelsSelect();
      renderLibraryList();
    });

    actions.append(openButton, renameButton, duplicateButton, pinButton, deleteButton);
    item.append(title, meta, actions);
    dom.libraryList.appendChild(item);
  });
}

async function saveCurrentWheelAs() {
  const state = getState();
  const proposed = state.title || `Wheel ${new Date().toLocaleDateString()}`;
  const name = window.prompt(t("save_wheel_prompt"), proposed);
  if (!name) return;
  const saved = await saveWheel({ name, config: state });
  pushRecentWheel({ id: saved.id, name: saved.name });
  showToast(t("wheel_saved_as", { name: saved.name }));
}

function populateCsvColumnOptions(headers) {
  const selects = [dom.csvLabelColumn, dom.csvWeightColumn, dom.csvColorColumn];
  selects.forEach((select) => {
    select.innerHTML = "";
    const none = document.createElement("option");
    none.value = "";
    none.textContent = t("none");
    select.appendChild(none);
    headers.forEach((header, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = header || `${t("column")} ${index + 1}`;
      select.appendChild(option);
    });
  });
}

function applyCsvMapping() {
  const labelCol = Number.parseInt(dom.csvLabelColumn.value, 10);
  const weightCol = Number.parseInt(dom.csvWeightColumn.value, 10);
  const colorCol = Number.parseInt(dom.csvColorColumn.value, 10);
  if (!Number.isFinite(labelCol)) {
    showToast(t("csv_label_required"));
    return;
  }

  const mapped = csvImportRows
    .map((row) => {
      const label = String(row[labelCol] || "").trim();
      if (!label) return null;
      const weight = Number.parseFloat(row[weightCol]);
      const color = normalizeColor(row[colorCol]);
      return createEntry(label, {
        weight: Number.isFinite(weight) ? clamp(weight, 0.1, 100) : 1,
        sliceColor: color || null
      });
    })
    .filter(Boolean);

  if (!mapped.length) {
    showToast(t("nothing_to_import"));
    return;
  }

  stateManager.update((draft) => {
    draft.entries.push(...mapped);
  });
  closeModal();
  showToast(t("imported_entries", { count: mapped.length }));
}

async function startCsvImportFlow(file) {
  const text = normalizeImportText(await readTextFile(file));
  await startCsvImportFlowFromText(text);
}

async function startCsvImportFlowFromText(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 1) {
    showToast(t("nothing_to_import"));
    return;
  }
  const [header, ...dataRows] = rows;
  csvImportRows = dataRows.length ? dataRows : rows;
  populateCsvColumnOptions(header);

  const lower = header.map((item) => String(item || "").toLowerCase());
  const labelIndex = lower.findIndex((item) => item.includes("label") || item.includes("name") || item.includes("entry"));
  const weightIndex = lower.findIndex((item) => item.includes("weight") || item.includes("odds"));
  const colorIndex = lower.findIndex((item) => item.includes("color") || item.includes("colour"));
  if (labelIndex >= 0) dom.csvLabelColumn.value = String(labelIndex);
  if (weightIndex >= 0) dom.csvWeightColumn.value = String(weightIndex);
  if (colorIndex >= 0) dom.csvColorColumn.value = String(colorIndex);
  openModal(dom.csvMapModal);
}

function exportEntriesCsv() {
  const state = getState();
  const csv = csvFromEntries(state.entries);
  const filename = `${sanitizeFilename(state.title || "wheel")}-entries.csv`;
  downloadFile(filename, csv, "text/csv;charset=utf-8");
  showToast(t("export_done"));
}

function exportStateJson() {
  const state = getState();
  const filename = `${sanitizeFilename(state.title || "wheel")}.json`;
  const payload = JSON.stringify(state, null, 2);
  downloadFile(filename, payload, "application/json;charset=utf-8");
  showToast(t("export_done"));
}

async function importStateJson(file) {
  const text = normalizeImportText(await readTextFile(file));
  await importStateJsonText(text);
}

function normalizeImportText(text) {
  if (text && text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

function parseWheelJsonFromText(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) {
    throw new Error("Invalid wheel JSON");
  }
  return parsed;
}

async function importStateJsonText(text) {
  const parsed = parseWheelJsonFromText(text);
  const confirmed = await requestAppConfirm({
    titleKey: "import_json",
    messageKey: "import_json_confirm",
    confirmKey: "import_json",
    danger: false
  });
  if (!confirmed) {
    return;
  }
  stateManager.setState(parsed, { reason: "json-import", skipHistory: true });
  showToast(t("import_done"));
}

async function importDataFile(file) {
  const text = normalizeImportText(await readTextFile(file));
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Empty import file");
  }

  const fileName = (file.name || "").toLowerCase();
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (looksJson || fileName.endsWith(".json")) {
    try {
      await importStateJsonText(text);
      return;
    } catch (error) {
      if (fileName.endsWith(".csv")) {
        await startCsvImportFlowFromText(text);
        return;
      }
      throw error;
    }
  }

  await startCsvImportFlowFromText(text);
}

function exportResultsCsv() {
  const state = getState();
  const csv = csvFromResults(state.results);
  const filename = `${sanitizeFilename(state.title || "wheel")}-results.csv`;
  downloadFile(filename, csv, "text/csv;charset=utf-8");
  showToast(t("export_done"));
}

function buildResultCardImageData() {
  const state = getState();
  const latest = state.results.find((item) => item.id === latestResultId) || state.results[0];
  if (!latest) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");
  const preset = THEME_PRESETS[state.theme.preset] || THEME_PRESETS.rainbow;
  const palette = state.theme.pageTheme === "light" ? preset.pageLight : preset.pageDark;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, palette.bg);
  gradient.addColorStop(1, palette.surface);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(canvas.width * 0.5, canvas.height * 0.38, 360, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 48px Plus Jakarta Sans";
  ctx.textAlign = "center";
  ctx.fillText(t("winner"), canvas.width / 2, 210);
  ctx.font = "800 106px Outfit";
  const winnerText = latest.label.length > 22 ? `${latest.label.slice(0, 22)}...` : latest.label;
  ctx.fillText(winnerText, canvas.width / 2, 430);

  ctx.font = "500 34px Plus Jakarta Sans";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(formatTimestamp(latest.timestamp, getCurrentLanguage()), canvas.width / 2, 560);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Spin the Wheel", canvas.width / 2, 1020);

  return canvas.toDataURL("image/png");
}

function downloadLatestResultImage() {
  const dataUrl = buildResultCardImageData();
  if (!dataUrl) {
    showToast(t("no_results"));
    return;
  }
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${sanitizeFilename(getState().title || "wheel")}-result.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function updateResultModal(state) {
  const winner = state.entries.find((entry) => entry.id === currentWinnerEntryId);
  if (!winner) return;

  dom.resultWinner.textContent = winner.label;
  dom.resultWinner.removeAttribute("tabindex");

  if (winner.subtitle) {
    dom.resultSubtitle.classList.remove("hidden");
    dom.resultSubtitle.textContent = winner.subtitle;
  } else {
    dom.resultSubtitle.classList.add("hidden");
    dom.resultSubtitle.textContent = "";
  }

  dom.removeWinnerButton.classList.toggle("hidden", !canRemoveWinner(state));
}

function renderAll(state) {
  renderTabs(state.ui.activeTab);
  renderEntries(state);
  renderResults(state);
  renderSettings(state);
  renderProbability(state);
  updateThemeVars(state.theme);
  wheelEngine.setWheelState({ entries: state.entries, settings: state.settings, theme: state.theme });
  const spinLabel = state.settings.manualStop && manualSpinPending && wheelEngine.isSpinning()
    ? t("stop_button")
    : resolveCenterText(state.theme);
  dom.centerSpinButton.textContent = spinLabel;
  dom.floatingSpinButton.textContent = spinLabel;
  dom.firstRunHint.classList.toggle("hidden", state.ui.firstRunHintDismissed || !!safeLocalStorageGet(STORAGE_KEYS.firstRunHintDismissed));
  const history = stateManager.getHistoryInfo();
  if (dom.undoButton) {
    dom.undoButton.disabled = state.settings.spinOnly || !history.canUndo;
  }
  if (dom.redoButton) {
    dom.redoButton.disabled = state.settings.spinOnly || !history.canRedo;
  }
  applySpinOnlyState(state);
  updateResultModal(state);
}

function applySpinOnlyState(state) {
  if (!spinOnlyControlElements) {
    const selectors = [
      "#addEntryInput",
      "#addEntryButton",
      "#undoButton",
      "#redoButton",
      "#saveAsButton",
      "#openLibraryButton",
      "#recentWheelsSelect",
      "#shuffleEntriesButton",
      "#sortEntriesButton",
      "#clearEntriesButton",
      "#pasteListButton",
      "#importDataButton",
      "#exportDataButton",
      "#templateButton",
      "#resetEliminationsButton",
      "#weightsToggle",
      "#manualStopToggle",
      "#mysteryWheelToggle",
      "#durationSlider",
      "#turnsSlider",
      "#themeSelect",
      "#eventPresetSelect",
      "#pointerStyleSelect",
      "#centerTextInput",
      "#centerColorInput",
      "#centerImageButton",
      "#removeCenterImageButton",
      "#backgroundTypeSelect",
      "#backgroundSolidInput",
      "#backgroundFromInput",
      "#backgroundToInput",
      "#backgroundAngleInput",
      "#backgroundImageButton",
      "#removeBackgroundImageButton",
      "#volumeSlider",
      "#tickSoundToggle",
      "#tickSoundSelect",
      "#winSoundToggle",
      "#winSoundSelect",
      "#spinSoundToggle",
      "#spinSoundSelect",
      "#celebrationSelect",
      "#reduceMotionOverride",
      "#cinematicModeToggle",
      "#hapticsToggle",
      "#idleAnimationToggle",
      "#performanceAutoToggle",
      "#performanceOverviewToggle",
      "#seedModeToggle",
      "#seedInput",
      "#exportResultsCsvButton",
      "#exportAuditJsonButton",
      "#factoryResetButton"
    ];
    spinOnlyControlElements = selectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);
  }

  const spinOnly = Boolean(state.settings.spinOnly);
  spinOnlyControlElements.forEach((element) => {
    element.toggleAttribute("disabled", spinOnly);
  });
}

function addEntryFromInput() {
  if (getState().settings.spinOnly) return;
  const label = dom.addEntryInput.value.trim();
  if (!label) return;
  stateManager.update((draft) => {
    draft.entries.push(createEntry(label));
  });
  dom.addEntryInput.value = "";
}

function parseAndApplyBulkPaste() {
  if (getState().settings.spinOnly) return;
  const parsed = parseBulkEntries(dom.pasteTextarea.value);
  if (!parsed.length) {
    showToast(t("nothing_to_import"));
    return;
  }

  const state = getState();
  const existingLabels = new Set(state.entries.map((entry) => entry.label.toLowerCase()));
  const duplicates = parsed.filter((item) => existingLabels.has(item.label.toLowerCase()));

  stateManager.update((draft) => {
    parsed.forEach((item) => {
      draft.entries.push(createEntry(item.label, {
        weight: item.weight ?? 1,
        sliceColor: item.sliceColor ?? null
      }));
    });
  });

  if (duplicates.length) {
    showToast(t("duplicates_warning", { count: duplicates.length }));
  } else {
    showToast(t("imported_entries", { count: parsed.length }));
  }

  closeModal();
  dom.pasteTextarea.value = "";
}

function prepareSpinOutcome(state, { engine = wheelEngine, settingsOverride = null } = {}) {
  const settings = settingsOverride || state.settings;
  const segments = engine.getSegments();
  if (!segments.length) return null;

  const randomStream = createRandomStream(settings);
  let pickedIndex = 0;
  let randomValue = 0;
  let totalWeight = 0;
  if (settings.showWeights) {
    const weights = segments.map((segment) => clamp(Number(segment.entry.weight) || 1, 0.1, 100));
    totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const draw = randomStream.next();
    randomValue = draw.value * totalWeight;
    let cumulative = 0;
    for (let i = 0; i < weights.length; i += 1) {
      cumulative += weights[i];
      if (randomValue <= cumulative) {
        pickedIndex = i;
        break;
      }
    }
  } else {
    randomValue = randomStream.next().value;
    pickedIndex = Math.floor(randomValue * segments.length);
  }

  const winnerSegment = segments[pickedIndex];
  const offset = (randomStream.next().value - 0.5) * (winnerSegment.end - winnerSegment.start) * 0.65;
  const finalNormalized = engine.computeTargetRotationForSegment(pickedIndex) - offset;
  const currentRotation = engine.getRotation();
  const currentNormalized = ((currentRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  let delta = finalNormalized - currentNormalized;
  while (delta <= 0) delta += Math.PI * 2;
  const absoluteTargetRotation = currentRotation + delta + (Math.PI * 2 * settings.spinTurns);

  return {
    pickedIndex,
    winnerSegment,
    absoluteTargetRotation,
    randomValue,
    totalWeight,
    randomMeta: {
      seeded: randomStream.seeded,
      seedValue: randomStream.seedText,
      draws: randomStream.draws,
      nextCursor: randomStream.getCursor()
    },
    nextSeedCursor: randomStream.getCursor()
  };
}

function getCelebrationEffect(state) {
  const legacyConfetti = state.settings.confettiEnabled !== false;
  return state.settings.celebrationMode || (legacyConfetti ? "confetti" : "none");
}

function getCelebrationColors(state) {
  return THEME_PRESETS[state.theme.preset]?.colors?.filter(Boolean) || ["#4ae4ff", "#ffd166", "#ff4d8d", "#7df7c7"];
}

function pickCelebrationColor(colors) {
  return colors[Math.floor(Math.random() * colors.length)] || "#4ae4ff";
}

function resizeCelebrationCanvas(celebration) {
  const width = Math.max(window.innerWidth || 0, 1);
  const height = Math.max(window.innerHeight || 0, 1);
  const dpr = window.devicePixelRatio || 1;

  celebration.width = width;
  celebration.height = height;
  celebration.canvas.width = Math.max(1, Math.round(width * dpr));
  celebration.canvas.height = Math.max(1, Math.round(height * dpr));
  celebration.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (celebration.type === "confetti") {
    celebration.targetCount = Math.max(150, Math.min(320, Math.round((width * height) / 5400)));
  }
}

function createConfettiParticle(celebration, mode = "rain") {
  const burst = mode === "burst";
  const burstAngle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 0.95;
  const burstSpeed = 4.8 + Math.random() * 7.5;

  return {
    x: burst
      ? celebration.width * 0.5 + (Math.random() - 0.5) * celebration.width * 0.24
      : Math.random() * celebration.width,
    y: burst
      ? celebration.height * 0.48 + (Math.random() - 0.5) * celebration.height * 0.18
      : -Math.random() * celebration.height * 0.35,
    vx: burst
      ? Math.cos(burstAngle) * burstSpeed
      : (Math.random() - 0.5) * 1.5,
    vy: burst
      ? Math.sin(burstAngle) * burstSpeed - 0.4
      : 1.6 + Math.random() * 2.8,
    size: 6 + Math.random() * 10,
    stretch: 0.72 + Math.random() * 0.95,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.24,
    flip: Math.random() * Math.PI * 2,
    flipSpeed: 0.12 + Math.random() * 0.24,
    alpha: 0.72 + Math.random() * 0.28,
    color: pickCelebrationColor(celebration.colors)
  };
}

function createFireworkRocket(celebration) {
  return {
    x: celebration.width * (0.15 + Math.random() * 0.7),
    y: celebration.height + 40,
    targetY: celebration.height * (0.16 + Math.random() * 0.24),
    vy: 6.6 + Math.random() * 2.3,
    trail: 16 + Math.random() * 10,
    color: pickCelebrationColor(celebration.colors)
  };
}

function explodeFireworkRocket(celebration, rocket) {
  const particleCount = 42 + Math.floor(Math.random() * 18);
  for (let index = 0; index < particleCount; index += 1) {
    const angle = (index / particleCount) * Math.PI * 2 + Math.random() * 0.2;
    const speed = 1.8 + Math.random() * 4.8;
    celebration.sparks.push({
      x: rocket.x,
      y: rocket.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8 + Math.random() * 0.4,
      decay: 0.015 + Math.random() * 0.01,
      size: 1.8 + Math.random() * 2.4,
      color: Math.random() > 0.28 ? rocket.color : pickCelebrationColor(celebration.colors)
    });
  }
}

function stepConfettiCelebration(celebration, dt, timestamp) {
  const ctx = celebration.ctx;
  const { width, height } = celebration;

  while (celebration.particles.length < celebration.targetCount) {
    celebration.particles.push(createConfettiParticle(celebration, "rain"));
  }

  const wind = Math.sin(timestamp / 900) * 0.22;
  ctx.clearRect(0, 0, width, height);

  celebration.particles.forEach((particle, index) => {
    particle.vx += wind * 0.08 * dt;
    particle.vy = Math.min(particle.vy + 0.11 * dt, 8.5);
    particle.x += particle.vx * dt * 2.2;
    particle.y += particle.vy * dt * 2.2;
    particle.rotation += particle.rotationSpeed * dt;
    particle.flip += particle.flipSpeed * dt;

    if (particle.y > height + 80 || particle.x < -100 || particle.x > width + 100) {
      celebration.particles[index] = createConfettiParticle(celebration, "rain");
      return;
    }

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.scale(Math.cos(particle.flip), 1);
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(
      -particle.size / 2,
      -(particle.size * particle.stretch) / 2,
      particle.size,
      particle.size * particle.stretch
    );
    ctx.restore();
  });
}

function stepFireworksCelebration(celebration, dt, timestamp) {
  const ctx = celebration.ctx;
  const { width, height } = celebration;

  if (timestamp >= celebration.nextRocketAt) {
    const rocketCount = Math.random() > 0.72 ? 2 : 1;
    for (let index = 0; index < rocketCount; index += 1) {
      celebration.rockets.push(createFireworkRocket(celebration));
    }
    celebration.nextRocketAt = timestamp + 180 + Math.random() * 240;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  celebration.rockets = celebration.rockets.filter((rocket) => {
    rocket.y -= rocket.vy * dt * 2.3;
    ctx.strokeStyle = `${rocket.color}cc`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(rocket.x, rocket.y + rocket.trail);
    ctx.lineTo(rocket.x, rocket.y);
    ctx.stroke();

    if (rocket.y <= rocket.targetY) {
      explodeFireworkRocket(celebration, rocket);
      return false;
    }
    return true;
  });

  celebration.sparks = celebration.sparks.filter((spark) => {
    spark.vx *= 0.992;
    spark.vy += 0.055 * dt;
    spark.x += spark.vx * dt * 2.2;
    spark.y += spark.vy * dt * 2.2;
    spark.life -= spark.decay * dt * 1.8;

    if (spark.life <= 0) {
      return false;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, spark.life);
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return true;
  });

  ctx.restore();
}

function animateCelebrationFrame(timestamp) {
  if (!activeCelebration) return;
  const celebration = activeCelebration;
  const dt = celebration.lastFrame
    ? Math.min(2.4, (timestamp - celebration.lastFrame) / 16.6667)
    : 1;

  celebration.lastFrame = timestamp;

  if (celebration.type === "fireworks") {
    stepFireworksCelebration(celebration, dt, timestamp);
  } else {
    stepConfettiCelebration(celebration, dt, timestamp);
  }

  celebration.frameId = window.requestAnimationFrame(animateCelebrationFrame);
}

function stopCelebration() {
  if (!activeCelebration) return;
  const celebration = activeCelebration;
  activeCelebration = null;

  if (celebration.frameId) {
    window.cancelAnimationFrame(celebration.frameId);
  }

  window.removeEventListener("resize", celebration.resizeHandler);
  celebration.canvas.classList.remove("is-active");
  celebration.ctx.clearRect(0, 0, celebration.width, celebration.height);
}

function startCelebration(state) {
  const effect = getCelebrationEffect(state);
  stopCelebration();

  if (effect === "none" || reducedMotionEnabled(state)) return;

  const canvas = dom.confettiCanvas;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const celebration = {
    type: effect,
    canvas,
    ctx,
    colors: getCelebrationColors(state),
    width: 0,
    height: 0,
    frameId: 0,
    lastFrame: 0,
    targetCount: 0,
    particles: [],
    rockets: [],
    sparks: [],
    nextRocketAt: performance.now(),
    resizeHandler: null
  };

  celebration.resizeHandler = () => resizeCelebrationCanvas(celebration);
  activeCelebration = celebration;
  resizeCelebrationCanvas(celebration);
  celebration.canvas.classList.add("is-active");

  if (effect === "confetti") {
    const burstCount = Math.round(celebration.targetCount * 0.46);
    celebration.particles = Array.from({ length: celebration.targetCount }, (_, index) => (
      createConfettiParticle(celebration, index < burstCount ? "burst" : "rain")
    ));
  }

  window.addEventListener("resize", celebration.resizeHandler);
  celebration.frameId = window.requestAnimationFrame(animateCelebrationFrame);
}

function scheduleResultModal(state, resultId) {
  clearPendingResultModal();
  if (latestResultId !== resultId) return;
  if (activeModal && activeModal !== dom.resultModal) return;
  openModal(dom.resultModal);
  startCelebration(state);
}

function finalizeSpinResult({ winnerEntry, randomValue, totalWeight, randomMeta = null }) {
  wheelEngine.holdStillAfterResult();
  const now = Date.now();
  const state = getState();
  stateManager.update((draft) => {
    const activeEntriesList = draft.entries
      .filter((entry) => entry.enabled && !entry.eliminated)
      .map((entry) => entry.label);
    const settingsSnapshot = {
      mode: draft.settings.mode,
      showWeights: draft.settings.showWeights,
      manualStop: draft.settings.manualStop,
      entryCount: draft.entries.length,
      activeEntryCount: draft.entries.filter((entry) => entry.enabled && !entry.eliminated).length,
      spinDuration: draft.settings.spinDuration,
      spinTurns: draft.settings.spinTurns,
      celebrationMode: draft.settings.celebrationMode || (draft.settings.confettiEnabled ? "confetti" : "none"),
      cinematicMode: Boolean(draft.settings.cinematicMode),
      seedEnabled: Boolean(draft.settings.seedEnabled && String(draft.settings.seedValue || "").trim()),
      seedValue: draft.settings.seedEnabled ? String(draft.settings.seedValue || "") : "",
      seedCursorStart: randomMeta?.draws?.[0]?.cursor ?? null,
      randomDrawCount: Array.isArray(randomMeta?.draws) ? randomMeta.draws.length : 0,
      activeEntriesList
    };
    const verificationSource = JSON.stringify({
      now,
      entryId: winnerEntry.id,
      randomValue,
      totalWeight,
      settingsSnapshot
    });
    const verificationHash = hashString(verificationSource).toString(16).padStart(8, "0");
    const resultId = `${now}-${winnerEntry.id}`;
    draft.results.unshift({
      id: resultId,
      entryId: winnerEntry.id,
      label: winnerEntry.label,
      timestamp: now,
      mode: draft.settings.mode,
      randomValue,
      totalWeight,
      randomMeta,
      verificationHash,
      settingsSnapshot
    });
    draft.results = draft.results.slice(0, 300);
    latestResultId = resultId;

    if (randomMeta?.seeded) {
      draft.settings.seedCursor = Math.max(Number(draft.settings.seedCursor) || 0, Number(randomMeta.nextCursor) || 0);
    }

    const entry = draft.entries.find((item) => item.id === winnerEntry.id);
    if (entry) {
      entry.winCount += 1;
    }
    draft.ui.firstRunHintDismissed = true;
  });

  currentWinnerEntryId = winnerEntry.id;
  const stateAfterUpdate = getState();
  updateResultModal(stateAfterUpdate);
  if (dom.ariaLive) {
    dom.ariaLive.textContent = t("winner_announcement", { name: winnerEntry.label });
  }
  scheduleResultModal(stateAfterUpdate, latestResultId);
  if (stateAfterUpdate.audio.winEnabled) {
    audioEngine.playWinVariant(stateAfterUpdate.audio.winSound || "fanfare");
  }
  triggerHaptic("result", stateAfterUpdate.settings);
  safeLocalStorageSet(STORAGE_KEYS.firstRunHintDismissed, "1");
}

function startManualSpinFlow(state, prepared) {
  if (state.settings.cinematicMode) {
    document.body.classList.add("cinematic-active");
  }
  manualSpinPending = {
    winnerEntry: prepared.winnerSegment.entry,
    absoluteTargetRotation: prepared.absoluteTargetRotation,
    randomValue: prepared.randomValue,
    totalWeight: prepared.totalWeight,
    randomMeta: prepared.randomMeta
  };
  triggerHaptic("start", state.settings);
  if (state.audio.spinEnabled) {
    audioEngine.startSpinAmbient(state.audio.spinSound || "whoosh");
  }
  wheelEngine.startManualSpin({
    onTick: (segmentIndex, velocity) => {
      const liveState = getState();
      if (liveState.audio.tickEnabled) {
        audioEngine.playTickVariant(liveState.audio.tickSound || "click", velocity);
      }
      triggerTickHaptic(liveState.settings);
      if (segmentIndex >= 0) {
        // Reserved for future per-segment visuals.
      }
    }
  });
}

function stopManualSpinFlow(state) {
  if (!manualSpinPending) return;
  const pending = manualSpinPending;
  manualSpinPending = null;
  const durationMs = state.settings.cinematicMode
    ? Math.max(1800, state.settings.spinDuration * 780)
    : Math.max(850, state.settings.spinDuration * 600);
  wheelEngine.decelerateTo({
    absoluteTargetRotation: pending.absoluteTargetRotation,
    durationMs,
    pauseAtEndMs: state.settings.cinematicMode ? 620 : 0,
    reducedMotion: reducedMotionEnabled(state),
    onTick: (segmentIndex, velocity) => {
      const liveState = getState();
      if (liveState.audio.tickEnabled) {
        audioEngine.playTickVariant(liveState.audio.tickSound || "click", velocity);
      }
      triggerTickHaptic(liveState.settings);
      if (segmentIndex >= 0) {
        // Reserved for future per-segment visuals.
      }
    },
    onResult: () => {
      audioEngine.stopSpinAmbient();
      document.body.classList.remove("cinematic-active");
      finalizeSpinResult({
        winnerEntry: pending.winnerEntry,
        randomValue: pending.randomValue,
        totalWeight: pending.totalWeight,
        randomMeta: pending.randomMeta
      });
    }
  });
}

function performSpin() {
  clearPendingResultModal();
  const state = getState();
  if (state.settings.manualStop && manualSpinPending && wheelEngine.isSpinning()) {
    stopManualSpinFlow(state);
    return;
  }
  if (wheelEngine.isSpinning()) return;
  if (activeEntries(state).length < 2) {
    showToast(t("need_two_entries"));
    return;
  }

  audioEngine.ensureReady();
  const prepared = prepareSpinOutcome(state);
  if (!prepared) return;
  const { winnerSegment, absoluteTargetRotation, randomValue, totalWeight } = prepared;
  const winnerEntry = winnerSegment.entry;
  const spinDurationMs = state.settings.cinematicMode
    ? state.settings.spinDuration * 1500
    : state.settings.spinDuration * 1000;

  if (state.settings.manualStop) {
    startManualSpinFlow(state, prepared);
    return;
  }

  if (state.settings.cinematicMode) {
    document.body.classList.add("cinematic-active");
  }
  triggerHaptic("start", state.settings);
  if (state.audio.spinEnabled) {
    audioEngine.startSpinAmbient(state.audio.spinSound || "whoosh");
  }

  wheelEngine.spinTo({
    absoluteTargetRotation,
    durationMs: spinDurationMs,
    pauseAtEndMs: state.settings.cinematicMode ? 620 : 0,
    reducedMotion: reducedMotionEnabled(state),
    onTick: (segmentIndex, velocity) => {
      const liveState = getState();
      if (liveState.audio.tickEnabled) {
        audioEngine.playTickVariant(liveState.audio.tickSound || "click", velocity);
      }
      triggerTickHaptic(liveState.settings);
      if (segmentIndex >= 0) {
        // Segment ticks can be used for lightweight per-segment feedback later.
      }
    },
    onResult: () => {
      audioEngine.stopSpinAmbient();
      document.body.classList.remove("cinematic-active");
      finalizeSpinResult({ winnerEntry, randomValue, totalWeight, randomMeta: prepared.randomMeta });
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function exportAuditLogJson() {
  const state = getState();
  if (!state.results.length) {
    showToast(t("no_results"));
    return;
  }
  const audit = {
    exportedAt: new Date().toISOString(),
    schemaVersion: state.schemaVersion,
    app: "wheel-spinner",
    resultCount: state.results.length,
    results: state.results.map((result) => ({
      id: result.id,
      timestamp: result.timestamp,
      label: result.label,
      mode: result.mode,
      randomValue: result.randomValue,
      totalWeight: result.totalWeight,
      randomMeta: result.randomMeta || null,
      settingsSnapshot: result.settingsSnapshot || {},
      verificationHash: result.verificationHash || null
    }))
  };
  audit.verificationChecksum = hashString(JSON.stringify(audit.results)).toString(16).padStart(8, "0");
  const filename = `${sanitizeFilename(state.title || "wheel")}-audit-log.json`;
  downloadFile(filename, JSON.stringify(audit, null, 2), "application/json;charset=utf-8");
  showToast(t("export_done"));
}

function printResultsView() {
  const state = getState();
  if (!state.results.length) {
    showToast(t("no_results"));
    return;
  }

  const rows = state.results.map((result) => {
    const snapshot = escapeHtml(JSON.stringify(result.settingsSnapshot || {}));
    return `<tr><td>${escapeHtml(formatTimestamp(result.timestamp, getCurrentLanguage()))}</td><td>${escapeHtml(result.label)}</td><td>${escapeHtml(result.verificationHash || "")}</td><td class="snapshot">${snapshot}</td></tr>`;
  }).join("");

  const popup = window.open("", "_blank", "noopener,noreferrer,width=1080,height=820");
  if (!popup) {
    showToast(t("print_popup_blocked"));
    return;
  }

  popup.document.write(`<!doctype html>
<html lang="${escapeHtml(getCurrentLanguage())}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(t("print_results"))}</title>
  <style>
    body { font-family: "Plus Jakarta Sans", Arial, sans-serif; margin: 1.25rem; color: #12203d; }
    h1 { margin: 0 0 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { border: 1px solid #d2ddee; padding: 0.5rem; text-align: left; vertical-align: top; }
    .snapshot { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.76rem; white-space: pre-wrap; }
    @media print {
      body { margin: 0.4in; }
      .print-actions { display: none; }
      table { font-size: 0.75rem; }
    }
  </style>
</head>
<body>
  <div class="print-actions"><button onclick="window.print()">${escapeHtml(t("print_results"))}</button></div>
  <h1>${escapeHtml(t("print_results"))}</h1>
  <table>
    <thead>
      <tr><th>${escapeHtml(t("timestamp"))}</th><th>${escapeHtml(t("winner"))}</th><th>${escapeHtml(t("audit_hash"))}</th><th>${escapeHtml(t("settings"))}</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`);
  popup.document.close();
  popup.focus();
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }
  document.documentElement.requestFullscreen?.();
}

function updateFullscreenState() {
  document.body.classList.toggle("fullscreen-active", Boolean(document.fullscreenElement));
}

function refreshShareUrl() {
  const state = getState();
  const mode = dom.shareModal.querySelector("input[name='shareMode']:checked")?.value;
  const encoded = encodeWheelConfig(state, { spinOnly: mode === "spin-only" });
  const url = buildShareUrl(encoded);
  dom.shareUrlInput.value = url;
  updateEmbedCode(url);
  renderPseudoQr(url);

  const size = estimateShareSize(url);
  const sizeKb = (size / 1024).toFixed(2);
  dom.shareSizeStatus.className = "size-status";
  if (size < 2048) {
    dom.shareSizeStatus.classList.add("good");
    dom.shareSizeStatus.textContent = t("share_size_good", { size: sizeKb });
  } else if (size <= 6144) {
    dom.shareSizeStatus.classList.add("warn");
    dom.shareSizeStatus.textContent = t("share_size_warn", { size: sizeKb });
  } else {
    dom.shareSizeStatus.classList.add("bad");
    dom.shareSizeStatus.textContent = t("share_size_bad", { size: sizeKb });
  }
}

function setupFloatingSpinObserver() {
  if (!("IntersectionObserver" in window) || !dom.wheelContainer || !dom.floatingSpinButton) return;
  if (floatingSpinObserver) {
    floatingSpinObserver.disconnect();
  }
  floatingSpinObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (window.innerWidth > 767 || document.fullscreenElement) {
        dom.floatingSpinButton.classList.add("hidden");
        return;
      }
      dom.floatingSpinButton.classList.toggle("hidden", entry.isIntersecting);
    });
  }, { threshold: 0.6 });
  floatingSpinObserver.observe(dom.wheelContainer);
}

function cleanupRuntimeResources() {
  clearPendingResultModal();
  if (floatingSpinObserver) {
    floatingSpinObserver.disconnect();
    floatingSpinObserver = null;
  }
  audioEngine.stopSpinAmbient();
  wheelEngine.destroy();
}

async function performFactoryReset() {
  if (getState().settings.spinOnly) return;
  if (dom.factoryResetButton) dom.factoryResetButton.disabled = true;

  try {
    await clearLibrary();
  } catch {
    // Best effort only. Continue resetting other local data.
  }

  Object.values(STORAGE_KEYS).forEach((key) => {
    safeLocalStorageRemove(key);
  });

  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.location.replace(cleanUrl);
}

function bindEvents() {
  dom.languageButton.addEventListener("click", () => {
    const isOpen = !dom.languageMenu.classList.contains("hidden");
    dom.languageMenu.classList.toggle("hidden", isOpen);
    dom.languageButton.setAttribute("aria-expanded", String(!isOpen));
  });

  dom.settingsButton?.addEventListener("click", () => {
    openSettingsModal("general");
  });

  dom.settingsTabs.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.settingsTab;
      if (!tab) return;
      renderSettingsModalTabs(tab);
    });
  });

  dom.closeSettingsButton?.addEventListener("click", closeModal);

  document.addEventListener("click", (event) => {
    if (!dom.languageButton.contains(event.target) && !dom.languageMenu.contains(event.target)) {
      dom.languageMenu.classList.add("hidden");
      dom.languageButton.setAttribute("aria-expanded", "false");
    }
  });

  dom.modalRoot.addEventListener("click", (event) => {
    if (!activeModal) return;
    if (event.target === activeModal) {
      closeModal();
    }
  });

  dom.centerSpinButton.addEventListener("pointerdown", () => dom.centerSpinButton.classList.add("is-pressed"));
  dom.centerSpinButton.addEventListener("pointerup", () => dom.centerSpinButton.classList.remove("is-pressed"));
  dom.centerSpinButton.addEventListener("pointerleave", () => dom.centerSpinButton.classList.remove("is-pressed"));
  const suppressSpinButtonKeyboard = (event) => {
    const isPlainEnterOrSpace = (event.key === "Enter" || event.key === " ")
      && !event.ctrlKey
      && !event.metaKey
      && !event.altKey;
    if (!isPlainEnterOrSpace) return;
    event.preventDefault();
  };
  dom.centerSpinButton.addEventListener("keydown", suppressSpinButtonKeyboard);
  dom.floatingSpinButton.addEventListener("keydown", suppressSpinButtonKeyboard);
  dom.centerSpinButton.addEventListener("click", performSpin);
  dom.floatingSpinButton.addEventListener("click", performSpin);
  dom.wheelCanvas.addEventListener("click", () => performSpin());

  dom.undoButton?.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    stateManager.undo();
  });
  dom.redoButton?.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    stateManager.redo();
  });

  dom.addEntryButton.addEventListener("click", addEntryFromInput);
  dom.addEntryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addEntryFromInput();
    }
  });

  dom.shuffleEntriesButton.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.entries = shuffleArray(draft.entries);
    }, { reason: "entry-shuffle" });
  });

  dom.sortEntriesButton.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.entries = sortEntriesAZ(draft.entries);
    }, { reason: "entry-sort" });
  });

  dom.clearEntriesButton.addEventListener("click", async () => {
    if (getState().settings.spinOnly) return;
    const confirmed = await requestAppConfirm({
      titleKey: "clear_all",
      messageKey: "clear_all_confirm",
      confirmKey: "clear_all",
      danger: true
    });
    if (!confirmed) return;
    stateManager.update((draft) => {
      draft.entries = [];
    }, { reason: "entry-clear" });
  });

  dom.pasteListButton.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    openModal(dom.pasteModal);
  });
  dom.pasteCancelButton.addEventListener("click", closeModal);
  dom.pasteApplyButton.addEventListener("click", parseAndApplyBulkPaste);

  dom.templateButton.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    openModal(dom.templateModal);
  });
  dom.emptyTemplateButton.addEventListener("click", () => openModal(dom.templateModal));
  dom.closeTemplateButton.addEventListener("click", closeModal);

  dom.importDataButton.addEventListener("click", () => dom.importDataFileInput.click());
  dom.exportDataButton.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    const csvOption = dom.exportModal.querySelector("input[name='exportFormat'][value='csv']");
    if (csvOption instanceof HTMLInputElement) {
      csvOption.checked = true;
    }
    openModal(dom.exportModal);
  });
  dom.exportCancelButton.addEventListener("click", closeModal);
  dom.exportApplyButton.addEventListener("click", () => {
    const selected = dom.exportModal.querySelector("input[name='exportFormat']:checked");
    const format = selected instanceof HTMLInputElement ? selected.value : "csv";
    if (format === "json") {
      exportStateJson();
    } else {
      exportEntriesCsv();
    }
    closeModal();
  });
  dom.csvMapCancelButton.addEventListener("click", closeModal);
  dom.csvMapApplyButton.addEventListener("click", applyCsvMapping);
  dom.importDataFileInput.addEventListener("change", async () => {
    const file = dom.importDataFileInput.files?.[0];
    if (!file) return;
    try {
      await importDataFile(file);
    } catch {
      showToast(t("import_failed"));
    } finally {
      dom.importDataFileInput.value = "";
    }
  });

  const openLibrary = async () => {
    try {
      await renderLibraryList();
      openModal(dom.libraryModal);
    } catch {
      showToast(t("library_unavailable"));
    }
  };

  dom.saveAsButton.addEventListener("click", async () => {
    if (getState().settings.spinOnly) return;
    try {
      await saveCurrentWheelAs();
    } catch {
      showToast(t("library_unavailable"));
    }
  });
  dom.openLibraryButton?.addEventListener("click", openLibrary);
  dom.libraryButton.addEventListener("click", openLibrary);
  dom.closeLibraryButton.addEventListener("click", closeModal);
  dom.recentWheelsSelect?.addEventListener("change", async (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    const id = select.value;
    if (!id) return;
    let wheel = null;
    try {
      wheel = await getWheel(id);
    } catch {
      showToast(t("library_unavailable"));
      return;
    }
    if (!wheel) {
      showToast(t("wheel_not_found"));
      return;
    }
    await openWheelRecord(wheel);
    select.value = "";
  });

  dom.resetEliminationsButton.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.entries.forEach((entry) => {
        entry.eliminated = false;
      });
    }, { reason: "entry-reset-elimination" });
  });

  dom.clearResultsButton.addEventListener("click", async () => {
    if (getState().settings.spinOnly) return;
    const confirmed = await requestAppConfirm({
      titleKey: "clear_results",
      messageKey: "clear_results_confirm",
      confirmKey: "clear_results",
      danger: true
    });
    if (!confirmed) return;
    stateManager.update((draft) => {
      draft.results = [];
      draft.entries.forEach((entry) => {
        entry.winCount = 0;
      });
    }, { reason: "results-clear" });
  });

  dom.historyButton.addEventListener("click", () => openModal(dom.historyModal));
  dom.closeHistoryButton.addEventListener("click", closeModal);
  dom.exportResultsCsvButton.addEventListener("click", exportResultsCsv);
  dom.exportAuditJsonButton.addEventListener("click", exportAuditLogJson);

  dom.factoryResetButton?.addEventListener("click", async () => {
    if (getState().settings.spinOnly) return;
    const confirmed = await requestAppConfirm({
      titleKey: "reset_app",
      messageKey: "reset_app_confirm",
      confirmKey: "reset_app_action",
      danger: true
    });
    if (!confirmed) return;
    performFactoryReset();
  });
  dom.factoryResetCancelButton?.addEventListener("click", () => resolveAppConfirm(false));
  dom.factoryResetConfirmButton?.addEventListener("click", () => resolveAppConfirm(true));

  dom.weightsToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.showWeights = dom.weightsToggle.checked;
    }, { reason: "weights-toggle" });
  });

  dom.manualStopToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    const disableManual = !dom.manualStopToggle.checked;
    stateManager.update((draft) => {
      draft.settings.manualStop = dom.manualStopToggle.checked;
    }, { reason: "manual-stop-toggle" });
    if (disableManual && manualSpinPending && wheelEngine.isSpinning()) {
      stopManualSpinFlow(getState());
    }
  });

  dom.mysteryWheelToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.mysteryWheel = dom.mysteryWheelToggle.checked;
    }, { reason: "mystery-wheel-toggle" });
  });

  dom.durationSlider.addEventListener("input", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.spinDuration = Number.parseInt(dom.durationSlider.value, 10);
    }, { reason: "spin-duration", skipHistory: true });
  });
  dom.durationSlider.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.spinDuration = Number.parseInt(dom.durationSlider.value, 10);
    }, { reason: "spin-duration" });
  });

  dom.turnsSlider.addEventListener("input", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.spinTurns = Number.parseInt(dom.turnsSlider.value, 10);
    }, { reason: "spin-turns", skipHistory: true });
  });
  dom.turnsSlider.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.spinTurns = Number.parseInt(dom.turnsSlider.value, 10);
    }, { reason: "spin-turns" });
  });

  dom.seedModeToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.seedEnabled = dom.seedModeToggle.checked;
      if (!draft.settings.seedEnabled) {
        draft.settings.seedCursor = 0;
      }
    }, { reason: "seed-toggle" });
  });

  dom.seedInput.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      const value = String(dom.seedInput.value || "").trim();
      const changed = value !== String(draft.settings.seedValue || "");
      draft.settings.seedValue = value;
      if (changed) {
        draft.settings.seedCursor = 0;
      }
    }, { reason: "seed-value" });
  });

  dom.themeSelect.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.preset = dom.themeSelect.value;
      draft.theme.eventPreset = "default";
    }, { reason: "theme-change" });
  });

  dom.eventPresetSelect.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    applyEventPreset(dom.eventPresetSelect.value);
  });

  dom.pointerStyleSelect.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.pointerStyle = dom.pointerStyleSelect.value;
    }, { reason: "pointer-style" });
  });

  dom.centerTextInput.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.centerText = dom.centerTextInput.value.trim() || getAutoCenterTextValueForPreset(draft.theme.eventPreset);
    }, { reason: "center-text" });
  });

  dom.centerColorInput.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.centerColor = dom.centerColorInput.value;
    }, { reason: "center-color" });
  });

  dom.centerImageButton.addEventListener("click", () => dom.centerImageInput.click());
  dom.removeCenterImageButton.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.centerImage = null;
    }, { reason: "center-image-remove" });
  });
  dom.centerImageInput.addEventListener("change", async () => {
    const file = dom.centerImageInput.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 110000, 520);
      stateManager.update((draft) => {
        draft.theme.centerImage = compressed;
      }, { reason: "center-image" });
    } catch {
      showToast(t("image_upload_failed"));
    } finally {
      dom.centerImageInput.value = "";
    }
  });

  dom.backgroundTypeSelect.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.backgroundType = dom.backgroundTypeSelect.value;
    }, { reason: "background-type" });
  });
  dom.backgroundSolidInput.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.backgroundSolid = dom.backgroundSolidInput.value;
      draft.theme.backgroundType = "solid";
    }, { reason: "background-solid" });
  });
  dom.backgroundFromInput.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.backgroundGradientFrom = dom.backgroundFromInput.value;
      draft.theme.backgroundType = "gradient";
    }, { reason: "background-gradient-from" });
  });
  dom.backgroundToInput.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.backgroundGradientTo = dom.backgroundToInput.value;
      draft.theme.backgroundType = "gradient";
    }, { reason: "background-gradient-to" });
  });
  dom.backgroundAngleInput.addEventListener("input", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.backgroundGradientAngle = Number.parseInt(dom.backgroundAngleInput.value, 10);
      draft.theme.backgroundType = "gradient";
    }, { reason: "background-gradient-angle", skipHistory: true });
  });
  dom.backgroundAngleInput.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.backgroundGradientAngle = Number.parseInt(dom.backgroundAngleInput.value, 10);
      draft.theme.backgroundType = "gradient";
    }, { reason: "background-gradient-angle" });
  });
  dom.backgroundImageButton.addEventListener("click", () => dom.backgroundImageInput.click());
  dom.removeBackgroundImageButton.addEventListener("click", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.theme.backgroundImage = null;
      if (draft.theme.backgroundType === "image") {
        draft.theme.backgroundType = "default";
      }
    }, { reason: "background-image-remove" });
  });
  dom.backgroundImageInput.addEventListener("change", async () => {
    const file = dom.backgroundImageInput.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 220000, 1500);
      stateManager.update((draft) => {
        draft.theme.backgroundImage = compressed;
        draft.theme.backgroundType = "image";
      }, { reason: "background-image" });
    } catch {
      showToast(t("image_upload_failed"));
    } finally {
      dom.backgroundImageInput.value = "";
    }
  });

  dom.volumeSlider.addEventListener("input", () => {
    if (getState().settings.spinOnly) return;
    const volume = Number.parseInt(dom.volumeSlider.value, 10) / 100;
    audioEngine.setVolume(volume);
    stateManager.update((draft) => {
      draft.audio.masterVolume = volume;
    }, { reason: "audio-volume", skipHistory: true });
  });
  dom.volumeSlider.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    const volume = Number.parseInt(dom.volumeSlider.value, 10) / 100;
    audioEngine.setVolume(volume);
    stateManager.update((draft) => {
      draft.audio.masterVolume = volume;
    }, { reason: "audio-volume" });
  });

  dom.tickSoundToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.audio.tickEnabled = dom.tickSoundToggle.checked;
    }, { reason: "audio-tick-toggle" });
  });
  dom.tickSoundSelect.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.audio.tickSound = dom.tickSoundSelect.value;
    }, { reason: "audio-tick-variant" });
    audioEngine.ensureReady();
    audioEngine.playTickVariant(dom.tickSoundSelect.value, 0.35);
  });

  dom.winSoundToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.audio.winEnabled = dom.winSoundToggle.checked;
    }, { reason: "audio-win-toggle" });
  });
  dom.winSoundSelect.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.audio.winSound = dom.winSoundSelect.value;
    }, { reason: "audio-win-variant" });
    audioEngine.ensureReady();
    audioEngine.playWinVariant(dom.winSoundSelect.value);
  });

  dom.spinSoundToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.audio.spinEnabled = dom.spinSoundToggle.checked;
    }, { reason: "audio-spin-toggle" });
  });
  dom.spinSoundSelect.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.audio.spinSound = dom.spinSoundSelect.value;
    }, { reason: "audio-spin-variant" });
  });

  dom.celebrationSelect.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.celebrationMode = dom.celebrationSelect.value;
      draft.settings.confettiEnabled = dom.celebrationSelect.value === "confetti";
    }, { reason: "effects-celebration" });
  });
  dom.reduceMotionOverride.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.reduceMotionOverride = dom.reduceMotionOverride.checked;
    }, { reason: "effects-reduced-motion-override" });
  });

  dom.cinematicModeToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.cinematicMode = dom.cinematicModeToggle.checked;
    }, { reason: "effects-cinematic" });
  });

  dom.hapticsToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.hapticsEnabled = dom.hapticsToggle.checked;
    }, { reason: "effects-haptics" });
  });

  dom.idleAnimationToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.idleAnimationEnabled = dom.idleAnimationToggle.checked;
    }, { reason: "effects-idle-animation" });
  });

  dom.performanceAutoToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.performanceModeAuto = dom.performanceAutoToggle.checked;
    }, { reason: "effects-performance-auto" });
  });

  dom.performanceOverviewToggle.addEventListener("change", () => {
    if (getState().settings.spinOnly) return;
    stateManager.update((draft) => {
      draft.settings.performanceOverview = dom.performanceOverviewToggle.checked;
    }, { reason: "effects-performance-overview" });
  });

  dom.shareButton.addEventListener("click", () => {
    refreshShareUrl();
    openModal(dom.shareModal);
  });
  dom.shareModal.querySelectorAll("input[name='shareMode']").forEach((input) => {
    input.addEventListener("change", refreshShareUrl);
  });
  dom.embedWidthInput.addEventListener("input", () => updateEmbedCode(dom.shareUrlInput.value));
  dom.embedHeightInput.addEventListener("input", () => updateEmbedCode(dom.shareUrlInput.value));
  dom.copyShareButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(dom.shareUrlInput.value);
      showToast(t("copied"));
    } catch {
      showToast(t("copy_failed"));
    }
  });
  dom.copyEmbedButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(dom.embedCodeInput.value);
      showToast(t("copied"));
    } catch {
      showToast(t("copy_failed"));
    }
  });
  dom.downloadQrButton.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = dom.qrCanvas.toDataURL("image/png");
    link.download = `${sanitizeFilename(getState().title || "wheel")}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  dom.closeShareButton.addEventListener("click", closeModal);

  dom.spinAgainButton.addEventListener("click", () => {
    closeModal();
    performSpin();
  });
  dom.spinAgainButton.addEventListener("keydown", suppressSpinButtonKeyboard);
  dom.removeWinnerButton.addEventListener("click", () => {
    const state = getState();
    if (!canRemoveWinner(state)) return;

    const winnerId = currentWinnerEntryId;
    if (!winnerId) return;
    stateManager.update((draft) => {
      const found = draft.entries.find((entry) => entry.id === winnerId);
      if (found) {
        found.eliminated = true;
      }
    }, { reason: "entry-eliminate" });
    closeModal();
  });
  dom.closeResultButton.addEventListener("click", closeModal);

  dom.shortcutButton.addEventListener("click", () => openModal(dom.shortcutModal));
  dom.closeShortcutButton.addEventListener("click", closeModal);

  dom.fullscreenToggle.addEventListener("click", toggleFullscreen);
  dom.fullscreenExitButton.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  });
  dom.fullscreenSettingsButton.addEventListener("click", () => {
    openSettingsModal("general");
  });
  document.addEventListener("fullscreenchange", updateFullscreenState);

  dom.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (!tab) return;
      stateManager.update((draft) => {
        draft.ui.activeTab = tab;
      }, { skipSave: true, skipHistory: true, reason: "tab-change" });
    });
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTextInput = target instanceof HTMLElement && (target.closest("input, textarea, [contenteditable='true']") !== null);

    if (event.key === "Escape") {
      if (activeModal) {
        closeModal();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      stateManager.persist();
      showToast(t("saved"));
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      if (isTextInput) return;
      event.preventDefault();
      if (event.shiftKey) {
        stateManager.redo();
      } else {
        stateManager.undo();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      performSpin();
      return;
    }

  });

  mediaDarkMode.addEventListener("change", () => {
    const userSelectedMode = safeLocalStorageGet(STORAGE_KEYS.themeMode);
    if (userSelectedMode) return;
    stateManager.update((draft) => {
      draft.theme.pageTheme = mediaDarkMode.matches ? "dark" : "light";
    }, { reason: "prefers-color-scheme" });
  });

  onLanguageChange(() => {
    applyTranslations(document);
    renderLanguageMenu();
    renderTemplates();
    renderRecentWheelsSelect();
    renderAll(getState());
  });
}

function buildLocalizedIndexUrl(langCode) {
  const url = new URL("/", SITE_ORIGIN);
  if (langCode && langCode !== "en") {
    url.searchParams.set("lang", langCode);
  }
  return url.toString();
}

function syncHreflang() {
  const current = getCurrentLanguage();
  const canonicalUrl = buildLocalizedIndexUrl(current);
  const canonical = document.querySelector("link[rel='canonical']");

  document.documentElement.lang = current;

  if (canonical) {
    canonical.setAttribute("href", canonicalUrl);
  }

  const ogUrl = document.querySelector("meta[property='og:url']");
  if (ogUrl) {
    ogUrl.setAttribute("content", canonicalUrl);
  }

  const ogLocale = document.querySelector("meta[property='og:locale']");
  if (ogLocale) {
    ogLocale.setAttribute("content", OG_LOCALE_BY_LANG[current] || OG_LOCALE_BY_LANG.en);
  }

  HREFLANG_CODES.forEach((code) => {
    const element = document.querySelector(`link[rel='alternate'][hreflang='${code}']`);
    if (element) {
      element.setAttribute("href", buildLocalizedIndexUrl(code));
    }
  });

  const xDefault = document.querySelector("link[rel='alternate'][hreflang='x-default']");
  if (xDefault) {
    xDefault.setAttribute("href", buildLocalizedIndexUrl("en"));
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    // Force update checks so stale app-shell assets are replaced promptly.
    registration.update().catch(() => {});

    if (!window.__wheelSwControllerChangeBound) {
      window.__wheelSwControllerChangeBound = true;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (window.__wheelSwReloading) return;
        window.__wheelSwReloading = true;
        window.location.reload();
      });
    }
  } catch {
    // Service worker is optional. App still works online without it.
  }
}

async function bootstrap() {
  const initialLanguage = await initI18n();
  applyTranslations(document);
  renderThemeOptions();
  renderLanguageMenu();
  renderTemplates();
  syncHreflang();
  recentWheels = loadRecentWheels();
  renderRecentWheelsSelect();

  let decodedState = null;
  const sharePayload = readSharePayload();
  const embedMode = new URL(window.location.href).searchParams.get("embed") === "1";
  if (sharePayload) {
    try {
      decodedState = decodeWheelConfig(sharePayload);
    } catch {
      showToast(t("share_decode_failed"));
    }
  }

  const hasStoredState = Boolean(safeLocalStorageGet(STORAGE_KEYS.state));
  const initialState = stateManager.initialize(decodedState);
  const initialPresetKey = normalizeEventPresetKey(initialState.theme?.eventPreset);
  if (getLegacyAutoCenterTextKey(initialState.theme?.centerText)) {
    initialState.theme.centerText = getAutoCenterTextValueForPreset(initialPresetKey);
    stateManager.setState(initialState, { reason: "center-text-migration", skipHistory: true });
  }
  if (!hasStoredState && !sharePayload) {
    initialState.ui.firstRunHintDismissed = Boolean(safeLocalStorageGet(STORAGE_KEYS.firstRunHintDismissed));
    if (!safeLocalStorageGet(STORAGE_KEYS.themeMode)) {
      initialState.theme.pageTheme = mediaDarkMode.matches ? "dark" : "light";
    }
    if (mediaReduceMotion.matches) {
      initialState.audio.tickEnabled = false;
      initialState.audio.winEnabled = false;
    }
    initialState.ui.language = initialLanguage;
    stateManager.setState(initialState, { reason: "first-run" });
  }

  if (safeLocalStorageGet(STORAGE_KEYS.themeMode)) {
    stateManager.update((draft) => {
      draft.theme.pageTheme = safeLocalStorageGet(STORAGE_KEYS.themeMode);
    }, { skipSave: true, reason: "theme-restore" });
  }

  if (embedMode) {
    document.body.classList.add("embed-shell");
    stateManager.update((draft) => {
      draft.settings.spinOnly = true;
    }, { skipSave: true, skipHistory: true, reason: "embed-mode" });
  }

  const stateBeforeFirstRender = getState();
  const presetKeyBeforeFirstRender = normalizeEventPresetKey(stateBeforeFirstRender.theme?.eventPreset);
  if (getLegacyAutoCenterTextKey(stateBeforeFirstRender.theme?.centerText)) {
    stateManager.update((draft) => {
      draft.theme.centerText = getAutoCenterTextValueForPreset(presetKeyBeforeFirstRender);
    }, { reason: "center-text-migration", skipHistory: true });
  }

  audioEngine.setVolume(getState().audio.masterVolume);
  bindEvents();
  setupFloatingSpinObserver();
  window.addEventListener("beforeunload", cleanupRuntimeResources, { once: true });
  renderAll(getState());
  stateManager.on(STATE_EVENTS.change, (nextState) => {
    renderAll(nextState);
  });

  registerServiceWorker();

  if (getState().settings.spinOnly) {
    showToast(t("spin_only_mode_loaded"));
  }
}

bootstrap();
