import {
  getCurrentDifficulty,
  getBadges,
  getClearTargets,
  getGameState,
  getProgressSnapshot,
  modifyKnowledgeHealth,
  getOverallMastery,
  getResearchExportData,
  getResearchLog
} from "./core/gameState.js";
import {
  enterZone,
  getBranchesForZone,
  getZones,
  selectBranch,
  unlockOneZoneDebug
} from "./core/zoneEngine.js";
import {
  buildChoiceOptions,
  generateMockChallenge,
  evaluateAnswer,
  getChallengeContentDiagnostics
} from "./core/challengeEngine.js";

const zoneScreen = document.getElementById("zone-screen");
const challengeScreen = document.getElementById("challenge-screen");
const branchCompleteScreen = document.getElementById("branch-complete-screen");
const zoneList = document.getElementById("zone-list");
const testUnlockButton = document.getElementById("test-unlock-button");
const contentTestButton = document.getElementById("content-test-button");
const contentTestOutput = document.getElementById("content-test-output");
const exportJsonButton = document.getElementById("export-json-button");
const copyJsonButton = document.getElementById("copy-json-button");
const exportStatus = document.getElementById("export-status");
const progressMap = document.getElementById("mastery-map") || document.getElementById("progress-map");
const badgePanel = document.getElementById("badge-panel");
const badgeNotification = document.getElementById("badge-notification");
const branchPanel = document.getElementById("branch-panel");
const branchPanelLabel = document.getElementById("branch-panel-label");
const branchList = document.getElementById("branch-list");

const activeZoneText = document.getElementById("active-zone");
const activeBranchText = document.getElementById("active-branch");
const masteryText = document.getElementById("mastery-level");
const difficultyText = document.getElementById("difficulty-level");
const knowledgeHealthText = document.getElementById("knowledge-health");
const totalPointsText = document.getElementById("total-points");

const challengePrompt = document.getElementById("challenge-prompt");
const bossIndicator = document.getElementById("boss-indicator");
const challengeCard = document.querySelector(".challenge-card");
const answerForm = document.getElementById("answer-form");
const answerLabel = document.getElementById("answer-label");
const answerChoices = document.getElementById("answer-choices");
const answerTextWrap = document.getElementById("answer-text-wrap");
const answerTextInput = document.getElementById("answer-text-input");
const feedback = document.getElementById("feedback");
const backButton = document.getElementById("back-button");
const branchCompleteMessage = document.getElementById("branch-complete-message");
const nextBranchYesButton = document.getElementById("next-branch-yes");
const nextBranchNoButton = document.getElementById("next-branch-no");
const khFill = document.getElementById("kh-fill");
const popupContainer = document.getElementById("pop-up-container");
const challengeTimer = document.getElementById("challenge-timer");
const endStatsPanel = document.getElementById("end-stats-panel");
const endStatsText = document.getElementById("end-stats-text");
const feedbackResultText = document.getElementById("feedback-result");
const feedbackBranchText = document.getElementById("feedback-branch");
const feedbackBossText = document.getElementById("feedback-boss");
const feedbackKhText = document.getElementById("feedback-kh");
const feedbackDifficultyText = document.getElementById("feedback-difficulty");
const feedbackBadgeText = document.getElementById("feedback-badge");
const correctSfx = document.getElementById("sfx-correct");
const wrongSfx = document.getElementById("sfx-wrong");
const badgeSfx = document.getElementById("sfx-badge");
const bossSfx = document.getElementById("sfx-boss");
const menuToggleButton = document.getElementById("menu-toggle-button");
const gameMenu = document.getElementById("game-menu");
const menuResumeButton = document.getElementById("menu-resume-button");
const menuSfxButton = document.getElementById("menu-sfx-button");
const menuZonesButton = document.getElementById("menu-zones-button");
const menuRestartButton = document.getElementById("menu-restart-button");
const homeViews = document.querySelectorAll(".home-view");
const homeNavLinks = document.querySelectorAll(".home-page [data-view-target]");
const homePreviewKhFill = document.getElementById("preview-kh-fill");
const homeStatusKhFill = document.getElementById("home-kh-fill");
const homeStatusDifficulty = document.getElementById("home-status-difficulty");
const homeStatusKh = document.getElementById("home-status-kh");
const homeStatusMastery = document.getElementById("home-status-mastery");
const signInForm = document.getElementById("signin-form");
const signUpForm = document.getElementById("signup-form");
const signInFeedback = document.getElementById("signin-feedback");
const signUpFeedback = document.getElementById("signup-feedback");
const homeThemeToggle = document.getElementById("home-theme-toggle");
const gameThemeToggle = document.getElementById("theme-toggle-button");
const animationToggleButton = document.getElementById("animation-toggle-button");
const guestInfoButton = document.getElementById("guest-info-button");
const guestInfoModal = document.getElementById("guest-info-modal");
const guestInfoClose = document.getElementById("guest-info-close");

let activeChallenge = null;
const clearTargets = getClearTargets();
const bossMaxHp = clearTargets.boss;
let lastKnowledgeHealth = 100;
const enableResearchConsoleLogging = true;
let badgeNotificationTimer = null;
let elapsedIntervalId = null;
let challengeStartedAt = 0;
let currentExpectedSeconds = 20;
let quizSessionStart = null;
let selectedAnswer = "";
let textAnswerLocked = false;
let elapsedTickAt = 0;
let activeTimedChallengeType = "branch";
let audioCtx = null;
let pendingNextBranch = null;
let progressMapSignature = "";
let badgePanelSignature = "";
let zoneListSignature = "";
let sfxEnabled = true;
let lastDifficultyLevel = "Beginner";
let lastBadgeTitles = "";
const isGamePage = Boolean(zoneScreen && challengeScreen && zoneList && challengePrompt && answerForm);
const THEME_STORAGE_KEY = "quizionixTheme";
const ANIMATION_STORAGE_KEY = "quizionixAnimations";

