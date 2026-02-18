import { loadState, saveState, setMode, resetGameRuntime } from "./state.js";
import { registerUser, loginUser, playAsGuest, logoutUser } from "./auth.js";
import { getQuestion, getQuestionCount, evaluateAnswer } from "./gameEngine.js";
import { flashFeedback, selectAnswerButton, setMeterWidth } from "./uiEngine.js";

const state = loadState();
const ALLOWED_EMAIL = "cgbolivar7522qc@student.fatima.edu.ph";
const PROTECTED_PAGES = ["dashboard", "game", "progress", "result"];
const TRANSITION_PAGES = ["index.html", "frontpage.html", "login.html", "register.html"];
let currentIndex = 0;
let selectedAnswer = "";

function initPageTransitions() {
  document.body.classList.add("page-enter");
  requestAnimationFrame(() => {
    document.body.classList.add("page-enter-active");
  });

  document.querySelectorAll("a[href]").forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(href, window.location.href);
      const isTransitionTarget = TRANSITION_PAGES.some((name) => url.pathname.endsWith(name));
      if (!isTransitionTarget) return;
      if (url.href === window.location.href) return;

      event.preventDefault();
      document.body.classList.remove("page-enter-active");
      document.body.classList.add("page-leave");
      setTimeout(() => {
        window.location.href = url.href;
      }, 220);
    });
  });
}

function initLoadingPage(page) {
  if (page !== "loading") return;
  setTimeout(() => {
    window.location.href = "frontpage.html";
  }, 5000);
}

function guardProtectedPage(page) {
  if (PROTECTED_PAGES.includes(page) && !state.auth.isAuthenticated) {
    window.location.href = "login.html";
  }
}

function hydrateResearchExports() {
  window.getQuizionixResearchLog = () => ({
    timestamp: new Date().toISOString(),
    player: state.player,
    game: state.game,
    lastResult: state.lastResult
  });

  window.getQuizionixResearchExport = () => JSON.stringify(window.getQuizionixResearchLog(), null, 2);
}

function renderBadgeList(containerId) {
  const host = document.getElementById(containerId);
  if (!host) return;

  host.innerHTML = "";
  const badges = state.game.badges;
  if (!badges.length) {
    const chip = document.createElement("span");
    chip.className = "badge-chip";
    chip.textContent = "No badges yet";
    host.appendChild(chip);
    return;
  }

  badges.forEach((badge) => {
    const chip = document.createElement("span");
    chip.className = "badge-chip";
    chip.textContent = badge;
    host.appendChild(chip);
  });
}

function initHome() {
  const guestBtn = document.getElementById("guest-btn");
  const banner = document.getElementById("guest-banner");
  const close = document.getElementById("guest-close");

  if (!guestBtn || !banner || !close) return;

  guestBtn.addEventListener("click", () => {
    playAsGuest(state);
    saveState(state);
    banner.hidden = false;
  });

  close.addEventListener("click", () => {
    banner.hidden = true;
    window.location.href = "dashboard.html";
  });
}

function initLogin() {
  const form = document.getElementById("login-form");
  const msg = document.getElementById("login-msg");
  const password = document.getElementById("login-password");
  const toggle = document.getElementById("toggle-login-password");
  const forgot = document.getElementById("forgot-password");
  if (!form || !msg || !password || !toggle || !forgot) return;

  toggle.addEventListener("click", () => {
    const isHidden = password.type === "password";
    password.type = isHidden ? "text" : "password";
    if (!toggle.classList.contains("icon-eye")) {
      toggle.textContent = isHidden ? "Hide" : "Show";
    }
  });

  forgot.addEventListener("click", (event) => {
    event.preventDefault();
    msg.textContent = "Reset is not active yet. Contact admin support.";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const payload = {
      email,
      password: password.value
    };

    if (email !== ALLOWED_EMAIL) {
      msg.textContent = "Use your Fatima school email only.";
      return;
    }

    const result = loginUser(state, payload);
    msg.textContent = result.message;
    if (!result.ok) return;
    setTimeout(() => { window.location.href = "dashboard.html"; }, 500);
  });
}

