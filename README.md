# Doodle Dash 🎨

A production-quality, real-time multiplayer **draw-and-guess** web game (Skribbl-style). Create a room, invite friends, draw on canvas, and race to guess the word.

## Features

- Real-time drawing & guessing with live scoreboard
- Private rooms with invite links
- Custom word lists, configurable rounds & turn timers
- Drawing tools: brush, eraser, fill bucket, undo
- Close-guess detection, crown for the current leader
- End-game podium with top 3 rankings
- Fully responsive UI built with Tailwind CSS

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Real-time | **Pusher Channels** (free tier) |
| Client state | Zustand |
| Canvas | Native HTML5 Canvas API |
| Styling | Tailwind CSS |
| Validation | Zod |
| Deployment | Vercel (free tier) |

### Why Pusher Channels?

This project uses **Pusher Channels' free tier** instead of a self-hosted WebSocket server. Managed pub/sub gives you connection persistence, automatic reconnection, and fan-out without running separate infrastructure — a good fit for Vercel's serverless model.

## Design Decisions & Tradeoffs

**Room state: Redis on Vercel, in-memory locally.** On Vercel, serverless functions can run on many instances at once — a plain in-memory `Map` means players in the same room may hit different servers and not see each other. **Production deploys should set Upstash Redis** (`KV_REST_API_URL` + `KV_REST_API_TOKEN`) so every instance reads/writes the same room. Local dev works without Redis (single Node process).

**Browser session persistence.** Your player id, name, avatar, and session token are saved in `localStorage` so refresh or reopening the invite link can reconnect you to the same seat when the room still exists.

**No accounts.** Names, scores, and room data exist only for the lifetime of an active room (max 2 hours TTL).

## Getting Started (Local)

### 1. Clone & install

```bash
git clone <your-repo-url>
cd doodle-dash
npm install
```

### 2. Create a free Pusher account

1. Sign up at [pusher.com](https://pusher.com)
2. Create a **Channels** app
3. Copy **App ID**, **Key**, **Secret**, and **Cluster** from App Keys

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap2

NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap2

SESSION_SECRET=generate-a-long-random-string-here
```

> `NEXT_PUBLIC_*` vars are exposed to the browser. Secrets stay server-side.  
> `PUSHER_KEY` must equal `NEXT_PUBLIC_PUSHER_KEY` (and clusters must match).

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Verify config: [http://localhost:3000/api/health](http://localhost:3000/api/health) should return `{ "ok": true }`.

---

## Deploy to Vercel

### What you need

| Requirement | Details |
|-------------|---------|
| **GitHub repo** | Push this project to GitHub |
| **Vercel account** | Free tier works — [vercel.com](https://vercel.com) |
| **Pusher Channels app** | Free tier (~200k messages/day) — [pusher.com](https://pusher.com) |
| **Upstash Redis** | Free tier — [console.upstash.com](https://console.upstash.com) (required for reliable multiplayer on Vercel) |
| **9 env vars** | Listed below — add in Vercel project settings |

### Step-by-step

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import in Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework preset: **Next.js** (auto-detected)
   - Root directory: `.` (default)
   - Build command: `npm run build` (default)
   - Install command: `npm install` (default)

3. **Add environment variables** (Project → Settings → Environment Variables)

   Add all of these for **Production**, **Preview**, and **Development**:

   | Name | Value | Sensitive |
   |------|-------|-----------|
   | `PUSHER_APP_ID` | From Pusher dashboard | Yes |
   | `PUSHER_KEY` | From Pusher dashboard | Yes |
   | `PUSHER_SECRET` | From Pusher dashboard | Yes |
   | `PUSHER_CLUSTER` | e.g. `ap2`, `us2`, `eu` | No |
   | `NEXT_PUBLIC_PUSHER_KEY` | Same as `PUSHER_KEY` | No |
   | `NEXT_PUBLIC_PUSHER_CLUSTER` | Same as `PUSHER_CLUSTER` | No |
   | `SESSION_SECRET` | Random 32+ char string | Yes |
   | `KV_REST_API_URL` | Upstash REST URL | Yes |
   | `KV_REST_API_TOKEN` | Upstash REST token | Yes |

4. **Deploy**
   - Click **Deploy**
   - Wait for the build to finish

5. **Verify**
   - Visit `https://your-app.vercel.app/api/health` → should show `{ "ok": true, "persistence": "redis" }`
   - If `"persistence": "memory"`, Redis env vars are missing — players may not see each other until refresh
   - Open the app, create a room, open the invite link in another browser/tab
   - Draw and guess to confirm Pusher realtime works

### Optional: region tuning

`vercel.json` pins serverless functions to **Mumbai (`bom1`)** by default — good if your Pusher cluster is `ap2` (Asia Pacific). Change the region in `vercel.json` if your players are elsewhere:

```json
"regions": ["iad1"]
```

Common regions: `iad1` (US East), `sfo1` (US West), `bom1` (India), `sin1` (Singapore).

### Pusher dashboard checklist

In your Pusher app settings, confirm:

- **Client events**: disabled (not used)
- **Authorized connections**: enabled (required for private channels)
- App is on the **Channels** product (not Beams)

### After deploy

- Share your Vercel URL — room invite links use the current domain automatically
- Redeploying clears in-memory caches; Redis-backed rooms survive across instances (still subject to 2h TTL)
- Free Pusher tier limits: ~200k messages/day, 100 concurrent connections

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Health check returns 503 | Missing or mismatched env vars in Vercel |
| "Room not found" right after create | Redis not configured — add `KV_REST_API_*` and redeploy; check `/api/health` |
| Players only appear after refresh | Same as above; lobby also polls every 8s as a fallback |
| Kicked on refresh / expired invite | Should auto-reconnect via saved session; ensure Redis + `SESSION_SECRET` are set |
| Drawing not syncing | Check Pusher credentials; open browser console for Pusher errors |
| Can't subscribe to channel | Ensure `SESSION_SECRET` is set and `/api/pusher/auth` returns 200 |

---

## How to Play

1. Enter a display name and pick a character
2. **Create Room** — configure rounds, players, words, and timer
3. Share the invite link with friends
4. Owner clicks **Start Game**
5. Each turn: drawer picks a word → draws → others guess in chat
6. Score points for fast correct guesses; drawer earns points when others guess
7. After all rounds, see the final podium 🏆

## Project Structure

```
app/
  page.tsx                 Landing (name + avatar)
  create/page.tsx          Room settings
  room/[roomId]/page.tsx   Waiting room + game
  api/room/                Create, join, action routes
  api/pusher/auth/         Private channel auth
  api/health/              Deployment health check
components/                Canvas, chat, scoreboard, etc.
lib/                       Room logic, scoring, realtime, store
public/avatars/            Character PNG assets
vercel.json                Vercel deployment config
```

## License

MIT
