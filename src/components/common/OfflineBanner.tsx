import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../../offline/onlineManager';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText as Text } from '../AppText';

export const OfflineBanner: React.FC = () => {
    const { isOnline } = useNetworkStatus();
    const { isDark } = useAppTheme();

    if (isOnline) {
        return null;
    }

    return (
        <View
            style={[
                styles.bannerContainer,
                isDark ? styles.bannerContainerDark : styles.bannerContainerLight,
            ]}
        >
            <WifiOff color="#FFFFFF" size={14} />
            <Text style={styles.bannerText}>Offline Mode • Working from cached data</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    bannerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    bannerContainerLight: {
        backgroundColor: '#4B5563',
    },
    bannerContainerDark: {
        backgroundColor: '#374151',
    },
    bannerText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
