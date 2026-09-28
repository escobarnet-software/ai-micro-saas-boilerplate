import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(value: string): string {
  const parts = value
    .replace(/[@._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : plural ?? `${singular}s`
}
