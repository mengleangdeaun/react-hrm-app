import React, { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Calendar } from 'lucide-react-native';
import { AppText as Text } from '../../../components/AppText';
import { formatDateDisplay, formatTimeDisplay } from '../../../utils/dateTime';
import { useTranslation } from '../../../context/LanguageContext';
import { HistoryRecord } from '../types';

interface HistoryItemCardProps {
    item: HistoryRecord;
    locale?: string;
}

export const HistoryItemCard = memo<HistoryItemCardProps>(({ item, locale }) => {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const hasSplitShift = !!(item.session_1_out_time || item.session_2_in_time);

    return (
        <View style={styles.card}>
            {/* Card Header: Date */}
            <View style={styles.cardHeader}>
                <View style={styles.dateGroup}>
                    <Calendar color={theme.colors.primary} size={16} />
                    <Text style={styles.dateText}>{formatDateDisplay(item.date, 'full', 'N/A', locale)}</Text>
                </View>
            </View>

            {/* Session 1 Row (Clean, no icons) */}
            <View style={styles.sessionBox}>
                <View style={styles.sessionItem}>
                    <Text style={styles.sessionLabel}>{t('clock_in', 'Clock In')}</Text>
                    <Text style={styles.sessionValue}>{formatTimeDisplay(item.clock_in_time)}</Text>
                </View>

                <View style={styles.sessionDivider} />

                <View style={styles.sessionItem}>
                    <Text style={styles.sessionLabel}>
                        {hasSplitShift ? t('lunch_out', 'Lunch Out') : t('clock_out', 'Clock Out')}
                    </Text>
                    <Text style={styles.sessionValue}>
                        {formatTimeDisplay(hasSplitShift ? item.session_1_out_time : (item.clock_out_time || item.session_1_out_time))}
                    </Text>
                </View>
            </View>

            {/* Optional Session 2 Row (Split Shift) */}
            {hasSplitShift && (
                <View style={[styles.sessionBox, { marginTop: 6, backgroundColor: (theme.colors as any).surfaceSubtle || theme.colors.surface }]}>
                    <View style={styles.sessionItem}>
                        <Text style={styles.sessionLabel}>{t('afternoon_in', 'Afternoon In')}</Text>
                        <Text style={styles.sessionValue}>{formatTimeDisplay(item.session_2_in_time)}</Text>
                    </View>

                    <View style={styles.sessionDivider} />

                    <View style={styles.sessionItem}>
                        <Text style={styles.sessionLabel}>{t('clock_out', 'Clock Out')}</Text>
                        <Text style={styles.sessionValue}>{formatTimeDisplay(item.clock_out_time)}</Text>
                    </View>
                </View>
            )}
        </View>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.cardPadding,
        marginHorizontal: theme.spacing.screenGutter,
        marginBottom: theme.spacing.sm + 2,
        borderWidth: 0.5,
        borderColor: (theme.colors as any).borderSubtle || theme.colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    dateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    sessionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: (theme.colors as any).surfaceSubtle || theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
    },
    sessionItem: {
        flex: 1,
        alignItems: 'center',
    },
    sessionDivider: {
        width: 1,
        height: 28,
        backgroundColor: theme.colors.border,
    },
    sessionLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    sessionValue: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        letterSpacing: 0.2,
    },
}));