if (typeof window !== "undefined") {
  window.getQuizionixResearchLog = getResearchLog;
  window.getQuizionixResearchExport = getResearchExportData;
}

function applyTheme(themeName) {
  const normalized = themeName === "light" ? "light" : "dark";
  document.body.setAttribute("data-theme", normalized);
  localStorage.setItem(THEME_STORAGE_KEY, normalized);

  if (homeThemeToggle) {
    homeThemeToggle.textContent = `Theme: ${normalized === "dark" ? "Dark" : "Light"}`;
  }
  if (gameThemeToggle) {
    gameThemeToggle.textContent = `Theme: ${normalized === "dark" ? "Dark" : "Light"}`;
  }
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
}

function applyAnimationMode(mode) {
  const normalized = mode === "off" ? "off" : "on";
  document.body.setAttribute("data-animations", normalized);
  localStorage.setItem(ANIMATION_STORAGE_KEY, normalized);
  if (animationToggleButton) {
    animationToggleButton.textContent = `Animations: ${normalized === "on" ? "On" : "Off"}`;
  }
}

function initializeVisualPreferences() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
  applyTheme(storedTheme);
  const storedAnimations = localStorage.getItem(ANIMATION_STORAGE_KEY) || "on";
  applyAnimationMode(storedAnimations);

  if (homeThemeToggle) {
    homeThemeToggle.addEventListener("click", toggleTheme);
  }
  if (gameThemeToggle) {
    gameThemeToggle.addEventListener("click", toggleTheme);
  }
  if (animationToggleButton) {
    animationToggleButton.addEventListener("click", () => {
      const current = document.body.getAttribute("data-animations") || "on";
      applyAnimationMode(current === "on" ? "off" : "on");
    });
  }
}

function runContentSmokeTest() {
  const diagnostics = getChallengeContentDiagnostics();
  const state = getGameState();
  const challengeSample = generateMockChallenge("Science", "Physics", state.difficultyLevel);
  const hasPhysicsAuthored = diagnostics.authoredZones.includes("Science");
  const hasQuestionType = challengeSample.questionType === "multiple-choice" || challengeSample.questionType === "text";

  return {
    pass: Boolean(hasPhysicsAuthored && hasQuestionType),
    diagnostics,
    challengeSample: {
      id: challengeSample.id,
      questionType: challengeSample.questionType,
      difficulty: challengeSample.difficulty,
      type: challengeSample.type
    }
  };
}

if (typeof window !== "undefined") {
  window.runQuizionixContentSmokeTest = runContentSmokeTest;
}

