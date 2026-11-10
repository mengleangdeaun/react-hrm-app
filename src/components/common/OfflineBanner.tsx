import React from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useNetworkStatus } from '../../offline/onlineManager';
import { useSyncQueue } from '../../offline/syncQueue';
import { useTranslation } from '../../context/LanguageContext';
import { AppText as Text } from '../AppText';

export const OfflineBanner: React.FC = () => {
    const { isOnline } = useNetworkStatus();
    const { pendingCount, isSyncing } = useSyncQueue();
    const { theme } = useUnistyles();
    const { t } = useTranslation();

    if (isOnline && pendingCount === 0 && !isSyncing) {
        return null;
    }

    if (isOnline && (pendingCount > 0 || isSyncing)) {
        return (
            <View style={[styles.bannerContainer, styles.bannerSyncing]}>
                <RefreshCw color={theme.colors.onSolid} size={13} />
                <Text style={styles.bannerText}>
                    {t('syncing_pending_actions', 'Syncing {{count}} offline update(s)...', { count: pendingCount })}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.bannerContainer, styles.bannerOffline]}>
            <WifiOff color={theme.colors.onSolid} size={13} />
            <Text style={styles.bannerText}>
                {pendingCount > 0
                    ? t('offline_with_pending', 'Offline Mode • {{count}} pending sync', { count: pendingCount })
                    : t('offline_cached_mode', 'Offline Mode • Working from cached data')}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create((theme) => ({
    bannerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        paddingVertical: 6,
        paddingHorizontal: theme.spacing.lg,
    },
    bannerOffline: {
        backgroundColor: theme.colors.solid.neutral,
    },
    bannerSyncing: {
        backgroundColor: theme.colors.solid.info,
    },
    bannerText: {
        color: theme.colors.onSolid,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
}));
