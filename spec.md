# AI Mystery Room: Specification v2 (Single Source of Truth)

> **Instruction to Codex / Antigravity:** This document is the single source of truth. Build exactly what is described here, incrementally, milestone by milestone. If something is ambiguous, choose the simplest option consistent with this spec and note it in `DECISIONS.md`. Do not add features not listed. Do not change the stack. Existing code that conflicts with this spec must be refactored to match it.

---

## 1. Project Overview

**Problem:** Mystery games are usually fixed and replayable only once. Players want a fresh, logically solvable mystery on any theme they imagine.

**Solution:** AI Mystery Room is a web app where the user enters a short mystery premise and picks a difficulty. Gemini generates a complete mystery (story, suspects, clues, hints, hidden culprit). The player investigates by discovering clues, can request hints (at a score cost), then accuses a suspect. The backend validates the accusation, calculates the score, and reveals the culprit and full explanation.

**Target users:** Casual players, students and mystery fans, ages 13+, on desktop or mobile browsers. No account required.

### 1.1 Core Features (must ship)
- Mystery generation by premise + difficulty (Easy / Medium / Hard).
- Investigation Room with story, suspect cards, discoverable clues, hints, and progress.
- Hint system with score penalty.
- Accusation flow with backend verdict and scoring.
- Results page with culprit, explanation, score breakdown, and "Play again".
- Deployed live website.

### 1.2 Optional Enhancements (only after all core features pass)
Build in this order, each behind a clear on/off flag:
1. Clue types shown as a WhatsApp-style chat view (clue content is still text).
2. AI-generated images for clues (`ENABLE_IMAGES`, default false).
3. CCTV-style frame sequence viewer (`ENABLE_CAM`, default false).
4. "My cases" history using localStorage of case ids.

### 1.3 Limitations
- No user accounts, multiplayer, payments, or leaderboards.
- All content is fictional; no real people or real brands in harmful contexts.
- One accusation per case. Gemini availability and rate limits may delay generation.

### 1.4 Final Deliverables
GitHub repository with full source and this `SPEC.md`; live frontend URL; backend deployed and connected to MongoDB Atlas; a mystery created and solved on the live site.

---

## 2. Tech Stack (fixed)

| Layer | Choice |
|---|---|
| Frontend | React (Vite), React Router DOM, Tailwind CSS, Axios |
| Backend | Node.js, Express, CORS, dotenv |
| Database | MongoDB (Atlas) with Mongoose |
| AI | Gemini via `@google/genai` |
| Validation | `zod` |
| Deploy | Frontend on Vercel; backend on Render (or similar); MongoDB Atlas |

Model names come from env vars, never hardcoded.

---

## 3. User Flow

1. User opens the website (Home).
2. User clicks **Start** and goes to Create Mystery.
3. User enters a premise (20 to 500 chars) and selects difficulty.
4. Backend asks Gemini to generate the mystery; the user sees a loading state.
5. User lands in the Investigation Room: reads the story, views suspects, discovers clues.
6. User may request hints (limited per difficulty; each costs points).
7. User clicks **Accuse a suspect**, selects one, confirms.
8. Results page shows verdict, culprit, explanation, and score breakdown.
9. User can start another mystery.

---

## 4. Difficulty Configuration

| Difficulty | Suspects | Clues | Hints available |
|---|---|---|---|
| Easy | 3 | 5 | 2 |
| Medium | 4 | 7 | 3 |
| Hard | 5 | 9 | 3 |

The backend enforces these exact counts. A generated mystery that does not match is rejected and regenerated.

---

## 5. Pages and UI

Dark noir theme (near-black background, amber accent, serif headings, monospace labels). Responsive down to 360px. Every page has loading, empty, and error states.

| Page / Route | Purpose | Essential elements |
|---|---|---|
| **Home** `/` | Introduce project | Title, tagline, how-it-works (3 steps), **Start** button |
| **Create Mystery** `/create` | Start a case | Premise textarea with character counter, difficulty selector (shows suspect/clue/hint counts), **Generate** button, loading screen with flavor text, error banner with retry |
| **Investigation Room** `/case/:id` | Play | Case brief (title, setting, story), suspect cards, clue list (locked/discovered), **Discover** buttons, hints panel with **Request hint** and remaining count, progress (clues x/y, hints used), notes box (localStorage), **Accuse a suspect** button |
| **Accusation** `/case/:id/accuse` (or modal) | Choose culprit | Suspect list with radio selection, confirm step, warning "one accusation per case", submit |
| **Results** `/case/:id/result` | Verdict | Correct/incorrect banner, culprit reveal, motive, method, full explanation, key clues, score breakdown, **Play again** |