function retriggerAnimation(element, className) {
  if (!element) {
    return;
  }
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function formatElapsed(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getExpectedSecondsForMechanics(state, challengeType) {
  const difficultyBase = {
    Beginner: 22,
    Advanced: 17,
    Master: 13
  };

  let expected = difficultyBase[state.difficultyLevel] || 20;

  if (challengeType === "boss") {
    expected += 7;
  }

  // Mechanics ratio references current challenge context without altering actual gameplay logic.
  if (state.knowledgeHealth < 40) {
    expected += 4;
  } else if (state.knowledgeHealth > 80) {
    expected -= 1;
  }

  return Math.max(8, expected);
}

function getBossIndicatorText(state, challenge) {
  if (!challenge || challenge.type !== "boss") {
    return "";
  }

  const bossKey = `${state.currentZone}::${state.currentBranch}`;
  const boss = state.bossProgress[bossKey] || { hp: bossMaxHp, maxHp: bossMaxHp };
  return `Branch Boss Active | HP ${boss.hp}/${boss.maxHp}`;
}

function getLiveTimeMultiplier(elapsedSeconds) {
  const elapsedRatio = elapsedSeconds / Math.max(currentExpectedSeconds, 1);
  return Math.max(0.25, Math.min(3, 3 * Math.exp(-0.9 * elapsedRatio)));
}

function getKhDecayPerSecond(state, challengeType, elapsedSeconds) {
  const baseByDifficulty = {
    Beginner: 0.55,
    Advanced: 0.75,
    Master: 0.95
  };

  const base = baseByDifficulty[state.difficultyLevel] || 0.65;
  const bossLoad = challengeType === "boss" ? 0.35 : 0;
  const elapsedPressure = Math.min(1.4, (elapsedSeconds / Math.max(currentExpectedSeconds, 1)) * 0.4);
  return base + bossLoad + elapsedPressure;
}

function updateElapsedDisplay() {
  if (!challengeTimer) {
    return;
  }
  if (!challengeStartedAt) {
    challengeTimer.textContent = "Elapsed: 00:00 | Multiplier: 3.00x";
    return;
  }

  const now = Date.now();
  const elapsedSeconds = (now - challengeStartedAt) / 1000;
  const deltaSeconds = Math.max(0, (now - elapsedTickAt) / 1000);
  const state = getGameState();
  const khDecayPerSecond = getKhDecayPerSecond(state, activeTimedChallengeType, elapsedSeconds);
  if (deltaSeconds > 0) {
    modifyKnowledgeHealth(-(khDecayPerSecond * deltaSeconds));
    renderState();
  }
  elapsedTickAt = now;

  const multiplier = getLiveTimeMultiplier(elapsedSeconds);
  challengeTimer.textContent = `Elapsed: ${formatElapsed(elapsedSeconds)} | Multiplier: ${multiplier.toFixed(2)}x`;
}

function startElapsedTracking(state, challengeType) {
  if (elapsedIntervalId) {
    clearInterval(elapsedIntervalId);
  }

  challengeStartedAt = Date.now();
  elapsedTickAt = challengeStartedAt;
  activeTimedChallengeType = challengeType;
  currentExpectedSeconds = getExpectedSecondsForMechanics(state, challengeType);
  updateElapsedDisplay();
  elapsedIntervalId = setInterval(updateElapsedDisplay, 250);
}

function stopElapsedTracking() {
  if (elapsedIntervalId) {
    clearInterval(elapsedIntervalId);
    elapsedIntervalId = null;
  }
  challengeStartedAt = 0;
  elapsedTickAt = 0;
  if (challengeTimer) {
    challengeTimer.textContent = "Elapsed: 00:00 | Multiplier: 3.00x";
  }
}

function renderState() {
  if (!isGamePage) {
    return;
  }
  const state = getGameState();
  activeZoneText.textContent = state.currentZone || "-";
  activeBranchText.textContent = state.currentBranch || "-";
  masteryText.textContent = `${getOverallMastery()}%`;
  const difficulty = getCurrentDifficulty();
  difficultyText.textContent = difficulty;
  difficultyText.className = "difficulty-pill";
  difficultyText.classList.add(`difficulty-${difficulty.toLowerCase()}`);
  if (difficulty !== lastDifficultyLevel) {
    retriggerAnimation(difficultyText, "difficulty-shift");
    lastDifficultyLevel = difficulty;
  }
  knowledgeHealthText.textContent = String(state.knowledgeHealth);
  totalPointsText.textContent = String(state.totalPoints || 0);
  khFill.style.width = `${state.knowledgeHealth}%`;
  khFill.style.background = state.knowledgeHealth < 30
    ? "linear-gradient(90deg, #c4563d 0%, #E76F51 100%)"
    : state.knowledgeHealth < 60
      ? "linear-gradient(90deg, #d6b251 0%, #E9C46A 100%)"
      : "linear-gradient(90deg, #2A9D8F 0%, #47b8ab 100%)";
  if (feedbackKhText) {
    feedbackKhText.textContent = `KH: ${state.knowledgeHealth}/100`;
  }
  if (feedbackDifficultyText) {
    feedbackDifficultyText.textContent = `Difficulty: ${difficulty}`;
  }
  // Tooltips reinforce HUD meaning (KH, mastery, and adaptive tier) for quick user orientation.
  difficultyText.title = `Adaptive difficulty tier: ${difficulty}`;
  masteryText.title = `Overall mastery: ${getOverallMastery()}%`;
  knowledgeHealthText.title = `Knowledge Health: ${state.knowledgeHealth} out of 100`;
}

function createProgressBar(value) {
  const bar = document.createElement("div");
  bar.className = "mastery-bar";

  const fill = document.createElement("span");
  fill.className = "mastery-fill";
  if (value >= 80) {
    fill.classList.add("tier-master");
  } else if (value >= 50) {
    fill.classList.add("tier-advanced");
  } else {
    fill.classList.add("tier-beginner");
  }
  fill.style.width = "0%";
  fill.dataset.targetWidth = `${value}%`;

  bar.appendChild(fill);
  return bar;
}

function animateProgressBars() {
  requestAnimationFrame(() => {
    const fills = progressMap.querySelectorAll(".mastery-fill");
    fills.forEach((fill) => {
      fill.style.width = fill.dataset.targetWidth || "0%";
    });
  });
}

function renderBadgePanel() {
  if (!badgePanel) {
    return;
  }
  const badges = getBadges();
  const badgeSummary = badges.length > 0 ? badges.map((badge) => badge.title).join(", ") : "none";
  if (feedbackBadgeText) {
    feedbackBadgeText.textContent = `Badges: ${badgeSummary}`;
  }
  const signature = badges.map((badge) => badge.id).join("|");
  if (signature === badgePanelSignature) {
    return;
  }
  badgePanelSignature = signature;
  badgePanel.innerHTML = "";

  if (badges.length === 0) {
    const empty = document.createElement("p");
    empty.className = "badge-empty";
    empty.textContent = "No badges yet. Clear branches and bosses to earn rewards.";
    badgePanel.appendChild(empty);
    return;
  }

  badges.forEach((badge) => {
    const chip = document.createElement("span");
    chip.className = "badge-chip";
    chip.textContent = `[Badge] ${badge.title}`;
    chip.title = badge.description || badge.title;
    badgePanel.appendChild(chip);
  });
}

function renderChallengeFeedbackDetails(result) {
  if (!feedbackResultText || !feedbackBranchText || !feedbackBossText || !feedbackKhText || !feedbackDifficultyText || !feedbackBadgeText) {
    return;
  }

  // Feedback panel mirrors core outcomes in text + subtle motion, preserving mechanics but improving readability.
  const state = getGameState();
  const badgeTitles = getBadges().map((badge) => badge.title);
  const badgeSummary = badgeTitles.length > 0 ? badgeTitles.join(", ") : "none";
  const resultLabel = result.success ? "Correct" : "Wrong";

  feedbackResultText.textContent = `${resultLabel}: ${result.message}`;
  retriggerAnimation(feedbackResultText, result.success ? "result-success-flash" : "result-fail-flash");
  feedbackBranchText.textContent = result.branchProgressText || "Branch progress: -";
  feedbackBossText.textContent = result.bossProgressText || "Boss progress: -";
  feedbackKhText.textContent = `KH: ${state.knowledgeHealth}/100`;
  feedbackDifficultyText.textContent = `Difficulty: ${state.difficultyLevel}`;
  feedbackBadgeText.textContent = `Badges: ${badgeSummary}`;

  if (badgeSummary !== lastBadgeTitles) {
    retriggerAnimation(feedbackBadgeText, "status-pulse");
    lastBadgeTitles = badgeSummary;
  }
}

function showBadgeNotification(newBadges) {
  if (!badgeNotification || !newBadges || newBadges.length === 0) {
    return;
  }

  const badgeTitles = newBadges.map((badge) => badge.title).join(", ");
  badgeNotification.textContent = `New Badge Earned: ${badgeTitles}`;
  badgeNotification.classList.add("active");
  retriggerAnimation(badgeNotification, "badge-pop");

  if (badgeNotificationTimer) {
    clearTimeout(badgeNotificationTimer);
  }

  badgeNotificationTimer = setTimeout(() => {
    badgeNotification.classList.remove("active");
  }, 3200);
}

function showPopUp(message) {
  if (!popupContainer) {
    return;
  }
  const pop = document.createElement("p");
  pop.className = "popup-item";
  pop.textContent = message;
  popupContainer.appendChild(pop);
  requestAnimationFrame(() => pop.classList.add("show"));
  setTimeout(() => {
    pop.remove();
  }, 2800);
}

function getAudioContext() {
  if (audioCtx) {
    return audioCtx;
  }

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) {
    return null;
  }

  audioCtx = new Ctx();
  return audioCtx;
}

function playToneSequence(notes) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const start = ctx.currentTime;
  notes.forEach((note, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noteStart = start + (index * note.duration);
    const noteEnd = noteStart + note.duration;

    osc.type = note.type || "sine";
    osc.frequency.setValueAtTime(note.freq, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(note.volume || 0.08, noteStart + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(noteStart);
    osc.stop(noteEnd);
  });
}

function playFallbackSfx(label) {
  const patterns = {
    correct: [
      { freq: 740, duration: 0.08, type: "triangle", volume: 0.06 },
      { freq: 988, duration: 0.1, type: "triangle", volume: 0.06 }
    ],
    wrong: [
      { freq: 300, duration: 0.12, type: "sawtooth", volume: 0.05 },
      { freq: 220, duration: 0.12, type: "sawtooth", volume: 0.05 }
    ],
    "badge-earned": [
      { freq: 660, duration: 0.08, type: "square", volume: 0.05 },
      { freq: 880, duration: 0.08, type: "square", volume: 0.05 },
      { freq: 1320, duration: 0.1, type: "square", volume: 0.05 }
    ],
    "boss-victory": [
      { freq: 440, duration: 0.09, type: "triangle", volume: 0.06 },
      { freq: 587, duration: 0.09, type: "triangle", volume: 0.06 },
      { freq: 880, duration: 0.12, type: "triangle", volume: 0.07 }
    ]
  };

  playToneSequence(patterns[label] || patterns.correct);
}

function playSoundCue(audioElement, fallbackLabel) {
  if (!sfxEnabled) {
    return;
  }

  // Sound is optional polish; fallback logging keeps prototype deterministic and non-blocking.
  if (!audioElement || !audioElement.src) {
    playFallbackSfx(fallbackLabel);
    console.log(`sound placeholder: ${fallbackLabel}`);
    return;
  }

  audioElement.currentTime = 0;
  audioElement.play().catch(() => {
    playFallbackSfx(fallbackLabel);
    console.log(`sound placeholder: ${fallbackLabel}`);
  });
}

function spawnParticles(kind, count = 14) {
  if (!popupContainer) {
    return;
  }
  const paletteByKind = {
    correct: ["#1f7a3f", "#0d5a5a", "#8fcf9f"],
    wrong: ["#9a2d2d", "#c86c6c", "#e2a6a6"],
    boss: ["#f3c969", "#ffd980", "#0d5a5a"]
  };
  const palette = paletteByKind[kind] || paletteByKind.correct;

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    particle.className = `particle particle-${kind}`;
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.top = `${12 + (Math.random() * 30)}vh`;
    particle.style.background = palette[Math.floor(Math.random() * palette.length)];
    particle.style.animationDelay = `${Math.random() * 120}ms`;
    popupContainer.appendChild(particle);

    setTimeout(() => particle.remove(), 850);
  }
}

function triggerMilestoneEffect(label, kind = "milestone") {
  showPopUp(label);
  const popups = popupContainer.querySelectorAll(".popup-item");
  const latest = popups[popups.length - 1];
  if (latest) {
    latest.classList.add("milestone-pop");
    if (kind === "boss") {
      latest.classList.add("boss-pop");
    }
  }
}

function renderProgressMap() {
  if (!progressMap) {
    return;
  }
  // Mastery map externalizes progression (zones/branches/bosses/badges) so learners see growth at a glance.
  // This visualization reads state only and does not alter KH, adaptive difficulty, or research metrics.
  const progress = getProgressSnapshot();
  const state = getGameState();
  const masteryMap = progress.masteryMap;
  const signature = masteryMap.map((zone) => {
    const branchData = zone.branches
      .map((branch) => `${branch.name}:${branch.mastery}:${(branch.badges || []).map((badge) => badge.id).join(".")}`)
      .join(",");
    const zoneBadgeData = (zone.zoneBadges || []).map((badge) => badge.id).join(".");
    return `${zone.zoneId}:${zone.unlocked}:${zone.mastery}:${zone.bossMastery}:${zone.bossCompleted}:${zoneBadgeData}:${branchData}`;
  }).join("|");
  if (signature === progressMapSignature) {
    return;
  }
  progressMapSignature = signature;
  progressMap.innerHTML = "";

  masteryMap.forEach((zone) => {
    const zoneCard = document.createElement("article");
    zoneCard.className = "zone-progress";
    if (state.currentZone === zone.zoneName) {
      zoneCard.classList.add("current");
    }
    if (zone.mastery >= 100 || zone.bossCompleted) {
      zoneCard.classList.add("completed");
    }
    if (!zone.unlocked) {
      zoneCard.classList.add("locked");
    }

    const heading = document.createElement("p");
    heading.className = "zone-progress-title";
    heading.textContent = `${zone.zoneName} ${zone.unlocked ? "" : "(Locked)"}`.trim();
    zoneCard.appendChild(heading);

    if (!zone.unlocked) {
      const lockedBadge = document.createElement("p");
      lockedBadge.className = "zone-locked-badge";
      lockedBadge.textContent = "LOCKED";

      const lockedShell = document.createElement("div");
      lockedShell.className = "zone-locked-shell";

      const lockedBar = document.createElement("span");
      lockedBar.className = "zone-locked-bar";
      lockedShell.appendChild(lockedBar);

      zoneCard.appendChild(lockedBadge);
      zoneCard.appendChild(lockedShell);
      progressMap.appendChild(zoneCard);
      return;
    }

    const zonePercent = document.createElement("p");
    zonePercent.className = "zone-progress-value";
    zonePercent.textContent = `Zone Mastery: ${zone.mastery}%`;

    const bossPercent = document.createElement("p");
    bossPercent.className = "zone-progress-value";
    bossPercent.textContent = `Boss: ${zone.bossCompleted ? "Complete" : "Incomplete"} (${zone.bossMastery}%)`;

    zoneCard.appendChild(zonePercent);
    zoneCard.appendChild(createProgressBar(zone.mastery));
    zoneCard.appendChild(bossPercent);
    zoneCard.appendChild(createProgressBar(zone.bossMastery));

    if (zone.zoneBadges && zone.zoneBadges.length > 0) {
      const zoneBadgeRow = document.createElement("p");
      zoneBadgeRow.className = "zone-progress-value";
      zoneBadgeRow.textContent = `Zone Badges: ${zone.zoneBadges.map((badge) => badge.title).join(", ")}`;
      zoneCard.appendChild(zoneBadgeRow);
    }

    const branchListElement = document.createElement("div");
    branchListElement.className = "branch-progress-list";

    zone.branches.forEach((branch) => {
      const row = document.createElement("div");
      row.className = "branch-progress-row";
      if (state.currentZone === zone.zoneName && state.currentBranch === branch.name) {
        row.classList.add("current");
      }
      if (branch.mastery >= 100) {
        row.classList.add("completed");
      }

      const label = document.createElement("p");
      label.className = "branch-progress-label";
      const branchBadgeCount = (branch.badges || []).length;
      label.textContent = `${branch.name}: ${branch.mastery}%${branchBadgeCount > 0 ? ` | Badges: ${branchBadgeCount}` : ""}`;

      row.appendChild(label);
      row.appendChild(createProgressBar(branch.mastery));
      branchListElement.appendChild(row);
    });

    zoneCard.appendChild(branchListElement);
    progressMap.appendChild(zoneCard);
  });

  animateProgressBars();
}

function animateKnowledgeHealthChange(previousValue, nextValue) {
  if (nextValue > previousValue) {
    retriggerAnimation(knowledgeHealthText, "kh-up");
  } else if (nextValue < previousValue) {
    retriggerAnimation(knowledgeHealthText, "kh-down");
  }
  retriggerAnimation(khFill, "kh-pulse");
}

function showScreen(screenName) {
  zoneScreen.classList.toggle("active", screenName === "zone");
  challengeScreen.classList.toggle("active", screenName === "challenge");
  branchCompleteScreen.classList.toggle("active", screenName === "branch-complete");
  document.body.classList.toggle("game-focus", screenName === "challenge");
}

function toggleMenu(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean"
    ? forceOpen
    : Boolean(gameMenu.hidden);
  gameMenu.hidden = !shouldOpen;
  document.body.classList.toggle("menu-open", shouldOpen);
  menuToggleButton.setAttribute("aria-expanded", String(shouldOpen));
}

function getNextBranchForCurrentState() {
  const state = getGameState();
  if (!state.currentZoneId || !state.currentBranch) {
    return null;
  }

  const branches = getBranchesForZone(state.currentZoneId);
  if (!branches.length) {
    return null;
  }

  const currentIndex = branches.findIndex((branch) => branch.name === state.currentBranch);
  if (currentIndex < 0 || currentIndex + 1 >= branches.length) {
    return null;
  }

  return {
    zoneId: state.currentZoneId,
    branchId: branches[currentIndex + 1].id,
    branchName: branches[currentIndex + 1].name
  };
}

function showBranchCompletionScreen() {
  const state = getGameState();
  pendingNextBranch = getNextBranchForCurrentState();

  if (pendingNextBranch) {
    branchCompleteMessage.textContent = `Branch "${state.currentBranch}" completed. Move to "${pendingNextBranch.branchName}" next?`;
    nextBranchYesButton.disabled = false;
  } else {
    branchCompleteMessage.textContent = `Branch "${state.currentBranch}" completed. No next branch in this zone. Stay and choose your next action.`;
    nextBranchYesButton.disabled = true;
  }

  showScreen("branch-complete");
}

function renderChoiceBoxes(challenge) {
  selectedAnswer = "";
  answerChoices.innerHTML = "";
  answerTextWrap.hidden = true;
  textAnswerLocked = false;
  const options = buildChoiceOptions(challenge);

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-box";
    button.textContent = option;
    button.addEventListener("click", () => {
      selectedAnswer = option;
      answerChoices.querySelectorAll(".choice-box").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      processAnswer(option, button);
    });
    answerChoices.appendChild(button);
  });
}

