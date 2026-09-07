import React, { useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
    Calendar,
    CalendarCheck,
    Clock,
    Check,
    X,
    Plus,
    Trash2,
    Send,
    FileText,
    ArrowRight,
} from 'lucide-react-native';

import { AppText as Text } from '../../components/AppText';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppShell } from '../../components/common/AppShell';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { NativeDatePickerField } from '../../components/common/NativeDatePickerField';
import { useTranslation } from '../../context/LanguageContext';
import {
    formatDateDisplay,
    formatTimeDisplay,
    getTodayDateString,
} from '../../utils/dateTime';

import { EmptyState } from '../../components/common/EmptyState';
import { DayOffSkeleton } from '../../components/common/Skeletons';
import {
    dayOffApi,
    DayOffInfo,
    DayOffRequestItem,
    SubmitDayOffPayload,
} from '../../api/dayoff';
import { DayOffApprovalCard } from '../../components/dayoff/DayOffApprovalCard';
import { DayOffActionModal } from '../../components/dayoff/DayOffActionModal';

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const FULL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const DayOffScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;
    const queryClient = useQueryClient();

    const initialTab = route?.params?.tab === 'approvals' ? 'approvals' : 'my';
    const [activeTab, setActiveTab] = useState<'my' | 'approvals'>(initialTab);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'specific_dates'>('weekly');
    const [requestedDaysOff, setRequestedDaysOff] = useState<string[]>([]);
    const [weeksOfMonth, setWeeksOfMonth] = useState<number[]>([]);
    const [specificDates, setSpecificDates] = useState<string[]>([]);
    const [effectiveFrom, setEffectiveFrom] = useState(() => getTodayDateString());
    const [effectiveTo, setEffectiveTo] = useState('');
    const [reason, setReason] = useState('');
    const [pickerDate, setPickerDate] = useState(() => getTodayDateString());

    // Action Modal State
    const [actionId, setActionId] = useState<number | null>(null);
    const [actionMode, setActionMode] = useState<'approve' | 'reject' | 'cancel' | null>(null);

    // Queries
    const {
        data: info,
        isLoading: isInfoLoading,
        isRefetching: isInfoRefetching,
        refetch: refetchInfo,
    } = useQuery<DayOffInfo>({
        queryKey: ['dayOffInfo'],
        queryFn: dayOffApi.getDayOffInfo,
    });

    const {
        data: requests = [],
        isLoading: isRequestsLoading,
        isRefetching: isRequestsRefetching,
        refetch: refetchRequests,
    } = useQuery<DayOffRequestItem[]>({
        queryKey: ['dayOffRequests'],
        queryFn: dayOffApi.getMyRequests,
    });

    const {
        data: teamRequests = [],
        isLoading: isTeamLoading,
        isRefetching: isTeamRefetching,
        refetch: refetchTeam,
    } = useQuery<DayOffRequestItem[]>({
        queryKey: ['teamDayOffRequests'],
        queryFn: dayOffApi.getTeamApprovals,
    });

    const isRefreshing = isInfoRefetching || isRequestsRefetching || isTeamRefetching;

    const onRefresh = useCallback(() => {
        refetchInfo();
        refetchRequests();
        refetchTeam();
    }, [refetchInfo, refetchRequests, refetchTeam]);

    // Mutations
    const submitMutation = useMutation({
        mutationFn: (payload: SubmitDayOffPayload) => dayOffApi.submitRequest(payload),
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            queryClient.invalidateQueries({ queryKey: ['dayOffRequests'] });
            queryClient.invalidateQueries({ queryKey: ['dayOffInfo'] });
            setShowForm(false);
            resetForm();
            Alert.alert(t('success', 'Success'), t('request_submitted_successfully', 'Day-off change request submitted successfully.'));
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || t('failed_to_submit', 'Failed to submit day-off request.');
            Alert.alert(t('error', 'Error'), msg);
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: number) => dayOffApi.approveRequest(id),
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            queryClient.invalidateQueries({ queryKey: ['teamDayOffRequests'] });
            queryClient.invalidateQueries({ queryKey: ['dayOffInfo'] });
            closeAction();
            Alert.alert(t('approved', 'Approved'), t('request_approved', 'Request approved successfully.'));
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || t('failed_to_approve', 'Failed to approve request.');
            Alert.alert(t('error', 'Error'), msg);
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) => dayOffApi.rejectRequest(id, reason),
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            queryClient.invalidateQueries({ queryKey: ['teamDayOffRequests'] });
            closeAction();
            Alert.alert(t('rejected', 'Rejected'), t('request_rejected', 'Request rejected successfully.'));
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || t('failed_to_reject', 'Failed to reject request.');
            Alert.alert(t('error', 'Error'), msg);
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (id: number) => dayOffApi.cancelRequest(id),
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            queryClient.invalidateQueries({ queryKey: ['dayOffRequests'] });
            closeAction();
            Alert.alert(t('cancelled', 'Cancelled'), t('request_cancelled', 'Request cancelled.'));
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || t('failed_to_cancel', 'Failed to cancel request.');
            Alert.alert(t('error', 'Error'), msg);
        },
    });

    const resetForm = () => {
        setRequestedDaysOff([]);
        setWeeksOfMonth([]);
        setSpecificDates([]);
        setEffectiveFrom(getTodayDateString());
        setEffectiveTo('');
        setReason('');
        setFrequency('weekly');
        setPickerDate(getTodayDateString());
    };

    const toggleDay = (day: string) => {
        const dayKey = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
        setRequestedDaysOff((prev) =>
            prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
        );
    };

    const toggleWeek = (week: number) => {
        setWeeksOfMonth((prev) =>
            prev.includes(week) ? prev.filter((w) => w !== week) : [...prev, week]
        );
    };

    const addSpecificDate = (date: string) => {
        if (date && !specificDates.includes(date)) {
            setSpecificDates((prev) => [...prev, date].sort());
        }
        setPickerDate(date);
    };

    const removeSpecificDate = (date: string) => {
        setSpecificDates((prev) => prev.filter((d) => d !== date));
    };

    const handleSubmitForm = () => {
        if (frequency !== 'specific_dates' && requestedDaysOff.length === 0) {
            Alert.alert(t('required', 'Required'), t('select_at_least_one_day', 'Please select at least one day off.'));
            return;
        }
        if (frequency === 'monthly' && weeksOfMonth.length === 0) {
            Alert.alert(t('required', 'Required'), t('select_at_least_one_week', 'Please select at least one week of month.'));
            return;
        }
        if (frequency === 'specific_dates' && specificDates.length === 0) {
            Alert.alert(t('required', 'Required'), t('select_at_least_one_date', 'Please add at least one specific date.'));
            return;
        }
        if (!reason.trim()) {
            Alert.alert(t('required', 'Required'), t('provide_reason', 'Please provide a reason for this change request.'));
            return;
        }

        submitMutation.mutate({
            frequency,
            requested_days_off: frequency !== 'specific_dates' ? requestedDaysOff : [],
            weeks_of_month: frequency === 'monthly' ? weeksOfMonth : [],
            specific_dates: frequency === 'specific_dates' ? specificDates : [],
            effective_from: effectiveFrom,
            effective_to: effectiveTo ? effectiveTo : undefined,
            reason: reason.trim(),
        });
    };

    const handleConfirmAction = (confirmReason?: string) => {
        if (!actionId || !actionMode) return;
        if (actionMode === 'approve') {
            approveMutation.mutate(actionId);
        } else if (actionMode === 'reject') {
            rejectMutation.mutate({ id: actionId, reason: confirmReason || '' });
        } else if (actionMode === 'cancel') {
            cancelMutation.mutate(actionId);
        }
    };

    const closeAction = () => {
        setActionId(null);
        setActionMode(null);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved':
                return {
                    bg: theme.colors.status.successSubtle,
                    border: theme.colors.status.successBorder,
                    color: theme.colors.status.success,
                    icon: <Check size={12} color={theme.colors.status.success} />,
                    label: t('approved', 'Approved'),
                };
            case 'rejected':
                return {
                    bg: theme.colors.status.dangerSubtle,
                    border: theme.colors.status.dangerBorder,
                    color: theme.colors.status.danger,
                    icon: <X size={12} color={theme.colors.status.danger} />,
                    label: t('rejected', 'Rejected'),
                };
            default:
                return {
                    bg: theme.colors.status.warningSubtle,
                    border: theme.colors.status.warningBorder,
                    color: theme.colors.status.warning,
                    icon: <Clock size={12} color={theme.colors.status.warning} />,
                    label: t('pending', 'Pending'),
                };
        }
    };

    const headerRight = (
        activeTab === 'my' && (
            <HeaderIconButton
                icon={showForm ? <X color={theme.colors.textPrimary} size={20} /> : <Plus color={theme.colors.brand} size={20} />}
                onPress={() => {
                    if (showForm) {
                        setShowForm(false);
                    } else {
                        resetForm();
                        setShowForm(true);
                    }
                }}
                accessibilityLabel={showForm ? 'Close form' : 'Request change'}
            />
        )
    );

    return (
        <AppShell
            title={t('day_off', 'Day Off')}
            onBack={() => navigation.goBack()}
            headerRight={headerRight}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
        >
            {/* Top Navigation Tabs */}
            <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <TouchableOpacity
                    onPress={() => {
                        setActiveTab('my');
                        setShowForm(false);
                    }}
                    style={[styles.tabBtn, activeTab === 'my' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 }]}
                    activeOpacity={0.7}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === 'my' }}
                >
                    <Text style={[styles.tabBtnText, { color: activeTab === 'my' ? theme.colors.primary : theme.colors.textSecondary }]}>
                        {t('tab_my_requests', 'My Requests')}
                    </Text>
                </TouchableOpacity>

                {teamRequests.length > 0 && (
                    <TouchableOpacity
                        onPress={() => {
                            setActiveTab('approvals');
                            setShowForm(false);
                        }}
                        style={[styles.tabBtn, styles.tabBtnWithBadge, activeTab === 'approvals' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 }]}
                        activeOpacity={0.7}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: activeTab === 'approvals' }}
                    >
                        <Text style={[styles.tabBtnText, { color: activeTab === 'approvals' ? theme.colors.primary : theme.colors.textSecondary }]}>
                            {t('tab_approvals', 'Approvals')}
                        </Text>
                        <View style={[styles.badgePill, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.badgePillText}>{teamRequests.length}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {activeTab === 'my' ? (
                <>
                    {/* 1. Current Schedule Card */}
                    <View style={[styles.scheduleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.scheduleHeader}>
                            <View style={[styles.scheduleIconWrapper, { backgroundColor: theme.colors.primarySubtle }]}>
                                <Calendar color={theme.colors.primary} size={20} />
                            </View>
                            <View style={styles.scheduleTitleWrapper}>
                                <Text style={[styles.scheduleCardTitle, { color: theme.colors.textPrimary }]}>
                                    {t('current_schedule', 'Current Schedule')}
                                </Text>
                                <Text style={[styles.scheduleShiftName, { color: theme.colors.textSecondary }]}>
                                    {info?.working_shift?.name || t('standard_shift', 'Standard Shift')}
                                </Text>
                            </View>
                        </View>

                        {/* Schedule Content */}
                        {isInfoLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 16 }} />
                        ) : info?.day_off_frequency === 'specific_dates' ? (
                            <View style={styles.specificChipsWrap}>
                                {(info.day_off_specific_dates || []).map((d) => (
                                    <View key={d} style={[styles.specificChip, { backgroundColor: theme.colors.primarySubtle }]}>
                                        <Text style={[styles.specificChipText, { color: theme.colors.primary }]}>
                                            {formatDateDisplay(d, 'standard')}
                                        </Text>
                                    </View>
                                ))}
                                {(!info.day_off_specific_dates || info.day_off_specific_dates.length === 0) && (
                                    <Text style={[styles.emptyScheduleText, { color: theme.colors.textMuted }]}>
                                        {t('no_specific_dates', 'No specific dates defined')}
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.weekGridWrap}>
                                <View style={styles.weekDaysRow}>
                                    {ALL_DAYS.map((d, i) => {
                                        const isOff = (info?.resolved_days_off || []).some(
                                            (dn) => dn.toLowerCase() === FULL_DAYS[i]
                                        );
                                        return (
                                            <View key={d} style={styles.dayCol}>
                                                <View
                                                    style={[
                                                        styles.daySquare,
                                                        {
                                                            backgroundColor: isOff
                                                                ? theme.colors.primary
                                                                : theme.colors.surfaceSubtle,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.daySquareText,
                                                            {
                                                                color: isOff ? '#FFFFFF' : theme.colors.textSecondary,
                                                            },
                                                        ]}
                                                    >
                                                        {t(d, d).slice(0, 3)}
                                                    </Text>
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.dayStatusSub,
                                                        {
                                                            color: isOff
                                                                ? theme.colors.primary
                                                                : theme.colors.textMuted,
                                                        },
                                                    ]}
                                                >
                                                    {isOff ? t('off', 'Off') : t('work', 'Work')}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                {info?.day_off_frequency === 'monthly' && info?.day_off_weeks && (
                                    <View style={[styles.monthlyNoteRow, { borderTopColor: theme.colors.border }]}>
                                        <Text style={[styles.monthlyNoteText, { color: theme.colors.textSecondary }]}>
                                            {t('occurs_on_weeks', 'Occurs on')}:{' '}
                                            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
                                                {info.day_off_weeks
                                                    .map((w) => (w === 5 ? t('last', 'Last') : `${w}${w === 1 ? 'st' : w === 2 ? 'nd' : w === 3 ? 'rd' : 'th'}`))
                                                    .join(', ')}
                                            </Text>
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* 2. Interactive Request Change Form */}
                    {showForm && (
                        <View style={[styles.formCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <View style={styles.formHeader}>
                                <View style={[styles.formIconWrapper, { backgroundColor: theme.colors.primarySubtle }]}>
                                    <CalendarCheck color={theme.colors.primary} size={20} />
                                </View>
                                <Text style={[styles.formTitle, { color: theme.colors.textPrimary }]}>
                                    {t('request_change', 'Request Day-Off Change')}
                                </Text>
                            </View>

                            {/* Frequency Segmented Control */}
                            <View style={[styles.segmentedRow, { backgroundColor: theme.colors.surfaceSubtle }]}>
                                {(['weekly', 'monthly', 'specific_dates'] as const).map((f) => (
                                    <TouchableOpacity
                                        key={f}
                                        onPress={() => setFrequency(f)}
                                        style={[
                                            styles.segmentedBtn,
                                            frequency === f && [
                                                styles.segmentedBtnActive,
                                                { backgroundColor: theme.colors.surface },
                                            ],
                                        ]}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.segmentedBtnText,
                                                {
                                                    color:
                                                        frequency === f
                                                            ? theme.colors.primary
                                                            : theme.colors.textSecondary,
                                                },
                                            ]}
                                        >
                                            {f === 'weekly' ? t('weekly', 'Weekly') : f === 'monthly' ? t('monthly', 'Monthly') : t('specific_dates', 'Specific')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Weekly / Monthly Day Selector */}
                            {frequency !== 'specific_dates' && (
                                <View style={styles.inputSection}>
                                    <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                                        {t('new_days_off', 'New Day(s) Off')}
                                    </Text>
                                    <View style={styles.daysToggleRow}>
                                        {FULL_DAYS.map((day, i) => {
                                            const dayKey = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
                                            const isSelected = requestedDaysOff.includes(dayKey);
                                            return (
                                                <TouchableOpacity
                                                    key={day}
                                                    onPress={() => toggleDay(day)}
                                                    style={[
                                                        styles.dayToggleBtn,
                                                        {
                                                            backgroundColor: isSelected
                                                                ? theme.colors.primary
                                                                : theme.colors.surfaceSubtle,
                                                            borderColor: isSelected
                                                                ? theme.colors.primary
                                                                : theme.colors.border,
                                                        },
                                                    ]}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dayToggleBtnText,
                                                            { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                                                        ]}
                                                    >
                                                        {t(ALL_DAYS[i], ALL_DAYS[i]).slice(0, 3)}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* Monthly Weeks Selector */}
                            {frequency === 'monthly' && (
                                <View style={styles.inputSection}>
                                    <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                                        {t('on_weeks', 'On Weeks of Month')}
                                    </Text>
                                    <View style={styles.weeksToggleRow}>
                                        {[1, 2, 3, 4, 5].map((w) => {
                                            const isSelected = weeksOfMonth.includes(w);
                                            return (
                                                <TouchableOpacity
                                                    key={w}
                                                    onPress={() => toggleWeek(w)}
                                                    style={[
                                                        styles.weekToggleBtn,
                                                        {
                                                            backgroundColor: isSelected
                                                                ? theme.colors.status.purple
                                                                : theme.colors.surfaceSubtle,
                                                            borderColor: isSelected
                                                                ? theme.colors.status.purple
                                                                : theme.colors.border,
                                                        },
                                                    ]}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.weekToggleBtnText,
                                                            { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                                                        ]}
                                                    >
                                                        {w === 5 ? t('last', 'Last') : `${w}${w === 1 ? 'st' : w === 2 ? 'nd' : w === 3 ? 'rd' : 'th'}`}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* Specific Dates Selector */}
                            {frequency === 'specific_dates' && (
                                <View style={styles.inputSection}>
                                    <NativeDatePickerField
                                        label={t('add_dates', 'Add Specific Date')}
                                        value={pickerDate}
                                        onChange={addSpecificDate}
                                    />
                                    <View style={styles.specificChipsWrap}>
                                        {specificDates.map((d) => (
                                            <View key={d} style={[styles.addedDateChip, { backgroundColor: theme.colors.status.warningSubtle, borderColor: theme.colors.status.warningBorder }]}>
                                                <Text style={[styles.addedDateChipText, { color: theme.colors.status.warning }]}>
                                                    {formatDateDisplay(d, 'standard')}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => removeSpecificDate(d)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Trash2 color={theme.colors.status.danger} size={13} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        {specificDates.length === 0 && (
                                            <Text style={[styles.emptyScheduleText, { color: theme.colors.textMuted }]}>
                                                {t('no_dates_added', 'No specific dates added yet.')}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Effective Range Dates */}
                            <View style={styles.datesRow}>
                                <View style={styles.dateCol}>
                                    <NativeDatePickerField
                                        label={t('effective_from', 'Effective From')}
                                        value={effectiveFrom}
                                        onChange={setEffectiveFrom}
                                    />
                                </View>
                                <View style={styles.dateCol}>
                                    <NativeDatePickerField
                                        label={`${t('effective_to', 'Effective To')} (${t('optional', 'Optional')})`}
                                        value={effectiveTo}
                                        onChange={setEffectiveTo}
                                        minDate={effectiveFrom}
                                    />
                                </View>
                            </View>

                            {/* Reason Multiline Input */}
                            <AppInput
                                label={t('reason_for_request', 'Reason for Request')}
                                value={reason}
                                onChangeText={setReason}
                                placeholder={t('day_off_reason_placeholder', 'Why do you need this change?')}
                                multiline
                                numberOfLines={3}
                                icon={<FileText color={theme.colors.textSecondary} size={18} />}
                            />

                            {/* Form Action Buttons */}
                            <View style={styles.formButtonRow}>
                                <AppButton
                                    title={t('cancel', 'Cancel')}
                                    onPress={() => setShowForm(false)}
                                    variant="outline"
                                    style={styles.cancelFormBtn}
                                />
                                <AppButton
                                    title={t('submit_request', 'Submit Request')}
                                    onPress={handleSubmitForm}
                                    loading={submitMutation.isPending}
                                    icon={<Send color="#FFFFFF" size={16} />}
                                    style={styles.submitFormBtn}
                                />
                            </View>
                        </View>
                    )}

                    {/* 3. Request History Feed */}
                    <View style={styles.historySection}>
                        <View style={styles.historyHeaderRow}>
                            <Text style={[styles.historyTitle, { color: theme.colors.textSecondary }]}>
                                {t('request_history', 'Request History')}
                            </Text>
                            <View style={[styles.countPill, { backgroundColor: theme.colors.primarySubtle }]}>
                                <Text style={[styles.countPillText, { color: theme.colors.primary }]}>
                                    {requests.length} {t('entries', 'Entries')}
                                </Text>
                            </View>
                        </View>

                        {isRequestsLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
                        ) : requests.length === 0 ? (
                            <EmptyState
                                icon={<Calendar color={theme.colors.textSecondary} size={36} />}
                                title={t('no_history_yet', 'No Request History')}
                                description={t('no_pending_requests_desc', 'Any day-off change requests you submit will appear here until they are reviewed.')}
                                actionTitle={t('request_day_off_change', 'Request Change')}
                                onAction={() => setShowForm(true)}
                            />
                        ) : (
                            requests.map((req) => {
                                const statusInfo = getStatusStyle(req.status);
                                const currentDays = req.current_days_off || [];
                                const requestedDays = req.requested_days_off || [];

                                return (
                                    <View
                                        key={req.id}
                                        style={[styles.historyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                    >
                                        {/* Status Header & Timestamps */}
                                        <View style={styles.historyCardHeader}>
                                            <View
                                                style={[
                                                    styles.statusPill,
                                                    { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
                                                ]}
                                            >
                                                {statusInfo.icon}
                                                <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                                                    {statusInfo.label}
                                                </Text>
                                            </View>
                                            <View style={styles.dateBlock}>
                                                <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                                                    {formatDateDisplay(req.created_at, 'dayMonth')}
                                                </Text>
                                                <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                                                    {formatTimeDisplay(req.created_at)}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Processed timestamp if reviewed */}
                                        {Boolean(req.actioned_at || req.approved_at) && (
                                            <View style={[styles.processedRow, { backgroundColor: theme.colors.surfaceSubtle }]}>
                                                <Text style={[styles.processedLabel, { color: theme.colors.textSecondary }]}>
                                                    {t('processed_on', 'Processed On')}
                                                </Text>
                                                <Text style={[styles.processedValue, { color: theme.colors.textPrimary }]}>
                                                    {formatDateDisplay(req.actioned_at || req.approved_at, 'standard')} • {formatTimeDisplay(req.actioned_at || req.approved_at)}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Schedule Diff Arrow */}
                                        <View style={styles.diffInlineRow}>
                                            <View style={styles.diffSide}>
                                                {currentDays.length > 0 ? (
                                                    currentDays.map((d) => (
                                                        <View key={d} style={[styles.dayChipSmall, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                                                            <Text style={[styles.dayChipSmallText, { color: theme.colors.textSecondary }]}>
                                                                {t(d.toLowerCase(), d).slice(0, 3)}
                                                            </Text>
                                                        </View>
                                                    ))
                                                ) : (
                                                    <Text style={[styles.emptyDiffText, { color: theme.colors.textMuted }]}>
                                                        {t('no_day_off', 'None')}
                                                    </Text>
                                                )}
                                            </View>

                                            <ArrowRight color={theme.colors.textMuted} size={14} />

                                            <View style={[styles.diffSide, { justifyContent: 'flex-end' }]}>
                                                {req.frequency === 'specific_dates' ? (
                                                    (req.specific_dates || []).map((d) => (
                                                        <View key={d} style={[styles.dayChipSmall, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' }]}>
                                                            <Text style={[styles.dayChipSmallText, { color: '#F59E0B' }]}>
                                                                {formatDateDisplay(d, 'dayMonth')}
                                                            </Text>
                                                        </View>
                                                    ))
                                                ) : (
                                                    <>
                                                        {requestedDays.map((d) => (
                                                            <View key={d} style={[styles.dayChipSmall, { backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primary }]}>
                                                                <Text style={[styles.dayChipSmallText, { color: theme.colors.primary }]}>
                                                                    {t(d.toLowerCase(), d).slice(0, 3)}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                        {req.frequency === 'monthly' && req.weeks_of_month && (
                                                            <View style={[styles.dayChipSmall, { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}>
                                                                <Text style={[styles.dayChipSmallText, { color: '#FFFFFF' }]}>
                                                                    W:{req.weeks_of_month.join(',')}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </>
                                                )}
                                            </View>
                                        </View>

                                        {/* Reason Quote */}
                                        {Boolean(req.reason) && (
                                            <View style={[styles.historyReasonBox, { backgroundColor: theme.colors.surfaceSubtle }]}>
                                                <Text style={[styles.historyReasonText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                                                    "{req.reason}"
                                                </Text>
                                            </View>
                                        )}

                                        {/* Rejection Note */}
                                        {Boolean(req.rejection_reason) && (
                                            <View style={[styles.rejectionBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                                <X color="#EF4444" size={13} />
                                                <Text style={[styles.rejectionText, { color: '#EF4444' }]}>
                                                    {req.rejection_reason}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Cancel Pending Request Button */}
                                        {req.status === 'pending' && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setActionId(Number(req.id));
                                                    setActionMode('cancel');
                                                }}
                                                style={[styles.cancelRequestBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.cancelRequestBtnText}>
                                                    {t('cancel_request', 'Cancel Request')}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </View>
                </>
            ) : (
                /* Approvals Tab for Managers */
                <View style={styles.approvalsSection}>
                    <View style={styles.historyHeaderRow}>
                        <Text style={[styles.historyTitle, { color: theme.colors.textSecondary }]}>
                            {t('pending_team_requests', 'Team Requests')}
                        </Text>
                        <View style={[styles.countPill, { backgroundColor: theme.colors.primarySubtle }]}>
                            <Text style={[styles.countPillText, { color: theme.colors.primary }]}>
                                {teamRequests.length} {t('pending', 'Pending')}
                            </Text>
                        </View>
                    </View>

                    {isTeamLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
                    ) : teamRequests.length === 0 ? (
                        <EmptyState
                            icon={<CalendarCheck color={theme.colors.textSecondary} size={36} />}
                            title={t('all_caught_up', 'All Caught Up! 🎉')}
                            description={t('no_pending_approvals_desc', 'There are no pending day-off requests from your team at this time.')}
                        />
                    ) : (
                        teamRequests.map((req) => (
                            <DayOffApprovalCard
                                key={req.id}
                                request={req}
                                onApprove={(id) => {
                                    setActionId(id);
                                    setActionMode('approve');
                                }}
                                onReject={(id) => {
                                    setActionId(id);
                                    setActionMode('reject');
                                }}
                            />
                        ))
                    )}
                </View>
            )}

            {/* Action Confirmation Modal */}
            <DayOffActionModal
                visible={Boolean(actionId && actionMode)}
                mode={actionMode}
                isLoading={approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending}
                onClose={closeAction}
                onConfirm={handleConfirmAction}
            />
        </AppShell>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBtnWithBadge: {
        flexDirection: 'row',
        gap: 6,
    },
    tabBtnText: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    badgePill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgePillText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },
    scheduleCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    scheduleIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scheduleTitleWrapper: {
        flex: 1,
    },
    scheduleCardTitle: {
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    scheduleShiftName: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    weekGridWrap: {
        width: '100%',
    },
    weekDaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 4,
    },
    dayCol: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    daySquare: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    daySquareText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    dayStatusSub: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    monthlyNoteRow: {
        borderTopWidth: 1,
        marginTop: 12,
        paddingTop: 8,
    },
    monthlyNoteText: {
        fontSize: 11,
        fontWeight: '600',
    },
    specificChipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    specificChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    specificChipText: {
        fontSize: 11,
        fontWeight: '700',
    },
    emptyScheduleText: {
        fontSize: 12,
        fontStyle: 'italic',
        marginVertical: 4,
    },
    formCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    formIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    segmentedRow: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    segmentedBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentedBtnActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentedBtnText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    inputSection: {
        marginBottom: 14,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    daysToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 4,
    },
    dayToggleBtn: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayToggleBtnText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    weeksToggleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    weekToggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    weekToggleBtnText: {
        fontSize: 11,
        fontWeight: '800',
    },
    addedDateChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    addedDateChipText: {
        fontSize: 11,
        fontWeight: '700',
    },
    datesRow: {
        flexDirection: 'row',
        gap: 10,
    },
    dateCol: {
        flex: 1,
    },
    formButtonRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 6,
    },
    cancelFormBtn: {
        flex: 1,
        height: 46,
    },
    submitFormBtn: {
        flex: 2,
        height: 46,
    },
    historySection: {
        marginTop: 4,
    },
    historyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    historyTitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    countPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    countPillText: {
        fontSize: 10,
        fontWeight: '800',
    },
    historyCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
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
    processedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        marginBottom: 10,
    },
    processedLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    processedValue: {
        fontSize: 10,
        fontWeight: '700',
    },
    diffInlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 10,
    },
    diffSide: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        flex: 1,
    },
    dayChipSmall: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    dayChipSmallText: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    emptyDiffText: {
        fontSize: 10,
        fontStyle: 'italic',
    },
    historyReasonBox: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
    },
    historyReasonText: {
        fontSize: 11,
        lineHeight: 16,
        fontStyle: 'italic',
    },
    rejectionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 8,
    },
    rejectionText: {
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
    },
    cancelRequestBtn: {
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    cancelRequestBtnText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    approvalsSection: {
        marginTop: 4,
    },
    emptyCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 17,
        paddingHorizontal: 12,
    },
});