**Navigation:** Header with logo (links Home). Investigation Room links to Accuse; Results links to Create. Direct visit to `/result` before accusing redirects back to the room.

**Error messages (user-friendly):** generation failed ("The case file got lost. Try again."), case not found, network error, already accused, rate limited.

**Mapping to design:** If screens were prototyped in Stitch AI, add a `docs/ui-mapping.md` listing each screen and which requirement above it satisfies.

---

## 6. Backend API

All routes prefixed `/api`. Responses: `{ success: boolean, data?: any, error?: { code, message } }`.

| Method | Route | Description |
|---|---|---|
| POST | `/cases` | Body `{ premise, difficulty }`. Generates and saves a mystery. Returns the sanitized case. |
| GET | `/cases/:id` | Returns the sanitized active case (discovered clue contents only, hint texts only for used hints). |
| POST | `/cases/:id/clues/:clueId/discover` | Marks clue discovered (idempotent) and returns its content. |
| POST | `/cases/:id/hints` | Returns the next unused hint, increments `hintsUsed`. Error when none remain. |
| POST | `/cases/:id/accuse` | Body `{ suspectId }`. Validates, scores, locks the case, returns the result. 409 if already accused. |
| GET | `/cases/:id/result` | Returns the full result. 403 if the case has not been accused yet. |

**Validation rules:**
- `premise`: string, trimmed, 20 to 500 chars. `difficulty`: `easy | medium | hard`.
- `:id`, `:clueId`, `suspectId` must be valid ids that belong to the case.
- Reject inappropriate premises (hate, graphic violence, real named individuals) with 422.
- Rate limit `POST /cases` to 10 per IP per hour.

**Errors:** centralized error handler; consistent codes (`VALIDATION_ERROR`, `NOT_FOUND`, `ALREADY_ACCUSED`, `GENERATION_FAILED`, `NO_HINTS_LEFT`, `FORBIDDEN`). Never expose stack traces or API keys.

**Security requirement:** `solution` (culprit, motive, method, explanation) and each clue's `pointsTo` and `isRedHerring` stay on the backend. They are returned only by `/accuse` and `/result`. A test must assert this.

Access control without accounts: the case id is an unguessable ObjectId. Anyone with the id can play it; this is acceptable for v1.

---

## 7. Database Model (Mongoose `Case`)

```
{
  title: String,
  premise: String,
  difficulty: "easy" | "medium" | "hard",
  setting: String,
  story: String,                       // opening narrative, no spoilers

  suspects: [{
    _id, name, role, description,
    statedAlibi: String
    // hidden: secretMotive
  }],

  clues: [{
    _id, title, content: String,       // hidden until discovered
    type: "chat" | "note" | "witness" | "object" | "log",
    relatedSuspectIds: [ObjectId],
    // hidden: pointsTo ("culprit" | "innocent" | "neutral"), isRedHerring
    discovered: Boolean, discoveredAt: Date
  }],

  hints: [{ _id, text: String, used: Boolean }],   // text hidden until used

  solution: {                           // select:false, never sent before accusation
    culpritSuspectId, motive, method, explanation,
    keyClueIds: [ObjectId]
  },

  progress: { cluesDiscovered: Number, hintsUsed: Number },
  accusation: { suspectId, correct: Boolean, at: Date },
  score: { base: Number, cluePoints: Number, hintPenalty: Number, total: Number },
  status: "active" | "completed",
  createdAt, updatedAt
}
```

A `toPublic()` method builds all client responses and removes hidden fields unless `status === "completed"`.

---

## 8. AI Behavior (Gemini)

- All Gemini calls live in `gemini.service.js`; prompts live in `/server/src/prompts`.
- Use JSON response mode with a response schema. **Validate every response with `zod`** before saving. Strip markdown code fences before parsing.
- On invalid output or count mismatch: retry up to 2 times, appending the validation error to the prompt. After that, return `GENERATION_FAILED` (502) and save nothing.
- Timeout 60s per call. Log full errors server-side (never keys).

### 8.1 Expected output shape (zod-validated)
```
{
  title, setting, story,
  suspects: [{ name, role, description, statedAlibi, secretMotive }],
  culpritIndex: number,
  motive, method, explanation,
  clues: [{ title, content, type, relatedSuspectIndexes: number[], pointsTo, isRedHerring }],
  hints: [{ text }],
  keyClueIndexes: number[]
}
```