function renderTextAnswerInput(challenge) {
  selectedAnswer = "";
  answerChoices.innerHTML = "";
  answerTextWrap.hidden = false;
  textAnswerLocked = false;
  answerTextInput.value = "";
  answerTextInput.placeholder = challenge.type === "boss"
    ? "Type answer and press Enter to clear boss node"
    : "Type answer and press Enter";
  requestAnimationFrame(() => {
    answerTextInput.focus();
  });
}

function renderChallengeInput(challenge) {
  // UI layer only: challenge engine decides type/content, script renders matching controls.
  if (challenge.questionType === "multiple-choice") {
    answerLabel.textContent = "Choose One Answer";
    renderChoiceBoxes(challenge);
    return;
  }

  answerLabel.textContent = "Type Your Answer";
  renderTextAnswerInput(challenge);
}

function processAnswer(answerValue, sourceButton) {
  if (!activeChallenge) {
    return;
  }

  const elapsedSeconds = challengeStartedAt ? (Date.now() - challengeStartedAt) / 1000 : 0;
  const result = evaluateAnswer(answerValue, activeChallenge, {
    elapsedSeconds,
    expectedSeconds: currentExpectedSeconds
  });
  if (enableResearchConsoleLogging && result.researchLogEntry) {
    // Structured output supports research export while remaining separate from game mechanics.
    console.log("quizionix_research_metric", result.researchLogEntry);
  }
  showBadgeNotification(result.newBadges);
  if (result.success) {
    if (sourceButton) {
      retriggerAnimation(sourceButton, "glow-correct");
    }
    spawnParticles("correct", 12);
    playSoundCue(correctSfx, "correct");
  } else {
    retriggerAnimation(answerForm, "shake-wrong");
    spawnParticles("wrong", 8);
    playSoundCue(wrongSfx, "wrong");
  }
  answerChoices.querySelectorAll(".choice-box").forEach((item) => item.classList.remove("selected"));
  const feedbackParts = [
    `[${result.questionType === "multiple-choice" ? "Multiple Choice" : "Text"}]`,
    result.message,
    result.branchProgressText,
    result.bossProgressText
  ];
  if (result.remediationHint) {
    feedbackParts.push(result.remediationHint);
  }
  feedback.textContent = feedbackParts.join(" ");
  feedback.className = `feedback ${result.success ? "success" : "fail"}`;
  retriggerAnimation(feedback, "feedback-pop");
  retriggerAnimation(challengeCard, "fade-scale");
  renderChallengeFeedbackDetails(result);
  renderState();
  renderProgressMap();
  renderBadgePanel();

  const branchCompleted = result.branchCompleted;
  const bossCompleted = result.bossCompleted;
  const shouldExitCompletedBranch = branchCompleted && result.encounterType !== "boss" && !result.bossReady;
  if (branchCompleted) {
    triggerMilestoneEffect("Branch milestone reached");
    retriggerAnimation(feedback, "status-pulse");
    retriggerAnimation(activeBranchText, "branch-complete-flash");
  }
  if (bossCompleted) {
    triggerMilestoneEffect("Boss milestone reached", "boss");
    retriggerAnimation(bossIndicator, "status-pulse");
    retriggerAnimation(challengeCard, "boss-victory");
    spawnParticles("boss", 20);
    playSoundCue(bossSfx, "boss-victory");
  }
  if (result.newBadges && result.newBadges.length > 0) {
    result.newBadges.forEach((badge) => triggerMilestoneEffect(`Badge unlocked: ${badge.title}`));
    playSoundCue(badgeSfx, "badge-earned");
  }
  const state = getGameState();
  animateKnowledgeHealthChange(lastKnowledgeHealth, state.knowledgeHealth);
  lastKnowledgeHealth = state.knowledgeHealth;

  if (bossCompleted && quizSessionStart) {
    const finalState = getGameState();
    const pointsGained = (finalState.totalPoints || 0) - quizSessionStart.points;
    const masteryGained = getOverallMastery() - quizSessionStart.mastery;
    const khChange = finalState.knowledgeHealth - quizSessionStart.knowledgeHealth;
    endStatsText.textContent = `Branch boss defeated in ${finalState.currentBranch}. Points gained: ${pointsGained}. Mastery change: ${masteryGained}%. Knowledge Health change: ${khChange}.`;
    endStatsPanel.hidden = false;
    feedback.textContent = "Branch boss defeated. Branch goal completed.";
    feedback.className = "feedback success";
    answerChoices.innerHTML = "";
    answerTextWrap.hidden = true;
    stopElapsedTracking();
    activeChallenge = null;
    selectedAnswer = "";
    textAnswerLocked = false;
    renderZones();
    showBranchCompletionScreen();
    return;
  }

  if (shouldExitCompletedBranch) {
    feedback.textContent = "Branch goal complete.";
    feedback.className = "feedback success";
    answerChoices.innerHTML = "";
    answerTextWrap.hidden = true;
    answerTextInput.value = "";
    stopElapsedTracking();
    activeChallenge = null;
    selectedAnswer = "";
    textAnswerLocked = false;
    renderZones();
    showBranchCompletionScreen();
    return;
  }

  activeChallenge = generateMockChallenge(
    state.currentZone,
    state.currentBranch,
    state.difficultyLevel
  );
  challengePrompt.textContent = activeChallenge.prompt;
  renderChallengeInput(activeChallenge);
  startElapsedTracking(state, activeChallenge.type);
  bossIndicator.textContent = getBossIndicatorText(state, activeChallenge);

  selectedAnswer = "";
  renderZones();
}

