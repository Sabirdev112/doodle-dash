# Bug Fix Guide — Stroke Lag & Stuck Turn Popup (Vercel-specific)

## Root Architectural Issue (affects both bugs)

**Cause:** Vercel serverless functions are stateless and short-lived. Your in-memory
`Map` of room state isn't guaranteed to be the same instance across requests — Vercel
can spin up multiple instances or recycle one between calls, so two different
`/api/room/action` calls for the same room can hit *different* memory. A `setTimeout`
started inside a function invocation also doesn't reliably survive once that
invocation ends.

**Solution:** Replace the in-memory `Map` with **Vercel KV** (Redis-backed, free
tier) for all room state (turn info, scores, current word, deadline timestamps,
stroke sequence counters). Every API route reads/writes to KV instead of a local
object, so all function instances see the same consistent state regardless of which
one handles a given request. This is the single highest-impact fix — do this first,
since it's a likely contributor to both bugs below.

---

## Issue 1: Stroke rendering is smooth for the drawer but chunky/laggy for guessers

### Cause 1 — Batching interval too large before sending to Pusher
Points are accumulated into a large buffer before being sent, so guessers receive
bursts instead of a steady stream.

**Solution:** Flush the stroke buffer on a short fixed interval (e.g., every
30-50ms) regardless of how many points have accumulated, instead of waiting for a
large buffer to fill. Smaller, more frequent batches feel continuous.

### Cause 2 — Out-of-order delivery
Each batch goes through a separate HTTP request → serverless invocation →
`pusher.trigger()`. If two requests are in flight, the second can resolve before
the first, so Pusher ends up broadcasting stroke batches out of sequence.

**Solution:** Attach a monotonically increasing sequence number to each stroke
batch (per drawer, per turn — store the counter in KV so it's consistent across
invocations). On the guesser's client, buffer incoming batches briefly and apply
them in sequence order rather than immediately on receipt, re-ordering if a batch
arrives late.

### Cause 3 — Full canvas redraw on every incoming batch
If the guesser's client clears and replays the *entire* stroke history on every
incoming batch, rendering gets progressively slower and visibly stutters as the
turn goes on.

**Solution:** On each incoming batch, draw only the new incremental segment
(`lineTo` from the last known point to the new point). Reserve full-history replay
for genuine full-state resyncs only (e.g., right after a reconnect).

### Cause 4 — Drawer's own local "flutter"
If the drawer's canvas redraws the full stored points array on every single
`pointermove` event instead of drawing just the new segment, fast movement can
exceed the frame budget and cause visible local flicker — this is separate from
the network issue above.

**Solution:** On the drawer's own client, also draw only the newest segment
locally on each `pointermove`, never replay the whole history during active
drawing.

### Cause 5 — Emit throttle and Pusher-flush interval mismatch
If the local point-emit throttle (e.g., 20ms) is much tighter than the
server-side flush-to-Pusher interval, points queue up server-side and release in
a burst whenever the flush fires — producing "smooth locally, chunky remotely."

**Solution:** Align the two intervals — keep the local emit throttle and the
server flush interval close (e.g., both around 30-50ms), so points leave the
server at roughly the same rate they're generated.

---

## Issue 2: Turn-transition popup gets stuck / re-appears mid-turn

### Cause 1 — Server `setTimeout` doesn't survive on serverless
The 15-second "auto-pick if no word chosen" timer was likely implemented as a
server-side `setTimeout`, which can be killed when the function instance that
started it is frozen/recycled — covered by the Root Architectural Issue above.

**Solution:** Don't rely on a live server timer. When the turn starts, write a
`deadlineTimestamp` into KV and broadcast it via Pusher. Any client can visually
count down from that timestamp, but the actual auto-pick action is triggered by an
API call (e.g., the drawer's own client calls an "auto-pick if expired" endpoint
once the deadline passes) — and that endpoint checks KV to confirm the turn hasn't
already been resolved before acting (see Issue 2, Cause 4, for the idempotency
check itself).

### Cause 2 — Client-side timers not cleared between turns
If the 15-second countdown or popup-visibility logic uses `setTimeout`/`setInterval`
inside a `useEffect` without a proper cleanup function, an old timer from a
previous turn can still be alive when a new turn starts. When it eventually fires,
it re-shows the old message.

**Solution:** Ensure every timer tied to turn state is cleared in the `useEffect`
cleanup (`return () => clearTimeout(...)`), and make the effect's dependency array
include a value that uniquely identifies the current turn (e.g. `turnId`), so a new
turn always tears down the old timer before starting a fresh one.

### Cause 3 — Popup component not remounted between turns
If the popup's visibility is toggled with a boolean rather than the component
being freshly mounted per turn, leftover internal state (like "which message to
show") can bleed from the previous turn into the new one.

**Solution:** Render the popup with `key={turnId}` (a unique ID per turn, not just
per round) so React fully remounts it each turn, guaranteeing no leftover internal
state carries over.

### Cause 4 — Duplicate/racing turn-transition events
If more than one thing can trigger a turn-transition for the same turn (e.g., a
timeout auto-pick and a "word was guessed" event both firing close together), the
client can receive two conflicting events, and whichever renders last can be the
stale one.

**Solution:** Add an idempotency guard server-side: store `currentTurnId` (or a
`turnResolved` flag) in KV, and any turn-ending logic checks "is this still the
active, unresolved turn?" before advancing or broadcasting — so a late-firing
auto-pick can't re-trigger a transition that's already happened.

---

## Suggested Fix Order

1. Migrate room state from in-memory `Map` to Vercel KV (fixes the shared root
   cause behind both issues).
2. Add sequence numbers to stroke batches + ordered client-side apply (Issue 1,
   Cause 2).
3. Switch to incremental segment drawing on both drawer and guesser clients
   (Issue 1, Causes 3 & 4).
4. Tighten/align the flush and throttle intervals (Issue 1, Causes 1 & 5).
5. Replace the server `setTimeout` with a KV-stored deadline + idempotent
   auto-pick endpoint (Issue 2, Causes 1 & 4).
6. Fix `useEffect` cleanup and key the popup component on `turnId` (Issue 2,
   Causes 2 & 3).
7. Retest with 3+ simulated players/tabs after each step to confirm the fix before
   moving to the next.