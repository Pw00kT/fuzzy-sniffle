import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function priorityColor(priority: string): string {
  return { high: 'destructive', medium: 'warning', low: 'secondary' }[priority] ?? 'secondary'
}

export function riskLevelColor(level: string): string {
  return { high: 'text-red-600 bg-red-50', medium: 'text-amber-600 bg-amber-50', low: 'text-green-600 bg-green-50' }[level] ?? ''
}

export function conflictTypeColor(type: string): string {
  return { conflict: 'text-red-600 bg-red-50', potential: 'text-amber-600 bg-amber-50', none: 'text-green-600 bg-green-50' }[type] ?? ''
}

export function statusColor(status: string): string {
  return {
    completed: 'text-green-700 bg-green-50',
    processing: 'text-blue-700 bg-blue-50',
    draft: 'text-gray-600 bg-gray-50',
    error: 'text-red-700 bg-red-50',
  }[status] ?? ''
}