function getPaceLabel(timeRatio) {
  if (timeRatio <= 0.9) {
    return "Fast";
  }

  if (timeRatio <= 1.2) {
    return "On pace";
  }

  return "Needs review";
}

function getPerformanceLabel(performancePercent) {
  if (performancePercent >= 85) {
    return "Strong";
  }

  if (performancePercent >= 65) {
    return "Stable";
  }

  return "Developing";
}

function startChallenge(zoneId, branchId) {
  const selectedBranch = selectBranch(zoneId, branchId);
  if (!selectedBranch) {
    return;
  }

  feedback.textContent = "";
  feedback.className = "feedback";
  if (feedbackResultText) {
    feedbackResultText.textContent = "Result will appear here.";
  }
  if (feedbackBranchText) {
    feedbackBranchText.textContent = "Branch progress: -";
  }
  if (feedbackBossText) {
    feedbackBossText.textContent = "Boss progress: -";
  }

  const refreshed = getGameState();
  if (!quizSessionStart || quizSessionStart.zone !== refreshed.currentZone) {
    quizSessionStart = {
      zone: refreshed.currentZone,
      points: refreshed.totalPoints || 0,
      mastery: getOverallMastery(),
      knowledgeHealth: refreshed.knowledgeHealth
    };
  }
  activeChallenge = generateMockChallenge(
    refreshed.currentZone,
    refreshed.currentBranch,
    refreshed.difficultyLevel
  );

  challengePrompt.textContent = activeChallenge.prompt;
  startElapsedTracking(refreshed, activeChallenge.type);
  if (activeChallenge.type === "boss") {
    bossIndicator.textContent = getBossIndicatorText(refreshed, activeChallenge);
  } else {
    bossIndicator.textContent = "";
  }
  renderChallengeInput(activeChallenge);
  endStatsPanel.hidden = true;
  endStatsText.textContent = "";
  renderState();
  renderProgressMap();
  renderBadgePanel();
  if (feedbackKhText) {
    feedbackKhText.textContent = `KH: ${refreshed.knowledgeHealth}/100`;
  }
  if (feedbackDifficultyText) {
    feedbackDifficultyText.textContent = `Difficulty: ${refreshed.difficultyLevel}`;
  }
  if (feedbackBadgeText) {
    const badgeTitles = getBadges().map((badge) => badge.title).join(", ");
    feedbackBadgeText.textContent = `Badges: ${badgeTitles || "none"}`;
  }
  showScreen("challenge");
}

