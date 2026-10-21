import { auth, db } from "./firebase-config.js";
import {
  signInAnonymously, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref, set, remove, onValue, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const $ = (id) => document.getElementById(id);
const views = ["loading", "hostBlock", "joinView", "gameView"];
function show(name) {
  views.forEach((v) => $(v).classList.toggle("hidden", v !== name));
}

let unsubs = [];
let lastWord = null;

onAuthStateChanged(auth, (user) => {
  unsubs.forEach((u) => u());
  unsubs = [];

  if (!user) {
    signInAnonymously(auth).catch((e) => {
      $("loading").innerHTML = `<p class="error">Could not connect: ${e.code}. Check your Firebase setup.</p>`;
    });
    return;
  }
  if (!user.isAnonymous) {
    show("hostBlock");
    return;
  }
  start(user.uid);
});

function start(uid) {
  let joined = null;   // player record or null
  let wordData = null; // word record or null

  unsubs.push(onValue(ref(db, `players/${uid}`), (snap) => {
    joined = snap.val();
    render();
  }));
  unsubs.push(onValue(ref(db, `words/${uid}`), (snap) => {
    wordData = snap.val();
    render();
  }));

  function render() {
    if (!joined) {
      show("joinView");
      lastWord = null;
      return;
    }
    show("gameView");
    $("playerName").textContent = joined.name;

    if (wordData && wordData.word) {
      $("waiting").classList.add("hidden");
      $("wordWrap").classList.remove("hidden");
      $("roundTag").classList.remove("hidden");
      $("roundTag").textContent = `Round ${wordData.round}`;
      $("word").textContent = wordData.word;

      // New round: show the word uncovered with a small pop
      const key = `${wordData.round}:${wordData.word}`;
      if (key !== lastWord) {
        lastWord = key;
        $("wordCard").classList.remove("covered");
        $("wordCard").classList.remove("pulse");
        void $("wordCard").offsetWidth;
        $("wordCard").classList.add("pulse");
        if (navigator.vibrate) navigator.vibrate(120);
      }
    } else {
      lastWord = null;
      $("waiting").classList.remove("hidden");
      $("wordWrap").classList.add("hidden");
      $("roundTag").classList.add("hidden");
    }
  }

  $("joinBtn").onclick = async () => {
    const name = $("name").value.trim();
    $("joinError").textContent = "";
    if (!name) { $("joinError").textContent = "Please enter your name."; return; }
    try {
      await set(ref(db, `players/${uid}`), { name, joinedAt: serverTimestamp() });
    } catch (e) {
      $("joinError").textContent = "Could not join. Please try again.";
    }
  };
  $("name").onkeydown = (e) => { if (e.key === "Enter") $("joinBtn").click(); };

  $("leaveBtn").onclick = async () => {
    await remove(ref(db, `words/${uid}`)).catch(() => {});
    await remove(ref(db, `players/${uid}`)).catch(() => {});
  };
}

// Tap / keyboard toggle to hide the word
const card = $("wordCard");
const toggle = () => card.classList.toggle("covered");
card.addEventListener("click", toggle);
card.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
});

$("signOutHost").onclick = () => signOut(auth);
