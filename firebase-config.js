// 1. Firebase console → Project settings → Your apps → Web app → copy the config here.
// 2. Make sure "databaseURL" is included (Realtime Database must be created first).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDKbSb1SIzd9WD0cTV4Xut8BTNIr0vwrKo",
    authDomain: "imposter-8f9db.firebaseapp.com",
    projectId: "imposter-8f9db",
    storageBucket: "imposter-8f9db.firebasestorage.app",
    databaseURL:"https://imposter-8f9db-default-rtdb.firebaseio.com/",
    messagingSenderId: "841935965323",
    appId: "1:841935965323:web:a66747e9aae89fee77188e"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
