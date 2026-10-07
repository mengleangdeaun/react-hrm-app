/**
 * Core Telemetry & Observability Layer
 * Provides centralized breadcrumbs, crash logging, and performance telemetry.
 * Prepares the application for Sentry / Datadog mobile monitoring.
 */

type TelemetryLevel = 'info' | 'warning' | 'error';

interface BreadcrumbData {
    category: string;
    message: string;
    level?: TelemetryLevel;
    data?: Record<string, any>;
    timestamp?: number;
}

class TelemetryService {
    private breadcrumbs: BreadcrumbData[] = [];
    private readonly MAX_BREADCRUMBS = 50;

    /**
     * Record a user action or system event breadcrumb
     */
    addBreadcrumb(breadcrumb: BreadcrumbData): void {
        const entry: BreadcrumbData = {
            ...breadcrumb,
            timestamp: breadcrumb.timestamp || Date.now(),
            level: breadcrumb.level || 'info',
        };

        this.breadcrumbs.push(entry);
        if (this.breadcrumbs.length > this.MAX_BREADCRUMBS) {
            this.breadcrumbs.shift();
        }

        if (__DEV__) {
            console.log(`[Telemetry:${entry.category}]`, entry.message, entry.data || '');
        }
    }

    /**
     * Log a non-fatal error or warning
     */
    captureException(error: any, context?: Record<string, any>): void {
        console.error('[Telemetry:Exception]', error, context);
        // Sentry.captureException(error, { extra: context });
    }

    /**
     * Get recent breadcrumbs for crash context
     */
    getBreadcrumbs(): BreadcrumbData[] {
        return [...this.breadcrumbs];
    }
}

export const telemetry = new TelemetryService();