function initRegister() {
  const form = document.getElementById("register-form");
  const msg = document.getElementById("register-msg");
  const password = document.getElementById("reg-password");
  const confirmPassword = document.getElementById("reg-confirm-password");
  const togglePassword = document.getElementById("toggle-reg-password");
  const toggleConfirm = document.getElementById("toggle-reg-confirm");
  if (!form || !msg) return;

  if (password && togglePassword) {
    togglePassword.addEventListener("click", () => {
      password.type = password.type === "password" ? "text" : "password";
    });
  }
  if (confirmPassword && toggleConfirm) {
    toggleConfirm.addEventListener("click", () => {
      confirmPassword.type = confirmPassword.type === "password" ? "text" : "password";
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = {
      name: document.getElementById("reg-name").value.trim(),
      email: document.getElementById("reg-email").value.trim(),
      password: document.getElementById("reg-password").value,
      confirmPassword: document.getElementById("reg-confirm-password").value
    };

    const result = registerUser(state, payload);
    msg.textContent = result.message;
    if (!result.ok) return;
    setTimeout(() => { window.location.href = "dashboard.html"; }, 500);
  });
}

function initDashboard() {
  const welcome = document.getElementById("welcome-user");
  const avatar = document.getElementById("player-avatar");
  const level = document.getElementById("hud-level");
  const mastery = document.getElementById("hud-mastery");
  const badges = document.getElementById("hud-badges");
  const logout = document.getElementById("logout-btn");

  if (welcome) welcome.textContent = `Hello ${state.player.name}`;
  if (avatar) avatar.textContent = state.player.avatar || "Q";
  if (level) level.textContent = String(Math.max(1, Math.floor(state.game.xp / 100) + 1));
  if (mastery) mastery.textContent = `${state.game.mastery}%`;
  if (badges) badges.textContent = String(state.game.badges.length);
  renderBadgeList("dashboard-badges");

  if (logout) {
    logout.addEventListener("click", () => {
      logoutUser(state);
      window.location.href = "index.html";
    });
  }

  document.querySelectorAll(".mode-card").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".mode-card").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      setMode(state, button.dataset.mode || "quiz");
      saveState(state);
    });

    if (button.dataset.mode === state.game.mode) {
      button.classList.add("active");
    }
  });
}

function renderQuestion() {
  const title = document.getElementById("q-title");
  const text = document.getElementById("q-text");
  const optionsWrap = document.getElementById("answer-options");
  const progress = document.getElementById("question-progress");

  const question = getQuestion(currentIndex);
  if (title) title.textContent = `Challenge ${currentIndex + 1}`;
  if (text) text.textContent = question.prompt;
  if (!optionsWrap || !progress) return;

  optionsWrap.innerHTML = "";
  selectedAnswer = "";

  question.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-btn";
    btn.textContent = option;
    btn.addEventListener("click", () => {
      selectedAnswer = option;
      selectAnswerButton(optionsWrap, btn);
    });
    optionsWrap.appendChild(btn);
  });

  setMeterWidth(progress, ((currentIndex + 1) / getQuestionCount()) * 100);
}

function syncGameHud() {
  const gZone = document.getElementById("g-zone");
  const gBranch = document.getElementById("g-branch");
  const gDiff = document.getElementById("g-difficulty");
  const gMastery = document.getElementById("g-mastery");
  const gKh = document.getElementById("g-kh");
  const points = document.getElementById("points");

  if (gZone) gZone.textContent = state.game.zone;
  if (gBranch) gBranch.textContent = state.game.branch;
  if (gDiff) gDiff.textContent = state.game.difficulty;
  if (gMastery) gMastery.textContent = `${state.game.mastery}%`;
  if (gKh) gKh.textContent = String(state.game.knowledgeHealth);
  if (points) points.textContent = `Points: ${state.game.points}`;
}

function initGame() {
  resetGameRuntime(state);
  saveState(state);

  const prev = document.getElementById("prev-btn");
  const next = document.getElementById("next-btn");
  const submit = document.getElementById("submit-btn");
  const feedback = document.getElementById("feedback");
  const hint = document.getElementById("hint");
  const branchBtn = document.getElementById("branch-btn");
  const bossBtn = document.getElementById("boss-btn");

  renderQuestion();
  syncGameHud();

  if (branchBtn) {
    branchBtn.addEventListener("click", () => {
      state.game.branch = state.game.branch === "Branch 1" ? "Branch 2" : "Branch 1";
      saveState(state);
      syncGameHud();
    });
  }

  if (bossBtn) {
    bossBtn.addEventListener("click", () => {
      if (!state.game.bossCleared && state.game.branchClears < 5) {
        flashFeedback(feedback, false, "Boss locked: clear 5 branch wins first.");
        return;
      }
      flashFeedback(feedback, true, "Boss node active. Good luck.");
    });
  }

  if (prev) {
    prev.addEventListener("click", () => {
      currentIndex = Math.max(0, currentIndex - 1);
      renderQuestion();
    });
  }

  if (next) {
    next.addEventListener("click", () => {
      currentIndex = Math.min(getQuestionCount() - 1, currentIndex + 1);
      renderQuestion();
    });
  }

  if (submit && feedback) {
    submit.addEventListener("click", () => {
      if (!selectedAnswer) {
        flashFeedback(feedback, false, "Select an answer first.");
        return;
      }

      const question = getQuestion(currentIndex);
      const result = evaluateAnswer(state, question, selectedAnswer);
      flashFeedback(
        feedback,
        result.isCorrect,
        result.isCorrect ? "Correct! Great job." : "Incorrect. Review and retry."
      );

      if (hint) {
        hint.textContent = result.isCorrect
          ? "Hint: Keep your streak alive for harder tiers and more XP."
          : `Hint: The correct answer was "${question.answer}".`;
      }

      state.progress.zones[0].branches[0].mastery = state.game.mastery;
      if (state.game.bossCleared) state.progress.zones[1].unlocked = true;

      state.lastResult = {
        points: result.points,
        kh: result.knowledgeHealth,
        mastery: result.mastery,
        difficulty: result.difficulty,
        correct: state.game.correctAnswers,
        wrong: state.game.wrongAnswers,
        branchClears: result.branchClears,
        bossCleared: result.bossCleared,
        badges: result.badges
      };
      saveState(state);
      syncGameHud();
    });
  }
}

