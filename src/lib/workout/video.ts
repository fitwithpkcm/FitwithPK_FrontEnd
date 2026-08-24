// YouTube URL helpers shared by the day-list exercise view and the guided
// workout session — both need to embed/preview a coach-attached VideoUrl.

export function getEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // youtu.be/ID
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}?autoplay=1&mute=1&rel=0`;
    }
    // youtube.com/shorts/ID
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.replace("/shorts/", "");
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0`;
    }
    // youtube.com/watch?v=ID
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}?autoplay=1&mute=1&rel=0`;
    // already an embed or other direct video URL — use as-is
    return url;
  } catch {
    return url;
  }
}

export function getYoutubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.replace("/shorts/", "");
    else id = u.searchParams.get("v");
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  } catch { return null; }
}
