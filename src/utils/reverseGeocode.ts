import * as Location from 'expo-location';

/**
 * Multi-tiered Reverse Geocoding Utility
 * 
 * Resolves human-readable place/street names from GPS coordinates.
 * Follows the PWA Employee App implementation using OpenStreetMap (Nominatim)
 * with graceful fallback to native Expo Location and friendly offline labels.
 * 
 * GUARANTEE: Never returns raw numeric latitude/longitude as the location name.
 */
export async function reverseGeocodeLocation(
    latitude: number,
    longitude: number
): Promise<string> {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return 'Workplace Location';
    }

    // 1. Primary: Expo Native Geocoder (Apple CoreLocation / Google Play Services)
    // Runs on-device, fully cached by OS, zero external rate-limiting or quota risk
    try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (Array.isArray(results) && results.length > 0) {
            const r = results[0];
            const nameIsCoord = r.name && (r.name.includes('.') || r.name.includes(','));
            const safeName = !nameIsCoord ? r.name : null;

            const parts = [
                safeName,
                r.street,
                r.district || r.subregion,
                r.city,
            ].filter(Boolean);

            if (parts.length > 0) {
                return parts.slice(0, 3).join(', ');
            }
        }
    } catch {
        // Native geocoder unavailable or no internet for OS provider - try fallback
    }

    // 2. Secondary Fallback: OpenStreetMap Nominatim with strict safety timeout
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en,km`;
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'SCCG-HRMS-Mobile/1.0',
                Accept: 'application/json',
            },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};

            const street = addr.road || addr.pedestrian || addr.street;
            const sub = addr.hamlet || addr.village || addr.suburb || addr.neighbourhood;
            const district = addr.town || addr.city_district || addr.district;
            const city = addr.city || addr.state || addr.county;

            const parts = [street, sub, district, city].filter(Boolean);

            if (parts.length > 0) {
                return parts.slice(0, 3).join(', ');
            }

            if (data.name) {
                return data.name;
            }

            if (data.display_name) {
                const chunks = data.display_name.split(',').map((s: string) => s.trim());
                return chunks.slice(0, 3).join(', ');
            }
        }
    } catch {
        // Fallback network unavailable
    }

    // 3. Fallback: Friendly non-coordinate placeholder
    return 'Workplace Location';
}
