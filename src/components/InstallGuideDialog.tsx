import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Download, Loader2 } from "lucide-react";
import { isIos, isStandalone, triggerNativeInstallPrompt } from "../lib/pwaInstall";

function detectDefaultPlatform(): "android" | "ios" {
  return isIos() ? "ios" : "android";
}

const YOUTUBE_SHORT_ID: Record<"android" | "ios", string> = {
  android: "H3UpUWrDi0w",
  ios: "aMSXuA3LNFU",
};

export function InstallAppButton() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios">(detectDefaultPlatform());
  const [checking, setChecking] = useState(false);

  const handleClick = async () => {
    if (isStandalone()) return;

    // iOS has no native install API — Safari never fires beforeinstallprompt,
    // so the only option there is to show them how to do it manually.
    if (isIos()) {
      setOpen(true);
      return;
    }

    setChecking(true);
    const shown = await triggerNativeInstallPrompt();
    setChecking(false);

    // No captured beforeinstallprompt event (browser doesn't support it, or
    // it hasn't fired yet) — fall back to the walkthrough video.
    if (!shown) setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={checking}
        className="w-full h-12 rounded-xl text-sm font-semibold mt-3 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
      >
        {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Install App
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How to install FitwithPK</DialogTitle>
          </DialogHeader>

          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(["android", "ios"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  platform === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p === "android" ? "Android (Chrome)" : "iPhone (Safari)"}
              </button>
            ))}
          </div>

          <div className="mx-auto w-full max-w-[320px] aspect-[9/16] rounded-xl border border-gray-200 overflow-hidden">
            <iframe
              key={platform}
              src={`https://www.youtube.com/embed/${YOUTUBE_SHORT_ID[platform]}?autoplay=1&mute=1&playsinline=1`}
              title={`How to install on ${platform === "android" ? "Android" : "iOS"}`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
