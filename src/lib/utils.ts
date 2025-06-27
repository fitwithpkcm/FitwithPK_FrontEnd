import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  if (typeof date === 'string') {
    return format(parseISO(date), 'EEEE, MMMM d');
  }
  return format(date, 'EEEE, MMMM d');
}

export function calculatePercentage(value: number|string, max: number): number {
  return Math.min(Math.max((value / max) * 100, 0), 100);
}

export function calculateChange(current: number, previous: number): number {
  return current - previous;
}


export function isEmpty(data: any | any[] | string | null | undefined): boolean {
  // Check for null or undefined
  if (data === null || data === undefined) {
    return true;
  }

  // Check for empty string
  if (typeof data === 'string' && data === '') {
    return true;
  }

  // Check for array or string with length 0
  if (typeof data === 'object' && 'length' in data && data.length === 0) {
    return true;
  }

  return false;
}


 export function getRandomColor(str: string): string {
    if (!str) return "bg-gray-500"; // fallback for empty/null
    
    const colors = [
        "bg-red-500",
        "bg-pink-500",
        "bg-purple-500",
        "bg-blue-500",
        "bg-teal-500",
        "bg-green-500",
        "bg-yellow-500",
        "bg-orange-500",
        "bg-indigo-500",
        "bg-cyan-500",
        "bg-lime-500",
        "bg-amber-500",
        "bg-emerald-500",
        "bg-violet-500",
        "bg-fuchsia-500",
        "bg-rose-500"
    ];

    // Better hash function (djb2 algorithm)
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) + hash + str.charCodeAt(i);
    }

    const index = Math.abs(hash) % colors.length;
    
    return colors[index];
}