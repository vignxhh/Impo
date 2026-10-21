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

function render() {
  const entries = Object.entries(players)
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));

  $("playerCount").textContent = entries.length;
  $("emptyMsg").classList.toggle("hidden", entries.length > 0);
  $("roundInfo").textContent = round ? `Round ${round}` : "No round yet";

  const list = $("playerList");
  list.innerHTML = "";
  entries.forEach(([uid, p]) => {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = p.name;

    const w = words[uid];
    if (w) {
      const tag = document.createElement("span");
      tag.className = "tag" + (w.odd ? " odd" : "");
      tag.textContent = w.word;
      left.appendChild(tag);
    }

    const kick = document.createElement("button");
    kick.className = "ghost small";
    kick.textContent = "Remove";
    kick.onclick = () => removePlayer(uid);

    li.append(left, kick);
    list.appendChild(li);
  });
}

async function removePlayer(uid) {
  await remove(ref(db, `words/${uid}`));
  await remove(ref(db, `players/${uid}`));
}

$("startBtn").onclick = async () => {
  const main = $("wordMain").value.trim();
  const odd = $("wordOdd").value.trim();
  const err = $("hostError");
  err.textContent = "";

  if (!main || !odd) { err.textContent = "Enter both words."; return; }
  if (main.toLowerCase() === odd.toLowerCase()) { err.textContent = "The two words must be different."; return; }

  const uids = Object.keys(players);
  if (uids.length < 2) { err.textContent = "You need at least 2 players."; return; }

  const oddUid = uids[Math.floor(Math.random() * uids.length)];
  const next = round + 1;
  const updates = { "game/round": next, "game/status": "started" };
  uids.forEach((uid) => {
    updates[`words/${uid}`] = {
      word: uid === oddUid ? odd : main,
      odd: uid === oddUid,
      round: next
    };
  });

  try {
    await update(ref(db), updates);
  } catch (e) {
    err.textContent = "Could not start the round. Check your database rules.";
  }
};

$("resetBtn").onclick = async () => {
  $("hostError").textContent = "";
  await remove(ref(db, "words"));
  await set(ref(db, "game/status"), "waiting");
};

$("clearBtn").onclick = async () => {
  if (!confirm("Remove all players and words?")) return;
  await remove(ref(db, "words"));
  await remove(ref(db, "players"));
  await set(ref(db, "game/status"), "waiting");
};

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
