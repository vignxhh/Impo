import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref, update, remove, set, onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const $ = (id) => document.getElementById(id);
const views = ["loading", "loginView", "hostView"];
function show(name) {
  views.forEach((v) => $(v).classList.toggle("hidden", v !== name));
}

let unsubs = [];
let players = {};
let words = {};
let round = 0;
let pendingOdd = null;   // uid chosen by Shuffle
let shuffling = false;

const PALETTE = ["#ff9fb7", "#8ee8b4", "#7fcdff", "#ffbe7a", "#cfa8ff", "#f6e27a"];
function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

onAuthStateChanged(auth, (user) => {
  unsubs.forEach((u) => u());
  unsubs = [];
  if (user && !user.isAnonymous) {
    show("hostView");
    listen();
  } else {
    show("loginView");
  }
});

function listen() {
  unsubs.push(onValue(ref(db, "players"), (s) => { players = s.val() || {}; render(); }));
  unsubs.push(onValue(ref(db, "words"), (s) => { words = s.val() || {}; render(); }));
  unsubs.push(onValue(ref(db, "game/round"), (s) => { round = s.val() || 0; render(); }));
}

function sortedPlayers() {
  return Object.entries(players)
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
}

function render() {
  const entries = sortedPlayers();

  // The shuffled player left: shuffle result is no longer valid
  if (pendingOdd && !players[pendingOdd] && !shuffling) pendingOdd = null;

  $("playerCount").textContent = entries.length;
  $("emptyMsg").classList.toggle("hidden", entries.length > 0);
  $("roundInfo").textContent = round ? `Round ${round}` : "No round yet";

  const list = $("playerList");
  list.innerHTML = "";
  entries.forEach(([uid, p]) => {
    const li = document.createElement("li");
    li.className = "chip" + (uid === pendingOdd && !shuffling ? " picked" : "");
    li.dataset.uid = uid;

    const av = document.createElement("span");
    av.className = "avatar";
    av.style.background = colorFor(p.name);
    av.textContent = p.name.charAt(0).toUpperCase();

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = p.name;

    li.append(av, name);

    const w = words[uid];
    if (w) {
      const tag = document.createElement("span");
      tag.className = "tag" + (w.odd ? " odd" : "");
      tag.textContent = w.word;
      li.appendChild(tag);
    }

    const kick = document.createElement("button");
    kick.className = "x";
    kick.setAttribute("aria-label", `Remove ${p.name}`);
    kick.textContent = "×";
    kick.onclick = () => removePlayer(uid);
    li.appendChild(kick);

    list.appendChild(li);
  });

  updateControls();
}

function updateControls() {
  const count = Object.keys(players).length;
  const box = $("pickBox");

  $("shuffleBtn").disabled = shuffling || count < 2;
  $("shuffleBtn").textContent = pendingOdd ? "Shuffle again" : "Shuffle players";
  $("startBtn").disabled = shuffling || !pendingOdd;

  box.classList.remove("done", "muted");
  if (shuffling) {
    box.textContent = "Shuffling…";
  } else if (pendingOdd && players[pendingOdd]) {
    box.classList.add("done");
    box.textContent = `${players[pendingOdd].name} gets the odd word`;
  } else {
    box.classList.add("muted");
    box.textContent = count < 2 ? "Waiting for at least 2 players" : "Not shuffled yet";
  }
}

async function removePlayer(uid) {
  await remove(ref(db, `words/${uid}`));
  await remove(ref(db, `players/${uid}`));
}

/* ---------- Shuffle ---------- */
$("shuffleBtn").onclick = () => {
  const uids = sortedPlayers().map(([uid]) => uid);
  if (shuffling || uids.length < 2) return;

  $("hostMsg").textContent = "";
  pendingOdd = null;

  const finalIdx = Math.floor(Math.random() * uids.length);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce) {
    pendingOdd = uids[finalIdx];
    render();
    return;
  }

  shuffling = true;
  render();

  const total = 14;
  const n = uids.length;
  const startIdx = (((finalIdx - (total - 1)) % n) + n) % n;
  let i = 0;

  const tick = () => {
    document.querySelectorAll(".chip.spin").forEach((el) => el.classList.remove("spin"));
    const uid = uids[(startIdx + i) % n];
    const el = document.querySelector(`.chip[data-uid="${uid}"]`);
    if (el) el.classList.add("spin");

    if (i === total - 1) {
      shuffling = false;
      pendingOdd = players[uids[finalIdx]] ? uids[finalIdx] : null;
      render();
      return;
    }
    i++;
    setTimeout(tick, 50 + i * i * 0.5); 
  };
  tick();
};

/* ---------- Start / end round ---------- */
$("startBtn").onclick = async () => {
  const main = $("wordMain").value.trim();
  const odd = $("wordOdd").value.trim();
  const msg = $("hostMsg");
  msg.className = "error";
  msg.textContent = "";

  if (!main || !odd) { msg.textContent = "Enter both words in step 1."; return; }
  if (main.toLowerCase() === odd.toLowerCase()) { msg.textContent = "The two words must be different."; return; }
  if (!pendingOdd || !players[pendingOdd]) { msg.textContent = "Shuffle the players first."; return; }

  const next = round + 1;
  const updates = { "game/round": next, "game/status": "started" };
  Object.keys(players).forEach((uid) => {
    const isOdd = uid === pendingOdd;
    updates[`words/${uid}`] = { word: isOdd ? odd : main, odd: isOdd, round: next };
  });

  try {
    await update(ref(db), updates);
    pendingOdd = null;
    render();
    msg.className = "ok";
    msg.textContent = `Round ${next} started. Words sent.`;
  } catch (e) {
    msg.textContent = "Could not start the round. Check your database rules.";
  }
};

$("resetBtn").onclick = async () => {
  const msg = $("hostMsg");
  msg.className = "ok";
  msg.textContent = "Round ended.";
  await remove(ref(db, "words"));
  await set(ref(db, "game/status"), "waiting");
};

$("clearBtn").onclick = async () => {
  if (!confirm("Remove all players and words?")) return;
  pendingOdd = null;
  await remove(ref(db, "words"));
  await remove(ref(db, "players"));
  await set(ref(db, "game/status"), "waiting");
};

/* ---------- Login ---------- */
$("loginBtn").onclick = async () => {
  $("loginError").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (e) {
    $("loginError").textContent = "Wrong email or password.";
  }
};
$("password").onkeydown = (e) => { if (e.key === "Enter") $("loginBtn").click(); };

$("logoutBtn").onclick = () => signOut(auth);
