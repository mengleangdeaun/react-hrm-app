import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AppText as Text } from '../AppText';
import { Calendar, Check, X, ArrowRight, User } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { useTranslation } from '../../context/LanguageContext';
import { formatDateDisplay, formatTimeDisplay } from '../../utils/dateTime';
import { DayOffRequestItem } from '../../api/dayoff';

interface DayOffApprovalCardProps {
    request: DayOffRequestItem;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
}

export const DayOffApprovalCard: React.FC<DayOffApprovalCardProps> = ({
    request,
    onApprove,
    onReject,
}) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    const emp = request.employee;
    const rawAvatar = emp?.profile_image_url || emp?.profile_image;
    const avatarUrl = typeof rawAvatar === 'string' && rawAvatar.trim().length > 0 ? rawAvatar.trim() : null;

    const currentDays = request.current_days_off || [];
    const requestedDays = request.requested_days_off || [];

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Header: Employee Profile & Created At */}
            <View style={styles.headerRow}>
                <View style={styles.employeeInfo}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primarySubtle }]}>
                            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                                {emp?.full_name?.charAt(0)?.toUpperCase() || 'E'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.nameBlock}>
                        <Text style={[styles.employeeName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                            {emp?.full_name || t('employee', 'Employee')}
                        </Text>
                        <Text style={[styles.employeeId, { color: theme.colors.textSecondary }]}>
                            ID: {emp?.employee_id || 'N/A'}
                        </Text>
                    </View>
                </View>

                <View style={styles.dateBlock}>
                    <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                        {formatDateDisplay(request.created_at, 'dayMonth')}
                    </Text>
                    <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                        {formatTimeDisplay(request.created_at)}
                    </Text>
                </View>
            </View>

            {/* Schedule Transition Diff Box */}
            <View style={[styles.diffBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                <View style={styles.diffRow}>
                    {/* Current Days Off */}
                    <View style={styles.diffCol}>
                        <Text style={[styles.diffLabel, { color: theme.colors.textSecondary }]}>
                            {t('current', 'Current')}
                        </Text>
                        <View style={styles.chipRow}>
                            {currentDays.length > 0 ? (
                                currentDays.map((d) => (
                                    <View key={d} style={[styles.dayChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                        <Text style={[styles.dayChipText, { color: theme.colors.textSecondary }]}>
                                            {t(d.toLowerCase(), d).slice(0, 3)}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={[styles.emptyDiffText, { color: theme.colors.textMuted }]}>
                                    {t('no_day_off', 'No day off')}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Transition Arrow */}
                    <View style={[styles.arrowCircle, { backgroundColor: theme.colors.primarySubtle }]}>
                        <ArrowRight color={theme.colors.primary} size={14} />
                    </View>

                    {/* Requested Days Off */}
                    <View style={[styles.diffCol, { alignItems: 'flex-end' }]}>
                        <Text style={[styles.diffLabel, { color: theme.colors.primary }]}>
                            {t('requested', 'Requested')}
                        </Text>
                        <View style={[styles.chipRow, { justifyContent: 'flex-end' }]}>
                            {request.frequency === 'specific_dates' ? (
                                (request.specific_dates || []).map((d) => (
                                    <View key={d} style={[styles.dayChip, { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }]}>
                                        <Text style={[styles.dayChipText, { color: '#FFFFFF' }]}>
                                            {formatDateDisplay(d, 'dayMonth')}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <>
                                    {requestedDays.map((d) => (
                                        <View key={d} style={[styles.dayChip, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                                            <Text style={[styles.dayChipText, { color: '#FFFFFF' }]}>
                                                {t(d.toLowerCase(), d).slice(0, 3)}
                                            </Text>
                                        </View>
                                    ))}
                                    {request.frequency === 'monthly' && request.weeks_of_month && (
                                        <View style={[styles.dayChip, { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}>
                                            <Text style={[styles.dayChipText, { color: '#FFFFFF' }]}>
                                                {t('weeks', 'W')}: {request.weeks_of_month.map((w) => (w === 5 ? t('last', 'L') : w)).join(',')}
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* Effective Period */}
                <View style={[styles.effectiveRow, { borderTopColor: theme.colors.border }]}>
                    <View style={styles.effectiveLeft}>
                        <Calendar color={theme.colors.textSecondary} size={13} />
                        <Text style={[styles.effectiveLabel, { color: theme.colors.textSecondary }]}>
                            {t('effective_period', 'Effective Period')}
                        </Text>
                    </View>
                    <Text style={[styles.effectiveValue, { color: theme.colors.textPrimary }]}>
                        {formatDateDisplay(request.effective_from, 'standard')}
                        {request.effective_to ? ` → ${formatDateDisplay(request.effective_to, 'standard')}` : ` (${t('ongoing', 'Ongoing')})`}
                    </Text>
                </View>
            </View>

            {/* Request Reason */}
            {Boolean(request.reason) && (
                <View style={[styles.reasonBox, { borderLeftColor: theme.colors.primary }]}>
                    <Text style={[styles.reasonLabel, { color: theme.colors.textSecondary }]}>
                        {t('reason', 'Reason')}
                    </Text>
                    <Text style={[styles.reasonText, { color: theme.colors.textPrimary }]} numberOfLines={3}>
                        "{request.reason}"
                    </Text>
                </View>
            )}

            {/* Approve / Reject Actions */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    onPress={() => onApprove(Number(request.id))}
                    style={[styles.actionBtn, styles.approveBtn, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Approve day off request"
                >
                    <Check color="#FFFFFF" size={16} />
                    <Text style={styles.actionBtnText}>{t('approve', 'Approve')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onReject(Number(request.id))}
                    style={[styles.actionBtn, styles.rejectBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Reject day off request"
                >
                    <X color="#EF4444" size={16} />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>{t('reject', 'Reject')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    employeeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 14,
    },
    avatarFallback: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '800',
    },
    nameBlock: {
        flex: 1,
    },
    employeeName: {
        fontSize: 14,
        fontWeight: '700',
    },
    employeeId: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    dateBlock: {
        alignItems: 'flex-end',
    },
    dateText: {
        fontSize: 11,
        fontWeight: '700',
    },
    timeText: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 1,
    },
    diffBox: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 12,
    },
    diffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    diffCol: {
        flex: 1,
    },
    diffLabel: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    dayChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    dayChipText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    emptyDiffText: {
        fontSize: 11,
        fontStyle: 'italic',
    },
    arrowCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    effectiveRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        marginTop: 10,
        paddingTop: 8,
    },
    effectiveLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    effectiveLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    effectiveValue: {
        fontSize: 11,
        fontWeight: '700',
    },
    reasonBox: {
        borderLeftWidth: 3,
        paddingLeft: 10,
        marginBottom: 14,
    },
    reasonLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    reasonText: {
        fontSize: 12,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    approveBtn: {},
    rejectBtn: {
        borderWidth: 1,
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});