function initResult() {
  const result = state.lastResult;
  if (!result) return;

  const summary = document.getElementById("result-summary");
  const score = document.getElementById("result-score");
  const kh = document.getElementById("result-kh");
  const diff = document.getElementById("result-difficulty");
  const branch = document.getElementById("result-branch");
  const badges = document.getElementById("result-badges");

  if (summary) summary.textContent = `Mode: ${state.game.mode} | Points: ${result.points}`;
  if (score) score.textContent = `Correct/Wrong: ${result.correct}/${result.wrong}`;
  if (kh) kh.textContent = `KH: ${result.kh}`;
  if (diff) diff.textContent = `Difficulty Reached: ${result.difficulty}`;
  if (branch) {
    branch.textContent = `Branch Clears: ${result.branchClears} | Boss: ${result.bossCleared ? "Cleared" : "Pending"}`;
  }
  if (badges) {
    badges.textContent = `Badges Earned: ${result.badges.length ? result.badges.join(", ") : "None yet"}`;
  }
}

function renderMasteryMap() {
  const host = document.getElementById("mastery-map");
  if (!host) return;
  host.innerHTML = "";

  state.progress.zones.forEach((zone) => {
    const box = document.createElement("div");
    box.className = "mastery-zone";

    const heading = document.createElement("h3");
    heading.textContent = `${zone.name}${zone.unlocked ? "" : " (Locked)"}`;
    box.appendChild(heading);

    zone.branches.forEach((branch) => {
      const node = document.createElement("p");
      node.className = "mastery-branch";
      node.textContent = `${branch.name}: ${branch.mastery}%`;
      if (!zone.unlocked) node.style.opacity = "0.55";
      box.appendChild(node);
    });

    host.appendChild(box);
  });
}

function renderKhChart() {
  const polyline = document.getElementById("kh-polyline");
  if (!polyline) return;

  const values = state.game.khHistory.length ? state.game.khHistory : [state.game.knowledgeHealth];
  const width = 320;
  const height = 120;
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * (width - 8) + 4;
    const y = ((100 - value) / 100) * (height - 10) + 5;
    return `${x},${y}`;
  });

  polyline.setAttribute("points", points.join(" "));
}

function initProgress() {
  const xp = document.getElementById("p-xp");
  const kh = document.getElementById("p-kh");
  const difficulty = document.getElementById("p-difficulty");
  const mastery = document.getElementById("p-mastery");
  const meter = document.getElementById("p-meter");
  const exportBtn = document.getElementById("export-json");
  const copyBtn = document.getElementById("copy-json");
  const exportMsg = document.getElementById("export-msg");

  if (xp) xp.textContent = String(state.game.xp);
  if (kh) kh.textContent = String(state.game.knowledgeHealth);
  if (difficulty) difficulty.textContent = state.game.difficulty;
  if (mastery) mastery.textContent = `${state.game.mastery}%`;
  if (meter) setMeterWidth(meter, state.game.mastery);

  renderMasteryMap();
  renderKhChart();
  renderBadgeList("progress-badges");

  if (exportBtn && exportMsg) {
    exportBtn.addEventListener("click", () => {
      exportMsg.textContent = window.getQuizionixResearchExport();
    });
  }

  if (copyBtn && exportMsg) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.getQuizionixResearchExport());
        exportMsg.textContent = "JSON copied to clipboard.";
      } catch {
        exportMsg.textContent = "Clipboard access blocked in this browser context.";
      }
    });
  }
}

const page = document.body.dataset.page;
initLoadingPage(page);
initPageTransitions();
guardProtectedPage(page);
hydrateResearchExports();

if (page === "home") initHome();
if (page === "login") initLogin();
if (page === "register") initRegister();
if (page === "dashboard") initDashboard();
if (page === "game") initGame();
if (page === "result") initResult();
if (page === "progress") initProgress();
