// Plays a precise slice of a 30s preview clip.
//
// Why not <audio> + a setTimeout? `timeupdate` / seeking granularity is ~250ms,
// so "play 100ms" is impossible that way. The Web Audio API can start a buffer
// at an exact offset for an exact duration, sample-accurate. We decode the MP3
// once, then every play is `source.start(0, offset, duration)` with a tiny gain
// fade so sub-second clips don't click.
//
// If decoding fails (usually a CORS wall on the preview CDN) we fall back to a
// plain <audio> element: audible, but clamped to ~250ms minimum and with no
// real waveform.

type ProgressCb = (fraction: number) => void;

interface Loaded {
  buffer: AudioBuffer | null;
  el: HTMLAudioElement | null;
  duration: number;
  url: string;
}

interface Playing {
  raf?: number;
  stopTimer?: number;
  source?: AudioBufferSourceNode;
  el?: HTMLAudioElement;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private loaded: Loaded | null = null;
  private playing: Playing = {};

  private getCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  get usingFallback(): boolean {
    return !!this.loaded && this.loaded.buffer === null;
  }

  async load(url: string): Promise<void> {
    if (this.loaded?.url === url) return;
    this.stop();
    this.loaded = null;

    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`preview fetch ${res.status}`);
      const bytes = await res.arrayBuffer();
      const buffer = await this.getCtx().decodeAudioData(bytes.slice(0));
      this.loaded = { buffer, el: null, duration: buffer.duration, url };
      return;
    } catch {
      // fall through to element playback
    }

    const el = new Audio();
    el.src = url;
    el.preload = "auto";
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      el.addEventListener("canplaythrough", done, { once: true });
      el.addEventListener("loadeddata", done, { once: true });
      el.addEventListener("error", done, { once: true });
      window.setTimeout(done, 4000);
    });
    this.loaded = { buffer: null, el, duration: el.duration || 30, url };
  }

  /** Compute `bins` peak magnitudes for the waveform bar (0..1). */
  waveform(bins = 56): number[] {
    const buf = this.loaded?.buffer;
    if (!buf) return Array.from({ length: bins }, () => 0.35);
    const data = buf.getChannelData(0);
    const block = Math.floor(data.length / bins);
    const peaks: number[] = [];
    for (let i = 0; i < bins; i++) {
      let max = 0;
      for (let j = 0; j < block; j += 64) {
        const v = Math.abs(data[i * block + j] || 0);
        if (v > max) max = v;
      }
      peaks.push(max);
    }
    const norm = Math.max(...peaks, 0.001);
    return peaks.map((p) => Math.max(0.08, p / norm));
  }

  /**
   * Play `durationMs` starting `offsetSec` into the clip.
   * `onProgress` gets 0..1 across the snippet; `onEnd` fires when it stops.
   */
  play(offsetSec: number, durationMs: number, onProgress: ProgressCb, onEnd: () => void): void {
    if (!this.loaded) return;
    this.stop();

    const clipDuration = this.loaded.duration || 30;

    if (this.loaded.buffer) {
      const ctx = this.getCtx();
      void ctx.resume();
      const dur = Math.max(durationMs / 1000, 0.005);
      const offset = Math.min(Math.max(offsetSec, 0), Math.max(clipDuration - dur, 0));
      const fade = Math.min(0.008, dur / 3);

      const source = ctx.createBufferSource();
      source.buffer = this.loaded.buffer;
      const gain = ctx.createGain();
      const t0 = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(1, t0 + fade);
      gain.gain.setValueAtTime(1, t0 + Math.max(dur - fade, fade));
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      source.connect(gain).connect(ctx.destination);
      source.start(0, offset, dur);

      this.playing = { source };
      const startedAt = performance.now();
      const finish = () => {
        if (this.playing.source !== source) return;
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
        if (this.playing.stopTimer) clearTimeout(this.playing.stopTimer);
        this.playing = {};
        onProgress(1);
        onEnd();
      };
      const tick = () => {
        const f = Math.min((performance.now() - startedAt) / (dur * 1000), 1);
        onProgress(f);
        if (f < 1 && this.playing.source === source) {
          this.playing.raf = requestAnimationFrame(tick);
        }
      };
      tick();
      source.onended = finish;
      // Safety net: onended never fires if the context can't advance (e.g. a
      // still-suspended AudioContext). Force the round to end on wall-clock time.
      this.playing.stopTimer = window.setTimeout(finish, dur * 1000 + 80);
      return;
    }

    // fallback element path
    const el = this.loaded.el!;
    const dur = Math.max(durationMs / 1000, 0.25);
    el.currentTime = Math.min(Math.max(offsetSec, 0), Math.max(clipDuration - dur, 0));
    void el.play();
    this.playing = { el };
    const startedAt = performance.now();
    const tick = () => {
      const f = Math.min((performance.now() - startedAt) / (dur * 1000), 1);
      onProgress(f);
      if (f < 1 && this.playing.el === el) this.playing.raf = requestAnimationFrame(tick);
    };
    tick();
    this.playing.stopTimer = window.setTimeout(() => {
      el.pause();
      if (this.playing.el === el) {
        onProgress(1);
        this.playing = {};
        onEnd();
      }
    }, dur * 1000);
  }

  stop(): void {
    if (this.playing.raf) cancelAnimationFrame(this.playing.raf);
    if (this.playing.stopTimer) clearTimeout(this.playing.stopTimer);
    try {
      this.playing.source?.stop();
    } catch {
      /* already stopped */
    }
    this.playing.el?.pause();
    this.playing = {};
  }
}

export const audioEngine = new AudioEngine();
