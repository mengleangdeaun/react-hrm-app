import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';

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
    | 'inactive';

interface StatusBadgeProps {
    status: StatusType | string;
    label?: string;
    size?: 'sm' | 'md';
    style?: any;
    textStyle?: any;
}

const STATUS_CONFIGS: Record<string, { bg: string; text: string; defaultLabel: string }> = {
    approved: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', defaultLabel: 'APPROVED' },
    present: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', defaultLabel: 'PRESENT' },
    positive: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', defaultLabel: 'POSITIVE' },
    active: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', defaultLabel: 'ACTIVE' },

    pending: { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', defaultLabel: 'PENDING' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', defaultLabel: 'WARNING' },
    holiday: { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', defaultLabel: 'HOLIDAY' },
    late: { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', defaultLabel: 'LATE' },

    rejected: { bg: 'rgba(220, 38, 38, 0.12)', text: '#DC2626', defaultLabel: 'REJECTED' },
    cancelled: { bg: 'rgba(220, 38, 38, 0.12)', text: '#DC2626', defaultLabel: 'CANCELLED' },
    absent: { bg: 'rgba(220, 38, 38, 0.12)', text: '#DC2626', defaultLabel: 'ABSENT' },
    inactive: { bg: 'rgba(220, 38, 38, 0.12)', text: '#DC2626', defaultLabel: 'INACTIVE' },

    day_off: { bg: 'rgba(244, 63, 94, 0.12)', text: '#F43F5E', defaultLabel: 'DAY OFF' },
    progress: { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563EB', defaultLabel: 'IN PROGRESS' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    label,
    size = 'md',
    style,
    textStyle,
}) => {
    const key = (status || '').toLowerCase();
    const config = STATUS_CONFIGS[key] || {
        bg: 'rgba(100, 116, 139, 0.12)',
        text: '#64748B',
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
                    paddingVertical: isSmall ? 2 : 3,
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
    },
});
