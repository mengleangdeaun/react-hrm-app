import {
    format,
    parseISO,
    isValid,
    isSameDay,
    isSameMonth,
    isToday,
    isYesterday,
    isThisWeek,
    addDays,
    subDays,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    startOfDay,
    eachDayOfInterval,
    differenceInCalendarDays,
} from 'date-fns';

/**
 * Enterprise Date/Time Utility Module
 * Guarantees timezone-safe calendar day representations and standardized displays across platforms.
 */

export type DateDisplayVariant = 'standard' | 'full' | 'short' | 'monthYear' | 'dayMonth' | 'iso';

/**
 * Safely parse a date-only string (YYYY-MM-DD) into a local Date without UTC midnight shifting.
 */
export function parseDateOnly(dateStr?: string | null): Date {
    if (!dateStr) return new Date();

    const trimmed = String(dateStr).trim();

    // Match YYYY-MM-DD pattern
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        return new Date(year, month, day, 0, 0, 0, 0);
    }

    try {
        const parsed = parseISO(trimmed);
        if (isValid(parsed)) return parsed;
    } catch {
        // Fallback
    }

    return new Date();
}

/**
 * Formats a Date or date string to strict YYYY-MM-DD machine format.
 */
export function formatDateOnly(date: Date | string): string {
    if (typeof date === 'string') {
        const d = parseDateOnly(date);
        return format(d, 'yyyy-MM-dd');
    }
    return format(date, 'yyyy-MM-dd');
}

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function getTodayDateString(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Formats a date string (YYYY-MM-DD or ISO timestamp) into a human-readable display string.
 * - 'standard': 01 Sep 2026
 * - 'full': Tuesday, 01 Sep 2026
 * - 'short': Sep 1, 2026
 * - 'monthYear': September 2026
 * - 'dayMonth': 01 Sep
 * - 'iso': 2026-09-01
 */
export function formatDateDisplay(
    dateInput?: string | Date | null,
    variant: DateDisplayVariant = 'standard',
    fallback: string = 'N/A'
): string {
    if (!dateInput) return fallback;

    try {
        const d = typeof dateInput === 'string' ? parseDateOnly(dateInput) : dateInput;
        if (!isValid(d)) return fallback;

        switch (variant) {
            case 'standard':
                return format(d, 'dd MMM yyyy');
            case 'full':
                return format(d, 'EEEE, dd MMM yyyy');
            case 'short':
                return format(d, 'MMM d, yyyy');
            case 'monthYear':
                return format(d, 'MMMM yyyy');
            case 'dayMonth':
                return format(d, 'dd MMM');
            case 'iso':
                return format(d, 'yyyy-MM-dd');
            default:
                return format(d, 'dd MMM yyyy');
        }
    } catch {
        return fallback;
    }
}

/**
 * Formats a time string (HH:mm, HH:mm:ss, or ISO timestamp) into standard 12-hour AM/PM format.
 * Examples:
 * - "08:30" -> "08:30 AM"
 * - "17:45:00" -> "05:45 PM"
 * - "2026-09-01T08:30:00+07:00" -> "08:30 AM"
 * - "2026-09-01 17:45:00" -> "05:45 PM"
 */
export function formatTimeDisplay(
    timeInput?: string | Date | null,
    fallback: string = '--:--'
): string {
    if (!timeInput) return fallback;

    try {
        if (timeInput instanceof Date) {
            return format(timeInput, 'hh:mm a');
        }

        const raw = String(timeInput).trim();

        // 1. If it's a full ISO or datetime string containing date & time
        if (raw.includes('T') || raw.includes(' ')) {
            const parsed = parseISO(raw);
            if (isValid(parsed)) {
                return format(parsed, 'hh:mm a');
            }
            const fallbackDate = new Date(raw);
            if (!isNaN(fallbackDate.getTime())) {
                return format(fallbackDate, 'hh:mm a');
            }
        }

        // 2. If it's a 24-hour time string (e.g. "08:30" or "08:30:00")
        const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            const m = parseInt(timeMatch[2], 10);
            const period = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 === 0 ? 12 : h % 12;
            const displayM = m < 10 ? `0${m}` : `${m}`;
            const displayHStr = displayH < 10 ? `0${displayH}` : `${displayH}`;
            return `${displayHStr}:${displayM} ${period}`;
        }

        return raw;
    } catch {
        return fallback;
    }
}

