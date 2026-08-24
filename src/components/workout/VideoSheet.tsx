import React from "react";
import { X } from "lucide-react";
import { getEmbedUrl } from "../../lib/workout/video";

export default function VideoSheet({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const embedUrl = getEmbedUrl(url);
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-10 pb-3 bg-black">
        <p className="text-sm font-semibold text-white truncate flex-1 pr-3">{title}</p>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white flex-shrink-0">
          <X className="h-5 w-5" />
        </button>
      </div>
      {/* iframe fills remaining height */}
      <div className="flex-1 w-full">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