if (isGamePage && answerTextInput) {
  answerTextInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    if (textAnswerLocked || !activeChallenge || activeChallenge.questionType !== "text") {
      return;
    }

    const typed = answerTextInput.value.trim();
    if (!typed) {
      return;
    }

    textAnswerLocked = true;
    processAnswer(typed);
    setTimeout(() => {
      textAnswerLocked = false;
    }, 120);
  });
}

function renderBranches(zone) {
  const branches = getBranchesForZone(zone.id);
  branchList.innerHTML = "";
  const progress = getProgressSnapshot();
  const zoneProgress = progress.masteryMap.find((item) => item.zoneName === zone.name);
  const branchMasteryLookup = new Map((zoneProgress?.branches || []).map((branch) => [branch.name, branch.mastery]));

  branchPanelLabel.textContent = `Zone: ${zone.name}. Each branch has its own in-quiz boss (HP ${bossMaxHp}).`;
  branchPanel.hidden = false;

  branches.forEach((branch) => {
    const mastery = Number(branchMasteryLookup.get(branch.name) || 0);
    const button = document.createElement("button");
    button.className = "zone-button branch-button branch-progress-button";
    button.type = "button";

    const title = document.createElement("span");
    title.className = "branch-progress-title";
    title.textContent = branch.name.toUpperCase();

    const meter = document.createElement("span");
    meter.className = "branch-progress-meter";

    const fill = document.createElement("span");
    fill.className = "branch-progress-meter-fill";
    fill.style.width = `${mastery}%`;

    const value = document.createElement("span");
    value.className = "branch-progress-meter-value";
    value.textContent = `${mastery}%`;

    meter.appendChild(fill);
    button.appendChild(title);
    button.appendChild(meter);
    button.appendChild(value);

    button.addEventListener("click", () => {
      retriggerAnimation(button, "branch-click");
      startChallenge(zone.id, branch.id);
    });
    branchList.appendChild(button);
  });
}

