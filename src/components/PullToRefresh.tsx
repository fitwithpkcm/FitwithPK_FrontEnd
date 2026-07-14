import React, { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { queryClient } from "../lib/queryClient";

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

function findScrollableAncestor(node: HTMLElement | null): HTMLElement | Window {
  let el = node;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return window;
}

function getScrollTop(target: HTMLElement | Window): number {
  return target === window ? window.scrollY : (target as HTMLElement).scrollTop;
}

/**
 * App-wide pull-to-refresh. Wraps the whole routed app; on a downward pull
 * gesture starting from the top of whichever scroll container the touch
 * began in, it invalidates every active React Query so the current page's
 * data refetches.
 */
export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const scrollTarget = useRef<HTMLElement | Window | null>(null);
  const pulling = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      const target = findScrollableAncestor(e.target as HTMLElement);
      if (getScrollTop(target) > 0) return;
      scrollTarget.current = target;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null || scrollTarget.current === null) return;
      if (getScrollTop(scrollTarget.current) > 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta, MAX_PULL));
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        try {
          await queryClient.invalidateQueries();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      startY.current = null;
      scrollTarget.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing]);

  const indicatorOpacity = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <>
      <div
        className="fixed left-0 right-0 top-0 z-[9999] flex justify-center pointer-events-none transition-transform"
        style={{
          transform: `translateY(${(refreshing ? PULL_THRESHOLD : pullDistance) - 40}px)`,
          opacity: indicatorOpacity,
        }}
      >
        <div className="mt-2 w-9 h-9 rounded-full bg-white dark:bg-gray-900 shadow-md flex items-center justify-center border border-gray-200 dark:border-gray-700">
          <RefreshCw
            className={`w-4 h-4 text-blue-600 ${refreshing ? "animate-spin" : ""}`}
            style={!refreshing ? { transform: `rotate(${indicatorOpacity * 360}deg)` } : undefined}
          />
        </div>
      </div>
      {children}
    </>
  );
}
