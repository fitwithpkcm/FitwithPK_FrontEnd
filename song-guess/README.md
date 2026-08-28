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

- Difficulty pills (`Easy 3s -> Impossible 10ms`) - each sets how much audio you hear
- **Web Audio** snippet player: decodes the preview once, plays a sample-accurate
  slice with a click-free gain fade. Falls back to a plain `<audio>` element
  (min ~250ms) if the preview CDN blocks CORS.
- Waveform bar with play-progress fill
- Song search with iTunes autocomplete; button flips **Skip -> Guess**
- Fuzzy answer matching (`src/lib/match.ts`) - exact trackId, substring, or
  Levenshtein >= 0.85
- Correct guess -> green confetti + reveal card ("GUESSED IN 0.1S!") + Reroll all /
  Play again
- In-memory session tally (solved / skipped). Nothing is persisted yet.

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
