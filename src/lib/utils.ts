import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Unisce classi Tailwind risolvendo i conflitti (es. "px-2" + "px-4" → "px-4"). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
});

const dateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

/** Data ISO di N giorni fa (per filtri su intervalli temporali). */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