function renderZones() {
  const zones = getZones();
  const signature = zones.map((zone) => `${zone.id}:${zone.unlocked}`).join("|");
  if (signature === zoneListSignature) {
    return;
  }
  zoneListSignature = signature;
  zoneList.innerHTML = "";
  zones.forEach((zone) => {
    const button = document.createElement("button");
    button.className = "zone-button";
    button.type = "button";
    button.textContent = `${zone.name} Zone${zone.unlocked ? "" : " (Locked)"}`;
    button.title = zone.description;
    button.disabled = !zone.unlocked;
    button.addEventListener("click", () => {
      const selectedZone = enterZone(zone.id);
      if (!selectedZone) {
        return;
      }

      renderBranches(selectedZone);
      renderState();
      renderProgressMap();
      renderBadgePanel();
    });
    zoneList.appendChild(button);
  });
}

if (isGamePage) {
  backButton.addEventListener("click", () => {
    stopElapsedTracking();
    quizSessionStart = null;
    branchPanel.hidden = true;
    bossIndicator.textContent = "";
    answerTextWrap.hidden = true;
    answerTextInput.value = "";
    renderZones();
    renderProgressMap();
    renderBadgePanel();
    showScreen("zone");
  });

  menuToggleButton.addEventListener("click", () => {
    toggleMenu();
  });

  menuResumeButton.addEventListener("click", () => {
    toggleMenu(false);
  });

  menuSfxButton.addEventListener("click", () => {
    sfxEnabled = !sfxEnabled;
    menuSfxButton.textContent = `SFX: ${sfxEnabled ? "On" : "Off"}`;
  });

  menuZonesButton.addEventListener("click", () => {
    toggleMenu(false);
    backButton.click();
  });

  menuRestartButton.addEventListener("click", () => {
    window.location.reload();
  });

  nextBranchYesButton.addEventListener("click", () => {
    if (!pendingNextBranch) {
      showScreen("zone");
      return;
    }

    const { zoneId, branchId } = pendingNextBranch;
    pendingNextBranch = null;
    startChallenge(zoneId, branchId);
  });

  nextBranchNoButton.addEventListener("click", () => {
    const state = getGameState();
    pendingNextBranch = null;
    const selectedZone = state.currentZoneId ? enterZone(state.currentZoneId) : null;
    if (selectedZone) {
      renderBranches(selectedZone);
    }
    renderZones();
    renderState();
    renderProgressMap();
    renderBadgePanel();
    showScreen("zone");
  });

  testUnlockButton.addEventListener("click", () => {
    const unlockedZoneId = unlockOneZoneDebug();
    if (unlockedZoneId) {
      feedback.textContent = `Test unlock successful: ${unlockedZoneId} is now unlocked.`;
      feedback.className = "feedback success";
    } else {
      feedback.textContent = "All zones are already unlocked.";
      feedback.className = "feedback";
    }
    renderZones();
    renderProgressMap();
  });

  exportJsonButton.addEventListener("click", () => {
    const payload = getResearchExportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quizionix-research-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    exportStatus.textContent = "Research JSON exported.";
    exportStatus.className = "content-test-output pass";
  });

  copyJsonButton.addEventListener("click", async () => {
    try {
      const payload = JSON.stringify(getResearchExportData(), null, 2);
      await navigator.clipboard.writeText(payload);
      exportStatus.textContent = "Research JSON copied to clipboard.";
      exportStatus.className = "content-test-output pass";
    } catch (error) {
      exportStatus.textContent = "Clipboard copy failed. Use Export Research JSON instead.";
      exportStatus.className = "content-test-output fail";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !gameMenu.hidden) {
      toggleMenu(false);
      return;
    }

    if (event.key === "Escape" && challengeScreen.classList.contains("active")) {
      backButton.click();
    }
  });

  contentTestButton.addEventListener("click", () => {
    const testResult = runContentSmokeTest();
    const result = testResult.pass
      ? "Content smoke test: PASS (Science/Physics real content and typed rendering available)."
      : "Content smoke test: FAIL (check challenge content setup).";
    contentTestOutput.textContent = result;
    contentTestOutput.className = testResult.pass
      ? "content-test-output pass"
      : "content-test-output fail";
    console.log("quizionix_content_smoke_test", testResult);
  });
}

