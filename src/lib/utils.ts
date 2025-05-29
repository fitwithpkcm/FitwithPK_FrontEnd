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