/**
 * Formats a date range into clean, non-redundant human-readable text.
 * Examples:
 * - Same day: "01 Sep 2026"
 * - Same month: "01 – 05 Sep 2026"
 * - Same year: "28 Aug – 05 Sep 2026"
 * - Cross year: "28 Dec 2025 – 05 Jan 2026"
 */
export function formatDateRangeDisplay(
    startStr?: string | null,
    endStr?: string | null,
    fallback: string = 'N/A'
): string {
    if (!startStr) return fallback;
    if (!endStr || startStr === endStr) {
        return formatDateDisplay(startStr, 'standard', fallback);
    }

    try {
        const start = parseDateOnly(startStr);
        const end = parseDateOnly(endStr);

        if (start.getFullYear() === end.getFullYear()) {
            if (start.getMonth() === end.getMonth()) {
                return `${format(start, 'dd')} – ${format(end, 'dd MMM yyyy')}`;
            }
            return `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`;
        }
        return `${format(start, 'dd MMM yyyy')} – ${format(end, 'dd MMM yyyy')}`;
    } catch {
        return `${startStr} – ${endStr}`;
    }
}

/**
 * Validates whether a date range satisfies startDate <= endDate.
 */
export function isDateRangeValid(startDateStr: string, endDateStr: string): boolean {
    if (!startDateStr || !endDateStr) return false;
    return startDateStr <= endDateStr;
}

/**
 * Calculates calendar days difference inclusively.
 */
export function calculateInclusiveDays(startDateStr: string, endDateStr: string): number {
    try {
        const start = parseDateOnly(startDateStr);
        const end = parseDateOnly(endDateStr);
        const diff = differenceInCalendarDays(end, start) + 1;
        return isNaN(diff) || diff < 1 ? 1 : diff;
    } catch {
        return 1;
    }
}

/**
 * Formats a timestamp into clean, localized relative time (e.g. "5m ago", "2h ago", "Yesterday", or Khmer).
 */
export function formatRelativeTime(
    dateInput?: string | Date | null,
    locale: string = 'en',
    fallback: string = 'just now'
): string {
    if (!dateInput) return fallback;

    try {
        let d: Date;
        if (dateInput instanceof Date) {
            d = dateInput;
        } else {
            const raw = String(dateInput).trim();
            d = raw.includes('T') || raw.includes(' ') ? parseISO(raw) : parseDateOnly(raw);
            if (!isValid(d)) {
                d = new Date(raw);
            }
        }

        if (!isValid(d)) return fallback;

        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);
        const absDiffMin = Math.floor(absDiffSec / 60);
        const absDiffHr = Math.floor(absDiffMin / 60);
        const absDiffDays = Math.floor(absDiffHr / 24);

        const isKh = locale === 'kh' || locale === 'km';

        if (absDiffSec < 45) {
            return isKh ? 'អម្បាញ់មិញ' : 'just now';
        }

        if (absDiffMin < 60) {
            return isKh ? `${absDiffMin} នាទីមុន` : `${absDiffMin}m ago`;
        }

        if (absDiffHr < 24) {
            return isKh ? `${absDiffHr} ម៉ោងមុន` : `${absDiffHr}h ago`;
        }

        if (absDiffDays === 1) {
            return isKh ? 'ម្សិលមិញ' : 'Yesterday';
        }

        if (absDiffDays < 7) {
            return isKh ? `${absDiffDays} ថ្ងៃមុន` : `${absDiffDays}d ago`;
        }

        return format(d, 'dd MMM');
    } catch {
        return fallback;
    }
}

export {
    format,
    parseISO,
    isValid,
    isSameDay,
    isSameMonth,
    isToday,
    isYesterday,
    isThisWeek,
    addDays,
    subDays,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    startOfDay,
    eachDayOfInterval,
    differenceInCalendarDays,
};
