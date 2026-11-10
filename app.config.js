/**
 * Dynamic Expo config layered on top of app.json.
 *
 * app.json stays the single place for static metadata. This file only adds what depends on the
 * build being produced:
 *   1. A fail-fast guard so a store/APK build can never ship pointing at a developer's localhost.
 *   2. Release-only native build settings (code shrinking, ARM-only binaries).
 *   3. Cleartext (http://) networking, enabled only when the configured API URL actually needs it.
 */

/** EAS profiles that produce binaries for real users/testers (see eas.json). */
const RELEASE_PROFILES = new Set(['preview', 'production', 'production-apk']);

const LOCAL_HOST_PATTERN = /\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0)([:/]|$)/i;

module.exports = ({ config }) => {
    const profile = process.env.EAS_BUILD_PROFILE;
    const isReleaseProfile = RELEASE_PROFILES.has(profile);
    const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();

    if (isReleaseProfile) {
        if (!apiUrl || LOCAL_HOST_PATTERN.test(apiUrl)) {
            throw new Error(
                `[app.config] EXPO_PUBLIC_API_URL is ${apiUrl ? `"${apiUrl}"` : 'not set'} for the "${profile}" build.\n` +
                    'A release build must point at a server the phone can reach. Set it for this profile with\n' +
                    '  eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://your-server/api\n' +
                    'or under build.<profile>.env in eas.json. See docs/RELEASE_GUIDE.md.'
            );
        }
    }

    // Android (API 28+) and iOS (ATS) block plain http:// in release builds. Only open that door
    // when the configured backend really is http (e.g. an on-premise LAN server), and say so loudly.
    const needsCleartext = /^http:\/\//i.test(apiUrl) && isReleaseProfile;
    if (needsCleartext) {
        console.warn(
            `[app.config] EXPO_PUBLIC_API_URL uses http:// - enabling cleartext traffic for the "${profile}" build. ` +
                'Credentials and attendance data will travel unencrypted. Use https:// for anything outside a trusted LAN.'
        );
    }

    const buildProperties = [
        'expo-build-properties',
        {
            android: {
                // R8: smaller, faster-loading dex for low-memory devices. Release builds only.
                enableMinifyInReleaseBuilds: true,
                enableShrinkResourcesInReleaseBuilds: true,
                usesCleartextTraffic: needsCleartext,
                // Real phones are ARM. Dropping the x86/x86_64 emulator ABIs removes roughly a third
                // of the native libraries from the APK. Development builds keep every ABI so
                // emulators still work.
                ...(isReleaseProfile ? { buildArchs: ['armeabi-v7a', 'arm64-v8a'] } : {}),
            },
        },
    ];

    return {
        ...config,
        ios: {
            ...config.ios,
            infoPlist: {
                ...config.ios?.infoPlist,
                ...(needsCleartext ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } : {}),
            },
        },
        plugins: [...(config.plugins || []), buildProperties],
    };
};
