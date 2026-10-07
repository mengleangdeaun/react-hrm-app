export interface GpsLocation {
    coords: {
        latitude: number;
        longitude: number;
        altitude?: number | null;
        accuracy?: number | null;
        altitudeAccuracy?: number | null;
        heading?: number | null;
        speed?: number | null;
    };
    timestamp: number;
}

export type { HistoryRecord, AttendanceClockInResponse } from '../../../api/attendance';
