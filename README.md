# Word Imposter

A static web game: one host, many players. The host sends two words (e.g. `bike` and `car`). One random player gets the odd word, everyone else gets the other. Words arrive instantly via Firebase Realtime Database.

- Players open `index.html`
- Host opens `host.html`

## Files

| File | Purpose |
|---|---|
| `index.html`, `app.js` | Player page: join by name, see your word |
| `host.html`, `host.js` | Host page: login, player list, start/end round |
| `style.css` | Shared styles |
| `firebase-config.js` | Your Firebase keys (edit this) |
| `database.rules.json` | Security rules (edit the host email, then paste into Firebase) |

## Setup

1. **Create a Firebase project** at https://console.firebase.google.com
2. **Add a Web app** (the `</>` icon) and copy its config into `firebase-config.js`.
3. **Create a Realtime Database** (Build → Realtime Database → Create). Copy its URL into `databaseURL` if it is missing from the config.
4. **Enable sign-in methods** (Build → Authentication → Sign-in method):
   - Anonymous
   - Email/Password
5. **Create the host account**: Authentication → Users → Add user. Use your email and a strong password.
6. **Set the rules**: open `database.rules.json`, replace every `YOUR_HOST_EMAIL` with the host email from step 5, then paste the file into Realtime Database → Rules → Publish.
7. **Deploy**: Firebase Hosting (`firebase deploy`) or GitHub Pages. Add your site domain under Authentication → Settings → Authorized domains if it is not listed.

## Data layout

```
players/{uid}  → { name, joinedAt }
words/{uid}    → { word, odd, round }
game           → { round, status }
```

## Security

- A player can read only their own `players/{uid}` and `words/{uid}`, so nobody can read other people’s words from the browser console.
- Only the host can write words, read the full player list, or start rounds.
- A player can delete their own word (used by “Leave game”).

## Using it

1. Share the player link (`.../index.html`) with everyone. Players type a name and join.
2. Host signs in at `.../host.html`, types the two words and presses **Start round**.
3. Each player’s screen shows their word immediately. The host sees which player got the odd word.
4. **End round** clears the words. Start again with new words any time.

## Notes

- The host and players cannot share one browser session. Test the host page in a different browser or a private window.
- Players who join during a round wait for the next one.
