import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useNetworkStatus } from '../../offline/onlineManager';
import { useSyncQueue } from '../../offline/syncQueue';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { AppText as Text } from '../AppText';

export const OfflineBanner: React.FC = () => {
    const { isOnline } = useNetworkStatus();
    const { pendingCount } = useSyncQueue();
    const { isDark } = useAppTheme();
    const { t } = useTranslation();

    if (isOnline && pendingCount === 0) {
        return null;
    }

    if (isOnline && pendingCount > 0) {
        return (
            <View style={[styles.bannerContainer, styles.bannerSyncing]}>
                <RefreshCw color="#FFFFFF" size={13} />
                <Text style={styles.bannerText}>
                    {t('syncing_pending_actions', 'Syncing {{count}} offline update(s)...', { count: pendingCount })}
                </Text>
            </View>
        );
    }

    return (
        <View
            style={[
                styles.bannerContainer,
                isDark ? styles.bannerContainerDark : styles.bannerContainerLight,
            ]}
        >
            <WifiOff color="#FFFFFF" size={13} />
            <Text style={styles.bannerText}>
                {pendingCount > 0
                    ? t('offline_with_pending', 'Offline Mode • {{count}} pending sync', { count: pendingCount })
                    : t('offline_cached_mode', 'Offline Mode • Working from cached data')}
            </Text>
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
    bannerSyncing: {
        backgroundColor: '#2563EB',
    },
    bannerText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});

