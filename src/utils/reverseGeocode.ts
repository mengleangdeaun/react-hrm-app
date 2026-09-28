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

    // 1. Primary: OpenStreetMap Nominatim (Proven in PWA Employee App)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en,km`;
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'EmployeeApp/1.0 (React-HRM-Mobile)',
                Accept: 'application/json',
            },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};

            // Prioritize street/road, village/suburb, district/khan, city
            const street = addr.road || addr.pedestrian || addr.street;
            const sub = addr.hamlet || addr.village || addr.suburb || addr.neighbourhood;
            const district = addr.town || addr.city_district || addr.district;
            const city = addr.city || addr.state || addr.county;

            const parts = [street, sub, district, city].filter(Boolean);

            if (parts.length > 0) {
                // Return top 2-3 most specific location components
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
    } catch (e) {
        // Network timeout, rate limit, or offline - proceed to native fallback
    }

    // 2. Secondary: Expo Native Geocoder (Google Play Services / iOS CLGeocoder)
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
    } catch (e) {
        // Native geocoder unavailable
    }

    // 3. Fallback: Friendly non-coordinate placeholder
    return 'Workplace Location';
}
