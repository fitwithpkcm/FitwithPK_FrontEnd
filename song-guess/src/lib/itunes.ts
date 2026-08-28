import type { SeedSong } from "@/data/songs";

// In dev we go through the Vite proxy (see vite.config.ts) to dodge CORS.
// In prod we call Apple directly - swap this for your own proxy if Apple ever
// stops sending permissive CORS headers.
const BASE = import.meta.env.DEV ? "/itunes" : "https://itunes.apple.com";

export interface Track {
  trackId: number;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
}

interface RawResult {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
  previewUrl?: string;
}

function toTrack(r: RawResult): Track | null {
  if (!r.trackId || !r.trackName || !r.previewUrl) return null;
  const art = (r.artworkUrl100 ?? r.artworkUrl60 ?? "").replace(
    /\/\d+x\d+bb\.(jpg|png)$/,
    "/600x600bb.$1",
  );
  return {
    trackId: r.trackId,
    title: r.trackName,
    artist: r.artistName ?? "Unknown artist",
    album: r.collectionName ?? "",
    artworkUrl: art,
    previewUrl: r.previewUrl,
  };
}

async function query(term: string, limit: number, signal?: AbortSignal): Promise<Track[]> {
  const url =
    `${BASE}/search?media=music&entity=song&limit=${limit}` +
    `&term=${encodeURIComponent(term)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`iTunes search failed (${res.status})`);
  const json = (await res.json()) as { results: RawResult[] };
  return json.results.map(toTrack).filter((t): t is Track => t !== null);
}

/** Autocomplete for the guess box. */
export function searchTracks(term: string, signal?: AbortSignal): Promise<Track[]> {
  if (term.trim().length < 2) return Promise.resolve([]);
  return query(term, 8, signal);
}

const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Turn a seed hint into a concrete playable track. */
export async function resolveSeed(seed: SeedSong): Promise<Track | null> {
  const results = await query(`${seed.artist} ${seed.title}`, 5);
  if (results.length === 0) return null;
  const wantTitle = flat(seed.title);
  const wantArtist = flat(seed.artist);
  const match = results.find(
    (r) => flat(r.title).includes(wantTitle) && flat(r.artist).includes(wantArtist.slice(0, 6)),
  );
  return match ?? results[0];
}
