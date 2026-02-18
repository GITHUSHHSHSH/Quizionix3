const STORAGE_KEY = "quizionix_state_v1";

const defaultState = {
  auth: {
    isAuthenticated: false
  },
  player: {
    name: "Guest",
    email: "",
    guest: true,
    avatar: "QX"
  },
  game: {
    mode: "quiz",
    zone: "Zone 1",
    branch: "Branch 1",
    difficulty: "Beginner",
    knowledgeHealth: 100,
    xp: 0,
    mastery: 0,
    correctStreak: 0,
    wrongStreak: 0,
    points: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    badges: [],
    branchClears: 0,
    bossCleared: false,
    khHistory: [100]
  },
  progress: {
    zones: [
      { name: "Zone 1", branches: [{ name: "Branch 1", mastery: 0 }, { name: "Branch 2", mastery: 0 }], unlocked: true },
      { name: "Zone 2", branches: [{ name: "Branch 1", mastery: 0 }, { name: "Branch 2", mastery: 0 }], unlocked: false }
    ]
  },
  lastResult: null,
  users: []
};

function safeClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return safeClone(defaultState);
    return { ...safeClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return safeClone(defaultState);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetGameRuntime(state) {
  state.game.correctStreak = 0;
  state.game.wrongStreak = 0;
  state.game.points = 0;
  state.game.totalQuestions = 0;
  state.game.correctAnswers = 0;
  state.game.wrongAnswers = 0;
  state.game.branchClears = 0;
  state.game.bossCleared = false;
  state.game.khHistory = [state.game.knowledgeHealth];
  return state;
}

export function setPlayer(state, player) {
  state.player = { ...state.player, ...player };
  return state;
}

export function setAuth(state, isAuthenticated) {
  state.auth.isAuthenticated = Boolean(isAuthenticated);
  return state;
}

export function setMode(state, mode) {
  state.game.mode = mode;
  return state;
}
