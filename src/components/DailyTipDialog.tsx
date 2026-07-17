import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { getDailyTip } from "../services/TipsService";
import { IFitnessTip } from "../interface/IFitnessTip";
import { Dialog, DialogContent } from "./ui/dialog";

const DAILY_TIP_HOUR = 9;

function todaysTipKey() {
  const today = new Date();
  return `dailyTipShown_${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
}

export function DailyTipDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const dueToday = new Date().getHours() >= DAILY_TIP_HOUR;
  const alreadyShown = sessionStorage.getItem(todaysTipKey()) === "1";
  const shouldFetch = !!user && dueToday && !alreadyShown;

  const { data } = useQuery({
    queryKey: ["dailyTip", todaysTipKey()],
    queryFn: async () => (await getDailyTip()).data.data as IFitnessTip,
    enabled: shouldFetch,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data) {
      setOpen(true);
      sessionStorage.setItem(todaysTipKey(), "1");
    }
  }, [data]);

  // TEMP DEBUG - remove before finishing
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("debugTip") === "1") setOpen(true);
  }, []);
  const debugData = { Title: "Stay Hydrated", Description: "Drink at least 2-3 liters of water daily. Even mild dehydration can reduce your energy and workout performance." };
  const shownData = data ?? debugData;

  const handleClose = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-sm overflow-visible border-none bg-transparent p-0 shadow-none [&>button]:hidden"
      >
        <div className="relative mx-auto mt-10 w-full">
          {/* glowing badge — sits outside the clipped card so nothing crops it */}
          <div className="absolute -top-10 left-1/2 z-10 -translate-x-1/2">
            <div className="absolute inset-0 animate-pulse rounded-full bg-blue-400/40 blur-md" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg ring-4 ring-white dark:ring-gray-900">
              <svg viewBox="0 0 24 36" className="h-14 w-14 overflow-visible" fill="none" stroke="white" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <g transform="translate(0,10)">
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
                </g>
                <line x1="12" y1="12" x2="12" y2="4" />
                <line x1="12" y1="12" x2="12" y2="4" transform="rotate(-35 12 12)" />
                <line x1="12" y1="12" x2="12" y2="4" transform="rotate(35 12 12)" />
                <line x1="12" y1="12" x2="12" y2="4" transform="rotate(-65 12 12)" />
                <line x1="12" y1="12" x2="12" y2="4" transform="rotate(65 12 12)" />
              </svg>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] bg-gradient-to-b from-blue-600 to-blue-700 p-[2px] shadow-2xl">
          <div className="relative overflow-hidden rounded-[26px] bg-white px-6 pb-6 pt-14 dark:bg-gray-900">
            {/* soft dotted texture */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
                backgroundSize: "16px 16px",
                color: "#2563eb",
              }}
            />

            {/* corner ribbon */}
            <span className="absolute -left-9 top-4 -rotate-45 bg-blue-700 px-10 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
              Daily
            </span>

            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="relative text-center text-2xl font-extrabold italic tracking-wide text-transparent [-webkit-background-clip:text] bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text dark:from-blue-300 dark:to-blue-500">
              Tip of the Day
            </h2>

            <div className="relative mx-auto mt-4 max-w-[85%] border-t border-dashed border-blue-200 dark:border-blue-800" />

            <div className="relative mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-center dark:bg-blue-950/40">
              {shownData?.Title && (
                <p className="text-base font-bold text-blue-900 dark:text-blue-100">{shownData.Title}</p>
              )}
              <p className="mt-1 text-sm leading-relaxed text-blue-800/80 dark:text-blue-200/80">{shownData?.Description}</p>
            </div>

            <p className="relative mt-4 text-center text-[11px] tracking-wide text-gray-400 dark:text-gray-500">
              A fresh tip every day at 9 AM
            </p>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
