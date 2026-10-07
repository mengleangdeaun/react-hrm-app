import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText as Text } from '../../../components/AppText';
import { useTranslation } from '../../../context/LanguageContext';

export type LeaveStatusFilterType = 'all' | 'pending' | 'approved' | 'rejected';

interface LeaveStatusChipsProps {
    statusFilter: LeaveStatusFilterType;
    onSelectStatus: (status: LeaveStatusFilterType) => void;
    statusCounts: {
        all: number;
        pending: number;
        approved: number;
        rejected: number;
    };
}

export const LeaveStatusChips: React.FC<LeaveStatusChipsProps> = ({
    statusFilter,
    onSelectStatus,
    statusCounts,
}) => {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const handlePress = (status: LeaveStatusFilterType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onSelectStatus(status);
    };

    return (
        <View style={styles.statusChipsRow}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statusChipsContent}
            >
                <TouchableOpacity
                    style={[styles.statusChip, statusFilter === 'all' && styles.statusChipActive]}
                    onPress={() => handlePress('all')}
                >
                    <Text style={[styles.statusChipText, statusFilter === 'all' && styles.statusChipTextActive]}>
                        {t('all', 'All')}
                    </Text>
                    <View style={[styles.statusChipBadge, statusFilter === 'all' && styles.statusChipBadgeActive]}>
                        <Text style={[styles.statusChipBadgeText, statusFilter === 'all' && styles.statusChipBadgeTextActive]}>
                            {statusCounts.all}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.statusChip, statusFilter === 'pending' && styles.statusChipActive]}
                    onPress={() => handlePress('pending')}
                >
                    <View style={styles.statusChipDotPending} />
                    <Text style={[styles.statusChipText, statusFilter === 'pending' && styles.statusChipTextActive]}>
                        {t('pending', 'Pending')}
                    </Text>
                    <View style={[styles.statusChipBadge, statusFilter === 'pending' && styles.statusChipBadgeActive]}>
                        <Text style={[styles.statusChipBadgeText, statusFilter === 'pending' && styles.statusChipBadgeTextActive]}>
                            {statusCounts.pending}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.statusChip, statusFilter === 'approved' && styles.statusChipActive]}
                    onPress={() => handlePress('approved')}
                >
                    <View style={styles.statusChipDotApproved} />
                    <Text style={[styles.statusChipText, statusFilter === 'approved' && styles.statusChipTextActive]}>
                        {t('approved', 'Approved')}
                    </Text>
                    <View style={[styles.statusChipBadge, statusFilter === 'approved' && styles.statusChipBadgeActive]}>
                        <Text style={[styles.statusChipBadgeText, statusFilter === 'approved' && styles.statusChipBadgeTextActive]}>
                            {statusCounts.approved}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.statusChip, statusFilter === 'rejected' && styles.statusChipActive]}
                    onPress={() => handlePress('rejected')}
                >
                    <View style={styles.statusChipDotRejected} />
                    <Text style={[styles.statusChipText, statusFilter === 'rejected' && styles.statusChipTextActive]}>
                        {t('rejected', 'Rejected')}
                    </Text>
                    <View style={[styles.statusChipBadge, statusFilter === 'rejected' && styles.statusChipBadgeActive]}>
                        <Text style={[styles.statusChipBadgeText, statusFilter === 'rejected' && styles.statusChipBadgeTextActive]}>
                            {statusCounts.rejected}
                        </Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    statusChipsRow: {
        marginBottom: theme.spacing.md + 2,
    },
    statusChipsContent: {
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.screenGutter,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 6,
    },
    statusChipActive: {
        backgroundColor: theme.colors.brand,
        borderColor: theme.colors.brand,
    },
    statusChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    statusChipTextActive: {
        color: '#FFFFFF',
    },
    statusChipBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusChipBadgeActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    statusChipBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    statusChipBadgeTextActive: {
        color: '#FFFFFF',
    },
    statusChipDotPending: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#F59E0B',
    },
    statusChipDotApproved: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#10B981',
    },
    statusChipDotRejected: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#EF4444',
    },
}));
