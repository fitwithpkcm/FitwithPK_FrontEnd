# snippet - M0

Guess the song from a tiny audio snippet. Prototype milestone (M0) of the
"name that song" game modelled on the reference reel.

## Run

```bash
cd song-guess
npm install
npm run dev
```

Open http://localhost:5180

## What works in M0

- **Progressive reveal ladder** (Heardle-style): each difficulty is a sequence of
  snippet lengths ending at the full 30s preview, so every round is winnable.
  A skip or a wrong guess drops you one rung. Default is Medium
  (`1s -> 2.5s -> 5s -> 9s -> 15s -> 30s`); Hard starts at `0.1s`.
  Ladder config lives in `src/game/difficulty.ts`.
- **Web Audio** snippet player: decodes the preview once, plays a sample-accurate
  slice with a click-free gain fade and a wall-clock stop-safety timer. Falls back
  to a plain `<audio>` element (min ~250ms) if the preview CDN blocks CORS.
  Auto-plays the newly unlocked snippet after a skip / wrong guess.
- Waveform bar with play-progress fill; `try N / M` counter
- Song search with iTunes autocomplete; button is **Skip +Xs** / **Give up** /
  **Guess** depending on state
- Fuzzy answer matching (`src/lib/match.ts`) - exact trackId, substring, or
  Levenshtein >= 0.85 (strips `(feat...)`, `- Remaster`, etc.)
- Correct guess -> green confetti + reveal card ("GUESSED IN 5S!" = the rung you
  solved on) + Reroll all / Play again. Give up -> "GAVE UP" card.
- In-memory session tally (solved / gave up). Nothing is persisted yet.

## Audio & catalog source

`src/data/songs.ts` is a list of ~36 seed hints. At runtime each is resolved
against the **iTunes Search API** (`/search`, no key) to get a fresh 30s
`previewUrl` + artwork. Dev requests go through the Vite proxy (`/itunes` ->
`itunes.apple.com`) to avoid CORS; see `vite.config.ts`.

## Not in M0 (next milestones)

- M1: all difficulty polish, IndexedDB personal bests + streak, PWA, port styling
  to Tailwind/shadcn to match FitwithPK
- M2: backend attempts API, anonymous handles, server-authoritative timing
- M3: leaderboards (per-difficulty + daily challenge), share card

## Layout

```
src/
  data/songs.ts          seed catalog (title/artist hints)
  lib/
    itunes.ts            search + resolve a seed to a playable Track
    audioEngine.ts       Web Audio slice player (+ <audio> fallback)
    match.ts             fuzzy guess comparison
  game/
    difficulty.ts        the difficulty curve + formatters
    useGame.ts           round/session state machine (useReducer)
  hooks/useSnippetPlayer.ts   React wrapper around audioEngine
  components/            DifficultyTabs, WaveformBar, SnippetPlayer,
                         SongSearch, GuessBar, RevealCard, Confetti
  App.tsx                wires it together
```
