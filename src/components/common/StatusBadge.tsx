import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';

export type StatusType =
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'cancelled'
    | 'present'
    | 'late'
    | 'absent'
    | 'holiday'
    | 'day_off'
    | 'positive'
    | 'warning'
    | 'progress'
    | 'active'
    | 'inactive'
    | 'completed'
    | 'passed'
    | 'failed';

interface StatusBadgeProps {
    status: StatusType | string;
    label?: string;
    size?: 'sm' | 'md';
    style?: any;
    textStyle?: any;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    label,
    size = 'md',
    style,
    textStyle,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const key = (status || '').toLowerCase();

    const STATUS_MAP: Record<string, { bg: string; text: string; defaultLabel: string }> = {
        approved: { bg: theme.colors.status.successSubtle, text: theme.colors.status.success, defaultLabel: 'APPROVED' },
        present: { bg: theme.colors.status.successSubtle, text: theme.colors.status.success, defaultLabel: 'PRESENT' },
        positive: { bg: theme.colors.status.successSubtle, text: theme.colors.status.success, defaultLabel: 'POSITIVE' },
        active: { bg: theme.colors.status.successSubtle, text: theme.colors.status.success, defaultLabel: 'ACTIVE' },
        completed: { bg: theme.colors.status.successSubtle, text: theme.colors.status.success, defaultLabel: 'COMPLETED' },
        passed: { bg: theme.colors.status.successSubtle, text: theme.colors.status.success, defaultLabel: 'PASSED' },

        pending: { bg: theme.colors.status.warningSubtle, text: theme.colors.status.warning, defaultLabel: 'PENDING' },
        warning: { bg: theme.colors.status.warningSubtle, text: theme.colors.status.warning, defaultLabel: 'WARNING' },
        holiday: { bg: theme.colors.status.warningSubtle, text: theme.colors.status.warning, defaultLabel: 'HOLIDAY' },
        late: { bg: theme.colors.status.warningSubtle, text: theme.colors.status.warning, defaultLabel: 'LATE' },

        rejected: { bg: theme.colors.status.dangerSubtle, text: theme.colors.status.danger, defaultLabel: 'REJECTED' },
        cancelled: { bg: theme.colors.status.dangerSubtle, text: theme.colors.status.danger, defaultLabel: 'CANCELLED' },
        absent: { bg: theme.colors.status.dangerSubtle, text: theme.colors.status.danger, defaultLabel: 'ABSENT' },
        inactive: { bg: theme.colors.status.dangerSubtle, text: theme.colors.status.danger, defaultLabel: 'INACTIVE' },
        failed: { bg: theme.colors.status.dangerSubtle, text: theme.colors.status.danger, defaultLabel: 'FAILED' },

        day_off: { bg: theme.colors.status.dangerSubtle, text: theme.colors.status.danger, defaultLabel: 'DAY OFF' },
        progress: { bg: theme.colors.status.infoSubtle, text: theme.colors.status.info, defaultLabel: 'IN PROGRESS' },
    };

    const config = STATUS_MAP[key] || {
        bg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(100, 116, 139, 0.12)',
        text: theme.colors.textSecondary,
        defaultLabel: (status || '').toUpperCase(),
    };

    const isSmall = size === 'sm';

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: config.bg,
                    paddingHorizontal: isSmall ? 6 : 8,
                    paddingVertical: isSmall ? 3 : 4,
                    minHeight: isSmall ? 20 : 24,
                    minWidth: isSmall ? 48 : 56,
                },
                style,
            ]}
        >
            <AppText
                variant="nav"
                weight="bold"
                style={[
                    {
                        color: config.text,
                        fontSize: isSmall ? 9 : 10,
                        letterSpacing: 0.4,
                        textAlign: 'center',
                    },
                    textStyle,
                ]}
                numberOfLines={1}
            >
                {label || config.defaultLabel}
            </AppText>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        borderRadius: 6,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
});