### 8.2 Logical-consistency rules (enforced in prompt AND verified in code)
- Counts match the difficulty table exactly.
- Exactly one culprit; `culpritIndex` is a valid suspect index.
- At least 3 clues point to the culprit (Easy: at least 2); at least 2 red herrings pointing at others (Easy: at least 1).
- Every suspect appears in at least one clue.
- No clue or hint states the culprit's name outright; hints nudge progressively (hint 1 broad, last hint specific).
- The solution must be derivable from the clues alone; the explanation must cite which clues prove it.
- `keyClueIndexes` all reference valid clues that point to the culprit.
- Easy has one clear contradiction; Hard requires cross-referencing multiple clues.

If any rule fails in code verification, treat as invalid output and retry.

---

## 9. Scoring (backend only)

| Rule | Points |
|---|---|
| Correct accusation | Easy 100, Medium 150, Hard 200 |
| Wrong accusation | 0 base |
| Each discovered clue | +5 |
| Each hint used | -10 |
| Minimum total | 0 |

`total = max(0, base + 5 * cluesDiscovered - 10 * hintsUsed)`

The client never sends a score. The server computes it from stored progress and returns the breakdown `{ base, cluePoints, hintPenalty, total }`.

---

## 10. Environment Variables

**server/.env** (never commit; provide `.env.example`)
```
PORT=5000
MONGODB_URI=
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=
GEMINI_IMAGE_MODEL=          # optional enhancement only
CLIENT_URL=http://localhost:5173
ENABLE_IMAGES=false
ENABLE_CAM=false
```
**client/.env** (`.env.production` on Vercel)
```
VITE_API_URL=http://localhost:5000/api
```
Server must fail fast at startup with a clear message if `MONGODB_URI`, `GEMINI_API_KEY`, or `GEMINI_TEXT_MODEL` is missing. Add `.env` to `.gitignore`.

---

## 11. Deployment

1. **MongoDB Atlas:** create a free cluster, a database user, and allow network access (0.0.0.0/0 for hosting); copy the connection string.
2. **Backend (Render or similar):** root directory `server`, build `npm install`, start `node src/index.js`; set `MONGODB_URI`, `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `CLIENT_URL` (the Vercel URL, no trailing slash). Add a `GET /api/health` route.
3. **Frontend (Vercel):** root directory `client`; set `VITE_API_URL` to the deployed backend `/api` URL; add `vercel.json` rewrite so all routes serve `index.html` (React Router refresh must not 404).
4. **CORS:** allow only `CLIENT_URL`.
5. Free backend tiers may sleep: the frontend must show a "waking up the server" message when the first request is slow (over 8s).
6. Test the full flow on the production URL before submitting.

---

## 12. Acceptance Criteria

1. Users can generate mysteries at Easy, Medium, and Hard with exactly the suspect, clue, and hint counts in section 4.
2. Players can discover clues, request hints, and submit an accusation.
3. The solution, `pointsTo`, `isRedHerring`, secret motives, and unused hints are never in any response before accusation (automated test).
4. Scores are calculated and validated on the backend per section 9; a tampered request cannot change the score.
5. Results show the correct culprit and a clear explanation referencing key clues.
6. A second accusation returns 409; `GET /result` before accusing returns 403.
7. Invalid Gemini output is retried and fails safely with a friendly error; no half-saved cases.
8. API failures show friendly messages and the app never shows an empty or broken room.
9. The complete game works on the deployed website.
10. Works on a 360px-wide screen.

---

## 13. Build Order (incremental)

1. **M1 Foundation:** server + client scaffold, env validation, MongoDB connection, `/api/health`.
2. **M2 Generation:** Gemini service, zod schema, consistency checks, `POST /cases`, `Case` model, `toPublic()`.
3. **M3 Play API:** `GET /cases/:id`, discover clue, hints, accuse, result, scoring + tests for acceptance criteria 3, 4, 6.
4. **M4 Frontend pages:** Home, Create, Investigation Room, Accusation, Results wired to the API.
5. **M5 Polish:** loading, errors, retry, responsive pass, notes box.
6. **M6 Deploy:** Atlas, backend host, Vercel, production test.
7. **M7 Enhancements (optional):** chat-style clue view, images, cam frames, My cases via localStorage.

---

## 14. Working Rules

- Complete milestones in order; run and test after each; log decisions in `DECISIONS.md`.
- Never put API keys in client code or commit secrets.
- No file over about 300 lines; business logic stays out of route files.
- If a Gemini SDK method or model name is uncertain, check the official docs.
- Update this spec only with the user's approval.