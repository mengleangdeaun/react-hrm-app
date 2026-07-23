import { Platform } from 'react-native';

const getApiUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
    if (Platform.OS === 'android') {
        // 10.0.2.2 is the Android Emulator alias to host machine's 127.0.0.1
        url = url.replace('127.0.0.1', '10.0.2.2').replace('localhost', '10.0.2.2');
    }
    return url;
};

export const ENV = {
    API_URL: getApiUrl(),
    APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'HRMS Mobile App',
    DEFAULT_LATITUDE: Number(process.env.EXPO_PUBLIC_DEFAULT_LATITUDE) || 11.5564,
    DEFAULT_LONGITUDE: Number(process.env.EXPO_PUBLIC_DEFAULT_LONGITUDE) || 104.9282,
    GEOFENCE_RADIUS_METERS: Number(process.env.EXPO_PUBLIC_GEOFENCE_RADIUS_METERS) || 100,
};
