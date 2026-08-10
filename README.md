# Doodle Dash 🎨

A production-quality, real-time multiplayer **draw-and-guess** web game (Skribbl-style). Create a room, invite friends, draw on canvas, and race to guess the word.

![Doodle Dash gameplay placeholder — add a GIF/screenshot after playing locally](public/avatars/cat.svg)

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

This project uses **Pusher Channels' free tier** instead of a self-hosted WebSocket server or Vercel's WebSocket beta. Managed pub/sub gives you connection persistence, automatic reconnection, and fan-out without running separate infrastructure — a better fit for a casual multiplayer game on Vercel's serverless model.

## Design Decisions & Tradeoffs

**In-memory game state only.** Rooms live in a server-side `Map` — no database, Redis, or KV store. This keeps hosting free and the codebase simple, but state is lost when the Vercel serverless instance recycles or redeploys. Acceptable for a casual party game; not suitable for persistent leaderboards.

**No auth or persistence by design.** Every visit is a fresh player. Names, scores, and room data exist only for the lifetime of an active room (max 2 hours TTL).

**Security measures:**
- Server-authoritative turns, scoring, and word secrecy
- Zod validation on every API action
- HTML/script sanitization on all user text
- Per-player rate limiting (drawing ~50/sec, guesses ~5/sec)
- Private Pusher channels with membership auth
- Random 8-character room IDs

## Getting Started

### 1. Clone & install

```bash
git clone <your-repo-url>
cd doodle-dash
npm install
```

### 2. Create a free Pusher account

1. Sign up at [pusher.com](https://pusher.com)
2. Create a **Channels** app
3. Copy your credentials

### 3. Environment variables

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

Fill in:

```env
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster

NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster
```

> Only `NEXT_PUBLIC_*` vars are exposed to the browser. Secrets stay server-side.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push the repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add the same environment variables in **Project Settings → Environment Variables**
4. Deploy

The app runs entirely on Vercel's free tier + Pusher's free tier (~200k messages/day).

## How to Play

1. Enter a display name and pick an avatar
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
components/                Canvas, chat, scoreboard, etc.
lib/                       Room logic, scoring, realtime, store
public/avatars/            Preset avatar SVGs
```

## License

MIT
