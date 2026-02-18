import { saveState, setAuth, setPlayer } from "./state.js";

const ALLOWED_EMAIL = "cgbolivar7522qc@student.fatima.edu.ph";

export function registerUser(state, payload) {
  const { name, email, password, confirmPassword } = payload;

  if (!name || !email || !password || !confirmPassword) {
    return { ok: false, message: "Complete all required fields." };
  }
  if (email !== ALLOWED_EMAIL) {
    return { ok: false, message: "Use your Fatima school email only." };
  }
  if (password !== confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }

  const existing = state.users.find((user) => user.email === email);
  if (existing) {
    return { ok: false, message: "Account already exists. Please sign in." };
  }

  state.users.push({ name, email, password });
  setAuth(state, true);
  setPlayer(state, { name, email, guest: false, avatar: (name[0] || "Q").toUpperCase() });
  saveState(state);
  return { ok: true, message: "Account created. Redirecting..." };
}

export function loginUser(state, payload) {
  const { email, password } = payload;
  if (email !== ALLOWED_EMAIL) {
    return { ok: false, message: "Use your Fatima school email only." };
  }

  const user = state.users.find((item) => item.email === email);
  if (!user) {
    return { ok: false, message: "No account found for this email. Register first." };
  }
  if (user.password !== password) {
    return { ok: false, message: "Invalid password." };
  }

  setAuth(state, true);
  const name = user.name || email.split("@")[0] || "Player";
  setPlayer(state, { name, email, guest: false, avatar: (name[0] || "Q").toUpperCase() });
  saveState(state);
  return { ok: true, message: "Signed in. Redirecting..." };
}

export function playAsGuest(state) {
  setAuth(state, true);
  setPlayer(state, { name: "Guest", email: "", guest: true, avatar: "G" });
  saveState(state);
}

export function logoutUser(state) {
  setAuth(state, false);
  setPlayer(state, { name: "Guest", email: "", guest: true, avatar: "G" });
  saveState(state);
}
