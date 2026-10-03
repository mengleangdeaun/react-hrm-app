import React, { memo, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { AppText as Text } from '../AppText';
import { LeaveBalance } from '../../api/leave';
import {
    getRemainingDays,
    getUsedDays,
    getAllocatedDays,
    getLeaveTypeName,
    getLeaveTypeId,
} from './leaveUtils';

export interface LeaveBalanceCardProps {
    item: LeaveBalance;
    isSelected: boolean;
    t: (key: string, fallback?: string, params?: any) => string;
    onPress: (typeId: number | null) => void;
}

export const LeaveBalanceCard = memo(({ item, isSelected, t, onPress }: LeaveBalanceCardProps) => {
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const remaining = getRemainingDays(item);
    const used = getUsedDays(item);
    const allocated = getAllocatedDays(item);
    const progressPercent = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
    const typeName = getLeaveTypeName(item.leave_type, item, t('leave', 'Leave'));
    const typeId = getLeaveTypeId(item);

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress(isSelected ? null : typeId);
    }, [isSelected, typeId, onPress]);

    return (
        <Pressable
            style={[styles.balanceCard, isSelected && styles.balanceCardSelected]}
            onPress={handlePress}
            android_ripple={{ color: theme.colors.primarySubtle }}
            accessibilityRole="button"
            accessibilityLabel={`${typeName} balance: ${remaining} days remaining`}
            accessibilityState={{ selected: isSelected }}
        >
            <View style={styles.balanceCardTop}>
                <Text style={[styles.balanceType, isSelected && styles.balanceTypeSelected]} numberOfLines={1}>
                    {typeName.toUpperCase()}
                </Text>
                {isSelected && (
                    <View style={styles.activeFilterDot}>
                        <Check color="#FFFFFF" size={10} strokeWidth={3} />
                    </View>
                )}
            </View>

            <View style={styles.balanceNumberRow}>
                <Text style={[styles.balanceRemaining, isSelected && styles.balanceRemainingSelected]}>
                    {remaining}
                </Text>
                <Text style={styles.balanceDaysLabel}>
                    {remaining === 1 ? t('day_left', 'Day left') : t('days_left', 'Days left')}
                </Text>
            </View>

            <View style={styles.balanceProgressContainer}>
                <View style={styles.balanceProgressTrack}>
                    <View
                        style={[
                            styles.balanceProgressBar,
                            { width: `${progressPercent}%` },
                            isSelected && styles.balanceProgressBarSelected,
                        ]}
                    />
                </View>
            </View>

            <Text style={styles.balanceSub} numberOfLines={1}>
                {t('used_days_of_total', `Used ${used} of ${allocated} days`)}
            </Text>
        </Pressable>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    balanceCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.cardPadding,
        width: 168,
        borderWidth: 1,
        borderColor: (theme.colors as any).borderSubtle || theme.colors.border,
        ...theme.shadows.xs,
    },
    balanceCardSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
    },
    balanceCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    balanceType: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        flex: 1,
    },
    balanceTypeSelected: {
        color: theme.colors.primary,
    },
    activeFilterDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    balanceNumberRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginVertical: 4,
    },
    balanceRemaining: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.textPrimary,
    },
    balanceRemainingSelected: {
        color: theme.colors.primary,
    },
    balanceDaysLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    balanceProgressContainer: {
        marginVertical: 6,
    },
    balanceProgressTrack: {
        height: 5,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surfaceSubtle,
        overflow: 'hidden',
    },
    balanceProgressBar: {
        height: '100%',
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
    },
    balanceProgressBarSelected: {
        backgroundColor: theme.colors.primary,
    },
    balanceSub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
}));