// The progress map replaces leaderboards with self-referenced growth feedback and motivation.
// It remains synced with KH, adaptive difficulty, branches, and bosses to support learning loops.
// Badges reinforce mastery milestones and exploration without introducing player-vs-player competition.
// Research logging is non-intrusive telemetry only; it observes outcomes without driving rules.
// Export helpers expose anonymized metrics for STEM analysis without collecting personal identifiers.
// Visual feedback helps learners read outcomes quickly while keeping mechanics unchanged.
// These animations are presentation-only and do not alter KH, difficulty, or progression rules.
// Interactive cues (glow/shake/fade/pop-up) improve engagement while preserving research-valid metrics.
// Particle/sound polish reinforces milestones while staying decoupled from adaptive/KH/mastery logic.
// Difficulty + Knowledge Health are visible so learners can track adaptation and regulate effort.
// This frames mistakes as gameplay feedback, turning setbacks into remediation opportunities.
// Branching is visible so learners can explore subtopics intentionally and compare progress paths.
// Showing branch completion in feedback reinforces momentum and learning-path ownership.
// Boss challenges are visible milestone events that mark zone mastery and unlock progression.
// Branch-aware challenges reuse adaptive difficulty + KH for consistent educational system behavior.
// UI orchestration only: progression rules stay in core engines for maintainable adaptive systems.
function initHomePage() {
  if (!document.body.classList.contains("home-page")) {
    return;
  }

  const setHomeView = (viewName) => {
    homeViews.forEach((section) => {
      const match = section.dataset.view === viewName;
      section.hidden = !match;
      section.classList.toggle("active", match);
    });
    // Tabs expose current state via aria-selected so keyboard/screen-reader users get context.
    homeNavLinks.forEach((control) => {
      const selected = control.dataset.viewTarget === viewName;
      control.classList.toggle("active", selected);
      control.setAttribute("aria-selected", String(selected));
    });
  };

  const updateHomePreview = () => {
    if (homePreviewKhFill) {
      homePreviewKhFill.style.width = "100%";
    }
    if (homeStatusKhFill) {
      homeStatusKhFill.style.width = "100%";
      retriggerAnimation(homeStatusKhFill, "kh-pulse");
    }
    if (homeStatusKh) {
      homeStatusKh.textContent = "100/100";
    }
    if (homeStatusMastery) {
      homeStatusMastery.textContent = "0%";
    }
    if (homeStatusDifficulty) {
      homeStatusDifficulty.textContent = "Beginner";
      homeStatusDifficulty.className = "difficulty-pill difficulty-beginner";
    }
  };

  homeNavLinks.forEach((control) => {
    control.addEventListener("click", () => {
      const target = control.dataset.viewTarget;
      if (target) {
        setHomeView(target);
      }
    });
  });

  if (signInForm) {
    signInForm.addEventListener("submit", (event) => {
      event.preventDefault();
      signInFeedback.textContent = "Sign in panel active. Use Play to continue to the game page.";
    });
  }

  if (signUpForm) {
    signUpForm.addEventListener("submit", (event) => {
      event.preventDefault();
      signUpFeedback.textContent = "Sign up panel active. You can continue to Play without backend setup.";
    });
  }

  if (guestInfoButton && guestInfoModal && guestInfoClose) {
    const setGuestModalOpen = (isOpen) => {
      guestInfoModal.hidden = !isOpen;
      guestInfoModal.setAttribute("aria-hidden", String(!isOpen));
    };

    guestInfoButton.addEventListener("click", () => {
      setGuestModalOpen(true);
    });
    guestInfoClose.addEventListener("click", () => {
      setGuestModalOpen(false);
    });
    guestInfoModal.addEventListener("click", (event) => {
      if (event.target === guestInfoModal) {
        setGuestModalOpen(false);
      }
    });
    setGuestModalOpen(false);
  }

  updateHomePreview();
  setHomeView("home");
}

if (isGamePage) {
  renderZones();
  renderState();
  renderProgressMap();
  renderBadgePanel();
  showScreen("zone");
}

initializeVisualPreferences();
initHomePage();


