import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Platform,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { leaveApi, LeaveBalance } from '../../api/leave';
import { useAppTheme } from '../../context/ThemeContext';
import { AppShell } from '../../components/common/AppShell';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { CreateLeaveSkeleton } from '../../components/common/Skeletons';
import { NativeDatePickerField } from '../../components/common/NativeDatePickerField';
import { NativeTimePickerField } from '../../components/common/NativeTimePickerField';
import {
    Calendar,
    Paperclip,
    Clock,
    Check,
    FileText,
    UploadCloud,
    X,
    Plus,
    History,
} from 'lucide-react-native';
import {
    format,
    getTodayDateString,
    isDateRangeValid,
    calculateInclusiveDays,
    formatDateDisplay,
} from '../../utils/dateTime';

import { useTranslation } from '../../context/LanguageContext';

export const CreateLeaveScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const DURATION_TYPES = [
        { id: 'full_day', label: t('full_day', 'Full Day') },
        { id: 'first_half', label: t('morning', 'Morning') },
        { id: 'second_half', label: t('afternoon', 'Afternoon') },
        { id: 'multi_day', label: t('multi_day', 'Multi-Day') },
        { id: 'custom_time', label: t('custom_hours', 'Custom Hours') },
    ];

    const queryClient = useQueryClient();
    const { data: balances = [], isLoading } = useQuery<LeaveBalance[]>({
        queryKey: ['leaveBalances'],
        queryFn: async () => {
            const res = await leaveApi.getMyBalances().catch(() => null);
            if (Array.isArray(res)) return res;
            if (Array.isArray(res?.balances)) return res.balances;
            return [];
        },
        staleTime: 1000 * 60 * 5,
    });

    const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<number>(1);
    const [durationType, setDurationType] = useState<string>('full_day');

    const todayStr = getTodayDateString();
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('12:00');
    const [reason, setReason] = useState('');
    const [attachment, setAttachment] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStartDateChange = (newStart: string) => {
        setStartDate(newStart);
        if (endDate < newStart) {
            setEndDate(newStart);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setAttachment(result.assets[0]);
            }
        } catch (e) {
            console.error('Picker error', e);
        }
    };

    const calculateTotalDuration = () => {
        if (durationType === 'full_day') return `1 ${t('day', 'Day')}`;
        if (durationType === 'first_half' || durationType === 'second_half') return `0.5 ${t('day', 'Day')}`;
        if (durationType === 'custom_time') return t('custom_time', 'Custom Time');
        if (durationType === 'multi_day') {
            const days = calculateInclusiveDays(startDate, endDate);
            return `${days} ${days > 1 ? t('days', 'Days') : t('day', 'Day')}`;
        }
        return `1 ${t('day', 'Day')}`;
    };

    const handleSubmit = async () => {
        if (!reason.trim()) {
            Alert.alert(t('reason_required', 'Reason Required'), t('provide_reason_desc', 'Please provide a clear reason for your leave request.'));
            return;
        }

        if (durationType === 'multi_day' && !isDateRangeValid(startDate, endDate)) {
            Alert.alert(t('invalid_date_range', 'Invalid Date Range'), t('start_must_before_end', 'Start date cannot be after end date.'));
            return;
        }

        if (durationType === 'custom_time' && startTime >= endTime) {
            Alert.alert(t('invalid_time_range', 'Invalid Time Range'), t('start_time_must_before_end', 'Start time must be before end time.'));
            return;
        }

        setIsSubmitting(true);
        try {
            const attachmentsArr = attachment ? [{ uri: attachment.uri, name: attachment.name }] : [];
            await leaveApi.submitLeaveRequest({
                leave_type_id: selectedLeaveTypeId,
                duration_type: durationType,
                start_date: startDate,
                end_date: durationType === 'full_day' || durationType === 'first_half' || durationType === 'second_half' ? startDate : endDate,
                start_time: durationType === 'custom_time' ? startTime : undefined,
                end_time: durationType === 'custom_time' ? endTime : undefined,
                reason,
                attachments: attachmentsArr,
            });

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['leaveBalances'] }),
                queryClient.invalidateQueries({ queryKey: ['leaveRequests'] }),
            ]);

            if (Platform.OS === 'web') {
                window.alert(t('application_submitted_msg', 'Application Submitted: Your leave request has been submitted to your line manager for review.'));
                navigation.replace('LeaveList');
            } else {
                Alert.alert(t('application_submitted', 'Application Submitted'), t('leave_submitted_mgr', 'Your leave request has been submitted to your line manager for review.'), [
                    { text: t('ok', 'OK'), onPress: () => navigation.replace('LeaveList') },
                ]);
            }
        } catch (err: any) {
            Alert.alert(t('submission_error', 'Submission Error'), err?.message || t('fail_submit_leave', 'Failed to submit leave request.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const headerRight = (
        <HeaderIconButton
            icon={<History color={theme.colors.brand} size={20} />}
            onPress={() => navigation.replace('LeaveList')}
            accessibilityLabel="Leave applications history"
        />
    );

    return (
        <AppShell title={t('apply_leave', 'Apply Leave')} onBack={() => navigation.goBack()} headerRight={headerRight}>
            {isLoading ? (
                <CreateLeaveSkeleton />
            ) : (
                <>
                    {/* 1. Leave Category Selector (Matches Leave Balances carousel style) */}
                    <Text style={styles.sectionTitle}>{t('select_leave_category', 'Select Leave Category')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.balanceCarousel}>
                        {balances.map((b) => {
                            const lType = b.leave_type || (b as any).leaveType;
                            const typeId = typeof lType === 'object' ? lType.id : b.id;
                            const typeName = typeof lType === 'object' ? lType.name : String(lType || 'Leave');
                            const remDays = b.remaining_days ?? (b as any).balance ?? (b as any).remaining ?? 0;
                            const usedDays = b.used_days ?? (b as any).total_taken ?? (b as any).taken ?? 0;
                            const allocDays = b.allocated_days ?? (b as any).total_accrued ?? (b as any).allowed ?? 0;
                            const isSelected = selectedLeaveTypeId === typeId;

                            return (
                                <TouchableOpacity
                                    key={typeId}
                                    style={[styles.balanceCard, isSelected && styles.balanceCardSelected]}
                                    onPress={() => setSelectedLeaveTypeId(typeId)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.cardHeader}>
                                        <Text style={[styles.balanceType, isSelected && styles.balanceTypeSelected]}>
                                            {typeName}
                                        </Text>
                                        {isSelected && (
                                            <View style={styles.selectedCheckBadge}>
                                                <Check color="#FFFFFF" size={10} />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.balanceRemaining}>{remDays} {t('days', 'Days')}</Text>
                                    <Text style={styles.balanceSub}>
                                        {t('used_days_of_total', `Used ${usedDays} of ${allocDays} days`)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* 2. Duration Type Switcher (Horizontal Scrollable Pills) */}
                    <Text style={styles.sectionTitle}>{t('duration_mode', 'Duration Mode')}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.durationScrollView}
                        contentContainerStyle={styles.durationScrollContent}
                    >
                        {DURATION_TYPES.map((dt) => {
                            const isSelected = durationType === dt.id;
                            return (
                                <TouchableOpacity
                                    key={dt.id}
                                    style={[styles.durationPillBtn, isSelected && styles.durationPillBtnActive]}
                                    onPress={() => setDurationType(dt.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.durationPillText, isSelected && styles.durationPillTextActive]}>
                                        {dt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

            {/* 3. Leave Schedule Card (Matches Request Card style) */}
            <View style={styles.cardSection}>
                <View style={styles.cardHeader}>
                    <View style={styles.typeGroup}>
                        <Calendar color={theme.colors.primary} size={16} />
                        <Text style={styles.cardHeaderTitle}>{t('leave_schedule', 'Leave Schedule')}</Text>
                    </View>
                    <View style={styles.durationPill}>
                        <Text style={styles.durationPillText}>{calculateTotalDuration()}</Text>
                    </View>
                </View>

                <View style={styles.dateRow}>
                    <View style={styles.dateField}>
                        <NativeDatePickerField
                            label={t('start_date', 'Start Date')}
                            value={startDate}
                            onChange={handleStartDateChange}
                        />
                    </View>

                    {durationType === 'multi_day' && (
                        <View style={styles.dateField}>
                            <NativeDatePickerField
                                label={t('end_date', 'End Date')}
                                value={endDate}
                                onChange={setEndDate}
                                minDate={startDate}
                            />
                        </View>
                    )}
                </View>

                {durationType === 'custom_time' && (
                    <View style={[styles.dateRow, { marginTop: 4 }]}>
                        <View style={styles.dateField}>
                            <NativeTimePickerField
                                label={t('start_time', 'Start Time')}
                                value={startTime}
                                onChange={setStartTime}
                            />
                        </View>
                        <View style={styles.dateField}>
                            <NativeTimePickerField
                                label={t('end_time', 'End Time')}
                                value={endTime}
                                onChange={setEndTime}
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* 4. Reason Application Card */}
            <View style={styles.cardSection}>
                <View style={styles.cardHeader}>
                    <View style={styles.typeGroup}>
                        <FileText color={theme.colors.primary} size={16} />
                        <Text style={styles.cardHeaderTitle}>{t('reason_for_application', 'Reason for Application')}</Text>
                    </View>
                </View>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder={t('describe_reason_placeholder', 'Describe clear reason for leave application...')}
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={4}
                />
            </View>

            {/* 5. Document Attachment Card */}
            <View style={styles.cardSection}>
                <View style={styles.cardHeader}>
                    <View style={styles.typeGroup}>
                        <Paperclip color={theme.colors.primary} size={16} />
                        <Text style={styles.cardHeaderTitle}>{t('proof_document', 'Proof / Supporting Document')}</Text>
                    </View>
                </View>

                {attachment ? (
                    <View style={styles.attachedCard}>
                        <View style={styles.attachedLeft}>
                            <FileText color={theme.colors.primary} size={18} />
                            <Text style={styles.attachedName} numberOfLines={1}>
                                {attachment.name}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setAttachment(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X color={theme.colors.status.danger} size={18} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.attachBox} onPress={pickDocument} activeOpacity={0.8}>
                        <Paperclip color={theme.colors.primary} size={18} />
                        <Text style={styles.attachBoxText}>{t('upload_cert_proof', 'Upload Medical Certificate or Proof')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Submit Button (Matches LeaveListScreen primary action button) */}
            <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.submitBtnText}>{t('submit_leave_application', 'Submit Leave Application')}</Text>
                )}
            </TouchableOpacity>
                </>
            )}
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xs + 2,
    },
    balanceCarousel: {
        flexDirection: 'row',
        marginBottom: theme.spacing.lg,
    },
    balanceCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginRight: theme.spacing.md,
        width: 160,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    balanceCardSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    balanceType: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    balanceTypeSelected: {
        color: theme.colors.primary,
    },
    selectedCheckBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceRemaining: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.primary,
        marginVertical: 4,
    },
    balanceSub: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    durationScrollView: {
        marginBottom: theme.spacing.lg,
    },
    durationScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs + 2,
        paddingVertical: 2,
    },
    durationPillBtn: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    durationPillBtnActive: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.primary,
        ...theme.shadows.sm,
    },
    durationPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    durationPillTextActive: {
        fontWeight: '700',
        color: theme.colors.primary,
    },
    cardSection: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    typeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardHeaderTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginLeft: theme.spacing.xs + 2,
    },
    durationPill: {
        backgroundColor: theme.colors.surfaceSubtle,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.full,
    },
    dateRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    dateField: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    input: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        paddingHorizontal: theme.spacing.md,
        height: 44,
        fontSize: 13,
    },
    textArea: {
        height: 90,
        textAlignVertical: 'top',
        paddingTop: theme.spacing.sm + 2,
    },
    attachBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    attachBoxText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
        marginLeft: theme.spacing.sm,
    },
    attachedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    attachedLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: theme.spacing.sm,
    },
    attachedName: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        flex: 1,
    },
    submitBtn: {
        backgroundColor: theme.colors.primary,
        height: 48,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.sm,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    headerIconBtnSubtle: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
}));


