// M0 seed catalog. Each entry is just a hint used to look the real track up on
// the iTunes Search API at runtime (which gives us a fresh 30s preview URL +
// artwork). M1 replaces this with a proper bundled songs.json / backend table.
export interface SeedSong {
  title: string;
  artist: string;
}

export const SEED_SONGS: SeedSong[] = [
  // the ones seen in the reference video
  { title: "Alors on danse", artist: "Stromae" },
  { title: "Thunderstruck", artist: "AC/DC" },
  { title: "I Want It That Way", artist: "Backstreet Boys" },
  { title: "Sultans of Swing", artist: "Dire Straits" },
  { title: "Stronger", artist: "Britney Spears" },
  // a spread of very recognisable hooks
  { title: "Billie Jean", artist: "Michael Jackson" },
  { title: "Bohemian Rhapsody", artist: "Queen" },
  { title: "Smells Like Teen Spirit", artist: "Nirvana" },
  { title: "Rolling in the Deep", artist: "Adele" },
  { title: "Uptown Funk", artist: "Mark Ronson" },
  { title: "Shape of You", artist: "Ed Sheeran" },
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Bad Guy", artist: "Billie Eilish" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
  { title: "Wonderwall", artist: "Oasis" },
  { title: "Seven Nation Army", artist: "The White Stripes" },
  { title: "Take On Me", artist: "a-ha" },
  { title: "Don't Stop Believin'", artist: "Journey" },
  { title: "Mr. Brightside", artist: "The Killers" },
  { title: "Toxic", artist: "Britney Spears" },
  { title: "Hey Ya!", artist: "OutKast" },
  { title: "Lose Yourself", artist: "Eminem" },
  { title: "In Da Club", artist: "50 Cent" },
  { title: "SICKO MODE", artist: "Travis Scott" },
  { title: "God's Plan", artist: "Drake" },
  { title: "Sunflower", artist: "Post Malone" },
  { title: "Someone Like You", artist: "Adele" },
  { title: "Viva La Vida", artist: "Coldplay" },
  { title: "Africa", artist: "Toto" },
  { title: "Wannabe", artist: "Spice Girls" },
  { title: "Numb", artist: "Linkin Park" },
  { title: "Believer", artist: "Imagine Dragons" },
  { title: "Get Lucky", artist: "Daft Punk" },
  { title: "Old Town Road", artist: "Lil Nas X" },
  { title: "Dance Monkey", artist: "Tones and I" },
];
