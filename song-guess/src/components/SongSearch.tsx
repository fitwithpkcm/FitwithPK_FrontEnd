import { useEffect, useRef, useState } from "react";
import { searchTracks, type Track } from "@/lib/itunes";

interface Props {
  value: string;
  onChange: (text: string) => void;
  onPick: (track: Track) => void;
  disabled?: boolean;
  shake?: boolean;
}

export function SongSearch({ value, onChange, onPick, disabled, shake }: Props) {
  const [results, setResults] = useState<Track[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const reqId = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const id = ++reqId.current;
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      searchTracks(term, controller.signal)
        .then((rows) => {
          if (id === reqId.current) {
            setResults(rows);
            setOpen(true);
          }
        })
        .catch(() => {
          /* aborted or offline */
        });
    }, 220);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showDropdown = open && focused && results.length > 0;

  return (
    <div className="search" ref={boxRef}>
      {showDropdown && (
        <ul className="dropdown">
          {results.map((track) => (
            <li key={track.trackId}>
              <button
                type="button"
                className="dropdown-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(track);
                  onChange(track.title);
                  setOpen(false);
                }}
              >
                <span className="dropdown-title">{track.title}</span>
                <span className="dropdown-artist">{track.artist}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={`search-input ${shake ? "shake" : ""}`} data-invalid={shake || undefined}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="currentColor"
            d="M10 4a6 6 0 1 0 3.9 10.5l4.3 4.3 1.4-1.4-4.3-4.3A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search songs..."
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (results.length) setOpen(true);
          }}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}
